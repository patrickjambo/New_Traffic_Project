// src/components/incidents/IncidentReportForm.js
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
} from '@mui/material';
import {
  CloudUpload,
  Close,
  MyLocation,
  VideoLibrary,
  Image as ImageIcon,
} from '@mui/icons-material';
import { apiService } from '../../services/api';
import toast from 'react-hot-toast';

const IncidentReportForm = ({ open, onClose, onSuccess }) => {
  const [formData, setFormData] = useState({
    type: '',
    severity: '',
    description: '',
    latitude: '',
    longitude: '',
    address: '',
  });
  const [videoFile, setVideoFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');

  const incidentTypes = [
    { value: 'accident', label: '🚨 Accident', color: 'error' },
    { value: 'congestion', label: '🚗 Traffic Congestion', color: 'warning' },
    { value: 'construction', label: '🚧 Road Construction', color: 'info' },
    { value: 'roadblock', label: '⚠️ Road Blockage', color: 'default' },
  ];

  const severityLevels = [
    { value: 'low', label: 'Low', color: 'success' },
    { value: 'medium', label: 'Medium', color: 'warning' },
    { value: 'high', label: 'High', color: 'error' },
  ];

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    setError('');
  };

  const handleVideoChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      // Check file size (max 50MB)
      if (file.size > 50 * 1024 * 1024) {
        setError('Video file size must be less than 50MB');
        return;
      }
      setVideoFile(file);
      setError('');
    }
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
    } else {
      toast.error('Geolocation is not supported by your browser');
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
      setError('Please provide location or use current location');
      return;
    }

    setUploading(true);
    setError('');

    try {
      const reportData = {
        ...formData,
        video: videoFile,
        latitude: parseFloat(formData.latitude),
        longitude: parseFloat(formData.longitude),
      };

      const response = await apiService.reportIncident(reportData);
      
      if (response.success) {
        toast.success('Incident reported successfully!');
        if (onSuccess) onSuccess(response.data);
        handleClose();
      } else {
        setError(response.message || 'Failed to report incident');
      }
    } catch (error) {
      console.error('Error reporting incident:', error);
      setError('Network error. Please try again.');
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
    });
    setVideoFile(null);
    setError('');
    onClose();
  };

  return (
    <Dialog 
      open={open} 
      onClose={handleClose} 
      maxWidth="sm" 
      fullWidth
      PaperProps={{
        sx: { borderRadius: 3 }
      }}
    >
      <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Typography variant="h6">Report Traffic Incident</Typography>
        <IconButton onClick={handleClose} size="small">
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
            {/* Incident Type */}
            <FormControl fullWidth required>
              <InputLabel>Incident Type</InputLabel>
              <Select
                name="type"
                value={formData.type}
                onChange={handleChange}
                label="Incident Type"
              >
                {incidentTypes.map((type) => (
                  <MenuItem key={type.value} value={type.value}>
                    {type.label}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            {/* Severity */}
            <FormControl fullWidth required>
              <InputLabel>Severity</InputLabel>
              <Select
                name="severity"
                value={formData.severity}
                onChange={handleChange}
                label="Severity"
              >
                {severityLevels.map((level) => (
                  <MenuItem key={level.value} value={level.value}>
                    <Chip label={level.label} color={level.color} size="small" />
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
              label="Description"
              value={formData.description}
              onChange={handleChange}
              placeholder="Describe the incident in detail..."
            />

            {/* Location Section */}
            <Box>
              <Typography variant="subtitle2" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                📍 Location
                <Button
                  size="small"
                  startIcon={<MyLocation />}
                  onClick={getCurrentLocation}
                  disabled={uploading}
                >
                  Use Current Location
                </Button>
              </Typography>
              
              <Box sx={{ display: 'flex', gap: 2, mt: 1 }}>
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
              </Box>
            </Box>

            {/* Address */}
            <TextField
              fullWidth
              name="address"
              label="Address (Optional)"
              value={formData.address}
              onChange={handleChange}
              placeholder="e.g., KN 4 Ave, Kigali"
            />

            {/* Video Upload */}
            <Box>
              <Typography variant="subtitle2" gutterBottom>
                📹 Video Evidence (Optional)
              </Typography>
              <Button
                variant="outlined"
                component="label"
                fullWidth
                startIcon={videoFile ? <VideoLibrary /> : <CloudUpload />}
                sx={{ py: 1.5 }}
              >
                {videoFile ? `Selected: ${videoFile.name}` : 'Upload Video (Max 50MB)'}
                <input
                  type="file"
                  hidden
                  accept="video/*"
                  onChange={handleVideoChange}
                  disabled={uploading}
                />
              </Button>
              {videoFile && (
                <Chip
                  label={`${(videoFile.size / (1024 * 1024)).toFixed(2)} MB`}
                  onDelete={() => setVideoFile(null)}
                  size="small"
                  sx={{ mt: 1 }}
                />
              )}
            </Box>
          </Box>
        </DialogContent>

        <DialogActions sx={{ p: 2, pt: 0 }}>
          <Button onClick={handleClose} disabled={uploading}>
            Cancel
          </Button>
          <Button
            type="submit"
            variant="contained"
            disabled={uploading}
            startIcon={uploading ? <CircularProgress size={20} /> : null}
          >
            {uploading ? 'Reporting...' : 'Report Incident'}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
};

export default IncidentReportForm;
