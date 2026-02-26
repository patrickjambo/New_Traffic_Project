import 'package:flutter/material.dart';
import 'package:image_picker/image_picker.dart';
import 'dart:io';
import '../services/incident_service.dart';
import '../config/app_theme.dart';
import 'package:location/location.dart';
import 'package:video_player/video_player.dart';

/// ============================================================================
/// AI Video Capture Screen - TrafficGuard Mobile App
/// ============================================================================
/// AI-powered video analysis screen featuring:
/// - Video recording with camera
/// - Automatic AI analysis
/// - Real-time upload progress
/// - Results visualization
/// - Consistent dark theme design
/// ============================================================================

class AIVideoCaptureScreen extends StatefulWidget {
  const AIVideoCaptureScreen({super.key});

  @override
  State<AIVideoCaptureScreen> createState() => _AIVideoCaptureScreenState();
}

class _AIVideoCaptureScreenState extends State<AIVideoCaptureScreen>
    with SingleTickerProviderStateMixin {
  final IncidentService _incidentService = IncidentService();
  final ImagePicker _picker = ImagePicker();
  
  File? _videoFile;
  VideoPlayerController? _videoController;
  LocationData? _currentLocation;
  
  // ignore: unused_field
  bool _isRecording = false;
  bool _isUploading = false;
  bool _isAnalyzing = false;
  double _uploadProgress = 0.0;
  
  Map<String, dynamic>? _aiResults;
  String? _errorMessage;

  late AnimationController _pulseController;
  late Animation<double> _pulseAnimation;

  @override
  void initState() {
    super.initState();
    _getCurrentLocation();
    _initAnimations();
  }

  void _initAnimations() {
    _pulseController = AnimationController(
      duration: const Duration(milliseconds: 1500),
      vsync: this,
    )..repeat(reverse: true);
    _pulseAnimation = Tween<double>(begin: 1.0, end: 1.1).animate(
      CurvedAnimation(parent: _pulseController, curve: Curves.easeInOut),
    );
  }

  @override
  void dispose() {
    _videoController?.dispose();
    _pulseController.dispose();
    super.dispose();
  }

  Future<void> _getCurrentLocation() async {
    final location = Location();
    
    bool serviceEnabled = await location.serviceEnabled();
    if (!serviceEnabled) {
      serviceEnabled = await location.requestService();
      if (!serviceEnabled) {
        setState(() => _errorMessage = 'Location services are disabled');
        return;
      }
    }

    PermissionStatus permissionGranted = await location.hasPermission();
    if (permissionGranted == PermissionStatus.denied) {
      permissionGranted = await location.requestPermission();
      if (permissionGranted != PermissionStatus.granted) {
        setState(() => _errorMessage = 'Location permission denied');
        return;
      }
    }

    _currentLocation = await location.getLocation();
    setState(() {});
  }

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

        _videoController = VideoPlayerController.file(_videoFile!)
          ..initialize().then((_) {
            setState(() {});
          });
      }
    } catch (e) {
      setState(() => _errorMessage = 'Failed to record video: $e');
    }
  }

  Future<void> _uploadAndAnalyze() async {
    if (_videoFile == null) {
      _showSnackBar('Please record a video first', AppColors.warning);
      return;
    }

    if (_currentLocation == null) {
      _showSnackBar('Unable to get location. Please enable location services.', AppColors.error);
      return;
    }

    setState(() {
      _isUploading = true;
      _isAnalyzing = false;
      _uploadProgress = 0.0;
      _errorMessage = null;
      _aiResults = null;
    });

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
      setState(() => _aiResults = result['data']);
      _showSnackBar(result['message'] ?? 'Analysis complete!', AppColors.success);
      _showResultsDialog();
    } else {
      setState(() => _errorMessage = result['message']);
      _showSnackBar(result['message'], AppColors.error);
    }
  }

  void _showSnackBar(String message, Color color) {
    if (!mounted) return;
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text(message),
        backgroundColor: color,
        behavior: SnackBarBehavior.floating,
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
      ),
    );
  }

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

    showModalBottomSheet(
      context: context,
      backgroundColor: Colors.transparent,
      isScrollControlled: true,
      builder: (context) => Container(
        decoration: const BoxDecoration(
          color: AppColors.backgroundSecondary,
          borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
        ),
        padding: const EdgeInsets.all(24),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            // Handle bar
            Container(
              width: 40,
              height: 4,
              decoration: BoxDecoration(
                color: AppColors.border,
                borderRadius: BorderRadius.circular(2),
              ),
            ),
            const SizedBox(height: 24),
            
            // Result header
            Container(
              padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(
                color: incidentDetected
                    ? AppColors.error.withValues(alpha: 0.1)
                    : AppColors.success.withValues(alpha: 0.1),
                borderRadius: BorderRadius.circular(16),
              ),
              child: Row(
                children: [
                  Container(
                    padding: const EdgeInsets.all(12),
                    decoration: BoxDecoration(
                      color: incidentDetected
                          ? AppColors.error.withValues(alpha: 0.1)
                          : AppColors.success.withValues(alpha: 0.1),
                      borderRadius: BorderRadius.circular(12),
                    ),
                    child: Icon(
                      incidentDetected ? Icons.warning_amber : Icons.check_circle,
                      color: incidentDetected ? AppColors.error : AppColors.success,
                      size: 32,
                    ),
                  ),
                  const SizedBox(width: 16),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          incidentDetected ? 'Incident Detected!' : 'No Incident',
                          style: AppTextStyles.titleMedium.copyWith(
                            color: incidentDetected ? AppColors.error : AppColors.success,
                          ),
                        ),
                        if (incidentDetected)
                          Text(
                            '${incidentType.toString().toUpperCase().replaceAll('_', ' ')} - ${severity.toString().toUpperCase()}',
                            style: AppTextStyles.bodySmall.copyWith(color: AppColors.textSecondary),
                          ),
                      ],
                    ),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 24),

            // Stats grid
            Container(
              padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(
                color: AppColors.background,
                borderRadius: BorderRadius.circular(16),
                border: Border.all(color: AppColors.border),
              ),
              child: Column(
                children: [
                  _buildStatRow(Icons.directions_car, 'Vehicles Detected', vehicleCount.toString()),
                  const Divider(color: AppColors.border, height: 20),
                  _buildStatRow(Icons.speed, 'Average Speed', '${avgSpeed.toStringAsFixed(1)} km/h'),
                  const Divider(color: AppColors.border, height: 20),
                  _buildStatRow(Icons.stop_circle_outlined, 'Stationary', stationaryCount.toString()),
                  if (incidentDetected) ...[
                    const Divider(color: AppColors.border, height: 20),
                    _buildStatRow(Icons.analytics, 'Confidence', '${(confidence * 100).toStringAsFixed(1)}%'),
                  ],
                ],
              ),
            ),

            if (incidentCreated) ...[
              const SizedBox(height: 16),
              Container(
                padding: const EdgeInsets.all(12),
                decoration: BoxDecoration(
                  color: AppColors.success.withValues(alpha: 0.1),
                  borderRadius: BorderRadius.circular(12),
                  border: Border.all(color: AppColors.success.withValues(alpha: 0.3)),
                ),
                child: Row(
                  children: [
                    const Icon(Icons.check_circle, color: AppColors.success, size: 20),
                    const SizedBox(width: 10),
                    Expanded(
                      child: Text(
                        'Incident saved • Authorities notified',
                        style: AppTextStyles.bodySmall.copyWith(color: AppColors.success),
                      ),
                    ),
                  ],
                ),
              ),
            ],
            const SizedBox(height: 24),

            // Action buttons
            Row(
              children: [
                Expanded(
                  child: OutlinedButton(
                    onPressed: () {
                      Navigator.pop(context);
                      setState(() {
                        _videoFile = null;
                        _aiResults = null;
                        _videoController?.dispose();
                        _videoController = null;
                      });
                    },
                    style: OutlinedButton.styleFrom(
                      foregroundColor: AppColors.textSecondary,
                      side: const BorderSide(color: AppColors.border),
                      padding: const EdgeInsets.symmetric(vertical: 14),
                      shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(12),
                      ),
                    ),
                    child: const Text('Record Another'),
                  ),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: ElevatedButton(
                    onPressed: () {
                      Navigator.pop(context);
                      Navigator.pop(context);
                    },
                    style: ElevatedButton.styleFrom(
                      backgroundColor: AppColors.primary,
                      foregroundColor: Colors.white,
                      padding: const EdgeInsets.symmetric(vertical: 14),
                      shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(12),
                      ),
                    ),
                    child: const Text('Done'),
                  ),
                ),
              ],
            ),
            const SizedBox(height: 8),
          ],
        ),
      ),
    );
  }

  Widget _buildStatRow(IconData icon, String label, String value) {
    return Row(
      children: [
        Container(
          padding: const EdgeInsets.all(8),
          decoration: BoxDecoration(
            color: AppColors.primary.withValues(alpha: 0.1),
            borderRadius: BorderRadius.circular(8),
          ),
          child: Icon(icon, size: 18, color: AppColors.primary),
        ),
        const SizedBox(width: 12),
        Expanded(
          child: Text(
            label,
            style: AppTextStyles.bodyMedium.copyWith(color: AppColors.textSecondary),
          ),
        ),
        Text(
          value,
          style: AppTextStyles.bodyMedium.copyWith(
            color: AppColors.textPrimary,
            fontWeight: FontWeight.w600,
          ),
        ),
      ],
    );
  }

  // ignore: unused_element
  Color _getSeverityColor(String severity) {
    switch (severity.toLowerCase()) {
      case 'critical':
        return AppColors.error;
      case 'high':
        return Colors.orange;
      case 'medium':
        return AppColors.warning;
      case 'low':
        return AppColors.success;
      default:
        return AppColors.textTertiary;
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.background,
      appBar: AppBar(
        backgroundColor: AppColors.background,
        elevation: 0,
        leading: IconButton(
          icon: Container(
            padding: const EdgeInsets.all(8),
            decoration: BoxDecoration(
              color: AppColors.backgroundSecondary,
              borderRadius: BorderRadius.circular(10),
              border: Border.all(color: AppColors.border),
            ),
            child: const Icon(
              Icons.arrow_back,
              color: AppColors.textPrimary,
              size: 20,
            ),
          ),
          onPressed: () => Navigator.pop(context),
        ),
        title: Text(
          'AI Video Analysis',
          style: AppTextStyles.titleLarge.copyWith(color: AppColors.textPrimary),
        ),
        centerTitle: true,
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(20),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            // Info Card
            Container(
              padding: const EdgeInsets.all(24),
              decoration: BoxDecoration(
                gradient: LinearGradient(
                  colors: [
                    AppColors.primary.withValues(alpha: 0.15),
                    AppColors.primary.withValues(alpha: 0.05),
                  ],
                  begin: Alignment.topLeft,
                  end: Alignment.bottomRight,
                ),
                borderRadius: BorderRadius.circular(20),
                border: Border.all(color: AppColors.primary.withValues(alpha: 0.2)),
              ),
              child: Column(
                children: [
                  Container(
                    padding: const EdgeInsets.all(16),
                    decoration: BoxDecoration(
                      color: AppColors.primary.withValues(alpha: 0.1),
                      borderRadius: BorderRadius.circular(16),
                    ),
                    child: const Icon(
                      Icons.psychology,
                      size: 40,
                      color: AppColors.primary,
                    ),
                  ),
                  const SizedBox(height: 16),
                  Text(
                    'AI-Powered Detection',
                    style: AppTextStyles.titleMedium.copyWith(color: AppColors.textPrimary),
                  ),
                  const SizedBox(height: 8),
                  Text(
                    'Record traffic footage (max 30 seconds)\nAI will analyze and detect incidents automatically',
                    style: AppTextStyles.bodyMedium.copyWith(color: AppColors.textSecondary),
                    textAlign: TextAlign.center,
                  ),
                ],
              ),
            ),
            const SizedBox(height: 20),

            // Location Status
            if (_currentLocation != null)
              Container(
                padding: const EdgeInsets.all(14),
                decoration: BoxDecoration(
                  color: AppColors.backgroundSecondary,
                  borderRadius: BorderRadius.circular(14),
                  border: Border.all(color: AppColors.border),
                ),
                child: Row(
                  children: [
                    Container(
                      padding: const EdgeInsets.all(10),
                      decoration: BoxDecoration(
                        color: AppColors.success.withValues(alpha: 0.1),
                        borderRadius: BorderRadius.circular(10),
                      ),
                      child: const Icon(Icons.location_on, color: AppColors.success, size: 22),
                    ),
                    const SizedBox(width: 14),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            'Location Acquired',
                            style: AppTextStyles.bodyMedium.copyWith(
                              color: AppColors.textPrimary,
                              fontWeight: FontWeight.w500,
                            ),
                          ),
                          Text(
                            '${_currentLocation!.latitude!.toStringAsFixed(6)}, ${_currentLocation!.longitude!.toStringAsFixed(6)}',
                            style: AppTextStyles.bodySmall.copyWith(color: AppColors.textTertiary),
                          ),
                        ],
                      ),
                    ),
                    const Icon(Icons.check_circle, color: AppColors.success, size: 20),
                  ],
                ),
              ),

            // Video Preview
            if (_videoFile != null) ...[
              const SizedBox(height: 20),
              Container(
                decoration: BoxDecoration(
                  color: AppColors.backgroundSecondary,
                  borderRadius: BorderRadius.circular(16),
                  border: Border.all(color: AppColors.border),
                ),
                child: Column(
                  children: [
                    ClipRRect(
                      borderRadius: const BorderRadius.vertical(top: Radius.circular(16)),
                      child: _videoController != null && _videoController!.value.isInitialized
                          ? AspectRatio(
                              aspectRatio: _videoController!.value.aspectRatio,
                              child: VideoPlayer(_videoController!),
                            )
                          : Container(
                              height: 200,
                              color: AppColors.background,
                              child: const Center(
                                child: CircularProgressIndicator(color: AppColors.primary),
                              ),
                            ),
                    ),
                    Padding(
                      padding: const EdgeInsets.all(12),
                      child: Row(
                        mainAxisAlignment: MainAxisAlignment.center,
                        children: [
                          if (_videoController != null && _videoController!.value.isInitialized)
                            IconButton(
                              icon: Container(
                                padding: const EdgeInsets.all(10),
                                decoration: BoxDecoration(
                                  color: AppColors.primary.withValues(alpha: 0.1),
                                  borderRadius: BorderRadius.circular(10),
                                ),
                                child: Icon(
                                  _videoController!.value.isPlaying ? Icons.pause : Icons.play_arrow,
                                  color: AppColors.primary,
                                ),
                              ),
                              onPressed: () {
                                setState(() {
                                  _videoController!.value.isPlaying
                                      ? _videoController!.pause()
                                      : _videoController!.play();
                                });
                              },
                            ),
                          const SizedBox(width: 12),
                          TextButton.icon(
                            onPressed: _recordVideo,
                            icon: const Icon(Icons.refresh, size: 20),
                            label: const Text('Re-record'),
                            style: TextButton.styleFrom(foregroundColor: AppColors.warning),
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
              const SizedBox(height: 20),
              Container(
                padding: const EdgeInsets.all(20),
                decoration: BoxDecoration(
                  color: AppColors.backgroundSecondary,
                  borderRadius: BorderRadius.circular(16),
                  border: Border.all(color: AppColors.border),
                ),
                child: Column(
                  children: [
                    Row(
                      children: [
                        const Icon(Icons.cloud_upload, color: AppColors.primary),
                        const SizedBox(width: 12),
                        Text(
                          'Uploading video...',
                          style: AppTextStyles.bodyMedium.copyWith(color: AppColors.textPrimary),
                        ),
                        const Spacer(),
                        Text(
                          '${_uploadProgress.toStringAsFixed(0)}%',
                          style: AppTextStyles.bodyMedium.copyWith(
                            color: AppColors.primary,
                            fontWeight: FontWeight.w600,
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 12),
                    ClipRRect(
                      borderRadius: BorderRadius.circular(4),
                      child: LinearProgressIndicator(
                        value: _uploadProgress / 100,
                        backgroundColor: AppColors.border,
                        valueColor: const AlwaysStoppedAnimation<Color>(AppColors.primary),
                        minHeight: 6,
                      ),
                    ),
                  ],
                ),
              ),
            ],

            // AI Analysis Progress
            if (_isAnalyzing) ...[
              const SizedBox(height: 20),
              Container(
                padding: const EdgeInsets.all(24),
                decoration: BoxDecoration(
                  gradient: LinearGradient(
                    colors: [
                      AppColors.primary.withValues(alpha: 0.15),
                      AppColors.primary.withValues(alpha: 0.05),
                    ],
                  ),
                  borderRadius: BorderRadius.circular(16),
                  border: Border.all(color: AppColors.primary.withValues(alpha: 0.2)),
                ),
                child: Column(
                  children: [
                    ScaleTransition(
                      scale: _pulseAnimation,
                      child: Container(
                        padding: const EdgeInsets.all(16),
                        decoration: BoxDecoration(
                          color: AppColors.primary.withValues(alpha: 0.1),
                          borderRadius: BorderRadius.circular(16),
                        ),
                        child: const Icon(Icons.psychology, size: 40, color: AppColors.primary),
                      ),
                    ),
                    const SizedBox(height: 16),
                    Text(
                      'AI analyzing video...',
                      style: AppTextStyles.titleMedium.copyWith(color: AppColors.textPrimary),
                    ),
                    const SizedBox(height: 6),
                    Text(
                      'Detecting incidents, counting vehicles, analyzing traffic flow',
                      style: AppTextStyles.bodySmall.copyWith(color: AppColors.textSecondary),
                      textAlign: TextAlign.center,
                    ),
                  ],
                ),
              ),
            ],

            // Error Message
            if (_errorMessage != null) ...[
              const SizedBox(height: 20),
              Container(
                padding: const EdgeInsets.all(14),
                decoration: BoxDecoration(
                  color: AppColors.error.withValues(alpha: 0.1),
                  borderRadius: BorderRadius.circular(14),
                  border: Border.all(color: AppColors.error.withValues(alpha: 0.3)),
                ),
                child: Row(
                  children: [
                    const Icon(Icons.error_outline, color: AppColors.error),
                    const SizedBox(width: 12),
                    Expanded(
                      child: Text(
                        _errorMessage!,
                        style: AppTextStyles.bodyMedium.copyWith(color: AppColors.error),
                      ),
                    ),
                  ],
                ),
              ),
            ],

            const SizedBox(height: 28),

            // Action Buttons
            if (_videoFile == null)
              SizedBox(
                height: 60,
                child: ElevatedButton(
                  onPressed: _recordVideo,
                  style: ElevatedButton.styleFrom(
                    backgroundColor: AppColors.primary,
                    foregroundColor: Colors.white,
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(16),
                    ),
                    elevation: 0,
                  ),
                  child: Row(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      const Icon(Icons.videocam, size: 28),
                      const SizedBox(width: 12),
                      Text(
                        'Record Video',
                        style: AppTextStyles.titleMedium.copyWith(color: Colors.white),
                      ),
                    ],
                  ),
                ),
              )
            else if (!_isUploading && !_isAnalyzing)
              SizedBox(
                height: 60,
                child: ElevatedButton(
                  onPressed: _uploadAndAnalyze,
                  style: ElevatedButton.styleFrom(
                    backgroundColor: AppColors.primary,
                    foregroundColor: Colors.white,
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(16),
                    ),
                    elevation: 0,
                  ),
                  child: Row(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      const Icon(Icons.cloud_upload, size: 28),
                      const SizedBox(width: 12),
                      Text(
                        'Upload & Analyze',
                        style: AppTextStyles.titleMedium.copyWith(color: Colors.white),
                      ),
                    ],
                  ),
                ),
              ),
            const SizedBox(height: 20),
          ],
        ),
      ),
    );
  }
}
