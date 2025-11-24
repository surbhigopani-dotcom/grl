import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import axios from 'axios';
import { toast } from 'react-toastify';
import { Button } from '../components/ui/Button';
import { Loader } from '../components/ui/Loader';
import { ArrowLeft, CheckCircle } from 'lucide-react';

const TenureSelection = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [loan, setLoan] = useState(null);
  const [selectedTenure, setSelectedTenure] = useState(12);
  const [loading, setLoading] = useState(false);
  const [calculations, setCalculations] = useState(null);
  const [interestRate] = useState(12); // 12% annual interest rate

  // Calculate max tenure based on loan amount
  // Higher loan amount = more tenure available (up to 36 months / 3 years)
  const getMaxTenure = (loanAmount) => {
    if (!loanAmount) return 12;
    
    if (loanAmount < 50000) {
      return 12; // Up to 12 months for small loans
    } else if (loanAmount < 100000) {
      return 18; // Up to 18 months
    } else if (loanAmount < 200000) {
      return 24; // Up to 24 months
    } else if (loanAmount < 300000) {
      return 30; // Up to 30 months
    } else {
      return 36; // Maximum 3 years for large loans
    }
  };
  
  const minTenure = 3;
  const maxTenure = loan ? getMaxTenure(loan.approvedAmount) : 12;

  useEffect(() => {
    const loadLoan = async () => {
      try {
        const loanId = location.state?.loanId;
        if (!loanId) {
          toast.error('Loan ID not found');
          navigate('/home');
          return;
        }

        const token = localStorage.getItem('token');
        if (!token) {
          navigate('/login');
          return;
        }

        if (!axios.defaults.headers.common['Authorization']) {
          axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
        }

        const response = await axios.get(`/loans/${loanId}/status`);
        const loanData = response.data.loan;

        if (loanData.status !== 'approved' && loanData.status !== 'tenure_selection') {
          toast.error('Loan is not in approved state');
          navigate('/home');
          return;
        }

        setLoan(loanData);
        const max = getMaxTenure(loanData.approvedAmount);
        if (loanData.tenure > 0 && loanData.tenure <= max) {
          setSelectedTenure(loanData.tenure);
          calculateEMI(loanData.approvedAmount, loanData.tenure);
        } else {
          const defaultTenure = Math.min(12, max);
          setSelectedTenure(defaultTenure);
          calculateEMI(loanData.approvedAmount, defaultTenure);
        }
      } catch (error) {
        console.error('Error loading loan:', error);
        toast.error('Failed to load loan details');
        navigate('/home');
      }
    };

    loadLoan();
  }, [location.state, navigate]);

  const calculateEMI = (principal, months) => {
    if (!principal || !months) return;

    const monthlyRate = interestRate / 12 / 100; // Monthly interest rate
    const emi = (principal * monthlyRate * Math.pow(1 + monthlyRate, months)) / 
                (Math.pow(1 + monthlyRate, months) - 1);
    
    const totalAmount = emi * months;
    const totalInterest = totalAmount - principal;

    setCalculations({
      emi: Math.round(emi),
      totalAmount: Math.round(totalAmount),
      totalInterest: Math.round(totalInterest),
      principal: principal
    });
  };

  const handleTenureChange = (e) => {
    const tenure = parseInt(e.target.value);
    setSelectedTenure(tenure);
    calculateEMI(loan.approvedAmount, tenure);
  };

  const handleSubmit = async () => {
    if (!selectedTenure) {
      toast.error('Please select a tenure period');
      return;
    }

    if (!calculations) {
      toast.error('Please wait for calculations');
      return;
    }

    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        navigate('/login');
        return;
      }

      if (!axios.defaults.headers.common['Authorization']) {
        axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      }

      const response = await axios.post(`/loans/${loan.id || loan._id}/select-tenure`, {
        tenure: selectedTenure,
        emiAmount: calculations.emi,
        totalInterest: calculations.totalInterest,
        totalAmount: calculations.totalAmount,
        interestRate: interestRate
      });

      toast.success('Tenure selected successfully!');
      navigate('/sanction-letter', { state: { loanId: loan.id || loan._id } });
    } catch (error) {
      console.error('Error selecting tenure:', error);
      toast.error(error.response?.data?.message || 'Failed to select tenure');
    } finally {
      setLoading(false);
    }
  };

  if (!loan) {
    return <Loader fullScreen text="Loading loan details..." size="lg" />;
  }

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Header */}
      <div className="bg-[#14b8a6] py-4 px-4">
        <div className="max-w-lg mx-auto">
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate('/home')}
              className="text-white hover:bg-white/20 rounded-full p-2 transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div className="flex-1">
              <h1 className="text-lg md:text-xl font-bold text-white" style={{ fontFamily: 'Inter, system-ui, -apple-system, sans-serif' }}>
                Select Loan Tenure
              </h1>
              <p className="text-white/90 text-xs md:text-sm mt-1" style={{ fontFamily: 'Inter, system-ui, -apple-system, sans-serif' }}>
                Choose your repayment period
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-lg mx-auto px-4 py-6">
        {/* Loan Summary */}
        <div className="bg-white rounded-2xl p-5 md:p-6 shadow-lg border border-gray-200 mb-4">
          <h2 className="text-lg font-bold text-gray-800 mb-4" style={{ fontFamily: 'Inter, system-ui, -apple-system, sans-serif' }}>
            Loan Details
          </h2>
          <div className="space-y-3">
            <div className="flex justify-between items-center py-2 border-b border-gray-100">
              <span className="text-sm text-gray-600" style={{ fontFamily: 'Inter, system-ui, -apple-system, sans-serif' }}>Loan ID:</span>
              <span className="font-bold text-sm text-gray-800" style={{ fontFamily: 'Inter, system-ui, -apple-system, sans-serif' }}>GL-{loan.loanId || loan._id?.slice(-8)}</span>
            </div>
            <div className="flex justify-between items-center py-2 border-b border-gray-100">
              <span className="text-sm text-gray-600" style={{ fontFamily: 'Inter, system-ui, -apple-system, sans-serif' }}>Approved Amount:</span>
              <span className="font-bold text-lg text-[#14b8a6]" style={{ fontFamily: 'Inter, system-ui, -apple-system, sans-serif' }}>₹{loan.approvedAmount?.toLocaleString()}</span>
            </div>
            <div className="flex justify-between items-center py-2">
              <span className="text-sm text-gray-600" style={{ fontFamily: 'Inter, system-ui, -apple-system, sans-serif' }}>Interest Rate:</span>
              <span className="font-semibold text-base text-gray-800" style={{ fontFamily: 'Inter, system-ui, -apple-system, sans-serif' }}>{interestRate}% p.a.</span>
            </div>
          </div>
        </div>

        {/* Tenure Selection */}
        <div className="bg-white rounded-2xl p-5 md:p-6 shadow-lg border border-gray-200 mb-4">
          <h2 className="text-lg font-bold text-gray-800 mb-4" style={{ fontFamily: 'Inter, system-ui, -apple-system, sans-serif' }}>
            Select Tenure Period
          </h2>
          
          {/* Slider */}
          <div className="mb-6">
            {/* Selected Tenure Display */}
            <div className="text-center mb-6">
              <div className="text-3xl md:text-4xl font-bold text-[#14b8a6] mb-1" style={{ fontFamily: 'Inter, system-ui, -apple-system, sans-serif' }}>
                {selectedTenure}
              </div>
              <div className="text-sm text-gray-600" style={{ fontFamily: 'Inter, system-ui, -apple-system, sans-serif' }}>
                {selectedTenure === 36 ? '36 Months (3 Years)' : `${selectedTenure} ${selectedTenure === 1 ? 'Month' : 'Months'}`}
              </div>
            </div>
            
            {/* Slider with Labels */}
            <div className="space-y-3">
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs text-gray-500" style={{ fontFamily: 'Inter, system-ui, -apple-system, sans-serif' }}>
                  {minTenure}M
                </span>
                <span className="text-xs text-gray-500" style={{ fontFamily: 'Inter, system-ui, -apple-system, sans-serif' }}>
                  {maxTenure}M
                </span>
              </div>
              
              <input
                type="range"
                min={minTenure}
                max={maxTenure}
                step={1}
                value={selectedTenure}
                onChange={handleTenureChange}
                className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer slider"
                style={{
                  background: `linear-gradient(to right, #14b8a6 0%, #14b8a6 ${maxTenure > minTenure ? ((selectedTenure - minTenure) / (maxTenure - minTenure)) * 100 : 0}%, #e5e7eb ${maxTenure > minTenure ? ((selectedTenure - minTenure) / (maxTenure - minTenure)) * 100 : 0}%, #e5e7eb 100%)`
                }}
              />
              
              {/* Quick Select Buttons */}
              <div className="flex justify-between gap-2 mt-4">
                {[3, 6, 12, 18, 24, 30, 36].filter(m => m >= minTenure && m <= maxTenure).slice(0, 6).map((month) => (
                  <button
                    key={month}
                    onClick={() => {
                      if (month <= maxTenure) {
                        setSelectedTenure(month);
                        calculateEMI(loan.approvedAmount, month);
                      }
                    }}
                    className={`flex-1 py-2 px-2 rounded-lg border-2 transition-all text-xs font-semibold ${
                      selectedTenure === month
                        ? 'border-[#14b8a6] bg-[#14b8a6] text-white'
                        : 'border-gray-200 text-gray-600 hover:border-[#14b8a6]/50'
                    }`}
                    style={{ fontFamily: 'Inter, system-ui, -apple-system, sans-serif' }}
                  >
                    {month}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* EMI Calculation */}
          {calculations && selectedTenure && (
            <div className="bg-[#14b8a6]/5 rounded-xl p-5 border border-[#14b8a6]/20">
              <h3 className="text-base font-bold text-gray-800 mb-4" style={{ fontFamily: 'Inter, system-ui, -apple-system, sans-serif' }}>
                EMI Calculation
              </h3>
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600" style={{ fontFamily: 'Inter, system-ui, -apple-system, sans-serif' }}>Principal Amount:</span>
                  <span className="font-bold text-sm text-gray-800" style={{ fontFamily: 'Inter, system-ui, -apple-system, sans-serif' }}>₹{calculations.principal.toLocaleString()}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600" style={{ fontFamily: 'Inter, system-ui, -apple-system, sans-serif' }}>Total Interest:</span>
                  <span className="font-bold text-sm text-gray-800" style={{ fontFamily: 'Inter, system-ui, -apple-system, sans-serif' }}>₹{calculations.totalInterest.toLocaleString()}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600" style={{ fontFamily: 'Inter, system-ui, -apple-system, sans-serif' }}>Total Amount:</span>
                  <span className="font-bold text-sm text-gray-800" style={{ fontFamily: 'Inter, system-ui, -apple-system, sans-serif' }}>₹{calculations.totalAmount.toLocaleString()}</span>
                </div>
                <div className="h-px bg-gray-200 my-3"></div>
                <div className="flex justify-between items-center">
                  <span className="text-base font-semibold text-gray-800" style={{ fontFamily: 'Inter, system-ui, -apple-system, sans-serif' }}>Monthly EMI:</span>
                  <span className="font-bold text-xl text-[#14b8a6]" style={{ fontFamily: 'Inter, system-ui, -apple-system, sans-serif' }}>₹{calculations.emi.toLocaleString()}</span>
                </div>
                <div className="text-xs text-gray-500 mt-2" style={{ fontFamily: 'Inter, system-ui, -apple-system, sans-serif' }}>
                  * EMI calculated at {interestRate}% annual interest rate
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Submit Button */}
        <Button
          onClick={handleSubmit}
          disabled={!selectedTenure || !calculations || loading}
          className="w-full bg-[#14b8a6] hover:bg-[#0d9488] text-white rounded-xl h-12 text-base font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
          style={{ fontFamily: 'Inter, system-ui, -apple-system, sans-serif' }}
        >
          {loading ? 'Processing...' : 'Continue to Sanction Letter'}
        </Button>
      </div>
    </div>
  );
};

export default TenureSelection;

