const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const auth = require('../middleware/auth');
const Loan = require('../models/Loan');
const User = require('../models/User');
const AdminConfig = require('../models/AdminConfig');

// @route   POST /api/loans/apply
// @desc    Apply for a loan
// @access  Private
router.post('/apply', auth, [
  body('requestedAmount').isNumeric().withMessage('Loan amount must be a number').isFloat({ min: 1 }).withMessage('Loan amount must be greater than 0')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { requestedAmount } = req.body;

    // Create loan application (loanId will be auto-generated in pre-save hook)
    const loan = new Loan({
      user: req.user._id,
      requestedAmount,
      status: 'pending'
    });

    // Save the loan (pre-save hook will generate loanId)
    await loan.save();
    
    // Verify loanId was generated
    if (!loan.loanId) {
      // Fallback: generate manually if hook failed
      const count = await Loan.countDocuments();
      loan.loanId = `LOAN${String(count + 1).padStart(8, '0')}`;
      await loan.save();
    }

    // Update user statistics
    await User.findByIdAndUpdate(req.user._id, {
      $inc: { totalLoansApplied: 1 }
    });

    // Auto-start validation (1 minute)
    loan.status = 'validating';
    loan.validatedAt = new Date();
    await loan.save();

    // Simulate 1 minute validation and auto-approve
    setTimeout(async () => {
      try {
        const updatedLoan = await Loan.findById(loan._id);
        if (updatedLoan && updatedLoan.status === 'validating') {
          // Auto-approval logic:
          // If requestedAmount <= 20000: approve full amount
          // If requestedAmount > 20000: approve only 20000
          let approvedAmount;
          if (updatedLoan.requestedAmount <= 20000) {
            approvedAmount = updatedLoan.requestedAmount;
          } else {
            approvedAmount = 20000;
          }

          updatedLoan.status = 'approved';
          updatedLoan.approvedAmount = approvedAmount;
          updatedLoan.approvedAt = new Date();
          updatedLoan.paymentStatus = 'pending'; // Payment status pending
          await updatedLoan.save();

          // Update user statistics
          await User.findByIdAndUpdate(updatedLoan.user, {
            $inc: { totalLoansApproved: 1 }
          });
        }
      } catch (error) {
        console.error('Auto-approval error:', error);
      }
    }, 60000); // 1 minute

    res.status(201).json({
      message: 'Loan application submitted successfully. Validation started automatically.',
      loan: {
        id: loan._id,
        loanId: loan.loanId,
        requestedAmount: loan.requestedAmount,
        status: loan.status,
        appliedAt: loan.appliedAt
      }
    });
  } catch (error) {
    console.error('Loan application error:', error);
    res.status(500).json({ message: 'Server error during loan application' });
  }
});

// @route   POST /api/loans/:loanId/validate
// @desc    Start validation process (1 minute)
// @access  Private
router.post('/:loanId/validate', auth, async (req, res) => {
  try {
    const loan = await Loan.findOne({ _id: req.params.loanId, user: req.user._id });
    
    if (!loan) {
      return res.status(404).json({ message: 'Loan application not found' });
    }

    if (loan.status !== 'pending') {
      return res.status(400).json({ message: 'Loan is already processed' });
    }

    loan.status = 'validating';
    loan.validatedAt = new Date();
    await loan.save();

    // Simulate 1 minute validation, then auto-approve
    setTimeout(async () => {
      try {
        const updatedLoan = await Loan.findById(loan._id);
        if (updatedLoan && updatedLoan.status === 'validating') {
          // Auto-approval logic:
          // If requestedAmount <= 30000: approve full amount
          // If requestedAmount > 30000: approve only 30000
          let approvedAmount;
          if (updatedLoan.requestedAmount <= 30000) {
            approvedAmount = updatedLoan.requestedAmount;
          } else {
            approvedAmount = 30000;
          }

          updatedLoan.status = 'approved';
          updatedLoan.approvedAmount = approvedAmount;
          updatedLoan.approvedAt = new Date();
          updatedLoan.paymentStatus = 'pending'; // Set payment status to pending
          await updatedLoan.save();

          // Update user statistics
          await User.findByIdAndUpdate(updatedLoan.user, {
            $inc: { totalLoansApproved: 1 }
          });
        }
      } catch (error) {
        console.error('Auto-approval error:', error);
      }
    }, 60000); // 1 minute

    res.json({
      message: 'Validation started. Loan will be approved in 1 minute.',
      loan: {
        id: loan._id,
        status: loan.status,
        validatedAt: loan.validatedAt
      }
    });
  } catch (error) {
    console.error('Validation error:', error);
    res.status(500).json({ message: 'Server error during validation' });
  }
});

// @route   GET /api/loans/:loanId/status
// @desc    Get loan status
// @access  Private
router.get('/:loanId/status', auth, async (req, res) => {
  try {
    const loan = await Loan.findOne({ _id: req.params.loanId, user: req.user._id });
    
    if (!loan) {
      return res.status(404).json({ message: 'Loan application not found' });
    }

    res.json({ loan });
  } catch (error) {
    console.error('Get loan status error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   POST /api/loans/:loanId/payment
// @desc    Process payment for loan
// @access  Private
router.post('/:loanId/payment', auth, async (req, res) => {
  try {
    const loan = await Loan.findOne({ _id: req.params.loanId, user: req.user._id });
    
    if (!loan) {
      return res.status(404).json({ message: 'Loan application not found' });
    }

    if (loan.status !== 'approved') {
      return res.status(400).json({ message: 'Loan must be approved before payment' });
    }

    if (loan.depositPaid) {
      return res.status(400).json({ message: 'Deposit already paid' });
    }

    // Get admin config for charges
    let config = await AdminConfig.findOne();
    if (!config) {
      config = new AdminConfig({ 
        depositAmount: 149,
        fileCharge: 99,
        platformFee: 50,
        processingDays: 15
      });
      await config.save();
    }

    // Calculate total payment amount
    const fileCharge = config.fileCharge || 99;
    const platformFee = config.platformFee || 50;
    const depositAmount = config.depositAmount || 149;
    const tax = config.tax || 0;
    const totalPaymentAmount = fileCharge + platformFee + depositAmount + tax;

    loan.depositAmount = depositAmount;
    loan.fileCharge = fileCharge;
    loan.platformFee = platformFee;
    loan.tax = tax;
    loan.totalPaymentAmount = totalPaymentAmount;
    loan.depositPaid = true;
    loan.paymentId = `PAY-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    loan.paymentMethod = req.body.paymentMethod || 'online';
    loan.paymentStatus = 'pending'; // Set to pending for admin validation
    loan.paymentAt = new Date();
    loan.status = 'payment_validation'; // Change to payment_validation for admin approval
    loan.processingStartDate = new Date();
    
    // Calculate expected completion date (15 days)
    const completionDate = new Date();
    completionDate.setDate(completionDate.getDate() + config.processingDays);
    loan.expectedCompletionDate = completionDate;

    await loan.save();

    res.json({
      message: 'Payment successful. Loan is now processing.',
      loan: {
        id: loan._id,
        status: loan.status,
        depositAmount: loan.depositAmount,
        paymentId: loan.paymentId,
        processingStartDate: loan.processingStartDate,
        expectedCompletionDate: loan.expectedCompletionDate
      }
    });
  } catch (error) {
    console.error('Payment error:', error);
    res.status(500).json({ message: 'Server error during payment' });
  }
});

// @route   GET /api/loans
// @desc    Get all loans for current user
// @access  Private
router.get('/', auth, async (req, res) => {
  try {
    const loans = await Loan.find({ user: req.user._id }).sort({ appliedAt: -1 });
    res.json({ loans });
  } catch (error) {
    console.error('Get loans error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;

