const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const auth = require('../middleware/auth');
const User = require('../models/User');

// Create uploads directory if it doesn't exist
const uploadsDir = path.join(__dirname, '../uploads/documents');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadsDir);
  },
  filename: (req, file, cb) => {
    const userId = req.user._id;
    const documentType = req.body.documentType || 'document';
    const ext = path.extname(file.originalname);
    const filename = `${userId}_${documentType}_${Date.now()}${ext}`;
    cb(null, filename);
  }
});

// File filter - allow all common document formats, but restrict selfie to images only
const fileFilter = (req, file, cb) => {
  const documentType = req.body.documentType;
  
  // For selfie, only allow images
  if (documentType === 'selfie') {
    const imageExtensions = /jpeg|jpg|png|webp|gif|bmp/;
    const imageMimeTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif', 'image/bmp'];
    
    const extname = imageExtensions.test(path.extname(file.originalname).toLowerCase());
    const mimetype = imageMimeTypes.includes(file.mimetype);
    
    if (mimetype || extname) {
      return cb(null, true);
    } else {
      return cb(new Error('Selfie must be an image file (JPG, PNG, WebP, GIF, BMP)'));
    }
  }
  
  // For Aadhar and PAN, allow all document formats
  const allowedExtensions = /jpeg|jpg|png|webp|pdf|doc|docx|xls|xlsx|txt|csv|rtf|odt|ods|odp/;
  const allowedMimeTypes = [
    // Images
    'image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif', 'image/bmp',
    // Documents
    'application/pdf',
    'application/msword', // .doc
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document', // .docx
    'application/vnd.ms-excel', // .xls
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // .xlsx
    'text/plain', // .txt
    'text/csv', // .csv
    'application/rtf', // .rtf
    'application/vnd.oasis.opendocument.text', // .odt
    'application/vnd.oasis.opendocument.spreadsheet', // .ods
    'application/vnd.oasis.opendocument.presentation' // .odp
  ];
  
  const extname = allowedExtensions.test(path.extname(file.originalname).toLowerCase());
  const mimetype = allowedMimeTypes.includes(file.mimetype) || allowedExtensions.test(path.extname(file.originalname).toLowerCase());

  if (mimetype || extname) {
    return cb(null, true);
  } else {
    cb(new Error('File type not allowed. Allowed formats: Images (JPEG, PNG, WebP, GIF, BMP), Documents (PDF, DOC, DOCX, XLS, XLSX, TXT, CSV, RTF, ODT, ODS, ODP)'));
  }
};

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 100 * 1024 * 1024 // 100MB max file size (increased for Android compatibility)
  },
  fileFilter: fileFilter
});

// Error handling middleware for multer
const handleMulterError = (err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({
        success: false,
        message: 'File size too large. Maximum size is 100MB.'
      });
    }
    return res.status(400).json({
      success: false,
      message: err.message || 'File upload error'
    });
  }
  if (err) {
    return res.status(400).json({
      success: false,
      message: err.message || 'Invalid file type'
    });
  }
  next();
};

// @route   POST /api/users/upload-document
// @desc    Upload document (Aadhar, PAN, or Selfie)
// @access  Private
router.post('/upload-document', auth, upload.single('document'), handleMulterError, async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ 
        success: false,
        message: 'No file uploaded. Please select a file.' 
      });
    }

    const { documentType } = req.body;
    
    if (!documentType || !['aadharCard', 'panCard', 'selfie'].includes(documentType)) {
      // Delete uploaded file if invalid document type
      fs.unlinkSync(req.file.path);
      return res.status(400).json({ 
        success: false,
        message: 'Invalid document type. Must be aadharCard, panCard, or selfie' 
      });
    }

    // Generate URL for the uploaded file (accessible via /uploads/documents/...)
    const fileUrl = `/uploads/documents/${req.file.filename}`;

    // Update user document URL
    const updateField = `${documentType}Url`;
    await User.findByIdAndUpdate(req.user._id, {
      [updateField]: fileUrl
    });

    res.json({
      success: true,
      message: 'Document uploaded successfully',
      url: fileUrl,
      documentType: documentType
    });
  } catch (error) {
    console.error('Document upload error:', error);
    
    // Delete file if there was an error
    if (req.file && req.file.path) {
      try {
        fs.unlinkSync(req.file.path);
      } catch (unlinkError) {
        console.error('Error deleting file:', unlinkError);
      }
    }

    res.status(500).json({ 
      success: false,
      message: error.message || 'Failed to upload document' 
    });
  }
});

// Serve uploaded files from this route
router.use('/uploads', express.static(path.join(__dirname, '../uploads')));

module.exports = router;

