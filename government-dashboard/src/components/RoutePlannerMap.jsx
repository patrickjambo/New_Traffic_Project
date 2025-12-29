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

const incidentIcon = new L.Icon({
    iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-orange.png',
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
    iconSize: [20, 33],
    iconAnchor: [10, 33],
    popupAnchor: [1, -28],
    shadowSize: [33, 33]
});

// Route color configurations
const ROUTE_COLORS = {
    primary: { color: '#22c55e', weight: 6, opacity: 0.9 },     // Green - Best route
    alternative1: { color: '#3b82f6', weight: 5, opacity: 0.7 }, // Blue
    alternative2: { color: '#f97316', weight: 5, opacity: 0.7 }, // Orange
    selected: { color: '#8b5cf6', weight: 7, opacity: 1 },       // Purple - Currently selected
    hasIncident: { color: '#ef4444', weight: 4, opacity: 0.6, dashArray: '10, 10' } // Red dashed overlay
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
            // OSRM public API with alternatives
            const url = `https://router.project-osrm.org/route/v1/driving/${startPoint.lng},${startPoint.lat};${endPoint.lng},${endPoint.lat}?overview=full&alternatives=true&steps=true&geometries=polyline`;

            const response = await fetch(url);
            const data = await response.json();

            if (data.code !== 'Ok' || !data.routes || data.routes.length === 0) {
                toast.error('Could not find routes between these locations');
                setLoadingRoutes(false);
                return;
            }

            // Process routes
            const processedRoutes = data.routes.map((route, index) => {
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
                    summary: route.legs[0]?.summary || `Route ${index + 1}`
                };
            });

            // Sort routes: fewest incidents first, then by distance
            processedRoutes.sort((a, b) => {
                if (a.incidents.length !== b.incidents.length) {
                    return a.incidents.length - b.incidents.length;
                }
                return a.distance - b.distance;
            });

            setRoutes(processedRoutes);
            setSelectedRouteIndex(0);

            // Set map bounds
            if (processedRoutes.length > 0) {
                const allPoints = processedRoutes.flatMap(r => r.points);
                setMapBounds(allPoints);
            }

            // Show toast with results
            const bestRoute = processedRoutes[0];
            if (bestRoute.hasIncidents) {
                toast(`⚠️ Found ${processedRoutes.length} routes. Best route has ${bestRoute.incidents.length} incident(s).`, {
                    icon: '🚧',
                    duration: 4000
                });
            } else {
                toast.success(`Found ${processedRoutes.length} route(s). Best route is clear!`);
            }

        } catch (error) {
            console.error('Error fetching routes:', error);
            toast.error('Error fetching routes. Please try again.');
        }

        setLoadingRoutes(false);
    };

    // Get route color based on index and selection
    const getRouteStyle = (routeIndex, route) => {
        if (routeIndex === selectedRouteIndex) {
            return ROUTE_COLORS.selected;
        }
        if (routeIndex === 0) return ROUTE_COLORS.primary;
        if (routeIndex === 1) return ROUTE_COLORS.alternative1;
        return ROUTE_COLORS.alternative2;
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
        <div className="bg-white rounded-xl shadow-lg overflow-hidden">
            {/* Header */}
            <div className="bg-gradient-to-r from-blue-600 to-blue-700 px-6 py-4">
                <h2 className="text-xl font-bold text-white flex items-center">
                    <Navigation className="w-6 h-6 mr-2" />
                    Route Planner
                </h2>
                <p className="text-blue-100 text-sm mt-1">
                    Find the safest route with real-time incident alerts
                </p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-0">
                {/* Left Panel - Input & Route Options */}
                <div className="lg:col-span-1 p-5 border-r border-gray-200 bg-gray-50">
                    {/* Start Location */}
                    <div className="mb-4">
                        <label className="block text-sm font-semibold text-gray-700 mb-2">
                            Starting Point
                        </label>
                        <div className="flex gap-2">
                            <div className="relative flex-1">
                                <MapPin className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-green-600" />
                                <input
                                    type="text"
                                    value={start}
                                    onChange={(e) => handleStartChange(e.target.value)}
                                    onFocus={() => start && setShowStartSuggestions(true)}
                                    onBlur={() => setTimeout(() => setShowStartSuggestions(false), 200)}
                                    placeholder="e.g., Kigali Airport..."
                                    className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                                />
                                {showStartSuggestions && startSuggestions.length > 0 && (
                                    <div className="absolute z-30 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-xl max-h-48 overflow-y-auto">
                                        {startSuggestions.map((loc, idx) => (
                                            <div
                                                key={idx}
                                                onClick={() => selectStart(loc)}
                                                className="px-3 py-2.5 hover:bg-blue-50 cursor-pointer border-b border-gray-100 last:border-b-0"
                                            >
                                                <span className="text-sm font-medium text-gray-800">{loc.name}</span>
                                                <span className="text-xs text-gray-500 block">{loc.type}</span>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                            <button
                                onClick={handleUseMyLocation}
                                disabled={loadingLocation}
                                className="px-3 py-2 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 transition-colors"
                                title="Use my location"
                            >
                                {loadingLocation ? <Loader2 className="w-5 h-5 animate-spin" /> : <Navigation className="w-5 h-5" />}
                            </button>
                        </div>
                    </div>

                    {/* Destination */}
                    <div className="mb-4">
                        <label className="block text-sm font-semibold text-gray-700 mb-2">
                            Destination
                        </label>
                        <div className="relative">
                            <MapPin className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-red-600" />
                            <input
                                type="text"
                                value={destination}
                                onChange={(e) => handleDestChange(e.target.value)}
                                onFocus={() => destination && setShowDestSuggestions(true)}
                                onBlur={() => setTimeout(() => setShowDestSuggestions(false), 200)}
                                placeholder="e.g., Nyabugogo..."
                                className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                            />
                            {showDestSuggestions && destSuggestions.length > 0 && (
                                <div className="absolute z-30 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-xl max-h-48 overflow-y-auto">
                                    {destSuggestions.map((loc, idx) => (
                                        <div
                                            key={idx}
                                            onClick={() => selectDest(loc)}
                                            className="px-3 py-2.5 hover:bg-blue-50 cursor-pointer border-b border-gray-100 last:border-b-0"
                                        >
                                            <span className="text-sm font-medium text-gray-800">{loc.name}</span>
                                            <span className="text-xs text-gray-500 block">{loc.type}</span>
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
                            className="flex-1 bg-gradient-to-r from-blue-600 to-blue-700 text-white py-3 rounded-lg font-semibold hover:from-blue-700 hover:to-blue-800 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
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
                                className="px-4 py-3 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        )}
                    </div>

                    {/* Route Options */}
                    {routes.length > 0 && (
                        <div className="space-y-3">
                            <h3 className="font-semibold text-gray-800 flex items-center">
                                <Route className="w-4 h-4 mr-2" />
                                Route Options ({routes.length})
                            </h3>

                            {routes.map((route, index) => (
                                <div
                                    key={route.id}
                                    onClick={() => setSelectedRouteIndex(index)}
                                    className={`p-3 rounded-lg cursor-pointer transition-all border-2 ${selectedRouteIndex === index
                                        ? 'border-purple-500 bg-purple-50'
                                        : 'border-gray-200 bg-white hover:border-gray-300'
                                        }`}
                                >
                                    <div className="flex items-center justify-between mb-2">
                                        <div className="flex items-center">
                                            <div
                                                className="w-3 h-3 rounded-full mr-2"
                                                style={{
                                                    backgroundColor: index === 0 ? '#22c55e' : index === 1 ? '#3b82f6' : '#f97316'
                                                }}
                                            />
                                            <span className="font-semibold text-sm">
                                                {index === 0 ? 'Recommended' : `Alternative ${index}`}
                                            </span>
                                        </div>
                                        {selectedRouteIndex === index && (
                                            <Check className="w-4 h-4 text-purple-600" />
                                        )}
                                    </div>

                                    <div className="flex items-center gap-4 text-sm text-gray-600">
                                        <span className="flex items-center">
                                            <Clock className="w-3 h-3 mr-1" />
                                            {formatDuration(route.duration)}
                                        </span>
                                        <span>{formatDistance(route.distance)}</span>
                                    </div>

                                    {/* Incident warning */}
                                    {route.hasIncidents && (
                                        <div className="mt-2 flex items-center text-xs text-orange-700 bg-orange-100 px-2 py-1 rounded">
                                            <AlertTriangle className="w-3 h-3 mr-1" />
                                            {route.incidents.length} incident{route.incidents.length > 1 ? 's' : ''} on this route
                                        </div>
                                    )}
                                    {!route.hasIncidents && (
                                        <div className="mt-2 flex items-center text-xs text-green-700 bg-green-100 px-2 py-1 rounded">
                                            <Check className="w-3 h-3 mr-1" />
                                            Route is clear
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}

                    {/* Legend */}
                    {routes.length > 0 && (
                        <div className="mt-6 p-3 bg-gray-100 rounded-lg">
                            <h4 className="text-xs font-semibold text-gray-600 mb-2">LEGEND</h4>
                            <div className="space-y-1 text-xs">
                                <div className="flex items-center">
                                    <div className="w-4 h-1 bg-green-500 rounded mr-2" />
                                    <span>Recommended</span>
                                </div>
                                <div className="flex items-center">
                                    <div className="w-4 h-1 bg-blue-500 rounded mr-2" />
                                    <span>Alternative 1</span>
                                </div>
                                <div className="flex items-center">
                                    <div className="w-4 h-1 bg-orange-500 rounded mr-2" />
                                    <span>Alternative 2</span>
                                </div>
                                <div className="flex items-center">
                                    <div className="w-4 h-1 bg-purple-500 rounded mr-2" />
                                    <span>Selected</span>
                                </div>
                            </div>
                        </div>
                    )}
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

                        {/* Draw all routes (non-selected first, then selected on top) */}
                        {routes.map((route, index) => {
                            if (index === selectedRouteIndex) return null;
                            const style = getRouteStyle(index, route);
                            return (
                                <Polyline
                                    key={`route-${index}`}
                                    positions={route.points}
                                    pathOptions={style}
                                    eventHandlers={{
                                        click: () => setSelectedRouteIndex(index)
                                    }}
                                />
                            );
                        })}

                        {/* Selected route on top */}
                        {routes[selectedRouteIndex] && (
                            <Polyline
                                positions={routes[selectedRouteIndex].points}
                                pathOptions={ROUTE_COLORS.selected}
                            />
                        )}

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
                        {routes[selectedRouteIndex]?.incidents.map((incident, idx) => (
                            <Marker
                                key={`incident-${incident.id || idx}`}
                                position={[incident.latitude, incident.longitude]}
                                icon={incidentIcon}
                            >
                                <Popup>
                                    <div className="p-1">
                                        <div className="font-bold text-orange-700">{incident.incident_type || 'Incident'}</div>
                                        <div className="text-sm text-gray-600">{incident.location}</div>
                                        <div className={`text-xs mt-1 px-2 py-0.5 rounded inline-block ${incident.severity === 'critical' ? 'bg-red-100 text-red-800' :
                                            incident.severity === 'high' ? 'bg-orange-100 text-orange-800' :
                                                'bg-yellow-100 text-yellow-800'
                                            }`}>
                                            {incident.severity || 'medium'} severity
                                        </div>
                                    </div>
                                </Popup>
                            </Marker>
                        ))}

                        {/* All incidents on map (faded if not on route) */}
                        {incidents.filter(inc =>
                            inc.latitude && inc.longitude &&
                            !routes[selectedRouteIndex]?.incidents.some(ri => ri.id === inc.id)
                        ).map((incident, idx) => (
                            <Marker
                                key={`all-incident-${incident.id || idx}`}
                                position={[incident.latitude, incident.longitude]}
                                opacity={0.5}
                            >
                                <Popup>
                                    <div className="p-1">
                                        <div className="font-bold">{incident.incident_type || 'Incident'}</div>
                                        <div className="text-sm text-gray-600">{incident.location}</div>
                                        <div className="text-xs text-gray-400">Not on current route</div>
                                    </div>
                                </Popup>
                            </Marker>
                        ))}
                    </MapContainer>
                </div>
            </div>

            {/* Footer with incident count */}
            <div className="bg-gray-100 px-6 py-3 flex items-center justify-between text-sm">
                <span className="text-gray-600">
                    <AlertTriangle className="w-4 h-4 inline mr-1 text-orange-500" />
                    {incidents.length} active incident{incidents.length !== 1 ? 's' : ''} in Kigali
                </span>
                <span className="text-gray-500">
                    Powered by OSRM & OpenStreetMap
                </span>
            </div>
        </div>
    );
};

export default RoutePlannerMap;
