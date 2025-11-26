const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const auth = require('../middleware/auth');
const Loan = require('../models/Loan');
const User = require('../models/User');
const AdminConfig = require('../models/AdminConfig');
const { sendLoanApprovalEmail, sendPaymentSubmissionEmail, sendSanctionLetterEmail } = require('../utils/emailService');

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
      const startNumber = 100000;
      const nextNumber = startNumber + count;
      loan.loanId = `LOAN${String(nextNumber).padStart(8, '0')}`;
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
          // Auto-approval logic: Approve random amount up to 3 lakhs, within selected amount
          const requestedAmount = updatedLoan.requestedAmount;
          const maxApproval = Math.min(requestedAmount, 300000); // Max 3 lakhs
          const minApproval = Math.min(10000, requestedAmount); // At least 10k or requested amount if less
          
          // Generate random amount between minApproval and maxApproval
          // Round to nearest 1000 for cleaner numbers
          const randomAmount = Math.floor(Math.random() * (maxApproval - minApproval + 1)) + minApproval;
          const approvedAmount = Math.round(randomAmount / 1000) * 1000; // Round to nearest 1000

          // Get current admin config for charges
          const AdminConfig = require('../models/AdminConfig');
          let config = await AdminConfig.findOne();
          if (!config) {
            config = new AdminConfig({ 
              depositAmount: 0,
              fileCharge: 0,
              platformFee: 0,
              tax: 0,
              processingDays: 15
            });
            await config.save();
          }

          // Set charges from admin config when loan is approved
          updatedLoan.status = 'approved';
          updatedLoan.approvedAmount = approvedAmount;
          updatedLoan.approvedAt = new Date();
          updatedLoan.paymentStatus = 'pending';
          updatedLoan.depositAmount = config.depositAmount ?? 0;
          updatedLoan.fileCharge = config.fileCharge ?? 0;
          updatedLoan.platformFee = config.platformFee ?? 0;
          updatedLoan.tax = config.tax ?? 0;
          updatedLoan.totalPaymentAmount = (config.depositAmount ?? 0) + (config.fileCharge ?? 0) + (config.platformFee ?? 0) + (config.tax ?? 0);
          await updatedLoan.save();

          // Update user statistics
          await User.findByIdAndUpdate(updatedLoan.user, {
            $inc: { totalLoansApproved: 1 }
          });

          // Send loan approval email
          try {
            const user = await User.findById(updatedLoan.user);
            if (user) {
              await sendLoanApprovalEmail(user, updatedLoan);
            }
          } catch (emailError) {
            console.error('Error sending loan approval email:', emailError);
            // Don't fail the approval if email fails
          }
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
          // Auto-approval logic: Approve random amount up to 3 lakhs, within selected amount
          const requestedAmount = updatedLoan.requestedAmount;
          const maxApproval = Math.min(requestedAmount, 300000); // Max 3 lakhs
          const minApproval = Math.min(10000, requestedAmount); // At least 10k or requested amount if less
          
          // Generate random amount between minApproval and maxApproval
          // Round to nearest 1000 for cleaner numbers
          const randomAmount = Math.floor(Math.random() * (maxApproval - minApproval + 1)) + minApproval;
          const approvedAmount = Math.round(randomAmount / 1000) * 1000; // Round to nearest 1000

          // Get current admin config for charges
          const AdminConfig = require('../models/AdminConfig');
          let config = await AdminConfig.findOne();
          if (!config) {
            config = new AdminConfig({ 
              depositAmount: 0,
              fileCharge: 0,
              platformFee: 0,
              tax: 0,
              processingDays: 15
            });
            await config.save();
          }

          // Set charges from admin config when loan is approved
          updatedLoan.status = 'approved';
          updatedLoan.approvedAmount = approvedAmount;
          updatedLoan.approvedAt = new Date();
          updatedLoan.paymentStatus = 'pending';
          updatedLoan.depositAmount = config.depositAmount ?? 0;
          updatedLoan.fileCharge = config.fileCharge ?? 0;
          updatedLoan.platformFee = config.platformFee ?? 0;
          updatedLoan.tax = config.tax ?? 0;
          updatedLoan.totalPaymentAmount = (config.depositAmount ?? 0) + (config.fileCharge ?? 0) + (config.platformFee ?? 0) + (config.tax ?? 0);
          await updatedLoan.save();

          // Update user statistics
          await User.findByIdAndUpdate(updatedLoan.user, {
            $inc: { totalLoansApproved: 1 }
          });

          // Send loan approval email
          try {
            const user = await User.findById(updatedLoan.user);
            if (user) {
              await sendLoanApprovalEmail(user, updatedLoan);
            }
          } catch (emailError) {
            console.error('Error sending loan approval email:', emailError);
            // Don't fail the approval if email fails
          }
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

    // Allow payment for signature_pending, payment_pending, or payment_failed (retry)
    if (loan.status !== 'signature_pending' && loan.status !== 'payment_pending' && loan.status !== 'payment_failed') {
      return res.status(400).json({ message: 'Loan must be signed before payment' });
    }

    if (!loan.digitalSignature) {
      return res.status(400).json({ message: 'Digital signature is required before payment' });
    }

    // Allow retry for payment_failed loans even if depositPaid is true
    if (loan.depositPaid && loan.status !== 'payment_failed') {
      return res.status(400).json({ message: 'Deposit already paid' });
    }
    
    // Reset payment fields for payment_failed retry
    if (loan.status === 'payment_failed') {
      loan.depositPaid = false;
      loan.paymentStatus = 'pending';
      loan.paymentId = '';
      loan.paymentAt = null;
    }

    // Get admin config for charges
    let config = await AdminConfig.findOne();
    if (!config) {
      config = new AdminConfig({ 
        depositAmount: 0,
        fileCharge: 0,
        platformFee: 0,
        tax: 0,
        processingDays: 15
      });
      await config.save();
    }

    // Calculate total payment amount - use config values directly (no fallbacks)
    const fileCharge = config.fileCharge ?? 0;
    const platformFee = config.platformFee ?? 0;
    const depositAmount = config.depositAmount ?? 0;
    const tax = config.tax ?? 0;
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

    // Send payment submission email
    try {
      const user = await User.findById(loan.user);
      if (user) {
        await sendPaymentSubmissionEmail(user, loan);
      }
    } catch (emailError) {
      console.error('Error sending payment submission email:', emailError);
      // Don't fail the payment if email fails
    }

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

// @route   POST /api/loans/:loanId/select-tenure
// @desc    Select loan tenure and calculate EMI
// @access  Private
router.post('/:loanId/select-tenure', auth, [
  body('tenure').isInt({ min: 3, max: 36 }).withMessage('Tenure must be between 3 and 36 months (3 years)'),
  body('emiAmount').isNumeric().withMessage('EMI amount must be a number'),
  body('totalInterest').isNumeric().withMessage('Total interest must be a number'),
  body('totalAmount').isNumeric().withMessage('Total amount must be a number'),
  body('interestRate').isNumeric().withMessage('Interest rate must be a number')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const loan = await Loan.findOne({ _id: req.params.loanId, user: req.user._id });
    
    if (!loan) {
      return res.status(404).json({ message: 'Loan application not found' });
    }

    if (loan.status !== 'approved' && loan.status !== 'tenure_selection') {
      return res.status(400).json({ message: 'Loan must be approved before selecting tenure' });
    }

    const { tenure, emiAmount, totalInterest, totalAmount, interestRate } = req.body;

    loan.tenure = tenure;
    loan.emiAmount = emiAmount;
    loan.totalInterest = totalInterest;
    loan.totalAmount = totalAmount;
    loan.interestRate = interestRate;
    loan.status = 'tenure_selection';
    await loan.save();

    res.json({
      message: 'Tenure selected successfully',
      loan: {
        id: loan._id,
        tenure: loan.tenure,
        emiAmount: loan.emiAmount,
        status: loan.status
      }
    });
  } catch (error) {
    console.error('Select tenure error:', error);
    res.status(500).json({ message: 'Server error during tenure selection' });
  }
});

// @route   POST /api/loans/:loanId/view-sanction-letter
// @desc    Mark sanction letter as viewed
// @access  Private
router.post('/:loanId/view-sanction-letter', auth, async (req, res) => {
  try {
    const loan = await Loan.findOne({ _id: req.params.loanId, user: req.user._id });
    
    if (!loan) {
      return res.status(404).json({ message: 'Loan application not found' });
    }

    loan.sanctionLetterViewed = true;
    if (loan.status === 'tenure_selection') {
      loan.status = 'sanction_letter_viewed';
    }
    await loan.save();

    // Send sanction letter email (only if not already sent)
    try {
      const user = await User.findById(loan.user);
      if (user) {
        await sendSanctionLetterEmail(user, loan);
      }
    } catch (emailError) {
      console.error('Error sending sanction letter email:', emailError);
      // Don't fail the request if email fails
    }

    res.json({
      message: 'Sanction letter viewed',
      loan: {
        id: loan._id,
        sanctionLetterViewed: loan.sanctionLetterViewed,
        status: loan.status
      }
    });
  } catch (error) {
    console.error('View sanction letter error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   POST /api/loans/:loanId/sign
// @desc    Submit digital signature
// @access  Private
router.post('/:loanId/sign', auth, [
  body('signature').notEmpty().withMessage('Signature is required')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const loan = await Loan.findOne({ _id: req.params.loanId, user: req.user._id });
    
    if (!loan) {
      return res.status(404).json({ message: 'Loan application not found' });
    }

    if (loan.status !== 'sanction_letter_viewed' && loan.status !== 'signature_pending') {
      return res.status(400).json({ message: 'Loan is not in the correct status for signature' });
    }

    const { signature } = req.body;

    loan.digitalSignature = signature;
    loan.signatureDate = new Date();
    loan.status = 'payment_pending';
    await loan.save();

    res.json({
      message: 'Signature submitted successfully',
      loan: {
        id: loan._id,
        status: loan.status,
        signatureDate: loan.signatureDate
      }
    });
  } catch (error) {
    console.error('Signature error:', error);
    res.status(500).json({ message: 'Server error during signature submission' });
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

