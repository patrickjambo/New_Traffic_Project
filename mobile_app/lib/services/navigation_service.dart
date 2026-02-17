import 'package:url_launcher/url_launcher.dart';
import 'package:geolocator/geolocator.dart';

/// Navigation Service
/// Opens Google Maps or other navigation apps to guide police to incidents
class NavigationService {
  static final NavigationService _instance = NavigationService._internal();
  factory NavigationService() => _instance;
  NavigationService._internal();

  /// Navigate to a location using Google Maps
  /// Opens turn-by-turn navigation from current location to destination
  Future<bool> navigateToLocation({
    required double latitude,
    required double longitude,
    String? locationName,
  }) async {
    try {
      // Get current position for navigation start point
      Position? currentPosition;
      try {
        currentPosition = await Geolocator.getCurrentPosition(
          desiredAccuracy: LocationAccuracy.high,
        );
      } catch (e) {
        print('⚠️ Could not get current location: $e');
      }

      // Build Google Maps navigation URL
      String url;
      if (currentPosition != null) {
        // Navigation mode with current location
        url = 'https://www.google.com/maps/dir/?api=1'
            '&origin=${currentPosition.latitude},${currentPosition.longitude}'
            '&destination=$latitude,$longitude'
            '&travelmode=driving'
            '&dir_action=navigate';
      } else {
        // Just open destination
        url = 'https://www.google.com/maps/search/?api=1'
            '&query=$latitude,$longitude';
      }

      final uri = Uri.parse(url);
      
      if (await canLaunchUrl(uri)) {
        await launchUrl(uri, mode: LaunchMode.externalApplication);
        print('🗺️ Navigation started to: $latitude, $longitude');
        return true;
      } else {
        print('❌ Could not launch Google Maps');
        // Try alternative: geo: URI
        return await _tryGeoUri(latitude, longitude, locationName);
      }
    } catch (e) {
      print('❌ Navigation error: $e');
      return false;
    }
  }

  /// Try using geo: URI as fallback
  Future<bool> _tryGeoUri(double lat, double lng, String? label) async {
    try {
      final labelParam = label != null ? '($label)' : '';
      final geoUri = Uri.parse('geo:$lat,$lng?q=$lat,$lng$labelParam');
      
      if (await canLaunchUrl(geoUri)) {
        await launchUrl(geoUri);
        return true;
      }
      return false;
    } catch (e) {
      return false;
    }
  }

  /// Navigate to emergency location
  Future<bool> navigateToEmergency(Map<String, dynamic> emergency) async {
    final lat = emergency['latitude'] as double?;
    final lng = emergency['longitude'] as double?;
    final address = emergency['address'] as String? ?? 
                    emergency['location_name'] as String? ??
                    emergency['locationName'] as String?;

    if (lat == null || lng == null) {
      print('❌ Emergency has no coordinates');
      return false;
    }

    return await navigateToLocation(
      latitude: lat,
      longitude: lng,
      locationName: address,
    );
  }

  /// Navigate to deployment location
  Future<bool> navigateToDeployment(Map<String, dynamic> deployment) async {
    final lat = double.tryParse(deployment['latitude']?.toString() ?? '') ??
                deployment['latitude'] as double?;
    final lng = double.tryParse(deployment['longitude']?.toString() ?? '') ??
                deployment['longitude'] as double?;
    final address = deployment['address'] as String?;

    if (lat == null || lng == null) {
      print('❌ Deployment has no coordinates');
      return false;
    }

    return await navigateToLocation(
      latitude: lat,
      longitude: lng,
      locationName: address,
    );
  }

  /// Navigate to incident location
  Future<bool> navigateToIncident(Map<String, dynamic> incident) async {
    final lat = double.tryParse(incident['latitude']?.toString() ?? '') ??
                incident['latitude'] as double?;
    final lng = double.tryParse(incident['longitude']?.toString() ?? '') ??
                incident['longitude'] as double?;
    final address = incident['address'] as String? ?? 
                    incident['location'] as String?;

    if (lat == null || lng == null) {
      print('❌ Incident has no coordinates');
      return false;
    }

    return await navigateToLocation(
      latitude: lat,
      longitude: lng,
      locationName: address,
    );
  }

  /// Calculate distance to location
  Future<double?> getDistanceToLocation(double lat, double lng) async {
    try {
      final currentPosition = await Geolocator.getCurrentPosition(
        desiredAccuracy: LocationAccuracy.high,
      );

      return Geolocator.distanceBetween(
        currentPosition.latitude,
        currentPosition.longitude,
        lat,
        lng,
      );
    } catch (e) {
      print('Error calculating distance: $e');
      return null;
    }
  }

  /// Get estimated travel time (rough estimate based on distance)
  String getEstimatedTravelTime(double distanceInMeters) {
    // Assume average speed of 40 km/h in city
    final hours = distanceInMeters / 40000;
    final minutes = (hours * 60).round();

    if (minutes < 1) return '< 1 min';
    if (minutes < 60) return '$minutes min';
    
    final h = minutes ~/ 60;
    final m = minutes % 60;
    return '${h}h ${m}m';
  }
}
