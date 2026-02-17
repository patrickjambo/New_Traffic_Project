import React, { useState, useEffect, useCallback } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useWebSocket } from '../context/WebSocketContext';
import {
  Settings as SettingsIcon,
  Users,
  Activity,
  RefreshCw,
  Search,
  Clock,
  Shield,
  AlertTriangle,
  CheckCircle,
  XCircle,
  UserCheck,
  UserX,
  Server,
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

const Settings = () => {
  const { isAuthenticated, user } = useAuth();
  const { isConnected, subscribe } = useWebSocket();
  const [activeTab, setActiveTab] = useState('users');
  const [users, setUsers] = useState([]);
  const [logs, setLogs] = useState([]);
  const [metrics, setMetrics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');

  const fetchUsers = useCallback(async () => {
    try {
      setLoading(true);
      const response = await api.get('/admin/users');
      if (response.data.success) {
        setUsers(response.data.data || []);
      }
    } catch (error) {
      console.error('Error fetching users:', error);
      toast.error('Failed to load users');
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchLogs = useCallback(async () => {
    try {
      setLoading(true);
      const response = await api.get('/admin/logs');
      if (response.data.success) {
        const formattedLogs = (response.data.data || []).map(log => ({
          id: log.id,
          timestamp: log.created_at,
          level: log.status === 'resolved' ? 'info' : log.status === 'pending' ? 'warn' : 'info',
          message: `${log.user_name} updated ${log.incident_type} incident #${log.incident_id}: ${log.comment || log.status}`,
          user: log.user_name,
        }));
        setLogs(formattedLogs);
      }
    } catch (error) {
      console.error('Error fetching logs:', error);
      setLogs([]);
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchMetrics = useCallback(async () => {
    try {
      const response = await api.get('/admin/metrics');
      if (response.data.success) {
        setMetrics(response.data.data);
      }
    } catch (error) {
      console.error('Error fetching metrics:', error);
    }
  }, []);

  useEffect(() => {
    fetchUsers();
    fetchMetrics();
  }, [fetchUsers, fetchMetrics]);

  useEffect(() => {
    if (activeTab === 'logs') {
      fetchLogs();
    }
  }, [activeTab, fetchLogs]);

  // Real-time updates
  useEffect(() => {
    if (!isConnected) return;
    const unsubNewUser = subscribe('new_user', (data) => {
      setUsers(prev => [data, ...prev]);
      toast.success(`New user registered: ${data.full_name}`);
    });
    return () => unsubNewUser();
  }, [isConnected, subscribe]);

  const handleRoleChange = async (userId, newRole) => {
    try {
      await api.put(`/admin/users/${userId}`, { role: newRole });
      toast.success('User role updated');
      fetchUsers();
    } catch (error) {
      console.error('Error updating role:', error);
      toast.error('Failed to update role');
    }
  };

  const handleStatusToggle = async (userId, currentStatus) => {
    try {
      await api.put(`/admin/users/${userId}`, { is_active: !currentStatus });
      toast.success(`User ${!currentStatus ? 'activated' : 'deactivated'}`);
      fetchUsers();
    } catch (error) {
      console.error('Error toggling status:', error);
      toast.error('Failed to update status');
    }
  };

  // Allow both admin and district_admin roles
  if (!isAuthenticated || (user?.role !== 'admin' && user?.role !== 'district_admin')) {
    return <Navigate to="/login" />;
  }

  // Filter users
  const filteredUsers = users.filter(u => {
    const matchesSearch = u.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      u.email?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesRole = roleFilter === 'all' || u.role === roleFilter;
    // District admins only see police officers
    if (user?.role === 'district_admin' && u.role !== 'police') {
      return false;
    }
    return matchesSearch && matchesRole;
  });

  // Determine available roles based on current user's role
  const getAvailableRoleFilters = () => {
    if (user?.role === 'admin') {
      // Super admin can see all except public
      return ['all', 'district_admin', 'police'];
    } else {
      // District admin can only see police
      return ['all', 'police'];
    }
  };

  // Get role options for changing a user's role
  const getRoleOptions = () => {
    if (user?.role === 'admin') {
      // Super admin can assign district_admin or police
      return ['police', 'district_admin'];
    } else {
      // District admin can only manage police
      return ['police'];
    }
  };

  // User stats - exclude public
  const userStats = {
    total: users.filter(u => u.role !== 'public').length,
    district_admin: users.filter(u => u.role === 'district_admin').length,
    police: users.filter(u => u.role === 'police').length,
  };

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <SettingsIcon className="w-8 h-8 text-blue-400" />
            System Settings
          </h1>
          <p className="text-gray-400 mt-1">Manage users, permissions, and system configurations</p>
        </div>
        <button
          onClick={() => { fetchUsers(); fetchMetrics(); fetchLogs(); }}
          className="flex items-center gap-2 px-4 py-2 bg-slate-700/50 hover:bg-slate-700 text-white rounded-lg transition-colors"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {/* System Metrics */}
      {metrics && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-gradient-to-br from-blue-600/20 to-blue-800/20 border border-blue-500/30 rounded-xl p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-500/20 rounded-lg">
                <Users className="w-6 h-6 text-blue-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-white">{metrics.users?.total_users || 0}</p>
                <p className="text-sm text-gray-400">Total Users</p>
              </div>
            </div>
          </div>
          <div className="bg-gradient-to-br from-green-600/20 to-green-800/20 border border-green-500/30 rounded-xl p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-500/20 rounded-lg">
                <Shield className="w-6 h-6 text-green-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-white">{metrics.users?.police_users || 0}</p>
                <p className="text-sm text-gray-400">Police Officers</p>
              </div>
            </div>
          </div>
          <div className="bg-gradient-to-br from-yellow-600/20 to-yellow-800/20 border border-yellow-500/30 rounded-xl p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-yellow-500/20 rounded-lg">
                <AlertTriangle className="w-6 h-6 text-yellow-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-white">{metrics.incidents?.active_incidents || 0}</p>
                <p className="text-sm text-gray-400">Active Incidents</p>
              </div>
            </div>
          </div>
          <div className="bg-gradient-to-br from-purple-600/20 to-purple-800/20 border border-purple-500/30 rounded-xl p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-purple-500/20 rounded-lg">
                <Server className="w-6 h-6 text-purple-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-white">{Math.floor((metrics.system?.uptime || 0) / 3600)}h</p>
                <p className="text-sm text-gray-400">System Uptime</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="flex border-b border-white/10">
        <button
          onClick={() => setActiveTab('users')}
          className={`px-6 py-3 text-sm font-medium transition-colors relative ${activeTab === 'users' ? 'text-blue-400' : 'text-gray-400 hover:text-white'}`}
        >
          <div className="flex items-center gap-2">
            <Users className="w-4 h-4" />
            User Management
            <span className="px-2 py-0.5 text-xs bg-blue-500/20 text-blue-400 rounded-full">{userStats.total}</span>
          </div>
          {activeTab === 'users' && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-400"></div>}
        </button>
        <button
          onClick={() => setActiveTab('logs')}
          className={`px-6 py-3 text-sm font-medium transition-colors relative ${activeTab === 'logs' ? 'text-blue-400' : 'text-gray-400 hover:text-white'}`}
        >
          <div className="flex items-center gap-2">
            <Activity className="w-4 h-4" />
            System Logs
          </div>
          {activeTab === 'logs' && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-400"></div>}
        </button>
      </div>

      {/* Users Tab */}
      {activeTab === 'users' && (
        <div className="space-y-4">
          {/* Filters */}
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                placeholder="Search users by name or email..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-slate-800/50 border border-white/10 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-blue-500"
              />
            </div>
            <div className="flex gap-2">
              {getAvailableRoleFilters().map((role) => (
                <button
                  key={role}
                  onClick={() => setRoleFilter(role)}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors capitalize ${
                    roleFilter === role ? 'bg-blue-600 text-white' : 'bg-slate-700/50 text-gray-400 hover:bg-slate-700 hover:text-white'
                  }`}
                >
                  {role === 'district_admin' ? 'District Admin' : role} {role !== 'all' && `(${userStats[role] || 0})`}
                </button>
              ))}
            </div>
          </div>

          {/* Users Table */}
          <div className="bg-slate-800/50 backdrop-blur border border-white/10 rounded-xl overflow-hidden">
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <RefreshCw className="w-8 h-8 text-blue-400 animate-spin" />
              </div>
            ) : filteredUsers.length === 0 ? (
              <div className="text-center py-12">
                <Users className="w-12 h-12 text-gray-600 mx-auto mb-4" />
                <p className="text-gray-400">No users found</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-slate-900/50">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase">User</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase">Role</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase">Email</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase">Status</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase">Joined</th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-gray-400 uppercase">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {filteredUsers.map((u) => (
                      <tr key={u.id} className="hover:bg-slate-700/30 transition-colors">
                        <td className="px-4 py-4">
                          <div className="flex items-center gap-3">
                            <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white font-bold ${
                              u.role === 'admin' ? 'bg-gradient-to-br from-purple-500 to-pink-600' :
                              u.role === 'district_admin' ? 'bg-gradient-to-br from-orange-500 to-amber-600' :
                              u.role === 'police' ? 'bg-gradient-to-br from-blue-500 to-cyan-600' :
                              'bg-gradient-to-br from-gray-500 to-gray-600'
                            }`}>
                              {u.full_name?.charAt(0)?.toUpperCase() || 'U'}
                            </div>
                            <div>
                              <p className="text-white font-medium">{u.full_name || 'Unknown'}</p>
                              {u.badge_number && <p className="text-gray-500 text-sm">Badge: {u.badge_number}</p>}
                              {u.district_name && <p className="text-gray-500 text-xs">District: {u.district_name}</p>}
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-4">
                          {/* Display role as badge - not editable for super admin and district_admin */}
                          {(u.role === 'admin' || u.role === 'district_admin') ? (
                            <span className={`px-3 py-1 rounded text-xs font-bold uppercase ${
                              u.role === 'admin' ? 'bg-purple-500/20 text-purple-400 border border-purple-500/50' :
                              'bg-orange-500/20 text-orange-400 border border-orange-500/50'
                            }`}>
                              {u.role === 'admin' ? 'SUPER ADMIN' : 'DISTRICT ADMIN'}
                            </span>
                          ) : (
                            <select
                              value={u.role}
                              onChange={(e) => handleRoleChange(u.id, e.target.value)}
                              disabled={u.id === user?.id}
                              className={`px-2 py-1 rounded text-xs font-medium border bg-slate-800 cursor-pointer disabled:cursor-not-allowed disabled:opacity-50 ${
                                u.role === 'police' ? 'border-blue-500/50 text-blue-400' :
                                'border-gray-500/50 text-gray-400'
                              }`}
                              style={{ backgroundColor: '#1e293b' }}
                            >
                              <option value="police" className="bg-slate-800">POLICE</option>
                              {user?.role === 'admin' && (
                                <option value="district_admin" className="bg-slate-800">DISTRICT ADMIN</option>
                              )}
                            </select>
                          )}
                        </td>
                        <td className="px-4 py-4 text-gray-300 text-sm">{u.email}</td>
                        <td className="px-4 py-4">
                          {u.is_active !== false ? (
                            <span className="px-2 py-1 text-xs font-medium bg-green-500/20 text-green-400 rounded-full flex items-center gap-1 w-fit">
                              <CheckCircle className="w-3 h-3" /> Active
                            </span>
                          ) : (
                            <span className="px-2 py-1 text-xs font-medium bg-red-500/20 text-red-400 rounded-full flex items-center gap-1 w-fit">
                              <XCircle className="w-3 h-3" /> Inactive
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-4">
                          <div className="flex items-center gap-2 text-gray-400 text-sm">
                            <Clock className="w-4 h-4" />
                            {new Date(u.created_at).toLocaleDateString()}
                          </div>
                        </td>
                        <td className="px-4 py-4">
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={() => handleStatusToggle(u.id, u.is_active !== false)}
                              disabled={u.id === user?.id}
                              className={`p-2 rounded-lg transition-colors disabled:opacity-50 ${
                                u.is_active !== false
                                  ? 'text-gray-400 hover:text-red-400 hover:bg-red-500/10'
                                  : 'text-gray-400 hover:text-green-400 hover:bg-green-500/10'
                              }`}
                              title={u.is_active !== false ? 'Deactivate' : 'Activate'}
                            >
                              {u.is_active !== false ? <UserX className="w-4 h-4" /> : <UserCheck className="w-4 h-4" />}
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
        </div>
      )}

      {/* Logs Tab */}
      {activeTab === 'logs' && (
        <div className="bg-slate-800/50 backdrop-blur border border-white/10 rounded-xl overflow-hidden">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <RefreshCw className="w-8 h-8 text-blue-400 animate-spin" />
            </div>
          ) : logs.length === 0 ? (
            <div className="text-center py-12">
              <Activity className="w-12 h-12 text-gray-600 mx-auto mb-4" />
              <p className="text-gray-400">No system logs available</p>
              <p className="text-gray-500 text-sm mt-1">Activity logs will appear here as users interact with the system</p>
            </div>
          ) : (
            <div className="divide-y divide-white/5">
              {logs.map((log, index) => (
                <div key={log.id || index} className="flex items-start gap-4 p-4 hover:bg-slate-700/30 transition-colors">
                  <div className={`p-2 rounded-lg ${
                    log.level === 'error' ? 'bg-red-500/20' :
                    log.level === 'warn' ? 'bg-yellow-500/20' : 'bg-blue-500/20'
                  }`}>
                    {log.level === 'error' ? <XCircle className="w-4 h-4 text-red-400" /> :
                     log.level === 'warn' ? <AlertTriangle className="w-4 h-4 text-yellow-400" /> :
                     <Activity className="w-4 h-4 text-blue-400" />}
                  </div>
                  <div className="flex-1">
                    <p className="text-white">{log.message}</p>
                    <div className="flex items-center gap-4 mt-1 text-xs text-gray-500">
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {new Date(log.timestamp).toLocaleString()}
                      </span>
                      {log.user && (
                        <span className="flex items-center gap-1">
                          <Users className="w-3 h-3" />
                          {log.user}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default Settings;