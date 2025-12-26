import React, { useState, useEffect } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Settings as SettingsIcon, Users, Shield, Activity, Search, Edit2, Trash2, Save } from 'lucide-react';
import axios from '../config/axios';
import toast from 'react-hot-toast';

const Settings = () => {
  const { isAuthenticated, user } = useAuth();
  const [activeTab, setActiveTab] = useState('users');
  const [users, setUsers] = useState([]);
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (activeTab === 'users') {
      fetchUsers();
    } else {
      fetchLogs();
    }
  }, [activeTab]);

  const fetchUsers = async () => {
    try {
      const response = await axios.get('/admin/users');
      setUsers(response.data.data || []);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching users:', error);
      // toast.error('Failed to load users');
      setLoading(false);
    }
  };

  const fetchLogs = async () => {
    try {
      const response = await axios.get('/admin/logs');
      setLogs(response.data.data || []);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching logs:', error);
      // toast.error('Failed to load logs');
      setLoading(false);
    }
  };

  if (!isAuthenticated || user?.role !== 'admin') {
    return <Navigate to="/login" />;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <SettingsIcon className="w-8 h-8 text-gray-400" />
            System Settings
          </h1>
          <p className="text-gray-400 mt-1">Manage users, permissions, and system configurations</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-white/10">
        <button
          onClick={() => setActiveTab('users')}
          className={`px-6 py-3 text-sm font-medium transition-colors relative ${activeTab === 'users' ? 'text-blue-400' : 'text-gray-400 hover:text-white'
            }`}
        >
          <div className="flex items-center gap-2">
            <Users className="w-4 h-4" />
            User Management
          </div>
          {activeTab === 'users' && (
            <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-400"></div>
          )}
        </button>
        <button
          onClick={() => setActiveTab('logs')}
          className={`px-6 py-3 text-sm font-medium transition-colors relative ${activeTab === 'logs' ? 'text-blue-400' : 'text-gray-400 hover:text-white'
            }`}
        >
          <div className="flex items-center gap-2">
            <Activity className="w-4 h-4" />
            System Logs
          </div>
          {activeTab === 'logs' && (
            <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-400"></div>
          )}
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
        </div>
      ) : (
        <div className="bg-slate-800/50 backdrop-blur-md border border-white/5 rounded-xl overflow-hidden">
          {activeTab === 'users' && (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-900/50 border-b border-white/5 text-gray-400 text-sm uppercase tracking-wider">
                    <th className="p-4 font-medium">User</th>
                    <th className="p-4 font-medium">Role</th>
                    <th className="p-4 font-medium">Email</th>
                    <th className="p-4 font-medium">Status</th>
                    <th className="p-4 font-medium text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {users.length > 0 ? (
                    users.map((u) => (
                      <tr key={u.id} className="hover:bg-slate-800/50 transition-colors">
                        <td className="p-4">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-blue-500/20 flex items-center justify-center text-blue-400 font-bold">
                              {u.full_name.charAt(0).toUpperCase()}
                            </div>
                            <span className="font-medium text-white">{u.full_name}</span>
                          </div>
                        </td>
                        <td className="p-4">
                          <span className={`px-2 py-1 rounded-full text-xs font-medium border ${u.role === 'admin' ? 'bg-purple-500/10 border-purple-500/20 text-purple-400' :
                            u.role === 'police' ? 'bg-blue-500/10 border-blue-500/20 text-blue-400' :
                              'bg-gray-500/10 border-gray-500/20 text-gray-400'
                            }`}>
                            {u.role.toUpperCase()}
                          </span>
                        </td>
                        <td className="p-4 text-gray-300">{u.email}</td>
                        <td className="p-4">
                          <span className="text-green-400 text-sm flex items-center gap-1">
                            <div className="w-1.5 h-1.5 rounded-full bg-green-400"></div>
                            Active
                          </span>
                        </td>
                        <td className="p-4 text-right">
                          <div className="flex justify-end gap-2">
                            <button className="p-1.5 hover:bg-slate-700 rounded text-gray-400 hover:text-blue-400 transition-colors">
                              <Edit2 className="w-4 h-4" />
                            </button>
                            <button className="p-1.5 hover:bg-slate-700 rounded text-gray-400 hover:text-red-400 transition-colors">
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan="5" className="p-8 text-center text-gray-500">
                        No users found
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}

          {activeTab === 'logs' && (
            <div className="p-4">
              <div className="space-y-2 font-mono text-sm">
                {logs.length > 0 ? (
                  logs.map((log, index) => (
                    <div key={index} className="flex gap-4 p-2 hover:bg-slate-800/50 rounded border-b border-white/5 last:border-0">
                      <span className="text-gray-500 whitespace-nowrap">{new Date(log.timestamp).toLocaleString()}</span>
                      <span className={`font-bold ${log.level === 'error' ? 'text-red-400' :
                        log.level === 'warn' ? 'text-orange-400' :
                          'text-blue-400'
                        }`}>
                        [{log.level.toUpperCase()}]
                      </span>
                      <span className="text-gray-300">{log.message}</span>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-8 text-gray-500">
                    No system logs available
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default Settings;