import 'dart:async';
import 'dart:convert';
import 'dart:typed_data';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_local_notifications/flutter_local_notifications.dart';
import 'package:audioplayers/audioplayers.dart';
import 'package:vibration/vibration.dart';
import 'critical_alert_service.dart';

/// Deployment Alert Service
/// Handles deployment notifications with distinct sounds/vibrations
/// URGENT deployments trigger the critical alarm (same as emergency)
class DeploymentAlertService {
  static final DeploymentAlertService _instance = DeploymentAlertService._internal();
  factory DeploymentAlertService() => _instance;
  DeploymentAlertService._internal();

  final FlutterLocalNotificationsPlugin _localNotifications = FlutterLocalNotificationsPlugin();
  final AudioPlayer _audioPlayer = AudioPlayer();
  
  bool _initialized = false;
  bool _isAlertPlaying = false;
  Timer? _vibrationTimer;
  
  // Callback for showing deployment UI
  Function(Map<String, dynamic>)? onDeploymentReceived;

  /// Initialize the service
  Future<void> initialize() async {
    if (_initialized) return;

    try {
      // Initialize local notifications
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

      // Create deployment notification channel
      await _createDeploymentChannel();

      _initialized = true;
      print('✅ DeploymentAlertService initialized');
    } catch (e) {
      print('❌ DeploymentAlertService initialization error: $e');
    }
  }

  Future<void> _createDeploymentChannel() async {
    final androidPlugin = _localNotifications
        .resolvePlatformSpecificImplementation<AndroidFlutterLocalNotificationsPlugin>();
    
    if (androidPlugin != null) {
      // Deployment channel - MAX priority, strong vibration, always alerting
      await androidPlugin.createNotificationChannel(
        const AndroidNotificationChannel(
          'deployment_channel',
          'Deployment Alerts',
          description: 'Critical deployment assignments requiring immediate response',
          importance: Importance.max,
          playSound: true,
          enableVibration: true,
          enableLights: true,
          showBadge: true,
          ledColor: Color(0xFF2196F3), // Blue for deployments
        ),
      );
    }
  }

  void _onNotificationTapped(NotificationResponse response) {
    if (response.payload != null) {
      try {
        final data = jsonDecode(response.payload!);
        onDeploymentReceived?.call(data);
      } catch (e) {
        print('Error parsing notification payload: $e');
      }
    }
  }

  /// Show deployment alert with notification, sound, and MANDATORY vibration
  /// ALL deployment alerts trigger strong vibration - officer safety is paramount
  Future<void> showDeploymentAlert(Map<String, dynamic> deployment) async {
    print('📋 DEPLOYMENT ALERT: ${deployment['unit_name'] ?? deployment['unitName']}');

    final priority = deployment['priority']?.toString().toLowerCase() ?? 'normal';
    final isUrgent = priority == 'high' || priority == 'urgent' || priority == 'emergency' || priority == 'critical';

    // For URGENT deployments, use critical alarm (mandatory sound)
    if (isUrgent) {
      print('🚨 URGENT DEPLOYMENT - Triggering critical alarm');
      
      final criticalService = CriticalAlertService();
      await criticalService.initialize();
      
      criticalService.triggerCriticalAlert({
        'title': 'URGENT DEPLOYMENT',
        'message': deployment['instructions'] ?? 'Respond immediately to ${deployment['address'] ?? 'assigned location'}',
        'type': 'deployment',
        'priority': priority,
        'deploymentId': deployment['id'] ?? deployment['deploymentId'] ?? '',
        'address': deployment['address'] ?? '',
        'latitude': deployment['latitude'],
        'longitude': deployment['longitude'],
        'isEmergency': true,
        ...deployment,
      });
      
      // Also trigger callback for UI
      onDeploymentReceived?.call(deployment);
      return;
    }

    // Standard priority - still use STRONG alert (all deployments are important)
    // 1. Show notification with full-screen intent
    await _showDeploymentNotification(deployment);

    // 2. Play deployment sound
    await _playDeploymentSound();

    // 3. MANDATORY strong vibration - repeats to ensure officer notices
    await _vibrateForDeployment();

    // 4. Trigger callback for UI
    onDeploymentReceived?.call(deployment);
  }

  /// Show deployment notification
  Future<void> _showDeploymentNotification(Map<String, dynamic> deployment) async {
    final unitName = deployment['unit_name'] ?? deployment['unitName'] ?? 'New Deployment';
    final address = deployment['address'] ?? 'Location assigned';
    final priority = deployment['priority'] ?? 'normal';
    final instructions = deployment['instructions'] ?? '';

    // ALL deployments are high importance - officer must see them
    final androidDetails = AndroidNotificationDetails(
      'deployment_channel',
      'Deployment Alerts',
      channelDescription: 'Deployment assignment notifications',
      importance: Importance.max,
      priority: Priority.max,
      fullScreenIntent: true, // Always show full-screen for deployments
      category: AndroidNotificationCategory.alarm,
      visibility: NotificationVisibility.public,
      ongoing: true, // Keep until acknowledged
      autoCancel: false,
      playSound: true,
      enableVibration: true,
      // Strong vibration pattern for the notification itself
      vibrationPattern: Int64List.fromList([0, 500, 200, 500, 200, 500, 200, 500]),
      colorized: true,
      color: const Color(0xFF2196F3), // Blue
      ledColor: const Color(0xFF2196F3),
      ledOnMs: 300,
      ledOffMs: 300,
      ticker: 'DEPLOYMENT: Respond Immediately',
      styleInformation: BigTextStyleInformation(
        '$address\n\n$instructions',
        htmlFormatBigText: false,
        contentTitle: '� DEPLOYMENT: $unitName',
        htmlFormatContentTitle: false,
        summaryText: 'RESPOND NOW - ${priority.toUpperCase()}',
        htmlFormatSummaryText: false,
      ),
    );

    const iosDetails = DarwinNotificationDetails(
      presentAlert: true,
      presentBadge: true,
      presentSound: true,
      interruptionLevel: InterruptionLevel.timeSensitive,
    );

    final details = NotificationDetails(
      android: androidDetails,
      iOS: iosDetails,
    );

    await _localNotifications.show(
      888, // Fixed ID for deployments (different from emergency 999)
      '📋 New Deployment: $unitName',
      '$address${instructions.isNotEmpty ? '\n$instructions' : ''}',
      details,
      payload: jsonEncode(deployment),
    );
  }

  /// Play deployment sound (5 urgent beeps)
  Future<void> _playDeploymentSound() async {
    try {
      _isAlertPlaying = true;
      
      // Play 5 alert sounds for all deployments
      for (int i = 0; i < 5 && _isAlertPlaying; i++) {
        await SystemSound.play(SystemSoundType.alert);
        await Future.delayed(const Duration(milliseconds: 350));
      }
      
      print('🔔 Deployment sound played');
    } catch (e) {
      print('Error playing deployment sound: $e');
    }
  }

  /// MANDATORY strong vibration for ALL deployments
  /// Repeats 3 times with max intensity to ensure officer notices
  Future<void> _vibrateForDeployment() async {
    try {
      final hasVibrator = await Vibration.hasVibrator() ?? false;
      if (!hasVibrator) return;

      // Cancel any existing vibration timer
      _vibrationTimer?.cancel();

      // Initial strong vibration burst
      // Pattern: [wait, vibrate, pause, vibrate, pause, vibrate, pause, vibrate]
      // Long, strong vibrations that are impossible to miss
      await Vibration.vibrate(
        pattern: [0, 500, 150, 500, 150, 500, 150, 500],
        intensities: [0, 255, 0, 255, 0, 255, 0, 255],
      );

      // Repeat vibration 2 more times after short delays
      int repeatCount = 0;
      _vibrationTimer = Timer.periodic(const Duration(seconds: 3), (timer) async {
        repeatCount++;
        if (repeatCount >= 2 || !_isAlertPlaying) {
          timer.cancel();
          _vibrationTimer = null;
          return;
        }
        
        try {
          await Vibration.vibrate(
            pattern: [0, 500, 150, 500, 150, 500, 150, 500],
            intensities: [0, 255, 0, 255, 0, 255, 0, 255],
          );
        } catch (e) {
          timer.cancel();
          _vibrationTimer = null;
        }
      });

      print('📳 Deployment STRONG vibration triggered (repeating 3x)');
    } catch (e) {
      print('Error with vibration: $e');
    }
  }

  /// Stop deployment alert
  Future<void> stopDeploymentAlert() async {
    _isAlertPlaying = false;
    _vibrationTimer?.cancel();
    await _audioPlayer.stop();
    await Vibration.cancel();
    print('✅ Deployment alert stopped');
  }

  /// Cancel deployment notification (after acknowledgment)
  Future<void> cancelDeploymentNotification() async {
    await _localNotifications.cancel(888);
    print('✅ Deployment notification cancelled');
  }

  /// Show high-priority deployment with MAXIMUM alert
  /// Continuous vibration until officer acknowledges
  Future<void> showUrgentDeploymentAlert(Map<String, dynamic> deployment) async {
    print('🚨 URGENT DEPLOYMENT ALERT!');

    // 1. Show notification with urgent styling
    await _showDeploymentNotification({
      ...deployment,
      'priority': 'urgent',
    });

    // 2. Play urgent sound (7 rapid beeps)
    _isAlertPlaying = true;
    for (int i = 0; i < 7 && _isAlertPlaying; i++) {
      await SystemSound.play(SystemSoundType.alert);
      await Future.delayed(const Duration(milliseconds: 250));
    }

    // 3. CONTINUOUS strong vibration - repeats every 3s until stopped
    _vibrationTimer?.cancel();
    
    // Initial burst
    final hasVibrator = await Vibration.hasVibrator() ?? false;
    if (hasVibrator) {
      await Vibration.vibrate(
        pattern: [0, 800, 100, 800, 100, 400, 100, 400, 100, 800],
        intensities: [0, 255, 0, 255, 0, 255, 0, 255, 0, 255],
      );
    }

    // Continuous vibration timer - keeps vibrating until acknowledged
    _vibrationTimer = Timer.periodic(const Duration(seconds: 4), (timer) async {
      if (!_isAlertPlaying) {
        timer.cancel();
        _vibrationTimer = null;
        return;
      }
      
      try {
        final hasVib = await Vibration.hasVibrator() ?? false;
        if (hasVib) {
          await Vibration.vibrate(
            pattern: [0, 800, 100, 800, 100, 400, 100, 400, 100, 800],
            intensities: [0, 255, 0, 255, 0, 255, 0, 255, 0, 255],
          );
        }
      } catch (e) {
        timer.cancel();
        _vibrationTimer = null;
      }
    });

    // Auto-stop after 30 seconds to prevent infinite vibration
    Future.delayed(const Duration(seconds: 30), () {
      if (_isAlertPlaying) {
        stopDeploymentAlert();
        print('⏱️ Auto-stopped urgent deployment vibration after 30s');
      }
    });

    // 4. Trigger callback
    onDeploymentReceived?.call(deployment);
  }
}
