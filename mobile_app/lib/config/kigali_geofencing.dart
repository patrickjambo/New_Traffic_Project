/// Kigali Geo-Fencing Configuration
/// Defines district boundaries and zones for location-based alerting
/// 
/// Coordinate reference: WGS84 (EPSG:4326)
/// Units: Decimal degrees
library;

class KigaliGeoFencing {
  // ============================================================
  // KIGALI DISTRICTS
  // ============================================================
  
  static const Map<String, DistrictBoundary> districts = {
    'Nyarugenge': DistrictBoundary(
      id: 1,
      name: 'Nyarugenge',
      code: 'NYA',
      centerLat: -1.9536,
      centerLng: 30.0606,
      approximateRadiusKm: 5.0,
      sectors: ['Nyarugenge', 'Nyamirambo', 'Gitega', 'Kimisagara', 'Rwezamenyo', 'Nyakabanda', 'Biryogo', 'Muhima', 'Mageragere', 'Kanyinya'],
    ),
    'Gasabo': DistrictBoundary(
      id: 2,
      name: 'Gasabo',
      code: 'GAS',
      centerLat: -1.9147,
      centerLng: 30.1045,
      approximateRadiusKm: 8.0,
      sectors: ['Remera', 'Kimihurura', 'Kacyiru', 'Kimironko', 'Gisozi', 'Kinyinya', 'Ndera', 'Rutunga', 'Jabana', 'Bumbogo', 'Nduba', 'Rusororo', 'Gikomero', 'Jali', 'Gatsata'],
    ),
    'Kicukiro': DistrictBoundary(
      id: 3,
      name: 'Kicukiro',
      code: 'KIC',
      centerLat: -1.9876,
      centerLng: 30.1029,
      approximateRadiusKm: 6.0,
      sectors: ['Gikondo', 'Niboye', 'Kicukiro', 'Kagarama', 'Gahanga', 'Kanombe', 'Masaka', 'Kigarama', 'Nyarugunga', 'Gatenga'],
    ),
  };

  // ============================================================
  // HIGH-TRAFFIC ZONES (Known hotspots in Kigali)
  // ============================================================
  
  static const Map<String, GeoPoint> highTrafficZones = {
    'CBD': GeoPoint(-1.9441, 30.0619, 'Kigali CBD - City Center'),
    'Nyabugogo': GeoPoint(-1.9676, 30.0439, 'Nyabugogo Bus Terminal'),
    'Kimihurura': GeoPoint(-1.9403, 30.1067, 'Kimihurura'),
    'Remera': GeoPoint(-1.9547, 30.1155, 'Remera'),
    'Kacyiru': GeoPoint(-1.9559, 30.0924, 'Kacyiru Government District'),
    'Kimironko': GeoPoint(-1.9578, 30.1122, 'Kimironko Market'),
    'Nyamirambo': GeoPoint(-1.9658, 30.0396, 'Nyamirambo'),
    'Gikondo': GeoPoint(-1.9745, 30.0716, 'Gikondo Industrial'),
    'KIA': GeoPoint(-1.9683, 30.1394, 'Kigali International Airport'),
    'Convention_Center': GeoPoint(-1.9571, 30.0927, 'Kigali Convention Centre'),
    'Amahoro_Stadium': GeoPoint(-1.9534, 30.1057, 'Amahoro National Stadium'),
  };

  // ============================================================
  // POLICE STATION LOCATIONS
  // ============================================================
  
  static const Map<String, GeoPoint> policeStations = {
    'RNP_HQ': GeoPoint(-1.9549, 30.0609, 'Rwanda National Police HQ'),
    'Remera_Station': GeoPoint(-1.9547, 30.1155, 'Remera Police Station'),
    'Nyarugenge_Station': GeoPoint(-1.9536, 30.0606, 'Nyarugenge Police Station'),
    'Kicukiro_Station': GeoPoint(-1.9876, 30.1029, 'Kicukiro Police Station'),
    'Kimihurura_Station': GeoPoint(-1.9403, 30.1067, 'Kimihurura Police Station'),
    'Nyabugogo_Station': GeoPoint(-1.9676, 30.0439, 'Nyabugogo Police Post'),
  };

  // ============================================================
  // UTILITY METHODS
  // ============================================================

  /// Get district from GPS coordinates
  static DistrictBoundary? getDistrictFromLocation(double lat, double lng) {
    DistrictBoundary? closestDistrict;
    double minDistance = double.infinity;

    for (final entry in districts.entries) {
      final district = entry.value;
      final distance = _calculateDistance(lat, lng, district.centerLat, district.centerLng);
      
      if (distance < minDistance) {
        minDistance = distance;
        closestDistrict = district;
      }
    }

    return closestDistrict;
  }

  /// Check if location is within a specific district
  static bool isInDistrict(double lat, double lng, String districtName) {
    final district = districts[districtName];
    if (district == null) return false;

    final distance = _calculateDistance(lat, lng, district.centerLat, district.centerLng);
    return distance <= district.approximateRadiusKm;
  }

  /// Get distance from a point to a district center
  static double getDistanceToDistrict(double lat, double lng, String districtName) {
    final district = districts[districtName];
    if (district == null) return double.infinity;

    return _calculateDistance(lat, lng, district.centerLat, district.centerLng);
  }

  /// Find nearby police stations within radius (km)
  static List<MapEntry<String, GeoPoint>> findNearbyStations(double lat, double lng, double radiusKm) {
    final nearby = <MapEntry<String, GeoPoint>>[];

    for (final entry in policeStations.entries) {
      final distance = _calculateDistance(lat, lng, entry.value.latitude, entry.value.longitude);
      if (distance <= radiusKm) {
        nearby.add(entry);
      }
    }

    // Sort by distance
    nearby.sort((a, b) {
      final distA = _calculateDistance(lat, lng, a.value.latitude, a.value.longitude);
      final distB = _calculateDistance(lat, lng, b.value.latitude, b.value.longitude);
      return distA.compareTo(distB);
    });

    return nearby;
  }

  /// Get closest high-traffic zone
  static String getClosestZone(double lat, double lng) {
    String closestZone = 'Kigali';
    double minDistance = double.infinity;

    for (final entry in highTrafficZones.entries) {
      final distance = _calculateDistance(lat, lng, entry.value.latitude, entry.value.longitude);
      if (distance < minDistance) {
        minDistance = distance;
        closestZone = entry.key;
      }
    }

    return closestZone;
  }

  /// Calculate approximate distance between two points (Haversine formula)
  static double _calculateDistance(double lat1, double lng1, double lat2, double lng2) {
    const double earthRadius = 6371; // km
    
    final dLat = _toRadians(lat2 - lat1);
    final dLng = _toRadians(lng2 - lng1);
    
    final a = 
      _sin(dLat / 2) * _sin(dLat / 2) +
      _cos(_toRadians(lat1)) * _cos(_toRadians(lat2)) *
      _sin(dLng / 2) * _sin(dLng / 2);
    
    final c = 2 * _atan2(_sqrt(a), _sqrt(1 - a));
    
    return earthRadius * c;
  }

  static double _toRadians(double degrees) => degrees * 3.141592653589793 / 180;
  static double _sin(double x) => _taylor_sin(x);
  static double _cos(double x) => _taylor_sin(x + 1.5707963267948966);
  static double _sqrt(double x) => _newton_sqrt(x);
  static double _atan2(double y, double x) => _taylor_atan2(y, x);

  // Simple Taylor series approximations (to avoid dart:math import)
  static double _taylor_sin(double x) {
    // Normalize to -π to π
    while (x > 3.141592653589793) x -= 6.283185307179586;
    while (x < -3.141592653589793) x += 6.283185307179586;
    
    // Taylor series for sin(x)
    double result = x;
    double term = x;
    for (int i = 1; i <= 10; i++) {
      term *= -x * x / ((2 * i) * (2 * i + 1));
      result += term;
    }
    return result;
  }

  static double _newton_sqrt(double x) {
    if (x <= 0) return 0;
    double guess = x / 2;
    for (int i = 0; i < 20; i++) {
      guess = (guess + x / guess) / 2;
    }
    return guess;
  }

  static double _taylor_atan2(double y, double x) {
    if (x > 0) return _atan(y / x);
    if (x < 0 && y >= 0) return _atan(y / x) + 3.141592653589793;
    if (x < 0 && y < 0) return _atan(y / x) - 3.141592653589793;
    if (x == 0 && y > 0) return 1.5707963267948966;
    if (x == 0 && y < 0) return -1.5707963267948966;
    return 0;
  }

  static double _atan(double x) {
    // Taylor series for atan(x), |x| <= 1
    if (x.abs() > 1) {
      if (x > 0) return 1.5707963267948966 - _atan(1 / x);
      return -1.5707963267948966 - _atan(1 / x);
    }
    double result = x;
    double term = x;
    for (int i = 1; i <= 20; i++) {
      term *= -x * x;
      result += term / (2 * i + 1);
    }
    return result;
  }
}

/// District boundary definition
class DistrictBoundary {
  final int id;
  final String name;
  final String code;
  final double centerLat;
  final double centerLng;
  final double approximateRadiusKm;
  final List<String> sectors;

  const DistrictBoundary({
    required this.id,
    required this.name,
    required this.code,
    required this.centerLat,
    required this.centerLng,
    required this.approximateRadiusKm,
    required this.sectors,
  });
}

/// Geographic point
class GeoPoint {
  final double latitude;
  final double longitude;
  final String description;

  const GeoPoint(this.latitude, this.longitude, this.description);
}

/// Alert types for geo-fenced notifications
enum AlertType {
  standard,   // Normal incident notification
  emergency,  // Full-screen emergency alarm
  update,     // Status update
  announcement, // General announcement
}

/// Alert priority levels
enum AlertPriority {
  critical,   // Priority 1 - Full emergency response
  high,       // Priority 2 - Urgent attention needed
  medium,     // Priority 5 - Standard incident
  low,        // Priority 8 - Informational
}
