import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import axios from 'axios';
import { toast } from 'react-toastify';
import { Button } from '../components/ui/Button';
import { ArrowLeft, Plus, History, Menu, X, Home, LogOut } from 'lucide-react';
import { Loader } from '../components/ui/Loader';

const LoanApplications = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [loans, setLoans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    fetchLoans();
  }, []);

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
    <div className="min-h-screen bg-background">
      {/* Navigation */}
      <nav className="bg-card border-b border-border sticky top-0 z-50 shadow-sm">
        <div className="container mx-auto px-3 md:px-4 py-3 md:py-4">
          <div className="flex items-center justify-between">
            {/* Desktop: Back Button */}
            <Button
              variant="ghost"
              onClick={() => navigate("/home")}
              className="rounded-xl hidden md:flex"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Home
            </Button>
            
            {/* Mobile: Logo */}
            <div className="text-xl md:text-2xl font-bold text-gradient md:absolute md:left-1/2 md:transform md:-translate-x-1/2">
              GrowLoan
            </div>

            {/* Desktop: Right Side */}
            <div className="hidden md:flex gap-3 items-center">
              <Button
                variant="outline"
                onClick={() => navigate("/transactions")}
                className="rounded-xl"
              >
                <History className="w-4 h-4 mr-2" />
                Transactions
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
                  navigate("/transactions");
                  setMobileMenuOpen(false);
                }}
                className="w-full rounded-xl justify-start"
              >
                <History className="w-4 h-4 mr-2" />
                Transactions
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
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6 md:mb-8">
          <h1 className="text-2xl md:text-4xl font-bold">My Loan Applications</h1>
          <div className="flex gap-2 md:gap-3">
            <Button
              variant="outline"
              onClick={() => navigate("/transactions")}
              className="rounded-xl text-sm md:text-base px-3 md:px-4"
            >
              <History className="w-4 h-4 mr-1 md:mr-2" />
              <span className="hidden sm:inline">Transactions</span>
              <span className="sm:hidden">Txns</span>
            </Button>
            <Button
              onClick={() => navigate("/home")}
              className="gradient-primary text-primary-foreground rounded-xl text-sm md:text-base px-3 md:px-4"
            >
              <Plus className="w-4 h-4 mr-1 md:mr-2" />
              <span className="hidden sm:inline">New Application</span>
              <span className="sm:hidden">New</span>
            </Button>
          </div>
        </div>

        {/* Applications Grid */}
        {loans.length === 0 ? (
          <div className="bg-card rounded-2xl md:rounded-3xl p-6 md:p-12 text-center border border-border">
            <div className="text-4xl md:text-6xl mb-3 md:mb-4">📋</div>
            <h2 className="text-xl md:text-2xl font-bold mb-3 md:mb-4">No Applications Yet</h2>
            <p className="text-sm md:text-base text-muted-foreground mb-4 md:mb-6">Apply for your first loan to get started</p>
            <Button
              onClick={() => navigate("/home")}
              className="gradient-primary text-primary-foreground rounded-xl text-sm md:text-base px-4 md:px-6"
            >
              Apply for a Loan
            </Button>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 gap-4 md:gap-6">
            {loans.map((loan) => (
              <div key={loan._id} className="bg-card rounded-2xl md:rounded-3xl p-4 md:p-8 border border-border hover-lift">
                {/* Header */}
                <div className="flex items-center justify-between mb-4 md:mb-6">
                  <div>
                    <div className="text-xs md:text-sm text-muted-foreground mb-1">Loan ID</div>
                    <div className="font-bold text-base md:text-lg">{loan.loanId || loan._id?.slice(-8)}</div>
                  </div>
                  <div className={`px-2 md:px-4 py-1 md:py-2 rounded-full text-xs md:text-sm font-bold ${getStatusColor(loan.status)}`}>
                    {getStatusText(loan.status).toUpperCase()}
                  </div>
                </div>

                {/* Amounts */}
                <div className="space-y-2 md:space-y-3 mb-4 md:mb-6">
                  <div className="flex justify-between items-center">
                    <span className="text-xs md:text-sm text-muted-foreground">Requested Amount:</span>
                    <span className="font-bold text-sm md:text-base text-accent">₹{loan.requestedAmount?.toLocaleString()}</span>
                  </div>
                  {loan.approvedAmount > 0 && (
                    <div className="flex justify-between items-center">
                      <span className="text-xs md:text-sm text-muted-foreground">Approved Amount:</span>
                      <span className="font-bold text-sm md:text-base text-accent">₹{loan.approvedAmount?.toLocaleString()}</span>
                    </div>
                  )}
                  <div className="h-px bg-border my-2" />
                  <div className="flex justify-between text-xs md:text-sm">
                    <span className="text-muted-foreground">Deposit Amount:</span>
                    <span>₹{loan.depositAmount || 149}</span>
                  </div>
                  <div className="flex justify-between text-xs md:text-sm">
                    <span className="text-muted-foreground">File Charge:</span>
                    <span>₹{loan.fileCharge || 99}</span>
                  </div>
                  <div className="flex justify-between text-xs md:text-sm">
                    <span className="text-muted-foreground">Platform Fee:</span>
                    <span>₹{loan.platformFee || 50}</span>
                  </div>
                  <div className="h-px bg-border my-2" />
                  <div className="flex justify-between font-bold text-sm md:text-base">
                    <span>Total Payment:</span>
                    <span className="text-accent">₹{loan.totalPaymentAmount || 298}</span>
                  </div>
                </div>

                {/* Payment Details */}
                {loan.depositPaid && (
                  <div className="bg-success/10 border border-success rounded-xl md:rounded-2xl p-3 md:p-4 mb-4 md:mb-6">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs md:text-sm font-semibold text-success">✓ Payment Completed</span>
                    </div>
                    <div className="text-xs md:text-sm space-y-1">
                      {loan.paymentMethod && (
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Method:</span>
                          <span className="font-medium break-all text-right ml-2">{loan.paymentMethod}</span>
                        </div>
                      )}
                      {loan.paymentId && (
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Transaction ID:</span>
                          <span className="font-medium break-all text-right ml-2 text-xs">{loan.paymentId}</span>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Dates */}
                <div className="space-y-1 md:space-y-2 text-xs md:text-sm mb-4 md:mb-6">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Applied:</span>
                    <span className="text-right">{formatDate(loan.appliedAt)}</span>
                  </div>
                  {loan.approvedAt && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Approved:</span>
                      <span className="text-right">{formatDate(loan.approvedAt)}</span>
                    </div>
                  )}
                  {loan.paymentAt && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Paid:</span>
                      <span className="text-right">{formatDate(loan.paymentAt)}</span>
                    </div>
                  )}
                </div>

                {/* Processing Info */}
                {loan.status === 'processing' && loan.expectedCompletionDate && (
                  <div className="bg-processing/10 border border-processing rounded-xl md:rounded-2xl p-3 md:p-4">
                    <div className="text-xs md:text-sm text-processing font-semibold mb-2">
                      ⏱️ Processing in Progress
                    </div>
                    <div className="text-xs md:text-sm space-y-1">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Expected by:</span>
                        <span className="font-medium text-right">{formatDate(loan.expectedCompletionDate)}</span>
                      </div>
                      {calculateDaysRemaining(loan.expectedCompletionDate) !== null && (
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Days remaining:</span>
                          <span className="font-bold text-processing">{calculateDaysRemaining(loan.expectedCompletionDate)} days</span>
                        </div>
                      )}
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
