import React, { useState, useEffect } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { BarChart3, MapPin, AlertTriangle, Activity, Users, TrendingUp, Clock, Shield, ChevronDown, Bell, Settings, LogOut, UserCircle } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useData } from '../context/DataContext';

const DashboardPage = () => {
  const { user, isAuthenticated, logout } = useAuth();
  const { incidents, statistics, loading } = useData();
  const navigate = useNavigate();
  const [currentTime, setCurrentTime] = useState(new Date());
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  if (!isAuthenticated) {
    return <Navigate to="/login" />;
  }

  const formatTime = (date) => {
    return date.toLocaleTimeString('en-US', { hour12: false });
  };

  const formatDate = (date) => {
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  // Calculate active incidents
  const activeIncidents = incidents?.filter(i => i.status === 'pending' || i.status === 'in_progress') || [];
  const resolvedToday = incidents?.filter(i => {
    const today = new Date().toDateString();
    const incidentDate = new Date(i.resolved_at || i.updated_at).toDateString();
    return i.status === 'resolved' && incidentDate === today;
  }) || [];

  // Dashboard stats
  const stats = [
    {
      id: 1,
      title: 'ACTIVE INCIDENTS',
      value: activeIncidents.length.toString(),
      subtitle: `${activeIncidents.filter(i => i.severity === 'critical' || i.severity === 'high').length} Critical`,
      icon: AlertTriangle,
      color: 'from-red-500 to-orange-500',
      bgColor: 'bg-red-500/10',
      trend: activeIncidents.length > 3 ? '+15%' : '-8%',
      trendUp: activeIncidents.length <= 3
    },
    {
      id: 2,
      title: 'AVG RESPONSE TIME',
      value: '3.8m',
      subtitle: '↓ 18% vs last week',
      icon: Clock,
      color: 'from-blue-500 to-cyan-500',
      bgColor: 'bg-blue-500/10',
      trend: '-18%',
      trendUp: true
    },
    {
      id: 3,
      title: 'RESOLVED TODAY',
      value: resolvedToday.length.toString(),
      subtitle: `${incidents?.length > 0 ? Math.round((resolvedToday.length / incidents.length) * 100) : 94}% Clearance Rate`,
      icon: Shield,
      color: 'from-green-500 to-emerald-500',
      bgColor: 'bg-green-500/10',
      trend: '+8%',
      trendUp: true
    },
    {
      id: 4,
      title: 'SYSTEM HEALTH',
      value: '99%',
      subtitle: 'All Systems Operational',
      icon: Activity,
      color: 'from-purple-500 to-pink-500',
      bgColor: 'bg-purple-500/10',
      trend: '+2%',
      trendUp: true
    }
  ];

  // Group incidents by location
  const incidentsByLocation = incidents?.reduce((acc, incident) => {
    const location = incident.location || 'Unknown';
    if (!acc[location]) acc[location] = [];
    acc[location].push(incident);
    return acc;
  }, {}) || {};

  const regions = Object.keys(incidentsByLocation).slice(0, 5).map(location => ({
    name: location,
    value: Math.min(100, incidentsByLocation[location].length * 15),
    incidents: incidentsByLocation[location].length,
    officers: Math.floor(incidentsByLocation[location].length * 3.5)
  }));

  const recentIncidents = incidents?.slice(0, 4).map(incident => ({
    id: incident.id,
    type: incident.incident_type || incident.type || 'Traffic Incident',
    location: incident.location || 'Kigali',
    time: formatTimeSince(incident.created_at),
    severity: incident.severity || 'medium',
    status: incident.status === 'resolved' ? 'Completed' : incident.status === 'in_progress' ? 'Resolving' : 'Active'
  })) || [];

  function formatTimeSince(timestamp) {
    if (!timestamp) return 'Just now';
    const seconds = Math.floor((new Date() - new Date(timestamp)) / 1000);
    if (seconds < 60) return 'Just now';
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
    return `${Math.floor(seconds / 86400)}d ago`;
  }

  const getSeverityColor = (severity) => {
    switch (severity) {
      case 'critical':
      case 'high': return 'bg-red-500';
      case 'medium': return 'bg-orange-500';
      case 'low': return 'bg-yellow-500';
      default: return 'bg-gray-500';
    }
  };

  const deployments = [
    { unit: 'Unit Alpha', location: 'Kigali CBD', officers: 12, status: 'Active', time: '3h 20m' },
    { unit: 'Unit Bravo', location: 'Nyabugogo', officers: 8, status: 'Active', time: '2h 45m' },
    { unit: 'Unit Charlie', location: 'Remera', officers: 6, status: 'Standby', time: '1h 15m' }
  ];

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const notifications = activeIncidents.slice(0, 3).map(incident => ({
    id: incident.id,
    title: `New ${incident.incident_type || 'Incident'}`,
    message: `Reported at ${incident.location}`,
    time: formatTimeSince(incident.created_at),
    severity: incident.severity
  }));

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 text-white p-6 relative">
      {/* RNP Logo Background */}
      <div className="fixed inset-0 pointer-events-none z-0 opacity-10">
        <img
          src="/assets/rnp-logo.png"
          alt=""
          className="absolute inset-0 w-full h-full object-cover"
          style={{
            objectFit: 'cover',
            objectPosition: 'center',
            filter: 'brightness(0.6) contrast(1.2)'
          }}
        />
      </div>

      {/* Content - positioned above background */}
      <div className="relative z-10">
        {/* Header */}
        <div className="mb-8 bg-gradient-to-r from-blue-600/20 to-purple-600/20 backdrop-blur-lg rounded-2xl p-6 border border-blue-500/20">
          <div className="flex justify-between items-start mb-4">
            <div className="flex items-center gap-4">
              {/* RNP Logo */}
              <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center overflow-hidden shadow-xl ring-2 ring-blue-200">
                <img
                  src="/assets/rnp-logo.png"
                  alt="Rwanda National Police"
                  className="w-full h-full object-cover"
                  style={{
                    objectFit: 'cover',
                    objectPosition: 'center'
                  }}
                />
              </div>
              <div>
                <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
                  RNP TRAFFIC MONITOR
                </h1>
                <p className="text-blue-300 text-sm">Rwanda National Police - Traffic Management System</p>
              </div>
            </div>

            <div className="flex items-center gap-4">
              {/* Clock & Date */}
              <div className="text-right">
                <div className="text-2xl font-mono font-bold text-cyan-400">{formatTime(currentTime)}</div>
                <div className="text-sm text-blue-300">{formatDate(currentTime)}</div>
              </div>

              {/* Notifications */}
              <div className="relative">
                <button
                  onClick={() => setShowNotifications(!showNotifications)}
                  className="relative p-3 bg-white/10 rounded-xl hover:bg-white/20 transition-colors"
                >
                  <Bell className="w-6 h-6" />
                  {notifications.length > 0 && (
                    <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center font-bold">
                      {notifications.length}
                    </span>
                  )}
                </button>

                {/* Notifications Dropdown */}
                {showNotifications && (
                  <div className="absolute right-0 mt-2 w-80 bg-slate-800 rounded-xl shadow-2xl border border-blue-500/20 p-4 z-[100]">
                    <div className="flex justify-between items-center mb-3">
                      <h3 className="font-bold text-white">Notifications</h3>
                      <button onClick={() => setShowNotifications(false)} className="text-gray-400 hover:text-white">
                        ×
                      </button>
                    </div>
                    {notifications.length === 0 ? (
                      <p className="text-gray-400 text-sm">No new notifications</p>
                    ) : (
                      <div className="space-y-2">
                        {notifications.map(notif => (
                          <div key={notif.id} className="bg-slate-700/50 rounded-lg p-3 hover:bg-slate-700 cursor-pointer">
                            <div className="flex items-start gap-2">
                              <div className={`w-2 h-2 rounded-full mt-1 ${getSeverityColor(notif.severity)}`}></div>
                              <div className="flex-1">
                                <p className="text-sm font-medium text-white">{notif.title}</p>
                                <p className="text-xs text-gray-400">{notif.message}</p>
                                <p className="text-xs text-gray-500 mt-1">{notif.time}</p>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* User Menu */}
              <div className="relative">
                <button
                  onClick={() => setShowUserMenu(!showUserMenu)}
                  className="flex items-center gap-2 p-3 bg-white/10 rounded-xl hover:bg-white/20 transition-colors"
                >
                  <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center">
                    <UserCircle className="w-6 h-6" />
                  </div>
                  <ChevronDown className="w-4 h-4" />
                </button>

                {/* User Dropdown */}
                {showUserMenu && (
                  <div className="absolute right-0 mt-2 w-56 bg-slate-800 rounded-xl shadow-2xl border border-blue-500/20 overflow-hidden z-[100]">
                    <div className="p-4 bg-blue-600/20 border-b border-blue-500/20">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-blue-500 rounded-full flex items-center justify-center">
                          <UserCircle className="w-8 h-8" />
                        </div>
                        <div>
                          <p className="font-semibold text-white">{user?.role || 'System'}</p>
                          <p className="text-xs text-blue-300">Administrator</p>
                        </div>
                      </div>
                    </div>
                    <div className="p-2">
                      <button
                        onClick={() => {
                          setShowUserMenu(false);
                          // Navigate to profile
                        }}
                        className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-slate-700 rounded-lg transition-colors"
                      >
                        <UserCircle className="w-5 h-5 text-gray-400" />
                        <span>Profile</span>
                      </button>
                      <button
                        onClick={() => {
                          setShowUserMenu(false);
                          // Navigate to settings
                        }}
                        className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-slate-700 rounded-lg transition-colors"
                      >
                        <Settings className="w-5 h-5 text-gray-400" />
                        <span>Settings</span>
                      </button>
                      <div className="border-t border-slate-700 my-2"></div>
                      <button
                        onClick={handleLogout}
                        className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-red-500/20 text-red-400 rounded-lg transition-colors"
                      >
                        <LogOut className="w-5 h-5" />
                        <span>Log Out</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="flex gap-6 text-sm">
            <Link to="/dashboard" className="px-4 py-2 bg-blue-500 rounded-lg hover:bg-blue-600 transition-colors font-medium">
              Dashboard
            </Link>
            <Link to="/" className="px-4 py-2 bg-white/10 rounded-lg hover:bg-white/20 transition-colors">
              Live Map
            </Link>
            <Link to="/incidents" className="px-4 py-2 bg-white/10 rounded-lg hover:bg-white/20 transition-colors">
              All Incidents
            </Link>
            <button className="px-4 py-2 bg-white/10 rounded-lg hover:bg-white/20 transition-colors">
              Analytics
            </button>
            <button className="px-4 py-2 bg-white/10 rounded-lg hover:bg-white/20 transition-colors">
              Reports
            </button>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {stats.map((stat) => (
            <div
              key={stat.id}
              className="bg-gradient-to-br from-white/10 to-white/5 backdrop-blur-lg rounded-2xl p-6 border border-white/10 hover:border-white/20 transition-all hover:scale-105 cursor-pointer"
            >
              <div className="flex items-start justify-between mb-4">
                <div className={`${stat.bgColor} p-3 rounded-xl`}>
                  <stat.icon className="w-6 h-6" />
                </div>
                <span className={`text-xs font-bold ${stat.trendUp ? 'text-green-400' : 'text-red-400'}`}>
                  {stat.trend}
                </span>
              </div>
              <div className="text-sm text-blue-300 mb-2">{stat.title}</div>
              <div className="text-4xl font-bold mb-2 bg-gradient-to-r from-white to-blue-200 bg-clip-text text-transparent">
                {stat.value}
              </div>
              <div className="text-xs text-gray-400">{stat.subtitle}</div>
            </div>
          ))}
        </div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          {/* Live Traffic Heatmap */}
          <div className="lg:col-span-2 bg-gradient-to-br from-white/10 to-white/5 backdrop-blur-lg rounded-2xl p-6 border border-white/10">
            <div className="flex justify-between items-center mb-6">
              <div>
                <h3 className="text-xl font-bold text-white flex items-center gap-2">
                  <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                  LIVE TRAFFIC HEATMAP
                </h3>
                <p className="text-sm text-gray-400">Real-time traffic monitoring across Rwanda</p>
              </div>
              <div className="flex gap-2">
                <span className="px-3 py-1 bg-red-500/20 text-red-400 rounded-lg text-xs font-medium">
                  High Congestion ({activeIncidents.filter(i => i.severity === 'critical' || i.severity === 'high').length})
                </span>
                <span className="px-3 py-1 bg-orange-500/20 text-orange-400 rounded-lg text-xs font-medium">
                  Medium ({activeIncidents.filter(i => i.severity === 'medium').length})
                </span>
              </div>
            </div>

            <div className="bg-slate-800/50 rounded-xl h-80 flex items-center justify-center relative overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-br from-blue-500/10 to-purple-500/10"></div>
              <MapPin className="w-16 h-16 text-blue-400 opacity-50" />
              <div className="absolute top-4 right-4 bg-slate-900/80 backdrop-blur-sm px-3 py-2 rounded-lg text-xs">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                  <span>Critical: {activeIncidents[0]?.location || 'Kigali CBD'}</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-orange-500 rounded-full"></div>
                  <span>Moderate: {activeIncidents[1]?.location || 'Nyabugogo'}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Regional Overview */}
          <div className="bg-gradient-to-br from-white/10 to-white/5 backdrop-blur-lg rounded-2xl p-6 border border-white/10">
            <h3 className="text-xl font-bold mb-6 text-white">Regional Overview</h3>
            <div className="space-y-4">
              {regions.length > 0 ? regions.map((region, index) => (
                <div key={index} className="bg-slate-800/50 rounded-xl p-4 hover:bg-slate-800/70 transition-colors">
                  <div className="flex justify-between items-center mb-2">
                    <span className="font-medium text-sm">{region.name}</span>
                    <span className="text-xl font-bold text-cyan-400">{region.value}%</span>
                  </div>
                  <div className="w-full bg-slate-700 rounded-full h-2 mb-2">
                    <div
                      className={`h-2 rounded-full bg-gradient-to-r ${region.value > 60 ? 'from-green-500 to-emerald-500' :
                        region.value > 40 ? 'from-yellow-500 to-orange-500' :
                          'from-red-500 to-pink-500'
                        }`}
                      style={{ width: `${region.value}%` }}
                    ></div>
                  </div>
                  <div className="flex justify-between text-xs text-gray-400">
                    <span>{region.incidents} incidents</span>
                    <span>{region.officers} officers</span>
                  </div>
                </div>
              )) : (
                <div className="text-center py-8 text-gray-400">
                  <MapPin className="w-12 h-12 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">Loading regional data...</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Bottom Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Recent Incidents */}
          <div className="bg-gradient-to-br from-white/10 to-white/5 backdrop-blur-lg rounded-2xl p-6 border border-white/10">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-bold text-white">Incident Feed</h3>
              <Link to="/incidents" className="text-blue-400 text-sm hover:text-blue-300">View All →</Link>
            </div>

            {recentIncidents.length === 0 ? (
              <div className="text-center py-12 text-gray-400">
                <AlertTriangle className="w-12 h-12 mx-auto mb-3 opacity-50" />
                <p>NO ACTIVE INCIDENTS</p>
              </div>
            ) : (
              <div className="space-y-3">
                {recentIncidents.map((incident) => (
                  <div key={incident.id} className="bg-slate-800/50 rounded-xl p-4 hover:bg-slate-800/70 transition-colors">
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex items-center gap-3">
                        <div className={`w-3 h-3 rounded-full ${getSeverityColor(incident.severity)}`}></div>
                        <div>
                          <div className="font-medium text-white">{incident.type}</div>
                          <div className="text-sm text-gray-400 flex items-center gap-2">
                            <MapPin className="w-3 h-3" />
                            {incident.location}
                          </div>
                        </div>
                      </div>
                      <span className={`px-2 py-1 rounded-lg text-xs font-medium ${incident.status === 'Active' ? 'bg-red-500/20 text-red-400' :
                        incident.status === 'Resolving' ? 'bg-orange-500/20 text-orange-400' :
                          'bg-green-500/20 text-green-400'
                        }`}>
                        {incident.status}
                      </span>
                    </div>
                    <div className="text-xs text-gray-500">{incident.time}</div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Police Deployments */}
          <div className="bg-gradient-to-br from-white/10 to-white/5 backdrop-blur-lg rounded-2xl p-6 border border-white/10">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-bold text-white">Active Deployments</h3>
              <button className="text-blue-400 text-sm hover:text-blue-300">Manage →</button>
            </div>

            <div className="space-y-3">
              {deployments.map((deployment, index) => (
                <div key={index} className="bg-slate-800/50 rounded-xl p-4 hover:bg-slate-800/70 transition-colors">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div className="bg-blue-500 p-2 rounded-lg">
                        <Users className="w-4 h-4" />
                      </div>
                      <div>
                        <div className="font-medium text-white">{deployment.unit}</div>
                        <div className="text-sm text-gray-400">{deployment.location}</div>
                      </div>
                    </div>
                    <span className={`px-3 py-1 rounded-lg text-xs font-medium ${deployment.status === 'Active' ? 'bg-green-500/20 text-green-400' :
                      'bg-yellow-500/20 text-yellow-400'
                      }`}>
                      {deployment.status}
                    </span>
                  </div>
                  <div className="flex justify-between text-xs text-gray-400">
                    <span>{deployment.officers} officers deployed</span>
                    <span>Active for {deployment.time}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DashboardPage;
