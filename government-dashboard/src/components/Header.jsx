import React, { useState, useEffect, useRef } from 'react';
import { Menu, Bell, Search, Clock, ChevronDown, User, LogOut, X, Wifi, WifiOff, Loader2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useData } from '../context/DataContext';
import { useWebSocket } from '../context/WebSocketContext';
import { useNavigate } from 'react-router-dom';
import axios from '../config/axios';
import toast from 'react-hot-toast';

const Header = ({ onMenuClick }) => {
  const { user, logout } = useAuth();
  const { notifications, unreadCount, markNotificationRead } = useData();
  const { isConnected, connectionStatus } = useWebSocket();
  const navigate = useNavigate();
  const [currentTime, setCurrentTime] = useState(new Date());

  // Notification State
  const [showNotifications, setShowNotifications] = useState(false);

  // Profile Dropdown State
  const [showProfileMenu, setShowProfileMenu] = useState(false);

  // Search State
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [showSearchResults, setShowSearchResults] = useState(false);
  const searchRef = useRef(null);

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);

    // Click outside handler
    const handleClickOutside = (event) => {
      if (searchRef.current && !searchRef.current.contains(event.target)) {
        setShowSearchResults(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      clearInterval(timer);
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const handleMarkAsRead = async (id) => {
    await markNotificationRead(id);
  };

  // Search Functionality
  const handleSearch = async (query) => {
    setSearchQuery(query);
    if (query.length < 2) {
      setSearchResults([]);
      setShowSearchResults(false);
      return;
    }

    const INCIDENT_TYPES = ['Accident', 'Congestion', 'Roadwork', 'Hazard', 'Emergency', 'Fire', 'Medical'];
    let results = [];

    // 1. Add matching incident types
    const matchingTypes = INCIDENT_TYPES.filter(type =>
      type.toLowerCase().includes(query.toLowerCase())
    ).map(type => ({
      id: `type-${type}`,
      type: type,
      location: 'Search by Category',
      severity: 'info',
      isCategory: true
    }));
    results = [...matchingTypes];

    try {
      // 2. Add matching actual incidents
      const response = await axios.get('/incidents');
      const incidents = response.data.data?.incidents || [];

      const filteredIncidents = incidents.filter(incident =>
        incident.type?.toLowerCase().includes(query.toLowerCase()) ||
        incident.location?.toLowerCase().includes(query.toLowerCase()) ||
        incident.description?.toLowerCase().includes(query.toLowerCase())
      ).slice(0, 5);

      results = [...results, ...filteredIncidents];

      setSearchResults(results);
      setShowSearchResults(true);
    } catch (error) {
      console.error('Error searching:', error);
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
    toast.success('Logged out successfully');
  };

  const formatTime = (date) => {
    return date.toLocaleTimeString('en-US', { hour12: false });
  };

  return (
    <header className="bg-gray-800 border-b border-gray-700 h-20 relative z-40 shadow-md">
      <div className="flex items-center justify-between h-full px-6">
        <div className="flex items-center gap-4">
          <button
            onClick={onMenuClick}
            className="p-2 rounded-lg text-gray-400 hover:text-white hover:bg-white/10 lg:hidden"
          >
            <Menu className="w-6 h-6" />
          </button>

          <div className="hidden md:block">
            <h2 className="text-lg font-bold text-white leading-tight">
              RNP Traffic Command
            </h2>
            <p className="text-xs text-cyan-400">
              National Traffic Management & Incident Control
            </p>
          </div>
        </div>

        <div className="flex items-center gap-4 flex-1 justify-end md:justify-center max-w-4xl mx-auto px-4">
          {/* Connection Status Indicator */}
          <div className={`hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-full border transition-all ${
            connectionStatus === 'connected' 
              ? 'bg-cyan-500/10 border-cyan-500/30 text-cyan-400' 
              : connectionStatus === 'connecting' 
                ? 'bg-cyan-500/10 border-cyan-500/30 text-cyan-300 animate-pulse' 
                : 'bg-red-500/10 border-red-500/30 text-red-400'
          }`} title={`Real-time: ${connectionStatus}`}>
            {connectionStatus === 'connected' ? (
              <Wifi className="w-3.5 h-3.5" />
            ) : connectionStatus === 'connecting' ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <WifiOff className="w-3.5 h-3.5" />
            )}
            <span className="text-[10px] font-bold uppercase tracking-wider">
              {connectionStatus === 'connected' ? 'Live' : connectionStatus === 'connecting' ? 'Connecting' : 'Offline'}
            </span>
          </div>

          {/* Clock */}
          <div className="hidden md:flex items-center gap-2 bg-gray-800 px-4 py-2 rounded-full border border-gray-700">
            <Clock className="w-4 h-4 text-cyan-400" />
            <span className="text-sm font-mono font-bold text-white tracking-wider">
              {formatTime(currentTime)}
            </span>
          </div>

          {/* Search */}
          <div className="hidden md:block relative w-96" ref={searchRef}>
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search className="h-4 w-4 text-gray-400" />
            </div>
            <input
              type="text"
              placeholder="Search incidents..."
              className="block w-full pl-10 pr-3 py-2 bg-gray-800 border border-gray-700 rounded-full text-sm text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-cyan-500/50 focus:border-transparent transition-all"
              value={searchQuery}
              onChange={(e) => handleSearch(e.target.value)}
              onFocus={() => searchQuery.length >= 2 && setShowSearchResults(true)}
            />

            {/* Search Results Dropdown */}
            {showSearchResults && searchResults.length > 0 && (
              <div className="absolute top-full left-0 right-0 mt-2 bg-gray-800 border border-gray-700 rounded-xl shadow-xl overflow-hidden z-50">
                {searchResults.map((result) => (
                  <button
                    key={result.id}
                    className="w-full text-left px-4 py-3 hover:bg-gray-700/50 border-b border-gray-700/50 last:border-0 transition-colors"
                    onClick={() => {
                      // If it's a category, maybe filter by that category? For now just go to incidents
                      navigate('/incidents');
                      setShowSearchResults(false);
                      setSearchQuery('');
                    }}
                  >
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="text-sm font-medium text-white">{result.type}</p>
                        <p className="text-xs text-gray-400 truncate w-64">{result.location}</p>
                      </div>
                      <span className={`text-[10px] px-1.5 py-0.5 rounded border ${result.isCategory ? 'border-cyan-500 text-cyan-400' :
                        result.severity === 'critical' ? 'border-red-500 text-red-400' :
                          result.severity === 'high' ? 'border-cyan-600 text-cyan-400' :
                            'border-cyan-500 text-cyan-400'
                        }`}>
                        {result.isCategory ? 'CATEGORY' : result.severity}
                      </span>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="flex items-center gap-4">
          {/* Notifications */}
          <div className="relative">
            <button
              className="relative p-2 rounded-lg text-gray-400 hover:text-white hover:bg-white/10 transition-colors"
              onClick={() => setShowNotifications(!showNotifications)}
            >
              <Bell className="w-5 h-5" />
              {unreadCount > 0 && (
                <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full ring-2 ring-slate-900"></span>
              )}
            </button>

            {/* Notifications Dropdown */}
            {showNotifications && (
              <div className="absolute right-0 mt-2 w-80 bg-slate-800 border border-slate-700 rounded-xl shadow-xl overflow-hidden z-50">
                <div className="p-3 border-b border-slate-700 flex justify-between items-center">
                  <h3 className="font-semibold text-white">Notifications</h3>
                  <button
                    onClick={() => setShowNotifications(false)}
                    className="text-gray-400 hover:text-white"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
                <div className="max-h-96 overflow-y-auto">
                  {notifications.length > 0 ? (
                    notifications.map((notification) => (
                      <div
                        key={notification.id}
                        className={`p-3 border-b border-slate-700/50 hover:bg-slate-700/30 transition-colors cursor-pointer ${!notification.is_read ? 'bg-cyan-500/5' : ''}`}
                        onClick={() => handleMarkAsRead(notification.id)}
                      >
                        <div className="flex gap-3">
                          <div className="mt-1">
                            <div className={`w-2 h-2 rounded-full ${!notification.is_read ? 'bg-cyan-400' : 'bg-slate-600'}`}></div>
                          </div>
                          <div>
                            <p className="text-sm text-gray-200">{notification.message}</p>
                            <p className="text-xs text-gray-500 mt-1">
                              {new Date(notification.created_at).toLocaleTimeString()}
                            </p>
                          </div>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="p-8 text-center text-gray-500">
                      No notifications
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* User Menu */}
          <div className="relative">
            <button
              className="flex items-center gap-3 pl-4 border-l border-white/10 hover:opacity-80 transition-opacity"
              onClick={() => setShowProfileMenu(!showProfileMenu)}
            >
              <div className="w-9 h-9 rounded-lg flex items-center justify-center text-white font-bold text-sm overflow-hidden">
                {user?.profile_picture ? (
                  <img 
                    src={`http://localhost:3000${user.profile_picture}`} 
                    alt="Profile" 
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full bg-cyan-600 flex items-center justify-center">
                    {user?.full_name?.charAt(0)?.toUpperCase() || user?.fullName?.charAt(0)?.toUpperCase() || 'U'}
                  </div>
                )}
              </div>
              <div className="hidden md:block text-left">
                <p className="text-sm font-medium text-white leading-none mb-1">
                  {user?.role === 'admin' ? 'Admin' : user?.role === 'district_admin' ? user?.districtName || 'District Admin' : user?.fullName || user?.full_name}
                </p>
                <div className="flex items-center gap-1 text-xs text-gray-400">
                  <span className="capitalize">{user?.role === 'district_admin' ? 'District Admin' : user?.role}</span>
                  <ChevronDown className="w-3 h-3" />
                </div>
              </div>
            </button>

            {/* Profile Dropdown */}
            {showProfileMenu && (
              <div className="absolute right-0 mt-2 w-48 bg-slate-800 border border-slate-700 rounded-xl shadow-xl overflow-hidden z-50">
                <div className="p-2">
                  <button
                    onClick={() => { navigate('/profile'); setShowProfileMenu(false); }}
                    className="w-full text-left px-3 py-2 text-sm text-gray-300 hover:bg-slate-700 rounded-lg flex items-center gap-2 transition-colors"
                  >
                    {user?.profile_picture ? (
                      <img 
                        src={`http://localhost:3000${user.profile_picture}`} 
                        alt="Profile" 
                        className="w-5 h-5 rounded-full object-cover"
                      />
                    ) : (
                      <User className="w-4 h-4" />
                    )}
                    Profile
                  </button>
                  <div className="h-px bg-slate-700 my-1"></div>
                  <button
                    onClick={handleLogout}
                    className="w-full text-left px-3 py-2 text-sm text-red-400 hover:bg-red-500/10 rounded-lg flex items-center gap-2 transition-colors"
                  >
                    <LogOut className="w-4 h-4" />
                    Logout
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;