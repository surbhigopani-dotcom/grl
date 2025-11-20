import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import axios from 'axios';
import { toast } from 'react-toastify';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { LogOut, FileText, History, Menu, X } from 'lucide-react';
import { Loader } from '../components/ui/Loader';

const Home = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout, fetchUser } = useAuth();
  const [loanAmount, setLoanAmount] = useState('');
  const [currentLoan, setCurrentLoan] = useState(null);
  const [depositAmount, setDepositAmount] = useState(149);
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [validating, setValidating] = useState(false);
  const [validationTime, setValidationTime] = useState(60);
  const [userLoans, setUserLoans] = useState([]);
  const [offeredAmount, setOfferedAmount] = useState(null);
  const [hasLoans, setHasLoans] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    const initializeData = async () => {
      // Ensure token is set before making any API calls
      const token = localStorage.getItem('token');
      if (token && !axios.defaults.headers.common['Authorization']) {
        axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      }
      
      try {
        await Promise.all([
          fetchAdminConfig(),
          fetchUserLoans()
        ]);
        
        // Check if coming from profile setup with validation state
        if (location.state?.validating && location.state?.loanId) {
          setValidating(true);
          setValidationTime(60);
          // Fetch the loan to set as current
          await fetchLoanById(location.state.loanId);
        }
      } catch (error) {
        console.error('Error initializing data:', error);
      } finally {
        setInitialLoading(false);
      }
    };

    initializeData();
  }, []);

  useEffect(() => {
    let interval = null;
    if (validating && validationTime > 0) {
      interval = setInterval(() => {
        setValidationTime((time) => {
          if (time <= 1) {
            setValidating(false);
            checkLoanStatus();
            return 0;
          }
          return time - 1;
        });
      }, 1000);
    } else if (validationTime === 0) {
      checkLoanStatus();
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [validating, validationTime]);

  const fetchLoanById = async (loanId) => {
    try {
      const response = await axios.get(`/loans/${loanId}`);
      setCurrentLoan(response.data.loan);
      setHasLoans(true);
    } catch (error) {
      console.error('Error fetching loan:', error);
    }
  };

  const fetchUserLoans = async () => {
    try {
      // Check if token exists before making request
      const token = localStorage.getItem('token');
      if (!token) {
        console.warn('No token found, redirecting to login');
        navigate('/login');
        return;
      }
      
      // Ensure token is set in axios headers
      if (!axios.defaults.headers.common['Authorization']) {
        axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      }
      
      const response = await axios.get('/loans');
      const loans = response.data.loans || [];
      setUserLoans(loans);
      setHasLoans(loans.length > 0);
      
      if (loans.length > 0) {
        // Get the most recent loan
        const sortedLoans = loans.sort((a, b) => new Date(b.appliedAt) - new Date(a.appliedAt));
        setCurrentLoan(sortedLoans[0]);
      } else {
        generateLoanOffer();
      }
    } catch (error) {
      console.error('Error fetching loans:', error);
      // Only show error if it's not a token issue (to avoid duplicate toasts)
      if (error.response?.status === 401) {
        // Token expired or invalid - will be handled by AuthContext
        console.log('Unauthorized - token may be invalid');
      } else {
        // Other errors - generate offer anyway
        generateLoanOffer();
      }
    } finally {
      setInitialLoading(false);
    }
  };

  const generateLoanOffer = () => {
    const minAmount = 10000;
    const maxAmount = 500000;
    const randomAmount = Math.floor(Math.random() * (maxAmount - minAmount + 1)) + minAmount;
    const roundedAmount = Math.round(randomAmount / 1000) * 1000;
    setOfferedAmount(roundedAmount);
  };

  const fetchAdminConfig = async () => {
    try {
      // Check if token exists before making request
      const token = localStorage.getItem('token');
      if (!token) {
        return; // Silently fail if no token
      }
      
      // Ensure token is set in axios headers
      if (!axios.defaults.headers.common['Authorization']) {
        axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      }
      
      const response = await axios.get('/admin/config');
      setDepositAmount(response.data.config.depositAmount);
    } catch (error) {
      console.error('Error fetching config:', error);
      // Don't show error toast for config fetch failures
    }
  };

  const checkLoanStatus = async () => {
    if (!currentLoan) return;
    
    // Ensure token is set before making request
    const token = localStorage.getItem('token');
    if (!token) {
      return; // Silently fail if no token
    }
    if (!axios.defaults.headers.common['Authorization']) {
      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
    }
    
    try {
      const response = await axios.get(`/loans/${currentLoan.id || currentLoan._id}/status`, {
        skipErrorToast: true // Don't show duplicate error toasts
      });
      const loan = response.data.loan;
      setCurrentLoan(loan);
      setValidating(false); // Stop validation loader
      setValidationTime(0); // Reset timer
      await fetchUser(); // Refresh user data
      if (loan.status === 'approved') {
        toast.success('🎉 Loan approved! You can now proceed with payment.');
      }
    } catch (error) {
      console.error('Error checking loan status:', error);
      // Don't show error toast - handled by interceptor
    }
  };

  const handleAcceptOffer = async () => {
    if (!offeredAmount) return;
    
    // Ensure token is set before making request
    const token = localStorage.getItem('token');
    if (!token) {
      toast.error('Please login again');
      navigate('/login');
      return;
    }
    if (!axios.defaults.headers.common['Authorization']) {
      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
    }
    
    setLoading(true);
    try {
      const response = await axios.post('/loans/apply', {
        requestedAmount: offeredAmount
      });
      const loan = response.data.loan;
      setCurrentLoan(loan);
      setOfferedAmount(null);
      setHasLoans(true);
      await fetchUser();
      toast.success('Loan offer accepted! Application submitted.');
    } catch (error) {
      if (error.response?.status === 401) {
        toast.error('Session expired. Please login again.');
        navigate('/login');
      } else {
        toast.error(error.response?.data?.message || 'Failed to accept loan offer');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleApplyLoan = async (e) => {
    e.preventDefault();
    if (!loanAmount || loanAmount <= 0) {
      toast.error('Please enter a valid loan amount');
      return;
    }

    // Ensure token is set before making request
    const token = localStorage.getItem('token');
    if (!token) {
      toast.error('Please login again');
      navigate('/login');
      return;
    }
    if (!axios.defaults.headers.common['Authorization']) {
      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
    }

    setLoading(true);
    try {
      const response = await axios.post('/loans/apply', {
        requestedAmount: parseFloat(loanAmount)
      });
      const loan = response.data.loan;
      setCurrentLoan(loan);
      setHasLoans(true);
      await fetchUser();
      toast.success('Loan application submitted!');
    } catch (error) {
      if (error.response?.status === 401) {
        toast.error('Session expired. Please login again.');
        navigate('/login');
      } else {
        toast.error(error.response?.data?.message || 'Failed to apply for loan');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleValidate = async () => {
    if (!currentLoan) return;
    
    // Ensure token is set before making request
    const token = localStorage.getItem('token');
    if (!token) {
      toast.error('Please login again');
      navigate('/login');
      return;
    }
    if (!axios.defaults.headers.common['Authorization']) {
      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
    }
    
    setLoading(true);
    try {
      await axios.post(`/loans/${currentLoan.id}/validate`);
      setValidating(true);
      setValidationTime(60);
      toast.info('Validation started. Please wait 1 minute...');
    } catch (error) {
      if (error.response?.status === 401) {
        toast.error('Session expired. Please login again.');
        navigate('/login');
      } else {
        toast.error(error.response?.data?.message || 'Failed to start validation');
      }
    } finally {
      setLoading(false);
    }
  };

  const handlePayment = async () => {
    if (!currentLoan) return;
    
    // Ensure token is set before making request
    const token = localStorage.getItem('token');
    if (!token) {
      toast.error('Please login again');
      navigate('/login');
      return;
    }
    if (!axios.defaults.headers.common['Authorization']) {
      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
    }
    
    setLoading(true);
    try {
      const loanId = currentLoan.id || currentLoan._id;
      const response = await axios.post(`/loans/${loanId}/payment`);
      toast.success('✅ Payment successful! Your loan is now processing.');
      setCurrentLoan(response.data.loan);
      await fetchUser();
      // Refresh loans to get updated status
      await fetchUserLoans();
      // Don't navigate away, stay on home to show updated status
    } catch (error) {
      if (error.response?.status === 401) {
        toast.error('Session expired. Please login again.');
        navigate('/login');
      } else {
        toast.error(error.response?.data?.message || 'Payment failed');
      }
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status) => {
    const colors = {
      pending: 'bg-warning text-warning-foreground',
      validating: 'bg-info text-info-foreground',
      approved: 'bg-success text-success-foreground',
      payment_pending: 'bg-pending text-pending-foreground',
      payment_validation: 'bg-warning text-warning-foreground',
      processing: 'bg-processing text-processing-foreground',
      completed: 'bg-success text-success-foreground',
      rejected: 'bg-error text-error-foreground'
    };
    return colors[status] || 'bg-muted text-muted-foreground';
  };

  const getStatusText = (status) => {
    const texts = {
      pending: 'Pending',
      validating: 'Validating',
      approved: 'Approved',
      payment_pending: 'Payment Pending',
      payment_validation: 'Under Review',
      processing: 'Processing',
      completed: 'Completed',
      rejected: 'Rejected'
    };
    return texts[status] || status;
  };

  const userInfo = {
    phone: user?.phone || 'N/A',
    email: user?.email || 'N/A',
    address: user?.address || 'N/A',
    city: user?.city || 'N/A',
    state: user?.state || 'N/A',
    pincode: user?.pincode || 'N/A',
    totalApplications: user?.totalLoansApplied || 0,
    approvedLoans: user?.totalLoansApproved || 0
  };

  // Show initial loading
  if (initialLoading) {
    return <Loader fullScreen text="Loading your dashboard..." size="lg" />;
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Navigation */}
      <nav className="bg-card border-b border-border sticky top-0 z-50 shadow-sm backdrop-blur-sm">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="text-xl md:text-2xl font-bold text-gradient">GrowLoan</div>
            
            {/* Desktop Menu */}
            <div className="hidden md:flex gap-3 items-center">
              <Button
                variant="outline"
                onClick={() => navigate("/applications")}
                className="rounded-xl hover:bg-primary/10 transition-colors"
              >
                <FileText className="w-4 h-4 mr-2" />
                My Applications
              </Button>
              <Button
                variant="outline"
                onClick={() => navigate("/transactions")}
                className="rounded-xl hover:bg-primary/10 transition-colors"
              >
                <History className="w-4 h-4 mr-2" />
                Transactions
              </Button>
              <div className="flex items-center gap-2 px-4 py-2 bg-primary/10 rounded-xl border border-primary/20">
                <span className="text-lg">👤</span>
                <span className="font-semibold text-foreground hidden lg:inline">{user?.name || 'User'}</span>
              </div>
              <Button
                variant="destructive"
                onClick={logout}
                className="rounded-xl"
              >
                <LogOut className="w-4 h-4 mr-2" />
                <span className="hidden lg:inline">Logout</span>
              </Button>
            </div>

            {/* Mobile Menu Button */}
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

          {/* Mobile Menu */}
          {mobileMenuOpen && (
            <div className="md:hidden mt-4 pb-4 border-t border-border pt-4 space-y-2">
              <Button
                variant="outline"
                onClick={() => {
                  navigate("/applications");
                  setMobileMenuOpen(false);
                }}
                className="w-full rounded-xl justify-start"
              >
                <FileText className="w-4 h-4 mr-2" />
                My Applications
              </Button>
              <Button
                variant="outline"
                onClick={() => {
                  navigate("/transactions");
                  setMobileMenuOpen(false);
                }}
                className="w-full rounded-xl justify-start"
              >
                <History className="w-4 h-4 mr-2" />
                Transactions
              </Button>
              <div className="flex items-center gap-2 px-4 py-3 bg-primary/10 rounded-xl border border-primary/20">
                <span className="text-lg">👤</span>
                <span className="font-semibold text-foreground">{user?.name || 'User'}</span>
              </div>
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

      <div className="container mx-auto px-3 md:px-4 py-4 md:py-8">
        {/* Payment Pending Reminder Banner */}
        {currentLoan && 
         ((currentLoan.status === 'approved' && currentLoan.paymentStatus === 'pending' && !currentLoan.depositPaid) ||
          (currentLoan.status === 'approved' && currentLoan.paymentStatus === 'failed')) && (
          <div className="bg-warning/20 border-2 border-warning rounded-2xl p-4 md:p-6 mb-4 md:mb-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-3 md:gap-4">
            <div className="flex items-center gap-3 flex-1">
              <div className="text-3xl md:text-4xl">⚠️</div>
              <div className="flex-1">
                <h3 className="text-base md:text-lg font-bold text-warning-foreground mb-1">Payment Pending</h3>
                <p className="text-xs md:text-sm text-muted-foreground">
                  Your loan has been approved! Please complete the payment to proceed.
                </p>
              </div>
            </div>
            <Button
              onClick={() => {
                if (currentLoan) {
                  navigate('/payment', { state: { loanId: currentLoan.id || currentLoan._id } });
                }
              }}
              className="bg-warning text-warning-foreground hover:bg-warning/90 rounded-xl w-full md:w-auto whitespace-nowrap"
            >
              Pay Now
            </Button>
          </div>
        )}

        {/* Welcome Section */}
        <div className="gradient-hero rounded-2xl md:rounded-3xl p-6 md:p-12 text-white text-center mb-4 md:mb-8 shadow-xl md:shadow-2xl relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent animate-shimmer"></div>
          <div className="relative z-10">
            <h1 className="text-2xl md:text-5xl font-bold mb-2 md:mb-4 drop-shadow-lg">
              Welcome back, {user?.name || 'User'}! 👋
            </h1>
            <p className="text-sm md:text-xl text-white/95">
              Manage your loans and track your applications
            </p>
          </div>
        </div>

        {/* Mobile: Loan section first, then user info */}
        {/* Desktop: Loan and user info side by side */}
        <div className="flex flex-col-reverse lg:grid lg:grid-cols-2 gap-4 md:gap-8">
          {/* Loan Application Section - Shows first on mobile */}
          <div className="space-y-4 md:space-y-6 order-1 lg:order-2">
            {!currentLoan && !hasLoans && offeredAmount && (
              <div className="bg-gradient-to-br from-pink-500 via-rose-500 to-red-500 rounded-2xl md:rounded-3xl p-5 md:p-8 text-white shadow-xl md:shadow-2xl relative overflow-hidden">
                <div className="absolute top-0 right-0 w-24 h-24 md:w-32 md:h-32 bg-white/10 rounded-full -mr-12 -mt-12 md:-mr-16 md:-mt-16"></div>
                <div className="absolute bottom-0 left-0 w-16 h-16 md:w-24 md:h-24 bg-white/10 rounded-full -ml-8 -mb-8 md:-ml-12 md:-mb-12"></div>
                <div className="relative z-10">
                  <div className="flex items-center justify-between mb-4 md:mb-6">
                    <h3 className="text-xl md:text-3xl font-bold">🎉 Special Loan Offer!</h3>
                    <div className="bg-white/20 backdrop-blur-sm px-2 md:px-4 py-1 md:py-2 rounded-full text-xs md:text-sm font-bold border border-white/30">Exclusive</div>
                  </div>
                  <div className="text-center mb-5 md:mb-8">
                    <div className="text-4xl md:text-6xl font-bold mb-2 md:mb-3 drop-shadow-lg">₹{offeredAmount.toLocaleString()}</div>
                    <p className="text-sm md:text-lg text-white/95">Accept this offer to start your loan application</p>
                  </div>
                  <div className="space-y-2 md:space-y-3">
                    <Button
                      onClick={handleAcceptOffer} 
                      className="w-full bg-white text-pink-600 hover:bg-white/90 h-12 md:h-14 text-base md:text-lg rounded-xl font-bold shadow-lg hover:shadow-xl transition-all"
                      disabled={loading}
                    >
                      {loading ? 'Processing...' : '✅ Accept This Offer'}
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => setOfferedAmount(null)} 
                      className="w-full border-2 border-white/50 text-white hover:bg-white/20 h-12 md:h-14 text-base md:text-lg rounded-xl font-semibold backdrop-blur-sm"
                      disabled={loading}
                    >
                      Apply for Different Amount
                    </Button>
                  </div>
                </div>
              </div>
            )}

        {!currentLoan && (!offeredAmount || hasLoans) && (
              <div className="bg-card rounded-2xl md:rounded-3xl p-5 md:p-8 border border-border shadow-lg">
                <h2 className="text-xl md:text-2xl font-bold mb-4 md:mb-6 text-gradient">Apply for Loan</h2>
                <form onSubmit={handleApplyLoan} className="space-y-3 md:space-y-4">
                  <div>
                    <label className="block text-sm font-medium mb-2">Loan Amount (₹)</label>
                    <Input
                      type="number"
                      value={loanAmount}
                      onChange={(e) => setLoanAmount(e.target.value)}
                      placeholder="Enter amount (₹10,000 - ₹5,00,000)"
                      className="h-12 md:h-14 text-base md:text-lg rounded-xl"
                    />
                  </div>
                  <Button
                    type="submit"
                    className="w-full gradient-primary text-primary-foreground h-12 md:h-14 text-base md:text-lg rounded-xl font-semibold"
                    disabled={loading}
                  >
                    {loading ? 'Applying...' : 'Apply for Loan'}
                  </Button>
                </form>
              </div>
        )}

            {currentLoan && (
              <div id="loan-status-section" className="bg-card rounded-2xl md:rounded-3xl p-5 md:p-8 border border-border shadow-lg">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 md:gap-0 mb-4 md:mb-6">
                  <h2 className="text-xl md:text-2xl font-bold text-gradient">Loan Application Status</h2>
                  <div className={`px-3 md:px-4 py-1.5 md:py-2 rounded-full text-xs md:text-sm font-bold shadow-md ${
                    currentLoan.status === 'payment_validation'
                      ? 'bg-warning text-warning-foreground animate-pulse'
                      : currentLoan.status === 'approved' && currentLoan.paymentStatus === 'pending' && !currentLoan.depositPaid
                      ? 'bg-warning text-warning-foreground'
                      : getStatusColor(currentLoan.status)
                  }`}>
                    {currentLoan.status === 'payment_validation'
                      ? 'UNDER REVIEW'
                      : currentLoan.status === 'approved' && currentLoan.paymentStatus === 'pending' && !currentLoan.depositPaid
                      ? 'PAYMENT PENDING'
                      : getStatusText(currentLoan.status).toUpperCase()}
                  </div>
                </div>
            
                <div className="space-y-3 md:space-y-4 mb-4 md:mb-6">
                  <div className="flex justify-between items-center py-2">
                    <span className="text-sm md:text-base text-muted-foreground">Loan ID:</span>
                    <span className="font-bold text-sm md:text-base">GL-{currentLoan.loanId || currentLoan._id?.slice(-8)}</span>
                  </div>
                  <div className="flex justify-between items-center py-2">
                    <span className="text-sm md:text-base text-muted-foreground">Requested Amount:</span>
                    <span className="font-bold text-sm md:text-base text-accent">₹{currentLoan.requestedAmount?.toLocaleString()}</span>
                  </div>
                  {currentLoan.approvedAmount > 0 && (
                    <div className="flex justify-between items-center py-2">
                      <span className="text-sm md:text-base text-muted-foreground">Approved Amount:</span>
                      <span className="font-bold text-sm md:text-base text-success">₹{currentLoan.approvedAmount?.toLocaleString()}</span>
                    </div>
                  )}
                </div>

                {currentLoan.status === 'pending' && !validating && (
                  <Button
                    onClick={handleValidate}
                    className="w-full gradient-primary text-primary-foreground h-12 md:h-14 text-base md:text-lg rounded-xl font-semibold"
                    disabled={loading}
                  >
                    Start Validation (1 min)
                  </Button>
              )}

                {(validating || currentLoan.status === 'validating') && (
                  <div className="text-center py-8 md:py-12">
                    <div className="relative mx-auto mb-4 md:mb-6 w-16 h-16 md:w-20 md:h-20">
                      {/* Main Spinner */}
                      <div className="absolute inset-0 w-16 h-16 md:w-20 md:h-20 border-4 border-primary border-t-transparent rounded-full animate-spin" />
                      {/* Pulsing Ring */}
                      <div className="absolute inset-0 w-16 h-16 md:w-20 md:h-20 border-4 border-primary/30 rounded-full animate-ping" />
                      {/* Inner Glow */}
                      <div className="absolute inset-2 w-12 h-12 md:w-16 md:h-16 bg-primary/10 rounded-full animate-pulse" />
                    </div>
                    <div className="space-y-2 md:space-y-3">
                      <p className="text-lg md:text-xl font-bold text-gradient">Validating your documents...</p>
                      <p className="text-xs md:text-sm text-muted-foreground">Please wait while we verify your information</p>
                      {validationTime > 0 && (
                        <div className="flex items-center justify-center gap-2">
                          <div className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                          <p className="text-base font-semibold text-primary">Time remaining: {validationTime}s</p>
                          <div className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                        </div>
                      )}
                      {validationTime === 0 && (
                        <div className="flex items-center justify-center gap-2">
                          <div className="w-2 h-2 bg-primary rounded-full animate-pulse" />
                          <p className="text-base font-semibold text-primary">Checking approval status...</p>
                          <div className="w-2 h-2 bg-primary rounded-full animate-pulse" style={{ animationDelay: '300ms' }} />
                        </div>
                      )}
                    </div>
                </div>
              )}

              {/* Show payment section for approved loans or failed payments */}
              {!validating && currentLoan.status !== 'validating' && 
               ((currentLoan.status === 'approved' && currentLoan.paymentStatus === 'pending' && !currentLoan.depositPaid) ||
                (currentLoan.status === 'approved' && currentLoan.paymentStatus === 'failed')) && (
                  <div className="space-y-6">
                    {currentLoan.paymentStatus === 'failed' ? (
                      <div className="bg-error/10 border border-error rounded-2xl p-6">
                        <h3 className="text-lg font-bold text-error mb-4">⚠️ Payment Failed</h3>
                        <p className="text-sm text-muted-foreground mb-4">
                          Your previous payment was not verified. Please try again.
                        </p>
                        {currentLoan.remarks && (
                          <p className="text-sm text-muted-foreground mb-2">
                            <strong>Reason:</strong> {currentLoan.remarks}
                          </p>
                        )}
                      </div>
                    ) : (
                      <div className="bg-success/10 border border-success rounded-2xl p-6">
                        <h3 className="text-lg font-bold text-success mb-4">🎉 Loan Approved!</h3>
                      </div>
                    )}
                    {currentLoan.status === 'payment_validation' && (
                      <div className="bg-warning/20 border-2 border-warning rounded-2xl p-6 animate-pulse">
                        <div className="flex items-center gap-3 mb-3">
                          <div className="w-12 h-12 bg-warning/30 rounded-full flex items-center justify-center">
                            <Clock className="w-6 h-6 text-warning" />
                          </div>
                          <div>
                            <h3 className="text-lg font-bold text-warning mb-1">Transaction Under Review</h3>
                            <p className="text-sm text-muted-foreground">
                              Your payment is being verified by our team. Please wait for confirmation.
                            </p>
                          </div>
                        </div>
                        <div className="bg-warning/10 rounded-xl p-4 mt-4">
                          <p className="text-sm font-medium text-warning-foreground">
                            ⚠️ Transaction is under review. We will notify you once the verification is complete.
                          </p>
                        </div>
                      </div>
                    )}
                    {currentLoan.status !== 'payment_validation' && (
                      <>
                        <div className="bg-card rounded-xl md:rounded-2xl p-4 md:p-6 border border-border space-y-2 text-xs md:text-sm">
                          <div className="flex justify-between py-1">
                            <span className="text-muted-foreground">File Processing Charge:</span>
                            <span className="font-bold">₹{currentLoan.fileCharge || 99}</span>
                          </div>
                          <div className="flex justify-between py-1">
                            <span className="text-muted-foreground">Platform Service Fee:</span>
                            <span className="font-bold">₹{currentLoan.platformFee || 50}</span>
                          </div>
                          <div className="flex justify-between py-1">
                            <span className="text-muted-foreground">Deposit Amount:</span>
                            <span className="font-bold">₹{currentLoan.depositAmount || depositAmount}</span>
                          </div>
                          <div className="h-px bg-border my-2 md:my-3" />
                          <div className="flex justify-between text-base md:text-lg pt-1">
                            <span className="font-bold">Total Payment:</span>
                            <span className="font-bold text-accent">₹{currentLoan.totalPaymentAmount || (currentLoan.fileCharge || 99) + (currentLoan.platformFee || 50) + (currentLoan.depositAmount || depositAmount)}</span>
                          </div>
                        </div>
                        <Button
                          onClick={() => navigate('/payment', { state: { loanId: currentLoan.id || currentLoan._id } })}
                          className={`w-full h-12 md:h-14 text-base md:text-lg rounded-xl font-bold shadow-lg ${
                            currentLoan.paymentStatus === 'failed'
                              ? 'bg-error hover:bg-error/90 text-error-foreground'
                              : 'bg-success hover:bg-success/90 text-success-foreground'
                          }`}
                        >
                          {currentLoan.paymentStatus === 'failed' ? '🔄 Retry Payment' : '💳 Pay Now'} - ₹{currentLoan.totalPaymentAmount || (currentLoan.fileCharge || 99) + (currentLoan.platformFee || 50) + (currentLoan.depositAmount || depositAmount)}
                        </Button>
                      </>
                    )}
                  </div>
                )}

                {currentLoan.depositPaid && currentLoan.paymentStatus === 'success' && (
                  <div className="bg-success/10 border border-success rounded-xl md:rounded-2xl p-4 md:p-6">
                    <h3 className="text-base md:text-lg font-bold text-success mb-2">✅ Payment Completed!</h3>
                    <p className="text-xs md:text-sm text-muted-foreground mb-3 md:mb-4">
                      Your payment has been processed successfully. Your loan is now being processed.
                    </p>
                    {currentLoan.paymentId && (
                      <div className="text-xs md:text-sm mb-3 md:mb-4">
                        <span className="text-muted-foreground">Transaction ID: </span>
                        <span className="font-medium break-all">{currentLoan.paymentId}</span>
                      </div>
                    )}
                    <Button
                      onClick={() => navigate("/transactions")}
                      variant="outline"
                      className="w-full md:w-auto rounded-xl text-sm md:text-base h-10 md:h-12"
                    >
                      View Transaction History
                    </Button>
                  </div>
                )}

                {currentLoan.status === 'processing' && (
                  <div className="bg-processing/10 border border-processing rounded-xl md:rounded-2xl p-4 md:p-6 text-center">
                    <h3 className="text-base md:text-lg font-bold text-processing mb-2">Processing Your Loan</h3>
                    <p className="text-xs md:text-sm text-muted-foreground mb-3 md:mb-4">
                      Your loan will be disbursed within 15 days
                    </p>
                    <Button
                      onClick={() => navigate("/applications")}
                      variant="outline"
                      className="rounded-xl w-full md:w-auto text-sm md:text-base h-10 md:h-12"
                    >
                      View Applications
                    </Button>
                  </div>
                )}
                </div>
              )}

          </div>

          {/* Your Information - Simplified Card - Shows last on mobile */}
          <div className="bg-card rounded-2xl md:rounded-3xl p-5 md:p-8 border border-border shadow-lg order-2 lg:order-1">
            <h2 className="text-lg md:text-2xl font-bold mb-4 md:mb-6 text-gradient">Your Profile</h2>
            
            {/* Simplified User Info - Only Name, Phone, Email */}
            <div className="space-y-3 md:space-y-4 mb-4 md:mb-6">
              <div className="bg-gradient-to-r from-primary/5 to-primary/10 rounded-xl p-3 md:p-4 border border-primary/20">
                <div className="text-xs uppercase tracking-wide text-muted-foreground mb-1 font-semibold">Name</div>
                <div className="text-base md:text-lg font-bold text-foreground">{user?.name || 'N/A'}</div>
              </div>
              <div className="bg-gradient-to-r from-primary/5 to-primary/10 rounded-xl p-3 md:p-4 border border-primary/20">
                <div className="text-xs uppercase tracking-wide text-muted-foreground mb-1 font-semibold">Phone</div>
                <div className="text-base md:text-lg font-bold text-foreground">{user?.phone || 'N/A'}</div>
              </div>
              <div className="bg-gradient-to-r from-primary/5 to-primary/10 rounded-xl p-3 md:p-4 border border-primary/20">
                <div className="text-xs uppercase tracking-wide text-muted-foreground mb-1 font-semibold">Email</div>
                <div className="text-base md:text-lg font-bold text-foreground break-all">{user?.email || 'N/A'}</div>
              </div>
            </div>
            
            {/* Stats */}
            <div className="grid grid-cols-2 gap-3 md:gap-4 pt-3 md:pt-4 border-t border-border">
              <div className="bg-gradient-to-br from-primary/10 to-primary/5 rounded-xl p-3 md:p-4 border border-primary/20">
                <div className="text-xs uppercase tracking-wide text-muted-foreground mb-1 font-semibold">Applications</div>
                <div className="text-xl md:text-2xl font-bold text-primary">{userInfo.totalApplications}</div>
              </div>
              <div className="bg-gradient-to-br from-success/10 to-success/5 rounded-xl p-3 md:p-4 border border-success/20">
                <div className="text-xs uppercase tracking-wide text-muted-foreground mb-1 font-semibold">Approved</div>
                <div className="text-xl md:text-2xl font-bold text-success">{userInfo.approvedLoans}</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Home;
