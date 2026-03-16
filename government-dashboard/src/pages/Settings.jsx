import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useData } from '../context/DataContext';
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
import axios from '../config/axios';
import toast from 'react-hot-toast';

const Settings = () => {
  const { isAuthenticated, user } = useAuth();
  const { incidents, emergencies, fetchIncidents, fetchEmergencies } = useData();
  const { isConnected, subscribe } = useWebSocket();
  const [activeTab, setActiveTab] = useState('users');
  const [users, setUsers] = useState([]);
  const [logs, setLogs] = useState([]);
  const [initialLoading, setInitialLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [lastUpdated, setLastUpdated] = useState(new Date());
  const [systemStartTime] = useState(new Date());

  // Fetch users
  const fetchUsers = useCallback(async () => {
    try {
      const response = await axios.get('/api/admin/users');
      if (response.data.success) {
        setUsers(response.data.data || []);
      }
    } catch (error) {
      console.error('Error fetching users:', error);
      // Try alternative endpoint
      try {
        const altResponse = await axios.get('/api/users');
        if (altResponse.data) {
          setUsers(altResponse.data.data || altResponse.data || []);
        }
      } catch (e) {
        console.error('Alternative fetch failed:', e);
      }
    }
  }, []);

  // Fetch logs
  const fetchLogs = useCallback(async () => {
    try {
      const response = await axios.get('/api/admin/logs');
      if (response.data.success) {
        const formattedLogs = (response.data.data || []).map(log => ({
          id: log.id,
          timestamp: log.created_at || log.timestamp,
          level: log.status === 'resolved' ? 'info' : log.status === 'pending' ? 'warn' : 'info',
          message: log.message || `${log.user_name || 'System'} ${log.action || 'updated'} ${log.incident_type || 'item'} #${log.incident_id || log.id}`,
          user: log.user_name || log.user || 'System',
          action: log.action || log.status,
        }));
        setLogs(formattedLogs);
      }
    } catch (error) {
      console.error('Error fetching logs:', error);
      // Generate logs from incidents/emergencies activity
      generateActivityLogs();
    }
  }, []);

  // Generate activity logs from incidents and emergencies
  const generateActivityLogs = useCallback(() => {
    const allActivity = [
      ...(incidents || []).map(inc => ({
        id: `inc-${inc.id}`,
        timestamp: inc.updated_at || inc.created_at,
        level: inc.status === 'resolved' ? 'info' : inc.severity === 'critical' ? 'error' : 'warn',
        message: `Incident #${inc.id}: ${inc.incident_type || 'Traffic'} - ${inc.status || 'reported'}`,
        user: inc.reported_by_name || 'System',
        action: inc.status,
      })),
      ...(emergencies || []).map(em => ({
        id: `em-${em.id}`,
        timestamp: em.updated_at || em.created_at,
        level: em.status === 'resolved' ? 'info' : em.severity === 'critical' ? 'error' : 'warn',
        message: `Emergency #${em.id}: ${em.emergency_type || 'Alert'} - ${em.status || 'active'}`,
        user: em.reported_by_name || 'System',
        action: em.status,
      })),
    ].sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp)).slice(0, 50);
    
    setLogs(allActivity);
  }, [incidents, emergencies]);

  // Initial data load
  useEffect(() => {
    const loadData = async () => {
      await Promise.all([fetchUsers(), fetchIncidents?.(), fetchEmergencies?.()]);
      setInitialLoading(false);
      setLastUpdated(new Date());
    };
    loadData();
  }, [fetchUsers, fetchIncidents, fetchEmergencies]);

  // Auto-refresh every 10 seconds (silent)
  useEffect(() => {
    const interval = setInterval(() => {
      fetchUsers();
      fetchIncidents?.();
      fetchEmergencies?.();
      if (activeTab === 'logs') {
        fetchLogs();
      }
      setLastUpdated(new Date());
    }, 10000);
    return () => clearInterval(interval);
  }, [fetchUsers, fetchIncidents, fetchEmergencies, fetchLogs, activeTab]);

  // Fetch logs when tab changes
  useEffect(() => {
    if (activeTab === 'logs') {
      fetchLogs();
    }
  }, [activeTab, fetchLogs]);

  // Real-time WebSocket updates
  useEffect(() => {
    if (!isConnected) return;

    const unsubNewUser = subscribe('user:new', (data) => {
      setUsers(prev => [data, ...prev]);
      toast.success(`New user registered: ${data.full_name}`, { icon: '👤' });
      setLastUpdated(new Date());
    });

    const unsubUserUpdate = subscribe('user:updated', (data) => {
      setUsers(prev => prev.map(u => u.id === data.id ? { ...u, ...data } : u));
      setLastUpdated(new Date());
    });

    const unsubIncident = subscribe('incident:new', () => {
      fetchIncidents?.();
      setLastUpdated(new Date());
    });

    const unsubEmergency = subscribe('emergency:new', () => {
      fetchEmergencies?.();
      setLastUpdated(new Date());
    });

    return () => {
      unsubNewUser();
      unsubUserUpdate();
      unsubIncident();
      unsubEmergency();
    };
  }, [isConnected, subscribe, fetchIncidents, fetchEmergencies]);

  // Calculate real metrics
  const metrics = useMemo(() => {
    const totalUsers = users.filter(u => u.role !== 'public').length;
    const policeOfficers = users.filter(u => u.role === 'police').length;
    const activeIncidents = [
      ...(incidents || []).filter(i => i.status !== 'resolved' && i.status !== 'closed'),
      ...(emergencies || []).filter(e => e.status !== 'resolved' && e.status !== 'closed'),
    ].length;
    
    // Calculate uptime since component mount
    const uptimeMs = Date.now() - systemStartTime.getTime();
    const uptimeHours = Math.floor(uptimeMs / 3600000);

    return {
      totalUsers,
      policeOfficers,
      activeIncidents,
      uptimeHours,
    };
  }, [users, incidents, emergencies, systemStartTime]);

  // Handle role change
  const handleRoleChange = async (userId, newRole) => {
    try {
      await axios.put(`/api/admin/users/${userId}`, { role: newRole });
      toast.success('User role updated');
      fetchUsers();
    } catch (error) {
      console.error('Error updating role:', error);
      toast.error('Failed to update role');
    }
  };

  // Handle status toggle
  const handleStatusToggle = async (userId, currentStatus) => {
    try {
      await axios.put(`/api/admin/users/${userId}`, { is_active: !currentStatus });
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
    // District admins only see police officers and co_admins
    if (user?.role === 'district_admin' && u.role !== 'police' && u.role !== 'co_admin') {
      return false;
    }
    return matchesSearch && matchesRole;
  });

  // Determine available roles based on current user's role
  const getAvailableRoleFilters = () => {
    if (user?.role === 'admin') {
      // Super admin can see all except public
      return ['all', 'co_admin', 'district_admin', 'police'];
    } else {
      // District admin can see police and co_admins
      return ['all', 'co_admin', 'police'];
    }
  };

  // Get role options for changing a user's role
  const getRoleOptions = () => {
    if (user?.role === 'admin') {
      // Super admin can assign co_admin, district_admin or police
      return ['police', 'co_admin', 'district_admin'];
    } else {
      // District admin can assign police or co_admin
      return ['police', 'co_admin'];
    }
  };

  // User stats - exclude public
  const userStats = {
    total: users.filter(u => u.role !== 'public').length,
    co_admin: users.filter(u => u.role === 'co_admin').length,
    district_admin: users.filter(u => u.role === 'district_admin').length,
    police: users.filter(u => u.role === 'police').length,
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <SettingsIcon className="w-8 h-8 text-cyan-500" />
            System Settings
          </h1>
          <p className="text-gray-400 mt-1">
            Manage users, permissions, and system configurations
            <span className="ml-2 text-xs text-cyan-400 inline-flex items-center gap-1">
              <span className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-500 animate-pulse' : 'bg-cyan-500'}`}></span>
              {isConnected ? 'Live' : 'Auto-updating'} • Last: {lastUpdated.toLocaleTimeString()}
            </span>
          </p>
        </div>
        <button
          onClick={() => { fetchUsers(); fetchLogs(); fetchIncidents?.(); fetchEmergencies?.(); setLastUpdated(new Date()); }}
          className="flex items-center gap-2 px-4 py-2 bg-slate-700/50 hover:bg-slate-700 text-white rounded-lg transition-colors border border-white/10"
        >
          <RefreshCw className="w-4 h-4" />
          Refresh
        </button>
      </div>

      {/* System Metrics - Cyan Theme */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-slate-800/50 backdrop-blur-md border border-cyan-500/20 rounded-xl p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-cyan-500/20 rounded-lg">
              <Users className="w-6 h-6 text-cyan-400" />
            </div>
            <div>
              <p className="text-2xl font-bold text-white">{metrics.totalUsers}</p>
              <p className="text-sm text-gray-400">Total Users</p>
            </div>
          </div>
        </div>
        <div className="bg-slate-800/50 backdrop-blur-md border border-cyan-500/20 rounded-xl p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-cyan-500/20 rounded-lg">
              <Shield className="w-6 h-6 text-cyan-400" />
            </div>
            <div>
              <p className="text-2xl font-bold text-white">{metrics.policeOfficers}</p>
              <p className="text-sm text-gray-400">Police Officers</p>
            </div>
          </div>
        </div>
        <div className="bg-slate-800/50 backdrop-blur-md border border-cyan-500/20 rounded-xl p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-cyan-500/20 rounded-lg">
              <AlertTriangle className="w-6 h-6 text-cyan-400" />
            </div>
            <div>
              <p className="text-2xl font-bold text-white">{metrics.activeIncidents}</p>
              <p className="text-sm text-gray-400">Active Incidents</p>
            </div>
          </div>
        </div>
        <div className="bg-slate-800/50 backdrop-blur-md border border-cyan-500/20 rounded-xl p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-cyan-500/20 rounded-lg">
              <Server className="w-6 h-6 text-cyan-400" />
            </div>
            <div>
              <p className="text-2xl font-bold text-white">{metrics.uptimeHours}h</p>
              <p className="text-sm text-gray-400">System Uptime</p>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs - Cyan Theme */}
      <div className="flex border-b border-white/10">
        <button
          onClick={() => setActiveTab('users')}
          className={`px-6 py-3 text-sm font-medium transition-colors relative ${activeTab === 'users' ? 'text-cyan-400' : 'text-gray-400 hover:text-white'}`}
        >
          <div className="flex items-center gap-2">
            <Users className="w-4 h-4" />
            User Management
            <span className="px-2 py-0.5 text-xs bg-cyan-500/20 text-cyan-400 rounded-full">{userStats.total}</span>
          </div>
          {activeTab === 'users' && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-cyan-400"></div>}
        </button>
        <button
          onClick={() => setActiveTab('logs')}
          className={`px-6 py-3 text-sm font-medium transition-colors relative ${activeTab === 'logs' ? 'text-cyan-400' : 'text-gray-400 hover:text-white'}`}
        >
          <div className="flex items-center gap-2">
            <Activity className="w-4 h-4" />
            System Logs
          </div>
          {activeTab === 'logs' && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-cyan-400"></div>}
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
                className="w-full pl-10 pr-4 py-2 bg-slate-800/50 border border-white/10 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-cyan-500"
              />
            </div>
            <div className="flex gap-2">
              {getAvailableRoleFilters().map((role) => (
                <button
                  key={role}
                  onClick={() => setRoleFilter(role)}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors capitalize ${
                    roleFilter === role ? 'bg-cyan-600 text-white' : 'bg-slate-700/50 text-gray-400 hover:bg-slate-700 hover:text-white'
                  }`}
                >
                  {role === 'district_admin' ? 'District Admin' : role === 'co_admin' ? 'Co-Admin' : role} {role !== 'all' && `(${userStats[role] || 0})`}
                </button>
              ))}
            </div>
          </div>

          {/* Users Table */}
          <div className="bg-slate-800/50 backdrop-blur border border-white/10 rounded-xl overflow-hidden">
            {initialLoading ? (
              <div className="flex items-center justify-center py-12">
                <RefreshCw className="w-8 h-8 text-cyan-400 animate-spin" />
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
                              u.role === 'admin' ? 'bg-gradient-to-br from-cyan-600 to-cyan-800' :
                              u.role === 'co_admin' ? 'bg-gradient-to-br from-emerald-500 to-emerald-700' :
                              u.role === 'district_admin' ? 'bg-gradient-to-br from-cyan-500 to-cyan-700' :
                              u.role === 'police' ? 'bg-gradient-to-br from-cyan-400 to-cyan-600' :
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
                          {/* Display role as badge - not editable for super admin; editable for others */}
                          {u.role === 'admin' ? (
                            <span className="px-3 py-1 rounded text-xs font-bold uppercase bg-cyan-500/20 text-cyan-300 border border-cyan-500/50">
                              SUPER ADMIN
                            </span>
                          ) : (
                            <select
                              value={u.role}
                              onChange={(e) => handleRoleChange(u.id, e.target.value)}
                              disabled={u.id === user?.id}
                              className={`px-2 py-1 rounded text-xs font-medium border bg-slate-800 cursor-pointer disabled:cursor-not-allowed disabled:opacity-50 ${
                                u.role === 'co_admin' ? 'border-emerald-500/50 text-emerald-400' :
                                u.role === 'district_admin' ? 'border-cyan-600/50 text-cyan-400' :
                                u.role === 'police' ? 'border-cyan-500/50 text-cyan-400' :
                                'border-gray-500/50 text-gray-400'
                              }`}
                              style={{ backgroundColor: '#1e293b' }}
                            >
                              {getRoleOptions().map(opt => (
                                <option key={opt} value={opt} className="bg-slate-800">
                                  {opt === 'co_admin' ? 'CO-ADMIN' : opt === 'district_admin' ? 'DISTRICT ADMIN' : opt.toUpperCase()}
                                </option>
                              ))}
                            </select>
                          )}
                        </td>
                        <td className="px-4 py-4 text-gray-300 text-sm">{u.email}</td>
                        <td className="px-4 py-4">
                          {u.is_active !== false ? (
                            <span className="px-2 py-1 text-xs font-medium bg-cyan-500/20 text-cyan-400 rounded-full flex items-center gap-1 w-fit">
                              <CheckCircle className="w-3 h-3" /> Active
                            </span>
                          ) : (
                            <span className="px-2 py-1 text-xs font-medium bg-gray-500/20 text-gray-400 rounded-full flex items-center gap-1 w-fit">
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
                              className="p-2 rounded-lg transition-colors disabled:opacity-50 text-gray-400 hover:text-cyan-400 hover:bg-cyan-500/10"
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
          {initialLoading ? (
            <div className="flex items-center justify-center py-12">
              <RefreshCw className="w-8 h-8 text-cyan-400 animate-spin" />
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
                    log.level === 'error' ? 'bg-cyan-700/20' :
                    log.level === 'warn' ? 'bg-cyan-600/20' : 'bg-cyan-500/20'
                  }`}>
                    {log.level === 'error' ? <XCircle className="w-4 h-4 text-cyan-300" /> :
                     log.level === 'warn' ? <AlertTriangle className="w-4 h-4 text-cyan-400" /> :
                     <Activity className="w-4 h-4 text-cyan-400" />}
                  </div>
                  <div className="flex-1">
                    <p className="text-white">{log.message}</p>
                    <div className="flex items-center gap-4 mt-1 text-xs text-gray-500">
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {log.timestamp ? new Date(log.timestamp).toLocaleString() : 'N/A'}
                      </span>
                      {log.user && (
                        <span className="flex items-center gap-1">
                          <Users className="w-3 h-3" />
                          {log.user}
                        </span>
                      )}
                      {log.action && (
                        <span className={`px-2 py-0.5 rounded text-xs ${
                          log.action === 'resolved' ? 'bg-cyan-500/20 text-cyan-400' :
                          log.action === 'active' ? 'bg-cyan-600/20 text-cyan-300' :
                          'bg-cyan-700/20 text-cyan-400'
                        }`}>
                          {log.action}
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