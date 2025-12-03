import 'package:http/http.dart' as http;
import 'dart:convert';
import '../config/app_config.dart';
import 'auth_service.dart';

/// Emergency Service - Handles emergency-related API calls
class EmergencyService {
  final AuthService _authService = AuthService();

  /// Create new emergency report
  Future<Map<String, dynamic>> createEmergency({
    required String emergencyType,
    required String severity,
    required String locationName,
    required double latitude,
    required double longitude,
    required String description,
    required List<String> servicesNeeded,
    required String contactPhone,
    int casualtiesCount = 0,
    int vehiclesInvolved = 0,
  }) async {
    try {
      final token = await _authService.getToken();
      
      final Map<String, String> headers = {
        'Content-Type': 'application/json',
      };
      
      if (token != null) {
        headers['Authorization'] = 'Bearer $token';
      }
      
      final response = await http.post(
        Uri.parse('${AppConfig.baseUrl}/api/emergency'),
        headers: headers,
        body: json.encode({
          'emergencyType': emergencyType,
          'severity': severity,
          'locationName': locationName,
          'latitude': latitude,
          'longitude': longitude,
          'description': description,
          'casualtiesCount': casualtiesCount,
          'vehiclesInvolved': vehiclesInvolved,
          'servicesNeeded': servicesNeeded,
          'contactPhone': contactPhone,
        }),
      );

      if (response.statusCode == 201) {
        final data = json.decode(response.body);
        return {
          'success': true,
          'data': data['data'],
          'message': 'Emergency reported successfully',
        };
      } else {
        final error = json.decode(response.body);
        return {
          'success': false,
          'message': error['message'] ?? 'Failed to report emergency',
        };
      }
    } catch (e) {
      return {
        'success': false,
        'message': 'Network error: $e',
      };
    }
  }

  /// Get all emergencies (with optional filters)
  Future<Map<String, dynamic>> getEmergencies({
    String? status,
    String? severity,
    double? latitude,
    double? longitude,
    double? radius,
    int limit = 20,
    int offset = 0,
  }) async {
    try {
      final queryParams = <String, String>{
        'limit': limit.toString(),
        'offset': offset.toString(),
      };

      if (status != null) queryParams['status'] = status;
      if (severity != null) queryParams['severity'] = severity;
      if (latitude != null) queryParams['latitude'] = latitude.toString();
      if (longitude != null) queryParams['longitude'] = longitude.toString();
      if (radius != null) queryParams['radius'] = radius.toString();

      final uri = Uri.parse('${AppConfig.baseUrl}/api/emergency')
          .replace(queryParameters: queryParams);

      final response = await http.get(uri);

      if (response.statusCode == 200) {
        final data = json.decode(response.body);
        return {
          'success': true,
          'data': data['data'],
          'total': data['total'],
        };
      } else {
        return {
          'success': false,
          'message': 'Failed to fetch emergencies',
        };
      }
    } catch (e) {
      return {
        'success': false,
        'message': 'Network error: $e',
      };
    }
  }

  /// Get emergency by ID
  Future<Map<String, dynamic>> getEmergencyById(int id) async {
    try {
      final response = await http.get(
        Uri.parse('${AppConfig.baseUrl}/api/emergency/$id'),
      );

      if (response.statusCode == 200) {
        final data = json.decode(response.body);
        return {
          'success': true,
          'data': data['data'],
        };
      } else {
        return {
          'success': false,
          'message': 'Emergency not found',
        };
      }
    } catch (e) {
      return {
        'success': false,
        'message': 'Network error: $e',
      };
    }
  }

  /// Get user's emergencies
  Future<Map<String, dynamic>> getMyEmergencies() async {
    try {
      final token = await _authService.getToken();
      if (token == null) {
        return {
          'success': false,
          'message': 'Not authenticated',
        };
      }

      final response = await http.get(
        Uri.parse('${AppConfig.baseUrl}/api/emergency/my-emergencies'),
        headers: {
          'Authorization': 'Bearer $token',
        },
      );

      if (response.statusCode == 200) {
        final data = json.decode(response.body);
        return {
          'success': true,
          'data': data['data'],
        };
      } else {
        return {
          'success': false,
          'message': 'Failed to fetch emergencies',
        };
      }
    } catch (e) {
      return {
        'success': false,
        'message': 'Network error: $e',
      };
    }
  }

  /// Update emergency status (Police/Admin only)
  Future<Map<String, dynamic>> updateEmergencyStatus({
    required int id,
    required String status,
    String? notes,
  }) async {
    try {
      final token = await _authService.getToken();
      if (token == null) {
        return {
          'success': false,
          'message': 'Not authenticated',
        };
      }

      final response = await http.put(
        Uri.parse('${AppConfig.baseUrl}/api/emergency/$id/status'),
        headers: {
          'Authorization': 'Bearer $token',
          'Content-Type': 'application/json',
        },
        body: json.encode({
          'status': status,
          if (notes != null) 'notes': notes,
        }),
      );

      if (response.statusCode == 200) {
        final data = json.decode(response.body);
        return {
          'success': true,
          'data': data['data'],
          'message': 'Status updated successfully',
        };
      } else {
        final error = json.decode(response.body);
        return {
          'success': false,
          'message': error['message'] ?? 'Failed to update status',
        };
      }
    } catch (e) {
      return {
        'success': false,
        'message': 'Network error: $e',
      };
    }
  }

  /// Get emergency statistics (Admin only)
  Future<Map<String, dynamic>> getEmergencyStats() async {
    try {
      final token = await _authService.getToken();
      if (token == null) {
        return {
          'success': false,
          'message': 'Not authenticated',
        };
      }

      final response = await http.get(
        Uri.parse('${AppConfig.baseUrl}/api/emergency/stats'),
        headers: {
          'Authorization': 'Bearer $token',
        },
      );

      if (response.statusCode == 200) {
        final data = json.decode(response.body);
        return {
          'success': true,
          'data': data['data'],
        };
      } else {
        return {
          'success': false,
          'message': 'Failed to fetch stats',
        };
      }
    } catch (e) {
      return {
        'success': false,
        'message': 'Network error: $e',
      };
    }
  }

  /// Get nearby emergencies (within radius)
  Future<Map<String, dynamic>> getNearbyEmergencies({
    required double latitude,
    required double longitude,
    double radius = 5.0, // km
    String? status,
  }) async {
    try {
      final queryParams = <String, String>{
        'latitude': latitude.toString(),
        'longitude': longitude.toString(),
        'radius': radius.toString(),
      };

      if (status != null) queryParams['status'] = status;

      final uri = Uri.parse('${AppConfig.baseUrl}/api/emergency')
          .replace(queryParameters: queryParams);

      final response = await http.get(uri);

      if (response.statusCode == 200) {
        final data = json.decode(response.body);
        return {
          'success': true,
          'data': data['data'],
        };
      } else {
        return {
          'success': false,
          'message': 'Failed to fetch nearby emergencies',
        };
      }
    } catch (e) {
      return {
        'success': false,
        'message': 'Network error: $e',
      };
    }
  }
}
