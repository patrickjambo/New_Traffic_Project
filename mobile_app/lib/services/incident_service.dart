import 'package:http/http.dart' as http;
import 'dart:convert';
import 'dart:io';
import '../config/app_config.dart';
import 'auth_service.dart';

class IncidentService {
  final AuthService _authService = AuthService();

  /// Report new incident
  Future<Map<String, dynamic>> reportIncident({
    required String type,
    required String severity,
    required double latitude,
    required double longitude,
    String? address,
    String? description,
    File? videoFile,
    bool isAnonymous = false,
  }) async {
    try {
      final token = await _authService.getToken();
      
      var request = http.MultipartRequest(
        'POST',
        Uri.parse('${AppConfig.baseUrl}${AppConfig.reportIncidentEndpoint}'),
      );

      // Add headers
      if (token != null && !isAnonymous) {
        request.headers['Authorization'] = 'Bearer $token';
      }

      // Add fields
      request.fields['type'] = type;
      request.fields['severity'] = severity;
      request.fields['latitude'] = latitude.toString();
      request.fields['longitude'] = longitude.toString();
      if (address != null) request.fields['address'] = address;
      if (description != null) request.fields['description'] = description;
      request.fields['isAnonymous'] = isAnonymous.toString();

      // Add video file if provided
      if (videoFile != null) {
        request.files.add(
          await http.MultipartFile.fromPath('video', videoFile.path),
        );
      }

      // Send request
      final streamedResponse = await request.send();
      final response = await http.Response.fromStream(streamedResponse);

      if (response.statusCode == 201) {
        final data = json.decode(response.body);
        return {'success': true, 'data': data['data']};
      } else {
        final error = json.decode(response.body);
        return {'success': false, 'message': error['message']};
      }
    } catch (e) {
      return {'success': false, 'message': 'Network error: $e'};
    }
  }

  /// Get nearby incidents
  Future<Map<String, dynamic>> getNearbyIncidents({
    required double latitude,
    required double longitude,
    double radius = AppConfig.nearbyIncidentsRadius,
    String? status,
    String? type,
    int limit = 20,
    int offset = 0,
  }) async {
    try {
      final queryParams = {
        'latitude': latitude.toString(),
        'longitude': longitude.toString(),
        'radius': radius.toString(),
        'limit': limit.toString(),
        'offset': offset.toString(),
      };

      if (status != null) queryParams['status'] = status;
      if (type != null) queryParams['type'] = type;

      final uri = Uri.parse('${AppConfig.baseUrl}${AppConfig.nearbyIncidentsEndpoint}')
          .replace(queryParameters: queryParams);

      final response = await http.get(uri);

      if (response.statusCode == 200) {
        final data = json.decode(response.body);
        return {'success': true, 'data': data['data']};
      } else {
        return {'success': false, 'message': 'Failed to fetch incidents'};
      }
    } catch (e) {
      return {'success': false, 'message': 'Network error: $e'};
    }
  }

  /// Get incident by ID
  Future<Map<String, dynamic>> getIncidentById(int id) async {
    try {
      final response = await http.get(
        Uri.parse('${AppConfig.baseUrl}${AppConfig.nearbyIncidentsEndpoint}/$id'),
      );

      if (response.statusCode == 200) {
        final data = json.decode(response.body);
        return {'success': true, 'data': data['data']};
      } else {
        return {'success': false, 'message': 'Incident not found'};
      }
    } catch (e) {
      return {'success': false, 'message': 'Network error: $e'};
    }
  }

  /// Update incident status (Police/Admin only)
  Future<Map<String, dynamic>> updateIncidentStatus({
    required int id,
    required String status,
    String? comment,
  }) async {
    try {
      final token = await _authService.getToken();
      if (token == null) {
        return {'success': false, 'message': 'Not authenticated'};
      }

      final response = await http.patch(
        Uri.parse('${AppConfig.baseUrl}${AppConfig.nearbyIncidentsEndpoint}/$id/status'),
        headers: {
          'Authorization': 'Bearer $token',
          'Content-Type': 'application/json',
        },
        body: json.encode({
          'status': status,
          if (comment != null) 'comment': comment,
        }),
      );

      if (response.statusCode == 200) {
        final data = json.decode(response.body);
        return {'success': true, 'data': data['data']};
      } else {
        final error = json.decode(response.body);
        return {'success': false, 'message': error['message']};
      }
    } catch (e) {
      return {'success': false, 'message': 'Network error: $e'};
    }
  }

  /// Get incidents reported by current user
  Future<Map<String, dynamic>> getUserIncidents({
    int limit = 20,
    int offset = 0,
  }) async {
    try {
      final token = await _authService.getToken();
      if (token == null) {
        return {'success': false, 'message': 'Not authenticated'};
      }

      final queryParams = {
        'limit': limit.toString(),
        'offset': offset.toString(),
      };

      final uri = Uri.parse('${AppConfig.baseUrl}${AppConfig.nearbyIncidentsEndpoint}/my-history')
          .replace(queryParameters: queryParams);

      final response = await http.get(
        uri,
        headers: {
          'Authorization': 'Bearer $token',
        },
      );

      if (response.statusCode == 200) {
        final data = json.decode(response.body);
        return {'success': true, 'data': data['data']};
      } else {
        return {'success': false, 'message': 'Failed to fetch history'};
      }
    } catch (e) {
      return {'success': false, 'message': 'Network error: $e'};
    }
  }

  /// Upload video for AI analysis and automatic incident creation
  /// This uses AI to detect incidents, determine severity, and create database entry automatically
  Future<Map<String, dynamic>> analyzeVideoAndCreateIncident({
    required File videoFile,
    required double latitude,
    required double longitude,
    Function(double)? onUploadProgress,
  }) async {
    try {
      final token = await _authService.getToken();
      
      var request = http.MultipartRequest(
        'POST',
        Uri.parse('${AppConfig.baseUrl}${AppConfig.nearbyIncidentsEndpoint}/analyze-video'),
      );

      // Add headers
      if (token != null) {
        request.headers['Authorization'] = 'Bearer $token';
      }

      // Add location data
      request.fields['latitude'] = latitude.toString();
      request.fields['longitude'] = longitude.toString();

      // Add video file
      request.files.add(
        await http.MultipartFile.fromPath('video', videoFile.path),
      );

      // Send request
      final streamedResponse = await request.send();
      
      // Track upload progress if callback provided
      if (onUploadProgress != null) {
        streamedResponse.stream.listen(
          (value) {
            // Calculate progress percentage
            final progress = (value.length / videoFile.lengthSync()) * 100;
            onUploadProgress(progress.clamp(0, 100));
          },
        );
      }

      final response = await http.Response.fromStream(streamedResponse);

      if (response.statusCode == 200) {
        final data = json.decode(response.body);
        return {
          'success': true,
          'data': data['data'],
          'message': data['message'] ?? 'Video analyzed successfully',
        };
      } else if (response.statusCode == 503) {
        return {
          'success': false,
          'message': 'AI service is currently unavailable. Please try again later.',
        };
      } else {
        final error = json.decode(response.body);
        return {
          'success': false,
          'message': error['message'] ?? 'Failed to analyze video',
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
