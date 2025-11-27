const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const { body, validationResult } = require('express-validator');
const User = require('../models/User');
const OTP = require('../models/OTP');
const auth = require('../middleware/auth');
const { auth: firebaseAuth } = require('../config/firebaseAdmin');
const { sendOTP: sendWhatsAppOTP, cleanPhoneNumber } = require('../utils/whatsappService');

// Generate JWT Token
const generateToken = (userId) => {
  return jwt.sign({ userId }, process.env.JWT_SECRET, { expiresIn: '30d' });
};

// @route   POST /api/auth/check-user
// @desc    Check if user exists (for frontend to know if name is needed)
// @access  Public
router.post('/check-user', [
  body('phone').notEmpty().withMessage('Phone number is required')
], async (req, res) => {
  try {
    console.log('=== CHECK USER REQUEST ===');
    console.log('Request body:', req.body);
    
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      console.log('Validation errors:', errors.array());
      return res.status(400).json({ errors: errors.array() });
    }

    const { phone } = req.body;
    console.log('Original phone:', phone);
    
    // Clean phone number - remove +91, spaces, dashes, and keep only digits
    let cleanPhone = phone.replace(/\+91|\s|-/g, '');
    console.log('After removing +91/spaces/dashes:', cleanPhone);
    
    // If phone starts with 0, remove it
    if (cleanPhone.startsWith('0')) {
      cleanPhone = cleanPhone.substring(1);
      console.log('After removing leading 0:', cleanPhone);
    }
    // Ensure it's 10 digits
    if (cleanPhone.length > 10) {
      cleanPhone = cleanPhone.slice(-10);
      console.log('After trimming to 10 digits:', cleanPhone);
    }
    
    console.log('Final clean phone:', cleanPhone);
    console.log('Searching for user with phone:', cleanPhone);
    
    const user = await User.findOne({ phone: cleanPhone });
    console.log('User found:', !!user);
    if (user) {
      console.log('User ID:', user._id);
      console.log('User name:', user.name);
    }
    
    const result = {
      exists: !!user,
      isNewUser: !user
    };
    console.log('Response:', result);
    console.log('=== CHECK USER COMPLETE ===\n');
    
    res.json(result);
  } catch (error) {
    console.error('=== CHECK USER ERROR ===');
    console.error('Error:', error);
    console.error('Error stack:', error.stack);
    console.error('=== CHECK USER ERROR END ===\n');
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   POST /api/auth/verify-firebase
// @desc    Verify Firebase ID token and create/login user
// @access  Public
router.post('/verify-firebase', [
  body('idToken').notEmpty().withMessage('ID token is required'),
  body('phoneNumber').notEmpty().withMessage('Phone number is required'),
  body('name').optional().trim()
], async (req, res) => {
  try {
    console.log('=== VERIFY FIREBASE REQUEST ===');
    console.log('Request received at:', new Date().toISOString());
    console.log('Request body keys:', Object.keys(req.body));
    console.log('Phone number provided:', req.body.phoneNumber ? 'Yes' : 'No');
    console.log('Name provided:', req.body.name ? `Yes: "${req.body.name}"` : 'No');
    console.log('ID Token provided:', req.body.idToken ? 'Yes (length: ' + req.body.idToken.length + ')' : 'No');
    
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      console.log('Validation errors:', errors.array());
      console.log('=== VERIFY FIREBASE VALIDATION ERROR ===\n');
      return res.status(400).json({ errors: errors.array() });
    }

    const { idToken, phoneNumber, name } = req.body;
    console.log('Processing phone:', phoneNumber);
    console.log('Processing name:', name || 'Not provided');
    
    // Clean phone number - remove +91, spaces, dashes, and keep only digits
    let cleanPhone = phoneNumber.replace(/\+91|\s|-/g, '');
    console.log('After removing +91/spaces/dashes:', cleanPhone);
    
    // If phone starts with 0, remove it
    if (cleanPhone.startsWith('0')) {
      cleanPhone = cleanPhone.substring(1);
      console.log('After removing leading 0:', cleanPhone);
    }
    // Ensure it's 10 digits
    if (cleanPhone.length > 10) {
      cleanPhone = cleanPhone.slice(-10);
      console.log('After trimming to 10 digits:', cleanPhone);
    }
    
    console.log('Final clean phone:', cleanPhone);
    
    // Verify Firebase ID token
    let decodedToken;
    try {
      console.log('Verifying Firebase ID token...');
      decodedToken = await firebaseAuth.verifyIdToken(idToken);
      console.log('Firebase token verified successfully');
      console.log('Decoded token phone:', decodedToken.phone_number);
    } catch (error) {
      console.error('=== FIREBASE TOKEN VERIFICATION ERROR ===');
      console.error('Error:', error.message);
      console.error('Error code:', error.code);
      console.error('=== FIREBASE TOKEN ERROR END ===\n');
      return res.status(401).json({ message: 'Invalid or expired Firebase token' });
    }

    // Verify phone number matches
    if (decodedToken.phone_number) {
      let tokenPhone = decodedToken.phone_number.replace(/\+91|\s|-/g, '');
      console.log('Token phone after cleaning:', tokenPhone);
      
      // If phone starts with 0, remove it
      if (tokenPhone.startsWith('0')) {
        tokenPhone = tokenPhone.substring(1);
        console.log('Token phone after removing 0:', tokenPhone);
      }
      // Ensure it's 10 digits
      if (tokenPhone.length > 10) {
        tokenPhone = tokenPhone.slice(-10);
        console.log('Token phone after trimming:', tokenPhone);
      }
      
      console.log('Comparing token phone:', tokenPhone, 'with clean phone:', cleanPhone);
      if (tokenPhone !== cleanPhone) {
        console.log('=== PHONE NUMBER MISMATCH ===');
        console.log('Token phone:', tokenPhone);
        console.log('Clean phone:', cleanPhone);
        console.log('=== PHONE MISMATCH END ===\n');
        return res.status(400).json({ message: 'Phone number mismatch' });
      }
      console.log('Phone numbers match ✓');
    }

    // Find or create user
    console.log('Searching for user with phone:', cleanPhone);
    let user = await User.findOne({ phone: cleanPhone });
    let isNewUserFlag = false;

    if (!user) {
      console.log('User not found - NEW USER SIGNUP');
      // New user signup - check name before creating
      if (!name || !name.trim()) {
        console.log('=== NAME REQUIRED ERROR ===');
        console.log('Name provided:', name);
        console.log('Name trimmed:', name ? name.trim() : 'N/A');
        console.log('=== NAME REQUIRED ERROR END ===\n');
        return res.status(400).json({ 
          message: 'Name is required for new users',
          isNewUser: true,
          requiresName: true
        });
      }
      
      console.log('Creating new user with:');
      console.log('- Phone:', cleanPhone);
      console.log('- Name:', name.trim());
      
      try {
        user = new User({
          phone: cleanPhone,
          name: name.trim(),
          isPhoneVerified: true,
          totalLoansApplied: 0,
          totalLoansApproved: 0,
          employmentType: null // Explicitly set to null for new users
        });
        
        console.log('User object created, attempting to save...');
        await user.save();
        console.log('User saved successfully!');
        console.log('User ID:', user._id);
        isNewUserFlag = true;
      } catch (saveError) {
        console.error('=== USER SAVE ERROR ===');
        console.error('Error:', saveError);
        console.error('Error name:', saveError.name);
        console.error('Error message:', saveError.message);
        if (saveError.errors) {
          console.error('Validation errors:', saveError.errors);
        }
        console.error('Error stack:', saveError.stack);
        console.error('=== USER SAVE ERROR END ===\n');
        throw saveError;
      }
    } else {
      console.log('User found - EXISTING USER LOGIN');
      console.log('User ID:', user._id);
      console.log('User name:', user.name);
      // Existing user login - no name needed
      user.isPhoneVerified = true;
      user.lastLoginAt = new Date();
      await user.save();
      console.log('User updated successfully');
      isNewUserFlag = false;
    }

    // Generate JWT token for our backend
    console.log('Generating JWT token for user:', user._id);
    const token = generateToken(user._id);
    console.log('JWT token generated successfully');

    const responseData = {
      token,
      user: {
        id: user._id,
        name: user.name,
        phone: user.phone,
        email: user.email,
        dateOfBirth: user.dateOfBirth,
        address: user.address,
        city: user.city,
        state: user.state,
        pincode: user.pincode,
        employmentType: user.employmentType,
        companyName: user.companyName,
        aadharNumber: user.aadharNumber,
        panNumber: user.panNumber,
        bankAccountNumber: user.bankAccountNumber,
        ifscCode: user.ifscCode,
        additionalDetails: user.additionalDetails,
        isPhoneVerified: user.isPhoneVerified,
        isProfileComplete: user.isProfileComplete,
        totalLoansApplied: user.totalLoansApplied,
        totalLoansApproved: user.totalLoansApproved
      },
      isNewUser: isNewUserFlag
    };
    
    console.log('=== VERIFY FIREBASE SUCCESS ===');
    console.log('Is new user:', isNewUserFlag);
    console.log('User ID:', user._id);
    console.log('User name:', user.name);
    console.log('Token generated:', !!token);
    console.log('=== VERIFY FIREBASE COMPLETE ===\n');
    
    res.json(responseData);
  } catch (error) {
    console.error('=== VERIFY FIREBASE ERROR ===');
    console.error('Error occurred at:', new Date().toISOString());
    console.error('Error name:', error.name);
    console.error('Error message:', error.message);
    if (error.errors) {
      console.error('Validation errors:', JSON.stringify(error.errors, null, 2));
    }
    if (error.stack) {
      console.error('Error stack:', error.stack);
    }
    console.error('=== VERIFY FIREBASE ERROR END ===\n');
    res.status(500).json({ message: 'Server error during authentication' });
  }
});

// @route   POST /api/auth/login-direct
// @desc    Direct login/signup with phone number (when OTP is disabled)
// @access  Public
router.post('/login-direct', [
  body('phoneNumber').notEmpty().withMessage('Phone number is required'),
  body('name').optional().trim()
], async (req, res) => {
  try {
    console.log('=== DIRECT LOGIN REQUEST ===');
    console.log('Request received at:', new Date().toISOString());
    console.log('Request body keys:', Object.keys(req.body));
    console.log('Phone number provided:', req.body.phoneNumber ? 'Yes' : 'No');
    console.log('Name provided:', req.body.name ? `Yes: "${req.body.name}"` : 'No');
    
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      console.log('Validation errors:', errors.array());
      console.log('=== DIRECT LOGIN VALIDATION ERROR ===\n');
      return res.status(400).json({ errors: errors.array() });
    }

    const { phoneNumber, name } = req.body;
    console.log('Processing phone:', phoneNumber);
    console.log('Processing name:', name || 'Not provided');
    
    // Clean phone number - remove +91, spaces, dashes, and keep only digits
    let cleanPhone = phoneNumber.replace(/\+91|\s|-/g, '');
    console.log('After removing +91/spaces/dashes:', cleanPhone);
    
    // If phone starts with 0, remove it
    if (cleanPhone.startsWith('0')) {
      cleanPhone = cleanPhone.substring(1);
      console.log('After removing leading 0:', cleanPhone);
    }
    // Ensure it's 10 digits
    if (cleanPhone.length > 10) {
      cleanPhone = cleanPhone.slice(-10);
      console.log('After trimming to 10 digits:', cleanPhone);
    }
    
    console.log('Final clean phone:', cleanPhone);
    
    // Find or create user
    console.log('Searching for user with phone:', cleanPhone);
    let user = await User.findOne({ phone: cleanPhone });
    let isNewUserFlag = false;

    if (!user) {
      console.log('User not found - NEW USER SIGNUP');
      
      // Name is required for new users
      if (!name || !name.trim()) {
        console.log('=== NAME REQUIRED FOR NEW USER ===');
        return res.status(400).json({ 
          message: 'Name is required for new users',
          requiresName: true,
          isNewUser: true
        });
      }
      
      console.log('Creating new user with name:', name);
      user = new User({
        phone: cleanPhone,
        name: name.trim(),
        isPhoneVerified: true, // Mark as verified since OTP is disabled
        createdAt: new Date(),
        lastLoginAt: new Date()
      });
      
      await user.save();
      console.log('New user created successfully');
      console.log('User ID:', user._id);
      isNewUserFlag = true;
    } else {
      console.log('User found - EXISTING USER LOGIN');
      console.log('User ID:', user._id);
      console.log('User name:', user.name);
      
      // If name is provided and user doesn't have a name, update it
      if (name && name.trim() && !user.name) {
        console.log('Updating user name:', name);
        user.name = name.trim();
      }
      
      // Existing user login
      user.isPhoneVerified = true;
      user.lastLoginAt = new Date();
      await user.save();
      console.log('User updated successfully');
      isNewUserFlag = false;
    }

    // Generate JWT token for our backend
    console.log('Generating JWT token for user:', user._id);
    const token = generateToken(user._id);
    console.log('JWT token generated successfully');

    const responseData = {
      token,
      user: {
        id: user._id,
        name: user.name,
        phone: user.phone,
        email: user.email,
        dateOfBirth: user.dateOfBirth,
        address: user.address,
        city: user.city,
        state: user.state,
        pincode: user.pincode,
        employmentType: user.employmentType,
        companyName: user.companyName,
        aadharNumber: user.aadharNumber,
        panNumber: user.panNumber,
        bankAccountNumber: user.bankAccountNumber,
        ifscCode: user.ifscCode,
        additionalDetails: user.additionalDetails,
        isPhoneVerified: user.isPhoneVerified,
        isProfileComplete: user.isProfileComplete,
        totalLoansApplied: user.totalLoansApplied,
        totalLoansApproved: user.totalLoansApproved
      },
      isNewUser: isNewUserFlag
    };
    
    console.log('=== DIRECT LOGIN SUCCESS ===');
    console.log('Is new user:', isNewUserFlag);
    console.log('User ID:', user._id);
    console.log('User name:', user.name);
    console.log('Token generated:', !!token);
    console.log('=== DIRECT LOGIN COMPLETE ===\n');
    
    res.json(responseData);
  } catch (error) {
    console.error('=== DIRECT LOGIN ERROR ===');
    console.error('Error:', error);
    console.error('Error stack:', error.stack);
    console.error('=== DIRECT LOGIN ERROR END ===\n');
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   GET /api/auth/me
// @desc    Get current user
// @access  Private
router.get('/me', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    res.json({
      user: {
        id: user._id,
        name: user.name,
        phone: user.phone,
        email: user.email,
        dateOfBirth: user.dateOfBirth,
        address: user.address,
        city: user.city,
        state: user.state,
        pincode: user.pincode,
        employmentType: user.employmentType,
        companyName: user.companyName,
        aadharNumber: user.aadharNumber,
        panNumber: user.panNumber,
        bankAccountNumber: user.bankAccountNumber,
        ifscCode: user.ifscCode,
        additionalDetails: user.additionalDetails,
        isPhoneVerified: user.isPhoneVerified,
        isProfileComplete: user.isProfileComplete,
        totalLoansApplied: user.totalLoansApplied,
        totalLoansApproved: user.totalLoansApproved,
        createdAt: user.createdAt,
        lastLoginAt: user.lastLoginAt
      }
    });
  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   PUT /api/auth/profile
// @desc    Update user profile
// @access  Private
router.put('/profile', auth, [
  body('name').optional().trim().notEmpty(),
  body('email').optional().isEmail(),
  body('dateOfBirth').optional().isISO8601().toDate(),
  body('address').optional().trim(),
  body('city').optional().trim(),
  body('state').optional().trim(),
  body('pincode').optional().trim(),
  body('employmentType').optional().custom((value) => {
    if (value === '' || value === null || value === undefined) {
      return true; // Allow empty/null values
    }
    return ['salaried', 'self_employed', 'business', 'unemployed', 'student', 'other'].includes(value);
  }).withMessage('Employment type must be one of: salaried, self_employed, business, unemployed, student, other'),
  body('companyName').optional().trim(),
  body('aadharNumber').optional().trim(),
  body('panNumber').optional().trim(),
  body('bankAccountNumber').optional().trim()
    .custom((value) => {
      if (!value || value === '') return true; // Allow empty
      const cleanValue = value.replace(/\s|-/g, '');
      if (!/^\d{9,18}$/.test(cleanValue)) {
        throw new Error('Bank account number must be 9-18 digits only');
      }
      // Reject all same digits
      if (/^(\d)\1+$/.test(cleanValue)) {
        throw new Error('Invalid bank account number');
      }
      return true;
    }),
  body('ifscCode').optional().trim()
    .custom((value) => {
      if (!value || value === '') return true; // Allow empty
      const cleanValue = value.toUpperCase().replace(/[^A-Z0-9]/g, '');
      if (cleanValue.length !== 11) {
        throw new Error('IFSC code must be exactly 11 characters');
      }
      // First 4 must be letters only
      if (!/^[A-Z]{4}$/.test(cleanValue.substring(0, 4))) {
        throw new Error('First 4 characters of IFSC must be letters only');
      }
      // 5th must be 0
      if (cleanValue[4] !== '0') {
        throw new Error('5th character of IFSC must be 0');
      }
      // Full format validation
      if (!/^[A-Z]{4}0[A-Z0-9]{6}$/.test(cleanValue)) {
        throw new Error('Invalid IFSC format. Format: 4 letters + 0 + 6 alphanumeric (e.g., HDFC0001234)');
      }
      return true;
    }),
  body('bankName').optional().trim()
    .custom((value) => {
      if (!value || value === '') return true; // Allow empty
      const trimmed = value.trim();
      if (trimmed.length < 3 || trimmed.length > 100) {
        throw new Error('Bank name must be between 3 and 100 characters');
      }
      if (!/^[a-zA-Z]/.test(trimmed)) {
        throw new Error('Bank name must start with a letter');
      }
      if (!/[a-zA-Z]/.test(trimmed)) {
        throw new Error('Bank name must contain at least one letter');
      }
      if (!/^[a-zA-Z0-9\s.'&-]+$/.test(trimmed)) {
        throw new Error('Bank name contains invalid characters');
      }
      if (/^\d+$/.test(trimmed.replace(/\s/g, ''))) {
        throw new Error('Bank name cannot be only numbers');
      }
      return true;
    }),
  body('accountHolderName').optional().trim()
    .custom((value) => {
      if (!value || value === '') return true; // Allow empty
      const trimmed = value.trim();
      if (trimmed.length < 3 || trimmed.length > 50) {
        throw new Error('Account holder name must be between 3 and 50 characters');
      }
      if (!/^[a-zA-Z]/.test(trimmed) || !/[a-zA-Z]$/.test(trimmed)) {
        throw new Error('Name must start and end with a letter');
      }
      if (/\d/.test(trimmed)) {
        throw new Error('Name cannot contain numbers');
      }
      if (!/^[a-zA-Z]+([\s.'-][a-zA-Z]+)*$/.test(trimmed)) {
        throw new Error('Invalid name format. Use proper name format');
      }
      return true;
    }),
  body('additionalDetails').optional().trim()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Update allowed fields
    const allowedFields = ['name', 'email', 'dateOfBirth', 'address', 'city', 'state', 'pincode',
                          'employmentType', 'companyName', 'aadharNumber', 'panNumber', 
                          'bankAccountNumber', 'ifscCode', 'bankName', 'accountHolderName', 'additionalDetails',
                          'aadharCardUrl', 'panCardUrl', 'selfieUrl'];
    
    allowedFields.forEach(field => {
      if (req.body[field] !== undefined) {
        // Convert empty strings to null for enum fields
        if (field === 'employmentType') {
          if (req.body[field] === '' || req.body[field] === null || req.body[field] === undefined) {
            user[field] = null;
          } else {
            user[field] = req.body[field];
          }
        } else if (field === 'dateOfBirth') {
          // Handle date conversion
          if (req.body[field] === '' || req.body[field] === null || req.body[field] === undefined) {
            user[field] = null;
          } else {
            user[field] = req.body[field];
          }
        } else if (field === 'aadharCardUrl' || field === 'panCardUrl' || field === 'selfieUrl') {
          // Handle document URLs - allow empty string or null
          user[field] = req.body[field] || '';
        } else if (field === 'bankAccountNumber' || field === 'ifscCode') {
          // Bank account number and IFSC code - validate and clean
          if (req.body[field] !== undefined && req.body[field] !== null && req.body[field] !== '') {
            if (field === 'bankAccountNumber') {
              // Remove any spaces or dashes, keep only digits
              user[field] = req.body[field].replace(/\s|-/g, '');
            } else if (field === 'ifscCode') {
              // Convert to uppercase and remove invalid characters
              user[field] = req.body[field].toUpperCase().replace(/[^A-Z0-9]/g, '');
            }
          } else {
            user[field] = req.body[field] || '';
          }
        } else if (field === 'bankName' || field === 'accountHolderName') {
          // Bank name and account holder name - trim and validate
          if (req.body[field] !== undefined && req.body[field] !== null) {
            user[field] = req.body[field].trim() || '';
          } else {
            user[field] = '';
          }
        } else {
          // For other string fields
          user[field] = req.body[field] || '';
        }
      }
    });

    // Check if profile is complete using the method
    user.isProfileComplete = user.checkProfileComplete();
    
    user.updatedAt = new Date();
    await user.save();

    res.json({
      message: 'Profile updated successfully',
      user: {
        id: user._id,
        name: user.name,
        phone: user.phone,
        email: user.email,
        dateOfBirth: user.dateOfBirth,
        address: user.address,
        city: user.city,
        state: user.state,
        pincode: user.pincode,
        employmentType: user.employmentType,
        companyName: user.companyName,
        aadharNumber: user.aadharNumber,
        panNumber: user.panNumber,
        bankAccountNumber: user.bankAccountNumber,
        ifscCode: user.ifscCode,
        bankName: user.bankName,
        accountHolderName: user.accountHolderName,
        additionalDetails: user.additionalDetails,
        isProfileComplete: user.isProfileComplete
      }
    });
  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   POST /api/auth/send-otp
// @desc    Send OTP via WhatsApp
// @access  Public
router.post('/send-otp', [
  body('phone').notEmpty().withMessage('Phone number is required')
    .isLength({ min: 10, max: 10 }).withMessage('Phone number must be 10 digits')
    .matches(/^\d+$/).withMessage('Phone number must contain only digits')
], async (req, res) => {
  try {
    console.log('=== SEND OTP REQUEST ===');
    console.log('Request received at:', new Date().toISOString());
    console.log('Request body:', req.body);

    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      console.log('Validation errors:', errors.array());
      return res.status(400).json({ errors: errors.array() });
    }

    const { phone } = req.body;
    
    // Clean phone number
    const cleanPhone = cleanPhoneNumber(phone);
    console.log('Cleaned phone:', cleanPhone);

    // Validate phone number
    if (cleanPhone.length !== 10 || !/^\d+$/.test(cleanPhone)) {
      return res.status(400).json({ 
        message: 'Invalid phone number. Must be 10 digits.' 
      });
    }

    // Generate 6-digit OTP
    const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
    console.log('Generated OTP:', otpCode);

    // Set expiration time (10 minutes)
    const expiresAt = new Date();
    expiresAt.setMinutes(expiresAt.getMinutes() + 10);

    // Delete any existing OTP for this phone number
    await OTP.deleteMany({ phone: cleanPhone, isUsed: false });

    // Create new OTP record
    const otpRecord = new OTP({
      phone: cleanPhone,
      code: otpCode,
      expiresAt: expiresAt,
      isUsed: false,
      attempts: 0
    });

    await otpRecord.save();
    console.log('OTP record saved to database');

    // Send OTP via WhatsApp
    const whatsappResult = await sendWhatsAppOTP(cleanPhone, otpCode);

    if (!whatsappResult.success) {
      console.error('Failed to send OTP via WhatsApp:', whatsappResult.error);
      // Delete the OTP record if WhatsApp sending failed
      await OTP.deleteOne({ _id: otpRecord._id });
      
      return res.status(500).json({
        message: whatsappResult.error || 'Failed to send OTP',
        success: false
      });
    }

    console.log('✅ OTP sent successfully via WhatsApp');
    console.log('Request ID:', whatsappResult.requestId);
    console.log('=== SEND OTP SUCCESS ===\n');

    // Check if user exists
    const user = await User.findOne({ phone: cleanPhone });
    const isNewUser = !user;

    res.json({
      success: true,
      message: 'OTP sent successfully via WhatsApp',
      requestId: whatsappResult.requestId,
      isNewUser: isNewUser,
      expiresIn: 600 // 10 minutes in seconds
    });

  } catch (error) {
    console.error('=== SEND OTP ERROR ===');
    console.error('Error:', error);
    console.error('Error stack:', error.stack);
    console.error('=== SEND OTP ERROR END ===\n');
    res.status(500).json({ 
      message: 'Server error while sending OTP',
      success: false
    });
  }
});

// @route   POST /api/auth/verify-otp
// @desc    Verify OTP and login/signup user
// @access  Public
router.post('/verify-otp', [
  body('phone').notEmpty().withMessage('Phone number is required')
    .isLength({ min: 10, max: 10 }).withMessage('Phone number must be 10 digits')
    .matches(/^\d+$/).withMessage('Phone number must contain only digits'),
  body('otp').notEmpty().withMessage('OTP is required')
    .isLength({ min: 6, max: 6 }).withMessage('OTP must be 6 digits')
    .matches(/^\d+$/).withMessage('OTP must contain only digits'),
  body('name').optional().trim()
], async (req, res) => {
  try {
    console.log('=== VERIFY OTP REQUEST ===');
    console.log('Request received at:', new Date().toISOString());
    console.log('Request body keys:', Object.keys(req.body));

    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      console.log('Validation errors:', errors.array());
      return res.status(400).json({ errors: errors.array() });
    }

    const { phone, otp, name } = req.body;
    
    // Clean phone number
    const cleanPhone = cleanPhoneNumber(phone);
    console.log('Cleaned phone:', cleanPhone);
    console.log('OTP provided:', otp);

    // Find OTP record
    const otpRecord = await OTP.findOne({ 
      phone: cleanPhone, 
      isUsed: false 
    }).sort({ createdAt: -1 }); // Get the most recent OTP

    if (!otpRecord) {
      console.log('No OTP record found for phone:', cleanPhone);
      return res.status(400).json({ 
        message: 'OTP not found or already used. Please request a new OTP.',
        success: false
      });
    }

    // Check if OTP is expired
    if (new Date() > otpRecord.expiresAt) {
      console.log('OTP expired');
      await OTP.deleteOne({ _id: otpRecord._id });
      return res.status(400).json({ 
        message: 'OTP has expired. Please request a new OTP.',
        success: false
      });
    }

    // Check attempts (max 5 attempts)
    if (otpRecord.attempts >= 5) {
      console.log('Max attempts reached');
      await OTP.updateOne({ _id: otpRecord._id }, { isUsed: true });
      return res.status(400).json({ 
        message: 'Maximum verification attempts exceeded. Please request a new OTP.',
        success: false
      });
    }

    // Verify OTP
    if (otpRecord.code !== otp) {
      console.log('Invalid OTP');
      // Increment attempts
      otpRecord.attempts += 1;
      await otpRecord.save();
      
      const remainingAttempts = 5 - otpRecord.attempts;
      return res.status(400).json({ 
        message: `Invalid OTP. ${remainingAttempts} attempt(s) remaining.`,
        success: false,
        remainingAttempts: remainingAttempts
      });
    }

    // OTP is valid - mark as used
    otpRecord.isUsed = true;
    await otpRecord.save();
    console.log('✅ OTP verified successfully');

    // Find or create user
    let user = await User.findOne({ phone: cleanPhone });
    let isNewUserFlag = false;

    if (!user) {
      console.log('User not found - NEW USER SIGNUP');
      // New user signup - name is required
      if (!name || !name.trim()) {
        console.log('Name required for new user');
        return res.status(400).json({ 
          message: 'Name is required for new users',
          isNewUser: true,
          requiresName: true,
          success: false
        });
      }
      
      console.log('Creating new user with phone:', cleanPhone, 'and name:', name.trim());
      user = new User({
        phone: cleanPhone,
        name: name.trim(),
        isPhoneVerified: true,
        totalLoansApplied: 0,
        totalLoansApproved: 0,
        employmentType: null
      });
      
      await user.save();
      console.log('New user created successfully');
      console.log('User ID:', user._id);
      isNewUserFlag = true;
    } else {
      console.log('User found - EXISTING USER LOGIN');
      console.log('User ID:', user._id);
      console.log('User name:', user.name);
      // Existing user login
      user.isPhoneVerified = true;
      user.lastLoginAt = new Date();
      await user.save();
      console.log('User updated successfully');
      isNewUserFlag = false;
    }

    // Generate JWT token
    console.log('Generating JWT token for user:', user._id);
    const token = generateToken(user._id);
    console.log('JWT token generated successfully');

    const responseData = {
      success: true,
      message: 'OTP verified successfully',
      token,
      user: {
        id: user._id,
        name: user.name,
        phone: user.phone,
        email: user.email,
        dateOfBirth: user.dateOfBirth,
        address: user.address,
        city: user.city,
        state: user.state,
        pincode: user.pincode,
        employmentType: user.employmentType,
        companyName: user.companyName,
        aadharNumber: user.aadharNumber,
        panNumber: user.panNumber,
        bankAccountNumber: user.bankAccountNumber,
        ifscCode: user.ifscCode,
        additionalDetails: user.additionalDetails,
        isPhoneVerified: user.isPhoneVerified,
        isProfileComplete: user.isProfileComplete,
        totalLoansApplied: user.totalLoansApplied,
        totalLoansApproved: user.totalLoansApproved
      },
      isNewUser: isNewUserFlag
    };
    
    console.log('=== VERIFY OTP SUCCESS ===');
    console.log('Is new user:', isNewUserFlag);
    console.log('User ID:', user._id);
    console.log('Token generated:', !!token);
    console.log('=== VERIFY OTP COMPLETE ===\n');
    
    res.json(responseData);

  } catch (error) {
    console.error('=== VERIFY OTP ERROR ===');
    console.error('Error occurred at:', new Date().toISOString());
    console.error('Error name:', error.name);
    console.error('Error message:', error.message);
    if (error.errors) {
      console.error('Validation errors:', JSON.stringify(error.errors, null, 2));
    }
    if (error.stack) {
      console.error('Error stack:', error.stack);
    }
    console.error('=== VERIFY OTP ERROR END ===\n');
    res.status(500).json({ 
      message: 'Server error during OTP verification',
      success: false
    });
  }
});

module.exports = router;
