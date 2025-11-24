const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const AdminConfig = require('../models/AdminConfig');
const Loan = require('../models/Loan');

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

