import 'package:flutter/material.dart';
import 'package:camera/camera.dart';
import 'dart:async';
import 'dart:io';
import 'package:path_provider/path_provider.dart';
import 'package:location/location.dart';
import '../services/ai_auto_service.dart';
import '../services/emergency_service.dart';
import '../services/notification_service.dart';
import '../services/incident_monitor_service.dart';
import '../services/fcm_service.dart';
import '../config/app_config.dart';  // 🔥 ADD THIS LINE

/// Auto Monitor Screen - Continuous AI-powered monitoring
/// - Records video continuously in 5-second clips
/// - Sends each clip to AI engine for analysis
/// - Auto-creates incident reports for detected incidents
/// - Auto-creates emergency reports for critical situations
/// - Runs in background, minimal user interaction needed
class AutoMonitorScreen extends StatefulWidget {
  const AutoMonitorScreen({super.key});

  @override
  State<AutoMonitorScreen> createState() => _AutoMonitorScreenState();
}

class _AutoMonitorScreenState extends State<AutoMonitorScreen> {
  CameraController? _controller;
  final AIAutoService _aiService = AIAutoService();
  final EmergencyService _emergencyService = EmergencyService();
  final NotificationService _notificationService = NotificationService();
  final IncidentMonitorService _incidentMonitor = IncidentMonitorService();
  final FCMService _fcmService = FCMService();

  bool _isMonitoring = false;
  bool _isRecording = false;
  Timer? _clipTimer;
  int _clipsProcessed = 0;
  int _incidentsDetected = 0;
  int _emergenciesCreated = 0;
  int _duplicatesPrevented = 0;
  String _status = 'Ready to start monitoring';
  List<String> _recentLogs = [];

  @override
  void initState() {
    super.initState();
    _initializeCamera();
    _initializeServices();
  }

  Future<void> _initializeCamera() async {
    try {
      final cameras = await availableCameras();
      if (cameras.isEmpty) {
        _addLog('❌ No cameras available');
        return;
      }

      // Use back camera for traffic monitoring
      final camera = cameras.firstWhere(
        (c) => c.lensDirection == CameraLensDirection.back,
        orElse: () => cameras.first,
      );

      _controller = CameraController(
        camera,
        ResolutionPreset.high,
        enableAudio: true,
      );

      await _controller!.initialize();
      if (mounted) {
        setState(() {});
        _addLog('✅ Camera initialized');
      }
    } catch (e) {
      _addLog('❌ Camera error: $e');
    }
  }

  /// Initialize FREE services (Firebase FCM + Incident Tracking)
  Future<void> _initializeServices() async {
    try {
      // Initialize Firebase Cloud Messaging (100% FREE)
      await _fcmService.initialize();
      _addLog('✅ Firebase FCM initialized (FREE)');
      
      // Subscribe to police alerts if user is police officer
      // await _fcmService.subscribeToPoliceAlerts();
      
      // Get current location and subscribe to location-based alerts
      final locationData = await _getCurrentLocation();
      if (locationData != null) {
        await _fcmService.subscribeToLocation(
          locationData['latitude'] ?? AppConfig.defaultLatitude,
          locationData['longitude'] ?? AppConfig.defaultLongitude,
        );
        _addLog('📍 Subscribed to location-based alerts');
      }
      
      // Start incident monitor service (100% FREE)
      _incidentMonitor.start();
      _addLog('✅ Incident tracker started (FREE)');
    } catch (e) {
      _addLog('⚠️  Services initialization: $e');
    }
  }

  void _addLog(String message) {
    if (mounted) {
      setState(() {
        _recentLogs.insert(0, '${DateTime.now().toLocal().toString().substring(11, 19)} - $message');
        if (_recentLogs.length > 10) {
          _recentLogs.removeLast();
        }
      });
    }
  }

  Future<void> _startMonitoring() async {
    if (_controller == null || !_controller!.value.isInitialized) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Camera not ready')),
      );
      return;
    }

    setState(() {
      _isMonitoring = true;
      _status = 'Monitoring active - Recording 5-sec clips';
    });

    _addLog('🚀 Auto-monitoring started');

    // Start continuous recording cycle
    _startRecordingCycle();
  }

  Future<void> _startRecordingCycle() async {
    if (!_isMonitoring) return;

    try {
      // Start recording
      await _controller!.startVideoRecording();
      setState(() {
        _isRecording = true;
      });
      _addLog('📹 Recording clip ${_clipsProcessed + 1}...');

      // Record for 5 seconds
      _clipTimer = Timer(const Duration(seconds: 5), () async {
        await _stopAndProcessClip();
      });
    } catch (e) {
      _addLog('❌ Recording error: $e');
      setState(() {
        _isRecording = false;
      });
    }
  }

  Future<void> _stopAndProcessClip() async {
    if (_controller == null || !_controller!.value.isRecordingVideo) return;

    try {
      // Stop recording
      final XFile videoFile = await _controller!.stopVideoRecording();
      setState(() {
        _isRecording = false;
        _clipsProcessed++;
      });

      _addLog('✅ Clip ${_clipsProcessed} captured (${(File(videoFile.path).lengthSync() / 1024).toStringAsFixed(1)} KB)');

      // Send to AI for analysis
      await _analyzeClip(videoFile);

      // Start next recording cycle if still monitoring
      if (_isMonitoring) {
        await Future.delayed(const Duration(milliseconds: 500));
        _startRecordingCycle();
      }
    } catch (e) {
      _addLog('❌ Stop recording error: $e');
      setState(() {
        _isRecording = false;
      });

      // Retry if still monitoring
      if (_isMonitoring) {
        await Future.delayed(const Duration(seconds: 2));
        _startRecordingCycle();
      }
    }
  }

  Future<void> _analyzeClip(XFile videoFile) async {
    setState(() {
      _status = 'Analyzing clip ${_clipsProcessed}...';
    });

    try {
      // Send video to AI service
      final result = await _aiService.analyzeVideoClip(
        File(videoFile.path),
      );

      if (result['success']) {
        final data = result['data'];
        final hasIncident = data['has_incident'] ?? false;
        final incidentType = data['incident_type'] ?? 'unknown';
        final severity = data['severity'] ?? 'low';
        final confidence = data['confidence'] ?? 0.0;

        if (hasIncident) {
          _addLog('⚠️  Incident detected! Type: $incidentType, Severity: $severity, Confidence: ${(confidence * 100).toStringAsFixed(1)}%');
          
          setState(() {
            _incidentsDetected++;
            _status = 'Incident detected - Checking for duplicates...';
          });

          // Get current location
          final locationData = await _getCurrentLocation();
          if (locationData == null) {
            _addLog('❌ Location unavailable, skipping incident');
            return;
          }

          // 🔥 NEW: Check if this is a new incident or update to existing one
          final decision = await _incidentMonitor.processClipAnalysis(
            latitude: locationData['latitude'] ?? AppConfig.defaultLatitude,
            longitude: locationData['longitude'] ?? AppConfig.defaultLongitude,
            aiAnalysis: data,
            videoPath: videoFile.path,
          );

          if (decision.shouldCreateNew) {
            // Create new incident report
            _addLog('🆕 Creating new incident report...');
            await _createIncidentReport(data, videoFile.path);

            // If critical, auto-create emergency
            if (severity == 'critical' || severity == 'high') {
              _addLog('🚨 Critical incident - Creating emergency report...');
              await _createEmergencyReport(data, videoFile.path);
            }
          } else {
            // Update existing incident
            _addLog('🔄 Updated existing incident #${decision.matchedIncidentId}');
            setState(() {
              _duplicatesPrevented++;
            });
            
            // If severity increased, send alert
            if (decision.severityChanged) {
              _addLog('⚠️  Severity increased for incident #${decision.matchedIncidentId}!');
              // TODO: Send severity update notification
            }
            
            // Delete clip to save storage (already processed)
            await File(videoFile.path).delete();
          }
        } else {
          _addLog('✓ No incident in clip ${_clipsProcessed}');
          // Delete clip to save storage
          await File(videoFile.path).delete();
        }
      } else {
        _addLog('❌ AI analysis failed: ${result['message']}');
      }

      setState(() {
        _status = 'Monitoring active - Clip ${_clipsProcessed} processed';
      });
    } catch (e) {
      _addLog('❌ Analysis error: $e');
      setState(() {
        _status = 'Monitoring active - Analysis error';
      });
    }
  }

  Future<void> _createIncidentReport(Map<String, dynamic> aiData, String videoPath) async {
    try {
      final reportResult = await _aiService.createIncidentReport(
        videoPath: videoPath,
        aiData: aiData,
      );

      if (reportResult['success']) {
        final incidentId = reportResult['data']['id'];
        _addLog('✅ Incident report created (ID: $incidentId)');
        
        // 🔥 NEW: Register incident with monitor to prevent duplicates
        final locationData = await _getCurrentLocation();
        if (locationData != null) {
          _incidentMonitor.registerIncident(
            incidentId: incidentId,
            latitude: locationData['latitude'] ?? AppConfig.defaultLatitude,
            longitude: locationData['longitude'] ?? AppConfig.defaultLongitude,
            incidentType: aiData['incident_type'] ?? 'unknown',
            severity: aiData['severity'] ?? 'low',
            aiAnalysis: aiData,
          );
          _addLog('📝 Incident registered for tracking');
        }
        
        // Send notification to public
        await _notificationService.sendIncidentNotification(
          incidentId: incidentId,
          type: aiData['incident_type'] ?? 'unknown',
          severity: aiData['severity'] ?? 'low',
        );
        
        _addLog('📢 Public notification sent');
      } else {
        _addLog('❌ Report creation failed: ${reportResult['message']}');
      }
    } catch (e) {
      _addLog('❌ Report error: $e');
    }
  }

  Future<void> _createEmergencyReport(Map<String, dynamic> aiData, String videoPath) async {
    try {
      setState(() {
        _status = 'Creating emergency report...';
      });

      // Determine emergency type from incident type
      String emergencyType = 'accident';
      if (aiData['incident_type'] == 'fire') {
        emergencyType = 'fire';
      } else if (aiData['incident_type'] == 'medical') {
        emergencyType = 'medical';
      }

      // Get current location (you'll need to implement this)
      final location = await _getCurrentLocation();

      // Create emergency report
      final result = await _emergencyService.createEmergency(
        emergencyType: emergencyType,
        severity: aiData['severity'] ?? 'high',
        locationName: 'Auto-detected by AI Monitor',
        latitude: location['latitude'] ?? 0.0,
        longitude: location['longitude'] ?? 0.0,
        description: 'AUTOMATED EMERGENCY: ${aiData['description'] ?? 'Critical incident detected by AI system'}. '
            'Confidence: ${((aiData['confidence'] ?? 0.0) * 100).toStringAsFixed(1)}%. '
            'Detected objects: ${(aiData['detected_objects'] ?? []).join(", ")}. '
            'Requires immediate attention.',
        casualtiesCount: aiData['estimated_casualties'] ?? 0,
        vehiclesInvolved: aiData['vehicles_count'] ?? 0,
        servicesNeeded: _determineServicesNeeded(aiData),
        contactPhone: '+256700000000', // System phone
      );

      if (result['success']) {
        final emergencyId = result['data']['id'];
        setState(() {
          _emergenciesCreated++;
        });
        _addLog('🚨 Emergency created (ID: $emergencyId)');
        _addLog('📞 Police & Admin notified');

        // Show critical alert
        _showCriticalAlert(emergencyId, aiData);
      } else {
        _addLog('❌ Emergency creation failed: ${result['message']}');
      }

      setState(() {
        _status = 'Monitoring active - Emergency reported';
      });
    } catch (e) {
      _addLog('❌ Emergency error: $e');
    }
  }

  List<String> _determineServicesNeeded(Map<String, dynamic> aiData) {
    final List<String> services = [];
    final incidentType = aiData['incident_type'] ?? '';
    final severity = aiData['severity'] ?? 'low';

    if (incidentType == 'accident' || severity == 'critical') {
      services.addAll(['police', 'ambulance']);
    }
    if (incidentType == 'fire') {
      services.addAll(['fire', 'rescue']);
    }
    if (incidentType == 'medical') {
      services.add('ambulance');
    }
    if (services.isEmpty) {
      services.add('police');
    }

    return services.toSet().toList();
  }

  Future<Map<String, double>> _getCurrentLocation() async {
    try {
      Location location = Location();

      // Check if location service is enabled
      bool serviceEnabled = await location.serviceEnabled();
      if (!serviceEnabled) {
        serviceEnabled = await location.requestService();
        if (!serviceEnabled) {
          _addLog('Location service disabled, using default location');
          return {
            'latitude': 0.3476,
            'longitude': 32.5825,
          };
        }
      }

      // Check if permission is granted
      PermissionStatus permissionGranted = await location.hasPermission();
      if (permissionGranted == PermissionStatus.denied) {
        permissionGranted = await location.requestPermission();
        if (permissionGranted != PermissionStatus.granted) {
          _addLog('Location permission denied, using default location');
          return {
            'latitude': 0.3476,
            'longitude': 32.5825,
          };
        }
      }

      // Get current location
      final locationData = await location.getLocation();
      
      return {
        'latitude': locationData.latitude ?? 0.3476,
        'longitude': locationData.longitude ?? 32.5825,
      };
    } catch (e) {
      _addLog('Error getting location: $e');
      // Return default location on error
      return {
        'latitude': 0.3476,
        'longitude': 32.5825,
      };
    }
  }

  void _showCriticalAlert(int emergencyId, Map<String, dynamic> aiData) {
    showDialog(
      context: context,
      barrierDismissible: false,
      builder: (context) => AlertDialog(
        backgroundColor: Colors.red.shade900,
        title: Row(
          children: [
            Icon(Icons.emergency, color: Colors.white, size: 32),
            const SizedBox(width: 12),
            const Text(
              'EMERGENCY DETECTED',
              style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold),
            ),
          ],
        ),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              'Emergency ID: #$emergencyId',
              style: const TextStyle(color: Colors.white, fontSize: 18, fontWeight: FontWeight.bold),
            ),
            const SizedBox(height: 12),
            Text(
              'Type: ${aiData['incident_type'] ?? 'Unknown'}',
              style: const TextStyle(color: Colors.white70),
            ),
            Text(
              'Severity: ${aiData['severity'] ?? 'Unknown'}',
              style: const TextStyle(color: Colors.white70),
            ),
            Text(
              'Confidence: ${((aiData['confidence'] ?? 0.0) * 100).toStringAsFixed(1)}%',
              style: const TextStyle(color: Colors.white70),
            ),
            const SizedBox(height: 16),
            Container(
              padding: const EdgeInsets.all(12),
              decoration: BoxDecoration(
                color: Colors.white.withOpacity(0.2),
                borderRadius: BorderRadius.circular(8),
              ),
              child: Column(
                children: [
                  Row(
                    children: [
                      Icon(Icons.check_circle, color: Colors.greenAccent, size: 20),
                      const SizedBox(width: 8),
                      const Text(
                        'Police notified',
                        style: TextStyle(color: Colors.white),
                      ),
                    ],
                  ),
                  const SizedBox(height: 8),
                  Row(
                    children: [
                      Icon(Icons.check_circle, color: Colors.greenAccent, size: 20),
                      const SizedBox(width: 8),
                      const Text(
                        'Admin alerted',
                        style: TextStyle(color: Colors.white),
                      ),
                    ],
                  ),
                  const SizedBox(height: 8),
                  Row(
                    children: [
                      Icon(Icons.check_circle, color: Colors.greenAccent, size: 20),
                      const SizedBox(width: 8),
                      const Text(
                        'Emergency services dispatched',
                        style: TextStyle(color: Colors.white),
                      ),
                    ],
                  ),
                ],
              ),
            ),
          ],
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context),
            child: const Text(
              'Continue Monitoring',
              style: TextStyle(color: Colors.white),
            ),
          ),
        ],
      ),
    );
  }

  void _stopMonitoring() {
    _clipTimer?.cancel();
    if (_controller != null && _controller!.value.isRecordingVideo) {
      _controller!.stopVideoRecording();
    }

    setState(() {
      _isMonitoring = false;
      _isRecording = false;
      _status = 'Monitoring stopped';
    });

    _addLog('🛑 Auto-monitoring stopped');
    _addLog('📊 Session summary: ${_clipsProcessed} clips, ${_incidentsDetected} incidents, ${_emergenciesCreated} emergencies');
  }

  @override
  void dispose() {
    _clipTimer?.cancel();
    _controller?.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('AI Auto-Monitor'),
        backgroundColor: _isMonitoring ? Colors.green : Colors.blue,
        actions: [
          if (_isMonitoring)
            Container(
              margin: const EdgeInsets.only(right: 16),
              child: Row(
                children: [
                  Container(
                    width: 12,
                    height: 12,
                    decoration: BoxDecoration(
                      color: _isRecording ? Colors.red : Colors.orange,
                      shape: BoxShape.circle,
                    ),
                  ),
                  const SizedBox(width: 8),
                  Text(
                    _isRecording ? 'REC' : 'PROCESSING',
                    style: const TextStyle(fontWeight: FontWeight.bold),
                  ),
                ],
              ),
            ),
        ],
      ),
      body: Column(
        children: [
          // Camera Preview
          if (_controller != null && _controller!.value.isInitialized)
            AspectRatio(
              aspectRatio: _controller!.value.aspectRatio,
              child: CameraPreview(_controller!),
            )
          else
            Container(
              height: 250,
              color: Colors.black,
              child: const Center(
                child: CircularProgressIndicator(),
              ),
            ),

          // Status Bar
          Container(
            width: double.infinity,
            padding: const EdgeInsets.all(16),
            color: _isMonitoring ? Colors.green.shade100 : Colors.grey.shade200,
            child: Column(
              children: [
                Text(
                  _status,
                  style: TextStyle(
                    fontSize: 16,
                    fontWeight: FontWeight.bold,
                    color: _isMonitoring ? Colors.green.shade900 : Colors.black87,
                  ),
                  textAlign: TextAlign.center,
                ),
                const SizedBox(height: 8),
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceEvenly,
                  children: [
                    _buildStatChip('Clips', _clipsProcessed.toString(), Icons.video_library),
                    _buildStatChip('Incidents', _incidentsDetected.toString(), Icons.warning_amber),
                    _buildStatChip('Emergencies', _emergenciesCreated.toString(), Icons.emergency),
                  ],
                ),
              ],
            ),
          ),

          // Logs
          Expanded(
            child: Container(
              padding: const EdgeInsets.all(16),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Text(
                    'Activity Log',
                    style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
                  ),
                  const SizedBox(height: 8),
                  Expanded(
                    child: Container(
                      padding: const EdgeInsets.all(12),
                      decoration: BoxDecoration(
                        color: Colors.grey.shade900,
                        borderRadius: BorderRadius.circular(8),
                      ),
                      child: ListView.builder(
                        itemCount: _recentLogs.length,
                        itemBuilder: (context, index) {
                          return Padding(
                            padding: const EdgeInsets.symmetric(vertical: 4),
                            child: Text(
                              _recentLogs[index],
                              style: const TextStyle(
                                color: Colors.greenAccent,
                                fontFamily: 'monospace',
                                fontSize: 12,
                              ),
                            ),
                          );
                        },
                      ),
                    ),
                  ),
                ],
              ),
            ),
          ),

          // Control Button
          Padding(
            padding: const EdgeInsets.all(16),
            child: SizedBox(
              width: double.infinity,
              height: 60,
              child: ElevatedButton(
                onPressed: _isMonitoring ? _stopMonitoring : _startMonitoring,
                style: ElevatedButton.styleFrom(
                  backgroundColor: _isMonitoring ? Colors.red : Colors.green,
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(12),
                  ),
                ),
                child: Row(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    Icon(
                      _isMonitoring ? Icons.stop : Icons.play_arrow,
                      size: 32,
                    ),
                    const SizedBox(width: 12),
                    Text(
                      _isMonitoring ? 'STOP MONITORING' : 'START AUTO-MONITORING',
                      style: const TextStyle(
                        fontSize: 18,
                        fontWeight: FontWeight.bold,
                      ),
                    ),
                  ],
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildStatChip(String label, String value, IconData icon) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(20),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withOpacity(0.1),
            blurRadius: 4,
            offset: const Offset(0, 2),
          ),
        ],
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(icon, size: 20, color: Colors.blue),
          const SizedBox(width: 6),
          Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            mainAxisSize: MainAxisSize.min,
            children: [
              Text(
                label,
                style: TextStyle(fontSize: 10, color: Colors.grey.shade600),
              ),
              Text(
                value,
                style: const TextStyle(fontSize: 16, fontWeight: FontWeight.bold),
              ),
            ],
          ),
        ],
      ),
    );
  }
}
