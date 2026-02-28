import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { MapPin, Navigation, Clock, User, Radio, Signal, Activity, Circle, X, Locate, ArrowUpRight, AlertTriangle, Siren } from 'lucide-react';
import { useWebSocket } from '../context/WebSocketContext';
import { useAuth } from '../context/AuthContext';
import { incidentService, emergencyService } from '../services/api';
import { MapContainer, TileLayer, Marker, Popup, CircleMarker } from 'react-leaflet';
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
  const color = isOnline ? '#22c55e' : '#9ca3af';  // Green for online, gray for offline
  const border = hasDeployment ? '#06b6d4' : '#ffffff';  // Cyan for deployed, white otherwise
  
  return L.divIcon({
    className: 'custom-officer-marker',
    html: `<div style="width:36px;height:36px;background-color:${color};border:3px solid ${border};border-radius:50%;display:flex;align-items:center;justify-content:center;box-shadow:0 3px 10px rgba(0,0,0,0.3);${isOnline ? 'animation:pulse 2s infinite;' : ''}">
      <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2">
        <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"></path>
        <circle cx="12" cy="7" r="4"></circle>
      </svg>
    </div>
    <style>
      @keyframes pulse {
        0%, 100% { transform: scale(1); opacity: 1; }
        50% { transform: scale(1.05); opacity: 0.9; }
      }
    </style>`,
    iconSize: [36, 36],
    iconAnchor: [18, 18],
    popupAnchor: [0, -18],
  });
};

// Create admin location marker icon
const createAdminIcon = () => {
  return L.divIcon({
    className: 'custom-admin-marker',
    html: `<div style="width:44px;height:44px;background-color:#06b6d4;border:4px solid #ffffff;border-radius:50%;display:flex;align-items:center;justify-content:center;box-shadow:0 4px 15px rgba(6,182,212,0.5);animation:adminPulse 2s infinite;">
      <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5">
        <path d="M12 22s-8-4.5-8-11.8A8 8 0 0 1 12 2a8 8 0 0 1 8 8.2c0 7.3-8 11.8-8 11.8z"/>
        <circle cx="12" cy="10" r="3"/>
      </svg>
    </div>
    <style>
      @keyframes adminPulse {
        0%, 100% { transform: scale(1); box-shadow: 0 4px 15px rgba(6,182,212,0.5); }
        50% { transform: scale(1.1); box-shadow: 0 6px 25px rgba(6,182,212,0.7); }
      }
    </style>`,
    iconSize: [44, 44],
    iconAnchor: [22, 22],
    popupAnchor: [0, -22],
  });
};

// Create incident marker icon
const createIncidentIcon = (type, severity) => {
  const colors = {
    critical: '#ef4444',
    high: '#f97316',
    medium: '#eab308',
    low: '#22c55e'
  };
  const color = colors[severity] || colors.medium;
  
  return L.divIcon({
    className: 'custom-incident-marker',
    html: `<div style="width:32px;height:32px;background-color:${color};border:3px solid #ffffff;border-radius:8px;display:flex;align-items:center;justify-content:center;box-shadow:0 3px 10px rgba(0,0,0,0.3);animation:incidentPulse 1.5s infinite;">
      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5">
        <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
        <line x1="12" y1="9" x2="12" y2="13"/>
        <line x1="12" y1="17" x2="12.01" y2="17"/>
      </svg>
    </div>
    <style>
      @keyframes incidentPulse {
        0%, 100% { transform: scale(1); }
        50% { transform: scale(1.15); }
      }
    </style>`,
    iconSize: [32, 32],
    iconAnchor: [16, 16],
    popupAnchor: [0, -16],
  });
};

// Create emergency marker icon
const createEmergencyIcon = (severity) => {
  const colors = {
    critical: '#dc2626',
    high: '#ea580c',
    medium: '#ca8a04',
    low: '#16a34a'
  };
  const color = colors[severity] || colors.high;
  
  return L.divIcon({
    className: 'custom-emergency-marker',
    html: `<div style="width:36px;height:36px;background-color:${color};border:3px solid #ffffff;border-radius:50%;display:flex;align-items:center;justify-content:center;box-shadow:0 3px 12px ${color}80;animation:emergencyPulse 1s infinite;">
      <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5">
        <path d="M7 18V6l6 6 6-6v12"/>
      </svg>
    </div>
    <style>
      @keyframes emergencyPulse {
        0%, 100% { transform: scale(1); opacity: 1; }
        50% { transform: scale(1.2); opacity: 0.8; }
      }
    </style>`,
    iconSize: [36, 36],
    iconAnchor: [18, 18],
    popupAnchor: [0, -18],
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
    const [adminLocation, setAdminLocation] = useState(null);
    const [adminLocationEnabled, setAdminLocationEnabled] = useState(false);
    const [locationPermissionAsked, setLocationPermissionAsked] = useState(false);
    const [locationLoading, setLocationLoading] = useState(false);
    const [incidents, setIncidents] = useState([]);
    const [emergencies, setEmergencies] = useState([]);

    // District-specific configuration
    const isDistrictAdmin = user?.role === 'district_admin';
    const userDistrictId = user?.districtId;
    const userDistrictName = user?.districtName;

    // 4-hour expiry time in milliseconds
    const EXPIRY_TIME_MS = 4 * 60 * 60 * 1000; // 4 hours

    // Check if an item is expired (older than 4 hours)
    const isExpired = useCallback((createdAt) => {
        if (!createdAt) return false;
        const createdTime = new Date(createdAt).getTime();
        const now = Date.now();
        return (now - createdTime) > EXPIRY_TIME_MS;
    }, [EXPIRY_TIME_MS]);

    // Fetch incidents and emergencies
    const fetchIncidentsAndEmergencies = useCallback(async () => {
        try {
            const [incidentsRes, emergenciesRes] = await Promise.all([
                incidentService.getAll(),
                emergencyService.getAll()
            ]);
            
            // Filter active incidents (not resolved) AND not expired (within 4 hours)
            const activeIncidents = (incidentsRes.data || incidentsRes || [])
                .filter(i => {
                    const isResolved = ['resolved', 'closed', 'completed'].includes(i.status?.toLowerCase());
                    const expired = isExpired(i.created_at);
                    return !isResolved && !expired;
                });
            setIncidents(activeIncidents);
            
            // Filter active emergencies AND not expired (within 4 hours)
            const activeEmergencies = (emergenciesRes.data || emergenciesRes || [])
                .filter(e => {
                    const isResolved = ['resolved', 'closed', 'completed'].includes(e.status?.toLowerCase());
                    const expired = isExpired(e.created_at);
                    return !isResolved && !expired;
                });
            setEmergencies(activeEmergencies);
        } catch (error) {
            console.error('Error fetching incidents/emergencies:', error);
        }
    }, [isExpired]);

    // Initial fetch and auto-refresh
    useEffect(() => {
        fetchIncidentsAndEmergencies();
        
        // Refresh every 10 seconds
        const refreshInterval = setInterval(fetchIncidentsAndEmergencies, 10000);
        
        return () => clearInterval(refreshInterval);
    }, [fetchIncidentsAndEmergencies]);

    // Default location (Kigali center) for fallback
    const defaultLocation = { latitude: -1.9441, longitude: 30.0619 };

    // Request admin location permission
    const requestLocationPermission = useCallback(() => {
        console.log('📍 Requesting location permission...');
        setLocationLoading(true);
        
        if (!navigator.geolocation) {
            console.log('❌ Geolocation not supported, using default');
            setAdminLocation(defaultLocation);
            setAdminLocationEnabled(true);
            setLocationPermissionAsked(true);
            setLocationLoading(false);
            return;
        }

        navigator.geolocation.getCurrentPosition(
            (position) => {
                console.log('✅ Location obtained:', position.coords);
                const newLocation = {
                    latitude: position.coords.latitude,
                    longitude: position.coords.longitude,
                    accuracy: position.coords.accuracy
                };
                setAdminLocation(newLocation);
                setAdminLocationEnabled(true);
                setLocationPermissionAsked(true);
                setLocationLoading(false);
                
                // Start watching position for real-time updates
                navigator.geolocation.watchPosition(
                    (pos) => {
                        setAdminLocation({
                            latitude: pos.coords.latitude,
                            longitude: pos.coords.longitude,
                            accuracy: pos.coords.accuracy
                        });
                    },
                    (err) => console.log('Watch position error:', err),
                    { enableHighAccuracy: true, timeout: 10000, maximumAge: 30000 }
                );
            },
            (error) => {
                console.log('❌ Location permission denied:', error.message);
                console.log('📍 Using default location (Kigali center)');
                // Use default location as fallback
                const fallbackLoc = { latitude: -1.9441, longitude: 30.0619 };
                console.log('📍 Setting admin location to:', fallbackLoc);
                setAdminLocation(fallbackLoc);
                setAdminLocationEnabled(true);
                setLocationPermissionAsked(true);
                setLocationLoading(false);
                console.log('✅ Admin location should now be enabled');
            },
            { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
        );
    }, []);

    // Disable admin location
    const disableAdminLocation = useCallback(() => {
        setAdminLocation(null);
        setAdminLocationEnabled(false);
    }, []);

    // Auto-request admin location on component mount
    useEffect(() => {
        // Automatically request location permission when map is opened
        if (showMapModal && !locationPermissionAsked) {
            requestLocationPermission();
        }
    }, [showMapModal, locationPermissionAsked, requestLocationPermission]);

    // Calculate distance between two coordinates (Haversine formula)
    const calculateDistance = useCallback((lat1, lon1, lat2, lon2) => {
        if (!lat1 || !lon1 || !lat2 || !lon2) return null;
        const R = 6371; // Earth's radius in km
        const dLat = (lat2 - lat1) * Math.PI / 180;
        const dLon = (lon2 - lon1) * Math.PI / 180;
        const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
                  Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
                  Math.sin(dLon/2) * Math.sin(dLon/2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
        return R * c;
    }, []);

    // Format distance for display
    const formatDistance = (distanceKm) => {
        if (distanceKm === null) return null;
        if (distanceKm < 1) return `${Math.round(distanceKm * 1000)}m`;
        return `${distanceKm.toFixed(1)}km`;
    };

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

        // Listen for officer login/online status
        const unsubOnline = subscribe('officer:online', (data) => {
            console.log('🟢 Officer came online:', data);
            setOfficerLocations(prev => {
                const newMap = new Map(prev);
                const existing = newMap.get(data.officerId) || {};
                newMap.set(data.officerId, {
                    ...existing,
                    ...data,
                    receivedAt: new Date(),
                    isOnline: true,
                    loginTime: new Date()
                });
                return newMap;
            });
            setLastUpdate(new Date());
        });

        // Listen for officer logout/offline status
        const unsubOffline = subscribe('officer:offline', (data) => {
            console.log('⚫ Officer went offline:', data);
            setOfficerLocations(prev => {
                const newMap = new Map(prev);
                const existing = newMap.get(data.officerId);
                if (existing) {
                    newMap.set(data.officerId, { ...existing, isOnline: false });
                }
                return newMap;
            });
        });

        // Listen for officer duty status changes
        const unsubDuty = subscribe('officer:duty_status', (data) => {
            console.log('📋 Officer duty status:', data);
            setOfficerLocations(prev => {
                const newMap = new Map(prev);
                const existing = newMap.get(data.officerId) || {};
                newMap.set(data.officerId, {
                    ...existing,
                    isOnDuty: data.isOnDuty,
                    receivedAt: new Date(),
                    isOnline: data.isOnDuty
                });
                return newMap;
            });
            setLastUpdate(new Date());
        });

        // Listen for new incidents in real-time
        const unsubIncident = subscribe('incident:new', (data) => {
            console.log('🚨 New incident:', data);
            fetchIncidentsAndEmergencies();
        });

        // Listen for incident updates
        const unsubIncidentUpdate = subscribe('incident:update', (data) => {
            console.log('🔄 Incident updated:', data);
            fetchIncidentsAndEmergencies();
        });

        // Listen for new emergencies in real-time
        const unsubEmergency = subscribe('emergency:new', (data) => {
            console.log('🆘 New emergency:', data);
            fetchIncidentsAndEmergencies();
        });

        // Listen for emergency updates
        const unsubEmergencyUpdate = subscribe('emergency:update', (data) => {
            console.log('🔄 Emergency updated:', data);
            fetchIncidentsAndEmergencies();
        });

        // Listen for AI-detected incidents
        const unsubAI = subscribe('ai:incident_detected', (data) => {
            console.log('🤖 AI detected:', data);
            fetchIncidentsAndEmergencies();
        });

        // Listen for incident resolved/closed
        const unsubIncidentResolved = subscribe('incident:resolved', (data) => {
            console.log('✅ Incident resolved:', data);
            // Remove resolved incident from state immediately
            setIncidents(prev => prev.filter(i => i.id !== data.incidentId && i.id !== data.id));
            fetchIncidentsAndEmergencies();
        });

        // Listen for emergency resolved/closed
        const unsubEmergencyResolved = subscribe('emergency:resolved', (data) => {
            console.log('✅ Emergency resolved:', data);
            // Remove resolved emergency from state immediately
            setEmergencies(prev => prev.filter(e => e.id !== data.emergencyId && e.id !== data.id));
            fetchIncidentsAndEmergencies();
        });

        return () => {
            unsubLocation();
            unsubOnline();
            unsubOffline();
            unsubDuty();
            unsubIncident();
            unsubIncidentUpdate();
            unsubEmergency();
            unsubEmergencyUpdate();
            unsubAI();
            unsubIncidentResolved();
            unsubEmergencyResolved();
        };
    }, [isConnected, subscribe, fetchIncidentsAndEmergencies]);

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

    // Sort officers: online first, then by login time (most recent first)
    const sortedOfficers = useMemo(() => {
        return [...officers].sort((a, b) => {
            const locA = officerLocations.get(a.id);
            const locB = officerLocations.get(b.id);
            
            const aIsOnline = locA?.isOnline || a.is_on_duty || a.is_online;
            const bIsOnline = locB?.isOnline || b.is_on_duty || b.is_online;
            
            // Online officers come first
            if (aIsOnline && !bIsOnline) return -1;
            if (!aIsOnline && bIsOnline) return 1;
            
            // If both online, sort by most recent activity
            if (aIsOnline && bIsOnline) {
                const aTime = locA?.receivedAt || locA?.loginTime || new Date(a.last_login || 0);
                const bTime = locB?.receivedAt || locB?.loginTime || new Date(b.last_login || 0);
                return new Date(bTime) - new Date(aTime);
            }
            
            // If both offline, sort by name
            return (a.full_name || '').localeCompare(b.full_name || '');
        });
    }, [officers, officerLocations]);

    // Calculate online/active counts
    const onlineCount = useMemo(() => {
        return sortedOfficers.filter(o => {
            const loc = officerLocations.get(o.id);
            return loc?.isOnline || o.is_on_duty || o.is_online;
        }).length;
    }, [sortedOfficers, officerLocations]);

    // Get officer's active deployment
    const getOfficerDeployment = useCallback((officerId) => {
        return deployments.find(d => 
            d.officers?.some(o => o.id === officerId) && 
            !['Completed', 'Cancelled'].includes(d.status)
        );
    }, [deployments]);

    // Get officer distance from admin (only if admin location is enabled)
    const getOfficerDistance = useCallback((officer) => {
        if (!adminLocationEnabled || !adminLocation) return null;
        
        const location = officerLocations.get(officer.id);
        const lat = location?.latitude || officer.current_latitude;
        const lng = location?.longitude || officer.current_longitude;
        
        if (lat && lng) {
            return calculateDistance(adminLocation.latitude, adminLocation.longitude, parseFloat(lat), parseFloat(lng));
        }
        return null;
    }, [officerLocations, adminLocation, adminLocationEnabled, calculateDistance]);

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
            case 'en_route': return 'text-cyan-500 bg-cyan-100';
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
            <div className="px-6 py-4 bg-gradient-to-r from-slate-800 to-cyan-700 text-white">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <Radio className={`h-5 w-5 ${isConnected ? 'animate-pulse text-cyan-300' : ''}`} />
                        <h3 className="text-lg font-semibold">Live Officer Tracking</h3>
                    </div>
                    <div className="flex items-center gap-2">
                        <div className={`flex items-center gap-1.5 px-2 py-1 rounded-full ${isConnected ? 'bg-cyan-500/20' : 'bg-red-500/20'}`}>
                            <Signal className={`h-4 w-4 ${isConnected ? 'text-cyan-300' : 'text-red-300'}`} />
                            <span className={`text-sm font-medium ${isConnected ? 'text-cyan-300' : 'text-red-300'}`}>
                                {isConnected ? 'Live' : 'Offline'}
                            </span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Stats Bar */}
            <div className="px-6 py-3 bg-gray-50 border-b flex items-center justify-between text-sm">
                <div className="flex items-center gap-6">
                    <div className="flex items-center gap-2">
                        <Circle className="h-3 w-3 fill-green-500 text-green-500 animate-pulse" />
                        <span className="text-gray-700 font-medium">
                            Online: <span className="text-green-600">{onlineCount}</span>
                        </span>
                    </div>
                    <div className="flex items-center gap-2">
                        <Activity className="h-4 w-4 text-cyan-500" />
                        <span className="text-gray-700 font-medium">
                            Active: <span className="text-cyan-600">{deployments.filter(d => d.status === 'Active').length}</span>
                        </span>
                    </div>
                    <div className="flex items-center gap-2">
                        <AlertTriangle className="h-4 w-4 text-yellow-500" />
                        <span className="text-gray-700 font-medium">
                            Incidents: <span className="text-yellow-600">{incidents.length}</span>
                        </span>
                    </div>
                    <div className="flex items-center gap-2">
                        <Siren className="h-4 w-4 text-red-500" />
                        <span className="text-gray-700 font-medium">
                            Emergencies: <span className="text-red-600">{emergencies.length}</span>
                        </span>
                    </div>
                </div>
                {lastUpdate && (
                    <span className="text-xs text-gray-500">
                        Updated {formatTimeAgo(lastUpdate)}
                    </span>
                )}
            </div>

            {/* Officers List - Sorted with online first */}
            <div className="divide-y divide-gray-100 max-h-96 overflow-y-auto">
                {sortedOfficers.length === 0 ? (
                    <div className="px-6 py-8 text-center text-gray-500">
                        <User className="h-8 w-8 mx-auto mb-2 opacity-50" />
                        <p>No officers available</p>
                    </div>
                ) : (
                    sortedOfficers.map((officer) => {
                        const location = officerLocations.get(officer.id);
                        const deployment = getOfficerDeployment(officer.id);
                        const isOnline = location?.isOnline || officer.is_on_duty || officer.is_online;
                        const distance = getOfficerDistance(officer);
                        const formattedDist = formatDistance(distance);

                        return (
                            <div
                                key={officer.id}
                                className={`px-6 py-4 hover:bg-cyan-50/50 cursor-pointer transition-all ${
                                    isOnline ? 'bg-white' : 'bg-gray-50/50 opacity-70'
                                }`}
                                onClick={() => onOfficerClick?.(officer, location, deployment)}
                            >
                                <div className="flex items-start justify-between">
                                    <div className="flex items-start gap-3">
                                        {/* Avatar with online indicator */}
                                        <div className="relative">
                                            <div className={`h-10 w-10 rounded-full flex items-center justify-center ${
                                                isOnline ? 'bg-cyan-100' : 'bg-gray-100'
                                            }`}>
                                                <User className={`h-5 w-5 ${isOnline ? 'text-cyan-600' : 'text-gray-500'}`} />
                                            </div>
                                            <span className={`absolute -bottom-0.5 -right-0.5 h-3.5 w-3.5 rounded-full border-2 border-white ${
                                                isOnline ? 'bg-green-500 animate-pulse' : 'bg-gray-400'
                                            }`} />
                                        </div>

                                        {/* Officer Info */}
                                        <div>
                                            <div className="flex items-center gap-2">
                                                <span className={`font-semibold ${isOnline ? 'text-gray-900' : 'text-gray-600'}`}>
                                                    {officer.full_name || officer.fullName || 'Unknown Officer'}
                                                </span>
                                                {officer.badge_number && (
                                                    <span className="text-xs text-cyan-600 bg-cyan-50 px-2 py-0.5 rounded font-medium">
                                                        #{officer.badge_number}
                                                    </span>
                                                )}
                                            </div>

                                            {/* Location with distance */}
                                            <div className="flex items-center gap-2 text-sm mt-1">
                                                {location?.latitude ? (
                                                    <>
                                                        <div className="flex items-center gap-1 text-gray-600">
                                                            <MapPin className="h-3 w-3 text-cyan-500" />
                                                            <span className="truncate max-w-[180px]">
                                                                {location.address || `${parseFloat(location.latitude).toFixed(4)}, ${parseFloat(location.longitude).toFixed(4)}`}
                                                            </span>
                                                        </div>
                                                        {formattedDist && (
                                                            <div className="flex items-center gap-1 text-cyan-600 bg-cyan-50 px-2 py-0.5 rounded-full text-xs font-medium">
                                                                <ArrowUpRight className="h-3 w-3" />
                                                                <span>{formattedDist}</span>
                                                            </div>
                                                        )}
                                                    </>
                                                ) : (
                                                    <div className="flex items-center gap-1 text-gray-400">
                                                        <MapPin className="h-3 w-3" />
                                                        <span>Location not available</span>
                                                    </div>
                                                )}
                                            </div>

                                            {/* Current Deployment */}
                                            {deployment && (
                                                <div className="mt-2">
                                                    <span className="text-xs bg-cyan-50 text-cyan-700 px-2 py-1 rounded-full font-medium">
                                                        📋 {deployment.unit_name || deployment.unitName}
                                                    </span>
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    {/* Right Side - Status & Speed */}
                                    <div className="text-right flex flex-col items-end gap-2">
                                        {/* Status Badge */}
                                        <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold ${
                                            isOnline 
                                                ? 'bg-green-100 text-green-700' 
                                                : 'bg-gray-100 text-gray-500'
                                        }`}>
                                            {deployment?.officers?.find(o => o.id === officer.id)?.status || 
                                             (isOnline ? 'Available' : 'Offline')}
                                        </span>

                                        {/* Speed & Last Update */}
                                        {location && (
                                            <div className="text-xs text-gray-500 space-y-1">
                                                {location.speed > 0 && (
                                                    <div className="flex items-center justify-end gap-1 text-cyan-600">
                                                        <Navigation className="h-3 w-3" />
                                                        <span className="font-medium">{Math.round(location.speed * 3.6)} km/h</span>
                                                    </div>
                                                )}
                                                <div className="flex items-center justify-end gap-1">
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
                    className="w-full py-2.5 text-center text-sm text-cyan-600 hover:text-cyan-700 hover:bg-cyan-50 font-semibold transition-all rounded-lg"
                >
                    {showMapModal ? '📋 Hide Map' : '🗺️ View All on Map'}
                </button>
            </div>

            {/* Inline Expanded Map - Shows within the content area */}
            {showMapModal && (
                <div className="border-t bg-white">
                    {/* Map Header */}
                    <div className="flex items-center justify-between px-4 py-3 bg-gradient-to-r from-slate-800 to-cyan-700 text-white">
                        <div className="flex items-center gap-2">
                            <MapPin className="h-5 w-5 text-cyan-300" />
                            <div>
                                <h3 className="font-bold text-sm">
                                    {districtConfig.isDistrict ? `${districtConfig.name} District` : 'All Districts'} - Live Tracking
                                </h3>
                                <p className="text-xs text-cyan-200">
                                    {sortedOfficers.length} officers • {incidents.length} incidents • {emergencies.length} emergencies
                                </p>
                            </div>
                        </div>
                        <div className="flex items-center gap-2">
                            {/* Admin Location Toggle */}
                            <button
                                onClick={() => {
                                    console.log('Button clicked! Current state:', { adminLocationEnabled, locationLoading });
                                    if (adminLocationEnabled) {
                                        disableAdminLocation();
                                    } else {
                                        requestLocationPermission();
                                    }
                                }}
                                disabled={locationLoading}
                                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                                    locationLoading
                                        ? 'bg-yellow-500 text-white cursor-wait'
                                        : adminLocationEnabled 
                                            ? 'bg-cyan-500 text-white hover:bg-cyan-600' 
                                            : 'bg-white/20 text-white hover:bg-white/30'
                                }`}
                                title={adminLocationEnabled ? 'Hide your location' : 'Show your location on map'}
                            >
                                <Locate className={`h-3.5 w-3.5 ${locationLoading ? 'animate-spin' : ''}`} />
                                {locationLoading ? 'Getting Location...' : adminLocationEnabled ? '📍 My Location ON' : 'Show My Location'}
                            </button>
                            <button 
                                onClick={() => setShowMapModal(false)}
                                className="p-1.5 hover:bg-white/20 rounded-lg transition-colors"
                                title="Close map"
                            >
                                <X className="h-4 w-4" />
                            </button>
                        </div>
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
                            
                            {sortedOfficers.map((officer) => {
                                const location = officerLocations.get(officer.id) || officerLocations.get(String(officer.id));
                                const lat = location?.latitude || officer.current_latitude;
                                const lng = location?.longitude || officer.current_longitude;
                                
                                if (!lat || !lng) return null;

                                const isOnline = location?.isOnline || officer.is_on_duty || officer.is_online;
                                const deployment = deployments.find(d => d.officers?.some(o => o.id === officer.id));
                                const icon = createOfficerIcon(isOnline, !!deployment);
                                const distance = getOfficerDistance(officer);
                                const formattedDist = formatDistance(distance);

                                return (
                                    <Marker key={officer.id} position={[parseFloat(lat), parseFloat(lng)]} icon={icon}>
                                        <Popup>
                                            <div className="p-2 min-w-[180px]">
                                                <div className="font-bold text-sm mb-1">{officer.full_name || 'Unknown'}</div>
                                                <div className="text-xs text-gray-500 mb-1">Badge: {officer.badge_number || 'N/A'}</div>
                                                <div className="text-xs text-gray-600 mb-1">
                                                    📍 {parseFloat(lat).toFixed(5)}, {parseFloat(lng).toFixed(5)}
                                                </div>
                                                {formattedDist && (
                                                    <div className="text-xs text-cyan-600 font-medium mb-1">
                                                        📏 {formattedDist} from you
                                                    </div>
                                                )}
                                                <div className={`text-xs font-medium ${isOnline ? 'text-green-600' : 'text-gray-500'}`}>
                                                    {isOnline ? '🟢 Online' : '⚫ Offline'}
                                                </div>
                                            </div>
                                        </Popup>
                                    </Marker>
                                );
                            })}

                            {/* Admin Location Marker - Only shown when enabled */}
                            {adminLocationEnabled && adminLocation && (
                                <Marker 
                                    position={[adminLocation.latitude, adminLocation.longitude]} 
                                    icon={createAdminIcon()}
                                >
                                    <Popup>
                                        <div className="p-2 min-w-[180px]">
                                            <div className="font-bold text-sm mb-1 text-cyan-700">📍 Your Location</div>
                                            <div className="text-xs text-gray-600 mb-1">
                                                {user?.full_name || user?.email || 'Admin'}
                                            </div>
                                            <div className="text-xs text-gray-500">
                                                📍 {adminLocation.latitude.toFixed(5)}, {adminLocation.longitude.toFixed(5)}
                                            </div>
                                            <div className="text-xs text-cyan-600 font-medium mt-1">
                                                ✅ {adminLocation.accuracy ? 'Live Location' : 'Default Location (Kigali)'}
                                            </div>
                                        </div>
                                    </Popup>
                                </Marker>
                            )}
                            
                            {/* Debug: Show admin location status */}
                            {console.log('🗺️ Admin location state:', { adminLocationEnabled, adminLocation })}

                            {/* Incident Markers */}
                            {incidents.map((incident) => {
                                const lat = incident.latitude || incident.location?.latitude;
                                const lng = incident.longitude || incident.location?.longitude;
                                
                                if (!lat || !lng) return null;

                                return (
                                    <Marker 
                                        key={`incident-${incident.id}`} 
                                        position={[parseFloat(lat), parseFloat(lng)]} 
                                        icon={createIncidentIcon(incident.type, incident.severity)}
                                    >
                                        <Popup>
                                            <div className="p-2 min-w-[200px]">
                                                <div className="font-bold text-sm mb-1 text-yellow-700">
                                                    ⚠️ {incident.type || 'Incident'}
                                                </div>
                                                <div className="text-xs text-gray-600 mb-1">
                                                    {incident.description || 'No description'}
                                                </div>
                                                <div className="flex items-center gap-2 text-xs mb-1">
                                                    <span className={`px-2 py-0.5 rounded-full ${
                                                        incident.severity === 'Critical' ? 'bg-red-100 text-red-700' :
                                                        incident.severity === 'High' ? 'bg-orange-100 text-orange-700' :
                                                        incident.severity === 'Medium' ? 'bg-yellow-100 text-yellow-700' :
                                                        'bg-blue-100 text-blue-700'
                                                    }`}>
                                                        {incident.severity || 'Unknown'} Severity
                                                    </span>
                                                </div>
                                                <div className="text-xs text-gray-500">
                                                    📍 {parseFloat(lat).toFixed(5)}, {parseFloat(lng).toFixed(5)}
                                                </div>
                                                <div className="text-xs text-gray-400 mt-1">
                                                    {incident.created_at ? formatTimeAgo(incident.created_at) : 'Just now'}
                                                </div>
                                            </div>
                                        </Popup>
                                    </Marker>
                                );
                            })}

                            {/* Emergency Markers */}
                            {emergencies.map((emergency) => {
                                const lat = emergency.latitude || emergency.location?.latitude;
                                const lng = emergency.longitude || emergency.location?.longitude;
                                
                                if (!lat || !lng) return null;

                                return (
                                    <Marker 
                                        key={`emergency-${emergency.id}`} 
                                        position={[parseFloat(lat), parseFloat(lng)]} 
                                        icon={createEmergencyIcon(emergency.severity)}
                                    >
                                        <Popup>
                                            <div className="p-2 min-w-[200px]">
                                                <div className="font-bold text-sm mb-1 text-red-700">
                                                    🚨 {emergency.type || 'Emergency'}
                                                </div>
                                                <div className="text-xs text-gray-600 mb-1">
                                                    {emergency.description || 'No description'}
                                                </div>
                                                <div className="flex items-center gap-2 text-xs mb-1">
                                                    <span className={`px-2 py-0.5 rounded-full ${
                                                        emergency.severity === 'Critical' ? 'bg-red-100 text-red-700' :
                                                        emergency.severity === 'High' ? 'bg-orange-100 text-orange-700' :
                                                        'bg-yellow-100 text-yellow-700'
                                                    }`}>
                                                        {emergency.severity || 'High'} Priority
                                                    </span>
                                                </div>
                                                <div className="text-xs text-gray-500">
                                                    📍 {parseFloat(lat).toFixed(5)}, {parseFloat(lng).toFixed(5)}
                                                </div>
                                                {emergency.reporter_name && (
                                                    <div className="text-xs text-gray-500 mt-1">
                                                        👤 Reported by: {emergency.reporter_name}
                                                    </div>
                                                )}
                                                <div className="text-xs text-gray-400 mt-1">
                                                    {emergency.created_at ? formatTimeAgo(emergency.created_at) : 'Just now'}
                                                </div>
                                            </div>
                                        </Popup>
                                    </Marker>
                                );
                            })}
                        </MapContainer>

                        {/* Legend Overlay - Clear descriptions */}
                        <div className="absolute bottom-3 left-3 bg-white rounded-lg p-3 shadow-lg border border-gray-200 z-[1000]" style={{ minWidth: '200px' }}>
                            <div className="font-bold text-gray-800 mb-2 text-sm border-b pb-1">📍 Map Legend</div>
                            <div className="space-y-2">
                                {adminLocationEnabled && (
                                    <div className="flex items-center gap-2">
                                        <div className="w-4 h-4 rounded-full bg-cyan-500 animate-pulse flex-shrink-0 border-2 border-white shadow" />
                                        <span className="text-gray-700 text-xs font-medium">Your Location (Admin)</span>
                                    </div>
                                )}
                                <div className="flex items-center gap-2">
                                    <div className="w-4 h-4 rounded-full bg-green-500 animate-pulse flex-shrink-0 border-2 border-white shadow" />
                                    <span className="text-gray-700 text-xs font-medium">Online Police Officer</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <div className="w-4 h-4 rounded-full bg-gray-400 flex-shrink-0 border-2 border-white shadow" />
                                    <span className="text-gray-700 text-xs font-medium">Offline Police Officer</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <div className="flex-shrink-0 flex items-center justify-center w-4 h-4">
                                        <div className="w-0 h-0 border-l-[7px] border-r-[7px] border-b-[12px] border-l-transparent border-r-transparent border-b-orange-500" />
                                    </div>
                                    <span className="text-gray-700 text-xs font-medium">Traffic Incident Report</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <div className="w-4 h-4 rounded-full bg-red-500 animate-pulse flex-shrink-0 border-2 border-white shadow" />
                                    <span className="text-gray-700 text-xs font-medium">Active Emergency</span>
                                </div>
                            </div>
                            <div className="mt-2 pt-2 border-t text-[10px] text-gray-500">
                                ⏱️ Auto-expires after 4 hours if unresolved
                            </div>
                        </div>

                        {/* Stats Count - Top Right */}
                        <div className="absolute top-3 right-3 bg-white rounded-lg px-3 py-2 shadow-lg border border-gray-200 z-[1000]">
                            <div className="space-y-1.5 text-xs font-medium">
                                <div className="flex items-center gap-2 text-cyan-700">
                                    <User className="h-3.5 w-3.5" />
                                    <span>{sortedOfficers.length} Officers ({onlineCount} online)</span>
                                </div>
                                <div className="flex items-center gap-2 text-orange-600">
                                    <AlertTriangle className="h-3.5 w-3.5" />
                                    <span>{incidents.length} Active Incidents</span>
                                </div>
                                <div className="flex items-center gap-2 text-red-600">
                                    <Siren className="h-3.5 w-3.5" />
                                    <span>{emergencies.length} Emergencies</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default OfficerLocationTracker;