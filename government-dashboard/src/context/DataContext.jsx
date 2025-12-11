import React, { createContext, useContext, useState, useEffect } from 'react';
import axios from '../config/axios';
import { io } from 'socket.io-client';
import toast from 'react-hot-toast';

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
  const [statistics, setStatistics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [socket, setSocket] = useState(null);

  // Initialize WebSocket connection
  useEffect(() => {
    // Delay WebSocket connection to prevent blocking
    const timer = setTimeout(() => {
      try {
        const newSocket = io('http://localhost:3000', {
          timeout: 5000,
          reconnection: false, // Prevent auto-reconnect on failure
        });

        newSocket.on('connect', () => {
          console.log('✅ WebSocket connected');
        });

        newSocket.on('connect_error', (error) => {
          console.log('⚠️ WebSocket connection failed (non-blocking)');
        });

        newSocket.on('incident:new', (incident) => {
          console.log('🆕 New incident received:', incident);
          setIncidents(prev => [incident, ...prev]);
          toast.success(`New incident reported: ${incident.incident_type}`, {
            icon: '🚨',
          });
        });

        newSocket.on('incident:update', (updatedIncident) => {
          console.log('🔄 Incident updated:', updatedIncident);
          setIncidents(prev =>
            prev.map(inc => inc.id === updatedIncident.id ? updatedIncident : inc)
          );
          toast.info('Incident status updated');
        });

        newSocket.on('emergency:new', (emergency) => {
          console.log('🚨 New emergency received:', emergency);
          setEmergencies(prev => [emergency, ...prev]);
          toast.error(`New Emergency: ${emergency.emergency_type}`, {
            icon: '🚨',
            duration: 5000
          });
        });

        newSocket.on('emergency:updated', (updatedEmergency) => {
          console.log('🔄 Emergency updated:', updatedEmergency);
          setEmergencies(prev =>
            prev.map(em => em.id === updatedEmergency.id ? updatedEmergency : em)
          );
          toast.info('Emergency status updated');
        });

        setSocket(newSocket);
      } catch (error) {
        console.log('⚠️ WebSocket error (non-blocking):', error);
      }
    }, 1000); // Wait 1 second after page load

    return () => {
      clearTimeout(timer);
      if (socket) {
        socket.close();
      }
    };
  }, []);

  // Fetch incidents
  const fetchIncidents = async () => {
    try {
      setLoading(true);
      console.log('📡 Fetching incidents from backend...');
      const response = await axios.get('/api/incidents');
      console.log('✅ Incidents response:', response.data);

      if (response.data.success) {
        const incidentsData = response.data.data.incidents || response.data.data; // Handle both formats
        if (Array.isArray(incidentsData)) {
          setIncidents(incidentsData);
          console.log(`✅ Loaded ${incidentsData.length} incidents`);
        } else {
          console.error('❌ Invalid incidents data format (expected array):', incidentsData);
          setIncidents([]);
        }
      }
    } catch (error) {
      console.error('❌ Error fetching incidents:', error);
      toast.error('Failed to load incidents');
    } finally {
      setLoading(false);
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
      console.warn('⚠️ Statistics endpoint not available (non-critical)');
      // Set default statistics if endpoint fails
      setStatistics({
        total: incidents.length,
        pending: incidents.filter(i => i.status === 'pending').length,
        in_progress: incidents.filter(i => i.status === 'in_progress').length,
        resolved: incidents.filter(i => i.status === 'resolved').length
      });
    }
  };

  // Initial data load
  useEffect(() => {
    // Set loading to false immediately to prevent blocking
    setLoading(false);

    // Fetch data asynchronously without blocking render
    setTimeout(() => {
      fetchIncidents();
      fetchEmergencies();
      fetchStatistics();
    }, 500);

    // Refresh data every 30 seconds
    const interval = setInterval(() => {
      fetchIncidents();
      fetchEmergencies();
      fetchStatistics();
    }, 30000);

    return () => clearInterval(interval);
  }, []);

  // Report new incident
  const reportIncident = async (incidentData) => {
    try {
      const response = await axios.post('/api/incidents', incidentData);

      if (response.data.success) {
        await fetchIncidents();
        toast.success('Incident reported successfully!');
        return { success: true };
      }

      return { success: false, message: 'Failed to report incident' };
    } catch (error) {
      console.error('Error reporting incident:', error);
      toast.error('Failed to report incident');
      return { success: false, message: error.message };
    }
  };

  // Update incident status
  const updateIncidentStatus = async (incidentId, status) => {
    try {
      const response = await axios.patch(`/api/incidents/${incidentId}/status`, { status });

      if (response.data.success) {
        await fetchIncidents();
        toast.success('Status updated successfully!');
        return { success: true };
      }

      return { success: false };
    } catch (error) {
      console.error('Error updating status:', error);
      toast.error('Failed to update status');
      return { success: false };
    }
  };

  const value = {
    incidents,
    emergencies,
    statistics,
    loading,
    socket,
    fetchIncidents,
    fetchStatistics,
    reportIncident,
    updateIncidentStatus,
  };

  return <DataContext.Provider value={value}>{children}</DataContext.Provider>;
};
