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

  // Generate UPI payment strings (app-specific deep links work better than generic upi://pay)
  const loanId = loan?.loanId || loan?._id?.slice(-8);
  const siteName = 'GrowLoan';
  const txnId = Math.floor(Math.random() * 10000000000);
  
  // Standard UPI string for QR code (generic - works in QR only)
  const upiPaymentString = `upi://pay?pa=${upiId}&pn=${siteName}&am=${totalAmount}&cu=INR&tn=LoanPayment`;
  
  // App-specific deep links (these bypass "merchant link" restrictions)
  const paymentApps = [
    {
      id: 'gpay',
      name: 'Google Pay',
      icon: '🔵',
      color: 'from-blue-500 to-blue-600',
      // GPay specific scheme (NOT generic upi://)
      link: `tez://upi/pay?pa=${upiId}&pn=${siteName}&am=${totalAmount}&cu=INR&tn=LoanPayment`
    },
    {
      id: 'phonepe',
      name: 'PhonePe',
      icon: '🟣',
      color: 'from-purple-500 to-purple-600',
      // PhonePe specific scheme
      link: `phonepe://pay?pa=${upiId}&pn=${siteName}&am=${totalAmount}&cu=INR&tn=LoanPayment`
    },
    {
      id: 'paytm',
      name: 'Paytm',
      icon: '🔷',
      color: 'from-blue-600 to-blue-700',
      // Paytm specific scheme
      link: `paytmmp://pay?pa=${upiId}&pn=${siteName}&am=${totalAmount}&cu=INR&tn=LoanPayment`
    },
    {
      id: 'bhim',
      name: 'BHIM UPI',
      icon: '🟢',
      color: 'from-green-500 to-green-600',
      // BHIM specific scheme
      link: `bhim://pay?pa=${upiId}&pn=${siteName}&am=${totalAmount}&cu=INR&tn=LoanPayment`
    },
    {
      id: 'amazonpay',
      name: 'Amazon Pay',
      icon: '🟠',
      color: 'from-orange-500 to-orange-600',
      // Amazon Pay specific scheme
      link: `amazonpay://pay?pa=${upiId}&pn=${siteName}&am=${totalAmount}&cu=INR&tn=LoanPayment`
    }
  ];






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
      
      const response = await axios.post(`/loans/${loanId}/payment`, {
        paymentMethod: 'UPI'
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
          
          {/* Payment Safety Info */}
          <div className="mt-4 p-3 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800">
            <p className="text-xs text-green-800 dark:text-green-200 text-center">
              ✓ Safe & Secure Payment • NPCI Approved Format
            </p>
          </div>
        </div>

        {/* Payment Apps - Direct Deep Links */}
        <div className="bg-white dark:bg-gray-800 rounded-xl p-4 mb-4 shadow-lg">
          <h3 className="text-center font-semibold text-gray-800 dark:text-gray-200 mb-4 text-sm md:text-base">
            Pay Using UPI App
          </h3>
          <div className="grid grid-cols-2 gap-3">
            {paymentApps.map((app) => (
              <button
                key={app.id}
                onClick={() => {
                  try {
                    toast.info(`Opening ${app.name}...`);
                    window.location.href = app.link;
                    
                    // Show verify message after 2 seconds
                    setTimeout(() => {
                      toast.success('Complete payment in app, then click "Verify Payment"');
                    }, 2000);
                  } catch (error) {
                    console.error(`Error opening ${app.name}:`, error);
                    toast.error(`Failed to open ${app.name}. Please scan QR code.`);
                  }
                }}
                className={`bg-gradient-to-br ${app.color} text-white p-4 rounded-lg font-semibold text-sm shadow-md hover:shadow-xl transition-all active:scale-95 flex flex-col items-center gap-2`}
              >
                <span className="text-3xl">{app.icon}</span>
                <span>{app.name}</span>
              </button>
            ))}
          </div>
          <p className="text-xs text-center text-gray-500 dark:text-gray-400 mt-3">
            Tap any app to pay directly
          </p>
        </div>

        {/* Verify Payment Button - Always Available */}
        <div className="bg-white dark:bg-gray-800 rounded-xl p-4 mb-4 shadow-lg">
          <button
            onClick={handleVerifyPayment}
            disabled={processing}
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
