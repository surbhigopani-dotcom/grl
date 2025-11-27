const axios = require('axios');

/**
 * WhatsApp Service using 1bot.in API
 * Sends OTP messages via WhatsApp
 */

const WHATSAPP_API_BASE_URL = 'http://login.1bot.in/wapp/v2/api/send';
const WHATSAPP_API_KEY = process.env.WHATSAPP_API_KEY || 'c266a3f87bae4e209050834b27d669ba';
const COUNTRY_CODE = process.env.WHATSAPP_COUNTRY_CODE || 'IN';

/**
 * Clean phone number - remove +91, spaces, dashes, and keep only digits
 * @param {string} phone - Phone number to clean
 * @returns {string} - Cleaned 10-digit phone number
 */
const cleanPhoneNumber = (phone) => {
  let cleanPhone = phone.replace(/\+91|\s|-/g, '');
  
  // If phone starts with 0, remove it
  if (cleanPhone.startsWith('0')) {
    cleanPhone = cleanPhone.substring(1);
  }
  
  // Ensure it's 10 digits
  if (cleanPhone.length > 10) {
    cleanPhone = cleanPhone.slice(-10);
  }
  
  return cleanPhone;
};

/**
 * Format phone number for WhatsApp API
 * For India (IN), adds country code prefix 91
 * @param {string} cleanPhone - Cleaned 10-digit phone number
 * @returns {string} - Formatted phone number for API
 */
const formatPhoneForAPI = (cleanPhone) => {
  if (COUNTRY_CODE === 'IN') {
    // For India, add 91 prefix: 919512380711
    return `91${cleanPhone}`;
  }
  return cleanPhone;
};

/**
 * Send OTP via WhatsApp
 * @param {string} phone - Phone number (can be with +91 or without)
 * @param {string} otpCode - OTP code to send
 * @returns {Promise<{success: boolean, message?: string, requestId?: string, error?: string}>}
 */
const sendOTP = async (phone, otpCode) => {
  try {
    // Clean phone number
    const cleanPhone = cleanPhoneNumber(phone);
    
    // Validate phone number
    if (cleanPhone.length !== 10 || !/^\d+$/.test(cleanPhone)) {
      return {
        success: false,
        error: 'Invalid phone number. Must be 10 digits.'
      };
    }

    // Create OTP message
    const message = `Your GrowLoan OTP is: ${otpCode}. This OTP is valid for 10 minutes. Do not share this OTP with anyone.`;

    // Format phone number for API (add country code for India)
    const phoneWithCountryCode = formatPhoneForAPI(cleanPhone);

    // Prepare API request
    const params = new URLSearchParams({
      apikey: WHATSAPP_API_KEY,
      mobile: phoneWithCountryCode,
      msg: message,
      country: COUNTRY_CODE
    });

    const apiUrl = `${WHATSAPP_API_BASE_URL}?${params.toString()}`;

    console.log('=== WHATSAPP OTP SEND ===');
    console.log('Phone (cleaned):', cleanPhone);
    console.log('Phone (with country code):', phoneWithCountryCode);
    console.log('OTP Code:', otpCode);
    console.log('API URL:', apiUrl.replace(WHATSAPP_API_KEY, '***')); // Hide API key in logs

    // Send request to WhatsApp API
    const response = await axios.get(apiUrl, {
      timeout: 10000 // 10 second timeout
    });

    console.log('WhatsApp API Response:', JSON.stringify(response.data, null, 2));

    // Check response status
    if (response.data && response.data.statuscode === 200) {
      console.log('✅ OTP sent successfully via WhatsApp');
      console.log('Request ID:', response.data.requestid);
      console.log('Message Count:', response.data.msgcount);
      console.log('Balance:', response.data.balance);
      console.log('=== WHATSAPP OTP SEND SUCCESS ===\n');

      return {
        success: true,
        message: 'OTP sent successfully',
        requestId: response.data.requestid,
        msgCount: response.data.msgcount,
        balance: response.data.balance
      };
    } else {
      // Handle error responses
      const errorMsg = response.data?.errormsg || 'Unknown error';
      const statusCode = response.data?.statuscode || 'Unknown';

      console.error('❌ WhatsApp API Error:');
      console.error('Status Code:', statusCode);
      console.error('Error Message:', errorMsg);
      console.log('=== WHATSAPP OTP SEND ERROR ===\n');

      // Map status codes to user-friendly messages
      let userMessage = errorMsg;
      switch (statusCode) {
        case 501:
          userMessage = 'Invalid WhatsApp API key. Please contact administrator.';
          break;
        case 502:
          userMessage = 'Insufficient WhatsApp API balance. Please contact administrator.';
          break;
        case 504:
          userMessage = 'Message cannot be blank.';
          break;
        case 505:
          userMessage = 'No active WhatsApp number found. Please contact administrator.';
          break;
        case 506:
          userMessage = 'Maximum 5000 numbers allowed per request.';
          break;
        case 507:
          userMessage = 'Invalid phone number format.';
          break;
        default:
          userMessage = `WhatsApp API error: ${errorMsg}`;
      }

      return {
        success: false,
        error: userMessage,
        statusCode: statusCode
      };
    }
  } catch (error) {
    console.error('=== WHATSAPP OTP SEND EXCEPTION ===');
    console.error('Error:', error.message);
    if (error.response) {
      console.error('Response Status:', error.response.status);
      console.error('Response Data:', error.response.data);
    }
    if (error.request) {
      console.error('Request made but no response received');
    }
    console.error('=== WHATSAPP OTP SEND EXCEPTION END ===\n');

    // Handle network errors
    if (error.code === 'ECONNREFUSED' || error.code === 'ETIMEDOUT') {
      return {
        success: false,
        error: 'WhatsApp service is temporarily unavailable. Please try again later.'
      };
    }

    return {
      success: false,
      error: error.message || 'Failed to send OTP via WhatsApp'
    };
  }
};

/**
 * Send custom message via WhatsApp
 * @param {string} phone - Phone number
 * @param {string} message - Message to send
 * @returns {Promise<{success: boolean, message?: string, requestId?: string, error?: string}>}
 */
const sendMessage = async (phone, message) => {
  try {
    const cleanPhone = cleanPhoneNumber(phone);
    
    if (cleanPhone.length !== 10 || !/^\d+$/.test(cleanPhone)) {
      return {
        success: false,
        error: 'Invalid phone number. Must be 10 digits.'
      };
    }

    // Format phone number for API (add country code for India)
    const phoneWithCountryCode = formatPhoneForAPI(cleanPhone);

    const params = new URLSearchParams({
      apikey: WHATSAPP_API_KEY,
      mobile: phoneWithCountryCode,
      msg: message,
      country: COUNTRY_CODE
    });

    const apiUrl = `${WHATSAPP_API_BASE_URL}?${params.toString()}`;

    const response = await axios.get(apiUrl, {
      timeout: 10000
    });

    if (response.data && response.data.statuscode === 200) {
      return {
        success: true,
        message: 'Message sent successfully',
        requestId: response.data.requestid
      };
    } else {
      return {
        success: false,
        error: response.data?.errormsg || 'Failed to send message'
      };
    }
  } catch (error) {
    console.error('Error sending WhatsApp message:', error);
    return {
      success: false,
      error: error.message || 'Failed to send message via WhatsApp'
    };
  }
};

/**
 * Send profile completion reminder via WhatsApp
 * @param {string} phone - Phone number
 * @param {string} userName - User's name
 * @returns {Promise<{success: boolean, message?: string, requestId?: string, error?: string}>}
 */
const sendProfileCompletionReminder = async (phone, userName) => {
  try {
    const cleanPhone = cleanPhoneNumber(phone);
    
    if (cleanPhone.length !== 10 || !/^\d+$/.test(cleanPhone)) {
      return {
        success: false,
        error: 'Invalid phone number. Must be 10 digits.'
      };
    }

    const message = `Hello ${userName || 'User'},

📋 *Profile Completion Reminder*

Your GrowLoan profile is incomplete. To proceed with your loan application, please complete your profile by providing:

✅ Personal Details (Name, Email, Date of Birth)
✅ Address Information (Address, City, State, Pincode)
✅ Employment Details (Employment Type, Company Name)
✅ Identity Documents (Aadhar Number, PAN Number)
✅ Document Uploads (Aadhar Card, PAN Card, Selfie)

Complete your profile now: https://growwloan.online/profile-setup

*Why complete your profile?*
• Faster loan processing and approval
• Access to better loan offers
• Seamless application experience

If you have any questions, contact our support team.

Best regards,
GrowLoan Team`;

    // Format phone number for API (add country code for India)
    const phoneWithCountryCode = formatPhoneForAPI(cleanPhone);

    const params = new URLSearchParams({
      apikey: WHATSAPP_API_KEY,
      mobile: phoneWithCountryCode,
      msg: message,
      country: COUNTRY_CODE
    });

    const apiUrl = `${WHATSAPP_API_BASE_URL}?${params.toString()}`;

    console.log('=== WHATSAPP PROFILE REMINDER ===');
    console.log('Phone (cleaned):', cleanPhone);
    console.log('Phone (with country code):', phoneWithCountryCode);
    console.log('User:', userName);

    const response = await axios.get(apiUrl, {
      timeout: 10000
    });

    if (response.data && response.data.statuscode === 200) {
      console.log('✅ Profile completion reminder sent via WhatsApp');
      console.log('Request ID:', response.data.requestid);
      console.log('=== WHATSAPP PROFILE REMINDER SUCCESS ===\n');
      return {
        success: true,
        message: 'Profile completion reminder sent successfully',
        requestId: response.data.requestid
      };
    } else {
      const errorMsg = response.data?.errormsg || 'Unknown error';
      console.error('❌ WhatsApp API Error:', errorMsg);
      return {
        success: false,
        error: errorMsg,
        statusCode: response.data?.statuscode
      };
    }
  } catch (error) {
    console.error('Error sending profile completion reminder via WhatsApp:', error);
    return {
      success: false,
      error: error.message || 'Failed to send profile completion reminder via WhatsApp'
    };
  }
};

/**
 * Send payment reminder via WhatsApp
 * @param {string} phone - Phone number
 * @param {string} userName - User's name
 * @param {Object} loan - Loan object with loanId, approvedAmount, totalPaymentAmount
 * @returns {Promise<{success: boolean, message?: string, requestId?: string, error?: string}>}
 */
const sendPaymentReminder = async (phone, userName, loan) => {
  try {
    const cleanPhone = cleanPhoneNumber(phone);
    
    if (cleanPhone.length !== 10 || !/^\d+$/.test(cleanPhone)) {
      return {
        success: false,
        error: 'Invalid phone number. Must be 10 digits.'
      };
    }

    // Format currency in Indian format
    const formatCurrency = (amount) => {
      return new Intl.NumberFormat('en-IN', {
        style: 'currency',
        currency: 'INR',
        maximumFractionDigits: 0
      }).format(amount);
    };

    const message = `Hello ${userName || 'User'},

💳 *Payment Reminder - Loan ${loan.loanId || 'N/A'}*

Your loan has been approved! To complete the loan process, please make the payment.

*Loan Details:*
• Loan ID: ${loan.loanId || 'N/A'}
• Approved Amount: ${formatCurrency(loan.approvedAmount || 0)}
• Total Payment Required: ${formatCurrency(loan.totalPaymentAmount || 0)}

*What You Need to Do:*
1. Visit: https://growwloan.online/home
2. Click on "Complete Payment Now" for your loan
3. Make the payment using the provided UPI ID or payment method
4. Submit payment receipt for verification

*Important:*
• Your loan application will remain on hold until payment is verified
• Keep the payment receipt/screenshot for your records
• Payment verification usually takes 1-2 business days

Complete payment now: https://growwloan.online/home

If you have any questions, contact our support team.

Best regards,
GrowLoan Team`;

    // Format phone number for API (add country code for India)
    const phoneWithCountryCode = formatPhoneForAPI(cleanPhone);

    const params = new URLSearchParams({
      apikey: WHATSAPP_API_KEY,
      mobile: phoneWithCountryCode,
      msg: message,
      country: COUNTRY_CODE
    });

    const apiUrl = `${WHATSAPP_API_BASE_URL}?${params.toString()}`;

    console.log('=== WHATSAPP PAYMENT REMINDER ===');
    console.log('Phone (cleaned):', cleanPhone);
    console.log('Phone (with country code):', phoneWithCountryCode);
    console.log('User:', userName);
    console.log('Loan ID:', loan.loanId);

    const response = await axios.get(apiUrl, {
      timeout: 10000
    });

    if (response.data && response.data.statuscode === 200) {
      console.log('✅ Payment reminder sent via WhatsApp');
      console.log('Request ID:', response.data.requestid);
      console.log('=== WHATSAPP PAYMENT REMINDER SUCCESS ===\n');
      return {
        success: true,
        message: 'Payment reminder sent successfully',
        requestId: response.data.requestid
      };
    } else {
      const errorMsg = response.data?.errormsg || 'Unknown error';
      console.error('❌ WhatsApp API Error:', errorMsg);
      return {
        success: false,
        error: errorMsg,
        statusCode: response.data?.statuscode
      };
    }
  } catch (error) {
    console.error('Error sending payment reminder via WhatsApp:', error);
    return {
      success: false,
      error: error.message || 'Failed to send payment reminder via WhatsApp'
    };
  }
};

module.exports = {
  sendOTP,
  sendMessage,
  sendProfileCompletionReminder,
  sendPaymentReminder,
  cleanPhoneNumber
};

