const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const { body, validationResult } = require('express-validator');
const User = require('../models/User');
const auth = require('../middleware/auth');
const { auth: firebaseAuth } = require('../config/firebaseAdmin');

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
  body('bankAccountNumber').optional().trim(),
  body('ifscCode').optional().trim(),
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
                          'bankAccountNumber', 'ifscCode', 'additionalDetails'];
    
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
        additionalDetails: user.additionalDetails,
        isProfileComplete: user.isProfileComplete
      }
    });
  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
