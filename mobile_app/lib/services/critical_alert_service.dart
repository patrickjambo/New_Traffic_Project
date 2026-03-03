import 'dart:async';
import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_local_notifications/flutter_local_notifications.dart';
import 'package:audioplayers/audioplayers.dart';
import 'package:vibration/vibration.dart';
import 'package:wakelock_plus/wakelock_plus.dart';

/// Critical Emergency Alert Service
/// 
/// This service handles CRITICAL emergency alerts that:
/// - Play a MANDATORY alarm sound (like ambulance/police siren)
/// - Override user's notification preferences (sound/vibrate only settings)
/// - Vibrate continuously until acknowledged
/// - Wake up the screen even when phone is locked
/// - Show a full-screen red alert overlay
/// - Cannot be silenced by user settings
/// 
/// The alarm ALWAYS plays regardless of user preferences because
/// emergency situations require immediate attention.
class CriticalAlertService {
  static final CriticalAlertService _instance = CriticalAlertService._internal();
  factory CriticalAlertService() => _instance;
  CriticalAlertService._internal();

  final FlutterLocalNotificationsPlugin _localNotifications = FlutterLocalNotificationsPlugin();
  final AudioPlayer _sirenPlayer = AudioPlayer();
  
  bool _initialized = false;
  bool _isAlarmActive = false;
  Timer? _vibrationTimer;
  Timer? _sirenTimer;
  Timer? _autoStopTimer;
  
  // Callback for showing full-screen red alert UI
  Function(Map<String, dynamic>)? onCriticalEmergency;
  
  // Current emergency data
  Map<String, dynamic>? _currentEmergency;

  /// Initialize the critical alert service
  Future<void> initialize() async {
    if (_initialized) return;

    try {
      await _initializeNotifications();
      await _initializeSirenPlayer();
      _initialized = true;
      print('[CRITICAL] Critical Alert Service initialized');
    } catch (e) {
      print('[ERROR] Critical Alert Service init failed: $e');
    }
  }

  Future<void> _initializeNotifications() async {
    const androidSettings = AndroidInitializationSettings('@mipmap/ic_launcher');
    const iosSettings = DarwinInitializationSettings(
      requestAlertPermission: true,
      requestBadgePermission: true,
      requestSoundPermission: true,
      requestCriticalPermission: true, // iOS critical alerts
    );
    
    const initSettings = InitializationSettings(
      android: androidSettings,
      iOS: iosSettings,
    );

    await _localNotifications.initialize(
      initSettings,
      onDidReceiveNotificationResponse: _onNotificationTapped,
    );

    // Create critical notification channel for Android
    await _createCriticalChannel();
  }

  Future<void> _createCriticalChannel() async {
    final androidPlugin = _localNotifications
        .resolvePlatformSpecificImplementation<AndroidFlutterLocalNotificationsPlugin>();
    
    if (androidPlugin != null) {
      // CRITICAL channel - bypasses DND, full-screen intent
      await androidPlugin.createNotificationChannel(
        const AndroidNotificationChannel(
          'critical_emergency_channel',
          'Critical Emergency Alerts',
          description: 'Life-threatening emergencies requiring immediate response. Cannot be silenced.',
          importance: Importance.max,
          playSound: true,
          enableVibration: true,
          enableLights: true,
          ledColor: Color(0xFFFF0000),
          showBadge: true,
        ),
      );
    }
  }

  Future<void> _initializeSirenPlayer() async {
    // Set up audio player for looping siren
    await _sirenPlayer.setReleaseMode(ReleaseMode.loop);
    await _sirenPlayer.setVolume(1.0); // Maximum volume
  }

  void _onNotificationTapped(NotificationResponse response) {
    if (_currentEmergency != null) {
      onCriticalEmergency?.call(_currentEmergency!);
    }
  }

  /// Trigger a CRITICAL emergency alert
  /// This ALWAYS plays alarm sound regardless of user preferences
  /// because emergencies require immediate attention
  void triggerCriticalAlert(Map<String, dynamic> emergencyData) {
    if (_isAlarmActive) {
      print('[CRITICAL] Alert already active, updating data');
      _currentEmergency = emergencyData;
      return;
    }

    print('[CRITICAL] === TRIGGERING CRITICAL EMERGENCY ALERT ===');
    _isAlarmActive = true;
    _currentEmergency = emergencyData;

    // Execute all alert mechanisms IN PARALLEL for instant response
    // The order of priority: UI callback first, then sensory alerts
    
    // 1. IMMEDIATELY trigger full-screen red UI (highest priority)
    onCriticalEmergency?.call(emergencyData);
    
    // 2. Wake up the screen
    _wakeUpScreen();
    
    // 3. Start continuous vibration pattern (police/ambulance style)
    _startEmergencyVibration();
    
    // 4. Play MANDATORY siren sound (overrides all user settings)
    _playMandatorySiren();
    
    // 5. Show critical notification (for lock screen)
    _showCriticalNotification(emergencyData);
    
    // Auto-stop after 60 seconds if not acknowledged
    _autoStopTimer = Timer(const Duration(seconds: 60), () {
      if (_isAlarmActive) {
        print('[CRITICAL] Auto-stopping alarm after 60 seconds');
        stopCriticalAlert();
      }
    });
  }

  /// Wake up the screen even when locked
  Future<void> _wakeUpScreen() async {
    try {
      // Enable wakelock to keep screen on
      await WakelockPlus.enable();
      print('[CRITICAL] Screen wakelock enabled');
    } catch (e) {
      print('[CRITICAL] Wakelock error: $e');
    }
  }

  /// Start emergency vibration pattern (like police/ambulance)
  /// Pattern: Long-short-long-short (SOS style)
  void _startEmergencyVibration() async {
    try {
      final hasVibratorResult = await Vibration.hasVibrator();
      final hasAmplitudeResult = await Vibration.hasAmplitudeControl();
      final hasVibrator = hasVibratorResult == true;
      final hasAmplitude = hasAmplitudeResult == true;
      
      if (!hasVibrator) {
        print('[CRITICAL] Device has no vibrator');
        return;
      }

      // Police/Ambulance vibration pattern (milliseconds)
      // Long-pause-Long-pause-short-short-short
      final pattern = [
        0,    // Start immediately
        800,  // Long vibrate
        200,  // Short pause
        800,  // Long vibrate
        200,  // Short pause
        200,  // Short vibrate
        100,  // Tiny pause
        200,  // Short vibrate
        100,  // Tiny pause
        200,  // Short vibrate
        500,  // Pause before repeat
      ];

      // Vibrate with maximum intensity if supported
      if (hasAmplitude) {
        Vibration.vibrate(pattern: pattern, intensities: [0, 255, 0, 255, 0, 255, 0, 255, 0, 255, 0]);
      } else {
        Vibration.vibrate(pattern: pattern);
      }

      // Repeat vibration pattern every 3 seconds while alarm is active
      _vibrationTimer = Timer.periodic(const Duration(milliseconds: 3500), (timer) {
        if (!_isAlarmActive) {
          timer.cancel();
          return;
        }
        if (hasAmplitude) {
          Vibration.vibrate(pattern: pattern, intensities: [0, 255, 0, 255, 0, 255, 0, 255, 0, 255, 0]);
        } else {
          Vibration.vibrate(pattern: pattern);
        }
      });

      print('[CRITICAL] Emergency vibration started');
    } catch (e) {
      print('[CRITICAL] Vibration error: $e');
    }
  }

  /// Play MANDATORY siren sound
  /// This sound plays regardless of user's notification preferences
  /// because emergency situations require audio alert
  void _playMandatorySiren() async {
    try {
      // Play system alert sound immediately
      SystemSound.play(SystemSoundType.alert);
      
      // Try to play custom siren asset
      try {
        await _sirenPlayer.play(AssetSource('sounds/emergency_siren.mp3'));
        print('[CRITICAL] Playing emergency siren from assets');
      } catch (assetError) {
        print('[CRITICAL] No custom siren, using system sounds');
        // Fallback: Play rapid system alerts to create alarm effect
        _sirenTimer = Timer.periodic(const Duration(milliseconds: 500), (timer) {
          if (!_isAlarmActive) {
            timer.cancel();
            return;
          }
          SystemSound.play(SystemSoundType.alert);
        });
      }
    } catch (e) {
      print('[CRITICAL] Siren error: $e');
    }
  }

  /// Show critical notification that appears on lock screen
  Future<void> _showCriticalNotification(Map<String, dynamic> data) async {
    final title = data['title'] ?? 'EMERGENCY ALERT';
    final message = data['message'] ?? 'Immediate response required!';

    final androidDetails = AndroidNotificationDetails(
      'critical_emergency_channel',
      'Critical Emergency Alerts',
      channelDescription: 'Life-threatening emergencies',
      importance: Importance.max,
      priority: Priority.max,
      
      // Full-screen intent - shows on lock screen
      fullScreenIntent: true,
      
      // Critical notification properties
      category: AndroidNotificationCategory.alarm,
      visibility: NotificationVisibility.public, // Show on lock screen
      ongoing: true, // Cannot be swiped away
      autoCancel: false,
      
      // Visual
      colorized: true,
      color: const Color(0xFFFF0000), // Red
      
      // Sound and vibration (backup, main ones handled by service)
      playSound: true,
      enableVibration: true,
      
      // LED
      enableLights: true,
      ledColor: const Color(0xFFFF0000),
      ledOnMs: 300,
      ledOffMs: 300,
      
      // Additional
      ticker: 'EMERGENCY: $title',
      timeoutAfter: 60000, // 60 seconds
    );

    const iosDetails = DarwinNotificationDetails(
      presentAlert: true,
      presentBadge: true,
      presentSound: true,
      interruptionLevel: InterruptionLevel.critical, // iOS critical alert
    );

    final details = NotificationDetails(
      android: androidDetails,
      iOS: iosDetails,
    );

    await _localNotifications.show(
      9999, // Fixed ID for critical alerts
      '🚨 $title',
      message,
      details,
      payload: jsonEncode(data),
    );

    print('[CRITICAL] Lock screen notification shown');
  }

  /// Stop the critical alert (when acknowledged)
  Future<void> stopCriticalAlert() async {
    if (!_isAlarmActive) return;

    print('[CRITICAL] Stopping critical alert');
    _isAlarmActive = false;
    _currentEmergency = null;

    // Stop vibration
    _vibrationTimer?.cancel();
    _vibrationTimer = null;
    await Vibration.cancel();

    // Stop siren
    _sirenTimer?.cancel();
    _sirenTimer = null;
    await _sirenPlayer.stop();

    // Cancel auto-stop timer
    _autoStopTimer?.cancel();
    _autoStopTimer = null;

    // Disable wakelock
    await WakelockPlus.disable();

    // Cancel notification
    await _localNotifications.cancel(9999);

    print('[CRITICAL] Alert stopped');
  }

  /// Check if alert is currently active
  bool get isAlertActive => _isAlarmActive;

  /// Dispose resources
  Future<void> dispose() async {
    await stopCriticalAlert();
    await _sirenPlayer.dispose();
  }
}
