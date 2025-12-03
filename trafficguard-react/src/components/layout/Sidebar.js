// src/components/layout/Sidebar.js
import React, { useState } from 'react';
import {
  Drawer,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  ListItemButton,
  IconButton,
  Box,
  Typography,
  Divider,
  Avatar,
  Collapse,
} from '@mui/material';
import {
  ChevronLeft,
  ChevronRight,
  Dashboard,
  Map,
  Report,
  Notifications,
  Settings,
  People,
  BarChart,
  Emergency,
  Traffic,
  LocalPolice,
  ExpandLess,
  ExpandMore,
} from '@mui/icons-material';
import { useNavigate, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';

const drawerWidth = 280;
const collapsedWidth = 80;

const Sidebar = ({ open, onToggle, userRole = 'user' }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const [expandedMenus, setExpandedMenus] = useState({});

  const handleToggleSubmenu = (menuId) => {
    setExpandedMenus(prev => ({
      ...prev,
      [menuId]: !prev[menuId]
    }));
  };

  const menuItems = {
    user: [
      { id: 'dashboard', label: 'Dashboard', icon: <Dashboard />, path: '/user/dashboard' },
      { id: 'map', label: 'Traffic Map', icon: <Map />, path: '/user/map' },
      { id: 'report', label: 'Report Incident', icon: <Report />, path: '/user/report' },
      { id: 'notifications', label: 'Notifications', icon: <Notifications />, path: '/user/notifications' },
      { id: 'settings', label: 'Settings', icon: <Settings />, path: '/user/settings' },
    ],
    police: [
      { id: 'dashboard', label: 'Command Center', icon: <LocalPolice />, path: '/police/dashboard' },
      { id: 'emergencies', label: 'Emergencies', icon: <Emergency />, path: '/police/emergencies' },
      { id: 'incidents', label: 'Incidents', icon: <Traffic />, path: '/police/incidents' },
      { id: 'map', label: 'Live Map', icon: <Map />, path: '/police/map' },
      { 
        id: 'reports',
        label: 'Reports',
        icon: <BarChart />,
        submenu: [
          { id: 'daily', label: 'Daily Reports', path: '/police/reports/daily' },
          { id: 'weekly', label: 'Weekly Reports', path: '/police/reports/weekly' },
          { id: 'analytics', label: 'Analytics', path: '/police/reports/analytics' },
        ]
      },
      { id: 'notifications', label: 'Notifications', icon: <Notifications />, path: '/police/notifications' },
      { id: 'settings', label: 'Settings', icon: <Settings />, path: '/police/settings' },
    ],
    admin: [
      { id: 'dashboard', label: 'Admin Dashboard', icon: <Dashboard />, path: '/admin/dashboard' },
      { id: 'users', label: 'User Management', icon: <People />, path: '/admin/users' },
      { id: 'emergencies', label: 'Emergencies', icon: <Emergency />, path: '/admin/emergencies' },
      { id: 'incidents', label: 'All Incidents', icon: <Traffic />, path: '/admin/incidents' },
      { id: 'map', label: 'System Map', icon: <Map />, path: '/admin/map' },
      { 
        id: 'analytics',
        label: 'Analytics',
        icon: <BarChart />,
        submenu: [
          { id: 'overview', label: 'Overview', path: '/admin/analytics/overview' },
          { id: 'traffic', label: 'Traffic Stats', path: '/admin/analytics/traffic' },
          { id: 'emergency', label: 'Emergency Stats', path: '/admin/analytics/emergency' },
          { id: 'ai', label: 'AI Performance', path: '/admin/analytics/ai' },
        ]
      },
      { id: 'settings', label: 'System Settings', icon: <Settings />, path: '/admin/settings' },
    ],
  };

  const currentMenuItems = menuItems[userRole] || menuItems.user;

  const handleNavigate = (path) => {
    navigate(path);
  };

  const isActive = (path) => {
    return location.pathname === path;
  };

  const renderMenuItem = (item) => {
    const hasSubmenu = item.submenu && item.submenu.length > 0;
    const isExpanded = expandedMenus[item.id];
    const active = isActive(item.path);

    return (
      <React.Fragment key={item.id}>
        <ListItem disablePadding>
          <ListItemButton
            onClick={() => {
              if (hasSubmenu) {
                handleToggleSubmenu(item.id);
              } else if (item.path) {
                handleNavigate(item.path);
              }
            }}
            sx={{
              minHeight: 48,
              justifyContent: open ? 'initial' : 'center',
              px: 2.5,
              bgcolor: active ? 'primary.main' : 'transparent',
              color: active ? 'white' : 'inherit',
              '&:hover': {
                bgcolor: active ? 'primary.dark' : 'action.hover',
              },
            }}
          >
            <ListItemIcon
              sx={{
                minWidth: 0,
                mr: open ? 3 : 'auto',
                justifyContent: 'center',
                color: active ? 'white' : 'inherit',
              }}
            >
              {item.icon}
            </ListItemIcon>
            <ListItemText 
              primary={item.label} 
              sx={{ 
                opacity: open ? 1 : 0,
                whiteSpace: 'nowrap',
              }} 
            />
            {hasSubmenu && open && (
              isExpanded ? <ExpandLess /> : <ExpandMore />
            )}
          </ListItemButton>
        </ListItem>

        {hasSubmenu && open && (
          <Collapse in={isExpanded} timeout="auto" unmountOnExit>
            <List component="div" disablePadding>
              {item.submenu.map((subItem) => (
                <ListItemButton
                  key={subItem.id}
                  onClick={() => handleNavigate(subItem.path)}
                  sx={{
                    pl: 4,
                    bgcolor: isActive(subItem.path) ? 'action.selected' : 'transparent',
                    '&:hover': {
                      bgcolor: 'action.hover',
                    },
                  }}
                >
                  <ListItemText 
                    primary={subItem.label}
                    primaryTypographyProps={{
                      variant: 'body2',
                    }}
                  />
                </ListItemButton>
              ))}
            </List>
          </Collapse>
        )}
      </React.Fragment>
    );
  };

  return (
    <Drawer
      variant="permanent"
      sx={{
        width: open ? drawerWidth : collapsedWidth,
        flexShrink: 0,
        '& .MuiDrawer-paper': {
          width: open ? drawerWidth : collapsedWidth,
          boxSizing: 'border-box',
          transition: 'width 0.3s ease',
          overflowX: 'hidden',
        },
      }}
    >
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          p: 2,
          minHeight: 64,
        }}
      >
        {open && (
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.3 }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Avatar sx={{ bgcolor: 'primary.main' }}>
                {userRole === 'admin' ? '⚙️' : userRole === 'police' ? '🚔' : '🚦'}
              </Avatar>
              <Box>
                <Typography variant="subtitle2" fontWeight="bold">
                  TrafficGuard
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  {userRole.toUpperCase()}
                </Typography>
              </Box>
            </Box>
          </motion.div>
        )}
        <IconButton onClick={onToggle} size="small">
          {open ? <ChevronLeft /> : <ChevronRight />}
        </IconButton>
      </Box>

      <Divider />

      <List sx={{ pt: 1 }}>
        {currentMenuItems.map(renderMenuItem)}
      </List>
    </Drawer>
  );
};

export default Sidebar;
