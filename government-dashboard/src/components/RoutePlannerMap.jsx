import React, { useState, useEffect, useRef } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { MapPin, Navigation, AlertTriangle, Clock, Route, ChevronRight, Loader2, Check, X } from 'lucide-react';
import { searchKigaliLocation, getLocationCoordinates, kigaliLocations } from '../data/kigaliLocations';
import toast from 'react-hot-toast';

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

// Custom icon for incidents - creates different icons based on incident type
const createIncidentIcon = (type = 'unknown', severity = 'medium') => {
    const iconConfig = {
        accident: { emoji: '🚗💥', color: '#dc2626', label: 'Accident' },
        congestion: { emoji: '🚦', color: '#f59e0b', label: 'Traffic Jam' },
        road_blockage: { emoji: '🚧', color: '#ef4444', label: 'Road Blocked' },
        construction: { emoji: '🏗️', color: '#f97316', label: 'Construction' },
        police_activity: { emoji: '👮', color: '#3b82f6', label: 'Police Activity' },
        weather: { emoji: '🌧️', color: '#6366f1', label: 'Weather Issue' },
        hazard: { emoji: '⚠️', color: '#eab308', label: 'Road Hazard' },
        unknown: { emoji: '⚡', color: '#6b7280', label: 'Incident' }
    };

    const config = iconConfig[type?.toLowerCase()] || iconConfig.unknown;
    const severitySize = severity === 'critical' ? 36 : severity === 'high' ? 32 : 28;

    return L.divIcon({
        className: 'custom-incident-marker',
        html: `
            <div style="
                display: flex;
                align-items: center;
                justify-content: center;
                width: ${severitySize}px;
                height: ${severitySize}px;
                background: ${config.color};
                border: 3px solid white;
                border-radius: 50%;
                box-shadow: 0 2px 8px rgba(0,0,0,0.3);
                font-size: ${severitySize * 0.5}px;
                cursor: pointer;
            ">
                <span style="filter: drop-shadow(0 1px 1px rgba(0,0,0,0.3));">${config.emoji.split(' ')[0]}</span>
            </div>
        `,
        iconSize: [severitySize, severitySize],
        iconAnchor: [severitySize / 2, severitySize / 2],
        popupAnchor: [0, -severitySize / 2]
    });
};

// Incident type configuration for legend
const INCIDENT_TYPES = {
    accident: { emoji: '🚗💥', color: '#dc2626', label: 'Accident', description: 'Vehicle collision or crash' },
    congestion: { emoji: '🚦', color: '#f59e0b', label: 'Traffic Jam', description: 'Heavy traffic, slow movement' },
    road_blockage: { emoji: '🚧', color: '#ef4444', label: 'Road Blocked', description: 'Road completely blocked' },
    construction: { emoji: '🏗️', color: '#f97316', label: 'Construction', description: 'Road work in progress' },
    police_activity: { emoji: '👮', color: '#3b82f6', label: 'Police Activity', description: 'Police checkpoint or activity' },
    weather: { emoji: '🌧️', color: '#6366f1', label: 'Weather Issue', description: 'Flooding, fog, or storm' },
    hazard: { emoji: '⚠️', color: '#eab308', label: 'Road Hazard', description: 'Debris, potholes, or danger' }
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

// Create a floating label icon for routes (like Google Maps)
const createRouteLabelIcon = (duration, distance, color, isSelected, hasIncidents, incidentCount) => {
    const formattedDuration = duration < 60 ? '<1 min' :
        duration < 3600 ? `${Math.round(duration / 60)} min` :
            `${Math.floor(duration / 3600)}h ${Math.round((duration % 3600) / 60)}m`;
    const formattedDistance = distance < 1000 ? `${Math.round(distance)} m` : `${(distance / 1000).toFixed(1)} km`;

    const selectedStyles = isSelected ? `
        transform: scale(1.1);
        box-shadow: 0 4px 12px rgba(0,0,0,0.3), 0 0 0 3px ${color}40;
        z-index: 1000;
    ` : `
        box-shadow: 0 2px 8px rgba(0,0,0,0.2);
    `;

    const incidentBadge = hasIncidents ? `
        <div style="
            position: absolute;
            top: -8px;
            right: -8px;
            background: #ef4444;
            color: white;
            font-size: 10px;
            font-weight: bold;
            width: 18px;
            height: 18px;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            border: 2px solid white;
        ">⚠</div>
    ` : '';

    return L.divIcon({
        className: 'route-label-marker',
        html: `
            <div style="
                position: relative;
                display: flex;
                flex-direction: column;
                align-items: center;
                background: white;
                border-left: 4px solid ${color};
                border-radius: 8px;
                padding: 6px 10px;
                cursor: pointer;
                white-space: nowrap;
                font-family: system-ui, -apple-system, sans-serif;
                ${selectedStyles}
                transition: all 0.2s ease;
            ">
                ${incidentBadge}
                <div style="
                    font-size: 14px;
                    font-weight: 700;
                    color: ${color};
                    line-height: 1.2;
                ">${formattedDuration}</div>
                <div style="
                    font-size: 11px;
                    color: #6b7280;
                    line-height: 1.2;
                ">${formattedDistance}</div>
            </div>
        `,
        iconSize: [80, 50],
        iconAnchor: [40, 25],
    });
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

const RoutePlannerMap = ({ incidents: rawIncidents = [] }) => {
    // Ensure incidents is always an array
    const incidents = Array.isArray(rawIncidents) ? rawIncidents : [];

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

    const kigaliCenter = [-1.9536, 30.0606];

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

    // Fetch routes from OSRM API
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
            // OSRM public API with explicit alternatives request
            // Use alternatives=3 to request up to 3 alternative routes
            const url = `https://router.project-osrm.org/route/v1/driving/${startPoint.lng},${startPoint.lat};${endPoint.lng},${endPoint.lat}?overview=full&alternatives=3&steps=true&geometries=polyline&annotations=true`;

            console.log('Fetching routes from OSRM:', url);
            const response = await fetch(url);
            const data = await response.json();

            console.log('OSRM Response:', data);

            if (data.code !== 'Ok' || !data.routes || data.routes.length === 0) {
                toast.error('Could not find routes between these locations');
                setLoadingRoutes(false);
                return;
            }

            let allRoutes = [...data.routes];

            // Always attempt to find more alternatives via waypoints if we have fewer than 4 routes
            if (allRoutes.length < 4) {
                console.log(`Found ${allRoutes.length} routes, attempting to find more alternatives via waypoints...`);

                // Calculate midpoint and direction
                const midLat = (startPoint.lat + endPoint.lat) / 2;
                const midLng = (startPoint.lng + endPoint.lng) / 2;
                const dLat = endPoint.lat - startPoint.lat;
                const dLng = endPoint.lng - startPoint.lng;

                // Multiple offsets for diversity (1km and 2.5km approximately)
                const offsets = [0.01, 0.025];

                const waypoints = [];
                offsets.forEach(scale => {
                    waypoints.push({ lat: midLat + dLng * scale, lng: midLng - dLat * scale }); // Perpendicular side A
                    waypoints.push({ lat: midLat - dLng * scale, lng: midLng + dLat * scale }); // Perpendicular side B
                });

                // Fetch routes via each waypoint
                for (let i = 0; i < waypoints.length; i++) {
                    if (allRoutes.length >= 5) break; // Limit to 5 total routes to avoid clutter

                    try {
                        const wp = waypoints[i];
                        const altUrl = `https://router.project-osrm.org/route/v1/driving/${startPoint.lng},${startPoint.lat};${wp.lng},${wp.lat};${endPoint.lng},${endPoint.lat}?overview=full&steps=true&geometries=polyline`;

                        const altResponse = await fetch(altUrl);
                        const altData = await altResponse.json();

                        if (altData.code === 'Ok' && altData.routes && altData.routes.length > 0) {
                            const altRoute = altData.routes[0];

                            // Check if this route is significantly different
                            // 1. Distance difference > 5%
                            // 2. Duration difference > 5%
                            const isDifferent = allRoutes.every(r => {
                                const distDiff = Math.abs(r.distance - altRoute.distance) / r.distance;
                                const durDiff = Math.abs(r.duration - altRoute.duration) / r.duration;
                                return distDiff > 0.05 || durDiff > 0.05;
                            });

                            if (isDifferent) {
                                allRoutes.push(altRoute);
                                console.log(`Added diverse alternative route via waypoint ${i + 1}`);
                            }
                        }
                    } catch (err) {
                        console.warn('Failed to fetch alternative route via waypoint:', err);
                    }
                }
            }

            console.log(`Total diverse routes found: ${allRoutes.length}`);

            // Process routes
            const processedRoutes = allRoutes.map((route, index) => {
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
            if (processedRoutes.length > 1) {
                toast.success(`Found ${processedRoutes.length} diverse routes! Compare and choose the best one.`);
            } else {
                const bestRoute = processedRoutes[0];
                if (bestRoute?.hasIncidents) {
                    toast(`⚠️ Found 1 route with ${bestRoute.incidents.length} incident(s).`, {
                        icon: '🚧',
                        duration: 4000
                    });
                } else {
                    toast.success(`Found 1 route. Route is clear!`);
                }
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

    // Get the midpoint of a route for placing the label
    const getRouteMidpoint = (points) => {
        if (!points || points.length === 0) return null;
        const midIndex = Math.floor(points.length / 2);
        return points[midIndex];
    };

    // Clear the route planner
    const clearRoutes = () => {
        setStart('');
        setDestination('');
        setStartCoords(null);
        setDestCoords(null);
        setRoutes([]);
        setSelectedRouteIndex(0);
        setMapBounds(null);
    };

    return (
        <div className="bg-slate-800 rounded-xl shadow-lg overflow-hidden border border-cyan-400/20">
            {/* Header - Secondary cyan color matching navigation */}
            <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 px-6 py-4 relative overflow-hidden">
                <div className="absolute bottom-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-cyan-400 to-transparent opacity-60" />
                <h2 className="text-xl font-bold text-cyan-50 flex items-center relative z-10">
                    <Navigation className="w-6 h-6 mr-2 text-cyan-400" />
                    Route Planner
                </h2>
                <p className="text-cyan-300/70 text-sm mt-1 relative z-10">
                    Find the safest route with real-time incident alerts
                </p>
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
                            {routes.length > 0 && (
                                <button
                                    onClick={clearRoutes}
                                    className="px-4 py-3 bg-slate-700 text-slate-300 rounded-lg hover:bg-slate-600 border border-cyan-400/20 transition-colors"
                                >
                                    <X className="w-5 h-5" />
                                </button>
                            )}
                        </div>
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

                                            {/* Incident status badge */}
                                            {route.hasIncidents ? (
                                                <div className="flex items-center gap-1 text-xs text-orange-300 bg-orange-500/20 px-2 py-1.5 rounded-md border border-orange-500/30">
                                                    <AlertTriangle className="w-3.5 h-3.5" />
                                                    <span className="font-medium">
                                                        {route.incidents.length} incident{route.incidents.length > 1 ? 's' : ''} on this route
                                                    </span>
                                                </div>
                                            ) : (
                                                <div className="flex items-center gap-1 text-xs text-green-300 bg-green-500/20 px-2 py-1.5 rounded-md border border-green-500/30">
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
                    >
                        <TileLayer
                            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                        />

                        {/* Fit map to route bounds */}
                        {mapBounds && <FitBounds bounds={mapBounds} />}

                        {/* Draw ALL routes simultaneously with labels - like Google Maps */}
                        {routes.map((route, index) => {
                            const isSelected = index === selectedRouteIndex;
                            const baseColor = getRouteBaseColor(index);
                            const style = getRouteStyle(index, isSelected);
                            const midpoint = getRouteMidpoint(route.points);

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

                                    {/* Route duration/distance label at midpoint */}
                                    {midpoint && (
                                        <Marker
                                            position={midpoint}
                                            icon={createRouteLabelIcon(
                                                route.duration,
                                                route.distance,
                                                baseColor,
                                                isSelected,
                                                route.hasIncidents,
                                                route.incidents.length
                                            )}
                                            eventHandlers={{
                                                click: () => setSelectedRouteIndex(index),
                                            }}
                                            zIndexOffset={isSelected ? 1000 : 0}
                                        >
                                            <Popup>
                                                <div className="p-2 min-w-[180px]">
                                                    <div className="flex items-center gap-2 mb-2">
                                                        <div
                                                            className="w-4 h-4 rounded-full"
                                                            style={{ backgroundColor: baseColor }}
                                                        />
                                                        <span className="font-bold text-gray-800">
                                                            {index === 0 ? '🥇 Recommended' : index === 1 ? '🥈 Alternative 1' : '🥉 Alternative 2'}
                                                        </span>
                                                    </div>
                                                    <div className="text-sm text-gray-600 space-y-1">
                                                        <div>⏱️ {formatDuration(route.duration)}</div>
                                                        <div>📏 {formatDistance(route.distance)}</div>
                                                        {route.hasIncidents ? (
                                                            <div className="text-orange-600 font-medium">
                                                                ⚠️ {route.incidents.length} incident(s)
                                                            </div>
                                                        ) : (
                                                            <div className="text-green-600 font-medium">
                                                                ✅ Route is clear
                                                            </div>
                                                        )}
                                                    </div>
                                                    {!isSelected && (
                                                        <button
                                                            className="mt-2 w-full py-1.5 bg-blue-600 text-white text-sm rounded font-medium hover:bg-blue-700"
                                                            onClick={() => setSelectedRouteIndex(index)}
                                                        >
                                                            Select This Route
                                                        </button>
                                                    )}
                                                </div>
                                            </Popup>
                                        </Marker>
                                    )}
                                </React.Fragment>
                            );
                        })}

                        {/* Start marker */}
                        {startCoords && (
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

                        {/* Incident markers along selected route */}
                        {routes[selectedRouteIndex]?.incidents.map((incident, idx) => {
                            const incidentType = incident.incident_type || incident.type || 'unknown';
                            const typeConfig = INCIDENT_TYPES[incidentType.toLowerCase()] || INCIDENT_TYPES.hazard;
                            return (
                                <Marker
                                    key={`incident-${incident.id || idx}`}
                                    position={[incident.latitude, incident.longitude]}
                                    icon={createIncidentIcon(incidentType, incident.severity)}
                                >
                                    <Popup>
                                        <div className="p-2 min-w-[200px]">
                                            <div className="flex items-center gap-2 mb-2">
                                                <span
                                                    className="w-8 h-8 rounded-full flex items-center justify-center text-lg"
                                                    style={{ backgroundColor: typeConfig.color }}
                                                >
                                                    {typeConfig.emoji.split(' ')[0]}
                                                </span>
                                                <div>
                                                    <div className="font-bold text-gray-800">{typeConfig.label}</div>
                                                    <div className="text-xs text-gray-500">{typeConfig.description}</div>
                                                </div>
                                            </div>
                                            <div className="text-sm text-gray-600 mb-2">
                                                📍 {incident.location || 'Unknown location'}
                                            </div>
                                            {incident.description && (
                                                <div className="text-xs text-gray-500 mb-2 p-2 bg-gray-50 rounded">
                                                    {incident.description}
                                                </div>
                                            )}
                                            <div className={`text-xs px-2 py-1 rounded inline-block font-semibold ${incident.severity === 'critical' ? 'bg-red-100 text-red-800' :
                                                incident.severity === 'high' ? 'bg-orange-100 text-orange-800' :
                                                    incident.severity === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                                                        'bg-blue-100 text-blue-800'
                                                }`}>
                                                {(incident.severity || 'medium').toUpperCase()} SEVERITY
                                            </div>
                                            <div className="text-xs text-red-600 mt-2 font-medium">
                                                ⚠️ This incident is on your selected route
                                            </div>
                                        </div>
                                    </Popup>
                                </Marker>
                            );
                        })}

                        {/* All other incidents on map */}
                        {incidents.filter(inc =>
                            inc.latitude && inc.longitude &&
                            !routes[selectedRouteIndex]?.incidents.some(ri => ri.id === inc.id)
                        ).map((incident, idx) => {
                            const incidentType = incident.incident_type || incident.type || 'unknown';
                            const typeConfig = INCIDENT_TYPES[incidentType.toLowerCase()] || INCIDENT_TYPES.hazard;
                            return (
                                <Marker
                                    key={`all-incident-${incident.id || idx}`}
                                    position={[incident.latitude, incident.longitude]}
                                    icon={createIncidentIcon(incidentType, incident.severity)}
                                    opacity={0.6}
                                >
                                    <Popup>
                                        <div className="p-2 min-w-[200px]">
                                            <div className="flex items-center gap-2 mb-2">
                                                <span
                                                    className="w-8 h-8 rounded-full flex items-center justify-center text-lg"
                                                    style={{ backgroundColor: typeConfig.color }}
                                                >
                                                    {typeConfig.emoji.split(' ')[0]}
                                                </span>
                                                <div>
                                                    <div className="font-bold text-gray-800">{typeConfig.label}</div>
                                                    <div className="text-xs text-gray-500">{typeConfig.description}</div>
                                                </div>
                                            </div>
                                            <div className="text-sm text-gray-600 mb-2">
                                                📍 {incident.location || 'Unknown location'}
                                            </div>
                                            <div className={`text-xs px-2 py-1 rounded inline-block font-semibold ${incident.severity === 'critical' ? 'bg-red-100 text-red-800' :
                                                incident.severity === 'high' ? 'bg-orange-100 text-orange-800' :
                                                    'bg-yellow-100 text-yellow-800'
                                                }`}>
                                                {(incident.severity || 'medium').toUpperCase()} SEVERITY
                                            </div>
                                            <div className="text-xs text-green-600 mt-2">
                                                ✓ Not on your current route
                                            </div>
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
                                <div className="w-4 h-1.5 bg-orange-500 rounded mr-1.5" />
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

            {/* Footer with incident count */}
            <div className="bg-slate-900/80 px-6 py-3 flex items-center justify-between text-sm border-t border-cyan-400/10">
                <span className="text-slate-400">
                    <AlertTriangle className="w-4 h-4 inline mr-1 text-orange-400" />
                    {incidents.length} active incident{incidents.length !== 1 ? 's' : ''} in Kigali
                </span>
                <span className="text-slate-500">
                    Powered by OSRM & OpenStreetMap
                </span>
            </div>
        </div>
    );
};

export default RoutePlannerMap;
