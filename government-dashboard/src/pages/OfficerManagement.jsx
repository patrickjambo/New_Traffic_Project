import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useWebSocket } from '../context/WebSocketContext';
import axios from '../config/axios';
import toast from 'react-hot-toast';
import {
  Users,
  Plus,
  Search,
  Edit2,
  Lock,
  UserX,
  UserCheck,
  Shield,
  Badge,
  Phone,
  Mail,
  MapPin,
  Clock,
  RefreshCw,
  X,
  Eye,
  EyeOff,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Trash2,
  Download,
} from 'lucide-react';

const OfficerManagement = () => {
  const { isAuthenticated, user } = useAuth();
  const { subscribe, onReconnect } = useWebSocket();
  const [officers, setOfficers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  
  // Modal states
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showResetPasswordModal, setShowResetPasswordModal] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showViewPasswordModal, setShowViewPasswordModal] = useState(false);
  const [selectedOfficer, setSelectedOfficer] = useState(null);
  const [confirmAction, setConfirmAction] = useState(null);
  const [officerPassword, setOfficerPassword] = useState('');
  const [showPasswordText, setShowPasswordText] = useState(false);
  
  // Form states
  const [formData, setFormData] = useState({
    email: '',
    full_name: '',
    password: '',
    badge_number: '',
    unit: 'Traffic Unit',
    phone: '',
  });
  const [newPassword, setNewPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const fetchOfficers = useCallback(async () => {
    // Guard: only fetch when user is authenticated and authorized
    if (!isAuthenticated || !user || (user?.role !== 'admin' && user?.role !== 'district_admin')) {
      return;
    }

    try {
      setLoading(true);
      const params = {};
      if (statusFilter === 'active') params.status = 'active';
      if (statusFilter === 'blocked') params.status = 'blocked';
      if (searchTerm) params.search = searchTerm;
      
      const response = await axios.get('/api/admin/officers', { params });
      setOfficers(response.data.data || []);
    } catch (error) {
      const status = error?.response?.status;
      const msg = error?.response?.data?.message || error.message || 'Failed to load officers';
      console.error('Error fetching officers:', error);
      // Show a clearer error for auth failures
      if (status === 401 || status === 403) {
        toast.error('Session expired or unauthorized. Please login again.');
      } else {
        toast.error(msg);
      }
    } finally {
      setLoading(false);
    }
  }, [statusFilter, searchTerm, isAuthenticated, user]);

  useEffect(() => {
    fetchOfficers();
  }, [fetchOfficers]);

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => {
      fetchOfficers();
    }, 300);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  // ─── WebSocket: auto-refresh when officers are created/updated/deleted ───
  useEffect(() => {
    if (!isAuthenticated || !subscribe) return;

    const unsubs = [
      subscribe('officer:created', (data) => {
        console.log('🔔 New officer created via WebSocket:', data);
        fetchOfficers();
      }),
      subscribe('officer:updated', () => fetchOfficers()),
      subscribe('officer:deleted', () => fetchOfficers()),
      subscribe('officer:status_changed', () => fetchOfficers()),
    ];

    return () => unsubs.forEach(fn => fn && fn());
  }, [isAuthenticated, subscribe, fetchOfficers]);

  // ─── Auto-refresh on WebSocket reconnection ───
  useEffect(() => {
    if (!isAuthenticated || !onReconnect) return;
    const unsubReconnect = onReconnect(() => {
      console.log('🔄 WebSocket reconnected — refreshing officers');
      fetchOfficers();
    });
    return () => unsubReconnect && unsubReconnect();
  }, [isAuthenticated, onReconnect, fetchOfficers]);

  const handleCreateOfficer = async (e) => {
    e.preventDefault();
    if (!formData.email || !formData.full_name || !formData.password) {
      toast.error('Please fill in all required fields');
      return;
    }

    if (formData.password.length < 6) {
      toast.error('Password must be at least 6 characters');
      return;
    }

    try {
      setSubmitting(true);
      const response = await axios.post('/api/admin/officers', formData);
      
      if (response.data.success) {
        // Store the password temporarily for viewing
        setOfficerPassword(formData.password);
        setSelectedOfficer(response.data.data);
        
        toast.success(
          <div>
            <strong>Officer Created!</strong>
            <br />
            <span className="text-sm">Email: {response.data.data.email}</span>
            <br />
            <span className="text-sm text-green-300">Can login on mobile app now</span>
          </div>,
          { duration: 5000 }
        );
        
        // Show view password modal
        setShowViewPasswordModal(true);
        setShowCreateModal(false);
        
        // Immediately refresh officer list
        fetchOfficers();
        resetForm();
      }
    } catch (error) {
      console.error('Error creating officer:', error);
      const errorMsg = error.response?.data?.message || 'Failed to create officer';
      toast.error(errorMsg);
    } finally {
      setSubmitting(false);
    }
  };

  const handleUpdateOfficer = async (e) => {
    e.preventDefault();
    if (!selectedOfficer) return;

    try {
      setSubmitting(true);
      await axios.put(`/api/admin/officers/${selectedOfficer.id}`, {
        full_name: formData.full_name,
        phone: formData.phone,
        badge_number: formData.badge_number,
        unit: formData.unit,
      });
      toast.success('Officer updated successfully');
      setShowEditModal(false);
      resetForm();
      fetchOfficers();
    } catch (error) {
      console.error('Error updating officer:', error);
      toast.error(error.response?.data?.message || 'Failed to update officer');
    } finally {
      setSubmitting(false);
    }
  };

  const handleResetPassword = async (e) => {
    e.preventDefault();
    if (!selectedOfficer || !newPassword) return;

    if (newPassword.length < 6) {
      toast.error('Password must be at least 6 characters');
      return;
    }

    try {
      setSubmitting(true);
      await axios.put(`/api/admin/officers/${selectedOfficer.id}/reset-password`, {
        newPassword,
      });
      toast.success(`Password reset for ${selectedOfficer.full_name}`);
      setShowResetPasswordModal(false);
      setNewPassword('');
      setSelectedOfficer(null);
    } catch (error) {
      console.error('Error resetting password:', error);
      toast.error(error.response?.data?.message || 'Failed to reset password');
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggleStatus = async () => {
    if (!selectedOfficer) return;

    try {
      setSubmitting(true);
      const newStatus = !selectedOfficer.is_active;
      await axios.put(`/api/admin/officers/${selectedOfficer.id}/toggle-status`, {
        is_active: newStatus,
        reason: confirmAction?.reason || 'Admin action',
      });
      toast.success(`Officer ${newStatus ? 'activated' : 'blocked'} successfully`);
      setShowConfirmModal(false);
      setSelectedOfficer(null);
      setConfirmAction(null);
      fetchOfficers();
    } catch (error) {
      console.error('Error toggling status:', error);
      toast.error(error.response?.data?.message || 'Failed to update officer status');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteOfficer = async () => {
    if (!selectedOfficer) return;

    try {
      setSubmitting(true);
      await axios.delete(`/api/admin/officers/${selectedOfficer.id}`);
      toast.success(
        <div>
          <strong>Officer Deleted!</strong>
          <br />
          <span className="text-sm">{selectedOfficer.full_name} has been permanently removed from the system</span>
        </div>,
        { duration: 5000 }
      );
      setShowDeleteModal(false);
      setSelectedOfficer(null);
      fetchOfficers();
    } catch (error) {
      console.error('Error deleting officer:', error);
      toast.error(error.response?.data?.message || 'Failed to delete officer');
    } finally {
      setSubmitting(false);
    }
  };

  const openDeleteModal = (officer) => {
    setSelectedOfficer(officer);
    setShowDeleteModal(true);
  };

  const resetForm = () => {
    setFormData({
      email: '',
      full_name: '',
      password: '',
      badge_number: '',
      unit: 'Traffic Unit',
      phone: '',
    });
    setSelectedOfficer(null);
  };

  const openEditModal = (officer) => {
    setSelectedOfficer(officer);
    setFormData({
      email: officer.email,
      full_name: officer.full_name,
      password: '',
      badge_number: officer.badge_number || '',
      unit: officer.unit || 'Traffic Unit',
      phone: officer.phone || '',
    });
    setShowEditModal(true);
  };

  const openResetPasswordModal = (officer) => {
    setSelectedOfficer(officer);
    setNewPassword('');
    setShowResetPasswordModal(true);
  };

  const openToggleStatusModal = (officer) => {
    setSelectedOfficer(officer);
    setConfirmAction({
      type: officer.is_active ? 'block' : 'activate',
      title: officer.is_active ? 'Block Officer' : 'Activate Officer',
      message: officer.is_active 
        ? `Are you sure you want to block ${officer.full_name}? They will not be able to login or receive alerts.`
        : `Are you sure you want to activate ${officer.full_name}? They will be able to login and receive alerts.`,
    });
    setShowConfirmModal(true);
  };

  // Download officers list as CSV
  const handleDownloadOfficers = () => {
    if (filteredOfficers.length === 0) {
      toast.error('No officers to download');
      return;
    }

    // CSV Headers
    const headers = [
      'Full Name',
      'Email',
      'Badge Number',
      'Unit',
      'Phone',
      'District',
      'Status',
      'Joined Date'
    ];

    // Map officers to CSV rows
    const rows = filteredOfficers.map(officer => [
      officer.full_name || '',
      officer.email || '',
      officer.badge_number || 'N/A',
      officer.unit || 'Traffic Unit',
      officer.phone || 'N/A',
      officer.district_name || 'Not Assigned',
      officer.is_active ? 'Active' : 'Blocked',
      new Date(officer.created_at).toLocaleDateString()
    ]);

    // Build CSV content
    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))
    ].join('\n');

    // Create and trigger download
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `officers_list_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    toast.success(`Downloaded ${filteredOfficers.length} officers`);
  };

  const getStatusBadge = (officer) => {
    if (!officer.is_active) {
      return (
        <span className="px-2 py-1 text-xs font-medium bg-red-500/20 text-red-400 rounded-full flex items-center gap-1">
          <XCircle className="w-3 h-3" />
          Blocked
        </span>
      );
    }
    if (officer.active_deployments > 0) {
      return (
        <span className="px-2 py-1 text-xs font-medium bg-yellow-500/20 text-yellow-400 rounded-full flex items-center gap-1">
          <AlertTriangle className="w-3 h-3" />
          Deployed
        </span>
      );
    }
    return (
      <span className="px-2 py-1 text-xs font-medium bg-green-500/20 text-green-400 rounded-full flex items-center gap-1">
        <CheckCircle className="w-3 h-3" />
        Active
      </span>
    );
  };

  // Allow both admin and district_admin roles
  if (!isAuthenticated || (user?.role !== 'admin' && user?.role !== 'district_admin')) {
    return <Navigate to="/login" />;
  }

  const filteredOfficers = officers;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <Shield className="w-8 h-8 text-blue-400" />
            Officer Management
          </h1>
          <p className="text-gray-400 mt-1">
            {user?.role === 'admin' 
              ? 'Create, manage, and monitor police officers across all districts' 
              : `Create, manage, and monitor police officers in ${user?.districtName || 'your district'}`}
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={handleDownloadOfficers}
            disabled={loading || officers.length === 0}
            className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 disabled:bg-green-600/50 text-white rounded-lg transition-colors"
            title="Download officers list as CSV"
          >
            <Download className="w-5 h-5" />
            Download List
          </button>
          <button
            onClick={() => {
              resetForm();
              setShowCreateModal(true);
            }}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
          >
            <Plus className="w-5 h-5" />
            Add Officer
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-slate-800/50 backdrop-blur border border-white/10 rounded-xl p-4">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search by name, email, or badge number..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-slate-900/50 border border-white/10 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-blue-500"
            />
          </div>
          <div className="flex gap-2">
            {['all', 'active', 'blocked'].map((status) => (
              <button
                key={status}
                onClick={() => setStatusFilter(status)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors capitalize ${
                  statusFilter === status
                    ? 'bg-blue-600 text-white'
                    : 'bg-slate-700/50 text-gray-400 hover:bg-slate-700 hover:text-white'
                }`}
              >
                {status}
              </button>
            ))}
          </div>
          <button
            onClick={fetchOfficers}
            className="p-2 bg-slate-700/50 hover:bg-slate-700 text-gray-400 hover:text-white rounded-lg transition-colors"
            title="Refresh"
          >
            <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-gradient-to-br from-blue-600/20 to-blue-800/20 border border-blue-500/30 rounded-xl p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-500/20 rounded-lg">
              <Users className="w-6 h-6 text-blue-400" />
            </div>
            <div>
              <p className="text-2xl font-bold text-white">{officers.length}</p>
              <p className="text-sm text-gray-400">Total Officers</p>
            </div>
          </div>
        </div>
        <div className="bg-gradient-to-br from-green-600/20 to-green-800/20 border border-green-500/30 rounded-xl p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-green-500/20 rounded-lg">
              <UserCheck className="w-6 h-6 text-green-400" />
            </div>
            <div>
              <p className="text-2xl font-bold text-white">
                {officers.filter(o => o.is_active).length}
              </p>
              <p className="text-sm text-gray-400">Active Officers</p>
            </div>
          </div>
        </div>
        <div className="bg-gradient-to-br from-red-600/20 to-red-800/20 border border-red-500/30 rounded-xl p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-red-500/20 rounded-lg">
              <UserX className="w-6 h-6 text-red-400" />
            </div>
            <div>
              <p className="text-2xl font-bold text-white">
                {officers.filter(o => !o.is_active).length}
              </p>
              <p className="text-sm text-gray-400">Blocked Officers</p>
            </div>
          </div>
        </div>
      </div>

      {/* Officers Table */}
      <div className="bg-slate-800/50 backdrop-blur border border-white/10 rounded-xl overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <RefreshCw className="w-8 h-8 text-blue-400 animate-spin" />
          </div>
        ) : filteredOfficers.length === 0 ? (
          <div className="text-center py-12">
            <Users className="w-12 h-12 text-gray-600 mx-auto mb-4" />
            <p className="text-gray-400">No officers found</p>
            <p className="text-gray-500 text-sm mt-1">Try adjusting your search or filters</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-900/50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                    Officer
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                    Badge / Unit
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                    Contact
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                    District
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                    Joined
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-400 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {filteredOfficers.map((officer) => (
                  <tr key={officer.id} className="hover:bg-slate-700/30 transition-colors">
                    <td className="px-4 py-4">
                      <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white font-bold ${
                          officer.is_active ? 'bg-gradient-to-br from-blue-500 to-cyan-600' : 'bg-gray-600'
                        }`}>
                          {officer.full_name?.charAt(0)?.toUpperCase() || 'O'}
                        </div>
                        <div>
                          <p className="text-white font-medium">{officer.full_name}</p>
                          <p className="text-gray-500 text-sm">{officer.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      <div className="flex items-center gap-2">
                        <Badge className="w-4 h-4 text-gray-400" />
                        <span className="text-white">{officer.badge_number || 'N/A'}</span>
                      </div>
                      <p className="text-gray-500 text-sm mt-1">{officer.unit || 'Traffic Unit'}</p>
                    </td>
                    <td className="px-4 py-4">
                      <div className="flex items-center gap-2 text-gray-400">
                        <Phone className="w-4 h-4" />
                        <span className="text-sm">{officer.phone || 'N/A'}</span>
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      <div className="flex items-center gap-2">
                        <MapPin className="w-4 h-4 text-gray-400" />
                        <span className={`text-sm ${officer.district_name ? 'text-white' : 'text-gray-500'}`}>
                          {officer.district_name || 'Not Assigned'}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      {getStatusBadge(officer)}
                    </td>
                    <td className="px-4 py-4">
                      <div className="flex items-center gap-2 text-gray-400">
                        <Clock className="w-4 h-4" />
                        <span className="text-sm">
                          {new Date(officer.created_at).toLocaleDateString()}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => openEditModal(officer)}
                          className="p-2 text-gray-400 hover:text-blue-400 hover:bg-blue-500/10 rounded-lg transition-colors"
                          title="Edit Officer"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => openResetPasswordModal(officer)}
                          className="p-2 text-gray-400 hover:text-yellow-400 hover:bg-yellow-500/10 rounded-lg transition-colors"
                          title="Reset Password"
                        >
                          <Lock className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => openToggleStatusModal(officer)}
                          className={`p-2 rounded-lg transition-colors ${
                            officer.is_active
                              ? 'text-gray-400 hover:text-red-400 hover:bg-red-500/10'
                              : 'text-gray-400 hover:text-green-400 hover:bg-green-500/10'
                          }`}
                          title={officer.is_active ? 'Block Officer' : 'Activate Officer'}
                        >
                          {officer.is_active ? <UserX className="w-4 h-4" /> : <UserCheck className="w-4 h-4" />}
                        </button>
                        <button
                          onClick={() => openDeleteModal(officer)}
                          className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-500/10 rounded-lg transition-colors"
                          title="Delete Officer"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Create Officer Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-slate-800 border border-white/10 rounded-xl w-full max-w-md">
            <div className="flex items-center justify-between p-4 border-b border-white/10">
              <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                <Plus className="w-5 h-5 text-blue-400" />
                Create New Officer
              </h3>
              <button
                onClick={() => setShowCreateModal(false)}
                className="p-1 text-gray-400 hover:text-white rounded-lg hover:bg-white/10"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleCreateOfficer} className="p-4 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">
                  Full Name <span className="text-red-400">*</span>
                </label>
                <input
                  type="text"
                  value={formData.full_name}
                  onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                  className="w-full px-4 py-2 bg-slate-900/50 border border-white/10 rounded-lg text-white focus:outline-none focus:border-blue-500"
                  placeholder="Officer Full Name"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">
                  Email <span className="text-red-400">*</span>
                </label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="w-full px-4 py-2 bg-slate-900/50 border border-white/10 rounded-lg text-white focus:outline-none focus:border-blue-500"
                  placeholder="officer@police.gov.rw"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">
                  Password <span className="text-red-400">*</span>
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    className="w-full px-4 py-2 pr-10 bg-slate-900/50 border border-white/10 rounded-lg text-white focus:outline-none focus:border-blue-500"
                    placeholder="Min 6 characters"
                    minLength={6}
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">Badge Number</label>
                  <input
                    type="text"
                    value={formData.badge_number}
                    onChange={(e) => setFormData({ ...formData, badge_number: e.target.value })}
                    className="w-full px-4 py-2 bg-slate-900/50 border border-white/10 rounded-lg text-white focus:outline-none focus:border-blue-500"
                    placeholder="RNP-0001"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">Phone</label>
                  <input
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    className="w-full px-4 py-2 bg-slate-900/50 border border-white/10 rounded-lg text-white focus:outline-none focus:border-blue-500"
                    placeholder="+250 7XX XXX XXX"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">Unit</label>
                <select
                  value={formData.unit}
                  onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
                  className="w-full px-4 py-2 bg-slate-900/50 border border-white/10 rounded-lg text-white focus:outline-none focus:border-blue-500"
                >
                  <option value="Traffic Unit">Traffic Unit</option>
                  <option value="Patrol Unit">Patrol Unit</option>
                  <option value="Emergency Response">Emergency Response</option>
                  <option value="Highway Patrol">Highway Patrol</option>
                  <option value="Special Operations">Special Operations</option>
                </select>
              </div>
              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="flex-1 px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-600/50 text-white rounded-lg transition-colors flex items-center justify-center gap-2"
                >
                  {submitting && <RefreshCw className="w-4 h-4 animate-spin" />}
                  Create Officer
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Officer Modal */}
      {showEditModal && selectedOfficer && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-slate-800 border border-white/10 rounded-xl w-full max-w-md">
            <div className="flex items-center justify-between p-4 border-b border-white/10">
              <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                <Edit2 className="w-5 h-5 text-blue-400" />
                Edit Officer
              </h3>
              <button
                onClick={() => setShowEditModal(false)}
                className="p-1 text-gray-400 hover:text-white rounded-lg hover:bg-white/10"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleUpdateOfficer} className="p-4 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">Email</label>
                <input
                  type="email"
                  value={formData.email}
                  disabled
                  className="w-full px-4 py-2 bg-slate-900/30 border border-white/5 rounded-lg text-gray-500 cursor-not-allowed"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">Full Name</label>
                <input
                  type="text"
                  value={formData.full_name}
                  onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                  className="w-full px-4 py-2 bg-slate-900/50 border border-white/10 rounded-lg text-white focus:outline-none focus:border-blue-500"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">Badge Number</label>
                  <input
                    type="text"
                    value={formData.badge_number}
                    onChange={(e) => setFormData({ ...formData, badge_number: e.target.value })}
                    className="w-full px-4 py-2 bg-slate-900/50 border border-white/10 rounded-lg text-white focus:outline-none focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">Phone</label>
                  <input
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    className="w-full px-4 py-2 bg-slate-900/50 border border-white/10 rounded-lg text-white focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">Unit</label>
                <select
                  value={formData.unit}
                  onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
                  className="w-full px-4 py-2 bg-slate-900/50 border border-white/10 rounded-lg text-white focus:outline-none focus:border-blue-500"
                >
                  <option value="Traffic Unit">Traffic Unit</option>
                  <option value="Patrol Unit">Patrol Unit</option>
                  <option value="Emergency Response">Emergency Response</option>
                  <option value="Highway Patrol">Highway Patrol</option>
                  <option value="Special Operations">Special Operations</option>
                </select>
              </div>
              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowEditModal(false)}
                  className="flex-1 px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-600/50 text-white rounded-lg transition-colors flex items-center justify-center gap-2"
                >
                  {submitting && <RefreshCw className="w-4 h-4 animate-spin" />}
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Reset Password Modal */}
      {showResetPasswordModal && selectedOfficer && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-slate-800 border border-white/10 rounded-xl w-full max-w-md">
            <div className="flex items-center justify-between p-4 border-b border-white/10">
              <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                <Lock className="w-5 h-5 text-yellow-400" />
                Reset Password
              </h3>
              <button
                onClick={() => setShowResetPasswordModal(false)}
                className="p-1 text-gray-400 hover:text-white rounded-lg hover:bg-white/10"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleResetPassword} className="p-4 space-y-4">
              <div className="bg-slate-900/50 rounded-lg p-3">
                <p className="text-sm text-gray-400">Resetting password for:</p>
                <p className="text-white font-medium">{selectedOfficer.full_name}</p>
                <p className="text-gray-500 text-sm">{selectedOfficer.email}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">
                  New Password <span className="text-red-400">*</span>
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="w-full px-4 py-2 pr-10 bg-slate-900/50 border border-white/10 rounded-lg text-white focus:outline-none focus:border-blue-500"
                    placeholder="Min 6 characters"
                    minLength={6}
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowResetPasswordModal(false)}
                  className="flex-1 px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting || !newPassword}
                  className="flex-1 px-4 py-2 bg-yellow-600 hover:bg-yellow-700 disabled:bg-yellow-600/50 text-white rounded-lg transition-colors flex items-center justify-center gap-2"
                >
                  {submitting && <RefreshCw className="w-4 h-4 animate-spin" />}
                  Reset Password
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Confirm Action Modal */}
      {showConfirmModal && selectedOfficer && confirmAction && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-slate-800 border border-white/10 rounded-xl w-full max-w-md">
            <div className="flex items-center justify-between p-4 border-b border-white/10">
              <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                {confirmAction.type === 'block' ? (
                  <UserX className="w-5 h-5 text-red-400" />
                ) : (
                  <UserCheck className="w-5 h-5 text-green-400" />
                )}
                {confirmAction.title}
              </h3>
              <button
                onClick={() => setShowConfirmModal(false)}
                className="p-1 text-gray-400 hover:text-white rounded-lg hover:bg-white/10"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-4 space-y-4">
              <div className="bg-slate-900/50 rounded-lg p-3">
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white font-bold ${
                    selectedOfficer.is_active ? 'bg-gradient-to-br from-blue-500 to-cyan-600' : 'bg-gray-600'
                  }`}>
                    {selectedOfficer.full_name?.charAt(0)?.toUpperCase() || 'O'}
                  </div>
                  <div>
                    <p className="text-white font-medium">{selectedOfficer.full_name}</p>
                    <p className="text-gray-500 text-sm">{selectedOfficer.email}</p>
                  </div>
                </div>
              </div>
              <p className="text-gray-300">{confirmAction.message}</p>
              <div className="flex gap-3 pt-4">
                <button
                  onClick={() => setShowConfirmModal(false)}
                  className="flex-1 px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleToggleStatus}
                  disabled={submitting}
                  className={`flex-1 px-4 py-2 text-white rounded-lg transition-colors flex items-center justify-center gap-2 ${
                    confirmAction.type === 'block'
                      ? 'bg-red-600 hover:bg-red-700 disabled:bg-red-600/50'
                      : 'bg-green-600 hover:bg-green-700 disabled:bg-green-600/50'
                  }`}
                >
                  {submitting && <RefreshCw className="w-4 h-4 animate-spin" />}
                  {confirmAction.type === 'block' ? 'Block Officer' : 'Activate Officer'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delete Officer Modal */}
      {showDeleteModal && selectedOfficer && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-slate-800 border border-white/10 rounded-xl w-full max-w-md">
            <div className="flex items-center justify-between p-4 border-b border-white/10">
              <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                <Trash2 className="w-5 h-5 text-red-500" />
                Delete Officer
              </h3>
              <button
                onClick={() => setShowDeleteModal(false)}
                className="p-1 text-gray-400 hover:text-white rounded-lg hover:bg-white/10"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-4 space-y-4">
              <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4">
                <div className="flex items-start gap-3">
                  <AlertTriangle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-red-400 font-semibold">Permanent Deletion</p>
                    <p className="text-red-300 text-sm mt-1">
                      This action cannot be undone. The officer will be permanently removed from the system and all associated data will be erased from the database.
                    </p>
                  </div>
                </div>
              </div>
              <div className="bg-slate-900/50 rounded-lg p-3">
                <p className="text-sm text-gray-400 mb-2">Officer to be deleted:</p>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold bg-gray-600">
                    {selectedOfficer.full_name?.charAt(0)?.toUpperCase() || 'O'}
                  </div>
                  <div>
                    <p className="text-white font-medium">{selectedOfficer.full_name}</p>
                    <p className="text-gray-500 text-sm">{selectedOfficer.email}</p>
                    <p className="text-gray-500 text-sm">{selectedOfficer.badge_number || 'N/A'}</p>
                  </div>
                </div>
              </div>
              <div className="flex gap-3 pt-4">
                <button
                  onClick={() => setShowDeleteModal(false)}
                  className="flex-1 px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleDeleteOfficer}
                  disabled={submitting}
                  className="flex-1 px-4 py-2 bg-red-600 hover:bg-red-700 disabled:bg-red-600/50 text-white rounded-lg transition-colors flex items-center justify-center gap-2"
                >
                  {submitting && <RefreshCw className="w-4 h-4 animate-spin" />}
                  Delete Permanently
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* View Password Modal */}
      {showViewPasswordModal && selectedOfficer && officerPassword && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-slate-800 border border-white/10 rounded-xl w-full max-w-md">
            <div className="flex items-center justify-between p-4 border-b border-white/10">
              <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                <Eye className="w-5 h-5 text-blue-400" />
                View Officer Password
              </h3>
              <button
                onClick={() => {
                  setShowViewPasswordModal(false);
                  setOfficerPassword('');
                  setShowPasswordText(false);
                }}
                className="p-1 text-gray-400 hover:text-white rounded-lg hover:bg-white/10"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-4 space-y-4">
              <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-4">
                <div className="flex items-start gap-3">
                  <AlertTriangle className="w-5 h-5 text-blue-400 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-blue-400 font-semibold">Password Information</p>
                    <p className="text-blue-300 text-sm mt-1">
                      This is the password you created for this officer. Share it securely with them so they can login to the mobile app.
                    </p>
                  </div>
                </div>
              </div>
              <div className="bg-slate-900/50 rounded-lg p-3">
                <p className="text-sm text-gray-400 mb-2">Officer Details:</p>
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold bg-gradient-to-br from-blue-500 to-cyan-600">
                    {selectedOfficer.full_name?.charAt(0)?.toUpperCase() || 'O'}
                  </div>
                  <div>
                    <p className="text-white font-medium">{selectedOfficer.full_name}</p>
                    <p className="text-gray-500 text-sm">{selectedOfficer.email}</p>
                  </div>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Password</label>
                <div className="relative">
                  <input
                    type={showPasswordText ? 'text' : 'password'}
                    value={officerPassword}
                    readOnly
                    className="w-full px-4 py-3 bg-slate-900/50 border border-white/10 rounded-lg text-white font-mono text-center focus:outline-none focus:border-blue-500"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPasswordText(!showPasswordText)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white"
                  >
                    {showPasswordText ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
              <div>
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(officerPassword);
                    toast.success('Password copied to clipboard!');
                  }}
                  className="w-full px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors flex items-center justify-center gap-2"
                >
                  <Lock className="w-4 h-4" />
                  Copy Password
                </button>
              </div>
              <div className="flex gap-3 pt-2">
                <button
                  onClick={() => {
                    setShowViewPasswordModal(false);
                    setOfficerPassword('');
                    setShowPasswordText(false);
                  }}
                  className="flex-1 px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition-colors"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default OfficerManagement;
