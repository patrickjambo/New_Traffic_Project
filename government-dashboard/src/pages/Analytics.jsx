import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useData } from '../context/DataContext';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { Activity, TrendingUp, Users, AlertTriangle, RefreshCw } from 'lucide-react';
import axios from '../config/axios';

const COLORS = ['#06B6D4', '#0EA5E9', '#3B82F6', '#8B5CF6', '#EC4899', '#F59E0B'];

const Analytics = () => {
  const { isAuthenticated, user } = useAuth();
  const { incidents, emergencies, fetchIncidents, fetchEmergencies } = useData();
  const [officers, setOfficers] = useState([]);
  const [users, setUsers] = useState([]);
  const [initialLoading, setInitialLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState(new Date());

  // Fetch additional data - silent refresh (no loading state change)
  const fetchData = useCallback(async () => {
    try {
      const [officersRes, usersRes] = await Promise.all([
        axios.get('/api/officers').catch(() => ({ data: { data: [] } })),
        axios.get('/api/users').catch(() => ({ data: { data: [] } })),
        fetchIncidents?.(),
        fetchEmergencies?.()
      ]);

      setOfficers(officersRes.data?.data || officersRes.data || []);
      setUsers(usersRes.data?.data || usersRes.data || []);
      setLastUpdated(new Date());
    } catch (error) {
      console.error('Error fetching analytics data:', error);
    } finally {
      setInitialLoading(false);
    }
  }, [fetchIncidents, fetchEmergencies]);

  // Initial load and auto-refresh every 10 seconds
  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 10000);
    return () => clearInterval(interval);
  }, [fetchData]);

  // Calculate real metrics from actual data
  const metrics = useMemo(() => {
    const allIncidents = incidents || [];
    const allEmergencies = emergencies || [];
    const allOfficers = officers || [];
    const allUsers = users || [];

    // Total incidents (incidents + emergencies)
    const totalIncidents = allIncidents.length + allEmergencies.length;
    
    // Active users (total users count)
    const activeUsers = allUsers.length || allOfficers.length;
    
    // Calculate resolution rate
    const resolvedIncidents = allIncidents.filter(i => 
      i.status === 'resolved' || i.status === 'closed'
    ).length;
    const resolvedEmergencies = allEmergencies.filter(e => 
      e.status === 'resolved' || e.status === 'closed'
    ).length;
    const totalResolved = resolvedIncidents + resolvedEmergencies;
    const resolutionRate = totalIncidents > 0 
      ? Math.round((totalResolved / totalIncidents) * 100) 
      : 0;

    // Calculate average response time (in minutes)
    const responseTimes = [...allIncidents, ...allEmergencies]
      .filter(item => item.response_time || item.responded_at)
      .map(item => {
        if (item.response_time) return item.response_time;
        if (item.responded_at && item.created_at) {
          return Math.round((new Date(item.responded_at) - new Date(item.created_at)) / 60000);
        }
        return null;
      })
      .filter(t => t !== null && t > 0);
    
    const avgResponseTime = responseTimes.length > 0 
      ? Math.round(responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length)
      : 0;

    // Calculate week-over-week change
    const now = new Date();
    const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const twoWeeksAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);
    
    const thisWeekIncidents = [...allIncidents, ...allEmergencies].filter(i => 
      new Date(i.created_at || i.timestamp) >= oneWeekAgo
    ).length;
    
    const lastWeekIncidents = [...allIncidents, ...allEmergencies].filter(i => {
      const date = new Date(i.created_at || i.timestamp);
      return date >= twoWeeksAgo && date < oneWeekAgo;
    }).length;

    const weeklyChange = lastWeekIncidents > 0 
      ? Math.round(((thisWeekIncidents - lastWeekIncidents) / lastWeekIncidents) * 100)
      : 0;

    return {
      totalIncidents,
      activeUsers,
      avgResponseTime,
      resolutionRate,
      weeklyChange,
      thisWeekIncidents,
      totalResolved
    };
  }, [incidents, emergencies, officers, users]);

  // Calculate weekly trends from real data
  const weeklyTrends = useMemo(() => {
    const allIncidents = incidents || [];
    const allEmergencies = emergencies || [];
    const allData = [...allIncidents, ...allEmergencies];
    
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const now = new Date();
    const trends = [];

    // Get data for the last 7 days
    for (let i = 6; i >= 0; i--) {
      const date = new Date(now);
      date.setDate(date.getDate() - i);
      const dayName = days[date.getDay()];
      const dateStr = date.toDateString();

      const dayIncidents = allData.filter(item => {
        const itemDate = new Date(item.created_at || item.timestamp);
        return itemDate.toDateString() === dateStr;
      });

      const resolved = dayIncidents.filter(item => 
        item.status === 'resolved' || item.status === 'closed'
      ).length;

      trends.push({
        name: dayName,
        incidents: dayIncidents.length,
        resolved: resolved
      });
    }

    return trends;
  }, [incidents, emergencies]);

  // Calculate incident type distribution from real data
  const incidentDistribution = useMemo(() => {
    const allIncidents = incidents || [];
    const allEmergencies = emergencies || [];
    
    const typeCounts = {};

    // Count incident types
    allIncidents.forEach(inc => {
      const type = inc.incident_type || inc.type || 'Other';
      const formattedType = type.charAt(0).toUpperCase() + type.slice(1).replace(/_/g, ' ');
      typeCounts[formattedType] = (typeCounts[formattedType] || 0) + 1;
    });

    // Count emergency types
    allEmergencies.forEach(em => {
      const type = em.emergency_type || em.type || 'Emergency';
      const formattedType = type.charAt(0).toUpperCase() + type.slice(1).replace(/_/g, ' ');
      typeCounts[formattedType] = (typeCounts[formattedType] || 0) + 1;
    });

    // Convert to array and sort by count
    return Object.entries(typeCounts)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 6); // Top 6 types
  }, [incidents, emergencies]);

  // Allow both admin and district_admin roles
  if (!isAuthenticated || (user?.role !== 'admin' && user?.role !== 'district_admin')) {
    return <Navigate to="/login" />;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <Activity className="w-8 h-8 text-cyan-500" />
            System Analytics
          </h1>
          <p className="text-gray-400 mt-1">
            Real-time insights and performance metrics
            <span className="ml-2 text-xs text-cyan-400 inline-flex items-center gap-1">
              <RefreshCw className="w-3 h-3 animate-spin" />
              Live • Last: {lastUpdated.toLocaleTimeString()}
            </span>
          </p>
        </div>
      </div>

      {initialLoading ? (
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-cyan-500"></div>
        </div>
      ) : (
        <>
          {/* Key Metrics Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div className="bg-slate-800/50 backdrop-blur-md border border-white/5 rounded-xl p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-gray-400 text-sm font-medium">Total Incidents</h3>
                <AlertTriangle className="w-5 h-5 text-cyan-400" />
              </div>
              <p className="text-3xl font-bold text-white">{metrics.totalIncidents}</p>
              <p className={`text-xs flex items-center gap-1 mt-2 ${metrics.weeklyChange >= 0 ? 'text-cyan-400' : 'text-green-400'}`}>
                <TrendingUp className="w-3 h-3" /> 
                {metrics.weeklyChange >= 0 ? '+' : ''}{metrics.weeklyChange}% from last week
              </p>
            </div>

            <div className="bg-slate-800/50 backdrop-blur-md border border-white/5 rounded-xl p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-gray-400 text-sm font-medium">Active Users</h3>
                <Users className="w-5 h-5 text-cyan-400" />
              </div>
              <p className="text-3xl font-bold text-white">{metrics.activeUsers}</p>
              <p className="text-xs text-cyan-400 flex items-center gap-1 mt-2">
                <TrendingUp className="w-3 h-3" /> Real-time count
              </p>
            </div>

            <div className="bg-slate-800/50 backdrop-blur-md border border-white/5 rounded-xl p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-gray-400 text-sm font-medium">Avg Response Time</h3>
                <Activity className="w-5 h-5 text-cyan-400" />
              </div>
              <p className="text-3xl font-bold text-white">
                {metrics.avgResponseTime > 0 ? `${metrics.avgResponseTime}m` : 'N/A'}
              </p>
              <p className="text-xs text-cyan-400 flex items-center gap-1 mt-2">
                <TrendingUp className="w-3 h-3" /> Based on {metrics.totalResolved} responses
              </p>
            </div>

            <div className="bg-slate-800/50 backdrop-blur-md border border-white/5 rounded-xl p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-gray-400 text-sm font-medium">Resolution Rate</h3>
                <TrendingUp className="w-5 h-5 text-cyan-400" />
              </div>
              <p className="text-3xl font-bold text-white">{metrics.resolutionRate}%</p>
              <p className="text-xs text-cyan-400 flex items-center gap-1 mt-2">
                <TrendingUp className="w-3 h-3" /> {metrics.totalResolved} of {metrics.totalIncidents} resolved
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
                  <BarChart data={weeklyTrends}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                    <XAxis dataKey="name" stroke="#9CA3AF" />
                    <YAxis stroke="#9CA3AF" />
                    <Tooltip
                      contentStyle={{ backgroundColor: '#1F2937', border: 'none', borderRadius: '0.5rem', color: '#fff' }}
                    />
                    <Legend />
                    <Bar dataKey="incidents" name="Reported" fill="#06B6D4" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="resolved" name="Resolved" fill="#10B981" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Incident Types Pie Chart */}
            <div className="bg-slate-800/50 backdrop-blur-md border border-white/5 rounded-xl p-6">
              <h3 className="text-lg font-bold text-white mb-6">Incident Distribution</h3>
              <div className="h-80">
                {incidentDistribution.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={incidentDistribution}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={100}
                        fill="#8884d8"
                        paddingAngle={5}
                        dataKey="value"
                        label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                      >
                        {incidentDistribution.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip
                        contentStyle={{ backgroundColor: '#1F2937', border: 'none', borderRadius: '0.5rem', color: '#fff' }}
                      />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex items-center justify-center h-full text-gray-400">
                    <p>No incident data available</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default Analytics;