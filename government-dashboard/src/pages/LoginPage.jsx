import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Lock, Mail, AlertCircle, Eye, EyeOff, Shield, ArrowRight, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';

const LoginPage = () => {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [formData, setFormData] = useState({
    email: '',
    password: ''
  });
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    const result = await login(formData.email, formData.password);
    
    if (result.success) {
      toast.success('Login successful!');
      navigate('/dashboard');
    } else {
      setError(result.message || 'Login failed');
      toast.error(result.message || 'Login failed');
    }
    
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8 relative overflow-hidden">
      {/* Animated Background Effects */}
      <div className="absolute inset-0">
        {/* Grid Pattern */}
        <div className="absolute inset-0 opacity-5" style={{backgroundImage: 'radial-gradient(circle at 2px 2px, cyan 1px, transparent 0)', backgroundSize: '40px 40px'}} />
        
        {/* Glowing Orbs */}
        <div className="absolute top-20 left-20 w-96 h-96 bg-cyan-500/20 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-20 right-20 w-80 h-80 bg-blue-500/15 rounded-full blur-3xl animate-pulse" style={{animationDelay: '1s'}} />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-cyan-600/10 rounded-full blur-3xl" />
        
        {/* Animated Lines */}
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-cyan-500 to-transparent opacity-50" />
        <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-cyan-500 to-transparent opacity-50" />
      </div>
      
      <div className="max-w-md w-full relative z-10">
        {/* Logo Section */}
        <div className="text-center mb-8">
          <Link to="/" className="inline-flex flex-col items-center space-y-4 group">
            {/* Logo with glow effect */}
            <div className="relative">
              <div className="absolute inset-0 bg-gradient-to-br from-cyan-400 to-blue-500 rounded-full blur-xl opacity-50 group-hover:opacity-70 transition-all duration-500" />
              <div className="relative w-28 h-28 bg-gradient-to-br from-slate-800 to-slate-900 rounded-full flex items-center justify-center overflow-hidden shadow-2xl ring-4 ring-cyan-400/50 group-hover:ring-cyan-400 transition-all duration-500">
                <img 
                  src="/assets/rnp-logo.png"
                  alt="Rwanda National Police"
                  className="w-24 h-24 object-contain"
                />
              </div>
            </div>
            <div className="text-center">
              <h1 className="text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-white via-cyan-200 to-white">
                Rwanda National Police
              </h1>
              <p className="text-cyan-400 text-sm font-medium mt-1">Traffic Management System</p>
            </div>
          </Link>
        </div>

        {/* Login Form Card */}
        <div className="relative">
          {/* Card Glow Effect */}
          <div className="absolute -inset-1 bg-gradient-to-r from-cyan-500/20 via-blue-500/20 to-cyan-500/20 rounded-3xl blur-xl" />
          
          <div className="relative bg-slate-800/80 backdrop-blur-xl rounded-3xl shadow-2xl border border-cyan-400/20 p-8 overflow-hidden">
            {/* Decorative Corner */}
            <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-cyan-500/10 to-transparent rounded-bl-full" />
            
            {/* Admin Badge */}
            <div className="flex items-center justify-center mb-6">
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-cyan-500/10 border border-cyan-400/30">
                <Shield className="w-4 h-4 text-cyan-400" />
                <span className="text-cyan-300 text-sm font-semibold">Admin Portal</span>
              </div>
            </div>

            <h2 className="text-2xl font-bold text-white mb-2 text-center">
              Welcome Back
            </h2>
            <p className="text-slate-400 text-center text-sm mb-6">
              Sign in to access your dashboard
            </p>

            {/* Error Message */}
            {error && (
              <div className="mb-6 p-4 bg-red-500/10 border border-red-500/30 rounded-xl flex items-center text-red-400">
                <AlertCircle className="w-5 h-5 mr-3 flex-shrink-0" />
                <span className="text-sm">{error}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-5">
              {/* Email Field */}
              <div className="group">
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Email Address
                </label>
                <div className="relative">
                  <Mail className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-slate-500 group-focus-within:text-cyan-400 transition-colors" />
                  <input
                    type="email"
                    required
                    value={formData.email}
                    onChange={(e) => setFormData({...formData, email: e.target.value})}
                    className="w-full pl-12 pr-4 py-3.5 bg-slate-700/50 border border-slate-600/50 rounded-xl text-white placeholder-slate-500 focus:ring-2 focus:ring-cyan-500/50 focus:border-cyan-400/50 focus:bg-slate-700 transition-all duration-300"
                    placeholder="admin@rnp.gov.rw"
                  />
                </div>
              </div>

              {/* Password Field with Toggle */}
              <div className="group">
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Password
                </label>
                <div className="relative">
                  <Lock className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-slate-500 group-focus-within:text-cyan-400 transition-colors" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={formData.password}
                    onChange={(e) => setFormData({...formData, password: e.target.value})}
                    className="w-full pl-12 pr-12 py-3.5 bg-slate-700/50 border border-slate-600/50 rounded-xl text-white placeholder-slate-500 focus:ring-2 focus:ring-cyan-500/50 focus:border-cyan-400/50 focus:bg-slate-700 transition-all duration-300"
                    placeholder="••••••••"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-4 top-1/2 transform -translate-y-1/2 text-slate-500 hover:text-cyan-400 transition-colors"
                  >
                    {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={loading}
                className="w-full relative group overflow-hidden bg-gradient-to-r from-cyan-600 to-blue-600 text-white py-4 rounded-xl font-bold text-lg shadow-lg shadow-cyan-500/30 hover:shadow-cyan-500/50 hover:from-cyan-500 hover:to-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300"
              >
                <span className="relative z-10 flex items-center justify-center gap-2">
                  {loading ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      Signing in...
                    </>
                  ) : (
                    <>
                      Sign In
                      <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                    </>
                  )}
                </span>
                {/* Button Shine Effect */}
                <div className="absolute inset-0 -translate-x-full group-hover:translate-x-full bg-gradient-to-r from-transparent via-white/20 to-transparent transition-transform duration-700" />
              </button>
            </form>

            {/* Contact Admin Info */}
            <div className="mt-8 pt-6 border-t border-slate-700/50 text-center">
              <p className="text-slate-400 text-sm">
                Need access? Contact your system administrator
              </p>
            </div>

            {/* Back to Home */}
            <div className="mt-4 text-center">
              <Link to="/" className="inline-flex items-center gap-2 text-slate-500 hover:text-cyan-400 text-sm transition-colors group">
                <ArrowRight className="w-4 h-4 rotate-180 group-hover:-translate-x-1 transition-transform" />
                Back to Home
              </Link>
            </div>
          </div>
        </div>

        {/* Footer Note */}
        <p className="text-center text-slate-500 text-xs mt-8">
          Authorized Personnel Only
        </p>
      </div>
    </div>
  );
};

export default LoginPage;
