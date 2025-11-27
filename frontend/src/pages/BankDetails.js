import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import axios from 'axios';
import { toast } from 'react-toastify';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { ArrowLeft, CheckCircle } from 'lucide-react';

const BankDetails = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, updateProfile, fetchUser } = useAuth();
  const [loading, setLoading] = useState(false);
  const [hasProcessingLoan, setHasProcessingLoan] = useState(false);
  const [formData, setFormData] = useState({
    bankAccountNumber: user?.bankAccountNumber || '',
    ifscCode: user?.ifscCode || '',
    bankName: user?.bankName || '',
    accountHolderName: user?.accountHolderName || user?.name || ''
  });

  const [errors, setErrors] = useState({
    accountHolderName: '',
    bankAccountNumber: '',
    ifscCode: '',
    bankName: ''
  });

  const [touched, setTouched] = useState({
    accountHolderName: false,
    bankAccountNumber: false,
    ifscCode: false,
    bankName: false
  });

  // Check if user has completed payment - only allow bank details after payment
  useEffect(() => {
    const checkPaymentStatus = async () => {
      try {
        // If redirected from payment, allow access and check if payment is processing
        if (location.state?.paymentSuccess) {
          // Check if payment is actually processing/approved
          const token = localStorage.getItem('token');
          if (token) {
            if (!axios.defaults.headers.common['Authorization']) {
              axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
            }
            try {
              const loansResponse = await axios.get('/loans');
              const loans = loansResponse.data.loans || [];
              const processingLoan = loans.find(loan => 
                loan.status === 'processing' || 
                loan.status === 'payment_validation' ||
                (loan.depositPaid && loan.status !== 'rejected' && loan.status !== 'cancelled')
              );
              setHasProcessingLoan(!!processingLoan);
            } catch (error) {
              console.error('Error checking loan status:', error);
            }
          }
          return;
        }

        // Check if user has any loan with payment completed
        const token = localStorage.getItem('token');
        if (!token) {
          navigate('/login');
          return;
        }
        
        if (!axios.defaults.headers.common['Authorization']) {
          axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
        }

        const loansResponse = await axios.get('/loans');
        const loans = loansResponse.data.loans || [];
        
        // Check if user has any loan with payment completed (processing or completed status)
        const hasPaymentCompleted = loans.some(loan => 
          loan.depositPaid || 
          loan.status === 'processing' || 
          loan.status === 'payment_validation' ||
          loan.status === 'completed'
        );
        
        // Check if payment is processing/approved
        const processingLoan = loans.find(loan => 
          loan.status === 'processing' || 
          loan.status === 'payment_validation' ||
          (loan.depositPaid && loan.status !== 'rejected' && loan.status !== 'cancelled')
        );
        setHasProcessingLoan(!!processingLoan);

        // If no payment completed, redirect to home
        if (!hasPaymentCompleted && !user?.bankAccountNumber) {
          toast.error('Please complete payment first to add bank details');
          navigate('/home');
        }
      } catch (error) {
        console.error('Error checking payment status:', error);
        // If error, allow access if user already has bank details
        if (!user?.bankAccountNumber) {
          navigate('/home');
        }
      }
    };

    checkPaymentStatus();
  }, [location.state, navigate, user]);

  // Validate account holder name
  const validateAccountHolderName = (name) => {
    if (!name || name.trim().length === 0) {
      return 'Account holder name is required';
    }
    const trimmedName = name.trim();
    if (trimmedName.length < 3) {
      return 'Name must be at least 3 characters';
    }
    if (trimmedName.length > 50) {
      return 'Name must be less than 50 characters';
    }
    // Must start and end with a letter
    if (!/^[a-zA-Z]/.test(trimmedName) || !/[a-zA-Z]$/.test(trimmedName)) {
      return 'Name must start and end with a letter';
    }
    // Allow letters, spaces, dots, hyphens, apostrophes - but no consecutive special chars
    if (!/^[a-zA-Z]+([\s.'-][a-zA-Z]+)*$/.test(trimmedName)) {
      return 'Invalid name format. Use proper name format (e.g., John Doe, Mary-Jane O\'Connor)';
    }
    // Must contain at least one letter (not just spaces/special chars)
    if (!/[a-zA-Z]/.test(trimmedName)) {
      return 'Name must contain at least one letter';
    }
    // No numbers allowed
    if (/\d/.test(trimmedName)) {
      return 'Name cannot contain numbers';
    }
    return '';
  };

  // Validate bank account number
  const validateBankAccountNumber = (accountNumber) => {
    if (!accountNumber || accountNumber.trim().length === 0) {
      return 'Bank account number is required';
    }
    // Remove any spaces or dashes
    const cleanNumber = accountNumber.replace(/\s|-/g, '');
    
    // Must be exactly digits only
    if (!/^\d+$/.test(cleanNumber)) {
      return 'Account number must contain only digits (0-9)';
    }
    
    // Length validation
    if (cleanNumber.length < 9) {
      return 'Account number must be at least 9 digits';
    }
    if (cleanNumber.length > 18) {
      return 'Account number must be maximum 18 digits';
    }
    
    // Cannot be all same digits (e.g., 111111111, 000000000)
    if (/^(\d)\1+$/.test(cleanNumber)) {
      return 'Account number cannot be all same digits';
    }
    
    // Cannot be sequential (e.g., 123456789, 987654321)
    const isSequential = /^(012345678|123456789|987654321|876543210)$/.test(cleanNumber);
    if (isSequential && cleanNumber.length === 9) {
      return 'Please enter a valid bank account number';
    }
    
    return '';
  };

  // Validate IFSC code
  const validateIFSCCode = (ifsc) => {
    if (!ifsc || ifsc.trim().length === 0) {
      return 'IFSC code is required';
    }
    const cleanIFSC = ifsc.trim().toUpperCase();
    
    if (cleanIFSC.length !== 11) {
      return 'IFSC code must be exactly 11 characters';
    }
    
    // Format: 4 letters + 0 + 6 alphanumeric (e.g., HDFC0001234)
    // First 4 must be letters only
    const first4 = cleanIFSC.substring(0, 4);
    if (!/^[A-Z]{4}$/.test(first4)) {
      return 'First 4 characters must be letters only (e.g., HDFC, SBIN, ICIC)';
    }
    
    // 5th character must be 0
    if (cleanIFSC[4] !== '0') {
      return '5th character must be 0 (e.g., HDFC0...)';
    }
    
    // Last 6 must be alphanumeric (preferably digits)
    const last6 = cleanIFSC.substring(5);
    if (!/^[A-Z0-9]{6}$/.test(last6)) {
      return 'Last 6 characters must be alphanumeric (e.g., ...001234)';
    }
    
    // Full format validation
    if (!/^[A-Z]{4}0[A-Z0-9]{6}$/.test(cleanIFSC)) {
      return 'Invalid IFSC format. Format: 4 letters + 0 + 6 alphanumeric (e.g., HDFC0001234)';
    }
    
    // Common invalid patterns
    if (cleanIFSC === 'AAAA0000000' || cleanIFSC === 'XXXX0000000' || cleanIFSC === 'TEST0000000') {
      return 'Please enter a valid IFSC code';
    }
    
    return '';
  };

  // Validate bank name
  const validateBankName = (bankName) => {
    if (!bankName || bankName.trim().length === 0) {
      return 'Bank name is required';
    }
    const trimmedBankName = bankName.trim();
    
    if (trimmedBankName.length < 3) {
      return 'Bank name must be at least 3 characters';
    }
    if (trimmedBankName.length > 100) {
      return 'Bank name must be less than 100 characters';
    }
    
    // Must start with a letter
    if (!/^[a-zA-Z]/.test(trimmedBankName)) {
      return 'Bank name must start with a letter';
    }
    
    // Allow letters, spaces, numbers, dots, hyphens, ampersands - but must contain letters
    if (!/^[a-zA-Z0-9\s.'&-]+$/.test(trimmedBankName)) {
      return 'Bank name contains invalid characters. Use only letters, numbers, spaces, and common punctuation';
    }
    
    // Must contain at least one letter (not just numbers/special chars)
    if (!/[a-zA-Z]/.test(trimmedBankName)) {
      return 'Bank name must contain at least one letter';
    }
    
    // Cannot be all numbers
    if (/^\d+$/.test(trimmedBankName.replace(/\s/g, ''))) {
      return 'Bank name cannot be only numbers';
    }
    
    // Common invalid patterns
    const invalidPatterns = ['test', 'demo', 'sample', 'xxxx', 'aaaa', '1234'];
    if (invalidPatterns.some(pattern => trimmedBankName.toLowerCase().includes(pattern) && trimmedBankName.length < 10)) {
      return 'Please enter a valid bank name';
    }
    
    return '';
  };

  const updateField = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    
    // Validate on change if field has been touched
    if (touched[field]) {
      let error = '';
      switch (field) {
        case 'accountHolderName':
          error = validateAccountHolderName(value);
          break;
        case 'bankAccountNumber':
          error = validateBankAccountNumber(value);
          break;
        case 'ifscCode':
          error = validateIFSCCode(value);
          break;
        case 'bankName':
          error = validateBankName(value);
          break;
        default:
          break;
      }
      setErrors(prev => ({ ...prev, [field]: error }));
    }
  };

  const handleBlur = (field) => {
    setTouched(prev => ({ ...prev, [field]: true }));
    
    // Validate on blur
    let error = '';
    switch (field) {
      case 'accountHolderName':
        error = validateAccountHolderName(formData.accountHolderName);
        break;
      case 'bankAccountNumber':
        error = validateBankAccountNumber(formData.bankAccountNumber);
        break;
      case 'ifscCode':
        error = validateIFSCCode(formData.ifscCode);
        break;
      case 'bankName':
        error = validateBankName(formData.bankName);
        break;
      default:
        break;
    }
    setErrors(prev => ({ ...prev, [field]: error }));
  };

  const validateForm = () => {
    // Mark all fields as touched
    setTouched({
      accountHolderName: true,
      bankAccountNumber: true,
      ifscCode: true,
      bankName: true
    });

    // Validate all fields
    const accountHolderNameError = validateAccountHolderName(formData.accountHolderName);
    const bankAccountNumberError = validateBankAccountNumber(formData.bankAccountNumber);
    const ifscCodeError = validateIFSCCode(formData.ifscCode);
    const bankNameError = validateBankName(formData.bankName);

    setErrors({
      accountHolderName: accountHolderNameError,
      bankAccountNumber: bankAccountNumberError,
      ifscCode: ifscCodeError,
      bankName: bankNameError
    });

    // Check if any errors exist
    if (accountHolderNameError || bankAccountNumberError || ifscCodeError || bankNameError) {
      // Show first error
      const firstError = accountHolderNameError || bankAccountNumberError || ifscCodeError || bankNameError;
      toast.error(firstError);
      return false;
    }

    return true;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        toast.error('Please login again');
        navigate('/login');
        return;
      }
      if (!axios.defaults.headers.common['Authorization']) {
        axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      }

      // Update user profile with bank details
      await updateProfile({
        bankAccountNumber: formData.bankAccountNumber.trim(),
        ifscCode: formData.ifscCode.trim().toUpperCase(),
        bankName: formData.bankName.trim(),
        accountHolderName: formData.accountHolderName.trim()
      });

      await fetchUser();
      toast.dismiss(); // Dismiss any existing toasts
      toast.success('Bank details saved successfully!', { autoClose: 3000 });
      
      // Navigate back to home
      setTimeout(() => {
        navigate('/home', { state: { bankDetailsSaved: true } });
      }, 2000);
    } catch (error) {
      console.error('Error saving bank details:', error);
      toast.error(error.response?.data?.message || 'Failed to save bank details');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="bg-card border-b border-border shadow-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <Button
              variant="ghost"
              onClick={() => navigate(-1)}
              className="rounded-xl p-2"
            >
              <ArrowLeft className="w-5 h-5" />
            </Button>
            
            <h1 className="text-lg md:text-xl font-bold text-foreground">
              Bank Account Details
            </h1>

            <div className="w-9"></div> {/* Spacer for center alignment */}
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-6 max-w-2xl">
        {/* Info Card */}
        <div className="bg-gradient-to-br from-[#14b8a6]/10 to-[#0d9488]/10 rounded-xl p-4 md:p-6 mb-6 border border-[#14b8a6]/20">
          <div className="flex items-start gap-3">
            <CheckCircle className="w-6 h-6 text-[#14b8a6] flex-shrink-0 mt-1" />
            <div>
              <h3 className="font-bold text-[#14b8a6] mb-2">
                Complete Your Loan Process
              </h3>
              <p className="text-sm text-foreground mb-2">
                To complete your loan application and enable disbursement, please provide your bank account details. 
                This information is required for loan processing and fund transfer.
              </p>
            </div>
          </div>
        </div>

        {/* Form Card */}
        <div className="bg-card rounded-2xl shadow-lg p-6 md:p-8 border border-border">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="block text-sm font-medium mb-2 text-foreground">
                Account Holder Name *
              </label>
              <Input
                value={formData.accountHolderName}
                onChange={(e) => {
                  // Allow only letters, spaces, dots, hyphens, apostrophes
                  // Remove numbers and other special characters
                  let value = e.target.value.replace(/[^a-zA-Z\s.'-]/g, '');
                  // Prevent consecutive special characters
                  value = value.replace(/([\s.'-])\1+/g, '$1');
                  updateField("accountHolderName", value);
                }}
                onBlur={() => handleBlur("accountHolderName")}
                placeholder="Enter account holder name"
                className={`h-12 rounded-xl ${errors.accountHolderName && touched.accountHolderName ? 'border-red-500 focus:border-red-500 focus:ring-red-500' : ''}`}
                required
                maxLength={50}
              />
              {errors.accountHolderName && touched.accountHolderName && (
                <p className="text-xs text-red-500 mt-1">{errors.accountHolderName}</p>
              )}
              {!errors.accountHolderName && touched.accountHolderName && (
                <p className="text-xs text-green-500 mt-1">✓ Valid name</p>
              )}
              {!touched.accountHolderName && (
                <p className="text-xs text-gray-500 mt-1">Name as per bank records (3-50 characters)</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium mb-2 text-foreground">
                Bank Account Number *
              </label>
              <Input
                type="text"
                inputMode="numeric"
                value={formData.bankAccountNumber}
                onChange={(e) => {
                  // Only allow digits, max 18, no spaces or dashes
                  let value = e.target.value.replace(/\D/g, '').slice(0, 18);
                  // Remove any spaces or dashes that might have been entered
                  value = value.replace(/\s|-/g, '');
                  updateField("bankAccountNumber", value);
                }}
                onBlur={() => handleBlur("bankAccountNumber")}
                placeholder="Enter bank account number"
                className={`h-12 rounded-xl ${errors.bankAccountNumber && touched.bankAccountNumber ? 'border-red-500 focus:border-red-500 focus:ring-red-500' : ''}`}
                maxLength={18}
                required
              />
              {errors.bankAccountNumber && touched.bankAccountNumber && (
                <p className="text-xs text-red-500 mt-1">{errors.bankAccountNumber}</p>
              )}
              {!errors.bankAccountNumber && touched.bankAccountNumber && formData.bankAccountNumber && (
                <p className="text-xs text-green-500 mt-1">✓ Valid account number ({formData.bankAccountNumber.length} digits)</p>
              )}
              {!touched.bankAccountNumber && (
                <p className="text-xs text-gray-500 mt-1">9-18 digits (numbers only)</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium mb-2 text-foreground">
                IFSC Code *
              </label>
              <Input
                value={formData.ifscCode}
                onChange={(e) => {
                  // Format: First 4 letters, then 0, then 6 alphanumeric
                  let value = e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '');
                  
                  // Ensure format: 4 letters + 0 + 6 alphanumeric
                  if (value.length > 0 && value.length <= 4) {
                    // First 4 must be letters only (no numbers)
                    value = value.replace(/[^A-Z]/g, '').slice(0, 4);
                  } else if (value.length === 5) {
                    // 5th character must be 0
                    const first4 = value.slice(0, 4).replace(/[^A-Z]/g, '');
                    const fifth = value[4] === '0' ? '0' : (value[4] ? '' : '');
                    value = first4 + fifth;
                  } else if (value.length > 5) {
                    // After 5th, allow alphanumeric
                    const first5 = value.slice(0, 5);
                    // Ensure first 4 are letters
                    const first4Letters = first5.slice(0, 4).replace(/[^A-Z]/g, '');
                    const fifthChar = first5[4] === '0' ? '0' : '';
                    const rest = value.slice(5).replace(/[^A-Z0-9]/g, '').slice(0, 6);
                    value = first4Letters.slice(0, 4) + fifthChar + rest;
                  }
                  
                  updateField("ifscCode", value);
                }}
                onBlur={() => handleBlur("ifscCode")}
                placeholder="HDFC0001234"
                className={`h-12 rounded-xl uppercase ${errors.ifscCode && touched.ifscCode ? 'border-red-500 focus:border-red-500 focus:ring-red-500' : ''}`}
                maxLength={11}
                required
              />
              {errors.ifscCode && touched.ifscCode && (
                <p className="text-xs text-red-500 mt-1">{errors.ifscCode}</p>
              )}
              {!errors.ifscCode && touched.ifscCode && formData.ifscCode.length === 11 && (
                <p className="text-xs text-green-500 mt-1">✓ Valid IFSC code</p>
              )}
              {!touched.ifscCode && (
                <p className="text-xs text-gray-500 mt-1">11 characters: 4 letters + 0 + 6 alphanumeric (e.g., HDFC0001234)</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium mb-2 text-foreground">
                Bank Name *
              </label>
              <Input
                value={formData.bankName}
                onChange={(e) => {
                  // Allow letters, numbers, spaces, dots, hyphens, ampersands
                  let value = e.target.value.replace(/[^a-zA-Z0-9\s.'&-]/g, '');
                  // Prevent multiple consecutive spaces
                  value = value.replace(/\s{2,}/g, ' ');
                  // Must start with a letter
                  if (value.length > 0 && !/^[a-zA-Z]/.test(value)) {
                    value = value.replace(/^[^a-zA-Z]+/, '');
                  }
                  updateField("bankName", value);
                }}
                onBlur={() => handleBlur("bankName")}
                placeholder="Enter bank name (e.g., HDFC Bank, State Bank of India)"
                className={`h-12 rounded-xl ${errors.bankName && touched.bankName ? 'border-red-500 focus:border-red-500 focus:ring-red-500' : ''}`}
                required
                maxLength={100}
              />
              {errors.bankName && touched.bankName && (
                <p className="text-xs text-red-500 mt-1">{errors.bankName}</p>
              )}
              {!errors.bankName && touched.bankName && (
                <p className="text-xs text-green-500 mt-1">✓ Valid bank name</p>
              )}
              {!touched.bankName && (
                <p className="text-xs text-gray-500 mt-1">Full name of your bank (e.g., HDFC Bank, State Bank of India)</p>
              )}
            </div>

            {/* Security Note */}
            <div className="bg-[#14b8a6]/10 border border-[#14b8a6]/20 rounded-xl p-4">
              <p className="text-xs text-[#14b8a6]">
                <strong>🔒 Secure:</strong> Your bank details are encrypted and stored securely. 
                We use bank-level security measures to protect your information.
              </p>
            </div>

            {/* Submit Button */}
            <Button
              type="submit"
              className="w-full gradient-primary text-primary-foreground h-14 text-lg rounded-xl font-semibold shadow-lg"
              disabled={loading}
            >
              {loading ? 'Saving...' : 'Save & Continue'}
            </Button>
          </form>
        </div>

        {/* Help Text */}
        <div className="mt-6 text-center">
          <p className="text-xs text-muted-foreground">
            Need help? Contact our support team at support@growloan.in
          </p>
        </div>
      </div>
    </div>
  );
};

export default BankDetails;

