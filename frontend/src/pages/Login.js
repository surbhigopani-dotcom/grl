import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import axios from 'axios';
import { toast } from 'react-toastify';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Checkbox } from '../components/ui/Checkbox';
import { ArrowLeft, Phone, Lock } from 'lucide-react';

const Login = () => {
  const navigate = useNavigate();
  const { verifyWhatsAppOTP, sendOTP, loginWithPhoneDirect } = useAuth();
  
  const [step, setStep] = useState('phone');
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState('');
  const [name, setName] = useState('');
  const [privacyAccepted, setPrivacyAccepted] = useState(false);
  const [isNewUser, setIsNewUser] = useState(false);
  const [loading, setLoading] = useState(false);
  const [otpSent, setOtpSent] = useState(false);
  const [otpExpiresIn, setOtpExpiresIn] = useState(null);

  // OTP expiration countdown
  useEffect(() => {
    if (otpExpiresIn && otpExpiresIn > 0) {
      const interval = setInterval(() => {
        setOtpExpiresIn((prev) => {
          if (prev <= 1) {
            clearInterval(interval);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);

      return () => clearInterval(interval);
    }
  }, [otpExpiresIn]);


  // Handle name submission for new users (when OTP disabled)
  const handleNameSubmit = async () => {
    if (!name.trim()) {
      toast.error('Please enter your name');
      return;
    }

    setLoading(true);
    try {
      const phoneNumber = `+91${phone}`;
      console.log('=== DIRECT SIGNUP (OTP DISABLED) START ===');
      console.log('Phone number:', phoneNumber);
      console.log('Name:', name);
      
      const result = await loginWithPhoneDirect(phoneNumber, name.trim());
      
      if (result.success) {
        setLoading(false);
        if (result.needsProfileSetup) {
          navigate('/profile-setup');
        } else {
          navigate('/home');
        }
      } else {
        setLoading(false);
        toast.error(result.message || 'Signup failed. Please try again.');
      }
    } catch (error) {
      console.error('Direct signup error:', error);
      setLoading(false);
      toast.error(error.response?.data?.message || 'Signup failed. Please try again.');
    }
  };

  const handleSendOTP = async () => {
    console.log('=== WHATSAPP OTP SEND START ===');
    
    if (phone.length !== 10) {
      toast.error('Please enter a valid 10-digit phone number');
      return;
    }

    if (!privacyAccepted) {
      toast.error('Please accept the privacy policy to continue');
      return;
    }

    setLoading(true);
    try {
      console.log('Sending OTP to phone:', phone);
      
      // Check if user exists first
      try {
        const checkResult = await sendOTP(`+91${phone}`);
        console.log('User check result:', checkResult);
        if (checkResult.success) {
          setIsNewUser(checkResult.isNewUser);
        } else {
          setIsNewUser(true);
        }
      } catch (error) {
        console.error('User check error:', error);
        setIsNewUser(true);
      }

      // Send OTP via WhatsApp API
      const response = await axios.post('/auth/send-otp', {
        phone: phone
      });

      if (response.data.success) {
        setOtpSent(true);
        setStep('otp');
        setIsNewUser(response.data.isNewUser);
        setOtpExpiresIn(response.data.expiresIn || 600); // 10 minutes default
        toast.success('OTP sent successfully via WhatsApp! Please check your WhatsApp messages.');
        console.log('✅ OTP sent successfully');
      } else {
        throw new Error(response.data.message || 'Failed to send OTP');
      }
    } catch (error) {
      console.error('OTP send error:', error);
      const errorMessage = error.response?.data?.message || error.message || 'Failed to send OTP. Please try again.';
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOTP = async (e) => {
    e.preventDefault();
    
    if (!privacyAccepted) {
      toast.error('Please accept the Privacy Policy to continue');
      return;
    }

    if (!otp || otp.length !== 6) {
      toast.error('Please enter a valid 6-digit OTP');
      return;
    }

    if (isNewUser && !name.trim()) {
      toast.error('Please enter your name');
      return;
    }

    setLoading(true);
    try {
      console.log('Verifying OTP for phone:', phone);
      
      const result = await verifyWhatsAppOTP(phone, otp, isNewUser ? name.trim() : undefined);
      
      if (result.success) {
        setLoading(false);
        if (result.needsProfileSetup) {
          navigate('/profile-setup');
        } else {
          navigate('/home');
        }
      } else {
        setLoading(false);
        if (result.requiresName) {
          setIsNewUser(true);
          setStep('name');
        } else {
          toast.error(result.message || 'Invalid OTP. Please try again.');
        }
      }
    } catch (error) {
      console.error('OTP verification error:', error);
      setLoading(false);
      const errorMessage = error.response?.data?.message || error.message || 'Invalid OTP. Please try again.';
      toast.error(errorMessage);
    }
  };

  const handleResendOTP = async () => {
    setOtp('');
    setOtpSent(false);
    setOtpExpiresIn(null);
    await handleSendOTP();
  };

  return (
    <div className="min-h-screen gradient-hero flex flex-col">
      {/* Header - Fixed at top */}
      <div className="w-full py-4 px-4 bg-[#14b8a6]">
        <div className="flex items-center justify-between max-w-md mx-auto">
          <button
            onClick={() => navigate(-1)}
            className="text-white hover:bg-white/20 rounded-full p-2 transition-colors"
            aria-label="Go back"
          >
            <ArrowLeft className="w-6 h-6" />
          </button>
          <h1 className="text-xl md:text-2xl font-bold text-white" style={{ fontFamily: 'Inter, system-ui, -apple-system, sans-serif' }}>
            Welcome to GrowLoan
          </h1>
          <div className="w-10" />
        </div>
      </div>

      {/* Main Content - Centered */}
      <div className="flex-1 flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          {/* Card */}
          <div className="bg-white rounded-3xl p-6 md:p-8 shadow-2xl" style={{ borderRadius: '24px' }}>
            {/* Logo */}
            <div className="text-center mb-8">
              <div className="text-3xl md:text-4xl font-bold text-[#14b8a6] mb-2" style={{ fontFamily: 'Inter, system-ui, -apple-system, sans-serif', letterSpacing: '-0.5px' }}>
                GROW ₹ LOAN
              </div>
              <p className="text-sm md:text-base text-gray-600" style={{ fontFamily: 'Inter, system-ui, -apple-system, sans-serif' }}>
                Fast & Secure Loans
              </p>
            </div>


          {/* Phone Input */}
          {step === 'phone' && (
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium mb-2 text-gray-700" style={{ fontFamily: 'Inter, system-ui, -apple-system, sans-serif', fontWeight: 500 }}>
                  Phone Number
                </label>
                <div className="relative">
                  <Phone className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 z-10" />
                  <div className="absolute left-12 top-1/2 -translate-y-1/2 text-gray-600 font-medium z-10" style={{ fontFamily: 'Inter, system-ui, -apple-system, sans-serif' }}>+91</div>
                  <Input
                    type="tel"
                    placeholder="Enter 10-digit phone num"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value.replace(/\D/g, '').slice(0, 10))}
                    className="pl-20 h-14 text-base rounded-xl border-gray-300 bg-gray-50 focus:bg-white focus:border-[#14b8a6] focus:ring-2 focus:ring-[#14b8a6]/20 transition-all"
                    style={{ fontFamily: 'Inter, system-ui, -apple-system, sans-serif' }}
                    maxLength={10}
                  />
                </div>
              </div>

              <div className="flex items-start space-x-3">
                <Checkbox
                  id="privacy"
                  checked={privacyAccepted}
                  onCheckedChange={(checked) => setPrivacyAccepted(checked)}
                  className="mt-0.5 border-gray-300 data-[state=checked]:bg-[#14b8a6] data-[state=checked]:border-[#14b8a6]"
                />
                <label htmlFor="privacy" className="text-sm text-gray-700 cursor-pointer leading-relaxed flex-1" style={{ fontFamily: 'Inter, system-ui, -apple-system, sans-serif' }}>
                  I accept the{' '}
                  <Link 
                    to="/privacy" 
                    className="text-[#14b8a6] hover:underline font-medium"
                    onClick={(e) => e.stopPropagation()}
                    style={{ fontFamily: 'Inter, system-ui, -apple-system, sans-serif' }}
                  >
                    privacy policy
                  </Link>
                  {' '}and{' '}
                  <Link 
                    to="/privacy" 
                    className="text-[#14b8a6] hover:underline font-medium"
                    onClick={(e) => e.stopPropagation()}
                    style={{ fontFamily: 'Inter, system-ui, -apple-system, sans-serif' }}
                  >
                    terms of service
                  </Link>
                </label>
              </div>

              <Button
                onClick={handleSendOTP}
                className="w-full bg-[#14b8a6] hover:bg-[#0d9488] text-white h-14 text-lg font-semibold rounded-xl shadow-md hover:shadow-lg transition-all"
                style={{ fontFamily: 'Inter, system-ui, -apple-system, sans-serif' }}
                disabled={loading || phone.length !== 10 || !privacyAccepted}
              >
                {loading ? 'Sending OTP...' : 'Send OTP via WhatsApp'}
              </Button>
              <p className="text-xs text-center text-gray-500 mt-2" style={{ fontFamily: 'Inter, system-ui, -apple-system, sans-serif' }}>
                OTP will be sent to your WhatsApp number
              </p>
            </div>
          )}

          {/* Name Input (for new users) */}
          {step === 'name' && isNewUser && (
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium mb-2 text-gray-700" style={{ fontFamily: 'Inter, system-ui, -apple-system, sans-serif' }}>
                  Your Name
                </label>
                <Input
                  type="text"
                  placeholder="Enter your full name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="h-14 text-base rounded-xl border-gray-300 focus:border-[#14b8a6] focus:ring-[#14b8a6]"
                  style={{ fontFamily: 'Inter, system-ui, -apple-system, sans-serif' }}
                />
              </div>

              <Button
                onClick={handleNameSubmit}
                className="w-full bg-[#14b8a6] hover:bg-[#0d9488] text-white h-14 text-lg font-semibold rounded-xl shadow-md hover:shadow-lg transition-all"
                style={{ fontFamily: 'Inter, system-ui, -apple-system, sans-serif' }}
                disabled={loading || !name.trim()}
              >
                {loading ? 'Creating Account...' : 'Create Account'}
              </Button>
            </div>
          )}

          {/* OTP Input */}
          {step === 'otp' && otpSent && (
            <div className="space-y-6">
              {isNewUser && (
                <div>
                  <label className="block text-sm font-medium mb-2 text-gray-700" style={{ fontFamily: 'Inter, system-ui, -apple-system, sans-serif' }}>
                    Your Name
                  </label>
                  <Input
                    type="text"
                    placeholder="Enter your full name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="h-14 text-base rounded-xl border-gray-300 focus:border-[#14b8a6] focus:ring-[#14b8a6]"
                    style={{ fontFamily: 'Inter, system-ui, -apple-system, sans-serif' }}
                  />
                </div>
              )}

              <div>
                <label className="block text-sm font-medium mb-2 text-gray-700" style={{ fontFamily: 'Inter, system-ui, -apple-system, sans-serif' }}>
                  Enter OTP (Sent via WhatsApp)
                </label>
                {otpExpiresIn > 0 && (
                  <p className="text-xs text-gray-500 mb-2" style={{ fontFamily: 'Inter, system-ui, -apple-system, sans-serif' }}>
                    OTP expires in {Math.floor(otpExpiresIn / 60)}:{(otpExpiresIn % 60).toString().padStart(2, '0')}
                  </p>
                )}
                <div className="relative">
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <Input
                    type="text"
                    placeholder="Enter 6-digit OTP"
                    value={otp}
                    onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                    className="pl-12 h-14 text-lg tracking-widest rounded-xl border-gray-300 focus:border-[#14b8a6] focus:ring-[#14b8a6]"
                    style={{ fontFamily: 'Inter, system-ui, -apple-system, sans-serif' }}
                    maxLength={6}
                  />
                </div>
              </div>

              <div className="text-center">
                <Button
                  variant="link"
                  onClick={handleResendOTP}
                  className="text-[#14b8a6] hover:text-[#0d9488]"
                  style={{ fontFamily: 'Inter, system-ui, -apple-system, sans-serif' }}
                  disabled={loading}
                >
                  Resend OTP
                </Button>
              </div>

              <Button
                onClick={handleVerifyOTP}
                className="w-full bg-[#14b8a6] hover:bg-[#0d9488] text-white h-14 text-lg font-semibold rounded-xl shadow-md hover:shadow-lg transition-all"
                style={{ fontFamily: 'Inter, system-ui, -apple-system, sans-serif' }}
                disabled={loading || !privacyAccepted || otp.length !== 6 || (isNewUser && !name.trim())}
              >
                {loading ? 'Verifying...' : 'Verify OTP'}
              </Button>
            </div>
          )}
          </div>
        </div>
      </div>

      {/* Footer Disclaimer */}
      <div className="w-full pb-6 px-4 mt-auto">
        <p className="text-center text-[#14b8a6]/90 text-xs md:text-sm max-w-md mx-auto leading-relaxed" style={{ fontFamily: 'Inter, system-ui, -apple-system, sans-serif' }}>
          By continuing, you agree to our{' '}
          <Link to="/privacy" className="text-[#14b8a6] hover:underline font-medium">
            Terms of Service
          </Link>
          {' '}and{' '}
          <Link to="/privacy" className="text-[#14b8a6] hover:underline font-medium">
            Privacy Policy
          </Link>
        </p>
      </div>

    </div>
  );
};

export default Login;
