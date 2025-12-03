import 'package:flutter/foundation.dart';
import 'environment.dart';

class AppConfig {
  // API Configuration - Use Environment for dynamic URLs
  static String get baseUrl => EnvironmentConfig.baseApiUrl;
  static String get aiServiceUrl => EnvironmentConfig.aiServiceUrl;
  
  // Google Maps API Key
  static const String googleMapsApiKey = 'YOUR_GOOGLE_MAPS_API_KEY_HERE';
  
  // App Configuration
  static const String appName = 'TrafficGuard AI';
  static const String appVersion = '1.0.0';
  
  // Video Configuration
  static const int maxVideoDuration = 30; // seconds
  static const int maxVideoSize = 50 * 1024 * 1024; // 50MB
  
  // Map Configuration - Kigali, Rwanda 🇷🇼
  static const double defaultLatitude = -1.9441;  // KN 3 Ave, Kigali CBD
  static const double defaultLongitude = 30.0619;
  static const double defaultZoom = 13.0;
  static const double nearbyIncidentsRadius = 5.0; // km
  
  // Kigali City Configuration
  static const String cityName = 'Kigali';
  static const String countryName = 'Rwanda';
  static const String countryCode = 'RW';
  static const String phonePrefix = '+250';
  
  // Rwanda Emergency Numbers
  static const String policeNumber = '112';
  static const String ambulanceNumber = '912';
  static const String fireNumber = '111';
  
  // Kigali Districts
  static const List<String> districts = [
    'Nyarugenge',
    'Gasabo',
    'Kicukiro',
  ];
  
  // Common Kigali Streets (for autocomplete)
  static const List<String> commonStreets = [
    'KN 3 Ave (CBD)',
    'KN 4 Ave (City Center)',
    'KN 2 Rd (Nyarugenge)',
    'KG 9 Ave (Kimihurura)',
    'KN 78 St (Kacyiru)',
    'KG 11 Ave (Remera)',
    'KN 5 Rd (Nyabugogo)',
    'Umuganda Blvd (Kimironko)',
  ];
  
  // Kigali High-Traffic Zones
  static const Map<String, Map<String, double>> kigaliZones = {
    'CBD': {'lat': -1.9441, 'lng': 30.0619},
    'Nyabugogo': {'lat': -1.9676, 'lng': 30.0439},
    'Kimihurura': {'lat': -1.9403, 'lng': 30.1067},
    'Remera': {'lat': -1.9547, 'lng': 30.1155},
    'Kacyiru': {'lat': -1.9559, 'lng': 30.0924},
    'Kimironko': {'lat': -1.9578, 'lng': 30.1122},
  };
  
  // API Endpoints
  static const String loginEndpoint = '/api/auth/login';
  static const String registerEndpoint = '/api/auth/register';
  static const String profileEndpoint = '/api/auth/profile';
  static const String reportIncidentEndpoint = '/api/incidents/report';
  static const String nearbyIncidentsEndpoint = '/api/incidents';
  
  // Colors
  static const int primaryColor = 0xFF2563EB; // Blue
  static const int accentColor = 0xFF10B981; // Green
  static const int errorColor = 0xFFEF4444; // Red
  static const int warningColor = 0xFFF59E0B; // Amber
  
  // Helper Methods for Kigali
  
  /// Get closest Kigali zone name from GPS coordinates
  static String getKigaliZoneName(double lat, double lng) {
    String closestZone = 'Kigali';
    double minDistance = double.infinity;
    
    kigaliZones.forEach((name, coords) {
      final distance = _calculateApproxDistance(
        lat, lng, 
        coords['lat']!, coords['lng']!
      );
      if (distance < minDistance) {
        minDistance = distance;
        closestZone = name;
      }
    });
    
    return closestZone;
  }
  
  /// Get district from GPS coordinates (approximate)
  static String getKigaliDistrict(double lat, double lng) {
    // Simple approximation based on GPS ranges
    if (lat >= -1.95 && lng <= 30.07) {
      return 'Nyarugenge'; // CBD and west
    } else if (lat < -1.95 && lng >= 30.08) {
      return 'Gasabo'; // North and east
    } else {
      return 'Kicukiro'; // South
    }
  }
  
  /// Format location name for Kigali
  static String formatKigaliLocation(double lat, double lng, {String? street}) {
    final zone = getKigaliZoneName(lat, lng);
    final district = getKigaliDistrict(lat, lng);
    
    if (street != null && street.isNotEmpty) {
      return '$street, $zone, $district District, Kigali';
    }
    return '$zone, $district District, Kigali';
  }
  
  /// Format phone number for Rwanda
  static String formatRwandaPhone(String phone) {
    // Remove any non-digit characters
    String cleaned = phone.replaceAll(RegExp(r'[^\d]'), '');
    
    // Remove leading zeros
    if (cleaned.startsWith('0')) {
      cleaned = cleaned.substring(1);
    }
    
    // Add Rwanda prefix if not present
    if (!cleaned.startsWith('250')) {
      cleaned = '250$cleaned';
    }
    
    return '+$cleaned';
  }
  
  /// Validate Rwanda phone number
  static bool isValidRwandaPhone(String phone) {
    final cleaned = phone.replaceAll(RegExp(r'[^\d]'), '');
    // Rwanda numbers: +250 7XX XXX XXX (9 digits after country code)
    return cleaned.length == 12 && cleaned.startsWith('250');
  }
  
  /// Calculate approximate distance (simple formula, good enough for nearby)
  static double _calculateApproxDistance(double lat1, double lng1, double lat2, double lng2) {
    final dLat = (lat2 - lat1).abs();
    final dLng = (lng2 - lng1).abs();
    return (dLat * dLat + dLng * dLng);
  }
}
