import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { MapPin, Navigation, Clock, User, Radio, Signal, Activity, Circle, X } from 'lucide-react';
import { useWebSocket } from '../context/WebSocketContext';
import { useAuth } from '../context/AuthContext';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

// Fix for default marker icons in Leaflet
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

// Create custom officer marker icon
const createOfficerIcon = (isOnline, hasDeployment) => {
  const color = isOnline ? '#22c55e' : '#9ca3af';
  const border = hasDeployment ? '#3b82f6' : '#ffffff';
  
  return L.divIcon({
    className: 'custom-officer-marker',
    html: `<div style="width:32px;height:32px;background-color:${color};border:3px solid ${border};border-radius:50%;display:flex;align-items:center;justify-content:center;box-shadow:0 2px 8px rgba(0,0,0,0.3);">
      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2">
        <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"></path>
        <circle cx="12" cy="7" r="4"></circle>
      </svg>
    </div>`,
    iconSize: [32, 32],
    iconAnchor: [16, 16],
    popupAnchor: [0, -16],
  });
};

/**
 * Real-time Officer Location Tracker Component
 * Shows live locations of all officers with their status
 */
const OfficerLocationTracker = ({ officers = [], deployments = [], onOfficerClick }) => {
    const { subscribe, isConnected } = useWebSocket();
    const { user } = useAuth();
    const [officerLocations, setOfficerLocations] = useState(new Map());
    const [lastUpdate, setLastUpdate] = useState(null);
    const [showMapModal, setShowMapModal] = useState(false);

    // District-specific configuration
    const isDistrictAdmin = user?.role === 'district_admin';
    const userDistrictId = user?.districtId;
    const userDistrictName = user?.districtName;

    // District map configuration
    const districtConfig = useMemo(() => {
        const configs = {
            1: { name: 'Nyarugenge', center: [-1.955, 30.05], zoom: 14 },
            2: { name: 'Gasabo', center: [-1.915, 30.10], zoom: 13 },
            3: { name: 'Kicukiro', center: [-1.99, 30.10], zoom: 13 }
        };
        
        if (isDistrictAdmin && userDistrictId && configs[userDistrictId]) {
            return { ...configs[userDistrictId], isDistrict: true };
        }
        return { name: 'Kigali City', center: [-1.9536, 30.0606], zoom: 12, isDistrict: false };
    }, [isDistrictAdmin, userDistrictId]);

    // Listen for real-time officer location updates
    useEffect(() => {
        if (!isConnected) return;

        const unsubLocation = subscribe('officer:location', (data) => {
            console.log('📍 Real-time officer location:', data);
            
            setOfficerLocations(prev => {
                const newMap = new Map(prev);
                newMap.set(data.officerId, {
                    ...data,
                    receivedAt: new Date(),
                    isOnline: true,
                });
                return newMap;
            });
            
            setLastUpdate(new Date());
        });

        return () => unsubLocation();
    }, [isConnected, subscribe]);

    // Mark officers as offline if no update in 2 minutes
    useEffect(() => {
        const interval = setInterval(() => {
            const twoMinutesAgo = new Date(Date.now() - 2 * 60 * 1000);
            
            setOfficerLocations(prev => {
                const newMap = new Map(prev);
                newMap.forEach((location, officerId) => {
                    if (location.receivedAt < twoMinutesAgo) {
                        newMap.set(officerId, { ...location, isOnline: false });
                    }
                });
                return newMap;
            });
        }, 30000); // Check every 30 seconds

        return () => clearInterval(interval);
    }, []);

    // Get officer's active deployment
    const getOfficerDeployment = useCallback((officerId) => {
        return deployments.find(d => 
            d.officers?.some(o => o.id === officerId) && 
            !['Completed', 'Cancelled'].includes(d.status)
        );
    }, [deployments]);

    // Format time ago
    const formatTimeAgo = (date) => {
        if (!date) return 'Never';
        const seconds = Math.floor((new Date() - new Date(date)) / 1000);
        if (seconds < 60) return 'Just now';
        if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
        if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
        return `${Math.floor(seconds / 86400)}d ago`;
    };

    // Get status color
    const getStatusColor = (status) => {
        switch (status?.toLowerCase()) {
            case 'en_route': return 'text-blue-500 bg-blue-100';
            case 'on_scene': return 'text-green-500 bg-green-100';
            case 'assigned': return 'text-yellow-500 bg-yellow-100';
            case 'available': return 'text-emerald-500 bg-emerald-100';
            default: return 'text-gray-500 bg-gray-100';
        }
    };

    // Get online/offline indicator
    const OnlineIndicator = ({ isOnline }) => (
        <span className={`inline-flex items-center ${isOnline ? 'text-green-500' : 'text-gray-400'}`}>
            <Circle className={`h-2 w-2 ${isOnline ? 'fill-green-500' : 'fill-gray-400'}`} />
        </span>
    );

    return (
        <div className="bg-white rounded-xl shadow-lg border border-gray-100 overflow-hidden">
            {/* Header */}
            <div className="px-6 py-4 bg-gradient-to-r from-blue-600 to-cyan-600 text-white">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <Radio className="h-5 w-5" />
                        <h3 className="text-lg font-semibold">Live Officer Tracking</h3>
                    </div>
                    <div className="flex items-center gap-2 text-sm opacity-90">
                        <Signal className={`h-4 w-4 ${isConnected ? 'text-green-300' : 'text-red-300'}`} />
                        <span>{isConnected ? 'Live' : 'Offline'}</span>
                        {lastUpdate && (
                            <span className="text-xs opacity-75">
                                · Updated {formatTimeAgo(lastUpdate)}
                            </span>
                        )}
                    </div>
                </div>
            </div>

            {/* Stats Bar */}
            <div className="px-6 py-3 bg-gray-50 border-b flex items-center gap-6 text-sm">
                <div className="flex items-center gap-2">
                    <Circle className="h-3 w-3 fill-green-500 text-green-500" />
                    <span className="text-gray-600">
                        Online: {Array.from(officerLocations.values()).filter(l => l.isOnline).length}
                    </span>
                </div>
                <div className="flex items-center gap-2">
                    <Activity className="h-4 w-4 text-blue-500" />
                    <span className="text-gray-600">
                        Active: {deployments.filter(d => d.status === 'Active').length}
                    </span>
                </div>
                <div className="flex items-center gap-2">
                    <Navigation className="h-4 w-4 text-indigo-500" />
                    <span className="text-gray-600">
                        En Route: {deployments.filter(d => 
                            d.officers?.some(o => o.status === 'en_route')
                        ).length}
                    </span>
                </div>
            </div>

            {/* Officers List */}
            <div className="divide-y divide-gray-100 max-h-96 overflow-y-auto">
                {officers.length === 0 ? (
                    <div className="px-6 py-8 text-center text-gray-500">
                        <User className="h-8 w-8 mx-auto mb-2 opacity-50" />
                        <p>No officers available</p>
                    </div>
                ) : (
                    officers.map((officer) => {
                        const location = officerLocations.get(officer.id);
                        const deployment = getOfficerDeployment(officer.id);
                        const isOnline = location?.isOnline;

                        return (
                            <div
                                key={officer.id}
                                className={`px-6 py-4 hover:bg-gray-50 cursor-pointer transition-colors ${
                                    isOnline ? '' : 'opacity-60'
                                }`}
                                onClick={() => onOfficerClick?.(officer, location, deployment)}
                            >
                                <div className="flex items-start justify-between">
                                    <div className="flex items-start gap-3">
                                        {/* Avatar with online indicator */}
                                        <div className="relative">
                                            <div className="h-10 w-10 rounded-full bg-indigo-100 flex items-center justify-center">
                                                <User className="h-5 w-5 text-indigo-600" />
                                            </div>
                                            <span className={`absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-white ${
                                                isOnline ? 'bg-green-500' : 'bg-gray-400'
                                            }`} />
                                        </div>

                                        {/* Officer Info */}
                                        <div>
                                            <div className="flex items-center gap-2">
                                                <span className="font-medium text-gray-900">
                                                    {officer.full_name || officer.fullName || 'Unknown Officer'}
                                                </span>
                                                {officer.badge_number && (
                                                    <span className="text-xs text-gray-500 bg-gray-100 px-2 py-0.5 rounded">
                                                        #{officer.badge_number}
                                                    </span>
                                                )}
                                            </div>

                                            {/* Location */}
                                            {location ? (
                                                <div className="flex items-center gap-1 text-sm text-gray-600 mt-1">
                                                    <MapPin className="h-3 w-3" />
                                                    <span className="truncate max-w-xs">
                                                        {location.address || `${location.latitude?.toFixed(4)}, ${location.longitude?.toFixed(4)}`}
                                                    </span>
                                                </div>
                                            ) : (
                                                <div className="flex items-center gap-1 text-sm text-gray-400 mt-1">
                                                    <MapPin className="h-3 w-3" />
                                                    <span>Location not available</span>
                                                </div>
                                            )}

                                            {/* Current Deployment */}
                                            {deployment && (
                                                <div className="mt-2">
                                                    <span className="text-xs bg-indigo-50 text-indigo-600 px-2 py-1 rounded-full">
                                                        📋 {deployment.unit_name || deployment.unitName}
                                                    </span>
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    {/* Right Side - Status & Speed */}
                                    <div className="text-right">
                                        {/* Status Badge */}
                                        <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${
                                            getStatusColor(deployment?.officers?.find(o => o.id === officer.id)?.status || officer.status)
                                        }`}>
                                            {deployment?.officers?.find(o => o.id === officer.id)?.status || officer.status || 'Available'}
                                        </span>

                                        {/* Speed & Last Update */}
                                        {location && (
                                            <div className="mt-2 text-xs text-gray-500">
                                                {location.speed > 0 && (
                                                    <div className="flex items-center justify-end gap-1">
                                                        <Navigation className="h-3 w-3" />
                                                        <span>{Math.round(location.speed * 3.6)} km/h</span>
                                                    </div>
                                                )}
                                                <div className="flex items-center justify-end gap-1 mt-1">
                                                    <Clock className="h-3 w-3" />
                                                    <span>{formatTimeAgo(location.timestamp || location.receivedAt)}</span>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        );
                    })
                )}
            </div>

            {/* Footer with Map Toggle */}
            <div className="px-6 py-3 bg-gray-50 border-t">
                <button 
                    onClick={() => setShowMapModal(!showMapModal)}
                    className="w-full py-2 text-center text-sm text-indigo-600 hover:text-indigo-800 font-medium transition-colors"
                >
                    {showMapModal ? '📋 Hide Map' : '🗺️ View All on Map'}
                </button>
            </div>

            {/* Inline Expanded Map - Shows within the content area */}
            {showMapModal && (
                <div className="border-t bg-white">
                    {/* Map Header */}
                    <div className="flex items-center justify-between px-4 py-3 bg-gradient-to-r from-blue-600 to-cyan-600 text-white">
                        <div className="flex items-center gap-2">
                            <MapPin className="h-5 w-5" />
                            <div>
                                <h3 className="font-bold text-sm">
                                    {districtConfig.isDistrict ? `${districtConfig.name} District` : 'All Districts'} - Live Officers
                                </h3>
                                <p className="text-xs text-indigo-200">
                                    {officers.length} officers • Scroll to zoom, drag to pan
                                </p>
                            </div>
                        </div>
                        <button 
                            onClick={() => setShowMapModal(false)}
                            className="p-1.5 hover:bg-white/20 rounded-lg transition-colors"
                            title="Close map"
                        >
                            <X className="h-4 w-4" />
                        </button>
                    </div>

                    {/* Map Content - Fixed height within the component */}
                    <div style={{ height: '400px', position: 'relative' }}>
                        <MapContainer
                            center={districtConfig.center}
                            zoom={districtConfig.zoom}
                            style={{ height: '100%', width: '100%' }}
                            scrollWheelZoom={true}
                            zoomControl={true}
                        >
                            <TileLayer
                                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                                attribution='&copy; OpenStreetMap contributors'
                            />
                            
                            {officers.map((officer) => {
                                const location = officerLocations.get(officer.id) || officerLocations.get(String(officer.id));
                                const lat = location?.latitude || officer.current_latitude;
                                const lng = location?.longitude || officer.current_longitude;
                                
                                if (!lat || !lng) return null;

                                const isOnline = location?.isOnline !== false;
                                const deployment = deployments.find(d => d.officers?.some(o => o.id === officer.id));
                                const icon = createOfficerIcon(isOnline, !!deployment);

                                return (
                                    <Marker key={officer.id} position={[parseFloat(lat), parseFloat(lng)]} icon={icon}>
                                        <Popup>
                                            <div className="p-2 min-w-[160px]">
                                                <div className="font-bold text-sm mb-1">{officer.full_name || 'Unknown'}</div>
                                                <div className="text-xs text-gray-500 mb-1">Badge: {officer.badge_number || 'N/A'}</div>
                                                <div className="text-xs text-gray-600 mb-1">
                                                    📍 {parseFloat(lat).toFixed(5)}, {parseFloat(lng).toFixed(5)}
                                                </div>
                                                <div className={`text-xs font-medium ${isOnline ? 'text-green-600' : 'text-gray-500'}`}>
                                                    {isOnline ? '🟢 Online' : '⚫ Offline'}
                                                </div>
                                            </div>
                                        </Popup>
                                    </Marker>
                                );
                            })}
                        </MapContainer>

                        {/* Legend Overlay */}
                        <div className="absolute bottom-3 left-3 bg-white/95 backdrop-blur rounded-lg p-2 shadow-lg text-xs z-[1000]">
                            <div className="flex items-center gap-3">
                                <div className="flex items-center gap-1">
                                    <div className="w-3 h-3 rounded-full bg-green-500" />
                                    <span>Online</span>
                                </div>
                                <div className="flex items-center gap-1">
                                    <div className="w-3 h-3 rounded-full bg-gray-400" />
                                    <span>Offline</span>
                                </div>
                            </div>
                        </div>

                        {/* Officer Count */}
                        <div className="absolute bottom-3 right-3 bg-white/95 backdrop-blur rounded-lg px-3 py-1.5 shadow-lg z-[1000]">
                            <div className="text-xs font-semibold">👮 {officers.length} Officers</div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default OfficerLocationTracker; 

