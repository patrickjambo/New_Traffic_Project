import React, { useState, useEffect } from 'react';
import { BarChart3, MapPin, AlertTriangle, Activity, Users, TrendingUp, Clock, Shield, X, ChevronDown, Bell, User, Settings, LogOut, Home, Map, FileText } from 'lucide-react';
import { useTranslation } from 'react-i18next';

const TrafficDashboard = () => {
  const { t } = useTranslation();
  const [currentTime, setCurrentTime] = useState(new Date());
  const [selectedCard, setSelectedCard] = useState(null);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

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

  // Dashboard data
  const stats = [
    {
      id: 1,
      title: t('dash_active_incidents'),
      value: '3',
      subtitle: t('dash_active_incidents_subtitle'),
      icon: AlertTriangle,
      color: 'from-red-500 to-orange-500',
      bgColor: 'bg-red-500/10',
      trend: '+15%',
      trendUp: false
    },
    {
      id: 2,
      title: t('dash_avg_response_time'),
      value: '3.8m',
      subtitle: t('dash_avg_response_time_subtitle'),
      icon: Clock,
      color: 'from-blue-500 to-cyan-500',
      bgColor: 'bg-blue-500/10',
      trend: '-18%',
      trendUp: true
    },
    {
      id: 3,
      title: t('dash_resolved_today'),
      value: '47',
      subtitle: t('dash_resolved_today_subtitle'),
      icon: Shield,
      color: 'from-green-500 to-emerald-500',
      bgColor: 'bg-green-500/10',
      trend: '+8%',
      trendUp: true
    },
    {
      id: 4,
      title: t('dash_system_health'),
      value: '99%',
      subtitle: t('dash_system_health_subtitle'),
      icon: Activity,
      color: 'from-cyan-500 to-teal-500',
      bgColor: 'bg-cyan-500/10',
      trend: '+2%',
      trendUp: true
    }
  ];

  const regions = [
    { name: 'Kigali City', value: 67, incidents: 234, officers: 89 },
    { name: 'Northern Province', value: 45, incidents: 123, officers: 45 },
    { name: 'Southern Province', value: 38, incidents: 98, officers: 52 },
    { name: 'Eastern Province', value: 52, incidents: 156, officers: 61 },
    { name: 'Western Province', value: 41, incidents: 112, officers: 48 }
  ];

  const recentIncidents = [
    { id: 1, type: 'Accident', location: 'KN 5 Ave, Kigali', time: '12m ago', severity: 'high', status: 'Active' },
    { id: 2, type: 'Traffic Jam', location: 'Nyabugogo', time: '25m ago', severity: 'medium', status: 'Active' },
    { id: 3, type: 'Road Block', location: 'Remera', time: '1h ago', severity: 'medium', status: 'Resolving' },
    { id: 4, type: 'Vehicle Check', location: 'Kimironko', time: '2h ago', severity: 'low', status: 'Completed' }
  ];

  const deployments = [
    { unit: 'Unit Alpha', location: 'Kigali CBD', officers: 12, status: 'Active', time: '3h 20m' },
    { unit: 'Unit Bravo', location: 'Nyabugogo', officers: 8, status: 'Active', time: '2h 45m' },
    { unit: 'Unit Charlie', location: 'Remera', officers: 6, status: 'Standby', time: '1h 15m' }
  ];

  const getSeverityColor = (severity) => {
    switch(severity) {
      case 'high': return 'bg-red-500';
      case 'medium': return 'bg-orange-500';
      case 'low': return 'bg-yellow-500';
      default: return 'bg-gray-500';
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 text-white">
      {/* Top Navigation Bar */}
      <nav className="bg-gradient-to-r from-slate-900/95 to-blue-900/95 backdrop-blur-xl border-b border-blue-500/20 px-6 py-4 sticky top-0 z-50">
        <div className="flex justify-between items-center">
          {/* Logo and Brand */}
          <div className="flex items-center gap-4">
            <div className="bg-gradient-to-br from-blue-500 to-cyan-600 p-2 rounded-xl">
              <Shield className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-xl font-bold bg-gradient-to-r from-blue-400 to-cyan-400 bg-clip-text text-transparent">
                RNP TRAFFIC
              </h1>
              <p className="text-xs text-blue-300">{t('brand_subtitle')}</p>
            </div>
          </div>

          {/* Main Navigation */}
          <div className="flex gap-2">
            <button className="px-4 py-2 bg-blue-500 rounded-lg hover:bg-blue-600 transition-colors font-medium flex items-center gap-2">
              <Home className="w-4 h-4" />
              {t('dash_nav_dashboard')}
            </button>
            <button className="px-4 py-2 bg-white/10 rounded-lg hover:bg-white/20 transition-colors flex items-center gap-2">
              <Map className="w-4 h-4" />
              {t('dash_nav_live_map')}
            </button>
            <button className="px-4 py-2 bg-white/10 rounded-lg hover:bg-white/20 transition-colors flex items-center gap-2">
              <AlertTriangle className="w-4 h-4" />
              {t('dash_nav_incidents')}
            </button>
            <button className="px-4 py-2 bg-white/10 rounded-lg hover:bg-white/20 transition-colors flex items-center gap-2">
              <BarChart3 className="w-4 h-4" />
              {t('dash_nav_analytics')}
            </button>
            <button className="px-4 py-2 bg-white/10 rounded-lg hover:bg-white/20 transition-colors flex items-center gap-2">
              <FileText className="w-4 h-4" />
              {t('dash_nav_reports')}
            </button>
          </div>

          {/* Right Section - Time, Notifications, User */}
          <div className="flex items-center gap-4">
            {/* Time Display */}
            <div className="text-right bg-white/5 px-4 py-2 rounded-lg border border-white/10">
              <div className="text-sm font-mono font-bold text-cyan-400">{formatTime(currentTime)}</div>
              <div className="text-xs text-blue-300">{currentTime.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</div>
            </div>

            {/* Notifications */}
            <div className="relative">
              <button
                onClick={() => setShowNotifications(!showNotifications)}
                className="relative p-2 bg-white/10 rounded-lg hover:bg-white/20 transition-colors"
              >
                <Bell className="w-5 h-5" />
                <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs w-5 h-5 rounded-full flex items-center justify-center font-bold">
                  3
                </span>
              </button>

              {/* Notifications Dropdown */}
              {showNotifications && (
                <div className="absolute right-0 mt-2 w-80 bg-slate-900/95 backdrop-blur-xl rounded-xl border border-blue-500/20 shadow-2xl">
                  <div className="p-4 border-b border-white/10">
                    <h3 className="font-bold text-white">{t('dash_notifications')}</h3>
                  </div>
                  <div className="max-h-96 overflow-y-auto">
                    <div className="p-4 border-b border-white/5 hover:bg-white/5 cursor-pointer">
                      <div className="flex items-start gap-3">
                        <div className="bg-red-500/20 p-2 rounded-lg">
                          <AlertTriangle className="w-4 h-4 text-red-400" />
                        </div>
                        <div className="flex-1">
                          <p className="text-sm font-medium text-white">{t('dash_notification_critical')}</p>
                          <p className="text-xs text-gray-400">{t('dash_notification_critical_desc')}</p>
                          <p className="text-xs text-gray-500 mt-1">{t('dash_notification_5_min')}</p>
                        </div>
                      </div>
                    </div>
                    <div className="p-4 border-b border-white/5 hover:bg-white/5 cursor-pointer">
                      <div className="flex items-start gap-3">
                        <div className="bg-blue-500/20 p-2 rounded-lg">
                          <Users className="w-4 h-4 text-blue-400" />
                        </div>
                        <div className="flex-1">
                          <p className="text-sm font-medium text-white">{t('dash_notification_unit')}</p>
                          <p className="text-xs text-gray-400">{t('dash_notification_unit_desc')}</p>
                          <p className="text-xs text-gray-500 mt-1">{t('dash_notification_15_min')}</p>
                        </div>
                      </div>
                    </div>
                    <div className="p-4 hover:bg-white/5 cursor-pointer">
                      <div className="flex items-start gap-3">
                        <div className="bg-green-500/20 p-2 rounded-lg">
                          <Shield className="w-4 h-4 text-green-400" />
                        </div>
                        <div className="flex-1">
                          <p className="text-sm font-medium text-white">{t('dash_notification_resolved')}</p>
                          <p className="text-xs text-gray-400">{t('dash_notification_resolved_desc')}</p>
                          <p className="text-xs text-gray-500 mt-1">{t('dash_notification_1_hour')}</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* User Menu */}
            <div className="relative">
              <button
                onClick={() => setShowUserMenu(!showUserMenu)}
                className="flex items-center gap-3 bg-white/10 px-4 py-2 rounded-lg hover:bg-white/20 transition-colors"
              >
                <div className="bg-gradient-to-br from-blue-500 to-cyan-600 p-2 rounded-lg">
                  <User className="w-4 h-4" />
                </div>
                <div className="text-left">
                  <p className="text-sm font-medium">{t('dash_user_admin')}</p>
                  <p className="text-xs text-gray-400">{t('dash_user_role')}</p>
                </div>
                <ChevronDown className="w-4 h-4" />
              </button>

              {/* User Dropdown */}
              {showUserMenu && (
                <div className="absolute right-0 mt-2 w-56 bg-slate-900/95 backdrop-blur-xl rounded-xl border border-blue-500/20 shadow-2xl">
                  <div className="p-2">
                    <button className="w-full flex items-center gap-3 px-4 py-2 rounded-lg hover:bg-white/10 transition-colors text-left">
                      <User className="w-4 h-4 text-blue-400" />
                      <span className="text-sm">{t('dash_profile')}</span>
                    </button>
                    <button className="w-full flex items-center gap-3 px-4 py-2 rounded-lg hover:bg-white/10 transition-colors text-left">
                      <Settings className="w-4 h-4 text-blue-400" />
                      <span className="text-sm">{t('dash_settings')}</span>
                    </button>
                    <div className="my-2 border-t border-white/10"></div>
                    <button className="w-full flex items-center gap-3 px-4 py-2 rounded-lg hover:bg-red-500/20 transition-colors text-left text-red-400">
                      <LogOut className="w-4 h-4" />
                      <span className="text-sm font-medium">{t('dash_log_out')}</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <div className="p-6">
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
                {t('dash_live_heatmap')}
              </h3>
              <p className="text-sm text-gray-400">{t('dash_live_heatmap_subtitle')}</p>
            </div>
            <div className="flex gap-2">
              <span className="px-3 py-1 bg-red-500/20 text-red-400 rounded-lg text-xs font-medium">
                {t('dash_high_congestion')} (3)
              </span>
              <span className="px-3 py-1 bg-orange-500/20 text-orange-400 rounded-lg text-xs font-medium">
                {t('dash_medium')} (7)
              </span>
            </div>
          </div>

          <div className="bg-slate-800/50 rounded-xl h-80 flex items-center justify-center relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-blue-500/10 to-cyan-500/10"></div>
            <MapPin className="w-16 h-16 text-blue-400 opacity-50" />
            <div className="absolute top-4 right-4 bg-slate-900/80 backdrop-blur-sm px-3 py-2 rounded-lg text-xs">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                <span>{t('dash_critical_kigali')}</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-orange-500 rounded-full"></div>
                <span>{t('dash_moderate_nyabugogo')}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Regional Overview */}
        <div className="bg-gradient-to-br from-white/10 to-white/5 backdrop-blur-lg rounded-2xl p-6 border border-white/10">
          <h3 className="text-xl font-bold mb-6 text-white">{t('dash_regional_overview')}</h3>
          <div className="space-y-4">
            {regions.map((region, index) => (
              <div key={index} className="bg-slate-800/50 rounded-xl p-4 hover:bg-slate-800/70 transition-colors">
                <div className="flex justify-between items-center mb-2">
                  <span className="font-medium text-sm">{region.name}</span>
                  <span className="text-xl font-bold text-cyan-400">{region.value}%</span>
                </div>
                <div className="w-full bg-slate-700 rounded-full h-2 mb-2">
                  <div
                    className={`h-2 rounded-full bg-gradient-to-r ${
                      region.value > 60 ? 'from-green-500 to-emerald-500' :
                      region.value > 40 ? 'from-yellow-500 to-orange-500' :
                      'from-red-500 to-pink-500'
                    }`}
                    style={{ width: `${region.value}%` }}
                  ></div>
                </div>
                <div className="flex justify-between text-xs text-gray-400">
                  <span>{region.incidents} {t('dash_incidents_label')}</span>
                  <span>{region.officers} {t('dash_officers_label')}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Bottom Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Incidents */}
        <div className="bg-gradient-to-br from-white/10 to-white/5 backdrop-blur-lg rounded-2xl p-6 border border-white/10">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-xl font-bold text-white">{t('dash_incident_feed')}</h3>
            <button className="text-blue-400 text-sm hover:text-blue-300">{t('dash_view_all')}</button>
          </div>

          {recentIncidents.length === 0 ? (
            <div className="text-center py-12 text-gray-400">
              <AlertTriangle className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p>{t('dash_no_active_incidents')}</p>
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
                    <span className={`px-2 py-1 rounded-lg text-xs font-medium ${
                      incident.status === 'Active' ? 'bg-red-500/20 text-red-400' :
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
            <h3 className="text-xl font-bold text-white">{t('dash_active_deployments')}</h3>
            <button className="text-blue-400 text-sm hover:text-blue-300">{t('dash_manage')}</button>
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
                  <span className={`px-3 py-1 rounded-lg text-xs font-medium ${
                    deployment.status === 'Active' ? 'bg-green-500/20 text-green-400' :
                    'bg-yellow-500/20 text-yellow-400'
                  }`}>
                    {deployment.status}
                  </span>
                </div>
                <div className="flex justify-between text-xs text-gray-400">
                  <span>{deployment.officers} {t('dash_officers_deployed')}</span>
                  <span>{t('dash_active_for')} {deployment.time}</span>
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

export default TrafficDashboard;