import React, { useState, useRef, useEffect } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  User,
  Mail,
  Shield,
  MapPin,
  Camera,
  Save,
  X,
  CheckCircle,
  Lock,
  Eye,
  EyeOff,
  ArrowLeft,
  Phone,
  BadgeCheck,
  Building2
} from 'lucide-react';
import axios from 'axios';
import toast from 'react-hot-toast';

// Create axios instance with auth
const api = axios.create({
  baseURL: 'http://localhost:3000/api',
  headers: { 'Content-Type': 'application/json' },
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

const Profile = () => {
  const { isAuthenticated, user, updateUser } = useAuth();
  const navigate = useNavigate();
  const fileInputRef = useRef(null);
  
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setSaving] = useState(false);
  const [showPasswordSection, setShowPasswordSection] = useState(false);
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [profilePicture, setProfilePicture] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  
  const [formData, setFormData] = useState({
    full_name: '',
    email: '',
    phone: '',
    badge_number: '',
  });
  
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });

  useEffect(() => {
    if (user) {
      setFormData({
        full_name: user.fullName || user.full_name || '',
        email: user.email || '',
        phone: user.phone || '',
        badge_number: user.badge_number || '',
      });
      // Load existing profile picture
      if (user.profile_picture) {
        setPreviewUrl(`http://localhost:3000${user.profile_picture}`);
      }
    }
  }, [user]);

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handlePasswordChange = (e) => {
    const { name, value } = e.target;
    setPasswordData(prev => ({ ...prev, [name]: value }));
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        toast.error('Image size should be less than 5MB');
        return;
      }
      setProfilePicture(file);
      setPreviewUrl(URL.createObjectURL(file));
    }
  };

  const handleSaveProfile = async () => {
    try {
      setSaving(true);
      
      // Create form data for file upload
      const formDataToSend = new FormData();
      formDataToSend.append('full_name', formData.full_name);
      formDataToSend.append('phone', formData.phone || '');
      
      if (profilePicture) {
        formDataToSend.append('profile_picture', profilePicture);
      }
      
      const response = await api.put('/auth/profile', formDataToSend, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      
      if (response.data.success) {
        toast.success('Profile updated successfully!');
        // Update local user data
        if (updateUser) {
          updateUser(response.data.data);
        }
        // Update preview URL with saved picture
        if (response.data.data.profile_picture) {
          setPreviewUrl(`http://localhost:3000${response.data.data.profile_picture}`);
        }
        setIsEditing(false);
        setProfilePicture(null);
      }
    } catch (error) {
      console.error('Error updating profile:', error);
      toast.error(error.response?.data?.message || 'Failed to update profile');
    } finally {
      setSaving(false);
    }
  };

  const handleChangePassword = async () => {
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      toast.error('New passwords do not match');
      return;
    }
    
    if (passwordData.newPassword.length < 6) {
      toast.error('Password must be at least 6 characters');
      return;
    }
    
    try {
      setSaving(true);
      const response = await api.put('/auth/change-password', {
        currentPassword: passwordData.currentPassword,
        newPassword: passwordData.newPassword,
      });
      
      if (response.data.success) {
        toast.success('Password changed successfully!');
        setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' });
        setShowPasswordSection(false);
      }
    } catch (error) {
      console.error('Error changing password:', error);
      toast.error(error.response?.data?.message || 'Failed to change password');
    } finally {
      setSaving(false);
    }
  };

  const getRoleBadge = () => {
    const role = user?.role;
    if (role === 'admin') {
      return { label: 'Super Admin', color: 'bg-purple-500/20 text-purple-400 border-purple-500/50' };
    } else if (role === 'district_admin') {
      return { label: 'District Admin', color: 'bg-orange-500/20 text-orange-400 border-orange-500/50' };
    } else if (role === 'police') {
      return { label: 'Police Officer', color: 'bg-blue-500/20 text-blue-400 border-blue-500/50' };
    }
    return { label: role, color: 'bg-gray-500/20 text-gray-400 border-gray-500/50' };
  };

  const roleBadge = getRoleBadge();

  return (
    <div className="min-h-screen p-6">
      <div className="max-w-4xl mx-auto">
        {/* Header with Back Button */}
        <div className="mb-8">
          <div className="flex items-center gap-4 mb-2">
            <button
              onClick={() => navigate(-1)}
              className="p-2 hover:bg-slate-700/50 rounded-lg transition-colors text-gray-400 hover:text-white"
              title="Go Back"
            >
              <ArrowLeft className="w-6 h-6" />
            </button>
            <h1 className="text-3xl font-bold text-white flex items-center gap-3">
              <User className="w-8 h-8 text-blue-400" />
              My Profile
            </h1>
          </div>
          <p className="text-gray-400 mt-2">Manage your account settings and profile information</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Profile Picture Card */}
          <div className="lg:col-span-1">
            <div className="bg-slate-800/50 backdrop-blur border border-white/10 rounded-2xl p-6">
              <div className="flex flex-col items-center">
                {/* Profile Picture */}
                <div className="relative group">
                  <div className="w-32 h-32 rounded-full overflow-hidden bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
                    {previewUrl ? (
                      <img
                        src={previewUrl}
                        alt="Profile"
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <span className="text-4xl font-bold text-white">
                        {formData.full_name?.charAt(0)?.toUpperCase() || 'U'}
                      </span>
                    )}
                  </div>
                  
                  {isEditing && (
                    <button
                      onClick={() => fileInputRef.current?.click()}
                      className="absolute bottom-0 right-0 p-2 bg-blue-600 hover:bg-blue-700 rounded-full text-white transition-colors shadow-lg"
                    >
                      <Camera className="w-5 h-5" />
                    </button>
                  )}
                  
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleFileChange}
                    className="hidden"
                  />
                </div>

                {/* Name and Role */}
                <h2 className="mt-4 text-xl font-bold text-white">{formData.full_name}</h2>
                <span className={`mt-2 px-3 py-1 rounded-full text-xs font-bold border ${roleBadge.color}`}>
                  {roleBadge.label}
                </span>
                
                {user?.districtName && (
                  <div className="mt-3 flex items-center gap-2 text-gray-400 text-sm">
                    <Building2 className="w-4 h-4" />
                    {user.districtName} District
                  </div>
                )}

                {/* Edit Button */}
                {!isEditing ? (
                  <button
                    onClick={() => setIsEditing(true)}
                    className="mt-6 w-full py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors"
                  >
                    Edit Profile
                  </button>
                ) : (
                  <div className="mt-6 w-full flex gap-2">
                    <button
                      onClick={() => {
                        setIsEditing(false);
                        setProfilePicture(null);
                        if (user?.profile_picture) {
                          setPreviewUrl(`http://localhost:3000${user.profile_picture}`);
                        } else {
                          setPreviewUrl(null);
                        }
                      }}
                      className="flex-1 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg font-medium transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleSaveProfile}
                      disabled={loading}
                      className="flex-1 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
                    >
                      {loading ? (
                        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                      ) : (
                        <>
                          <Save className="w-4 h-4" />
                          Save
                        </>
                      )}
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Profile Details Card */}
          <div className="lg:col-span-2 space-y-6">
            {/* Personal Information */}
            <div className="bg-slate-800/50 backdrop-blur border border-white/10 rounded-2xl p-6">
              <h3 className="text-lg font-bold text-white mb-6 flex items-center gap-2">
                <BadgeCheck className="w-5 h-5 text-blue-400" />
                Personal Information
              </h3>
              
              <div className="space-y-4">
                {/* Full Name */}
                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-2">Full Name</label>
                  {isEditing ? (
                    <input
                      type="text"
                      name="full_name"
                      value={formData.full_name}
                      onChange={handleInputChange}
                      className="w-full px-4 py-3 bg-slate-900/50 border border-white/10 rounded-lg text-white focus:outline-none focus:border-blue-500 transition-colors"
                    />
                  ) : (
                    <div className="flex items-center gap-3 px-4 py-3 bg-slate-900/30 rounded-lg">
                      <User className="w-5 h-5 text-gray-500" />
                      <span className="text-white">{formData.full_name}</span>
                    </div>
                  )}
                </div>

                {/* Email (Read-only) */}
                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-2">Email Address</label>
                  <div className="flex items-center gap-3 px-4 py-3 bg-slate-900/30 rounded-lg">
                    <Mail className="w-5 h-5 text-gray-500" />
                    <span className="text-white">{formData.email}</span>
                    <CheckCircle className="w-4 h-4 text-green-500 ml-auto" />
                  </div>
                  <p className="text-xs text-gray-500 mt-1">Email cannot be changed</p>
                </div>

                {/* Phone */}
                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-2">Phone Number</label>
                  {isEditing ? (
                    <input
                      type="tel"
                      name="phone"
                      value={formData.phone}
                      onChange={handleInputChange}
                      placeholder="+250 7XX XXX XXX"
                      className="w-full px-4 py-3 bg-slate-900/50 border border-white/10 rounded-lg text-white focus:outline-none focus:border-blue-500 transition-colors"
                    />
                  ) : (
                    <div className="flex items-center gap-3 px-4 py-3 bg-slate-900/30 rounded-lg">
                      <Phone className="w-5 h-5 text-gray-500" />
                      <span className="text-white">{formData.phone || 'Not set'}</span>
                    </div>
                  )}
                </div>

                {/* Badge Number (for police) */}
                {user?.role === 'police' && (
                  <div>
                    <label className="block text-sm font-medium text-gray-400 mb-2">Badge Number</label>
                    <div className="flex items-center gap-3 px-4 py-3 bg-slate-900/30 rounded-lg">
                      <Shield className="w-5 h-5 text-gray-500" />
                      <span className="text-white">{formData.badge_number || 'Not assigned'}</span>
                    </div>
                  </div>
                )}

                {/* Role */}
                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-2">Role</label>
                  <div className="flex items-center gap-3 px-4 py-3 bg-slate-900/30 rounded-lg">
                    <Shield className="w-5 h-5 text-gray-500" />
                    <span className={`px-2 py-0.5 rounded text-xs font-bold ${roleBadge.color}`}>
                      {roleBadge.label}
                    </span>
                  </div>
                </div>

                {/* District (if applicable) */}
                {user?.districtName && (
                  <div>
                    <label className="block text-sm font-medium text-gray-400 mb-2">Assigned District</label>
                    <div className="flex items-center gap-3 px-4 py-3 bg-slate-900/30 rounded-lg">
                      <MapPin className="w-5 h-5 text-gray-500" />
                      <span className="text-white">{user.districtName}</span>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Change Password Section */}
            <div className="bg-slate-800/50 backdrop-blur border border-white/10 rounded-2xl p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                  <Lock className="w-5 h-5 text-yellow-400" />
                  Security
                </h3>
                <button
                  onClick={() => setShowPasswordSection(!showPasswordSection)}
                  className="text-sm text-blue-400 hover:text-blue-300 transition-colors"
                >
                  {showPasswordSection ? 'Cancel' : 'Change Password'}
                </button>
              </div>

              {showPasswordSection ? (
                <div className="space-y-4">
                  {/* Current Password */}
                  <div>
                    <label className="block text-sm font-medium text-gray-400 mb-2">Current Password</label>
                    <div className="relative">
                      <input
                        type={showCurrentPassword ? 'text' : 'password'}
                        name="currentPassword"
                        value={passwordData.currentPassword}
                        onChange={handlePasswordChange}
                        className="w-full px-4 py-3 bg-slate-900/50 border border-white/10 rounded-lg text-white focus:outline-none focus:border-blue-500 transition-colors pr-12"
                      />
                      <button
                        type="button"
                        onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300"
                      >
                        {showCurrentPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                      </button>
                    </div>
                  </div>

                  {/* New Password */}
                  <div>
                    <label className="block text-sm font-medium text-gray-400 mb-2">New Password</label>
                    <div className="relative">
                      <input
                        type={showNewPassword ? 'text' : 'password'}
                        name="newPassword"
                        value={passwordData.newPassword}
                        onChange={handlePasswordChange}
                        className="w-full px-4 py-3 bg-slate-900/50 border border-white/10 rounded-lg text-white focus:outline-none focus:border-blue-500 transition-colors pr-12"
                      />
                      <button
                        type="button"
                        onClick={() => setShowNewPassword(!showNewPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300"
                      >
                        {showNewPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                      </button>
                    </div>
                  </div>

                  {/* Confirm Password */}
                  <div>
                    <label className="block text-sm font-medium text-gray-400 mb-2">Confirm New Password</label>
                    <input
                      type="password"
                      name="confirmPassword"
                      value={passwordData.confirmPassword}
                      onChange={handlePasswordChange}
                      className="w-full px-4 py-3 bg-slate-900/50 border border-white/10 rounded-lg text-white focus:outline-none focus:border-blue-500 transition-colors"
                    />
                  </div>

                  <button
                    onClick={handleChangePassword}
                    disabled={loading || !passwordData.currentPassword || !passwordData.newPassword || !passwordData.confirmPassword}
                    className="w-full py-3 bg-yellow-600 hover:bg-yellow-700 text-white rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  >
                    {loading ? (
                      <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                    ) : (
                      <>
                        <Lock className="w-4 h-4" />
                        Update Password
                      </>
                    )}
                  </button>
                </div>
              ) : (
                <p className="text-gray-400 text-sm">
                  Keep your account secure by using a strong password. Click "Change Password" to update your credentials.
                </p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Profile;
