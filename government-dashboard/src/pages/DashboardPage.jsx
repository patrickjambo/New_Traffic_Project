import React from 'react';
import { useAuth } from '../context/AuthContext';
import {
  AlertTriangle,
  Clock,
  Shield,
  Activity,
  MapPin,
  ChevronRight
} from 'lucide-react';

const DashboardPage = () => {
  const { user } = useAuth();

  // Stats Data matching the screenshot
  const stats = [
    {
      id: 1,
      title: 'ACTIVE INCIDENTS',
      value: '3',
      subtitle: '2 Critical',
      icon: AlertTriangle,
      color: 'bg-red-500',
      iconColor: 'text-white',
      trend: '+15%',
      trendColor: 'bg-red-500/20 text-red-300'
    },
    {
      id: 2,
      title: 'AVG RESPONSE TIME',
      value: '3.8m',
      subtitle: '↓ 18% vs last week',
      icon: Clock,
      color: 'bg-blue-500',
      iconColor: 'text-white',
      trend: '-18%',
      trendColor: 'bg-green-500/20 text-green-300'
    },
    {
      id: 3,
      title: 'RESOLVED TODAY',
      value: '47',
      subtitle: '94% Clearance Rate',
      icon: Shield,
      color: 'bg-green-500',
      iconColor: 'text-white',
      trend: '+8%',
      trendColor: 'bg-green-500/20 text-green-300'
    },
    {
      id: 4,
      title: 'SYSTEM HEALTH',
      value: '99%',
      subtitle: 'All Systems Operational',
      icon: Activity,
      color: 'bg-purple-500',
      iconColor: 'text-white',
      trend: '+2%',
      trendColor: 'bg-green-500/20 text-green-300'
    }
  ];

  const regions = [
    { name: 'Kigali City', load: 67, incidents: 234, officers: 89, color: 'bg-blue-500' },
    { name: 'Northern Province', load: 45, incidents: 123, officers: 45, color: 'bg-purple-500' },
    { name: 'Southern Province', load: 38, incidents: 98, officers: 52, color: 'bg-indigo-500' },
    { name: 'Eastern Province', load: 52, incidents: 156, officers: 61, color: 'bg-cyan-500' },
    { name: 'Western Province', load: 41, incidents: 112, officers: 48, color: 'bg-teal-500' },
  ];

  const deployments = [
    { name: 'Unit Alpha', location: 'Kigali CBD', officers: 12, time: '3h 20m', status: 'Active', statusColor: 'bg-green-500/20 text-green-400' },
    { name: 'Unit Bravo', location: 'Nyabugogo', officers: 8, time: '2h 45m', status: 'Active', statusColor: 'bg-green-500/20 text-green-400' },
    { name: 'Unit Charlie', location: 'Remera', officers: 6, time: '1h 15m', status: 'Standby', statusColor: 'bg-yellow-500/20 text-yellow-400' },
  ];

  const recentIncidents = [
    { type: 'Accident', location: 'KN 5 Ave, Kigali', time: '12m ago', status: 'Active', color: 'bg-red-500' },
    { type: 'Traffic Jam', location: 'Nyabugogo', time: '25m ago', status: 'Active', color: 'bg-orange-500' },
  ];

  return (
    <div className="p-6 relative z-10">
      {/* Background Watermark */}
      <div className="absolute inset-0 pointer-events-none z-[-1] opacity-10 fixed">
        <img src="/rnp-logo.png" className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] object-contain" alt="" />
      </div>

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
        <div className="lg:col-span-2 bg-slate-800/50 backdrop-blur-md border border-white/5 rounded-2xl p-6">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-2">
              <MapPin className="w-5 h-5 text-blue-400" />
              <h2 className="text-lg font-bold text-white">Regional Overview</h2>
            </div>
            <button className="text-sm text-blue-400 hover:text-blue-300 flex items-center gap-1">
              View All <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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
        <div className="bg-slate-800/50 backdrop-blur-md border border-white/5 rounded-2xl p-6">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-2">
              <Shield className="w-5 h-5 text-green-400" />
              <h2 className="text-lg font-bold text-white">Active Deployments</h2>
            </div>
          </div>

          <div className="space-y-4">
            {deployments.map((dept, idx) => (
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
            ))}
          </div>

          <button className="w-full mt-6 bg-blue-600 hover:bg-blue-700 text-white py-3 rounded-xl font-medium transition-colors">
            Manage Deployments
          </button>
        </div>
      </div>

      {/* Recent Incidents & System Status */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 bg-slate-800/50 backdrop-blur-md border border-white/5 rounded-2xl p-6">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-orange-400" />
              <h2 className="text-lg font-bold text-white">Recent Incidents</h2>
            </div>
            <button className="text-sm text-blue-400 hover:text-blue-300">Live Feed →</button>
          </div>

          <div className="space-y-4">
            {recentIncidents.map((inc, idx) => (
              <div key={idx} className="bg-slate-900/50 p-4 rounded-xl border border-white/5 flex items-center justify-between group hover:bg-slate-800 transition-colors">
                <div className="flex items-center gap-4">
                  <div className={`w-1 h-12 rounded-full ${inc.color}`}></div>
                  <div>
                    <h3 className="font-bold text-white">{inc.type}</h3>
                    <p className="text-xs text-gray-400 flex items-center gap-1">
                      <MapPin className="w-3 h-3" /> {inc.location}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-xs text-gray-500 mb-1">{inc.time}</p>
                  <span className="text-xs bg-red-500/20 text-red-400 px-2 py-1 rounded-lg">
                    {inc.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-gradient-to-br from-blue-600 to-purple-600 rounded-2xl p-6 text-white relative overflow-hidden">
          <div className="relative z-10">
            <h2 className="text-lg font-bold mb-6">System Status</h2>
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-blue-100">AI Processor</span>
                <span className="font-bold">Online</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-blue-100">Database</span>
                <span className="font-bold">Healthy</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-blue-100">Network Latency</span>
                <span className="font-bold">24ms</span>
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

export default DashboardPage;
