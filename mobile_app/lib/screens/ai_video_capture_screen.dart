import 'package:flutter/material.dart';
import 'package:image_picker/image_picker.dart';
import 'dart:io';
import '../services/incident_service.dart';
import 'package:location/location.dart';
import 'package:video_player/video_player.dart';

/// AI-Powered Video Capture Screen
/// Records video from mobile camera, uploads to backend for AI analysis
/// AI automatically detects incidents, determines severity, and creates database entry
class AIVideoCaptureScreen extends StatefulWidget {
  const AIVideoCaptureScreen({super.key});

  @override
  State<AIVideoCaptureScreen> createState() => _AIVideoCaptureScreenState();
}

class _AIVideoCaptureScreenState extends State<AIVideoCaptureScreen> {
  final IncidentService _incidentService = IncidentService();
  final ImagePicker _picker = ImagePicker();
  
  File? _videoFile;
  VideoPlayerController? _videoController;
  LocationData? _currentLocation;
  
  bool _isRecording = false;
  bool _isUploading = false;
  bool _isAnalyzing = false;
  double _uploadProgress = 0.0;
  
  Map<String, dynamic>? _aiResults;
  String? _errorMessage;

  @override
  void initState() {
    super.initState();
    _getCurrentLocation();
  }

  @override
  void dispose() {
    _videoController?.dispose();
    super.dispose();
  }

  /// Get current GPS location
  Future<void> _getCurrentLocation() async {
    final location = Location();
    
    bool serviceEnabled = await location.serviceEnabled();
    if (!serviceEnabled) {
      serviceEnabled = await location.requestService();
      if (!serviceEnabled) {
        setState(() {
          _errorMessage = 'Location services are disabled';
        });
        return;
      }
    }

    PermissionStatus permissionGranted = await location.hasPermission();
    if (permissionGranted == PermissionStatus.denied) {
      permissionGranted = await location.requestPermission();
      if (permissionGranted != PermissionStatus.granted) {
        setState(() {
          _errorMessage = 'Location permission denied';
        });
        return;
      }
    }

    _currentLocation = await location.getLocation();
    setState(() {});
  }

  /// Record video using camera (max 30 seconds)
  Future<void> _recordVideo() async {
    try {
      final XFile? video = await _picker.pickVideo(
        source: ImageSource.camera,
        maxDuration: const Duration(seconds: 30),
      );

      if (video != null) {
        setState(() {
          _videoFile = File(video.path);
          _aiResults = null;
          _errorMessage = null;
        });

        // Initialize video player for preview
        _videoController = VideoPlayerController.file(_videoFile!)
          ..initialize().then((_) {
            setState(() {});
          });
      }
    } catch (e) {
      setState(() {
        _errorMessage = 'Failed to record video: $e';
      });
    }
  }

  /// Upload video and get AI analysis
  Future<void> _uploadAndAnalyze() async {
    if (_videoFile == null) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('Please record a video first'),
          backgroundColor: Colors.orange,
        ),
      );
      return;
    }

    if (_currentLocation == null) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('Unable to get location. Please enable location services.'),
          backgroundColor: Colors.red,
        ),
      );
      return;
    }

    setState(() {
      _isUploading = true;
      _isAnalyzing = false;
      _uploadProgress = 0.0;
      _errorMessage = null;
      _aiResults = null;
    });

    // Show uploading message
    if (mounted) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('Uploading video...'),
          duration: Duration(seconds: 2),
        ),
      );
    }

    final result = await _incidentService.analyzeVideoAndCreateIncident(
      videoFile: _videoFile!,
      latitude: _currentLocation!.latitude!,
      longitude: _currentLocation!.longitude!,
      onUploadProgress: (progress) {
        setState(() {
          _uploadProgress = progress;
          if (progress >= 100) {
            _isUploading = false;
            _isAnalyzing = true;
          }
        });
      },
    );

    setState(() {
      _isUploading = false;
      _isAnalyzing = false;
    });

    if (result['success']) {
      setState(() {
        _aiResults = result['data'];
      });

      if (!mounted) return;

      // Show success message
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(result['message'] ?? 'Analysis complete!'),
          backgroundColor: Colors.green,
          duration: const Duration(seconds: 3),
        ),
      );

      // Show results dialog
      _showResultsDialog();
    } else {
      setState(() {
        _errorMessage = result['message'];
      });

      if (!mounted) return;

      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(result['message']),
          backgroundColor: Colors.red,
          duration: const Duration(seconds: 4),
        ),
      );
    }
  }

  /// Show AI analysis results in dialog
  void _showResultsDialog() {
    if (_aiResults == null) return;

    final incidentDetected = _aiResults!['incident_detected'] ?? false;
    final incidentType = _aiResults!['incident_type'] ?? 'unknown';
    final confidence = _aiResults!['confidence'] ?? 0.0;
    final vehicleCount = _aiResults!['vehicle_count'] ?? 0;
    final avgSpeed = _aiResults!['avg_speed'] ?? 0.0;
    final stationaryCount = _aiResults!['stationary_count'] ?? 0;
    final incidentCreated = _aiResults!['incident_created'] ?? false;
    final severity = _aiResults!['severity'] ?? 'unknown';

    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        title: Row(
          children: [
            Icon(
              incidentDetected ? Icons.warning_amber : Icons.check_circle,
              color: incidentDetected ? Colors.red : Colors.green,
              size: 32,
            ),
            const SizedBox(width: 12),
            Expanded(
              child: Text(
                incidentDetected ? 'Incident Detected!' : 'No Incident',
                style: const TextStyle(fontSize: 20, fontWeight: FontWeight.bold),
              ),
            ),
          ],
        ),
        content: SingleChildScrollView(
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              if (incidentDetected) ...[
                _buildResultRow(
                  'Type',
                  incidentType.toString().toUpperCase().replaceAll('_', ' '),
                  Icons.category,
                ),
                _buildResultRow(
                  'Severity',
                  severity.toString().toUpperCase(),
                  Icons.priority_high,
                  color: _getSeverityColor(severity),
                ),
                _buildResultRow(
                  'Confidence',
                  '${(confidence * 100).toStringAsFixed(1)}%',
                  Icons.analytics,
                ),
                const Divider(height: 24),
              ],
              _buildResultRow(
                'Vehicles Detected',
                vehicleCount.toString(),
                Icons.directions_car,
              ),
              _buildResultRow(
                'Average Speed',
                '${avgSpeed.toStringAsFixed(1)} km/h',
                Icons.speed,
              ),
              _buildResultRow(
                'Stationary Vehicles',
                stationaryCount.toString(),
                Icons.stop_circle,
              ),
              if (incidentCreated) ...[
                const Divider(height: 24),
                Container(
                  padding: const EdgeInsets.all(12),
                  decoration: BoxDecoration(
                    color: Colors.green.withOpacity(0.1),
                    borderRadius: BorderRadius.circular(8),
                    border: Border.all(color: Colors.green),
                  ),
                  child: const Row(
                    children: [
                      Icon(Icons.check_circle, color: Colors.green),
                      SizedBox(width: 8),
                      Expanded(
                        child: Text(
                          'Incident saved to database.\nNotifications sent to authorities.',
                          style: TextStyle(color: Colors.green, fontSize: 12),
                        ),
                      ),
                    ],
                  ),
                ),
              ],
            ],
          ),
        ),
        actions: [
          TextButton(
            onPressed: () {
              Navigator.pop(context);
              setState(() {
                _videoFile = null;
                _aiResults = null;
                _videoController?.dispose();
                _videoController = null;
              });
            },
            child: const Text('Record Another'),
          ),
          ElevatedButton(
            onPressed: () {
              Navigator.pop(context);
              Navigator.pop(context); // Return to previous screen
            },
            child: const Text('Done'),
          ),
        ],
      ),
    );
  }

  Widget _buildResultRow(String label, String value, IconData icon, {Color? color}) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 6),
      child: Row(
        children: [
          Icon(icon, size: 20, color: color ?? Colors.blue),
          const SizedBox(width: 12),
          Expanded(
            child: Text(
              label,
              style: const TextStyle(fontSize: 14, color: Colors.grey),
            ),
          ),
          Text(
            value,
            style: TextStyle(
              fontSize: 14,
              fontWeight: FontWeight.bold,
              color: color ?? Colors.black87,
            ),
          ),
        ],
      ),
    );
  }

  Color _getSeverityColor(String severity) {
    switch (severity.toLowerCase()) {
      case 'critical':
        return Colors.red;
      case 'high':
        return Colors.orange;
      case 'medium':
        return Colors.yellow[700]!;
      case 'low':
        return Colors.blue;
      default:
        return Colors.grey;
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('AI Video Analysis'),
        centerTitle: true,
        backgroundColor: Colors.deepPurple,
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            // Info Card
            Card(
              color: Colors.blue[50],
              child: Padding(
                padding: const EdgeInsets.all(16),
                child: Column(
                  children: [
                    Icon(Icons.video_camera_front, size: 48, color: Colors.blue[700]),
                    const SizedBox(height: 12),
                    const Text(
                      'AI-Powered Incident Detection',
                      style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
                      textAlign: TextAlign.center,
                    ),
                    const SizedBox(height: 8),
                    const Text(
                      'Record traffic footage (max 30 seconds)\nAI will analyze and detect incidents automatically',
                      style: TextStyle(fontSize: 14, color: Colors.black54),
                      textAlign: TextAlign.center,
                    ),
                  ],
                ),
              ),
            ),
            const SizedBox(height: 24),

            // Location Status
            if (_currentLocation != null)
              Card(
                color: Colors.green[50],
                child: ListTile(
                  leading: const Icon(Icons.location_on, color: Colors.green),
                  title: const Text('Location Acquired'),
                  subtitle: Text(
                    'Lat: ${_currentLocation!.latitude!.toStringAsFixed(6)}\n'
                    'Lng: ${_currentLocation!.longitude!.toStringAsFixed(6)}',
                    style: const TextStyle(fontSize: 11),
                  ),
                ),
              ),

            // Video Preview
            if (_videoFile != null) ...[
              const SizedBox(height: 16),
              Card(
                child: Column(
                  children: [
                    if (_videoController != null && _videoController!.value.isInitialized)
                      AspectRatio(
                        aspectRatio: _videoController!.value.aspectRatio,
                        child: VideoPlayer(_videoController!),
                      )
                    else
                      Container(
                        height: 200,
                        color: Colors.black12,
                        child: const Center(
                          child: CircularProgressIndicator(),
                        ),
                      ),
                    Padding(
                      padding: const EdgeInsets.all(12),
                      child: Row(
                        mainAxisAlignment: MainAxisAlignment.center,
                        children: [
                          if (_videoController != null && _videoController!.value.isInitialized)
                            IconButton(
                              icon: Icon(
                                _videoController!.value.isPlaying
                                    ? Icons.pause
                                    : Icons.play_arrow,
                              ),
                              onPressed: () {
                                setState(() {
                                  _videoController!.value.isPlaying
                                      ? _videoController!.pause()
                                      : _videoController!.play();
                                });
                              },
                            ),
                          const SizedBox(width: 16),
                          ElevatedButton.icon(
                            onPressed: _recordVideo,
                            icon: const Icon(Icons.refresh),
                            label: const Text('Re-record'),
                            style: ElevatedButton.styleFrom(
                              backgroundColor: Colors.orange,
                            ),
                          ),
                        ],
                      ),
                    ),
                  ],
                ),
              ),
            ],

            // Upload Progress
            if (_isUploading) ...[
              const SizedBox(height: 16),
              Card(
                child: Padding(
                  padding: const EdgeInsets.all(16),
                  child: Column(
                    children: [
                      const Text('Uploading video...', style: TextStyle(fontSize: 16)),
                      const SizedBox(height: 12),
                      LinearProgressIndicator(
                        value: _uploadProgress / 100,
                        backgroundColor: Colors.grey[200],
                        valueColor: const AlwaysStoppedAnimation<Color>(Colors.blue),
                      ),
                      const SizedBox(height: 8),
                      Text('${_uploadProgress.toStringAsFixed(0)}%'),
                    ],
                  ),
                ),
              ),
            ],

            // AI Analysis Progress
            if (_isAnalyzing) ...[
              const SizedBox(height: 16),
              Card(
                color: Colors.purple[50],
                child: const Padding(
                  padding: EdgeInsets.all(16),
                  child: Column(
                    children: [
                      CircularProgressIndicator(),
                      SizedBox(height: 12),
                      Text(
                        '🤖 AI analyzing video...',
                        style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold),
                      ),
                      SizedBox(height: 4),
                      Text(
                        'Detecting incidents, counting vehicles, analyzing traffic flow',
                        style: TextStyle(fontSize: 12, color: Colors.black54),
                        textAlign: TextAlign.center,
                      ),
                    ],
                  ),
                ),
              ),
            ],

            // Error Message
            if (_errorMessage != null) ...[
              const SizedBox(height: 16),
              Card(
                color: Colors.red[50],
                child: ListTile(
                  leading: const Icon(Icons.error, color: Colors.red),
                  title: const Text('Error'),
                  subtitle: Text(_errorMessage!),
                ),
              ),
            ],

            const SizedBox(height: 24),

            // Action Buttons
            if (_videoFile == null)
              ElevatedButton.icon(
                onPressed: _recordVideo,
                icon: const Icon(Icons.videocam, size: 32),
                label: const Text('Record Video', style: TextStyle(fontSize: 18)),
                style: ElevatedButton.styleFrom(
                  backgroundColor: Colors.deepPurple,
                  padding: const EdgeInsets.symmetric(vertical: 16),
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(12),
                  ),
                ),
              )
            else if (!_isUploading && !_isAnalyzing)
              ElevatedButton.icon(
                onPressed: _uploadAndAnalyze,
                icon: const Icon(Icons.cloud_upload, size: 32),
                label: const Text('Upload & Analyze', style: TextStyle(fontSize: 18)),
                style: ElevatedButton.styleFrom(
                  backgroundColor: Colors.blue,
                  padding: const EdgeInsets.symmetric(vertical: 16),
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(12),
                  ),
                ),
              ),
          ],
        ),
      ),
    );
  }
}
