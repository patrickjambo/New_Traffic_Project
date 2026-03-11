import React, { createContext, useContext, useState, useEffect, useCallback, useMemo, useRef } from 'react';
import axios from '../config/axios';
import toast from 'react-hot-toast';
import { useWebSocket } from './WebSocketContext';
import { useAuth } from './AuthContext';

const DataContext = createContext();

export const useData = () => {
  const context = useContext(DataContext);
  if (!context) {
    throw new Error('useData must be used within DataProvider');
  }
  return context;
};

export const DataProvider = ({ children }) => {
  const [incidents, setIncidents] = useState([]);
  const [emergencies, setEmergencies] = useState([]);
  const [deployments, setDeployments] = useState([]);
  const [availableOfficers, setAvailableOfficers] = useState([]);
  const [statistics, setStatistics] = useState(null);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);

  // 🔥 Track shown notifications to prevent duplicates
  const shownIncidentIds = useRef(new Set());
  const shownEmergencyIds = useRef(new Set());
  const shownDeploymentIds = useRef(new Set());

  const { subscribe, isConnected } = useWebSocket();
  const { user } = useAuth();
  
  // Check if user is district admin
  const isDistrictAdmin = user?.role === 'district_admin';
  const userDistrictId = user?.districtId;

  // Helper function to check if an item belongs to user's district
  const belongsToUserDistrict = useCallback((item) => {
    if (!isDistrictAdmin || !userDistrictId) return true; // Super admin sees all
    
    // Check district_id on the item
    if (item.district_id) return item.district_id === userDistrictId;
    
    // Check by location (Kigali districts approximate bounds)
    if (item.latitude && item.longitude) {
      const lat = parseFloat(item.latitude);
      const lng = parseFloat(item.longitude);
      
      // Approximate district bounds for Kigali
      const districtBounds = {
        1: { name: 'Nyarugenge', latMin: -1.98, latMax: -1.93, lngMin: 30.02, lngMax: 30.08 },
        2: { name: 'Gasabo', latMin: -1.95, latMax: -1.88, lngMin: 30.05, lngMax: 30.15 },
        3: { name: 'Kicukiro', latMin: -2.02, latMax: -1.96, lngMin: 30.05, lngMax: 30.15 },
      };
      
      const bounds = districtBounds[userDistrictId];
      if (bounds) {
        return lat >= bounds.latMin && lat <= bounds.latMax && 
               lng >= bounds.lngMin && lng <= bounds.lngMax;
      }
    }
    
    return true; // Default: show if can't determine
  }, [isDistrictAdmin, userDistrictId]);

  // Filtered data for district admins
  const filteredIncidents = useMemo(() => {
    if (!isDistrictAdmin) return incidents;
    return incidents.filter(belongsToUserDistrict);
  }, [incidents, isDistrictAdmin, belongsToUserDistrict]);

  const filteredEmergencies = useMemo(() => {
    if (!isDistrictAdmin) return emergencies;
    return emergencies.filter(belongsToUserDistrict);
  }, [emergencies, isDistrictAdmin, belongsToUserDistrict]);

  const filteredDeployments = useMemo(() => {
    if (!isDistrictAdmin) return deployments;
    return deployments.filter(d => {
      if (d.district_id) return d.district_id === userDistrictId;
      return belongsToUserDistrict(d);
    });
  }, [deployments, isDistrictAdmin, userDistrictId, belongsToUserDistrict]);

  const filteredOfficers = useMemo(() => {
    if (!isDistrictAdmin) return availableOfficers;
    return availableOfficers.filter(o => {
      if (o.district_id) return o.district_id === userDistrictId;
      if (o.assigned_district_id) return o.assigned_district_id === userDistrictId;
      return belongsToUserDistrict(o);
    });
  }, [availableOfficers, isDistrictAdmin, userDistrictId, belongsToUserDistrict]);

  // ============================================
  // Real-time Event Handlers
  // ============================================

  // Handle new incident
  const handleNewIncident = useCallback((incident) => {
    const incidentId = incident.id?.toString() || incident.incidentId?.toString();
    
    // 🔥 Check for duplicate notification
    if (incidentId && shownIncidentIds.current.has(incidentId)) {
      console.log('⚠️ Skipping duplicate incident notification:', incidentId);
      return;
    }
    
    console.log('🆕 New incident received:', incident);
    
    // Mark as shown
    if (incidentId) {
      shownIncidentIds.current.add(incidentId);
      // Clear old IDs after 5 minutes to prevent memory leak
      setTimeout(() => shownIncidentIds.current.delete(incidentId), 300000);
    }
    
    setIncidents(prev => {
      // Check if already in list
      if (prev.some(i => i.id === incident.id)) return prev;
      return [incident, ...prev];
    });

    // Show toast notification (only once)
    toast.success(`New ${incident.type || 'Traffic'} incident reported`, {
      icon: '🚨',
      duration: 4000,
      id: `incident-${incidentId}`, // Prevent duplicate toasts
    });

    // Update statistics
    setStatistics(prev => prev ? {
      ...prev,
      total: (prev.total || 0) + 1,
      pending: (prev.pending || 0) + 1,
    } : prev);
  }, []);

  // Handle incident update
  const handleIncidentUpdate = useCallback((update) => {
    console.log('🔄 Incident update received:', update);
    setIncidents(prev =>
      prev.map(inc => inc.id === update.id ? { ...inc, ...update } : inc)
    );
    // Don't show toast for every update - too noisy
  }, []);

  // Handle new emergency
  const handleNewEmergency = useCallback((emergency) => {
    const emergencyId = emergency.id?.toString() || emergency.emergencyId?.toString();
    
    // 🔥 Check for duplicate notification
    if (emergencyId && shownEmergencyIds.current.has(emergencyId)) {
      console.log('⚠️ Skipping duplicate emergency notification:', emergencyId);
      return;
    }
    
    console.log('🚨 New emergency received:', emergency);
    
    // Mark as shown
    if (emergencyId) {
      shownEmergencyIds.current.add(emergencyId);
      setTimeout(() => shownEmergencyIds.current.delete(emergencyId), 300000);
    }
    
    // Normalize the emergency data to match database format
    const normalizedEmergency = {
      id: emergency.id,
      emergency_type: emergency.type || emergency.emergency_type,
      severity: emergency.severity,
      status: emergency.status || 'pending',
      location_name: emergency.location?.name || emergency.location_name || 'Unknown',
      latitude: emergency.location?.latitude || emergency.latitude,
      longitude: emergency.location?.longitude || emergency.longitude,
      description: emergency.description,
      services_needed: emergency.servicesNeeded || emergency.services_needed,
      contact_phone: emergency.contactPhone || emergency.contact_phone,
      created_at: emergency.createdAt || emergency.created_at || new Date().toISOString(),
      source: emergency.source || 'manual',
      ...emergency,
    };
    
    setEmergencies(prev => {
      // Check if this emergency already exists (by real ID)
      const existsById = prev.some(e => e.id === normalizedEmergency.id && !e._isOptimistic);
      if (existsById) {
        return prev.map(e => e.id === normalizedEmergency.id ? { ...e, ...normalizedEmergency } : e);
      }
      
      // Check if there's an optimistic entry that matches (remove it and add real one)
      const hasOptimistic = prev.some(e => e._isOptimistic);
      if (hasOptimistic) {
        // Remove optimistic entries and add the real one
        const withoutOptimistic = prev.filter(e => !e._isOptimistic);
        return [normalizedEmergency, ...withoutOptimistic];
      }
      
      return [normalizedEmergency, ...prev];
    });

    // Only show alert toast on admin pages (not on public reporting pages)
    // Check if we're on an admin route (Dashboard, Emergency, etc.)
    const isAdminPage = window.location.pathname.includes('/dashboard') || 
                        window.location.pathname.includes('/emergency') ||
                        window.location.pathname.includes('/incidents') ||
                        window.location.pathname.includes('/reports') ||
                        window.location.pathname.includes('/deployments') ||
                        window.location.pathname.includes('/officers');
    
    if (isAdminPage) {
      toast.error(`🚨 EMERGENCY: ${normalizedEmergency.emergency_type} - ${normalizedEmergency.severity}`, {
        icon: '🚨',
        duration: 8000,
        id: `emergency-${emergencyId}`, // Prevent duplicate toasts
      });
    }
  }, []);

  // Handle emergency update
  const handleEmergencyUpdate = useCallback((update) => {
    console.log('🔄 Emergency update received:', update);
    // Handle both 'id' and 'emergencyId' field names
    const emergencyId = update.id || update.emergencyId;
    if (!emergencyId) return;
    
    setEmergencies(prev =>
      prev.map(em => {
        if (em.id === emergencyId || em.id === parseInt(emergencyId)) {
          return { 
            ...em, 
            ...update,
            id: em.id, // Keep original id
            status: update.status || em.status,
            assigned_to: update.assigned_to || update.officerId || em.assigned_to,
            assigned_to_name: update.assigned_to_name || update.responder_name || update.officerName || em.assigned_to_name,
            responder_name: update.responder_name || update.officerName || update.assigned_to_name || em.responder_name,
          };
        }
        return em;
      })
    );
    // Don't show toast for every status update - too noisy
  }, []);

  // Handle AI analysis complete
  const handleAnalysisComplete = useCallback((analysis) => {
    console.log('🤖 Analysis complete:', analysis);
    if (analysis.incidentDetected) {
      toast.success(`AI detected ${analysis.detectedType} (${Math.round(analysis.confidence * 100)}% confidence)`, {
        icon: '🤖',
        duration: 6000,
      });
    }
  }, []);

  // Handle new notification
  const handleNewNotification = useCallback((notification) => {
    console.log('🔔 New notification:', notification);
    setNotifications(prev => [notification, ...prev]);
    setUnreadCount(prev => prev + 1);
    // Don't show toast for every notification - use notification bell instead
  }, []);

  // Handle new deployment
  const handleNewDeployment = useCallback((deployment) => {
    const deploymentId = deployment.id?.toString();
    
    // Check for duplicate
    if (deploymentId && shownDeploymentIds.current.has(deploymentId)) {
      console.log('⚠️ Skipping duplicate deployment notification:', deploymentId);
      return;
    }
    
    console.log('👮 New deployment received:', deployment);
    
    if (deploymentId) {
      shownDeploymentIds.current.add(deploymentId);
      setTimeout(() => shownDeploymentIds.current.delete(deploymentId), 300000);
    }
    
    setDeployments(prev => {
      if (prev.some(d => d.id === deployment.id)) return prev;
      return [deployment, ...prev];
    });

    toast.success(`Officer deployed to ${deployment.type || 'incident'}`, {
      icon: '👮',
      duration: 4000,
      id: `deployment-${deploymentId}`,
    });
  }, []);

  // Handle deployment update
  const handleDeploymentUpdate = useCallback((update) => {
    console.log('🔄 Deployment update received:', update);
    setDeployments(prev =>
      prev.map(dep => dep.id === update.id ? { ...dep, ...update } : dep)
    );
    // Don't show toast for every update
  }, []);

  // Handle officer response to emergency (real-time)
  const handleOfficerResponse = useCallback((data) => {
    console.log('🚔 Officer responding to emergency:', data);
    const emergencyId = data.emergencyId || data.id;
    const officerName = data.officerName || data.responder_name || data.assigned_to_name || 'Officer';
    const officerId = data.officerId || data.assigned_to;
    const newStatus = data.status || 'dispatched'; // Default to dispatched when officer accepts
    
    if (officerName && officerName !== 'Officer') {
      toast.success(`🚔 ${officerName} is responding!`, {
        icon: '�',
        duration: 4000,
        id: `emergency-response-${emergencyId}`,
      });
    }
    
    // INSTANT: Update local state with responding officer info
    if (emergencyId) {
      setEmergencies(prev =>
        prev.map(em => {
          if (em.id === emergencyId || em.id === parseInt(emergencyId)) {
            return { 
              ...em, 
              status: newStatus,
              assigned_to: officerId,
              assigned_to_name: officerName,
              assigned_officer_id: officerId,
              assigned_officer_name: officerName,
              responder_name: officerName,
            };
          }
          return em;
        })
      );
    }
  }, []);

  // Handle emergency status change
  const handleEmergencyStatusChange = useCallback((data) => {
    console.log('📊 Emergency status changed:', data);
    const emergencyId = data.emergencyId || data.id;
    const newStatus = data.newStatus || data.status;
    
    // Update local state with new status
    if (emergencyId && newStatus) {
      setEmergencies(prev =>
        prev.map(em => {
          if (em.id === emergencyId || em.id === parseInt(emergencyId)) {
            return { 
              ...em, 
              status: newStatus,
              assigned_to_name: data.responder_name || data.officerName || em.assigned_to_name,
              responder_name: data.responder_name || data.officerName || em.responder_name,
            };
          }
          return em;
        })
      );
    }
  }, []);
  
  // Handle emergency accepted (same as officer response)
  const handleEmergencyAccepted = useCallback((data) => {
    console.log('✅ Emergency accepted:', data);
    const emergencyId = data.emergencyId || data.id;
    const officerName = data.officerName || data.responder_name || data.acceptedBy?.officerName || 'Officer';
    const officerId = data.officerId || data.assigned_to || data.acceptedBy?.officerId;
    
    if (officerName && officerName !== 'Officer') {
      // Use same id pattern as handleOfficerResponse to prevent duplicate toasts
      toast.success(`🚔 ${officerName} is responding!`, {
        icon: '✅',
        duration: 5000,
        id: `emergency-response-${emergencyId}`,
      });
    }
    
    // INSTANT: Update local state
    if (emergencyId) {
      setEmergencies(prev =>
        prev.map(em => {
          if (em.id === emergencyId || em.id === parseInt(emergencyId)) {
            return { 
              ...em, 
              status: 'dispatched',
              assigned_to: officerId,
              assigned_to_name: officerName,
              responder_name: officerName,
            };
          }
          return em;
        })
      );
    }
  }, []);

  // Handle officer assigned
  const handleOfficerAssigned = useCallback((assignment) => {
    console.log('👮 Officer assigned:', assignment);
    // Only show if we have a name
    if (assignment.officerName) {
      toast.success(`${assignment.officerName} assigned`, {
        icon: '📍',
        duration: 4000,
        id: `assignment-${assignment.incidentId || assignment.officerId}`,
      });
    }
    // Refresh available officers
    fetchAvailableOfficers();
  }, []);

  // ============================================
  // Subscribe to WebSocket events
  // ============================================

  useEffect(() => {
    if (!isConnected) return;

    const unsubscribers = [
      subscribe('incident:new', handleNewIncident),
      subscribe('incident:update', handleIncidentUpdate),
      subscribe('incident:alert', handleNewIncident), // Alerts are high priority new incidents
      subscribe('emergency:new', handleNewEmergency),
      subscribe('emergency:update', handleEmergencyUpdate),
      subscribe('emergency:alert', handleNewEmergency),
      subscribe('emergency:accepted', handleEmergencyAccepted), // INSTANT: Officer accepted emergency
      subscribe('emergency:officer_response', handleOfficerResponse),
      subscribe('emergency:status_change', handleEmergencyStatusChange),
      subscribe('emergency:status_changed', handleEmergencyStatusChange), // Alternate event name
      subscribe('analysis:complete', handleAnalysisComplete),
      subscribe('notification:new', handleNewNotification),
      subscribe('deployment:new', handleNewDeployment),
      subscribe('deployment:update', handleDeploymentUpdate),
      subscribe('officer:assigned', handleOfficerAssigned),
    ];

    return () => {
      unsubscribers.forEach(unsub => unsub());
    };
  }, [isConnected, subscribe, handleNewIncident, handleIncidentUpdate, handleNewEmergency, handleEmergencyUpdate, handleEmergencyAccepted, handleOfficerResponse, handleEmergencyStatusChange, handleAnalysisComplete, handleNewNotification, handleNewDeployment, handleDeploymentUpdate, handleOfficerAssigned]);

  // ============================================
  // API Functions
  // ============================================

  // Fetch incidents
  const fetchIncidents = async () => {
    try {
      const response = await axios.get('/api/incidents');
      if (response.data.success) {
        setIncidents(response.data.data || []);
      }
    } catch (error) {
      console.error('❌ Error fetching incidents:', error);
    }
  };

  // Fetch emergencies - preserves optimistic entries
  const fetchEmergencies = async () => {
    try {
      const response = await axios.get('/api/emergency');
      if (response.data.success) {
        const serverEmergencies = response.data.data || [];
        // Preserve any optimistic entries that haven't been confirmed yet
        setEmergencies(prev => {
          const optimisticEntries = prev.filter(em => em._isOptimistic);
          // Merge: server data + optimistic entries not yet in server data
          const serverIds = new Set(serverEmergencies.map(em => em.id));
          const pendingOptimistic = optimisticEntries.filter(em => !serverIds.has(em.id));
          return [...pendingOptimistic, ...serverEmergencies];
        });
      }
    } catch (error) {
      console.error('❌ Error fetching emergencies:', error);
    }
  };

  // Fetch statistics
  const fetchStatistics = async () => {
    try {
      const response = await axios.get('/api/incidents/statistics');
      if (response.data.success) {
        setStatistics(response.data.data);
      }
    } catch (error) {
      console.warn('⚠️ Statistics endpoint not available');
      setStatistics({
        total: incidents.length,
        pending: incidents.filter(i => i.status === 'pending').length,
        in_progress: incidents.filter(i => i.status === 'in_progress').length,
        resolved: incidents.filter(i => i.status === 'resolved').length,
      });
    }
  };

  // Fetch notifications
  const fetchNotifications = async () => {
    try {
      const response = await axios.get('/api/notifications?limit=20');
      if (Array.isArray(response.data)) {
        setNotifications(response.data);
        setUnreadCount(response.data.filter(n => !n.is_read).length);
      }
    } catch (error) {
      console.warn('⚠️ Notifications fetch failed');
    }
  };

  // Mark notification as read
  const markNotificationRead = async (notificationId) => {
    try {
      await axios.put(`/api/notifications/${notificationId}/read`);
      setNotifications(prev =>
        prev.map(n => n.id === notificationId ? { ...n, is_read: true } : n)
      );
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  };

  // Mark all notifications as read
  const markAllNotificationsRead = async () => {
    try {
      await axios.put('/api/notifications/read-all');
      setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
      setUnreadCount(0);
    } catch (error) {
      console.error('Error marking all notifications as read:', error);
    }
  };

  // Report new incident with optimistic update and rollback
  const reportIncident = async (incidentData) => {
    // Create optimistic incident with temp ID
    const tempId = `temp_${Date.now()}`;
    const optimisticIncident = {
      id: tempId,
      ...incidentData,
      status: 'pending',
      created_at: new Date().toISOString(),
      _isOptimistic: true,
    };

    // Optimistically add to UI immediately
    setIncidents(prev => [optimisticIncident, ...prev]);

    try {
      // Send as FormData because the backend route uses multer (multipart/form-data)
      const formData = new FormData();
      Object.entries(incidentData).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          formData.append(key, value);
        }
      });
      const response = await axios.post('/api/incidents/report', formData);
      if (response.data.success) {
        const newIncident = response.data.data;
        // Replace optimistic entry with real data
        setIncidents(prev => prev.map(inc => 
          inc.id === tempId ? newIncident : inc
        ));
        toast.success('Incident reported successfully!');
        return { success: true, data: newIncident };
      }
      // Server returned failure - rollback
      setIncidents(prev => prev.filter(inc => inc.id !== tempId));
      toast.error('Failed to report incident');
      return { success: false, message: 'Failed to report incident' };
    } catch (error) {
      // Network/server error - rollback optimistic update
      setIncidents(prev => prev.filter(inc => inc.id !== tempId));
      console.error('Error reporting incident:', error);
      toast.error('Failed to report incident');
      return { success: false, message: error.message };
    }
  };

  // Report new emergency with optimistic update and rollback
  const reportEmergency = async (emergencyData) => {
    // Create optimistic emergency with temp ID and current timestamp
    const tempId = `temp_${Date.now()}`;
    const currentTimestamp = new Date().toISOString();
    const optimisticEmergency = {
      id: tempId,
      emergency_type: emergencyData.emergencyType,
      severity: emergencyData.severity,
      location_name: emergencyData.locationName,
      latitude: emergencyData.latitude,
      longitude: emergencyData.longitude,
      description: emergencyData.description,
      contact_phone: emergencyData.contactPhone,
      status: 'pending',
      created_at: currentTimestamp,
      _isOptimistic: true,
    };

    // Optimistically add to UI immediately
    setEmergencies(prev => [optimisticEmergency, ...prev]);

    try {
      const response = await axios.post('/api/emergency', emergencyData);
      if (response.data.success) {
        const newEmergency = response.data.data;
        // Ensure created_at is set (fallback to current time if missing)
        if (!newEmergency.created_at) {
          newEmergency.created_at = currentTimestamp;
        }
        // Mark as confirmed (not optimistic)
        newEmergency._isOptimistic = false;
        newEmergency.source = newEmergency.source || 'manual';
        
        // Replace optimistic entry with real data
        setEmergencies(prev => prev.map(em => 
          em.id === tempId ? newEmergency : em
        ));
        toast.success('Emergency reported successfully! Help is on the way.', {
          icon: '🚨',
          duration: 6000
        });
        return { success: true, data: newEmergency };
      }
      // Server returned failure - rollback
      setEmergencies(prev => prev.filter(em => em.id !== tempId));
      toast.error('Failed to report emergency');
      return { success: false, message: 'Failed to report emergency' };
    } catch (error) {
      // Network/server error - rollback optimistic update
      setEmergencies(prev => prev.filter(em => em.id !== tempId));
      console.error('Error reporting emergency:', error);
      toast.error('Failed to report emergency');
      return { success: false, message: error.message };
    }
  };

  // Update incident status with optimistic update and rollback
  const updateIncidentStatus = async (incidentId, status) => {
    // Store previous state for rollback
    const previousIncidents = [...incidents];
    
    // Optimistically update status
    setIncidents(prev => prev.map(inc => 
      inc.id === incidentId ? { ...inc, status, _pendingUpdate: true } : inc
    ));

    try {
      const response = await axios.patch(`/api/incidents/${incidentId}/status`, { status });
      if (response.data.success) {
        // Remove pending flag
        setIncidents(prev => prev.map(inc => 
          inc.id === incidentId ? { ...inc, status, _pendingUpdate: false } : inc
        ));
        toast.success('Status updated!');
        return { success: true };
      }
      // Server returned failure - rollback
      setIncidents(previousIncidents);
      toast.error('Failed to update status');
      return { success: false };
    } catch (error) {
      // Network/server error - rollback
      setIncidents(previousIncidents);
      console.error('Error updating status:', error);
      toast.error('Failed to update status');
      return { success: false };
    }
  };

  // Download emergency report
  const downloadEmergencyReport = async (emergencyId) => {
    try {
      const response = await axios.get(`/api/emergency/${emergencyId}/report`, {
        responseType: 'blob',
      });

      // Create a link and trigger download
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `emergency_report_${emergencyId}.txt`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);

      toast.success('Report downloaded successfully');
    } catch (error) {
      console.error('Error downloading report:', error);
      toast.error('Failed to download report');
    }
  };

  // ============================================
  // Deployment API Functions
  // ============================================

  // Fetch deployments
  const fetchDeployments = async () => {
    try {
      const response = await axios.get('/api/deployments');
      if (response.data.success) {
        setDeployments(response.data.data || []);
      }
    } catch (error) {
      console.warn('⚠️ Deployments fetch failed');
    }
  };

  // Fetch available officers
  const fetchAvailableOfficers = async () => {
    try {
      const response = await axios.get('/api/deployments/officers/available');
      if (response.data.success) {
        setAvailableOfficers(response.data.data || []);
      }
    } catch (error) {
      console.warn('⚠️ Available officers fetch failed');
    }
  };

  // Create deployment with optimistic update and rollback
  const createDeployment = async (deploymentData) => {
    // Create optimistic deployment with temp ID
    const tempId = `temp_${Date.now()}`;
    const optimisticDeployment = {
      id: tempId,
      unit_name: deploymentData.unitName,
      address: deploymentData.location?.address,
      latitude: deploymentData.location?.latitude,
      longitude: deploymentData.location?.longitude,
      status: 'Pending',
      created_at: new Date().toISOString(),
      officers: [],
      _isOptimistic: true,
    };

    // Optimistically add to UI immediately
    setDeployments(prev => [optimisticDeployment, ...prev]);

    try {
      const response = await axios.post('/api/deployments', deploymentData);
      if (response.data.success) {
        const newDeployment = response.data.data;
        // Replace optimistic entry with real data
        setDeployments(prev => prev.map(dep => 
          dep.id === tempId ? newDeployment : dep
        ));
        // Refresh available officers in background to reflect assignment
        fetchAvailableOfficers();
        toast.success('Deployment created successfully!');
        return { success: true, data: newDeployment };
      }
      // Server returned failure - rollback
      setDeployments(prev => prev.filter(dep => dep.id !== tempId));
      toast.error('Failed to create deployment');
      return { success: false, message: 'Failed to create deployment' };
    } catch (error) {
      // Network/server error - rollback optimistic update
      setDeployments(prev => prev.filter(dep => dep.id !== tempId));
      console.error('Error creating deployment:', error);
      toast.error('Failed to create deployment');
      return { success: false, message: error.message };
    }
  };

  // Assign officer to incident/emergency
  const assignOfficer = async (officerId, incidentId, emergencyId = null) => {
    try {
      const response = await axios.post('/api/deployments/assign', {
        officerId,
        incidentId,
        emergencyId,
      });
      if (response.data.success) {
        // Optimistic update: refresh deployments and available officers immediately
        fetchDeployments();
        fetchAvailableOfficers();
        toast.success(response.data.message);
        return { success: true, data: response.data.data };
      }
      return { success: false, message: 'Failed to assign officer' };
    } catch (error) {
      console.error('Error assigning officer:', error);
      toast.error('Failed to assign officer');
      return { success: false, message: error.message };
    }
  };

  // Update deployment status with optimistic update and rollback
  const updateDeploymentStatus = async (deploymentId, status) => {
    // Store previous state for rollback
    const previousDeployments = [...deployments];
    
    // Optimistically update status
    setDeployments(prev => prev.map(d => 
      d.id === deploymentId ? { ...d, status, _pendingUpdate: true } : d
    ));

    try {
      const response = await axios.put(`/api/deployments/${deploymentId}/status`, { status });
      if (response.data.success) {
        // Remove pending flag, confirm update
        setDeployments(prev => prev.map(d => 
          d.id === deploymentId ? { ...d, status, _pendingUpdate: false } : d
        ));
        toast.success('Deployment status updated!');
        return { success: true };
      }
      // Server returned failure - rollback
      setDeployments(previousDeployments);
      toast.error('Failed to update deployment status');
      return { success: false };
    } catch (error) {
      // Network/server error - rollback
      setDeployments(previousDeployments);
      console.error('Error updating deployment status:', error);
      toast.error('Failed to update deployment status');
      return { success: false };
    }
  };

  // Delete deployment with optimistic update and rollback
  const deleteDeployment = async (deploymentId) => {
    // Store the deployment for potential rollback
    const deletedDeployment = deployments.find(d => d.id === deploymentId);
    const previousDeployments = [...deployments];
    
    // Optimistically remove from UI immediately
    setDeployments(prev => prev.filter(d => d.id !== deploymentId));

    try {
      const response = await axios.delete(`/api/deployments/${deploymentId}`);
      if (response.data.success) {
        // Refresh available officers since they may now be free
        fetchAvailableOfficers();
        toast.success('Deployment deleted successfully');
        return { success: true };
      }
      // Server returned failure - rollback
      setDeployments(previousDeployments);
      toast.error('Failed to delete deployment');
      return { success: false };
    } catch (error) {
      // Network/server error - rollback
      setDeployments(previousDeployments);
      console.error('Error deleting deployment:', error);
      toast.error('Failed to delete deployment');
      return { success: false };
    }
  };

  // ============================================
  // Initial data load and refresh
  // ============================================

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      // Load all data in parallel for faster startup
      await Promise.all([
        fetchIncidents(),
        fetchEmergencies(),
        fetchStatistics(),
        fetchNotifications(),
        fetchDeployments(),
        fetchAvailableOfficers(),
      ]);
      setLoading(false);
    };

    loadData();

    // Refresh critical data every 10 seconds for real-time feel
    // This is a backup to WebSocket - if WS is working, these will just confirm data
    const quickRefresh = setInterval(() => {
      fetchStatistics();
      fetchIncidents();
      fetchEmergencies();
    }, 10000);

    // Full data refresh every 30 seconds as fallback for deployments
    const fullRefresh = setInterval(() => {
      fetchDeployments();
      fetchAvailableOfficers();
    }, 30000);

    return () => {
      clearInterval(quickRefresh);
      clearInterval(fullRefresh);
    };
  }, []);

  // Refresh data when WebSocket reconnects
  useEffect(() => {
    if (isConnected) {
      console.log('🔄 WebSocket connected - refreshing data');
      fetchIncidents();
      fetchEmergencies();
      fetchDeployments();
      fetchStatistics();
    }
  }, [isConnected]);

  const value = {
    // Data (filtered for district admins, full for super admin)
    incidents: filteredIncidents,
    emergencies: filteredEmergencies,
    deployments: filteredDeployments,
    availableOfficers: filteredOfficers,
    statistics,
    notifications,
    unreadCount,
    loading,
    isConnected,
    
    // District info for UI
    isDistrictAdmin,
    userDistrictId,
    userDistrictName: user?.districtName,

    // Actions
    fetchIncidents,
    fetchEmergencies,
    fetchDeployments,
    fetchAvailableOfficers,
    fetchStatistics,
    fetchNotifications,
    reportIncident,
    reportEmergency,
    updateIncidentStatus,
    downloadEmergencyReport,
    markNotificationRead,
    markAllNotificationsRead,
    createDeployment,
    assignOfficer,
    updateDeploymentStatus,
    deleteDeployment,
  };

  return <DataContext.Provider value={value}>{children}</DataContext.Provider>;
};

export default DataContext;
