import 'package:firebase_messaging/firebase_messaging.dart';
import 'package:firebase_core/firebase_core.dart';
import 'package:flutter_local_notifications/flutter_local_notifications.dart';
import 'package:flutter/material.dart';  // 🔥 ADD THIS LINE for Color class
import 'dart:convert';
import 'package:http/http.dart' as http;
import '../config/server_config.dart';
import 'emergency_alert_service.dart';

/**
 * Firebase Cloud Messaging Service
 * 100% FREE - Google provides unlimited push notifications
 * Works even when app is closed or in background
 * Location-based targeting for nearby police officers
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
  Future<void> _showLocalNotification(RemoteMessage message) async {
    final notification = message.notification;
    if (notification == null) return;

    // Determine priority based on message data
    final severity = message.data['severity'] ?? 'medium';
    final isEmergency = message.data['isEmergency'] == 'true' || severity == 'critical';
    final priority = severity == 'critical' ? Priority.max : Priority.high;
    final importance = severity == 'critical' ? Importance.max : Importance.high;

    // 🚨 TRIGGER EMERGENCY ALARM for critical/emergency notifications
    if (isEmergency || severity == 'critical' || severity == 'high') {
      print('🚨 FCM: Triggering emergency alarm for ${message.data['type']}');
      
      try {
        final alertService = EmergencyAlertService();
        alertService.showEmergencyAlert({
          'title': notification.title ?? '🚨 EMERGENCY ALERT',
          'message': notification.body ?? 'Emergency response required!',
          'id': message.data['emergencyId'] ?? message.data['alertId'] ?? '',
          'type': message.data['type'] ?? 'emergency',
          'severity': severity,
          'latitude': double.tryParse(message.data['latitude'] ?? '') ?? 0.0,
          'longitude': double.tryParse(message.data['longitude'] ?? '') ?? 0.0,
          'address': message.data['address'] ?? '',
        });
        print('✅ Emergency alarm triggered from FCM');
      } catch (e) {
        print('❌ Failed to trigger emergency alarm: $e');
      }
    }

    final androidDetails = AndroidNotificationDetails(
      'emergency_channel',
      'Emergency Alerts',
      channelDescription: 'Critical emergency notifications',
      importance: importance,
      priority: priority,
      playSound: true,
      enableVibration: true,
      enableLights: true,
      color: severity == 'critical' ? Color(0xFFDC2626) : Color(0xFFF59E0B),
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
      final data = jsonDecode(response.payload!);
      _handleNotificationTap(RemoteMessage(data: data));
    }
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
 */
@pragma('vm:entry-point')
Future<void> firebaseMessagingBackgroundHandler(RemoteMessage message) async {
  await Firebase.initializeApp();
  print('📬 Background message received: ${message.notification?.title}');
}
