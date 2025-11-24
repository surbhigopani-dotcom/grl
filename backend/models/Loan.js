const mongoose = require('mongoose');

const loanSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  loanId: {
    type: String,
    unique: true,
    required: false, // Will be generated in pre-save hook
    default: null // Allow null initially
  },
  requestedAmount: {
    type: Number,
    required: true,
    min: 1
  },
  approvedAmount: {
    type: Number,
    default: 0
  },
  interestRate: {
    type: Number,
    default: 0
  },
  tenure: {
    type: Number,
    default: 0 // in months
  },
  status: {
    type: String,
    enum: ['pending', 'validating', 'approved', 'tenure_selection', 'sanction_letter_viewed', 'signature_pending', 'payment_pending', 'payment_validation', 'processing', 'completed', 'rejected', 'cancelled'],
    default: 'pending',
    index: true
  },
  emiAmount: {
    type: Number,
    default: 0
  },
  totalInterest: {
    type: Number,
    default: 0
  },
  totalAmount: {
    type: Number,
    default: 0 // Principal + Interest
  },
  digitalSignature: {
    type: String,
    default: '' // Base64 signature or signature URL
  },
  signatureDate: {
    type: Date
  },
  sanctionLetterViewed: {
    type: Boolean,
    default: false
  },
  depositAmount: {
    type: Number,
    default: 0
  },
  fileCharge: {
    type: Number,
    default: 0
  },
  platformFee: {
    type: Number,
    default: 0
  },
  tax: {
    type: Number,
    default: 0
  },
  totalPaymentAmount: {
    type: Number,
    default: 0
  },
  depositPaid: {
    type: Boolean,
    default: false
  },
  paymentId: {
    type: String,
    default: '',
    index: true
  },
  paymentMethod: {
    type: String,
    default: ''
  },
  paymentStatus: {
    type: String,
    enum: ['pending', 'success', 'failed', 'refunded'],
    default: 'pending'
  },
  appliedAt: {
    type: Date,
    default: Date.now,
    index: true
  },
  validatedAt: {
    type: Date
  },
  approvedAt: {
    type: Date
  },
  paymentAt: {
    type: Date
  },
  processingStartDate: {
    type: Date
  },
  expectedCompletionDate: {
    type: Date
  },
  completedAt: {
    type: Date
  },
  rejectedAt: {
    type: Date
  },
  rejectionReason: {
    type: String,
    default: ''
  },
  documents: [{
    type: {
      type: String,
      enum: ['aadhar', 'pan', 'bank_statement', 'salary_slip', 'other']
    },
    url: String,
    uploadedAt: Date
  }],
  remarks: {
    type: String,
    default: ''
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

// Generate unique loan ID before validation
loanSchema.pre('validate', function(next) {
  // Set a temporary value to pass validation if loanId is missing
  if (!this.loanId && this.isNew) {
    this.loanId = `TEMP${Date.now()}`;
  }
  next();
});

// Generate unique loan ID before saving
loanSchema.pre('save', async function(next) {
  // Always generate loanId if it doesn't exist or is temporary
  if (!this.loanId || this.loanId.startsWith('TEMP')) {
    try {
      // Get the count of all loans to generate unique ID
      const LoanModel = mongoose.model('Loan');
      const count = await LoanModel.countDocuments();
      // Start from 100000 (1 lakh)
      const startNumber = 100000;
      const nextNumber = startNumber + count;
      this.loanId = `LOAN${String(nextNumber).padStart(8, '0')}`;
      
      // Ensure uniqueness by checking if ID exists
      let exists = await LoanModel.findOne({ loanId: this.loanId });
      let counter = 1;
      while (exists && counter < 1000) {
        this.loanId = `LOAN${String(nextNumber + counter).padStart(8, '0')}`;
        exists = await LoanModel.findOne({ loanId: this.loanId });
        counter++;
      }
    } catch (error) {
      console.error('Error generating loanId:', error);
      // Fallback: use timestamp if count fails
      this.loanId = `LOAN${Date.now().toString().slice(-8)}`;
    }
  }
  this.updatedAt = new Date();
  next();
});

module.exports = mongoose.model('Loan', loanSchema);
