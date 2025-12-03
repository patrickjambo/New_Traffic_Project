// src/services/websocket.js
import { io } from 'socket.io-client';
import toast from 'react-hot-toast';

class WebSocketService {
  constructor() {
    this.socket = null;
    this.listeners = new Map();
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 5;
  }

  connect() {
    const token = localStorage.getItem('authToken');
    const userRole = localStorage.getItem('userRole');
    
    this.socket = io(process.env.REACT_APP_WS_URL || 'http://localhost:3000', {
      auth: { token },
      query: { role: userRole },
      transports: ['websocket'],
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
    });

    this.setupEventListeners();
  }

  setupEventListeners() {
    if (!this.socket) return;

    this.socket.on('connect', () => {
      console.log('✅ WebSocket connected');
      this.reconnectAttempts = 0;
      toast.success('Connected to live updates');
    });

    this.socket.on('disconnect', (reason) => {
      console.log('❌ WebSocket disconnected:', reason);
      if (reason === 'io server disconnect') {
        this.socket.connect();
      }
    });

    this.socket.on('connect_error', (error) => {
      console.error('⚠️ WebSocket connection error:', error);
      this.reconnectAttempts++;
      
      if (this.reconnectAttempts >= this.maxReconnectAttempts) {
        toast.error('Lost connection to server. Some features may not work.');
      }
    });

    // Core event listeners
    this.socket.on('new_incident', (data) => {
      this.handleNewIncident(data);
    });

    this.socket.on('incident_updated', (data) => {
      this.handleIncidentUpdate(data);
    });

    this.socket.on('traffic_update', (data) => {
      this.handleTrafficUpdate(data);
    });

    this.socket.on('emergency_alert', (data) => {
      this.handleEmergencyAlert(data);
    });

    // Custom event forwarding
    this.socket.onAny((eventName, ...args) => {
      this.forwardToListeners(eventName, ...args);
    });
  }

  handleNewIncident(data) {
    const incident = data.incident;
    const userRole = localStorage.getItem('userRole');
    
    // Only show notifications for relevant incidents
    if (userRole === 'public' || !userRole) {
      // Public users get all notifications
      toast(
        (t) => (
          <div style={{ padding: '4px' }}>
            <strong>🚨 New {incident.type}</strong>
            <p style={{ margin: '4px 0', fontSize: '14px' }}>
              {incident.address || 'Near your location'}
            </p>
            <button
              onClick={() => {
                toast.dismiss(t.id);
                // Navigate to map
              }}
              style={{
                background: '#4285F4',
                color: 'white',
                border: 'none',
                padding: '6px 12px',
                borderRadius: '4px',
                cursor: 'pointer',
                fontSize: '12px'
              }}
            >
              View on Map
            </button>
          </div>
        ),
        {
          duration: 6000,
          icon: '🚨',
        }
      );
    }
    
    // Forward to component listeners
    this.forwardToListeners('new_incident', data);
  }

  handleIncidentUpdate(data) {
    const { incidentId, status, updatedBy } = data;
    
    if (status === 'resolved') {
      toast.success(`Incident #${incidentId} has been resolved`);
    } else if (status === 'verified') {
      toast(`Incident #${incidentId} verified by ${updatedBy}`, {
        icon: '✅',
      });
    }
    
    this.forwardToListeners('incident_updated', data);
  }

  handleTrafficUpdate(data) {
    const { area, congestionLevel, averageSpeed } = data;
    
    if (congestionLevel > 70) {
      toast(`🚗 Heavy traffic in ${area}`, {
        icon: '⚠️',
        duration: 4000,
      });
    }
    
    this.forwardToListeners('traffic_update', data);
  }

  handleEmergencyAlert(data) {
    toast.error(
      <div>
        <strong>🚨 EMERGENCY ALERT</strong>
        <p style={{ margin: '4px 0' }}>{data.message}</p>
        <small>Location: {data.location}</small>
      </div>,
      {
        duration: 10000,
        icon: '🚨',
      }
    );
    
    this.forwardToListeners('emergency_alert', data);
  }

  forwardToListeners(eventName, ...args) {
    const listeners = this.listeners.get(eventName) || [];
    listeners.forEach(listener => {
      try {
        listener(...args);
      } catch (error) {
        console.error(`Error in listener for ${eventName}:`, error);
      }
    });
  }

  on(eventName, callback) {
    if (!this.listeners.has(eventName)) {
      this.listeners.set(eventName, []);
    }
    this.listeners.get(eventName).push(callback);
    
    // Return unsubscribe function
    return () => {
      const listeners = this.listeners.get(eventName) || [];
      const index = listeners.indexOf(callback);
      if (index > -1) {
        listeners.splice(index, 1);
      }
    };
  }

  emit(eventName, data) {
    if (this.socket && this.socket.connected) {
      this.socket.emit(eventName, data);
    } else {
      console.warn('Cannot emit: WebSocket not connected');
    }
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
      this.listeners.clear();
    }
  }

  isConnected() {
    return this.socket?.connected || false;
  }
}

// Singleton instance
export const webSocketService = new WebSocketService();
export default webSocketService;
