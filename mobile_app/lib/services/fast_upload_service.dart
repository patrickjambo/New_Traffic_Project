import 'dart:async';
import 'dart:collection';
import 'dart:io';
import 'dart:isolate';
import 'package:http/http.dart' as http;
import 'package:http_parser/http_parser.dart';
import 'package:location/location.dart';
import 'dart:convert';
import '../config/app_config.dart';
import 'auth_service.dart';

/// High-Performance Fast Upload Service
/// - Uses parallel uploads (up to 3 simultaneous)
/// - Upload queue with priority management
/// - Automatic retry with exponential backoff
/// - Progress tracking per upload
/// - Memory-efficient streaming uploads
class FastUploadService {
  static final FastUploadService _instance = FastUploadService._internal();
  factory FastUploadService() => _instance;
  FastUploadService._internal();

  final AuthService _authService = AuthService();
  final Location _location = Location();
  
  // Upload queue
  final Queue<UploadTask> _uploadQueue = Queue<UploadTask>();
  final List<UploadTask> _activeUploads = [];
  
  // Configuration
  static const int maxConcurrentUploads = 3;
  static const int maxRetries = 3;
  static const Duration uploadTimeout = Duration(seconds: 30);
  
  // Statistics
  int totalQueued = 0;
  int totalUploaded = 0;
  int totalFailed = 0;
  int incidentsDetected = 0;
  
  // Callbacks
  Function(UploadStats)? onStatsUpdate;
  Function(String taskId, double progress)? onUploadProgress;
  Function(String taskId, bool success, Map<String, dynamic>? result)? onUploadComplete;
  
  // Processing state
  bool _isProcessing = false;
  Timer? _processTimer;

  /// Add video to upload queue - returns immediately
  String queueUpload(File videoFile, {LocationData? location, int priority = 0}) {
    final taskId = DateTime.now().millisecondsSinceEpoch.toString();
    
    final task = UploadTask(
      id: taskId,
      videoFile: videoFile,
      location: location,
      priority: priority,
      createdAt: DateTime.now(),
    );
    
    // Insert based on priority (higher priority first)
    if (priority > 0 && _uploadQueue.isNotEmpty) {
      final list = _uploadQueue.toList();
      int insertIndex = list.indexWhere((t) => t.priority < priority);
      if (insertIndex == -1) {
        _uploadQueue.add(task);
      } else {
        list.insert(insertIndex, task);
        _uploadQueue.clear();
        _uploadQueue.addAll(list);
      }
    } else {
      _uploadQueue.add(task);
    }
    
    totalQueued++;
    _notifyStats();
    
    // Start processing if not already running
    _startProcessing();
    
    print('📤 Queued upload: $taskId (Queue size: ${_uploadQueue.length}, Active: ${_activeUploads.length})');
    
    return taskId;
  }

  /// Start the upload processor
  void _startProcessing() {
    if (_isProcessing) return;
    _isProcessing = true;
    
    // Process queue every 100ms
    _processTimer = Timer.periodic(const Duration(milliseconds: 100), (_) {
      _processQueue();
    });
    
    // Initial process
    _processQueue();
  }

  /// Stop the upload processor
  void stopProcessing() {
    _isProcessing = false;
    _processTimer?.cancel();
  }

  /// Process the upload queue
  void _processQueue() {
    // Clean up completed uploads
    _activeUploads.removeWhere((task) => task.isComplete);
    
    // Start new uploads if we have capacity
    while (_activeUploads.length < maxConcurrentUploads && _uploadQueue.isNotEmpty) {
      final task = _uploadQueue.removeFirst();
      _activeUploads.add(task);
      _executeUpload(task);
    }
    
    // Stop processing if queue is empty and no active uploads
    if (_uploadQueue.isEmpty && _activeUploads.isEmpty) {
      stopProcessing();
    }
  }

  /// Execute a single upload
  Future<void> _executeUpload(UploadTask task) async {
    print('🚀 Starting upload: ${task.id}');
    
    try {
      task.status = UploadStatus.uploading;
      task.startedAt = DateTime.now();
      
      // Get auth token
      final token = await _authService.getToken();
      
      // Get location if not provided
      LocationData? location = task.location;
      if (location == null) {
        try {
          location = await _location.getLocation().timeout(
            const Duration(seconds: 2),
            onTimeout: () => throw TimeoutException('Location timeout'),
          );
        } catch (e) {
          print('⚠️ Location unavailable: $e');
        }
      }
      
      // Create streaming multipart request for better performance
      final uri = Uri.parse('${AppConfig.baseUrl}/api/incidents/analyze-video');
      final request = http.MultipartRequest('POST', uri);
      
      if (token != null) {
        request.headers['Authorization'] = 'Bearer $token';
      }
      
      // Add video file with streaming
      final fileLength = await task.videoFile.length();
      final fileStream = task.videoFile.openRead();
      
      request.files.add(http.MultipartFile(
        'video',
        fileStream,
        fileLength,
        filename: 'clip_${task.id}.mp4',
        contentType: MediaType('video', 'mp4'),
      ));
      
      // Add location data
      if (location != null) {
        request.fields['latitude'] = location.latitude.toString();
        request.fields['longitude'] = location.longitude.toString();
      }
      
      request.fields['auto_mode'] = 'true';
      request.fields['clip_id'] = task.id;
      
      // Send with timeout
      final streamedResponse = await request.send().timeout(uploadTimeout);
      
      // Track upload progress
      int bytesUploaded = 0;
      final responseBytes = <int>[];
      
      await for (final chunk in streamedResponse.stream) {
        responseBytes.addAll(chunk);
        bytesUploaded += chunk.length;
        task.progress = bytesUploaded / (fileLength + 1000); // Approximate
        onUploadProgress?.call(task.id, task.progress);
      }
      
      final responseBody = utf8.decode(responseBytes);
      
      if (streamedResponse.statusCode == 200 || streamedResponse.statusCode == 201) {
        task.status = UploadStatus.completed;
        task.isComplete = true;
        task.completedAt = DateTime.now();
        totalUploaded++;
        
        // Parse response for incident detection
        try {
          final data = json.decode(responseBody);
          task.result = data;
          
          if (data['incident_detected'] == true || 
              (data['data'] != null && data['data']['incident_detected'] == true)) {
            incidentsDetected++;
            print('🚨 INCIDENT DETECTED in ${task.id}!');
          }
        } catch (e) {
          print('⚠️ Failed to parse response: $e');
        }
        
        print('✅ Upload complete: ${task.id} (${_formatDuration(task.uploadDuration)})');
        onUploadComplete?.call(task.id, true, task.result);
        
      } else {
        throw Exception('Upload failed: ${streamedResponse.statusCode}');
      }
      
    } catch (e) {
      print('❌ Upload error: ${task.id} - $e');
      
      task.retryCount++;
      
      if (task.retryCount < maxRetries) {
        // Retry with exponential backoff
        final delay = Duration(milliseconds: 500 * (1 << task.retryCount));
        print('🔄 Retrying ${task.id} in ${delay.inMilliseconds}ms (attempt ${task.retryCount + 1}/$maxRetries)');
        
        task.status = UploadStatus.pending;
        task.isComplete = false;
        
        Future.delayed(delay, () {
          if (_isProcessing) {
            _uploadQueue.addFirst(task); // Add to front for priority retry
            _activeUploads.remove(task);
          }
        });
      } else {
        task.status = UploadStatus.failed;
        task.isComplete = true;
        task.error = e.toString();
        totalFailed++;
        
        print('💥 Upload failed permanently: ${task.id}');
        onUploadComplete?.call(task.id, false, null);
      }
    } finally {
      // Clean up video file
      try {
        if (await task.videoFile.exists()) {
          await task.videoFile.delete();
        }
      } catch (e) {
        print('⚠️ Failed to delete video file: $e');
      }
      
      _notifyStats();
    }
  }

  /// Get current stats
  UploadStats getStats() {
    return UploadStats(
      queued: _uploadQueue.length,
      active: _activeUploads.length,
      completed: totalUploaded,
      failed: totalFailed,
      incidentsDetected: incidentsDetected,
    );
  }

  /// Notify stats update
  void _notifyStats() {
    onStatsUpdate?.call(getStats());
  }

  /// Format duration for logging
  String _formatDuration(Duration? duration) {
    if (duration == null) return 'N/A';
    if (duration.inSeconds < 1) return '${duration.inMilliseconds}ms';
    return '${duration.inSeconds}.${(duration.inMilliseconds % 1000) ~/ 100}s';
  }

  /// Clear all queued uploads
  void clearQueue() {
    _uploadQueue.clear();
    _notifyStats();
  }

  /// Get queue status
  int get queueLength => _uploadQueue.length;
  int get activeCount => _activeUploads.length;
  bool get isProcessing => _isProcessing;
}

/// Upload task model
class UploadTask {
  final String id;
  final File videoFile;
  final LocationData? location;
  int priority;
  final DateTime createdAt;
  
  UploadStatus status = UploadStatus.pending;
  double progress = 0.0;
  int retryCount = 0;
  DateTime? startedAt;
  DateTime? completedAt;
  String? error;
  Map<String, dynamic>? result;
  bool isComplete = false;
  
  UploadTask({
    required this.id,
    required this.videoFile,
    this.location,
    this.priority = 0,
    required this.createdAt,
  });
  
  Duration? get uploadDuration {
    if (startedAt == null || completedAt == null) return null;
    return completedAt!.difference(startedAt!);
  }
}

/// Upload status enum
enum UploadStatus {
  pending,
  uploading,
  completed,
  failed,
}

/// Upload statistics model
class UploadStats {
  final int queued;
  final int active;
  final int completed;
  final int failed;
  final int incidentsDetected;
  
  UploadStats({
    required this.queued,
    required this.active,
    required this.completed,
    required this.failed,
    required this.incidentsDetected,
  });
  
  int get total => queued + active + completed + failed;
  double get successRate => total > 0 ? completed / total : 0.0;
}
