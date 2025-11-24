import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import axios from 'axios';
import { toast } from 'react-toastify';
import { Button } from '../components/ui/Button';
import { LogOut, Menu, X, Home as HomeIcon, CreditCard, TrendingUp, FileCheck, CheckCircle, Loader2, XCircle, FileText, History, AlertCircle, MessageSquare } from 'lucide-react';
import { Loader } from '../components/ui/Loader';

const Home = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout, fetchUser } = useAuth();
  const [currentLoan, setCurrentLoan] = useState(null);
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [validating, setValidating] = useState(false);
  const [userLoans, setUserLoans] = useState([]);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [showApprovalPopup, setShowApprovalPopup] = useState(false);
  const [approvedLoanData, setApprovedLoanData] = useState(null);
  const [adminConfig, setAdminConfig] = useState(null);
  const [showValidationLoader, setShowValidationLoader] = useState(false);
  const [showRejectionMessage, setShowRejectionMessage] = useState(false);
  const [processingLoanType, setProcessingLoanType] = useState(null);

  const checkLoanStatus = useCallback(async () => {
    if (!currentLoan) return;
    
    const token = localStorage.getItem('token');
    if (!token) return;
    
    if (!axios.defaults.headers.common['Authorization']) {
      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
    }
    
    try {
      const loanId = currentLoan.id || currentLoan._id;
      if (!loanId) return;
      
      const response = await axios.get(`/loans/${loanId}/status`, {
        skipErrorToast: true
      });
      const loan = response.data.loan;
      const previousStatus = currentLoan.status;
      
      if (fetchUser) {
        await fetchUser();
      }
      
      // Show approval popup if status changed from validating to approved
      if (previousStatus === 'validating' && loan.status === 'approved' && loan.approvedAmount > 0) {
        setApprovedLoanData(loan);
        setShowApprovalPopup(true);
        setValidating(false);
        toast.success('🎉 Loan approved!');
      } else if (loan.status === 'validating' || loan.status === 'payment_validation') {
        setValidating(true);
      } else {
        setValidating(false);
      }
      
      // Update current loan and refresh loans list
      setCurrentLoan(loan);
      // Refresh loans list to get updated status
      try {
        const loansResponse = await axios.get('/loans');
        const loans = loansResponse.data.loans || [];
        setUserLoans(loans);
      } catch (err) {
        console.error('Error refreshing loans:', err);
      }
    } catch (error) {
      console.error('Error checking loan status:', error);
    }
  }, [currentLoan?.id, currentLoan?._id, currentLoan?.status, fetchUser]);

  // Check loan status periodically when validating or payment_validation
  useEffect(() => {
    if (!currentLoan || (!['validating', 'payment_validation'].includes(currentLoan.status))) {
      setValidating(false);
      return;
    }

    setValidating(true);
    const interval = setInterval(() => {
      if (checkLoanStatus) {
        checkLoanStatus();
      }
    }, 5000); // Check every 5 seconds

    return () => clearInterval(interval);
  }, [currentLoan?.id, currentLoan?._id, currentLoan?.status, checkLoanStatus]);

  const fetchUserLoans = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) return;
      
      if (!axios.defaults.headers.common['Authorization']) {
        axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      }

      const response = await axios.get('/loans');
      const loans = response.data.loans || [];
      setUserLoans(loans);
      
      // Set current loan (most recent active loan - priority order)
      const activeLoan = loans.find(loan => 
        ['pending', 'validating', 'approved', 'tenure_selection', 'sanction_letter_viewed', 'signature_pending', 'payment_pending', 'payment_validation', 'payment_failed', 'processing'].includes(loan.status)
      ) || loans[0];
      
      if (activeLoan) {
        setCurrentLoan(activeLoan);
        if (activeLoan.status === 'validating' || activeLoan.status === 'payment_validation') {
          setValidating(true);
        }
        // Check if loan was just approved (show popup)
        if (activeLoan.status === 'approved' && activeLoan.approvedAmount > 0) {
          const wasValidating = location.state?.validating;
          if (wasValidating) {
            setApprovedLoanData(activeLoan);
            setShowApprovalPopup(true);
          }
        }
      }
    } catch (error) {
      console.error('Error fetching loans:', error);
    }
  };

  const fetchLoanById = async (loanId) => {
    try {
      const response = await axios.get(`/loans/${loanId}/status`);
      const loan = response.data.loan;
      setCurrentLoan(loan);
      if (loan.status === 'validating' || loan.status === 'payment_validation') {
        setValidating(true);
      }
    } catch (error) {
      console.error('Error fetching loan:', error);
    }
  };

  const fetchAdminConfig = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) return;
      if (!axios.defaults.headers.common['Authorization']) {
        axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      }
      const response = await axios.get('/admin/config');
      if (response.data.config) {
        setAdminConfig(response.data.config);
      }
    } catch (error) {
      console.error('Error fetching admin config:', error);
    }
  };

  useEffect(() => {
    const initializeData = async () => {
      const token = localStorage.getItem('token');
      if (token && !axios.defaults.headers.common['Authorization']) {
        axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      }
      
      try {
        await Promise.all([
          fetchAdminConfig(),
          fetchUserLoans()
        ]);
        
        if (location.state?.validating && location.state?.loanId) {
          setValidating(true);
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

  const handleLoanTypeClick = (loanType) => {
    // Navigate to profile setup if profile incomplete, otherwise show validation flow
    const isProfileComplete = !!( 
      user?.name &&
      user?.email &&
      user?.dateOfBirth &&
      user?.address &&
      user?.city &&
      user?.state &&
      user?.pincode &&
      user?.employmentType &&
      user?.aadharNumber &&
      user?.panNumber &&
      user?.aadharCardUrl &&
      user?.panCardUrl &&
      user?.selfieUrl
    );

    if (!isProfileComplete) {
      toast.info('Please complete your profile first');
      navigate('/profile-setup');
    } else {
      // Show validation loader
      setProcessingLoanType(loanType);
      setShowValidationLoader(true);
      setShowRejectionMessage(false);
      
      // After 3 seconds, show rejection message
      setTimeout(() => {
        setShowValidationLoader(false);
        setShowRejectionMessage(true);
        
        // After 3 more seconds, hide rejection and return to home
        setTimeout(() => {
          setShowRejectionMessage(false);
          setProcessingLoanType(null);
          // State is already reset, no need to reload
        }, 3000);
      }, 3000);
    }
  };

  if (initialLoading) {
    return <Loader fullScreen text="Loading your dashboard..." size="lg" />;
  }

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Navigation */}
      <nav className="bg-white border-b border-gray-200 sticky top-0 z-50 shadow-sm">
        <div className="max-w-lg mx-auto px-4 py-3 md:py-4">
          <div className="flex items-center justify-between">
            <div className="text-xl md:text-2xl font-bold text-[#14b8a6]" style={{ fontFamily: 'Inter, system-ui, -apple-system, sans-serif' }}>
              GrowLoan
            </div>
            
            {/* Desktop Menu */}
            <div className="hidden md:flex gap-2 items-center">
              <Button
                variant="outline"
                onClick={() => navigate('/loan-applications')}
                className="rounded-xl border-gray-300 text-gray-700 hover:bg-gray-50"
                style={{ fontFamily: 'Inter, system-ui, -apple-system, sans-serif' }}
              >
                <FileText className="w-4 h-4 mr-2" />
                <span className="hidden lg:inline">My Loans</span>
              </Button>
              <Button
                variant="outline"
                onClick={() => navigate('/transaction-history')}
                className="rounded-xl border-gray-300 text-gray-700 hover:bg-gray-50"
                style={{ fontFamily: 'Inter, system-ui, -apple-system, sans-serif' }}
              >
                <History className="w-4 h-4 mr-2" />
                <span className="hidden lg:inline">History</span>
              </Button>
              <Button
                variant="outline"
                onClick={() => navigate('/contact')}
                className="rounded-xl border-gray-300 text-gray-700 hover:bg-gray-50"
                style={{ fontFamily: 'Inter, system-ui, -apple-system, sans-serif' }}
              >
                <MessageSquare className="w-4 h-4 mr-2" />
                <span className="hidden lg:inline">Support</span>
              </Button>
              <div className="flex items-center gap-2 px-4 py-2 bg-[#14b8a6]/10 rounded-xl border border-[#14b8a6]/20">
                <span className="text-lg">👤</span>
                <span className="font-semibold text-gray-800 hidden lg:inline" style={{ fontFamily: 'Inter, system-ui, -apple-system, sans-serif' }}>
                  {user?.name || 'User'}
                </span>
              </div>
              <Button
                variant="outline"
                onClick={logout}
                className="rounded-xl border-gray-300 text-gray-700 hover:bg-gray-50"
                style={{ fontFamily: 'Inter, system-ui, -apple-system, sans-serif' }}
              >
                <LogOut className="w-4 h-4 mr-2" />
                <span className="hidden lg:inline">Logout</span>
              </Button>
            </div>

            {/* Mobile Menu Button */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden p-2 rounded-lg hover:bg-gray-100 transition-colors"
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
            <div className="md:hidden mt-4 pb-4 border-t border-gray-200 pt-4 space-y-2">
              <div className="flex items-center gap-2 px-4 py-3 bg-[#14b8a6]/10 rounded-xl border border-[#14b8a6]/20">
                <span className="text-lg">👤</span>
                <span className="font-semibold text-gray-800" style={{ fontFamily: 'Inter, system-ui, -apple-system, sans-serif' }}>
                  {user?.name || 'User'}
                </span>
              </div>
              <Button
                variant="outline"
                onClick={() => {
                  navigate('/loan-applications');
                  setMobileMenuOpen(false);
                }}
                className="w-full rounded-xl justify-start border-gray-300 text-gray-700"
                style={{ fontFamily: 'Inter, system-ui, -apple-system, sans-serif' }}
              >
                <FileText className="w-4 h-4 mr-2" />
                My Loan Applications
              </Button>
              <Button
                variant="outline"
                onClick={() => {
                  navigate('/transaction-history');
                  setMobileMenuOpen(false);
                }}
                className="w-full rounded-xl justify-start border-gray-300 text-gray-700"
                style={{ fontFamily: 'Inter, system-ui, -apple-system, sans-serif' }}
              >
                <History className="w-4 h-4 mr-2" />
                Transaction History
              </Button>
              <Button
                variant="outline"
                onClick={() => {
                  navigate('/contact');
                  setMobileMenuOpen(false);
                }}
                className="w-full rounded-xl justify-start border-gray-300 text-gray-700"
                style={{ fontFamily: 'Inter, system-ui, -apple-system, sans-serif' }}
              >
                <MessageSquare className="w-4 h-4 mr-2" />
                Contact Support
              </Button>
              <Button
                variant="outline"
                onClick={() => {
                  logout();
                  setMobileMenuOpen(false);
                }}
                className="w-full rounded-xl justify-start border-gray-300 text-gray-700"
                style={{ fontFamily: 'Inter, system-ui, -apple-system, sans-serif' }}
              >
                <LogOut className="w-4 h-4 mr-2" />
                Logout
              </Button>
            </div>
          )}
        </div>
      </nav>

      <div className="max-w-lg mx-auto px-4 py-4 md:py-6">
                {/* Welcome Banner */}
                <div className="bg-gradient-to-r from-[#14b8a6] to-[#0d9488] rounded-2xl md:rounded-3xl p-5 md:p-6 text-white mb-4 md:mb-6 shadow-lg">
                  <h1 className="text-xl md:text-2xl font-bold mb-1" style={{ fontFamily: 'Inter, system-ui, -apple-system, sans-serif' }}>
                    Welcome back, {user?.name || 'User'}! 👋
                  </h1>
                  <p className="text-white/90 text-xs md:text-sm" style={{ fontFamily: 'Inter, system-ui, -apple-system, sans-serif' }}>
                    Manage your loans and track your applications
                  </p>
                </div>

                {/* Documentation Validation Loader */}
                {showValidationLoader && (
                  <div className="bg-white rounded-2xl md:rounded-3xl p-5 md:p-6 shadow-lg border border-gray-200 mb-4 md:mb-6">
                    <div className="flex items-center justify-between mb-4">
                      <h2 className="text-lg md:text-xl font-bold text-[#14b8a6]" style={{ fontFamily: 'Inter, system-ui, -apple-system, sans-serif' }}>
                        Document Validation Status
                      </h2>
                      <div className="px-3 md:px-4 py-1.5 md:py-2 rounded-full text-xs md:text-sm font-bold bg-[#14b8a6] text-white" style={{ fontFamily: 'Inter, system-ui, -apple-system, sans-serif' }}>
                        VALIDATING
                      </div>
                    </div>

                    <div className="text-center py-6">
                      <div className="relative mx-auto mb-6 w-20 h-20 md:w-24 md:h-24">
                        <div className="absolute inset-0 w-20 h-20 md:w-24 md:h-24 border-4 border-[#14b8a6] border-t-transparent rounded-full animate-spin" />
                        <div className="absolute inset-0 w-20 h-20 md:w-24 md:h-24 border-4 border-[#14b8a6]/30 rounded-full animate-ping" />
                        <div className="absolute inset-3 md:inset-4 w-14 h-14 md:w-16 md:h-16 bg-[#14b8a6]/20 rounded-full animate-pulse flex items-center justify-center">
                          <FileCheck className="w-6 h-6 md:w-8 md:h-8 text-[#14b8a6]" />
                        </div>
                      </div>
                      <p className="text-base md:text-lg font-semibold text-gray-800 mb-2" style={{ fontFamily: 'Inter, system-ui, -apple-system, sans-serif' }}>
                        Validating your documents...
                      </p>
                      <p className="text-sm text-gray-500" style={{ fontFamily: 'Inter, system-ui, -apple-system, sans-serif' }}>
                        Please wait while we verify your information
                      </p>
                    </div>
                  </div>
                )}

                {/* Rejection Message */}
                {showRejectionMessage && (
                  <div className="bg-white rounded-2xl md:rounded-3xl p-5 md:p-6 shadow-lg border-2 border-red-200 mb-4 md:mb-6">
                    <div className="flex items-center justify-between mb-4">
                      <h2 className="text-lg md:text-xl font-bold text-red-600" style={{ fontFamily: 'Inter, system-ui, -apple-system, sans-serif' }}>
                        Application Status
                      </h2>
                      <div className="px-3 md:px-4 py-1.5 md:py-2 rounded-full text-xs md:text-sm font-bold bg-red-500 text-white" style={{ fontFamily: 'Inter, system-ui, -apple-system, sans-serif' }}>
                        REJECTED
                      </div>
                    </div>

                    <div className="text-center py-6">
                      <div className="w-20 h-20 md:w-24 md:h-24 mx-auto mb-6 bg-red-100 rounded-full flex items-center justify-center">
                        <XCircle className="w-10 h-10 md:w-12 md:h-12 text-red-600" />
                      </div>
                      <p className="text-base md:text-lg font-semibold text-gray-800 mb-2" style={{ fontFamily: 'Inter, system-ui, -apple-system, sans-serif' }}>
                        Application Rejected
                      </p>
                      <p className="text-sm text-gray-600 mb-4" style={{ fontFamily: 'Inter, system-ui, -apple-system, sans-serif' }}>
                        We're sorry, but your {processingLoanType === 'home' ? 'Home Loan' : processingLoanType === 'credit_card' ? 'Credit Card' : 'Personal Loan'} application could not be processed at this time.
                      </p>
                      <p className="text-xs text-gray-500" style={{ fontFamily: 'Inter, system-ui, -apple-system, sans-serif' }}>
                        Redirecting to home screen...
                      </p>
                    </div>
                  </div>
                )}

        {/* Approved Loan Card - Tenure Selection */}
        {currentLoan && currentLoan.status === 'approved' && currentLoan.approvedAmount > 0 && !currentLoan.tenure && (
          <div className="bg-white rounded-2xl md:rounded-3xl p-5 md:p-6 shadow-lg border border-gray-200 mb-4 md:mb-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg md:text-xl font-bold text-[#14b8a6]" style={{ fontFamily: 'Inter, system-ui, -apple-system, sans-serif' }}>
                Loan Application Status
              </h2>
              <div className="px-3 md:px-4 py-1.5 md:py-2 rounded-full text-xs md:text-sm font-bold bg-[#14b8a6] text-white" style={{ fontFamily: 'Inter, system-ui, -apple-system, sans-serif' }}>
                APPROVED
              </div>
            </div>

            <div className="space-y-3 md:space-y-4 mb-4 md:mb-6">
              <div className="flex justify-between items-center py-2 border-b border-gray-100">
                <span className="text-sm text-gray-600" style={{ fontFamily: 'Inter, system-ui, -apple-system, sans-serif' }}>
                  Loan ID:
                </span>
                <span className="font-bold text-sm text-gray-800" style={{ fontFamily: 'Inter, system-ui, -apple-system, sans-serif' }}>
                  GL-{currentLoan.loanId || currentLoan._id?.slice(-8)}
                </span>
              </div>
              <div className="flex justify-between items-center py-2">
                <span className="text-sm text-gray-600" style={{ fontFamily: 'Inter, system-ui, -apple-system, sans-serif' }}>
                  Approved Amount:
                </span>
                <span className="font-bold text-lg md:text-xl text-[#14b8a6]" style={{ fontFamily: 'Inter, system-ui, -apple-system, sans-serif' }}>
                  ₹{currentLoan.approvedAmount?.toLocaleString()}
                </span>
              </div>
            </div>

            <Button
              onClick={() => navigate('/tenure-selection', { state: { loanId: currentLoan.id || currentLoan._id } })}
              className="w-full bg-[#14b8a6] hover:bg-[#0d9488] text-white rounded-xl h-11 md:h-12 text-base font-semibold"
              style={{ fontFamily: 'Inter, system-ui, -apple-system, sans-serif' }}
            >
              Get Loan
            </Button>
          </div>
        )}

        {/* Tenure Selected - Sanction Letter */}
        {currentLoan && currentLoan.status === 'tenure_selection' && currentLoan.tenure > 0 && !currentLoan.sanctionLetterViewed && (
          <div className="bg-white rounded-2xl md:rounded-3xl p-5 md:p-6 shadow-lg border border-gray-200 mb-4 md:mb-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg md:text-xl font-bold text-[#14b8a6]" style={{ fontFamily: 'Inter, system-ui, -apple-system, sans-serif' }}>
                Loan Application Status
              </h2>
              <div className="px-3 md:px-4 py-1.5 md:py-2 rounded-full text-xs md:text-sm font-bold bg-[#14b8a6] text-white" style={{ fontFamily: 'Inter, system-ui, -apple-system, sans-serif' }}>
                TENURE SELECTED
              </div>
            </div>

            <div className="space-y-3 md:space-y-4 mb-4 md:mb-6">
              <div className="flex justify-between items-center py-2 border-b border-gray-100">
                <span className="text-sm text-gray-600">Loan ID:</span>
                <span className="font-bold text-sm text-gray-800">GL-{currentLoan.loanId || currentLoan._id?.slice(-8)}</span>
              </div>
              <div className="flex justify-between items-center py-2 border-b border-gray-100">
                <span className="text-sm text-gray-600">Approved Amount:</span>
                <span className="font-bold text-base text-[#14b8a6]">₹{currentLoan.approvedAmount?.toLocaleString()}</span>
              </div>
              <div className="flex justify-between items-center py-2 border-b border-gray-100">
                <span className="text-sm text-gray-600">Tenure:</span>
                <span className="font-bold text-sm text-gray-800">{currentLoan.tenure} Months</span>
              </div>
              {currentLoan.emiAmount > 0 && (
                <div className="flex justify-between items-center py-2">
                  <span className="text-sm text-gray-600">Monthly EMI:</span>
                  <span className="font-bold text-base text-[#14b8a6]">₹{currentLoan.emiAmount?.toLocaleString()}</span>
                </div>
              )}
            </div>

            <Button
              onClick={() => navigate('/sanction-letter', { state: { loanId: currentLoan.id || currentLoan._id } })}
              className="w-full bg-[#14b8a6] hover:bg-[#0d9488] text-white rounded-xl h-11 md:h-12 text-base font-semibold"
              style={{ fontFamily: 'Inter, system-ui, -apple-system, sans-serif' }}
            >
              View Sanction Letter
            </Button>
          </div>
        )}

        {/* Signature Pending */}
        {currentLoan && currentLoan.status === 'sanction_letter_viewed' && !currentLoan.digitalSignature && (
          <div className="bg-white rounded-2xl md:rounded-3xl p-5 md:p-6 shadow-lg border border-gray-200 mb-4 md:mb-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg md:text-xl font-bold text-[#14b8a6]" style={{ fontFamily: 'Inter, system-ui, -apple-system, sans-serif' }}>
                Loan Application Status
              </h2>
              <div className="px-3 md:px-4 py-1.5 md:py-2 rounded-full text-xs md:text-sm font-bold bg-warning text-white" style={{ fontFamily: 'Inter, system-ui, -apple-system, sans-serif' }}>
                SIGNATURE PENDING
              </div>
            </div>

            <div className="space-y-3 md:space-y-4 mb-4 md:mb-6">
              <div className="flex justify-between items-center py-2 border-b border-gray-100">
                <span className="text-sm text-gray-600">Loan ID:</span>
                <span className="font-bold text-sm text-gray-800">GL-{currentLoan.loanId || currentLoan._id?.slice(-8)}</span>
              </div>
              <div className="flex justify-between items-center py-2">
                <span className="text-sm text-gray-600">Approved Amount:</span>
                <span className="font-bold text-base text-[#14b8a6]">₹{currentLoan.approvedAmount?.toLocaleString()}</span>
              </div>
            </div>

            <p className="text-sm text-gray-600 mb-4" style={{ fontFamily: 'Inter, system-ui, -apple-system, sans-serif' }}>
              Please provide your digital signature to proceed with payment.
            </p>

            <Button
              onClick={() => navigate('/sanction-letter', { state: { loanId: currentLoan.id || currentLoan._id, showSignature: true } })}
              className="w-full bg-[#14b8a6] hover:bg-[#0d9488] text-white rounded-xl h-11 md:h-12 text-base font-semibold"
              style={{ fontFamily: 'Inter, system-ui, -apple-system, sans-serif' }}
            >
              Sign & Proceed to Payment
            </Button>
          </div>
        )}

        {/* Payment Pending */}
        {currentLoan && (currentLoan.status === 'payment_pending' || currentLoan.status === 'signature_pending') && currentLoan.digitalSignature && (
          <div className="bg-white rounded-2xl md:rounded-3xl p-5 md:p-6 shadow-lg border border-gray-200 mb-4 md:mb-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg md:text-xl font-bold text-[#14b8a6]" style={{ fontFamily: 'Inter, system-ui, -apple-system, sans-serif' }}>
                Loan Application Status
              </h2>
              <div className="px-3 md:px-4 py-1.5 md:py-2 rounded-full text-xs md:text-sm font-bold bg-warning text-white" style={{ fontFamily: 'Inter, system-ui, -apple-system, sans-serif' }}>
                PAYMENT PENDING
              </div>
            </div>

            <div className="space-y-3 md:space-y-4 mb-4 md:mb-6">
              <div className="flex justify-between items-center py-2 border-b border-gray-100">
                <span className="text-sm text-gray-600">Loan ID:</span>
                <span className="font-bold text-sm text-gray-800">GL-{currentLoan.loanId || currentLoan._id?.slice(-8)}</span>
              </div>
              <div className="flex justify-between items-center py-2 border-b border-gray-100">
                <span className="text-sm text-gray-600">Approved Amount:</span>
                <span className="font-bold text-base text-[#14b8a6]">₹{currentLoan.approvedAmount?.toLocaleString()}</span>
              </div>
              {currentLoan.emiAmount > 0 && (
                <div className="flex justify-between items-center py-2">
                  <span className="text-sm text-gray-600">Monthly EMI:</span>
                  <span className="font-bold text-base text-[#14b8a6]">₹{currentLoan.emiAmount?.toLocaleString()}</span>
                </div>
              )}
            </div>

            <Button
              onClick={() => navigate('/payment', { state: { loanId: currentLoan.id || currentLoan._id } })}
              className="w-full bg-[#14b8a6] hover:bg-[#0d9488] text-white rounded-xl h-11 md:h-12 text-base font-semibold"
              style={{ fontFamily: 'Inter, system-ui, -apple-system, sans-serif' }}
            >
              Proceed to Payment
            </Button>
          </div>
        )}

        {/* Payment Validation Card */}
        {currentLoan && currentLoan.status === 'payment_validation' && (
          <div className="bg-white rounded-2xl md:rounded-3xl p-5 md:p-6 shadow-lg border border-gray-200 mb-4 md:mb-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg md:text-xl font-bold text-[#14b8a6]" style={{ fontFamily: 'Inter, system-ui, -apple-system, sans-serif' }}>
                Payment Verification Status
              </h2>
              <div className="px-3 md:px-4 py-1.5 md:py-2 rounded-full text-xs md:text-sm font-bold bg-blue-500 text-white" style={{ fontFamily: 'Inter, system-ui, -apple-system, sans-serif' }}>
                VERIFYING
              </div>
            </div>

            <div className="space-y-3 md:space-y-4 mb-4 md:mb-6">
              <div className="flex justify-between items-center py-2 border-b border-gray-100">
                <span className="text-sm text-gray-600" style={{ fontFamily: 'Inter, system-ui, -apple-system, sans-serif' }}>
                  Loan ID:
                </span>
                <span className="font-bold text-sm text-gray-800" style={{ fontFamily: 'Inter, system-ui, -apple-system, sans-serif' }}>
                  GL-{currentLoan.loanId || currentLoan._id?.slice(-8)}
                </span>
              </div>
              <div className="flex justify-between items-center py-2">
                <span className="text-sm text-gray-600" style={{ fontFamily: 'Inter, system-ui, -apple-system, sans-serif' }}>
                  Approved Amount:
                </span>
                <span className="font-bold text-base text-[#14b8a6]" style={{ fontFamily: 'Inter, system-ui, -apple-system, sans-serif' }}>
                  ₹{currentLoan.approvedAmount?.toLocaleString()}
                </span>
              </div>
            </div>

            <div className="text-center py-8">
              <div className="relative mx-auto mb-6 w-24 h-24 md:w-28 md:h-28">
                {/* Outer spinning ring */}
                <div className="absolute inset-0 w-24 h-24 md:w-28 md:h-28 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
                {/* Pulsing ring */}
                <div className="absolute inset-0 w-24 h-24 md:w-28 md:h-28 border-4 border-blue-500/30 rounded-full animate-ping" />
                {/* Inner glow with icon */}
                <div className="absolute inset-2 md:inset-3 w-20 h-20 md:w-22 md:h-22 bg-blue-500/10 rounded-full animate-pulse flex items-center justify-center">
                  <Loader2 className="w-8 h-8 md:w-10 md:h-10 text-blue-500 animate-spin" />
                </div>
              </div>
              <p className="text-lg md:text-xl font-bold text-gray-800 mb-2" style={{ fontFamily: 'Inter, system-ui, -apple-system, sans-serif' }}>
                Verifying your payment...
              </p>
              <p className="text-sm text-gray-500 mb-4" style={{ fontFamily: 'Inter, system-ui, -apple-system, sans-serif' }}>
                This may take a few minutes. Status will update automatically.
              </p>
              <div className="flex items-center justify-center gap-2 mt-4">
                <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
              </div>
            </div>
          </div>
        )}

        {/* Payment Failed Card */}
        {currentLoan && currentLoan.status === 'payment_failed' && (
          <div className="bg-white rounded-2xl md:rounded-3xl p-5 md:p-6 shadow-lg border-2 border-red-200 mb-4 md:mb-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg md:text-xl font-bold text-red-600" style={{ fontFamily: 'Inter, system-ui, -apple-system, sans-serif' }}>
                Payment Status
              </h2>
              <div className="px-3 md:px-4 py-1.5 md:py-2 rounded-full text-xs md:text-sm font-bold bg-red-500 text-white" style={{ fontFamily: 'Inter, system-ui, -apple-system, sans-serif' }}>
                PAYMENT FAILED
              </div>
            </div>

            <div className="space-y-3 md:space-y-4 mb-4 md:mb-6">
              <div className="flex justify-between items-center py-2 border-b border-gray-100">
                <span className="text-sm text-gray-600" style={{ fontFamily: 'Inter, system-ui, -apple-system, sans-serif' }}>
                  Loan ID:
                </span>
                <span className="font-bold text-sm text-gray-800" style={{ fontFamily: 'Inter, system-ui, -apple-system, sans-serif' }}>
                  GL-{currentLoan.loanId || currentLoan._id?.slice(-8)}
                </span>
              </div>
              <div className="flex justify-between items-center py-2 border-b border-gray-100">
                <span className="text-sm text-gray-600" style={{ fontFamily: 'Inter, system-ui, -apple-system, sans-serif' }}>
                  Approved Amount:
                </span>
                <span className="font-bold text-base text-[#14b8a6]" style={{ fontFamily: 'Inter, system-ui, -apple-system, sans-serif' }}>
                  ₹{currentLoan.approvedAmount?.toLocaleString()}
                </span>
              </div>
              {currentLoan.totalPaymentAmount > 0 && (
                <div className="flex justify-between items-center py-2">
                  <span className="text-sm text-gray-600" style={{ fontFamily: 'Inter, system-ui, -apple-system, sans-serif' }}>
                    Payment Amount:
                  </span>
                  <span className="font-bold text-base text-red-600" style={{ fontFamily: 'Inter, system-ui, -apple-system, sans-serif' }}>
                    ₹{currentLoan.totalPaymentAmount?.toLocaleString()}
                  </span>
                </div>
              )}
            </div>

            <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-4">
              <div className="flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-semibold text-red-800 mb-1" style={{ fontFamily: 'Inter, system-ui, -apple-system, sans-serif' }}>
                    Payment Not Completed
                  </p>
                  <p className="text-xs text-red-700" style={{ fontFamily: 'Inter, system-ui, -apple-system, sans-serif' }}>
                    Your payment could not be verified. Please complete the payment to proceed with your loan application.
                  </p>
                </div>
              </div>
            </div>

            <Button
              onClick={() => navigate('/payment', { state: { loanId: currentLoan.id || currentLoan._id } })}
              className="w-full bg-red-600 hover:bg-red-700 text-white rounded-xl h-11 md:h-12 text-base font-semibold"
              style={{ fontFamily: 'Inter, system-ui, -apple-system, sans-serif' }}
            >
              Complete Payment Now
            </Button>
          </div>
        )}

        {/* Loan Processing Card */}
        {currentLoan && currentLoan.status === 'processing' && (
          <div className="bg-white rounded-2xl md:rounded-3xl p-5 md:p-6 shadow-lg border border-gray-200 mb-4 md:mb-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg md:text-xl font-bold text-[#14b8a6]" style={{ fontFamily: 'Inter, system-ui, -apple-system, sans-serif' }}>
                Loan Application Status
              </h2>
              <div className="px-3 md:px-4 py-1.5 md:py-2 rounded-full text-xs md:text-sm font-bold bg-green-500 text-white" style={{ fontFamily: 'Inter, system-ui, -apple-system, sans-serif' }}>
                PROCESSING
              </div>
            </div>

            {/* Full Loan Details */}
            <div className="space-y-3 md:space-y-4 mb-4 md:mb-6">
              <div className="flex justify-between items-center py-2 border-b border-gray-100">
                <span className="text-sm text-gray-600" style={{ fontFamily: 'Inter, system-ui, -apple-system, sans-serif' }}>
                  Loan ID:
                </span>
                <span className="font-bold text-sm text-gray-800" style={{ fontFamily: 'Inter, system-ui, -apple-system, sans-serif' }}>
                  GL-{currentLoan.loanId || currentLoan._id?.slice(-8)}
                </span>
              </div>
              <div className="flex justify-between items-center py-2 border-b border-gray-100">
                <span className="text-sm text-gray-600" style={{ fontFamily: 'Inter, system-ui, -apple-system, sans-serif' }}>
                  Approved Amount:
                </span>
                <span className="font-bold text-base text-[#14b8a6]" style={{ fontFamily: 'Inter, system-ui, -apple-system, sans-serif' }}>
                  ₹{currentLoan.approvedAmount?.toLocaleString()}
                </span>
              </div>
              {currentLoan.interestRate > 0 && (
                <div className="flex justify-between items-center py-2 border-b border-gray-100">
                  <span className="text-sm text-gray-600" style={{ fontFamily: 'Inter, system-ui, -apple-system, sans-serif' }}>
                    Interest Rate:
                  </span>
                  <span className="font-semibold text-sm text-gray-800" style={{ fontFamily: 'Inter, system-ui, -apple-system, sans-serif' }}>
                    {currentLoan.interestRate}% p.a.
                  </span>
                </div>
              )}
              {currentLoan.tenure > 0 && (
                <div className="flex justify-between items-center py-2 border-b border-gray-100">
                  <span className="text-sm text-gray-600" style={{ fontFamily: 'Inter, system-ui, -apple-system, sans-serif' }}>
                    Loan Tenure:
                  </span>
                  <span className="font-semibold text-sm text-gray-800" style={{ fontFamily: 'Inter, system-ui, -apple-system, sans-serif' }}>
                    {currentLoan.tenure} months ({currentLoan.tenure === 36 ? '3 years' : currentLoan.tenure === 24 ? '2 years' : currentLoan.tenure === 12 ? '1 year' : `${currentLoan.tenure} months`})
                  </span>
                </div>
              )}
              {currentLoan.emiAmount > 0 && (
                <div className="flex justify-between items-center py-2 border-b border-gray-100">
                  <span className="text-sm text-gray-600" style={{ fontFamily: 'Inter, system-ui, -apple-system, sans-serif' }}>
                    Monthly EMI:
                  </span>
                  <span className="font-bold text-base text-green-600" style={{ fontFamily: 'Inter, system-ui, -apple-system, sans-serif' }}>
                    ₹{currentLoan.emiAmount?.toLocaleString()}
                  </span>
                </div>
              )}
              {currentLoan.totalInterest > 0 && (
                <div className="flex justify-between items-center py-2 border-b border-gray-100">
                  <span className="text-sm text-gray-600" style={{ fontFamily: 'Inter, system-ui, -apple-system, sans-serif' }}>
                    Total Interest:
                  </span>
                  <span className="font-semibold text-sm text-gray-800" style={{ fontFamily: 'Inter, system-ui, -apple-system, sans-serif' }}>
                    ₹{currentLoan.totalInterest?.toLocaleString()}
                  </span>
                </div>
              )}
              {currentLoan.totalAmount > 0 && (
                <div className="flex justify-between items-center py-2 border-b border-gray-100">
                  <span className="text-sm text-gray-600" style={{ fontFamily: 'Inter, system-ui, -apple-system, sans-serif' }}>
                    Total Payable Amount:
                  </span>
                  <span className="font-bold text-base text-gray-800" style={{ fontFamily: 'Inter, system-ui, -apple-system, sans-serif' }}>
                    ₹{currentLoan.totalAmount?.toLocaleString()}
                  </span>
                </div>
              )}
              {currentLoan.totalPaymentAmount > 0 && (
                <div className="flex justify-between items-center py-2">
                  <span className="text-sm text-gray-600" style={{ fontFamily: 'Inter, system-ui, -apple-system, sans-serif' }}>
                    Processing Charges Paid:
                  </span>
                  <span className="font-semibold text-sm text-green-600" style={{ fontFamily: 'Inter, system-ui, -apple-system, sans-serif' }}>
                    ₹{currentLoan.totalPaymentAmount?.toLocaleString()}
                  </span>
                </div>
              )}
            </div>

            {/* Processing Status Message - No Loader */}
            <div className="text-center py-4">
              <div className="mb-4">
                <div className="w-16 h-16 mx-auto bg-green-100 rounded-full flex items-center justify-center mb-3">
                  <CheckCircle className="w-8 h-8 text-green-600" />
                </div>
                <p className="text-base md:text-lg font-bold text-gray-800 mb-2" style={{ fontFamily: 'Inter, system-ui, -apple-system, sans-serif' }}>
                  Your loan is being processed! ✅
                </p>
                <p className="text-sm md:text-base text-gray-600 mb-4" style={{ fontFamily: 'Inter, system-ui, -apple-system, sans-serif' }}>
                  Funds will be disbursed to your bank account within <span className="font-bold text-[#14b8a6]">{adminConfig?.processingDays || 15} days</span>.
                </p>
              </div>

              {/* Email Notification Info */}
              <div className="bg-[#14b8a6]/5 border border-[#14b8a6]/20 rounded-xl p-4 mt-4">
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 bg-[#14b8a6]/10 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                    <span className="text-lg">📧</span>
                  </div>
                  <div className="text-left">
                    <p className="text-sm font-semibold text-gray-800 mb-1" style={{ fontFamily: 'Inter, system-ui, -apple-system, sans-serif' }}>
                      Status Updates via Email
                    </p>
                    <p className="text-xs text-gray-600 leading-relaxed" style={{ fontFamily: 'Inter, system-ui, -apple-system, sans-serif' }}>
                      All loan status updates and important details will be sent to your registered email address: <span className="font-semibold text-[#14b8a6]">{user?.email || 'your email'}</span>. Please check your inbox regularly for updates.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Contact Support Card - Single Line (Only for Processing Status) */}
        {currentLoan && currentLoan.status === 'processing' && (
          <div className="bg-gradient-to-r from-[#14b8a6] to-[#0d9488] rounded-2xl md:rounded-3xl p-5 md:p-6 shadow-lg border border-[#14b8a6]/20 mb-4 md:mb-6">
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-4 flex-1 min-w-0">
                <div className="w-14 h-14 md:w-16 md:h-16 bg-white/25 rounded-full flex items-center justify-center flex-shrink-0 shadow-lg">
                  <MessageSquare className="w-7 h-7 md:w-8 md:h-8 text-white" />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-lg md:text-xl font-bold text-white mb-1.5 leading-tight" style={{ fontFamily: 'Inter, system-ui, -apple-system, sans-serif', color: '#ffffff' }}>
                    Need Help? Contact Support
                  </h3>
                  <p className="text-sm md:text-base text-white leading-relaxed" style={{ fontFamily: 'Inter, system-ui, -apple-system, sans-serif', color: '#ffffff' }}>
                    Create a ticket or request a callback for any queries
                  </p>
                </div>
              </div>
              <Button
                onClick={() => navigate('/contact')}
                className="bg-white/20 hover:bg-white/30 border-2 border-white text-white rounded-xl px-5 md:px-7 h-11 md:h-12 text-sm md:text-base font-bold shadow-lg hover:shadow-xl transition-all flex-shrink-0"
                style={{ fontFamily: 'Inter, system-ui, -apple-system, sans-serif', color: '#ffffff', fontWeight: '700' }}
              >
                Contact
              </Button>
            </div>
          </div>
        )}

        {/* Document Validation Card */}
        {currentLoan && (currentLoan.status === 'validating' || currentLoan.status === 'pending') && (
          <div className="bg-white rounded-2xl md:rounded-3xl p-5 md:p-6 shadow-lg border border-gray-200 mb-4 md:mb-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg md:text-xl font-bold text-[#14b8a6]" style={{ fontFamily: 'Inter, system-ui, -apple-system, sans-serif' }}>
                Document Validation Status
              </h2>
              <div className={`px-3 md:px-4 py-1.5 md:py-2 rounded-full text-xs md:text-sm font-bold ${
                currentLoan.status === 'validating' 
                  ? 'bg-[#14b8a6] text-white' 
                  : 'bg-gray-200 text-gray-600'
              }`} style={{ fontFamily: 'Inter, system-ui, -apple-system, sans-serif' }}>
                {currentLoan.status === 'validating' ? 'VALIDATING' : 'PENDING'}
              </div>
            </div>

            <div className="space-y-3 md:space-y-4 mb-4 md:mb-6">
              <div className="flex justify-between items-center py-2 border-b border-gray-100">
                <span className="text-sm text-gray-600" style={{ fontFamily: 'Inter, system-ui, -apple-system, sans-serif' }}>
                  Loan ID:
                </span>
                <span className="font-bold text-sm text-gray-800" style={{ fontFamily: 'Inter, system-ui, -apple-system, sans-serif' }}>
                  GL-{currentLoan.loanId || currentLoan._id?.slice(-8)}
                </span>
              </div>
              <div className="flex justify-between items-center py-2">
                <span className="text-sm text-gray-600" style={{ fontFamily: 'Inter, system-ui, -apple-system, sans-serif' }}>
                  Requested Amount:
                </span>
                <span className="font-bold text-base md:text-lg text-[#14b8a6]" style={{ fontFamily: 'Inter, system-ui, -apple-system, sans-serif' }}>
                  ₹{currentLoan.requestedAmount?.toLocaleString()}
                </span>
              </div>
            </div>

            {validating && (
              <div className="text-center py-6">
                <div className="relative mx-auto mb-6 w-20 h-20 md:w-24 md:h-24">
                  <div className="absolute inset-0 w-20 h-20 md:w-24 md:h-24 border-4 border-[#14b8a6] border-t-transparent rounded-full animate-spin" />
                  <div className="absolute inset-0 w-20 h-20 md:w-24 md:h-24 border-4 border-[#14b8a6]/30 rounded-full animate-ping" />
                  <div className="absolute inset-3 md:inset-4 w-14 h-14 md:w-16 md:h-16 bg-[#14b8a6]/20 rounded-full animate-pulse flex items-center justify-center">
                    <FileCheck className="w-6 h-6 md:w-8 md:h-8 text-[#14b8a6]" />
                  </div>
                </div>
                <p className="text-base md:text-lg font-semibold text-gray-800 mb-2" style={{ fontFamily: 'Inter, system-ui, -apple-system, sans-serif' }}>
                  Validating your documents...
                </p>
                <p className="text-sm text-gray-500" style={{ fontFamily: 'Inter, system-ui, -apple-system, sans-serif' }}>
                  Please wait while we verify your information
                </p>
              </div>
            )}
          </div>
        )}

        {/* Loan Application Sections - Always visible */}
        <div className="mb-4 md:mb-6">
          <h2 className="text-lg md:text-xl font-bold text-gray-800 mb-3 md:mb-4" style={{ fontFamily: 'Inter, system-ui, -apple-system, sans-serif' }}>
            Apply for Loans
          </h2>
          <div className="space-y-3 md:space-y-4">
            {/* Home Loan */}
            <div 
              onClick={() => !showValidationLoader && !showRejectionMessage && handleLoanTypeClick('home')}
              className={`bg-white rounded-2xl p-5 shadow-lg border border-gray-200 transition-all group ${
                showValidationLoader || showRejectionMessage 
                  ? 'opacity-50 cursor-not-allowed' 
                  : 'hover:shadow-xl cursor-pointer'
              }`}
            >
              <div className="flex items-center gap-3 md:gap-4 mb-3 md:mb-4">
                <div className="w-10 h-10 md:w-12 md:h-12 bg-[#14b8a6]/10 rounded-xl flex items-center justify-center group-hover:bg-[#14b8a6]/20 transition-colors flex-shrink-0">
                  <HomeIcon className="w-5 h-5 md:w-6 md:h-6 text-[#14b8a6]" />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-base md:text-lg font-bold text-gray-800" style={{ fontFamily: 'Inter, system-ui, -apple-system, sans-serif' }}>
                    Home Loan
                  </h3>
                  <p className="text-xs text-gray-500" style={{ fontFamily: 'Inter, system-ui, -apple-system, sans-serif' }}>
                    Up to ₹50 Lakhs
                  </p>
                </div>
              </div>
              <p className="text-xs md:text-sm text-gray-600 mb-3 md:mb-4" style={{ fontFamily: 'Inter, system-ui, -apple-system, sans-serif' }}>
                Get your dream home with flexible repayment options
              </p>
              <Button 
                className="w-full bg-[#14b8a6] hover:bg-[#0d9488] text-white rounded-xl h-10 md:h-11 text-sm md:text-base"
                style={{ fontFamily: 'Inter, system-ui, -apple-system, sans-serif' }}
              >
                Apply Now
              </Button>
            </div>

            {/* Credit Card */}
            <div 
              onClick={() => !showValidationLoader && !showRejectionMessage && handleLoanTypeClick('credit_card')}
              className={`bg-white rounded-2xl p-5 shadow-lg border border-gray-200 transition-all group ${
                showValidationLoader || showRejectionMessage 
                  ? 'opacity-50 cursor-not-allowed' 
                  : 'hover:shadow-xl cursor-pointer'
              }`}
            >
              <div className="flex items-center gap-3 md:gap-4 mb-3 md:mb-4">
                <div className="w-10 h-10 md:w-12 md:h-12 bg-[#14b8a6]/10 rounded-xl flex items-center justify-center group-hover:bg-[#14b8a6]/20 transition-colors flex-shrink-0">
                  <CreditCard className="w-5 h-5 md:w-6 md:h-6 text-[#14b8a6]" />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-base md:text-lg font-bold text-gray-800" style={{ fontFamily: 'Inter, system-ui, -apple-system, sans-serif' }}>
                    Credit Card
                  </h3>
                  <p className="text-xs text-gray-500" style={{ fontFamily: 'Inter, system-ui, -apple-system, sans-serif' }}>
                    Pre-approved offers
                  </p>
                </div>
              </div>
              <p className="text-xs md:text-sm text-gray-600 mb-3 md:mb-4" style={{ fontFamily: 'Inter, system-ui, -apple-system, sans-serif' }}>
                Enjoy cashback, rewards, and exclusive benefits
              </p>
              <Button 
                className="w-full bg-[#14b8a6] hover:bg-[#0d9488] text-white rounded-xl h-10 md:h-11 text-sm md:text-base"
                style={{ fontFamily: 'Inter, system-ui, -apple-system, sans-serif' }}
              >
                Apply Now
              </Button>
            </div>

            {/* Personal Loan */}
            <div 
              onClick={() => !showValidationLoader && !showRejectionMessage && handleLoanTypeClick('personal')}
              className={`bg-white rounded-2xl p-5 shadow-lg border border-gray-200 transition-all group ${
                showValidationLoader || showRejectionMessage 
                  ? 'opacity-50 cursor-not-allowed' 
                  : 'hover:shadow-xl cursor-pointer'
              }`}
            >
              <div className="flex items-center gap-3 md:gap-4 mb-3 md:mb-4">
                <div className="w-10 h-10 md:w-12 md:h-12 bg-[#14b8a6]/10 rounded-xl flex items-center justify-center group-hover:bg-[#14b8a6]/20 transition-colors flex-shrink-0">
                  <TrendingUp className="w-5 h-5 md:w-6 md:h-6 text-[#14b8a6]" />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-base md:text-lg font-bold text-gray-800" style={{ fontFamily: 'Inter, system-ui, -apple-system, sans-serif' }}>
                    Personal Loan
                  </h3>
                  <p className="text-xs text-gray-500" style={{ fontFamily: 'Inter, system-ui, -apple-system, sans-serif' }}>
                    Up to ₹5 Lakhs
                  </p>
                </div>
              </div>
              <p className="text-xs md:text-sm text-gray-600 mb-3 md:mb-4" style={{ fontFamily: 'Inter, system-ui, -apple-system, sans-serif' }}>
                Quick approval and instant disbursement
              </p>
              <Button 
                className="w-full bg-[#14b8a6] hover:bg-[#0d9488] text-white rounded-xl h-10 md:h-11 text-sm md:text-base"
                style={{ fontFamily: 'Inter, system-ui, -apple-system, sans-serif' }}
              >
                Apply Now
              </Button>
            </div>
          </div>
        </div>

        {/* Approved Loan Popup */}
        {showApprovalPopup && approvedLoanData && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-3xl p-6 md:p-8 max-w-md w-full shadow-2xl">
              <div className="text-center mb-6">
                <div className="w-16 h-16 bg-[#14b8a6]/10 rounded-full flex items-center justify-center mx-auto mb-4">
                  <CheckCircle className="w-10 h-10 text-[#14b8a6]" />
                </div>
                <h2 className="text-2xl md:text-3xl font-bold text-gray-800 mb-2" style={{ fontFamily: 'Inter, system-ui, -apple-system, sans-serif' }}>
                  🎉 Loan Approved!
                </h2>
                <p className="text-gray-600" style={{ fontFamily: 'Inter, system-ui, -apple-system, sans-serif' }}>
                  Your loan application has been approved
                </p>
              </div>

              <div className="bg-[#14b8a6]/5 rounded-2xl p-6 mb-6 border border-[#14b8a6]/20">
                <div className="text-center">
                  <p className="text-sm text-gray-600 mb-2" style={{ fontFamily: 'Inter, system-ui, -apple-system, sans-serif' }}>
                    Approved Amount
                  </p>
                  <p className="text-4xl md:text-5xl font-bold text-[#14b8a6] mb-4" style={{ fontFamily: 'Inter, system-ui, -apple-system, sans-serif' }}>
                    ₹{approvedLoanData.approvedAmount?.toLocaleString()}
                  </p>
                  <div className="space-y-2 text-sm text-gray-600">
                    <div className="flex justify-between">
                      <span>Loan ID:</span>
                      <span className="font-semibold">GL-{approvedLoanData.loanId || approvedLoanData._id?.slice(-8)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Requested:</span>
                      <span className="font-semibold">₹{approvedLoanData.requestedAmount?.toLocaleString()}</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="space-y-3">
                <Button
                  onClick={() => {
                    setShowApprovalPopup(false);
                    navigate('/tenure-selection', { state: { loanId: approvedLoanData.id || approvedLoanData._id } });
                  }}
                  className="w-full bg-[#14b8a6] hover:bg-[#0d9488] text-white rounded-xl h-12 text-lg font-semibold"
                  style={{ fontFamily: 'Inter, system-ui, -apple-system, sans-serif' }}
                >
                  Select Tenure
                </Button>
                <Button
                  onClick={() => setShowApprovalPopup(false)}
                  variant="outline"
                  className="w-full border-gray-300 text-gray-700 hover:bg-gray-50 rounded-xl"
                  style={{ fontFamily: 'Inter, system-ui, -apple-system, sans-serif' }}
                >
                  View Details Later
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Home;
