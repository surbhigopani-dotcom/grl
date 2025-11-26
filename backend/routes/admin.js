const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const AdminConfig = require('../models/AdminConfig');
const Loan = require('../models/Loan');
const User = require('../models/User');
const { sendPaymentApprovalEmail, sendPaymentFailureEmail } = require('../utils/emailService');

// @route   GET /api/admin/config
// @desc    Get admin configuration
// @access  Public (should be protected in production)
router.get('/config', async (req, res) => {
  try {
    let config = await AdminConfig.findOne();
    if (!config) {
      config = new AdminConfig({ 
        depositAmount: 0,
        fileCharge: 0,
        platformFee: 0,
        tax: 0,
        processingDays: 15,
        upiId: '7211132000@ybl'
      });
      await config.save();
    }
    res.json({ config });
  } catch (error) {
    console.error('Get config error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   PUT /api/admin/config
// @desc    Update admin configuration
// @access  Public (should be protected in production)
router.put('/config', [
  body('depositAmount').optional().isFloat({ min: 0 }).withMessage('Deposit amount must be a number >= 0'),
  body('fileCharge').optional().isFloat({ min: 0 }).withMessage('File charge must be a number >= 0'),
  body('platformFee').optional().isFloat({ min: 0 }).withMessage('Platform fee must be a number >= 0'),
  body('tax').optional().isFloat({ min: 0 }).withMessage('Tax must be a number >= 0'),
  body('processingDays').optional().isInt({ min: 1 }).withMessage('Processing days must be a positive integer'),
  body('upiId').optional().isString().trim().withMessage('UPI ID must be a valid string')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    let config = await AdminConfig.findOne();
    if (!config) {
      config = new AdminConfig();
    }

    // Always update values - don't check for undefined, use the provided values
    if (req.body.depositAmount !== undefined) {
      config.depositAmount = parseFloat(req.body.depositAmount) || 0;
    }
    if (req.body.fileCharge !== undefined) {
      config.fileCharge = parseFloat(req.body.fileCharge) || 0;
    }
    if (req.body.platformFee !== undefined) {
      config.platformFee = parseFloat(req.body.platformFee) || 0;
    }
    if (req.body.tax !== undefined) {
      config.tax = parseFloat(req.body.tax) || 0;
    }
    if (req.body.processingDays !== undefined) {
      config.processingDays = parseInt(req.body.processingDays) || 15;
    }
    if (req.body.upiId !== undefined) {
      config.upiId = req.body.upiId.trim();
    }
    config.updatedAt = new Date();

    await config.save();

    // Return the saved config to ensure frontend gets updated values
    const savedConfig = await AdminConfig.findOne();
    res.json({
      message: 'Configuration updated successfully',
      config: savedConfig
    });
  } catch (error) {
    console.error('Update config error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   POST /api/admin/login
// @desc    Admin login with static credentials
// @access  Public
router.post('/login', [
  body('username').notEmpty().withMessage('Username is required'),
  body('password').notEmpty().withMessage('Password is required')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { username, password } = req.body;
    
    // Static admin credentials
    const ADMIN_USERNAME = process.env.ADMIN_USERNAME || 'admin';
    const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'admin123';

    if (username === ADMIN_USERNAME && password === ADMIN_PASSWORD) {
      // Create a simple admin session token (in production, use JWT)
      const adminToken = Buffer.from(`${username}:${Date.now()}`).toString('base64');
      res.json({
        success: true,
        message: 'Login successful',
        token: adminToken,
        admin: { username }
      });
    } else {
      res.status(401).json({ message: 'Invalid credentials' });
    }
  } catch (error) {
    console.error('Admin login error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   GET /api/admin/loans
// @desc    Get all loans (admin view)
// @access  Public (should be protected in production)
router.get('/loans', async (req, res) => {
  try {
    const loans = await Loan.find().populate('user', 'name email phone').sort({ appliedAt: -1 });
    res.json({ loans });
  } catch (error) {
    console.error('Get all loans error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   GET /api/admin/users
// @desc    Get all users with profile completion details
// @access  Public (should be protected in production)
router.get('/users', async (req, res) => {
  try {
    const users = await User.find().sort({ createdAt: -1 });
    
    // Calculate profile completion for each user
    const usersWithStats = users.map(user => {
      const totalFields = 11; // Total fields to check
      let completedFields = 0;
      const missingFields = [];
      
      // Check each field
      if (user.name && user.name.trim()) completedFields++;
      else missingFields.push('Name');
      
      if (user.email && user.email.trim()) completedFields++;
      else missingFields.push('Email');
      
      if (user.dateOfBirth) completedFields++;
      else missingFields.push('Date of Birth');
      
      if (user.address && user.address.trim()) completedFields++;
      else missingFields.push('Address');
      
      if (user.city && user.city.trim()) completedFields++;
      else missingFields.push('City');
      
      if (user.state && user.state.trim()) completedFields++;
      else missingFields.push('State');
      
      if (user.pincode && user.pincode.trim()) completedFields++;
      else missingFields.push('Pincode');
      
      if (user.employmentType) completedFields++;
      else missingFields.push('Employment Type');
      
      if (user.aadharNumber && user.aadharNumber.trim()) completedFields++;
      else missingFields.push('Aadhar Number');
      
      if (user.panNumber && user.panNumber.trim()) completedFields++;
      else missingFields.push('PAN Number');
      
      // Check documents
      const hasDocuments = (user.aadharCardUrl && user.panCardUrl && user.selfieUrl);
      if (hasDocuments) completedFields++;
      else {
        if (!user.aadharCardUrl) missingFields.push('Aadhar Card');
        if (!user.panCardUrl) missingFields.push('PAN Card');
        if (!user.selfieUrl) missingFields.push('Selfie');
      }
      
      const completionPercentage = Math.round((completedFields / totalFields) * 100);
      
      return {
        ...user.toObject(),
        completionPercentage,
        completedFields,
        totalFields,
        missingFields,
        isProfileComplete: user.isProfileComplete || false
      };
    });
    
    // Calculate overall statistics
    const totalUsers = users.length;
    const completeProfiles = users.filter(u => u.isProfileComplete).length;
    const incompleteProfiles = totalUsers - completeProfiles;
    const avgCompletion = usersWithStats.length > 0
      ? Math.round(usersWithStats.reduce((sum, u) => sum + u.completionPercentage, 0) / usersWithStats.length)
      : 0;
    
    res.json({
      users: usersWithStats,
      statistics: {
        totalUsers,
        completeProfiles,
        incompleteProfiles,
        avgCompletionPercentage: avgCompletion
      }
    });
  } catch (error) {
    console.error('Get users error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   GET /api/admin/users/stats
// @desc    Get user statistics summary
// @access  Public (should be protected in production)
router.get('/users/stats', async (req, res) => {
  try {
    const totalUsers = await User.countDocuments();
    const completeProfiles = await User.countDocuments({ isProfileComplete: true });
    const incompleteProfiles = totalUsers - completeProfiles;
    
    // Count users by missing fields
    const missingEmail = await User.countDocuments({ $or: [{ email: '' }, { email: null }, { email: { $exists: false } }] });
    const missingDOB = await User.countDocuments({ $or: [{ dateOfBirth: null }, { dateOfBirth: { $exists: false } }] });
    const missingAddress = await User.countDocuments({ $or: [{ address: '' }, { address: null }, { address: { $exists: false } }] });
    const missingAadhar = await User.countDocuments({ $or: [{ aadharNumber: '' }, { aadharNumber: null }, { aadharNumber: { $exists: false } }] });
    const missingPAN = await User.countDocuments({ $or: [{ panNumber: '' }, { panNumber: null }, { panNumber: { $exists: false } }] });
    const missingAadharDoc = await User.countDocuments({ $or: [{ aadharCardUrl: '' }, { aadharCardUrl: null }, { aadharCardUrl: { $exists: false } }] });
    const missingPANDoc = await User.countDocuments({ $or: [{ panCardUrl: '' }, { panCardUrl: null }, { panCardUrl: { $exists: false } }] });
    const missingSelfie = await User.countDocuments({ $or: [{ selfieUrl: '' }, { selfieUrl: null }, { selfieUrl: { $exists: false } }] });
    
    res.json({
      totalUsers,
      completeProfiles,
      incompleteProfiles,
      completionRate: totalUsers > 0 ? Math.round((completeProfiles / totalUsers) * 100) : 0,
      missingFields: {
        email: missingEmail,
        dateOfBirth: missingDOB,
        address: missingAddress,
        aadharNumber: missingAadhar,
        panNumber: missingPAN,
        aadharCard: missingAadharDoc,
        panCard: missingPANDoc,
        selfie: missingSelfie
      }
    });
  } catch (error) {
    console.error('Get user stats error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   GET /api/admin/payments/validation
// @desc    Get payments in validation status
// @access  Public (should be protected in production)
router.get('/payments/validation', async (req, res) => {
  try {
    const loans = await Loan.find({ 
      status: 'payment_validation',
      paymentStatus: 'pending'
    })
    .populate('user', 'name email phone')
    .sort({ paymentAt: -1 });
    
    res.json({ loans });
  } catch (error) {
    console.error('Get payments in validation error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   POST /api/admin/payments/:loanId/approve
// @desc    Approve payment - mark as success
// @access  Public (should be protected in production)
router.post('/payments/:loanId/approve', async (req, res) => {
  try {
    const loan = await Loan.findById(req.params.loanId);
    
    if (!loan) {
      return res.status(404).json({ message: 'Loan not found' });
    }

    if (loan.status !== 'payment_validation') {
      return res.status(400).json({ message: 'Payment is not in validation status' });
    }

    loan.paymentStatus = 'success';
    loan.status = 'processing';
    loan.processingStartDate = new Date();
    
    // Calculate expected completion date
    const AdminConfig = require('../models/AdminConfig');
    let config = await AdminConfig.findOne();
    const processingDays = config?.processingDays || 15;
    const completionDate = new Date();
    completionDate.setDate(completionDate.getDate() + processingDays);
    loan.expectedCompletionDate = completionDate;

    await loan.save();

    // Send payment approval email
    try {
      const user = await User.findById(loan.user);
      if (user) {
        await sendPaymentApprovalEmail(user, loan);
      }
    } catch (emailError) {
      console.error('Error sending payment approval email:', emailError);
      // Don't fail the approval if email fails
    }

    res.json({
      message: 'Payment approved successfully',
      loan
    });
  } catch (error) {
    console.error('Approve payment error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   POST /api/admin/payments/:loanId/reject
// @desc    Reject payment - mark as failed
// @access  Public (should be protected in production)
router.post('/payments/:loanId/reject', [
  body('reason').optional().trim()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const loan = await Loan.findById(req.params.loanId);
    
    if (!loan) {
      return res.status(404).json({ message: 'Loan not found' });
    }

    if (loan.status !== 'payment_validation') {
      return res.status(400).json({ message: 'Payment is not in validation status' });
    }

    loan.paymentStatus = 'failed';
    loan.status = 'payment_failed'; // Set to payment_failed so user can retry payment
    loan.depositPaid = false; // Reset deposit paid flag
    loan.remarks = req.body.reason || 'Payment verification failed';

    await loan.save();

    // Send payment failure email immediately when admin rejects
    try {
      const user = await User.findById(loan.user);
      if (user) {
        await sendPaymentFailureEmail(user, loan);
      }
    } catch (emailError) {
      console.error('Error sending payment failure email:', emailError);
      // Don't fail the rejection if email fails
    }

    res.json({
      message: 'Payment rejected. User can retry payment.',
      loan
    });
  } catch (error) {
    console.error('Reject payment error:', error);
    // Provide more detailed error message
    if (error.name === 'ValidationError') {
      return res.status(400).json({ 
        message: 'Validation error', 
        error: error.message,
        details: Object.keys(error.errors || {}).map(key => ({
          field: key,
          message: error.errors[key].message
        }))
      });
    }
    res.status(500).json({ 
      message: 'Server error',
      error: error.message || 'Unknown error occurred'
    });
  }
});

module.exports = router;

