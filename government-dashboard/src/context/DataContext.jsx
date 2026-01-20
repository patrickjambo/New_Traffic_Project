import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import axios from '../config/axios';
import toast from 'react-hot-toast';
import { useWebSocket } from './WebSocketContext';

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

  const { subscribe, isConnected } = useWebSocket();

  // ============================================
  // Real-time Event Handlers
  // ============================================

  // Handle new incident
  const handleNewIncident = useCallback((incident) => {
    console.log('🆕 New incident received:', incident);
    setIncidents(prev => [incident, ...prev]);

    // Show toast notification
    toast.success(`New ${incident.type} incident reported`, {
      icon: '🚨',
      duration: 5000,
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
    toast.info(`Incident #${update.id} status: ${update.status}`, {
      icon: '📝',
    });
  }, []);

  // Handle new emergency
  const handleNewEmergency = useCallback((emergency) => {
    console.log('🚨 New emergency received:', emergency);
    setEmergencies(prev => [emergency, ...prev]);

    // Critical alert
    toast.error(`EMERGENCY: ${emergency.type} - ${emergency.severity}`, {
      icon: '🚨',
      duration: 10000,
    });
  }, []);

  // Handle emergency update
  const handleEmergencyUpdate = useCallback((update) => {
    console.log('🔄 Emergency update received:', update);
    setEmergencies(prev =>
      prev.map(em => em.id === update.id ? { ...em, ...update } : em)
    );
    toast.info(`Emergency #${update.id} status: ${update.status}`, {
      icon: '📋',
    });
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

    toast(notification.title, {
      icon: '🔔',
      duration: 4000,
    });
  }, []);

  // Handle new deployment
  const handleNewDeployment = useCallback((deployment) => {
    console.log('👮 New deployment received:', deployment);
    setDeployments(prev => [deployment, ...prev]);

    toast.success(`Officer deployed to ${deployment.type}`, {
      icon: '👮',
      duration: 5000,
    });
  }, []);

  // Handle deployment update
  const handleDeploymentUpdate = useCallback((update) => {
    console.log('🔄 Deployment update received:', update);
    setDeployments(prev =>
      prev.map(dep => dep.id === update.id ? { ...dep, ...update } : dep)
    );
  }, []);

  // Handle officer assigned
  const handleOfficerAssigned = useCallback((assignment) => {
    console.log('👮 Officer assigned:', assignment);
    toast.success(`${assignment.officerName} assigned to incident`, {
      icon: '📍',
      duration: 5000,
    });
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
      subscribe('analysis:complete', handleAnalysisComplete),
      subscribe('notification:new', handleNewNotification),
      subscribe('deployment:new', handleNewDeployment),
      subscribe('deployment:update', handleDeploymentUpdate),
      subscribe('officer:assigned', handleOfficerAssigned),
    ];

    return () => {
      unsubscribers.forEach(unsub => unsub());
    };
  }, [isConnected, subscribe, handleNewIncident, handleIncidentUpdate, handleNewEmergency, handleEmergencyUpdate, handleAnalysisComplete, handleNewNotification, handleNewDeployment, handleDeploymentUpdate, handleOfficerAssigned]);

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

  // Fetch emergencies
  const fetchEmergencies = async () => {
    try {
      const response = await axios.get('/api/emergency');
      if (response.data.success) {
        setEmergencies(response.data.data || []);
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

  // Report new incident
  const reportIncident = async (incidentData) => {
    try {
      const response = await axios.post('/api/incidents/report', incidentData);
      if (response.data.success) {
        toast.success('Incident reported successfully!');
        return { success: true, data: response.data.data };
      }
      return { success: false, message: 'Failed to report incident' };
    } catch (error) {
      console.error('Error reporting incident:', error);
      toast.error('Failed to report incident');
      return { success: false, message: error.message };
    }
  };

  // Report new emergency
  const reportEmergency = async (emergencyData) => {
    try {
      const response = await axios.post('/api/emergency', emergencyData);
      if (response.data.success) {
        toast.success('Emergency reported successfully! Help is on the way.', {
          icon: '🚨',
          duration: 6000
        });
        return { success: true, data: response.data.data };
      }
      return { success: false, message: 'Failed to report emergency' };
    } catch (error) {
      console.error('Error reporting emergency:', error);
      toast.error('Failed to report emergency');
      return { success: false, message: error.message };
    }
  };

  // Update incident status
  const updateIncidentStatus = async (incidentId, status) => {
    try {
      const response = await axios.patch(`/api/incidents/${incidentId}/status`, { status });
      if (response.data.success) {
        // Optimistic update - update will also come via WebSocket
        toast.success('Status updated!');
        return { success: true };
      }
      return { success: false };
    } catch (error) {
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

  // Create deployment
  const createDeployment = async (deploymentData) => {
    try {
      const response = await axios.post('/api/deployments', deploymentData);
      if (response.data.success) {
        toast.success('Deployment created successfully!');
        return { success: true, data: response.data.data };
      }
      return { success: false, message: 'Failed to create deployment' };
    } catch (error) {
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

  // Update deployment status
  const updateDeploymentStatus = async (deploymentId, status) => {
    try {
      const response = await axios.put(`/api/deployments/${deploymentId}/status`, { status });
      if (response.data.success) {
        toast.success('Deployment status updated!');
        return { success: true };
      }
      return { success: false };
    } catch (error) {
      console.error('Error updating deployment status:', error);
      toast.error('Failed to update deployment status');
      return { success: false };
    }
  };

  // ============================================
  // Initial data load and refresh
  // ============================================

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
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

    // Refresh data periodically (as backup to WebSocket)
    const interval = setInterval(() => {
      fetchStatistics();
    }, 60000); // Every minute

    return () => clearInterval(interval);
  }, []);

  const value = {
    // Data
    incidents,
    emergencies,
    deployments,
    availableOfficers,
    statistics,
    notifications,
    unreadCount,
    loading,
    isConnected,

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
  };

  return <DataContext.Provider value={value}>{children}</DataContext.Provider>;
};

export default DataContext;
