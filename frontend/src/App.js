import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { AuthProvider, useAuth } from './context/AuthContext';
import Login from './pages/Login';
import Signup from './pages/Signup';
import Home from './pages/Home';
import LoanApplications from './pages/LoanApplications';
import ProfileSetup from './pages/ProfileSetup';
import Landing from './pages/Landing';
import TransactionHistory from './pages/TransactionHistory';
import Payment from './pages/Payment';
import AdminLogin from './pages/AdminLogin';
import AdminDashboard from './pages/AdminDashboard';
import NotFound from './pages/NotFound';
import { Loader } from './components/ui/Loader';
import './App.css';

const PrivateRoute = ({ children }) => {
  const { user, loading } = useAuth();
  
  if (loading) {
    return <Loader fullScreen text="Authenticating..." size="lg" />;
  }
  
  return user ? children : <Navigate to="/login" />;
};

const ProfileCheckRoute = ({ children }) => {
  const { user, loading } = useAuth();
  
  if (loading) {
    return <Loader fullScreen text="Loading..." size="lg" />;
  }
  
  if (!user) {
    return <Navigate to="/login" />;
  }
  
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
  
  if (!isProfileComplete) {
    return <Navigate to="/profile-setup" />;
  }
  
  return children;
};

function App() {
  return (
    <AuthProvider>
      <Router
        future={{
          v7_startTransition: true,
          v7_relativeSplatPath: true
        }}
      >
        <div className="App">
          <Routes>
            <Route path="/" element={<Landing />} />
            <Route path="/login" element={<Login />} />
            <Route path="/signup" element={<Signup />} />
            <Route 
              path="/profile-setup" 
              element={
                <PrivateRoute>
                  <ProfileSetup />
                </PrivateRoute>
              } 
            />
            <Route 
              path="/home" 
              element={
                <ProfileCheckRoute>
                  <Home />
                </ProfileCheckRoute>
              } 
            />
            <Route 
              path="/applications" 
              element={
                <ProfileCheckRoute>
                  <LoanApplications />
                </ProfileCheckRoute>
              } 
            />
            <Route 
              path="/transactions" 
              element={
                <ProfileCheckRoute>
                  <TransactionHistory />
                </ProfileCheckRoute>
              } 
            />
            <Route 
              path="/payment" 
              element={
                <ProfileCheckRoute>
                  <Payment />
                </ProfileCheckRoute>
              } 
            />
            <Route path="/admin/login" element={<AdminLogin />} />
            <Route 
              path="/admin/dashboard" 
              element={<AdminDashboard />} 
            />
            {/* Catch-all route for 404 - must be last */}
            <Route path="*" element={<NotFound />} />
          </Routes>
          <ToastContainer 
            position="top-right"
            autoClose={3000}
            hideProgressBar={false}
            newestOnTop={false}
            closeOnClick
            rtl={false}
            pauseOnFocusLoss
            draggable
            pauseOnHover
          />
        </div>
      </Router>
    </AuthProvider>
  );
}

export default App;

