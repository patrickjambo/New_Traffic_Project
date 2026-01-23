import 'dart:async';
import 'package:flutter/material.dart';
import 'package:socket_io_client/socket_io_client.dart' as IO;
import '../config/app_config.dart';
import 'notification_service.dart';
import 'emergency_alert_service.dart';
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

  /// Initialize WebSocket connection with auto-reconnect
  void connect({String? userId, String? userRole}) {
    try {
      if (_socket != null && _socket!.connected) {
        return; // Already connected
      }

      if (_isConnecting) {
        return; // Connection attempt already in progress
      }

      _isConnecting = true;

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
        print('✅ WebSocket connected');
        _isConnected = true;
        _isConnecting = false;
        _reconnectAttempts = 0;
        _connectionStatusController.add(true);
        
        // Join role-based room
        if (userId != null || userRole != null) {
          _socket!.emit('join:role', {
            'role': userRole ?? 'public',
            'userId': userId,
          });
        }
      });

      // Connection lost
      _socket!.onDisconnect((_) {
        print('❌ WebSocket disconnected');
        _isConnected = false;
        _isConnecting = false;
        _connectionStatusController.add(false);
      });

      // Connection error
      _socket!.onConnectError((error) {
        print('⚠️ WebSocket connection error: ${error.toString().substring(0, 50.clamp(0, error.toString().length))}');
        _isConnected = false;
        _isConnecting = false;
        _connectionStatusController.add(false);
      });

      // Reconnection attempt
      _socket!.on('reconnect_attempt', (data) {
        _reconnectAttempts++;
        print('🔄 Reconnection attempt $_reconnectAttempts/$_maxReconnectAttempts');
      });

      // Setup event listeners
      _setupEventListeners();

    } catch (e) {
      print('❌ Failed to initialize WebSocket: $e');
      _isConnected = false;
      _isConnecting = false;
    }
  }

  /// Setup listeners for all server events
  void _setupEventListeners() {
    if (_socket == null) return;

    // ============================================
    // INCIDENT EVENTS
    // ============================================
    
    _socket!.on('incident:new', (data) {
      print('📡 New incident received: $data');
      _handleIncidentNew(data);
    });

    _socket!.on('incident:update', (data) {
      print('📡 Incident update received: $data');
      _handleIncidentUpdate(data);
    });

    _socket!.on('incident:alert', (data) {
      print('🚨 Incident alert received: $data');
      _handleIncidentAlert(data);
    });

    // ============================================
    // EMERGENCY EVENTS
    // ============================================

    _socket!.on('emergency:new', (data) {
      print('🆘 New emergency received: $data');
      _handleEmergencyNew(data);
    });

    _socket!.on('emergency:update', (data) {
      print('📡 Emergency update received: $data');
      _handleEmergencyUpdate(data);
    });

    _socket!.on('emergency:alert', (data) {
      print('🚨 Emergency alert received: $data');
      _handleEmergencyAlert(data);
    });

    _socket!.on('emergency:nearby', (data) {
      print('📍 Nearby emergency received: $data');
      _handleNearbyEmergency(data);
    });

    // ============================================
    // EMERGENCY ALARM (GEO-FENCED CRITICAL ALERTS)
    // ============================================

    _socket!.on('emergency:alarm', (data) {
      print('🚨🚨🚨 EMERGENCY ALARM RECEIVED: $data');
      _handleEmergencyAlarm(data);
    });

    // ============================================
    // NOTIFICATION EVENTS
    // ============================================

    _socket!.on('notification:new', (data) {
      print('🔔 New notification received: $data');
      _handleNewNotification(data);
    });

    // ============================================
    // ANALYSIS EVENTS
    // ============================================

    _socket!.on('analysis:complete', (data) {
      print('🤖 Analysis complete received: $data');
      _handleAnalysisComplete(data);
    });

    // ============================================
    // DEPLOYMENT EVENTS (Police Officers)
    // ============================================

    _socket!.on('deployment:new', (data) {
      print('👮 New deployment received: $data');
      _handleDeploymentNew(data);
    });

    _socket!.on('deployment:update', (data) {
      print('🔄 Deployment update received: $data');
      _handleDeploymentUpdate(data);
    });

    _socket!.on('deployment:assigned', (data) {
      print('📍 Deployment assigned to me: $data');
      _handleDeploymentAssigned(data);
    });

    _socket!.on('deployment:cancelled', (data) {
      print('❌ Deployment cancelled: $data');
      _handleCustomEvent('deployment:cancelled', data);
    });

    _socket!.on('deployment:status_changed', (data) {
      print('🔄 Deployment status changed: $data');
      _handleCustomEvent('deployment:status_changed', data);
    });

    _socket!.on('deployment:removed', (data) {
      print('🚫 Removed from deployment: $data');
      _handleCustomEvent('deployment:removed', data);
    });

    _socket!.on('officer:assigned', (data) {
      print('👮 Officer assigned: $data');
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
        title: '🚨 High Priority Incident',
        message: '${alertData['type'] ?? 'Incident'} - ${alertData['severity'] ?? 'Unknown'} severity',
        type: 'critical',
      );
    } catch (e) {
      print('Error handling incident:alert: $e');
    }
  }

  void _handleEmergencyNew(dynamic data) {
    try {
      final emergencyData = _parseData(data);
      _emergencyStreamController.add({
        'type': 'new',
        'data': emergencyData,
      });

      _notificationService.addNotification(
        title: '🆘 Emergency Report',
        message: '${emergencyData['type'] ?? 'Emergency'} reported at ${emergencyData['location']?['name'] ?? 'unknown location'}',
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
      _emergencyStreamController.add({
        'type': 'alert',
        'data': alertData,
      });

      _notificationService.addNotification(
        title: '🚨 CRITICAL EMERGENCY',
        message: 'Immediate attention required!',
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
        title: '📍 Emergency Nearby',
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
      print('🚨🚨🚨 PROCESSING EMERGENCY ALARM: $alarmData');
      
      // Emit to the emergency alarm stream (for full-screen UI)
      _emergencyAlarmController.add(alarmData);
      
      // Also add to emergency stream
      _emergencyStreamController.add({
        'type': 'alarm',
        'data': alarmData,
      });

      // Trigger full-screen emergency alert with siren
      final emergencyService = EmergencyAlertService();
      emergencyService.showEmergencyAlert(alarmData);
      
      // Navigate to emergency alert screen using global navigator
      if (navigatorKey.currentState != null) {
        navigatorKey.currentState!.pushNamed(
          '/emergency-alert',
          arguments: alarmData,
        );
      }

      // High priority notification with emergency service
      _notificationService.addNotification(
        title: '🚨 ${alarmData['title'] ?? 'EMERGENCY ALERT'}',
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
          title: '🤖 AI Detection',
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
        title: '👮 New Deployment',
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
        title: '🔄 Deployment Update',
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
      
      // Emit to stream for UI updates
      _deploymentStreamController.add({
        'type': 'assigned',
        'data': assignmentData,
      });
      
      // Call callback if set (for DeploymentService)
      if (onDeploymentAssigned != null) {
        onDeploymentAssigned!(assignmentData);
      }
      
      // High priority notification for officer being assigned
      _notificationService.addNotification(
        title: '📍 NEW ASSIGNMENT',
        message: 'You have been assigned to ${assignmentData['unitName'] ?? assignmentData['type'] ?? 'a deployment'} at ${assignmentData['address'] ?? 'assigned location'}. Please acknowledge.',
        type: 'critical',
      );
    } catch (e) {
      print('Error handling deployment:assigned: $e');
    }
  }

  void _handleOfficerAssigned(dynamic data) {
    try {
      final assignmentData = _parseData(data);
      _notificationService.addNotification(
        title: '👮 Officer Assigned',
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

  /// Listen to custom events
  void onCustomEvent(String eventName, Function(Map<String, dynamic>) callback) {
    _customEventHandlers[eventName] = callback;
    
    // Set up listener if socket is connected
    if (_socket != null && _socket!.connected) {
      _socket!.on(eventName, (data) {
        final parsedData = _parseData(data);
        callback(parsedData);
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
