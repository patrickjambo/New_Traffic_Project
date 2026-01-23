import 'dart:developer' as developer;
import 'package:dio/dio.dart';
import 'api_service.dart';
import 'websocket_service.dart';
import 'location_tracking_service.dart';

/// Deployment data model
class Deployment {
  final int id;
  final String unitName;
  final String? address;
  final double? latitude;
  final double? longitude;
  final String status;
  final String? priority;
  final String? instructions;
  final DateTime? scheduledTime;
  final int? estimatedDuration;
  final DateTime createdAt;
  final bool acknowledged;
  final DateTime? acknowledgedAt;
  final String? officerStatus;
  final String? officerNotes;
  final String? incidentType;
  final String? incidentSeverity;
  final String? incidentDescription;
  final String? emergencyType;
  final String? emergencySeverity;
  final String? emergencyDescription;

  Deployment({
    required this.id,
    required this.unitName,
    this.address,
    this.latitude,
    this.longitude,
    required this.status,
    this.priority,
    this.instructions,
    this.scheduledTime,
    this.estimatedDuration,
    required this.createdAt,
    this.acknowledged = false,
    this.acknowledgedAt,
    this.officerStatus,
    this.officerNotes,
    this.incidentType,
    this.incidentSeverity,
    this.incidentDescription,
    this.emergencyType,
    this.emergencySeverity,
    this.emergencyDescription,
  });

  factory Deployment.fromJson(Map<String, dynamic> json) {
    return Deployment(
      id: json['id'] ?? 0,
      unitName: json['unit_name'] ?? json['unitName'] ?? 'Unknown',
      address: json['address'],
      latitude: json['latitude'] != null ? double.tryParse(json['latitude'].toString()) : null,
      longitude: json['longitude'] != null ? double.tryParse(json['longitude'].toString()) : null,
      status: json['status'] ?? 'Pending',
      priority: json['priority'],
      instructions: json['instructions'],
      scheduledTime: json['scheduled_time'] != null 
          ? DateTime.tryParse(json['scheduled_time'].toString()) 
          : null,
      estimatedDuration: json['estimated_duration'],
      createdAt: json['created_at'] != null 
          ? DateTime.parse(json['created_at'].toString()) 
          : DateTime.now(),
      acknowledged: json['acknowledged'] ?? false,
      acknowledgedAt: json['acknowledged_at'] != null 
          ? DateTime.tryParse(json['acknowledged_at'].toString()) 
          : null,
      officerStatus: json['officer_status'],
      officerNotes: json['officer_notes'],
      incidentType: json['incident_type'],
      incidentSeverity: json['incident_severity'],
      incidentDescription: json['incident_description'],
      emergencyType: json['emergency_type'],
      emergencySeverity: json['emergency_severity'],
      emergencyDescription: json['emergency_description'],
    );
  }

  String get deploymentType {
    if (incidentType != null) return 'Incident';
    if (emergencyType != null) return 'Emergency';
    return 'Patrol';
  }

  String get typeDetails {
    if (incidentType != null) return incidentType!;
    if (emergencyType != null) return emergencyType!;
    return 'Regular Patrol';
  }

  String get severity {
    if (incidentSeverity != null) return incidentSeverity!;
    if (emergencySeverity != null) return emergencySeverity!;
    return 'Normal';
  }

  bool get needsAcknowledgment => !acknowledged && status != 'Completed' && status != 'Cancelled';
}

/// Deployment service for officer mobile app
class DeploymentService {
  static final DeploymentService _instance = DeploymentService._internal();
  factory DeploymentService() => _instance;
  DeploymentService._internal();

  final ApiService _apiService = ApiService();
  final WebSocketService _wsService = WebSocketService();
  final LocationTrackingService _locationService = LocationTrackingService();

  // Callbacks for real-time updates
  Function(Deployment)? onNewDeployment;
  Function(Deployment)? onDeploymentUpdated;
  Function(int)? onDeploymentCancelled;
  Function(int, String)? onDeploymentStatusChanged;

  /// Initialize service and set up WebSocket listeners
  Future<void> initialize() async {
    _setupWebSocketListeners();
    
    // Initialize location tracking
    await _locationService.initialize();
    
    developer.log('DeploymentService initialized with location tracking', name: 'Deployment');
  }

  /// Set up WebSocket event listeners
  void _setupWebSocketListeners() {
    // Listen for new deployment assignments
    _wsService.onDeploymentAssigned = (data) {
      developer.log('New deployment assigned: $data', name: 'Deployment');
      if (onNewDeployment != null) {
        final deployment = Deployment.fromJson(data);
        onNewDeployment!(deployment);
      }
    };

    // Listen for deployment updates
    _wsService.onDeploymentUpdated = (data) {
      developer.log('Deployment updated: $data', name: 'Deployment');
      if (onDeploymentUpdated != null) {
        final deployment = Deployment.fromJson(data);
        onDeploymentUpdated!(deployment);
      }
    };

    // Listen for deployment cancellations
    _wsService.onCustomEvent('deployment:cancelled', (data) {
      developer.log('Deployment cancelled: $data', name: 'Deployment');
      if (onDeploymentCancelled != null && data['deploymentId'] != null) {
        onDeploymentCancelled!(data['deploymentId']);
      }
    });

    // Listen for deployment status changes
    _wsService.onCustomEvent('deployment:status_changed', (data) {
      developer.log('Deployment status changed: $data', name: 'Deployment');
      if (onDeploymentStatusChanged != null && data['deploymentId'] != null) {
        onDeploymentStatusChanged!(data['deploymentId'], data['newStatus'] ?? 'Unknown');
      }
    });

    // Listen for removal from deployment
    _wsService.onCustomEvent('deployment:removed', (data) {
      developer.log('Removed from deployment: $data', name: 'Deployment');
      if (onDeploymentCancelled != null && data['deploymentId'] != null) {
        onDeploymentCancelled!(data['deploymentId']);
      }
    });
  }

  /// Get all deployments for current officer
  Future<List<Deployment>> getMyDeployments({String? status}) async {
    try {
      final queryParams = status != null ? {'status': status} : null;
      final response = await _apiService.get(
        '/api/deployments/my-deployments',
        queryParameters: queryParams,
      );

      if (response.data['success'] == true && response.data['data'] != null) {
        final List<dynamic> data = response.data['data'];
        return data.map((json) => Deployment.fromJson(json)).toList();
      }
      return [];
    } catch (e) {
      developer.log('Error fetching deployments: $e', name: 'Deployment');
      return [];
    }
  }

  /// Get active deployments (pending + active)
  Future<List<Deployment>> getActiveDeployments() async {
    return getMyDeployments(status: 'active');
  }

  /// Get pending deployments needing acknowledgment
  Future<List<Deployment>> getPendingDeployments() async {
    return getMyDeployments(status: 'pending');
  }

  /// Get completed deployments history
  Future<List<Deployment>> getCompletedDeployments() async {
    return getMyDeployments(status: 'completed');
  }

  /// Get single deployment by ID
  Future<Deployment?> getDeploymentById(int id) async {
    try {
      final response = await _apiService.get('/api/deployments/$id');

      if (response.data['success'] == true && response.data['data'] != null) {
        return Deployment.fromJson(response.data['data']);
      }
      return null;
    } catch (e) {
      developer.log('Error fetching deployment $id: $e', name: 'Deployment');
      return null;
    }
  }

  /// Acknowledge a deployment assignment (auto-includes location)
  Future<Map<String, dynamic>> acknowledgeDeployment(
    int deploymentId, {
    String? notes,
    DateTime? estimatedArrival,
  }) async {
    try {
      // Auto-get current location
      final location = await _locationService.getLocationForDeployment();
      
      final response = await _apiService.post(
        '/api/deployments/$deploymentId/acknowledge',
        data: {
          if (notes != null) 'notes': notes,
          if (estimatedArrival != null) 'estimatedArrival': estimatedArrival.toIso8601String(),
          if (location != null) 'latitude': location.latitude,
          if (location != null) 'longitude': location.longitude,
          if (location?.address != null) 'currentAddress': location!.address,
        },
      );

      if (response.data['success'] == true) {
        developer.log('Deployment $deploymentId acknowledged with location: ${location?.latitude}, ${location?.longitude}', name: 'Deployment');
        
        // Start tracking when acknowledging
        await _locationService.startTracking(streamIntervalSeconds: 30, streamToServer: true);
        
        return {
          'success': true,
          'message': response.data['message'] ?? 'Deployment acknowledged',
          'data': response.data['data'],
          'location': location?.toJson(),
        };
      }
      return {
        'success': false,
        'message': response.data['message'] ?? 'Failed to acknowledge deployment',
      };
    } on DioException catch (e) {
      developer.log('Error acknowledging deployment: ${e.message}', name: 'Deployment');
      return {
        'success': false,
        'message': e.response?.data?['message'] ?? 'Network error',
      };
    } catch (e) {
      developer.log('Error acknowledging deployment: $e', name: 'Deployment');
      return {
        'success': false,
        'message': 'Unknown error occurred',
      };
    }
  }

  /// Update officer's status for a deployment (auto-includes location)
  Future<Map<String, dynamic>> updateMyStatus(
    int deploymentId,
    String status, {
    String? notes,
    double? latitude,
    double? longitude,
  }) async {
    try {
      // Auto-get current location if not provided
      double? lat = latitude;
      double? lng = longitude;
      String? address;
      
      if (lat == null || lng == null) {
        final location = await _locationService.getCurrentLocation(geocode: true);
        if (location != null) {
          lat = location.latitude;
          lng = location.longitude;
          address = location.address;
        }
      }
      
      final response = await _apiService.put(
        '/api/deployments/$deploymentId/officer-status',
        data: {
          'status': status,
          if (notes != null) 'notes': notes,
          if (lat != null) 'latitude': lat,
          if (lng != null) 'longitude': lng,
          if (address != null) 'currentAddress': address,
        },
      );

      if (response.data['success'] == true) {
        developer.log('Status updated to $status with location: $lat, $lng', name: 'Deployment');
        
        // Stop tracking when completed
        if (status == 'completed' || status == 'unable') {
          await _locationService.stopTracking();
        } else if (status == 'en_route') {
          // High accuracy when en route
          await _locationService.setTrackingMode(highAccuracy: true, streamInterval: 15);
        } else if (status == 'on_scene') {
          // Lower frequency when on scene
          await _locationService.setTrackingMode(highAccuracy: false, streamInterval: 60);
        }
        
        return {
          'success': true,
          'message': response.data['message'] ?? 'Status updated',
          'data': response.data['data'],
          'location': {'latitude': lat, 'longitude': lng, 'address': address},
        };
      }
      return {
        'success': false,
        'message': response.data['message'] ?? 'Failed to update status',
      };
    } on DioException catch (e) {
      developer.log('Error updating status: ${e.message}', name: 'Deployment');
      return {
        'success': false,
        'message': e.response?.data?['message'] ?? 'Network error',
      };
    } catch (e) {
      developer.log('Error updating status: $e', name: 'Deployment');
      return {
        'success': false,
        'message': 'Unknown error occurred',
      };
    }
  }

  /// Mark as en route to deployment (auto-tracks location)
  Future<Map<String, dynamic>> markEnRoute(int deploymentId, {double? lat, double? lng}) async {
    return updateMyStatus(deploymentId, 'en_route', latitude: lat, longitude: lng);
  }

  /// Mark as arrived on scene (auto-tracks location)
  Future<Map<String, dynamic>> markOnScene(int deploymentId, {double? lat, double? lng}) async {
    return updateMyStatus(deploymentId, 'on_scene', latitude: lat, longitude: lng);
  }

  /// Mark deployment as completed (stops tracking)
  Future<Map<String, dynamic>> markCompleted(int deploymentId, {String? notes}) async {
    return updateMyStatus(deploymentId, 'completed', notes: notes);
  }

  /// Mark as unable to respond (stops tracking)
  Future<Map<String, dynamic>> markUnable(int deploymentId, String reason) async {
    return updateMyStatus(deploymentId, 'unable', notes: reason);
  }

  /// Get current location info
  LocationInfo? get currentLocation => _locationService.currentLocation;

  /// Check if officer is near deployment location
  bool isNearDeployment(Deployment deployment, {double thresholdMeters = 100}) {
    if (deployment.latitude == null || deployment.longitude == null) return false;
    return _locationService.isNearLocation(
      deployment.latitude!,
      deployment.longitude!,
      thresholdMeters: thresholdMeters,
    );
  }

  /// Get distance to deployment in meters
  double? getDistanceToDeployment(Deployment deployment) {
    if (deployment.latitude == null || deployment.longitude == null) return null;
    return _locationService.getDistanceTo(deployment.latitude!, deployment.longitude!);
  }

  /// Start location tracking manually
  Future<void> startLocationTracking({int intervalSeconds = 30}) async {
    await _locationService.startTracking(
      streamIntervalSeconds: intervalSeconds,
      streamToServer: true,
    );
  }

  /// Stop location tracking manually
  Future<void> stopLocationTracking() async {
    await _locationService.stopTracking();
  }

  /// Dispose of service
  void dispose() {
    _locationService.stopTracking();
    onNewDeployment = null;
    onDeploymentUpdated = null;
    onDeploymentCancelled = null;
    onDeploymentStatusChanged = null;
    developer.log('DeploymentService disposed', name: 'Deployment');
  }
}
