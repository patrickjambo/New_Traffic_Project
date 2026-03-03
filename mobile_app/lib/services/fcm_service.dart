import 'package:firebase_messaging/firebase_messaging.dart';
import 'package:firebase_core/firebase_core.dart';
import 'package:flutter_local_notifications/flutter_local_notifications.dart';
import 'package:flutter/material.dart';
import 'dart:convert';
import 'dart:typed_data';
import 'package:http/http.dart' as http;
import '../config/server_config.dart';
import 'emergency_alert_service.dart';
import 'critical_alert_service.dart';

/**
 * Firebase Cloud Messaging Service
 * 100% FREE - Google provides unlimited push notifications
 * Works even when app is closed or in background
 * 
 * CRITICAL ALERTS: When an emergency is sent, this service:
 * - Triggers MANDATORY alarm sound (overrides user preferences)
 * - Shows full-screen red alert even on lock screen
 * - Vibrates continuously until acknowledged
 * - Cannot be silenced by user settings
 */
class FCMService {
  static final FCMService _instance = FCMService._internal();
  factory FCMService() => _instance;
  FCMService._internal();

  final FirebaseMessaging _firebaseMessaging = FirebaseMessaging.instance;
  final FlutterLocalNotificationsPlugin _localNotifications = FlutterLocalNotificationsPlugin();
  
  String? _fcmToken;
  bool _initialized = false;

  /// Initialize FCM service
  Future<void> initialize() async {
    if (_initialized) return;

    try {
      // Request notification permissions
      NotificationSettings settings = await _firebaseMessaging.requestPermission(
        alert: true,
        badge: true,
        sound: true,
        provisional: false,
      );

      if (settings.authorizationStatus == AuthorizationStatus.authorized) {
        print('✅ User granted notification permission');
        
        // Initialize local notifications
        await _initializeLocalNotifications();
        
        // Get FCM token
        _fcmToken = await _firebaseMessaging.getToken();
        print('📱 FCM Token: $_fcmToken');
        
        // Listen for token refresh
        _firebaseMessaging.onTokenRefresh.listen((newToken) {
          _fcmToken = newToken;
          print('🔄 FCM Token refreshed: $newToken');
          _sendTokenToBackend(newToken);
        });
        
        // Send token to backend
        if (_fcmToken != null) {
          await _sendTokenToBackend(_fcmToken!);
        }
        
        // Setup message handlers
        _setupMessageHandlers();
        
        _initialized = true;
        print('✅ FCM Service initialized successfully');
      } else {
        print('⚠️  User declined notification permission');
      }
    } catch (e) {
      print('❌ FCM initialization error: $e');
    }
  }

  /// Initialize local notifications for displaying FCM messages
  Future<void> _initializeLocalNotifications() async {
    const androidSettings = AndroidInitializationSettings('@mipmap/ic_launcher');
    const iosSettings = DarwinInitializationSettings();
    
    const initSettings = InitializationSettings(
      android: androidSettings,
      iOS: iosSettings,
    );

    await _localNotifications.initialize(
      initSettings,
      onDidReceiveNotificationResponse: _onNotificationTapped,
    );
  }

  /// Setup FCM message handlers
  void _setupMessageHandlers() {
    // Handle messages when app is in foreground
    FirebaseMessaging.onMessage.listen((RemoteMessage message) {
      print('📨 Foreground message received: ${message.notification?.title}');
      _showLocalNotification(message);
    });

    // Handle notification taps when app was in background
    FirebaseMessaging.onMessageOpenedApp.listen((RemoteMessage message) {
      print('📬 Background notification tapped');
      _handleNotificationTap(message);
    });

    // Handle initial message when app is opened from terminated state
    _firebaseMessaging.getInitialMessage().then((RemoteMessage? message) {
      if (message != null) {
        print('📭 App opened from notification');
        _handleNotificationTap(message);
      }
    });
  }

  // Store auth token for API calls
  String? _authToken;
  
  /// Set auth token for authenticated API calls
  void setAuthToken(String token) {
    _authToken = token;
    print('🔐 FCM Service: Auth token set');
    // Re-send FCM token with authentication if we have one
    if (_fcmToken != null) {
      _sendTokenToBackend(_fcmToken!);
    }
  }

  /// Send FCM token to backend for targeting
  Future<void> _sendTokenToBackend(String token) async {
    try {
      // Use dynamic server URL from ServerConfig
      final backendUrl = '${ServerConfig.baseApiUrl}/api/geofencing/fcm-token';
      
      final headers = {
        'Content-Type': 'application/json',
      };
      
      // Add auth token if available
      if (_authToken != null) {
        headers['Authorization'] = 'Bearer $_authToken';
      }
      
      final response = await http.post(
        Uri.parse(backendUrl),
        headers: headers,
        body: jsonEncode({
          'fcmToken': token,
          'deviceType': 'mobile',
          'platform': 'android', // or 'ios'
          'location': 'Kigali', // Rwanda capital
          'country': 'RW',
        }),
      );

      if (response.statusCode == 200) {
        print('✅ FCM token registered with backend (Kigali)');
      } else {
        print('⚠️  Failed to register FCM token: ${response.statusCode} - ${response.body}');
      }
    } catch (e) {
      print('❌ Error sending FCM token to backend: $e');
    }
  }

  /// Subscribe to location-based topic for nearby emergencies
  /// Kigali uses grid zones: ~1km per zone (0.01 degrees)
  Future<void> subscribeToLocation(double latitude, double longitude) async {
    try {
      // Round coordinates to create location zones
      // For Kigali: 0.01 degrees ≈ 1.1km grid
      final latZone = (latitude * 100).round();
      final lngZone = (longitude * 100).round();
      final locationTopic = 'location_${latZone}_$lngZone';
      
      await _firebaseMessaging.subscribeToTopic(locationTopic);
      print('📍 Subscribed to Kigali location: $locationTopic');
      
      // Also subscribe to broader area topics (10km grid)
      final broadLatZone = (latitude * 10).round();
      final broadLngZone = (longitude * 10).round();
      final broadTopic = 'area_${broadLatZone}_$broadLngZone';
      
      await _firebaseMessaging.subscribeToTopic(broadTopic);
      print('📍 Subscribed to Kigali area: $broadTopic');
      
      // Subscribe to city-wide alerts
      await _firebaseMessaging.subscribeToTopic('kigali_alerts');
      print('📍 Subscribed to Kigali city-wide alerts');
    } catch (e) {
      print('❌ Error subscribing to location: $e');
    }
  }

  /// Unsubscribe from location-based topics
  Future<void> unsubscribeFromLocation(double latitude, double longitude) async {
    try {
      final latZone = (latitude * 100).round();
      final lngZone = (longitude * 100).round();
      final locationTopic = 'location_${latZone}_$lngZone';
      
      await _firebaseMessaging.unsubscribeFromTopic(locationTopic);
      print('📍 Unsubscribed from location: $locationTopic');
    } catch (e) {
      print('❌ Error unsubscribing from location: $e');
    }
  }

  /// Subscribe to police role topic
  Future<void> subscribeToPoliceAlerts() async {
    try {
      await _firebaseMessaging.subscribeToTopic('police_alerts');
      print('👮 Subscribed to police alerts');
    } catch (e) {
      print('❌ Error subscribing to police alerts: $e');
    }
  }

  /// Subscribe to admin role topic
  Future<void> subscribeToAdminAlerts() async {
    try {
      await _firebaseMessaging.subscribeToTopic('admin_alerts');
      print('👨‍💼 Subscribed to admin alerts');
    } catch (e) {
      print('❌ Error subscribing to admin alerts: $e');
    }
  }

  /// Show local notification for FCM message
  /// For CRITICAL emergencies, triggers mandatory alarm sound
  Future<void> _showLocalNotification(RemoteMessage message) async {
    final notification = message.notification;
    if (notification == null) return;

    // Determine priority based on message data
    final severity = message.data['severity'] ?? 'medium';
    final isEmergency = message.data['isEmergency'] == 'true' || severity == 'critical';
    final type = message.data['type'] ?? '';
    
    // Check if this is a CRITICAL emergency that requires mandatory alarm
    final isCriticalEmergency = isEmergency || 
        severity == 'critical' || 
        severity == 'high' ||
        type == 'emergency' ||
        type == 'deployment';

    // 🚨 CRITICAL: Trigger mandatory alarm for emergencies
    // This OVERRIDES user preferences - emergencies always make noise
    if (isCriticalEmergency) {
      print('🚨 FCM: CRITICAL EMERGENCY - Triggering mandatory alarm');
      
      try {
        // Use CriticalAlertService for mandatory alarm
        final criticalService = CriticalAlertService();
        await criticalService.initialize();
        
        criticalService.triggerCriticalAlert({
          'title': notification.title ?? '🚨 EMERGENCY ALERT',
          'message': notification.body ?? 'Immediate response required!',
          'id': message.data['emergencyId'] ?? message.data['alertId'] ?? message.data['deploymentId'] ?? '',
          'type': type.isNotEmpty ? type : 'emergency',
          'severity': severity,
          'latitude': double.tryParse(message.data['latitude'] ?? '') ?? 0.0,
          'longitude': double.tryParse(message.data['longitude'] ?? '') ?? 0.0,
          'address': message.data['address'] ?? '',
          'incidentId': message.data['incidentId'] ?? '',
          'deploymentId': message.data['deploymentId'] ?? '',
          'isEmergency': true,
          'timestamp': DateTime.now().toIso8601String(),
        });
        print('✅ Critical alarm triggered from FCM');
        
        // Also trigger legacy EmergencyAlertService for UI callback
        try {
          final alertService = EmergencyAlertService();
          alertService.showEmergencyAlert({
            'title': notification.title ?? '🚨 EMERGENCY ALERT',
            'message': notification.body ?? 'Emergency response required!',
            'id': message.data['emergencyId'] ?? message.data['alertId'] ?? '',
            'type': type.isNotEmpty ? type : 'emergency',
            'severity': severity,
            'latitude': double.tryParse(message.data['latitude'] ?? '') ?? 0.0,
            'longitude': double.tryParse(message.data['longitude'] ?? '') ?? 0.0,
            'address': message.data['address'] ?? '',
          });
        } catch (e) {
          print('⚠️ Legacy alert service error: $e');
        }
      } catch (e) {
        print('❌ Failed to trigger critical alarm: $e');
      }
      
      // Return early - critical service handles notification
      return;
    }

    // Standard notification for non-critical messages
    final priority = Priority.high;
    final importance = Importance.high;

    final androidDetails = AndroidNotificationDetails(
      'incident_channel',
      'Incident Notifications',
      channelDescription: 'Standard traffic incident notifications',
      importance: importance,
      priority: priority,
      playSound: true,
      enableVibration: true,
      enableLights: true,
      color: Color(0xFFF59E0B),
      icon: '@mipmap/ic_launcher',
    );

    const iosDetails = DarwinNotificationDetails(
      presentAlert: true,
      presentBadge: true,
      presentSound: true,
    );

    final details = NotificationDetails(
      android: androidDetails,
      iOS: iosDetails,
    );

    await _localNotifications.show(
      message.hashCode,
      notification.title,
      notification.body,
      details,
      payload: jsonEncode(message.data),
    );
  }

  /// Handle notification tap
  void _onNotificationTapped(NotificationResponse response) {
    if (response.payload != null) {
      try {
        final data = jsonDecode(response.payload!);
        print('🔔 Notification tapped with payload: $data');
        
        // Check if this is a background emergency notification
        final isEmergency = data['isEmergency'] == 'true' || 
            data['type'] == 'emergency' || 
            data['type'] == 'deployment';
        final fromBackground = data['fromBackground'] == 'true';
        
        if (isEmergency || fromBackground) {
          print('🚨 Opening emergency alert screen from notification tap');
          _navigateToEmergencyScreen(data);
        } else {
          _handleNotificationTap(RemoteMessage(data: Map<String, dynamic>.from(data)));
        }
      } catch (e) {
        print('❌ Error parsing notification payload: $e');
      }
    }
  }
  
  /// Navigate to emergency screen when notification is tapped
  void _navigateToEmergencyScreen(Map<String, dynamic> data) {
    // Store the emergency data for when the app is ready
    _pendingEmergencyData = data;
    
    // Trigger critical alert to start alarm
    try {
      final criticalService = CriticalAlertService();
      criticalService.initialize().then((_) {
        criticalService.triggerCriticalAlert({
          'title': data['title'] ?? 'EMERGENCY ALERT',
          'message': data['message'] ?? 'Immediate response required!',
          'id': data['emergencyId'] ?? data['alertId'] ?? data['deploymentId'] ?? '',
          'type': data['type'] ?? 'emergency',
          'severity': data['severity'] ?? 'critical',
          'latitude': double.tryParse(data['latitude']?.toString() ?? '') ?? 0.0,
          'longitude': double.tryParse(data['longitude']?.toString() ?? '') ?? 0.0,
          'address': data['address'] ?? '',
          'incidentId': data['incidentId'] ?? '',
          'deploymentId': data['deploymentId'] ?? '',
          'isEmergency': true,
          'timestamp': DateTime.now().toIso8601String(),
        });
        print('✅ Critical alert triggered from notification tap');
      });
    } catch (e) {
      print('❌ Error triggering critical alert: $e');
    }
  }
  
  // Store pending emergency data for when navigator is ready
  Map<String, dynamic>? _pendingEmergencyData;
  
  /// Get and clear pending emergency data
  Map<String, dynamic>? consumePendingEmergency() {
    final data = _pendingEmergencyData;
    _pendingEmergencyData = null;
    return data;
  }

  /// Navigate to appropriate screen based on notification data
  void _handleNotificationTap(RemoteMessage message) {
    final data = message.data;
    
    print('🔔 Notification tapped with data: $data');
    
    // TODO: Navigate to appropriate screen
    // Example: Navigator.pushNamed(context, '/emergency-details', arguments: data['emergencyId']);
    
    final type = data['type'];
    switch (type) {
      case 'emergency_new':
        print('Navigate to emergency details: ${data['emergencyId']}');
        break;
      case 'emergency_updated':
        print('Navigate to emergency updates: ${data['emergencyId']}');
        break;
      case 'incident_new':
        print('Navigate to incident details: ${data['incidentId']}');
        break;
      default:
        print('Unknown notification type: $type');
    }
  }

  /// Get current FCM token
  String? get fcmToken => _fcmToken;

  /// Check if service is initialized
  bool get isInitialized => _initialized;
}

/**
 * Background message handler (must be top-level function)
 * Called when app is terminated and message arrives
 * 
 * For CRITICAL emergencies, this triggers:
 * - Full-screen notification that wakes the device
 * - High-priority notification that shows on lock screen
 * - Alarm sound and vibration when user taps to open app
 * 
 * NOTE: This function runs in an ISOLATE - limited Flutter features available
 */
@pragma('vm:entry-point')
Future<void> firebaseMessagingBackgroundHandler(RemoteMessage message) async {
  // Initialize Firebase in isolate
  await Firebase.initializeApp();
  print('📬 Background message received: ${message.notification?.title}');
  
  // Check if this is a critical emergency
  final severity = message.data['severity'] ?? 'medium';
  final isEmergency = message.data['isEmergency'] == 'true' || severity == 'critical';
  final type = message.data['type'] ?? '';
  
  final isCriticalEmergency = isEmergency || 
      severity == 'critical' || 
      severity == 'high' || 
      type == 'emergency' ||
      type == 'deployment';

  if (isCriticalEmergency) {
    print('🚨 CRITICAL emergency received in BACKGROUND/CLOSED state!');
    
    // Initialize local notifications for background
    final FlutterLocalNotificationsPlugin localNotifications = FlutterLocalNotificationsPlugin();
    
    const androidSettings = AndroidInitializationSettings('@mipmap/ic_launcher');
    const initSettings = InitializationSettings(android: androidSettings);
    await localNotifications.initialize(initSettings);
    
    // Create notification channel for critical alerts (required for Android 8+)
    const androidChannel = AndroidNotificationChannel(
      'critical_emergency_channel',
      'Critical Emergency Alerts',
      description: 'Life-threatening emergencies requiring immediate response',
      importance: Importance.max,
      playSound: true,
      enableVibration: true,
      enableLights: true,
      ledColor: Color(0xFFFF0000),
    );
    
    await localNotifications
        .resolvePlatformSpecificImplementation<AndroidFlutterLocalNotificationsPlugin>()
        ?.createNotificationChannel(androidChannel);
    
    // Build emergency data for navigation when app opens
    final emergencyData = jsonEncode({
      'emergencyId': message.data['emergencyId'] ?? message.data['alertId'] ?? '',
      'type': type.isNotEmpty ? type : 'emergency',
      'severity': severity,
      'latitude': message.data['latitude'] ?? '',
      'longitude': message.data['longitude'] ?? '',
      'address': message.data['address'] ?? '',
      'incidentId': message.data['incidentId'] ?? '',
      'deploymentId': message.data['deploymentId'] ?? '',
      'title': message.notification?.title ?? 'EMERGENCY ALERT',
      'message': message.notification?.body ?? 'Immediate response required!',
      'isEmergency': 'true',
      'timestamp': DateTime.now().toIso8601String(),
      'fromBackground': 'true', // Flag to trigger alarm when app opens
    });
    
    // Prepare notification text
    final notificationBody = message.notification?.body ?? 'Emergency response required! Tap to respond immediately.';
    final notificationTitle = message.notification?.title ?? 'EMERGENCY ALERT';
    
    // Show full-screen high-priority notification
    // This will wake the device and show on lock screen
    final androidDetails = AndroidNotificationDetails(
      'critical_emergency_channel',
      'Critical Emergency Alerts',
      channelDescription: 'Life-threatening emergencies',
      importance: Importance.max,
      priority: Priority.max,
      fullScreenIntent: true, // Shows full-screen on locked device
      category: AndroidNotificationCategory.alarm,
      visibility: NotificationVisibility.public, // Shows on lock screen
      ongoing: true, // Cannot be swiped away
      autoCancel: false,
      playSound: true,
      enableVibration: true,
      vibrationPattern: Int64List.fromList([0, 500, 200, 500, 200, 500, 200, 500]),
      colorized: true,
      color: const Color(0xFFFF0000),
      icon: '@mipmap/ic_launcher',
      largeIcon: const DrawableResourceAndroidBitmap('@mipmap/ic_launcher'),
      styleInformation: BigTextStyleInformation(
        notificationBody,
        contentTitle: '🚨 $notificationTitle',
        summaryText: 'URGENT - Tap to respond',
      ),
      ticker: 'EMERGENCY ALERT',
      timeoutAfter: 300000, // 5 minutes
    );
    
    const iosDetails = DarwinNotificationDetails(
      presentAlert: true,
      presentBadge: true,
      presentSound: true,
      interruptionLevel: InterruptionLevel.critical,
      sound: 'emergency_siren.aiff',
    );
    
    final details = NotificationDetails(
      android: androidDetails,
      iOS: iosDetails,
    );
    
    // Use unique ID based on timestamp to ensure notification shows
    final notificationId = DateTime.now().millisecondsSinceEpoch ~/ 1000;
    
    await localNotifications.show(
      notificationId,
      '🚨 ${message.notification?.title ?? 'EMERGENCY ALERT'}',
      message.notification?.body ?? 'Emergency! Tap to respond immediately.',
      details,
      payload: emergencyData, // Pass data for navigation when tapped
    );
    
    print('✅ Background emergency notification displayed (ID: $notificationId)');
    print('📱 Full-screen intent enabled - will wake device and show on lock screen');
  } else {
    // Standard notification for non-critical background messages
    final FlutterLocalNotificationsPlugin localNotifications = FlutterLocalNotificationsPlugin();
    
    const androidSettings = AndroidInitializationSettings('@mipmap/ic_launcher');
    const initSettings = InitializationSettings(android: androidSettings);
    await localNotifications.initialize(initSettings);
    
    const androidDetails = AndroidNotificationDetails(
      'incident_channel',
      'Incident Notifications',
      channelDescription: 'Traffic incident notifications',
      importance: Importance.high,
      priority: Priority.high,
      playSound: true,
      enableVibration: true,
    );
    
    const details = NotificationDetails(android: androidDetails);
    
    await localNotifications.show(
      message.hashCode,
      message.notification?.title ?? 'Notification',
      message.notification?.body ?? '',
      details,
    );
  }
}
