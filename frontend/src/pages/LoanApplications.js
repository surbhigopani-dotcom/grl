import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import axios from 'axios';
import { toast } from 'react-toastify';
import { Button } from '../components/ui/Button';
import { ArrowLeft, Plus, History, Menu, X, Home, LogOut, FileText, CheckCircle, Clock } from 'lucide-react';
import { Loader } from '../components/ui/Loader';

const LoanApplications = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [loans, setLoans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [adminConfig, setAdminConfig] = useState(null);

  useEffect(() => {
    fetchAdminConfig();
    fetchLoans();
  }, []);

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

  const fetchLoans = async () => {
    try {
      const response = await axios.get('/loans');
      setLoans(response.data.loans || []);
    } catch (error) {
      toast.error('Failed to fetch loan applications');
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case "approved": return "bg-success text-success-foreground";
      case "pending": return "bg-warning text-warning-foreground";
      case "processing": return "bg-processing text-processing-foreground";
      case "completed": return "bg-success text-success-foreground";
      case "rejected": return "bg-error text-error-foreground";
      default: return "bg-muted text-muted-foreground";
    }
  };

  const getStatusText = (status) => {
    const texts = {
      pending: 'Pending',
      validating: 'Validating',
      approved: 'Approved',
      payment_pending: 'Payment Pending',
      processing: 'Processing',
      completed: 'Completed',
      rejected: 'Rejected'
    };
    return texts[status] || status;
  };

  const formatDate = (date) => {
    if (!date) return 'N/A';
    return new Date(date).toLocaleDateString('en-IN', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const calculateDaysRemaining = (expectedDate) => {
    if (!expectedDate) return null;
    const today = new Date();
    const expected = new Date(expectedDate);
    const diffTime = expected - today;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays > 0 ? diffDays : 0;
  };

  if (loading) {
    return <Loader fullScreen text="Loading your applications..." size="lg" />;
  }

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Navigation */}
      <nav className="bg-white border-b border-gray-200 sticky top-0 z-50 shadow-sm">
        <div className="max-w-lg mx-auto px-4 py-3 md:py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <button
                onClick={() => navigate("/home")}
                className="text-gray-700 hover:bg-gray-100 rounded-full p-2 transition-colors"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
              <div className="text-xl md:text-2xl font-bold text-[#14b8a6]" style={{ fontFamily: 'Inter, system-ui, -apple-system, sans-serif' }}>
                My Loan Applications
              </div>
            </div>

            {/* Desktop: Right Side */}
            <div className="hidden md:flex gap-2 items-center">
              <Button
                variant="ghost"
                onClick={() => navigate('/transaction-history')}
                className="rounded-xl text-gray-700 hover:bg-gray-50"
                style={{ fontFamily: 'Inter, system-ui, -apple-system, sans-serif' }}
              >
                <History className="w-4 h-4 mr-2" />
                Transactions
              </Button>
              <Button
                variant="outline"
                onClick={logout}
                className="rounded-xl border-gray-300 text-gray-700 hover:bg-gray-50"
                style={{ fontFamily: 'Inter, system-ui, -apple-system, sans-serif' }}
              >
                <LogOut className="w-4 h-4 mr-2" />
                Logout
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
            <div className="md:hidden mt-4 pb-4 border-t border-gray-200 pt-4 space-y-2">
              <Button
                variant="ghost"
                onClick={() => {
                  navigate("/home");
                  setMobileMenuOpen(false);
                }}
                className="w-full rounded-xl justify-start text-gray-700"
                style={{ fontFamily: 'Inter, system-ui, -apple-system, sans-serif' }}
              >
                <Home className="w-4 h-4 mr-2" />
                Home
              </Button>
              <Button
                variant="ghost"
                onClick={() => {
                  navigate("/transaction-history");
                  setMobileMenuOpen(false);
                }}
                className="w-full rounded-xl justify-start text-gray-700"
                style={{ fontFamily: 'Inter, system-ui, -apple-system, sans-serif' }}
              >
                <History className="w-4 h-4 mr-2" />
                Transaction History
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

        {/* Applications List */}
        {loans.length === 0 ? (
          <div className="bg-white rounded-2xl md:rounded-3xl p-8 md:p-12 text-center border border-gray-200 shadow-lg">
            <div className="text-4xl md:text-6xl mb-3 md:mb-4">📋</div>
            <h2 className="text-xl md:text-2xl font-bold text-gray-800 mb-3 md:mb-4" style={{ fontFamily: 'Inter, system-ui, -apple-system, sans-serif' }}>No Applications Yet</h2>
            <p className="text-sm md:text-base text-gray-600 mb-4 md:mb-6" style={{ fontFamily: 'Inter, system-ui, -apple-system, sans-serif' }}>Apply for your first loan to get started</p>
            <Button
              onClick={() => navigate("/home")}
              className="bg-[#14b8a6] hover:bg-[#0d9488] text-white rounded-xl text-sm md:text-base px-4 md:px-6"
              style={{ fontFamily: 'Inter, system-ui, -apple-system, sans-serif' }}
            >
              Apply for a Loan
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            {loans.map((loan) => (
              <div key={loan._id} className="bg-white rounded-2xl md:rounded-3xl p-5 md:p-6 border border-gray-200 shadow-lg">
                {/* Header */}
                <div className="flex items-center justify-between mb-4 md:mb-6">
                  <div>
                    <div className="text-xs md:text-sm text-muted-foreground mb-1">Loan ID</div>
                    <div className="font-bold text-base md:text-lg">{loan.loanId || loan._id?.slice(-8)}</div>
                  </div>
                  <div className={`px-3 md:px-4 py-1.5 md:py-2 rounded-full text-xs md:text-sm font-bold ${
                    loan.status === 'processing' ? 'bg-green-500 text-white' :
                    loan.status === 'approved' ? 'bg-[#14b8a6] text-white' :
                    loan.status === 'completed' ? 'bg-green-500 text-white' :
                    loan.status === 'rejected' ? 'bg-red-500 text-white' :
                    loan.status === 'payment_validation' ? 'bg-blue-500 text-white' :
                    loan.status === 'payment_pending' ? 'bg-yellow-500 text-white' :
                    'bg-gray-500 text-white'
                  }`} style={{ fontFamily: 'Inter, system-ui, -apple-system, sans-serif' }}>
                    {getStatusText(loan.status).toUpperCase()}
                  </div>
                </div>

                {/* Full Loan Details */}
                <div className="space-y-2 md:space-y-3 mb-4 md:mb-6">
                  <div className="flex justify-between items-center">
                    <span className="text-xs md:text-sm text-muted-foreground">Requested Amount:</span>
                    <span className="font-bold text-sm md:text-base text-accent">₹{loan.requestedAmount?.toLocaleString()}</span>
                  </div>
                  {loan.approvedAmount > 0 && (
                    <>
                      <div className="flex justify-between items-center">
                        <span className="text-xs md:text-sm text-muted-foreground">Approved Amount:</span>
                        <span className="font-bold text-base md:text-lg text-[#14b8a6]">₹{loan.approvedAmount?.toLocaleString()}</span>
                      </div>
                      {loan.interestRate > 0 && (
                        <div className="flex justify-between items-center">
                          <span className="text-xs md:text-sm text-muted-foreground">Interest Rate:</span>
                          <span className="font-semibold text-sm text-gray-800">{loan.interestRate}% p.a.</span>
                        </div>
                      )}
                      {loan.tenure > 0 && (
                        <div className="flex justify-between items-center">
                          <span className="text-xs md:text-sm text-muted-foreground">Loan Tenure:</span>
                          <span className="font-semibold text-sm text-gray-800">{loan.tenure} months ({loan.tenure === 36 ? '3 years' : loan.tenure === 24 ? '2 years' : loan.tenure === 12 ? '1 year' : `${loan.tenure} months`})</span>
                        </div>
                      )}
                      {loan.emiAmount > 0 && (
                        <div className="flex justify-between items-center">
                          <span className="text-xs md:text-sm text-muted-foreground">Monthly EMI:</span>
                          <span className="font-bold text-base text-green-600">₹{loan.emiAmount?.toLocaleString()}</span>
                        </div>
                      )}
                      {loan.totalInterest > 0 && (
                        <div className="flex justify-between items-center">
                          <span className="text-xs md:text-sm text-muted-foreground">Total Interest:</span>
                          <span className="font-semibold text-sm text-gray-800">₹{loan.totalInterest?.toLocaleString()}</span>
                        </div>
                      )}
                      {loan.totalAmount > 0 && (
                        <div className="flex justify-between items-center">
                          <span className="text-xs md:text-sm text-muted-foreground">Total Payable Amount:</span>
                          <span className="font-bold text-base text-gray-800">₹{loan.totalAmount?.toLocaleString()}</span>
                        </div>
                      )}
                    </>
                  )}
                  <div className="h-px bg-border my-2" />
                  <div className="text-xs md:text-sm font-semibold text-muted-foreground mb-2">Processing Charges:</div>
                  <div className="flex justify-between text-xs md:text-sm">
                    <span className="text-muted-foreground">Deposit Amount:</span>
                    <span>₹{loan.depositAmount || 0}</span>
                  </div>
                  <div className="flex justify-between text-xs md:text-sm">
                    <span className="text-muted-foreground">File Charge:</span>
                    <span>₹{loan.fileCharge || 0}</span>
                  </div>
                  <div className="flex justify-between text-xs md:text-sm">
                    <span className="text-muted-foreground">Platform Fee:</span>
                    <span>₹{loan.platformFee || 0}</span>
                  </div>
                  {loan.tax > 0 && (
                    <div className="flex justify-between text-xs md:text-sm">
                      <span className="text-muted-foreground">Tax/GST:</span>
                      <span>₹{loan.tax || 0}</span>
                    </div>
                  )}
                  <div className="h-px bg-border my-2" />
                  <div className="flex justify-between font-bold text-sm md:text-base">
                    <span>Total Payment:</span>
                    <span className="text-accent">₹{loan.totalPaymentAmount || ((loan.fileCharge || 0) + (loan.platformFee || 0) + (loan.depositAmount || 0) + (loan.tax || 0))}</span>
                  </div>
                </div>

                {/* Sanction Letter View Button */}
                {(loan.status === 'tenure_selection' || loan.status === 'sanction_letter_viewed' || loan.status === 'signature_pending' || loan.status === 'payment_pending' || loan.status === 'payment_validation' || loan.status === 'processing' || loan.status === 'completed') && loan.approvedAmount > 0 && (
                  <div className="mb-4 md:mb-6">
                    <Button
                      onClick={() => navigate('/sanction-letter', { state: { loanId: loan._id || loan.id } })}
                      className="w-full bg-[#14b8a6] hover:bg-[#0d9488] text-white rounded-xl h-10 md:h-11 text-sm md:text-base"
                      style={{ fontFamily: 'Inter, system-ui, -apple-system, sans-serif' }}
                    >
                      <FileText className="w-4 h-4 mr-2" />
                      View Sanction Letter
                    </Button>
                  </div>
                )}

                {/* Payment Details */}
                {loan.depositPaid && (
                  <div className="bg-green-50 border border-green-200 rounded-xl md:rounded-2xl p-4 md:p-5 mb-4 md:mb-6">
                    <div className="flex items-center gap-2 mb-3">
                      <CheckCircle className="w-5 h-5 text-green-600" />
                      <span className="text-sm md:text-base font-semibold text-green-700" style={{ fontFamily: 'Inter, system-ui, -apple-system, sans-serif' }}>Payment Completed</span>
                    </div>
                    <div className="text-xs md:text-sm space-y-2">
                      {loan.paymentMethod && (
                        <div className="flex justify-between items-center">
                          <span className="text-gray-600" style={{ fontFamily: 'Inter, system-ui, -apple-system, sans-serif' }}>Payment Method:</span>
                          <span className="font-semibold text-gray-800" style={{ fontFamily: 'Inter, system-ui, -apple-system, sans-serif' }}>{loan.paymentMethod}</span>
                        </div>
                      )}
                      {loan.paymentId && (
                        <div className="flex justify-between items-center">
                          <span className="text-gray-600" style={{ fontFamily: 'Inter, system-ui, -apple-system, sans-serif' }}>Transaction ID:</span>
                          <span className="font-semibold text-gray-800 text-xs break-all text-right ml-2" style={{ fontFamily: 'Inter, system-ui, -apple-system, sans-serif' }}>{loan.paymentId}</span>
                        </div>
                      )}
                      {loan.paymentAt && (
                        <div className="flex justify-between items-center">
                          <span className="text-gray-600" style={{ fontFamily: 'Inter, system-ui, -apple-system, sans-serif' }}>Payment Date:</span>
                          <span className="font-semibold text-gray-800" style={{ fontFamily: 'Inter, system-ui, -apple-system, sans-serif' }}>{formatDate(loan.paymentAt)}</span>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Dates */}
                <div className="bg-gray-50 rounded-xl p-4 mb-4 md:mb-6">
                  <div className="text-xs md:text-sm font-semibold text-gray-700 mb-3" style={{ fontFamily: 'Inter, system-ui, -apple-system, sans-serif' }}>Important Dates</div>
                  <div className="space-y-2 text-xs md:text-sm">
                    <div className="flex justify-between items-center">
                      <span className="text-gray-600" style={{ fontFamily: 'Inter, system-ui, -apple-system, sans-serif' }}>Applied On:</span>
                      <span className="font-semibold text-gray-800" style={{ fontFamily: 'Inter, system-ui, -apple-system, sans-serif' }}>{formatDate(loan.appliedAt)}</span>
                    </div>
                    {loan.approvedAt && (
                      <div className="flex justify-between items-center">
                        <span className="text-gray-600" style={{ fontFamily: 'Inter, system-ui, -apple-system, sans-serif' }}>Approved On:</span>
                        <span className="font-semibold text-gray-800" style={{ fontFamily: 'Inter, system-ui, -apple-system, sans-serif' }}>{formatDate(loan.approvedAt)}</span>
                      </div>
                    )}
                    {loan.paymentAt && !loan.depositPaid && (
                      <div className="flex justify-between items-center">
                        <span className="text-gray-600" style={{ fontFamily: 'Inter, system-ui, -apple-system, sans-serif' }}>Payment Date:</span>
                        <span className="font-semibold text-gray-800" style={{ fontFamily: 'Inter, system-ui, -apple-system, sans-serif' }}>{formatDate(loan.paymentAt)}</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Processing Status */}
                {loan.status === 'processing' && (
                  <div className="bg-green-50 border border-green-200 rounded-xl md:rounded-2xl p-4 md:p-5 mb-4">
                    <div className="flex items-center gap-3 mb-3">
                      <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0">
                        <CheckCircle className="w-6 h-6 text-green-600" />
                      </div>
                      <div>
                        <div className="text-sm md:text-base font-bold text-gray-800" style={{ fontFamily: 'Inter, system-ui, -apple-system, sans-serif' }}>
                          Your loan is being processed! ✅
                        </div>
                      </div>
                    </div>
                    <p className="text-xs md:text-sm text-gray-600 mb-3" style={{ fontFamily: 'Inter, system-ui, -apple-system, sans-serif' }}>
                      Funds will be disbursed to your bank account within <span className="font-bold text-[#14b8a6]">{adminConfig?.processingDays || 15} days</span>.
                    </p>
                    <div className="bg-[#14b8a6]/5 border border-[#14b8a6]/20 rounded-lg p-3 mt-3">
                      <div className="flex items-start gap-2">
                        <span className="text-sm">📧</span>
                        <div className="text-xs text-gray-600" style={{ fontFamily: 'Inter, system-ui, -apple-system, sans-serif' }}>
                          <span className="font-semibold">Status Updates via Email:</span> All loan status updates and important details will be sent to <span className="font-semibold text-[#14b8a6]">{user?.email || 'your email'}</span>. Please check your inbox regularly.
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default LoanApplications;
