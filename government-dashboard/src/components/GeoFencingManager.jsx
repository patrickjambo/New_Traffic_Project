import React, { useState, useEffect, useCallback, useMemo } from 'react';
import axios from '../config/axios';
import { useWebSocket } from '../context/WebSocketContext';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';

const CACHE_KEYS = {
  OFFICERS: 'geofencing_officers_cache',
  DISTRICTS: 'geofencing_districts_cache'
};

// Load cached data instantly
const loadFromCache = (key) => {
  try {
    const cached = localStorage.getItem(key);
    if (cached) {
      const parsed = JSON.parse(cached);
      // Ensure we return an array
      return Array.isArray(parsed) ? parsed : [];
    }
  } catch (e) {
    console.error('Cache load error:', e);
    // Clear corrupted cache
    try {
      localStorage.removeItem(key);
    } catch {}
  }
  return [];
};

// Save to cache
const saveToCache = (key, data) => {
  try {
    if (Array.isArray(data)) {
      localStorage.setItem(key, JSON.stringify(data));
    }
  } catch (e) {
    console.error('Cache save error:', e);
  }
};

/**
 * GeoFencing Management Component
 * Admin dashboard for managing:
 * - Districts and sectors
 * - Police stations
 * - Officer locations (real-time)
 * - Alert targeting
 */
const GeoFencingManager = () => {
  // Auth context for district filtering
  const { user } = useAuth();
  const isDistrictAdmin = user?.role === 'district_admin';
  const userDistrictId = user?.districtId;
  
  // State - initialize from cache for instant display (with safe fallbacks)
  const [districts, setDistricts] = useState([]);
  const [officers, setOfficers] = useState([]);
  const [recentAlerts, setRecentAlerts] = useState([]);
  const [selectedDistrict, setSelectedDistrict] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showAlertModal, setShowAlertModal] = useState(false);
  const [lastUpdated, setLastUpdated] = useState(new Date());
  const [, setTick] = useState(0); // Force re-render for time updates
  const [alertForm, setAlertForm] = useState({
    type: 'general',
    severity: 'medium',
    isEmergency: false,
    latitude: -1.9536,
    longitude: 30.0606,
    address: '',
    description: '',
  });

  // Initialize from cache safely
  useEffect(() => {
    try {
      const cachedDistricts = loadFromCache(CACHE_KEYS.DISTRICTS);
      const cachedOfficers = loadFromCache(CACHE_KEYS.OFFICERS);
      if (cachedDistricts.length > 0) setDistricts(cachedDistricts);
      if (cachedOfficers.length > 0) setOfficers(cachedOfficers);
    } catch (e) {
      console.error('Failed to load cache:', e);
    }
  }, []);

  const { subscribe, isConnected } = useWebSocket();

  // Filter districts for district admin (show only their district)
  const filteredDistricts = useMemo(() => {
    if (!isDistrictAdmin || !userDistrictId) return districts;
    return districts.filter(d => d.id === userDistrictId);
  }, [districts, isDistrictAdmin, userDistrictId]);

  // Filter officers for district admin
  const filteredOfficers = useMemo(() => {
    if (!isDistrictAdmin || !userDistrictId) return officers;
    return officers.filter(o => 
      o.assigned_district_id === userDistrictId || 
      o.current_district_id === userDistrictId
    );
  }, [officers, isDistrictAdmin, userDistrictId]);

  // Refresh time display every second
  useEffect(() => {
    const interval = setInterval(() => setTick(t => t + 1), 1000);
    return () => clearInterval(interval);
  }, []);

  // Auto-select district for district admin
  useEffect(() => {
    if (isDistrictAdmin && userDistrictId && filteredDistricts.length > 0) {
      const userDistrict = filteredDistricts.find(d => d.id === userDistrictId);
      if (userDistrict && !selectedDistrict) {
        setSelectedDistrict(userDistrict);
      }
    }
  }, [isDistrictAdmin, userDistrictId, filteredDistricts, selectedDistrict]);

  // Fetch districts with stats
  const fetchDistricts = useCallback(async (silent = false) => {
    try {
      const response = await axios.get('/api/geofencing/districts');
      if (response.data.success && Array.isArray(response.data.data)) {
        setDistricts(response.data.data);
        saveToCache(CACHE_KEYS.DISTRICTS, response.data.data);
        if (!silent) setLastUpdated(new Date());
      }
    } catch (error) {
      console.error('Error fetching districts:', error);
      // Don't set error state for network issues - keep showing cached data
    }
  }, []);

  // Fetch officers with locations
  const fetchOfficers = useCallback(async (silent = false) => {
    try {
      const response = await axios.get('/api/geofencing/officers');
      if (response.data.success && Array.isArray(response.data.data)) {
        setOfficers(response.data.data);
        saveToCache(CACHE_KEYS.OFFICERS, response.data.data);
        if (!silent) setLastUpdated(new Date());
      }
    } catch (error) {
      console.error('Error fetching officers:', error);
      // Don't set error state for network issues - keep showing cached data
    }
  }, []);

  // Initial data load
  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        await Promise.all([fetchDistricts(), fetchOfficers()]);
        setLastUpdated(new Date());
      } catch (e) {
        console.error('Error loading geo-fencing data:', e);
        setError('Failed to load geo-fencing data');
      } finally {
        setLoading(false);
      }
    };
    loadData();

    // Real-time polling every 5 seconds for seamless updates
    const interval = setInterval(() => {
      fetchOfficers(true); // silent update
      fetchDistricts(true); // silent update
      setLastUpdated(new Date());
    }, 5000);

    return () => clearInterval(interval);
  }, [fetchDistricts, fetchOfficers]);

  // Subscribe to real-time officer location updates
  useEffect(() => {
    if (!isConnected) return;

    const unsubLocation = subscribe('officer:location', (data) => {
      console.log('📍 GeoFencing: Officer location update:', data);
      setOfficers(prev => {
        const updated = prev.map(officer => 
          officer.user_id === data.officerId 
            ? { 
                ...officer, 
                latitude: data.latitude, 
                longitude: data.longitude, 
                last_location_update: data.timestamp || new Date().toISOString(),
                duty_status: 'on_duty' // If sending location, they're on duty
              }
            : officer
        );
        saveToCache(CACHE_KEYS.OFFICERS, updated);
        return updated;
      });
      setLastUpdated(new Date());
    });

    // Subscribe to officer status changes
    const unsubStatus = subscribe('officer:status_changed', (data) => {
      console.log('👮 GeoFencing: Officer status change:', data);
      setOfficers(prev => {
        const updated = prev.map(officer => 
          officer.user_id === data.officerId 
            ? { ...officer, duty_status: data.isOnDuty ? 'on_duty' : 'off_duty', is_on_duty: data.isOnDuty }
            : officer
        );
        saveToCache(CACHE_KEYS.OFFICERS, updated);
        return updated;
      });
      setLastUpdated(new Date());
    });

    // Subscribe to incident alerts (auto-dispatched from geo-fencing)
    const unsubIncidentAlert = subscribe('incident:alert', (data) => {
      console.log('📢 GeoFencing: New incident alert:', data);
      toast.success(`📢 Incident Alert: ${data.type || 'New incident'} - ${data.targetedOfficers || 0} officers notified`, {
        duration: 5000,
        icon: '📢'
      });
      // Add to recent alerts feed
      setRecentAlerts(prev => [{
        id: data.alertId || Date.now(),
        type: 'incident',
        title: data.title || `${data.type} Alert`,
        message: data.message || data.description,
        location: data.location?.address || 'Unknown',
        officers: data.targetedOfficers || 0,
        timestamp: new Date().toISOString(),
        isEmergency: false
      }, ...prev].slice(0, 10)); // Keep last 10 alerts
      // Refresh districts to update incident counts
      fetchDistricts(true);
      setLastUpdated(new Date());
    });

    // Subscribe to emergency alarms (auto-dispatched from geo-fencing)
    const unsubEmergencyAlarm = subscribe('emergency:alarm', (data) => {
      console.log('🚨 GeoFencing: Emergency alarm:', data);
      toast.error(`🚨 EMERGENCY: ${data.type || 'Critical'} at ${data.location?.address || 'Unknown'}`, {
        duration: 8000,
        icon: '🚨'
      });
      // Add to recent alerts feed
      setRecentAlerts(prev => [{
        id: data.alertId || Date.now(),
        type: 'emergency',
        title: data.title || `🚨 EMERGENCY: ${data.type}`,
        message: data.message || data.description,
        location: data.location?.address || 'Unknown',
        officers: data.targetedOfficers || 0,
        timestamp: new Date().toISOString(),
        isEmergency: true
      }, ...prev].slice(0, 10)); // Keep last 10 alerts
      // Refresh districts to update incident counts
      fetchDistricts(true);
      setLastUpdated(new Date());
    });

    // Subscribe to alert acknowledgments
    const unsubAck = subscribe('alert:acknowledged', (data) => {
      console.log('✅ GeoFencing: Alert acknowledged:', data);
      toast.success(`Officer acknowledged alert`, {
        duration: 3000,
        icon: '✅'
      });
      // Update the alert in recent alerts
      setRecentAlerts(prev => prev.map(alert => 
        alert.id === data.alertId 
          ? { ...alert, acknowledged: true, acknowledgedAt: data.timestamp }
          : alert
      ));
      setLastUpdated(new Date());
    });

    // Subscribe to new incidents/emergencies for district stats update
    const unsubIncidentNew = subscribe('incident:new', () => {
      console.log('📊 GeoFencing: New incident - refreshing stats');
      fetchDistricts(true);
      setLastUpdated(new Date());
    });

    const unsubEmergencyNew = subscribe('emergency:new', () => {
      console.log('📊 GeoFencing: New emergency - refreshing stats');
      fetchDistricts(true);
      setLastUpdated(new Date());
    });

    return () => {
      unsubLocation();
      unsubStatus();
      unsubIncidentAlert();
      unsubEmergencyAlarm();
      unsubAck();
      unsubIncidentNew();
      unsubEmergencyNew();
    };
  }, [isConnected, subscribe, fetchDistricts]);

  // Send targeted alert
  const sendAlert = async (isEmergency = false) => {
    try {
      const endpoint = isEmergency ? '/api/geofencing/alert/emergency' : '/api/geofencing/alert';
      const response = await axios.post(endpoint, {
        ...alertForm,
        isEmergency,
      });

      if (response.data.success) {
        toast.success(`Alert sent to ${response.data.data.targetedOfficers} officers!`, {
          icon: isEmergency ? '🚨' : '📢',
          duration: 5000,
        });
        setShowAlertModal(false);
        setAlertForm({
          type: 'general',
          severity: 'medium',
          isEmergency: false,
          latitude: -1.9536,
          longitude: 30.0606,
          address: '',
          description: '',
        });
      }
    } catch (error) {
      toast.error('Failed to send alert: ' + (error.response?.data?.message || error.message));
    }
  };

  // Get duty status badge color
  const getDutyStatusColor = (status) => {
    switch (status) {
      case 'on_duty': return 'bg-cyan-500';
      case 'responding': return 'bg-cyan-400 animate-pulse';
      case 'on_break': return 'bg-cyan-600';
      default: return 'bg-gray-500';
    }
  };

  // Format time ago
  const timeAgo = (timestamp) => {
    if (!timestamp) return 'Never';
    const diff = Date.now() - new Date(timestamp).getTime();
    const minutes = Math.floor(diff / 60000);
    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    return `${Math.floor(hours / 24)}d ago`;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-cyan-500 mx-auto mb-4"></div>
          <p className="text-gray-400">Loading geo-fencing data...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="text-red-500 text-4xl mb-4">⚠️</div>
          <p className="text-white mb-2">Failed to load geo-fencing data</p>
          <p className="text-gray-400 text-sm mb-4">{error}</p>
          <button 
            onClick={() => { setError(null); setLoading(true); fetchDistricts(); fetchOfficers(); }}
            className="px-4 py-2 bg-cyan-600 hover:bg-cyan-700 text-white rounded-lg"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-white">Geo-Fencing & Alert Management</h2>
          <p className="text-gray-400">
            Manage districts, officers, and send targeted alerts
            <span className="ml-2 text-xs text-cyan-400 inline-flex items-center gap-1">
              <span className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-500 animate-pulse' : 'bg-cyan-500'}`}></span>
              {isConnected ? 'Live' : 'Auto-updating'} • Last: {lastUpdated.toLocaleTimeString()}
            </span>
          </p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={() => setShowAlertModal(true)}
            className="px-4 py-2 bg-cyan-600 hover:bg-cyan-700 text-white rounded-lg flex items-center gap-2 transition-colors"
          >
            <span>📢</span> Send Alert
          </button>
          <button
            onClick={() => { setAlertForm(prev => ({ ...prev, isEmergency: true })); setShowAlertModal(true); }}
            className="px-4 py-2 bg-cyan-700 hover:bg-cyan-800 text-white rounded-lg flex items-center gap-2 transition-colors"
          >
            <span>🚨</span> Emergency Alarm
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-gray-800/50 backdrop-blur rounded-xl p-4 border border-gray-700">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-cyan-500/20 rounded-lg">
              <span className="text-2xl">🗺️</span>
            </div>
            <div>
              <p className="text-gray-400 text-sm">Districts</p>
              <p className="text-2xl font-bold text-white">{filteredDistricts.length}</p>
            </div>
          </div>
        </div>

        <div className="bg-gray-800/50 backdrop-blur rounded-xl p-4 border border-gray-700">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-cyan-500/20 rounded-lg">
              <span className="text-2xl">👮</span>
            </div>
            <div>
              <p className="text-gray-400 text-sm">Officers Online</p>
              <p className="text-2xl font-bold text-white">
                {filteredOfficers.filter(o => o.duty_status === 'on_duty').length}
                <span className="text-sm text-gray-400 ml-1">/ {filteredOfficers.length}</span>
              </p>
            </div>
          </div>
        </div>

        <div className="bg-gray-800/50 backdrop-blur rounded-xl p-4 border border-gray-700">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-cyan-500/20 rounded-lg">
              <span className="text-2xl">📍</span>
            </div>
            <div>
              <p className="text-gray-400 text-sm">With GPS</p>
              <p className="text-2xl font-bold text-white">
                {filteredOfficers.filter(o => o.latitude && o.longitude).length}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-gray-800/50 backdrop-blur rounded-xl p-4 border border-gray-700">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-cyan-600/20 rounded-lg">
              <span className="text-2xl">🚨</span>
            </div>
            <div>
              <p className="text-gray-400 text-sm">Responding</p>
              <p className="text-2xl font-bold text-white">
                {filteredOfficers.filter(o => o.duty_status === 'responding').length}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Recent Alerts Feed */}
      {recentAlerts.length > 0 && (
        <div className="bg-gray-800/50 backdrop-blur rounded-xl border border-gray-700 overflow-hidden">
          <div className="p-4 border-b border-gray-700 flex items-center justify-between">
            <h3 className="text-lg font-semibold text-white flex items-center gap-2">
              <span className="animate-pulse">🔔</span> Live Alert Feed
            </h3>
            <span className="text-xs text-gray-400">Last {recentAlerts.length} alerts</span>
          </div>
          <div className="divide-y divide-gray-700 max-h-64 overflow-y-auto">
            {recentAlerts.map((alert) => (
              <div 
                key={alert.id} 
                className={`p-3 flex items-start gap-3 ${alert.isEmergency ? 'bg-red-900/20' : ''}`}
              >
                <span className={`text-xl ${alert.isEmergency ? 'animate-pulse' : ''}`}>
                  {alert.isEmergency ? '🚨' : '📢'}
                </span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className={`font-medium truncate ${alert.isEmergency ? 'text-red-400' : 'text-white'}`}>
                      {alert.title}
                    </p>
                    {alert.acknowledged && (
                      <span className="text-xs text-cyan-400">✅ Acknowledged</span>
                    )}
                  </div>
                  <p className="text-sm text-gray-400 truncate">{alert.location}</p>
                  <div className="flex items-center gap-3 mt-1 text-xs text-gray-500">
                    <span>👮 {alert.officers} officers</span>
                    <span>🕐 {timeAgo(alert.timestamp)}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Districts Grid */}
      <div className="bg-gray-800/50 backdrop-blur rounded-xl border border-gray-700 overflow-hidden">
        <div className="p-4 border-b border-gray-700">
          <h3 className="text-lg font-semibold text-white">
            {isDistrictAdmin ? `${user?.districtName || 'Your'} District` : 'Kigali Districts'}
          </h3>
        </div>
        <div className={`grid grid-cols-1 ${isDistrictAdmin ? '' : 'md:grid-cols-3'} gap-4 p-4`}>
          {filteredDistricts.map((district) => (
            <div
              key={district.id}
              onClick={() => !isDistrictAdmin && setSelectedDistrict(district)}
              className={`p-4 rounded-lg border ${isDistrictAdmin ? 'cursor-default' : 'cursor-pointer'} transition-all ${
                selectedDistrict?.id === district.id
                  ? 'bg-cyan-600/20 border-cyan-500'
                  : 'bg-gray-700/50 border-gray-600 hover:border-gray-500'
              }`}
            >
              <div className="flex items-center justify-between mb-3">
                <h4 className="text-lg font-semibold text-white">{district.name}</h4>
                <span className="px-2 py-1 bg-gray-600 rounded text-xs text-gray-300">{district.code}</span>
              </div>
              <div className="grid grid-cols-3 gap-2 text-sm">
                <div>
                  <p className="text-gray-400">Officers</p>
                  <p className="text-white font-medium">{district.total_officers || 0}</p>
                </div>
                <div>
                  <p className="text-gray-400">On Duty</p>
                  <p className="text-cyan-400 font-medium">{district.officers_on_duty || 0}</p>
                </div>
                <div>
                  <p className="text-gray-400">Incidents</p>
                  <p className="text-cyan-300 font-medium">{district.active_incidents || 0}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Officers Table */}
      <div className="bg-gray-800/50 backdrop-blur rounded-xl border border-gray-700 overflow-hidden">
        <div className="p-4 border-b border-gray-700 flex items-center justify-between">
          <h3 className="text-lg font-semibold text-white">
            Officers {isDistrictAdmin 
              ? `(${user?.districtName || 'Your District'})` 
              : selectedDistrict 
                ? `in ${selectedDistrict.name}` 
                : '(All Districts)'}
          </h3>
          {selectedDistrict && !isDistrictAdmin && (
            <button
              onClick={() => setSelectedDistrict(null)}
              className="text-sm text-cyan-400 hover:text-cyan-300"
            >
              Show All
            </button>
          )}
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-700/50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase">Officer</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase">Badge</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase">District</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase">Status</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase">Location</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase">Last Update</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-700">
              {filteredOfficers
                .filter(o => !selectedDistrict || o.assigned_district_id === selectedDistrict.id)
                .map((officer) => (
                  <tr key={officer.id} className="hover:bg-gray-700/30">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-cyan-600 rounded-full flex items-center justify-center text-white text-sm font-medium">
                          {officer.full_name?.charAt(0) || 'O'}
                        </div>
                        <span className="text-white">{officer.full_name || 'Unknown'}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-gray-300">{officer.badge_number || '-'}</td>
                    <td className="px-4 py-3 text-gray-300">{officer.district_name || '-'}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-full text-xs font-medium text-white ${getDutyStatusColor(officer.duty_status)}`}>
                        <span className="w-1.5 h-1.5 bg-white rounded-full"></span>
                        {officer.duty_status?.replace('_', ' ') || 'Off Duty'}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      {officer.latitude && officer.longitude ? (
                        <span className="text-cyan-400 text-sm">
                          📍 {parseFloat(officer.latitude).toFixed(4)}, {parseFloat(officer.longitude).toFixed(4)}
                        </span>
                      ) : (
                        <span className="text-gray-500 text-sm">No GPS</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-gray-400 text-sm">
                      {timeAgo(officer.last_location_update)}
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
          {filteredOfficers.length === 0 && (
            <div className="text-center py-8 text-gray-400">
              No officers found {isDistrictAdmin ? 'in your district' : ''}
            </div>
          )}
        </div>
      </div>

      {/* Alert Modal */}
      {showAlertModal && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-800 rounded-xl border border-gray-700 w-full max-w-lg">
            <div className={`p-4 border-b border-gray-700 ${alertForm.isEmergency ? 'bg-red-900/50' : ''}`}>
              <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                {alertForm.isEmergency ? '🚨 Send Emergency Alarm' : '📢 Send Targeted Alert'}
              </h3>
              <p className="text-sm text-gray-400">
                {alertForm.isEmergency 
                  ? 'This will trigger full-screen alarms on all nearby officer devices'
                  : 'Send a standard notification to officers in the target area'
                }
              </p>
            </div>
            
            <div className="p-4 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">Type</label>
                  <select
                    value={alertForm.type}
                    onChange={(e) => setAlertForm(prev => ({ ...prev, type: e.target.value }))}
                    className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white"
                  >
                    <option value="accident">Accident</option>
                    <option value="fire">Fire</option>
                    <option value="robbery">Robbery</option>
                    <option value="assault">Assault</option>
                    <option value="congestion">Traffic Congestion</option>
                    <option value="roadblock">Road Blockage</option>
                    <option value="general">General</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">Severity</label>
                  <select
                    value={alertForm.severity}
                    onChange={(e) => setAlertForm(prev => ({ ...prev, severity: e.target.value }))}
                    className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white"
                  >
                    <option value="critical">Critical</option>
                    <option value="high">High</option>
                    <option value="medium">Medium</option>
                    <option value="low">Low</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">Location</label>
                <input
                  type="text"
                  value={alertForm.address}
                  onChange={(e) => setAlertForm(prev => ({ ...prev, address: e.target.value }))}
                  placeholder="e.g., KN 3 Ave, Kigali CBD"
                  className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">Latitude</label>
                  <input
                    type="number"
                    step="0.0001"
                    value={alertForm.latitude}
                    onChange={(e) => setAlertForm(prev => ({ ...prev, latitude: parseFloat(e.target.value) }))}
                    className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">Longitude</label>
                  <input
                    type="number"
                    step="0.0001"
                    value={alertForm.longitude}
                    onChange={(e) => setAlertForm(prev => ({ ...prev, longitude: parseFloat(e.target.value) }))}
                    className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">Description</label>
                <textarea
                  value={alertForm.description}
                  onChange={(e) => setAlertForm(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Describe the incident..."
                  rows={3}
                  className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white"
                />
              </div>

              {!alertForm.isEmergency && (
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={alertForm.isEmergency}
                    onChange={(e) => setAlertForm(prev => ({ ...prev, isEmergency: e.target.checked }))}
                    className="w-4 h-4 rounded border-gray-600 bg-gray-700 text-red-600 focus:ring-red-500"
                  />
                  <span className="text-sm text-gray-300">Send as Emergency (full-screen alarm)</span>
                </label>
              )}
            </div>

            <div className="p-4 border-t border-gray-700 flex justify-end gap-3">
              <button
                onClick={() => { setShowAlertModal(false); setAlertForm(prev => ({ ...prev, isEmergency: false })); }}
                className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => sendAlert(alertForm.isEmergency)}
                className={`px-4 py-2 rounded-lg text-white transition-colors ${
                  alertForm.isEmergency 
                    ? 'bg-red-600 hover:bg-red-700' 
                    : 'bg-cyan-600 hover:bg-cyan-700'
                }`}
              >
                {alertForm.isEmergency ? '🚨 Send Emergency Alarm' : '📢 Send Alert'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default GeoFencingManager;
