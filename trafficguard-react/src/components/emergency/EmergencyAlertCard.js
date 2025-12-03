// src/components/emergency/EmergencyAlertCard.js
import React, { useState } from 'react';
import {
  Card,
  CardContent,
  CardActions,
  Typography,
  Box,
  Chip,
  Button,
  Grid,
  Divider,
  IconButton,
  Collapse,
  Alert,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
} from '@mui/material';
import {
  Warning,
  LocationOn,
  AccessTime,
  LocalPolice,
  LocalHospital,
  LocalFireDepartment,
  Engineering,
  ExpandMore,
  ExpandLess,
  CheckCircle,
  Cancel,
  Directions,
  Phone,
  PersonAdd,
} from '@mui/icons-material';
import { format } from 'date-fns';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';

const EmergencyAlertCard = ({ emergency, onUpdate, userRole = 'police' }) => {
  const [expanded, setExpanded] = useState(false);
  const [actionDialog, setActionDialog] = useState(false);
  const [actionType, setActionType] = useState('');
  const [actionNote, setActionNote] = useState('');
  const [processing, setProcessing] = useState(false);

  const getSeverityColor = (severity) => {
    switch (severity) {
      case 'critical': return 'error';
      case 'high': return 'error';
      case 'medium': return 'warning';
      case 'low': return 'info';
      default: return 'default';
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'pending': return 'warning';
      case 'dispatched': return 'info';
      case 'in_progress': return 'primary';
      case 'resolved': return 'success';
      case 'cancelled': return 'error';
      default: return 'default';
    }
  };

  const getTypeIcon = (type) => {
    switch (type) {
      case 'accident': return '🚗';
      case 'fire': return '🔥';
      case 'medical': return '🚑';
      case 'road_blockage': return '🚧';
      case 'fallen_tree': return '🌳';
      case 'vehicle_breakdown': return '⚠️';
      default: return '📢';
    }
  };

  const getServiceIcon = (service) => {
    switch (service) {
      case 'police': return <LocalPolice fontSize="small" />;
      case 'ambulance': return <LocalHospital fontSize="small" />;
      case 'fireService': return <LocalFireDepartment fontSize="small" />;
      case 'towTruck': return '🚛';
      case 'roadClearance': return '🚜';
      default: return null;
    }
  };

  const getServiceLabel = (service) => {
    switch (service) {
      case 'police': return 'Police';
      case 'ambulance': return 'Ambulance';
      case 'fireService': return 'Fire Service';
      case 'towTruck': return 'Tow Truck';
      case 'roadClearance': return 'Road Clearance';
      default: return service;
    }
  };

  const handleAction = (type) => {
    setActionType(type);
    setActionDialog(true);
  };

  const confirmAction = async () => {
    setProcessing(true);
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));

      let newStatus = emergency.status;
      if (actionType === 'accept') newStatus = 'dispatched';
      if (actionType === 'complete') newStatus = 'resolved';
      if (actionType === 'cancel') newStatus = 'cancelled';

      if (onUpdate) {
        onUpdate({
          ...emergency,
          status: newStatus,
          actionNote,
          actionBy: userRole,
          actionAt: new Date().toISOString(),
        });
      }

      toast.success(`Emergency ${actionType}ed successfully!`);
      setActionDialog(false);
      setActionNote('');
    } catch (error) {
      toast.error('Failed to update emergency status');
    } finally {
      setProcessing(false);
    }
  };

  const openInMaps = () => {
    const url = `https://www.google.com/maps/search/?api=1&query=${emergency.latitude},${emergency.longitude}`;
    window.open(url, '_blank');
  };

  return (
    <>
      <Card
        component={motion.div}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        sx={{
          borderLeft: 6,
          borderColor: `${getSeverityColor(emergency.severity)}.main`,
          position: 'relative',
          '&:hover': {
            boxShadow: 6,
          },
        }}
      >
        {/* Critical Badge */}
        {emergency.severity === 'critical' && (
          <Box
            sx={{
              position: 'absolute',
              top: 10,
              right: 10,
              animation: 'pulse 2s infinite',
              '@keyframes pulse': {
                '0%, 100%': { opacity: 1 },
                '50%': { opacity: 0.5 },
              },
            }}
          >
            <Chip
              label="CRITICAL"
              color="error"
              size="small"
              icon={<Warning />}
            />
          </Box>
        )}

        <CardContent>
          {/* Header */}
          <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 2, mb: 2 }}>
            <Typography variant="h3">{getTypeIcon(emergency.type)}</Typography>
            <Box sx={{ flex: 1 }}>
              <Typography variant="h6" gutterBottom>
                {emergency.type?.replace('_', ' ').toUpperCase()} Emergency
              </Typography>
              <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mb: 1 }}>
                <Chip
                  label={emergency.severity?.toUpperCase()}
                  color={getSeverityColor(emergency.severity)}
                  size="small"
                />
                <Chip
                  label={emergency.status?.replace('_', ' ').toUpperCase()}
                  color={getStatusColor(emergency.status)}
                  size="small"
                  variant="outlined"
                />
              </Box>
              <Typography variant="body2" color="text.secondary" sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                <AccessTime fontSize="small" />
                {emergency.timestamp ? format(new Date(emergency.timestamp), 'PPpp') : 'Just now'}
              </Typography>
            </Box>
          </Box>

          {/* Description */}
          <Alert severity={getSeverityColor(emergency.severity)} sx={{ mb: 2 }}>
            <Typography variant="body2">
              {emergency.description}
            </Typography>
          </Alert>

          {/* Key Information Grid */}
          <Grid container spacing={2} sx={{ mb: 2 }}>
            <Grid item xs={6}>
              <Box sx={{ bgcolor: 'background.default', p: 1.5, borderRadius: 1 }}>
                <Typography variant="caption" color="text.secondary">Casualties</Typography>
                <Typography variant="h6">{emergency.casualties || 0}</Typography>
              </Box>
            </Grid>
            <Grid item xs={6}>
              <Box sx={{ bgcolor: 'background.default', p: 1.5, borderRadius: 1 }}>
                <Typography variant="caption" color="text.secondary">Vehicles Involved</Typography>
                <Typography variant="h6">{emergency.vehiclesInvolved || 0}</Typography>
              </Box>
            </Grid>
          </Grid>

          {/* Required Services */}
          <Box sx={{ mb: 2 }}>
            <Typography variant="subtitle2" gutterBottom fontWeight="bold">
              Required Services:
            </Typography>
            <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
              {emergency.requiredServices?.map((service, index) => (
                <Chip
                  key={index}
                  icon={getServiceIcon(service)}
                  label={getServiceLabel(service)}
                  size="small"
                  color="primary"
                  variant="outlined"
                />
              ))}
            </Box>
          </Box>

          {/* Location */}
          <Box sx={{ bgcolor: 'background.default', p: 1.5, borderRadius: 1, mb: 2 }}>
            <Typography variant="subtitle2" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
              <LocationOn fontSize="small" color="error" />
              Location
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {emergency.address || 'No address provided'}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              📍 {emergency.latitude?.toFixed(6)}, {emergency.longitude?.toFixed(6)}
            </Typography>
          </Box>

          {/* Expanded Details */}
          <Collapse in={expanded}>
            <Divider sx={{ my: 2 }} />

            {emergency.actionNote && (
              <Alert severity="info" sx={{ mb: 2 }}>
                <Typography variant="subtitle2" gutterBottom>Action Note:</Typography>
                <Typography variant="body2">{emergency.actionNote}</Typography>
                {emergency.actionBy && (
                  <Typography variant="caption" color="text.secondary">
                    By {emergency.actionBy} at {emergency.actionAt ? format(new Date(emergency.actionAt), 'PPpp') : ''}
                  </Typography>
                )}
              </Alert>
            )}

            <Typography variant="subtitle2" gutterBottom fontWeight="bold">
              Emergency ID:
            </Typography>
            <Typography variant="caption" color="text.secondary" sx={{ fontFamily: 'monospace', mb: 2, display: 'block' }}>
              {emergency.id || emergency._id || 'N/A'}
            </Typography>
          </Collapse>
        </CardContent>

        <CardActions sx={{ justifyContent: 'space-between', px: 2, pb: 2 }}>
          <Box>
            <IconButton onClick={() => setExpanded(!expanded)} size="small">
              {expanded ? <ExpandLess /> : <ExpandMore />}
            </IconButton>
            <Button
              size="small"
              startIcon={<Directions />}
              onClick={openInMaps}
            >
              Directions
            </Button>
            <Button
              size="small"
              startIcon={<Phone />}
              href={`tel:${emergency.reporterPhone || '112'}`}
            >
              Call
            </Button>
          </Box>

          {/* Action Buttons based on status and role */}
          {userRole === 'police' || userRole === 'admin' ? (
            <Box>
              {emergency.status === 'pending' && (
                <>
                  <Button
                    size="small"
                    color="success"
                    startIcon={<CheckCircle />}
                    onClick={() => handleAction('accept')}
                  >
                    Accept & Dispatch
                  </Button>
                  <Button
                    size="small"
                    color="error"
                    startIcon={<Cancel />}
                    onClick={() => handleAction('cancel')}
                    sx={{ ml: 1 }}
                  >
                    Reject
                  </Button>
                </>
              )}
              {(emergency.status === 'dispatched' || emergency.status === 'in_progress') && (
                <Button
                  size="small"
                  color="success"
                  variant="contained"
                  startIcon={<CheckCircle />}
                  onClick={() => handleAction('complete')}
                >
                  Mark Resolved
                </Button>
              )}
            </Box>
          ) : null}
        </CardActions>
      </Card>

      {/* Action Confirmation Dialog */}
      <Dialog open={actionDialog} onClose={() => setActionDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>
          Confirm {actionType?.toUpperCase()}
        </DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" gutterBottom>
            Are you sure you want to {actionType} this emergency?
          </Typography>
          <TextField
            fullWidth
            multiline
            rows={3}
            label="Add a note (optional)"
            value={actionNote}
            onChange={(e) => setActionNote(e.target.value)}
            sx={{ mt: 2 }}
            placeholder="Add any relevant information..."
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setActionDialog(false)} disabled={processing}>
            Cancel
          </Button>
          <Button
            onClick={confirmAction}
            variant="contained"
            color={actionType === 'cancel' ? 'error' : 'primary'}
            disabled={processing}
          >
            {processing ? 'Processing...' : `Confirm ${actionType}`}
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
};

export default EmergencyAlertCard;
