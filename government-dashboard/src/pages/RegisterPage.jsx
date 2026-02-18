import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { User, Mail, Lock, Phone, Eye, EyeOff, UserPlus, Sparkles, Info } from 'lucide-react';
import toast from 'react-hot-toast';

const RegisterPage = () => {
  const navigate = useNavigate();
  const { register } = useAuth();
  const [formData, setFormData] = useState({
    full_name: '',
    email: '',
    phone_number: '',
    password: '',
    confirm_password: ''
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (formData.password !== formData.confirm_password) {
      setError('Passwords do not match');
      return;
    }

    if (formData.password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }

    setLoading(true);

    const result = await register({
      full_name: formData.full_name,
      email: formData.email,
      phone_number: formData.phone_number,
      password: formData.password,
      role: 'user'
    });
    
    if (result.success) {
      toast.success('Registration successful! Please login.');
      navigate('/login');
    } else {
      setError(result.message || 'Registration failed');
      toast.error(result.message || 'Registration failed');
    }
    
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center p-4 relative overflow-hidden">
      {/* Animated Background Elements */}
      <div className="absolute inset-0 overflow-hidden">
        {/* Floating Orbs */}
        <div className="absolute top-20 left-20 w-72 h-72 bg-cyan-500/20 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute bottom-20 right-20 w-96 h-96 bg-blue-500/20 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }}></div>
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-80 h-80 bg-emerald-500/10 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '2s' }}></div>
        
        {/* Grid Pattern */}
        <div className="absolute inset-0 bg-[linear-gradient(rgba(6,182,212,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(6,182,212,0.03)_1px,transparent_1px)] bg-[size:50px_50px]"></div>
        
        {/* Animated Particles */}
        <div className="absolute top-1/4 left-1/4 w-2 h-2 bg-cyan-400 rounded-full animate-ping" style={{ animationDuration: '2s' }}></div>
        <div className="absolute top-3/4 right-1/4 w-2 h-2 bg-blue-400 rounded-full animate-ping" style={{ animationDuration: '3s' }}></div>
        <div className="absolute bottom-1/4 left-1/3 w-2 h-2 bg-emerald-400 rounded-full animate-ping" style={{ animationDuration: '2.5s' }}></div>
      </div>

      {/* Animated Waves at Bottom */}
      <div className="absolute bottom-0 left-0 right-0 h-40 overflow-hidden">
        <svg className="absolute bottom-0 w-full h-24" viewBox="0 0 1440 100" preserveAspectRatio="none">
          <path
            fill="rgba(6, 182, 212, 0.1)"
            d="M0,50 C360,100 720,0 1080,50 C1260,75 1380,25 1440,50 L1440,100 L0,100 Z"
          >
            <animate
              attributeName="d"
              dur="10s"
              repeatCount="indefinite"
              values="M0,50 C360,100 720,0 1080,50 C1260,75 1380,25 1440,50 L1440,100 L0,100 Z;
                      M0,70 C360,20 720,80 1080,30 C1260,10 1380,60 1440,40 L1440,100 L0,100 Z;
                      M0,50 C360,100 720,0 1080,50 C1260,75 1380,25 1440,50 L1440,100 L0,100 Z"
            />
          </path>
        </svg>
        <svg className="absolute bottom-0 w-full h-20" viewBox="0 0 1440 80" preserveAspectRatio="none">
          <path
            fill="rgba(6, 182, 212, 0.05)"
            d="M0,40 C480,80 960,0 1440,40 L1440,80 L0,80 Z"
          >
            <animate
              attributeName="d"
              dur="8s"
              repeatCount="indefinite"
              values="M0,40 C480,80 960,0 1440,40 L1440,80 L0,80 Z;
                      M0,60 C480,20 960,60 1440,30 L1440,80 L0,80 Z;
                      M0,40 C480,80 960,0 1440,40 L1440,80 L0,80 Z"
            />
          </path>
        </svg>
      </div>

      {/* Main Card */}
      <div className="relative max-w-md w-full my-8">
        {/* Glow Effect Behind Card */}
        <div className="absolute -inset-1 bg-gradient-to-r from-cyan-500/30 via-blue-500/30 to-emerald-500/30 rounded-3xl blur-xl opacity-70"></div>
        
        <div className="relative bg-slate-800/80 backdrop-blur-xl rounded-2xl shadow-2xl p-8 border border-cyan-400/20">
          {/* Header */}
          <div className="text-center mb-6">
            <div className="relative inline-flex items-center justify-center w-20 h-20 mb-4">
              {/* Animated Ring */}
              <div className="absolute inset-0 rounded-full border-2 border-cyan-400/30 animate-ping" style={{ animationDuration: '3s' }}></div>
              <div className="absolute inset-2 rounded-full border border-cyan-400/50"></div>
              <div className="relative w-16 h-16 bg-gradient-to-br from-cyan-500 to-blue-600 rounded-full flex items-center justify-center shadow-lg shadow-cyan-500/30">
                <UserPlus className="w-8 h-8 text-white" />
              </div>
            </div>
            <h1 className="text-3xl font-bold text-white mb-2">
              Create Account
            </h1>
            <p className="text-slate-400 flex items-center justify-center gap-2">
              <Sparkles className="w-4 h-4 text-cyan-400" />
              Join TrafficGuard Management
              <Sparkles className="w-4 h-4 text-cyan-400" />
            </p>
          </div>

          {/* Info Note */}
          <div className="mb-6 p-3 bg-cyan-500/10 border border-cyan-400/30 rounded-xl flex items-start gap-3">
            <Info className="w-5 h-5 text-cyan-400 flex-shrink-0 mt-0.5" />
            <p className="text-sm text-cyan-100/80">
              Registration is for authorized District Admins and Super Admins only.
            </p>
          </div>

          {/* Error Message */}
          {error && (
            <div className="mb-6 p-4 bg-red-500/20 border border-red-400/30 rounded-xl animate-pulse">
              <p className="text-red-400 text-sm text-center font-medium">{error}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Full Name Field */}
            <div className="group">
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Full Name
              </label>
              <div className="relative">
                <div className="absolute left-3 top-1/2 transform -translate-y-1/2 w-10 h-10 bg-cyan-500/20 rounded-lg flex items-center justify-center group-focus-within:bg-cyan-500/30 transition-colors">
                  <User className="w-5 h-5 text-cyan-400" />
                </div>
                <input
                  type="text"
                  required
                  value={formData.full_name}
                  onChange={(e) => setFormData({...formData, full_name: e.target.value})}
                  className="w-full pl-16 pr-4 py-3.5 bg-slate-700/50 border border-slate-600 rounded-xl text-white placeholder-slate-400 focus:ring-2 focus:ring-cyan-500 focus:border-cyan-400 transition-all duration-300 hover:border-slate-500"
                  placeholder="John Doe"
                />
              </div>
            </div>

            {/* Email Field */}
            <div className="group">
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Email Address
              </label>
              <div className="relative">
                <div className="absolute left-3 top-1/2 transform -translate-y-1/2 w-10 h-10 bg-cyan-500/20 rounded-lg flex items-center justify-center group-focus-within:bg-cyan-500/30 transition-colors">
                  <Mail className="w-5 h-5 text-cyan-400" />
                </div>
                <input
                  type="email"
                  required
                  value={formData.email}
                  onChange={(e) => setFormData({...formData, email: e.target.value})}
                  className="w-full pl-16 pr-4 py-3.5 bg-slate-700/50 border border-slate-600 rounded-xl text-white placeholder-slate-400 focus:ring-2 focus:ring-cyan-500 focus:border-cyan-400 transition-all duration-300 hover:border-slate-500"
                  placeholder="your.email@example.com"
                />
              </div>
            </div>

            {/* Phone Number Field */}
            <div className="group">
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Phone Number
              </label>
              <div className="relative">
                <div className="absolute left-3 top-1/2 transform -translate-y-1/2 w-10 h-10 bg-cyan-500/20 rounded-lg flex items-center justify-center group-focus-within:bg-cyan-500/30 transition-colors">
                  <Phone className="w-5 h-5 text-cyan-400" />
                </div>
                <input
                  type="tel"
                  required
                  value={formData.phone_number}
                  onChange={(e) => setFormData({...formData, phone_number: e.target.value})}
                  className="w-full pl-16 pr-4 py-3.5 bg-slate-700/50 border border-slate-600 rounded-xl text-white placeholder-slate-400 focus:ring-2 focus:ring-cyan-500 focus:border-cyan-400 transition-all duration-300 hover:border-slate-500"
                  placeholder="+250 7XX XXX XXX"
                />
              </div>
            </div>

            {/* Password Field */}
            <div className="group">
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Password
              </label>
              <div className="relative">
                <div className="absolute left-3 top-1/2 transform -translate-y-1/2 w-10 h-10 bg-cyan-500/20 rounded-lg flex items-center justify-center group-focus-within:bg-cyan-500/30 transition-colors">
                  <Lock className="w-5 h-5 text-cyan-400" />
                </div>
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={formData.password}
                  onChange={(e) => setFormData({...formData, password: e.target.value})}
                  className="w-full pl-16 pr-14 py-3.5 bg-slate-700/50 border border-slate-600 rounded-xl text-white placeholder-slate-400 focus:ring-2 focus:ring-cyan-500 focus:border-cyan-400 transition-all duration-300 hover:border-slate-500"
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 w-10 h-10 bg-slate-600/50 rounded-lg flex items-center justify-center text-slate-400 hover:text-cyan-400 hover:bg-slate-600 transition-all duration-300"
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>

            {/* Confirm Password Field */}
            <div className="group">
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Confirm Password
              </label>
              <div className="relative">
                <div className="absolute left-3 top-1/2 transform -translate-y-1/2 w-10 h-10 bg-cyan-500/20 rounded-lg flex items-center justify-center group-focus-within:bg-cyan-500/30 transition-colors">
                  <Lock className="w-5 h-5 text-cyan-400" />
                </div>
                <input
                  type={showConfirmPassword ? 'text' : 'password'}
                  required
                  value={formData.confirm_password}
                  onChange={(e) => setFormData({...formData, confirm_password: e.target.value})}
                  className="w-full pl-16 pr-14 py-3.5 bg-slate-700/50 border border-slate-600 rounded-xl text-white placeholder-slate-400 focus:ring-2 focus:ring-cyan-500 focus:border-cyan-400 transition-all duration-300 hover:border-slate-500"
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 w-10 h-10 bg-slate-600/50 rounded-lg flex items-center justify-center text-slate-400 hover:text-cyan-400 hover:bg-slate-600 transition-all duration-300"
                >
                  {showConfirmPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading}
              className="relative w-full group overflow-hidden mt-2"
            >
              <div className="absolute inset-0 bg-gradient-to-r from-cyan-500 to-blue-600 rounded-xl transition-all duration-300 group-hover:scale-105 group-hover:shadow-lg group-hover:shadow-cyan-500/30"></div>
              <div className="relative flex items-center justify-center py-4 text-white font-semibold">
                {loading ? (
                  <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <>
                    <UserPlus className="w-5 h-5 mr-2" />
                    Create Account
                  </>
                )}
              </div>
            </button>
          </form>

          {/* Footer Links */}
          <div className="mt-8 text-center space-y-3">
            <p className="text-slate-400">
              Already have an account?{' '}
              <Link to="/login" className="text-cyan-400 hover:text-cyan-300 font-semibold transition-colors">
                Sign in
              </Link>
            </p>
            <Link 
              to="/" 
              className="inline-flex items-center text-slate-500 hover:text-cyan-400 transition-colors text-sm"
            >
              <span className="mr-1">←</span> Back to Home
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RegisterPage;
