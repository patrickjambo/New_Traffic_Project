import React, { useState, useEffect, useCallback } from 'react';
import axios from '../config/axios';
import { useWebSocket } from '../context/WebSocketContext';
import toast from 'react-hot-toast';

/**
 * GeoFencing Management Component
 * Admin dashboard for managing:
 * - Districts and sectors
 * - Police stations
 * - Officer locations (real-time)
 * - Alert targeting
 */
const GeoFencingManager = () => {
  // State
  const [districts, setDistricts] = useState([]);
  const [officers, setOfficers] = useState([]);
  const [selectedDistrict, setSelectedDistrict] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showAlertModal, setShowAlertModal] = useState(false);
  const [alertForm, setAlertForm] = useState({
    type: 'general',
    severity: 'medium',
    isEmergency: false,
    latitude: -1.9536,
    longitude: 30.0606,
    address: '',
    description: '',
  });

  const { subscribe, isConnected } = useWebSocket();

  // Fetch districts with stats
  const fetchDistricts = useCallback(async () => {
    try {
      const response = await axios.get('/api/geofencing/districts');
      if (response.data.success) {
        setDistricts(response.data.data);
      }
    } catch (error) {
      console.error('Error fetching districts:', error);
    }
  }, []);

  // Fetch officers with locations
  const fetchOfficers = useCallback(async () => {
    try {
      const response = await axios.get('/api/geofencing/officers');
      if (response.data.success) {
        setOfficers(response.data.data);
      }
    } catch (error) {
      console.error('Error fetching officers:', error);
    }
  }, []);

  // Initial data load
  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      await Promise.all([fetchDistricts(), fetchOfficers()]);
      setLoading(false);
    };
    loadData();

    // Refresh every 30 seconds
    const interval = setInterval(() => {
      fetchOfficers();
    }, 30000);

    return () => clearInterval(interval);
  }, [fetchDistricts, fetchOfficers]);

  // Subscribe to real-time officer location updates
  useEffect(() => {
    if (!isConnected) return;

    const unsubscribe = subscribe('officer:location', (data) => {
      setOfficers(prev => prev.map(officer => 
        officer.user_id === data.officerId 
          ? { ...officer, latitude: data.latitude, longitude: data.longitude, last_location_update: data.timestamp }
          : officer
      ));
    });

    return unsubscribe;
  }, [isConnected, subscribe]);

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
      case 'on_duty': return 'bg-green-500';
      case 'responding': return 'bg-red-500 animate-pulse';
      case 'on_break': return 'bg-yellow-500';
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
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-white">Geo-Fencing & Alert Management</h2>
          <p className="text-gray-400">Manage districts, officers, and send targeted alerts</p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={() => setShowAlertModal(true)}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg flex items-center gap-2 transition-colors"
          >
            <span>📢</span> Send Alert
          </button>
          <button
            onClick={() => { setAlertForm(prev => ({ ...prev, isEmergency: true })); setShowAlertModal(true); }}
            className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg flex items-center gap-2 transition-colors animate-pulse"
          >
            <span>🚨</span> Emergency Alarm
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-gray-800/50 backdrop-blur rounded-xl p-4 border border-gray-700">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-blue-500/20 rounded-lg">
              <span className="text-2xl">🗺️</span>
            </div>
            <div>
              <p className="text-gray-400 text-sm">Districts</p>
              <p className="text-2xl font-bold text-white">{districts.length}</p>
            </div>
          </div>
        </div>

        <div className="bg-gray-800/50 backdrop-blur rounded-xl p-4 border border-gray-700">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-green-500/20 rounded-lg">
              <span className="text-2xl">👮</span>
            </div>
            <div>
              <p className="text-gray-400 text-sm">Officers Online</p>
              <p className="text-2xl font-bold text-white">
                {officers.filter(o => o.duty_status === 'on_duty').length}
                <span className="text-sm text-gray-400 ml-1">/ {officers.length}</span>
              </p>
            </div>
          </div>
        </div>

        <div className="bg-gray-800/50 backdrop-blur rounded-xl p-4 border border-gray-700">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-yellow-500/20 rounded-lg">
              <span className="text-2xl">📍</span>
            </div>
            <div>
              <p className="text-gray-400 text-sm">With GPS</p>
              <p className="text-2xl font-bold text-white">
                {officers.filter(o => o.latitude && o.longitude).length}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-gray-800/50 backdrop-blur rounded-xl p-4 border border-gray-700">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-red-500/20 rounded-lg">
              <span className="text-2xl">🚨</span>
            </div>
            <div>
              <p className="text-gray-400 text-sm">Responding</p>
              <p className="text-2xl font-bold text-white">
                {officers.filter(o => o.duty_status === 'responding').length}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Districts Grid */}
      <div className="bg-gray-800/50 backdrop-blur rounded-xl border border-gray-700 overflow-hidden">
        <div className="p-4 border-b border-gray-700">
          <h3 className="text-lg font-semibold text-white">Kigali Districts</h3>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4">
          {districts.map((district) => (
            <div
              key={district.id}
              onClick={() => setSelectedDistrict(district)}
              className={`p-4 rounded-lg border cursor-pointer transition-all ${
                selectedDistrict?.id === district.id
                  ? 'bg-blue-600/20 border-blue-500'
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
                  <p className="text-green-400 font-medium">{district.officers_on_duty || 0}</p>
                </div>
                <div>
                  <p className="text-gray-400">Incidents</p>
                  <p className="text-yellow-400 font-medium">{district.active_incidents || 0}</p>
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
            Officers {selectedDistrict ? `in ${selectedDistrict.name}` : '(All Districts)'}
          </h3>
          {selectedDistrict && (
            <button
              onClick={() => setSelectedDistrict(null)}
              className="text-sm text-blue-400 hover:text-blue-300"
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
              {officers
                .filter(o => !selectedDistrict || o.assigned_district_id === selectedDistrict.id)
                .map((officer) => (
                  <tr key={officer.id} className="hover:bg-gray-700/30">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center text-white text-sm font-medium">
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
                        <span className="text-green-400 text-sm">
                          📍 {officer.latitude.toFixed(4)}, {officer.longitude.toFixed(4)}
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
          {officers.length === 0 && (
            <div className="text-center py-8 text-gray-400">
              No officers found
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
                    : 'bg-blue-600 hover:bg-blue-700'
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
