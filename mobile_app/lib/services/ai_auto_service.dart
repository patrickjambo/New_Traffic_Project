import 'package:http/http.dart' as http;
import 'dart:convert';
import 'dart:io';
import '../config/app_config.dart';
import 'auth_service.dart';

/// AI Auto Service - Handles automatic video analysis and reporting
/// - Sends video clips to AI engine for analysis
/// - Auto-creates incident reports
/// - Determines severity and incident type
/// - Returns structured AI analysis results
class AIAutoService {
  final AuthService _authService = AuthService();

  /// Analyze a single video clip automatically
  /// Returns: { success, data: { has_incident, incident_type, severity, confidence, ... } }
  Future<Map<String, dynamic>> analyzeVideoClip(File videoFile) async {
    try {
      final token = await _authService.getToken();

      var request = http.MultipartRequest(
        'POST',
        Uri.parse('${AppConfig.baseUrl}/api/incidents/analyze-video'),
      );

      if (token != null) {
        request.headers['Authorization'] = 'Bearer $token';
      }

      // Add video file
      request.files.add(
        await http.MultipartFile.fromPath(
          'video',
          videoFile.path,
        ),
      );

      // Add metadata
      request.fields['auto_mode'] = 'true';
      request.fields['clip_duration'] = '5';

      // Send request
      final streamedResponse = await request.send();
      final response = await http.Response.fromStream(streamedResponse);

      if (response.statusCode == 200 || response.statusCode == 201) {
        final data = json.decode(response.body);
        
        // Parse AI response
        final aiAnalysis = data['data'];
        
        return {
          'success': true,
          'data': {
            'has_incident': _hasIncident(aiAnalysis),
            'incident_type': _determineIncidentType(aiAnalysis),
            'severity': _determineSeverity(aiAnalysis),
            'confidence': aiAnalysis['confidence'] ?? 0.0,
            'description': _generateDescription(aiAnalysis),
            'detected_objects': aiAnalysis['detected_objects'] ?? [],
            'vehicles_count': _countVehicles(aiAnalysis),
            'estimated_casualties': _estimateCasualties(aiAnalysis),
            'requires_emergency': _requiresEmergency(aiAnalysis),
            'raw_analysis': aiAnalysis,
          },
        };
      } else {
        return {
          'success': false,
          'message': 'AI analysis failed: ${response.statusCode}',
        };
      }
    } catch (e) {
      return {
        'success': false,
        'message': 'Network error: $e',
      };
    }
  }

  /// Check if AI detected a REAL incident
  /// Only returns true for: fire, accident, traffic_jam, congestion (medium+)
  /// Ignores: normal scenes, people, houses, empty spaces, trees, etc.
  bool _hasIncident(Map<String, dynamic> aiAnalysis) {
    // Check the incident_detected flag from AI service (most reliable)
    if (aiAnalysis['incident_detected'] == true) {
      // Double-check: only accept real incident types
      final incidentType = (aiAnalysis['incident_type'] ?? 'none').toString().toLowerCase();
      final validIncidents = ['fire', 'accident', 'traffic_jam', 'congestion'];
      if (validIncidents.contains(incidentType)) {
        return true;
      }
    }
    
    // Check nested data structure (some endpoints wrap in 'data')
    if (aiAnalysis['data'] != null && aiAnalysis['data']['incident_detected'] == true) {
      final incidentType = (aiAnalysis['data']['incident_type'] ?? 'none').toString().toLowerCase();
      final validIncidents = ['fire', 'accident', 'traffic_jam', 'congestion'];
      if (validIncidents.contains(incidentType)) {
        return true;
      }
    }
    
    return false;
  }

  /// Determine incident type from AI analysis
  /// Only returns valid incident types: fire, accident, traffic_jam, congestion
  /// Returns 'none' if no real incident detected
  String _determineIncidentType(Map<String, dynamic> aiAnalysis) {
    // First, trust the AI service's incident_type if provided
    final aiIncidentType = (aiAnalysis['incident_type'] ?? '').toString().toLowerCase();
    final validIncidents = ['fire', 'accident', 'traffic_jam', 'congestion'];
    
    if (validIncidents.contains(aiIncidentType)) {
      return aiIncidentType;
    }
    
    // Check nested data
    if (aiAnalysis['data'] != null) {
      final nestedType = (aiAnalysis['data']['incident_type'] ?? '').toString().toLowerCase();
      if (validIncidents.contains(nestedType)) {
        return nestedType;
      }
    }
    
    // If AI didn't detect a valid incident type, return 'none'
    return 'none';
  }

  /// Determine severity level
  /// Trusts the AI service severity first, falls back to heuristics
  String _determineSeverity(Map<String, dynamic> aiAnalysis) {
    // Trust AI service severity if provided
    final aiSeverity = (aiAnalysis['severity'] ?? '').toString().toLowerCase();
    final validSeverities = ['critical', 'high', 'medium', 'low'];
    if (validSeverities.contains(aiSeverity) && aiSeverity != 'none') {
      return aiSeverity;
    }
    
    // Check nested data
    if (aiAnalysis['data'] != null) {
      final nestedSeverity = (aiAnalysis['data']['severity'] ?? '').toString().toLowerCase();
      if (validSeverities.contains(nestedSeverity) && nestedSeverity != 'none') {
        return nestedSeverity;
      }
    }
    
    // If no real incident, return 'low'
    final incidentType = _determineIncidentType(aiAnalysis);
    if (incidentType == 'none' || incidentType == 'normal') return 'low';
    
    // Fallback heuristics for when AI doesn't provide severity
    if (incidentType == 'fire') return 'critical';
    if (incidentType == 'accident') return 'high';
    if (incidentType == 'traffic_jam') return 'high';
    if (incidentType == 'congestion') return 'medium';
    
    return 'low';
  }

  /// Generate human-readable description
  String _generateDescription(Map<String, dynamic> aiAnalysis) {
    final incidentType = _determineIncidentType(aiAnalysis);
    final severity = _determineSeverity(aiAnalysis);
    final vehicleCount = _countVehicles(aiAnalysis);
    final confidence = aiAnalysis['confidence'] ?? 0.0;
    
    // No incident = no description needed
    if (incidentType == 'none' || incidentType == 'normal') {
      return 'No incident detected.';
    }
    
    String desc = '';
    
    switch (incidentType) {
      case 'fire':
        desc = 'Fire or smoke detected. Immediate response required.';
        break;
      case 'accident':
        desc = 'Traffic accident detected';
        if (vehicleCount > 0) {
          desc += ' involving $vehicleCount vehicle${vehicleCount > 1 ? 's' : ''}';
        }
        desc += '.';
        break;
      case 'traffic_jam':
        desc = 'Traffic jam detected';
        if (vehicleCount > 0) {
          desc += ' with $vehicleCount vehicles';
        }
        desc += '.';
        break;
      case 'congestion':
        desc = 'Traffic congestion detected';
        if (vehicleCount > 0) {
          desc += ' with $vehicleCount vehicles';
        }
        desc += '.';
        break;
      default:
        desc = 'Incident detected.';
    }
    
    desc += ' AI confidence: ${(confidence * 100).toStringAsFixed(1)}%.';
    desc += ' Severity: $severity.';
    
    return desc;
  }

  /// Count vehicles in detected objects
  int _countVehicles(Map<String, dynamic> aiAnalysis) {
    final detectedObjects = aiAnalysis['detected_objects'] ?? [];
    final vehicleTypes = ['car', 'truck', 'bus', 'motorcycle', 'vehicle', 'van', 'taxi'];
    
    int count = 0;
    for (var obj in detectedObjects) {
      final name = obj['name']?.toString().toLowerCase() ?? '';
      if (vehicleTypes.any((type) => name.contains(type))) {
        count++;
      }
    }
    
    return count;
  }

  /// Estimate casualties (basic heuristic)
  int _estimateCasualties(Map<String, dynamic> aiAnalysis) {
    final severity = _determineSeverity(aiAnalysis);
    final vehicleCount = _countVehicles(aiAnalysis);
    final detectedObjects = aiAnalysis['detected_objects'] ?? [];
    
    // Check for person detection
    int personCount = 0;
    for (var obj in detectedObjects) {
      final name = obj['name']?.toString().toLowerCase() ?? '';
      if (name.contains('person') || name.contains('people') || name.contains('pedestrian')) {
        personCount++;
      }
    }
    
    // Estimate based on severity and vehicles
    if (severity == 'critical') {
      return vehicleCount * 2 + personCount;
    } else if (severity == 'high') {
      return vehicleCount + personCount;
    } else if (personCount > 0) {
      return personCount;
    }
    
    return 0;
  }

  /// Check if situation requires emergency response
  /// Only for confirmed real incidents
  bool _requiresEmergency(Map<String, dynamic> aiAnalysis) {
    final severity = _determineSeverity(aiAnalysis);
    final incidentType = _determineIncidentType(aiAnalysis);
    
    // No emergency for non-incidents
    if (incidentType == 'none' || incidentType == 'normal') return false;
    
    // Always create emergency for:
    // - Critical severity
    // - Fire incidents
    // - High severity accidents
    
    if (severity == 'critical') return true;
    if (incidentType == 'fire') return true;
    if (incidentType == 'medical') return true;
    if (severity == 'high' && incidentType == 'accident') return true;
    
    return false;
  }

  /// Create incident report automatically
  Future<Map<String, dynamic>> createIncidentReport({
    required String videoPath,
    required Map<String, dynamic> aiData,
  }) async {
    try {
      final token = await _authService.getToken();

      final response = await http.post(
        Uri.parse('${AppConfig.baseUrl}/api/incidents/report'),
        headers: {
          'Content-Type': 'application/json',
          if (token != null) 'Authorization': 'Bearer $token',
        },
        body: json.encode({
          'type': aiData['incident_type'] ?? 'traffic',
          'severity': aiData['severity'] ?? 'medium',
          'description': aiData['description'] ?? 'Auto-detected incident',
          'location': 'Auto-detected location',
          'latitude': 0.3476, // TODO: Get actual GPS
          'longitude': 32.5825,
          'aiConfidence': aiData['confidence'] ?? 0.0,
          'aiMetadata': {
            'detected_objects': aiData['detected_objects'] ?? [],
            'vehicles_count': aiData['vehicles_count'] ?? 0,
            'estimated_casualties': aiData['estimated_casualties'] ?? 0,
            'auto_generated': true,
            'clip_duration': 5,
          },
          'videoUrl': videoPath,
          'status': 'pending',
        }),
      );

      if (response.statusCode == 200 || response.statusCode == 201) {
        final data = json.decode(response.body);
        return {
          'success': true,
          'data': data['data'],
        };
      } else {
        return {
          'success': false,
          'message': 'Failed to create report: ${response.statusCode}',
        };
      }
    } catch (e) {
      return {
        'success': false,
        'message': 'Error creating report: $e',
      };
    }
  }

  /// Get monitoring statistics
  Future<Map<String, dynamic>> getMonitoringStats() async {
    try {
      final token = await _authService.getToken();

      final response = await http.get(
        Uri.parse('${AppConfig.baseUrl}/api/incidents/stats'),
        headers: {
          if (token != null) 'Authorization': 'Bearer $token',
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
          'message': 'Failed to get stats',
        };
      }
    } catch (e) {
      return {
        'success': false,
        'message': 'Error: $e',
      };
    }
  }
}
