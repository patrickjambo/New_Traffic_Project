import React, { useState, useEffect } from 'react';
import {
  Box,
  Container,
  Typography,
  Paper,
  Grid,
  Toolbar,
  IconButton,
  Avatar,
  Menu,
  MenuItem,
  Tabs,
  Tab,
  Badge,
  CardContent,
  useTheme,
} from '@mui/material';
import {
  Home,
  AccountCircle,
  Logout,
  EmergencyShare,
  CheckCircle,
  People,
  BarChart,
  LocalPolice,
  AdminPanelSettings,
  Videocam,
} from '@mui/icons-material';
import { useAuth } from '../../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import NotificationBell from '../../components/notifications/NotificationBell';
import EmergencyAlertCard from '../../components/emergency/EmergencyAlertCard';
import Card3D from '../../components/common/Card3D';
import AnimatedButton from '../../components/common/AnimatedButton';
import VideoCapture from '../../components/video/VideoCapture';
import { apiService } from '../../services/api';

const AdminDashboard = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const theme = useTheme();
  const [anchorEl, setAnchorEl] = useState(null);
  const [currentTab, setCurrentTab] = useState(0);
  const [emergencies, setEmergencies] = useState([]);
  const [stats, setStats] = useState({
    totalUsers: 0,
    totalIncidents: 0,
    pendingEmergencies: 0,
    resolvedEmergencies: 0,
  });

  useEffect(() => {
    fetchData();
    // Auto-refresh every 15 seconds
    const interval = setInterval(fetchData, 15000);
    return () => clearInterval(interval);
  }, []);

  const fetchData = async () => {
    try {
      // Fetch emergencies
      const emergencyResponse = await apiService.getEmergencies();
      if (emergencyResponse.success || emergencyResponse.data) {
        const emergencyData = emergencyResponse.data || [];
        setEmergencies(emergencyData);

        // Calculate stats
        setStats(prev => ({
          ...prev,
          pendingEmergencies: emergencyData.filter(e => e.status === 'pending').length,
          resolvedEmergencies: emergencyData.filter(e => e.status === 'resolved').length,
        }));
      }

      // Fetch incidents
      const incidentResponse = await apiService.getIncidents();
      if (incidentResponse.success) {
        setStats(prev => ({
          ...prev,
          totalIncidents: incidentResponse.data?.incidents?.length || 0,
        }));
      }
    } catch (error) {
      console.log('Using mock data for admin dashboard');
      // Mock data for demo
      const mockEmergencies = [
        {
          id: 'EM001',
          type: 'accident',
          severity: 'critical',
          description: 'Multiple vehicle collision on KN 3 Ave near Kigali Convention Centre. 3 vehicles involved, 2 casualties reported.',
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
          description: 'Large tree fallen across KN 4 Ave blocking all lanes.',
          latitude: -1.9550,
          longitude: 30.0920,
          address: 'KN 4 Ave, Near Kimironko',
          casualties: 0,
          vehiclesInvolved: 0,
          requiredServices: ['police', 'roadClearance'],
          status: 'dispatched',
          timestamp: new Date(Date.now() - 15 * 60000).toISOString(),
        },
      ];
      setEmergencies(mockEmergencies);
      setStats({
        totalUsers: 45,
        totalIncidents: 128,
        pendingEmergencies: 1,
        resolvedEmergencies: 15,
      });
    }
  };

  const handleEmergencyUpdate = (updatedEmergency) => {
    setEmergencies(prev =>
      prev.map(em => em.id === updatedEmergency.id ? updatedEmergency : em)
    );
    fetchData();
  };

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  const handleBackHome = () => {
    navigate('/');
  };

  const allEmergencies = emergencies;
  const criticalEmergencies = emergencies.filter(e => e.severity === 'critical');
  const recentEmergencies = emergencies.slice(0, 10);

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
            <AdminPanelSettings sx={{ fontSize: 32, mr: 2, color: 'secondary.main' }} />
            <Typography variant="h5" sx={{ flexGrow: 1, fontWeight: 'bold', background: 'linear-gradient(45deg, #7c3aed, #a855f7)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
              Admin Control Center
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
              <Avatar sx={{ width: 36, height: 36, bgcolor: 'secondary.main' }}>
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
          sx={{ mb: 4, background: 'linear-gradient(135deg, rgba(124, 58, 237, 0.8) 0%, rgba(168, 85, 247, 0.6) 100%)' }}
        >
          <CardContent sx={{ p: 4 }}>
            <Typography variant="h3" gutterBottom fontWeight="800" sx={{ color: 'white', textShadow: '0 2px 10px rgba(0,0,0,0.2)' }}>
              Welcome, Administrator {user?.fullName}!
            </Typography>
            <Typography variant="h6" sx={{ color: 'rgba(255,255,255,0.9)' }}>
              System-wide Emergency Management & Analytics Dashboard
            </Typography>
          </CardContent>
        </Card3D>

        {/* Stats Grid */}
        <Grid container spacing={3} sx={{ mb: 4 }}>
          <Grid item xs={12} md={3}>
            <Card3D glowEffect sx={{ bgcolor: 'rgba(66, 133, 244, 0.1)', border: '1px solid rgba(66, 133, 244, 0.3)' }}>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                  <People sx={{ fontSize: 48, color: '#4285F4' }} />
                  <Box>
                    <Typography variant="h3" fontWeight="bold" color="primary.main">{stats.totalUsers}</Typography>
                    <Typography variant="subtitle1" color="text.secondary">Total Users</Typography>
                  </Box>
                </Box>
              </CardContent>
            </Card3D>
          </Grid>
          <Grid item xs={12} md={3}>
            <Card3D glowEffect sx={{ bgcolor: 'rgba(156, 39, 176, 0.1)', border: '1px solid rgba(156, 39, 176, 0.3)' }}>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                  <BarChart sx={{ fontSize: 48, color: '#9c27b0' }} />
                  <Box>
                    <Typography variant="h3" fontWeight="bold" color="secondary.main">{stats.totalIncidents}</Typography>
                    <Typography variant="subtitle1" color="text.secondary">Total Incidents</Typography>
                  </Box>
                </Box>
              </CardContent>
            </Card3D>
          </Grid>
          <Grid item xs={12} md={3}>
            <Card3D glowEffect sx={{ bgcolor: 'rgba(234, 67, 53, 0.1)', border: '1px solid rgba(234, 67, 53, 0.3)' }}>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                  <EmergencyShare sx={{ fontSize: 48, color: '#EA4335' }} />
                  <Box>
                    <Typography variant="h3" fontWeight="bold" color="error.main">{stats.pendingEmergencies}</Typography>
                    <Typography variant="subtitle1" color="text.secondary">Pending</Typography>
                  </Box>
                </Box>
              </CardContent>
            </Card3D>
          </Grid>
          <Grid item xs={12} md={3}>
            <Card3D glowEffect sx={{ bgcolor: 'rgba(52, 168, 83, 0.1)', border: '1px solid rgba(52, 168, 83, 0.3)' }}>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                  <CheckCircle sx={{ fontSize: 48, color: '#34A853' }} />
                  <Box>
                    <Typography variant="h3" fontWeight="bold" color="success.main">{stats.resolvedEmergencies}</Typography>
                    <Typography variant="subtitle1" color="text.secondary">Resolved</Typography>
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
              '& .Mui-selected': { color: 'secondary.main' }
            }}
          >
            <Tab
              label={
                <Badge badgeContent={allEmergencies.length} color="primary">
                  <Box sx={{ px: 2 }}>All Emergencies</Box>
                </Badge>
              }
            />
            <Tab
              label={
                <Badge badgeContent={criticalEmergencies.length} color="error">
                  <Box sx={{ px: 2 }}>Critical Only</Box>
                </Badge>
              }
            />
            <Tab label="Analytics" />
          </Tabs>
        </Paper>

        {/* Tab Content - All Emergencies */}
        {currentTab === 0 && (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
            {allEmergencies.length > 0 ? (
              allEmergencies.map((emergency) => (
                <EmergencyAlertCard
                  key={emergency.id}
                  emergency={emergency}
                  onUpdate={handleEmergencyUpdate}
                  userRole="admin"
                />
              ))
            ) : (
              <Card3D glass sx={{ p: 6, textAlign: 'center' }}>
                <CheckCircle sx={{ fontSize: 80, color: 'success.main', mb: 2, opacity: 0.8 }} />
                <Typography variant="h5" gutterBottom>
                  No Emergency Alerts
                </Typography>
                <Typography variant="body1" color="text.secondary">
                  System is operating normally
                </Typography>
              </Card3D>
            )}
          </Box>
        )}

        {/* Tab Content - Critical Only */}
        {currentTab === 1 && (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
            {criticalEmergencies.length > 0 ? (
              criticalEmergencies.map((emergency) => (
                <EmergencyAlertCard
                  key={emergency.id}
                  emergency={emergency}
                  onUpdate={handleEmergencyUpdate}
                  userRole="admin"
                />
              ))
            ) : (
              <Card3D glass sx={{ p: 6, textAlign: 'center' }}>
                <CheckCircle sx={{ fontSize: 80, color: 'success.main', mb: 2, opacity: 0.8 }} />
                <Typography variant="h5" gutterBottom>
                  No Critical Emergencies
                </Typography>
                <Typography variant="body1" color="text.secondary">
                  All critical situations have been addressed
                </Typography>
              </Card3D>
            )}
          </Box>
        )}

        {/* Tab Content - Analytics */}
        {currentTab === 2 && (
          <Grid container spacing={3}>
            <Grid item xs={12}>
              <Card3D glass sx={{ p: 3 }}>
                <Typography variant="h5" gutterBottom fontWeight="bold">
                  Emergency Response Analytics
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                  Comprehensive analytics and reporting dashboard
                </Typography>
                <Grid container spacing={3}>
                  <Grid item xs={12} md={6}>
                    <Card3D sx={{ bgcolor: 'background.paper', border: '1px solid rgba(255,255,255,0.1)' }}>
                      <CardContent>
                        <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                          Average Response Time
                        </Typography>
                        <Typography variant="h2" color="primary.main" fontWeight="bold">
                          8.5 <Typography component="span" variant="h5" color="text.secondary">min</Typography>
                        </Typography>
                      </CardContent>
                    </Card3D>
                  </Grid>
                  <Grid item xs={12} md={6}>
                    <Card3D sx={{ bgcolor: 'background.paper', border: '1px solid rgba(255,255,255,0.1)' }}>
                      <CardContent>
                        <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                          Emergency Resolution Rate
                        </Typography>
                        <Typography variant="h2" color="success.main" fontWeight="bold">
                          94%
                        </Typography>
                      </CardContent>
                    </Card3D>
                  </Grid>
                </Grid>
              </Card3D>
            </Grid>
          </Grid>
        )}
      </Container>
    </Box>
  );
};

export default AdminDashboard;
