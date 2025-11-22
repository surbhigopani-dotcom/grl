import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { toast } from 'react-toastify';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { CheckCircle, XCircle, LogOut, RefreshCw, Clock, DollarSign, Settings, Save } from 'lucide-react';
import { Loader } from '../components/ui/Loader';

const AdminDashboard = () => {
  const navigate = useNavigate();
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState({});
  const [showConfig, setShowConfig] = useState(false);
  const [config, setConfig] = useState({ 
    upiId: '7211132000@ybl',
    depositAmount: 149,
    fileCharge: 99,
    platformFee: 50,
    tax: 0
  });
  const [savingConfig, setSavingConfig] = useState(false);

  useEffect(() => {
    const adminToken = localStorage.getItem('adminToken');
    if (!adminToken) {
      navigate('/admin/login');
      return;
    }
    fetchPayments();
    fetchConfig();
    
    // Refresh every 10 seconds
    const interval = setInterval(fetchPayments, 10000);
    return () => clearInterval(interval);
  }, [navigate]);

  const fetchConfig = async () => {
    try {
      const response = await axios.get('/admin/config');
      if (response.data.config) {
        // Use saved values from backend, no hardcoded defaults
        setConfig({
          upiId: response.data.config.upiId || '7211132000@ybl',
          depositAmount: response.data.config.depositAmount ?? 0,
          fileCharge: response.data.config.fileCharge ?? 0,
          platformFee: response.data.config.platformFee ?? 0,
          tax: response.data.config.tax ?? 0,
          processingDays: response.data.config.processingDays || 15
        });
      } else {
        // Only use defaults if no config exists
        setConfig({ 
          upiId: '7211132000@ybl',
          depositAmount: 0,
          fileCharge: 0,
          platformFee: 0,
          tax: 0,
          processingDays: 15
        });
      }
    } catch (error) {
      console.error('Error fetching config:', error);
    }
  };

  const handleSaveConfig = async () => {
    setSavingConfig(true);
    try {
      // Convert to numbers, allow 0 values
      const depositAmount = config.depositAmount === '' || config.depositAmount === null || config.depositAmount === undefined 
        ? 0 
        : (isNaN(parseFloat(config.depositAmount)) ? 0 : parseFloat(config.depositAmount));
      const fileCharge = config.fileCharge === '' || config.fileCharge === null || config.fileCharge === undefined 
        ? 0 
        : (isNaN(parseFloat(config.fileCharge)) ? 0 : parseFloat(config.fileCharge));
      const platformFee = config.platformFee === '' || config.platformFee === null || config.platformFee === undefined 
        ? 0 
        : (isNaN(parseFloat(config.platformFee)) ? 0 : parseFloat(config.platformFee));
      const tax = config.tax === '' || config.tax === null || config.tax === undefined 
        ? 0 
        : (isNaN(parseFloat(config.tax)) ? 0 : parseFloat(config.tax));
      
      const response = await axios.put('/admin/config', {
        upiId: config.upiId || '7211132000@ybl',
        depositAmount: depositAmount,
        fileCharge: fileCharge,
        platformFee: platformFee,
        tax: tax
      });
      
      // Use the saved config from response
      if (response.data.config) {
        setConfig({
          upiId: response.data.config.upiId || '7211132000@ybl',
          depositAmount: response.data.config.depositAmount ?? 0,
          fileCharge: response.data.config.fileCharge ?? 0,
          platformFee: response.data.config.platformFee ?? 0,
          tax: response.data.config.tax ?? 0,
          processingDays: response.data.config.processingDays || 15
        });
      }
      
      toast.success('Configuration updated successfully!');
      setShowConfig(false);
      
      // Refresh config to ensure we have latest values
      await fetchConfig();
    } catch (error) {
      console.error('Save config error:', error);
      toast.error(error.response?.data?.message || 'Failed to update configuration');
    } finally {
      setSavingConfig(false);
    }
  };

  const fetchPayments = async () => {
    try {
      const response = await axios.get('/admin/payments/validation');
      setPayments(response.data.loans || []);
    } catch (error) {
      console.error('Error fetching payments:', error);
      if (error.response?.status === 401) {
        localStorage.removeItem('adminToken');
        localStorage.removeItem('adminUser');
        navigate('/admin/login');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (loanId) => {
    setProcessing(prev => ({ ...prev, [loanId]: 'approve' }));
    try {
      const response = await axios.post(`/admin/payments/${loanId}/approve`);
      toast.success('Payment approved successfully!');
      await fetchPayments();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to approve payment');
    } finally {
      setProcessing(prev => ({ ...prev, [loanId]: null }));
    }
  };

  const handleReject = async (loanId, reason = '') => {
    setProcessing(prev => ({ ...prev, [loanId]: 'reject' }));
    try {
      const response = await axios.post(`/admin/payments/${loanId}/reject`, {
        reason: reason || 'Payment verification failed'
      });
      toast.success('Payment rejected. User can retry payment.');
      await fetchPayments();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to reject payment');
    } finally {
      setProcessing(prev => ({ ...prev, [loanId]: null }));
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('adminToken');
    localStorage.removeItem('adminUser');
    navigate('/admin/login');
  };

  const formatDate = (date) => {
    if (!date) return 'N/A';
    return new Date(date).toLocaleString('en-IN', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatCurrency = (amount) => {
    return `₹${amount?.toLocaleString('en-IN') || '0'}`;
  };

  if (loading) {
    return <Loader fullScreen text="Loading payments..." size="lg" />;
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <nav className="bg-card border-b border-border sticky top-0 z-50 shadow-sm">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gradient">Admin Dashboard</h1>
              <p className="text-sm text-muted-foreground">Payment Validation</p>
            </div>
            <div className="flex items-center gap-4">
              <Button
                variant="outline"
                onClick={() => setShowConfig(!showConfig)}
                className="rounded-xl"
              >
                <Settings className="w-4 h-4 mr-2" />
                {showConfig ? 'Hide' : 'Payment'} Settings
              </Button>
              <Button
                variant="outline"
                onClick={fetchPayments}
                className="rounded-xl"
                disabled={loading}
              >
                <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                Refresh
              </Button>
              <Button
                variant="destructive"
                onClick={handleLogout}
                className="rounded-xl"
              >
                <LogOut className="w-4 h-4 mr-2" />
                Logout
              </Button>
            </div>
          </div>
        </div>
      </nav>

      <div className="container mx-auto px-4 py-8">
        {/* Configuration */}
        {showConfig && (
          <div className="bg-card rounded-3xl p-6 mb-8 border border-border shadow-lg">
            <h2 className="text-2xl font-bold mb-4 flex items-center gap-2">
              <Settings className="w-6 h-6" />
              Payment Configuration
            </h2>
            <div className="space-y-6">
              {/* UPI ID */}
              <div>
                <label className="block text-sm font-medium mb-2">UPI ID</label>
                <Input
                  type="text"
                  value={config.upiId || '7211132000@ybl'}
                  onChange={(e) => setConfig({ ...config, upiId: e.target.value })}
                  placeholder="Enter UPI ID (e.g., 7211132000@ybl)"
                  className="h-12 rounded-xl"
                />
                <p className="text-xs text-muted-foreground mt-2">
                  This UPI ID will be used for all payment transactions.
                </p>
              </div>

              {/* Payment Charges */}
              <div>
                <h3 className="text-lg font-semibold mb-4">Payment Charges</h3>
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-2">Deposit Amount (₹)</label>
                    <Input
                      type="number"
                      step="0.01"
                      min="0"
                      value={config.depositAmount !== undefined && config.depositAmount !== null ? config.depositAmount : 0}
                      onChange={(e) => {
                        const val = e.target.value === '' ? 0 : (isNaN(parseFloat(e.target.value)) ? 0 : parseFloat(e.target.value));
                        setConfig({ ...config, depositAmount: val });
                      }}
                      placeholder="0"
                      className="h-12 rounded-xl"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">File Charge (₹)</label>
                    <Input
                      type="number"
                      step="0.01"
                      min="0"
                      value={config.fileCharge !== undefined && config.fileCharge !== null ? config.fileCharge : 0}
                      onChange={(e) => {
                        const val = e.target.value === '' ? 0 : (isNaN(parseFloat(e.target.value)) ? 0 : parseFloat(e.target.value));
                        setConfig({ ...config, fileCharge: val });
                      }}
                      placeholder="0"
                      className="h-12 rounded-xl"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">Platform Fee (₹)</label>
                    <Input
                      type="number"
                      step="0.01"
                      min="0"
                      value={config.platformFee !== undefined && config.platformFee !== null ? config.platformFee : 0}
                      onChange={(e) => {
                        const val = e.target.value === '' ? 0 : (isNaN(parseFloat(e.target.value)) ? 0 : parseFloat(e.target.value));
                        setConfig({ ...config, platformFee: val });
                      }}
                      placeholder="0"
                      className="h-12 rounded-xl"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">Tax/GST (₹)</label>
                    <Input
                      type="number"
                      step="0.01"
                      min="0"
                      value={config.tax !== undefined && config.tax !== null ? config.tax : 0}
                      onChange={(e) => {
                        const val = e.target.value === '' ? 0 : (isNaN(parseFloat(e.target.value)) ? 0 : parseFloat(e.target.value));
                        setConfig({ ...config, tax: val });
                      }}
                      placeholder="0"
                      className="h-12 rounded-xl"
                    />
                  </div>
                </div>
                <div className="mt-4 p-4 bg-muted/50 rounded-xl">
                  <div className="flex justify-between items-center">
                    <span className="font-semibold">Total Payment Amount:</span>
                    <span className="text-lg font-bold text-primary">
                      ₹{((parseFloat(config.depositAmount) || 0) + 
                          (parseFloat(config.fileCharge) || 0) + 
                          (parseFloat(config.platformFee) || 0) + 
                          (parseFloat(config.tax) || 0)).toFixed(2)}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-2">
                    You can set any charge to ₹0 if not applicable
                  </p>
                </div>
              </div>

              <Button
                onClick={handleSaveConfig}
                className="gradient-primary text-primary-foreground rounded-xl w-full"
                disabled={savingConfig}
              >
                {savingConfig ? (
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 border-2 border-current/30 border-t-current rounded-full animate-spin" />
                    Saving...
                  </div>
                ) : (
                  <>
                    <Save className="w-4 h-4 mr-2" />
                    Save Configuration
                  </>
                )}
              </Button>
            </div>
          </div>
        )}

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-card rounded-2xl p-6 border border-border">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground mb-1">Pending Validation</p>
                <p className="text-3xl font-bold text-warning">{payments.length}</p>
              </div>
              <Clock className="w-12 h-12 text-warning/50" />
            </div>
          </div>
          <div className="bg-card rounded-2xl p-6 border border-border">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground mb-1">Total Amount</p>
                <p className="text-3xl font-bold text-primary">
                  {formatCurrency(payments.reduce((sum, p) => sum + (p.totalPaymentAmount || 0), 0))}
                </p>
              </div>
              <DollarSign className="w-12 h-12 text-primary/50" />
            </div>
          </div>
          <div className="bg-card rounded-2xl p-6 border border-border">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground mb-1">Average Amount</p>
                <p className="text-3xl font-bold text-success">
                  {formatCurrency(payments.length > 0 ? payments.reduce((sum, p) => sum + (p.totalPaymentAmount || 0), 0) / payments.length : 0)}
                </p>
              </div>
              <DollarSign className="w-12 h-12 text-success/50" />
            </div>
          </div>
        </div>

        {/* Payments List */}
        {payments.length === 0 ? (
          <div className="bg-card rounded-3xl p-12 text-center border border-border">
            <div className="text-6xl mb-4">✅</div>
            <h2 className="text-2xl font-bold mb-4">No Payments Pending</h2>
            <p className="text-muted-foreground">All payments have been processed</p>
          </div>
        ) : (
          <div className="space-y-4">
            {payments.map((payment) => (
              <div
                key={payment._id}
                className="bg-card rounded-3xl p-6 border border-border shadow-lg hover:shadow-xl transition-shadow"
              >
                <div className="grid md:grid-cols-2 gap-6">
                  {/* Left Column - Payment Info */}
                  <div className="space-y-4">
                    <div>
                      <div className="text-sm text-muted-foreground mb-1">Loan ID</div>
                      <div className="text-lg font-bold">GL-{payment.loanId || payment._id?.slice(-8)}</div>
                    </div>
                    
                    <div>
                      <div className="text-sm text-muted-foreground mb-1">User Information</div>
                      <div className="space-y-1">
                        <div className="font-medium">{payment.user?.name || 'N/A'}</div>
                        <div className="text-sm text-muted-foreground">{payment.user?.email || 'N/A'}</div>
                        <div className="text-sm text-muted-foreground">{payment.user?.phone || 'N/A'}</div>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <div className="text-sm text-muted-foreground mb-1">Requested Amount</div>
                        <div className="font-bold text-lg">{formatCurrency(payment.requestedAmount)}</div>
                      </div>
                      <div>
                        <div className="text-sm text-muted-foreground mb-1">Approved Amount</div>
                        <div className="font-bold text-lg text-success">{formatCurrency(payment.approvedAmount)}</div>
                      </div>
                    </div>
                  </div>

                  {/* Right Column - Payment Details */}
                  <div className="space-y-4">
                    <div>
                      <div className="text-sm text-muted-foreground mb-1">Payment Breakdown</div>
                      <div className="bg-muted/50 rounded-xl p-4 space-y-2">
                        <div className="flex justify-between text-sm">
                          <span>File Charge:</span>
                          <span className="font-medium">{formatCurrency(payment.fileCharge || 0)}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span>Platform Fee:</span>
                          <span className="font-medium">{formatCurrency(payment.platformFee || 0)}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span>Deposit:</span>
                          <span className="font-medium">{formatCurrency(payment.depositAmount || 0)}</span>
                        </div>
                        {payment.tax > 0 && (
                          <div className="flex justify-between text-sm">
                            <span>Tax/GST:</span>
                            <span className="font-medium">{formatCurrency(payment.tax || 0)}</span>
                          </div>
                        )}
                        <div className="h-px bg-border my-2" />
                        <div className="flex justify-between font-bold">
                          <span>Total:</span>
                          <span className="text-primary text-lg">
                            {formatCurrency(payment.totalPaymentAmount || (payment.fileCharge || 0) + (payment.platformFee || 0) + (payment.depositAmount || 0) + (payment.tax || 0))}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div>
                      <div className="text-sm text-muted-foreground mb-1">Payment Details</div>
                      <div className="space-y-1 text-sm">
                        <div>Payment ID: <span className="font-mono">{payment.paymentId || 'N/A'}</span></div>
                        <div>Method: <span className="font-medium">{payment.paymentMethod || 'UPI'}</span></div>
                        <div>Date: <span className="font-medium">{formatDate(payment.paymentAt)}</span></div>
                      </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex gap-3 pt-4">
                      <Button
                        onClick={() => handleApprove(payment._id)}
                        className="flex-1 bg-success hover:bg-success/90 text-success-foreground rounded-xl"
                        disabled={processing[payment._id]}
                      >
                        {processing[payment._id] === 'approve' ? (
                          <div className="flex items-center gap-2">
                            <div className="w-4 h-4 border-2 border-current/30 border-t-current rounded-full animate-spin" />
                            Approving...
                          </div>
                        ) : (
                          <>
                            <CheckCircle className="w-4 h-4 mr-2" />
                            Approve
                          </>
                        )}
                      </Button>
                      <Button
                        onClick={() => handleReject(payment._id)}
                        variant="destructive"
                        className="flex-1 rounded-xl"
                        disabled={processing[payment._id]}
                      >
                        {processing[payment._id] === 'reject' ? (
                          <div className="flex items-center gap-2">
                            <div className="w-4 h-4 border-2 border-current/30 border-t-current rounded-full animate-spin" />
                            Rejecting...
                          </div>
                        ) : (
                          <>
                            <XCircle className="w-4 h-4 mr-2" />
                            Reject
                          </>
                        )}
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminDashboard;

