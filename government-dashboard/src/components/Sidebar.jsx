import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  AlertTriangle,
  FileText,
  Users,
  BarChart3,
  Settings,
  Home,
  Shield,
  MapPin,
  UserCog
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const Sidebar = ({ isOpen }) => {
  const location = useLocation();
  const { user } = useAuth();
  
  // Check if district admin
  const isDistrictAdmin = user?.role === 'district_admin';

  const menuItems = [
    { path: '/', icon: Home, label: 'Home', roles: ['public', 'police', 'admin', 'district_admin'] },
    { path: '/dashboard', icon: LayoutDashboard, label: 'Dashboard', roles: ['police', 'admin', 'district_admin'] },
    { path: '/incidents', icon: AlertTriangle, label: 'Incidents', roles: ['police', 'admin', 'district_admin'] },
    { path: '/reports', icon: FileText, label: 'Reports', roles: ['police', 'admin', 'district_admin'] },
    { path: '/emergency', icon: Users, label: 'Emergency', roles: ['police', 'admin', 'district_admin'] },
    { path: '/deployments', icon: Shield, label: 'Deployments', roles: ['police', 'admin', 'district_admin'] },
    { path: '/geofencing', icon: MapPin, label: 'Geo-Fencing', roles: ['admin', 'district_admin'], badge: 'NEW' },
    { path: '/officers', icon: UserCog, label: 'Officers', roles: ['admin', 'district_admin'] },
    { path: '/analytics', icon: BarChart3, label: 'Analytics', roles: ['admin', 'district_admin'] },
    { path: '/settings', icon: Settings, label: 'Settings', roles: ['admin', 'district_admin'] },
  ];

  const filteredMenuItems = menuItems.filter(item =>
    item.roles.includes(user?.role || 'public')
  );

  return (
    <div className={`fixed inset-y-0 left-0 z-50 w-56 bg-gradient-to-b from-slate-900 via-blue-950 to-slate-900 transform ${isOpen ? 'translate-x-0' : '-translate-x-full'} transition-transform duration-300 ease-in-out lg:translate-x-0 lg:static lg:inset-0 border-r border-blue-900/30`}>
      {/* Logo Section */}
      <div className="flex items-center gap-3 px-4 py-5 border-b border-blue-900/30">
        <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center overflow-hidden">
          <img
            src="/assets/rnp-logo.png"
            alt="RNP"
            className="w-full h-full object-cover"
            onError={(e) => {
              e.target.style.display = 'none';
              e.target.nextSibling.style.display = 'block';
            }}
          />
          <span className="text-slate-900 font-bold text-sm hidden">RNP</span>
        </div>
        <div>
          <h1 className="text-white text-sm font-bold leading-tight">Rwanda National</h1>
          <h1 className="text-white text-sm font-bold leading-tight">Police</h1>
          <p className="text-blue-400 text-xs">
            {isDistrictAdmin ? `${user?.districtName?.toUpperCase() || 'DISTRICT'} ADMIN` : 'TRAFFIC ADMIN'}
          </p>
        </div>
      </div>

      {/* Navigation */}
      <nav className="mt-6 px-3">
        <div className="space-y-1">
          {filteredMenuItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.path;

            return (
              <Link
                key={item.path}
                to={item.path}
                className={`flex items-center gap-3 px-4 py-3 text-sm font-medium rounded-xl transition-all duration-200 ${isActive
                  ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/30'
                  : 'text-gray-400 hover:bg-slate-800/50 hover:text-white'
                  }`}
              >
                <Icon className="w-5 h-5" />
                <span className="flex-1">{item.label}</span>
                {item.badge && (
                  <span className="px-2 py-0.5 text-xs font-bold bg-green-500 text-white rounded-full animate-pulse">
                    {item.badge}
                  </span>
                )}
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
};

export default Sidebar;