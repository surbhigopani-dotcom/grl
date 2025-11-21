import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import axios from 'axios';
import { toast } from 'react-toastify';
import { Button } from '../components/ui/Button';
import { ArrowLeft, CheckCircle, Menu, X, Home, FileText, LogOut, MapPin, ChevronDown } from 'lucide-react';
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
  const [showAppList, setShowAppList] = useState(false);

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

  // Generate UPI payment string (PHP code format - exact match)
  const loanId = loan?.loanId || loan?._id?.slice(-8);
  const referenceId = `GL${loanId}`;
  const siteName = 'GrowLoan';
  // Transaction ID format (10 digits like PHP code)
  const txnId = Math.floor(Math.random() * 10000000000);
  
  // Sign parameter (from PHP code)
  const signParam = 'AAuN7izDWN5cb8A5scnUiNME+LkZqI2DWgkXlN1McoP6WZABa/KkFTiLvuPRP6/nWK8BPg/rPhb+u4QMrUEX10UsANTDbJaALcSM9b8Wk218X+55T/zOzb7xoiB+BcX8yYuYayELImXJHIgL/c7nkAnHrwUCmbM97nRbCVVRvU0ku3Tr';
  
  // Standard UPI string for QR code (PHP format)
  const upiPaymentString = `upi://pay?pa=${upiId}&pn=${siteName}&am=${totalAmount}&cu=INR&tr=${txnId}&tn=${txnId}`;

  // Helper function to check if iOS
  const isIOS = () => {
    return /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
  };

  // Payment methods with PHP code format (exact match)
  const paymentMethods = [
    {
      id: 'gpay',
      name: 'Google Pay',
      icon: '📱',
      logo: 'G',
      color: 'from-blue-500 to-blue-600',
      selected: selectedPaymentMethod === 'gpay',
      // GPay deep links (multiple options for better compatibility)
      deepLink: `gpay://pay?pa=${upiId}&pn=${siteName}&am=${totalAmount}&cu=INR&tr=${txnId}&tn=${txnId}`,
      fallbackLink: `tez://pay?pa=${upiId}&pn=${siteName}&am=${totalAmount}&cu=INR&tr=${txnId}&tn=${txnId}`,
      // For Payment Request API
      usePaymentRequest: true
    },
    {
      id: 'paytm',
      name: 'Paytm',
      icon: '💰',
      logo: 'P',
      color: 'from-blue-600 to-blue-700',
      selected: selectedPaymentMethod === 'paytm',
      // PHP format (exact): paytmmp://cash_wallet?pa=...&pn=...&am=...&tr=&mc=8999&cu=INR&tn=...&sign=...&featuretype=money_transfer
      deepLink: `paytmmp://cash_wallet?pa=${upiId}&pn=${siteName}&am=${totalAmount}&tr=&mc=8999&cu=INR&tn=${txnId}&sign=${signParam}&featuretype=money_transfer`,
      offer: '₹200'
    },
    {
      id: 'phonepe',
      name: 'PhonePe UPI',
      icon: '💳',
      logo: 'पे',
      color: 'from-purple-500 to-purple-600',
      selected: selectedPaymentMethod === 'phonepe',
      // PHP format (exact): phonepe://pay?pa=...&pn=...&am=...&tr=&mc=8999&cu=INR&tn=...&sign=...
      deepLink: `phonepe://pay?pa=${upiId}&pn=${siteName}&am=${totalAmount}&tr=&mc=8999&cu=INR&tn=${txnId}&sign=${signParam}`,
      // Alternative format if above doesn't work
      altLink: `phonepe://transact?pa=${upiId}&pn=${siteName}&am=${totalAmount}&cu=INR&tn=${txnId}`,
      note: 'Low success rate currently'
    },
    {
      id: 'bhim',
      name: 'BHIM UPI',
      icon: '🏦',
      logo: 'BHIM',
      color: 'from-green-600 to-green-700',
      selected: selectedPaymentMethod === 'bhim',
      // PHP format (exact): bhim://pay?pa=...&pn=...&am=...&tr=&mc=8999&cu=INR&tn=...&sign=...
      deepLink: `bhim://pay?pa=${upiId}&pn=${siteName}&am=${totalAmount}&tr=&mc=8999&cu=INR&tn=${txnId}&sign=${signParam}`
    },
    {
      id: 'whatsapp',
      name: 'WhatsApp Pay',
      icon: '💬',
      logo: 'WA',
      color: 'from-green-500 to-green-600',
      selected: selectedPaymentMethod === 'whatsapp',
      // PHP format (exact): whatsapp://pay?pa=...&pn=...&am=...&tr=&mc=8999&cu=INR&tn=...&sign=...
      deepLink: `whatsapp://pay?pa=${upiId}&pn=${siteName}&am=${totalAmount}&tr=&mc=8999&cu=INR&tn=${txnId}&sign=${signParam}`
    },
    {
      id: 'cred',
      name: 'CRED pay',
      icon: '🛡️',
      logo: 'CRED',
      color: 'from-gray-600 to-gray-700',
      selected: selectedPaymentMethod === 'cred',
      // Use standard UPI format for CRED
      deepLink: upiPaymentString
    }
  ];

  const handlePaymentMethodSelect = (methodId) => {
    setSelectedPaymentMethod(methodId);
  };

  const handlePayNow = async (method) => {
    try {
      toast.info(`Opening ${method.name}...`);
      
      // For GPay, try multiple methods
      if (method.id === 'gpay') {
        // Method 1: Try GPay deep link first (most reliable)
        if (method.deepLink) {
          try {
            window.location.href = method.deepLink;
            setVerifying(true);
            
            // If GPay doesn't open, try fallback after short delay
            setTimeout(() => {
              if (method.fallbackLink) {
                try {
                  window.location.href = method.fallbackLink;
                } catch (e) {
                  console.log('GPay fallback failed');
                }
              }
            }, 500);
            return;
          } catch (e) {
            console.log('GPay deep link failed, trying Payment Request API');
          }
        }

        // Method 2: Try Payment Request API (for supported browsers)
        if (method.usePaymentRequest && !isIOS() && window.PaymentRequest) {
          try {
            const supportedInstruments = [{
              supportedMethods: ['https://tez.google.com/pay'],
              data: {
                pa: upiId,
                pn: siteName,
                tr: txnId.toString(),
                url: `${window.location.origin}/payment-success/${txnId}`,
                mc: '0000',
                tn: `${siteName}_${txnId}`,
              },
            }];

            const details = {
              total: {
                label: 'Total',
                amount: {
                  currency: 'INR',
                  value: totalAmount.toFixed(2),
                },
              },
              displayItems: [{
                label: 'Loan Payment',
                amount: {
                  currency: 'INR',
                  value: totalAmount.toFixed(2),
                },
              }],
            };

            const request = new PaymentRequest(supportedInstruments, details);

            request.canMakePayment().then((result) => {
              if (result) {
                return request.show();
              } else {
                // Fallback to GPay deep link
                if (method.deepLink) {
                  window.location.href = method.deepLink;
                  setVerifying(true);
                } else {
                  window.location.href = upiPaymentString;
                  setVerifying(true);
                }
              }
            }).then((instrument) => {
              if (instrument) {
                instrument.complete('success').then(() => {
                  setVerifying(true);
                }).catch((err) => {
                  console.error('Payment completion error:', err);
                  setVerifying(true);
                });
              }
            }).catch((err) => {
              console.error('Payment Request Error:', err);
              // Fallback to GPay deep link
              if (method.deepLink) {
                window.location.href = method.deepLink;
                setVerifying(true);
              } else {
                window.location.href = upiPaymentString;
                setVerifying(true);
              }
            });
            return;
          } catch (error) {
            console.error('Payment Request API error:', error);
            // Fallback to deep link
            if (method.deepLink) {
              window.location.href = method.deepLink;
              setVerifying(true);
              return;
            }
          }
        }

        // Method 3: Final fallback - standard UPI (will open user's default UPI app)
        window.location.href = upiPaymentString;
        setVerifying(true);
      } 
      // For PhonePe, try multiple formats
      else if (method.id === 'phonepe') {
        // Try primary deep link
        if (method.deepLink) {
          try {
            window.location.href = method.deepLink;
            setVerifying(true);
            
            // If PhonePe doesn't open, try alternative format
            setTimeout(() => {
              if (method.altLink) {
                try {
                  window.location.href = method.altLink;
                } catch (e) {
                  console.log('PhonePe alt link failed');
                }
              }
            }, 500);
            return;
          } catch (e) {
            console.log('PhonePe deep link failed');
          }
        }
        
        // Fallback to standard UPI
        window.location.href = upiPaymentString;
        setVerifying(true);
      }
      // For other payment methods, use direct deep link (PHP code format)
      else {
        if (method.deepLink) {
          // Direct redirect (like PHP code: window.location.href = redirect_url)
          window.location.href = method.deepLink;
          setVerifying(true);
        } else {
          // Fallback to standard UPI
          window.location.href = upiPaymentString;
          setVerifying(true);
        }
      }
    } catch (error) {
      console.error(`Error opening ${method.name}:`, error);
      toast.error(`Failed to open ${method.name}. Please try scanning QR code.`);
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

        {/* UPI Other Button - Single Button with App List */}
        <div className="bg-white dark:bg-gray-800 rounded-xl p-4 mb-4 shadow-lg">
          <button
            onClick={() => setShowAppList(!showAppList)}
            className="w-full bg-gradient-to-r from-purple-600 to-purple-700 text-white py-4 rounded-lg font-semibold text-lg shadow-lg hover:shadow-xl transition-all flex items-center justify-center gap-2"
          >
            <span>UPI Other</span>
            <ChevronDown className={`w-5 h-5 transition-transform duration-200 ${showAppList ? 'rotate-180' : ''}`} />
          </button>

          {/* Payment Apps List (shown when button clicked) */}
          {showAppList && (
            <div className="mt-4 space-y-2 animate-in fade-in slide-in-from-top-2 duration-200">
              {paymentMethods.map((method) => (
                <div
                  key={method.id}
                  onClick={() => {
                    setShowAppList(false);
                    handlePayNow(method);
                  }}
                  className="flex items-center justify-between p-3 rounded-lg border-2 border-gray-200 dark:border-gray-700 hover:border-purple-600 hover:bg-purple-50 dark:hover:bg-purple-900/20 cursor-pointer transition-all active:scale-95"
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-12 h-12 rounded-full bg-gradient-to-br ${method.color} flex items-center justify-center text-white font-bold text-lg shadow-md`}>
                      {method.logo || method.icon}
                    </div>
                    <div>
                      <span className="font-medium text-gray-800 dark:text-gray-200 block">{method.name}</span>
                      {method.offer && (
                        <span className="text-xs text-green-600 font-semibold">{method.offer}</span>
                      )}
                      {method.note && (
                        <span className="text-xs text-gray-500 dark:text-gray-400 block">{method.note}</span>
                      )}
                    </div>
                  </div>
                  <ChevronDown className="w-5 h-5 text-gray-400 rotate-[-90deg]" />
                </div>
              ))}
            </div>
          )}
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
