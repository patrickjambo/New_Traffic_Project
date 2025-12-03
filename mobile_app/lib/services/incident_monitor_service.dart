import 'dart:async';
import 'package:geolocator/geolocator.dart';
import '../services/incident_service.dart';
import '../services/emergency_service.dart';

/**
 * Incident Monitor Service
 * 100% FREE - No external service costs
 * Prevents duplicate emergency reports from 5-second clips
 * Tracks incidents over time and updates severity
 */
class IncidentMonitorService {
  static final IncidentMonitorService _instance = IncidentMonitorService._internal();
  factory IncidentMonitorService() => _instance;
  IncidentMonitorService._internal();

  // Active incidents being tracked (incidentId -> IncidentTracker)
  final Map<int, IncidentTracker> _activeIncidents = {};
  
  // Location-based incident cache (to quickly find nearby incidents)
  final Map<String, List<int>> _locationCache = {};
  
  // Configuration
  static const double proximityRadiusMeters = 100.0; // 100m radius for same incident
  static const Duration incidentTimeout = Duration(minutes: 30); // Auto-close after 30 mins of no updates
  static const Duration severityCheckInterval = Duration(seconds: 10); // Check severity changes every 10 seconds

  Timer? _cleanupTimer;

  /// Start monitoring service
  void start() {
    // Cleanup expired incidents every minute
    _cleanupTimer?.cancel();
    _cleanupTimer = Timer.periodic(const Duration(minutes: 1), (timer) {
      _cleanupExpiredIncidents();
    });
    
    print('✅ Incident Monitor Service started');
  }

  /// Stop monitoring service
  void stop() {
    _cleanupTimer?.cancel();
    _activeIncidents.clear();
    _locationCache.clear();
    print('🛑 Incident Monitor Service stopped');
  }

  /// Process new video clip analysis
  /// Returns: (shouldCreateNew, matchedIncidentId)
  Future<IncidentDecision> processClipAnalysis({
    required double latitude,
    required longitude,
    required Map<String, dynamic> aiAnalysis,
    required String videoPath,
  }) async {
    // Find nearby incidents
    final nearbyIncidents = await _findNearbyIncidents(latitude, longitude);
    
    if (nearbyIncidents.isEmpty) {
      // No nearby incidents, this is a new incident
      print('🆕 New incident detected at ($latitude, $longitude)');
      return IncidentDecision(
        shouldCreateNew: true,
        matchedIncidentId: null,
        action: 'create_new',
      );
    }

    // Check if this clip matches any existing incident
    final match = _findBestMatch(
      nearbyIncidents: nearbyIncidents,
      aiAnalysis: aiAnalysis,
      location: Position(
        latitude: latitude,
        longitude: longitude,
        timestamp: DateTime.now(),
        accuracy: 0,
        altitude: 0,
        heading: 0,
        speed: 0,
        speedAccuracy: 0,
        altitudeAccuracy: 0,
        headingAccuracy: 0,
      ),
    );

    if (match != null) {
      // Update existing incident
      print('🔄 Matched to existing incident #${match.incidentId}');
      await _updateIncident(match.incidentId, aiAnalysis, videoPath);
      
      return IncidentDecision(
        shouldCreateNew: false,
        matchedIncidentId: match.incidentId,
        action: 'update_existing',
        severityChanged: match.severityIncreased,
      );
    } else {
      // Nearby but different incident (e.g., new accident 50m away)
      print('🆕 Different incident detected near existing ones');
      return IncidentDecision(
        shouldCreateNew: true,
        matchedIncidentId: null,
        action: 'create_new',
      );
    }
  }

  /// Register a new incident for tracking
  void registerIncident({
    required int incidentId,
    required double latitude,
    required double longitude,
    required String incidentType,
    required String severity,
    required Map<String, dynamic> aiAnalysis,
  }) {
    final tracker = IncidentTracker(
      incidentId: incidentId,
      latitude: latitude,
      longitude: longitude,
      incidentType: incidentType,
      initialSeverity: severity,
      currentSeverity: severity,
      firstDetected: DateTime.now(),
      lastUpdated: DateTime.now(),
      clipCount: 1,
      aiAnalysisHistory: [aiAnalysis],
    );

    _activeIncidents[incidentId] = tracker;
    _addToLocationCache(latitude, longitude, incidentId);
    
    print('📝 Registered incident #$incidentId for tracking');
  }

  /// Find nearby incidents within proximity radius
  Future<List<IncidentTracker>> _findNearbyIncidents(double lat, double lng) async {
    final nearby = <IncidentTracker>[];
    
    // Check location cache first (faster)
    final locationKey = _getLocationKey(lat, lng);
    final cachedIds = _locationCache[locationKey] ?? [];
    
    for (final id in cachedIds) {
      final tracker = _activeIncidents[id];
      if (tracker != null) {
        final distance = Geolocator.distanceBetween(
          lat,
          lng,
          tracker.latitude,
          tracker.longitude,
        );
        
        if (distance <= proximityRadiusMeters) {
          nearby.add(tracker);
        }
      }
    }
    
    // Also check adjacent grid cells
    final adjacentKeys = _getAdjacentLocationKeys(lat, lng);
    for (final key in adjacentKeys) {
      final ids = _locationCache[key] ?? [];
      for (final id in ids) {
        if (!cachedIds.contains(id)) {
          final tracker = _activeIncidents[id];
          if (tracker != null) {
            final distance = Geolocator.distanceBetween(
              lat,
              lng,
              tracker.latitude,
              tracker.longitude,
            );
            
            if (distance <= proximityRadiusMeters) {
              nearby.add(tracker);
            }
          }
        }
      }
    }
    
    return nearby;
  }

  /// Find best matching incident based on location and characteristics
  IncidentMatch? _findBestMatch({
    required List<IncidentTracker> nearbyIncidents,
    required Map<String, dynamic> aiAnalysis,
    required Position location,
  }) {
    IncidentMatch? bestMatch;
    double bestScore = 0.6; // Minimum 60% match required
    
    for (final tracker in nearbyIncidents) {
      // Calculate match score
      double score = 0.0;
      
      // 1. Type matching (40% weight)
      final detectedType = _determineIncidentType(aiAnalysis);
      if (detectedType == tracker.incidentType) {
        score += 0.4;
      }
      
      // 2. Proximity (30% weight)
      final distance = Geolocator.distanceBetween(
        location.latitude,
        location.longitude,
        tracker.latitude,
        tracker.longitude,
      );
      final proximityScore = 1.0 - (distance / proximityRadiusMeters);
      score += 0.3 * proximityScore;
      
      // 3. Time recency (20% weight)
      final timeSinceUpdate = DateTime.now().difference(tracker.lastUpdated);
      if (timeSinceUpdate < const Duration(minutes: 5)) {
        score += 0.2;
      } else if (timeSinceUpdate < const Duration(minutes: 15)) {
        score += 0.1;
      }
      
      // 4. Characteristics matching (10% weight)
      final charMatch = _compareCharacteristics(aiAnalysis, tracker.aiAnalysisHistory.last);
      score += 0.1 * charMatch;
      
      if (score > bestScore) {
        bestScore = score;
        
        // Check if severity increased
        final newSeverity = _determineSeverity(aiAnalysis);
        final severityIncreased = _isSeverityHigher(newSeverity, tracker.currentSeverity);
        
        bestMatch = IncidentMatch(
          incidentId: tracker.incidentId,
          matchScore: score,
          severityIncreased: severityIncreased,
        );
      }
    }
    
    return bestMatch;
  }

  /// Update existing incident with new clip data
  Future<void> _updateIncident(int incidentId, Map<String, dynamic> aiAnalysis, String videoPath) async {
    final tracker = _activeIncidents[incidentId];
    if (tracker == null) return;
    
    // Update tracker
    tracker.clipCount++;
    tracker.lastUpdated = DateTime.now();
    tracker.aiAnalysisHistory.add(aiAnalysis);
    
    // Check if severity increased
    final newSeverity = _determineSeverity(aiAnalysis);
    if (_isSeverityHigher(newSeverity, tracker.currentSeverity)) {
      print('⚠️  Incident #$incidentId severity increased: ${tracker.currentSeverity} → $newSeverity');
      tracker.currentSeverity = newSeverity;
      
      // TODO: Send severity update notification
      await _notifySeverityIncrease(incidentId, newSeverity, aiAnalysis);
    }
    
    print('🔄 Updated incident #$incidentId (clip #${tracker.clipCount})');
  }

  /// Notify about severity increase
  Future<void> _notifySeverityIncrease(int incidentId, String newSeverity, Map<String, dynamic> aiAnalysis) async {
    // TODO: Send push notification to police/admin
    print('📢 Sending severity increase alert for incident #$incidentId');
  }

  /// Cleanup expired incidents
  void _cleanupExpiredIncidents() {
    final now = DateTime.now();
    final expiredIds = <int>[];
    
    _activeIncidents.forEach((id, tracker) {
      final timeSinceUpdate = now.difference(tracker.lastUpdated);
      if (timeSinceUpdate > incidentTimeout) {
        expiredIds.add(id);
        print('🗑️  Incident #$id expired (no updates for ${timeSinceUpdate.inMinutes} minutes)');
      }
    });
    
    // Remove expired incidents
    for (final id in expiredIds) {
      final tracker = _activeIncidents.remove(id);
      if (tracker != null) {
        _removeFromLocationCache(tracker.latitude, tracker.longitude, id);
      }
    }
  }

  /// Location cache helpers
  String _getLocationKey(double lat, double lng) {
    // 0.001 degrees ≈ 100m grid
    final latGrid = (lat * 1000).round();
    final lngGrid = (lng * 1000).round();
    return '${latGrid}_$lngGrid';
  }

  List<String> _getAdjacentLocationKeys(double lat, double lng) {
    final latGrid = (lat * 1000).round();
    final lngGrid = (lng * 1000).round();
    
    return [
      '${latGrid - 1}_${lngGrid - 1}',
      '${latGrid - 1}_$lngGrid',
      '${latGrid - 1}_${lngGrid + 1}',
      '${latGrid}_${lngGrid - 1}',
      '${latGrid}_${lngGrid + 1}',
      '${latGrid + 1}_${lngGrid - 1}',
      '${latGrid + 1}_$lngGrid',
      '${latGrid + 1}_${lngGrid + 1}',
    ];
  }

  void _addToLocationCache(double lat, double lng, int incidentId) {
    final key = _getLocationKey(lat, lng);
    _locationCache[key] ??= [];
    if (!_locationCache[key]!.contains(incidentId)) {
      _locationCache[key]!.add(incidentId);
    }
  }

  void _removeFromLocationCache(double lat, double lng, int incidentId) {
    final key = _getLocationKey(lat, lng);
    _locationCache[key]?.remove(incidentId);
    if (_locationCache[key]?.isEmpty ?? false) {
      _locationCache.remove(key);
    }
  }

  /// Helper methods
  String _determineIncidentType(Map<String, dynamic> aiAnalysis) {
    final objects = aiAnalysis['detected_objects'] ?? [];
    if (objects.any((obj) => obj['class'] == 'fire')) return 'fire';
    if (objects.any((obj) => obj['class'] == 'person' && obj['confidence'] > 0.8)) return 'medical';
    return 'accident';
  }

  String _determineSeverity(Map<String, dynamic> aiAnalysis) {
    final confidence = (aiAnalysis['confidence'] ?? 0.0) as double;
    final objects = aiAnalysis['detected_objects'] ?? [];
    final vehicleCount = objects.where((obj) => ['car', 'truck', 'bus'].contains(obj['class'])).length;
    
    if (objects.any((obj) => obj['class'] == 'fire') || vehicleCount >= 4 || confidence > 0.85) {
      return 'critical';
    } else if (vehicleCount >= 3 || confidence > 0.75) {
      return 'high';
    } else if (vehicleCount >= 2 || confidence > 0.60) {
      return 'medium';
    }
    return 'low';
  }

  bool _isSeverityHigher(String newSeverity, String currentSeverity) {
    const severityLevels = {'low': 1, 'medium': 2, 'high': 3, 'critical': 4};
    return (severityLevels[newSeverity] ?? 0) > (severityLevels[currentSeverity] ?? 0);
  }

  double _compareCharacteristics(Map<String, dynamic> analysis1, Map<String, dynamic> analysis2) {
    // Compare detected objects
    final objects1 = analysis1['detected_objects'] ?? [];
    final objects2 = analysis2['detected_objects'] ?? [];
    
    final classes1 = objects1.map((obj) => obj['class']).toSet();
    final classes2 = objects2.map((obj) => obj['class']).toSet();
    
    final intersection = classes1.intersection(classes2).length;
    final union = classes1.union(classes2).length;
    
    return union > 0 ? intersection / union : 0.0;
  }

  /// Get active incidents count
  int get activeIncidentsCount => _activeIncidents.length;

  /// Get incident details
  IncidentTracker? getIncident(int incidentId) => _activeIncidents[incidentId];
}

/// Incident tracking data
class IncidentTracker {
  final int incidentId;
  final double latitude;
  final double longitude;
  final String incidentType;
  final String initialSeverity;
  String currentSeverity;
  final DateTime firstDetected;
  DateTime lastUpdated;
  int clipCount;
  final List<Map<String, dynamic>> aiAnalysisHistory;

  IncidentTracker({
    required this.incidentId,
    required this.latitude,
    required this.longitude,
    required this.incidentType,
    required this.initialSeverity,
    required this.currentSeverity,
    required this.firstDetected,
    required this.lastUpdated,
    required this.clipCount,
    required this.aiAnalysisHistory,
  });
}

/// Decision on what to do with new clip
class IncidentDecision {
  final bool shouldCreateNew;
  final int? matchedIncidentId;
  final String action; // 'create_new' or 'update_existing'
  final bool severityChanged;

  IncidentDecision({
    required this.shouldCreateNew,
    this.matchedIncidentId,
    required this.action,
    this.severityChanged = false,
  });
}

/// Incident match result
class IncidentMatch {
  final int incidentId;
  final double matchScore;
  final bool severityIncreased;

  IncidentMatch({
    required this.incidentId,
    required this.matchScore,
    required this.severityIncreased,
  });
}
