import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { toast } from 'react-toastify';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Lock, User } from 'lucide-react';
import { Loader } from '../components/ui/Loader';

const AdminLogin = () => {
  const navigate = useNavigate();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e) => {
    e.preventDefault();
    
    if (!username || !password) {
      toast.error('Please enter both username and password');
      return;
    }

    setLoading(true);
    try {
      const response = await axios.post('/admin/login', {
        username,
        password
      });

      if (response.data.success) {
        localStorage.setItem('adminToken', response.data.token);
        localStorage.setItem('adminUser', JSON.stringify(response.data.admin));
        toast.success('Login successful!');
        navigate('/admin/dashboard');
      }
    } catch (error) {
      toast.error(error.response?.data?.message || 'Invalid credentials');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen gradient-hero flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-card rounded-3xl shadow-2xl p-8 border border-border">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gradient mb-2">Admin Login</h1>
          <p className="text-muted-foreground">Enter your credentials to access admin panel</p>
        </div>

        <form onSubmit={handleLogin} className="space-y-6">
          <div>
            <label className="block text-sm font-medium mb-2">Username</label>
            <div className="relative">
              <User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
              <Input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Enter username"
                className="pl-12 h-14 text-lg rounded-xl"
                disabled={loading}
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Password</label>
            <div className="relative">
              <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
              <Input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter password"
                className="pl-12 h-14 text-lg rounded-xl"
                disabled={loading}
              />
            </div>
          </div>

          <Button
            type="submit"
            className="w-full gradient-primary text-primary-foreground h-14 text-lg rounded-xl"
            disabled={loading}
          >
            {loading ? (
              <div className="flex items-center gap-2">
                <div className="w-5 h-5 border-2 border-current/30 border-t-current rounded-full animate-spin" />
                Logging in...
              </div>
            ) : (
              'Login'
            )}
          </Button>
        </form>

        <div className="mt-6 text-center">
          <button
            onClick={() => navigate('/')}
            className="text-sm text-muted-foreground hover:text-primary transition-colors"
          >
            ← Back to Home
          </button>
        </div>
      </div>
    </div>
  );
};

export default AdminLogin;

