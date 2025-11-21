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
      const response = await axios.post(`/loans/${loanId}/payment`, {
        paymentMethod: 'UPI'
      });

      toast.success('✅ Payment successful! Your loan is now processing.');
      navigate('/home', { state: { paymentSuccess: true } });
    } catch (error) {
      if (error.response?.status === 401) {
        toast.error('Session expired. Please login again.');
        navigate('/login');
      } else {
        toast.error(error.response?.data?.message || 'Payment failed');
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
  const upiPaymentString = `upi://pay?pa=${upiId}&am=${totalAmount}&cu=INR&tn=Loan Payment&tr=${referenceId}`;

  // Payment app icons data with reference ID
  const paymentApps = [
    { 
      name: 'GPay', 
      icon: '📱', 
      color: 'bg-gradient-to-br from-blue-500 to-blue-600', 
      upiLink: `tez://pay?pa=${upiId}&am=${totalAmount}&cu=INR&tn=Loan Payment&tr=${referenceId}` 
    },
    { 
      name: 'PhonePe', 
      icon: '💳', 
      color: 'bg-gradient-to-br from-purple-500 to-purple-600', 
      upiLink: `phonepe://pay?pa=${upiId}&am=${totalAmount}&cu=INR&tn=Loan Payment&tr=${referenceId}` 
    },
    { 
      name: 'Paytm', 
      icon: '💰', 
      color: 'bg-gradient-to-br from-blue-600 to-blue-700', 
      upiLink: `paytmmp://pay?pa=${upiId}&am=${totalAmount}&cu=INR&tn=Loan Payment&tr=${referenceId}` 
    },
    { 
      name: 'BHIM', 
      icon: '🏦', 
      color: 'bg-gradient-to-br from-green-600 to-green-700', 
      upiLink: `bhim://pay?pa=${upiId}&am=${totalAmount}&cu=INR&tn=Loan Payment&tr=${referenceId}` 
    }
  ];

  const handleAppClick = (app) => {
    // Try to open the payment app
    try {
      window.location.href = app.upiLink;
      toast.info(`Opening ${app.name}...`);
    } catch (error) {
      // Fallback: copy UPI string to clipboard
      navigator.clipboard.writeText(upiPaymentString);
      toast.success(`UPI payment string copied! Open ${app.name} manually.`);
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

      <div className="container mx-auto px-4 py-6 md:py-8">
        <div className="max-w-2xl mx-auto">
          {/* Payment Header */}
          <div className="text-center mb-8">
            <h1 className="text-2xl md:text-4xl font-bold mb-2 text-gradient">Complete Payment</h1>
            <p className="text-muted-foreground">Loan ID: GL-{loan.loanId || loan._id?.slice(-8)}</p>
          </div>

          {/* Amount Card */}
          <div className="bg-gradient-to-br from-primary/10 to-primary/5 rounded-3xl p-6 md:p-8 mb-6 border-2 border-primary/20">
            <div className="text-center">
              <p className="text-sm text-muted-foreground mb-2">Total Amount</p>
              <h2 className="text-5xl md:text-6xl font-bold text-primary mb-4">₹{totalAmount.toLocaleString()}</h2>
              
              {/* Amount Breakdown */}
              <div className="bg-card rounded-2xl p-4 md:p-6 mt-6 space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">File Processing Charge:</span>
                  <span className="font-bold">₹{loan.fileCharge || 99}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Platform Service Fee:</span>
                  <span className="font-bold">₹{loan.platformFee || 50}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Deposit Amount:</span>
                  <span className="font-bold">₹{loan.depositAmount || 149}</span>
                </div>
                <div className="h-px bg-border my-3" />
                <div className="flex justify-between text-lg font-bold">
                  <span>Total:</span>
                  <span className="text-primary">₹{totalAmount.toLocaleString()}</span>
                </div>
              </div>
            </div>
          </div>

          {/* QR Code Section */}
          <div className="bg-card rounded-3xl p-6 md:p-8 mb-6 border border-border shadow-lg">
            <h3 className="text-xl font-bold mb-4 text-center">Scan QR Code to Pay</h3>
            
            {/* QR Code */}
            <div className="flex justify-center mb-6">
              <div className="bg-white p-6 rounded-2xl border-4 border-primary/20 shadow-xl">
                <QRCodeSVG
                  value={upiPaymentString}
                  size={256}
                  level="H"
                  includeMargin={true}
                  fgColor="#667eea"
                  bgColor="#ffffff"
                />
              </div>
            </div>

            {/* UPI ID Display */}
            <div className="bg-muted/50 rounded-xl p-4 text-center mb-6">
              <p className="text-xs text-muted-foreground mb-1">UPI ID</p>
              <p className="text-lg font-bold font-mono break-all">{upiId}</p>
              <p className="text-xs text-muted-foreground mt-2">Amount: ₹{totalAmount.toLocaleString()}</p>
            </div>
          </div>

          {/* Payment Apps */}
          <div className="bg-card rounded-3xl p-6 md:p-8 mb-6 border border-border shadow-lg">
            <h3 className="text-xl font-bold mb-6 text-center">Pay with UPI Apps</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {paymentApps.map((app, index) => (
                <button
                  key={index}
                  onClick={() => handleAppClick(app)}
                  className={`${app.color} text-white rounded-2xl p-6 hover:scale-105 active:scale-95 transition-all shadow-lg hover:shadow-xl flex flex-col items-center justify-center gap-3 border-2 border-white/20`}
                >
                  <div className="text-5xl md:text-6xl">{app.icon}</div>
                  <div className="font-bold text-base md:text-lg">{app.name}</div>
                </button>
              ))}
            </div>
            <p className="text-center text-xs text-muted-foreground mt-4">
              Click on any app to open and pay
            </p>
          </div>

          {/* Payment Instructions */}
          <div className="bg-info/10 border border-info/30 rounded-2xl p-6 mb-6">
            <h4 className="font-bold text-info mb-3 flex items-center gap-2">
              <span>ℹ️</span> Payment Instructions
            </h4>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li className="flex items-start gap-2">
                <span className="text-primary">•</span>
                <span>Scan the QR code with any UPI app or click on your preferred payment app</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-primary">•</span>
                <span>Enter the amount: ₹{totalAmount.toLocaleString()}</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-primary">•</span>
                <span>Complete the payment in your UPI app</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-primary">•</span>
                <span>Click "I've Paid" button after successful payment</span>
              </li>
            </ul>
          </div>

          {/* Payment Complete Button */}
          <div className="space-y-4">
            <Button
              onClick={handlePaymentComplete}
              className="w-full bg-success hover:bg-success/90 text-success-foreground h-14 text-lg rounded-xl font-bold shadow-lg"
              disabled={processing}
            >
              {processing ? (
                <div className="flex items-center gap-2">
                  <div className="w-5 h-5 border-2 border-current/30 border-t-current rounded-full animate-spin" />
                  Processing...
                </div>
              ) : (
                <>
                  <CheckCircle className="w-5 h-5 mr-2" />
                  I've Paid - Complete Payment
                </>
              )}
            </Button>

            <Button
              variant="outline"
              onClick={() => navigate('/home')}
              className="w-full rounded-xl"
              disabled={processing}
            >
              Cancel
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Payment;

