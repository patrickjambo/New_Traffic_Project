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
    <div className={`fixed inset-y-0 left-0 z-50 w-64 bg-gray-900 transform ${isOpen ? 'translate-x-0' : '-translate-x-full'} transition-transform duration-300 ease-in-out lg:translate-x-0 lg:static lg:inset-0`}>
      <div className="flex items-center justify-center h-16 px-4 bg-gray-800">
        <h1 className="text-white text-xl font-bold">TrafficGuard</h1>
      </div>

      <nav className="mt-8">
        <div className="px-4 space-y-2">
          {filteredMenuItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.path;

            return (
              <Link
                key={item.path}
                to={item.path}
                className={`flex items-center px-4 py-3 text-sm font-medium rounded-lg transition-colors duration-200 ${
                  isActive
                    ? 'bg-blue-600 text-white'
                    : 'text-gray-300 hover:bg-gray-700 hover:text-white'
                }`}
              >
                <Icon className="w-5 h-5 mr-3" />
                {item.label}
              </Link>
            );
          })}
        </div>
      </nav>

      <div className="absolute bottom-0 left-0 right-0 p-4">
        <div className="bg-gray-800 rounded-lg p-4">
          <div className="flex items-center">
            <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center">
              <span className="text-white text-sm font-bold">
                {user?.full_name?.charAt(0)?.toUpperCase() || 'U'}
              </span>
            </div>
            <div className="ml-3 flex-1">
              <p className="text-white text-sm font-medium">{user?.full_name}</p>
              <p className="text-gray-400 text-xs capitalize">{user?.role}</p>
            </div>
          </div>
          <button
            onClick={logout}
            className="flex items-center w-full mt-3 px-3 py-2 text-sm text-gray-300 hover:bg-gray-700 hover:text-white rounded-lg transition-colors duration-200"
          >
            <LogOut className="w-4 h-4 mr-2" />
            Logout
          </button>
        </div>
      </div>
    </div>
  );
};

export default Sidebar;