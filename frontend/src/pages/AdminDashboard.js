import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { toast } from 'react-toastify';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { CheckCircle, XCircle, LogOut, RefreshCw, Clock, DollarSign, Settings, Save, Users, UserCheck, UserX, Percent, Search, Filter, Download, X, Eye, FileText, MapPin, Briefcase, CreditCard, Calendar } from 'lucide-react';
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
  const [activeTab, setActiveTab] = useState('payments'); // 'payments' or 'users'
  const [users, setUsers] = useState([]);
  const [userStats, setUserStats] = useState(null);
  const [usersLoading, setUsersLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterComplete, setFilterComplete] = useState('all'); // 'all', 'complete', 'incomplete'
  const [currentPage, setCurrentPage] = useState(1);
  const [usersPerPage] = useState(10);
  const [totalUsers, setTotalUsers] = useState(0);
  const [selectedUser, setSelectedUser] = useState(null);
  const [showUserDetails, setShowUserDetails] = useState(false);

  useEffect(() => {
    const adminToken = localStorage.getItem('adminToken');
    if (!adminToken) {
      navigate('/admin/login');
      return;
    }
    fetchPayments();
    fetchConfig();
    // Auto refresh removed - use manual refresh button instead
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

  const fetchUsers = useCallback(async (page = 1) => {
    setUsersLoading(true);
    try {
      const [usersResponse, statsResponse] = await Promise.all([
        axios.get(`/admin/users?page=${page}&limit=${usersPerPage}&search=${encodeURIComponent(searchTerm)}&filter=${filterComplete}`),
        axios.get('/admin/users/stats')
      ]);
      setUsers(usersResponse.data.users || []);
      setTotalUsers(usersResponse.data.total || 0);
      setUserStats(statsResponse.data);
      setCurrentPage(page);
    } catch (error) {
      console.error('Error fetching users:', error);
      if (error.response?.status === 401) {
        localStorage.removeItem('adminToken');
        navigate('/admin/login');
      }
    } finally {
      setUsersLoading(false);
    }
  }, [searchTerm, filterComplete, usersPerPage, navigate]);

  // Handle search and filter changes
  useEffect(() => {
    if (activeTab === 'users') {
      setCurrentPage(1);
      fetchUsers(1);
    }
  }, [searchTerm, filterComplete, activeTab, fetchUsers]);

  // Calculate pagination
  const totalPages = Math.ceil(totalUsers / usersPerPage);
  const startIndex = (currentPage - 1) * usersPerPage;
  const endIndex = startIndex + users.length;

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
                onClick={activeTab === 'payments' ? fetchPayments : fetchUsers}
                className="rounded-xl"
                disabled={loading || usersLoading}
              >
                <RefreshCw className={`w-4 h-4 mr-2 ${(loading || usersLoading) ? 'animate-spin' : ''}`} />
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
        {/* Tabs */}
        <div className="bg-card rounded-2xl p-2 mb-6 border border-border shadow-sm flex gap-2">
          <button
            onClick={() => {
              setActiveTab('payments');
              fetchPayments();
            }}
            className={`flex-1 py-3 px-4 rounded-xl font-semibold transition-all ${
              activeTab === 'payments'
                ? 'bg-[#14b8a6] text-white shadow-md'
                : 'bg-transparent text-muted-foreground hover:bg-muted'
            }`}
          >
            <div className="flex items-center justify-center gap-2">
              <DollarSign className="w-5 h-5" />
              <span>Payment Validation</span>
            </div>
          </button>
          <button
            onClick={() => {
              setActiveTab('users');
              fetchUsers();
            }}
            className={`flex-1 py-3 px-4 rounded-xl font-semibold transition-all ${
              activeTab === 'users'
                ? 'bg-[#14b8a6] text-white shadow-md'
                : 'bg-transparent text-muted-foreground hover:bg-muted'
            }`}
          >
            <div className="flex items-center justify-center gap-2">
              <Users className="w-5 h-5" />
              <span>User Management</span>
            </div>
          </button>
        </div>

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

        {/* Stats - Dynamic based on active tab */}
        {activeTab === 'payments' ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <div className="bg-card rounded-2xl p-6 border border-border shadow-lg">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Pending Validation</p>
                  <p className="text-3xl font-bold text-warning">{payments.length}</p>
                </div>
                <Clock className="w-12 h-12 text-warning/50" />
              </div>
            </div>
            <div className="bg-card rounded-2xl p-6 border border-border shadow-lg">
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
            <div className="bg-card rounded-2xl p-6 border border-border shadow-lg">
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
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl p-6 text-white shadow-lg">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-blue-100 mb-1">Total Users</p>
                  <p className="text-3xl font-bold">{userStats?.totalUsers || 0}</p>
                </div>
                <Users className="w-12 h-12 text-white/50" />
              </div>
            </div>
            <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-2xl p-6 text-white shadow-lg">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-green-100 mb-1">Complete Profiles</p>
                  <p className="text-3xl font-bold">{userStats?.completeProfiles || 0}</p>
                </div>
                <UserCheck className="w-12 h-12 text-white/50" />
              </div>
            </div>
            <div className="bg-gradient-to-br from-orange-500 to-orange-600 rounded-2xl p-6 text-white shadow-lg">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-orange-100 mb-1">Incomplete Profiles</p>
                  <p className="text-3xl font-bold">{userStats?.incompleteProfiles || 0}</p>
                </div>
                <UserX className="w-12 h-12 text-white/50" />
              </div>
            </div>
            <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-2xl p-6 text-white shadow-lg">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-purple-100 mb-1">Avg. Completion</p>
                  <p className="text-3xl font-bold">{userStats?.completionRate || 0}%</p>
                </div>
                <Percent className="w-12 h-12 text-white/50" />
              </div>
            </div>
          </div>
        )}

        {/* User Management Section */}
        {activeTab === 'users' && (
          <>
            {usersLoading ? (
              <Loader fullScreen text="Loading users..." size="lg" />
            ) : (
              <>
                {/* Search and Filter */}
                <div className="bg-card rounded-2xl p-4 mb-6 border border-border shadow-sm">
                  <div className="flex flex-col md:flex-row gap-4">
                    <div className="flex-1 relative">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                      <Input
                        type="text"
                        placeholder="Search by name, phone, or email..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-10 h-12 rounded-xl"
                      />
                    </div>
                    <div className="flex gap-2">
                      <select
                        value={filterComplete}
                        onChange={(e) => setFilterComplete(e.target.value)}
                        className="px-4 py-2 rounded-xl border border-border bg-background text-foreground"
                      >
                        <option value="all">All Users</option>
                        <option value="complete">Complete Profiles</option>
                        <option value="incomplete">Incomplete Profiles</option>
                      </select>
                    </div>
                  </div>
                </div>

                {/* Missing Fields Summary */}
                {userStats && (
                  <div className="bg-card rounded-2xl p-6 mb-6 border border-border shadow-lg">
                    <h3 className="text-xl font-bold mb-4 flex items-center gap-2">
                      <Filter className="w-5 h-5" />
                      Missing Details Summary
                    </h3>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <div className="bg-red-50 border border-red-200 rounded-xl p-3">
                        <p className="text-sm text-red-600 mb-1">Missing Email</p>
                        <p className="text-2xl font-bold text-red-700">{userStats.missingFields?.email || 0}</p>
                      </div>
                      <div className="bg-orange-50 border border-orange-200 rounded-xl p-3">
                        <p className="text-sm text-orange-600 mb-1">Missing DOB</p>
                        <p className="text-2xl font-bold text-orange-700">{userStats.missingFields?.dateOfBirth || 0}</p>
                      </div>
                      <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-3">
                        <p className="text-sm text-yellow-600 mb-1">Missing Address</p>
                        <p className="text-2xl font-bold text-yellow-700">{userStats.missingFields?.address || 0}</p>
                      </div>
                      <div className="bg-blue-50 border border-blue-200 rounded-xl p-3">
                        <p className="text-sm text-blue-600 mb-1">Missing Aadhar</p>
                        <p className="text-2xl font-bold text-blue-700">{userStats.missingFields?.aadharNumber || 0}</p>
                      </div>
                      <div className="bg-indigo-50 border border-indigo-200 rounded-xl p-3">
                        <p className="text-sm text-indigo-600 mb-1">Missing PAN</p>
                        <p className="text-2xl font-bold text-indigo-700">{userStats.missingFields?.panNumber || 0}</p>
                      </div>
                      <div className="bg-purple-50 border border-purple-200 rounded-xl p-3">
                        <p className="text-sm text-purple-600 mb-1">Missing Aadhar Doc</p>
                        <p className="text-2xl font-bold text-purple-700">{userStats.missingFields?.aadharCard || 0}</p>
                      </div>
                      <div className="bg-pink-50 border border-pink-200 rounded-xl p-3">
                        <p className="text-sm text-pink-600 mb-1">Missing PAN Doc</p>
                        <p className="text-2xl font-bold text-pink-700">{userStats.missingFields?.panCard || 0}</p>
                      </div>
                      <div className="bg-teal-50 border border-teal-200 rounded-xl p-3">
                        <p className="text-sm text-teal-600 mb-1">Missing Selfie</p>
                        <p className="text-2xl font-bold text-teal-700">{userStats.missingFields?.selfie || 0}</p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Users List */}
                {users.length === 0 ? (
                  <div className="bg-card rounded-3xl p-12 text-center border border-border">
                    <Users className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
                    <h2 className="text-2xl font-bold mb-4">No Users Found</h2>
                    <p className="text-muted-foreground">
                      {searchTerm ? 'Try adjusting your search criteria' : 'No users registered yet'}
                    </p>
                  </div>
                ) : (
                  <div>
                    <div className="space-y-4">
                      {users.map((user) => (
                        <div
                          key={user._id}
                          className="bg-card rounded-2xl p-6 border border-border shadow-lg hover:shadow-xl transition-shadow cursor-pointer"
                          onClick={() => {
                            setSelectedUser(user);
                            setShowUserDetails(true);
                          }}
                        >
                          <div className="grid md:grid-cols-3 gap-6">
                            {/* User Info */}
                            <div className="space-y-3">
                              <div>
                                <div className="text-sm text-muted-foreground mb-1">User Information</div>
                                <div className="font-bold text-lg">{user.name || 'N/A'}</div>
                                <div className="text-sm text-muted-foreground">{user.phone || 'N/A'}</div>
                                <div className="text-sm text-muted-foreground">{user.email || 'No Email'}</div>
                              </div>
                              <div>
                                <div className="text-sm text-muted-foreground mb-1">Registration Date</div>
                                <div className="text-sm font-medium">
                                  {user.createdAt ? new Date(user.createdAt).toLocaleDateString('en-IN') : 'N/A'}
                                </div>
                              </div>
                            </div>

                            {/* Profile Completion */}
                            <div className="space-y-3">
                              <div>
                                <div className="flex items-center justify-between mb-2">
                                  <span className="text-sm font-semibold">Profile Completion</span>
                                  <span className={`text-lg font-bold ${
                                    user.completionPercentage >= 100 ? 'text-green-600' :
                                    user.completionPercentage >= 70 ? 'text-yellow-600' :
                                    'text-red-600'
                                  }`}>
                                    {user.completionPercentage}%
                                  </span>
                                </div>
                                <div className="w-full bg-gray-200 rounded-full h-3">
                                  <div
                                    className={`h-3 rounded-full transition-all ${
                                      user.completionPercentage >= 100 ? 'bg-green-500' :
                                      user.completionPercentage >= 70 ? 'bg-yellow-500' :
                                      'bg-red-500'
                                    }`}
                                    style={{ width: `${user.completionPercentage}%` }}
                                  />
                                </div>
                                <div className="text-xs text-muted-foreground mt-1">
                                  {user.completedFields} of {user.totalFields} fields completed
                                </div>
                              </div>
                              <div>
                                <div className="text-sm text-muted-foreground mb-1">Status</div>
                                <div className="flex items-center gap-2">
                                  {user.isProfileComplete ? (
                                    <>
                                      <CheckCircle className="w-4 h-4 text-green-600" />
                                      <span className="text-sm font-semibold text-green-600">Complete</span>
                                    </>
                                  ) : (
                                    <>
                                      <XCircle className="w-4 h-4 text-red-600" />
                                      <span className="text-sm font-semibold text-red-600">Incomplete</span>
                                    </>
                                  )}
                                </div>
                              </div>
                            </div>

                            {/* Missing Details */}
                            <div className="space-y-3">
                              <div>
                                <div className="text-sm font-semibold mb-2">Missing Details</div>
                                {user.missingFields && user.missingFields.length > 0 ? (
                                  <div className="flex flex-wrap gap-2">
                                    {user.missingFields.map((field, idx) => (
                                      <span
                                        key={idx}
                                        className="px-2 py-1 bg-red-100 text-red-700 text-xs rounded-lg font-medium"
                                      >
                                        {field}
                                      </span>
                                    ))}
                                  </div>
                                ) : (
                                  <div className="flex items-center gap-2 text-green-600">
                                    <CheckCircle className="w-4 h-4" />
                                    <span className="text-sm font-medium">All details complete</span>
                                  </div>
                                )}
                              </div>
                              <div>
                                <div className="text-sm text-muted-foreground mb-1">Loan Statistics</div>
                                <div className="text-sm">
                                  Applied: <span className="font-semibold">{user.totalLoansApplied || 0}</span> | 
                                  Approved: <span className="font-semibold text-green-600">{user.totalLoansApproved || 0}</span>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                    
                    {/* Pagination */}
                    {totalPages > 1 && (
                      <div className="mt-6 flex items-center justify-between bg-card rounded-2xl p-4 border border-border">
                        <div className="text-sm text-muted-foreground">
                          Showing {startIndex + 1} to {Math.min(endIndex, totalUsers)} of {totalUsers} users
                        </div>
                        <div className="flex gap-2">
                          <Button
                            variant="outline"
                            onClick={() => fetchUsers(currentPage - 1)}
                            disabled={currentPage === 1 || usersLoading}
                            className="rounded-xl"
                          >
                            Previous
                          </Button>
                          <div className="flex items-center gap-2">
                            {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                              let pageNum;
                              if (totalPages <= 5) {
                                pageNum = i + 1;
                              } else if (currentPage <= 3) {
                                pageNum = i + 1;
                              } else if (currentPage >= totalPages - 2) {
                                pageNum = totalPages - 4 + i;
                              } else {
                                pageNum = currentPage - 2 + i;
                              }
                              return (
                                <Button
                                  key={pageNum}
                                  variant={currentPage === pageNum ? "default" : "outline"}
                                  onClick={() => fetchUsers(pageNum)}
                                  disabled={usersLoading}
                                  className={`rounded-xl ${currentPage === pageNum ? 'bg-[#14b8a6] text-white' : ''}`}
                                >
                                  {pageNum}
                                </Button>
                              );
                            })}
                          </div>
                          <Button
                            variant="outline"
                            onClick={() => fetchUsers(currentPage + 1)}
                            disabled={currentPage === totalPages || usersLoading}
                            className="rounded-xl"
                          >
                            Next
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </>
            )}
          </>
        )}

        {/* Payments List */}
        {activeTab === 'payments' && (
          <>
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
          </>
        )}
      </div>

      {/* User Details Modal */}
      {showUserDetails && selectedUser && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setShowUserDetails(false)}>
          <div className="bg-card rounded-3xl max-w-4xl w-full max-h-[90vh] overflow-y-auto border border-border shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="sticky top-0 bg-card border-b border-border p-6 flex items-center justify-between">
              <h2 className="text-2xl font-bold">User Details</h2>
              <Button
                variant="ghost"
                onClick={() => setShowUserDetails(false)}
                className="rounded-xl"
              >
                <X className="w-5 h-5" />
              </Button>
            </div>
            
            <div className="p-6 space-y-6">
              {/* Basic Information */}
              <div className="bg-muted/30 rounded-2xl p-6">
                <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
                  <Users className="w-5 h-5" />
                  Basic Information
                </h3>
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <div className="text-sm text-muted-foreground mb-1">Name</div>
                    <div className="font-semibold">{selectedUser.name || 'N/A'}</div>
                  </div>
                  <div>
                    <div className="text-sm text-muted-foreground mb-1">Phone</div>
                    <div className="font-semibold">{selectedUser.phone || 'N/A'}</div>
                  </div>
                  <div>
                    <div className="text-sm text-muted-foreground mb-1">Email</div>
                    <div className="font-semibold">{selectedUser.email || 'No Email'}</div>
                  </div>
                  <div>
                    <div className="text-sm text-muted-foreground mb-1">Date of Birth</div>
                    <div className="font-semibold">
                      {selectedUser.dateOfBirth ? new Date(selectedUser.dateOfBirth).toLocaleDateString('en-IN') : 'Not Provided'}
                    </div>
                  </div>
                  <div>
                    <div className="text-sm text-muted-foreground mb-1">Registration Date</div>
                    <div className="font-semibold">
                      {selectedUser.createdAt ? new Date(selectedUser.createdAt).toLocaleString('en-IN') : 'N/A'}
                    </div>
                  </div>
                  <div>
                    <div className="text-sm text-muted-foreground mb-1">Last Updated</div>
                    <div className="font-semibold">
                      {selectedUser.updatedAt ? new Date(selectedUser.updatedAt).toLocaleString('en-IN') : 'N/A'}
                    </div>
                  </div>
                </div>
              </div>

              {/* Address Information */}
              <div className="bg-muted/30 rounded-2xl p-6">
                <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
                  <MapPin className="w-5 h-5" />
                  Address Information
                </h3>
                <div className="grid md:grid-cols-2 gap-4">
                  <div className="md:col-span-2">
                    <div className="text-sm text-muted-foreground mb-1">Address</div>
                    <div className="font-semibold">{selectedUser.address || 'Not Provided'}</div>
                  </div>
                  <div>
                    <div className="text-sm text-muted-foreground mb-1">City</div>
                    <div className="font-semibold">{selectedUser.city || 'Not Provided'}</div>
                  </div>
                  <div>
                    <div className="text-sm text-muted-foreground mb-1">State</div>
                    <div className="font-semibold">{selectedUser.state || 'Not Provided'}</div>
                  </div>
                  <div>
                    <div className="text-sm text-muted-foreground mb-1">Pincode</div>
                    <div className="font-semibold">{selectedUser.pincode || 'Not Provided'}</div>
                  </div>
                </div>
              </div>

              {/* Employment Information */}
              <div className="bg-muted/30 rounded-2xl p-6">
                <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
                  <Briefcase className="w-5 h-5" />
                  Employment Information
                </h3>
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <div className="text-sm text-muted-foreground mb-1">Employment Type</div>
                    <div className="font-semibold">
                      {selectedUser.employmentType ? selectedUser.employmentType.replace('_', ' ').toUpperCase() : 'Not Provided'}
                    </div>
                  </div>
                  <div>
                    <div className="text-sm text-muted-foreground mb-1">Company Name</div>
                    <div className="font-semibold">{selectedUser.companyName || 'Not Provided'}</div>
                  </div>
                </div>
              </div>

              {/* Document Information */}
              <div className="bg-muted/30 rounded-2xl p-6">
                <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
                  <FileText className="w-5 h-5" />
                  Document Information
                </h3>
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <div className="text-sm text-muted-foreground mb-1">Aadhar Number</div>
                    <div className="font-semibold">{selectedUser.aadharNumber || 'Not Provided'}</div>
                    <div className="text-xs text-muted-foreground mt-1">
                      {selectedUser.aadharCardUrl ? (
                        <a href={selectedUser.aadharCardUrl} target="_blank" rel="noopener noreferrer" className="text-[#14b8a6] hover:underline">
                          View Document
                        </a>
                      ) : (
                        'Document not uploaded'
                      )}
                    </div>
                  </div>
                  <div>
                    <div className="text-sm text-muted-foreground mb-1">PAN Number</div>
                    <div className="font-semibold">{selectedUser.panNumber || 'Not Provided'}</div>
                    <div className="text-xs text-muted-foreground mt-1">
                      {selectedUser.panCardUrl ? (
                        <a href={selectedUser.panCardUrl} target="_blank" rel="noopener noreferrer" className="text-[#14b8a6] hover:underline">
                          View Document
                        </a>
                      ) : (
                        'Document not uploaded'
                      )}
                    </div>
                  </div>
                  <div>
                    <div className="text-sm text-muted-foreground mb-1">Selfie</div>
                    <div className="text-xs text-muted-foreground">
                      {selectedUser.selfieUrl ? (
                        <a href={selectedUser.selfieUrl} target="_blank" rel="noopener noreferrer" className="text-[#14b8a6] hover:underline">
                          View Selfie
                        </a>
                      ) : (
                        'Selfie not uploaded'
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Bank Information */}
              {(selectedUser.bankAccountNumber || selectedUser.ifscCode || selectedUser.bankName) && (
                <div className="bg-muted/30 rounded-2xl p-6">
                  <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
                    <CreditCard className="w-5 h-5" />
                    Bank Information
                  </h3>
                  <div className="grid md:grid-cols-2 gap-4">
                    <div>
                      <div className="text-sm text-muted-foreground mb-1">Account Holder Name</div>
                      <div className="font-semibold">{selectedUser.accountHolderName || 'Not Provided'}</div>
                    </div>
                    <div>
                      <div className="text-sm text-muted-foreground mb-1">Bank Name</div>
                      <div className="font-semibold">{selectedUser.bankName || 'Not Provided'}</div>
                    </div>
                    <div>
                      <div className="text-sm text-muted-foreground mb-1">Account Number</div>
                      <div className="font-semibold font-mono">{selectedUser.bankAccountNumber || 'Not Provided'}</div>
                    </div>
                    <div>
                      <div className="text-sm text-muted-foreground mb-1">IFSC Code</div>
                      <div className="font-semibold font-mono">{selectedUser.ifscCode || 'Not Provided'}</div>
                    </div>
                  </div>
                </div>
              )}

              {/* Profile Completion Status */}
              <div className="bg-muted/30 rounded-2xl p-6">
                <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
                  <Calendar className="w-5 h-5" />
                  Profile Status
                </h3>
                <div className="space-y-4">
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-semibold">Completion Percentage</span>
                      <span className={`text-lg font-bold ${
                        selectedUser.completionPercentage >= 100 ? 'text-green-600' :
                        selectedUser.completionPercentage >= 70 ? 'text-yellow-600' :
                        'text-red-600'
                      }`}>
                        {selectedUser.completionPercentage}%
                      </span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-3">
                      <div
                        className={`h-3 rounded-full transition-all ${
                          selectedUser.completionPercentage >= 100 ? 'bg-green-500' :
                          selectedUser.completionPercentage >= 70 ? 'bg-yellow-500' :
                          'bg-red-500'
                        }`}
                        style={{ width: `${selectedUser.completionPercentage}%` }}
                      />
                    </div>
                    <div className="text-xs text-muted-foreground mt-1">
                      {selectedUser.completedFields} of {selectedUser.totalFields} fields completed
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {selectedUser.isProfileComplete ? (
                      <>
                        <CheckCircle className="w-5 h-5 text-green-600" />
                        <span className="font-semibold text-green-600">Profile Complete</span>
                      </>
                    ) : (
                      <>
                        <XCircle className="w-5 h-5 text-red-600" />
                        <span className="font-semibold text-red-600">Profile Incomplete</span>
                      </>
                    )}
                  </div>
                  {selectedUser.missingFields && selectedUser.missingFields.length > 0 && (
                    <div>
                      <div className="text-sm font-semibold mb-2">Missing Fields:</div>
                      <div className="flex flex-wrap gap-2">
                        {selectedUser.missingFields.map((field, idx) => (
                          <span
                            key={idx}
                            className="px-3 py-1 bg-red-100 text-red-700 text-sm rounded-lg font-medium"
                          >
                            {field}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Loan Statistics */}
              <div className="bg-muted/30 rounded-2xl p-6">
                <h3 className="text-lg font-bold mb-4">Loan Statistics</h3>
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <div className="text-sm text-muted-foreground mb-1">Total Loans Applied</div>
                    <div className="text-2xl font-bold">{selectedUser.totalLoansApplied || 0}</div>
                  </div>
                  <div>
                    <div className="text-sm text-muted-foreground mb-1">Total Loans Approved</div>
                    <div className="text-2xl font-bold text-green-600">{selectedUser.totalLoansApproved || 0}</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminDashboard;

