import React, { useState, useEffect } from 'react';
import { 
  Box, 
  Container, 
  Typography, 
  Button, 
  Paper, 
  Grid,
  Card,
  CardContent,
  Fab,
  AppBar,
  Toolbar,
  IconButton,
  Avatar,
  Menu,
  MenuItem,
  Chip,
  List,
  ListItem,
  ListItemText,
  Tabs,
  Tab,
  Badge,
} from '@mui/material';
import { 
  Add,
  Logout,
  AccountCircle,
  Warning,
  CheckCircle,
  Pending,
  Map as MapIcon,
  Home,
  EmergencyShare,
} from '@mui/icons-material';
import { useAuth } from '../../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { apiService } from '../../services/api';
import IncidentReportForm from '../../components/incidents/IncidentReportForm';
import IncidentMap from '../../components/map/IncidentMap';
import NotificationBell from '../../components/notifications/NotificationBell';
import EmergencyAlertCard from '../../components/emergency/EmergencyAlertCard';
import toast from 'react-hot-toast';

const UserDashboard = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [anchorEl, setAnchorEl] = useState(null);
  const [reportDialogOpen, setReportDialogOpen] = useState(false);
  const [myIncidents, setMyIncidents] = useState([]);
  const [myEmergencies, setMyEmergencies] = useState([]);
  const [currentTab, setCurrentTab] = useState(0);
  const [stats, setStats] = useState({
    total: 0,
    verified: 0,
    pending: 0,
  });

  useEffect(() => {
    fetchMyIncidents();
    fetchMyEmergencies();
  }, []);

  const fetchMyIncidents = async () => {
    try {
      const response = await apiService.getIncidents({ userId: user?.id });
      if (response.success) {
        const incidents = response.data.incidents || response.data || [];
        setMyIncidents(incidents);
        
        // Calculate stats
        setStats({
          total: incidents.length,
          verified: incidents.filter(i => i.status === 'verified').length,
          pending: incidents.filter(i => i.status === 'pending').length,
        });
      }
    } catch (error) {
      console.error('Failed to fetch incidents:', error);
    }
  };

  const fetchMyEmergencies = async () => {
    try {
      // Try to fetch from API, otherwise use mock data
      const response = await apiService.getEmergencies({ userId: user?.id });
      if (response.success) {
        setMyEmergencies(response.data || []);
      }
    } catch (error) {
      console.log('Using mock emergency data');
      // Mock data for demo
      setMyEmergencies([]);
    }
  };

  const handleReportSuccess = (newIncident) => {
    fetchMyIncidents();
    toast.success('Incident reported successfully!');
  };

  const handleEmergencyUpdate = (updatedEmergency) => {
    setMyEmergencies(prev => 
      prev.map(em => em.id === updatedEmergency.id ? updatedEmergency : em)
    );
  };

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  const handleBackHome = () => {
    navigate('/');
  };

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: 'background.default' }}>
      {/* App Bar */}
      <AppBar position="static" elevation={1}>
        <Toolbar>
          <Typography variant="h6" sx={{ flexGrow: 1 }}>
            🚦 TrafficGuard AI
          </Typography>
          
          <Button 
            color="inherit" 
            startIcon={<Home />}
            onClick={handleBackHome}
            sx={{ mr: 1 }}
          >
            Home
          </Button>
          
          <NotificationBell showBadge />
          
          <IconButton
            onClick={(e) => setAnchorEl(e.currentTarget)}
            sx={{ ml: 1 }}
          >
            <Avatar sx={{ width: 36, height: 36, bgcolor: 'secondary.main' }}>
              {user?.fullName?.charAt(0)}
            </Avatar>
          </IconButton>
          
          <Menu
            anchorEl={anchorEl}
            open={Boolean(anchorEl)}
            onClose={() => setAnchorEl(null)}
          >
            <MenuItem onClick={handleBackHome}>
              <Home sx={{ mr: 1 }} /> Back to Home
            </MenuItem>
            <MenuItem onClick={() => setAnchorEl(null)}>
              <AccountCircle sx={{ mr: 1 }} /> Profile
            </MenuItem>
            <MenuItem onClick={handleLogout}>
              <Logout sx={{ mr: 1 }} /> Logout
            </MenuItem>
          </Menu>
        </Toolbar>
      </AppBar>

      <Container maxWidth="xl" sx={{ py: 4 }}>
        {/* Welcome Section */}
        <Paper sx={{ p: 3, mb: 3, background: 'linear-gradient(135deg, #4285F4 0%, #34A853 100%)', color: 'white' }}>
          <Typography variant="h4" gutterBottom>
            Welcome back, {user?.fullName}! 👋
          </Typography>
          <Typography variant="body1" sx={{ opacity: 0.9 }}>
            Help keep Kigali's roads safe by reporting traffic incidents
          </Typography>
        </Paper>

        {/* Stats Grid */}
        <Grid container spacing={3} sx={{ mb: 3 }}>
          <Grid item xs={12} md={4}>
            <Card>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                  <Warning sx={{ fontSize: 48, color: 'primary.main' }} />
                  <Box>
                    <Typography variant="h3" color="primary">{stats.total}</Typography>
                    <Typography variant="body2" color="text.secondary">My Reports</Typography>
                  </Box>
                </Box>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} md={4}>
            <Card>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                  <CheckCircle sx={{ fontSize: 48, color: 'success.main' }} />
                  <Box>
                    <Typography variant="h3" color="success.main">{stats.verified}</Typography>
                    <Typography variant="body2" color="text.secondary">Verified</Typography>
                  </Box>
                </Box>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} md={4}>
            <Card>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                  <Pending sx={{ fontSize: 48, color: 'warning.main' }} />
                  <Box>
                    <Typography variant="h3" color="warning.main">{stats.pending}</Typography>
                    <Typography variant="body2" color="text.secondary">Pending</Typography>
                  </Box>
                </Box>
              </CardContent>
            </Card>
          </Grid>
        </Grid>

        {/* Main Content Grid */}
        <Grid container spacing={3}>
          {/* Tabs for Reports and Emergencies */}
          <Grid item xs={12}>
            <Paper sx={{ mb: 2 }}>
              <Tabs value={currentTab} onChange={(e, v) => setCurrentTab(v)}>
                <Tab 
                  label={
                    <Badge badgeContent={myIncidents.length} color="primary">
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, px: 2 }}>
                        <Warning /> My Reports
                      </Box>
                    </Badge>
                  } 
                />
                <Tab 
                  label={
                    <Badge badgeContent={myEmergencies.length} color="error">
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, px: 2 }}>
                        <EmergencyShare /> My Emergencies
                      </Box>
                    </Badge>
                  } 
                />
              </Tabs>
            </Paper>
          </Grid>

          {/* Tab Content */}
          {currentTab === 0 ? (
            <>
              {/* Map Section */}
              <Grid item xs={12} lg={8}>
                <Paper sx={{ p: 2 }}>
                  <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <MapIcon /> Live Traffic Map
                  </Typography>
                  <Box sx={{ height: 400, borderRadius: 2, overflow: 'hidden' }}>
                    <IncidentMap incidents={myIncidents} />
                  </Box>
                </Paper>
              </Grid>

              {/* My Reports Section */}
              <Grid item xs={12} lg={4}>
                <Paper sx={{ p: 2, height: '100%' }}>
                  <Typography variant="h6" gutterBottom>
                    My Recent Reports
                  </Typography>
                  <List>
                    {myIncidents.slice(0, 5).map((incident) => (
                      <ListItem 
                        key={incident.id}
                        sx={{ 
                          borderLeft: 3, 
                          borderColor: incident.severity === 'high' ? 'error.main' : 
                                       incident.severity === 'medium' ? 'warning.main' : 'success.main',
                          mb: 1,
                          bgcolor: 'background.default',
                          borderRadius: 1,
                        }}
                      >
                        <ListItemText
                          primary={
                            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                              <Typography variant="subtitle2">
                                {incident.type === 'accident' ? '🚨 Accident' : 
                                 incident.type === 'congestion' ? '🚗 Congestion' : 
                                 '🚧 Construction'}
                              </Typography>
                              <Chip 
                                label={incident.status} 
                                size="small"
                                color={incident.status === 'verified' ? 'success' : 'warning'}
                              />
                            </Box>
                          }
                          secondary={
                            <>
                              <Typography variant="caption" display="block">
                                {incident.address || 'Unknown location'}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            {new Date(incident.createdAt).toLocaleDateString()}
                          </Typography>
                        </>
                      }
                    />
                  </ListItem>
                ))}
                {myIncidents.length === 0 && (
                  <Typography color="text.secondary" textAlign="center" py={4}>
                    No reports yet. Report your first incident!
                  </Typography>
                )}
              </List>
            </Paper>
          </Grid>
            </>
          ) : (
            // Emergencies Tab
            <Grid item xs={12}>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                {myEmergencies.length > 0 ? (
                  myEmergencies.map((emergency) => (
                    <EmergencyAlertCard
                      key={emergency.id || emergency._id}
                      emergency={emergency}
                      onUpdate={handleEmergencyUpdate}
                      userRole="user"
                    />
                  ))
                ) : (
                  <Paper sx={{ p: 4, textAlign: 'center' }}>
                    <EmergencyShare sx={{ fontSize: 64, color: 'text.secondary', mb: 2 }} />
                    <Typography variant="h6" color="text.secondary" gutterBottom>
                      No Emergency Requests
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Your emergency requests will appear here
                    </Typography>
                  </Paper>
                )}
              </Box>
            </Grid>
          )}
        </Grid>
      </Container>

      {/* Floating Action Button */}
      <Fab
        color="primary"
        sx={{ position: 'fixed', bottom: 24, right: 24 }}
        onClick={() => setReportDialogOpen(true)}
      >
        <Add />
      </Fab>

      {/* Report Dialog */}
      <IncidentReportForm
        open={reportDialogOpen}
        onClose={() => setReportDialogOpen(false)}
        onSuccess={handleReportSuccess}
      />
    </Box>
  );
};

export default UserDashboard;
