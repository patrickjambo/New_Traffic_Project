import 'package:flutter/material.dart';
import 'package:google_maps_flutter/google_maps_flutter.dart';
import 'package:geolocator/geolocator.dart';
import 'dart:async';
import '../services/api_service.dart';
import '../services/websocket_service.dart';
import '../config/app_config.dart';
import '../config/app_theme.dart';
import '../main.dart' show appState;

/// ============================================================================
/// Map Screen - TrafficGuard Mobile App
/// ============================================================================
/// Interactive map screen featuring:
/// - Google Maps integration
/// - Real-time incident markers
/// - Traffic overlay
/// - Incident filtering
/// - Consistent dark theme design
/// ============================================================================

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
      await _checkLocationPermission();
      
      if (_locationPermissionGranted) {
        await _getCurrentLocation();
      }
      
      await _loadIncidents();
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
      debugPrint('Error checking location permission: $e');
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
      
      _locationSubscription = Geolocator.getPositionStream(
        locationSettings: const LocationSettings(
          accuracy: LocationAccuracy.high,
          distanceFilter: 50,
        ),
      ).listen((Position position) {
        setState(() {
          _currentPosition = LatLng(position.latitude, position.longitude);
          _updateCurrentLocationMarker();
        });
      });
    } catch (e) {
      debugPrint('Error getting current location: $e');
    }
  }

  Future<void> _loadIncidents() async {
    try {
      final response = await _apiService.get('/api/incidents');
      final data = response.data;
      
      if (data != null && data['success'] == true && data['data'] != null) {
        final incidents = data['data'] as List;
        setState(() {
          _incidents = incidents.cast<Map<String, dynamic>>();
          _updateIncidentMarkers();
        });
      }
    } catch (e) {
      debugPrint('Error loading incidents: $e');
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
      debugPrint('Error loading traffic data: $e');
    }
  }

  void _setupWebSocketListeners() {
    _incidentSubscription = _wsService.incidentStream.listen((incident) {
      setState(() {
        _incidents.add(incident);
        _updateIncidentMarkers();
      });
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
      final type = (incident['incident_type'] ?? incident['type'])?.toString() ?? 'unknown';
      
      if (_selectedFilter != 'all' && type != _selectedFilter) continue;
      
      final lat = _parseDouble(incident['latitude'] ?? incident['location']?['latitude']);
      final lng = _parseDouble(incident['longitude'] ?? incident['location']?['longitude']);
      
      if (lat == null || lng == null) continue;
      
      final position = LatLng(lat, lng);
      final severity = incident['severity']?.toString().toLowerCase() ?? 'medium';
      final id = incident['id']?.toString() ?? DateTime.now().millisecondsSinceEpoch.toString();
      
      double hue;
      Color circleColor;
      switch (severity) {
        case 'critical':
        case 'high':
          hue = BitmapDescriptor.hueRed;
          circleColor = AppColors.error.withValues(alpha: 0.2);
          break;
        case 'medium':
          hue = BitmapDescriptor.hueOrange;
          circleColor = AppColors.warning.withValues(alpha: 0.2);
          break;
        default:
          hue = BitmapDescriptor.hueYellow;
          circleColor = AppColors.success.withValues(alpha: 0.2);
      }
      
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
      
      if (severity == 'high' || severity == 'critical') {
        incidentCircles.add(Circle(
          circleId: CircleId('incident_radius_$id'),
          center: position,
          radius: 500,
          fillColor: circleColor,
          strokeColor: circleColor.withValues(alpha: 0.5),
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
      
      Color color;
      if (density > 0.8) {
        color = AppColors.error.withValues(alpha: 0.4);
      } else if (density > 0.5) {
        color = AppColors.warning.withValues(alpha: 0.3);
      } else if (density > 0.3) {
        color = Colors.yellow.withValues(alpha: 0.2);
      } else {
        color = AppColors.success.withValues(alpha: 0.1);
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
        return 'Vehicle Accident';
      case 'congestion':
        return 'Traffic Congestion';
      case 'roadblock':
        return 'Road Block';
      case 'hazard':
        return 'Road Hazard';
      case 'emergency':
        return 'Emergency';
      default:
        return 'Incident';
    }
  }

  IconData _getIncidentIcon(String type) {
    switch (type.toLowerCase()) {
      case 'accident':
        return Icons.car_crash;
      case 'congestion':
        return Icons.traffic;
      case 'roadblock':
        return Icons.block;
      case 'hazard':
        return Icons.warning;
      case 'emergency':
        return Icons.emergency;
      default:
        return Icons.place;
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
        decoration: const BoxDecoration(
          color: AppColors.backgroundSecondary,
          borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
        ),
        padding: const EdgeInsets.all(24),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Handle
            Center(
              child: Container(
                width: 40,
                height: 4,
                decoration: BoxDecoration(
                  color: AppColors.border,
                  borderRadius: BorderRadius.circular(2),
                ),
              ),
            ),
            const SizedBox(height: 24),
            
            // Header
            Row(
              children: [
                Container(
                  padding: const EdgeInsets.all(14),
                  decoration: BoxDecoration(
                    color: _getSeverityColor(severity).withValues(alpha: 0.1),
                    borderRadius: BorderRadius.circular(14),
                  ),
                  child: Icon(
                    _getIncidentIcon(type),
                    color: _getSeverityColor(severity),
                    size: 28,
                  ),
                ),
                const SizedBox(width: 16),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        _getIncidentTitle(type),
                        style: AppTextStyles.titleMedium.copyWith(color: AppColors.textPrimary),
                      ),
                      const SizedBox(height: 4),
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                        decoration: BoxDecoration(
                          color: _getSeverityColor(severity).withValues(alpha: 0.1),
                          borderRadius: BorderRadius.circular(8),
                        ),
                        child: Text(
                          severity.toUpperCase(),
                          style: AppTextStyles.labelSmall.copyWith(
                            color: _getSeverityColor(severity),
                            fontWeight: FontWeight.w600,
                          ),
                        ),
                      ),
                    ],
                  ),
                ),
              ],
            ),
            const SizedBox(height: 20),
            
            // Description
            Container(
              padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(
                color: AppColors.background,
                borderRadius: BorderRadius.circular(14),
                border: Border.all(color: AppColors.border),
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    'Description',
                    style: AppTextStyles.labelMedium.copyWith(color: AppColors.textTertiary),
                  ),
                  const SizedBox(height: 6),
                  Text(
                    description,
                    style: AppTextStyles.bodyMedium.copyWith(color: AppColors.textSecondary),
                  ),
                  if (reportedAt != null) ...[
                    const SizedBox(height: 12),
                    Row(
                      children: [
                        Icon(Icons.access_time, size: 14, color: AppColors.textTertiary),
                        const SizedBox(width: 6),
                        Text(
                          'Reported ${_formatDateTime(reportedAt)}',
                          style: AppTextStyles.bodySmall.copyWith(color: AppColors.textTertiary),
                        ),
                      ],
                    ),
                  ],
                ],
              ),
            ),
            const SizedBox(height: 20),
            
            // Action buttons
            Row(
              children: [
                Expanded(
                  child: ElevatedButton.icon(
                    onPressed: () {
                      Navigator.pop(context);
                      _navigateToIncident(incident);
                    },
                    icon: const Icon(Icons.directions, size: 20),
                    label: const Text('Navigate'),
                    style: ElevatedButton.styleFrom(
                      backgroundColor: AppColors.primary,
                      foregroundColor: Colors.white,
                      padding: const EdgeInsets.symmetric(vertical: 14),
                      shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(12),
                      ),
                    ),
                  ),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: OutlinedButton.icon(
                    onPressed: () {
                      Navigator.pop(context);
                      _reportUpdate(incident);
                    },
                    icon: const Icon(Icons.update, size: 20),
                    label: const Text('Update'),
                    style: OutlinedButton.styleFrom(
                      foregroundColor: AppColors.textSecondary,
                      side: const BorderSide(color: AppColors.border),
                      padding: const EdgeInsets.symmetric(vertical: 14),
                      shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(12),
                      ),
                    ),
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

  Color _getSeverityColor(String severity) {
    switch (severity.toLowerCase()) {
      case 'critical':
        return Colors.purple;
      case 'high':
        return AppColors.error;
      case 'medium':
        return AppColors.warning;
      case 'low':
        return AppColors.success;
      default:
        return AppColors.textTertiary;
    }
  }

  String _formatDateTime(dynamic dateTime) {
    try {
      final dt = dateTime is DateTime ? dateTime : DateTime.parse(dateTime.toString());
      final now = DateTime.now();
      final diff = now.difference(dt);
      
      if (diff.inMinutes < 1) return 'just now';
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
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: const Text('Feature coming soon: Report incident update'),
        backgroundColor: AppColors.primary,
        behavior: SnackBarBehavior.floating,
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
      ),
    );
  }

  void _showIncidentNotification(Map<String, dynamic> incident) {
    final type = incident['type']?.toString() ?? 'incident';
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Row(
          children: [
            const Icon(Icons.warning_amber, color: Colors.white),
            const SizedBox(width: 8),
            Expanded(child: Text('New ${_getIncidentTitle(type)} reported nearby!')),
          ],
        ),
        backgroundColor: AppColors.warning,
        behavior: SnackBarBehavior.floating,
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
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

  void _showFilterSheet() {
    showModalBottomSheet(
      context: context,
      backgroundColor: Colors.transparent,
      builder: (context) => Container(
        decoration: const BoxDecoration(
          color: AppColors.backgroundSecondary,
          borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
        ),
        padding: const EdgeInsets.all(24),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Center(
              child: Container(
                width: 40,
                height: 4,
                decoration: BoxDecoration(
                  color: AppColors.border,
                  borderRadius: BorderRadius.circular(2),
                ),
              ),
            ),
            const SizedBox(height: 20),
            Text(
              'Filter Incidents',
              style: AppTextStyles.titleMedium.copyWith(color: AppColors.textPrimary),
            ),
            const SizedBox(height: 16),
            _buildFilterOption('all', 'All Incidents', Icons.layers),
            _buildFilterOption('accident', 'Accidents', Icons.car_crash),
            _buildFilterOption('congestion', 'Congestion', Icons.traffic),
            _buildFilterOption('roadblock', 'Road Blocks', Icons.block),
            _buildFilterOption('hazard', 'Hazards', Icons.warning),
            const SizedBox(height: 10),
          ],
        ),
      ),
    );
  }

  Widget _buildFilterOption(String value, String label, IconData icon) {
    final isSelected = _selectedFilter == value;
    return Material(
      color: isSelected ? AppColors.primary.withValues(alpha: 0.1) : Colors.transparent,
      borderRadius: BorderRadius.circular(12),
      child: InkWell(
        onTap: () {
          setState(() {
            _selectedFilter = value;
            _updateIncidentMarkers();
          });
          Navigator.pop(context);
        },
        borderRadius: BorderRadius.circular(12),
        child: Padding(
          padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 14),
          child: Row(
            children: [
              Icon(
                icon,
                color: isSelected ? AppColors.primary : AppColors.textSecondary,
                size: 22,
              ),
              const SizedBox(width: 14),
              Expanded(
                child: Text(
                  label,
                  style: AppTextStyles.bodyMedium.copyWith(
                    color: isSelected ? AppColors.primary : AppColors.textSecondary,
                    fontWeight: isSelected ? FontWeight.w600 : FontWeight.normal,
                  ),
                ),
              ),
              if (isSelected)
                const Icon(Icons.check_circle, color: AppColors.primary, size: 20),
            ],
          ),
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final isDark = appState.theme.isDarkMode;
    
    return Scaffold(
      backgroundColor: AppColors.background,
      appBar: AppBar(
        backgroundColor: AppColors.background,
        elevation: 0,
        leading: IconButton(
          icon: Container(
            padding: const EdgeInsets.all(8),
            decoration: BoxDecoration(
              color: AppColors.backgroundSecondary,
              borderRadius: BorderRadius.circular(10),
              border: Border.all(color: AppColors.border),
            ),
            child: const Icon(
              Icons.arrow_back,
              color: AppColors.textPrimary,
              size: 20,
            ),
          ),
          onPressed: () => Navigator.pop(context),
        ),
        title: Text(
          'Traffic Map',
          style: AppTextStyles.titleLarge.copyWith(color: AppColors.textPrimary),
        ),
        centerTitle: true,
        actions: [
          IconButton(
            icon: Container(
              padding: const EdgeInsets.all(8),
              decoration: BoxDecoration(
                color: _showTrafficLayer 
                    ? AppColors.primary.withValues(alpha: 0.1)
                    : AppColors.backgroundSecondary,
                borderRadius: BorderRadius.circular(10),
                border: Border.all(
                  color: _showTrafficLayer ? AppColors.primary : AppColors.border,
                ),
              ),
              child: Icon(
                Icons.layers,
                color: _showTrafficLayer ? AppColors.primary : AppColors.textSecondary,
                size: 20,
              ),
            ),
            onPressed: () => setState(() => _showTrafficLayer = !_showTrafficLayer),
          ),
          IconButton(
            icon: Container(
              padding: const EdgeInsets.all(8),
              decoration: BoxDecoration(
                color: AppColors.backgroundSecondary,
                borderRadius: BorderRadius.circular(10),
                border: Border.all(color: AppColors.border),
              ),
              child: const Icon(
                Icons.filter_list,
                color: AppColors.textPrimary,
                size: 20,
              ),
            ),
            onPressed: _showFilterSheet,
          ),
          const SizedBox(width: 8),
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
              if (isDark) _setDarkMapStyle(controller);
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
          ),
          
          // Loading overlay
          if (_isLoading)
            Container(
              color: AppColors.background.withValues(alpha: 0.8),
              child: Center(
                child: Container(
                  padding: const EdgeInsets.all(24),
                  decoration: BoxDecoration(
                    color: AppColors.backgroundSecondary,
                    borderRadius: BorderRadius.circular(16),
                    border: Border.all(color: AppColors.border),
                  ),
                  child: Column(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      const CircularProgressIndicator(color: AppColors.primary),
                      const SizedBox(height: 16),
                      Text(
                        'Loading map...',
                        style: AppTextStyles.bodyMedium.copyWith(color: AppColors.textSecondary),
                      ),
                    ],
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
              child: Container(
                padding: const EdgeInsets.all(14),
                decoration: BoxDecoration(
                  color: AppColors.error.withValues(alpha: 0.1),
                  borderRadius: BorderRadius.circular(14),
                  border: Border.all(color: AppColors.error.withValues(alpha: 0.3)),
                ),
                child: Row(
                  children: [
                    const Icon(Icons.error_outline, color: AppColors.error),
                    const SizedBox(width: 12),
                    Expanded(
                      child: Text(
                        _errorMessage!,
                        style: AppTextStyles.bodySmall.copyWith(color: AppColors.error),
                      ),
                    ),
                    IconButton(
                      icon: const Icon(Icons.close, color: AppColors.error, size: 20),
                      onPressed: () => setState(() => _errorMessage = null),
                    ),
                  ],
                ),
              ),
            ),
          
          // Legend
          Positioned(
            top: 16,
            right: 16,
            child: Container(
              padding: const EdgeInsets.all(12),
              decoration: BoxDecoration(
                color: AppColors.backgroundSecondary,
                borderRadius: BorderRadius.circular(14),
                border: Border.all(color: AppColors.border),
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                mainAxisSize: MainAxisSize.min,
                children: [
                  _buildLegendItem(AppColors.error, 'High Severity'),
                  const SizedBox(height: 6),
                  _buildLegendItem(AppColors.warning, 'Medium'),
                  const SizedBox(height: 6),
                  _buildLegendItem(AppColors.success, 'Low'),
                  const SizedBox(height: 8),
                  Container(height: 1, width: 80, color: AppColors.border),
                  const SizedBox(height: 8),
                  Text(
                    '${_incidents.length} incidents',
                    style: AppTextStyles.labelSmall.copyWith(color: AppColors.textTertiary),
                  ),
                ],
              ),
            ),
          ),
          
          // Quick action buttons
          Positioned(
            bottom: 100,
            right: 16,
            child: Column(
              children: [
                _buildMapFAB(
                  icon: Icons.map,
                  onPressed: _toggleMapType,
                  isActive: _mapType != MapType.normal,
                ),
                const SizedBox(height: 10),
                _buildMapFAB(
                  icon: Icons.warning,
                  onPressed: () {
                    setState(() {
                      _showIncidents = !_showIncidents;
                      _updateIncidentMarkers();
                    });
                  },
                  isActive: _showIncidents,
                ),
                const SizedBox(height: 10),
                _buildMapFAB(
                  icon: Icons.whatshot,
                  onPressed: () {
                    setState(() {
                      _showHeatmap = !_showHeatmap;
                      _updateTrafficOverlay();
                    });
                  },
                  isActive: _showHeatmap,
                ),
                const SizedBox(height: 10),
                _buildMapFAB(
                  icon: Icons.refresh,
                  onPressed: _initializeMap,
                  isActive: false,
                ),
              ],
            ),
          ),
        ],
      ),
      floatingActionButton: FloatingActionButton(
        onPressed: _centerOnCurrentLocation,
        backgroundColor: AppColors.primary,
        child: const Icon(Icons.my_location, color: Colors.white),
      ),
      floatingActionButtonLocation: FloatingActionButtonLocation.startFloat,
    );
  }

  Widget _buildMapFAB({
    required IconData icon,
    required VoidCallback onPressed,
    required bool isActive,
  }) {
    return Container(
      decoration: BoxDecoration(
        color: isActive ? AppColors.primary : AppColors.backgroundSecondary,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(
          color: isActive ? AppColors.primary : AppColors.border,
        ),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: 0.1),
            blurRadius: 8,
            offset: const Offset(0, 2),
          ),
        ],
      ),
      child: IconButton(
        icon: Icon(
          icon,
          color: isActive ? Colors.white : AppColors.textSecondary,
          size: 22,
        ),
        onPressed: onPressed,
      ),
    );
  }

  Widget _buildLegendItem(Color color, String label) {
    return Row(
      mainAxisSize: MainAxisSize.min,
      children: [
        Container(
          width: 12,
          height: 12,
          decoration: BoxDecoration(
            color: color,
            borderRadius: BorderRadius.circular(6),
          ),
        ),
        const SizedBox(width: 8),
        Text(
          label,
          style: AppTextStyles.labelSmall.copyWith(color: AppColors.textSecondary),
        ),
      ],
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
