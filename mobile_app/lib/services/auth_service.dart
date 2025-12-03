import 'package:http/http.dart' as http;
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'dart:convert';
import '../config/app_config.dart';
import 'dart:async';

class AuthService {
  static const String _tokenKey = 'auth_token';
  static const String _userKey = 'user_data';
  
  // Secure storage for tokens
  final _secureStorage = const FlutterSecureStorage();
  
  // Stream controller for auth state changes
  final _authStateController = StreamController<bool>.broadcast();
  Stream<bool> get authStateChanges => _authStateController.stream;

  /// Login user
  Future<Map<String, dynamic>> login(String email, String password) async {
    try {
      final response = await http.post(
        Uri.parse('${AppConfig.baseUrl}${AppConfig.loginEndpoint}'),
        headers: {'Content-Type': 'application/json'},
        body: json.encode({
          'email': email,
          'password': password,
        }),
      );

      if (response.statusCode == 200) {
        final data = json.decode(response.body);
        
        // Save token and user data securely
        await _saveAuthData(
          data['data']['token'],
          data['data']['user'],
        );
        
        _authStateController.add(true);
        return {'success': true, 'data': data['data']};
      } else {
        final error = json.decode(response.body);
        return {'success': false, 'message': error['message']};
      }
    } catch (e) {
      return {'success': false, 'message': 'Network error: $e'};
    }
  }

  /// Register new user
  Future<Map<String, dynamic>> register({
    required String email,
    required String password,
    required String fullName,
    String? phone,
  }) async {
    try {
      final response = await http.post(
        Uri.parse('${AppConfig.baseUrl}${AppConfig.registerEndpoint}'),
        headers: {'Content-Type': 'application/json'},
        body: json.encode({
          'email': email,
          'password': password,
          'fullName': fullName,
          'phone': phone,
          'role': 'public',
        }),
      );

      if (response.statusCode == 201) {
        final data = json.decode(response.body);
        
        // Save token and user data securely
        await _saveAuthData(
          data['data']['token'],
          data['data']['user'],
        );
        
        _authStateController.add(true);
        return {'success': true, 'data': data['data']};
      } else {
        final error = json.decode(response.body);
        return {'success': false, 'message': error['message']};
      }
    } catch (e) {
      return {'success': false, 'message': 'Network error: $e'};
    }
  }

  /// Get current user profile
  Future<Map<String, dynamic>> getProfile() async {
    try {
      final token = await getToken();
      if (token == null) {
        return {'success': false, 'message': 'Not authenticated'};
      }

      final response = await http.get(
        Uri.parse('${AppConfig.baseUrl}${AppConfig.profileEndpoint}'),
        headers: {
          'Authorization': 'Bearer $token',
        },
      );

      if (response.statusCode == 200) {
        final data = json.decode(response.body);
        return {'success': true, 'data': data['data']};
      } else {
        // Token might be invalid
        if (response.statusCode == 401) {
          await logout();
        }
        return {'success': false, 'message': 'Failed to fetch profile'};
      }
    } catch (e) {
      return {'success': false, 'message': 'Network error: $e'};
    }
  }

  /// Logout user
  Future<void> logout() async {
    await _secureStorage.delete(key: _tokenKey);
    await _secureStorage.delete(key: _userKey);
    _authStateController.add(false);
  }

  /// Check if user is authenticated
  Future<bool> isAuthenticated() async {
    final token = await getToken();
    return token != null && token.isNotEmpty;
  }

  /// Get saved token from secure storage
  Future<String?> getToken() async {
    return await _secureStorage.read(key: _tokenKey);
  }

  /// Get saved user data from secure storage
  Future<Map<String, dynamic>?> getUserData() async {
    final userJson = await _secureStorage.read(key: _userKey);
    if (userJson != null && userJson.isNotEmpty) {
      return json.decode(userJson);
    }
    return null;
  }

  /// Save authentication data to secure storage
  Future<void> _saveAuthData(String token, Map<String, dynamic> user) async {
    await _secureStorage.write(key: _tokenKey, value: token);
    await _secureStorage.write(key: _userKey, value: json.encode(user));
  }

  /// Dispose method
  void dispose() {
    _authStateController.close();
  }
}
