import React, { useState, useEffect, useRef } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { MapPin, Navigation, AlertTriangle, Clock, Route, ChevronRight, Loader2, Check, X } from 'lucide-react';
import { searchKigaliLocation, getLocationCoordinates, kigaliLocations } from '../data/kigaliLocations';
import toast from 'react-hot-toast';

// CSS styles for custom markers
const markerStyles = `
    .user-location-marker {
        background: transparent !important;
        border: none !important;
    }
    .incident-marker-icon {
        background: transparent !important;
        border: none !important;
        cursor: pointer !important;
    }
    .incident-marker-icon * {
        pointer-events: none !important;
    }
    @keyframes pulse-ring {
        0% { transform: scale(0.8); opacity: 1; }
        100% { transform: scale(2); opacity: 0; }
    }
`;

// Inject styles into document head
if (typeof document !== 'undefined') {
    const styleId = 'route-planner-styles';
    if (!document.getElementById(styleId)) {
        const styleElement = document.createElement('style');
        styleElement.id = styleId;
        styleElement.textContent = markerStyles;
        document.head.appendChild(styleElement);
    }
}

// Fix for default marker icons
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
    iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
    iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

// Custom icons for start and destination
const startIcon = new L.Icon({
    iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-green.png',
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
    shadowSize: [41, 41]
});

const endIcon = new L.Icon({
    iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png',
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
    shadowSize: [41, 41]
});

// Custom icon for user's current location during navigation
const createUserLocationIcon = () => {
    return L.divIcon({
        className: 'user-location-marker',
        html: `
            <div style="
                position: relative;
                display: flex;
                align-items: center;
                justify-content: center;
            ">
                <div style="
                    position: absolute;
                    width: 48px;
                    height: 48px;
                    background: rgba(59, 130, 246, 0.2);
                    border-radius: 50%;
                    animation: pulse-ring 1.5s ease-out infinite;
                "></div>
                <div style="
                    width: 24px;
                    height: 24px;
                    background: linear-gradient(135deg, #3b82f6, #1d4ed8);
                    border: 4px solid white;
                    border-radius: 50%;
                    box-shadow: 0 2px 10px rgba(59, 130, 246, 0.5);
                    z-index: 10;
                "></div>
                <div style="
                    position: absolute;
                    width: 0;
                    height: 0;
                    border-left: 8px solid transparent;
                    border-right: 8px solid transparent;
                    border-bottom: 12px solid #3b82f6;
                    top: -18px;
                    transform: rotate(0deg);
                    filter: drop-shadow(0 2px 2px rgba(0,0,0,0.3));
                "></div>
            </div>
        `,
        iconSize: [48, 48],
        iconAnchor: [24, 24],
    });
};

// Incident type configuration for legend
const INCIDENT_TYPES = {
    // Main emergency types (from public reporting)
    accident: { emoji: '🚗💥', color: '#dc2626', label: 'Accident', description: 'Vehicle collision or crash' },
    fire: { emoji: '🔥', color: '#f97316', label: 'Fire', description: 'Fire emergency reported' },
    traffic_jam: { emoji: '🚦', color: '#f59e0b', label: 'Traffic Jam', description: 'Heavy traffic, slow movement' },
    damaged_road: { emoji: '🛣️', color: '#eab308', label: 'Damaged Road', description: 'Potholes or road damage' },
    tree_fall: { emoji: '🌳', color: '#22c55e', label: 'Tree Fall', description: 'Fallen tree blocking road' },
    // AI/system types
    congestion: { emoji: '🚦', color: '#f59e0b', label: 'Congestion', description: 'AI detected traffic buildup' },
    road_blockage: { emoji: '🚧', color: '#ef4444', label: 'Road Blocked', description: 'Road completely blocked' },
    construction: { emoji: '🏗️', color: '#f97316', label: 'Construction', description: 'Road work in progress' },
    hazard: { emoji: '⚠️', color: '#eab308', label: 'Road Hazard', description: 'Debris or danger on road' }
};

// Create incident map icon — matches the legend icons exactly
// Legend: w-5 h-5 (20px) colored circle with white emoji inside
const createIncidentIcon = (type = 'unknown') => {
    const config = INCIDENT_TYPES[type?.toLowerCase()] || INCIDENT_TYPES.hazard || { emoji: '⚠️', color: '#06b6d4' };
    const color = config.color;
    const emoji = config.emoji.split(' ')[0]; // first emoji only
    const size = 28; // slightly bigger than legend (20px) so it's visible on map

    return L.divIcon({
        className: 'incident-marker-icon',
        html: `<div style="
            width: ${size}px;
            height: ${size}px;
            background-color: ${color};
            border-radius: 50%;
            border: 2.5px solid white;
            display: flex;
            align-items: center;
            justify-content: center;
            box-shadow: 0 2px 6px rgba(0,0,0,0.3);
            font-size: 14px;
            line-height: 1;
        ">${emoji}</div>`,
        iconSize: [size, size],
        iconAnchor: [size / 2, size / 2],
        popupAnchor: [0, -size / 2],
    });
};

// Route color configurations
const ROUTE_COLORS = {
    primary: { color: '#22c55e', weight: 6, opacity: 0.8 },     // Green - Best route
    alternative1: { color: '#3b82f6', weight: 5, opacity: 0.7 }, // Blue
    alternative2: { color: '#f97316', weight: 5, opacity: 0.7 }, // Orange
    selected: { color: '#8b5cf6', weight: 8, opacity: 1 },       // Purple - Currently selected
    hasIncident: { color: '#ef4444', weight: 4, opacity: 0.6, dashArray: '10, 10' } // Red dashed overlay
};

// Get route base color by index
const getRouteBaseColor = (index) => {
    const colors = [
        '#22c55e', // Green - recommended
        '#3b82f6', // Blue - alternative 1
        '#f97316', // Orange - alternative 2
        '#ec4899', // Pink - alternative 3
        '#14b8a6', // Teal - alternative 4
        '#8b5cf6', // Violet - alternative 5
    ];
    return colors[index % colors.length];
};

// Decode OSRM polyline (polyline5 format)
const decodePolyline = (encoded) => {
    const points = [];
    let index = 0, lat = 0, lng = 0;

    while (index < encoded.length) {
        let b, shift = 0, result = 0;
        do {
            b = encoded.charCodeAt(index++) - 63;
            result |= (b & 0x1f) << shift;
            shift += 5;
        } while (b >= 0x20);
        const dlat = (result & 1) ? ~(result >> 1) : (result >> 1);
        lat += dlat;

        shift = 0;
        result = 0;
        do {
            b = encoded.charCodeAt(index++) - 63;
            result |= (b & 0x1f) << shift;
            shift += 5;
        } while (b >= 0x20);
        const dlng = (result & 1) ? ~(result >> 1) : (result >> 1);
        lng += dlng;

        points.push([lat / 1e5, lng / 1e5]);
    }
    return points;
};

// Calculate distance from point to line segment
const pointToLineDistance = (point, lineStart, lineEnd) => {
    const [px, py] = point;
    const [x1, y1] = lineStart;
    const [x2, y2] = lineEnd;

    const A = px - x1;
    const B = py - y1;
    const C = x2 - x1;
    const D = y2 - y1;

    const dot = A * C + B * D;
    const lenSq = C * C + D * D;
    let param = -1;

    if (lenSq !== 0) param = dot / lenSq;

    let xx, yy;

    if (param < 0) {
        xx = x1;
        yy = y1;
    } else if (param > 1) {
        xx = x2;
        yy = y2;
    } else {
        xx = x1 + param * C;
        yy = y1 + param * D;
    }

    const dx = px - xx;
    const dy = py - yy;

    // Convert to approximate meters (rough estimate for Kigali's latitude)
    const metersPerDegree = 111320;
    return Math.sqrt(dx * dx + dy * dy) * metersPerDegree;
};

// Check if incident is near a route
const isIncidentNearRoute = (incident, routePoints, thresholdMeters = 500) => {
    if (!incident.latitude || !incident.longitude || !routePoints || routePoints.length < 2) {
        return false;
    }

    const incidentPoint = [incident.latitude, incident.longitude];

    for (let i = 0; i < routePoints.length - 1; i++) {
        const distance = pointToLineDistance(incidentPoint, routePoints[i], routePoints[i + 1]);
        if (distance < thresholdMeters) {
            return true;
        }
    }
    return false;
};

// Map bounds fitter component
const FitBounds = ({ bounds }) => {
    const map = useMap();
    useEffect(() => {
        if (bounds && bounds.length >= 2) {
            map.fitBounds(bounds, { padding: [50, 50] });
        }
    }, [bounds, map]);
    return null;
};

// Component to follow user location during navigation
const FollowUserLocation = ({ userLocation, isNavigating }) => {
    const map = useMap();
    useEffect(() => {
        if (isNavigating && userLocation) {
            map.setView([userLocation.lat, userLocation.lng], map.getZoom(), {
                animate: true,
                duration: 0.5
            });
        }
    }, [userLocation, isNavigating, map]);
    return null;
};

// Format duration in minutes/hours
const formatDuration = (seconds) => {
    if (seconds < 60) return '< 1 min';
    if (seconds < 3600) return `${Math.round(seconds / 60)} min`;
    const hours = Math.floor(seconds / 3600);
    const mins = Math.round((seconds % 3600) / 60);
    return `${hours}h ${mins}m`;
};

// Format distance in km
const formatDistance = (meters) => {
    if (meters < 1000) return `${Math.round(meters)} m`;
    return `${(meters / 1000).toFixed(1)} km`;
};

const FOUR_HOURS_MS = 4 * 60 * 60 * 1000; // 4 hours in milliseconds

const RoutePlannerMap = ({ incidents: rawIncidents = [] }) => {
    // Re-check for expired incidents every 60 seconds
    const [expiryTick, setExpiryTick] = useState(0);
    useEffect(() => {
        const timer = setInterval(() => setExpiryTick(t => t + 1), 60000);
        return () => clearInterval(timer);
    }, []);

    // Ensure incidents is always an array and filter only ACTIVE incidents (not resolved)
    // Also auto-expire unresolved incidents after 4 hours
    const incidents = React.useMemo(() => {
        const rawArray = Array.isArray(rawIncidents) ? rawIncidents : [];
        const now = Date.now();
        
        console.log(`📍 Route Planner raw incidents: ${rawArray.length}`);
        
        const filtered = rawArray.filter(inc => {
            // 1. Only show active incidents (not resolved/closed/completed/cancelled)
            const status = (inc.status || 'pending').toLowerCase();
            const isActive = !['resolved', 'closed', 'completed', 'cancelled'].includes(status);
            if (!isActive) return false;
            
            // 2. Auto-expire: hide unresolved incidents older than 4 hours
            const createdAt = inc.created_at || inc.createdAt || inc.reported_at;
            if (createdAt) {
                const age = now - new Date(createdAt).getTime();
                if (age > FOUR_HOURS_MS) return false;
            }
            
            // 3. Must have valid numeric coordinates
            const lat = parseFloat(inc.latitude);
            const lng = parseFloat(inc.longitude);
            const hasCoords = !isNaN(lat) && !isNaN(lng) && (lat !== 0 || lng !== 0);
            
            return hasCoords;
        }).map(inc => ({
            ...inc,
            // Ensure coordinates are numbers
            latitude: parseFloat(inc.latitude),
            longitude: parseFloat(inc.longitude),
            // Normalize the incident type
            incident_type: inc.incident_type || inc.emergency_type || inc.type || 'unknown',
            location: inc.location || inc.location_name || inc.address || 'Unknown location',
        }));
        
        console.log(`📍 Route Planner filtered incidents (active & <4hrs): ${filtered.length}`);
        return filtered;
    }, [rawIncidents, expiryTick]);

    const [start, setStart] = useState('');
    const [destination, setDestination] = useState('');
    const [startCoords, setStartCoords] = useState(null);
    const [destCoords, setDestCoords] = useState(null);
    const [startSuggestions, setStartSuggestions] = useState([]);
    const [destSuggestions, setDestSuggestions] = useState([]);
    const [showStartSuggestions, setShowStartSuggestions] = useState(false);
    const [showDestSuggestions, setShowDestSuggestions] = useState(false);
    const [loadingLocation, setLoadingLocation] = useState(false);
    const [loadingRoutes, setLoadingRoutes] = useState(false);
    const [routes, setRoutes] = useState([]);
    const [selectedRouteIndex, setSelectedRouteIndex] = useState(0);
    const [mapBounds, setMapBounds] = useState(null);
    const [lastIncidentCount, setLastIncidentCount] = useState(0);
    const [expandedIncidents, setExpandedIncidents] = useState({}); // Track which routes have expanded incident lists
    
    // Navigation state
    const [isNavigating, setIsNavigating] = useState(false);
    const [userLocation, setUserLocation] = useState(null);
    const [watchId, setWatchId] = useState(null);
    const [remainingDistance, setRemainingDistance] = useState(null);
    const [remainingTime, setRemainingTime] = useState(null);
    const [navigationError, setNavigationError] = useState(null);

    const customTileUrl = import.meta.env.VITE_TILE_SERVER_URL;
    const proxyTileUrl = '/api/map/tiles/{z}/{x}/{y}.png';
    const tileSources = [
        ...(customTileUrl ? [{
            url: customTileUrl,
            attribution: 'Custom Tiles'
        }] : [{
            url: proxyTileUrl,
            attribution: 'Map Tiles'
        }]),
        {
            url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
            attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        },
        {
            url: 'https://{s}.tile.openstreetmap.fr/hot/{z}/{x}/{y}.png',
            attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>, Tiles style by HOT'
        },
        {
            url: 'https://{s}.tile.openstreetmap.de/{z}/{x}/{y}.png',
            attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        },
        {
            url: 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png',
            attribution: '&copy; <a href="https://carto.com/attributions">CARTO</a> & OpenStreetMap'
        }
    ];
    const [tileSourceIndex, setTileSourceIndex] = useState(0);
    const tileSource = tileSources[tileSourceIndex];

    const kigaliCenter = [-1.9536, 30.0606];

    // Toggle incident list expansion for a route
    const toggleIncidentList = (routeIndex, e) => {
        e.stopPropagation(); // Prevent selecting the route when clicking expand
        setExpandedIncidents(prev => ({
            ...prev,
            [routeIndex]: !prev[routeIndex]
        }));
    };

    const handleTileError = () => {
        setTileSourceIndex(prev => {
            if (prev < tileSources.length - 1) {
                toast('Switching map tiles…', { icon: '🗺️' });
                return prev + 1;
            }
            toast.error('Map tiles failed to load. Please check your connection.');
            return prev;
        });
    };

    // Force re-render every minute to check for expired incidents
    const [refreshTrigger, setRefreshTrigger] = useState(0);
    useEffect(() => {
        const interval = setInterval(() => {
            setRefreshTrigger(prev => prev + 1);
        }, 60000); // Check every minute
        return () => clearInterval(interval);
    }, []);

    // Real-time incident monitoring - update route incidents when data changes
    // This effect runs whenever incidents array changes (new emergency reported or resolved)
    useEffect(() => {
        // Log current incident count for debugging
        console.log(`📍 Route Planner: ${incidents.length} active incidents on map`);
        
        if (routes.length > 0) {
            // Re-analyze routes with current active incidents
            const updatedRoutes = routes.map(route => {
                const incidentsOnRoute = incidents.filter(inc =>
                    isIncidentNearRoute(inc, route.points)
                );
                return {
                    ...route,
                    incidents: incidentsOnRoute,
                    hasIncidents: incidentsOnRoute.length > 0,
                };
            });
            
            // Re-sort routes (fewest incidents first, then fastest)
            updatedRoutes.sort((a, b) => {
                if (a.incidents.length !== b.incidents.length) {
                    return a.incidents.length - b.incidents.length;
                }
                return a.duration - b.duration;
            });
            
            setRoutes(updatedRoutes);
        }
        
        setLastIncidentCount(incidents.length);
    }, [incidents, refreshTrigger]); // Triggered when incidents change or by periodic refresh

    // Handle location search
    const handleStartChange = (value) => {
        setStart(value);
        setStartCoords(null);
        if (value.length > 1) {
            const suggestions = searchKigaliLocation(value);
            setStartSuggestions(suggestions);
            setShowStartSuggestions(true);
        } else {
            setShowStartSuggestions(false);
        }
    };

    const handleDestChange = (value) => {
        setDestination(value);
        setDestCoords(null);
        if (value.length > 1) {
            const suggestions = searchKigaliLocation(value);
            setDestSuggestions(suggestions);
            setShowDestSuggestions(true);
        } else {
            setShowDestSuggestions(false);
        }
    };

    const selectStart = (location) => {
        setStart(location.name);
        const coords = location.lat && location.lng
            ? { lat: location.lat, lng: location.lng }
            : getLocationCoordinates(location.name);
        setStartCoords(coords);
        setShowStartSuggestions(false);
    };

    const selectDest = (location) => {
        setDestination(location.name);
        const coords = location.lat && location.lng
            ? { lat: location.lat, lng: location.lng }
            : getLocationCoordinates(location.name);
        setDestCoords(coords);
        setShowDestSuggestions(false);
    };

    // Use current location
    const handleUseMyLocation = () => {
        if (!navigator.geolocation) {
            toast.error('Geolocation is not supported by your browser');
            return;
        }

        setLoadingLocation(true);
        navigator.geolocation.getCurrentPosition(
            (position) => {
                const { latitude, longitude } = position.coords;
                setStart(`My Location`);
                setStartCoords({ lat: latitude, lng: longitude });
                setLoadingLocation(false);
                toast.success('Location acquired!');
            },
            (error) => {
                console.error('Error getting location:', error);
                toast.error('Unable to retrieve your location');
                setLoadingLocation(false);
            }
        );
    };

    const customOsrmUrl = import.meta.env.VITE_OSRM_SERVER_URL;
    const OSRM_BASE_URLS = [
        ...(customOsrmUrl ? [customOsrmUrl] : []),
        '/api/map/osrm',
        'https://router.project-osrm.org',
        'https://routing.openstreetmap.de/routed-car'
    ];

    const fetchWithTimeout = async (url, timeoutMs = 8000) => {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), timeoutMs);
        try {
            const response = await fetch(url, { signal: controller.signal });
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}`);
            }
            return await response.json();
        } finally {
            clearTimeout(timeout);
        }
    };

    const fetchOsrmRoute = async (path) => {
        for (const baseUrl of OSRM_BASE_URLS) {
            try {
                const url = baseUrl.startsWith('/api/map/osrm')
                    ? `${baseUrl}?path=${encodeURIComponent(path)}`
                    : `${baseUrl}${path}`;
                const data = await fetchWithTimeout(url);
                if (data?.code === 'Ok') {
                    return data;
                }
            } catch (error) {
                // Try next base URL
            }
        }
        return null;
    };

    // Fetch routes from OSRM API - FAST version with alternatives
    const findRoutes = async () => {
        // Validate inputs
        let startPoint = startCoords;
        let endPoint = destCoords;

        if (!startPoint && start) {
            startPoint = getLocationCoordinates(start);
        }
        if (!endPoint && destination) {
            endPoint = getLocationCoordinates(destination);
        }

        if (!startPoint || !endPoint) {
            toast.error('Please enter valid start and destination locations');
            return;
        }

        setLoadingRoutes(true);
        setRoutes([]);

        try {
            // Calculate waypoints for alternative routes (in parallel)
            const midLat = (startPoint.lat + endPoint.lat) / 2;
            const midLng = (startPoint.lng + endPoint.lng) / 2;
            const dLat = endPoint.lat - startPoint.lat;
            const dLng = endPoint.lng - startPoint.lng;

            // Create waypoint offsets for alternative routes
            const waypoints = [
                null, // Direct route (no waypoint)
                { lat: midLat + dLng * 0.015, lng: midLng - dLat * 0.015 }, // Side A
                { lat: midLat - dLng * 0.015, lng: midLng + dLat * 0.015 }, // Side B
            ];

            // Fetch all routes in parallel (much faster!)
            const routePromises = waypoints.map((wp) => {
                let path;
                if (wp === null) {
                    // Direct route with alternatives
                    path = `/route/v1/driving/${startPoint.lng},${startPoint.lat};${endPoint.lng},${endPoint.lat}?overview=full&alternatives=true&steps=false&geometries=polyline`;
                } else {
                    // Route via waypoint
                    path = `/route/v1/driving/${startPoint.lng},${startPoint.lat};${wp.lng},${wp.lat};${endPoint.lng},${endPoint.lat}?overview=full&steps=false&geometries=polyline`;
                }

                return fetchOsrmRoute(path).catch(() => null);
            });

            const results = await Promise.all(routePromises);
            
            // Collect all unique routes
            const allRoutes = [];
            const routeSignatures = new Set();

            results.forEach((data) => {
                if (data?.code === 'Ok' && data.routes) {
                    data.routes.forEach(route => {
                        // Create a signature to avoid duplicates
                        const sig = `${Math.round(route.distance / 100)}-${Math.round(route.duration / 30)}`;
                        if (!routeSignatures.has(sig)) {
                            routeSignatures.add(sig);
                            allRoutes.push(route);
                        }
                    });
                }
            });

            if (allRoutes.length === 0) {
                toast.error('Could not find routes between these locations');
                setLoadingRoutes(false);
                return;
            }

            // Process routes
            const processedRoutes = allRoutes.slice(0, 4).map((route, index) => {
                const points = decodePolyline(route.geometry);

                // Find incidents along this route
                const incidentsOnRoute = incidents.filter(inc =>
                    isIncidentNearRoute(inc, points)
                );

                return {
                    id: index,
                    points,
                    duration: route.duration,
                    distance: route.distance,
                    incidents: incidentsOnRoute,
                    hasIncidents: incidentsOnRoute.length > 0,
                    summary: route.legs?.[0]?.summary || `Route ${index + 1}`
                };
            });

            // Sort routes: fewest incidents first, then by duration (fastest)
            processedRoutes.sort((a, b) => {
                if (a.incidents.length !== b.incidents.length) {
                    return a.incidents.length - b.incidents.length;
                }
                return a.duration - b.duration;
            });

            setRoutes(processedRoutes);
            setSelectedRouteIndex(0);

            // Set map bounds to include all routes
            if (processedRoutes.length > 0) {
                const allPoints = processedRoutes.flatMap(r => r.points);
                setMapBounds(allPoints);
            }

            // Show toast with results
            const bestRoute = processedRoutes[0];
            if (processedRoutes.length > 1) {
                toast.success(`Found ${processedRoutes.length} routes!`, { duration: 2000 });
            } else if (bestRoute?.hasIncidents) {
                toast(`⚠️ Route has ${bestRoute.incidents.length} incident(s)`, {
                    icon: '🚧',
                    duration: 3000
                });
            } else {
                toast.success('Route found!', { duration: 2000 });
            }

        } catch (error) {
            console.error('Error fetching routes:', error);
            toast.error('Error fetching routes. Please try again.');
        }

        setLoadingRoutes(false);
    };

    // Get route style based on index and selection
    const getRouteStyle = (routeIndex, isSelected) => {
        const baseColor = getRouteBaseColor(routeIndex);
        return {
            color: baseColor,
            weight: isSelected ? 8 : 5,
            opacity: isSelected ? 1 : 0.7,
        };
    };

    // Clear the route planner
    const clearRoutes = () => {
        stopNavigation();
        setStart('');
        setDestination('');
        setStartCoords(null);
        setDestCoords(null);
        setRoutes([]);
        setSelectedRouteIndex(0);
        setMapBounds(null);
    };

    // Calculate distance between two points (Haversine formula)
    const calculateDistance = (lat1, lon1, lat2, lon2) => {
        const R = 6371e3; // Earth's radius in meters
        const φ1 = lat1 * Math.PI / 180;
        const φ2 = lat2 * Math.PI / 180;
        const Δφ = (lat2 - lat1) * Math.PI / 180;
        const Δλ = (lon2 - lon1) * Math.PI / 180;

        const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
            Math.cos(φ1) * Math.cos(φ2) *
            Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

        return R * c; // Distance in meters
    };

    // Find closest point on route to user's current position
    const findClosestPointOnRoute = (userLat, userLng, routePoints) => {
        let minDistance = Infinity;
        let closestIndex = 0;

        routePoints.forEach((point, index) => {
            const distance = calculateDistance(userLat, userLng, point[0], point[1]);
            if (distance < minDistance) {
                minDistance = distance;
                closestIndex = index;
            }
        });

        return { closestIndex, minDistance };
    };

    // Calculate remaining distance and time from current position
    const calculateRemainingRoute = (userLat, userLng) => {
        const selectedRoute = routes[selectedRouteIndex];
        if (!selectedRoute) return;

        const { closestIndex } = findClosestPointOnRoute(userLat, userLng, selectedRoute.points);
        
        // Calculate remaining distance from closest point to destination
        let remainingDist = 0;
        for (let i = closestIndex; i < selectedRoute.points.length - 1; i++) {
            remainingDist += calculateDistance(
                selectedRoute.points[i][0], selectedRoute.points[i][1],
                selectedRoute.points[i + 1][0], selectedRoute.points[i + 1][1]
            );
        }

        // Estimate remaining time (using average speed from original route)
        const avgSpeed = selectedRoute.distance / selectedRoute.duration; // meters per second
        const remainingTimeSeconds = remainingDist / avgSpeed;

        setRemainingDistance(remainingDist);
        setRemainingTime(remainingTimeSeconds);

        // Check if arrived (within 50 meters of destination)
        if (destCoords) {
            const distToDestination = calculateDistance(userLat, userLng, destCoords.lat, destCoords.lng);
            if (distToDestination < 50) {
                toast.success('🎉 You have arrived at your destination!', { duration: 5000 });
                stopNavigation();
            }
        }
    };

    // Start navigation
    const startNavigation = () => {
        if (!routes.length) {
            toast.error('Please find a route first');
            return;
        }

        if (!navigator.geolocation) {
            toast.error('Geolocation is not supported by your browser');
            return;
        }

        setIsNavigating(true);
        setNavigationError(null);
        toast.success('🧭 Navigation started! Follow the route.', { duration: 3000 });

        // Start watching position
        const id = navigator.geolocation.watchPosition(
            (position) => {
                const { latitude, longitude, accuracy } = position.coords;
                setUserLocation({ lat: latitude, lng: longitude, accuracy });
                calculateRemainingRoute(latitude, longitude);
                setNavigationError(null);
            },
            (error) => {
                console.error('Geolocation error:', error);
                setNavigationError(error.message);
                if (error.code === error.PERMISSION_DENIED) {
                    toast.error('Location permission denied. Please enable location access.');
                    stopNavigation();
                }
            },
            {
                enableHighAccuracy: true,
                maximumAge: 5000,
                timeout: 10000
            }
        );

        setWatchId(id);
    };

    // Stop navigation
    const stopNavigation = () => {
        if (watchId !== null) {
            navigator.geolocation.clearWatch(watchId);
            setWatchId(null);
        }
        setIsNavigating(false);
        setUserLocation(null);
        setRemainingDistance(null);
        setRemainingTime(null);
        setNavigationError(null);
    };

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            if (watchId !== null) {
                navigator.geolocation.clearWatch(watchId);
            }
        };
    }, [watchId]);

    return (
        <div className="bg-slate-800 rounded-xl shadow-lg overflow-hidden border border-cyan-400/20">
            {/* Header - Secondary cyan color matching navigation */}
            <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 px-6 py-4 relative overflow-hidden">
                <div className="absolute bottom-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-cyan-400 to-transparent opacity-60" />
                <div className="flex items-center justify-between relative z-10">
                    <div>
                        <h2 className="text-xl font-bold text-cyan-50 flex items-center">
                            <Navigation className="w-6 h-6 mr-2 text-cyan-400" />
                            Route Planner
                        </h2>
                        <p className="text-cyan-300/70 text-sm mt-1 flex items-center gap-2">
                            Real-time incident alerts • Auto-updates
                            <span className="relative flex h-2 w-2">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                            </span>
                            <span className="text-emerald-400 text-xs">LIVE</span>
                        </p>
                    </div>
                    {/* Real-time incident badge */}
                    <div className="flex items-center gap-3">
                        {incidents.length > 0 ? (
                            <div className="flex items-center gap-2 px-3 py-2 bg-cyan-500/20 border border-cyan-500/30 rounded-lg">
                                <span className="relative flex h-2 w-2">
                                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75"></span>
                                    <span className="relative inline-flex rounded-full h-2 w-2 bg-cyan-500"></span>
                                </span>
                                <span className="text-cyan-400 text-sm font-semibold">
                                    {incidents.length} Active
                                </span>
                            </div>
                        ) : (
                            <div className="flex items-center gap-2 px-3 py-2 bg-emerald-500/20 border border-emerald-500/30 rounded-lg">
                                <Check className="w-4 h-4 text-emerald-400" />
                                <span className="text-emerald-400 text-sm font-semibold">
                                    All Clear
                                </span>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-0">
                {/* Left Panel - Input & Route Options */}
                <div className="lg:col-span-1 h-[600px] flex flex-col border-r border-cyan-400/10 bg-slate-800/50">
                    <div className="p-5 flex-shrink-0 border-b border-cyan-400/10">
                        {/* Start Location */}
                        <div className="mb-4">
                            <label className="block text-sm font-semibold text-cyan-100 mb-2">
                                Starting Point
                            </label>
                            <div className="flex gap-2">
                                <div className="relative flex-1">
                                    <MapPin className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-green-400" />
                                    <input
                                        type="text"
                                        value={start}
                                        onChange={(e) => handleStartChange(e.target.value)}
                                        onFocus={() => start && setShowStartSuggestions(true)}
                                        onBlur={() => setTimeout(() => setShowStartSuggestions(false), 200)}
                                        placeholder="e.g., Kigali Airport..."
                                        className="w-full pl-10 pr-4 py-2.5 bg-slate-700/50 border border-cyan-400/20 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-transparent text-sm text-white placeholder-slate-400"
                                    />
                                    {showStartSuggestions && startSuggestions.length > 0 && (
                                        <div className="absolute z-30 w-full mt-1 bg-slate-700 border border-cyan-400/30 rounded-lg shadow-xl max-h-48 overflow-y-auto">
                                            {startSuggestions.map((loc, idx) => (
                                                <div
                                                    key={idx}
                                                    onClick={() => selectStart(loc)}
                                                    className="px-3 py-2.5 hover:bg-cyan-500/20 cursor-pointer border-b border-slate-600 last:border-b-0"
                                                >
                                                    <span className="text-sm font-medium text-white">{loc.name}</span>
                                                    <span className="text-xs text-slate-400 block">{loc.type}</span>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                                <button
                                    onClick={handleUseMyLocation}
                                    disabled={loadingLocation}
                                    className="px-3 py-2 bg-cyan-500/20 text-cyan-400 rounded-lg hover:bg-cyan-500/30 border border-cyan-400/30 transition-colors"
                                    title="Use my location"
                                >
                                    {loadingLocation ? <Loader2 className="w-5 h-5 animate-spin" /> : <Navigation className="w-5 h-5" />}
                                </button>
                            </div>
                        </div>

                        {/* Destination */}
                        <div className="mb-4">
                            <label className="block text-sm font-semibold text-cyan-100 mb-2">
                                Destination
                            </label>
                            <div className="relative">
                                <MapPin className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-red-400" />
                                <input
                                    type="text"
                                    value={destination}
                                    onChange={(e) => handleDestChange(e.target.value)}
                                    onFocus={() => destination && setShowDestSuggestions(true)}
                                    onBlur={() => setTimeout(() => setShowDestSuggestions(false), 200)}
                                    placeholder="e.g., Nyabugogo..."
                                    className="w-full pl-10 pr-4 py-2.5 bg-slate-700/50 border border-cyan-400/20 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-transparent text-sm text-white placeholder-slate-400"
                                />
                                {showDestSuggestions && destSuggestions.length > 0 && (
                                    <div className="absolute z-30 w-full mt-1 bg-slate-700 border border-cyan-400/30 rounded-lg shadow-xl max-h-48 overflow-y-auto">
                                        {destSuggestions.map((loc, idx) => (
                                            <div
                                                key={idx}
                                                onClick={() => selectDest(loc)}
                                                className="px-3 py-2.5 hover:bg-cyan-500/20 cursor-pointer border-b border-slate-600 last:border-b-0"
                                            >
                                                <span className="text-sm font-medium text-white">{loc.name}</span>
                                                <span className="text-xs text-slate-400 block">{loc.type}</span>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Action Buttons */}
                        <div className="flex gap-2 mb-6">
                            <button
                                onClick={findRoutes}
                                disabled={loadingRoutes || (!start && !startCoords) || (!destination && !destCoords)}
                                className="flex-1 bg-gradient-to-r from-cyan-600 to-cyan-700 text-white py-3 rounded-lg font-semibold hover:from-cyan-500 hover:to-cyan-600 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center border border-cyan-400/30"
                            >
                                {loadingRoutes ? (
                                    <>
                                        <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                                        Finding Routes...
                                    </>
                                ) : (
                                    <>
                                        <Route className="w-5 h-5 mr-2" />
                                        Find Routes
                                    </>
                                )}
                            </button>
                            {routes.length > 0 && !isNavigating && (
                                <button
                                    onClick={startNavigation}
                                    className="px-4 py-3 bg-green-600 text-white rounded-lg hover:bg-green-500 transition-colors font-semibold flex items-center"
                                    title="Start Navigation"
                                >
                                    <Navigation className="w-5 h-5" />
                                </button>
                            )}
                            {isNavigating && (
                                <button
                                    onClick={stopNavigation}
                                    className="px-4 py-3 bg-red-600 text-white rounded-lg hover:bg-red-500 transition-colors font-semibold flex items-center"
                                    title="Stop Navigation"
                                >
                                    <X className="w-5 h-5" />
                                </button>
                            )}
                            {routes.length > 0 && !isNavigating && (
                                <button
                                    onClick={clearRoutes}
                                    className="px-4 py-3 bg-slate-700 text-slate-300 rounded-lg hover:bg-slate-600 border border-cyan-400/20 transition-colors"
                                >
                                    <X className="w-5 h-5" />
                                </button>
                            )}
                        </div>

                        {/* Navigation Status Panel */}
                        {isNavigating && (
                            <div className="mt-4 p-4 bg-gradient-to-r from-green-900/50 to-emerald-900/50 border border-green-500/30 rounded-xl">
                                <div className="flex items-center gap-2 mb-3">
                                    <div className="relative">
                                        <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
                                        <div className="absolute inset-0 w-3 h-3 bg-green-500 rounded-full animate-ping"></div>
                                    </div>
                                    <span className="text-green-400 font-semibold">Navigation Active</span>
                                </div>
                                
                                {userLocation ? (
                                    <div className="grid grid-cols-2 gap-3">
                                        <div className="bg-slate-800/50 p-3 rounded-lg text-center">
                                            <p className="text-2xl font-bold text-white">
                                                {remainingDistance ? formatDistance(remainingDistance) : '--'}
                                            </p>
                                            <p className="text-xs text-slate-400">Remaining</p>
                                        </div>
                                        <div className="bg-slate-800/50 p-3 rounded-lg text-center">
                                            <p className="text-2xl font-bold text-white">
                                                {remainingTime ? formatDuration(remainingTime) : '--'}
                                            </p>
                                            <p className="text-xs text-slate-400">Est. Time</p>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="flex items-center gap-2 text-yellow-400">
                                        <Loader2 className="w-4 h-4 animate-spin" />
                                        <span className="text-sm">Acquiring GPS signal...</span>
                                    </div>
                                )}
                                
                                {navigationError && (
                                    <div className="mt-2 p-2 bg-red-900/30 border border-red-500/30 rounded text-red-400 text-xs">
                                        ⚠️ {navigationError}
                                    </div>
                                )}
                            </div>
                        )}
                    </div>

                    {/* Route Options - Scrollable Area */}
                    <div className="flex-1 overflow-y-auto p-5 custom-scrollbar">
                        {routes.length > 0 && (
                            <div className="space-y-3">
                                <h3 className="font-semibold text-cyan-100 flex items-center">
                                    <Route className="w-4 h-4 mr-2 text-cyan-400" />
                                    Route Options ({routes.length})
                                </h3>

                                {routes.map((route, index) => {
                                    const routeColor = getRouteBaseColor(index);
                                    const isSelected = selectedRouteIndex === index;

                                    return (
                                        <div
                                            key={route.id}
                                            onClick={() => setSelectedRouteIndex(index)}
                                            className={`p-4 rounded-lg cursor-pointer transition-all border-l-4 ${isSelected
                                                ? 'bg-slate-700/80 shadow-md'
                                                : 'bg-slate-700/40 hover:bg-slate-700/60 border-slate-600'
                                                }`}
                                            style={{
                                                borderLeftColor: routeColor,
                                                boxShadow: isSelected ? `0 0 0 2px ${routeColor}40` : undefined
                                            }}
                                        >
                                            {/* Route header */}
                                            <div className="flex items-center justify-between mb-3">
                                                <div className="flex items-center gap-2">
                                                    <div
                                                        className="w-4 h-4 rounded-full flex items-center justify-center text-xs text-white font-bold"
                                                        style={{ backgroundColor: routeColor }}
                                                    >
                                                        {index + 1}
                                                    </div>
                                                    <span className="font-bold text-cyan-50">
                                                        {index === 0 ? '🥇 Recommended' : index === 1 ? '🥈 Alternative 1' : '🥉 Alternative 2'}
                                                    </span>
                                                </div>
                                                {isSelected && (
                                                    <Check className="w-5 h-5" style={{ color: routeColor }} />
                                                )}
                                            </div>

                                            {/* Time and distance - prominent display */}
                                            <div className="flex items-baseline gap-3 mb-2">
                                                <span
                                                    className="text-2xl font-bold"
                                                    style={{ color: routeColor }}
                                                >
                                                    {formatDuration(route.duration)}
                                                </span>
                                                <span className="text-slate-400 text-sm">
                                                    {formatDistance(route.distance)}
                                                </span>
                                            </div>

                                            {/* Route summary if available */}
                                            {route.summary && route.summary !== `Route ${index + 1}` && (
                                                <div className="text-xs text-slate-400 mb-2 truncate">
                                                    via {route.summary}
                                                </div>
                                            )}

                                            {/* Incident status badge - collapsible */}
                                            {route.hasIncidents ? (
                                                <div className="mt-2">
                                                    <button
                                                        onClick={(e) => toggleIncidentList(index, e)}
                                                        className={`w-full flex items-center justify-between gap-1 text-xs text-cyan-300 bg-cyan-500/20 px-2 py-1.5 border border-cyan-500/30 hover:bg-cyan-500/30 transition-colors ${
                                                            expandedIncidents[index] ? 'rounded-t-md border-b-0' : 'rounded-md'
                                                        }`}
                                                    >
                                                        <div className="flex items-center gap-1">
                                                            <AlertTriangle className="w-3.5 h-3.5" />
                                                            <span className="font-medium">
                                                                {route.incidents.length} incident{route.incidents.length > 1 ? 's' : ''} on this route
                                                            </span>
                                                        </div>
                                                        <ChevronRight className={`w-4 h-4 transition-transform ${expandedIncidents[index] ? 'rotate-90' : ''}`} />
                                                    </button>
                                                    {/* Expandable list of incident types */}
                                                    {expandedIncidents[index] && (
                                                        <div className="bg-slate-800/50 rounded-b-md border border-cyan-500/30 border-t-0 p-2 space-y-1 max-h-40 overflow-y-auto">
                                                            {route.incidents.slice(0, 10).map((inc, idx) => {
                                                                const incType = (inc.incident_type || inc.type || 'unknown').toLowerCase();
                                                                const typeConfig = INCIDENT_TYPES[incType] || INCIDENT_TYPES.hazard || { emoji: '⚠️', label: 'Incident', color: '#06b6d4' };
                                                                return (
                                                                    <div 
                                                                        key={`inc-${inc.id || idx}`}
                                                                        className="flex items-center gap-2 text-xs p-1.5 rounded bg-slate-700/50 hover:bg-slate-700 cursor-pointer transition-colors"
                                                                        title={inc.description || inc.location || 'Click to see on map'}
                                                                    >
                                                                        <span 
                                                                            className="w-5 h-5 rounded-full flex items-center justify-center text-[10px] bg-cyan-500"
                                                                        >
                                                                            {typeConfig.emoji?.split(' ')[0] || '⚠️'}
                                                                        </span>
                                                                        <span className="text-slate-300 font-medium flex-1 truncate">
                                                                            {typeConfig.label}
                                                                        </span>
                                                                        <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-cyan-500/30 text-cyan-300">
                                                                            {(inc.severity || 'medium').toUpperCase()}
                                                                        </span>
                                                                    </div>
                                                                );
                                                            })}
                                                            {route.incidents.length > 10 && (
                                                                <div className="text-center text-xs text-slate-400 py-1">
                                                                    +{route.incidents.length - 10} more incidents
                                                                </div>
                                                            )}
                                                        </div>
                                                    )}
                                                </div>
                                            ) : (
                                                <div className="flex items-center gap-1 text-xs text-green-300 bg-green-500/20 px-2 py-1.5 rounded-md border border-green-500/30 mt-2">
                                                    <Check className="w-3.5 h-3.5" />
                                                    <span className="font-medium">Route is clear</span>
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                </div>

                {/* Right Panel - Map */}
                <div className="lg:col-span-2 h-[600px]">
                    <MapContainer
                        center={kigaliCenter}
                        zoom={13}
                        style={{ height: '100%', width: '100%' }}
                        scrollWheelZoom={true}
                        whenCreated={(map) => {
                            setTimeout(() => map.invalidateSize(), 150);
                        }}
                    >
                        <TileLayer
                            url={tileSource.url}
                            attribution={tileSource.attribution}
                            eventHandlers={{ tileerror: handleTileError }}
                            crossOrigin="anonymous"
                        />

                        {/* Fit map to route bounds */}
                        {mapBounds && <FitBounds bounds={mapBounds} />}

                        {/* Draw ALL routes simultaneously - like Google Maps */}
                        {routes.map((route, index) => {
                            const isSelected = index === selectedRouteIndex;
                            const style = getRouteStyle(index, isSelected);

                            return (
                                <React.Fragment key={`route-group-${index}`}>
                                    {/* Route outline for better visibility */}
                                    <Polyline
                                        positions={route.points}
                                        pathOptions={{
                                            color: '#ffffff',
                                            weight: isSelected ? 12 : 8,
                                            opacity: 0.8,
                                        }}
                                    />

                                    {/* Main route line */}
                                    <Polyline
                                        positions={route.points}
                                        pathOptions={{
                                            ...style,
                                            // Add dashed pattern if route has incidents
                                            ...(route.hasIncidents && !isSelected ? { dashArray: '15, 10' } : {})
                                        }}
                                        eventHandlers={{
                                            click: () => setSelectedRouteIndex(index),
                                        }}
                                    />
                                </React.Fragment>
                            );
                        })}

                        {/* User's current location during navigation */}
                        {isNavigating && userLocation && (
                            <Marker
                                position={[userLocation.lat, userLocation.lng]}
                                icon={createUserLocationIcon()}
                                zIndexOffset={2000}
                            >
                                <Popup>
                                    <div className="p-2 text-center">
                                        <div className="font-bold text-blue-700 mb-1">📍 Your Location</div>
                                        <div className="text-xs text-gray-500">
                                            Accuracy: ±{Math.round(userLocation.accuracy || 0)}m
                                        </div>
                                        {remainingDistance && (
                                            <div className="mt-2 text-sm">
                                                <span className="font-semibold">{formatDistance(remainingDistance)}</span> remaining
                                            </div>
                                        )}
                                    </div>
                                </Popup>
                            </Marker>
                        )}

                        {/* Follow user location during navigation */}
                        <FollowUserLocation userLocation={userLocation} isNavigating={isNavigating} />

                        {/* Start marker */}
                        {startCoords && !isNavigating && (
                            <Marker position={[startCoords.lat, startCoords.lng]} icon={startIcon}>
                                <Popup>
                                    <div className="font-semibold text-green-700">
                                        📍 Start: {start || 'My Location'}
                                    </div>
                                </Popup>
                            </Marker>
                        )}

                        {/* Destination marker */}
                        {destCoords && (
                            <Marker position={[destCoords.lat, destCoords.lng]} icon={endIcon}>
                                <Popup>
                                    <div className="font-semibold text-red-700">
                                        🏁 Destination: {destination}
                                    </div>
                                </Popup>
                            </Marker>
                        )}

                        {/* All incidents on map - always visible */}
                        {incidents.filter(inc => inc.latitude && inc.longitude).map((incident, idx) => {
                            const incidentType = incident.incident_type || incident.type || 'unknown';
                            const typeConfig = INCIDENT_TYPES[incidentType.toLowerCase()] || INCIDENT_TYPES.hazard || { emoji: '⚠️', label: 'Incident', color: '#06b6d4', description: 'Reported incident' };
                            const isOnRoute = routes[selectedRouteIndex]?.incidents?.some(ri => ri.id === incident.id);
                            const timeAgo = incident.created_at ? (() => {
                                const diff = Math.floor((Date.now() - new Date(incident.created_at).getTime()) / 1000);
                                if (diff < 60) return 'Just now';
                                if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
                                if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
                                return `${Math.floor(diff / 86400)}d ago`;
                            })() : null;
                            return (
                                <Marker
                                    key={`incident-${incident.id || idx}`}
                                    position={[parseFloat(incident.latitude), parseFloat(incident.longitude)]}
                                    icon={createIncidentIcon(incidentType)}
                                >
                                    <Popup>
                                        <div className="p-2" style={{ minWidth: '200px' }}>
                                            <h3 className="font-bold text-sm mb-1">
                                                {typeConfig.emoji?.split(' ')[0] || '⚠️'} {typeConfig.label || 'Incident'}
                                            </h3>
                                            <p className="text-xs text-gray-600 mb-1">
                                                {incident.description || 'No description'}
                                            </p>
                                            <p className="text-xs text-gray-500 mb-1">
                                                📍 {incident.location || incident.location_name || incident.address || 'Kigali, Rwanda'}
                                            </p>
                                            <div className="flex flex-wrap gap-1 mb-1">
                                                <span className={`text-xs px-2 py-0.5 rounded-full ${
                                                    incident.severity === 'critical' ? 'bg-red-100 text-red-800' :
                                                    incident.severity === 'high' ? 'bg-orange-100 text-orange-800' :
                                                    'bg-yellow-100 text-yellow-800'
                                                }`}>
                                                    {incident.severity || 'medium'}
                                                </span>
                                                <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-700">
                                                    {(incident.status || 'reported').replace('_', ' ')}
                                                </span>
                                            </div>
                                            {timeAgo && (
                                                <p className="text-xs text-gray-400">🕐 {timeAgo}</p>
                                            )}
                                            {incident.source && (
                                                <p className="text-xs text-gray-400">
                                                    {incident.source === 'ai' ? '🤖 AI Detected' : incident.source === 'mobile_app' ? '📱 Mobile App' : '👤 Public Report'}
                                                </p>
                                            )}
                                            {isOnRoute && (
                                                <p className="text-xs text-red-600 font-semibold mt-1">⚠️ On your route!</p>
                                            )}
                                        </div>
                                    </Popup>
                                </Marker>
                            );
                        })}
                    </MapContainer>
                </div>
            </div>

            {/* Horizontal Legend Section below Map */}
            <div className="bg-slate-800/80 border-t border-cyan-400/20 p-4">
                <div className="flex flex-wrap items-center justify-center gap-x-8 gap-y-4">
                    {/* Route Colors Legend */}
                    <div className="flex items-center gap-4">
                        <span className="text-xs font-bold text-cyan-400 uppercase tracking-wider">Routes:</span>
                        <div className="flex items-center gap-4">
                            <div className="flex items-center text-xs">
                                <div className="w-4 h-1.5 bg-green-500 rounded mr-1.5" />
                                <span className="text-slate-300">Recommended</span>
                            </div>
                            <div className="flex items-center text-xs">
                                <div className="w-4 h-1.5 bg-blue-500 rounded mr-1.5" />
                                <span className="text-slate-300">Alt 1</span>
                            </div>
                            <div className="flex items-center text-xs">
                                <div className="w-4 h-1.5 bg-cyan-500 rounded mr-1.5" />
                                <span className="text-slate-300">Alt 2</span>
                            </div>
                            <div className="flex items-center text-xs">
                                <div className="w-4 h-1.5 bg-purple-500 rounded mr-1.5" />
                                <span className="text-slate-300 font-semibold">Selected</span>
                            </div>
                        </div>
                    </div>

                    {/* Divider */}
                    <div className="hidden md:block w-px h-6 bg-cyan-400/30" />

                    {/* Incident Symbols Legend */}
                    <div className="flex items-center gap-3">
                        <span className="text-xs font-bold text-cyan-400 uppercase tracking-wider">Incidents:</span>
                        <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
                            {Object.entries(INCIDENT_TYPES).map(([key, config]) => (
                                <div key={key} className="flex items-center text-xs">
                                    <div
                                        className="w-5 h-5 rounded-full flex items-center justify-center mr-1.5 shadow-sm"
                                        style={{ backgroundColor: config.color }}
                                    >
                                        <span className="text-[10px] text-white">{config.emoji.split(' ')[0]}</span>
                                    </div>
                                    <span className="text-slate-300">{config.label}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>

            {/* Footer with incident count - Real-time status */}
            <div className="bg-slate-900/80 px-6 py-3 flex items-center justify-between text-sm border-t border-cyan-400/10">
                <div className="flex items-center gap-4">
                    <span className="flex items-center gap-2 text-slate-400">
                        <span className="relative flex h-3 w-3">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-3 w-3 bg-cyan-500"></span>
                        </span>
                        <span className="text-cyan-400 font-semibold">LIVE</span>
                    </span>
                    <span className="text-slate-400">
                        <AlertTriangle className="w-4 h-4 inline mr-1 text-orange-400" />
                        {incidents.length} active incident{incidents.length !== 1 ? 's' : ''} in Kigali
                    </span>
                </div>
                <span className="text-slate-500">
                    Powered by OSRM & OpenStreetMap
                </span>
            </div>
        </div>
    );
};

export default RoutePlannerMap;
