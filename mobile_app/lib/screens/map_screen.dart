import 'package:flutter/material.dart';
import 'package:google_maps_flutter/google_maps_flutter.dart';
import 'package:geolocator/geolocator.dart';
import 'dart:async';
import '../services/api_service.dart';
import '../services/websocket_service.dart';
import '../config/app_config.dart';
import '../main.dart' show appState;

class MapScreen extends StatefulWidget {
  const MapScreen({super.key});

  @override
  State<MapScreen> createState() => _MapScreenState();
}

class _MapScreenState extends State<MapScreen> with TickerProviderStateMixin {
  GoogleMapController? _mapController;
  final ApiService _apiService = ApiService();
  final WebSocketService _wsService = WebSocketService();
  
  // Map state
  Set<Marker> _markers = {};
  Set<Circle> _circles = {};
  Set<Polyline> _polylines = {};
  bool _isLoading = true;
  String? _errorMessage;
  
  // Current position
  LatLng _currentPosition = LatLng(
    AppConfig.defaultLatitude,
    AppConfig.defaultLongitude,
  );
  bool _locationPermissionGranted = false;
  
  // Incidents data
  List<Map<String, dynamic>> _incidents = [];
  List<Map<String, dynamic>> _trafficData = [];
  
  // UI state
  bool _showTrafficLayer = true;
  bool _showIncidents = true;
  bool _showHeatmap = true;
  String _selectedFilter = 'all';
  MapType _mapType = MapType.normal;
  
  // Animation
  late AnimationController _pulseController;
  
  // Stream subscriptions
  StreamSubscription? _incidentSubscription;
  StreamSubscription? _locationSubscription;

  @override
  void initState() {
    super.initState();
    _pulseController = AnimationController(
      duration: const Duration(seconds: 2),
      vsync: this,
    )..repeat();
    
    _initializeMap();
    _setupWebSocketListeners();
  }

  @override
  void dispose() {
    _pulseController.dispose();
    _mapController?.dispose();
    _incidentSubscription?.cancel();
    _locationSubscription?.cancel();
    super.dispose();
  }

  Future<void> _initializeMap() async {
    setState(() => _isLoading = true);
    
    try {
      // Check and request location permission
      await _checkLocationPermission();
      
      // Get current location
      if (_locationPermissionGranted) {
        await _getCurrentLocation();
      }
      
      // Load incidents from API
      await _loadIncidents();
      
      // Load traffic data
      await _loadTrafficData();
      
      setState(() {
        _isLoading = false;
        _errorMessage = null;
      });
    } catch (e) {
      setState(() {
        _isLoading = false;
        _errorMessage = 'Failed to initialize map: $e';
      });
    }
  }

  Future<void> _checkLocationPermission() async {
    try {
      LocationPermission permission = await Geolocator.checkPermission();
      
      if (permission == LocationPermission.denied) {
        permission = await Geolocator.requestPermission();
      }
      
      if (permission == LocationPermission.deniedForever) {
        setState(() {
          _locationPermissionGranted = false;
          _errorMessage = 'Location permission permanently denied. Please enable in settings.';
        });
        return;
      }
      
      _locationPermissionGranted = permission == LocationPermission.always || 
                                   permission == LocationPermission.whileInUse;
    } catch (e) {
      print('Error checking location permission: $e');
      _locationPermissionGranted = false;
    }
  }

  Future<void> _getCurrentLocation() async {
    try {
      final position = await Geolocator.getCurrentPosition(
        desiredAccuracy: LocationAccuracy.high,
        timeLimit: const Duration(seconds: 10),
      );
      
      setState(() {
        _currentPosition = LatLng(position.latitude, position.longitude);
      });
      
      // Start listening to location updates
      _locationSubscription = Geolocator.getPositionStream(
        locationSettings: const LocationSettings(
          accuracy: LocationAccuracy.high,
          distanceFilter: 50, // Update every 50 meters
        ),
      ).listen((Position position) {
        setState(() {
          _currentPosition = LatLng(position.latitude, position.longitude);
          _updateCurrentLocationMarker();
        });
      });
    } catch (e) {
      print('Error getting current location: $e');
    }
  }

  Future<void> _loadIncidents() async {
    try {
      final response = await _apiService.get('/api/incidents');
      final data = response.data;
      
      print('DEBUG: Incidents API response: $data');
      
      if (data != null && data['success'] == true && data['data'] != null) {
        final incidents = data['data'] as List;
        print('DEBUG: Loaded ${incidents.length} incidents');
        setState(() {
          _incidents = incidents.cast<Map<String, dynamic>>();
          _updateIncidentMarkers();
        });
        print('DEBUG: Markers count after update: ${_markers.length}');
      } else {
        print('DEBUG: No incidents data - success: ${data?['success']}, data: ${data?['data']}');
      }
    } catch (e) {
      print('Error loading incidents: $e');
    }
  }

  Future<void> _loadTrafficData() async {
    try {
      final response = await _apiService.get('/api/traffic/heatmap');
      final data = response.data;
      
      if (data != null && data['success'] == true && data['data'] != null) {
        setState(() {
          _trafficData = (data['data'] as List).cast<Map<String, dynamic>>();
          _updateTrafficOverlay();
        });
      }
    } catch (e) {
      print('Error loading traffic data: $e');
    }
  }

  void _setupWebSocketListeners() {
    // Listen for new incidents
    _incidentSubscription = _wsService.incidentStream.listen((incident) {
      setState(() {
        _incidents.add(incident);
        _updateIncidentMarkers();
      });
      
      // Show notification
      _showIncidentNotification(incident);
    });
  }

  void _updateCurrentLocationMarker() {
    final currentLocationMarker = Marker(
      markerId: const MarkerId('current_location'),
      position: _currentPosition,
      icon: BitmapDescriptor.defaultMarkerWithHue(BitmapDescriptor.hueAzure),
      infoWindow: const InfoWindow(title: 'Your Location'),
      zIndex: 100,
    );
    
    setState(() {
      _markers.removeWhere((m) => m.markerId.value == 'current_location');
      _markers.add(currentLocationMarker);
    });
  }

  void _updateIncidentMarkers() {
    if (!_showIncidents) {
      setState(() {
        _markers.removeWhere((m) => m.markerId.value.startsWith('incident_'));
        _circles.removeWhere((c) => c.circleId.value.startsWith('incident_'));
      });
      return;
    }
    
    final incidentMarkers = <Marker>{};
    final incidentCircles = <Circle>{};
    
    for (final incident in _incidents) {
      // Get type - API returns 'incident_type' but we also check 'type' for compatibility
      final type = (incident['incident_type'] ?? incident['type'])?.toString() ?? 'unknown';
      
      // Filter by type if needed
      if (_selectedFilter != 'all' && type != _selectedFilter) {
        continue;
      }
      
      final lat = _parseDouble(incident['latitude'] ?? incident['location']?['latitude']);
      final lng = _parseDouble(incident['longitude'] ?? incident['location']?['longitude']);
      
      if (lat == null || lng == null) continue;
      
      final position = LatLng(lat, lng);
      final severity = incident['severity']?.toString().toLowerCase() ?? 'medium';
      final id = incident['id']?.toString() ?? DateTime.now().millisecondsSinceEpoch.toString();
      
      // Determine marker color based on severity
      double hue;
      Color circleColor;
      switch (severity) {
        case 'critical':
        case 'high':
          hue = BitmapDescriptor.hueRed;
          circleColor = Colors.red.withOpacity(0.2);
          break;
        case 'medium':
          hue = BitmapDescriptor.hueOrange;
          circleColor = Colors.orange.withOpacity(0.2);
          break;
        default:
          hue = BitmapDescriptor.hueYellow;
          circleColor = Colors.yellow.withOpacity(0.2);
      }
      
      // Add marker
      incidentMarkers.add(Marker(
        markerId: MarkerId('incident_$id'),
        position: position,
        icon: BitmapDescriptor.defaultMarkerWithHue(hue),
        infoWindow: InfoWindow(
          title: _getIncidentTitle(type),
          snippet: 'Severity: ${severity.toUpperCase()}\nTap for details',
          onTap: () => _showIncidentDetails(incident),
        ),
        onTap: () => _showIncidentDetails(incident),
      ));
      
      // Add radius circle for high severity incidents
      if (severity == 'high' || severity == 'critical') {
        incidentCircles.add(Circle(
          circleId: CircleId('incident_radius_$id'),
          center: position,
          radius: 500, // 500m radius
          fillColor: circleColor,
          strokeColor: circleColor.withOpacity(0.5),
          strokeWidth: 2,
        ));
      }
    }
    
    setState(() {
      _markers.removeWhere((m) => m.markerId.value.startsWith('incident_'));
      _markers.addAll(incidentMarkers);
      _circles.removeWhere((c) => c.circleId.value.startsWith('incident_'));
      _circles.addAll(incidentCircles);
    });
  }

  void _updateTrafficOverlay() {
    if (!_showHeatmap || _trafficData.isEmpty) {
      setState(() {
        _circles.removeWhere((c) => c.circleId.value.startsWith('traffic_'));
      });
      return;
    }
    
    final trafficCircles = <Circle>{};
    
    for (int i = 0; i < _trafficData.length; i++) {
      final data = _trafficData[i];
      final lat = _parseDouble(data['latitude']);
      final lng = _parseDouble(data['longitude']);
      final density = _parseDouble(data['density']) ?? 0.5;
      
      if (lat == null || lng == null) continue;
      
      // Color based on traffic density
      Color color;
      if (density > 0.8) {
        color = Colors.red.withOpacity(0.4);
      } else if (density > 0.5) {
        color = Colors.orange.withOpacity(0.3);
      } else if (density > 0.3) {
        color = Colors.yellow.withOpacity(0.2);
      } else {
        color = Colors.green.withOpacity(0.1);
      }
      
      trafficCircles.add(Circle(
        circleId: CircleId('traffic_$i'),
        center: LatLng(lat, lng),
        radius: 200,
        fillColor: color,
        strokeWidth: 0,
      ));
    }
    
    setState(() {
      _circles.removeWhere((c) => c.circleId.value.startsWith('traffic_'));
      _circles.addAll(trafficCircles);
    });
  }

  double? _parseDouble(dynamic value) {
    if (value == null) return null;
    if (value is double) return value;
    if (value is int) return value.toDouble();
    if (value is String) return double.tryParse(value);
    return null;
  }

  String _getIncidentTitle(String type) {
    switch (type.toLowerCase()) {
      case 'accident':
        return '🚗 Vehicle Accident';
      case 'congestion':
        return '🚦 Traffic Congestion';
      case 'roadblock':
        return '🚧 Road Block';
      case 'hazard':
        return '⚠️ Road Hazard';
      case 'emergency':
        return '🚨 Emergency';
      default:
        return '📍 Incident';
    }
  }

  void _showIncidentDetails(Map<String, dynamic> incident) {
    final type = (incident['incident_type'] ?? incident['type'])?.toString() ?? 'unknown';
    final severity = incident['severity']?.toString() ?? 'medium';
    final description = incident['description']?.toString() ?? 'No description';
    final reportedAt = incident['created_at'] ?? incident['reported_at'];
    
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (context) => Container(
        decoration: BoxDecoration(
          color: Theme.of(context).scaffoldBackgroundColor,
          borderRadius: const BorderRadius.vertical(top: Radius.circular(20)),
        ),
        padding: const EdgeInsets.all(20),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Center(
              child: Container(
                width: 40,
                height: 4,
                decoration: BoxDecoration(
                  color: Colors.grey[300],
                  borderRadius: BorderRadius.circular(2),
                ),
              ),
            ),
            const SizedBox(height: 20),
            Row(
              children: [
                _getIncidentIcon(type, severity),
                const SizedBox(width: 12),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        _getIncidentTitle(type),
                        style: const TextStyle(
                          fontSize: 18,
                          fontWeight: FontWeight.bold,
                        ),
                      ),
                      Text(
                        'Severity: ${severity.toUpperCase()}',
                        style: TextStyle(
                          color: _getSeverityColor(severity),
                          fontWeight: FontWeight.w500,
                        ),
                      ),
                    ],
                  ),
                ),
              ],
            ),
            const SizedBox(height: 16),
            Text(
              description,
              style: const TextStyle(fontSize: 14),
            ),
            if (reportedAt != null) ...[
              const SizedBox(height: 12),
              Text(
                'Reported: ${_formatDateTime(reportedAt)}',
                style: TextStyle(color: Colors.grey[600], fontSize: 12),
              ),
            ],
            const SizedBox(height: 20),
            Row(
              children: [
                Expanded(
                  child: ElevatedButton.icon(
                    onPressed: () {
                      Navigator.pop(context);
                      _navigateToIncident(incident);
                    },
                    icon: const Icon(Icons.directions),
                    label: const Text('Navigate'),
                  ),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: OutlinedButton.icon(
                    onPressed: () {
                      Navigator.pop(context);
                      _reportUpdate(incident);
                    },
                    icon: const Icon(Icons.update),
                    label: const Text('Update'),
                  ),
                ),
              ],
            ),
            const SizedBox(height: 10),
          ],
        ),
      ),
    );
  }

  Widget _getIncidentIcon(String type, String severity) {
    IconData icon;
    Color color = _getSeverityColor(severity);
    
    switch (type.toLowerCase()) {
      case 'accident':
        icon = Icons.car_crash;
        break;
      case 'congestion':
        icon = Icons.traffic;
        break;
      case 'roadblock':
        icon = Icons.block;
        break;
      case 'hazard':
        icon = Icons.warning;
        break;
      case 'emergency':
        icon = Icons.emergency;
        break;
      default:
        icon = Icons.place;
    }
    
    return Container(
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: color.withOpacity(0.1),
        borderRadius: BorderRadius.circular(12),
      ),
      child: Icon(icon, color: color, size: 28),
    );
  }

  Color _getSeverityColor(String severity) {
    switch (severity.toLowerCase()) {
      case 'critical':
        return Colors.purple;
      case 'high':
        return Colors.red;
      case 'medium':
        return Colors.orange;
      case 'low':
        return Colors.yellow[700]!;
      default:
        return Colors.grey;
    }
  }

  String _formatDateTime(dynamic dateTime) {
    try {
      final dt = dateTime is DateTime ? dateTime : DateTime.parse(dateTime.toString());
      final now = DateTime.now();
      final diff = now.difference(dt);
      
      if (diff.inMinutes < 1) return 'Just now';
      if (diff.inMinutes < 60) return '${diff.inMinutes}m ago';
      if (diff.inHours < 24) return '${diff.inHours}h ago';
      return '${diff.inDays}d ago';
    } catch (e) {
      return dateTime.toString();
    }
  }

  void _navigateToIncident(Map<String, dynamic> incident) {
    final lat = _parseDouble(incident['latitude'] ?? incident['location']?['latitude']);
    final lng = _parseDouble(incident['longitude'] ?? incident['location']?['longitude']);
    
    if (lat != null && lng != null) {
      _mapController?.animateCamera(
        CameraUpdate.newLatLngZoom(LatLng(lat, lng), 16),
      );
    }
  }

  void _reportUpdate(Map<String, dynamic> incident) {
    // Navigate to report update screen
    ScaffoldMessenger.of(context).showSnackBar(
      const SnackBar(content: Text('Feature coming soon: Report incident update')),
    );
  }

  void _showIncidentNotification(Map<String, dynamic> incident) {
    final type = incident['type']?.toString() ?? 'incident';
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Row(
          children: [
            const Icon(Icons.warning, color: Colors.white),
            const SizedBox(width: 8),
            Expanded(child: Text('New ${_getIncidentTitle(type)} reported nearby!')),
          ],
        ),
        backgroundColor: Colors.orange,
        action: SnackBarAction(
          label: 'View',
          textColor: Colors.white,
          onPressed: () => _showIncidentDetails(incident),
        ),
      ),
    );
  }

  void _centerOnCurrentLocation() {
    _mapController?.animateCamera(
      CameraUpdate.newLatLngZoom(_currentPosition, 15),
    );
  }

  void _toggleMapType() {
    setState(() {
      _mapType = _mapType == MapType.normal 
          ? MapType.satellite 
          : _mapType == MapType.satellite 
              ? MapType.hybrid 
              : MapType.normal;
    });
  }

  @override
  Widget build(BuildContext context) {
    final isDark = appState.theme.isDarkMode;
    
    return Scaffold(
      appBar: AppBar(
        title: const Text('Traffic Map'),
        actions: [
          IconButton(
            icon: Icon(_showTrafficLayer ? Icons.layers : Icons.layers_outlined),
            onPressed: () {
              setState(() => _showTrafficLayer = !_showTrafficLayer);
            },
            tooltip: 'Toggle Traffic Layer',
          ),
          PopupMenuButton<String>(
            icon: const Icon(Icons.filter_list),
            onSelected: (value) {
              setState(() {
                _selectedFilter = value;
                _updateIncidentMarkers();
              });
            },
            itemBuilder: (context) => [
              const PopupMenuItem(value: 'all', child: Text('All Incidents')),
              const PopupMenuItem(value: 'accident', child: Text('🚗 Accidents')),
              const PopupMenuItem(value: 'congestion', child: Text('🚦 Congestion')),
              const PopupMenuItem(value: 'roadblock', child: Text('🚧 Road Blocks')),
              const PopupMenuItem(value: 'hazard', child: Text('⚠️ Hazards')),
            ],
          ),
        ],
      ),
      body: Stack(
        children: [
          // Google Map
          GoogleMap(
            initialCameraPosition: CameraPosition(
              target: _currentPosition,
              zoom: AppConfig.defaultZoom,
            ),
            onMapCreated: (controller) {
              _mapController = controller;
              _updateCurrentLocationMarker();
              
              // Apply dark mode style if needed
              if (isDark) {
                _setDarkMapStyle(controller);
              }
            },
            markers: _markers,
            circles: _circles,
            polylines: _polylines,
            mapType: _mapType,
            myLocationEnabled: _locationPermissionGranted,
            myLocationButtonEnabled: false,
            zoomControlsEnabled: false,
            compassEnabled: true,
            trafficEnabled: _showTrafficLayer,
            onTap: (latLng) {
              // Optional: Add incident at tapped location
            },
          ),
          
          // Loading overlay
          if (_isLoading)
            Container(
              color: Colors.black26,
              child: const Center(
                child: Card(
                  child: Padding(
                    padding: EdgeInsets.all(20),
                    child: Column(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        CircularProgressIndicator(),
                        SizedBox(height: 16),
                        Text('Loading map...'),
                      ],
                    ),
                  ),
                ),
              ),
            ),
          
          // Error message
          if (_errorMessage != null && !_isLoading)
            Positioned(
              top: 16,
              left: 16,
              right: 16,
              child: Card(
                color: Colors.red[100],
                child: Padding(
                  padding: const EdgeInsets.all(12),
                  child: Row(
                    children: [
                      const Icon(Icons.error, color: Colors.red),
                      const SizedBox(width: 8),
                      Expanded(child: Text(_errorMessage!)),
                      IconButton(
                        icon: const Icon(Icons.close),
                        onPressed: () => setState(() => _errorMessage = null),
                      ),
                    ],
                  ),
                ),
              ),
            ),
          
          // Legend
          Positioned(
            top: 16,
            right: 16,
            child: Card(
              child: Padding(
                padding: const EdgeInsets.all(8),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    _buildLegendItem(Colors.red, 'High Severity'),
                    _buildLegendItem(Colors.orange, 'Medium'),
                    _buildLegendItem(Colors.yellow[700]!, 'Low'),
                    const Divider(height: 8),
                    Row(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        Text(
                          '${_incidents.length}',
                          style: const TextStyle(fontWeight: FontWeight.bold),
                        ),
                        const Text(' incidents'),
                      ],
                    ),
                  ],
                ),
              ),
            ),
          ),
          
          // Quick action buttons
          Positioned(
            bottom: 100,
            right: 16,
            child: Column(
              children: [
                FloatingActionButton.small(
                  heroTag: 'map_type',
                  onPressed: _toggleMapType,
                  child: const Icon(Icons.map),
                ),
                const SizedBox(height: 8),
                FloatingActionButton.small(
                  heroTag: 'toggle_incidents',
                  onPressed: () {
                    setState(() {
                      _showIncidents = !_showIncidents;
                      _updateIncidentMarkers();
                    });
                  },
                  backgroundColor: _showIncidents ? null : Colors.grey,
                  child: const Icon(Icons.warning),
                ),
                const SizedBox(height: 8),
                FloatingActionButton.small(
                  heroTag: 'toggle_heatmap',
                  onPressed: () {
                    setState(() {
                      _showHeatmap = !_showHeatmap;
                      _updateTrafficOverlay();
                    });
                  },
                  backgroundColor: _showHeatmap ? null : Colors.grey,
                  child: const Icon(Icons.whatshot),
                ),
                const SizedBox(height: 8),
                FloatingActionButton.small(
                  heroTag: 'refresh',
                  onPressed: _initializeMap,
                  child: const Icon(Icons.refresh),
                ),
              ],
            ),
          ),
        ],
      ),
      floatingActionButton: FloatingActionButton(
        onPressed: _centerOnCurrentLocation,
        child: const Icon(Icons.my_location),
      ),
      floatingActionButtonLocation: FloatingActionButtonLocation.startFloat,
    );
  }

  Widget _buildLegendItem(Color color, String label) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 2),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Container(
            width: 12,
            height: 12,
            decoration: BoxDecoration(
              color: color,
              shape: BoxShape.circle,
            ),
          ),
          const SizedBox(width: 6),
          Text(label, style: const TextStyle(fontSize: 11)),
        ],
      ),
    );
  }

  Future<void> _setDarkMapStyle(GoogleMapController controller) async {
    const darkMapStyle = '''
    [
      {"elementType": "geometry", "stylers": [{"color": "#212121"}]},
      {"elementType": "labels.icon", "stylers": [{"visibility": "off"}]},
      {"elementType": "labels.text.fill", "stylers": [{"color": "#757575"}]},
      {"elementType": "labels.text.stroke", "stylers": [{"color": "#212121"}]},
      {"featureType": "administrative", "elementType": "geometry", "stylers": [{"color": "#757575"}]},
      {"featureType": "poi", "elementType": "labels.text.fill", "stylers": [{"color": "#757575"}]},
      {"featureType": "poi.park", "elementType": "geometry", "stylers": [{"color": "#181818"}]},
      {"featureType": "poi.park", "elementType": "labels.text.fill", "stylers": [{"color": "#616161"}]},
      {"featureType": "road", "elementType": "geometry.fill", "stylers": [{"color": "#2c2c2c"}]},
      {"featureType": "road", "elementType": "labels.text.fill", "stylers": [{"color": "#8a8a8a"}]},
      {"featureType": "road.arterial", "elementType": "geometry", "stylers": [{"color": "#373737"}]},
      {"featureType": "road.highway", "elementType": "geometry", "stylers": [{"color": "#3c3c3c"}]},
      {"featureType": "road.highway.controlled_access", "elementType": "geometry", "stylers": [{"color": "#4e4e4e"}]},
      {"featureType": "road.local", "elementType": "labels.text.fill", "stylers": [{"color": "#616161"}]},
      {"featureType": "transit", "elementType": "labels.text.fill", "stylers": [{"color": "#757575"}]},
      {"featureType": "water", "elementType": "geometry", "stylers": [{"color": "#000000"}]},
      {"featureType": "water", "elementType": "labels.text.fill", "stylers": [{"color": "#3d3d3d"}]}
    ]
    ''';
    
    await controller.setMapStyle(darkMapStyle);
  }
}
