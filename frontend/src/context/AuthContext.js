import React, { createContext, useState, useContext, useEffect } from 'react';
import axios from 'axios';
import { toast } from 'react-toastify';
import { auth } from '../config/firebase';
import { onAuthStateChanged, signOut as firebaseSignOut } from 'firebase/auth';

const AuthContext = createContext();

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

const API_URL = 'http://localhost:5000/api';

axios.defaults.baseURL = API_URL;

// Add axios interceptor to handle 401 errors globally
axios.interceptors.response.use(
  (response) => response,
  (error) => {
    // Handle 401 errors (unauthorized)
    if (error.response?.status === 401) {
      const errorMessage = error.response?.data?.message || 'Unauthorized';
      
      // Only show toast if it's not already being handled
      if (!error.config?.skipErrorToast) {
        // Check if it's a token error
        if (errorMessage.includes('token') || errorMessage.includes('authorization')) {
          // Clear token and redirect to login
          localStorage.removeItem('token');
          localStorage.removeItem('hasFirebaseAuth');
          delete axios.defaults.headers.common['Authorization'];
          
          // Only show one toast, not multiple
          if (!window.authErrorShown) {
            window.authErrorShown = true;
            setTimeout(() => {
              window.authErrorShown = false;
            }, 3000);
            toast.error('Session expired. Please login again.');
          }
        }
      }
    }
    return Promise.reject(error);
  }
);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      fetchUser();
    } else {
      setLoading(false);
    }

    // Listen to Firebase auth state changes (only if token exists)
    // When OTP is disabled, we don't need Firebase auth, so only listen if we have a token
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      // Only enforce Firebase auth if we have a token (meaning user logged in with OTP)
      // If no token, user might have logged in without OTP (direct login)
      if (token) {
        if (firebaseUser) {
          // User is authenticated with both Firebase and our backend
          fetchUser();
        } else {
          // Firebase user signed out, but only logout if we actually had Firebase auth
          // Don't logout if user logged in without OTP (direct login)
          const hasFirebaseAuth = localStorage.getItem('hasFirebaseAuth') === 'true';
          if (hasFirebaseAuth) {
            handleLogout();
          }
        }
      }
    });

    return () => unsubscribe();
  }, []);

  const fetchUser = async () => {
    try {
      const response = await axios.get('/auth/me');
      setUser(response.data.user);
    } catch (error) {
      localStorage.removeItem('token');
      delete axios.defaults.headers.common['Authorization'];
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  const sendOTP = async (phone) => {
    // Check if user exists in our system before sending OTP
    try {
      const response = await axios.post('/auth/check-user', { phone });
      return { 
        success: true, 
        isNewUser: response.data.isNewUser,
        exists: response.data.exists
      };
    } catch (error) {
      console.error('Check user error:', error);
      // If check fails, assume new user to be safe
      return { success: true, isNewUser: true, exists: false };
    }
  };

  // Direct login/signup with phone number (when OTP is disabled)
  const loginWithPhoneDirect = async (phoneNumber, name) => {
    try {
      console.log('=== FRONTEND: loginWithPhoneDirect START ===');
      console.log('Phone number:', phoneNumber);
      console.log('Name provided:', name || 'Not provided');
      
      const requestData = { 
        phoneNumber,
        name: name || undefined,
        skipFirebase: true // Flag to indicate Firebase verification should be skipped
      };
      console.log('Request data keys:', Object.keys(requestData));
      
      console.log('Sending request to /auth/login-direct...');
      const response = await axios.post('/auth/login-direct', requestData);
      console.log('Response received:', {
        hasToken: !!response.data.token,
        hasUser: !!response.data.user,
        isNewUser: response.data.isNewUser
      });
      
      const { token, user, isNewUser } = response.data;
      localStorage.setItem('token', token);
      localStorage.setItem('hasFirebaseAuth', 'false'); // Mark as direct login (no Firebase)
      // Set token in axios headers immediately
      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      setUser(user);
      console.log('User set in context:', {
        id: user.id,
        name: user.name,
        phone: user.phone
      });
      
      toast.success(isNewUser ? 'Account created successfully!' : 'Login successful!');
      
      // Check if profile is complete
      const isProfileComplete = !!(
        user.name &&
        user.phone &&
        user.email &&
        user.dateOfBirth &&
        user.address &&
        user.city &&
        user.state &&
        user.pincode &&
        user.employmentType &&
        user.aadharNumber &&
        user.panNumber
      );
      
      console.log('Profile complete check:', {
        isProfileComplete,
        hasName: !!user.name,
        hasPhone: !!user.phone,
        hasEmail: !!user.email,
        hasDateOfBirth: !!user.dateOfBirth,
        hasAddress: !!user.address,
        hasCity: !!user.city,
        hasState: !!user.state,
        hasPincode: !!user.pincode,
        hasEmploymentType: !!user.employmentType,
        hasAadhar: !!user.aadharNumber,
        hasPAN: !!user.panNumber
      });
      
      return {
        success: true,
        needsProfileSetup: !isProfileComplete,
        isNewUser
      };
    } catch (error) {
      console.error('=== FRONTEND: loginWithPhoneDirect ERROR ===');
      console.error('Error:', error);
      console.error('Error response:', error.response?.data);
      console.error('=== FRONTEND: loginWithPhoneDirect ERROR END ===');
      
      if (error.response?.data?.requiresName) {
        return {
          success: false,
          requiresName: true
        };
      }
      
      throw error;
    }
  };

  const loginWithFirebase = async (idToken, phoneNumber, name) => {
    try {
      console.log('=== FRONTEND: loginWithFirebase START ===');
      console.log('Phone number:', phoneNumber);
      console.log('Name provided:', name || 'Not provided');
      console.log('ID Token length:', idToken ? idToken.length : 'No token');
      
      const requestData = { 
        idToken, 
        phoneNumber,
        name: name || undefined // Only send name if provided
      };
      console.log('Request data keys:', Object.keys(requestData));
      
      console.log('Sending request to /auth/verify-firebase...');
      const response = await axios.post('/auth/verify-firebase', requestData);
      console.log('Response received:', {
        hasToken: !!response.data.token,
        hasUser: !!response.data.user,
        isNewUser: response.data.isNewUser
      });
      
      const { token, user, isNewUser } = response.data;
      localStorage.setItem('token', token);
      localStorage.setItem('hasFirebaseAuth', 'true'); // Mark as Firebase login
      // Set token in axios headers immediately
      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      setUser(user);
      console.log('User set in context:', {
        id: user.id,
        name: user.name,
        phone: user.phone
      });
      
      toast.success(isNewUser ? 'Account created successfully!' : 'Login successful!');
      
      // Check if profile is complete
      const isProfileComplete = !!(
        user.name &&
        user.phone &&
        user.email &&
        user.dateOfBirth &&
        user.address &&
        user.city &&
        user.state &&
        user.pincode &&
        user.employmentType &&
        user.aadharNumber &&
        user.panNumber
      );
      
      console.log('Profile complete check:', {
        isProfileComplete,
        hasName: !!user.name,
        hasPhone: !!user.phone,
        hasEmail: !!user.email,
        hasDateOfBirth: !!user.dateOfBirth,
        hasAddress: !!user.address,
        hasCity: !!user.city,
        hasState: !!user.state,
        hasPincode: !!user.pincode,
        hasEmploymentType: !!user.employmentType,
        hasAadhar: !!user.aadharNumber,
        hasPAN: !!user.panNumber
      });
      
      if (!isProfileComplete) {
        console.log('Profile incomplete - will redirect to profile setup');
        console.log('=== FRONTEND: loginWithFirebase SUCCESS (needs profile) ===\n');
        // Will redirect to profile setup
        return { success: true, isNewUser, needsProfileSetup: true };
      }
      
      console.log('=== FRONTEND: loginWithFirebase SUCCESS ===\n');
      return { success: true, isNewUser };
    } catch (error) {
      console.error('=== FRONTEND: loginWithFirebase ERROR ===');
      console.error('Error:', error);
      console.error('Error response:', error.response);
      console.error('Error response data:', error.response?.data);
      console.error('Error response status:', error.response?.status);
      
      const message = error.response?.data?.message || 'Authentication failed';
      const requiresName = error.response?.data?.requiresName;
      const isNewUser = error.response?.data?.isNewUser;
      
      console.log('Error details:', {
        message,
        requiresName,
        isNewUser
      });
      
      if (requiresName) {
        console.log('Name required - returning requiresName flag');
        console.log('=== FRONTEND: loginWithFirebase ERROR (name required) ===\n');
        // Don't show error toast, just return requiresName flag
        return { success: false, message, requiresName: true, isNewUser: true };
      } else {
        console.log('Showing error toast');
        toast.error(message);
      }
      
      console.log('=== FRONTEND: loginWithFirebase ERROR END ===\n');
      return { success: false, message, requiresName: false };
    }
  };

  const updateProfile = async (profileData) => {
    try {
      const response = await axios.put('/auth/profile', profileData);
      setUser(response.data.user);
      toast.success('Profile updated successfully!');
      return { success: true };
    } catch (error) {
      const message = error.response?.data?.message || 'Failed to update profile';
      toast.error(message);
      return { success: false, message };
    }
  };

  const handleLogout = async () => {
    try {
      // Sign out from Firebase
      await firebaseSignOut(auth);
    } catch (error) {
      console.error('Firebase signout error:', error);
    }
    
    localStorage.removeItem('token');
    delete axios.defaults.headers.common['Authorization'];
    setUser(null);
    toast.success('Logged out successfully');
  };

  return (
    <AuthContext.Provider value={{ 
      user, 
      loading, 
      sendOTP, 
      loginWithFirebase,
      loginWithPhoneDirect,
      updateProfile,
      logout: handleLogout, 
      fetchUser 
    }}>
      {children}
    </AuthContext.Provider>
  );
};
