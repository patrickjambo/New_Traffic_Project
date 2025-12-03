// src/components/notifications/NotificationBell.js
import React, { useState } from 'react';
import {
  IconButton,
  Badge,
  Menu,
  MenuItem,
  Typography,
  Box,
  Divider,
  Button,
  ListItemText,
  ListItemIcon,
  Chip,
  CircularProgress,
} from '@mui/material';
import {
  Notifications,
  NotificationsNone,
  Warning,
  Info,
  CheckCircle,
  Error as ErrorIcon,
  Clear,
  DoneAll,
} from '@mui/icons-material';
import { motion, AnimatePresence } from 'framer-motion';
import { useNotifications } from '../../contexts/NotificationContext';
import { formatDistanceToNow } from 'date-fns';

const NotificationBell = ({ showBadge = true }) => {
  const { notifications, unreadCount, loading, markAsRead, markAllAsRead, clearAll } = useNotifications();
  const [anchorEl, setAnchorEl] = useState(null);
  const open = Boolean(anchorEl);

  const handleClick = (event) => {
    setAnchorEl(event.currentTarget);
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  const handleNotificationClick = (notification) => {
    if (!notification.read) {
      markAsRead(notification.id);
    }
    // Handle navigation based on notification type
    // This can be extended based on notification.action or notification.type
  };

  const getNotificationIcon = (type) => {
    switch (type) {
      case 'incident':
        return <Warning color="warning" />;
      case 'emergency':
        return <ErrorIcon color="error" />;
      case 'success':
        return <CheckCircle color="success" />;
      default:
        return <Info color="info" />;
    }
  };

  const getNotificationColor = (type) => {
    switch (type) {
      case 'incident':
        return 'warning.light';
      case 'emergency':
        return 'error.light';
      case 'success':
        return 'success.light';
      default:
        return 'info.light';
    }
  };

  return (
    <>
      <IconButton
        onClick={handleClick}
        color="inherit"
        sx={{
          position: 'relative',
          '&:hover': {
            transform: 'scale(1.1)',
          },
          transition: 'transform 0.2s',
        }}
      >
        <Badge 
          badgeContent={showBadge ? unreadCount : 0} 
          color="error"
          max={99}
        >
          {unreadCount > 0 ? <Notifications /> : <NotificationsNone />}
        </Badge>
      </IconButton>

      <Menu
        anchorEl={anchorEl}
        open={open}
        onClose={handleClose}
        PaperProps={{
          sx: {
            width: 380,
            maxHeight: 600,
            overflow: 'hidden',
            borderRadius: 2,
          },
        }}
        transformOrigin={{ horizontal: 'right', vertical: 'top' }}
        anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
      >
        {/* Header */}
        <Box sx={{ p: 2, bgcolor: 'primary.main', color: 'white' }}>
          <Typography variant="h6" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Notifications />
            Notifications
            {unreadCount > 0 && (
              <Chip
                label={unreadCount}
                size="small"
                sx={{ bgcolor: 'white', color: 'primary.main', fontWeight: 'bold' }}
              />
            )}
          </Typography>
        </Box>

        {/* Action Buttons */}
        {notifications.length > 0 && (
          <Box sx={{ p: 1, display: 'flex', gap: 1, borderBottom: '1px solid', borderColor: 'divider' }}>
            <Button
              size="small"
              startIcon={<DoneAll />}
              onClick={() => {
                markAllAsRead();
                handleClose();
              }}
              disabled={unreadCount === 0}
            >
              Mark all read
            </Button>
            <Button
              size="small"
              startIcon={<Clear />}
              onClick={() => {
                clearAll();
                handleClose();
              }}
              color="error"
            >
              Clear all
            </Button>
          </Box>
        )}

        {/* Notifications List */}
        <Box sx={{ maxHeight: 400, overflow: 'auto' }}>
          {loading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
              <CircularProgress />
            </Box>
          ) : notifications.length === 0 ? (
            <Box sx={{ p: 4, textAlign: 'center' }}>
              <NotificationsNone sx={{ fontSize: 48, color: 'text.secondary', mb: 1 }} />
              <Typography variant="body2" color="text.secondary">
                No notifications yet
              </Typography>
            </Box>
          ) : (
            <AnimatePresence>
              {notifications.slice(0, 10).map((notification, index) => (
                <motion.div
                  key={notification.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  transition={{ delay: index * 0.05 }}
                >
                  <MenuItem
                    onClick={() => handleNotificationClick(notification)}
                    sx={{
                      py: 1.5,
                      px: 2,
                      bgcolor: notification.read ? 'transparent' : getNotificationColor(notification.type),
                      '&:hover': {
                        bgcolor: notification.read ? 'action.hover' : `${getNotificationColor(notification.type)}`,
                        opacity: 0.8,
                      },
                      borderLeft: notification.read ? 'none' : '4px solid',
                      borderColor: notification.type === 'emergency' ? 'error.main' : 
                                   notification.type === 'incident' ? 'warning.main' :
                                   notification.type === 'success' ? 'success.main' : 'info.main',
                    }}
                  >
                    <ListItemIcon>
                      {getNotificationIcon(notification.type)}
                    </ListItemIcon>
                    <ListItemText
                      primary={
                        <Typography 
                          variant="body2" 
                          fontWeight={notification.read ? 'normal' : 'bold'}
                        >
                          {notification.title || notification.message}
                        </Typography>
                      }
                      secondary={
                        <Box>
                          {notification.title && (
                            <Typography variant="caption" color="text.secondary" display="block">
                              {notification.message}
                            </Typography>
                          )}
                          <Typography variant="caption" color="text.secondary" sx={{ fontSize: 11 }}>
                            {formatDistanceToNow(new Date(notification.createdAt), { addSuffix: true })}
                          </Typography>
                        </Box>
                      }
                    />
                  </MenuItem>
                  {index < notifications.length - 1 && <Divider />}
                </motion.div>
              ))}
            </AnimatePresence>
          )}
        </Box>

        {/* View All Button */}
        {notifications.length > 10 && (
          <>
            <Divider />
            <Box sx={{ p: 1, textAlign: 'center' }}>
              <Button size="small" fullWidth onClick={handleClose}>
                View All Notifications
              </Button>
            </Box>
          </>
        )}
      </Menu>
    </>
  );
};

export default NotificationBell;
