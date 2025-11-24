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

  const updateField = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const validateForm = () => {
    if (!formData.bankAccountNumber || formData.bankAccountNumber.trim().length < 9) {
      toast.error('Please enter a valid bank account number (minimum 9 digits)');
      return false;
    }
    if (!formData.ifscCode || formData.ifscCode.trim().length !== 11) {
      toast.error('Please enter a valid IFSC code (11 characters)');
      return false;
    }
    if (!formData.bankName || formData.bankName.trim().length < 3) {
      toast.error('Please enter bank name');
      return false;
    }
    if (!formData.accountHolderName || formData.accountHolderName.trim().length < 3) {
      toast.error('Please enter account holder name');
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
      
      // Check if payment is processing/approved before showing 15 days message
      try {
        const loansResponse = await axios.get('/loans');
        const loans = loansResponse.data.loans || [];
        const processingLoan = loans.find(loan => 
          loan.status === 'processing' || 
          loan.status === 'payment_validation' ||
          (loan.depositPaid && loan.status !== 'rejected' && loan.status !== 'cancelled')
        );
        
        // Only show 15 days message if payment is actually processing/approved
        if (processingLoan) {
          setTimeout(() => {
            toast.info('✅ Payment verified! Funds will be disbursed to your bank account within 15 days.', { autoClose: 5000 });
          }, 3500);
        }
      } catch (error) {
        console.error('Error checking loan status:', error);
      }
      
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
              {/* Show 15 days message only if payment is actually processing/approved */}
              {hasProcessingLoan && (
                <p className="text-sm font-semibold text-[#14b8a6] mt-2">
                  ✅ Payment verified! Funds will be disbursed to your bank account within 15 days after verification.
                </p>
              )}
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
                onChange={(e) => updateField("accountHolderName", e.target.value)}
                placeholder="Enter account holder name"
                className="h-12 rounded-xl"
                required
              />
              <p className="text-xs text-gray-500 mt-1">Name as per bank records</p>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2 text-foreground">
                Bank Account Number *
              </label>
              <Input
                value={formData.bankAccountNumber}
                onChange={(e) => updateField("bankAccountNumber", e.target.value.replace(/\D/g, ''))}
                placeholder="Enter bank account number"
                className="h-12 rounded-xl"
                maxLength={18}
                required
              />
              <p className="text-xs text-gray-500 mt-1">9-18 digits</p>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2 text-foreground">
                IFSC Code *
              </label>
              <Input
                value={formData.ifscCode}
                onChange={(e) => updateField("ifscCode", e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ''))}
                placeholder="ABCD0123456"
                className="h-12 rounded-xl uppercase"
                maxLength={11}
                required
              />
              <p className="text-xs text-gray-500 mt-1">11 characters (e.g., HDFC0001234)</p>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2 text-foreground">
                Bank Name *
              </label>
              <Input
                value={formData.bankName}
                onChange={(e) => updateField("bankName", e.target.value)}
                placeholder="Enter bank name"
                className="h-12 rounded-xl"
                required
              />
              <p className="text-xs text-gray-500 mt-1">Full name of your bank</p>
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

