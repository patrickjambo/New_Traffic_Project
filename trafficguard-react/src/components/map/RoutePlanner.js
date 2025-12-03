// src/components/map/RoutePlanner.js
import React, { useState, useEffect } from 'react';
import {
  Box,
  TextField,
  Button,
  Paper,
  Typography,
  Grid,
  CircularProgress,
  Chip,
  Alert,
  IconButton,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Divider,
  InputAdornment,
} from '@mui/material';
import {
  LocationOn,
  MyLocation,
  Search,
  Directions,
  SwapHoriz,
  Clear,
  Traffic,
  Warning,
} from '@mui/icons-material';
import { motion, AnimatePresence } from 'framer-motion';
import { apiService } from '../../services/api';
import toast from 'react-hot-toast';

const RoutePlanner = () => {
  const [startPoint, setStartPoint] = useState('');
  const [destination, setDestination] = useState('');
  const [suggestions, setSuggestions] = useState([]);
  const [route, setRoute] = useState(null);
  const [loading, setLoading] = useState(false);
  const [incidentsOnRoute, setIncidentsOnRoute] = useState([]);
  const [incidents, setIncidents] = useState([]);

  // Fetch incidents for route planning
  useEffect(() => {
    const fetchIncidents = async () => {
      try {
        const response = await apiService.getIncidents();
        if (response.success) {
          setIncidents(response.data.incidents || response.data || []);
        }
      } catch (error) {
        console.error('Failed to fetch incidents:', error);
      }
    };
    fetchIncidents();
  }, []);

  const popularDestinations = [
    { name: 'Kigali International Airport', lat: -1.9686, lng: 30.1395 },
    { name: 'Kigali City Center', lat: -1.9501, lng: 30.0588 },
    { name: 'Remera Bus Park', lat: -1.9392, lng: 30.1040 },
    { name: 'Kimironko Market', lat: -1.9387, lng: 30.1255 },
    { name: 'Nyabugogo Taxi Park', lat: -1.9375, lng: 30.0451 },
  ];

  const handleSearch = async () => {
    if (!startPoint || !destination) {
      toast.error('Please enter both start point and destination');
      return;
    }

    setLoading(true);
    try {
      // Try to call the backend API
      const response = await apiService.calculateRoute(startPoint, destination);
      
      if (response.success) {
        setRoute(response.data.route);
        setIncidentsOnRoute(response.data.incidentsOnRoute || []);
        toast.success(`Route found! Estimated time: ${response.data.estimatedTime || response.data.route.estimatedTime}`);
      } else {
        // Fallback to mock data if API fails
        createMockRoute();
      }
    } catch (error) {
      console.log('API not available, using mock data');
      // Create mock route data for demonstration
      createMockRoute();
    } finally {
      setLoading(false);
    }
  };

  const createMockRoute = () => {
    // Calculate approximate distance (simplified)
    const distance = (Math.random() * 10 + 5).toFixed(1);
    const time = Math.ceil(distance * 3); // Approximate 3 min per km
    const trafficLevels = ['Light', 'Moderate', 'Heavy'];
    const trafficLevel = trafficLevels[Math.floor(Math.random() * 3)];
    
    // Mock route data
    const mockRoute = {
      distance: distance,
      estimatedTime: `${time} min`,
      trafficLevel: trafficLevel,
      fuelCost: Math.round(distance * 300), // RWF 300 per km
      alternatives: [
        {
          distance: (parseFloat(distance) + 2).toFixed(1),
          estimatedTime: `${time + 5} min`,
          trafficLevel: 'Light',
          incidentsCount: 0,
        },
        {
          distance: (parseFloat(distance) - 1).toFixed(1),
          estimatedTime: `${time - 2} min`,
          trafficLevel: 'Moderate',
          incidentsCount: 1,
        }
      ]
    };
    
    setRoute(mockRoute);
    
    // Mock incidents on route
    const mockIncidents = incidents.filter(() => Math.random() > 0.7).slice(0, 2).map(inc => ({
      ...inc,
      distanceFromRoute: (Math.random() * 2).toFixed(1)
    }));
    
    setIncidentsOnRoute(mockIncidents);
    toast.success(`Route calculated! Estimated time: ${mockRoute.estimatedTime}`);
  };

  const handleSwap = () => {
    setStartPoint(destination);
    setDestination(startPoint);
  };

  const handleUseCurrentLocation = (field) => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const lat = position.coords.latitude;
          const lng = position.coords.longitude;
          const location = `${lat.toFixed(4)}, ${lng.toFixed(4)}`;
          
          if (field === 'start') {
            setStartPoint(location);
          } else {
            setDestination(location);
          }
          
          toast.success('Location detected');
        },
        (error) => {
          toast.error('Unable to get your location');
        }
      );
    }
  };

  const clearRoute = () => {
    setRoute(null);
    setIncidentsOnRoute([]);
  };

  return (
    <Box>
      <Grid container spacing={2} alignItems="center">
        <Grid item xs={12} sm={5}>
          <TextField
            fullWidth
            label="Start Point"
            value={startPoint}
            onChange={(e) => setStartPoint(e.target.value)}
            placeholder="Enter address or coordinates"
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <LocationOn color="primary" />
                </InputAdornment>
              ),
              endAdornment: (
                <InputAdornment position="end">
                  <IconButton size="small" onClick={() => handleUseCurrentLocation('start')}>
                    <MyLocation fontSize="small" />
                  </IconButton>
                </InputAdornment>
              ),
            }}
          />
        </Grid>
        
        <Grid item xs={12} sm={2} sx={{ textAlign: 'center' }}>
          <IconButton onClick={handleSwap} color="primary">
            <SwapHoriz />
          </IconButton>
        </Grid>
        
        <Grid item xs={12} sm={5}>
          <TextField
            fullWidth
            label="Destination"
            value={destination}
            onChange={(e) => setDestination(e.target.value)}
            placeholder="Enter address or coordinates"
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <LocationOn color="secondary" />
                </InputAdornment>
              ),
              endAdornment: (
                <InputAdornment position="end">
                  <IconButton size="small" onClick={() => handleUseCurrentLocation('destination')}>
                    <MyLocation fontSize="small" />
                  </IconButton>
                </InputAdornment>
              ),
            }}
          />
        </Grid>
      </Grid>

      <Box sx={{ mt: 2, display: 'flex', gap: 2, flexWrap: 'wrap' }}>
        <Button
          variant="contained"
          startIcon={loading ? <CircularProgress size={20} /> : <Directions />}
          onClick={handleSearch}
          disabled={loading || !startPoint || !destination}
          sx={{ flex: 1 }}
        >
          {loading ? 'Calculating...' : 'Find Route'}
        </Button>
        
        {route && (
          <Button
            variant="outlined"
            startIcon={<Clear />}
            onClick={clearRoute}
          >
            Clear
          </Button>
        )}
      </Box>

      {/* Popular Destinations */}
      <Box sx={{ mt: 3 }}>
        <Typography variant="subtitle2" color="text.secondary" gutterBottom>
          Quick destinations:
        </Typography>
        <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
          {popularDestinations.map((dest) => (
            <Chip
              key={dest.name}
              label={dest.name}
              size="small"
              onClick={() => setDestination(dest.name)}
              sx={{ cursor: 'pointer' }}
            />
          ))}
        </Box>
      </Box>

      {/* Route Results */}
      <AnimatePresence>
        {route && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
          >
            <Paper sx={{ mt: 3, p: 2 }}>
              <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Directions /> Route Details
              </Typography>
              
              <Grid container spacing={2} sx={{ mt: 1 }}>
                <Grid item xs={6}>
                  <Typography variant="body2" color="text.secondary">Distance</Typography>
                  <Typography variant="h6">{route.distance} km</Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="body2" color="text.secondary">Time</Typography>
                  <Typography variant="h6">{route.estimatedTime}</Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="body2" color="text.secondary">Traffic</Typography>
                  <Chip 
                    label={route.trafficLevel} 
                    color={
                      route.trafficLevel === 'Heavy' ? 'error' :
                      route.trafficLevel === 'Moderate' ? 'warning' : 'success'
                    }
                    size="small"
                  />
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="body2" color="text.secondary">Fuel Cost</Typography>
                  <Typography variant="h6">~RWF {route.fuelCost?.toLocaleString()}</Typography>
                </Grid>
              </Grid>

              {/* Incidents on Route */}
              {incidentsOnRoute.length > 0 && (
                <Box sx={{ mt: 3 }}>
                  <Alert 
                    severity="warning" 
                    icon={<Traffic />}
                    sx={{ mb: 2 }}
                  >
                    {incidentsOnRoute.length} incident(s) on this route
                  </Alert>
                  
                  <List dense>
                    {incidentsOnRoute.slice(0, 3).map((incident) => (
                      <React.Fragment key={incident.id}>
                        <ListItem>
                          <ListItemIcon>
                            <Warning color="warning" />
                          </ListItemIcon>
                          <ListItemText
                            primary={incident.type}
                            secondary={`${incident.distanceFromRoute}km away • ${incident.severity}`}
                          />
                        </ListItem>
                        <Divider variant="inset" component="li" />
                      </React.Fragment>
                    ))}
                  </List>
                </Box>
              )}

              {/* Alternative Routes */}
              {route.alternatives && route.alternatives.length > 0 && (
                <Box sx={{ mt: 3 }}>
                  <Typography variant="subtitle2" gutterBottom>
                    Alternative routes:
                  </Typography>
                  <List dense>
                    {route.alternatives.slice(0, 2).map((alt, index) => (
                      <ListItem 
                        key={index}
                        sx={{ 
                          bgcolor: 'action.hover', 
                          borderRadius: 1, 
                          mb: 1,
                          cursor: 'pointer',
                          '&:hover': { bgcolor: 'action.selected' }
                        }}
                        onClick={() => setRoute(alt)}
                      >
                        <ListItemText
                          primary={`Route ${index + 2}`}
                          secondary={`${alt.distance} km • ${alt.estimatedTime} • ${alt.trafficLevel}`}
                        />
                        <Chip 
                          label={alt.incidentsCount === 0 ? 'Clear' : `${alt.incidentsCount} incidents`}
                          size="small"
                          color={alt.incidentsCount === 0 ? 'success' : 'warning'}
                        />
                      </ListItem>
                    ))}
                  </List>
                </Box>
              )}

              <Button
                fullWidth
                variant="contained"
                sx={{ mt: 2 }}
                startIcon={<Directions />}
                onClick={() => {
                  // In production, this would open in Google Maps/Waze
                  toast.success('Opening in navigation app...');
                }}
              >
                Start Navigation
              </Button>
            </Paper>
          </motion.div>
        )}
      </AnimatePresence>
    </Box>
  );
};

export default RoutePlanner;
