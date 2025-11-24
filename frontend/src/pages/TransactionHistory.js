import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import axios from 'axios';
import { toast } from 'react-toastify';
import { Button } from '../components/ui/Button';
import { ArrowLeft, CheckCircle, XCircle, Clock, CreditCard, Menu, X, Home, FileText, LogOut, History } from 'lucide-react';
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
      // Show transactions for loans that have payment info OR are in payment-related statuses
      const txns = loans
        .filter(loan => 
          (loan.depositPaid && loan.paymentAt) || 
          loan.status === 'payment_validation' || 
          loan.status === 'payment_pending' ||
          loan.status === 'payment_failed' ||
          loan.status === 'processing' ||
          (loan.paymentAt && loan.totalPaymentAmount > 0)
        )
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
        return <CheckCircle className="w-5 h-5 text-green-600" />;
      case 'under_review':
        return <Clock className="w-5 h-5 text-blue-600 animate-pulse" />;
      case 'pending':
        return <Clock className="w-5 h-5 text-yellow-600" />;
      case 'failed':
        return <XCircle className="w-5 h-5 text-red-600" />;
      default:
        return <Clock className="w-5 h-5 text-gray-500" />;
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
                Transaction History
              </div>
            </div>

            {/* Desktop Menu */}
            <div className="hidden md:flex gap-2 items-center">
              <Button
                variant="ghost"
                onClick={() => navigate('/my-loans')}
                className="rounded-xl text-gray-700 hover:bg-gray-50"
                style={{ fontFamily: 'Inter, system-ui, -apple-system, sans-serif' }}
              >
                <FileText className="w-4 h-4 mr-2" />
                My Loans
              </Button>
              <Button
                variant="outline"
                onClick={() => navigate("/home")}
                className="rounded-xl border-gray-300 text-gray-700 hover:bg-gray-50"
                style={{ fontFamily: 'Inter, system-ui, -apple-system, sans-serif' }}
              >
                <Home className="w-4 h-4 mr-2" />
                Home
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
              <Button
                variant="ghost"
                onClick={() => {
                  navigate('/my-loans');
                  setMobileMenuOpen(false);
                }}
                className="w-full rounded-xl justify-start text-gray-700"
                style={{ fontFamily: 'Inter, system-ui, -apple-system, sans-serif' }}
              >
                <FileText className="w-4 h-4 mr-2" />
                My Loan Applications
              </Button>
              <Button
                variant="outline"
                onClick={() => {
                  navigate("/home");
                  setMobileMenuOpen(false);
                }}
                className="w-full rounded-xl justify-start border-gray-300 text-gray-700"
                style={{ fontFamily: 'Inter, system-ui, -apple-system, sans-serif' }}
              >
                <Home className="w-4 h-4 mr-2" />
                Home
              </Button>
            </div>
          )}
        </div>
      </nav>

      <div className="max-w-lg mx-auto px-4 py-4 md:py-6">
        {/* Header */}
        <div className="mb-6 md:mb-8">
          <h1 className="text-2xl md:text-3xl font-bold text-gray-800 mb-2" style={{ fontFamily: 'Inter, system-ui, -apple-system, sans-serif' }}>
            Your Transactions
          </h1>
          <p className="text-sm md:text-base text-gray-600" style={{ fontFamily: 'Inter, system-ui, -apple-system, sans-serif' }}>
            View all your payment history and loan transactions
          </p>
        </div>

        {/* Transactions List */}
        {transactions.length === 0 ? (
          <div className="bg-white rounded-2xl md:rounded-3xl p-8 md:p-12 text-center border border-gray-200 shadow-lg">
            <div className="w-20 h-20 mx-auto mb-4 bg-[#14b8a6]/10 rounded-full flex items-center justify-center">
              <CreditCard className="w-10 h-10 text-[#14b8a6]" />
            </div>
            <h2 className="text-xl md:text-2xl font-bold text-gray-800 mb-3" style={{ fontFamily: 'Inter, system-ui, -apple-system, sans-serif' }}>
              No Transactions Yet
            </h2>
            <p className="text-gray-600 mb-6" style={{ fontFamily: 'Inter, system-ui, -apple-system, sans-serif' }}>
              Your payment transactions will appear here once you complete a loan payment.
            </p>
            <Button
              onClick={() => navigate("/home")}
              className="bg-[#14b8a6] hover:bg-[#0d9488] text-white rounded-xl px-8"
              style={{ fontFamily: 'Inter, system-ui, -apple-system, sans-serif' }}
            >
              Go to Home
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            {transactions.map((txn) => (
              <div
                key={txn.id}
                className="bg-white rounded-2xl md:rounded-3xl p-5 md:p-6 border border-gray-200 shadow-lg hover:shadow-xl transition-shadow"
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-4">
                    <div className={`p-3 rounded-full ${
                      txn.status === 'completed' ? 'bg-green-100' :
                      txn.status === 'under_review' ? 'bg-blue-100' :
                      txn.status === 'pending' ? 'bg-yellow-100' :
                      'bg-red-100'
                    }`}>
                      {getStatusIcon(txn.status)}
                    </div>
                    <div>
                      <div className="text-xs text-gray-500 mb-1" style={{ fontFamily: 'Inter, system-ui, -apple-system, sans-serif' }}>Transaction ID</div>
                      <div className="font-bold text-base text-gray-800" style={{ fontFamily: 'Inter, system-ui, -apple-system, sans-serif' }}>{txn.id?.slice(-12) || txn.id}</div>
                      {txn.status === 'under_review' && (
                        <div className="text-xs text-blue-600 mt-1 font-medium flex items-center gap-1" style={{ fontFamily: 'Inter, system-ui, -apple-system, sans-serif' }}>
                          <Clock className="w-3 h-3" />
                          Transaction is under review
                        </div>
                      )}
                    </div>
                  </div>
                  <div className={`px-3 py-1.5 rounded-full text-xs font-bold ${
                    txn.status === 'completed' ? 'bg-green-500 text-white' :
                    txn.status === 'under_review' ? 'bg-blue-500 text-white' :
                    txn.status === 'pending' ? 'bg-yellow-500 text-white' :
                    'bg-red-500 text-white'
                  }`} style={{ fontFamily: 'Inter, system-ui, -apple-system, sans-serif' }}>
                    {getStatusText(txn.status)}
                  </div>
                </div>

                <div className="grid md:grid-cols-2 gap-4 mb-4">
                  <div>
                    <div className="text-xs text-gray-500 mb-1" style={{ fontFamily: 'Inter, system-ui, -apple-system, sans-serif' }}>Loan ID</div>
                    <div className="font-semibold text-gray-800" style={{ fontFamily: 'Inter, system-ui, -apple-system, sans-serif' }}>GL-{txn.loanId}</div>
                  </div>
                  <div>
                    <div className="text-xs text-gray-500 mb-1" style={{ fontFamily: 'Inter, system-ui, -apple-system, sans-serif' }}>Payment Method</div>
                    <div className="font-semibold text-gray-800" style={{ fontFamily: 'Inter, system-ui, -apple-system, sans-serif' }}>{txn.method}</div>
                  </div>
                  <div>
                    <div className="text-xs text-gray-500 mb-1" style={{ fontFamily: 'Inter, system-ui, -apple-system, sans-serif' }}>Loan Amount</div>
                    <div className="font-semibold text-[#14b8a6]" style={{ fontFamily: 'Inter, system-ui, -apple-system, sans-serif' }}>₹{txn.loanAmount?.toLocaleString()}</div>
                  </div>
                  <div>
                    <div className="text-xs text-gray-500 mb-1" style={{ fontFamily: 'Inter, system-ui, -apple-system, sans-serif' }}>Payment Amount</div>
                    <div className="font-bold text-lg text-green-600" style={{ fontFamily: 'Inter, system-ui, -apple-system, sans-serif' }}>₹{txn.amount.toLocaleString()}</div>
                  </div>
                </div>

                <div className="pt-4 border-t border-gray-200">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-xs text-gray-500 mb-1" style={{ fontFamily: 'Inter, system-ui, -apple-system, sans-serif' }}>Transaction Date</div>
                      <div className="font-medium text-sm text-gray-800" style={{ fontFamily: 'Inter, system-ui, -apple-system, sans-serif' }}>{formatDate(txn.date)}</div>
                    </div>
                    <div className="text-right">
                      <div className="text-xs text-gray-500 mb-1" style={{ fontFamily: 'Inter, system-ui, -apple-system, sans-serif' }}>Loan Status</div>
                      <div className={`font-semibold text-sm ${
                        txn.loanStatus === 'payment_validation' ? 'text-blue-600' :
                        txn.loanStatus === 'processing' ? 'text-green-600' :
                        txn.loanStatus === 'completed' ? 'text-green-600' :
                        txn.loanStatus === 'approved' ? 'text-green-600' :
                        'text-gray-600'
                      }`} style={{ fontFamily: 'Inter, system-ui, -apple-system, sans-serif' }}>
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
          <div className="mt-6 md:mt-8 bg-gradient-to-r from-[#14b8a6] to-[#0d9488] rounded-2xl md:rounded-3xl p-5 md:p-6 text-white shadow-lg">
            <h3 className="text-lg md:text-xl font-bold mb-4" style={{ fontFamily: 'Inter, system-ui, -apple-system, sans-serif' }}>Transaction Summary</h3>
            <div className="grid md:grid-cols-3 gap-4">
              <div>
                <div className="text-xs md:text-sm text-white/80 mb-1" style={{ fontFamily: 'Inter, system-ui, -apple-system, sans-serif' }}>Total Transactions</div>
                <div className="text-xl md:text-2xl font-bold" style={{ fontFamily: 'Inter, system-ui, -apple-system, sans-serif' }}>{transactions.length}</div>
              </div>
              <div>
                <div className="text-xs md:text-sm text-white/80 mb-1" style={{ fontFamily: 'Inter, system-ui, -apple-system, sans-serif' }}>Total Amount Paid</div>
                <div className="text-xl md:text-2xl font-bold" style={{ fontFamily: 'Inter, system-ui, -apple-system, sans-serif' }}>
                  ₹{transactions.reduce((sum, txn) => sum + txn.amount, 0).toLocaleString()}
                </div>
              </div>
              <div>
                <div className="text-xs md:text-sm text-white/80 mb-1" style={{ fontFamily: 'Inter, system-ui, -apple-system, sans-serif' }}>Completed</div>
                <div className="text-xl md:text-2xl font-bold" style={{ fontFamily: 'Inter, system-ui, -apple-system, sans-serif' }}>
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

