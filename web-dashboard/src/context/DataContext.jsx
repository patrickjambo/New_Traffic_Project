import React, { createContext, useState, useContext, useEffect } from 'react';
import axios from 'axios';
import io from 'socket.io-client';

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
  const [stats, setStats] = useState({
    totalIncidents: 0,
    activeEmergencies: 0,
    resolvedToday: 0,
    mobileUploads: 0
  });
  const [loading, setLoading] = useState(true);
  const [notifications, setNotifications] = useState([]);

  // Initialize Socket.IO for real-time updates
  useEffect(() => {
    const socket = io('http://localhost:3000', {
      transports: ['websocket', 'polling']
    });

    socket.on('connect', () => {
      console.log('Connected to real-time server');
    });

    socket.on('new_incident', (incident) => {
      setIncidents(prev => [incident, ...prev]);
      addNotification({
        type: 'info',
        title: 'New Incident Reported',
        message: `${incident.incident_type} at ${incident.location}`
      });
      fetchStats();
    });

    socket.on('emergency_alert', (emergency) => {
      setEmergencies(prev => [emergency, ...prev]);
      addNotification({
        type: 'emergency',
        title: 'EMERGENCY ALERT',
        message: `${emergency.incident_type} at ${emergency.location}`
      });
      fetchStats();
    });

    socket.on('incident_updated', (updated) => {
      setIncidents(prev => 
        prev.map(inc => inc.id === updated.id ? updated : inc)
      );
    });

    return () => socket.disconnect();
  }, []);

  // Fetch initial data
  useEffect(() => {
    fetchIncidents();
    fetchEmergencies();
    fetchStats();
    
    // Refresh data every 30 seconds
    const interval = setInterval(() => {
      fetchIncidents();
      fetchEmergencies();
      fetchStats();
    }, 30000);

    return () => clearInterval(interval);
  }, []);

  const fetchIncidents = async () => {
    try {
      const response = await axios.get('/api/incidents');
      setIncidents(response.data);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching incidents:', error);
      setLoading(false);
    }
  };

  const fetchEmergencies = async () => {
    try {
      const response = await axios.get('/api/incidents', {
        params: { emergency: true }
      });
      setEmergencies(response.data);
    } catch (error) {
      console.error('Error fetching emergencies:', error);
    }
  };

  const fetchStats = async () => {
    try {
      const response = await axios.get('/api/incidents/stats');
      setStats(response.data);
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  };

  const addNotification = (notification) => {
    const id = Date.now();
    setNotifications(prev => [...prev, { ...notification, id }]);
    
    // Auto-remove after 5 seconds
    setTimeout(() => {
      removeNotification(id);
    }, 5000);
  };

  const removeNotification = (id) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  };

  const updateIncidentStatus = async (id, status) => {
    try {
      await axios.patch(`/api/incidents/${id}`, { status });
      await fetchIncidents();
      await fetchStats();
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  };

  return (
    <DataContext.Provider value={{
      incidents,
      emergencies,
      stats,
      loading,
      notifications,
      removeNotification,
      updateIncidentStatus,
      refreshData: () => {
        fetchIncidents();
        fetchEmergencies();
        fetchStats();
      }
    }}>
      {children}
    </DataContext.Provider>
  );
};
