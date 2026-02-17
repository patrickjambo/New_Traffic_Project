import 'dart:async';
import 'dart:developer' as developer;
import 'dart:math' as math;
import 'package:location/location.dart';
import 'package:geocoding/geocoding.dart' as geocoding;
import 'websocket_service.dart';
import 'api_service.dart';

/// Location data with address
class LocationInfo {
  final double latitude;
  final double longitude;
  final double? accuracy;
  final double? altitude;
  final double? speed;
  final double? heading;
  final String? address;
  final DateTime timestamp;

  LocationInfo({
    required this.latitude,
    required this.longitude,
    this.accuracy,
    this.altitude,
    this.speed,
    this.heading,
    this.address,
    DateTime? timestamp,
  }) : timestamp = timestamp ?? DateTime.now();

  Map<String, dynamic> toJson() => {
    'latitude': latitude,
    'longitude': longitude,
    'accuracy': accuracy,
    'altitude': altitude,
    'speed': speed,
    'heading': heading,
    'address': address,
    'timestamp': timestamp.toIso8601String(),
  };

  @override
  String toString() => 'LocationInfo($latitude, $longitude, $address)';
}

/// Advanced location tracking service for police officers
/// Features:
/// - Real-time GPS tracking
/// - Automatic location streaming to backend
/// - Address geocoding
/// - Background location updates
/// - Battery-efficient tracking modes
class LocationTrackingService {
  static final LocationTrackingService _instance = LocationTrackingService._internal();
  factory LocationTrackingService() => _instance;
  LocationTrackingService._internal();

  final Location _location = Location();
  final WebSocketService _wsService = WebSocketService();
  final ApiService _apiService = ApiService();

  // Current location
  LocationInfo? _currentLocation;
  LocationInfo? get currentLocation => _currentLocation;

  // Tracking state
  bool _isTracking = false;
  bool get isTracking => _isTracking;
  
  bool _isInitialized = false;
  bool get isInitialized => _isInitialized;

  // Stream subscription
  StreamSubscription<LocationData>? _locationSubscription;
  Timer? _streamTimer;

  // Callbacks
  Function(LocationInfo)? onLocationChanged;
  Function(String)? onError;

  // Configuration
  int _streamIntervalSeconds = 30; // How often to send location to server
  double _minDistanceMeters = 10; // Minimum distance change to trigger update
  bool _highAccuracyMode = false;

  /// Initialize location service with permissions
  Future<bool> initialize() async {
    if (_isInitialized) return true;

    try {
      developer.log('Initializing location tracking service...', name: 'Location');

      // Check if location service is enabled
      bool serviceEnabled = await _location.serviceEnabled();
      if (!serviceEnabled) {
        serviceEnabled = await _location.requestService();
        if (!serviceEnabled) {
          developer.log('Location service not enabled', name: 'Location');
          onError?.call('Location service is disabled. Please enable GPS.');
          return false;
        }
      }

      // Check permissions
      PermissionStatus permission = await _location.hasPermission();
      if (permission == PermissionStatus.denied) {
        permission = await _location.requestPermission();
        if (permission == PermissionStatus.denied) {
          developer.log('Location permission denied', name: 'Location');
          onError?.call('Location permission denied. Please allow location access.');
          return false;
        }
      }

      if (permission == PermissionStatus.deniedForever) {
        developer.log('Location permission permanently denied', name: 'Location');
        onError?.call('Location permission permanently denied. Please enable in settings.');
        return false;
      }

      // Configure location settings
      await _location.changeSettings(
        accuracy: LocationAccuracy.high,
        interval: 5000, // 5 seconds
        distanceFilter: _minDistanceMeters,
      );

      // Get initial location
      await _getInitialLocation();

      _isInitialized = true;
      developer.log('Location tracking service initialized', name: 'Location');
      return true;
    } catch (e) {
      developer.log('Error initializing location: $e', name: 'Location');
      onError?.call('Failed to initialize location: $e');
      return false;
    }
  }

  /// Get initial location
  Future<void> _getInitialLocation() async {
    try {
      print('📍 Getting initial location...');
      final locationData = await _location.getLocation().timeout(
        const Duration(seconds: 10),
        onTimeout: () => throw TimeoutException('Location timeout'),
      );
      
      await _updateLocation(locationData);
      print('📍 Initial location obtained: ${_currentLocation?.latitude}, ${_currentLocation?.longitude}');
    } catch (e) {
      print('❌ Error getting initial location: $e');
    }
  }

  /// Update current location and optionally geocode address
  Future<void> _updateLocation(LocationData data, {bool geocode = true}) async {
    if (data.latitude == null || data.longitude == null) return;

    String? address;
    
    // Geocode address (don't block on it)
    if (geocode) {
      try {
        final placemarks = await geocoding.placemarkFromCoordinates(
          data.latitude!,
          data.longitude!,
        ).timeout(const Duration(seconds: 3));
        
        if (placemarks.isNotEmpty) {
          final place = placemarks.first;
          final parts = <String>[];
          if (place.street != null && place.street!.isNotEmpty) parts.add(place.street!);
          if (place.subLocality != null && place.subLocality!.isNotEmpty) parts.add(place.subLocality!);
          if (place.locality != null && place.locality!.isNotEmpty) parts.add(place.locality!);
          if (place.country != null && place.country!.isNotEmpty) parts.add(place.country!);
          address = parts.join(', ');
        }
      } catch (e) {
        // Geocoding failed, continue without address
        developer.log('Geocoding failed: $e', name: 'Location');
      }
    }

    _currentLocation = LocationInfo(
      latitude: data.latitude!,
      longitude: data.longitude!,
      accuracy: data.accuracy,
      altitude: data.altitude,
      speed: data.speed,
      heading: data.heading,
      address: address ?? _currentLocation?.address,
    );

    // Notify listeners
    onLocationChanged?.call(_currentLocation!);
  }

  /// Start continuous location tracking
  Future<void> startTracking({
    int streamIntervalSeconds = 30,
    bool highAccuracy = false,
    bool streamToServer = true,
  }) async {
    if (_isTracking) {
      developer.log('Already tracking', name: 'Location');
      return;
    }

    if (!_isInitialized) {
      final initialized = await initialize();
      if (!initialized) return;
    }

    _streamIntervalSeconds = streamIntervalSeconds;
    _highAccuracyMode = highAccuracy;

    try {
      // Update settings based on mode
      await _location.changeSettings(
        accuracy: highAccuracy ? LocationAccuracy.high : LocationAccuracy.balanced,
        interval: highAccuracy ? 3000 : 10000,
        distanceFilter: highAccuracy ? 5 : 20,
      );

      // Try to enable background mode (may fail if permission denied)
      try {
        await _location.enableBackgroundMode(enable: true);
        print('📍 Background location mode enabled');
      } catch (bgError) {
        print('⚠️ Background location denied, using foreground only: $bgError');
        // Continue with foreground-only tracking
      }

      // Start listening to location changes
      _locationSubscription = _location.onLocationChanged.listen(
        (LocationData data) async {
          await _updateLocation(data, geocode: false);
          // Send location update when we get a new position
          if (streamToServer && _currentLocation != null) {
            await _sendLocationToServer();
          }
        },
        onError: (e) {
          developer.log('Location stream error: $e', name: 'Location');
          onError?.call('Location update failed');
        },
      );

      // Start streaming to server if enabled
      if (streamToServer) {
        _startServerStreaming();
      }

      _isTracking = true;
      print('📍 Location tracking started (interval: ${_streamIntervalSeconds}s)');
      
      // Immediately send current location if we have one
      if (streamToServer && _currentLocation != null) {
        print('📍 Sending initial location immediately...');
        await _sendLocationToServer();
      } else {
        print('⚠️ No current location to send yet');
      }
    } catch (e) {
      print('❌ Error starting tracking: $e');
      
      // Even if tracking setup fails, try to send current location if we have one
      if (streamToServer && _currentLocation != null) {
        print('📍 Sending fallback location despite tracking error...');
        await _sendLocationToServer();
      }
      
      onError?.call('Failed to start tracking: $e');
    }
  }

  /// Start streaming location to server at regular intervals
  void _startServerStreaming() {
    _streamTimer?.cancel();
    _streamTimer = Timer.periodic(
      Duration(seconds: _streamIntervalSeconds),
      (_) => _sendLocationToServer(),
    );
  }

  /// Send current location to server
  Future<void> _sendLocationToServer() async {
    if (_currentLocation == null) {
      print('📍 Cannot send location - currentLocation is null');
      return;
    }

    final locationData = {
      'latitude': _currentLocation!.latitude,
      'longitude': _currentLocation!.longitude,
      'accuracy': _currentLocation!.accuracy,
      'speed': _currentLocation!.speed,
      'heading': _currentLocation!.heading,
      'address': _currentLocation!.address,
      'timestamp': _currentLocation!.timestamp.toIso8601String(),
    };

    try {
      // Try WebSocket first for real-time updates
      if (_wsService.isConnected) {
        print('📍 Sending location via WebSocket: ${_currentLocation!.latitude}, ${_currentLocation!.longitude}');
        _wsService.emit('officer:location_update', locationData);
        print('✅ Location sent via WebSocket');
      } else {
        // Fallback to HTTP API when WebSocket is disconnected
        print('📍 WebSocket disconnected, sending location via HTTP API');
        await _sendLocationViaHttp(locationData);
      }
    } catch (e) {
      print('❌ Error sending location: $e, trying HTTP fallback');
      // Try HTTP as fallback on any error
      try {
        await _sendLocationViaHttp(locationData);
      } catch (httpError) {
        developer.log('HTTP fallback also failed: $httpError', name: 'Location');
      }
    }
  }

  /// Send location via HTTP API (fallback for when WebSocket is disconnected)
  Future<void> _sendLocationViaHttp(Map<String, dynamic> locationData) async {
    try {
      final result = await _apiService.updateOfficerLocation(
        latitude: locationData['latitude'],
        longitude: locationData['longitude'],
        address: locationData['address'],
      );
      if (result['success'] == true) {
        developer.log('✅ Location sent via HTTP API', name: 'Location');
      } else {
        developer.log('❌ HTTP API location update failed: ${result['message']}', name: 'Location');
      }
    } catch (e) {
      developer.log('❌ HTTP API error: $e', name: 'Location');
      rethrow;
    }
  }

  /// Stop location tracking
  Future<void> stopTracking() async {
    if (!_isTracking) return;

    _locationSubscription?.cancel();
    _locationSubscription = null;
    
    _streamTimer?.cancel();
    _streamTimer = null;

    await _location.enableBackgroundMode(enable: false);

    _isTracking = false;
    developer.log('Location tracking stopped', name: 'Location');
  }

  /// Get current location (one-time)
  Future<LocationInfo?> getCurrentLocation({bool geocode = true}) async {
    if (!_isInitialized) {
      final initialized = await initialize();
      if (!initialized) return null;
    }

    try {
      final locationData = await _location.getLocation().timeout(
        const Duration(seconds: 10),
        onTimeout: () => throw TimeoutException('Location timeout'),
      );

      await _updateLocation(locationData, geocode: geocode);
      return _currentLocation;
    } catch (e) {
      developer.log('Error getting current location: $e', name: 'Location');
      onError?.call('Failed to get location');
      return _currentLocation; // Return cached location if available
    }
  }

  /// Update deployment with current location (for acknowledging, status updates, etc.)
  Future<LocationInfo?> getLocationForDeployment() async {
    // Get fresh location with geocoding
    return getCurrentLocation(geocode: true);
  }

  /// Set tracking mode
  Future<void> setTrackingMode({
    required bool highAccuracy,
    int? streamInterval,
  }) async {
    _highAccuracyMode = highAccuracy;
    if (streamInterval != null) {
      _streamIntervalSeconds = streamInterval;
    }

    if (_isTracking) {
      await _location.changeSettings(
        accuracy: highAccuracy ? LocationAccuracy.high : LocationAccuracy.balanced,
        interval: highAccuracy ? 3000 : 10000,
        distanceFilter: highAccuracy ? 5 : 20,
      );

      // Restart streaming timer with new interval
      if (_streamTimer != null) {
        _startServerStreaming();
      }
    }

    developer.log('Tracking mode updated: highAccuracy=$highAccuracy, interval=$_streamIntervalSeconds', name: 'Location');
  }

  /// Get distance to a target location (in meters)
  double? getDistanceTo(double targetLat, double targetLng) {
    if (_currentLocation == null) return null;

    // Haversine formula
    const earthRadius = 6371000.0; // meters
    
    final lat1 = _currentLocation!.latitude * 0.0174533; // Convert to radians
    final lat2 = targetLat * 0.0174533;
    final dLat = (targetLat - _currentLocation!.latitude) * 0.0174533;
    final dLng = (targetLng - _currentLocation!.longitude) * 0.0174533;

    final a = (math.sin(dLat / 2) * math.sin(dLat / 2)) +
        math.cos(lat1) * math.cos(lat2) * (math.sin(dLng / 2) * math.sin(dLng / 2));
    final c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a));

    return earthRadius * c;
  }

  /// Check if officer is near deployment location
  bool isNearLocation(double targetLat, double targetLng, {double thresholdMeters = 100}) {
    final distance = getDistanceTo(targetLat, targetLng);
    return distance != null && distance <= thresholdMeters;
  }

  /// Dispose service
  void dispose() {
    stopTracking();
    _isInitialized = false;
    developer.log('Location tracking service disposed', name: 'Location');
  }
}
