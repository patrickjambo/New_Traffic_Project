import React, { useState, useEffect } from 'react';
import {
  Container,
  Grid,
  Paper,
  Typography,
  Button,
  Box,
  Card,
  CardContent,
  Chip,
  Fade,
  Slide,
  CircularProgress,
} from '@mui/material';
import {
  Warning,
  Notifications,
  Route,
  Traffic,
  AccessTime,
  EmergencyShare,
  Refresh,
  LocationOn,
} from '@mui/icons-material';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import RoutePlanner from '../../components/map/RoutePlanner';
import IncidentMap from '../../components/map/IncidentMap';
import NotificationBell from '../../components/notifications/NotificationBell';
import EmergencyRequestForm from '../../components/emergency/EmergencyRequestForm';
import Navbar from '../../components/layout/Navbar';
import Card3D from '../../components/common/Card3D';
import SkeletonLoader from '../../components/common/SkeletonLoader';
import { apiService } from '../../services/api';
import toast from 'react-hot-toast';

const PublicHome = () => {
  const navigate = useNavigate();
  const [incidents, setIncidents] = useState([]);
  const [trafficStats, setTrafficStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [emergencyDialogOpen, setEmergencyDialogOpen] = useState(false);

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 30000); // Refresh every 30 seconds
    return () => clearInterval(interval);
  }, []);

  const fetchData = async () => {
    try {
      setRefreshing(true);
      const response = await apiService.getIncidents();

      if (response.success) {
        const incidentData = response.data.incidents || response.data || [];
        setIncidents(incidentData);

        // Calculate traffic stats
        const totalIncidents = incidentData.length;
        const highSeverity = incidentData.filter(i => i.severity === 'high').length;
        const congestionLevel = Math.min(100, (highSeverity / Math.max(totalIncidents, 1)) * 100 + 30);

        setTrafficStats({
          totalIncidents,
          congestionLevel: Math.round(congestionLevel),
          avgResponseTime: 12,
          resolvedToday: incidentData.filter(i => i.status === 'resolved').length,
        });
      }
    } catch (error) {
      console.error('Failed to fetch data:', error);
      setTrafficStats({
        totalIncidents: 0,
        congestionLevel: 0,
        avgResponseTime: 0,
        resolvedToday: 0,
      });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleEmergency = () => {
    setEmergencyDialogOpen(true);
  };

  const handleEmergencySuccess = (emergencyData) => {
    toast.success('🚨 Emergency request sent! Help is on the way!', {
      duration: 6000,
    });
    console.log('Emergency data:', emergencyData);
  };

  const handleRefresh = () => {
    toast.promise(
      fetchData(),
      {
        loading: 'Refreshing data...',
        success: 'Data updated!',
        error: 'Failed to refresh',
      }
    );
  };

  const recentIncidents = incidents.slice(0, 5);

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: 'background.default' }}>
      <Navbar />

      {/* Hero Section */}
      <Box
        sx={{
          background: 'linear-gradient(135deg, #4285F4 0%, #1A5FC7 100%)',
          color: 'white',
          py: 8,
          mb: 4,
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        {/* Animated background elements */}
        <Box
          sx={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            opacity: 0.1,
            background: 'radial-gradient(circle, white 2px, transparent 2px)',
            backgroundSize: '50px 50px',
          }}
        />

        <Container maxWidth="xl" sx={{ position: 'relative', zIndex: 1 }}>
          <Grid container spacing={4} alignItems="center">
            <Grid item xs={12} md={6}>
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6 }}
              >
                <Typography variant="h2" fontWeight="bold" gutterBottom>
                  🚦 TrafficGuard AI
                </Typography>
                <Typography variant="h5" sx={{ mb: 3, opacity: 0.9 }}>
                  Smart Traffic Management & Real-Time Incident Reporting
                </Typography>
                <Typography variant="body1" sx={{ mb: 4, opacity: 0.8 }}>
                  Get live traffic updates, report incidents instantly, and find the safest routes in Kigali.
                </Typography>
                <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
                  <Button
                    variant="contained"
                    size="large"
                    onClick={() => navigate('/login')}
                    sx={{
                      bgcolor: 'white',
                      color: '#4285F4',
                      '&:hover': { bgcolor: '#f0f0f0', transform: 'scale(1.05)' },
                      transition: 'all 0.2s',
                    }}
                  >
                    Get Started
                  </Button>
                  <Button
                    variant="outlined"
                    size="large"
                    sx={{
                      borderColor: 'white',
                      color: 'white',
                      '&:hover': {
                        borderColor: '#f0f0f0',
                        bgcolor: 'rgba(255,255,255,0.1)',
                        transform: 'scale(1.05)',
                      },
                      transition: 'all 0.2s',
                    }}
                    onClick={handleEmergency}
                    startIcon={<EmergencyShare />}
                  >
                    Emergency
                  </Button>
                </Box>
              </motion.div>
            </Grid>
            <Grid item xs={12} md={6}>
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.6, delay: 0.2 }}
              >
                <Paper sx={{ p: 3, bgcolor: 'rgba(255,255,255,0.15)', backdropFilter: 'blur(10px)', border: '1px solid rgba(255,255,255,0.2)' }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                    <Typography variant="h6" sx={{ color: 'white' }}>
                      Live Traffic Updates
                    </Typography>
                    <NotificationBell showBadge />
                  </Box>
                  {loading ? (
                    <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
                      <CircularProgress sx={{ color: 'white' }} />
                    </Box>
                  ) : trafficStats && (
                    <Grid container spacing={2}>
                      <Grid item xs={6}>
                        <Card sx={{ bgcolor: 'rgba(255,255,255,0.25)', backdropFilter: 'blur(5px)' }}>
                          <CardContent>
                            <Typography variant="h3" sx={{ color: 'white', fontWeight: 'bold' }}>
                              {trafficStats.totalIncidents}
                            </Typography>
                            <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.9)' }}>
                              Active Incidents
                            </Typography>
                          </CardContent>
                        </Card>
                      </Grid>
                      <Grid item xs={6}>
                        <Card sx={{ bgcolor: 'rgba(255,255,255,0.25)', backdropFilter: 'blur(5px)' }}>
                          <CardContent>
                            <Typography variant="h3" sx={{ color: 'white', fontWeight: 'bold' }}>
                              {trafficStats.congestionLevel}%
                            </Typography>
                            <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.9)' }}>
                              City Congestion
                            </Typography>
                          </CardContent>
                        </Card>
                      </Grid>
                    </Grid>
                  )}
                </Paper>
              </motion.div>
            </Grid>
          </Grid>
        </Container>
      </Box>

      <Container maxWidth="xl">
        {/* Main Content */}
        <Grid container spacing={3}>
          {/* Left Column: Map & Route Planner */}
          <Grid item xs={12} lg={8}>
            <Slide direction="up" in={true} timeout={800}>
              <Paper sx={{ p: 2, mb: 3, borderRadius: 3, boxShadow: 3 }}>
                <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                  <LocationOn color="primary" /> Live Incident Map
                </Typography>
                <Box sx={{ height: 400, borderRadius: 2, overflow: 'hidden', border: '1px solid', borderColor: 'divider' }}>
                  <IncidentMap incidents={incidents} />
                </Box>
              </Paper>
            </Slide>

            <Fade in={true} timeout={1000}>
              <Paper sx={{ p: 3, borderRadius: 3, boxShadow: 3 }}>
                <Typography variant="h5" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Route color="primary" /> Route Planner
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                  Plan your route and avoid traffic incidents
                </Typography>
                <RoutePlanner />
              </Paper>
            </Fade>
          </Grid>

          {/* Right Column: Incidents & Notifications */}
          <Grid item xs={12} lg={4}>
            <Grid container spacing={3}>
              {/* Recent Incidents */}
              <Grid item xs={12}>
                <Paper sx={{ p: 3, borderRadius: 3, boxShadow: 3 }}>
                  <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Warning color="warning" /> Recent Incidents
                  </Typography>
                  <Box sx={{ maxHeight: 300, overflow: 'auto' }}>
                    {loading ? (
                      <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
                        <CircularProgress />
                      </Box>
                    ) : recentIncidents.map((incident, index) => (
                      <motion.div
                        key={incident.id}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: index * 0.1 }}
                      >
                        <Card
                          sx={{
                            mb: 2,
                            cursor: 'pointer',
                            '&:hover': { transform: 'translateY(-2px)', boxShadow: 4 },
                            transition: 'all 0.3s',
                            borderLeft: 4,
                            borderColor: incident.severity === 'high' ? 'error.main' :
                              incident.severity === 'medium' ? 'warning.main' : 'success.main',
                          }}
                        >
                          <CardContent>
                            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                              <Typography variant="subtitle1" fontWeight="bold">
                                {incident.type === 'accident' ? '🚨 Accident' :
                                  incident.type === 'congestion' ? '🚗 Congestion' :
                                    incident.type === 'construction' ? '🚧 Construction' :
                                      '⚠️ Road Blockage'}
                              </Typography>
                              <Chip
                                label={incident.severity}
                                size="small"
                                color={
                                  incident.severity === 'high' ? 'error' :
                                    incident.severity === 'medium' ? 'warning' : 'success'
                                }
                              />
                            </Box>
                            <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>
                              <LocationOn sx={{ fontSize: 14, verticalAlign: 'middle', mr: 0.5 }} />
                              {incident.address || `${incident.latitude?.toFixed(4)}, ${incident.longitude?.toFixed(4)}`}
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                              {new Date(incident.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </Typography>
                            {incident.status && (
                              <Chip
                                label={incident.status}
                                size="small"
                                sx={{ ml: 1 }}
                                color={incident.status === 'resolved' ? 'success' : 'default'}
                              />
                            )}
                          </CardContent>
                        </Card>
                      </motion.div>
                    ))}
                    {recentIncidents.length === 0 && !loading && (
                      <Box sx={{ textAlign: 'center', py: 4 }}>
                        <Typography color="text.secondary">
                          No recent incidents reported
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          All clear! 🎉
                        </Typography>
                      </Box>
                    )}
                  </Box>
                </Paper>
              </Grid>

              {/* Quick Actions */}
              <Grid item xs={12}>
                <Paper sx={{ p: 3, borderRadius: 3, boxShadow: 3 }}>
                  <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Notifications color="primary" /> Quick Actions
                  </Typography>
                  <Grid container spacing={2}>
                    <Grid item xs={6}>
                      <Button
                        fullWidth
                        variant="contained"
                        startIcon={<Warning />}
                        onClick={() => navigate('/login')}
                        sx={{ py: 1.5 }}
                      >
                        Report Incident
                      </Button>
                    </Grid>
                    <Grid item xs={6}>
                      <Button
                        fullWidth
                        variant="outlined"
                        startIcon={refreshing ? <CircularProgress size={20} /> : <Refresh />}
                        onClick={handleRefresh}
                        disabled={refreshing}
                        sx={{ py: 1.5 }}
                      >
                        Refresh
                      </Button>
                    </Grid>
                    <Grid item xs={12}>
                      <Button
                        fullWidth
                        variant="outlined"
                        color="error"
                        startIcon={<EmergencyShare />}
                        onClick={handleEmergency}
                        sx={{
                          py: 1.5,
                          '&:hover': {
                            bgcolor: 'error.main',
                            color: 'white',
                            transform: 'scale(1.02)',
                          },
                          transition: 'all 0.2s',
                        }}
                      >
                        🚨 Emergency Alert
                      </Button>
                    </Grid>
                  </Grid>
                </Paper>
              </Grid>

              {/* Live Stats */}
              {trafficStats && (
                <Grid item xs={12}>
                  <Paper sx={{ p: 3, borderRadius: 3, boxShadow: 3 }}>
                    <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <AccessTime color="primary" /> Live Statistics
                    </Typography>
                    <Grid container spacing={2}>
                      <Grid item xs={6}>
                        <Card sx={{ textAlign: 'center', py: 2, bgcolor: 'primary.light', color: 'white' }}>
                          <Typography variant="h3" fontWeight="bold">
                            {trafficStats.avgResponseTime}m
                          </Typography>
                          <Typography variant="body2">
                            Avg Response
                          </Typography>
                        </Card>
                      </Grid>
                      <Grid item xs={6}>
                        <Card sx={{ textAlign: 'center', py: 2, bgcolor: 'success.light', color: 'white' }}>
                          <Typography variant="h3" fontWeight="bold">
                            {trafficStats.resolvedToday}
                          </Typography>
                          <Typography variant="body2">
                            Resolved Today
                          </Typography>
                        </Card>
                      </Grid>
                    </Grid>
                  </Paper>
                </Grid>
              )}
            </Grid>
          </Grid>
        </Grid>

        {/* Features Section */}
        <Box sx={{ mt: 8, mb: 6 }}>
          <Typography variant="h4" textAlign="center" gutterBottom fontWeight="bold">
            Why Choose TrafficGuard?
          </Typography>
          <Typography variant="body1" textAlign="center" color="text.secondary" sx={{ mb: 4 }}>
            The most advanced traffic management system in Kigali
          </Typography>
          <Grid container spacing={4} sx={{ mt: 2 }}>
            {[
              { icon: '🤖', title: 'AI-Powered Detection', desc: 'Automated incident detection using computer vision and machine learning' },
              { icon: '⚡', title: 'Real-Time Updates', desc: 'Live notifications via WebSocket connections for instant alerts' },
              { icon: '🗺️', title: 'Smart Routing', desc: 'Avoid traffic with intelligent route planning and alternative suggestions' },
              { icon: '🔒', title: 'Secure & Private', desc: 'End-to-end encryption for all communications and data storage' },
              { icon: '📱', title: 'Cross-Platform', desc: 'Web, mobile, and tablet compatible with seamless synchronization' },
              { icon: '🏙️', title: 'City Integration', desc: 'Direct integration with city infrastructure and emergency services' },
            ].map((feature, index) => (
              <Grid item xs={12} sm={6} md={4} key={index}>
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                >
                  <Card3D
                    glowEffect
                    sx={{
                      height: '100%',
                      p: 3,
                      textAlign: 'center',
                      transition: 'all 0.3s',
                      '&:hover': {
                        boxShadow: 8,
                        bgcolor: 'primary.light',
                        color: 'white',
                        '& .MuiTypography-body2': {
                          color: 'rgba(255,255,255,0.9)',
                        }
                      }
                    }}
                  >
                    <Typography variant="h1" sx={{ mb: 2 }}>{feature.icon}</Typography>
                    <Typography variant="h6" gutterBottom fontWeight="bold">{feature.title}</Typography>
                    <Typography variant="body2" color="text.secondary">{feature.desc}</Typography>
                  </Card3D>
                </motion.div>
              </Grid>
            ))}
          </Grid>
        </Box>
      </Container>

      {/* Emergency Request Dialog */}
      <EmergencyRequestForm
        open={emergencyDialogOpen}
        onClose={() => setEmergencyDialogOpen(false)}
        onSuccess={handleEmergencySuccess}
      />
    </Box>
  );
};

export default PublicHome;
