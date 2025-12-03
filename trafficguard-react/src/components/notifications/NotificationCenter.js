// src/components/notifications/NotificationCenter.js
import React, { useState, useEffect, useCallback } from 'react';
import {
  Badge,
  IconButton,
  Popover,
  Box,
  Typography,
  List,
  ListItem,
  ListItemText,
  ListItemAvatar,
  Avatar,
  Divider,
  Button,
  Chip,
  useTheme,
} from '@mui/material';
import {
  Notifications,
  EmergencyShare,
  Warning,
  LocalPolice,
  CheckCircle,
  Info,
  Close,
  ClearAll,
} from '@mui/icons-material';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';
import websocketService from '../../services/websocket';
import { formatDistanceToNow } from 'date-fns';

const NotificationCenter = () => {
  const theme = useTheme();
  const [anchorEl, setAnchorEl] = useState(null);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);

  const open = Boolean(anchorEl);

  // Load notifications from localStorage on mount
  useEffect(() => {
    const stored = localStorage.getItem('notifications');
    if (stored) {
      const parsed = JSON.parse(stored);
      setNotifications(parsed);
      setUnreadCount(parsed.filter(n => !n.isRead).length);
    }
  }, []);

  // Save notifications to localStorage whenever they change
  useEffect(() => {
    localStorage.setItem('notifications', JSON.stringify(notifications));
  }, [notifications]);

  // WebSocket event handlers
  const handleNewEmergency = useCallback((data) => {
    const notification = {
      id: `emergency-${data.id}-${Date.now()}`,
      type: 'emergency',
      severity: data.severity,
      title: `New ${data.severity} Emergency`,
      message: `${data.type} at ${data.location?.name || 'Unknown location'}`,
      timestamp: new Date().toISOString(),
      isRead: false,
      data: data,
    };

    setNotifications(prev => [notification, ...prev]);
    setUnreadCount(prev => prev + 1);

    // Show toast notification
    const toastOptions = {
      duration: 5000,
      position: 'top-right',
      icon: '🚨',
    };

    if (data.severity === 'critical') {
      toast.error(`CRITICAL: ${notification.message}`, toastOptions);
      // Play sound alert
      playAlertSound('critical');
    } else if (data.severity === 'high') {
      toast.error(`URGENT: ${notification.message}`, toastOptions);
      playAlertSound('high');
    } else {
      toast(`🚨 ${notification.message}`, toastOptions);
    }
  }, []);

  const handleEmergencyUpdated = useCallback((data) => {
    const notification = {
      id: `emergency-update-${data.id}-${Date.now()}`,
      type: 'emergency_update',
      title: 'Emergency Status Updated',
      message: `Emergency #${data.id} status changed to: ${data.status}`,
      timestamp: new Date().toISOString(),
      isRead: false,
      data: data,
    };

    setNotifications(prev => [notification, ...prev]);
    setUnreadCount(prev => prev + 1);

    toast.success(notification.message, {
      duration: 4000,
      icon: '✅',
    });
  }, []);

  const handleNewIncident = useCallback((data) => {
    const notification = {
      id: `incident-${data.id}-${Date.now()}`,
      type: 'incident',
      title: 'New Incident Reported',
      message: `${data.type} detected at ${data.location?.name || 'Unknown location'}`,
      timestamp: new Date().toISOString(),
      isRead: false,
      data: data,
    };

    setNotifications(prev => [notification, ...prev]);
    setUnreadCount(prev => prev + 1);

    toast(`🚗 ${notification.message}`, {
      duration: 4000,
    });
  }, []);

  const handleIncidentResolved = useCallback((data) => {
    const notification = {
      id: `incident-resolved-${data.id}-${Date.now()}`,
      type: 'incident_resolved',
      title: 'Incident Resolved',
      message: `Incident #${data.id} has been resolved`,
      timestamp: new Date().toISOString(),
      isRead: false,
      data: data,
    };

    setNotifications(prev => [notification, ...prev]);
    setUnreadCount(prev => prev + 1);

    toast.success(notification.message, {
      duration: 3000,
      icon: '✅',
    });
  }, []);

  // Set up WebSocket listeners
  useEffect(() => {
    // Connect to WebSocket
    if (!websocketService.isConnected) {
      websocketService.connect();
    }

    // Register event handlers
    websocketService.registerHandler('emergency:new', handleNewEmergency);
    websocketService.registerHandler('emergency:updated', handleEmergencyUpdated);
    websocketService.registerHandler('incident:new', handleNewIncident);
    websocketService.registerHandler('incident:resolved', handleIncidentResolved);

    // Get user's location and join location-based room
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          websocketService.joinLocation(
            position.coords.latitude,
            position.coords.longitude
          );
        },
        (error) => {
          console.warn('Unable to get location for notifications:', error);
        }
      );
    }

    return () => {
      // Cleanup handlers
      websocketService.unregisterHandler('emergency:new', handleNewEmergency);
      websocketService.unregisterHandler('emergency:updated', handleEmergencyUpdated);
      websocketService.unregisterHandler('incident:new', handleNewIncident);
      websocketService.unregisterHandler('incident:resolved', handleIncidentResolved);
    };
  }, [handleNewEmergency, handleEmergencyUpdated, handleNewIncident, handleIncidentResolved]);

  const playAlertSound = (severity) => {
    try {
      // Create audio context for beep sound
      const audioContext = new (window.AudioContext || window.webkitAudioContext)();
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();

      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);

      // Different frequencies for different severities
      const frequency = severity === 'critical' ? 1000 : 800;
      oscillator.frequency.value = frequency;
      oscillator.type = 'sine';

      gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.5);

      oscillator.start(audioContext.currentTime);
      oscillator.stop(audioContext.currentTime + 0.5);
    } catch (error) {
      console.warn('Unable to play alert sound:', error);
    }
  };

  const handleClick = (event) => {
    setAnchorEl(event.currentTarget);
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  const markAsRead = (id) => {
    setNotifications(prev =>
      prev.map(n => n.id === id ? { ...n, isRead: true } : n)
    );
    setUnreadCount(prev => Math.max(0, prev - 1));
  };

  const markAllAsRead = () => {
    setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
    setUnreadCount(0);
  };

  const clearAll = () => {
    setNotifications([]);
    setUnreadCount(0);
    localStorage.removeItem('notifications');
    toast.success('All notifications cleared');
  };

  const getNotificationIcon = (type, severity) => {
    switch (type) {
      case 'emergency':
      case 'emergency_update':
        return (
          <Avatar
            sx={{
              bgcolor: severity === 'critical' ? 'error.main' : severity === 'high' ? 'warning.main' : 'info.main',
            }}
          >
            <EmergencyShare />
          </Avatar>
        );
      case 'incident':
        return (
          <Avatar sx={{ bgcolor: 'warning.main' }}>
            <Warning />
          </Avatar>
        );
      case 'incident_resolved':
        return (
          <Avatar sx={{ bgcolor: 'success.main' }}>
            <CheckCircle />
          </Avatar>
        );
      default:
        return (
          <Avatar sx={{ bgcolor: 'info.main' }}>
            <Info />
          </Avatar>
        );
    }
  };

  const getSeverityChip = (severity) => {
    if (!severity) return null;

    const colors = {
      critical: 'error',
      high: 'warning',
      medium: 'info',
      low: 'default',
    };

    return (
      <Chip
        label={severity.toUpperCase()}
        color={colors[severity]}
        size="small"
        sx={{ ml: 1 }}
      />
    );
  };

  return (
    <>
      <IconButton
        color="inherit"
        onClick={handleClick}
        sx={{
          position: 'relative',
          '&:hover': {
            bgcolor: 'action.hover',
          },
        }}
      >
        <Badge badgeContent={unreadCount} color="error" max={99}>
          <Notifications />
        </Badge>
      </IconButton>

      <Popover
        open={open}
        anchorEl={anchorEl}
        onClose={handleClose}
        anchorOrigin={{
          vertical: 'bottom',
          horizontal: 'right',
        }}
        transformOrigin={{
          vertical: 'top',
          horizontal: 'right',
        }}
        PaperProps={{
          sx: {
            width: 400,
            maxHeight: 600,
            overflow: 'hidden',
            display: 'flex',
            flexDirection: 'column',
          },
        }}
      >
        <Box
          sx={{
            p: 2,
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            borderBottom: 1,
            borderColor: 'divider',
          }}
        >
          <Typography variant="h6">Notifications</Typography>
          <Box>
            {unreadCount > 0 && (
              <Button size="small" onClick={markAllAsRead} sx={{ mr: 1 }}>
                Mark all read
              </Button>
            )}
            <IconButton size="small" onClick={clearAll} title="Clear all">
              <ClearAll />
            </IconButton>
          </Box>
        </Box>

        <Box sx={{ flexGrow: 1, overflow: 'auto' }}>
          {notifications.length === 0 ? (
            <Box
              sx={{
                p: 4,
                textAlign: 'center',
                color: 'text.secondary',
              }}
            >
              <Notifications sx={{ fontSize: 48, opacity: 0.3, mb: 2 }} />
              <Typography variant="body2">No notifications yet</Typography>
            </Box>
          ) : (
            <List sx={{ p: 0 }}>
              <AnimatePresence>
                {notifications.map((notification, index) => (
                  <motion.div
                    key={notification.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 20 }}
                    transition={{ delay: index * 0.05 }}
                  >
                    <ListItem
                      sx={{
                        bgcolor: notification.isRead ? 'transparent' : 'action.hover',
                        cursor: 'pointer',
                        '&:hover': {
                          bgcolor: 'action.selected',
                        },
                      }}
                      onClick={() => markAsRead(notification.id)}
                    >
                      <ListItemAvatar>
                        {getNotificationIcon(notification.type, notification.severity)}
                      </ListItemAvatar>
                      <ListItemText
                        primary={
                          <Box sx={{ display: 'flex', alignItems: 'center' }}>
                            <Typography
                              variant="subtitle2"
                              sx={{
                                fontWeight: notification.isRead ? 400 : 600,
                              }}
                            >
                              {notification.title}
                            </Typography>
                            {getSeverityChip(notification.severity)}
                          </Box>
                        }
                        secondary={
                          <>
                            <Typography
                              component="span"
                              variant="body2"
                              color="text.primary"
                            >
                              {notification.message}
                            </Typography>
                            <Typography
                              component="div"
                              variant="caption"
                              color="text.secondary"
                              sx={{ mt: 0.5 }}
                            >
                              {formatDistanceToNow(new Date(notification.timestamp), {
                                addSuffix: true,
                              })}
                            </Typography>
                          </>
                        }
                      />
                    </ListItem>
                    {index < notifications.length - 1 && <Divider />}
                  </motion.div>
                ))}
              </AnimatePresence>
            </List>
          )}
        </Box>
      </Popover>
    </>
  );
};

export default NotificationCenter;
