import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { MapPin, Navigation, AlertTriangle, Clock, Search, Menu, X, Activity, Camera, Users } from 'lucide-react';
import { useData } from '../context/DataContext';
import { useAuth } from '../context/AuthContext';
import { searchKigaliLocation } from '../data/kigaliLocations';
import ReportIncidentForm from '../components/ReportIncidentForm';
import EmergencyReportPopup from '../components/EmergencyReportPopup';

// Simple components without heavy dependencies
const SimpleIncidentMap = ({ incidents }) => {
  const [selectedIncident, setSelectedIncident] = useState(null);

  return (
    <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg h-96 p-6">
      <div className="bg-white rounded-lg shadow-lg p-4 h-full overflow-auto">
        <h4 className="font-bold text-gray-800 mb-4 flex items-center justify-between">
          <span className="flex items-center">
            <MapPin className="w-5 h-5 mr-2 text-blue-600" />
            Kigali Incident Locations
          </span>
          <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">
            {incidents?.length || 0} Active
          </span>
        </h4>
        {incidents && incidents.length > 0 ? (
          <div className="space-y-2">
            {incidents.map((incident, idx) => (
              <div
                key={incident.id || idx}
                onClick={() => setSelectedIncident(incident)}
                className={`p-3 rounded border-l-4 cursor-pointer transition-all hover:shadow-md ${selectedIncident?.id === incident.id ? 'bg-blue-100 border-blue-600' :
                  incident.severity === 'critical' ? 'bg-red-50 border-red-500' :
                    incident.severity === 'high' ? 'bg-orange-50 border-orange-500' :
                      'bg-blue-50 border-blue-500'
                  }`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <p className="font-semibold text-sm text-gray-800 flex items-center">
                      {incident.incident_type}
                      {incident.source === 'mobile_app' && (
                        <span className="ml-2 text-xs bg-purple-100 text-purple-800 px-2 py-0.5 rounded">📱 Auto</span>
                      )}
                    </p>
                    <p className="text-xs text-gray-600 mt-1 flex items-center">
                      📍 {incident.location || 'Kigali'}
                    </p>
                    {incident.description && (
                      <p className="text-xs text-gray-500 mt-1 line-clamp-2">{incident.description}</p>
                    )}
                    <div className="flex items-center gap-2 mt-2">
                      <span className="text-xs text-gray-400">
                        {incident.latitude?.toFixed(4)}, {incident.longitude?.toFixed(4)}
                      </span>
                    </div>
                  </div>
                  <div className="flex flex-col gap-1 items-end ml-2">
                    <span className={`text-xs px-2 py-1 rounded font-medium ${incident.severity === 'critical' ? 'bg-red-100 text-red-800' :
                      incident.severity === 'high' ? 'bg-orange-100 text-orange-800' :
                        incident.severity === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                          'bg-blue-100 text-blue-800'
                      }`}>
                      {incident.severity || 'Low'}
                    </span>
                    <span className={`text-xs px-2 py-1 rounded ${incident.status === 'resolved' ? 'bg-green-100 text-green-800' :
                      incident.status === 'in_progress' ? 'bg-blue-100 text-blue-800' :
                        'bg-gray-100 text-gray-800'
                      }`}>
                      {incident.status?.replace('_', ' ') || 'Pending'}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <MapPin className="w-12 h-12 mx-auto mb-2 text-gray-400" />
              <p className="text-gray-500">No incidents to display</p>
              <p className="text-xs text-gray-400 mt-1">Check back later for updates</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

const SimpleRoutePlanner = () => {
  const [start, setStart] = useState('');
  const [destination, setDestination] = useState('');
  const [startSuggestions, setStartSuggestions] = useState([]);
  const [destSuggestions, setDestSuggestions] = useState([]);
  const [showStartSuggestions, setShowStartSuggestions] = useState(false);
  const [showDestSuggestions, setShowDestSuggestions] = useState(false);

  const handleStartChange = (value) => {
    setStart(value);
    console.log('🔍 Searching for:', value);
    if (value.length > 0) {
      const suggestions = searchKigaliLocation(value);
      console.log('📍 Found suggestions:', suggestions);
      setStartSuggestions(suggestions.slice(0, 5));
      setShowStartSuggestions(true);
    } else {
      setShowStartSuggestions(false);
    }
  };

  const handleDestChange = (value) => {
    setDestination(value);
    console.log('🔍 Searching destination:', value);
    if (value.length > 0) {
      const suggestions = searchKigaliLocation(value);
      console.log('📍 Destination suggestions:', suggestions);
      setDestSuggestions(suggestions.slice(0, 5));
      setShowDestSuggestions(true);
    } else {
      setShowDestSuggestions(false);
    }
  };

  const selectStart = (location) => {
    setStart(location.name);
    setShowStartSuggestions(false);
  };

  const selectDest = (location) => {
    setDestination(location.name);
    setShowDestSuggestions(false);
  };

  return (
    <div className="bg-white rounded-lg p-6">
      <h3 className="text-xl font-bold mb-4 flex items-center">
        <Navigation className="w-6 h-6 mr-2 text-blue-600" />
        Plan Your Route
      </h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="relative">
          <label className="block text-sm font-medium text-gray-700 mb-2">Starting Point</label>
          <input
            type="text"
            value={start}
            onChange={(e) => handleStartChange(e.target.value)}
            onFocus={() => start && setShowStartSuggestions(true)}
            placeholder="e.g., Kimihurura, Airport, Remera..."
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
          {showStartSuggestions && startSuggestions.length > 0 && (
            <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-60 overflow-y-auto">
              {startSuggestions.map((loc, idx) => (
                <div
                  key={idx}
                  onClick={() => selectStart(loc)}
                  className="px-4 py-2 hover:bg-blue-50 cursor-pointer border-b border-gray-100 last:border-b-0"
                >
                  <p className="font-medium text-sm">{loc.name}</p>
                  <p className="text-xs text-gray-500">{loc.type} - {loc.district || 'Kigali'}</p>
                </div>
              ))}
            </div>
          )}
        </div>
        <div className="relative">
          <label className="block text-sm font-medium text-gray-700 mb-2">Destination</label>
          <input
            type="text"
            value={destination}
            onChange={(e) => handleDestChange(e.target.value)}
            onFocus={() => destination && setShowDestSuggestions(true)}
            placeholder="e.g., City Center, Nyabugogo, Gikondo..."
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
          {showDestSuggestions && destSuggestions.length > 0 && (
            <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-60 overflow-y-auto">
              {destSuggestions.map((loc, idx) => (
                <div
                  key={idx}
                  onClick={() => selectDest(loc)}
                  className="px-4 py-2 hover:bg-blue-50 cursor-pointer border-b border-gray-100 last:border-b-0"
                >
                  <p className="font-medium text-sm">{loc.name}</p>
                  <p className="text-xs text-gray-500">{loc.type} - {loc.district || 'Kigali'}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
      <button
        onClick={() => {
          if (start && destination) {
            alert(`Checking route from ${start} to ${destination} for incidents...`);
          } else {
            alert('Please enter both starting point and destination');
          }
        }}
        className="mt-4 w-full bg-blue-600 text-white py-3 rounded-lg font-semibold hover:bg-blue-700 transition-colors"
      >
        Check Route for Incidents
      </button>
    </div>
  );
};

const SimpleLiveIncidentFeed = ({ incidents, loading }) => {
  const formatTime = (timestamp) => {
    if (!timestamp) return 'Just now';
    try {
      const date = new Date(timestamp);
      const now = new Date();
      const diff = Math.floor((now - date) / 1000); // seconds

      if (diff < 60) return 'Just now';
      if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
      if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
      return `${Math.floor(diff / 86400)}d ago`;
    } catch {
      return 'Recently';
    }
  };

  return (
    <div className="gov-card sticky top-20">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-bold flex items-center">
          <AlertTriangle className="w-5 h-5 mr-2 text-orange-600" />
          Live Incident Feed
        </h3>
        <div className="flex items-center gap-2">
          <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded-full flex items-center">
            <span className="live-indicator mr-1">●</span>
            Live
          </span>
          <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded-full">
            {incidents?.length || 0}
          </span>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-8">
          <div className="spinner mx-auto mb-2"></div>
          <p className="text-sm text-gray-500">Loading incidents...</p>
        </div>
      ) : incidents && incidents.length > 0 ? (
        <div className="space-y-3 max-h-[600px] overflow-y-auto pr-2">
          {incidents.map((incident, idx) => (
            <div key={incident.id || idx} className="p-3 bg-gradient-to-r from-gray-50 to-white rounded-lg border border-gray-200 hover:border-blue-300 hover:shadow-md transition-all">
              <div className="flex items-start justify-between mb-2">
                <h4 className="font-semibold text-sm text-gray-800 flex items-center gap-2">
                  <span className={`w-2 h-2 rounded-full ${incident.severity === 'critical' ? 'bg-red-500 animate-pulse' :
                    incident.severity === 'high' ? 'bg-orange-500' :
                      incident.severity === 'medium' ? 'bg-yellow-500' :
                        'bg-blue-500'
                    }`}></span>
                  {incident.incident_type || 'Traffic Incident'}
                </h4>
                <span className={`text-xs px-2 py-1 rounded font-medium ${incident.severity === 'critical' ? 'bg-red-100 text-red-800' :
                  incident.severity === 'high' ? 'bg-orange-100 text-orange-800' :
                    incident.severity === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                      'bg-blue-100 text-blue-800'
                  }`}>
                  {incident.severity || 'Low'}
                </span>
              </div>

              <p className="text-xs text-gray-600 flex items-center mb-2">
                <MapPin className="w-3 h-3 mr-1 flex-shrink-0" />
                <span className="line-clamp-1">{incident.location || 'Kigali'}</span>
              </p>

              {incident.description && (
                <p className="text-xs text-gray-500 mb-2 line-clamp-2">{incident.description}</p>
              )}

              <div className="flex items-center justify-between mt-2 pt-2 border-t border-gray-100">
                <div className="flex items-center gap-2">
                  <span className={`text-xs px-2 py-1 rounded ${incident.status === 'resolved' ? 'bg-green-100 text-green-800' :
                    incident.status === 'in_progress' ? 'bg-blue-100 text-blue-800' :
                      'bg-gray-100 text-gray-800'
                    }`}>
                    {incident.status?.replace('_', ' ') || 'Pending'}
                  </span>
                  {incident.source === 'mobile_app' && (
                    <span className="text-xs bg-purple-100 text-purple-800 px-2 py-1 rounded flex items-center gap-1">
                      <span>📱</span> Auto
                    </span>
                  )}
                </div>
                <span className="text-xs text-gray-400 flex items-center">
                  <Clock className="w-3 h-3 mr-1" />
                  {formatTime(incident.created_at)}
                </span>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-12 text-gray-500">
          <AlertTriangle className="w-16 h-16 mx-auto mb-3 text-gray-300" />
          <p className="font-medium">No incidents reported</p>
          <p className="text-xs text-gray-400 mt-1">All clear on Kigali roads!</p>
        </div>
      )}

      <div className="mt-4 pt-4 border-t border-gray-200 text-center">
        <button
          onClick={() => window.location.reload()}
          className="text-xs text-blue-600 hover:text-blue-800 font-medium"
        >
          🔄 Refresh Feed
        </button>
      </div>
    </div>
  );
};

const HomePage = () => {
  const { incidents, statistics, loading } = useData();
  const { isAuthenticated, user } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);
  const [showRoutePlanner, setShowRoutePlanner] = useState(false);
  const [showEmergencyPopup, setShowEmergencyPopup] = useState(false);
  const [showIncidentPopup, setShowIncidentPopup] = useState(false);

  // Debug logging
  useEffect(() => {
    console.log('📊 HomePage State:', {
      incidentCount: incidents?.length || 0,
      loading,
      isAuthenticated,
      showRoutePlanner,
      incidents: incidents
    });
  }, [incidents, loading, isAuthenticated, showRoutePlanner]);

  return (
    <div className="min-h-screen relative">
      {/* Full Screen Rwanda National Police Logo Background */}
      <div className="fixed inset-0 pointer-events-none z-0">
        <div className="absolute inset-0 bg-gradient-to-br from-blue-50 via-white to-blue-50">
          <img
            src="/assets/rnp-logo.png"
            alt=""
            className="absolute inset-0 w-full h-full object-cover opacity-[0.45]"
            style={{
              objectFit: 'cover',
              objectPosition: 'center',
              filter: 'brightness(0.85) contrast(1.08)'
            }}
          />
        </div>
      </div>

      {/* Main Content - Positioned above background */}
      <div className="relative z-10">
        {/* Government Header with Rwanda Colors */}
        <div className="rwanda-accent"></div>

        {/* Navigation */}
        <nav className="gov-header sticky top-0 z-40">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between items-center h-16">
              {/* Logo - Rwanda National Police */}
              <div className="flex items-center space-x-3">
                <div className="w-14 h-14 bg-white rounded-full flex items-center justify-center overflow-hidden shadow-xl ring-2 ring-blue-200">
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
                <div className="text-white">
                  <h1 className="text-xl font-bold">Rwanda National Police</h1>
                  <p className="text-xs text-blue-100">Traffic Management System</p>
                </div>
              </div>            {/* Desktop Menu */}
              <div className="hidden md:flex items-center space-x-6">
                <Link to="/" className="text-white hover:text-blue-100 transition-colors">
                  Home
                </Link>
                <button
                  onClick={() => {
                    console.log('🗺️ Route Planner button clicked! Current state:', showRoutePlanner);
                    setShowRoutePlanner(!showRoutePlanner);
                  }}
                  className="text-white hover:text-blue-100 transition-colors"
                >
                  Route Planner
                </button>
                <Link to="/incidents" className="text-white hover:text-blue-100 transition-colors">
                  Incidents
                </Link>

                {isAuthenticated ? (
                  <>
                    <Link to="/dashboard" className="text-white hover:text-blue-100 transition-colors">
                      Dashboard
                    </Link>
                    <span className="text-blue-100">👤 {user?.full_name}</span>
                  </>
                ) : (
                  <>
                    <Link
                      to="/login"
                      className="text-white hover:text-blue-100 transition-colors"
                    >
                      Login
                    </Link>
                    <Link
                      to="/register"
                      className="bg-white text-gov-primary px-4 py-2 rounded-lg font-semibold hover:bg-blue-50 transition-colors"
                    >
                      Register
                    </Link>
                  </>
                )}
              </div>

              {/* Mobile Menu Button */}
              <button
                onClick={() => setMenuOpen(!menuOpen)}
                className="md:hidden text-white"
              >
                {menuOpen ? <X size={24} /> : <Menu size={24} />}
              </button>
            </div>
          </div>

          {/* Mobile Menu */}
          {menuOpen && (
            <div className="md:hidden bg-gov-primary border-t border-blue-600">
              <div className="px-4 py-3 space-y-3">
                <Link to="/" className="block text-white hover:text-blue-100">
                  Home
                </Link>
                <button
                  onClick={() => {
                    setShowRoutePlanner(!showRoutePlanner);
                    setMenuOpen(false);
                  }}
                  className="block w-full text-left text-white hover:text-blue-100"
                >
                  Route Planner
                </button>
                <Link to="/incidents" className="block text-white hover:text-blue-100">
                  Incidents
                </Link>
                {isAuthenticated ? (
                  <Link to="/dashboard" className="block text-white hover:text-blue-100">
                    Dashboard
                  </Link>
                ) : (
                  <>
                    <Link to="/login" className="block text-white hover:text-blue-100">
                      Login
                    </Link>
                    <Link to="/register" className="block text-white hover:text-blue-100">
                      Register
                    </Link>
                  </>
                )}
              </div>
            </div>
          )}
        </nav>

        {/* Hero Section with RNP Background */}
        <div className="relative bg-gradient-to-br from-blue-900 via-blue-800 to-blue-900 text-white py-8 overflow-hidden">
          {/* Background Pattern */}
          <div className="absolute inset-0 opacity-5">
            <div className="absolute top-10 right-10 w-64 h-64">
              <img
                src="/assets/rnp-logo.png"
                alt="RNP Background"
                className="w-full h-full object-contain opacity-30"
              />
            </div>
            <div className="absolute bottom-10 left-10 w-48 h-48">
              <img
                src="/assets/rnp-logo.png"
                alt="RNP Background"
                className="w-full h-full object-contain opacity-20"
              />
            </div>
          </div>

          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
            <div className="text-center">
              <div className="mb-6 flex justify-center">
                <div className="w-32 h-32 bg-white rounded-full flex items-center justify-center overflow-hidden shadow-2xl ring-4 ring-blue-300">
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
              </div>
              <h2 className="text-4xl md:text-5xl font-bold mb-4">
                Rwanda National Police
              </h2>
              <h3 className="text-2xl md:text-3xl font-semibold mb-4 text-blue-200">
                Real-Time Traffic Monitoring System
              </h3>
              <p className="text-xl text-blue-100 mb-8 max-w-3xl mx-auto">
                Stay informed about traffic conditions across Kigali.
                Check your route, view live incidents, and plan your journey safely.
              </p>

              {/* Quick Stats */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 max-w-4xl mx-auto">
                <div className="bg-white/10 backdrop-blur-sm rounded-lg p-4 hover:bg-white/20 transition-all">
                  <div className="flex items-center justify-between mb-2">
                    <AlertTriangle className="w-6 h-6 text-red-300" />
                    <span className="text-sm font-semibold text-green-300">+12%</span>
                  </div>
                  <div className="text-3xl font-bold">{statistics?.total_incidents || 19}</div>
                  <div className="text-sm text-blue-100">Total Incidents</div>
                </div>
                <div className="bg-white/10 backdrop-blur-sm rounded-lg p-4 hover:bg-white/20 transition-all">
                  <div className="flex items-center justify-between mb-2">
                    <Activity className="w-6 h-6 text-blue-300" />
                    <span className="text-sm font-semibold text-green-300">+5%</span>
                  </div>
                  <div className="text-3xl font-bold">{statistics?.active_reports || 5}</div>
                  <div className="text-sm text-blue-100">Active Reports</div>
                </div>
                <div className="bg-white/10 backdrop-blur-sm rounded-lg p-4 hover:bg-white/20 transition-all">
                  <div className="flex items-center justify-between mb-2">
                    <Camera className="w-6 h-6 text-green-300" />
                    <span className="text-sm font-semibold text-green-300">+28%</span>
                  </div>
                  <div className="text-3xl font-bold">{statistics?.mobile_captures || 12}</div>
                  <div className="text-sm text-blue-100">Mobile Captures</div>
                </div>
                <div className="bg-white/10 backdrop-blur-sm rounded-lg p-4 hover:bg-white/20 transition-all">
                  <div className="flex items-center justify-between mb-2">
                    <Clock className="w-6 h-6 text-yellow-300" />
                    <span className="text-sm font-semibold text-red-300">-15%</span>
                  </div>
                  <div className="text-3xl font-bold">{statistics?.avg_response_time || 8}min</div>
                  <div className="text-sm text-blue-100">Avg Response</div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Route Planner (Collapsible) */}
        {showRoutePlanner && (
          <div className="bg-white border-b border-gray-200 shadow-lg">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
              <SimpleRoutePlanner />
            </div>
          </div>
        )}

        {/* Main Content */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Left Column: Incident Map */}
            <div className="lg:col-span-2 space-y-6">
              {/* Map */}
              <div className="gov-card">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-xl font-bold text-gray-900 flex items-center">
                    <MapPin className="w-6 h-6 mr-2 text-blue-600" />
                    Kigali Incident Map
                  </h3>
                  <span className="px-3 py-1 bg-green-100 text-green-800 rounded-full text-sm font-semibold flex items-center">
                    <span className="live-indicator mr-2">●</span>
                    Live Updates
                  </span>
                </div>
                <SimpleIncidentMap incidents={incidents} />
              </div>

              {/* Report Incident & Emergency Buttons */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <Link
                  to="/incidents"
                  className="bg-white p-6 rounded-lg shadow-md hover:shadow-lg transition-all border-l-4 border-gray-500 flex items-center group"
                >
                  <div className="bg-gray-100 p-3 rounded-full mr-4 group-hover:bg-gray-200 transition-colors">
                    <AlertTriangle className="w-8 h-8 text-gray-600" />
                  </div>
                  <div className="text-left">
                    <h3 className="text-lg font-bold text-gray-900">View Incidents</h3>
                    <p className="text-sm text-gray-500">Monitor traffic incidents</p>
                  </div>
                </Link>

                <button
                  onClick={() => setShowIncidentPopup(true)}
                  className="bg-white p-6 rounded-lg shadow-md hover:shadow-lg transition-all border-l-4 border-blue-500 flex items-center group"
                >
                  <div className="bg-blue-100 p-3 rounded-full mr-4 group-hover:bg-blue-200 transition-colors">
                    <Activity className="w-8 h-8 text-blue-600" />
                  </div>
                  <div className="text-left">
                    <h3 className="text-lg font-bold text-gray-900">Report Incident</h3>
                    <p className="text-sm text-gray-500">Submit a new report</p>
                  </div>
                </button>

                <button
                  onClick={() => setShowEmergencyPopup(true)}
                  className="bg-white p-6 rounded-lg shadow-md hover:shadow-lg transition-all border-l-4 border-red-500 flex items-center group"
                >
                  <div className="bg-red-100 p-3 rounded-full mr-4 group-hover:bg-red-200 transition-colors">
                    <AlertTriangle className="w-8 h-8 text-red-600" />
                  </div>
                  <div className="text-left">
                    <h3 className="text-lg font-bold text-gray-900">Emergency</h3>
                    <p className="text-sm text-gray-500">Critical response</p>
                  </div>
                </button>
              </div>
            </div>

            {/* Right Column: Live Incident Feed */}
            <div className="lg:col-span-1">
              <SimpleLiveIncidentFeed incidents={incidents} loading={loading} />
            </div>
          </div>
        </div>

        {/* Quick Actions Removed */}

        {/* Footer */}
        <footer className="bg-gray-900 text-white mt-16">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              <div>
                <div className="flex items-center space-x-3 mb-4">
                  <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center overflow-hidden">
                    <img
                      src="/assets/rnp-logo.png"
                      alt="RNP"
                      className="w-full h-full object-cover"
                      style={{
                        objectFit: 'cover',
                        objectPosition: 'center'
                      }}
                    />
                  </div>
                  <div>
                    <h4 className="font-bold">Rwanda National Police</h4>
                    <p className="text-xs text-gray-400">Traffic Management</p>
                  </div>
                </div>
                <p className="text-gray-400 text-sm">
                  Ensuring safer roads and better traffic management across Rwanda.
                </p>
              </div>
              <div>
                <h4 className="font-bold mb-4">Quick Links</h4>
                <ul className="space-y-2 text-sm text-gray-400">
                  <li><Link to="/" className="hover:text-white">Home</Link></li>
                  <li><Link to="/incidents" className="hover:text-white">View Incidents</Link></li>
                  <li><Link to="/report" className="hover:text-white">Report Incident</Link></li>
                  <li><Link to="/dashboard" className="hover:text-white">Dashboard</Link></li>
                </ul>
              </div>
              <div>
                <h4 className="font-bold mb-4">Contact</h4>
                <p className="text-gray-400 text-sm">
                  Emergency: 112<br />
                  Traffic Police: 113<br />
                  info@trafficrwanda.gov.rw
                </p>
              </div>
            </div>
            <div className="border-t border-gray-800 mt-8 pt-8 text-center text-gray-400 text-sm">
              <p>© 2025 Government of Rwanda. All rights reserved.</p>
            </div>
          </div>
        </footer>
      </div>
      {/* End Main Content Wrapper */}

      {/* Floating 'Report Emergency' Button */}
      <div className="fixed bottom-8 right-8 z-40">
        <button
          className="bg-red-600 hover:bg-red-700 text-white font-bold py-3 px-6 rounded-full shadow-lg flex items-center gap-2 text-lg animate-bounce"
          onClick={() => setShowEmergencyPopup(true)}
        >
          <AlertTriangle className="w-6 h-6 mr-2" />
          Report Emergency
        </button>
      </div>
      <EmergencyReportPopup open={showEmergencyPopup} onClose={() => setShowEmergencyPopup(false)}>
        <ReportIncidentForm isEmergency />
      </EmergencyReportPopup>

      <EmergencyReportPopup open={showIncidentPopup} onClose={() => setShowIncidentPopup(false)}>
        <ReportIncidentForm />
      </EmergencyReportPopup>
    </div>
  );
};

export default HomePage;
