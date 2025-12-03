import 'package:shared_preferences/shared_preferences.dart';

class SettingsService {
  static const String _keyNotifications = 'notifications_enabled';
  static const String _keyDarkMode = 'dark_mode_enabled';
  static const String _keyLocation = 'location_enabled';

  /// Get shared preferences instance
  Future<SharedPreferences> _getPrefs() async {
    return await SharedPreferences.getInstance();
  }

  /// Notifications
  Future<bool> getNotificationsEnabled() async {
    final prefs = await _getPrefs();
    return prefs.getBool(_keyNotifications) ?? true;
  }

  Future<void> setNotificationsEnabled(bool value) async {
    final prefs = await _getPrefs();
    await prefs.setBool(_keyNotifications, value);
  }

  /// Dark Mode
  Future<bool> getDarkModeEnabled() async {
    final prefs = await _getPrefs();
    return prefs.getBool(_keyDarkMode) ?? false;
  }

  Future<void> setDarkModeEnabled(bool value) async {
    final prefs = await _getPrefs();
    await prefs.setBool(_keyDarkMode, value);
  }

  /// Location Services
  Future<bool> getLocationEnabled() async {
    final prefs = await _getPrefs();
    return prefs.getBool(_keyLocation) ?? true;
  }

  Future<void> setLocationEnabled(bool value) async {
    final prefs = await _getPrefs();
    await prefs.setBool(_keyLocation, value);
  }

  /// Clear all settings
  Future<void> clearAll() async {
    final prefs = await _getPrefs();
    await prefs.clear();
  }
}
