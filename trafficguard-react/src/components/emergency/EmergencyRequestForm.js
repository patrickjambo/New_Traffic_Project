// src/components/emergency/EmergencyRequestForm.js
import React, { useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Box,
  Typography,
  CircularProgress,
  Alert,
  Chip,
  IconButton,
  FormControlLabel,
  Checkbox,
  FormGroup,
  Grid,
  Paper,
} from '@mui/material';
import {
  Close,
  MyLocation,
  LocalPolice,
  LocalHospital,
  LocalFireDepartment,
  Engineering,
  Warning,
} from '@mui/icons-material';
import { apiService } from '../../services/api';
import toast from 'react-hot-toast';

const EmergencyRequestForm = ({ open, onClose, onSuccess }) => {
  const [formData, setFormData] = useState({
    type: '',
    severity: '',
    description: '',
    latitude: '',
    longitude: '',
    address: '',
    casualties: '',
    vehiclesInvolved: '',
  });

  const [requiredServices, setRequiredServices] = useState({
    police: false,
    ambulance: false,
    fireService: false,
    towTruck: false,
    roadClearance: false,
  });

  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');

  const emergencyTypes = [
    { value: 'accident', label: '🚗 Traffic Accident', color: 'error', icon: <Warning /> },
    { value: 'fire', label: '🔥 Fire Emergency', color: 'error', icon: <LocalFireDepartment /> },
    { value: 'medical', label: '🚑 Medical Emergency', color: 'error', icon: <LocalHospital /> },
    { value: 'road_blockage', label: '🚧 Road Blockage', color: 'warning', icon: <Engineering /> },
    { value: 'fallen_tree', label: '🌳 Fallen Tree', color: 'warning', icon: <Engineering /> },
    { value: 'vehicle_breakdown', label: '⚠️ Vehicle Breakdown', color: 'info', icon: <Engineering /> },
    { value: 'other', label: '📢 Other Emergency', color: 'default', icon: <Warning /> },
  ];

  const severityLevels = [
    { value: 'critical', label: 'Critical - Immediate Response', color: 'error', description: 'Life-threatening, requires immediate intervention' },
    { value: 'high', label: 'High - Urgent', color: 'error', description: 'Serious situation, urgent response needed' },
    { value: 'medium', label: 'Medium - Important', color: 'warning', description: 'Important but not immediately life-threatening' },
    { value: 'low', label: 'Low - Standard', color: 'info', description: 'Standard response time acceptable' },
  ];

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    setError('');
  };

  const handleServiceToggle = (service) => {
    setRequiredServices(prev => ({
      ...prev,
      [service]: !prev[service],
    }));
  };

  const getCurrentLocation = () => {
    if (navigator.geolocation) {
      toast.promise(
        new Promise((resolve, reject) => {
          navigator.geolocation.getCurrentPosition(
            (position) => {
              setFormData(prev => ({
                ...prev,
                latitude: position.coords.latitude.toFixed(6),
                longitude: position.coords.longitude.toFixed(6),
              }));
              resolve('Location detected');
            },
            (error) => {
              reject('Unable to get your location');
            }
          );
        }),
        {
          loading: 'Getting your location...',
          success: (msg) => msg,
          error: (msg) => msg,
        }
      );
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Validation
    if (!formData.type || !formData.severity || !formData.description) {
      setError('Please fill in all required fields');
      return;
    }

    if (!formData.latitude || !formData.longitude) {
      setError('Please provide location');
      return;
    }

    const selectedServices = Object.keys(requiredServices).filter(key => requiredServices[key]);
    if (selectedServices.length === 0) {
      setError('Please select at least one required service');
      return;
    }

    setUploading(true);
    setError('');

    try {
      // Get current user's contact info
      const user = JSON.parse(localStorage.getItem('user') || '{}');
      
      const emergencyData = {
        emergencyType: formData.type,
        severity: formData.severity,
        locationName: formData.address || 'Emergency Location',
        locationDescription: formData.address || '',
        latitude: parseFloat(formData.latitude),
        longitude: parseFloat(formData.longitude),
        description: formData.description,
        casualtiesCount: parseInt(formData.casualties) || 0,
        vehiclesInvolved: parseInt(formData.vehiclesInvolved) || 0,
        servicesNeeded: selectedServices,
        contactName: user.username || 'Anonymous',
        contactPhone: user.phone || '+256700000000',
        images: [],
      };

      const response = await apiService.createEmergency(emergencyData);

      if (response.data) {
        toast.success('🚨 Emergency request sent successfully! Help is on the way!', {
          duration: 5000,
          icon: '🚨',
        });
        
        // Show estimated response time
        toast.success('Emergency services have been notified and are responding.', {
          duration: 4000,
          icon: '⚡',
        });
        
        if (onSuccess) onSuccess(response.data.data);
        handleClose();
      } else {
        setError(response.message || 'Failed to send emergency request');
      }
    } catch (error) {
      console.error('Emergency submission error:', error);
      setError(error.response?.data?.message || 'Failed to send emergency request. Please try again.');
      toast.error('Failed to send emergency request. Please try again.');
    } finally {
      setUploading(false);
    }
  };

  const handleClose = () => {
    setFormData({
      type: '',
      severity: '',
      description: '',
      latitude: '',
      longitude: '',
      address: '',
      casualties: '',
      vehiclesInvolved: '',
    });
    setRequiredServices({
      police: false,
      ambulance: false,
      fireService: false,
      towTruck: false,
      roadClearance: false,
    });
    setError('');
    onClose();
  };

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      maxWidth="md"
      fullWidth
      PaperProps={{
        sx: { borderRadius: 3 }
      }}
    >
      <DialogTitle sx={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        bgcolor: 'error.main',
        color: 'white',
      }}>
        <Typography variant="h6">🚨 Emergency Request</Typography>
        <IconButton onClick={handleClose} size="small" sx={{ color: 'white' }}>
          <Close />
        </IconButton>
      </DialogTitle>

      <form onSubmit={handleSubmit}>
        <DialogContent>
          {error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error}
            </Alert>
          )}

          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            {/* Emergency Type */}
            <FormControl fullWidth required>
              <InputLabel>Emergency Type</InputLabel>
              <Select
                name="type"
                value={formData.type}
                onChange={handleChange}
                label="Emergency Type"
              >
                {emergencyTypes.map((type) => (
                  <MenuItem key={type.value} value={type.value}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      {type.icon}
                      {type.label}
                    </Box>
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            {/* Severity */}
            <FormControl fullWidth required>
              <InputLabel>Severity Level</InputLabel>
              <Select
                name="severity"
                value={formData.severity}
                onChange={handleChange}
                label="Severity Level"
              >
                {severityLevels.map((level) => (
                  <MenuItem key={level.value} value={level.value}>
                    <Box>
                      <Chip label={level.label} color={level.color} size="small" sx={{ mb: 0.5 }} />
                      <Typography variant="caption" display="block" color="text.secondary">
                        {level.description}
                      </Typography>
                    </Box>
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            {/* Description */}
            <TextField
              fullWidth
              required
              multiline
              rows={3}
              name="description"
              label="Emergency Description"
              value={formData.description}
              onChange={handleChange}
              placeholder="Describe what happened in detail..."
            />

            {/* Required Services */}
            <Paper sx={{ p: 2, bgcolor: 'background.default' }}>
              <Typography variant="subtitle2" gutterBottom fontWeight="bold">
                Required Services *
              </Typography>
              <FormGroup>
                <Grid container spacing={1}>
                  <Grid item xs={6}>
                    <FormControlLabel
                      control={
                        <Checkbox
                          checked={requiredServices.police}
                          onChange={() => handleServiceToggle('police')}
                        />
                      }
                      label={
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                          <LocalPolice fontSize="small" />
                          Police
                        </Box>
                      }
                    />
                  </Grid>
                  <Grid item xs={6}>
                    <FormControlLabel
                      control={
                        <Checkbox
                          checked={requiredServices.ambulance}
                          onChange={() => handleServiceToggle('ambulance')}
                        />
                      }
                      label={
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                          <LocalHospital fontSize="small" />
                          Ambulance
                        </Box>
                      }
                    />
                  </Grid>
                  <Grid item xs={6}>
                    <FormControlLabel
                      control={
                        <Checkbox
                          checked={requiredServices.fireService}
                          onChange={() => handleServiceToggle('fireService')}
                        />
                      }
                      label={
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                          <LocalFireDepartment fontSize="small" />
                          Fire Service
                        </Box>
                      }
                    />
                  </Grid>
                  <Grid item xs={6}>
                    <FormControlLabel
                      control={
                        <Checkbox
                          checked={requiredServices.towTruck}
                          onChange={() => handleServiceToggle('towTruck')}
                        />
                      }
                      label="🚛 Tow Truck"
                    />
                  </Grid>
                  <Grid item xs={12}>
                    <FormControlLabel
                      control={
                        <Checkbox
                          checked={requiredServices.roadClearance}
                          onChange={() => handleServiceToggle('roadClearance')}
                        />
                      }
                      label="🚜 Road Clearance (Heavy Equipment)"
                    />
                  </Grid>
                </Grid>
              </FormGroup>
            </Paper>

            {/* Additional Details */}
            <Grid container spacing={2}>
              <Grid item xs={6}>
                <TextField
                  fullWidth
                  type="number"
                  name="casualties"
                  label="Number of Casualties"
                  value={formData.casualties}
                  onChange={handleChange}
                  inputProps={{ min: 0 }}
                />
              </Grid>
              <Grid item xs={6}>
                <TextField
                  fullWidth
                  type="number"
                  name="vehiclesInvolved"
                  label="Vehicles Involved"
                  value={formData.vehiclesInvolved}
                  onChange={handleChange}
                  inputProps={{ min: 0 }}
                />
              </Grid>
            </Grid>

            {/* Location Section */}
            <Box>
              <Typography variant="subtitle2" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                📍 Location *
                <Button
                  size="small"
                  startIcon={<MyLocation />}
                  onClick={getCurrentLocation}
                  disabled={uploading}
                >
                  Use Current Location
                </Button>
              </Typography>

              <Grid container spacing={2}>
                <Grid item xs={6}>
                  <TextField
                    fullWidth
                    required
                    name="latitude"
                    label="Latitude"
                    type="number"
                    value={formData.latitude}
                    onChange={handleChange}
                    inputProps={{ step: 'any' }}
                  />
                </Grid>
                <Grid item xs={6}>
                  <TextField
                    fullWidth
                    required
                    name="longitude"
                    label="Longitude"
                    type="number"
                    value={formData.longitude}
                    onChange={handleChange}
                    inputProps={{ step: 'any' }}
                  />
                </Grid>
              </Grid>
            </Box>

            {/* Address */}
            <TextField
              fullWidth
              name="address"
              label="Address/Landmark"
              value={formData.address}
              onChange={handleChange}
              placeholder="e.g., Near Kigali Convention Centre"
            />
          </Box>
        </DialogContent>

        <DialogActions sx={{ p: 2, pt: 0 }}>
          <Button onClick={handleClose} disabled={uploading}>
            Cancel
          </Button>
          <Button
            type="submit"
            variant="contained"
            color="error"
            disabled={uploading}
            startIcon={uploading ? <CircularProgress size={20} /> : <Warning />}
          >
            {uploading ? 'Sending...' : 'Send Emergency Request'}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
};

export default EmergencyRequestForm;
