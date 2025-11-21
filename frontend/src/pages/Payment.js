import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import axios from 'axios';
import { toast } from 'react-toastify';
import { Button } from '../components/ui/Button';
import { ArrowLeft, CheckCircle, Menu, X, Home, FileText, History, LogOut } from 'lucide-react';
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
  const [qrSize, setQrSize] = useState(200);

  useEffect(() => {
    // Set QR code size based on screen width
    const updateQrSize = () => {
      setQrSize(window.innerWidth < 768 ? 180 : 240);
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
            // If specific loan not found (404), try to fetch latest approved loan
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
          // Fetch latest approved loan
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

  const handlePaymentComplete = async () => {
    if (!loan) return;

    // Confirmation before submitting
    const confirmed = window.confirm(
      `Confirm Payment:\n\nAmount: ₹${totalAmount.toLocaleString()}\nLoan ID: GL-${loan.loanId || loan._id?.slice(-8)}\n\nHave you completed the payment in your UPI app?`
    );

    if (!confirmed) {
      return;
    }

    setProcessing(true);
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
      
      // Get selected payment method (if any)
      const paymentMethod = localStorage.getItem('selectedPaymentMethod') || 'UPI';
      
      const response = await axios.post(`/loans/${loanId}/payment`, {
        paymentMethod: paymentMethod
      });
      
      // Clear stored payment method
      localStorage.removeItem('selectedPaymentMethod');

      toast.success('✅ Payment submitted successfully! Your payment is under verification.');
      navigate('/home', { state: { paymentSuccess: true, loanId: loanId } });
    } catch (error) {
      if (error.response?.status === 401) {
        toast.error('Session expired. Please login again.');
        navigate('/login');
      } else if (error.response?.status === 400) {
        const errorMsg = error.response?.data?.message || 'Payment submission failed';
        toast.error(errorMsg);
        // If already paid, navigate to home
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

  const totalAmount = loan.totalPaymentAmount || 
    (loan.fileCharge || 99) + (loan.platformFee || 50) + (loan.depositAmount || 149);

  // Generate UPI payment string with reference ID (transaction/loan ID)
  const loanId = loan.loanId || loan._id?.slice(-8);
  const referenceId = `GL-${loanId}`;
  const paymentNote = encodeURIComponent(`Loan Payment ${referenceId}`);
  const upiPaymentString = `upi://pay?pa=${encodeURIComponent(upiId)}&am=${totalAmount}&cu=INR&tn=${paymentNote}&tr=${referenceId}`;

  // Payment app icons data with proper deep links
  const paymentApps = [
    { 
      name: 'GPay', 
      icon: '📱', 
      color: 'bg-gradient-to-br from-blue-500 to-blue-600', 
      // GPay uses standard UPI format - it will handle the payment
      upiLink: upiPaymentString,
      fallbackLink: `tez://pay?pa=${encodeURIComponent(upiId)}&am=${totalAmount}&cu=INR&tn=${paymentNote}&tr=${referenceId}`,
      universalLink: `https://gpay.app.goo.gl/pay?pa=${encodeURIComponent(upiId)}&am=${totalAmount}&cu=INR&tn=${paymentNote}&tr=${referenceId}`
    },
    { 
      name: 'PhonePe', 
      icon: '💳', 
      color: 'bg-gradient-to-br from-purple-500 to-purple-600', 
      upiLink: `phonepe://pay?pa=${upiId}&am=${totalAmount}&cu=INR&tn=${paymentNote}&tr=${referenceId}`,
      fallbackLink: `phonepe://pay?pa=${upiId}&am=${totalAmount}&cu=INR&tn=${paymentNote}&tr=${referenceId}`
    },
    { 
      name: 'Paytm', 
      icon: '💰', 
      color: 'bg-gradient-to-br from-blue-600 to-blue-700', 
      upiLink: `paytmmp://pay?pa=${upiId}&am=${totalAmount}&cu=INR&tn=${paymentNote}&tr=${referenceId}`,
      fallbackLink: `paytmmp://pay?pa=${upiId}&am=${totalAmount}&cu=INR&tn=${paymentNote}&tr=${referenceId}`
    },
    { 
      name: 'BHIM', 
      icon: '🏦', 
      color: 'bg-gradient-to-br from-green-600 to-green-700', 
      upiLink: `bhim://pay?pa=${upiId}&am=${totalAmount}&cu=INR&tn=${paymentNote}&tr=${referenceId}`,
      fallbackLink: `bhim://pay?pa=${upiId}&am=${totalAmount}&cu=INR&tn=${paymentNote}&tr=${referenceId}`
    },
    { 
      name: 'Credit Card', 
      icon: '💳', 
      color: 'bg-gradient-to-br from-indigo-600 to-indigo-700', 
      upiLink: null,
      isManual: true,
      method: 'credit_card'
    },
    { 
      name: 'Debit Card', 
      icon: '💳', 
      color: 'bg-gradient-to-br from-teal-600 to-teal-700', 
      upiLink: null,
      isManual: true,
      method: 'debit_card'
    },
    { 
      name: 'Net Banking', 
      icon: '🏦', 
      color: 'bg-gradient-to-br from-orange-600 to-orange-700', 
      upiLink: null,
      isManual: true,
      method: 'net_banking'
    },
    { 
      name: 'Other', 
      icon: '📲', 
      color: 'bg-gradient-to-br from-gray-600 to-gray-700', 
      upiLink: null,
      isManual: true,
      method: 'other'
    }
  ];

  const handleAppClick = async (app) => {
    // If manual payment method (Credit Card, Debit Card, etc.)
    if (app.isManual) {
      // Store payment method for later use
      localStorage.setItem('selectedPaymentMethod', app.method);
      toast.info(`For ${app.name}, please complete payment manually using UPI ID: ${upiId} and amount: ₹${totalAmount.toLocaleString()}, then click "I've Paid" button.`);
      return;
    }
    
    // Store payment method
    localStorage.setItem('selectedPaymentMethod', 'UPI');

    // Try to open the payment app with proper deep link
    try {
      // For GPay, try multiple methods for better compatibility
      if (app.name === 'GPay') {
        toast.info('Opening GPay...');
        
        // Method 1: Try universal link (works on web and mobile)
        if (app.universalLink) {
          try {
            window.open(app.universalLink, '_blank');
          } catch (e) {
            console.log('Universal link failed, trying deep link');
          }
        }
        
        // Method 2: Try direct UPI link (GPay handles standard UPI links)
        try {
          window.location.href = app.upiLink;
        } catch (e1) {
          // Method 3: Try tez:// fallback (older GPay)
          try {
            window.location.href = app.fallbackLink;
          } catch (e2) {
            // Final fallback: copy UPI details
            const paymentDetails = `UPI ID: ${upiId}\nAmount: ₹${totalAmount.toLocaleString()}\nReference: ${referenceId}`;
            navigator.clipboard.writeText(paymentDetails).then(() => {
              toast.info('GPay not found. Payment details copied! Open GPay manually and enter the details.');
            }).catch(() => {
              toast.info(`Please open GPay and enter:\nUPI ID: ${upiId}\nAmount: ₹${totalAmount.toLocaleString()}`);
            });
          }
        }
      } else {
        // For other UPI apps, use direct deep link
        const link = document.createElement('a');
        link.href = app.upiLink;
        link.style.display = 'none';
        document.body.appendChild(link);
        link.click();
        
        // Remove link after a delay
        setTimeout(() => {
          document.body.removeChild(link);
        }, 100);
        
        toast.info(`Opening ${app.name}...`);
        
        // Fallback: if app doesn't open, copy to clipboard
        setTimeout(async () => {
          try {
            await navigator.clipboard.writeText(upiPaymentString);
            toast.info(`${app.name} not found. UPI string copied! Open ${app.name} manually.`);
          } catch (clipError) {
            toast.info(`Please open ${app.name} and use UPI ID: ${upiId} with amount: ₹${totalAmount.toLocaleString()}`);
          }
        }, 2000);
      }
    } catch (error) {
      // Final fallback: copy UPI string to clipboard
      try {
        await navigator.clipboard.writeText(upiPaymentString);
        toast.success(`UPI payment string copied! Open ${app.name} manually and paste.`);
      } catch (clipError) {
        // Final fallback: show UPI string
        toast.info(`Please open ${app.name} and use UPI ID: ${upiId} with amount: ₹${totalAmount.toLocaleString()}`);
      }
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Navigation */}
      <nav className="bg-card border-b border-border sticky top-0 z-50 shadow-sm">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <Button
              variant="ghost"
              onClick={() => navigate("/home")}
              className="rounded-xl hidden md:flex"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back
            </Button>
            
            <div className="text-lg md:text-2xl font-bold text-gradient md:absolute md:left-1/2 md:transform md:-translate-x-1/2">
              Payment
            </div>

            <div className="hidden md:flex gap-3 items-center">
              <Button
                variant="outline"
                onClick={() => navigate("/applications")}
                className="rounded-xl"
              >
                <FileText className="w-4 h-4 mr-2" />
                Applications
              </Button>
              <Button
                variant="destructive"
                onClick={logout}
                className="rounded-xl"
              >
                <LogOut className="w-4 h-4 mr-2" />
                Logout
              </Button>
            </div>

            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden p-2 rounded-lg hover:bg-muted transition-colors"
              aria-label="Toggle menu"
            >
              {mobileMenuOpen ? (
                <X className="w-6 h-6" />
              ) : (
                <Menu className="w-6 h-6" />
              )}
            </button>
          </div>

          {mobileMenuOpen && (
            <div className="md:hidden mt-4 pb-4 border-t border-border pt-4 space-y-2">
              <Button
                variant="outline"
                onClick={() => {
                  navigate("/home");
                  setMobileMenuOpen(false);
                }}
                className="w-full rounded-xl justify-start"
              >
                <Home className="w-4 h-4 mr-2" />
                Home
              </Button>
              <Button
                variant="outline"
                onClick={() => {
                  navigate("/applications");
                  setMobileMenuOpen(false);
                }}
                className="w-full rounded-xl justify-start"
              >
                <FileText className="w-4 h-4 mr-2" />
                Applications
              </Button>
              <Button
                variant="destructive"
                onClick={() => {
                  logout();
                  setMobileMenuOpen(false);
                }}
                className="w-full rounded-xl justify-start"
              >
                <LogOut className="w-4 h-4 mr-2" />
                Logout
              </Button>
            </div>
          )}
        </div>
      </nav>

      <div className="container mx-auto px-4 py-4 md:py-8">
        <div className="max-w-2xl mx-auto">
          {/* Payment Header */}
          <div className="text-center mb-6 md:mb-8">
            <h1 className="text-2xl md:text-4xl font-bold mb-2 text-gradient">Complete Payment</h1>
            <p className="text-sm md:text-base text-muted-foreground">Loan ID: GL-{loan.loanId || loan._id?.slice(-8)}</p>
          </div>

          {/* Amount Card - Classic Design */}
          <div className="bg-gradient-to-br from-primary/20 via-primary/10 to-primary/5 rounded-2xl md:rounded-3xl p-5 md:p-8 mb-5 md:mb-6 border-2 border-primary/30 shadow-xl">
            <div className="text-center">
              <p className="text-xs md:text-sm text-muted-foreground mb-2 uppercase tracking-wide">Total Payment Amount</p>
              <h2 className="text-4xl md:text-6xl font-bold text-primary mb-4 md:mb-6">₹{totalAmount.toLocaleString()}</h2>
              
              {/* Amount Breakdown - Classic Table Style */}
              <div className="bg-white/80 dark:bg-card rounded-xl md:rounded-2xl p-4 md:p-6 mt-4 md:mt-6 border border-primary/10">
                <div className="space-y-2 md:space-y-3">
                  <div className="flex justify-between items-center py-2 border-b border-border/50">
                    <span className="text-xs md:text-sm text-muted-foreground">File Processing Charge</span>
                    <span className="text-sm md:text-base font-semibold">₹{loan.fileCharge || 99}</span>
                  </div>
                  <div className="flex justify-between items-center py-2 border-b border-border/50">
                    <span className="text-xs md:text-sm text-muted-foreground">Platform Service Fee</span>
                    <span className="text-sm md:text-base font-semibold">₹{loan.platformFee || 50}</span>
                  </div>
                  <div className="flex justify-between items-center py-2 border-b border-border/50">
                    <span className="text-xs md:text-sm text-muted-foreground">Deposit Amount</span>
                    <span className="text-sm md:text-base font-semibold">₹{loan.depositAmount || 149}</span>
                  </div>
                  <div className="flex justify-between items-center pt-3 mt-2 border-t-2 border-primary/30">
                    <span className="text-base md:text-lg font-bold">Total Amount</span>
                    <span className="text-lg md:text-xl font-bold text-primary">₹{totalAmount.toLocaleString()}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* QR Code Section - Classic Design */}
          <div className="bg-card rounded-2xl md:rounded-3xl p-5 md:p-8 mb-5 md:mb-6 border-2 border-border shadow-lg">
            <h3 className="text-lg md:text-xl font-bold mb-4 md:mb-6 text-center text-foreground">Scan QR Code to Pay</h3>
            
            {/* QR Code */}
            <div className="flex justify-center mb-5 md:mb-6">
              <div className="bg-white p-3 md:p-6 rounded-xl md:rounded-2xl border-4 border-primary/30 shadow-2xl">
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

            {/* UPI ID Display - Classic Style */}
            <div className="bg-gradient-to-r from-primary/10 to-primary/5 rounded-xl md:rounded-2xl p-4 md:p-5 text-center border border-primary/20">
              <p className="text-xs md:text-sm text-muted-foreground mb-2 uppercase tracking-wide">UPI Payment ID</p>
              <p className="text-base md:text-lg font-bold font-mono break-all text-primary mb-2">{upiId}</p>
              <div className="flex items-center justify-center gap-2 mt-3 pt-3 border-t border-primary/20">
                <span className="text-xs md:text-sm text-muted-foreground">Amount:</span>
                <span className="text-sm md:text-base font-bold text-primary">₹{totalAmount.toLocaleString()}</span>
              </div>
            </div>
          </div>

          {/* Payment Apps - Classic Grid */}
          <div className="bg-card rounded-2xl md:rounded-3xl p-5 md:p-8 mb-5 md:mb-6 border-2 border-border shadow-lg">
            <h3 className="text-lg md:text-xl font-bold mb-4 md:mb-6 text-center text-foreground">Choose Payment Method</h3>
            
            {/* UPI Apps Section */}
            <div className="mb-6">
              <h4 className="text-sm md:text-base font-semibold text-muted-foreground mb-3">UPI Payment Apps</h4>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
                {paymentApps.filter(app => !app.isManual).map((app, index) => (
                  <button
                    key={index}
                    onClick={() => handleAppClick(app)}
                    className={`${app.color} text-white rounded-xl md:rounded-2xl p-4 md:p-6 hover:scale-105 active:scale-95 transition-all shadow-lg hover:shadow-xl flex flex-col items-center justify-center gap-2 md:gap-3 border-2 border-white/20`}
                  >
                    <div className="text-4xl md:text-5xl">{app.icon}</div>
                    <div className="font-bold text-sm md:text-base">{app.name}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* Other Payment Methods */}
            <div className="border-t border-border pt-6">
              <h4 className="text-sm md:text-base font-semibold text-muted-foreground mb-3">Other Payment Methods</h4>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
                {paymentApps.filter(app => app.isManual).map((app, index) => (
                  <button
                    key={index}
                    onClick={() => handleAppClick(app)}
                    className={`${app.color} text-white rounded-xl md:rounded-2xl p-4 md:p-6 hover:scale-105 active:scale-95 transition-all shadow-lg hover:shadow-xl flex flex-col items-center justify-center gap-2 md:gap-3 border-2 border-white/20`}
                  >
                    <div className="text-4xl md:text-5xl">{app.icon}</div>
                    <div className="font-bold text-sm md:text-base text-center">{app.name}</div>
                  </button>
                ))}
              </div>
            </div>

            <p className="text-center text-xs md:text-sm text-muted-foreground mt-4">
              Click on UPI app to open directly, or use other methods and click "I've Paid" after payment
            </p>
          </div>

          {/* Payment Instructions - Classic Style */}
          <div className="bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-950/20 dark:to-indigo-950/20 border-2 border-blue-200 dark:border-blue-800 rounded-xl md:rounded-2xl p-5 md:p-6 mb-5 md:mb-6">
            <h4 className="font-bold text-blue-700 dark:text-blue-400 mb-4 flex items-center gap-2 text-base md:text-lg">
              <span className="text-xl">ℹ️</span> Payment Instructions
            </h4>
            <ul className="space-y-2.5 md:space-y-3 text-xs md:text-sm text-foreground">
              <li className="flex items-start gap-3">
                <span className="text-blue-600 dark:text-blue-400 font-bold mt-0.5">1.</span>
                <span>Scan the QR code above with any UPI app (GPay, PhonePe, Paytm, BHIM) or click on your preferred payment app</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="text-blue-600 dark:text-blue-400 font-bold mt-0.5">2.</span>
                <span>Verify the amount: <strong className="text-primary">₹{totalAmount.toLocaleString()}</strong> and UPI ID: <strong className="text-primary">{upiId}</strong></span>
              </li>
              <li className="flex items-start gap-3">
                <span className="text-blue-600 dark:text-blue-400 font-bold mt-0.5">3.</span>
                <span>Complete the payment in your UPI app and wait for payment confirmation</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="text-blue-600 dark:text-blue-400 font-bold mt-0.5">4.</span>
                <span>After successful payment, click <strong>"I've Paid - Complete Payment"</strong> button below</span>
              </li>
              <li className="flex items-start gap-3 pt-2 border-t border-blue-200 dark:border-blue-800">
                <span className="text-green-600 dark:text-green-400 font-bold mt-0.5">✓</span>
                <span className="text-green-700 dark:text-green-400 font-semibold">Your payment will be verified and loan processing will start automatically</span>
              </li>
            </ul>
          </div>

          {/* Payment Complete Button - Classic Design */}
          <div className="space-y-3 md:space-y-4">
            <Button
              onClick={handlePaymentComplete}
              className="w-full bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 text-white h-12 md:h-14 text-base md:text-lg rounded-xl font-bold shadow-xl hover:shadow-2xl transition-all border-2 border-green-500/50"
              disabled={processing}
            >
              {processing ? (
                <div className="flex items-center gap-2">
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>Processing Payment...</span>
                </div>
              ) : (
                <>
                  <CheckCircle className="w-5 h-5 mr-2" />
                  I've Paid - Complete Payment
                </>
              )}
            </Button>

            {/* Security Notice */}
            <div className="bg-green-50 dark:bg-green-950/20 border-2 border-green-200 dark:border-green-800 rounded-xl p-4 text-center">
              <p className="text-xs md:text-sm text-green-800 dark:text-green-300">
                <strong className="font-semibold">🔒 Secure Payment:</strong> Your payment is processed securely. Click the button only after completing payment in your UPI app.
              </p>
            </div>

            <Button
              variant="outline"
              onClick={() => navigate('/home')}
              className="w-full rounded-xl h-11 md:h-12 text-sm md:text-base"
              disabled={processing}
            >
              Cancel & Go Back
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Payment;

