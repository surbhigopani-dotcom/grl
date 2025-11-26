import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import axios from 'axios';
import { toast } from 'react-toastify';
import { Button } from '../components/ui/Button';
import { ArrowLeft, CheckCircle, MapPin, Copy, Share2, Download, Shield, Lock, Verified, CreditCard, Wallet, Building2, Sparkles } from 'lucide-react';
import { Loader } from '../components/ui/Loader';
import { QRCodeCanvas } from 'qrcode.react';

const Payment = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout } = useAuth();
  const [loan, setLoan] = useState(null);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [upiId, setUpiId] = useState('7211132000@ybl');
  const [adminConfig, setAdminConfig] = useState(null);
  const [verifying, setVerifying] = useState(false);
  const [paymentVerified, setPaymentVerified] = useState(false);
  const [qrSize, setQrSize] = useState(200);

  useEffect(() => {
    // Set QR code size based on screen width
    const updateQrSize = () => {
      setQrSize(window.innerWidth < 768 ? 200 : 240);
    };
    updateQrSize();
    window.addEventListener('resize', updateQrSize);
    return () => window.removeEventListener('resize', updateQrSize);
  }, []);

  useEffect(() => {
    const loadLoanData = async () => {
      try {
        const token = localStorage.getItem('token');
        if (!token) {
          navigate('/login');
          return;
        }
        if (!axios.defaults.headers.common['Authorization']) {
          axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
        }

        // Fetch admin config for UPI ID and charges
        try {
          const configResponse = await axios.get('/admin/config');
          if (configResponse.data.config) {
            setAdminConfig(configResponse.data.config);
            if (configResponse.data.config.upiId) {
              setUpiId(configResponse.data.config.upiId);
            }
          }
        } catch (configError) {
          console.warn('Failed to fetch admin config, using defaults');
        }

        // Get loan ID from location state or fetch from API
        if (location.state?.loanId) {
          try {
            const response = await axios.get(`/loans/${location.state.loanId}`);
            const loanData = response.data.loan;
            
            // Validate loan can proceed with payment
            if (!loanData) {
              throw new Error('Loan not found');
            }
            
            // Check if loan is in a valid state for payment
            const validStatuses = ['signature_pending', 'payment_pending', 'payment_failed'];
            if (!validStatuses.includes(loanData.status)) {
              toast.error('This loan is not ready for payment');
              navigate('/home');
              return;
            }
            
            // Check if digital signature exists
            if (!loanData.digitalSignature) {
              toast.error('Please complete digital signature first');
              navigate('/sanction-letter', { state: { loanId: loanData.id || loanData._id } });
              return;
            }
            
            // Check if payment already done (allow retry for payment_failed)
            if (loanData.depositPaid && loanData.status !== 'payment_failed' && loanData.status !== 'payment_validation') {
              toast.info('Payment already completed');
              navigate('/home');
              return;
            }
            
            setLoan(loanData);
          } catch (loanError) {
            if (loanError.response?.status === 404 || loanError.message === 'Loan not found') {
              console.warn('Loan not found, fetching latest approved loan...');
              const loansResponse = await axios.get('/loans');
              const loans = loansResponse.data.loans || [];
              const approvedLoan = loans.find(l => 
                (l.status === 'signature_pending' || l.status === 'payment_pending' || l.status === 'payment_failed') && 
                l.digitalSignature && 
                (l.status === 'payment_failed' || !l.depositPaid) // Allow payment_failed even if depositPaid is true (retry)
              );
              if (approvedLoan) {
                setLoan(approvedLoan);
              } else {
                toast.error('No pending payment found');
                navigate('/home');
                return;
              }
            } else {
              throw loanError;
            }
          }
        } else {
          const loansResponse = await axios.get('/loans');
          const loans = loansResponse.data.loans || [];
          const approvedLoan = loans.find(l => 
            (l.status === 'signature_pending' || l.status === 'payment_pending' || l.status === 'payment_failed') && 
            l.digitalSignature && 
            (l.status === 'payment_failed' || !l.depositPaid) // Allow payment_failed even if depositPaid is true (retry)
          );
          if (approvedLoan) {
            setLoan(approvedLoan);
          } else {
            toast.error('No pending payment found');
            navigate('/home');
            return;
          }
        }
      } catch (error) {
        console.error('Error loading loan:', error);
        if (error.response?.status !== 404) {
          toast.error('Failed to load payment details');
        }
        navigate('/home');
      } finally {
        setLoading(false);
      }
    };

    loadLoanData();
  }, [location.state, navigate]);

  // Auto-verify payment status - REMOVED to prevent duplicate notifications
  // Payment verification is now handled only in handleVerifyPayment function

  // Calculate total amount - prioritize admin config for approved loans that haven't paid
  // If loan has payment amounts set, use those; otherwise use current admin config
  const totalAmount = loan ? (() => {
    // If loan already has totalPaymentAmount and depositPaid is false, 
    // it means charges were set but payment not done - use admin config if available
    if (loan.status === 'approved' && !loan.depositPaid && adminConfig) {
      // Use current admin config for approved loans that haven't paid yet
      const fileCharge = adminConfig.fileCharge ?? 0;
      const platformFee = adminConfig.platformFee ?? 0;
      const depositAmount = adminConfig.depositAmount ?? 0;
      const tax = adminConfig.tax ?? 0;
      return fileCharge + platformFee + depositAmount + tax;
    }
    
    // If loan has totalPaymentAmount, use it
    if (loan.totalPaymentAmount && loan.totalPaymentAmount > 0) {
      return loan.totalPaymentAmount;
    }
    
    // Otherwise calculate from loan values or admin config
    const fileCharge = (loan.fileCharge !== undefined && loan.fileCharge !== null && loan.fileCharge > 0) 
      ? loan.fileCharge 
      : (adminConfig?.fileCharge ?? 0);
    const platformFee = (loan.platformFee !== undefined && loan.platformFee !== null && loan.platformFee > 0)
      ? loan.platformFee
      : (adminConfig?.platformFee ?? 0);
    const depositAmount = (loan.depositAmount !== undefined && loan.depositAmount !== null && loan.depositAmount > 0)
      ? loan.depositAmount
      : (adminConfig?.depositAmount ?? 0);
    const tax = (loan.tax !== undefined && loan.tax !== null && loan.tax > 0)
      ? loan.tax
      : (adminConfig?.tax ?? 0);
    
    return fileCharge + platformFee + depositAmount + tax;
  })() : 0;

  // Generate UPI payment string for QR code
  const loanId = loan?.loanId || loan?._id?.slice(-8);
  const siteName = 'GrowLoan';
  const formattedAmount = totalAmount.toFixed(2);
  
  // Standard UPI string for QR code
  const upiPaymentString = `upi://pay?pa=${upiId}&pn=${siteName}&am=${formattedAmount}&cu=INR&tn=LoanPayment&tr=${loanId}`;
  
  // Copy UPI ID to clipboard
  const copyUpiId = () => {
    navigator.clipboard.writeText(upiId).then(() => {
      toast.success('UPI ID copied to clipboard!');
    }).catch(() => {
      toast.error('Failed to copy UPI ID');
    });
  };

  // Detect iOS
  const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;

  // Open UPI apps with payment details
  const openGPay = () => {
    // For iOS, use standard UPI scheme with properly encoded parameters
    // GPay on iOS will handle upi:// links and show payment screen
    const upiLink = `upi://pay?pa=${encodeURIComponent(upiId)}&pn=${encodeURIComponent(siteName)}&am=${formattedAmount}&cu=INR&tn=${encodeURIComponent('Loan Payment')}&tr=${loanId}`;
    
    if (isIOS) {
      // iOS: Direct window.location redirect works best
      // This ensures GPay receives the payment parameters properly
      window.location.href = upiLink;
    } else {
      // Android: Try GPay specific scheme first
      const gpayLink = `gpay://pay?pa=${encodeURIComponent(upiId)}&pn=${encodeURIComponent(siteName)}&am=${formattedAmount}&cu=INR&tn=${encodeURIComponent('Loan Payment')}&tr=${loanId}`;
      
      const link = document.createElement('a');
      link.href = gpayLink;
      link.style.display = 'none';
      document.body.appendChild(link);
      link.click();
      
      // Fallback to standard UPI if GPay not available
      setTimeout(() => {
        if (document.body.contains(link)) {
          document.body.removeChild(link);
          const fallbackLink = document.createElement('a');
          fallbackLink.href = upiLink;
          fallbackLink.style.display = 'none';
          document.body.appendChild(fallbackLink);
          fallbackLink.click();
          setTimeout(() => {
            if (document.body.contains(fallbackLink)) {
              document.body.removeChild(fallbackLink);
            }
          }, 100);
        }
      }, 1000);
    }
  };

  const openPaytm = () => {
    const link = document.createElement('a');
    
    // Use Paytm-specific deep link
    link.href = `paytmmp://pay?pa=${upiId}&pn=${encodeURIComponent(siteName)}&am=${formattedAmount}&cu=INR&tn=${encodeURIComponent('Loan Payment')}`;
    
    link.style.display = 'none';
    document.body.appendChild(link);
    link.click();
    
    // Fallback to standard UPI after delay
    setTimeout(() => {
      if (document.body.contains(link)) {
        document.body.removeChild(link);
        const fallbackLink = document.createElement('a');
        fallbackLink.href = upiPaymentString;
        fallbackLink.style.display = 'none';
        document.body.appendChild(fallbackLink);
        fallbackLink.click();
        setTimeout(() => document.body.removeChild(fallbackLink), 100);
      }
    }, 1000);
  };

  const openPhonePe = () => {
    const link = document.createElement('a');
    
    // Use PhonePe-specific deep link
    link.href = `phonepe://pay?pa=${upiId}&pn=${encodeURIComponent(siteName)}&am=${formattedAmount}&cu=INR&tn=${encodeURIComponent('Loan Payment')}`;
    
    link.style.display = 'none';
    document.body.appendChild(link);
    link.click();
    
    // Fallback to standard UPI after delay
    setTimeout(() => {
      if (document.body.contains(link)) {
        document.body.removeChild(link);
        const fallbackLink = document.createElement('a');
        fallbackLink.href = upiPaymentString;
        fallbackLink.style.display = 'none';
        document.body.appendChild(fallbackLink);
        fallbackLink.click();
        setTimeout(() => document.body.removeChild(fallbackLink), 100);
      }
    }, 1000);
  };
  
  // Download QR Code
  const downloadQR = () => {
    try {
      const canvas = document.querySelector('canvas');
      if (canvas) {
        const url = canvas.toDataURL('image/png');
        const link = document.createElement('a');
        link.download = `GrowLoan-Payment-QR-${loanId}.png`;
        link.href = url;
        link.click();
        toast.success('QR Code downloaded successfully!');
      } else {
        toast.error('QR Code not found');
      }
    } catch (error) {
      console.error('Download error:', error);
      toast.error('Failed to download QR Code');
    }
  };
  
  // Share QR Code
  const shareQR = async () => {
    try {
      const canvas = document.querySelector('canvas');
      if (!canvas) {
        toast.error('QR Code not found');
        return;
      }
      
      // Check if Web Share API with files is supported
      if (navigator.share && navigator.canShare) {
        canvas.toBlob(async (blob) => {
          const file = new File([blob], `GrowLoan-Payment-${loanId}.png`, { type: 'image/png' });
          const shareData = {
            title: 'GrowLoan Payment',
            text: `Pay ₹${formattedAmount} to ${upiId}\nLoan ID: GL-${loanId}`,
            files: [file]
          };
          
          if (navigator.canShare(shareData)) {
            await navigator.share(shareData);
            toast.success('QR Code shared successfully!');
          } else {
            // Fallback: share text only
            await navigator.share({
              title: 'GrowLoan Payment',
              text: `Pay ₹${formattedAmount} via UPI\nUPI ID: ${upiId}\nAmount: ₹${formattedAmount}\nLoan ID: GL-${loanId}`
            });
            toast.success('Payment details shared!');
          }
        });
      } else {
        // Fallback: Copy UPI string to clipboard
        navigator.clipboard.writeText(`UPI Payment\nUPI ID: ${upiId}\nAmount: ₹${formattedAmount}\nLoan ID: GL-${loanId}`);
        toast.success('Payment details copied! Share manually.');
      }
    } catch (error) {
      console.error('Share error:', error);
      if (error.name !== 'AbortError') {
        toast.error('Failed to share QR Code');
      }
    }
  };






  const handleVerifyPayment = async () => {
    if (!loan) return;

    // Prevent multiple clicks if already verifying or verified
    if (verifying || paymentVerified) {
      return;
    }

    // Dismiss any existing toasts to prevent duplicates
    toast.dismiss();

    setProcessing(true);
    setVerifying(true);
    
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

      const loanId = loan.id || loan._id;
      
      const response = await axios.post(`/loans/${loanId}/payment`, {
        paymentMethod: 'UPI'
      });

      // Single notification for payment submission
      toast.success('✅ Payment submitted! Verifying...', { autoClose: 3000 });
      
      // Start checking payment status
      let notificationShown = false; // Flag to prevent duplicate notifications
      const checkStatus = async () => {
        try {
          // Don't check if already verified
          if (paymentVerified) {
            return;
          }

          const statusResponse = await axios.get(`/loans/${loanId}/status`, {
            skipErrorToast: true
          });
          const updatedLoan = statusResponse.data.loan;

          if (updatedLoan.status === 'payment_validation' || updatedLoan.status === 'processing') {
            // Only show notification once
            if (!notificationShown) {
              notificationShown = true;
              setPaymentVerified(true);
              setVerifying(false);
              // Dismiss previous toast and show success - only once
              toast.dismiss();
              toast.success('✅ Payment verified successfully!', { autoClose: 3000 });
              
              // Check if user has bank details, if not navigate to bank details page
              try {
                const userResponse = await axios.get('/auth/me');
                const userData = userResponse.data.user;
                
                // Check if bank details are missing
                if (!userData.bankAccountNumber || !userData.ifscCode) {
                  // Navigate to bank details page after 3 seconds (after success notification)
                  setTimeout(() => {
                    navigate('/bank-details', { 
                      state: { 
                        paymentSuccess: true, 
                        loanId: loanId
                        // Remove message from here - will show in bank details page only if payment is processing
                      } 
                    });
                  }, 3000);
                } else {
                  // Bank details already provided, navigate to home
                  setTimeout(() => {
                    navigate('/home', { state: { paymentSuccess: true, loanId: loanId } });
                  }, 3000);
                }
              } catch (userError) {
                // If user fetch fails, just navigate to home
                setTimeout(() => {
                  navigate('/home', { state: { paymentSuccess: true, loanId: loanId } });
                }, 3000);
              }
            }
          }
        } catch (error) {
          console.error('Error checking status:', error);
        }
      };

      // Check status immediately and then every 3 seconds (max 10 times = 30 seconds)
      let checkCount = 0;
      const maxChecks = 10;
      
      // First check immediately
      checkStatus();
      
      const interval = setInterval(() => {
        checkCount++;
        if (checkCount >= maxChecks || paymentVerified) {
          clearInterval(interval);
          if (!paymentVerified) {
            setVerifying(false);
            // Only show info if payment not verified yet
            toast.dismiss();
            toast.info('Payment verification in progress. You will be notified once verified.', { autoClose: 4000 });
          }
        } else {
          checkStatus();
        }
      }, 3000);

    } catch (error) {
      setVerifying(false);
      // Dismiss any existing toasts before showing error
      toast.dismiss();
      
      if (error.response?.status === 401) {
        toast.error('Session expired. Please login again.');
        navigate('/login');
      } else if (error.response?.status === 400) {
        const errorMsg = error.response?.data?.message || 'Payment submission failed';
        toast.error(errorMsg, { autoClose: 4000 });
        if (errorMsg.includes('already paid') || errorMsg.includes('already processed')) {
          setTimeout(() => navigate('/home'), 2000);
        }
      } else {
        toast.error(error.response?.data?.message || 'Payment submission failed. Please try again.', { autoClose: 4000 });
      }
    } finally {
      setProcessing(false);
    }
  };

  if (loading) {
    return <Loader fullScreen text="Loading payment details..." size="lg" />;
  }

  if (!loan) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <p className="text-lg mb-4">No payment found</p>
          <Button onClick={() => navigate('/home')} className="rounded-xl">
            Go to Home
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white">
      {/* Header with Trust Badges */}
      <div className="bg-white border-b border-gray-200 shadow-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between mb-3">
            <Button
              variant="ghost"
              onClick={() => navigate("/home")}
              className="rounded-xl p-2 hover:bg-gray-100"
            >
              <ArrowLeft className="w-5 h-5" />
            </Button>
            
            <div className="flex items-center gap-2">
              <Shield className="w-5 h-5 text-[#14b8a6]" />
              <h1 className="text-lg md:text-xl font-bold text-gray-900">Secure Payment</h1>
            </div>

            <div className="w-9"></div>
          </div>

          {/* Amount Payable - Prominent Display */}
          <div className="text-center border-t border-gray-100 pt-4 pb-2">
            <p className="text-xs text-gray-500 mb-1 uppercase tracking-wide">Amount Payable</p>
            <p className="text-3xl font-bold text-[#14b8a6] mb-2">
              ₹{totalAmount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </p>
            <div className="flex items-center justify-center gap-4 text-xs text-gray-600">
              <div className="flex items-center gap-1">
                <Verified className="w-4 h-4 text-green-600" />
                <span>Verified</span>
              </div>
              <div className="flex items-center gap-1">
                <Lock className="w-4 h-4 text-blue-600" />
                <span>Secure</span>
              </div>
              <div className="flex items-center gap-1">
                <Shield className="w-4 h-4 text-[#14b8a6]" />
                <span>NPCI</span>
              </div>
            </div>
            <p className="text-xs text-gray-500 mt-2">
              Loan ID: <span className="font-semibold text-gray-700">GL-{loanId}</span>
            </p>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-6 max-w-md">
        {/* Trust Banner */}
        <div className="bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 rounded-xl p-4 mb-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="bg-green-100 p-2 rounded-full">
              <Shield className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <p className="text-sm font-semibold text-gray-900">100% Secure Payment</p>
              <p className="text-xs text-gray-600">Protected by NPCI & SSL Encryption</p>
            </div>
          </div>
          <Verified className="w-6 h-6 text-green-600" />
        </div>

        {/* Payment Methods Section */}
        <div className="bg-white rounded-2xl shadow-lg border border-gray-200 mb-4 overflow-hidden">
          <div className="bg-gradient-to-r from-[#14b8a6] to-[#0d9488] p-4">
            <h3 className="text-white font-bold text-lg flex items-center gap-2">
              <Sparkles className="w-5 h-5" />
              How would you want to pay?
            </h3>
          </div>
          
          <div className="p-4 space-y-3">
            {/* UPI QR Code Option */}
            <div className="border-2 border-[#14b8a6] rounded-xl p-4 bg-gradient-to-br from-[#14b8a6]/5 to-[#0d9488]/5">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className="bg-[#14b8a6] p-2 rounded-lg">
                    <CreditCard className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <p className="font-semibold text-gray-900">UPI Payment</p>
                    <p className="text-xs text-gray-600">Scan QR or use UPI ID</p>
                  </div>
                </div>
                <div className="flex items-center gap-1 text-green-600">
                  <Verified className="w-4 h-4" />
                  <span className="text-xs font-medium">Recommended</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* QR Code Section - Enhanced */}
        <div className="bg-white rounded-2xl p-6 mb-4 shadow-xl border-2 border-gray-200">
          <div className="text-center mb-4">
            <h3 className="text-xl font-bold text-gray-900 mb-1">Scan QR Code to Pay</h3>
            <p className="text-sm text-gray-600">Open any UPI app and scan</p>
          </div>
          
          {/* QR Code with Enhanced Design */}
          <div className="flex justify-center mb-6">
            <div className="relative">
              <div className="bg-white p-6 rounded-2xl border-4 border-[#14b8a6] shadow-2xl">
                <div className="absolute -top-2 -right-2 bg-green-500 rounded-full p-1.5 shadow-lg">
                  <CheckCircle className="w-4 h-4 text-white" />
                </div>
                <QRCodeCanvas
                  value={upiPaymentString}
                  size={qrSize}
                  level="H"
                  includeMargin={true}
                  fgColor="#0d9488"
                  bgColor="#ffffff"
                />
              </div>
              <div className="absolute -bottom-3 left-1/2 transform -translate-x-1/2 bg-white px-3 py-1 rounded-full shadow-md border border-gray-200">
                <p className="text-xs font-semibold text-[#14b8a6]">NPCI Verified</p>
              </div>
            </div>
          </div>
          
          {/* Share & Download Buttons - Enhanced */}
          <div className="grid grid-cols-2 gap-3 mb-6">
            <button
              onClick={shareQR}
              className="bg-gradient-to-r from-blue-500 to-blue-600 text-white py-3 px-4 rounded-xl font-semibold text-sm shadow-lg hover:shadow-xl transition-all active:scale-95 flex items-center justify-center gap-2"
            >
              <Share2 className="w-5 h-5" />
              <span>Share QR</span>
            </button>
            <button
              onClick={downloadQR}
              className="bg-gradient-to-r from-[#14b8a6] to-[#0d9488] text-white py-3 px-4 rounded-xl font-semibold text-sm shadow-lg hover:shadow-xl transition-all active:scale-95 flex items-center justify-center gap-2"
            >
              <Download className="w-5 h-5" />
              <span>Download</span>
            </button>
          </div>
          
          {/* Payment Instructions */}
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-4">
            <h4 className="text-sm font-semibold text-gray-900 mb-2 flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-blue-600" />
              Quick Steps to Pay
            </h4>
            <div className="space-y-2 text-xs text-gray-700">
              <div className="flex items-start gap-2">
                <span className="text-blue-600 font-bold mt-0.5">1.</span>
                <span>Open any UPI app (GPay, Paytm, PhonePe, etc.)</span>
              </div>
              <div className="flex items-start gap-2">
                <span className="text-blue-600 font-bold mt-0.5">2.</span>
                <span>Scan the QR code above or enter UPI ID manually</span>
              </div>
              <div className="flex items-start gap-2">
                <span className="text-blue-600 font-bold mt-0.5">3.</span>
                <span>Enter amount ₹{formattedAmount} and complete payment</span>
              </div>
              <div className="flex items-start gap-2">
                <span className="text-blue-600 font-bold mt-0.5">4.</span>
                <span>Click "Verify Payment" button below after payment</span>
              </div>
            </div>
          </div>
          
          {/* UPI ID with Copy Button - Enhanced */}
          <div className="mt-6 p-4 bg-gradient-to-r from-gray-50 to-gray-100 rounded-xl border border-gray-200">
            <p className="text-xs text-gray-600 mb-3 text-center font-medium uppercase tracking-wide">Or Pay Manually</p>
            <div className="bg-white rounded-lg p-3 border-2 border-[#14b8a6]/30">
              <p className="text-xs text-gray-500 mb-2 text-center">UPI ID</p>
              <div className="flex items-center justify-center gap-2 mb-2">
                <p className="text-base font-mono font-bold text-[#14b8a6] break-all">{upiId}</p>
                <button
                  onClick={copyUpiId}
                  className="p-2 bg-[#14b8a6] hover:bg-[#0d9488] text-white rounded-lg transition-all active:scale-95 flex-shrink-0 shadow-md"
                  title="Copy UPI ID"
                >
                  <Copy className="w-4 h-4" />
                </button>
              </div>
              <div className="text-center pt-2 border-t border-gray-200">
                <p className="text-xs text-gray-600">
                  Amount: <span className="font-bold text-lg text-[#14b8a6]">₹{formattedAmount}</span>
                </p>
              </div>
            </div>
          </div>

          {/* UPI Apps Section - Professional Design */}
          <div className="mt-6">
            <p className="text-sm font-semibold text-gray-700 mb-4 text-center">Pay with UPI Apps</p>
            <div className="grid grid-cols-3 gap-3">
              {/* GPay Button */}
              <button
                onClick={openGPay}
                className="bg-white border-2 border-gray-200 hover:border-[#4285F4] rounded-xl p-4 shadow-md hover:shadow-xl transition-all active:scale-95 flex flex-col items-center justify-center gap-2 group"
                title="Pay with Google Pay"
              >
                <div className="bg-gradient-to-br from-[#4285F4] to-[#34A853] p-2 rounded-lg group-hover:scale-110 transition-transform">
                  <svg className="w-8 h-8" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                  </svg>
                </div>
                <span className="text-xs font-semibold text-gray-700">GPay</span>
              </button>

              {/* Paytm Button */}
              <button
                onClick={openPaytm}
                className="bg-white border-2 border-gray-200 hover:border-[#00BAF2] rounded-xl p-4 shadow-md hover:shadow-xl transition-all active:scale-95 flex flex-col items-center justify-center gap-2 group"
                title="Pay with Paytm"
              >
                <div className="bg-gradient-to-br from-[#00BAF2] to-[#002970] p-2 rounded-lg group-hover:scale-110 transition-transform">
                  <svg className="w-8 h-8 text-white" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
                  </svg>
                </div>
                <span className="text-xs font-semibold text-gray-700">Paytm</span>
              </button>

              {/* PhonePe Button */}
              <button
                onClick={openPhonePe}
                className="bg-white border-2 border-gray-200 hover:border-[#5F259F] rounded-xl p-4 shadow-md hover:shadow-xl transition-all active:scale-95 flex flex-col items-center justify-center gap-2 group"
                title="Pay with PhonePe"
              >
                <div className="bg-gradient-to-br from-[#5F259F] to-[#3B1E6A] p-2 rounded-lg group-hover:scale-110 transition-transform">
                  <svg className="w-8 h-8 text-white" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm.31-8.86c-1.77-.45-2.34-.94-2.34-1.67 0-.84.79-1.43 2.1-1.43 1.38 0 1.9.66 1.94 1.64h1.71c-.05-1.34-.87-2.57-2.49-2.97V5H10.9v1.69c-1.51.32-2.72 1.3-2.72 2.81 0 1.79 1.49 2.69 3.66 3.21 1.95.46 2.34 1.15 2.34 1.87 0 .53-.39 1.39-2.1 1.39-1.6 0-2.23-.72-2.32-1.64H8.04c.1 1.7 1.36 2.66 2.86 2.97V19h2.34v-1.67c1.52-.29 2.72-1.16 2.73-2.77-.01-2.2-1.9-2.96-3.66-3.42z"/>
                  </svg>
                </div>
                <span className="text-xs font-semibold text-gray-700">PhonePe</span>
              </button>
            </div>
            <p className="text-xs text-gray-500 mt-3 text-center">
              Tap to open payment app directly
            </p>
          </div>
          
          {/* Security Badges */}
          <div className="mt-6 grid grid-cols-3 gap-2">
            <div className="bg-green-50 border border-green-200 rounded-lg p-2 text-center">
              <Lock className="w-4 h-4 text-green-600 mx-auto mb-1" />
              <p className="text-xs font-semibold text-green-700">SSL Encrypted</p>
            </div>
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-2 text-center">
              <Shield className="w-4 h-4 text-blue-600 mx-auto mb-1" />
              <p className="text-xs font-semibold text-blue-700">NPCI Verified</p>
            </div>
            <div className="bg-purple-50 border border-purple-200 rounded-lg p-2 text-center">
              <Verified className="w-4 h-4 text-purple-600 mx-auto mb-1" />
              <p className="text-xs font-semibold text-purple-700">100% Safe</p>
            </div>
          </div>
        </div>

        {/* Verify Payment Button - Enhanced */}
        <div className="bg-white rounded-2xl p-5 mb-4 shadow-xl border-2 border-gray-200">
          <div className="text-center mb-4">
            <p className="text-sm text-gray-600 mb-1">After making payment, click below</p>
            <div className="flex items-center justify-center gap-2 text-xs text-gray-500">
              <CheckCircle className="w-4 h-4 text-green-600" />
              <span>Payment will be verified automatically</span>
            </div>
          </div>
          <button
            onClick={handleVerifyPayment}
            disabled={processing || verifying}
            className="w-full bg-gradient-to-r from-[#14b8a6] to-[#0d9488] text-white py-4 rounded-xl font-bold text-lg shadow-lg hover:shadow-2xl transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-3 active:scale-98"
          >
            {verifying ? (
              <>
                <div className="w-6 h-6 border-3 border-white/30 border-t-white rounded-full animate-spin" />
                <span>Verifying Payment...</span>
              </>
            ) : paymentVerified ? (
              <>
                <CheckCircle className="w-6 h-6" />
                <span>Payment Verified Successfully!</span>
              </>
            ) : (
              <>
                <CheckCircle className="w-6 h-6" />
                <span>Verify Payment</span>
              </>
            )}
          </button>
          <div className="mt-4 flex items-center justify-center gap-4 text-xs text-gray-500">
            <div className="flex items-center gap-1">
              <Lock className="w-3 h-3" />
              <span>Secure</span>
            </div>
            <div className="flex items-center gap-1">
              <Shield className="w-3 h-3" />
              <span>Verified</span>
            </div>
            <div className="flex items-center gap-1">
              <Verified className="w-3 h-3" />
              <span>Trusted</span>
            </div>
          </div>
        </div>
        
        {/* Footer Trust Info */}
        <div className="bg-gray-50 rounded-xl p-4 mb-4 border border-gray-200">
          <div className="flex items-center justify-center gap-2 mb-2">
            <Shield className="w-5 h-5 text-[#14b8a6]" />
            <p className="text-sm font-semibold text-gray-900">Powered by GrowLoan</p>
          </div>
          <p className="text-xs text-center text-gray-600">
            Your payment is secured with industry-standard encryption
          </p>
        </div>
      </div>
    </div>
  );
};

export default Payment;
