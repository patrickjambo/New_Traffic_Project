// src/components/map/IncidentMap.js
import React, { useState, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import { Box, Chip, Typography, Button } from '@mui/material';
import { LocationOn, Navigation } from '@mui/icons-material';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Fix for default marker icons in React-Leaflet
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: require('leaflet/dist/images/marker-icon-2x.png'),
  iconUrl: require('leaflet/dist/images/marker-icon.png'),
  shadowUrl: require('leaflet/dist/images/marker-shadow.png'),
});

// Custom marker icons based on incident type
const createCustomIcon = (type, severity) => {
  const colors = {
    accident: '#EA4335',
    congestion: '#FBBC05',
    construction: '#4285F4',
    roadblock: '#9AA0A6',
  };

  const color = colors[type] || '#4285F4';

  return L.divIcon({
    className: 'custom-icon',
    html: `
      <div style="
        background-color: ${color};
        width: 30px;
        height: 30px;
        border-radius: 50%;
        border: 3px solid white;
        box-shadow: 0 2px 8px rgba(0,0,0,0.3);
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 16px;
        animation: ${severity === 'high' ? 'pulse 2s infinite' : 'none'};
      ">
        ${type === 'accident' ? '🚨' : 
          type === 'congestion' ? '🚗' : 
          type === 'construction' ? '🚧' : '⚠️'}
      </div>
    `,
    iconSize: [30, 30],
    iconAnchor: [15, 15],
  });
};

// Component to handle map events and updates
const MapController = ({ incidents, center }) => {
  const map = useMap();

  useEffect(() => {
    if (center) {
      map.setView(center, 13);
    }
  }, [center, map]);

  return null;
};

const IncidentMap = ({ incidents = [], center = [-1.9501, 30.0588], height = 400 }) => {
  const [mapCenter, setMapCenter] = useState(center);
  const [userLocation, setUserLocation] = useState(null);

  useEffect(() => {
    // Get user's current location
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const { latitude, longitude } = position.coords;
          setUserLocation([latitude, longitude]);
          setMapCenter([latitude, longitude]);
        },
        (error) => {
          console.log('Location access denied:', error);
        }
      );
    }
  }, []);

  const getSeverityColor = (severity) => {
    switch (severity) {
      case 'high':
        return 'error';
      case 'medium':
        return 'warning';
      case 'low':
        return 'success';
      default:
        return 'default';
    }
  };

  return (
    <Box sx={{ position: 'relative', height, borderRadius: 2, overflow: 'hidden' }}>
      <MapContainer
        center={mapCenter}
        zoom={13}
        style={{ height: '100%', width: '100%' }}
        scrollWheelZoom={true}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        <MapController incidents={incidents} center={mapCenter} />

        {/* User Location Marker */}
        {userLocation && (
          <Marker
            position={userLocation}
            icon={L.divIcon({
              className: 'user-location-icon',
              html: `
                <div style="
                  background-color: #4285F4;
                  width: 20px;
                  height: 20px;
                  border-radius: 50%;
                  border: 3px solid white;
                  box-shadow: 0 0 10px rgba(66, 133, 244, 0.5);
                  animation: pulse 2s infinite;
                "></div>
              `,
              iconSize: [20, 20],
              iconAnchor: [10, 10],
            })}
          >
            <Popup>
              <Box sx={{ p: 1 }}>
                <Typography variant="subtitle2" fontWeight="bold">
                  📍 Your Location
                </Typography>
              </Box>
            </Popup>
          </Marker>
        )}

        {/* Incident Markers */}
        {incidents.map((incident) => (
          <Marker
            key={incident.id}
            position={[incident.latitude, incident.longitude]}
            icon={createCustomIcon(incident.type, incident.severity)}
          >
            <Popup maxWidth={300}>
              <Box sx={{ p: 1 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                  <Typography variant="subtitle2" fontWeight="bold">
                    {incident.type === 'accident' ? '🚨 Accident' : 
                     incident.type === 'congestion' ? '🚗 Traffic Congestion' : 
                     incident.type === 'construction' ? '🚧 Road Construction' : 
                     '⚠️ Road Blockage'}
                  </Typography>
                  <Chip
                    label={incident.severity}
                    size="small"
                    color={getSeverityColor(incident.severity)}
                  />
                </Box>

                {incident.description && (
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                    {incident.description}
                  </Typography>
                )}

                <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 1 }}>
                  📍 {incident.address || `${incident.latitude.toFixed(4)}, ${incident.longitude.toFixed(4)}`}
                </Typography>

                <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 1 }}>
                  🕐 {new Date(incident.createdAt).toLocaleString()}
                </Typography>

                {incident.status && (
                  <Chip
                    label={incident.status}
                    size="small"
                    color={incident.status === 'resolved' ? 'success' : incident.status === 'verified' ? 'info' : 'default'}
                    sx={{ mb: 1 }}
                  />
                )}

                <Button
                  size="small"
                  fullWidth
                  startIcon={<Navigation />}
                  onClick={() => {
                    // Open in Google Maps
                    window.open(
                      `https://www.google.com/maps/dir/?api=1&destination=${incident.latitude},${incident.longitude}`,
                      '_blank'
                    );
                  }}
                  sx={{ mt: 1 }}
                >
                  Get Directions
                </Button>
              </Box>
            </Popup>
          </Marker>
        ))}
      </MapContainer>

      {/* Map Legend */}
      <Box
        sx={{
          position: 'absolute',
          bottom: 10,
          right: 10,
          bgcolor: 'white',
          p: 1.5,
          borderRadius: 2,
          boxShadow: 2,
          zIndex: 1000,
        }}
      >
        <Typography variant="caption" fontWeight="bold" display="block" gutterBottom>
          Legend:
        </Typography>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
          <Typography variant="caption">🚨 Accident</Typography>
          <Typography variant="caption">🚗 Congestion</Typography>
          <Typography variant="caption">🚧 Construction</Typography>
          <Typography variant="caption">⚠️ Blockage</Typography>
          <Typography variant="caption">📍 Your Location</Typography>
        </Box>
      </Box>

      {/* Pulse animation CSS */}
      <style>
        {`
          @keyframes pulse {
            0% {
              box-shadow: 0 0 0 0 rgba(66, 133, 244, 0.7);
            }
            50% {
              box-shadow: 0 0 0 10px rgba(66, 133, 244, 0);
            }
            100% {
              box-shadow: 0 0 0 0 rgba(66, 133, 244, 0);
            }
          }
        `}
      </style>
    </Box>
  );
};

export default IncidentMap;
