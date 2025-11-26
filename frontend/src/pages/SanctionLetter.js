import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import axios from 'axios';
import { toast } from 'react-toastify';
import { Button } from '../components/ui/Button';
import { Loader } from '../components/ui/Loader';
import { ArrowLeft, Download, Share2, Printer, CheckCircle } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import LoanSanctionLetter from '../components/LoanSanctionLetter';

const SanctionLetter = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const [loan, setLoan] = useState(null);
  const [loading, setLoading] = useState(true);
  const [signing, setSigning] = useState(false);
  const [showSignature, setShowSignature] = useState(false);
  const [signature, setSignature] = useState('');
  const canvasRef = useRef(null);
  const [isDrawing, setIsDrawing] = useState(false);

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

        if (!loanData || loanData.status === 'pending' || loanData.status === 'validating') {
          toast.error('Loan is not ready for sanction letter');
          navigate('/home');
          return;
        }

        setLoan(loanData);
        
        // Always show signature section if tenure is selected and signature not provided
        // This ensures signature is always available when needed
        if (!loanData.digitalSignature && loanData.tenure > 0) {
          // Always show signature section when tenure is selected and signature not done
          setShowSignature(true);
        } else {
          // If signature exists or no tenure, check location state
          setShowSignature(location.state?.showSignature || false);
        }
        
        // Mark sanction letter as viewed if not already
        if (!loanData.sanctionLetterViewed && (loanData.status === 'tenure_selection' || loanData.status === 'approved')) {
          await axios.post(`/loans/${loanId}/view-sanction-letter`);
        }
      } catch (error) {
        console.error('Error loading loan:', error);
        toast.error('Failed to load loan details');
        navigate('/home');
      } finally {
        setLoading(false);
      }
    };

    loadLoan();
  }, [location.state, navigate]);

  // Refresh loan data periodically to ensure signature status is up-to-date
  useEffect(() => {
    if (!loan) return;
    
    const interval = setInterval(async () => {
      try {
        const loanId = loan.id || loan._id;
        if (!loanId) return;
        
        const token = localStorage.getItem('token');
        if (!token) return;
        
        if (!axios.defaults.headers.common['Authorization']) {
          axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
        }
        
        const response = await axios.get(`/loans/${loanId}/status`);
        const updatedLoan = response.data.loan;
        
        // Update loan data
        setLoan(updatedLoan);
        
        // If signature was just added, show it
        if (updatedLoan.digitalSignature && !loan.digitalSignature) {
          setShowSignature(false); // Hide signature section since it's done
        }
        
        // If tenure is selected and signature not done, ensure signature section is visible
        if (!updatedLoan.digitalSignature && updatedLoan.tenure > 0) {
          setShowSignature(true);
        }
      } catch (error) {
        console.error('Error refreshing loan data:', error);
      }
    }, 5000); // Check every 5 seconds
    
    return () => clearInterval(interval);
  }, [loan]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (canvas && showSignature) {
      const ctx = canvas.getContext('2d');
      ctx.strokeStyle = '#14b8a6';
      ctx.lineWidth = 3;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.fillStyle = '#14b8a6';

      // Add touch event listeners with passive: false to prevent default
      const handleTouchStart = (e) => {
        e.preventDefault();
        const touch = e.touches[0];
        const rect = canvas.getBoundingClientRect();
        const x = touch.clientX - rect.left;
        const y = touch.clientY - rect.top;
        ctx.beginPath();
        ctx.moveTo(x, y);
        // Draw a dot on touch start to ensure signature is captured even on single touch
        ctx.arc(x, y, 2, 0, 2 * Math.PI);
        ctx.fill();
        ctx.beginPath();
        ctx.moveTo(x, y);
        setIsDrawing(true);
        setSignature(canvas.toDataURL());
      };

      const handleTouchMove = (e) => {
        e.preventDefault();
        if (!isDrawing) return;
        const touch = e.touches[0];
        const rect = canvas.getBoundingClientRect();
        ctx.lineTo(touch.clientX - rect.left, touch.clientY - rect.top);
        ctx.stroke();
        setSignature(canvas.toDataURL());
      };

      const handleTouchEnd = (e) => {
        e.preventDefault();
        setIsDrawing(false);
        const currentSignature = canvas.toDataURL();
        if (currentSignature) {
          setSignature(currentSignature);
        }
      };

      canvas.addEventListener('touchstart', handleTouchStart, { passive: false });
      canvas.addEventListener('touchmove', handleTouchMove, { passive: false });
      canvas.addEventListener('touchend', handleTouchEnd, { passive: false });

      return () => {
        canvas.removeEventListener('touchstart', handleTouchStart);
        canvas.removeEventListener('touchmove', handleTouchMove);
        canvas.removeEventListener('touchend', handleTouchEnd);
      };
    }
  }, [showSignature, isDrawing]);

  const startDrawing = (e) => {
    e.preventDefault();
    setIsDrawing(true);
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX ? e.clientX - rect.left : (e.touches && e.touches[0] ? e.touches[0].clientX - rect.left : 0);
    const y = e.clientY ? e.clientY - rect.top : (e.touches && e.touches[0] ? e.touches[0].clientY - rect.top : 0);
    ctx.beginPath();
    ctx.moveTo(x, y);
    // Draw a small dot on click/touch start to ensure signature is captured even on single click
    ctx.arc(x, y, 2, 0, 2 * Math.PI);
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(x, y);
    // Update signature immediately on start
    setSignature(canvas.toDataURL());
  };

  const draw = (e) => {
    if (!isDrawing) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX ? e.clientX - rect.left : (e.touches && e.touches[0] ? e.touches[0].clientX - rect.left : 0);
    const y = e.clientY ? e.clientY - rect.top : (e.touches && e.touches[0] ? e.touches[0].clientY - rect.top : 0);
    ctx.lineTo(x, y);
    ctx.stroke();
    // Update signature on each draw
    setSignature(canvas.toDataURL());
  };

  const stopDrawing = (e) => {
    e?.preventDefault();
    setIsDrawing(false);
    const canvas = canvasRef.current;
    if (canvas) {
      // Ensure signature is captured even if user just clicked without dragging
      const currentSignature = canvas.toDataURL();
      if (currentSignature && currentSignature !== 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==') {
        setSignature(currentSignature);
      }
    }
  };

  const clearSignature = () => {
    const canvas = canvasRef.current;
    if (canvas) {
      const ctx = canvas.getContext('2d');
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      setSignature('');
    }
  };

  const handleSubmitSignature = async () => {
    if (!signature) {
      toast.error('Please provide your signature');
      return;
    }

    setSigning(true);
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        navigate('/login');
        return;
      }

      if (!axios.defaults.headers.common['Authorization']) {
        axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      }

      const response = await axios.post(`/loans/${loan.id || loan._id}/sign`, {
        signature: signature
      });

      // Update loan data with new signature
      const updatedLoan = response.data.loan;
      if (updatedLoan) {
        setLoan(updatedLoan);
      }
      
      setShowSignature(false); // Hide signature section since it's done
      toast.success('Signature submitted successfully!');
      
      // Navigate to payment after a short delay
      setTimeout(() => {
        navigate('/payment', { state: { loanId: loan.id || loan._id } });
      }, 1000);
    } catch (error) {
      console.error('Error submitting signature:', error);
      toast.error(error.response?.data?.message || 'Failed to submit signature');
    } finally {
      setSigning(false);
    }
  };

  if (loading) {
    return <Loader fullScreen text="Loading sanction letter..." size="lg" />;
  }

  if (!loan) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Header */}
      <div className="bg-[#14b8a6] py-4 px-4">
        <div className="container mx-auto max-w-4xl">
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate('/home')}
              className="text-white hover:bg-white/20 rounded-full p-2 transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div className="flex-1">
              <h1 className="text-lg md:text-xl font-bold text-white" style={{ fontFamily: 'Inter, system-ui, -apple-system, sans-serif' }}>
                Loan Sanction Letter
              </h1>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-6 max-w-4xl">
        {/* Sanction Letter */}
        <LoanSanctionLetter loan={loan} user={user} />

        {/* Digital Signature Section - Always show when tenure is selected and signature not provided */}
        {loan && !loan.digitalSignature && loan.tenure > 0 && showSignature && (
          <div className="bg-white rounded-2xl p-5 md:p-6 shadow-lg border border-gray-200 mt-6">
            <h2 className="text-lg font-bold text-gray-800 mb-4" style={{ fontFamily: 'Inter, system-ui, -apple-system, sans-serif' }}>
              Digital Signature
            </h2>
            <p className="text-sm text-gray-600 mb-4" style={{ fontFamily: 'Inter, system-ui, -apple-system, sans-serif' }}>
              Please sign below to proceed with payment. This signature confirms your acceptance of the loan terms.
            </p>

            <div className="mb-4">
              <div className="border-2 border-gray-300 rounded-xl overflow-hidden bg-white">
                <canvas
                  ref={canvasRef}
                  width={600}
                  height={200}
                  className="cursor-crosshair w-full block"
                  onMouseDown={startDrawing}
                  onMouseMove={draw}
                  onMouseUp={stopDrawing}
                  onMouseLeave={stopDrawing}
                  onClick={(e) => {
                    // Handle single click - draw a dot
                    const canvas = canvasRef.current;
                    if (canvas) {
                      const ctx = canvas.getContext('2d');
                      const rect = canvas.getBoundingClientRect();
                      const x = e.clientX - rect.left;
                      const y = e.clientY - rect.top;
                      ctx.beginPath();
                      ctx.arc(x, y, 3, 0, 2 * Math.PI);
                      ctx.fill();
                      setSignature(canvas.toDataURL());
                    }
                  }}
                  style={{ touchAction: 'none' }}
                />
              </div>
            </div>

            <div className="flex gap-3">
              <Button
                onClick={clearSignature}
                variant="outline"
                className="flex-1 border-gray-300 text-gray-700 hover:bg-gray-50 rounded-xl"
                style={{ fontFamily: 'Inter, system-ui, -apple-system, sans-serif' }}
              >
                Clear
              </Button>
              <Button
                onClick={handleSubmitSignature}
                disabled={!signature || signing}
                className="flex-1 bg-[#14b8a6] hover:bg-[#0d9488] text-white rounded-xl disabled:opacity-50"
                style={{ fontFamily: 'Inter, system-ui, -apple-system, sans-serif' }}
              >
                {signing ? 'Submitting...' : 'Submit Signature & Proceed to Payment'}
              </Button>
            </div>
          </div>
        )}

        {/* Show Signature Button - If signature not done but section is hidden */}
        {loan && !loan.digitalSignature && loan.tenure > 0 && !showSignature && (
          <div className="mt-6">
            <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4 mb-4">
              <p className="text-sm text-yellow-800 mb-3" style={{ fontFamily: 'Inter, system-ui, -apple-system, sans-serif' }}>
                Please provide your digital signature to proceed with payment.
              </p>
              <Button
                onClick={() => setShowSignature(true)}
                className="w-full bg-[#14b8a6] hover:bg-[#0d9488] text-white rounded-xl h-11 text-base font-semibold"
                style={{ fontFamily: 'Inter, system-ui, -apple-system, sans-serif' }}
              >
                Add Digital Signature
              </Button>
            </div>
          </div>
        )}

        {/* Signature Completed - Show signature preview and payment button */}
        {loan && loan.digitalSignature && !loan.depositPaid && (
          <div className="mt-6">
            <div className="bg-green-50 border border-green-200 rounded-xl p-4 mb-4">
              <div className="flex items-center gap-3 mb-3">
                <CheckCircle className="w-5 h-5 text-green-600" />
                <p className="text-sm font-semibold text-green-800" style={{ fontFamily: 'Inter, system-ui, -apple-system, sans-serif' }}>
                  Digital Signature Completed
                </p>
              </div>
              {loan.digitalSignature && (
                <div className="mb-3">
                  <img 
                    src={loan.digitalSignature} 
                    alt="Digital Signature" 
                    className="max-w-full h-20 border border-gray-300 rounded-lg bg-white object-contain"
                  />
                </div>
              )}
            </div>
            <Button
              onClick={() => navigate('/payment', { state: { loanId: loan.id || loan._id } })}
              className="w-full bg-[#14b8a6] hover:bg-[#0d9488] text-white rounded-xl h-12 text-base font-semibold"
              style={{ fontFamily: 'Inter, system-ui, -apple-system, sans-serif' }}
            >
              Proceed to Payment
            </Button>
          </div>
        )}

        {/* Payment Completed Message */}
        {loan.digitalSignature && loan.depositPaid && (
          <div className="bg-green-50 border border-green-200 rounded-2xl p-5 md:p-6 shadow-lg mt-6">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0">
                <CheckCircle className="w-6 h-6 text-green-600" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-gray-800" style={{ fontFamily: 'Inter, system-ui, -apple-system, sans-serif' }}>
                  Payment Completed ✅
                </h3>
              </div>
            </div>
            <p className="text-sm text-gray-600 mb-2" style={{ fontFamily: 'Inter, system-ui, -apple-system, sans-serif' }}>
              Your payment has been successfully processed. Your loan is now being processed.
            </p>
            {loan.paymentAt && (
              <p className="text-xs text-gray-500" style={{ fontFamily: 'Inter, system-ui, -apple-system, sans-serif' }}>
                Payment Date: {new Date(loan.paymentAt).toLocaleDateString('en-IN', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric'
                })}
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default SanctionLetter;

