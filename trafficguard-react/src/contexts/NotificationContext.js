// src/contexts/NotificationContext.js
import React, { createContext, useState, useContext, useEffect } from 'react';
import { webSocketService } from '../services/websocket';
import { apiService } from '../services/api';
import toast from 'react-hot-toast';

const NotificationContext = createContext({});

export const useNotifications = () => useContext(NotificationContext);

export const NotificationProvider = ({ children }) => {
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // Fetch initial notifications
    fetchNotifications();

    // Connect to WebSocket for real-time notifications
    const token = localStorage.getItem('authToken');
    if (token) {
      webSocketService.connect();

      // Listen for new notifications
      const unsubscribe = webSocketService.on('new_notification', (data) => {
        addNotification(data);
      });

      return () => {
        unsubscribe();
      };
    }
  }, []);

  const fetchNotifications = async () => {
    try {
      setLoading(true);
      const response = await apiService.getNotifications();
      
      if (response.success) {
        setNotifications(response.data.notifications || []);
        setUnreadCount(response.data.unreadCount || 0);
      }
    } catch (error) {
      console.error('Failed to fetch notifications:', error);
    } finally {
      setLoading(false);
    }
  };

  const addNotification = (notification) => {
    setNotifications(prev => [notification, ...prev]);
    setUnreadCount(prev => prev + 1);

    // Show toast notification
    if (notification.type === 'emergency') {
      toast.error(notification.message, {
        duration: 10000,
        icon: '🚨',
      });
    } else if (notification.type === 'incident') {
      toast(notification.message, {
        duration: 5000,
        icon: '⚠️',
      });
    } else {
      toast(notification.message, {
        duration: 4000,
      });
    }
  };

  const markAsRead = async (notificationId) => {
    try {
      await apiService.markNotificationAsRead(notificationId);
      
      setNotifications(prev =>
        prev.map(n => 
          n.id === notificationId ? { ...n, read: true } : n
        )
      );
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (error) {
      console.error('Failed to mark notification as read:', error);
    }
  };

  const markAllAsRead = async () => {
    try {
      await Promise.all(
        notifications.filter(n => !n.read).map(n => apiService.markNotificationAsRead(n.id))
      );
      
      setNotifications(prev =>
        prev.map(n => ({ ...n, read: true }))
      );
      setUnreadCount(0);
    } catch (error) {
      console.error('Failed to mark all as read:', error);
    }
  };

  const clearAll = async () => {
    try {
      await apiService.clearNotifications();
      setNotifications([]);
      setUnreadCount(0);
      toast.success('All notifications cleared');
    } catch (error) {
      console.error('Failed to clear notifications:', error);
      toast.error('Failed to clear notifications');
    }
  };

  const value = {
    notifications,
    unreadCount,
    loading,
    markAsRead,
    markAllAsRead,
    clearAll,
    refresh: fetchNotifications,
  };

  return (
    <NotificationContext.Provider value={value}>
      {children}
    </NotificationContext.Provider>
  );
};

export default NotificationContext;
