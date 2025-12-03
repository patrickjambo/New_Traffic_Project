// src/components/modern/CommandPalette.js
import React, { useState, useEffect } from 'react';
import {
  Dialog,
  TextField,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Box,
  Typography,
  Chip,
} from '@mui/material';
import {
  Search,
  Dashboard,
  Map,
  Emergency,
  Notifications,
  Settings,
  People,
  BarChart,
} from '@mui/icons-material';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';

const CommandPalette = ({ open, onClose }) => {
  const [search, setSearch] = useState('');
  const [filteredCommands, setFilteredCommands] = useState([]);
  const navigate = useNavigate();

  const commands = [
    { id: '1', label: 'Dashboard', icon: <Dashboard />, action: () => navigate('/user/dashboard'), shortcut: 'D' },
    { id: '2', label: 'Traffic Map', icon: <Map />, action: () => navigate('/'), shortcut: 'M' },
    { id: '3', label: 'Emergency Alert', icon: <Emergency />, action: () => {}, shortcut: 'E' },
    { id: '4', label: 'Notifications', icon: <Notifications />, action: () => {}, shortcut: 'N' },
    { id: '5', label: 'Settings', icon: <Settings />, action: () => navigate('/settings'), shortcut: 'S' },
    { id: '6', label: 'User Management', icon: <People />, action: () => navigate('/admin/users'), shortcut: 'U' },
    { id: '7', label: 'Analytics', icon: <BarChart />, action: () => navigate('/admin/analytics'), shortcut: 'A' },
  ];

  useEffect(() => {
    if (search) {
      const filtered = commands.filter(cmd => 
        cmd.label.toLowerCase().includes(search.toLowerCase())
      );
      setFilteredCommands(filtered);
    } else {
      setFilteredCommands(commands);
    }
  }, [search]);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        onClose();
      }
    };

    if (open) {
      window.addEventListener('keydown', handleKeyDown);
    }

    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [open, onClose]);

  const handleCommand = (command) => {
    command.action();
    onClose();
    setSearch('');
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="sm"
      fullWidth
      PaperProps={{
        sx: {
          background: 'rgba(10, 10, 10, 0.95)',
          backdropFilter: 'blur(20px)',
          border: '1px solid rgba(0, 246, 255, 0.3)',
          borderRadius: '16px',
          boxShadow: '0 0 40px rgba(0, 246, 255, 0.3)',
          overflow: 'hidden',
        },
      }}
    >
      <Box sx={{ p: 2 }}>
        <TextField
          fullWidth
          placeholder="Type a command or search..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          autoFocus
          InputProps={{
            startAdornment: <Search sx={{ mr: 1, color: '#00F6FF' }} />,
          }}
          sx={{
            '& .MuiOutlinedInput-root': {
              color: 'white',
              '& fieldset': {
                borderColor: 'rgba(0, 246, 255, 0.3)',
              },
              '&:hover fieldset': {
                borderColor: 'rgba(0, 246, 255, 0.5)',
              },
              '&.Mui-focused fieldset': {
                borderColor: '#00F6FF',
                boxShadow: '0 0 10px rgba(0, 246, 255, 0.5)',
              },
            },
          }}
        />
      </Box>

      <List sx={{ maxHeight: '400px', overflow: 'auto', px: 1 }}>
        <AnimatePresence>
          {filteredCommands.map((command, index) => (
            <motion.div
              key={command.id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              transition={{ delay: index * 0.05 }}
            >
              <ListItem disablePadding sx={{ mb: 0.5 }}>
                <ListItemButton
                  onClick={() => handleCommand(command)}
                  sx={{
                    borderRadius: '8px',
                    transition: 'all 0.2s ease',
                    '&:hover': {
                      background: 'rgba(0, 246, 255, 0.1)',
                      transform: 'translateX(4px)',
                    },
                  }}
                >
                  <ListItemIcon sx={{ color: '#00F6FF', minWidth: 40 }}>
                    {command.icon}
                  </ListItemIcon>
                  <ListItemText 
                    primary={command.label}
                    primaryTypographyProps={{
                      sx: { color: 'white', fontWeight: 500 }
                    }}
                  />
                  <Chip
                    label={command.shortcut}
                    size="small"
                    sx={{
                      bgcolor: 'rgba(0, 246, 255, 0.2)',
                      color: '#00F6FF',
                      fontWeight: 600,
                      fontSize: '0.75rem',
                    }}
                  />
                </ListItemButton>
              </ListItem>
            </motion.div>
          ))}
        </AnimatePresence>
      </List>

      <Box sx={{ p: 2, borderTop: '1px solid rgba(0, 246, 255, 0.2)' }}>
        <Typography variant="caption" sx={{ color: '#A0AEC0' }}>
          Press <Chip label="Ctrl" size="small" sx={{ mx: 0.5, fontSize: '0.7rem' }} /> + <Chip label="K" size="small" sx={{ mx: 0.5, fontSize: '0.7rem' }} /> to close
        </Typography>
      </Box>
    </Dialog>
  );
};

export default CommandPalette;
