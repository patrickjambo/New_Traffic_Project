import React, { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useData } from '../context/DataContext';
import { useWebSocket } from '../context/WebSocketContext';
import {
  AlertTriangle,
  Clock,
  Shield,
  Activity,
  MapPin,
  ChevronRight,
  Wifi,
  WifiOff,
  Download,
  Building2
} from 'lucide-react';

const DashboardPage = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { incidents, emergencies, deployments: realDeployments, statistics, loading, isConnected: dataConnected, downloadEmergencyReport } = useData();
  const { isConnected: wsConnected, connectionStatus } = useWebSocket();
  
  // Check if user is district admin
  const isDistrictAdmin = user?.role === 'district_admin';
  const userDistrictId = user?.districtId;
  const userDistrictName = user?.districtName;

  // Calculate real-time stats from actual data
  const realTimeStats = useMemo(() => {
    const activeIncidents = incidents.filter(i => i.status !== 'resolved');
    const criticalCount = activeIncidents.filter(i => i.severity === 'critical' || i.severity === 'high').length;
    const resolvedToday = incidents.filter(i => {
      if (i.status !== 'resolved') return false;
      const today = new Date();
      const updated = new Date(i.updated_at || i.created_at);
      return updated.toDateString() === today.toDateString();
    }).length;

    return {
      activeIncidents: activeIncidents.length,
      criticalCount,
      resolvedToday,
      avgResponseTime: statistics?.avg_response_time || 0,
      totalIncidents: statistics?.total_incidents || incidents.length,
    };
  }, [incidents, statistics]);

  // Format recent reports (incidents + emergencies)
  const recentReports = useMemo(() => {
    const formattedIncidents = incidents.map(inc => ({
      id: inc.id,
      type: inc.incident_type || inc.type || 'Incident',
      location: inc.location || inc.address || 'Unknown Location',
      time: formatTimeAgo(inc.created_at),
      timestamp: new Date(inc.created_at),
      status: inc.status || 'pending',
      severity: inc.severity || 'medium',
      source: inc.source || 'manual',
      reportType: 'incident',
      color: inc.severity === 'critical' ? 'bg-red-500' :
        inc.severity === 'high' ? 'bg-orange-500' :
          inc.severity === 'medium' ? 'bg-yellow-500' : 'bg-blue-500'
    }));

    const formattedEmergencies = emergencies.map(em => ({
      id: em.id,
      type: em.emergency_type || 'Emergency',
      location: em.location_name || 'Unknown Location',
      time: formatTimeAgo(em.created_at),
      timestamp: new Date(em.created_at),
      status: em.status || 'pending',
      severity: em.severity || 'high',
      source: 'emergency',
      reportType: 'emergency',
      color: 'bg-red-600'
    }));

    return [...formattedIncidents, ...formattedEmergencies]
      .sort((a, b) => b.timestamp - a.timestamp)
      .slice(0, 20);
  }, [incidents, emergencies]);

  // Active Emergencies
  const activeEmergencies = useMemo(() => {
    return emergencies.filter(em => em.status === 'pending' || em.status === 'active');
  }, [emergencies]);

  // Stats Data - now using real data
  const stats = [
    {
      id: 1,
      title: 'ACTIVE INCIDENTS',
      value: loading ? '...' : String(realTimeStats.activeIncidents),
      subtitle: `${realTimeStats.criticalCount} Critical`,
      icon: AlertTriangle,
      color: 'bg-red-500',
      iconColor: 'text-white',
      trend: realTimeStats.activeIncidents > 0 ? 'Active' : 'Clear',
      trendColor: realTimeStats.activeIncidents > 0 ? 'bg-red-500/20 text-red-300' : 'bg-green-500/20 text-green-300'
    },
    {
      id: 2,
      title: 'EMERGENCIES',
      value: loading ? '...' : String(activeEmergencies.length),
      subtitle: 'Active alerts',
      icon: Activity,
      color: 'bg-orange-600',
      iconColor: 'text-white',
      trend: activeEmergencies.length > 0 ? 'URGENT' : 'None',
      trendColor: activeEmergencies.length > 0 ? 'bg-red-500 animate-pulse text-white' : 'bg-green-500/20 text-green-300'
    },
    {
      id: 3,
      title: 'RESOLVED TODAY',
      value: loading ? '...' : String(realTimeStats.resolvedToday),
      subtitle: 'Incidents cleared',
      icon: Shield,
      color: 'bg-green-500',
      iconColor: 'text-white',
      trend: '+' + realTimeStats.resolvedToday,
      trendColor: 'bg-green-500/20 text-green-300'
    },
    {
      id: 4,
      title: 'SYSTEM STATUS',
      value: wsConnected ? 'Online' : 'Offline',
      subtitle: wsConnected ? 'Real-time updates active' : 'Reconnecting...',
      icon: wsConnected ? Wifi : WifiOff,
      color: wsConnected ? 'bg-green-500' : 'bg-yellow-500',
      iconColor: 'text-white',
      trend: connectionStatus,
      trendColor: wsConnected ? 'bg-green-500/20 text-green-300' : 'bg-yellow-500/20 text-yellow-300'
    }
  ];

  // District mapping for Kigali
  const kigaliDistricts = {
    1: { name: 'Nyarugenge', color: 'bg-blue-500' },
    2: { name: 'Gasabo', color: 'bg-green-500' },
    3: { name: 'Kicukiro', color: 'bg-purple-500' },
  };

  // Regions - show only user's district for district admins, all regions for super admin
  const regions = useMemo(() => {
    if (isDistrictAdmin && userDistrictId) {
      // District admin sees only their district
      const district = kigaliDistricts[userDistrictId] || { name: userDistrictName, color: 'bg-blue-500' };
      const districtIncidents = incidents.length;
      // Count officers - handle both array and number formats
      const officerCount = realDeployments.reduce((sum, d) => {
        const officers = d.officers;
        if (Array.isArray(officers)) {
          return sum + officers.length;
        }
        return sum + (d.officer_count || officers || 0);
      }, 0);
      return [
        { 
          name: district.name + ' District', 
          load: Math.min(100, Math.round((districtIncidents / 10) * 100)), 
          incidents: districtIncidents, 
          officers: officerCount,
          color: district.color 
        }
      ];
    }
    
    // Super admin sees all regions
    return [
      { name: 'Kigali City', load: 67, incidents: incidents.filter(i => i.location?.toLowerCase().includes('kigali')).length || 0, officers: 89, color: 'bg-blue-500' },
      { name: 'Northern Province', load: 45, incidents: 0, officers: 45, color: 'bg-purple-500' },
      { name: 'Southern Province', load: 38, incidents: 0, officers: 52, color: 'bg-indigo-500' },
      { name: 'Eastern Province', load: 52, incidents: 0, officers: 61, color: 'bg-cyan-500' },
      { name: 'Western Province', load: 41, incidents: 0, officers: 48, color: 'bg-teal-500' },
    ];
  }, [isDistrictAdmin, userDistrictId, userDistrictName, incidents, realDeployments]);

  // Use real deployments from DataContext (already filtered for district admins)
  const deployments = useMemo(() => {
    if (realDeployments && realDeployments.length > 0) {
      return realDeployments.map(d => ({
        name: d.title || d.name || d.unit_name || `Deployment #${d.id}`,
        location: d.location || d.area || d.address || 'Unknown',
        officers: Array.isArray(d.officers) ? d.officers.length : (d.officer_count || d.officers || 0),
        time: formatTimeAgo(d.created_at),
        status: d.status === 'Active' || d.status === 'active' ? 'Active' : 
                d.status === 'Completed' || d.status === 'completed' ? 'Completed' : 'Standby',
        statusColor: d.status === 'Active' || d.status === 'active' ? 'bg-green-500/20 text-green-400' : 
                     d.status === 'Completed' || d.status === 'completed' ? 'bg-gray-500/20 text-gray-400' : 
                     'bg-yellow-500/20 text-yellow-400'
      }));
    }
    // Fallback to default if no deployments
    return [
      { name: 'Unit Alpha', location: 'Kigali CBD', officers: 12, time: '3h 20m', status: 'Active', statusColor: 'bg-green-500/20 text-green-400' },
      { name: 'Unit Bravo', location: 'Nyabugogo', officers: 8, time: '2h 45m', status: 'Active', statusColor: 'bg-green-500/20 text-green-400' },
      { name: 'Unit Charlie', location: 'Remera', officers: 6, time: '1h 15m', status: 'Standby', statusColor: 'bg-yellow-500/20 text-yellow-400' },
    ];
  }, [realDeployments]);

  return (
    <div className="p-6 relative z-10">
      {/* Background Watermark */}
      <div className="absolute inset-0 pointer-events-none z-[-1] opacity-10 fixed">
        <img src="/rnp-logo.png" className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] object-contain" alt="" />
      </div>

      {/* District Admin Banner */}
      {isDistrictAdmin && (
        <div className="mb-6 bg-gradient-to-r from-blue-600/20 to-purple-600/20 border border-blue-500/30 rounded-2xl p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-500 rounded-lg">
              <Building2 className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-white">{userDistrictName} District Dashboard</h1>
              <p className="text-sm text-gray-400">Managing traffic operations for {userDistrictName} district only</p>
            </div>
          </div>
        </div>
      )}
      {/* Real-time Connection Indicator */}
      <div className="mb-4 flex items-center gap-2">
        <div className={`w-2 h-2 rounded-full ${wsConnected ? 'bg-green-500 animate-pulse' : 'bg-yellow-500'}`}></div>
        <span className="text-xs text-gray-400">
          {wsConnected ? 'Live updates active' : `${connectionStatus}...`}
        </span>
        {loading && <span className="text-xs text-blue-400 ml-2">Loading data...</span>}
      </div>

      {/* Emergency Alerts Section */}
      {activeEmergencies.length > 0 && (
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-6 h-6 text-red-500 animate-pulse" />
              <h2 className="text-xl font-bold text-white">Emergency Alerts</h2>
              <span className="bg-red-500 text-white text-xs px-2 py-0.5 rounded-full font-bold">
                {activeEmergencies.length} ACTIVE
              </span>
            </div>
            <button
              onClick={() => navigate('/emergency')}
              className="text-sm text-blue-400 hover:text-blue-300 font-medium"
            >
              View All Emergencies →
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {activeEmergencies.slice(0, 2).map((emergency) => (
              <div
                key={emergency.id}
                className="bg-red-500/5 backdrop-blur-md border border-red-500/20 rounded-2xl p-5 flex flex-col justify-between hover:bg-red-500/10 transition-all group"
              >
                <div>
                  <div className="flex justify-between items-start mb-3">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-red-500 rounded-lg shadow-lg shadow-red-500/20">
                        <Activity className="w-5 h-5 text-white" />
                      </div>
                      <div>
                        <h3 className="font-bold text-white text-lg">{emergency.emergency_type}</h3>
                        <div className="flex items-center gap-2">
                          <p className="text-xs text-red-400/70 flex items-center gap-1">
                            <MapPin className="w-3 h-3" /> {emergency.location_name}
                          </p>
                          {emergency.source === 'ai' ? (
                            <span className="bg-purple-500/20 text-purple-400 border border-purple-500/30 px-1.5 py-0.5 rounded text-[8px] font-bold uppercase tracking-wider">
                              AI
                            </span>
                          ) : (
                            <span className="bg-blue-500/20 text-blue-400 border border-blue-500/30 px-1.5 py-0.5 rounded text-[8px] font-bold uppercase tracking-wider">
                              Manual
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    <span className={`text-[10px] font-bold px-2 py-1 rounded uppercase tracking-wider ${emergency.severity === 'critical' ? 'bg-red-500 text-white' : 'bg-orange-500 text-white'
                      }`}>
                      {emergency.severity}
                    </span>
                  </div>
                  <p className="text-sm text-gray-300 line-clamp-2 mb-4">
                    {emergency.description}
                  </p>
                </div>

                <div className="flex items-center justify-between pt-4 border-t border-white/5">
                  <div className="flex items-center gap-4">
                    <button
                      onClick={() => navigate('/emergency')}
                      className="text-xs font-bold text-white bg-red-600 hover:bg-red-700 px-4 py-2 rounded-lg transition-colors"
                    >
                      Respond
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        downloadEmergencyReport(emergency.id);
                      }}
                      className="flex items-center gap-1 text-xs font-medium text-gray-400 hover:text-white transition-colors"
                    >
                      <Download className="w-3 h-3" /> Report
                    </button>
                  </div>
                  <span className="text-[10px] text-gray-500 font-mono">
                    {formatTimeAgo(emergency.created_at)}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {stats.map((stat) => (
          <div key={stat.id} className="bg-slate-800/50 backdrop-blur-md border border-white/5 p-6 rounded-2xl hover:bg-slate-800/70 transition-all group">
            <div className="flex justify-between items-start mb-4">
              <div className={`p-3 rounded-xl ${stat.color} bg-opacity-20`}>
                <stat.icon className={`w-6 h-6 ${stat.iconColor}`} />
              </div>
              <span className={`text-xs font-bold px-2 py-1 rounded-lg ${stat.trendColor}`}>
                {stat.trend}
              </span>
            </div>
            <h3 className="text-gray-400 text-xs font-bold tracking-wider uppercase mb-1">{stat.title}</h3>
            <div className="text-3xl font-bold text-white mb-1">{stat.value}</div>
            <p className="text-sm text-gray-500">{stat.subtitle}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-8">
        {/* Regional Overview */}
        <div className={`${isDistrictAdmin ? 'lg:col-span-1' : 'lg:col-span-2'} bg-slate-800/50 backdrop-blur-md border border-white/5 rounded-2xl p-6`}>
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-2">
              <MapPin className="w-5 h-5 text-blue-400" />
              <h2 className="text-lg font-bold text-white">
                {isDistrictAdmin ? `${userDistrictName} Overview` : 'Regional Overview'}
              </h2>
            </div>
            {!isDistrictAdmin && (
              <button className="text-sm text-blue-400 hover:text-blue-300 flex items-center gap-1">
                View All <ChevronRight className="w-4 h-4" />
              </button>
            )}
          </div>

          <div className={`grid ${isDistrictAdmin ? 'grid-cols-1' : 'grid-cols-1 md:grid-cols-2'} gap-6`}>
            {regions.map((region, idx) => (
              <div key={idx} className="bg-slate-900/50 rounded-xl p-4 border border-white/5">
                <div className="flex justify-between items-center mb-3">
                  <span className="font-bold text-white">{region.name}</span>
                  <span className="text-xs text-blue-300 font-mono">{region.load}% Load</span>
                </div>
                <div className="w-full bg-slate-700 rounded-full h-2 mb-4">
                  <div
                    className={`h-2 rounded-full ${region.color}`}
                    style={{ width: `${region.load}%` }}
                  ></div>
                </div>
                <div className="flex justify-between text-xs text-gray-400">
                  <span>{region.incidents} Incidents</span>
                  <span>{region.officers} Officers</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Active Deployments */}
        <div className={`${isDistrictAdmin ? 'lg:col-span-2' : ''} bg-slate-800/50 backdrop-blur-md border border-white/5 rounded-2xl p-6`}>
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-2">
              <Shield className="w-5 h-5 text-green-400" />
              <h2 className="text-lg font-bold text-white">
                {isDistrictAdmin ? `${userDistrictName} Deployments` : 'Active Deployments'}
              </h2>
            </div>
          </div>

          <div className="max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
            <div className={`${isDistrictAdmin ? 'grid grid-cols-1 md:grid-cols-2 gap-4' : 'space-y-4'}`}>
              {deployments.length > 0 ? deployments.map((dept, idx) => (
                <div key={idx} className="bg-slate-900/50 p-4 rounded-xl border border-white/5">
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <h3 className="font-bold text-white">{dept.name}</h3>
                      <p className="text-xs text-gray-400">{dept.location}</p>
                    </div>
                    <span className={`text-xs px-2 py-1 rounded-lg font-medium ${dept.statusColor}`}>
                      {dept.status}
                    </span>
                  </div>
                  <div className="flex justify-between items-center text-xs text-gray-500 mt-3 pt-3 border-t border-white/5">
                    <span>{dept.officers} officers</span>
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3" /> {dept.time}
                    </span>
                  </div>
                </div>
              )) : (
                <div className="text-center text-gray-500 py-8">
                  <Shield className="w-12 h-12 mx-auto mb-2 opacity-50" />
                  <p>No active deployments {isDistrictAdmin ? `in ${userDistrictName}` : ''}</p>
                </div>
              )}
            </div>
          </div>

          <button
            onClick={() => navigate('/deployments')}
            className="w-full mt-6 bg-blue-600 hover:bg-blue-700 text-white py-3 rounded-xl font-medium transition-colors"
          >
            Manage Deployments
          </button>
        </div>
      </div>

      {/* Recent Reports & System Status */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 bg-slate-800/50 backdrop-blur-md border border-white/5 rounded-2xl p-6">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-2">
              <Activity className="w-5 h-5 text-blue-400" />
              <h2 className="text-lg font-bold text-white">Recent Reports</h2>
              <span className={`w-2 h-2 rounded-full ${wsConnected ? 'bg-green-500 animate-pulse' : 'bg-gray-500'}`}></span>
            </div>
            <div className="flex gap-4">
              <button
                onClick={() => navigate('/incidents')}
                className="text-sm text-blue-400 hover:text-blue-300"
              >
                Incidents →
              </button>
              <button
                onClick={() => navigate('/emergency')}
                className="text-sm text-orange-400 hover:text-orange-300"
              >
                Emergencies →
              </button>
            </div>
          </div>

          {loading ? (
            <div className="text-center py-8 text-gray-400">Loading reports...</div>
          ) : recentReports.length === 0 ? (
            <div className="text-center py-8 text-gray-400">
              <AlertTriangle className="w-12 h-12 mx-auto mb-2 opacity-30" />
              <p>No reports found</p>
            </div>
          ) : (
            <div className="max-h-[450px] overflow-y-auto pr-2 custom-scrollbar">
              <div className="space-y-4">
                {recentReports.map((report, idx) => (
                  <div key={`${report.reportType}-${report.id || idx}`} className="bg-slate-900/50 p-4 rounded-xl border border-white/5 flex items-center justify-between group hover:bg-slate-800 transition-colors">
                    <div className="flex items-center gap-4">
                      <div className={`w-1 h-12 rounded-full ${report.color}`}></div>
                      <div>
                        <h3 className="font-bold text-white flex items-center gap-2">
                          {report.type}
                          {report.reportType === 'emergency' && (
                            <span className="text-[10px] bg-red-600 text-white px-2 py-0.5 rounded font-bold">EMERGENCY</span>
                          )}
                          {report.source === 'ai' && (
                            <span className="text-xs bg-purple-500/20 text-purple-300 px-2 py-0.5 rounded">🤖 AI</span>
                          )}
                          {report.source === 'mobile_app' && (
                            <span className="text-xs bg-blue-500/20 text-blue-300 px-2 py-0.5 rounded">📱 Mobile</span>
                          )}
                        </h3>
                        <p className="text-xs text-gray-400 flex items-center gap-1">
                          <MapPin className="w-3 h-3" /> {report.location}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-gray-500 mb-1">{report.time}</p>
                      <span className={`text-xs px-2 py-1 rounded-lg ${report.status === 'resolved' ? 'bg-green-500/20 text-green-400' :
                        report.status === 'in_progress' || report.status === 'active' ? 'bg-blue-500/20 text-blue-400' :
                          'bg-red-500/20 text-red-400'
                        }`}>
                        {report.status.replace('_', ' ')}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="bg-gradient-to-br from-blue-600 to-purple-600 rounded-2xl p-6 text-white relative overflow-hidden">
          <div className="relative z-10">
            <h2 className="text-lg font-bold mb-6">System Status</h2>
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-blue-100">WebSocket</span>
                <span className="font-bold">{wsConnected ? 'Connected' : 'Disconnected'}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-blue-100">Database</span>
                <span className="font-bold">Healthy</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-blue-100">Total Incidents</span>
                <span className="font-bold">{realTimeStats.totalIncidents}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-blue-100">Emergencies</span>
                <span className="font-bold">{emergencies.length}</span>
              </div>
            </div>
          </div>
          {/* Decorative wave */}
          <div className="absolute bottom-0 left-0 right-0 h-32 opacity-30">
            <Activity className="w-full h-full text-white" />
          </div>
        </div>
      </div>
    </div>
  );
};

// Helper function to format time ago
const formatTimeAgo = (timestamp) => {
  if (!timestamp) return 'Just now';
  try {
    const date = new Date(timestamp);
    const now = new Date();
    const diff = Math.floor((now - date) / 1000);

    if (diff < 60) return 'Just now';
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    return `${Math.floor(diff / 86400)}d ago`;
  } catch {
    return 'Recently';
  }
};

export default DashboardPage;
