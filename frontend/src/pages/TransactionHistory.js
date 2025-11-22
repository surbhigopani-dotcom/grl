import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import axios from 'axios';
import { toast } from 'react-toastify';
import { Button } from '../components/ui/Button';
import { ArrowLeft, CheckCircle, XCircle, Clock, CreditCard, Menu, X, Home, FileText, LogOut } from 'lucide-react';
import { Loader } from '../components/ui/Loader';

const TransactionHistory = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    fetchTransactions();
  }, []);

  const fetchTransactions = async () => {
    try {
      const response = await axios.get('/loans');
      const loans = response.data.loans || [];
      
      // Convert loans with payments to transactions
      const txns = loans
        .filter(loan => loan.depositPaid && loan.paymentAt)
        .map(loan => {
          // Determine transaction status based on loan status and payment status
          let txnStatus = 'pending';
          if (loan.status === 'payment_validation') {
            txnStatus = 'under_review';
          } else if (loan.paymentStatus === 'success' || loan.status === 'processing') {
            txnStatus = 'completed';
          } else if (loan.paymentStatus === 'failed') {
            txnStatus = 'failed';
          } else if (loan.depositPaid) {
            txnStatus = 'completed';
          }

          return {
            id: loan.paymentId || loan._id,
            loanId: loan.loanId || loan._id?.slice(-8),
            amount: loan.totalPaymentAmount || ((loan.fileCharge || 0) + (loan.platformFee || 0) + (loan.depositAmount || 0) + (loan.tax || 0)),
            status: txnStatus,
            date: loan.paymentAt,
            method: loan.paymentMethod || 'UPI',
            loanAmount: loan.approvedAmount || loan.requestedAmount,
            loanStatus: loan.status,
            paymentStatus: loan.paymentStatus
          };
        })
        .sort((a, b) => new Date(b.date) - new Date(a.date));
      
      setTransactions(txns);
    } catch (error) {
      toast.error('Failed to fetch transaction history');
      console.error('Error fetching transactions:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="w-5 h-5 text-success" />;
      case 'under_review':
        return <Clock className="w-5 h-5 text-warning animate-pulse" />;
      case 'pending':
        return <Clock className="w-5 h-5 text-warning" />;
      case 'failed':
        return <XCircle className="w-5 h-5 text-error" />;
      default:
        return <Clock className="w-5 h-5 text-muted-foreground" />;
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'completed':
        return 'bg-success/10 text-success border-success';
      case 'under_review':
        return 'bg-warning/20 text-warning border-warning animate-pulse';
      case 'pending':
        return 'bg-warning/10 text-warning border-warning';
      case 'failed':
        return 'bg-error/10 text-error border-error';
      default:
        return 'bg-muted/10 text-muted-foreground border-muted';
    }
  };

  const getStatusText = (status) => {
    switch (status) {
      case 'completed':
        return 'Completed';
      case 'under_review':
        return 'Under Review';
      case 'pending':
        return 'Pending';
      case 'failed':
        return 'Failed';
      default:
        return status;
    }
  };

  const formatDate = (date) => {
    if (!date) return 'N/A';
    return new Date(date).toLocaleString('en-IN', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (loading) {
    return <Loader fullScreen text="Loading transaction history..." size="lg" />;
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Navigation */}
      <nav className="bg-card border-b border-border sticky top-0 z-50 shadow-sm">
        <div className="container mx-auto px-4 py-4">
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
            
            {/* Mobile: Title */}
            <div className="text-lg md:text-2xl font-bold text-gradient md:absolute md:left-1/2 md:transform md:-translate-x-1/2">
              Transaction History
            </div>

            {/* Desktop: Right Side */}
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
                onClick={() => navigate("/home")}
                className="rounded-xl"
              >
                <Home className="w-4 h-4 mr-2" />
                Home
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
                  navigate("/applications");
                  setMobileMenuOpen(false);
                }}
                className="w-full rounded-xl justify-start"
              >
                <FileText className="w-4 h-4 mr-2" />
                My Applications
              </Button>
            </div>
          )}
        </div>
      </nav>

      <div className="container mx-auto px-4 py-4 md:py-8">
        {/* Header */}
        <div className="mb-6 md:mb-8">
          <h1 className="text-2xl md:text-4xl font-bold mb-2">Your Transactions</h1>
          <p className="text-sm md:text-base text-muted-foreground">View all your payment history and loan transactions</p>
        </div>

        {/* Transactions List */}
        {transactions.length === 0 ? (
          <div className="bg-card rounded-3xl p-12 text-center border border-border">
            <CreditCard className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
            <h2 className="text-2xl font-bold mb-4">No Transactions Yet</h2>
            <p className="text-muted-foreground mb-6">
              Your payment transactions will appear here once you complete a loan payment.
            </p>
            <Button
              onClick={() => navigate("/home")}
              className="gradient-primary text-primary-foreground rounded-xl"
            >
              Go to Home
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            {transactions.map((txn) => (
              <div
                key={txn.id}
                className="bg-card rounded-3xl p-6 border border-border hover-lift"
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-4">
                    <div className={`p-3 rounded-full ${getStatusColor(txn.status).split(' ')[0]}`}>
                      {getStatusIcon(txn.status)}
                    </div>
                    <div>
                      <div className="text-sm text-muted-foreground mb-1">Transaction ID</div>
                      <div className="font-bold text-lg">{txn.id}</div>
                      {txn.status === 'under_review' && (
                        <div className="text-xs text-warning mt-1 font-medium flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          Transaction is under review
                        </div>
                      )}
                    </div>
                  </div>
                  <div className={`px-4 py-2 rounded-full text-sm font-bold border ${getStatusColor(txn.status)}`}>
                    {getStatusText(txn.status)}
                  </div>
                </div>

                <div className="grid md:grid-cols-2 gap-4 mb-4">
                  <div>
                    <div className="text-sm text-muted-foreground mb-1">Loan ID</div>
                    <div className="font-semibold">GL-{txn.loanId}</div>
                  </div>
                  <div>
                    <div className="text-sm text-muted-foreground mb-1">Payment Method</div>
                    <div className="font-semibold">{txn.method}</div>
                  </div>
                  <div>
                    <div className="text-sm text-muted-foreground mb-1">Loan Amount</div>
                    <div className="font-semibold text-accent">₹{txn.loanAmount?.toLocaleString()}</div>
                  </div>
                  <div>
                    <div className="text-sm text-muted-foreground mb-1">Payment Amount</div>
                    <div className="font-bold text-lg text-success">₹{txn.amount.toLocaleString()}</div>
                  </div>
                </div>

                <div className="pt-4 border-t border-border">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-sm text-muted-foreground mb-1">Transaction Date</div>
                      <div className="font-medium">{formatDate(txn.date)}</div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm text-muted-foreground mb-1">Loan Status</div>
                      <div className={`font-semibold ${
                        txn.loanStatus === 'payment_validation' ? 'text-warning animate-pulse' :
                        txn.loanStatus === 'processing' ? 'text-processing' :
                        txn.loanStatus === 'completed' ? 'text-success' :
                        txn.loanStatus === 'approved' ? 'text-success' :
                        'text-muted-foreground'
                      }`}>
                        {txn.loanStatus === 'payment_validation' ? 'Under Review' :
                         txn.loanStatus ? txn.loanStatus.charAt(0).toUpperCase() + txn.loanStatus.slice(1).replace('_', ' ') : 'N/A'}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Summary Card */}
        {transactions.length > 0 && (
          <div className="mt-8 bg-gradient-hero rounded-3xl p-6 text-white">
            <h3 className="text-xl font-bold mb-4">Transaction Summary</h3>
            <div className="grid md:grid-cols-3 gap-4">
              <div>
                <div className="text-sm text-white/70 mb-1">Total Transactions</div>
                <div className="text-2xl font-bold">{transactions.length}</div>
              </div>
              <div>
                <div className="text-sm text-white/70 mb-1">Total Amount Paid</div>
                <div className="text-2xl font-bold text-accent">
                  ₹{transactions.reduce((sum, txn) => sum + txn.amount, 0).toLocaleString()}
                </div>
              </div>
              <div>
                <div className="text-sm text-white/70 mb-1">Completed</div>
                <div className="text-2xl font-bold">
                  {transactions.filter(t => t.status === 'completed').length}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default TransactionHistory;

