const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  // Basic Info
  name: {
    type: String,
    required: true,
    trim: true
  },
  phone: {
    type: String,
    required: true,
    unique: true,
    trim: true
  },
  email: {
    type: String,
    default: '',
    lowercase: true,
    trim: true
  },
  dateOfBirth: {
    type: Date,
    default: null
  },
  
  // Address Info
  address: {
    type: String,
    default: ''
  },
  city: {
    type: String,
    default: ''
  },
  state: {
    type: String,
    default: ''
  },
  pincode: {
    type: String,
    default: ''
  },
  
  // Employment Info
  employmentType: {
    type: String,
    default: null,
    required: false,
    validate: {
      validator: function(value) {
        // Allow null, undefined, or empty string
        if (value === null || value === undefined || value === '') {
          return true;
        }
        // Validate against enum values only if value is provided
        return ['salaried', 'self_employed', 'business', 'unemployed', 'student', 'other'].includes(value);
      },
      message: 'Employment type must be one of: salaried, self_employed, business, unemployed, student, other'
    }
  },
  companyName: {
    type: String,
    default: ''
  },
  
  // Document Info
  aadharNumber: {
    type: String,
    default: ''
  },
  panNumber: {
    type: String,
    default: ''
  },
  bankAccountNumber: {
    type: String,
    default: ''
  },
  ifscCode: {
    type: String,
    default: ''
  },
  bankName: {
    type: String,
    default: ''
  },
  accountHolderName: {
    type: String,
    default: ''
  },
  
  // Document URLs
  aadharCardUrl: {
    type: String,
    default: ''
  },
  panCardUrl: {
    type: String,
    default: ''
  },
  selfieUrl: {
    type: String,
    default: ''
  },
  
  // Status Flags
  isPhoneVerified: {
    type: Boolean,
    default: false
  },
  isProfileComplete: {
    type: Boolean,
    default: false
  },
  
  // Statistics
  totalLoansApplied: {
    type: Number,
    default: 0
  },
  totalLoansApproved: {
    type: Number,
    default: 0
  },
  
  // Timestamps
  createdAt: {
    type: Date,
    default: Date.now
  },
  lastLoginAt: {
    type: Date
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

// Pre-save hook to handle empty employmentType
userSchema.pre('save', function(next) {
  // Convert empty string to null for employmentType
  if (this.employmentType === '' || this.employmentType === undefined) {
    this.employmentType = null;
  }
  next();
});

// Check if profile is complete
userSchema.methods.checkProfileComplete = function() {
  return !!(
    this.name &&
    this.phone &&
    this.email &&
    this.dateOfBirth &&
    this.address &&
    this.city &&
    this.state &&
    this.pincode &&
    this.employmentType &&
    (this.employmentType !== 'unemployed' ? this.companyName : true) &&
    this.aadharNumber &&
    this.panNumber
  );
};

module.exports = mongoose.model('User', userSchema);
