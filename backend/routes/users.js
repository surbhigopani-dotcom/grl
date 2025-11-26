const express = require('express');
const router = express.Router();
const multer = require('multer');
const auth = require('../middleware/auth');
const User = require('../models/User');
const { upload, cloudinary, uploadToCloudinary } = require('../utils/cloudinary');

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
// @desc    Upload document (Aadhar, PAN, or Selfie) to Cloudinary
// @access  Private
router.post('/upload-document', auth, upload.single('document'), handleMulterError, async (req, res) => {
  let cloudinaryResult = null;
  
  try {
    if (!req.file) {
      return res.status(400).json({ 
        success: false,
        message: 'No file uploaded. Please select a file.' 
      });
    }

    const { documentType } = req.body;
    
    if (!documentType || !['aadharCard', 'panCard', 'selfie'].includes(documentType)) {
      return res.status(400).json({ 
        success: false,
        message: 'Invalid document type. Must be aadharCard, panCard, or selfie' 
      });
    }

    // Upload file to Cloudinary
    const userId = req.user._id.toString();
    cloudinaryResult = await uploadToCloudinary(
      req.file.buffer,
      documentType,
      userId,
      req.file.originalname
    );

    // Get Cloudinary URL
    const cloudinaryUrl = cloudinaryResult.secure_url || cloudinaryResult.url;

    // Update user document URL with Cloudinary URL
    const updateField = `${documentType}Url`;
    await User.findByIdAndUpdate(req.user._id, {
      [updateField]: cloudinaryUrl
    });

    res.json({
      success: true,
      message: 'Document uploaded successfully to Cloudinary',
      url: cloudinaryUrl,
      documentType: documentType,
      cloudinaryPublicId: cloudinaryResult.public_id
    });
  } catch (error) {
    console.error('Document upload error:', error);
    
    // Delete file from Cloudinary if there was an error and file was uploaded
    if (cloudinaryResult && cloudinaryResult.public_id) {
      try {
        await cloudinary.uploader.destroy(cloudinaryResult.public_id);
      } catch (deleteError) {
        console.error('Error deleting file from Cloudinary:', deleteError);
      }
    }

    res.status(500).json({ 
      success: false,
      message: error.message || 'Failed to upload document to Cloudinary' 
    });
  }
});

module.exports = router;

