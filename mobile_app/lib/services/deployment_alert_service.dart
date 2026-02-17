import 'dart:async';
import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_local_notifications/flutter_local_notifications.dart';
import 'package:audioplayers/audioplayers.dart';
import 'package:vibration/vibration.dart';

/// Deployment Alert Service
/// Handles deployment notifications with distinct sounds/vibrations
/// Different from emergency alerts - less urgent but still attention-grabbing
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
      // Deployment channel - high priority but different from emergency
      await androidPlugin.createNotificationChannel(
        const AndroidNotificationChannel(
          'deployment_channel',
          'Deployment Alerts',
          description: 'Notifications for new deployment assignments',
          importance: Importance.high,
          playSound: true,
          enableVibration: true,
          enableLights: true,
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

  /// Show deployment alert with notification, sound, and vibration
  Future<void> showDeploymentAlert(Map<String, dynamic> deployment) async {
    print('📋 DEPLOYMENT ALERT: ${deployment['unit_name'] ?? deployment['unitName']}');

    // 1. Show notification
    await _showDeploymentNotification(deployment);

    // 2. Play deployment sound (different from emergency)
    await _playDeploymentSound();

    // 3. Vibrate (shorter pattern than emergency)
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

    // Priority-based styling
    final isHighPriority = priority == 'high' || priority == 'urgent';

    final androidDetails = AndroidNotificationDetails(
      'deployment_channel',
      'Deployment Alerts',
      channelDescription: 'Deployment assignment notifications',
      importance: isHighPriority ? Importance.max : Importance.high,
      priority: isHighPriority ? Priority.max : Priority.high,
      fullScreenIntent: isHighPriority, // Full screen for high priority
      category: AndroidNotificationCategory.message,
      visibility: NotificationVisibility.public,
      ongoing: true, // Keep until acknowledged
      autoCancel: false,
      playSound: true,
      enableVibration: true,
      colorized: true,
      color: const Color(0xFF2196F3), // Blue
      ledColor: const Color(0xFF2196F3),
      ledOnMs: 300,
      ledOffMs: 300,
      ticker: 'New Deployment Assignment',
      styleInformation: BigTextStyleInformation(
        '$address\n\n$instructions',
        htmlFormatBigText: false,
        contentTitle: '📋 $unitName',
        htmlFormatContentTitle: false,
        summaryText: priority.toUpperCase(),
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

  /// Play deployment sound (3 short beeps - different from emergency siren)
  Future<void> _playDeploymentSound() async {
    try {
      _isAlertPlaying = true;
      
      // Play 3 short alert sounds
      for (int i = 0; i < 3 && _isAlertPlaying; i++) {
        await SystemSound.play(SystemSoundType.alert);
        await Future.delayed(const Duration(milliseconds: 400));
      }
      
      print('🔔 Deployment sound played');
    } catch (e) {
      print('Error playing deployment sound: $e');
    }
  }

  /// Vibrate for deployment (shorter pattern than emergency)
  Future<void> _vibrateForDeployment() async {
    try {
      final hasVibrator = await Vibration.hasVibrator() ?? false;
      if (!hasVibrator) return;

      // Pattern: 3 short vibrations
      // [wait, vibrate, wait, vibrate, wait, vibrate]
      await Vibration.vibrate(
        pattern: [0, 200, 100, 200, 100, 200],
        intensities: [0, 200, 0, 200, 0, 200],
      );

      print('📳 Deployment vibration completed');
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

  /// Show high-priority deployment with stronger alert
  Future<void> showUrgentDeploymentAlert(Map<String, dynamic> deployment) async {
    print('🚨 URGENT DEPLOYMENT ALERT!');

    // 1. Show notification
    await _showDeploymentNotification({
      ...deployment,
      'priority': 'urgent',
    });

    // 2. Play more urgent sound (5 beeps)
    _isAlertPlaying = true;
    for (int i = 0; i < 5 && _isAlertPlaying; i++) {
      await SystemSound.play(SystemSoundType.alert);
      await Future.delayed(const Duration(milliseconds: 300));
    }

    // 3. Stronger vibration pattern
    final hasVibrator = await Vibration.hasVibrator() ?? false;
    if (hasVibrator) {
      await Vibration.vibrate(
        pattern: [0, 300, 100, 300, 100, 300, 100, 300],
        intensities: [0, 255, 0, 255, 0, 255, 0, 255],
      );
    }

    // 4. Trigger callback
    onDeploymentReceived?.call(deployment);
  }
}
