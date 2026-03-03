import 'dart:async';
import 'package:flutter_foreground_task/flutter_foreground_task.dart';
import 'package:location/location.dart';
import 'package:http/http.dart' as http;
import 'dart:convert';
import '../config/server_config.dart';

/// Background Location Service
/// 
/// This service ensures police officer location is tracked in REAL-TIME
/// even when:
/// - App is in background
/// - Phone is in pocket
/// - Screen is off
/// - Phone is locked
/// 
/// Uses Android Foreground Service to prevent OS from killing the process
class BackgroundLocationService {
  static final BackgroundLocationService _instance = BackgroundLocationService._internal();
  factory BackgroundLocationService() => _instance;
  BackgroundLocationService._internal();

  bool _isRunning = false;
  bool get isRunning => _isRunning;
  
  // User data for tracking
  String? _userId;
  String? _authToken;

  /// Initialize and start background location tracking
  Future<void> startBackgroundTracking({
    required String userId,
    required String authToken,
  }) async {
    if (_isRunning) {
      print('📍 Background location tracking already running');
      return;
    }
    
    _userId = userId;
    _authToken = authToken;
    
    print('🚀 Starting background location tracking service...');
    
    // Initialize foreground task
    FlutterForegroundTask.init(
      androidNotificationOptions: AndroidNotificationOptions(
        channelId: 'police_location_tracking',
        channelName: 'Police Location Tracking',
        channelDescription: 'Real-time location tracking for police officers',
        channelImportance: NotificationChannelImportance.LOW,
        priority: NotificationPriority.LOW,
      ),
      iosNotificationOptions: const IOSNotificationOptions(
        showNotification: true,
        playSound: false,
      ),
      foregroundTaskOptions: ForegroundTaskOptions(
        eventAction: ForegroundTaskEventAction.repeat(15000), // Every 15 seconds
        autoRunOnBoot: true,
        autoRunOnMyPackageReplaced: true,
        allowWakeLock: true,
        allowWifiLock: true,
      ),
    );
    
    // Request permissions
    final notificationPermission = await FlutterForegroundTask.checkNotificationPermission();
    if (notificationPermission != NotificationPermission.granted) {
      await FlutterForegroundTask.requestNotificationPermission();
    }
    
    // Start the foreground service
    await _startForegroundTask();
    
    _isRunning = true;
    print('✅ Background location tracking service started');
  }

  Future<void> _startForegroundTask() async {
    // Check if already running
    if (await FlutterForegroundTask.isRunningService) {
      print('📍 Foreground service already running');
      return;
    }
    
    // Save data for the background task
    await FlutterForegroundTask.saveData(key: 'userId', value: _userId ?? '');
    await FlutterForegroundTask.saveData(key: 'authToken', value: _authToken ?? '');
    await FlutterForegroundTask.saveData(key: 'serverUrl', value: ServerConfig.baseApiUrl);
    
    // Start foreground task
    await FlutterForegroundTask.startService(
      notificationTitle: 'TrafficGuard Active',
      notificationText: 'Location tracking active - You are on duty',
      callback: startCallback,
    );
  }

  /// Stop background tracking
  Future<void> stopBackgroundTracking() async {
    if (!_isRunning) return;
    
    print('🛑 Stopping background location tracking...');
    
    await FlutterForegroundTask.stopService();
    
    _isRunning = false;
    print('✅ Background location tracking stopped');
  }

  /// Update notification text
  Future<void> updateNotificationText(String text) async {
    await FlutterForegroundTask.updateService(
      notificationTitle: 'TrafficGuard Active',
      notificationText: text,
    );
  }
}

/// Top-level callback function for starting the foreground task
/// This MUST be a top-level function (not inside a class)
@pragma('vm:entry-point')
void startCallback() {
  FlutterForegroundTask.setTaskHandler(LocationTaskHandler());
}

/// The task handler that runs in the background
class LocationTaskHandler extends TaskHandler {
  final Location _location = Location();
  String? _userId;
  String? _authToken;
  String? _serverUrl;
  int _updateCount = 0;

  @override
  Future<void> onStart(DateTime timestamp, TaskStarter starter) async {
    print('🚀 Background location task started at $timestamp');
    
    // Load saved data
    _userId = await FlutterForegroundTask.getData<String>(key: 'userId');
    _authToken = await FlutterForegroundTask.getData<String>(key: 'authToken');
    _serverUrl = await FlutterForegroundTask.getData<String>(key: 'serverUrl');
    
    print('📍 Background task initialized - User: $_userId');
    
    // Initialize location
    await _initializeLocation();
    
    // Send initial location
    await _sendLocationUpdate();
  }

  Future<void> _initializeLocation() async {
    try {
      // Check and enable location service
      bool serviceEnabled = await _location.serviceEnabled();
      if (!serviceEnabled) {
        serviceEnabled = await _location.requestService();
      }
      
      // Request permission
      PermissionStatus permission = await _location.hasPermission();
      if (permission == PermissionStatus.denied) {
        permission = await _location.requestPermission();
      }
      
      // Configure for battery-efficient background tracking
      await _location.changeSettings(
        accuracy: LocationAccuracy.balanced,
        interval: 15000, // 15 seconds
        distanceFilter: 10, // 10 meters minimum movement
      );
      
      // Enable background mode
      await _location.enableBackgroundMode(enable: true);
      
      print('✅ Background location initialized');
    } catch (e) {
      print('❌ Error initializing background location: $e');
    }
  }

  @override
  void onRepeatEvent(DateTime timestamp) async {
    _updateCount++;
    print('📍 Background location update #$_updateCount at $timestamp');
    
    await _sendLocationUpdate();
    
    // Update notification with last update time
    final timeStr = '${timestamp.hour}:${timestamp.minute.toString().padLeft(2, '0')}';
    FlutterForegroundTask.updateService(
      notificationTitle: 'TrafficGuard Active',
      notificationText: 'Last update: $timeStr - You are on duty',
    );
  }

  Future<void> _sendLocationUpdate() async {
    try {
      // Get current location
      final locationData = await _location.getLocation().timeout(
        const Duration(seconds: 10),
        onTimeout: () => throw TimeoutException('Location timeout'),
      );
      
      if (locationData.latitude == null || locationData.longitude == null) {
        print('⚠️ Invalid location data');
        return;
      }
      
      print('📍 Got location: ${locationData.latitude}, ${locationData.longitude}');
      
      // Send to server via HTTP (WebSocket not available in background)
      await _sendLocationToServer(
        latitude: locationData.latitude!,
        longitude: locationData.longitude!,
        accuracy: locationData.accuracy,
        speed: locationData.speed,
      );
    } catch (e) {
      print('❌ Error getting/sending location: $e');
    }
  }

  Future<void> _sendLocationToServer({
    required double latitude,
    required double longitude,
    double? accuracy,
    double? speed,
  }) async {
    if (_serverUrl == null || _authToken == null) {
      print('⚠️ Server URL or auth token not available');
      return;
    }
    
    try {
      // Use POST /api/police/location endpoint
      final url = '$_serverUrl/api/police/location';
      
      final response = await http.post(
        Uri.parse(url),
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer $_authToken',
        },
        body: jsonEncode({
          'latitude': latitude,
          'longitude': longitude,
          'accuracy': accuracy,
          'speed': speed,
          'timestamp': DateTime.now().toIso8601String(),
          'source': 'background_service',
        }),
      ).timeout(const Duration(seconds: 10));
      
      if (response.statusCode == 200) {
        print('✅ Background location sent to server successfully');
      } else {
        print('⚠️ Server responded with ${response.statusCode}: ${response.body}');
      }
    } catch (e) {
      print('❌ Error sending location to server: $e');
    }
  }

  @override
  Future<void> onDestroy(DateTime timestamp) async {
    print('🛑 Background location task destroyed at $timestamp');
    
    // Disable background mode
    await _location.enableBackgroundMode(enable: false);
  }

  @override
  void onNotificationButtonPressed(String id) {
    print('📱 Notification button pressed: $id');
  }

  @override
  void onNotificationPressed() {
    print('📱 Notification pressed - opening app');
    // This will open the app when notification is tapped
    FlutterForegroundTask.launchApp();
  }

  @override
  void onNotificationDismissed() {
    print('📱 Notification dismissed');
  }
}
