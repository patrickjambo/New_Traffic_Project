import React, { useState, useEffect } from 'react';
import { 
  AlertTriangle, 
  Activity, 
  MapPin, 
  TrendingUp,
  Users,
  Camera,
  Clock,
  CheckCircle
} from 'lucide-react';
import { useData } from '../context/DataContext';

const HomePage = () => {
  const { incidents, statistics, loading } = useData();
  const [recentIncidents, setRecentIncidents] = useState([]);

  useEffect(() => {
    if (incidents) {
      // Get last 5 incidents
      setRecentIncidents(incidents.slice(0, 5));
    }
  }, [incidents]);

  const stats = [
    {
      title: 'Total Incidents',
      value: statistics?.total_incidents || 0,
      icon: AlertTriangle,
      color: 'bg-red-500',
      trend: '+12%'
    },
    {
      title: 'Active Reports',
      value: statistics?.active_reports || 0,
      icon: Activity,
      color: 'bg-blue-500',
      trend: '+5%'
    },
    {
      title: 'Mobile Captures',
      value: statistics?.mobile_captures || 0,
      icon: Camera,
      color: 'bg-green-500',
      trend: '+28%'
    },
    {
      title: 'Response Time',
      value: `${statistics?.avg_response_time || 0}min`,
      icon: Clock,
      color: 'bg-yellow-500',
      trend: '-15%'
    }
  ];

  const getSeverityColor = (severity) => {
    switch (severity?.toLowerCase()) {
      case 'critical':
        return 'bg-red-100 text-red-800 border-red-300';
      case 'high':
        return 'bg-orange-100 text-orange-800 border-orange-300';
      case 'medium':
        return 'bg-yellow-100 text-yellow-800 border-yellow-300';
      default:
        return 'bg-blue-100 text-blue-800 border-blue-300';
    }
  };

  const getStatusColor = (status) => {
    switch (status?.toLowerCase()) {
      case 'resolved':
        return 'bg-green-100 text-green-800';
      case 'in_progress':
        return 'bg-blue-100 text-blue-800';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-900 to-blue-700 rounded-lg shadow-lg p-8 text-white">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold mb-2">TrafficGuard AI Dashboard</h1>
            <p className="text-blue-100">Real-time Traffic Monitoring & Incident Management System</p>
          </div>
          <div className="text-right">
            <p className="text-sm text-blue-100">Last Updated</p>
            <p className="text-lg font-semibold">{new Date().toLocaleTimeString()}</p>
          </div>
        </div>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat, index) => (
          <div key={index} className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow">
            <div className="flex items-center justify-between mb-4">
              <div className={`${stat.color} p-3 rounded-lg`}>
                <stat.icon className="w-6 h-6 text-white" />
              </div>
              <span className={`text-sm font-semibold ${stat.trend.startsWith('+') ? 'text-green-600' : 'text-red-600'}`}>
                {stat.trend}
              </span>
            </div>
            <h3 className="text-gray-600 text-sm font-medium">{stat.title}</h3>
            <p className="text-3xl font-bold text-gray-900 mt-2">{stat.value}</p>
          </div>
        ))}
      </div>

      {/* Recent Incidents */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-gray-900 flex items-center">
            <AlertTriangle className="w-6 h-6 mr-2 text-red-500" />
            Recent Incidents
          </h2>
          <a href="/incidents" className="text-blue-600 hover:text-blue-800 font-medium">
            View All →
          </a>
        </div>

        {recentIncidents.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <CheckCircle className="w-12 h-12 mx-auto mb-3 text-green-500" />
            <p>No recent incidents to display</p>
          </div>
        ) : (
          <div className="space-y-4">
            {recentIncidents.map((incident) => (
              <div 
                key={incident.id} 
                className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <span className={`px-3 py-1 rounded-full text-xs font-semibold border ${getSeverityColor(incident.severity)}`}>
                        {incident.severity || 'MEDIUM'}
                      </span>
                      <span className={`px-3 py-1 rounded-full text-xs font-semibold ${getStatusColor(incident.status)}`}>
                        {incident.status || 'Pending'}
                      </span>
                      {incident.auto_captured && (
                        <span className="px-3 py-1 rounded-full text-xs font-semibold bg-purple-100 text-purple-800">
                          📱 Auto-Captured
                        </span>
                      )}
                    </div>
                    <h3 className="font-semibold text-gray-900 mb-1">{incident.incident_type || 'Traffic Incident'}</h3>
                    <p className="text-sm text-gray-600 mb-2">{incident.description || 'No description available'}</p>
                    <div className="flex items-center gap-4 text-xs text-gray-500">
                      <span className="flex items-center">
                        <MapPin className="w-4 h-4 mr-1" />
                        {incident.location || 'Unknown Location'}
                      </span>
                      <span className="flex items-center">
                        <Clock className="w-4 h-4 mr-1" />
                        {new Date(incident.created_at).toLocaleString()}
                      </span>
                    </div>
                  </div>
                  {incident.media_url && (
                    <img 
                      src={incident.media_url} 
                      alt="Incident" 
                      className="w-24 h-24 object-cover rounded-lg ml-4"
                    />
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <a 
          href="/incidents" 
          className="bg-gradient-to-br from-red-500 to-red-600 text-white rounded-lg shadow-md p-6 hover:shadow-lg transition-all hover:scale-105"
        >
          <AlertTriangle className="w-8 h-8 mb-3" />
          <h3 className="text-lg font-bold mb-2">View All Incidents</h3>
          <p className="text-sm text-red-100">Monitor and manage traffic incidents</p>
        </a>

        <a 
          href="/reports" 
          className="bg-gradient-to-br from-blue-500 to-blue-600 text-white rounded-lg shadow-md p-6 hover:shadow-lg transition-all hover:scale-105"
        >
          <Activity className="w-8 h-8 mb-3" />
          <h3 className="text-lg font-bold mb-2">Generate Reports</h3>
          <p className="text-sm text-blue-100">Create comprehensive traffic reports</p>
        </a>

        <a 
          href="/emergency" 
          className="bg-gradient-to-br from-orange-500 to-orange-600 text-white rounded-lg shadow-md p-6 hover:shadow-lg transition-all hover:scale-105"
        >
          <Users className="w-8 h-8 mb-3" />
          <h3 className="text-lg font-bold mb-2">Emergency Response</h3>
          <p className="text-sm text-orange-100">Manage critical emergency situations</p>
        </a>
      </div>
    </div>
  );
};

export default HomePage;
