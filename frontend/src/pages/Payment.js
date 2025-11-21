import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import axios from 'axios';
import { toast } from 'react-toastify';
import { Button } from '../components/ui/Button';
import { ArrowLeft, CheckCircle, Menu, X, Home, FileText, LogOut, MapPin } from 'lucide-react';
import { Loader } from '../components/ui/Loader';
import { QRCodeSVG } from 'qrcode.react';

const Payment = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout } = useAuth();
  const [loan, setLoan] = useState(null);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [upiId, setUpiId] = useState('7211132000@ybl');
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState('gpay');
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

        // Fetch admin config for UPI ID
        try {
          const configResponse = await axios.get('/admin/config');
          if (configResponse.data.config?.upiId) {
            setUpiId(configResponse.data.config.upiId);
          }
        } catch (configError) {
          console.warn('Failed to fetch UPI ID from config, using default');
        }

        // Get loan ID from location state or fetch from API
        if (location.state?.loanId) {
          try {
            const response = await axios.get(`/loans/${location.state.loanId}`);
            setLoan(response.data.loan);
          } catch (loanError) {
            if (loanError.response?.status === 404) {
              console.warn('Loan not found, fetching latest approved loan...');
              const loansResponse = await axios.get('/loans');
              const loans = loansResponse.data.loans || [];
              const approvedLoan = loans.find(l => l.status === 'approved' && !l.depositPaid);
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
          const approvedLoan = loans.find(l => l.status === 'approved' && !l.depositPaid);
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

  // Auto-verify payment status
  useEffect(() => {
    if (!loan || paymentVerified) return;

    const checkPaymentStatus = async () => {
      try {
        const token = localStorage.getItem('token');
        if (!token) return;

        const response = await axios.get(`/loans/${loan.id || loan._id}/status`, {
          skipErrorToast: true
        });
        const updatedLoan = response.data.loan;

        if (updatedLoan.status === 'payment_validation' || updatedLoan.status === 'processing') {
          setPaymentVerified(true);
          setVerifying(false);
          toast.success('✅ Payment verified successfully!');
          
          // Redirect to app/home after 2 seconds
          setTimeout(() => {
            navigate('/home', { state: { paymentSuccess: true, loanId: loan.id || loan._id } });
          }, 2000);
        }
      } catch (error) {
        console.error('Error checking payment status:', error);
      }
    };

    // Check payment status every 5 seconds if verifying
    let interval = null;
    if (verifying) {
      interval = setInterval(checkPaymentStatus, 5000);
      // Also check immediately
      checkPaymentStatus();
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [loan, verifying, paymentVerified, navigate]);

  const totalAmount = loan ? (loan.totalPaymentAmount || 
    (loan.fileCharge || 99) + (loan.platformFee || 50) + (loan.depositAmount || 149)) : 0;

  // Generate UPI payment string (Trusted format to avoid risky warnings)
  const loanId = loan?.loanId || loan?._id?.slice(-8);
  const referenceId = `GL${loanId}`;
  const siteName = 'GrowLoan';
  // Use proper transaction ID format (12 digits)
  const txnId = `TXN${Date.now()}${Math.floor(Math.random() * 1000)}`.slice(0, 12);
  const paymentNote = `Loan Payment ${referenceId}`;
  
  // Trusted UPI string format (avoid risky warnings)
  // Use proper encoding and trusted merchant parameters
  const upiPaymentString = `upi://pay?pa=${encodeURIComponent(upiId)}&pn=${encodeURIComponent(siteName)}&am=${totalAmount.toFixed(2)}&tr=${txnId}&cu=INR&tn=${encodeURIComponent(paymentNote)}`;
  
  // Trusted deep link format (without sign to avoid risk warnings)
  // Use intent-based URLs for better trust

  // Helper function to check if iOS
  const isIOS = () => {
    return /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
  };

  // Payment methods with trusted deep links (avoid risky warnings)
  const paymentMethods = [
    {
      id: 'gpay',
      name: 'Google Pay',
      icon: '📱',
      logo: 'G',
      color: 'from-blue-500 to-blue-600',
      selected: selectedPaymentMethod === 'gpay',
      // Use standard UPI format for GPay (most trusted)
      deepLink: upiPaymentString,
      // Intent URL for better trust
      intentLink: `intent://pay?pa=${encodeURIComponent(upiId)}&pn=${encodeURIComponent(siteName)}&am=${totalAmount.toFixed(2)}&tr=${txnId}&cu=INR&tn=${encodeURIComponent(paymentNote)}#Intent;scheme=upi;package=com.google.android.apps.nfc.payment;end`
    },
    {
      id: 'paytm',
      name: 'Paytm',
      icon: '💰',
      logo: 'P',
      color: 'from-blue-600 to-blue-700',
      selected: selectedPaymentMethod === 'paytm',
      // Use standard UPI format (avoid cash_wallet to reduce risk warnings)
      deepLink: `upi://pay?pa=${encodeURIComponent(upiId)}&pn=${encodeURIComponent(siteName)}&am=${totalAmount.toFixed(2)}&tr=${txnId}&cu=INR&tn=${encodeURIComponent(paymentNote)}`,
      // Paytm specific intent
      intentLink: `intent://pay?pa=${encodeURIComponent(upiId)}&pn=${encodeURIComponent(siteName)}&am=${totalAmount.toFixed(2)}&tr=${txnId}&cu=INR&tn=${encodeURIComponent(paymentNote)}#Intent;scheme=upi;package=net.one97.paytm;end`,
      offer: '₹200'
    },
    {
      id: 'phonepe',
      name: 'PhonePe UPI',
      icon: '💳',
      logo: 'पे',
      color: 'from-purple-500 to-purple-600',
      selected: selectedPaymentMethod === 'phonepe',
      // Standard UPI format
      deepLink: `upi://pay?pa=${encodeURIComponent(upiId)}&pn=${encodeURIComponent(siteName)}&am=${totalAmount.toFixed(2)}&tr=${txnId}&cu=INR&tn=${encodeURIComponent(paymentNote)}`,
      // PhonePe intent
      intentLink: `intent://pay?pa=${encodeURIComponent(upiId)}&pn=${encodeURIComponent(siteName)}&am=${totalAmount.toFixed(2)}&tr=${txnId}&cu=INR&tn=${encodeURIComponent(paymentNote)}#Intent;scheme=upi;package=com.phonepe.app;end`,
      note: 'Low success rate currently'
    },
    {
      id: 'bhim',
      name: 'BHIM UPI',
      icon: '🏦',
      logo: 'BHIM',
      color: 'from-green-600 to-green-700',
      selected: selectedPaymentMethod === 'bhim',
      // Standard UPI format
      deepLink: `upi://pay?pa=${encodeURIComponent(upiId)}&pn=${encodeURIComponent(siteName)}&am=${totalAmount.toFixed(2)}&tr=${txnId}&cu=INR&tn=${encodeURIComponent(paymentNote)}`,
      // BHIM intent
      intentLink: `intent://pay?pa=${encodeURIComponent(upiId)}&pn=${encodeURIComponent(siteName)}&am=${totalAmount.toFixed(2)}&tr=${txnId}&cu=INR&tn=${encodeURIComponent(paymentNote)}#Intent;scheme=upi;package=in.org.npci.upiapp;end`
    },
    {
      id: 'whatsapp',
      name: 'WhatsApp Pay',
      icon: '💬',
      logo: 'WA',
      color: 'from-green-500 to-green-600',
      selected: selectedPaymentMethod === 'whatsapp',
      // Standard UPI format
      deepLink: `upi://pay?pa=${encodeURIComponent(upiId)}&pn=${encodeURIComponent(siteName)}&am=${totalAmount.toFixed(2)}&tr=${txnId}&cu=INR&tn=${encodeURIComponent(paymentNote)}`,
      // WhatsApp intent
      intentLink: `intent://pay?pa=${encodeURIComponent(upiId)}&pn=${encodeURIComponent(siteName)}&am=${totalAmount.toFixed(2)}&tr=${txnId}&cu=INR&tn=${encodeURIComponent(paymentNote)}#Intent;scheme=upi;package=com.whatsapp;end`
    },
    {
      id: 'cred',
      name: 'CRED pay',
      icon: '🛡️',
      logo: 'CRED',
      color: 'from-gray-600 to-gray-700',
      selected: selectedPaymentMethod === 'cred',
      // Standard UPI format
      deepLink: upiPaymentString
    },
    {
      id: 'credit_card',
      name: 'Credit Card',
      icon: '💳',
      logo: '...9999',
      color: 'from-indigo-600 to-indigo-700',
      selected: selectedPaymentMethod === 'credit_card',
      secured: true
    },
    {
      id: 'debit_card',
      name: 'Debit Card',
      icon: '💳',
      logo: '...9999',
      color: 'from-teal-600 to-teal-700',
      selected: selectedPaymentMethod === 'debit_card',
      secured: true
    }
  ];

  const handlePaymentMethodSelect = (methodId) => {
    setSelectedPaymentMethod(methodId);
  };

  const handlePayNow = async (method) => {
    // For manual payment methods (cards), just show instructions
    if (method.id === 'credit_card' || method.id === 'debit_card') {
      toast.info(`For ${method.name}, please complete payment manually using UPI ID: ${upiId} and amount: ₹${totalAmount.toLocaleString()}, then click "Verify Payment" button.`);
      return;
    }

    try {
      toast.info(`Opening ${method.name}...`);
      
      // Try intent URL first (most trusted, avoids risky warnings)
      if (method.intentLink) {
        try {
          window.location.href = method.intentLink;
          setVerifying(true);
          return;
        } catch (e) {
          console.log('Intent link failed, trying deep link');
        }
      }

      // Fallback to standard UPI deep link (trusted format)
      if (method.deepLink) {
        // Use standard UPI format which is most trusted
        window.location.href = method.deepLink;
        setVerifying(true);
      } else {
        // Final fallback to generic UPI
        window.location.href = upiPaymentString;
        setVerifying(true);
      }
    } catch (error) {
      console.error(`Error opening ${method.name}:`, error);
      toast.error(`Failed to open ${method.name}. Please try scanning QR code or use manual payment.`);
    }
  };

  const processPaymentResponse = (instrument) => {
    // Handle payment response from Payment Request API
    console.log('Payment response:', instrument);
    toast.success('Payment initiated!');
    setVerifying(true);
    
    // Complete the payment
    instrument.complete('success').then(() => {
      console.log('Payment completed');
    }).catch((err) => {
      console.error('Payment completion error:', err);
    });
  };

  const handleVerifyPayment = async () => {
    if (!loan) return;

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
      const paymentMethod = paymentMethods.find(m => m.id === selectedPaymentMethod)?.name || 'UPI';
      
      const response = await axios.post(`/loans/${loanId}/payment`, {
        paymentMethod: paymentMethod
      });

      toast.success('✅ Payment submitted! Verifying...');
      
      // Start checking payment status
      const checkStatus = async () => {
        try {
          const statusResponse = await axios.get(`/loans/${loanId}/status`, {
            skipErrorToast: true
          });
          const updatedLoan = statusResponse.data.loan;

          if (updatedLoan.status === 'payment_validation' || updatedLoan.status === 'processing') {
            setPaymentVerified(true);
            setVerifying(false);
            toast.success('✅ Payment verified successfully!');
            
            setTimeout(() => {
              navigate('/home', { state: { paymentSuccess: true, loanId: loanId } });
            }, 2000);
          }
        } catch (error) {
          console.error('Error checking status:', error);
        }
      };

      // Check status immediately and then every 3 seconds
      checkStatus();
      const interval = setInterval(() => {
        checkStatus();
      }, 3000);

      // Stop checking after 30 seconds
      setTimeout(() => {
        clearInterval(interval);
        if (!paymentVerified) {
          setVerifying(false);
          toast.info('Payment verification in progress. You will be notified once verified.');
        }
      }, 30000);

    } catch (error) {
      setVerifying(false);
      if (error.response?.status === 401) {
        toast.error('Session expired. Please login again.');
        navigate('/login');
      } else if (error.response?.status === 400) {
        const errorMsg = error.response?.data?.message || 'Payment submission failed';
        toast.error(errorMsg);
        if (errorMsg.includes('already paid') || errorMsg.includes('already processed')) {
          setTimeout(() => navigate('/home'), 2000);
        }
      } else {
        toast.error(error.response?.data?.message || 'Payment submission failed. Please try again.');
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

  const selectedMethod = paymentMethods.find(m => m.id === selectedPaymentMethod);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
      {/* Mobile Status Bar Simulation */}
      <div className="bg-black text-white text-xs px-4 py-1 flex justify-between items-center md:hidden">
        <span>9:41</span>
        <div className="flex gap-1 items-center">
          <span>📶</span>
          <span>📶</span>
          <span>🔋</span>
        </div>
      </div>

      {/* Header */}
      <div className="bg-white dark:bg-gray-800 shadow-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            <Button
              variant="ghost"
              onClick={() => navigate("/home")}
              className="rounded-xl p-2"
            >
              <ArrowLeft className="w-5 h-5" />
            </Button>
            
            <h1 className="text-lg md:text-xl font-bold text-gray-900 dark:text-white">Payments</h1>

            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700"
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>

          {/* Summary */}
          <div className="mt-2 text-center">
            <p className="text-xs text-gray-600 dark:text-gray-400">
              Loan ID: <span className="font-semibold">GL-{loanId}</span> • 
              Total Amount: <span className="font-semibold text-green-600">₹{totalAmount.toLocaleString()}</span>
            </p>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-4 max-w-md">
        {/* Delivery Info */}
        <div className="bg-white dark:bg-gray-800 rounded-xl p-3 mb-4 flex items-center gap-2 text-sm">
          <MapPin className="w-4 h-4 text-purple-600" />
          <span className="text-gray-700 dark:text-gray-300">Home | {user?.address || 'Address not set'}</span>
        </div>

        {/* Progress Steps */}
        <div className="bg-white dark:bg-gray-800 rounded-xl p-4 mb-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-purple-600 flex items-center justify-center">
                <CheckCircle className="w-5 h-5 text-white" />
              </div>
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Address</span>
            </div>
            <div className="flex-1 h-0.5 bg-purple-600 mx-2"></div>
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-purple-600 flex items-center justify-center">
                <CheckCircle className="w-5 h-5 text-white" />
              </div>
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Order Summary</span>
            </div>
            <div className="flex-1 h-0.5 bg-purple-600 mx-2"></div>
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-purple-600 flex items-center justify-center">
                <span className="text-white font-bold text-sm">3</span>
              </div>
              <span className="text-sm font-medium text-purple-600">Payment</span>
            </div>
          </div>
        </div>

        {/* QR Code Section - At Top */}
        <div className="bg-white dark:bg-gray-800 rounded-xl p-6 mb-4 shadow-lg">
          <h3 className="text-center font-semibold text-gray-800 dark:text-gray-200 mb-4">Scan QR Code to Pay</h3>
          <div className="flex justify-center">
            <div className="bg-white p-4 rounded-xl border-2 border-purple-200">
              <QRCodeSVG
                value={upiPaymentString}
                size={qrSize}
                level="H"
                includeMargin={true}
                fgColor="#667eea"
                bgColor="#ffffff"
              />
            </div>
          </div>
          <div className="mt-4 text-center">
            <p className="text-xs text-gray-600 dark:text-gray-400 mb-1">UPI ID</p>
            <p className="text-sm font-mono font-semibold text-purple-600">{upiId}</p>
            <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">Amount: ₹{totalAmount.toLocaleString()}</p>
          </div>
        </div>

        {/* Preferred Mode Section */}
        <div className="bg-white dark:bg-gray-800 rounded-xl p-4 mb-4 shadow-lg">
          <h3 className="font-semibold text-gray-800 dark:text-gray-200 mb-4">Preferred Mode</h3>
          
          {/* Google Pay */}
          <div className="mb-3">
            <div 
              className={`flex items-center justify-between p-3 rounded-lg border-2 cursor-pointer transition-all ${
                selectedMethod?.id === 'gpay' 
                  ? 'border-purple-600 bg-purple-50 dark:bg-purple-900/20' 
                  : 'border-gray-200 dark:border-gray-700 hover:border-purple-300'
              }`}
              onClick={() => handlePaymentMethodSelect('gpay')}
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center text-white font-bold">
                  G
                </div>
                <span className="font-medium text-gray-800 dark:text-gray-200">Google Pay</span>
              </div>
              {selectedMethod?.id === 'gpay' && (
                <div className="w-6 h-6 rounded-full bg-purple-600 flex items-center justify-center">
                  <CheckCircle className="w-4 h-4 text-white" />
                </div>
              )}
            </div>
            {selectedMethod?.id === 'gpay' && (
              <button
                onClick={() => handlePayNow(selectedMethod)}
                className="w-full mt-2 bg-gradient-to-r from-purple-600 to-purple-700 text-white py-3 rounded-lg font-semibold shadow-lg hover:shadow-xl transition-all"
              >
                Pay using Google Pay
              </button>
            )}
          </div>

          {/* Paytm */}
          <div className="mb-3">
            <div 
              className={`flex items-center justify-between p-3 rounded-lg border-2 cursor-pointer transition-all ${
                selectedMethod?.id === 'paytm' 
                  ? 'border-purple-600 bg-purple-50 dark:bg-purple-900/20' 
                  : 'border-gray-200 dark:border-gray-700 hover:border-purple-300'
              }`}
              onClick={() => handlePaymentMethodSelect('paytm')}
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-600 to-blue-700 flex items-center justify-center text-white font-bold">
                  P
                </div>
                <span className="font-medium text-gray-800 dark:text-gray-200">Paytm</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm text-green-600 font-semibold">{selectedMethod?.offer}</span>
                {selectedMethod?.id === 'paytm' && (
                  <div className="w-6 h-6 rounded-full bg-purple-600 flex items-center justify-center">
                    <CheckCircle className="w-4 h-4 text-white" />
                  </div>
                )}
              </div>
            </div>
            {selectedMethod?.id === 'paytm' && (
              <button
                onClick={() => handlePayNow(selectedMethod)}
                className="w-full mt-2 bg-gradient-to-r from-purple-600 to-purple-700 text-white py-3 rounded-lg font-semibold shadow-lg hover:shadow-xl transition-all"
              >
                Pay using Paytm
              </button>
            )}
          </div>

          {/* Credit Card */}
          <div className="mb-3">
            <div 
              className={`flex items-center justify-between p-3 rounded-lg border-2 cursor-pointer transition-all ${
                selectedMethod?.id === 'credit_card' 
                  ? 'border-purple-600 bg-purple-50 dark:bg-purple-900/20' 
                  : 'border-gray-200 dark:border-gray-700 hover:border-purple-300'
              }`}
              onClick={() => handlePaymentMethodSelect('credit_card')}
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-600 to-indigo-700 flex items-center justify-center text-white">
                  💳
                </div>
                <div>
                  <span className="font-medium text-gray-800 dark:text-gray-200 block">Credit Card</span>
                  <span className="text-xs text-gray-500 dark:text-gray-400">...9999</span>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs bg-purple-100 dark:bg-purple-900 text-purple-700 dark:text-purple-300 px-2 py-1 rounded">Secured</span>
                {selectedMethod?.id === 'credit_card' && (
                  <div className="w-6 h-6 rounded-full bg-purple-600 flex items-center justify-center">
                    <CheckCircle className="w-4 h-4 text-white" />
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* UPI Section */}
        <div className="bg-white dark:bg-gray-800 rounded-xl p-4 mb-4 shadow-lg">
          <h3 className="font-semibold text-gray-800 dark:text-gray-200 mb-4">UPI</h3>
          
          {/* PhonePe */}
          <div className="mb-3">
            <div 
              className={`flex items-center justify-between p-3 rounded-lg border-2 cursor-pointer transition-all ${
                selectedMethod?.id === 'phonepe' 
                  ? 'border-purple-600 bg-purple-50 dark:bg-purple-900/20' 
                  : 'border-gray-200 dark:border-gray-700 hover:border-purple-300'
              }`}
              onClick={() => handlePaymentMethodSelect('phonepe')}
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-500 to-purple-600 flex items-center justify-center text-white font-bold">
                  पे
                </div>
                <div>
                  <span className="font-medium text-gray-800 dark:text-gray-200 block">PhonePe UPI</span>
                  <span className="text-xs text-gray-500 dark:text-gray-400">Low success rate currently</span>
                </div>
              </div>
              {selectedMethod?.id === 'phonepe' && (
                <div className="w-6 h-6 rounded-full bg-purple-600 flex items-center justify-center">
                  <CheckCircle className="w-4 h-4 text-white" />
                </div>
              )}
            </div>
            {selectedMethod?.id === 'phonepe' && (
              <button
                onClick={() => handlePayNow(selectedMethod)}
                className="w-full mt-2 bg-gradient-to-r from-purple-600 to-purple-700 text-white py-3 rounded-lg font-semibold shadow-lg hover:shadow-xl transition-all"
              >
                Pay using PhonePe
              </button>
            )}
          </div>

          {/* CRED pay */}
          <div className="mb-3">
            <div 
              className={`flex items-center justify-between p-3 rounded-lg border-2 cursor-pointer transition-all ${
                selectedMethod?.id === 'cred' 
                  ? 'border-purple-600 bg-purple-50 dark:bg-purple-900/20' 
                  : 'border-gray-200 dark:border-gray-700 hover:border-purple-300'
              }`}
              onClick={() => handlePaymentMethodSelect('cred')}
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-gray-600 to-gray-700 flex items-center justify-center text-white text-xs font-bold">
                  CRED
                </div>
                <span className="font-medium text-gray-800 dark:text-gray-200">CRED pay</span>
              </div>
              {selectedMethod?.id === 'cred' && (
                <div className="w-6 h-6 rounded-full bg-purple-600 flex items-center justify-center">
                  <CheckCircle className="w-4 h-4 text-white" />
                </div>
              )}
            </div>
            {selectedMethod?.id === 'cred' && (
              <button
                onClick={() => handlePayNow(selectedMethod)}
                className="w-full mt-2 bg-gradient-to-r from-purple-600 to-purple-700 text-white py-3 rounded-lg font-semibold shadow-lg hover:shadow-xl transition-all"
              >
                Pay using CRED
              </button>
            )}
          </div>
        </div>

        {/* Verify Payment Button */}
        <div className="bg-white dark:bg-gray-800 rounded-xl p-4 mb-4 shadow-lg">
          <button
            onClick={handleVerifyPayment}
            disabled={processing || verifying}
            className="w-full bg-gradient-to-r from-green-600 to-green-700 text-white py-4 rounded-lg font-bold text-lg shadow-lg hover:shadow-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {verifying ? (
              <>
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                <span>Verifying Payment...</span>
              </>
            ) : paymentVerified ? (
              <>
                <CheckCircle className="w-5 h-5" />
                <span>Payment Verified!</span>
              </>
            ) : (
              <>
                <CheckCircle className="w-5 h-5" />
                <span>Verify Payment</span>
              </>
            )}
          </button>
          <p className="text-xs text-center text-gray-500 dark:text-gray-400 mt-2">
            Click after completing payment in your UPI app
          </p>
        </div>
      </div>
    </div>
  );
};

export default Payment;
