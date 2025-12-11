import React from 'react';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

// Fix for default marker icons
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

const IncidentMap = ({ incidents }) => {
  const kigaliCenter = [-1.9536, 30.0606];

  return (
    <div className="map-container">
      <MapContainer
        center={kigaliCenter}
        zoom={12}
        style={{ height: '100%', width: '100%' }}
      >
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        />
        
        {incidents && incidents.map((incident) => {
          const lat = incident.latitude || -1.9536;
          const lng = incident.longitude || 30.0606;
          
          return (
            <Marker key={incident.id} position={[lat, lng]}>
              <Popup>
                <div className="p-2">
                  <h3 className="font-bold text-sm mb-1">
                    {incident.incident_type || 'Traffic Incident'}
                  </h3>
                  <p className="text-xs text-gray-600 mb-1">
                    {incident.description || 'No description'}
                  </p>
                  <p className="text-xs text-gray-500">
                    {incident.location || 'Kigali'}
                  </p>
                  <span className={`text-xs px-2 py-1 rounded-full ${
                    incident.severity === 'critical' ? 'bg-red-100 text-red-800' :
                    incident.severity === 'high' ? 'bg-orange-100 text-orange-800' :
                    'bg-yellow-100 text-yellow-800'
                  }`}>
                    {incident.severity || 'medium'}
                  </span>
                </div>
              </Popup>
            </Marker>
          );
        })}
      </MapContainer>
    </div>
  );
};

export default IncidentMap;
