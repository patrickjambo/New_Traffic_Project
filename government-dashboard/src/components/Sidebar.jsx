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
  LogOut
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const Sidebar = ({ isOpen }) => {
  const location = useLocation();
  const { logout, user } = useAuth();

  const menuItems = [
    { path: '/', icon: Home, label: 'Home', roles: ['public', 'police', 'admin'] },
    { path: '/dashboard', icon: LayoutDashboard, label: 'Dashboard', roles: ['police', 'admin'] },
    { path: '/incidents', icon: AlertTriangle, label: 'Incidents', roles: ['police', 'admin'] },
    { path: '/reports', icon: FileText, label: 'Reports', roles: ['police', 'admin'] },
    { path: '/emergency', icon: Users, label: 'Emergency', roles: ['police', 'admin'] },
    { path: '/analytics', icon: BarChart3, label: 'Analytics', roles: ['admin'] },
    { path: '/settings', icon: Settings, label: 'Settings', roles: ['admin'] },
  ];

  const filteredMenuItems = menuItems.filter(item =>
    item.roles.includes(user?.role || 'public')
  );

  return (
    <div className={`fixed inset-y-0 left-0 z-50 w-56 bg-gradient-to-b from-slate-900 via-blue-950 to-slate-900 transform ${isOpen ? 'translate-x-0' : '-translate-x-full'} transition-transform duration-300 ease-in-out lg:translate-x-0 lg:static lg:inset-0 border-r border-blue-900/30`}>
      {/* Logo Section */}
      <div className="flex items-center gap-3 px-4 py-5 border-b border-blue-900/30">
        <div className="w-10 h-10 bg-gradient-to-br from-yellow-400 to-yellow-600 rounded-full flex items-center justify-center">
          <img
            src="/rnp-logo.png"
            alt="RNP"
            className="w-8 h-8 object-contain"
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
          <p className="text-blue-400 text-xs">TRAFFIC ADMIN</p>
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
                {item.label}
              </Link>
            );
          })}
        </div>
      </nav>

      {/* User Section */}
      <div className="absolute bottom-0 left-0 right-0 p-4">
        <div className="bg-slate-800/50 rounded-xl p-3 border border-slate-700/50">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
              <span className="text-white text-sm font-bold">
                {user?.full_name?.charAt(0)?.toUpperCase() || 'U'}
              </span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-white text-sm font-medium truncate">{user?.role === 'admin' ? 'Admin' : user?.full_name}</p>
              <p className="text-gray-500 text-xs capitalize">{user?.role}</p>
            </div>
          </div>
          <button
            onClick={logout}
            className="flex items-center gap-2 w-full mt-3 px-3 py-2 text-sm text-gray-400 hover:bg-slate-700/50 hover:text-white rounded-lg transition-colors duration-200"
          >
            <LogOut className="w-4 h-4" />
            Logout
          </button>
        </div>
      </div>
    </div>
  );
};

export default Sidebar;