import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { auth, setupRecaptcha, firebaseConfig } from '../config/firebase';
import { signInWithPhoneNumber, PhoneAuthProvider, signInWithCredential } from 'firebase/auth';
import { toast } from 'react-toastify';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Checkbox } from '../components/ui/Checkbox';
import { ArrowLeft, Phone, Lock } from 'lucide-react';

const Login = () => {
  const navigate = useNavigate();
  const { loginWithFirebase, sendOTP, loginWithPhoneDirect } = useAuth();
  
  // Check if OTP is enabled from environment variable
  // Default to false if not set (OTP disabled by default)
  const OTP_ENABLED = process.env.REACT_APP_OTP_ENABLED === 'true' || process.env.REACT_APP_OTP_ENABLED === true;
  
  const [step, setStep] = useState('phone');
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState('');
  const [name, setName] = useState('');
  const [privacyAccepted, setPrivacyAccepted] = useState(false);
  const [isNewUser, setIsNewUser] = useState(false);
  const [loading, setLoading] = useState(false);
  const [verificationId, setVerificationId] = useState(null);
  const [retryAfter, setRetryAfter] = useState(null);
  const [showConfigError, setShowConfigError] = useState(false);
  const recaptchaContainerRef = useRef(null);
  const retryIntervalRef = useRef(null);

  useEffect(() => {
    // Ensure reCAPTCHA container always exists in DOM
    const ensureContainerExists = () => {
      let container = document.getElementById('recaptcha-container');
      if (!container) {
        container = document.createElement('div');
        container.id = 'recaptcha-container';
        container.setAttribute('data-recaptcha-container', 'true');
        container.style.position = 'absolute';
        container.style.left = '-9999px';
        container.style.width = '1px';
        container.style.height = '1px';
        container.style.overflow = 'hidden';
        container.style.visibility = 'hidden';
        container.style.pointerEvents = 'none';
        document.body.appendChild(container);
        console.log('reCAPTCHA container created in useEffect');
      }
      return container;
    };

    // Create container immediately
    ensureContainerExists();

    // Global error handler for reCAPTCHA errors - prevent uncaught errors
    const handleRecaptchaError = (event) => {
      // Check if it's a reCAPTCHA related error
      const errorMessage = event.error?.message || event.message || '';
      const errorStack = event.error?.stack || event.filename || '';
      
      if (errorMessage.includes('recaptcha') || 
          errorMessage.includes('Cannot read properties of null') ||
          errorMessage.includes('reading \'style\'') ||
          errorStack.includes('recaptcha') ||
          errorStack.includes('recaptcha__en.js')) {
        console.warn('⚠️ reCAPTCHA error caught and suppressed (non-critical):', errorMessage.substring(0, 100));
        // Ensure container exists
        ensureContainerExists();
        // Prevent error from showing in console as uncaught
        event.preventDefault();
        event.stopPropagation();
        event.stopImmediatePropagation();
        return true;
      }
      return false;
    };

    // Also handle unhandled promise rejections
    const handleUnhandledRejection = (event) => {
      if (event.reason && (
        event.reason.message?.includes('recaptcha') ||
        event.reason.message?.includes('Cannot read properties of null')
      )) {
        console.warn('Caught reCAPTCHA promise rejection (non-critical, suppressed):', event.reason.message);
        ensureContainerExists();
        event.preventDefault();
        return true;
      }
      return false;
    };

    window.addEventListener('error', handleRecaptchaError, true);
    window.addEventListener('unhandledrejection', handleUnhandledRejection, true);

    // Cleanup on unmount - with safety checks
    return () => {
      window.removeEventListener('error', handleRecaptchaError, true);
      window.removeEventListener('unhandledrejection', handleUnhandledRejection, true);
      
      if (window.recaptchaVerifier) {
        try {
          const containerElement = document.getElementById('recaptcha-container');
          if (containerElement && window.recaptchaVerifier.clear) {
            window.recaptchaVerifier.clear();
          }
        } catch (error) {
          console.warn('Error clearing reCAPTCHA on unmount (non-critical):', error);
        }
        window.recaptchaVerifier = null;
      }
    };
  }, []);

  // Cleanup retry timer on unmount
  useEffect(() => {
    return () => {
      if (retryIntervalRef.current) {
        clearInterval(retryIntervalRef.current);
        retryIntervalRef.current = null;
      }
    };
  }, []);

  // Direct login/signup when OTP is disabled
  const handleDirectLogin = async () => {
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
      const phoneNumber = `+91${phone}`;
      console.log('=== DIRECT LOGIN (OTP DISABLED) START ===');
      console.log('Phone number:', phoneNumber);
      
      // Check if user exists
      const checkResult = await sendOTP(phoneNumber);
      console.log('User check result:', checkResult);
      setIsNewUser(checkResult.isNewUser);
      
      // If new user, ask for name first
      if (checkResult.isNewUser) {
        setLoading(false);
        setStep('name');
        toast.info('Please enter your name to create an account');
        return;
      }
      
      // Existing user - login directly
      console.log('Existing user, logging in directly...');
      const result = await loginWithPhoneDirect(phoneNumber);
      
      if (result.success) {
        setLoading(false);
        if (result.needsProfileSetup) {
          navigate('/profile-setup');
        } else {
          navigate('/home');
        }
      } else {
        setLoading(false);
        toast.error(result.message || 'Login failed. Please try again.');
      }
    } catch (error) {
      console.error('Direct login error:', error);
      setLoading(false);
      toast.error(error.response?.data?.message || 'Login failed. Please try again.');
    }
  };

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
    // Check if OTP is enabled
    if (!OTP_ENABLED) {
      // OTP disabled - use direct login instead
      await handleDirectLogin();
      return;
    }
    
    console.log('=== OTP SEND START ===');
    console.log('OTP Enabled:', OTP_ENABLED);
    
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
      const phoneNumber = `+91${phone}`;
      console.log('1. Phone number:', phoneNumber);
      console.log('2. Firebase Auth object:', auth);
      console.log('3. Auth app name:', auth?.app?.name);
      console.log('4. Auth project ID:', auth?.app?.options?.projectId);
      
      try {
        const checkResult = await sendOTP(phoneNumber);
        console.log('5. Backend check result:', checkResult);
        if (checkResult.success) {
          setIsNewUser(checkResult.isNewUser);
        } else {
          setIsNewUser(true);
        }
      } catch (error) {
        console.error('6. User check error:', error);
        setIsNewUser(true);
      }
      
      // Clear existing verifier if any
      if (window.recaptchaVerifier) {
        console.log('7. Clearing existing reCAPTCHA verifier');
        try {
          window.recaptchaVerifier.clear();
        } catch (error) {
          console.error('7a. Error clearing verifier:', error);
        }
        window.recaptchaVerifier = null;
      }

      // Ensure container exists - create if not found
      let containerElement = document.getElementById('recaptcha-container');
      console.log('8. Container element found:', !!containerElement);
      if (!containerElement) {
        console.log('8a. Creating container element');
        containerElement = document.createElement('div');
        containerElement.id = 'recaptcha-container';
        // Set styles to make it accessible but invisible
        containerElement.style.position = 'absolute';
        containerElement.style.left = '-9999px';
        containerElement.style.width = '1px';
        containerElement.style.height = '1px';
        containerElement.style.overflow = 'hidden';
        containerElement.style.visibility = 'hidden';
        // Append to body, not inside the form
        document.body.appendChild(containerElement);
        console.log('8b. Container created and appended to body');
      }

      // Wait for DOM to be fully ready
      await new Promise(resolve => setTimeout(resolve, 300));
      
      // Double check container exists and is accessible
      containerElement = document.getElementById('recaptcha-container');
      if (!containerElement) {
        console.error('8c. ERROR: Container still not found after creation!');
        throw new Error('reCAPTCHA container could not be created');
      }
      console.log('9. DOM ready, container verified, setting up reCAPTCHA');

      // Setup reCAPTCHA (invisible - user won't see it)
      if (!window.recaptchaVerifier) {
        try {
          console.log('10. Calling setupRecaptcha...');
          setupRecaptcha('recaptcha-container');
          console.log('11. reCAPTCHA setup successful');
          console.log('11a. Verifier created:', !!window.recaptchaVerifier);
        } catch (error) {
          console.error('12. reCAPTCHA setup error:', error);
          console.error('12a. Error details:', {
            message: error.message,
            code: error.code,
            stack: error.stack
          });
          throw error;
        }
      } else {
        console.log('13. reCAPTCHA verifier already exists');
      }

      if (!window.recaptchaVerifier) {
        console.error('14. ERROR: reCAPTCHA verifier is null after setup!');
        throw new Error('reCAPTCHA verifier not initialized');
      }

      console.log('15. Calling signInWithPhoneNumber...');
      console.log('15a. Phone:', phoneNumber);
      console.log('15b. Verifier:', window.recaptchaVerifier);
      console.log('15c. Auth:', auth);
      
      // Send OTP - reCAPTCHA will be handled automatically in background
      const confirmationResult = await signInWithPhoneNumber(auth, phoneNumber, window.recaptchaVerifier);
      
      console.log('16. OTP sent successfully!');
      console.log('16a. Verification ID:', confirmationResult.verificationId);
      
      setVerificationId(confirmationResult.verificationId);
      setStep('otp');
      setLoading(false);
      toast.success('OTP sent successfully!');
      console.log('=== OTP SEND SUCCESS ===');
    } catch (error) {
      console.error('=== OTP SEND ERROR ===');
      console.error('Error object:', error);
      console.error('Error code:', error.code);
      console.error('Error message:', error.message);
      console.error('Error name:', error.name);
      console.error('Error stack:', error.stack);
      
      // Check for nested error
      if (error.error) {
        console.error('Nested error:', error.error);
        console.error('Nested error code:', error.error.code);
        console.error('Nested error message:', error.error.message);
      }
      
      setLoading(false);
      
      // Provide user-friendly error messages
      let errorMessage = 'Failed to send OTP. Please try again.';
      
      if (error.code === 'auth/invalid-app-credential' || 
          error.code === 400 || 
          error.message?.includes('INVALID_APP_CREDENTIAL') ||
          error.error?.code === 400 ||
          error.error?.message?.includes('INVALID_APP_CREDENTIAL')) {
        console.error('❌ INVALID_APP_CREDENTIAL detected!');
        console.error('');
        console.error('📋 Current Environment Check:');
        console.error('- Current URL:', window.location.href);
        console.error('- Current Hostname:', window.location.hostname);
        console.error('- Current Origin:', window.location.origin);
        console.error('- reCAPTCHA Verifier:', window.recaptchaVerifier ? '✅ Set' : '❌ Not set');
        console.error('');
        console.error('📋 Firebase Config Check:');
        console.error('- API Key:', firebaseConfig.apiKey?.substring(0, 10) + '...');
        console.error('- Project ID:', firebaseConfig.projectId);
        console.error('- Auth Domain:', firebaseConfig.authDomain);
        console.error('- App ID:', firebaseConfig.appId);
        console.error('');
        console.error('🔍 Common Causes & Fixes:');
        console.error('');
        console.error('1️⃣ AUTHORIZED DOMAINS MISSING');
        console.error('   → Go to: Firebase Console → Authentication → Settings → Authorized domains');
        console.error('   → Add your domain:', window.location.hostname);
        console.error('   → Link: https://console.firebase.google.com/project/growloan-bfa5a/authentication/settings');
        console.error('');
        console.error('2️⃣ reCAPTCHA DOMAIN MISMATCH');
        console.error('   → Current domain:', window.location.hostname, 'must be authorized in Firebase');
        console.error('   → Check: Firebase Console → Authentication → Settings → Authorized domains');
        console.error('   → If using IP address, add it to authorized domains');
        console.error('');
        console.error('3️⃣ API KEY RESTRICTIONS');
        console.error('   → Go to: GCP Console → APIs & Services → Credentials');
        console.error('   → Find API key and check restrictions');
        console.error('   → Application restrictions: Should be "None" (for dev)');
        console.error('   → API restrictions: Should be "Don\'t restrict key" (for dev)');
        console.error('   → Link: https://console.cloud.google.com/apis/credentials?project=growloan-bfa5a');
        console.error('');
        console.error('4️⃣ IDENTITY TOOLKIT API NOT ENABLED (MOST COMMON!)');
        console.error('   → Go to: GCP Console → APIs & Services → Library');
        console.error('   → Enable: Identity Toolkit API');
        console.error('   → Link: https://console.cloud.google.com/apis/library/identitytoolkit.googleapis.com?project=growloan-bfa5a');
        console.error('');
        console.error('5️⃣ PHONE AUTHENTICATION NOT ENABLED');
        console.error('   → Go to: Firebase Console → Authentication → Sign-in method');
        console.error('   → Enable Phone provider');
        console.error('   → Link: https://console.firebase.google.com/project/growloan-bfa5a/authentication/providers');
        console.error('');
        console.error('6️⃣ FIREBASE CONFIG MISMATCH');
        console.error('   → Verify config matches Firebase Console → Project Settings → Your apps');
        console.error('   → Check: apiKey, authDomain, projectId, appId');
        console.error('');
        console.error('7️⃣ THIRD-PARTY COOKIES BLOCKED');
        console.error('   → Check browser settings: Allow third-party cookies');
        console.error('   → Check CSP headers: Allow Firebase and reCAPTCHA domains');
        console.error('');
        console.error('8️⃣ APP CHECK ENABLED (if applicable)');
        console.error('   → If App Check is enabled in Firebase, implement it in web app');
        console.error('   → Or disable App Check for development');
        console.error('');
        console.error('🔧 QUICK FIX STEPS (Do these in order):');
        console.error('');
        console.error('STEP 1: Add Authorized Domain');
        console.error('👉 Click: https://console.firebase.google.com/project/growloan-bfa5a/authentication/settings');
        console.error('   → Scroll to "Authorized domains"');
        console.error('   → Add:', window.location.hostname);
        console.error('   → If using IP, add:', window.location.hostname);
        console.error('');
        console.error('STEP 2: Enable Identity Toolkit API (MOST IMPORTANT!)');
        console.error('👉 Click: https://console.cloud.google.com/apis/library/identitytoolkit.googleapis.com?project=growloan-bfa5a');
        console.error('   → Click "Enable" button');
        console.error('   → Wait 30 seconds');
        console.error('');
        console.error('STEP 3: Remove API Key Restrictions');
        console.error('👉 Click: https://console.cloud.google.com/apis/credentials?project=growloan-bfa5a');
        console.error('   → Find API key: AIzaSyBCCCd_NoafkLMRtJOXgyZ-Vm9vSt_GE98');
        console.error('   → Application restrictions: Set to "None"');
        console.error('   → API restrictions: Set to "Don\'t restrict key"');
        console.error('   → Click "Save"');
        console.error('');
        console.error('STEP 4: Enable Phone Authentication');
        console.error('👉 Click: https://console.firebase.google.com/project/growloan-bfa5a/authentication/providers');
        console.error('   → Click on "Phone" provider → Toggle "Enable" to ON → Click "Save"');
        console.error('');
        console.error('STEP 5: Wait 2-3 minutes, clear cache, restart server, try again');
        console.error('');
        console.error('📄 See FIREBASE_FIX_INVALID_APP_CREDENTIAL.md or QUICK_FIREBASE_FIX.md for details');
        
        // Show detailed error modal
        setShowConfigError(true);
        
        errorMessage = `Firebase configuration issue detected.\n\nCurrent domain: ${window.location.hostname}\n\nQuick Fix:\n1. Add domain to authorized domains\n2. Enable Identity Toolkit API\n3. Remove API key restrictions\n4. Enable Phone Authentication\n5. Wait 2-3 minutes\n\nSee console for direct links.`;
        toast.error(`⚠️ Firebase Config Error: Domain ${window.location.hostname} may not be authorized`, {
          autoClose: 15000
        });
      } else if (error.code === 'auth/too-many-requests' || 
                 error.message?.includes('too-many-requests') ||
                 error.message?.includes('TOO_MANY_ATTEMPTS') ||
                 error.error?.message?.includes('TOO_MANY_ATTEMPTS')) {
        console.error('TOO_MANY_ATTEMPTS_TRY_LATER detected!');
        console.error('Rate limit exceeded. Please wait before trying again.');
        console.error('Error code:', error.code);
        console.error('Error message:', error.message);
        
        errorMessage = 'Too many OTP requests. Please wait 2-3 minutes before trying again.';
        toast.error('⏰ Too many attempts. Please wait 2-3 minutes and try again.', {
          autoClose: 5000
        });
        
        // Set retry timer (2 minutes = 120 seconds)
        const waitTime = 120000; // 2 minutes in milliseconds
        console.log('Setting retry timer for', waitTime / 1000, 'seconds');
        setRetryAfter(waitTime);
        
        // Clear any existing interval
        if (retryIntervalRef.current) {
          console.log('Clearing existing retry interval');
          clearInterval(retryIntervalRef.current);
          retryIntervalRef.current = null;
        }
        
        // Countdown timer
        console.log('Starting countdown timer...');
        retryIntervalRef.current = setInterval(() => {
          setRetryAfter((prev) => {
            if (prev === null) {
              if (retryIntervalRef.current) {
                clearInterval(retryIntervalRef.current);
                retryIntervalRef.current = null;
              }
              return null;
            }
            if (prev <= 1000) {
              console.log('Retry timer completed!');
              if (retryIntervalRef.current) {
                clearInterval(retryIntervalRef.current);
                retryIntervalRef.current = null;
              }
              return null;
            }
            return prev - 1000;
          });
        }, 1000);
      } else if (error.code === 'auth/captcha-check-failed' || 
                 error.message?.includes('Hostname match not found') ||
                 error.message?.includes('captcha-check-failed')) {
        console.error('CAPTCHA_CHECK_FAILED detected!');
        console.error('Current hostname:', window.location.hostname);
        console.error('Current origin:', window.location.origin);
        console.error('This means the domain is not authorized in Firebase Console');
        
        errorMessage = 'Domain not authorized. Please:\n1. Add your domain/IP to Firebase authorized domains\n2. Or use localhost instead\n\nCurrent URL: ' + window.location.origin;
        toast.error('⚠️ Domain Authorization Error: Add ' + window.location.hostname + ' to Firebase authorized domains', {
          autoClose: 8000
        });
        
        console.error('🔧 FIX:');
        console.error('1. Go to Firebase Console > Authentication > Settings');
        console.error('2. Scroll to "Authorized domains"');
        console.error('3. Click "Add domain"');
        console.error('4. Add:', window.location.hostname);
        console.error('5. Or use localhost:3000 instead');
      } else if (error.code === 'auth/invalid-phone-number') {
        errorMessage = 'Invalid phone number format.';
        toast.error(errorMessage);
      } else {
        errorMessage = error.message || 'Failed to send OTP. Please try again.';
        toast.error(errorMessage);
      }
      
      // Clean up on error - with better error handling
      // Don't clear immediately - let reCAPTCHA finish its operations
      // The container element should stay in DOM to prevent null reference errors
      if (window.recaptchaVerifier) {
        // Ensure container exists before any cleanup
        let containerElement = document.getElementById('recaptcha-container');
        if (!containerElement) {
          // Recreate container if it was removed
          containerElement = document.createElement('div');
          containerElement.id = 'recaptcha-container';
          containerElement.setAttribute('data-recaptcha-container', 'true');
          containerElement.style.position = 'absolute';
          containerElement.style.left = '-9999px';
          containerElement.style.width = '1px';
          containerElement.style.height = '1px';
          containerElement.style.overflow = 'hidden';
          containerElement.style.visibility = 'hidden';
          containerElement.style.pointerEvents = 'none';
          document.body.appendChild(containerElement);
          console.log('Recreated reCAPTCHA container after error');
        }
        
        // Don't clear immediately - delay to let reCAPTCHA finish
        // This prevents the "Cannot read properties of null" error
        setTimeout(() => {
          try {
            const delayedContainer = document.getElementById('recaptcha-container');
            if (delayedContainer && window.recaptchaVerifier && window.recaptchaVerifier.clear) {
              window.recaptchaVerifier.clear();
            }
          } catch (delayedClearError) {
            // Silently ignore - reCAPTCHA might have already cleaned up
            console.warn('Error in delayed clear (non-critical, ignored):', delayedClearError.message);
          }
          window.recaptchaVerifier = null;
        }, 500); // Longer delay to ensure reCAPTCHA finishes
      }
      console.log('=== OTP SEND ERROR END ===');
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
      const credential = PhoneAuthProvider.credential(verificationId, otp);
      const userCredential = await signInWithCredential(auth, credential);
      const firebaseUser = userCredential.user;
      
      const idToken = await firebaseUser.getIdToken();
      const nameToSend = isNewUser && name.trim() ? name : undefined;
      
      const result = await loginWithFirebase(idToken, firebaseUser.phoneNumber, nameToSend);
      
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
        }
      }
    } catch (error) {
      console.error('OTP verification error:', error);
      setLoading(false);
      toast.error(error.message || 'Invalid OTP. Please try again.');
    }
  };

  const handleResendOTP = async () => {
    setOtp('');
    setStep('phone');
    setVerificationId(null);
    setName('');
    await handleSendOTP();
  };

  return (
    <div className="min-h-screen gradient-hero flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate(-1)}
            className="text-white hover:bg-white/20"
          >
            <ArrowLeft className="w-6 h-6" />
          </Button>
          <h1 className="text-2xl font-bold text-white">Welcome to GrowLoan</h1>
          <div className="w-10" />
        </div>

        {/* Card */}
        <div className="bg-card rounded-3xl p-8 shadow-2xl">
          {/* Logo */}
          <div className="text-center mb-8">
            <div className="text-3xl font-bold text-gradient mb-2">GROW ₹ LOAN</div>
            <p className="text-muted-foreground">Fast & Secure Loans</p>
          </div>

          {/* reCAPTCHA container - invisible, handled automatically in background */}
          {/* Keep this element in DOM at all times to prevent null reference errors */}
          <div 
            id="recaptcha-container" 
            ref={recaptchaContainerRef}
            data-recaptcha-container="true"
            style={{ 
              position: 'absolute',
              left: '-9999px',
              width: '1px',
              height: '1px',
              overflow: 'hidden',
              visibility: 'hidden',
              pointerEvents: 'none'
            }}
          ></div>

          {/* Phone Input */}
          {step === 'phone' && (
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium mb-2">Phone Number</label>
                <div className="relative">
                  <Phone className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                  <div className="absolute left-12 top-1/2 -translate-y-1/2 text-muted-foreground">+91</div>
                  <Input
                    type="tel"
                    placeholder="Enter 10-digit phone number"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value.replace(/\D/g, '').slice(0, 10))}
                    className="pl-20 h-14 text-lg rounded-xl"
                    maxLength={10}
                  />
                </div>
              </div>

              <div className="flex items-start space-x-2">
                <Checkbox
                  id="privacy"
                  checked={privacyAccepted}
                  onCheckedChange={(checked) => setPrivacyAccepted(checked)}
                />
                <label htmlFor="privacy" className="text-sm text-muted-foreground cursor-pointer">
                  I accept the privacy policy and terms of service
                </label>
              </div>

              <Button
                onClick={handleSendOTP}
                className="w-full gradient-primary text-primary-foreground h-14 text-lg rounded-xl"
                disabled={loading || phone.length !== 10 || !privacyAccepted || (OTP_ENABLED && retryAfter !== null && retryAfter > 0)}
              >
                {loading 
                  ? (OTP_ENABLED ? 'Sending...' : 'Processing...')
                  : !OTP_ENABLED
                    ? 'Continue'
                    : retryAfter !== null && retryAfter > 0 
                      ? `⏰ Wait ${Math.ceil(retryAfter / 1000)}s` 
                      : 'Send OTP'}
              </Button>
              {retryAfter !== null && retryAfter > 0 && (
                <p className="text-sm text-center text-muted-foreground mt-2">
                  Too many attempts. Please wait before trying again.
                </p>
              )}
            </div>
          )}

          {/* Name Input (when OTP disabled and new user) */}
          {step === 'name' && !OTP_ENABLED && (
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium mb-2">Your Name</label>
                <Input
                  type="text"
                  placeholder="Enter your full name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="h-14 text-lg rounded-xl"
                />
              </div>

              <Button
                onClick={handleNameSubmit}
                className="w-full gradient-primary text-primary-foreground h-14 text-lg rounded-xl"
                disabled={loading || !name.trim()}
              >
                {loading ? 'Creating Account...' : 'Create Account'}
              </Button>
            </div>
          )}

          {/* OTP Input */}
          {step === 'otp' && OTP_ENABLED && (
            <div className="space-y-6">
              {isNewUser && (
                <div>
                  <label className="block text-sm font-medium mb-2">Your Name</label>
                  <Input
                    type="text"
                    placeholder="Enter your full name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="h-14 text-lg rounded-xl"
                  />
                </div>
              )}

              <div>
                <label className="block text-sm font-medium mb-2">Enter OTP</label>
                <div className="relative">
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                  <Input
                    type="text"
                    placeholder="Enter 6-digit OTP"
                    value={otp}
                    onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                    className="pl-12 h-14 text-lg tracking-widest rounded-xl"
                    maxLength={6}
                  />
                </div>
              </div>

              <div className="text-center">
                <Button
                  variant="link"
                  onClick={handleResendOTP}
                  className="text-primary"
                  disabled={loading}
                >
                  Resend OTP
                </Button>
              </div>

              <Button
                onClick={handleVerifyOTP}
                className="w-full gradient-primary text-primary-foreground h-14 text-lg rounded-xl"
                disabled={loading || !privacyAccepted || otp.length !== 6 || (isNewUser && !name.trim())}
              >
                {loading ? 'Verifying...' : 'Verify OTP'}
              </Button>
            </div>
          )}
        </div>

        <p className="text-center text-white/70 text-sm mt-6">
          By continuing, you agree to our Terms of Service and Privacy Policy
        </p>
      </div>

      {/* Configuration Error Modal */}
      {showConfigError && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-2xl font-bold text-red-600">⚠️ Firebase Configuration Error</h2>
                <button
                  onClick={() => setShowConfigError(false)}
                  className="text-gray-400 hover:text-gray-600 text-2xl"
                >
                  ×
                </button>
              </div>
              
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-4">
                <p className="text-sm text-yellow-800 mb-2">
                  <strong>Current Domain:</strong> {window.location.hostname}
                </p>
                <p className="text-sm text-yellow-800">
                  <strong>Issue:</strong> Firebase cannot validate app credentials. This is a configuration issue that needs to be fixed manually.
                </p>
              </div>

              <div className="space-y-4">
                <div className="border rounded-lg p-4 bg-red-50">
                  <h3 className="font-semibold text-lg mb-2 text-red-700">1️⃣ Authorized Domains Missing ⚠️ CHECK FIRST</h3>
                  <p className="text-sm text-gray-700 mb-3">
                    Your current domain <strong>{window.location.hostname}</strong> must be added to Firebase authorized domains.
                  </p>
                  <a
                    href={`https://console.firebase.google.com/project/${firebaseConfig.projectId}/authentication/settings`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-block bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 text-sm font-medium mb-2"
                  >
                    → Open Authorized Domains Settings
                  </a>
                  <p className="text-xs text-gray-600 mt-2">
                    Scroll to "Authorized domains" → Click "Add domain" → Add: <code className="bg-gray-100 px-1">{window.location.hostname}</code>
                  </p>
                  <p className="text-xs text-gray-500 mt-1">
                    If using IP address (like 10.104.182.147), add that too.
                  </p>
                </div>

                <div className="border rounded-lg p-4 bg-red-50">
                  <h3 className="font-semibold text-lg mb-2 text-red-700">2️⃣ reCAPTCHA Domain Mismatch</h3>
                  <p className="text-sm text-gray-700 mb-3">
                    reCAPTCHA verifier requires the domain to be authorized. Check if your domain matches Firebase settings.
                  </p>
                  <p className="text-xs text-gray-600">
                    Current domain: <code className="bg-gray-100 px-1">{window.location.hostname}</code> must match authorized domains.
                  </p>
                  <p className="text-xs text-gray-500 mt-1">
                    If using localhost, make sure "localhost" is in authorized domains.
                  </p>
                </div>

                <div className="border rounded-lg p-4">
                  <h3 className="font-semibold text-lg mb-2">3️⃣ API Key Restrictions</h3>
                  <p className="text-sm text-gray-600 mb-3">
                    If API key is restricted to "HTTP referrers" and your domain is not allowed, this error occurs.
                  </p>
                  <a
                    href={`https://console.cloud.google.com/apis/credentials?project=${firebaseConfig.projectId}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-block bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 text-sm font-medium"
                  >
                    → Open API Credentials Page
                  </a>
                  <p className="text-xs text-gray-500 mt-2">
                    Find API key: <code className="bg-gray-100 px-1">{firebaseConfig.apiKey.substring(0, 20)}...</code>
                  </p>
                  <p className="text-xs text-gray-500 mt-1">
                    <strong>Application restrictions:</strong> Set to <strong>"None"</strong> (for dev)
                  </p>
                  <p className="text-xs text-gray-500">
                    <strong>API restrictions:</strong> Set to <strong>"Don't restrict key"</strong> (for dev)
                  </p>
                  <p className="text-xs text-gray-500 mt-1">
                    OR if restricted, add your domain to allowed HTTP referrers.
                  </p>
                </div>

                <div className="border rounded-lg p-4 bg-orange-50">
                  <h3 className="font-semibold text-lg mb-2 text-orange-700">4️⃣ Identity Toolkit API Not Enabled ⚠️ MOST COMMON</h3>
                  <p className="text-sm text-gray-700 mb-3">
                    This is the #1 cause of this error. Identity Toolkit API must be enabled.
                  </p>
                  <a
                    href={`https://console.cloud.google.com/apis/library/identitytoolkit.googleapis.com?project=${firebaseConfig.projectId}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-block bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 text-sm font-medium"
                  >
                    → Open Identity Toolkit API Page
                  </a>
                  <p className="text-xs text-gray-600 mt-2">
                    Look for "API enabled" with green checkmark. If you see "Enable" button, click it and wait 30 seconds.
                  </p>
                </div>

                <div className="border rounded-lg p-4">
                  <h3 className="font-semibold text-lg mb-2">5️⃣ Phone Authentication Not Enabled</h3>
                  <p className="text-sm text-gray-600 mb-3">
                    Make sure Phone Authentication is enabled in Firebase Console.
                  </p>
                  <a
                    href={`https://console.firebase.google.com/project/${firebaseConfig.projectId}/authentication/providers`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-block bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 text-sm font-medium"
                  >
                    → Open Firebase Authentication Providers
                  </a>
                  <p className="text-xs text-gray-500 mt-2">
                    Click on "Phone" provider → Toggle "Enable" to ON → Click "Save".
                  </p>
                </div>

                <div className="border rounded-lg p-4">
                  <h3 className="font-semibold text-lg mb-2">6️⃣ Firebase Config Mismatch</h3>
                  <p className="text-sm text-gray-600 mb-2">
                    Verify your firebaseConfig matches Firebase Console settings.
                  </p>
                  <a
                    href={`https://console.firebase.google.com/project/${firebaseConfig.projectId}/settings/general`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-block bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 text-sm font-medium"
                  >
                    → Open Firebase Project Settings
                  </a>
                  <p className="text-xs text-gray-500 mt-2">
                    Check: apiKey, authDomain, projectId, appId match your code.
                  </p>
                </div>

                <div className="border rounded-lg p-4">
                  <h3 className="font-semibold text-lg mb-2">7️⃣ Third-Party Cookies / CSP Blocked</h3>
                  <p className="text-sm text-gray-600 mb-2">
                    Browser settings or CSP policy might be blocking Firebase/reCAPTCHA.
                  </p>
                  <p className="text-xs text-gray-500">
                    • Check browser settings: Allow third-party cookies<br/>
                    • Check CSP headers: Allow Firebase and reCAPTCHA domains<br/>
                    • Try in incognito/private mode to test
                  </p>
                </div>

                <div className="border rounded-lg p-4">
                  <h3 className="font-semibold text-lg mb-2">8️⃣ App Check Enabled (if applicable)</h3>
                  <p className="text-sm text-gray-600 mb-2">
                    If App Check is enabled in Firebase but not implemented in web app, auth will fail.
                  </p>
                  <p className="text-xs text-gray-500">
                    • Implement App Check in your web app, OR<br/>
                    • Disable App Check for development in Firebase Console
                  </p>
                </div>

                <div className="border rounded-lg p-4">
                  <h3 className="font-semibold text-lg mb-2">Step 4: After Making Changes</h3>
                  <ol className="list-decimal list-inside text-sm text-gray-700 space-y-1">
                    <li>Wait 2-3 minutes for changes to propagate</li>
                    <li>Clear browser cache (Ctrl+Shift+Delete)</li>
                    <li>Restart development server</li>
                    <li>Try sending OTP again</li>
                  </ol>
                </div>
              </div>

              <div className="mt-6 flex gap-3">
                <Button
                  onClick={() => {
                    // Open all links in new tabs
                    window.open(`https://console.firebase.google.com/project/${firebaseConfig.projectId}/authentication/settings`, '_blank');
                    window.open(`https://console.cloud.google.com/apis/library/identitytoolkit.googleapis.com?project=${firebaseConfig.projectId}`, '_blank');
                    window.open(`https://console.cloud.google.com/apis/credentials?project=${firebaseConfig.projectId}`, '_blank');
                    window.open(`https://console.firebase.google.com/project/${firebaseConfig.projectId}/authentication/providers`, '_blank');
                    window.open(`https://console.firebase.google.com/project/${firebaseConfig.projectId}/settings/general`, '_blank');
                  }}
                  className="flex-1 gradient-primary text-white"
                >
                  Open All Fix Links
                </Button>
                <Button
                  onClick={() => setShowConfigError(false)}
                  variant="outline"
                  className="flex-1"
                >
                  Close
                </Button>
              </div>
              
              <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                <p className="text-xs text-blue-800">
                  <strong>💡 Tip:</strong> After making changes, wait 2-3 minutes, clear browser cache, restart server, then try again.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Login;
