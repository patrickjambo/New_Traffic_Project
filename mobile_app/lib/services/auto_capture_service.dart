import 'package:camera/camera.dart';
import 'package:flutter/material.dart';
import 'package:path_provider/path_provider.dart';
import 'package:http/http.dart' as http;
import 'package:http_parser/http_parser.dart';
import 'package:location/location.dart';
import 'dart:io';
import 'dart:async';
import '../config/app_config.dart';
import '../services/auth_service.dart';

class AutoCaptureService {
  static final AutoCaptureService _instance = AutoCaptureService._internal();
  factory AutoCaptureService() => _instance;
  AutoCaptureService._internal();

  CameraController? _cameraController;
  Timer? _captureTimer;
  bool _isRunning = false;
  bool _isRecording = false;
  
  final AuthService _authService = AuthService();
  final Location _location = Location();
  
  // Statistics
  int videosCaptured = 0;
  int videosUploaded = 0;
  int incidentsDetected = 0;
  String? lastError;
  
  // Callback for UI updates
  Function(int captured, int uploaded, int incidents)? onStatsUpdate;

  bool get isRunning => _isRunning;
  bool get isRecording => _isRecording;

  /// Initialize camera
  Future<bool> initialize() async {
    try {
      final cameras = await availableCameras();
      if (cameras.isEmpty) {
        lastError = 'No cameras available';
        return false;
      }

      // Use back camera
      final camera = cameras.firstWhere(
        (cam) => cam.lensDirection == CameraLensDirection.back,
        orElse: () => cameras.first,
      );

      _cameraController = CameraController(
        camera,
        ResolutionPreset.medium,
        enableAudio: false,
      );

      await _cameraController!.initialize();
      return true;
    } catch (e) {
      lastError = 'Camera initialization failed: $e';
      return false;
    }
  }

  /// Start auto-capture
  Future<bool> start() async {
    if (_isRunning) return true;

    // Check and request location permission
    bool serviceEnabled = await _location.serviceEnabled();
    if (!serviceEnabled) {
      serviceEnabled = await _location.requestService();
      if (!serviceEnabled) {
        lastError = 'Location service not enabled';
        return false;
      }
    }

    PermissionStatus permissionGranted = await _location.hasPermission();
    if (permissionGranted == PermissionStatus.denied) {
      permissionGranted = await _location.requestPermission();
      if (permissionGranted != PermissionStatus.granted) {
        lastError = 'Location permission denied';
        return false;
      }
    }

    // Initialize camera if not already
    if (_cameraController == null || !_cameraController!.value.isInitialized) {
      final initialized = await initialize();
      if (!initialized) return false;
    }

    _isRunning = true;
    _startCaptureLoop();
    return true;
  }

  /// Stop auto-capture
  Future<void> stop() async {
    _isRunning = false;
    _captureTimer?.cancel();
    
    if (_isRecording && _cameraController != null) {
      try {
        await _cameraController!.stopVideoRecording();
      } catch (e) {
        print('Error stopping recording: $e');
      }
    }
    _isRecording = false;
  }

  /// Dispose resources
  Future<void> dispose() async {
    await stop();
    await _cameraController?.dispose();
    _cameraController = null;
  }

  /// Start capture loop
  void _startCaptureLoop() {
    _captureTimer = Timer.periodic(const Duration(seconds: 5), (timer) async {
      if (!_isRunning) {
        timer.cancel();
        return;
      }
      
      await _captureAndUpload();
    });
    
    // Start first capture immediately
    _captureAndUpload();
  }

  /// Capture 5-second video and upload
  Future<void> _captureAndUpload() async {
    if (_isRecording || _cameraController == null || !_cameraController!.value.isInitialized) {
      return;
    }

    try {
      _isRecording = true;
      
      // Get temporary directory
      final directory = await getTemporaryDirectory();
      final timestamp = DateTime.now().millisecondsSinceEpoch;
      final filePath = '${directory.path}/auto_capture_$timestamp.mp4';

      // Start recording
      await _cameraController!.startVideoRecording();
      
      // Record for 5 seconds
      await Future.delayed(const Duration(seconds: 5));
      
      if (!_isRunning) {
        _isRecording = false;
        return;
      }

      // Stop recording
      final videoFile = await _cameraController!.stopVideoRecording();
      _isRecording = false;
      
      // ✅ Wait for file to be fully written to disk
      await Future.delayed(const Duration(milliseconds: 500));
      
      final file = File(videoFile.path);
      
      // Verify file exists and has content
      if (!await file.exists()) {
        print('❌ Video file does not exist: ${videoFile.path}');
        return;
      }
      
      final fileSize = await file.length();
      if (fileSize == 0) {
        print('❌ Video file is empty: ${videoFile.path}');
        await file.delete();
        return;
      }
      
      print('✅ Video file ready: ${fileSize} bytes');
      
      // ✅ INCREMENT COUNTER IMMEDIATELY (don't wait for upload)
      videosCaptured++;
      onStatsUpdate?.call(videosCaptured, videosUploaded, incidentsDetected);
      
      // 🚀 Upload in background (don't block next capture)
      _uploadVideo(file);
      
    } catch (e) {
      _isRecording = false;
      lastError = 'Capture failed: $e';
      print('Capture error: $e');
    }
  }

  /// Upload video to backend
  Future<void> _uploadVideo(File videoFile) async {
    try {
      // Get current location
      final locationData = await _location.getLocation();
      
      // Get auth token
      final token = await _authService.getToken();
      
      // Prepare multipart request - USE CORRECT ENDPOINT
      final uri = Uri.parse('${AppConfig.baseUrl}/api/incidents/analyze-video');
      final request = http.MultipartRequest('POST', uri);
      
      // Add auth header if available
      if (token != null) {
        request.headers['Authorization'] = 'Bearer $token';
      }
      
      // Add video file with explicit MIME type
      request.files.add(await http.MultipartFile.fromPath(
        'video',
        videoFile.path,
        contentType: MediaType('video', 'mp4'),
      ));
      
      // Add location
      request.fields['latitude'] = locationData.latitude.toString();
      request.fields['longitude'] = locationData.longitude.toString();
      
      // Send request
      final response = await request.send();
      final responseBody = await response.stream.bytesToString();
      
      // Delete local video file
      await videoFile.delete();
      
      if (response.statusCode == 201 || response.statusCode == 200) {
        // ✅ Update uploaded counter
        videosUploaded++;
        
        // Parse response to check if incident was detected
        if (responseBody.contains('"incident_detected":true') || 
            responseBody.contains('incident_detected":true')) {
          incidentsDetected++;
        }
        
        // ✅ Update UI immediately
        onStatsUpdate?.call(videosCaptured, videosUploaded, incidentsDetected);
        lastError = null;
      } else {
        lastError = 'Upload failed: ${response.statusCode}';
      }
      
    } catch (e) {
      lastError = 'Upload error: $e';
      // Try to delete video file on error
      try {
        await videoFile.delete();
      } catch (_) {}
    }
  }

  /// Get camera controller for preview
  CameraController? get cameraController => _cameraController;
}
