import 'dart:async';
import 'package:flutter/material.dart';
import 'package:socket_io_client/socket_io_client.dart' as IO;
import '../config/app_config.dart';
import 'notification_service.dart';
import 'emergency_alert_service.dart';
import 'deployment_alert_service.dart';
import 'navigation_service.dart';
import '../main.dart' show navigatorKey;

/// Real-time WebSocket service for instant updates
/// Connects to backend Socket.IO server and handles all event types
class WebSocketService {
  static final WebSocketService _instance = WebSocketService._internal();
  factory WebSocketService() => _instance;
  WebSocketService._internal();

  IO.Socket? _socket;
  final NotificationService _notificationService = NotificationService();
  bool _isConnected = false;
  bool _isConnecting = false;
  int _reconnectAttempts = 0;
  static const int _maxReconnectAttempts = 10;
  static const int _initialReconnectDelay = 1000; // ms
  
  // Pending user info for room joining after connection
  String? _pendingUserId;
  String? _pendingUserRole;
  
  // Track shown emergencies to prevent duplicates
  final Set<String> _shownEmergencyIds = {};
  final Set<String> _acceptedEmergencyIds = {};
  
  // Stream controllers for reactive updates
  final _incidentStreamController = StreamController<Map<String, dynamic>>.broadcast();
  final _emergencyStreamController = StreamController<Map<String, dynamic>>.broadcast();
  final _notificationStreamController = StreamController<Map<String, dynamic>>.broadcast();
  final _connectionStatusController = StreamController<bool>.broadcast();
  final _deploymentStreamController = StreamController<Map<String, dynamic>>.broadcast();

  // Public streams for UI consumption
  Stream<Map<String, dynamic>> get incidentStream => _incidentStreamController.stream;
  Stream<Map<String, dynamic>> get emergencyStream => _emergencyStreamController.stream;
  Stream<Map<String, dynamic>> get notificationStream => _notificationStreamController.stream;
  Stream<bool> get connectionStatusStream => _connectionStatusController.stream;
  Stream<Map<String, dynamic>> get deploymentStream => _deploymentStreamController.stream;

  // Deployment callbacks for DeploymentService
  Function(Map<String, dynamic>)? onDeploymentAssigned;
  Function(Map<String, dynamic>)? onDeploymentUpdated;
  final Map<String, Function(Map<String, dynamic>)> _customEventHandlers = {};

  bool get isConnected => _isConnected;
  
  // Method to mark emergency as accepted (clears from shown set)
  void markEmergencyAccepted(dynamic emergencyId) {
    final id = emergencyId?.toString() ?? '';
    if (id.isNotEmpty) {
      _acceptedEmergencyIds.add(id);
      print('[OK] Marked emergency $id as accepted');
    }
  }
  
  // Clear old emergency IDs (call periodically or on new session)
  void clearOldEmergencies() {
    _shownEmergencyIds.clear();
    _acceptedEmergencyIds.clear();
    print('🧹 Cleared emergency tracking sets');
  }
  /// Initialize WebSocket connection with auto-reconnect
  void connect({String? userId, String? userRole}) {
    try {
      // If already connected and we have userId, just join the rooms
      if (_socket != null && _socket!.connected) {
        if (userId != null) {
          _joinRooms(userId, userRole);
        }
        return; // Already connected
      }

      if (_isConnecting) {
        return; // Connection attempt already in progress
      }

      _isConnecting = true;
      
      // Store userId/userRole for use after connection
      _pendingUserId = userId;
      _pendingUserRole = userRole;

      _socket = IO.io(
        AppConfig.baseUrl,
        IO.OptionBuilder()
            .setTransports(['websocket', 'polling'])
            .disableAutoConnect()
            .enableReconnection()
            .setReconnectionDelay(_initialReconnectDelay)
            .setReconnectionDelayMax(30000)
            .setReconnectionAttempts(_maxReconnectAttempts)
            .build(),
      );

      _socket!.connect();

      // Connection established
      _socket!.onConnect((_) {
        print('[OK] WebSocket connected');
        _isConnected = true;
        _isConnecting = false;
        _reconnectAttempts = 0;
        _connectionStatusController.add(true);
        
        // Join rooms with pending or passed user info
        final effectiveUserId = _pendingUserId ?? userId;
        final effectiveUserRole = _pendingUserRole ?? userRole;
        
        if (effectiveUserId != null || effectiveUserRole != null) {
          _joinRooms(effectiveUserId, effectiveUserRole);
        }
      });

      // Connection lost
      _socket!.onDisconnect((_) {
        print('[ERROR] WebSocket disconnected');
        _isConnected = false;
        _isConnecting = false;
        _connectionStatusController.add(false);
      });

      // Connection error
      _socket!.onConnectError((error) {
        print('[WARN] WebSocket connection error: ${error.toString().substring(0, 50.clamp(0, error.toString().length))}');
        _isConnected = false;
        _isConnecting = false;
        _connectionStatusController.add(false);
      });

      // Reconnection attempt
      _socket!.on('reconnect_attempt', (data) {
        _reconnectAttempts++;
        print('[UPDATE] Reconnection attempt $_reconnectAttempts/$_maxReconnectAttempts');
      });

      // Setup event listeners
      _setupEventListeners();

    } catch (e) {
      print('[ERROR] Failed to initialize WebSocket: $e');
      _isConnected = false;
      _isConnecting = false;
    }
  }

  /// Join user and role rooms for targeted notifications
  void _joinRooms(String? userId, String? userRole) {
    if (_socket == null || !_socket!.connected) {
      print('[WARN] Socket not connected, will retry joining rooms...');
      // Retry after a short delay
      Future.delayed(const Duration(seconds: 2), () {
        if (_socket != null && _socket!.connected) {
          _joinRooms(userId, userRole);
        }
      });
      return;
    }
    
    // Join role-based room
    _socket!.emit('join:role', {
      'role': userRole ?? 'public',
      'userId': userId,
    });
    print('[OK] Joined role room: ${userRole ?? 'public'} (userId: $userId)');
    
    // Join user-specific room for targeted notifications (deployments, etc.)
    if (userId != null) {
      _socket!.emit('join:user', {
        'userId': userId,
      });
      print('[OK] Joined user room: user:$userId');
      
      // Store for reconnection
      _pendingUserId = userId;
      _pendingUserRole = userRole;
    }
  }

  /// Public method to manually join rooms (call after login)
  void joinRooms({required String userId, required String userRole}) {
    print('[SOCKET] Manual room join requested for userId: $userId, role: $userRole');
    _pendingUserId = userId;
    _pendingUserRole = userRole;
    _joinRooms(userId, userRole);
  }

  /// Setup listeners for all server events
  void _setupEventListeners() {
    if (_socket == null) return;

    // ============================================
    // INCIDENT EVENTS
    // ============================================
    
    _socket!.on('incident:new', (data) {
      print('[WS] New incident received: $data');
      _handleIncidentNew(data);
    });

    _socket!.on('incident:update', (data) {
      print('[WS] Incident update received: $data');
      _handleIncidentUpdate(data);
    });

    _socket!.on('incident:alert', (data) {
      print('[ALERT] Incident alert received: $data');
      _handleIncidentAlert(data);
    });

    _socket!.on('incident:response', (data) {
      print('[POLICE] Officer responded to incident: $data');
      _handleIncidentResponse(data);
    });

    // ============================================
    // EMERGENCY EVENTS
    // ============================================

    _socket!.on('emergency:new', (data) {
      print('[SOS] New emergency received: $data');
      _handleEmergencyNew(data);
    });

    _socket!.on('emergency:update', (data) {
      print('[WS] Emergency update received: $data');
      _handleEmergencyUpdate(data);
    });

    _socket!.on('emergency:alert', (data) {
      print('[ALERT] Emergency alert received: $data');
      _handleEmergencyAlert(data);
    });

    _socket!.on('emergency:nearby', (data) {
      print('[LOC] Nearby emergency received: $data');
      _handleNearbyEmergency(data);
    });

    // ============================================
    // EMERGENCY ALARM (GEO-FENCED CRITICAL ALERTS)
    // ============================================

    _socket!.on('emergency:alarm', (data) {
      print('[ALERT][ALERT][ALERT] EMERGENCY ALARM RECEIVED: $data');
      _handleEmergencyAlarm(data);
    });

    // ============================================
    // NOTIFICATION EVENTS
    // ============================================

    _socket!.on('notification:new', (data) {
      print('[NOTIFY] New notification received: $data');
      _handleNewNotification(data);
    });

    // ============================================
    // ANALYSIS EVENTS
    // ============================================

    _socket!.on('analysis:complete', (data) {
      print('[AI] Analysis complete received: $data');
      _handleAnalysisComplete(data);
    });

    // ============================================
    // DEPLOYMENT EVENTS (Police Officers)
    // ============================================

    _socket!.on('deployment:new', (data) {
      print('[OFFICER] New deployment received: $data');
      _handleDeploymentNew(data);
    });

    _socket!.on('deployment:update', (data) {
      print('[UPDATE] Deployment update received: $data');
      _handleDeploymentUpdate(data);
    });

    _socket!.on('deployment:assigned', (data) {
      print('[LOC] Deployment assigned to me: $data');
      _handleDeploymentAssigned(data);
    });

    _socket!.on('deployment:cancelled', (data) {
      print('[ERROR] Deployment cancelled: $data');
      _handleCustomEvent('deployment:cancelled', data);
    });

    _socket!.on('deployment:acknowledged', (data) {
      print('[OK] Deployment acknowledged: $data');
      _handleDeploymentUpdate(data); // Reuse update handler
    });

    _socket!.on('deployment:status_changed', (data) {
      print('[UPDATE] Deployment status changed: $data');
      _handleDeploymentUpdate(data); // Also trigger update handler
      _handleCustomEvent('deployment:status_changed', data);
    });

    _socket!.on('deployment:removed', (data) {
      print('[WARN] Removed from deployment: $data');
      _handleCustomEvent('deployment:removed', data);
    });

    _socket!.on('officer:assigned', (data) {
      print('[OFFICER] Officer assigned: $data');
      _handleOfficerAssigned(data);
    });

    // ============================================
    // HEARTBEAT
    // ============================================

    _socket!.on('pong', (data) {
      // Heartbeat response received
    });

    // Start heartbeat
    _startHeartbeat();
  }

  // ============================================
  // EVENT HANDLERS
  // ============================================

  void _handleIncidentNew(dynamic data) {
    try {
      final incidentData = _parseData(data);
      _incidentStreamController.add({
        'type': 'new',
        'data': incidentData,
      });

      // Show local notification
      _notificationService.addNotification(
        title: 'New Traffic Incident',
        message: 'A new ${incidentData['type'] ?? 'incident'} has been reported.',
        type: 'incident',
      );
    } catch (e) {
      print('Error handling incident:new: $e');
    }
  }

  void _handleIncidentUpdate(dynamic data) {
    try {
      final updateData = _parseData(data);
      _incidentStreamController.add({
        'type': 'update',
        'data': updateData,
      });

      _notificationService.addNotification(
        title: 'Incident Updated',
        message: 'Incident #${updateData['id']} status: ${updateData['status']}',
        type: 'incident_update',
      );
    } catch (e) {
      print('Error handling incident:update: $e');
    }
  }

  void _handleIncidentAlert(dynamic data) {
    try {
      final alertData = _parseData(data);
      _incidentStreamController.add({
        'type': 'alert',
        'data': alertData,
      });

      // High priority notification
      _notificationService.addNotification(
        title: '[ALERT] High Priority Incident',
        message: '${alertData['type'] ?? 'Incident'} - ${alertData['severity'] ?? 'Unknown'} severity',
        type: 'critical',
      );
    } catch (e) {
      print('Error handling incident:alert: $e');
    }
  }

  void _handleIncidentResponse(dynamic data) {
    try {
      final responseData = _parseData(data);
      final incidentId = responseData['incidentId'];
      final action = responseData['action'];
      final officerName = responseData['officerName'] ?? 'An officer';
      
      print('[POLICE] Incident $incidentId: $officerName is $action');
      
      _incidentStreamController.add({
        'type': 'response',
        'data': responseData,
      });

      // Show notification that another officer is responding
      if (action == 'responding') {
        _notificationService.addNotification(
          title: '[POLICE] Officer Responding',
          message: '$officerName is responding to incident #$incidentId',
          type: 'info',
        );
      } else if (action == 'resolved') {
        _notificationService.addNotification(
          title: '[OK] Incident Resolved',
          message: 'Incident #$incidentId resolved by $officerName',
          type: 'success',
        );
      }
    } catch (e) {
      print('Error handling incident:response: $e');
    }
  }

  void _handleEmergencyNew(dynamic data) {
    try {
      final emergencyData = _parseData(data);
      print('[ALERT] PROCESSING NEW EMERGENCY: $emergencyData');
      
      _emergencyStreamController.add({
        'type': 'new',
        'data': emergencyData,
      });

      // Check severity - trigger full alarm for critical/high
      final severity = emergencyData['severity']?.toString().toLowerCase() ?? '';
      if (severity == 'critical' || severity == 'high') {
        final alertPayload = {
          'title': 'NEW EMERGENCY',
          'message': emergencyData['description'] ?? 'Emergency reported - Response needed!',
          'severity': severity,
          'type': emergencyData['emergency_type'] ?? emergencyData['type'] ?? 'emergency',
          'location': emergencyData['location_name'] ?? emergencyData['location']?['name'] ?? 'Unknown location',
          'latitude': emergencyData['latitude'],
          'longitude': emergencyData['longitude'],
          ...emergencyData,
        };
        
        // CRITICAL: Trigger alarm FIRST (real-time)
        final emergencyService = EmergencyAlertService();
        emergencyService.showEmergencyAlert(alertPayload);

        // Navigate to emergency alert screen IMMEDIATELY
        if (navigatorKey.currentState != null) {
          navigatorKey.currentState!.pushNamed(
            '/emergency-alert',
            arguments: alertPayload,
          );
        }
      }

      _notificationService.addNotification(
        title: 'Emergency Report',
        message: '${emergencyData['type'] ?? 'Emergency'} reported at ${emergencyData['location']?['name'] ?? emergencyData['location_name'] ?? 'unknown location'}',
        type: 'emergency',
      );
    } catch (e) {
      print('Error handling emergency:new: $e');
    }
  }

  void _handleEmergencyUpdate(dynamic data) {
    try {
      final updateData = _parseData(data);
      _emergencyStreamController.add({
        'type': 'update',
        'data': updateData,
      });
    } catch (e) {
      print('Error handling emergency:update: $e');
    }
  }

  void _handleEmergencyAlert(dynamic data) {
    try {
      final alertData = _parseData(data);
      final emergencyId = (alertData['emergencyId'] ?? alertData['alertId'] ?? alertData['id'])?.toString() ?? '';
      
      print('[ALERT] EMERGENCY ALERT received - ID: $emergencyId');
      
      // Check for duplicate - skip if already shown or accepted
      if (emergencyId.isNotEmpty) {
        if (_shownEmergencyIds.contains(emergencyId)) {
          print('[WARN] Skipping duplicate emergency alert: $emergencyId');
          return;
        }
        if (_acceptedEmergencyIds.contains(emergencyId)) {
          print('[WARN] Skipping already accepted emergency: $emergencyId');
          return;
        }
        _shownEmergencyIds.add(emergencyId);
      }
      
      print('[ALERT] PROCESSING EMERGENCY ALERT: $alertData');
      
      final alertPayload = {
        'title': alertData['title'] ?? 'EMERGENCY ALERT',
        'message': alertData['message'] ?? alertData['description'] ?? 'Immediate response required!',
        'severity': alertData['severity'] ?? 'critical',
        'type': alertData['emergency_type'] ?? alertData['type'] ?? 'emergency',
        'location': alertData['location_name'] ?? alertData['locationName'] ?? 'Unknown location',
        'latitude': alertData['latitude'],
        'longitude': alertData['longitude'],
        'emergencyId': emergencyId,
        ...alertData,
      };
      
      // CRITICAL: Trigger alarm FIRST (real-time)
      final emergencyService = EmergencyAlertService();
      emergencyService.showEmergencyAlert(alertPayload);

      // Navigate to emergency alert screen IMMEDIATELY
      if (navigatorKey.currentState != null) {
        navigatorKey.currentState!.pushNamed(
          '/emergency-alert',
          arguments: alertPayload,
        );
      }
      
      // Stream update (can be delayed)
      _emergencyStreamController.add({
        'type': 'alert',
        'data': alertPayload,
      });

      _notificationService.addNotification(
        title: 'CRITICAL EMERGENCY',
        message: alertData['message'] ?? 'Immediate attention required!',
        type: 'critical',
      );
    } catch (e) {
      print('Error handling emergency:alert: $e');
    }
  }

  void _handleNearbyEmergency(dynamic data) {
    try {
      final nearbyData = _parseData(data);
      _emergencyStreamController.add({
        'type': 'nearby',
        'data': nearbyData,
      });

      _notificationService.addNotification(
        title: '[LOC] Emergency Nearby',
        message: 'An emergency has been reported in your area.',
        type: 'nearby_alert',
      );
    } catch (e) {
      print('Error handling emergency:nearby: $e');
    }
  }

  // Stream controller for emergency alarms (full-screen alerts)
  final _emergencyAlarmController = StreamController<Map<String, dynamic>>.broadcast();
  Stream<Map<String, dynamic>> get emergencyAlarmStream => _emergencyAlarmController.stream;

  void _handleEmergencyAlarm(dynamic data) {
    try {
      final alarmData = _parseData(data);
      final emergencyId = (alarmData['emergencyId'] ?? alarmData['alertId'] ?? alarmData['id'])?.toString() ?? '';
      
      print('[ALERT] EMERGENCY ALARM received - ID: $emergencyId');
      
      // Check for duplicate - skip if already shown or accepted
      if (emergencyId.isNotEmpty) {
        if (_shownEmergencyIds.contains(emergencyId)) {
          print('[WARN] Skipping duplicate emergency alarm: $emergencyId');
          return;
        }
        if (_acceptedEmergencyIds.contains(emergencyId)) {
          print('[WARN] Skipping already accepted emergency: $emergencyId');
          return;
        }
        _shownEmergencyIds.add(emergencyId);
      }
      
      print('[ALERT] PROCESSING EMERGENCY ALARM: $alarmData');
      
      final alertPayload = {...alarmData, 'emergencyId': emergencyId};
      
      // CRITICAL: Trigger alarm FIRST before anything else (real-time response)
      final emergencyService = EmergencyAlertService();
      emergencyService.showEmergencyAlert(alertPayload);
      
      // Navigate to emergency alert screen IMMEDIATELY
      if (navigatorKey.currentState != null) {
        navigatorKey.currentState!.pushNamed(
          '/emergency-alert',
          arguments: alertPayload,
        );
      }
      
      // Emit to streams (can be slightly delayed)
      _emergencyAlarmController.add(alertPayload);
      _emergencyStreamController.add({
        'type': 'alarm',
        'data': alertPayload,
      });

      // Notification (lowest priority - already have alarm)
      _notificationService.addNotification(
        title: alarmData['title'] ?? 'EMERGENCY ALERT',
        message: alarmData['message'] ?? 'Immediate response required!',
        type: 'critical',
      );
    } catch (e) {
      print('Error handling emergency:alarm: $e');
    }
  }

  void _handleNewNotification(dynamic data) {
    try {
      final notificationData = _parseData(data);
      _notificationStreamController.add(notificationData);

      _notificationService.addNotification(
        title: notificationData['title'] ?? 'Notification',
        message: notificationData['message'] ?? '',
        type: notificationData['type'] ?? 'general',
      );
    } catch (e) {
      print('Error handling notification:new: $e');
    }
  }

  void _handleAnalysisComplete(dynamic data) {
    try {
      final analysisData = _parseData(data);
      
      if (analysisData['incidentDetected'] == true) {
        _notificationService.addNotification(
          title: '[AI] AI Detection',
          message: 'AI detected ${analysisData['detectedType'] ?? 'an incident'} with ${((analysisData['confidence'] ?? 0) * 100).toInt()}% confidence',
          type: 'ai_detection',
        );
      }
    } catch (e) {
      print('Error handling analysis:complete: $e');
    }
  }

  // ============================================
  // DEPLOYMENT EVENT HANDLERS
  // ============================================

  void _handleDeploymentNew(dynamic data) {
    try {
      final deploymentData = _parseData(data);
      _notificationService.addNotification(
        title: '[OFFICER] New Deployment',
        message: 'Officer ${deploymentData['officerName'] ?? 'unknown'} deployed to ${deploymentData['type'] ?? 'incident'}',
        type: 'deployment',
      );
    } catch (e) {
      print('Error handling deployment:new: $e');
    }
  }

  void _handleDeploymentUpdate(dynamic data) {
    try {
      final updateData = _parseData(data);
      
      // Emit to stream for UI updates
      _deploymentStreamController.add({
        'type': 'update',
        'data': updateData,
      });
      
      // Call callback if set (for DeploymentService)
      if (onDeploymentUpdated != null) {
        onDeploymentUpdated!(updateData);
      }
      
      _notificationService.addNotification(
        title: '[UPDATE] Deployment Update',
        message: 'Deployment status changed to: ${updateData['status'] ?? 'unknown'}',
        type: 'deployment_update',
      );
    } catch (e) {
      print('Error handling deployment:update: $e');
    }
  }

  void _handleDeploymentAssigned(dynamic data) {
    try {
      final assignmentData = _parseData(data);
      
      print('📋 DEPLOYMENT ASSIGNED: $assignmentData');
      
      // Emit to stream for UI updates
      _deploymentStreamController.add({
        'type': 'assigned',
        'data': assignmentData,
      });
      
      // Call callback if set (for DeploymentService)
      if (onDeploymentAssigned != null) {
        onDeploymentAssigned!(assignmentData);
      }
      
      // [NOTIFY] TRIGGER DEPLOYMENT ALERT with sound & vibration
      final deploymentAlertService = DeploymentAlertService();
      final priority = assignmentData['priority']?.toString().toLowerCase() ?? 'normal';
      
      if (priority == 'high' || priority == 'urgent' || priority == 'critical') {
        // High priority - stronger alert
        deploymentAlertService.showUrgentDeploymentAlert(assignmentData);
      } else {
        // Normal priority
        deploymentAlertService.showDeploymentAlert(assignmentData);
      }
      
      // Also add to notification list
      _notificationService.addNotification(
        title: '� NEW DEPLOYMENT',
        message: 'You have been assigned to ${assignmentData['unit_name'] ?? assignmentData['unitName'] ?? 'a deployment'} at ${assignmentData['address'] ?? 'assigned location'}. Tap to acknowledge.',
        type: 'deployment',
      );
    } catch (e) {
      print('Error handling deployment:assigned: $e');
    }
  }

  void _handleOfficerAssigned(dynamic data) {
    try {
      final assignmentData = _parseData(data);
      _notificationService.addNotification(
        title: '[OFFICER] Officer Assigned',
        message: '${assignmentData['officerName'] ?? 'Officer'} assigned to ${assignmentData['incidentType'] ?? 'incident'}',
        type: 'officer_assignment',
      );
    } catch (e) {
      print('Error handling officer:assigned: $e');
    }
  }

  /// Handle custom event by calling registered callback
  void _handleCustomEvent(String eventName, dynamic data) {
    try {
      final parsedData = _parseData(data);
      final callback = _customEventHandlers[eventName];
      if (callback != null) {
        callback(parsedData);
      }
    } catch (e) {
      print('Error handling custom event $eventName: $e');
    }
  }

  // ============================================
  // UTILITY METHODS
  // ============================================

  Map<String, dynamic> _parseData(dynamic data) {
    if (data is Map<String, dynamic>) {
      return data;
    } else if (data is Map) {
      return Map<String, dynamic>.from(data);
    }
    return {'raw': data};
  }

  Timer? _heartbeatTimer;
  
  void _startHeartbeat() {
    _heartbeatTimer?.cancel();
    _heartbeatTimer = Timer.periodic(const Duration(seconds: 25), (timer) {
      if (_socket != null && _socket!.connected) {
        _socket!.emit('ping');
      }
    });
  }

  /// Join a location-based room
  void joinLocation(double latitude, double longitude) {
    if (_socket != null && _socket!.connected) {
      _socket!.emit('join:location', {
        'latitude': latitude,
        'longitude': longitude,
      });
    }
  }

  /// Listen to a custom WebSocket event
  void onCustomEvent(String eventName, Function(Map<String, dynamic>) handler) {
    _customEventHandlers[eventName] = handler;
    
    if (_socket != null) {
      _socket!.on(eventName, (data) {
        try {
          final parsedData = _parseData(data);
          handler(parsedData);
        } catch (e) {
          print('Error handling custom event $eventName: $e');
        }
      });
    }
  }

  /// Remove custom event listener
  void offCustomEvent(String eventName) {
    _customEventHandlers.remove(eventName);
    if (_socket != null) {
      _socket!.off(eventName);
    }
  }

  /// Emit an event to the server
  void emit(String event, [dynamic data]) {
    if (_socket != null && _socket!.connected) {
      _socket!.emit(event, data);
      print('📤 WebSocket emit: $event');
    } else {
      print('[WARN] WebSocket emit failed - not connected: $event');
    }
  }

  /// Disconnect WebSocket
  void disconnect() {
    _heartbeatTimer?.cancel();
    if (_socket != null) {
      _socket!.disconnect();
      _socket = null;
      _isConnected = false;
      _connectionStatusController.add(false);
    }
  }

  /// Reconnect WebSocket
  void reconnect({String? userId, String? userRole}) {
    disconnect();
    connect(userId: userId, userRole: userRole);
  }

  /// Dispose all resources
  void dispose() {
    disconnect();
    _incidentStreamController.close();
    _emergencyStreamController.close();
    _notificationStreamController.close();
    _connectionStatusController.close();
    _deploymentStreamController.close();
    _customEventHandlers.clear();
    onDeploymentAssigned = null;
    onDeploymentUpdated = null;
  }
}
