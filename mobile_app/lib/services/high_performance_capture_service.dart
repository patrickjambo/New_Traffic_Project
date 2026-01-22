import 'package:camera/camera.dart';
import 'package:flutter/foundation.dart';
import 'package:path_provider/path_provider.dart';
import 'package:location/location.dart';
import 'dart:io';
import 'dart:async';
import 'fast_upload_service.dart';

/// High-Performance Auto Capture Service
/// 
/// KEY IMPROVEMENTS:
/// - Parallel capture and upload (capture next while uploading previous)
/// - Non-blocking uploads via FastUploadService queue
/// - Optimized video settings for faster encoding
/// - Shorter clips (3 seconds) for faster turnaround
/// - Pre-allocated file paths to reduce latency
/// - GPS caching to avoid location delays
class HighPerformanceCaptureService {
  static final HighPerformanceCaptureService _instance = HighPerformanceCaptureService._internal();
  factory HighPerformanceCaptureService() => _instance;
  HighPerformanceCaptureService._internal();

  CameraController? _cameraController;
  Timer? _captureTimer;
  bool _isRunning = false;
  bool _isRecording = false;
  bool _isInitialized = false;
  
  final FastUploadService _uploadService = FastUploadService();
  final Location _location = Location();
  
  // Cached location (updated every 10 seconds)
  LocationData? _cachedLocation;
  Timer? _locationTimer;
  
  // Configuration
  static const int clipDurationSeconds = 3; // Shorter clips for faster processing
  static const int captureIntervalSeconds = 3; // Continuous capture
  
  // Statistics
  int clipsCaptured = 0;
  DateTime? _startTime;
  
  // Callbacks
  Function(CaptureStats)? onStatsUpdate;
  Function(String message)? onStatusMessage;

  bool get isRunning => _isRunning;
  bool get isRecording => _isRecording;
  bool get isInitialized => _isInitialized;
  CameraController? get cameraController => _cameraController;

  /// Initialize camera with optimized settings
  Future<bool> initialize() async {
    if (_isInitialized) return true;
    
    try {
      onStatusMessage?.call('Initializing camera...');
      
      final cameras = await availableCameras();
      if (cameras.isEmpty) {
        onStatusMessage?.call('❌ No cameras available');
        return false;
      }

      // Use back camera
      final camera = cameras.firstWhere(
        (cam) => cam.lensDirection == CameraLensDirection.back,
        orElse: () => cameras.first,
      );

      // Optimized camera settings for fast processing
      _cameraController = CameraController(
        camera,
        ResolutionPreset.medium, // Balance quality vs speed
        enableAudio: false, // No audio = smaller files
        imageFormatGroup: ImageFormatGroup.yuv420, // Faster encoding
      );

      await _cameraController!.initialize();
      
      // Set focus and exposure for traffic scenarios
      if (_cameraController!.value.isInitialized) {
        await _cameraController!.setFocusMode(FocusMode.auto);
        await _cameraController!.setExposureMode(ExposureMode.auto);
      }
      
      _isInitialized = true;
      onStatusMessage?.call('✅ Camera ready');
      return true;
      
    } catch (e) {
      onStatusMessage?.call('❌ Camera init failed: $e');
      return false;
    }
  }

  /// Initialize location with permissions
  Future<bool> _initLocation() async {
    try {
      bool serviceEnabled = await _location.serviceEnabled();
      if (!serviceEnabled) {
        serviceEnabled = await _location.requestService();
        if (!serviceEnabled) return false;
      }

      PermissionStatus permission = await _location.hasPermission();
      if (permission == PermissionStatus.denied) {
        permission = await _location.requestPermission();
        if (permission != PermissionStatus.granted) return false;
      }

      // Get initial location
      _cachedLocation = await _location.getLocation().timeout(
        const Duration(seconds: 5),
        onTimeout: () => throw TimeoutException('Location timeout'),
      );
      
      return true;
    } catch (e) {
      print('Location init error: $e');
      return false;
    }
  }

  /// Start high-performance capture
  Future<bool> start() async {
    if (_isRunning) return true;

    onStatusMessage?.call('Starting capture system...');

    // Initialize camera
    if (!_isInitialized) {
      final cameraOk = await initialize();
      if (!cameraOk) return false;
    }

    // Initialize location (non-blocking)
    _initLocation().then((ok) {
      if (ok) {
        onStatusMessage?.call('📍 GPS locked');
        _startLocationUpdates();
      } else {
        onStatusMessage?.call('⚠️ GPS unavailable');
      }
    });

    // Setup upload service callbacks
    _uploadService.onStatsUpdate = (stats) {
      _notifyStats();
    };

    _isRunning = true;
    _startTime = DateTime.now();
    clipsCaptured = 0;
    
    // Start capture loop
    _startCaptureLoop();
    
    onStatusMessage?.call('🎬 Capture started');
    return true;
  }

  /// Stop capture
  Future<void> stop() async {
    onStatusMessage?.call('Stopping capture...');
    
    _isRunning = false;
    _captureTimer?.cancel();
    _locationTimer?.cancel();
    
    if (_isRecording && _cameraController != null) {
      try {
        await _cameraController!.stopVideoRecording();
      } catch (e) {
        print('Error stopping recording: $e');
      }
    }
    _isRecording = false;
    
    onStatusMessage?.call('⏹️ Capture stopped');
  }

  /// Dispose all resources
  Future<void> dispose() async {
    await stop();
    _uploadService.stopProcessing();
    await _cameraController?.dispose();
    _cameraController = null;
    _isInitialized = false;
  }

  /// Start location updates (cached every 10 seconds)
  void _startLocationUpdates() {
    _locationTimer = Timer.periodic(const Duration(seconds: 10), (_) async {
      try {
        _cachedLocation = await _location.getLocation().timeout(
          const Duration(seconds: 3),
          onTimeout: () => _cachedLocation!,
        );
      } catch (e) {
        // Keep using cached location
      }
    });
  }

  /// Start the capture loop
  void _startCaptureLoop() {
    // Immediate first capture
    _captureClip();
    
    // Then capture every interval
    _captureTimer = Timer.periodic(
      Duration(seconds: captureIntervalSeconds),
      (_) {
        if (_isRunning && !_isRecording) {
          _captureClip();
        }
      },
    );
  }

  /// Capture a single clip - NON-BLOCKING upload
  Future<void> _captureClip() async {
    if (_isRecording || _cameraController == null || !_cameraController!.value.isInitialized) {
      return;
    }

    try {
      _isRecording = true;
      
      // Pre-generate file path
      final directory = await getTemporaryDirectory();
      final timestamp = DateTime.now().millisecondsSinceEpoch;
      final filePath = '${directory.path}/clip_$timestamp.mp4';
      
      onStatusMessage?.call('🎥 Recording...');
      
      // Start recording
      await _cameraController!.startVideoRecording();
      
      // Record for clip duration
      await Future.delayed(Duration(seconds: clipDurationSeconds));
      
      if (!_isRunning) {
        _isRecording = false;
        return;
      }

      // Stop recording
      final videoFile = await _cameraController!.stopVideoRecording();
      _isRecording = false;
      
      // Quick file verification (non-blocking)
      final file = File(videoFile.path);
      
      if (await file.exists()) {
        final fileSize = await file.length();
        
        if (fileSize > 1000) { // At least 1KB
          clipsCaptured++;
          
          // 🚀 QUEUE UPLOAD - Returns immediately!
          _uploadService.queueUpload(
            file,
            location: _cachedLocation,
            priority: 0,
          );
          
          onStatusMessage?.call('📤 Clip #$clipsCaptured queued');
          _notifyStats();
          
        } else {
          onStatusMessage?.call('⚠️ Empty clip, skipping');
          await file.delete();
        }
      }
      
    } catch (e) {
      _isRecording = false;
      onStatusMessage?.call('❌ Capture error: $e');
      print('Capture error: $e');
    }
  }

  /// Get comprehensive stats
  CaptureStats getStats() {
    final uploadStats = _uploadService.getStats();
    final runtime = _startTime != null 
        ? DateTime.now().difference(_startTime!) 
        : Duration.zero;
    
    return CaptureStats(
      clipsCaptured: clipsCaptured,
      clipsQueued: uploadStats.queued,
      clipsUploading: uploadStats.active,
      clipsUploaded: uploadStats.completed,
      clipsFailed: uploadStats.failed,
      incidentsDetected: uploadStats.incidentsDetected,
      runtime: runtime,
      uploadSuccessRate: uploadStats.successRate,
    );
  }

  /// Notify stats update
  void _notifyStats() {
    onStatsUpdate?.call(getStats());
  }
}

/// Capture statistics model
class CaptureStats {
  final int clipsCaptured;
  final int clipsQueued;
  final int clipsUploading;
  final int clipsUploaded;
  final int clipsFailed;
  final int incidentsDetected;
  final Duration runtime;
  final double uploadSuccessRate;
  
  CaptureStats({
    required this.clipsCaptured,
    required this.clipsQueued,
    required this.clipsUploading,
    required this.clipsUploaded,
    required this.clipsFailed,
    required this.incidentsDetected,
    required this.runtime,
    required this.uploadSuccessRate,
  });
  
  /// Upload lag (how many clips behind we are)
  int get uploadLag => clipsCaptured - clipsUploaded - clipsFailed;
  
  /// Clips per minute
  double get clipsPerMinute {
    if (runtime.inSeconds == 0) return 0;
    return clipsCaptured / (runtime.inSeconds / 60);
  }
  
  /// Format runtime
  String get runtimeFormatted {
    final minutes = runtime.inMinutes;
    final seconds = runtime.inSeconds % 60;
    return '${minutes}m ${seconds}s';
  }
  
  /// Upload status text
  String get uploadStatusText {
    if (clipsUploading > 0) {
      return 'Uploading $clipsUploading clip${clipsUploading > 1 ? 's' : ''}...';
    } else if (clipsQueued > 0) {
      return '$clipsQueued queued';
    } else {
      return 'Idle';
    }
  }
}
