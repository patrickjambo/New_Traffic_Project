import React, { useState, useEffect } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useData } from '../context/DataContext';
import { useWebSocket } from '../context/WebSocketContext';
import { Users, Phone, MapPin, Clock, AlertTriangle, CheckCircle, XCircle, Download, Activity, Shield, Navigation, Send, X, UserCheck, Radio } from 'lucide-react';
import axios from '../config/axios';
import toast from 'react-hot-toast';
import { deploymentService } from '../services/api';

const Emergency = () => {
  const { isAuthenticated } = useAuth();
  const { emergencies, loading, fetchEmergencies, downloadEmergencyReport, isConnected } = useData();
  const { subscribe } = useWebSocket();
  
  // Deploy Officer Modal State
  const [showDeployModal, setShowDeployModal] = useState(false);
  const [selectedEmergency, setSelectedEmergency] = useState(null);
  const [availableOfficers, setAvailableOfficers] = useState([]);
  const [selectedOfficers, setSelectedOfficers] = useState([]);
  const [deploymentInstructions, setDeploymentInstructions] = useState('');
  const [deploying, setDeploying] = useState(false);
  const [loadingOfficers, setLoadingOfficers] = useState(false);
  
  // Track deployed officers and acknowledgments
  const [deployedOfficers, setDeployedOfficers] = useState({});

  // Fetch available officers when modal opens
  useEffect(() => {
    if (showDeployModal) {
      fetchAvailableOfficers();
    }
  }, [showDeployModal]);

  // Listen for real-time acknowledgments
  useEffect(() => {
    if (!isConnected) return;

    const unsubAck = subscribe('deployment:acknowledged', (data) => {
      console.log('📬 Officer acknowledged:', data);
      toast.success(
        `✅ ${data.officerName || 'Officer'} acknowledged and is en route!`,
        { icon: '🚔', duration: 5000 }
      );
      
      // Update deployed officers state
      setDeployedOfficers(prev => ({
        ...prev,
        [data.officerId]: {
          ...prev[data.officerId],
          acknowledged: true,
          acknowledgedAt: data.acknowledgedAt,
          status: 'en_route',
          estimatedArrival: data.estimatedArrival
        }
      }));
    });

    const unsubStatus = subscribe('deployment:officer_status', (data) => {
      console.log('📍 Officer status update:', data);
      const statusMessages = {
        'en_route': '🚗 is en route to the scene',
        'on_scene': '📍 has arrived on scene',
        'completed': '✅ has completed the task'
      };
      toast(
        `${data.officerName || 'Officer'} ${statusMessages[data.status] || data.status}`,
        { icon: data.status === 'on_scene' ? '📍' : '🚔', duration: 4000 }
      );
      
      setDeployedOfficers(prev => ({
        ...prev,
        [data.officerId]: {
          ...prev[data.officerId],
          status: data.status
        }
      }));
    });

    return () => {
      unsubAck();
      unsubStatus();
    };
  }, [isConnected, subscribe]);

  const fetchAvailableOfficers = async () => {
    try {
      setLoadingOfficers(true);
      const response = await deploymentService.getAvailableOfficers();
      setAvailableOfficers(response.data || []);
    } catch (error) {
      console.error('Error fetching officers:', error);
      toast.error('Failed to load available officers');
    } finally {
      setLoadingOfficers(false);
    }
  };

  const handleStatusUpdate = async (id, newStatus) => {
    try {
      await axios.put(`/api/emergency/${id}/status`, { status: newStatus });
      toast.success(`Emergency status updated to ${newStatus}`);
      // DataContext will handle the state update via WebSocket
    } catch (error) {
      console.error('Error updating status:', error);
      toast.error('Failed to update status');
    }
  };

  const openDeployModal = (emergency) => {
    setSelectedEmergency(emergency);
    setSelectedOfficers([]);
    setDeploymentInstructions(`Respond to ${emergency.emergency_type} emergency at ${emergency.location_name}. ${emergency.description || ''}`);
    setShowDeployModal(true);
  };

  const toggleOfficerSelection = (officerId) => {
    setSelectedOfficers(prev => 
      prev.includes(officerId) 
        ? prev.filter(id => id !== officerId)
        : [...prev, officerId]
    );
  };

  const handleDeployOfficers = async () => {
    if (selectedOfficers.length === 0) {
      toast.error('Please select at least one officer');
      return;
    }

    try {
      setDeploying(true);
      
      const deploymentData = {
        unitName: `Emergency Response - ${selectedEmergency.emergency_type}`,
        location: {
          address: selectedEmergency.location_name,
          latitude: parseFloat(selectedEmergency.latitude) || -1.9441,
          longitude: parseFloat(selectedEmergency.longitude) || 30.0619
        },
        officers: selectedOfficers,
        status: 'Active',
        emergencyId: selectedEmergency.id,
        priority: selectedEmergency.severity === 'critical' ? 'urgent' : 'high',
        instructions: deploymentInstructions
      };

      const response = await deploymentService.create(deploymentData);
      
      if (response.success) {
        toast.success(`🚔 ${selectedOfficers.length} officer(s) deployed! Waiting for acknowledgment...`, {
          duration: 5000
        });
        
        // Track deployed officers
        const newDeployed = {};
        selectedOfficers.forEach(id => {
          const officer = availableOfficers.find(o => o.id === id);
          newDeployed[id] = {
            name: officer?.full_name || 'Officer',
            deploymentId: response.data?.id,
            acknowledged: false,
            status: 'assigned'
          };
        });
        setDeployedOfficers(prev => ({ ...prev, ...newDeployed }));
        
        // Update emergency status to dispatched
        await axios.put(`/api/emergency/${selectedEmergency.id}/status`, { status: 'active' });
        
        setShowDeployModal(false);
        setSelectedOfficers([]);
      }
    } catch (error) {
      console.error('Error deploying officers:', error);
      toast.error('Failed to deploy officers');
    } finally {
      setDeploying(false);
    }
  };

  if (!isAuthenticated) {
    return <Navigate to="/login" />;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <Users className="w-8 h-8 text-orange-500" />
            Emergency Response
          </h1>
          <div className="flex items-center gap-3 mt-1">
            <p className="text-gray-400">Manage critical emergency situations and coordinate response teams</p>
            <div className={`flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${isConnected ? 'bg-green-500/10 text-green-500 border border-green-500/20' : 'bg-red-500/10 text-red-500 border border-red-500/20'
              }`}>
              <span className={`w-1.5 h-1.5 rounded-full ${isConnected ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`}></span>
              {isConnected ? 'Live' : 'Offline'}
            </div>
          </div>
        </div>
        <button
          onClick={fetchEmergencies}
          className="bg-slate-800 hover:bg-slate-700 text-white px-4 py-2 rounded-lg transition-colors text-sm font-medium"
        >
          Refresh
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500"></div>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6">
          {emergencies.length > 0 ? (
            emergencies.map((emergency) => (
              <div
                key={emergency.id}
                className={`bg-slate-800/50 backdrop-blur-md border rounded-xl p-6 transition-all ${emergency.status === 'pending' ? 'border-red-500/50 shadow-[0_0_15px_rgba(239,68,68,0.2)]' :
                  emergency.status === 'active' ? 'border-orange-500/50' :
                    'border-white/5'
                  }`}
              >
                <div className="flex flex-col md:flex-row justify-between gap-6">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-3">
                      <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${emergency.severity === 'critical' ? 'bg-red-500 text-white animate-pulse' :
                        emergency.severity === 'high' ? 'bg-orange-500 text-white' :
                          'bg-yellow-500 text-white'
                        }`}>
                        {emergency.severity} Priority
                      </span>
                      {emergency.source === 'ai' ? (
                        <span className="bg-cyan-500/20 text-cyan-400 border border-cyan-500/30 px-2 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider flex items-center gap-1">
                          <Activity className="w-3 h-3" /> AI Detected
                        </span>
                      ) : (
                        <span className="bg-blue-500/20 text-blue-400 border border-blue-500/30 px-2 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider flex items-center gap-1">
                          <Users className="w-3 h-3" /> Manual Report
                        </span>
                      )}
                      <span className={`text-xs font-mono text-gray-400 flex items-center gap-1`}>
                        <Clock className="w-3 h-3" />
                        {new Date(emergency.created_at).toLocaleString()}
                      </span>
                    </div>

                    <h3 className="text-xl font-bold text-white mb-2">{emergency.emergency_type}</h3>
                    <p className="text-gray-300 mb-4">{emergency.description}</p>

                    <div className="flex flex-wrap gap-4 text-sm text-gray-400">
                      <div className="flex items-center gap-2 bg-slate-900/50 px-3 py-1.5 rounded-lg">
                        <MapPin className="w-4 h-4 text-blue-400" />
                        {emergency.location_name}
                      </div>
                      <div className="flex items-center gap-2 bg-slate-900/50 px-3 py-1.5 rounded-lg">
                        <Phone className="w-4 h-4 text-green-400" />
                        {emergency.contact_phone}
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-col justify-center gap-3 min-w-[200px]">
                    <div className="text-center mb-2">
                      <span className="text-xs text-gray-500 uppercase tracking-wider">Current Status</span>
                      <p className={`font-bold ${emergency.status === 'resolved' ? 'text-green-400' :
                        emergency.status === 'active' ? 'text-orange-400' :
                          'text-red-400'
                        }`}>
                        {emergency.status.toUpperCase()}
                      </p>
                    </div>

                    {emergency.status !== 'resolved' && (
                      <div className="grid grid-cols-2 gap-2">
                        {/* Deploy Officer Button - Primary Action */}
                        <button
                          onClick={() => openDeployModal(emergency)}
                          className="bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white px-4 py-2 rounded-lg text-sm font-bold transition-all flex items-center justify-center gap-2 col-span-2 shadow-lg shadow-blue-500/20"
                        >
                          <Shield className="w-4 h-4" /> Deploy Officer
                        </button>
                        
                        <button
                          onClick={() => handleStatusUpdate(emergency.id, 'resolved')}
                          className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-1"
                        >
                          <CheckCircle className="w-4 h-4" /> Resolve
                        </button>
                        <button
                          onClick={() => handleStatusUpdate(emergency.id, 'cancelled')}
                          className="bg-slate-700 hover:bg-slate-600 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-1"
                        >
                          <XCircle className="w-4 h-4" /> Cancel
                        </button>
                        <button
                          onClick={() => downloadEmergencyReport(emergency.id)}
                          className="bg-blue-600/20 hover:bg-blue-600/30 text-blue-400 border border-blue-500/30 px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-1 col-span-2"
                        >
                          <Download className="w-4 h-4" /> Download Official Report
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))
          ) : (
            <div className="text-center py-12 bg-slate-800/30 rounded-xl border border-white/5">
              <CheckCircle className="w-16 h-16 text-green-500/50 mx-auto mb-4" />
              <h3 className="text-xl font-bold text-white mb-2">All Clear</h3>
              <p className="text-gray-400">No active emergency alerts at the moment.</p>
            </div>
          )}
        </div>
      )}

      {/* Deploy Officer Modal */}
      {showDeployModal && selectedEmergency && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-2xl w-full max-h-[85vh] overflow-hidden shadow-2xl flex flex-col">
            {/* Modal Header */}
            <div className="bg-gradient-to-r from-blue-600 to-blue-800 p-4 flex items-center justify-between flex-shrink-0">
              <div className="flex items-center gap-3">
                <Shield className="w-6 h-6 text-white" />
                <div>
                  <h2 className="text-lg font-bold text-white">Deploy Officers</h2>
                  <p className="text-blue-200 text-sm">{selectedEmergency.emergency_type} at {selectedEmergency.location_name}</p>
                </div>
              </div>
              <button 
                onClick={() => setShowDeployModal(false)}
                className="text-white/80 hover:text-white p-1"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            {/* Emergency Details */}
            <div className="p-4 border-b border-slate-700 bg-slate-800/50 flex-shrink-0">
              <div className="flex items-center gap-4 text-sm">
                <span className={`px-3 py-1 rounded-full font-bold uppercase ${
                  selectedEmergency.severity === 'critical' ? 'bg-red-500 text-white' :
                  selectedEmergency.severity === 'high' ? 'bg-orange-500 text-white' :
                  'bg-yellow-500 text-white'
                }`}>
                  {selectedEmergency.severity}
                </span>
                <div className="flex items-center gap-2 text-gray-300">
                  <MapPin className="w-4 h-4 text-blue-400" />
                  {selectedEmergency.location_name}
                </div>
                <div className="flex items-center gap-2 text-gray-300">
                  <Clock className="w-4 h-4 text-gray-400" />
                  {new Date(selectedEmergency.created_at).toLocaleTimeString()}
                </div>
              </div>
              <p className="text-gray-400 text-sm mt-2">{selectedEmergency.description}</p>
            </div>

            {/* Instructions Input */}
            <div className="p-4 border-b border-slate-700 flex-shrink-0">
              <label className="block text-sm font-medium text-gray-300 mb-2">Deployment Instructions</label>
              <textarea
                value={deploymentInstructions}
                onChange={(e) => setDeploymentInstructions(e.target.value)}
                className="w-full bg-slate-800 border border-slate-600 rounded-lg px-3 py-2 text-white text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                rows={2}
                placeholder="Enter specific instructions for deployed officers..."
              />
            </div>

            {/* Officer Selection */}
            <div className="p-4 flex-1 overflow-y-auto min-h-0">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-medium text-gray-300">Select Officers to Deploy</h3>
                <span className="text-xs text-blue-400">{selectedOfficers.length} selected</span>
              </div>

              {loadingOfficers ? (
                <div className="flex justify-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
                </div>
              ) : availableOfficers.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  {availableOfficers.map((officer) => {
                    const isDeployed = deployedOfficers[officer.id];
                    const isSelected = selectedOfficers.includes(officer.id);
                    
                    return (
                      <div
                        key={officer.id}
                        onClick={() => !isDeployed && toggleOfficerSelection(officer.id)}
                        className={`p-3 rounded-lg border cursor-pointer transition-all ${
                          isDeployed 
                            ? 'bg-green-500/10 border-green-500/50 cursor-default'
                            : isSelected 
                              ? 'bg-blue-500/20 border-blue-500 shadow-lg shadow-blue-500/10' 
                              : 'bg-slate-800 border-slate-600 hover:border-slate-500'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm ${
                              isDeployed ? 'bg-green-500 text-white' :
                              isSelected ? 'bg-blue-500 text-white' : 'bg-slate-700 text-gray-300'
                            }`}>
                              {officer.full_name?.split(' ').map(n => n[0]).join('').slice(0, 2) || 'OF'}
                            </div>
                            <div>
                              <p className="font-medium text-white text-sm">{officer.full_name}</p>
                              <p className="text-xs text-gray-400">Badge: {officer.badge_number || 'N/A'}</p>
                            </div>
                          </div>
                          
                          {isDeployed ? (
                            <div className="flex items-center gap-1 text-green-400 text-xs">
                              {isDeployed.acknowledged ? (
                                <>
                                  <UserCheck className="w-4 h-4" />
                                  <span>Acknowledged</span>
                                </>
                              ) : (
                                <>
                                  <Radio className="w-4 h-4 animate-pulse" />
                                  <span>Pending</span>
                                </>
                              )}
                            </div>
                          ) : isSelected ? (
                            <CheckCircle className="w-5 h-5 text-blue-400" />
                          ) : null}
                        </div>
                        
                        {isDeployed && isDeployed.status && (
                          <div className="mt-2 text-xs">
                            <span className={`px-2 py-0.5 rounded-full ${
                              isDeployed.status === 'on_scene' ? 'bg-green-500/20 text-green-400' :
                              isDeployed.status === 'en_route' ? 'bg-blue-500/20 text-blue-400' :
                              'bg-gray-500/20 text-gray-400'
                            }`}>
                              {isDeployed.status.replace('_', ' ').toUpperCase()}
                            </span>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="text-center py-8 text-gray-400">
                  <Users className="w-12 h-12 mx-auto mb-2 opacity-50" />
                  <p>No available officers</p>
                </div>
              )}
            </div>

            {/* Modal Footer - Always visible */}
            <div className="p-4 bg-slate-800/50 border-t border-slate-700 flex items-center justify-between flex-shrink-0">
              <button
                onClick={() => setShowDeployModal(false)}
                className="px-4 py-2 text-gray-400 hover:text-white transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleDeployOfficers}
                disabled={selectedOfficers.length === 0 || deploying}
                className={`px-6 py-2 rounded-lg font-bold flex items-center gap-2 transition-all ${
                  selectedOfficers.length === 0 || deploying
                    ? 'bg-gray-600 text-gray-400 cursor-not-allowed'
                    : 'bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white shadow-lg shadow-blue-500/20'
                }`}
              >
                {deploying ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    Deploying...
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4" />
                    Deploy {selectedOfficers.length} Officer{selectedOfficers.length !== 1 ? 's' : ''}
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Emergency;