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
    default: '',
    validate: {
      validator: function(value) {
        // Allow empty string
        if (!value || value === '') return true;
        // Must be 9-18 digits only
        const cleanValue = value.replace(/\s|-/g, '');
        if (!/^\d{9,18}$/.test(cleanValue)) {
          return false;
        }
        // Cannot be all same digits
        if (/^(\d)\1+$/.test(cleanValue)) {
          return false;
        }
        return true;
      },
      message: 'Bank account number must be 9-18 digits and cannot be all same digits'
    }
  },
  ifscCode: {
    type: String,
    default: '',
    validate: {
      validator: function(value) {
        // Allow empty string
        if (!value || value === '') return true;
        // Must be exactly 11 characters: 4 letters + 0 + 6 alphanumeric
        const cleanValue = value.toUpperCase().replace(/[^A-Z0-9]/g, '');
        if (cleanValue.length !== 11) return false;
        // First 4 must be letters only
        if (!/^[A-Z]{4}$/.test(cleanValue.substring(0, 4))) return false;
        // 5th must be 0
        if (cleanValue[4] !== '0') return false;
        // Full format validation
        return /^[A-Z]{4}0[A-Z0-9]{6}$/.test(cleanValue);
      },
      message: 'IFSC code must be exactly 11 characters: 4 letters + 0 + 6 alphanumeric (e.g., HDFC0001234)'
    }
  },
  bankName: {
    type: String,
    default: '',
    validate: {
      validator: function(value) {
        // Allow empty string
        if (!value || value === '') return true;
        const trimmed = value.trim();
        // Must be 3-100 characters
        if (trimmed.length < 3 || trimmed.length > 100) return false;
        // Must start with letter
        if (!/^[a-zA-Z]/.test(trimmed)) return false;
        // Must contain at least one letter
        if (!/[a-zA-Z]/.test(trimmed)) return false;
        // Valid characters only
        if (!/^[a-zA-Z0-9\s.'&-]+$/.test(trimmed)) return false;
        // Cannot be only numbers
        if (/^\d+$/.test(trimmed.replace(/\s/g, ''))) return false;
        return true;
      },
      message: 'Bank name must be 3-100 characters, start with a letter, and contain valid characters'
    }
  },
  accountHolderName: {
    type: String,
    default: '',
    validate: {
      validator: function(value) {
        // Allow empty string
        if (!value || value === '') return true;
        const trimmed = value.trim();
        // Must be 3-50 characters
        if (trimmed.length < 3 || trimmed.length > 50) return false;
        // Must start and end with letter
        if (!/^[a-zA-Z]/.test(trimmed) || !/[a-zA-Z]$/.test(trimmed)) return false;
        // Cannot contain numbers
        if (/\d/.test(trimmed)) return false;
        // Valid format: letters with optional spaces, dots, hyphens, apostrophes
        if (!/^[a-zA-Z]+([\s.'-][a-zA-Z]+)*$/.test(trimmed)) return false;
        return true;
      },
      message: 'Account holder name must be 3-50 characters, start/end with letter, no numbers, proper name format'
    }
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
