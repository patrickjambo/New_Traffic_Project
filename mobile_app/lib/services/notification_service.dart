import 'package:flutter_local_notifications/flutter_local_notifications.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'dart:convert';

class NotificationService {
  static final NotificationService _instance = NotificationService._internal();
  factory NotificationService() => _instance;
  NotificationService._internal();

  final FlutterLocalNotificationsPlugin _flutterLocalNotificationsPlugin =
      FlutterLocalNotificationsPlugin();

  static const String _notificationsKey = 'stored_notifications';
  List<Map<String, dynamic>> _notifications = [];

  /// Initialize the notification service
  Future<void> initialize() async {
    const androidSettings = AndroidInitializationSettings('@mipmap/ic_launcher');
    const iosSettings = DarwinInitializationSettings();
    const initSettings = InitializationSettings(
      android: androidSettings,
      iOS: iosSettings,
    );

    await _flutterLocalNotificationsPlugin.initialize(initSettings);
    await _loadNotifications();
  }

  /// Load notifications from storage
  Future<void> _loadNotifications() async {
    final prefs = await SharedPreferences.getInstance();
    final String? notificationsJson = prefs.getString(_notificationsKey);
    
    if (notificationsJson != null) {
      final List<dynamic> decoded = json.decode(notificationsJson);
      _notifications = decoded.map((e) => Map<String, dynamic>.from(e)).toList();
    }
  }

  /// Save notifications to storage
  Future<void> _saveNotifications() async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString(_notificationsKey, json.encode(_notifications));
  }

  /// Add a new notification
  Future<void> addNotification({
    required String title,
    required String message,
    String type = 'info',
  }) async {
    final notification = {
      'id': DateTime.now().millisecondsSinceEpoch.toString(),
      'title': title,
      'message': message,
      'type': type,
      'timestamp': DateTime.now().toIso8601String(),
      'read': false,
    };

    _notifications.insert(0, notification);
    await _saveNotifications();

    // Show local notification
    await _showLocalNotification(title, message);
  }

  /// Show local notification
  Future<void> _showLocalNotification(String title, String message) async {
    const androidDetails = AndroidNotificationDetails(
      'trafficguard_channel',
      'TrafficGuard Notifications',
      channelDescription: 'Notifications for traffic incidents and updates',
      importance: Importance.high,
      priority: Priority.high,
    );
    
    const iosDetails = DarwinNotificationDetails();
    
    const notificationDetails = NotificationDetails(
      android: androidDetails,
      iOS: iosDetails,
    );

    await _flutterLocalNotificationsPlugin.show(
      DateTime.now().millisecond,
      title,
      message,
      notificationDetails,
    );
  }

  /// Get all notifications
  List<Map<String, dynamic>> getNotifications() {
    return List<Map<String, dynamic>>.from(_notifications);
  }

  /// Mark notification as read
  Future<void> markAsRead(String id) async {
    final index = _notifications.indexWhere((n) => n['id'] == id);
    if (index != -1) {
      _notifications[index]['read'] = true;
      await _saveNotifications();
    }
  }

  /// Delete notification
  Future<void> deleteNotification(String id) async {
    _notifications.removeWhere((n) => n['id'] == id);
    await _saveNotifications();
  }

  /// Clear all notifications
  Future<void> clearAll() async {
    _notifications.clear();
    await _saveNotifications();
  }

  /// Get unread count
  int getUnreadCount() {
    return _notifications.where((n) => n['read'] == false).length;
  }

  /// Send incident notification (for auto-monitoring)
  Future<void> sendIncidentNotification({
    required int incidentId,
    required String type,
    required String severity,
  }) async {
    String title = '🚨 Traffic Incident Detected';
    String message = 'A $severity severity $type incident has been reported. Incident #$incidentId';
    
    await addNotification(
      title: title,
      message: message,
      type: 'incident',
    );
  }

  /// Send emergency notification (for auto-monitoring)
  Future<void> sendEmergencyNotification({
    required int emergencyId,
    required String type,
    required String severity,
  }) async {
    String title = '🚨 EMERGENCY ALERT';
    String message = 'Critical $type emergency detected! Police and admin notified. Emergency #$emergencyId';
    
    await addNotification(
      title: title,
      message: message,
      type: 'emergency',
    );
  }
}
