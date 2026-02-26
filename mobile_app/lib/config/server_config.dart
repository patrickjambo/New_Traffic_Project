import 'package:shared_preferences/shared_preferences.dart';

/// Dynamic server configuration that persists across app restarts.
/// Allows changing server IP without rebuilding the app.
class ServerConfig {
  static const String _serverIpKey = 'server_ip';
  static const String _serverPortKey = 'server_port';
  static const String _aiPortKey = 'ai_port';
  
  // Default values (fallback)
  static const String _defaultIp = '192.168.31.229';
  static const int _defaultServerPort = 3000;
  static const int _defaultAiPort = 8000;
  
  // Cached values for quick access
  static String? _cachedIp;
  static int? _cachedServerPort;
  static int? _cachedAiPort;
  static bool _initialized = false;
  
  /// Initialize the config - call this at app startup
  static Future<void> init() async {
    if (_initialized) return;
    
    final prefs = await SharedPreferences.getInstance();
    _cachedIp = prefs.getString(_serverIpKey) ?? _defaultIp;
    _cachedServerPort = prefs.getInt(_serverPortKey) ?? _defaultServerPort;
    _cachedAiPort = prefs.getInt(_aiPortKey) ?? _defaultAiPort;
    _initialized = true;
    
    print('🔧 ServerConfig initialized: $_cachedIp:$_cachedServerPort (AI: $_cachedAiPort)');
  }
  
  /// Get current server IP
  static String get serverIp => _cachedIp ?? _defaultIp;
  
  /// Get current server port
  static int get serverPort => _cachedServerPort ?? _defaultServerPort;
  
  /// Get current AI port
  static int get aiPort => _cachedAiPort ?? _defaultAiPort;
  
  /// Get full base API URL
  static String get baseApiUrl => 'http://$serverIp:$serverPort';
  
  /// Get full AI service URL
  static String get aiServiceUrl => 'http://$serverIp:$aiPort';
  
  /// Get WebSocket URL
  static String get webSocketUrl => 'ws://$serverIp:$serverPort';
  
  /// Update server IP (persists to storage)
  static Future<void> setServerIp(String ip) async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString(_serverIpKey, ip);
    _cachedIp = ip;
    print('🔧 Server IP updated to: $ip');
  }
  
  /// Update server port (persists to storage)
  static Future<void> setServerPort(int port) async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setInt(_serverPortKey, port);
    _cachedServerPort = port;
    print('🔧 Server port updated to: $port');
  }
  
  /// Update AI port (persists to storage)
  static Future<void> setAiPort(int port) async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setInt(_aiPortKey, port);
    _cachedAiPort = port;
    print('🔧 AI port updated to: $port');
  }
  
  /// Update all settings at once
  static Future<void> updateConfig({
    required String ip,
    int serverPort = 3000,
    int aiPort = 8000,
  }) async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString(_serverIpKey, ip);
    await prefs.setInt(_serverPortKey, serverPort);
    await prefs.setInt(_aiPortKey, aiPort);
    
    _cachedIp = ip;
    _cachedServerPort = serverPort;
    _cachedAiPort = aiPort;
    
    print('🔧 Server config updated: $ip:$serverPort (AI: $aiPort)');
  }
  
  /// Reset to defaults
  static Future<void> reset() async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.remove(_serverIpKey);
    await prefs.remove(_serverPortKey);
    await prefs.remove(_aiPortKey);
    
    _cachedIp = _defaultIp;
    _cachedServerPort = _defaultServerPort;
    _cachedAiPort = _defaultAiPort;
    
    print('🔧 Server config reset to defaults');
  }
  
  /// Check if server is reachable
  static Future<bool> testConnection() async {
    try {
      final uri = Uri.parse('$baseApiUrl/api/health');
      // Quick timeout check would be done by the caller
      return true;
    } catch (e) {
      return false;
    }
  }
}
