import 'package:flutter/material.dart';
import 'package:flutter/scheduler.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'dart:async';

/// ThemeNotifier - Handles instant theme switching without app restart
class ThemeNotifier extends ChangeNotifier {
  bool _isDarkMode = false;
  bool _useSystemTheme = true;
  Color _primaryColor = const Color(0xFF2563EB);
  
  bool get isDarkMode => _isDarkMode;
  bool get useSystemTheme => _useSystemTheme;
  Color get primaryColor => _primaryColor;
  
  ThemeMode get themeMode {
    if (_useSystemTheme) return ThemeMode.system;
    return _isDarkMode ? ThemeMode.dark : ThemeMode.light;
  }
  
  Future<void> initialize() async {
    final prefs = await SharedPreferences.getInstance();
    _isDarkMode = prefs.getBool('dark_mode_enabled') ?? false;
    _useSystemTheme = prefs.getBool('use_system_theme') ?? false;
    _primaryColor = Color(prefs.getInt('primary_color') ?? 0xFF2563EB);
    
    // If using system theme, check system brightness
    if (_useSystemTheme) {
      _isDarkMode = SchedulerBinding.instance.platformDispatcher.platformBrightness == Brightness.dark;
    }
    
    notifyListeners();
  }
  
  /// Toggle dark mode instantly - THE KEY METHOD
  Future<void> toggleDarkMode(bool value) async {
    _isDarkMode = value;
    _useSystemTheme = false;
    
    final prefs = await SharedPreferences.getInstance();
    await prefs.setBool('dark_mode_enabled', value);
    await prefs.setBool('use_system_theme', false);
    
    // INSTANT NOTIFICATION - UI rebuilds immediately
    notifyListeners();
  }
  
  /// Set to follow system theme
  Future<void> useSystem() async {
    _useSystemTheme = true;
    _isDarkMode = SchedulerBinding.instance.platformDispatcher.platformBrightness == Brightness.dark;
    
    final prefs = await SharedPreferences.getInstance();
    await prefs.setBool('use_system_theme', true);
    
    notifyListeners();
  }
  
  /// Update primary color
  Future<void> setPrimaryColor(Color color) async {
    _primaryColor = color;
    
    final prefs = await SharedPreferences.getInstance();
    await prefs.setInt('primary_color', color.value);
    
    notifyListeners();
  }
}

/// ConnectionStatusNotifier - Tracks network and backend connection
class ConnectionStatusNotifier extends ChangeNotifier {
  bool _isOnline = true;
  bool _isReconnecting = false;
  bool _isConnectedToBackend = false;
  DateTime? _lastConnectedTime;
  
  bool get isOnline => _isOnline;
  bool get isReconnecting => _isReconnecting;
  bool get isConnectedToBackend => _isConnectedToBackend;
  DateTime? get lastConnectedTime => _lastConnectedTime;
  
  void setOnlineStatus(bool online) {
    if (_isOnline != online) {
      _isOnline = online;
      if (online) {
        _lastConnectedTime = DateTime.now();
      }
      notifyListeners();
    }
  }
  
  void setReconnecting(bool reconnecting) {
    if (_isReconnecting != reconnecting) {
      _isReconnecting = reconnecting;
      notifyListeners();
    }
  }
  
  void setBackendConnected(bool connected) {
    if (_isConnectedToBackend != connected) {
      _isConnectedToBackend = connected;
      notifyListeners();
    }
  }
}

/// Global App State Manager - Manages theme, settings, and real-time updates
/// without requiring app restart
class AppStateManager extends ChangeNotifier {
  static final AppStateManager _instance = AppStateManager._internal();
  factory AppStateManager() => _instance;
  AppStateManager._internal();

  // Separate notifiers for fine-grained listening
  final ThemeNotifier theme = ThemeNotifier();
  final ConnectionStatusNotifier connection = ConnectionStatusNotifier();

  // ==================== THEME STATE ====================
  ThemeMode _themeMode = ThemeMode.system;
  bool _useSystemTheme = true;
  Color _primaryColor = const Color(0xFF2563EB);
  double _fontSize = 1.0; // Scale factor

  // ==================== USER PREFERENCES ====================
  bool _notificationsEnabled = true;
  bool _locationEnabled = true;
  bool _soundEnabled = true;
  bool _vibrationEnabled = true;
  bool _autoRefresh = true;
  int _refreshInterval = 30; // seconds
  String _language = 'en';
  
  // ==================== CONNECTION STATE ====================
  bool _isOnline = true;
  bool _isConnectedToBackend = false;
  bool _isConnectedToWebSocket = false;
  DateTime? _lastSyncTime;

  // ==================== REAL-TIME DATA ====================
  int _unreadNotifications = 0;
  int _pendingDeployments = 0;
  int _activeIncidents = 0;
  List<Map<String, dynamic>> _recentAlerts = [];

  // ==================== ANIMATION SETTINGS ====================
  bool _reduceMotion = false;
  Duration _animationDuration = const Duration(milliseconds: 300);

  // SharedPreferences keys
  static const String _keyThemeMode = 'theme_mode';
  static const String _keyUseSystemTheme = 'use_system_theme';
  static const String _keyPrimaryColor = 'primary_color';
  static const String _keyFontSize = 'font_size';
  static const String _keyNotifications = 'notifications_enabled';
  static const String _keyLocation = 'location_enabled';
  static const String _keySound = 'sound_enabled';
  static const String _keyVibration = 'vibration_enabled';
  static const String _keyAutoRefresh = 'auto_refresh';
  static const String _keyRefreshInterval = 'refresh_interval';
  static const String _keyLanguage = 'language';
  static const String _keyReduceMotion = 'reduce_motion';

  // ==================== GETTERS ====================
  ThemeMode get themeMode => _themeMode;
  bool get useSystemTheme => _useSystemTheme;
  Color get primaryColor => _primaryColor;
  double get fontSize => _fontSize;
  bool get notificationsEnabled => _notificationsEnabled;
  bool get locationEnabled => _locationEnabled;
  bool get soundEnabled => _soundEnabled;
  bool get vibrationEnabled => _vibrationEnabled;
  bool get autoRefresh => _autoRefresh;
  int get refreshInterval => _refreshInterval;
  String get language => _language;
  bool get isOnline => _isOnline;
  bool get isConnectedToBackend => _isConnectedToBackend;
  bool get isConnectedToWebSocket => _isConnectedToWebSocket;
  DateTime? get lastSyncTime => _lastSyncTime;
  int get unreadNotifications => _unreadNotifications;
  int get pendingDeployments => _pendingDeployments;
  int get activeIncidents => _activeIncidents;
  List<Map<String, dynamic>> get recentAlerts => _recentAlerts;
  bool get reduceMotion => _reduceMotion;
  Duration get animationDuration => _reduceMotion 
      ? Duration.zero 
      : _animationDuration;
  
  bool get isDarkMode {
    if (_useSystemTheme) {
      return SchedulerBinding.instance.platformDispatcher.platformBrightness == Brightness.dark;
    }
    return _themeMode == ThemeMode.dark;
  }

  // ==================== INITIALIZATION ====================
  Future<void> initialize() async {
    // Initialize child notifiers
    await theme.initialize();
    
    final prefs = await SharedPreferences.getInstance();
    
    // Load theme settings
    final themeModeStr = prefs.getString(_keyThemeMode) ?? 'system';
    _themeMode = _themeModeFromString(themeModeStr);
    _useSystemTheme = prefs.getBool(_keyUseSystemTheme) ?? true;
    _primaryColor = Color(prefs.getInt(_keyPrimaryColor) ?? 0xFF2563EB);
    _fontSize = prefs.getDouble(_keyFontSize) ?? 1.0;
    
    // Load user preferences
    _notificationsEnabled = prefs.getBool(_keyNotifications) ?? true;
    _locationEnabled = prefs.getBool(_keyLocation) ?? true;
    _soundEnabled = prefs.getBool(_keySound) ?? true;
    _vibrationEnabled = prefs.getBool(_keyVibration) ?? true;
    _autoRefresh = prefs.getBool(_keyAutoRefresh) ?? true;
    _refreshInterval = prefs.getInt(_keyRefreshInterval) ?? 30;
    _language = prefs.getString(_keyLanguage) ?? 'en';
    _reduceMotion = prefs.getBool(_keyReduceMotion) ?? false;

    notifyListeners();
  }

  ThemeMode _themeModeFromString(String mode) {
    switch (mode) {
      case 'light': return ThemeMode.light;
      case 'dark': return ThemeMode.dark;
      default: return ThemeMode.system;
    }
  }

  String _themeModeToString(ThemeMode mode) {
    switch (mode) {
      case ThemeMode.light: return 'light';
      case ThemeMode.dark: return 'dark';
      default: return 'system';
    }
  }

  // ==================== THEME METHODS ====================
  
  /// Toggle between dark and light mode instantly
  Future<void> toggleDarkMode() async {
    if (_themeMode == ThemeMode.dark) {
      await setThemeMode(ThemeMode.light);
    } else {
      await setThemeMode(ThemeMode.dark);
    }
  }

  /// Set theme mode (light, dark, or system)
  Future<void> setThemeMode(ThemeMode mode) async {
    _themeMode = mode;
    _useSystemTheme = mode == ThemeMode.system;
    
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString(_keyThemeMode, _themeModeToString(mode));
    await prefs.setBool(_keyUseSystemTheme, _useSystemTheme);
    
    notifyListeners();
  }

  /// Set dark mode enabled/disabled
  Future<void> setDarkMode(bool enabled) async {
    await setThemeMode(enabled ? ThemeMode.dark : ThemeMode.light);
  }

  /// Set primary color theme
  Future<void> setPrimaryColor(Color color) async {
    _primaryColor = color;
    
    final prefs = await SharedPreferences.getInstance();
    await prefs.setInt(_keyPrimaryColor, color.value);
    
    notifyListeners();
  }

  /// Set font scale
  Future<void> setFontSize(double scale) async {
    _fontSize = scale.clamp(0.8, 1.4);
    
    final prefs = await SharedPreferences.getInstance();
    await prefs.setDouble(_keyFontSize, _fontSize);
    
    notifyListeners();
  }

  // ==================== USER PREFERENCE METHODS ====================

  Future<void> setNotificationsEnabled(bool enabled) async {
    _notificationsEnabled = enabled;
    final prefs = await SharedPreferences.getInstance();
    await prefs.setBool(_keyNotifications, enabled);
    notifyListeners();
  }

  Future<void> setLocationEnabled(bool enabled) async {
    _locationEnabled = enabled;
    final prefs = await SharedPreferences.getInstance();
    await prefs.setBool(_keyLocation, enabled);
    notifyListeners();
  }

  Future<void> setSoundEnabled(bool enabled) async {
    _soundEnabled = enabled;
    final prefs = await SharedPreferences.getInstance();
    await prefs.setBool(_keySound, enabled);
    notifyListeners();
  }

  Future<void> setVibrationEnabled(bool enabled) async {
    _vibrationEnabled = enabled;
    final prefs = await SharedPreferences.getInstance();
    await prefs.setBool(_keyVibration, enabled);
    notifyListeners();
  }

  Future<void> setAutoRefresh(bool enabled) async {
    _autoRefresh = enabled;
    final prefs = await SharedPreferences.getInstance();
    await prefs.setBool(_keyAutoRefresh, enabled);
    notifyListeners();
  }

  Future<void> setRefreshInterval(int seconds) async {
    _refreshInterval = seconds;
    final prefs = await SharedPreferences.getInstance();
    await prefs.setInt(_keyRefreshInterval, seconds);
    notifyListeners();
  }

  Future<void> setReduceMotion(bool reduce) async {
    _reduceMotion = reduce;
    final prefs = await SharedPreferences.getInstance();
    await prefs.setBool(_keyReduceMotion, reduce);
    notifyListeners();
  }

  // ==================== CONNECTION STATE METHODS ====================

  void setOnlineStatus(bool online) {
    if (_isOnline != online) {
      _isOnline = online;
      notifyListeners();
    }
  }

  void setBackendConnection(bool connected) {
    if (_isConnectedToBackend != connected) {
      _isConnectedToBackend = connected;
      if (connected) _lastSyncTime = DateTime.now();
      notifyListeners();
    }
  }

  void setWebSocketConnection(bool connected) {
    if (_isConnectedToWebSocket != connected) {
      _isConnectedToWebSocket = connected;
      notifyListeners();
    }
  }

  // ==================== REAL-TIME DATA METHODS ====================

  void updateUnreadNotifications(int count) {
    if (_unreadNotifications != count) {
      _unreadNotifications = count;
      notifyListeners();
    }
  }

  void incrementUnreadNotifications() {
    _unreadNotifications++;
    notifyListeners();
  }

  void clearUnreadNotifications() {
    _unreadNotifications = 0;
    notifyListeners();
  }

  void updatePendingDeployments(int count) {
    if (_pendingDeployments != count) {
      _pendingDeployments = count;
      notifyListeners();
    }
  }

  void updateActiveIncidents(int count) {
    if (_activeIncidents != count) {
      _activeIncidents = count;
      notifyListeners();
    }
  }

  void addAlert(Map<String, dynamic> alert) {
    _recentAlerts.insert(0, alert);
    if (_recentAlerts.length > 50) {
      _recentAlerts = _recentAlerts.sublist(0, 50);
    }
    _unreadNotifications++;
    notifyListeners();
  }

  void clearAlerts() {
    _recentAlerts.clear();
    notifyListeners();
  }

  // ==================== PRESET THEMES ====================

  static const Map<String, Color> presetColors = {
    'Blue': Color(0xFF2563EB),
    'Green': Color(0xFF10B981),
    'Purple': Color(0xFF8B5CF6),
    'Orange': Color(0xFFF59E0B),
    'Red': Color(0xFFEF4444),
    'Teal': Color(0xFF14B8A6),
    'Pink': Color(0xFFEC4899),
    'Indigo': Color(0xFF6366F1),
  };

  // ==================== THEME DATA BUILDERS ====================

  ThemeData buildLightTheme() {
    return ThemeData(
      useMaterial3: true,
      brightness: Brightness.light,
      colorScheme: ColorScheme.fromSeed(
        seedColor: _primaryColor,
        brightness: Brightness.light,
      ),
      appBarTheme: AppBarTheme(
        elevation: 0,
        centerTitle: true,
        backgroundColor: _primaryColor,
        foregroundColor: Colors.white,
      ),
      cardTheme: CardThemeData(
        elevation: 2,
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(16),
        ),
      ),
      floatingActionButtonTheme: FloatingActionButtonThemeData(
        backgroundColor: _primaryColor,
        foregroundColor: Colors.white,
        elevation: 4,
      ),
      inputDecorationTheme: InputDecorationTheme(
        border: OutlineInputBorder(
          borderRadius: BorderRadius.circular(12),
        ),
        filled: true,
        fillColor: Colors.grey.shade100,
      ),
      elevatedButtonTheme: ElevatedButtonThemeData(
        style: ElevatedButton.styleFrom(
          padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 12),
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(12),
          ),
        ),
      ),
      textTheme: _buildTextTheme(Brightness.light),
      pageTransitionsTheme: _buildPageTransitions(),
    );
  }

  ThemeData buildDarkTheme() {
    return ThemeData(
      useMaterial3: true,
      brightness: Brightness.dark,
      colorScheme: ColorScheme.fromSeed(
        seedColor: _primaryColor,
        brightness: Brightness.dark,
      ),
      scaffoldBackgroundColor: const Color(0xFF121212),
      appBarTheme: AppBarTheme(
        elevation: 0,
        centerTitle: true,
        backgroundColor: const Color(0xFF1E1E1E),
        foregroundColor: Colors.white,
      ),
      cardTheme: CardThemeData(
        elevation: 4,
        color: const Color(0xFF1E1E1E),
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(16),
        ),
      ),
      floatingActionButtonTheme: FloatingActionButtonThemeData(
        backgroundColor: _primaryColor,
        foregroundColor: Colors.white,
        elevation: 4,
      ),
      inputDecorationTheme: InputDecorationTheme(
        border: OutlineInputBorder(
          borderRadius: BorderRadius.circular(12),
        ),
        filled: true,
        fillColor: const Color(0xFF2D2D2D),
      ),
      elevatedButtonTheme: ElevatedButtonThemeData(
        style: ElevatedButton.styleFrom(
          padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 12),
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(12),
          ),
        ),
      ),
      bottomNavigationBarTheme: const BottomNavigationBarThemeData(
        backgroundColor: Color(0xFF1E1E1E),
      ),
      textTheme: _buildTextTheme(Brightness.dark),
      pageTransitionsTheme: _buildPageTransitions(),
    );
  }

  TextTheme _buildTextTheme(Brightness brightness) {
    final baseColor = brightness == Brightness.dark ? Colors.white : Colors.black;
    return TextTheme(
      displayLarge: TextStyle(fontSize: 32 * _fontSize, fontWeight: FontWeight.bold, color: baseColor),
      displayMedium: TextStyle(fontSize: 28 * _fontSize, fontWeight: FontWeight.bold, color: baseColor),
      displaySmall: TextStyle(fontSize: 24 * _fontSize, fontWeight: FontWeight.bold, color: baseColor),
      headlineLarge: TextStyle(fontSize: 22 * _fontSize, fontWeight: FontWeight.w600, color: baseColor),
      headlineMedium: TextStyle(fontSize: 20 * _fontSize, fontWeight: FontWeight.w600, color: baseColor),
      headlineSmall: TextStyle(fontSize: 18 * _fontSize, fontWeight: FontWeight.w600, color: baseColor),
      titleLarge: TextStyle(fontSize: 16 * _fontSize, fontWeight: FontWeight.w600, color: baseColor),
      titleMedium: TextStyle(fontSize: 14 * _fontSize, fontWeight: FontWeight.w500, color: baseColor),
      titleSmall: TextStyle(fontSize: 12 * _fontSize, fontWeight: FontWeight.w500, color: baseColor),
      bodyLarge: TextStyle(fontSize: 16 * _fontSize, color: baseColor),
      bodyMedium: TextStyle(fontSize: 14 * _fontSize, color: baseColor),
      bodySmall: TextStyle(fontSize: 12 * _fontSize, color: baseColor.withOpacity(0.7)),
      labelLarge: TextStyle(fontSize: 14 * _fontSize, fontWeight: FontWeight.w500, color: baseColor),
    );
  }

  PageTransitionsTheme _buildPageTransitions() {
    if (_reduceMotion) {
      return const PageTransitionsTheme(
        builders: {
          TargetPlatform.android: FadeUpwardsPageTransitionsBuilder(),
          TargetPlatform.iOS: FadeUpwardsPageTransitionsBuilder(),
        },
      );
    }
    return const PageTransitionsTheme(
      builders: {
        TargetPlatform.android: CupertinoPageTransitionsBuilder(),
        TargetPlatform.iOS: CupertinoPageTransitionsBuilder(),
      },
    );
  }
}
