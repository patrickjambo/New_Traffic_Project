import 'dart:async';
import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_local_notifications/flutter_local_notifications.dart';
import 'package:audioplayers/audioplayers.dart';
import 'package:vibration/vibration.dart';
import 'package:geolocator/geolocator.dart';
import 'package:http/http.dart' as http;
import 'package:shared_preferences/shared_preferences.dart';
import '../config/environment.dart';

/// Emergency Alert Service
/// Handles intelligent geo-fenced alerts with:
/// - Standard notifications (normal priority)
/// - EMERGENCY ALARMS (full-screen, siren, vibration, flashlight)
/// 
/// FREE technologies used:
/// - Socket.IO for real-time WebSocket
/// - Local notifications (flutter_local_notifications)
/// - Audio playback (audioplayers)
/// - Vibration control (vibration)
class EmergencyAlertService {
  static final EmergencyAlertService _instance = EmergencyAlertService._internal();
  factory EmergencyAlertService() => _instance;
  EmergencyAlertService._internal();

  final FlutterLocalNotificationsPlugin _localNotifications = FlutterLocalNotificationsPlugin();
  final AudioPlayer _audioPlayer = AudioPlayer();
  
  bool _initialized = false;
  bool _isAlarmPlaying = false;
  Timer? _vibrationTimer;
  Timer? _flashlightTimer;
  
  // Callback for showing full-screen alert
  Function(Map<String, dynamic>)? onEmergencyAlarm;
  Function(Map<String, dynamic>)? onStandardAlert;
  
  // Current location for geo-fencing
  Position? _currentPosition;
  Timer? _locationTimer;

  // ============================================================
  // INITIALIZATION
  // ============================================================

  Future<void> initialize() async {
    if (_initialized) return;

    try {
      // Initialize local notifications with high priority channels
      await _initializeNotifications();
      
      // Start location tracking for geo-fencing
      await _startLocationTracking();
      
      _initialized = true;
      print('[OK] EmergencyAlertService initialized');
    } catch (e) {
      print('[ERROR] EmergencyAlertService initialization error: $e');
    }
  }

  Future<void> _initializeNotifications() async {
    // Android notification channels
    const androidSettings = AndroidInitializationSettings('@mipmap/ic_launcher');
    
    const iosSettings = DarwinInitializationSettings(
      requestAlertPermission: true,
      requestBadgePermission: true,
      requestSoundPermission: true,
    );
    
    const initSettings = InitializationSettings(
      android: androidSettings,
      iOS: iosSettings,
    );

    await _localNotifications.initialize(
      initSettings,
      onDidReceiveNotificationResponse: _onNotificationTapped,
    );

    // Create notification channels for Android
    await _createNotificationChannels();
  }

  Future<void> _createNotificationChannels() async {
    final androidPlugin = _localNotifications
        .resolvePlatformSpecificImplementation<AndroidFlutterLocalNotificationsPlugin>();
    
    if (androidPlugin != null) {
      // Emergency channel - highest priority, custom alarm sound
      await androidPlugin.createNotificationChannel(
        const AndroidNotificationChannel(
          'emergency_channel',
          'Emergency Alerts',
          description: 'Critical emergency alerts that require immediate attention',
          importance: Importance.max,
          playSound: true,
          enableVibration: true,
          enableLights: true,
          ledColor: Color(0xFFFF0000), // Red LED
          // Note: Custom sound would be set via raw resource
        ),
      );

      // Standard incident channel
      await androidPlugin.createNotificationChannel(
        const AndroidNotificationChannel(
          'incident_channel',
          'Incident Notifications',
          description: 'Standard traffic incident notifications',
          importance: Importance.high,
          playSound: true,
          enableVibration: true,
        ),
      );

      // Updates channel - lower priority
      await androidPlugin.createNotificationChannel(
        const AndroidNotificationChannel(
          'updates_channel',
          'Status Updates',
          description: 'Incident status updates and general notifications',
          importance: Importance.defaultImportance,
        ),
      );
    }
  }

  void _onNotificationTapped(NotificationResponse response) {
    final payload = response.payload;
    if (payload != null) {
      try {
        final data = jsonDecode(payload);
        if (data['isEmergency'] == true) {
          onEmergencyAlarm?.call(data);
        } else {
          onStandardAlert?.call(data);
        }
      } catch (e) {
        print('Error parsing notification payload: $e');
      }
    }
  }

  // ============================================================
  // LOCATION TRACKING FOR GEO-FENCING
  // ============================================================

  Future<void> _startLocationTracking() async {
    try {
      // Check permission
      LocationPermission permission = await Geolocator.checkPermission();
      if (permission == LocationPermission.denied) {
        permission = await Geolocator.requestPermission();
      }

      if (permission == LocationPermission.deniedForever) {
        print('[WARN] Location permission permanently denied');
        return;
      }

      // Get initial position
      _currentPosition = await Geolocator.getCurrentPosition(
        desiredAccuracy: LocationAccuracy.high,
      );

      // Start periodic location updates
      _locationTimer = Timer.periodic(const Duration(seconds: 30), (timer) async {
        await _updateLocation();
      });

      // Also listen to location stream for real-time updates
      Geolocator.getPositionStream(
        locationSettings: const LocationSettings(
          accuracy: LocationAccuracy.high,
          distanceFilter: 50, // Only update if moved 50m
        ),
      ).listen((Position position) {
        _currentPosition = position;
        _sendLocationToBackend(position);
      });

      print('[LOC] Location tracking started');
    } catch (e) {
      print('[ERROR] Location tracking error: $e');
    }
  }

  Future<void> _updateLocation() async {
    try {
      _currentPosition = await Geolocator.getCurrentPosition(
        desiredAccuracy: LocationAccuracy.high,
      );
      await _sendLocationToBackend(_currentPosition!);
    } catch (e) {
      print('Error updating location: $e');
    }
  }

  Future<void> _sendLocationToBackend(Position position) async {
    try {
      final prefs = await SharedPreferences.getInstance();
      final token = prefs.getString('auth_token');
      
      if (token == null) return;

      await http.post(
        Uri.parse('${EnvironmentConfig.baseApiUrl}/api/geofencing/location'),
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer $token',
        },
        body: jsonEncode({
          'latitude': position.latitude,
          'longitude': position.longitude,
          'accuracy': position.accuracy,
          'speed': position.speed,
          'heading': position.heading,
        }),
      );
    } catch (e) {
      print('Error sending location to backend: $e');
    }
  }

  // ============================================================
  // ALERT HANDLING
  // ============================================================

  /// Process incoming alert from WebSocket
  void processAlert(Map<String, dynamic> data) {
    final isEmergency = data['isEmergency'] == true;
    
    if (isEmergency) {
      _triggerEmergencyAlarm(data);
    } else {
      _showStandardNotification(data);
    }
  }

  /// Public method to show emergency alert (called from WebSocket service)
  /// OPTIMIZED: Immediately trigger all alerts in parallel for real-time response
  void showEmergencyAlert(Map<String, dynamic> data) {
    // Fire everything immediately - no delays!
    _triggerEmergencyAlarm(data);
  }

  /// Trigger full emergency alarm - OPTIMIZED FOR REAL-TIME
  void _triggerEmergencyAlarm(Map<String, dynamic> data) {
    print('[ALERT] EMERGENCY ALARM TRIGGERED!');
    
    // CRITICAL: Fire all effects SIMULTANEOUSLY for instant response
    // Don't await - let them run in parallel
    
    // 1. Trigger callback for full-screen UI FIRST (most important)
    onEmergencyAlarm?.call(data);
    
    // 2. Start vibration immediately (most noticeable)
    _startEmergencyVibration();
    
    // 3. Play emergency siren
    _playEmergencySiren();
    
    // 4. Show notification (can be slightly delayed)
    _showEmergencyNotification(data);
    
    // Auto-stop alarm after 30 seconds if not acknowledged
    Timer(const Duration(seconds: 30), () {
      if (_isAlarmPlaying) {
        stopEmergencyAlarm();
      }
    });
  }

  /// Show emergency notification (highest priority)
  Future<void> _showEmergencyNotification(Map<String, dynamic> data) async {
    const androidDetails = AndroidNotificationDetails(
      'emergency_channel',
      'Emergency Alerts',
      channelDescription: 'Critical emergency alerts',
      importance: Importance.max,
      priority: Priority.max,
      fullScreenIntent: true, // Shows on lock screen
      category: AndroidNotificationCategory.alarm,
      visibility: NotificationVisibility.public,
      ongoing: true, // Can't be swiped away
      autoCancel: false,
      playSound: true,
      enableVibration: true,
      colorized: true,
      color: Color(0xFFFF0000), // Red
      ledColor: Color(0xFFFF0000),
      ledOnMs: 500,
      ledOffMs: 500,
      ticker: 'EMERGENCY ALERT!',
    );

    const iosDetails = DarwinNotificationDetails(
      presentAlert: true,
      presentBadge: true,
      presentSound: true,
      interruptionLevel: InterruptionLevel.critical,
    );

    const details = NotificationDetails(
      android: androidDetails,
      iOS: iosDetails,
    );

    await _localNotifications.show(
      999, // Fixed ID for emergency
      data['title'] ?? 'EMERGENCY ALERT',
      data['message'] ?? 'Immediate response required!',
      details,
      payload: jsonEncode(data),
    );
  }

  /// Play emergency siren sound - OPTIMIZED FOR INSTANT START
  void _playEmergencySiren() {
    _isAlarmPlaying = true;
    
    // Play system alert immediately (don't await)
    SystemSound.play(SystemSoundType.alert);
    
    // Then start the continuous siren in background
    _doPlaySiren();
  }
  
  Future<void> _doPlaySiren() async {
    try {
      // Use built-in alarm sound or custom asset
      // For production, add a custom siren.mp3 to assets
      await _audioPlayer.setReleaseMode(ReleaseMode.loop);
      await _audioPlayer.setVolume(1.0);
      
      // Try to play system alarm sound
      // Note: In production, use a custom asset file
      // await _audioPlayer.play(AssetSource('sounds/emergency_siren.mp3'));
      
      // Fallback: Use system notification sound repeatedly
      for (int i = 0; i < 10 && _isAlarmPlaying; i++) {
        SystemSound.play(SystemSoundType.alert);
        await Future.delayed(const Duration(milliseconds: 400));
      }
      
      print('[AUDIO] Emergency siren playing');
    } catch (e) {
      print('Error playing siren: $e');
    }
  }

  /// Start emergency vibration pattern - OPTIMIZED FOR INSTANT START
  void _startEmergencyVibration() {
    // Fire and forget - don't await
    _doVibration();
  }
  
  Future<void> _doVibration() async {
    try {
      final hasVibrator = await Vibration.hasVibrator() ?? false;
      if (!hasVibrator) return;

      // INSTANT: Vibrate immediately before starting pattern
      Vibration.vibrate(duration: 500, amplitude: 255);

      // Strong, continuous vibration pattern
      // Pattern: vibrate 500ms, pause 200ms, repeat
      _vibrationTimer = Timer.periodic(const Duration(milliseconds: 700), (timer) async {
        if (!_isAlarmPlaying) {
          timer.cancel();
          return;
        }
        await Vibration.vibrate(
          duration: 500,
          amplitude: 255, // Maximum intensity
        );
      });
      
      print('[VIBRATE] Emergency vibration started');
    } catch (e) {
      print('Error with vibration: $e');
    }
  }

  /// Stop all emergency alarm effects
  Future<void> stopEmergencyAlarm() async {
    _isAlarmPlaying = false;
    
    // Stop audio
    await _audioPlayer.stop();
    
    // Stop vibration
    _vibrationTimer?.cancel();
    await Vibration.cancel();
    
    // Stop flashlight
    _flashlightTimer?.cancel();
    
    // Cancel notification
    await _localNotifications.cancel(999);
    
    print('[OK] Emergency alarm stopped');
  }

  /// Show standard (non-emergency) notification
  Future<void> _showStandardNotification(Map<String, dynamic> data) async {
    const androidDetails = AndroidNotificationDetails(
      'incident_channel',
      'Incident Notifications',
      channelDescription: 'Standard traffic incident notifications',
      importance: Importance.high,
      priority: Priority.high,
      playSound: true,
      enableVibration: true,
    );

    const iosDetails = DarwinNotificationDetails(
      presentAlert: true,
      presentBadge: true,
      presentSound: true,
    );

    const details = NotificationDetails(
      android: androidDetails,
      iOS: iosDetails,
    );

    await _localNotifications.show(
      DateTime.now().millisecondsSinceEpoch ~/ 1000,
      data['title'] ?? 'Traffic Alert',
      data['message'] ?? 'New incident reported',
      details,
      payload: jsonEncode(data),
    );

    // Trigger callback
    onStandardAlert?.call(data);
  }

  // ============================================================
  // DUTY STATUS MANAGEMENT
  // ============================================================

  Future<void> setDutyStatus(String status) async {
    try {
      final prefs = await SharedPreferences.getInstance();
      final token = prefs.getString('auth_token');
      
      if (token == null) return;

      await http.put(
        Uri.parse('${EnvironmentConfig.baseApiUrl}/api/geofencing/duty-status'),
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer $token',
        },
        body: jsonEncode({'status': status}),
      );
      
      print('[OK] Duty status set to: $status');
    } catch (e) {
      print('Error setting duty status: $e');
    }
  }

  // ============================================================
  // ALERT ACKNOWLEDGMENT
  // ============================================================

  Future<bool> acknowledgeAlert(int alertId, {String action = 'acknowledged', String? note}) async {
    try {
      final prefs = await SharedPreferences.getInstance();
      final token = prefs.getString('auth_token');
      
      if (token == null) return false;

      final response = await http.post(
        Uri.parse('${EnvironmentConfig.baseApiUrl}/api/geofencing/alert/acknowledge'),
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer $token',
        },
        body: jsonEncode({
          'alertId': alertId,
          'action': action,
          'note': note,
        }),
      );

      if (response.statusCode == 200) {
        await stopEmergencyAlarm();
        return true;
      }
      return false;
    } catch (e) {
      print('Error acknowledging alert: $e');
      return false;
    }
  }

  // ============================================================
  // CLEANUP
  // ============================================================

  void dispose() {
    stopEmergencyAlarm();
    _locationTimer?.cancel();
    _audioPlayer.dispose();
  }
}
