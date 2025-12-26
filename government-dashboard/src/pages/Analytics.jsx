import React, { useState, useEffect } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { Activity, TrendingUp, Users, AlertTriangle } from 'lucide-react';
import axios from '../config/axios';

// Move static data outside component to prevent re-creation on render
const DUMMY_TRENDS = [
  { name: 'Mon', incidents: 4, resolved: 3 },
  { name: 'Tue', incidents: 7, resolved: 5 },
  { name: 'Wed', incidents: 5, resolved: 4 },
  { name: 'Thu', incidents: 8, resolved: 6 },
  { name: 'Fri', incidents: 12, resolved: 10 },
  { name: 'Sat', incidents: 9, resolved: 7 },
  { name: 'Sun', incidents: 6, resolved: 5 },
];

const DUMMY_TYPES = [
  { name: 'Accident', value: 35 },
  { name: 'Congestion', value: 45 },
  { name: 'Roadwork', value: 15 },
  { name: 'Hazard', value: 5 },
];

const COLORS = ['#EF4444', '#3B82F6', '#F59E0B', '#10B981'];

const Analytics = () => {
  const { isAuthenticated, user } = useAuth();
  const [stats, setStats] = useState({
    incidents: {},
    metrics: { users: {} }
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      const [incidentsRes, metricsRes] = await Promise.all([
        axios.get('/incidents/statistics'),
        axios.get('/admin/metrics')
      ]);

      setStats({
        incidents: incidentsRes.data.data || {},
        metrics: metricsRes.data.data || { users: {} }
      });
      setLoading(false);
    } catch (error) {
      console.error('Error fetching analytics:', error);
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
            <Activity className="w-8 h-8 text-purple-500" />
            System Analytics
          </h1>
          <p className="text-gray-400 mt-1">Real-time insights and performance metrics</p>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-500"></div>
        </div>
      ) : (
        <>
          {/* Key Metrics Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div className="bg-slate-800/50 backdrop-blur-md border border-white/5 rounded-xl p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-gray-400 text-sm font-medium">Total Incidents</h3>
                <AlertTriangle className="w-5 h-5 text-red-400" />
              </div>
              <p className="text-3xl font-bold text-white">{stats?.incidents?.total_incidents || 145}</p>
              <p className="text-xs text-green-400 flex items-center gap-1 mt-2">
                <TrendingUp className="w-3 h-3" /> +12% from last week
              </p>
            </div>

            <div className="bg-slate-800/50 backdrop-blur-md border border-white/5 rounded-xl p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-gray-400 text-sm font-medium">Active Users</h3>
                <Users className="w-5 h-5 text-blue-400" />
              </div>
              <p className="text-3xl font-bold text-white">{stats?.metrics?.users?.total_users || 1240}</p>
              <p className="text-xs text-green-400 flex items-center gap-1 mt-2">
                <TrendingUp className="w-3 h-3" /> +5% new users
              </p>
            </div>

            <div className="bg-slate-800/50 backdrop-blur-md border border-white/5 rounded-xl p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-gray-400 text-sm font-medium">Avg Response Time</h3>
                <Activity className="w-5 h-5 text-green-400" />
              </div>
              <p className="text-3xl font-bold text-white">12m</p>
              <p className="text-xs text-green-400 flex items-center gap-1 mt-2">
                <TrendingUp className="w-3 h-3" /> -2m improvement
              </p>
            </div>

            <div className="bg-slate-800/50 backdrop-blur-md border border-white/5 rounded-xl p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-gray-400 text-sm font-medium">Resolution Rate</h3>
                <TrendingUp className="w-5 h-5 text-purple-400" />
              </div>
              <p className="text-3xl font-bold text-white">94%</p>
              <p className="text-xs text-green-400 flex items-center gap-1 mt-2">
                <TrendingUp className="w-3 h-3" /> +1.5% increase
              </p>
            </div>
          </div>

          {/* Charts Section */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Incident Trends Chart */}
            <div className="bg-slate-800/50 backdrop-blur-md border border-white/5 rounded-xl p-6">
              <h3 className="text-lg font-bold text-white mb-6">Weekly Incident Trends</h3>
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={DUMMY_TRENDS}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                    <XAxis dataKey="name" stroke="#9CA3AF" />
                    <YAxis stroke="#9CA3AF" />
                    <Tooltip
                      contentStyle={{ backgroundColor: '#1F2937', border: 'none', borderRadius: '0.5rem', color: '#fff' }}
                    />
                    <Legend />
                    <Bar dataKey="incidents" name="Reported" fill="#EF4444" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="resolved" name="Resolved" fill="#10B981" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Incident Types Pie Chart */}
            <div className="bg-slate-800/50 backdrop-blur-md border border-white/5 rounded-xl p-6">
              <h3 className="text-lg font-bold text-white mb-6">Incident Distribution</h3>
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={DUMMY_TYPES}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={100}
                      fill="#8884d8"
                      paddingAngle={5}
                      dataKey="value"
                    >
                      {DUMMY_TYPES.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{ backgroundColor: '#1F2937', border: 'none', borderRadius: '0.5rem', color: '#fff' }}
                    />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default Analytics;