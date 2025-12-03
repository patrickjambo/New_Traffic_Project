import React, { useState, useEffect } from 'react';
import {
  Box,
  Container,
  Typography,
  Paper,
  Toolbar,
  IconButton,
  Avatar,
  Menu,
  MenuItem,
  Grid,
  CardContent,
  Tabs,
  Tab,
  Badge,
  Alert,
  useTheme,
} from '@mui/material';
import {
  Home,
  AccountCircle,
  Logout,
  EmergencyShare,
  Warning,
  CheckCircle,
  LocalPolice,
} from '@mui/icons-material';
import { useAuth } from '../../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import NotificationBell from '../../components/notifications/NotificationBell';
import EmergencyAlertCard from '../../components/emergency/EmergencyAlertCard';
import Card3D from '../../components/common/Card3D';
import AnimatedButton from '../../components/common/AnimatedButton';
import { apiService } from '../../services/api';
import toast from 'react-hot-toast';

const PoliceDashboard = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const theme = useTheme();
  const [anchorEl, setAnchorEl] = useState(null);
  const [currentTab, setCurrentTab] = useState(0);
  const [emergencies, setEmergencies] = useState([]);
  const [stats, setStats] = useState({
    pending: 0,
    dispatched: 0,
    resolved: 0,
  });

  useEffect(() => {
    fetchEmergencies();
    // Auto-refresh every 15 seconds
    const interval = setInterval(fetchEmergencies, 15000);
    return () => clearInterval(interval);
  }, []);

  const fetchEmergencies = async () => {
    try {
      const response = await apiService.getEmergencies();
      if (response.success || response.data) {
        const emergencyData = response.data || [];
        setEmergencies(emergencyData);

        // Calculate stats
        setStats({
          pending: emergencyData.filter(e => e.status === 'pending').length,
          dispatched: emergencyData.filter(e => e.status === 'dispatched' || e.status === 'in_progress').length,
          resolved: emergencyData.filter(e => e.status === 'resolved').length,
        });
      }
    } catch (error) {
      console.log('Using mock emergency data for police dashboard');
      // Mock data for demo
      const mockEmergencies = [
        {
          id: 'EM001',
          type: 'accident',
          severity: 'critical',
          description: 'Multiple vehicle collision on KN 3 Ave near Kigali Convention Centre. 3 vehicles involved, 2 casualties reported. Ambulance and fire service urgently needed.',
          latitude: -1.9505,
          longitude: 30.0904,
          address: 'KN 3 Ave, Near Kigali Convention Centre',
          casualties: 2,
          vehiclesInvolved: 3,
          requiredServices: ['police', 'ambulance', 'fireService', 'towTruck'],
          status: 'pending',
          timestamp: new Date(Date.now() - 5 * 60000).toISOString(),
        },
        {
          id: 'EM002',
          type: 'road_blockage',
          severity: 'high',
          description: 'Large tree fallen across KN 4 Ave blocking all lanes. Heavy equipment needed for removal. No casualties but traffic completely blocked.',
          latitude: -1.9550,
          longitude: 30.0920,
          address: 'KN 4 Ave, Near Kimironko',
          casualties: 0,
          vehiclesInvolved: 0,
          requiredServices: ['police', 'roadClearance'],
          status: 'dispatched',
          timestamp: new Date(Date.now() - 15 * 60000).toISOString(),
          actionBy: 'dispatch',
          actionNote: 'Road clearance team dispatched, ETA 10 minutes',
        },
      ];
      setEmergencies(mockEmergencies);
      setStats({
        pending: mockEmergencies.filter(e => e.status === 'pending').length,
        dispatched: mockEmergencies.filter(e => e.status === 'dispatched').length,
        resolved: 0,
      });
    }
  };

  const handleEmergencyUpdate = (updatedEmergency) => {
    setEmergencies(prev =>
      prev.map(em => em.id === updatedEmergency.id ? updatedEmergency : em)
    );
    fetchEmergencies(); // Refresh to get updated stats
  };

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  const handleBackHome = () => {
    navigate('/');
  };

  const pendingEmergencies = emergencies.filter(e => e.status === 'pending');
  const activeEmergencies = emergencies.filter(e => e.status === 'dispatched' || e.status === 'in_progress');
  const resolvedEmergencies = emergencies.filter(e => e.status === 'resolved');

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: 'background.default', pb: 4 }}>
      {/* Glass Header */}
      <Box
        className="glass-nav"
        sx={{
          position: 'sticky',
          top: 0,
          zIndex: 1100,
          px: 2,
          py: 1,
          mb: 4
        }}
      >
        <Container maxWidth="xl">
          <Toolbar disableGutters>
            <LocalPolice sx={{ fontSize: 32, mr: 2, color: 'primary.main' }} />
            <Typography variant="h5" sx={{ flexGrow: 1, fontWeight: 'bold', background: 'linear-gradient(45deg, #4285F4, #34A853)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
              Police Command Center
            </Typography>

            <AnimatedButton
              variant="text"
              startIcon={<Home />}
              onClick={handleBackHome}
              sx={{ mr: 1, color: 'text.primary' }}
            >
              Home
            </AnimatedButton>

            <NotificationBell showBadge />

            <IconButton
              onClick={(e) => setAnchorEl(e.currentTarget)}
              sx={{ ml: 1, border: '1px solid rgba(255,255,255,0.2)' }}
            >
              <Avatar sx={{ width: 36, height: 36, bgcolor: 'primary.main' }}>
                {user?.fullName?.charAt(0)}
              </Avatar>
            </IconButton>

            <Menu
              anchorEl={anchorEl}
              open={Boolean(anchorEl)}
              onClose={() => setAnchorEl(null)}
              PaperProps={{
                sx: {
                  mt: 1.5,
                  borderRadius: 3,
                  minWidth: 180,
                  background: theme.palette.mode === 'dark' ? 'rgba(30,30,30,0.9)' : 'rgba(255,255,255,0.9)',
                  backdropFilter: 'blur(10px)',
                }
              }}
            >
              <MenuItem onClick={handleBackHome}>
                <Home sx={{ mr: 1 }} /> Back to Home
              </MenuItem>
              <MenuItem onClick={() => setAnchorEl(null)}>
                <AccountCircle sx={{ mr: 1 }} /> Profile
              </MenuItem>
              <MenuItem onClick={handleLogout} sx={{ color: 'error.main' }}>
                <Logout sx={{ mr: 1 }} /> Logout
              </MenuItem>
            </Menu>
          </Toolbar>
        </Container>
      </Box>

      <Container maxWidth="xl">
        {/* Welcome Banner */}
        <Card3D
          glass
          gradientBorder
          sx={{ mb: 4, background: 'linear-gradient(135deg, rgba(30, 64, 175, 0.8) 0%, rgba(59, 130, 246, 0.6) 100%)' }}
        >
          <CardContent sx={{ p: 4 }}>
            <Typography variant="h3" gutterBottom fontWeight="800" sx={{ color: 'white', textShadow: '0 2px 10px rgba(0,0,0,0.2)' }}>
              Welcome, Officer {user?.fullName}!
            </Typography>
            <Typography variant="h6" sx={{ color: 'rgba(255,255,255,0.9)' }}>
              Emergency Command Center • Real-time Monitoring Active
            </Typography>
          </CardContent>
        </Card3D>

        {/* Stats Grid */}
        <Grid container spacing={3} sx={{ mb: 4 }}>
          <Grid item xs={12} md={4}>
            <Card3D glowEffect sx={{ bgcolor: 'rgba(234, 67, 53, 0.1)', border: '1px solid rgba(234, 67, 53, 0.3)' }}>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                  <EmergencyShare sx={{ fontSize: 48, color: '#EA4335' }} />
                  <Box>
                    <Typography variant="h3" fontWeight="bold" color="error.main">{stats.pending}</Typography>
                    <Typography variant="subtitle1" color="text.secondary">Pending Emergencies</Typography>
                  </Box>
                </Box>
              </CardContent>
            </Card3D>
          </Grid>
          <Grid item xs={12} md={4}>
            <Card3D glowEffect sx={{ bgcolor: 'rgba(66, 133, 244, 0.1)', border: '1px solid rgba(66, 133, 244, 0.3)' }}>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                  <Warning sx={{ fontSize: 48, color: '#4285F4' }} />
                  <Box>
                    <Typography variant="h3" fontWeight="bold" color="primary.main">{stats.dispatched}</Typography>
                    <Typography variant="subtitle1" color="text.secondary">Active Responses</Typography>
                  </Box>
                </Box>
              </CardContent>
            </Card3D>
          </Grid>
          <Grid item xs={12} md={4}>
            <Card3D glowEffect sx={{ bgcolor: 'rgba(52, 168, 83, 0.1)', border: '1px solid rgba(52, 168, 83, 0.3)' }}>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                  <CheckCircle sx={{ fontSize: 48, color: '#34A853' }} />
                  <Box>
                    <Typography variant="h3" fontWeight="bold" color="success.main">{stats.resolved}</Typography>
                    <Typography variant="subtitle1" color="text.secondary">Resolved Today</Typography>
                  </Box>
                </Box>
              </CardContent>
            </Card3D>
          </Grid>
        </Grid>

        {/* Tabs */}
        <Paper
          className="glass-panel"
          sx={{ mb: 3, borderRadius: 3, overflow: 'hidden' }}
        >
          <Tabs
            value={currentTab}
            onChange={(e, v) => setCurrentTab(v)}
            variant="fullWidth"
            sx={{
              '& .MuiTab-root': { py: 2, fontSize: '1rem', fontWeight: 600 },
              '& .Mui-selected': { color: 'primary.main' }
            }}
          >
            <Tab
              label={
                <Badge badgeContent={pendingEmergencies.length} color="error" sx={{ '& .MuiBadge-badge': { fontSize: 12, height: 20, minWidth: 20 } }}>
                  <Box sx={{ px: 2 }}>Pending</Box>
                </Badge>
              }
            />
            <Tab
              label={
                <Badge badgeContent={activeEmergencies.length} color="info">
                  <Box sx={{ px: 2 }}>Active</Box>
                </Badge>
              }
            />
            <Tab label="Resolved" />
          </Tabs>
        </Paper>

        {/* Emergency Alerts - Pending */}
        {currentTab === 0 && (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
            {pendingEmergencies.length > 0 ? (
              <>
                <Alert
                  severity="error"
                  icon={<EmergencyShare fontSize="inherit" />}
                  sx={{ borderRadius: 3, mb: 1, '& .MuiAlert-message': { width: '100%' } }}
                >
                  <Typography variant="subtitle1" fontWeight="bold">
                    {pendingEmergencies.length} Emergency Alert{pendingEmergencies.length > 1 ? 's' : ''} Requiring Immediate Attention!
                  </Typography>
                </Alert>
                {pendingEmergencies.map((emergency) => (
                  <EmergencyAlertCard
                    key={emergency.id}
                    emergency={emergency}
                    onUpdate={handleEmergencyUpdate}
                    userRole="police"
                  />
                ))}
              </>
            ) : (
              <Card3D glass sx={{ p: 6, textAlign: 'center' }}>
                <CheckCircle sx={{ fontSize: 80, color: 'success.main', mb: 2, opacity: 0.8 }} />
                <Typography variant="h5" gutterBottom>
                  No Pending Emergencies
                </Typography>
                <Typography variant="body1" color="text.secondary">
                  All clear! No emergencies requiring attention at this time.
                </Typography>
              </Card3D>
            )}
          </Box>
        )}

        {/* Emergency Alerts - Active */}
        {currentTab === 1 && (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
            {activeEmergencies.length > 0 ? (
              activeEmergencies.map((emergency) => (
                <EmergencyAlertCard
                  key={emergency.id}
                  emergency={emergency}
                  onUpdate={handleEmergencyUpdate}
                  userRole="police"
                />
              ))
            ) : (
              <Card3D glass sx={{ p: 6, textAlign: 'center' }}>
                <Typography variant="h5" color="text.secondary">
                  No Active Emergency Responses
                </Typography>
              </Card3D>
            )}
          </Box>
        )}

        {/* Emergency Alerts - Resolved */}
        {currentTab === 2 && (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
            {resolvedEmergencies.length > 0 ? (
              resolvedEmergencies.map((emergency) => (
                <EmergencyAlertCard
                  key={emergency.id}
                  emergency={emergency}
                  onUpdate={handleEmergencyUpdate}
                  userRole="police"
                />
              ))
            ) : (
              <Card3D glass sx={{ p: 6, textAlign: 'center' }}>
                <Typography variant="h5" color="text.secondary">
                  No Resolved Emergencies Today
                </Typography>
              </Card3D>
            )}
          </Box>
        )}
      </Container>
    </Box>
  );
};

export default PoliceDashboard;
