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

// File filter - only allow images
const fileFilter = (req, file, cb) => {
  const allowedTypes = /jpeg|jpg|png|webp/;
  const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
  const mimetype = allowedTypes.test(file.mimetype);

  if (mimetype && extname) {
    return cb(null, true);
  } else {
    cb(new Error('Only image files (JPEG, PNG, WebP) are allowed!'));
  }
};

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB max file size
  },
  fileFilter: fileFilter
});

// Error handling middleware for multer
const handleMulterError = (err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({
        success: false,
        message: 'File size too large. Maximum size is 5MB.'
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

