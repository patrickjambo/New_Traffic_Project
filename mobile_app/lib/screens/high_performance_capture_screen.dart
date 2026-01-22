import 'package:flutter/material.dart';
import 'package:camera/camera.dart';
import '../services/high_performance_capture_service.dart';

/// High-Performance Auto Capture Screen
/// Shows real-time capture and upload statistics
/// with minimal upload lag indicator
class HighPerformanceCaptureScreen extends StatefulWidget {
  const HighPerformanceCaptureScreen({super.key});

  @override
  State<HighPerformanceCaptureScreen> createState() => _HighPerformanceCaptureScreenState();
}

class _HighPerformanceCaptureScreenState extends State<HighPerformanceCaptureScreen> {
  final HighPerformanceCaptureService _captureService = HighPerformanceCaptureService();
  bool _isInitializing = false;
  String _statusMessage = 'Ready to start';
  CaptureStats? _stats;

  @override
  void initState() {
    super.initState();
    
    // Listen for stats updates
    _captureService.onStatsUpdate = (stats) {
      if (mounted) {
        setState(() {
          _stats = stats;
        });
      }
    };
    
    // Listen for status messages
    _captureService.onStatusMessage = (message) {
      if (mounted) {
        setState(() {
          _statusMessage = message;
        });
      }
    };
  }

  @override
  void dispose() {
    _captureService.onStatsUpdate = null;
    _captureService.onStatusMessage = null;
    super.dispose();
  }

  Future<void> _toggleCapture() async {
    if (_captureService.isRunning) {
      await _captureService.stop();
      setState(() {});
    } else {
      setState(() {
        _isInitializing = true;
      });

      final success = await _captureService.start();
      
      setState(() {
        _isInitializing = false;
        if (!success) {
          _statusMessage = '❌ Failed to start capture';
        }
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    final isRunning = _captureService.isRunning;
    final cameraController = _captureService.cameraController;
    final stats = _stats ?? CaptureStats(
      clipsCaptured: 0,
      clipsQueued: 0,
      clipsUploading: 0,
      clipsUploaded: 0,
      clipsFailed: 0,
      incidentsDetected: 0,
      runtime: Duration.zero,
      uploadSuccessRate: 0,
    );

    return Scaffold(
      backgroundColor: Colors.black,
      appBar: AppBar(
        backgroundColor: Colors.black,
        title: const Text('🚀 Fast Capture', style: TextStyle(color: Colors.white)),
        actions: [
          if (isRunning)
            Container(
              margin: const EdgeInsets.symmetric(horizontal: 8, vertical: 12),
              padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 4),
              decoration: BoxDecoration(
                color: Colors.red,
                borderRadius: BorderRadius.circular(16),
              ),
              child: Row(
                mainAxisSize: MainAxisSize.min,
                children: [
                  Container(
                    width: 8,
                    height: 8,
                    decoration: const BoxDecoration(
                      color: Colors.white,
                      shape: BoxShape.circle,
                    ),
                  ),
                  const SizedBox(width: 6),
                  const Text('LIVE', style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 12)),
                ],
              ),
            ),
        ],
        iconTheme: const IconThemeData(color: Colors.white),
      ),
      body: SafeArea(
        child: Column(
          children: [
            // Camera Preview
            Expanded(
              flex: 3,
              child: Stack(
                children: [
                  // Camera view
                  Container(
                    color: Colors.black,
                    child: cameraController != null && cameraController.value.isInitialized
                        ? CameraPreview(cameraController)
                        : Center(
                            child: Column(
                              mainAxisAlignment: MainAxisAlignment.center,
                              children: [
                                Icon(Icons.videocam_off, size: 64, color: Colors.grey[600]),
                                const SizedBox(height: 16),
                                Text(
                                  isRunning ? 'Starting camera...' : 'Camera not active',
                                  style: TextStyle(color: Colors.grey[400]),
                                ),
                              ],
                            ),
                          ),
                  ),
                  
                  // Status overlay
                  Positioned(
                    top: 16,
                    left: 16,
                    right: 16,
                    child: Container(
                      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                      decoration: BoxDecoration(
                        color: Colors.black54,
                        borderRadius: BorderRadius.circular(8),
                      ),
                      child: Row(
                        children: [
                          if (_captureService.isRecording)
                            const Icon(Icons.fiber_manual_record, color: Colors.red, size: 16),
                          if (!_captureService.isRecording && isRunning)
                            const Icon(Icons.pause, color: Colors.yellow, size: 16),
                          const SizedBox(width: 8),
                          Expanded(
                            child: Text(
                              _statusMessage,
                              style: const TextStyle(color: Colors.white, fontSize: 12),
                              overflow: TextOverflow.ellipsis,
                            ),
                          ),
                          if (isRunning)
                            Text(
                              stats.runtimeFormatted,
                              style: const TextStyle(color: Colors.cyan, fontSize: 12, fontWeight: FontWeight.bold),
                            ),
                        ],
                      ),
                    ),
                  ),
                  
                  // Upload lag indicator
                  if (isRunning)
                    Positioned(
                      bottom: 16,
                      left: 16,
                      right: 16,
                      child: _buildUploadLagIndicator(stats),
                    ),
                ],
              ),
            ),

            // Statistics Panel
            Container(
              color: const Color(0xFF1A1A2E),
              padding: const EdgeInsets.all(16),
              child: Column(
                children: [
                  // Main stats row
                  Row(
                    children: [
                      _StatBox(
                        icon: Icons.videocam,
                        label: 'Captured',
                        value: stats.clipsCaptured.toString(),
                        color: Colors.blue,
                      ),
                      _StatBox(
                        icon: Icons.cloud_queue,
                        label: 'Queued',
                        value: stats.clipsQueued.toString(),
                        color: Colors.orange,
                        highlight: stats.clipsQueued > 2,
                      ),
                      _StatBox(
                        icon: Icons.cloud_upload,
                        label: 'Uploading',
                        value: stats.clipsUploading.toString(),
                        color: Colors.cyan,
                        highlight: stats.clipsUploading > 0,
                      ),
                      _StatBox(
                        icon: Icons.cloud_done,
                        label: 'Uploaded',
                        value: stats.clipsUploaded.toString(),
                        color: Colors.green,
                      ),
                    ],
                  ),
                  
                  const SizedBox(height: 12),
                  
                  // Secondary stats row
                  Row(
                    children: [
                      _StatBox(
                        icon: Icons.warning_amber,
                        label: 'Incidents',
                        value: stats.incidentsDetected.toString(),
                        color: Colors.red,
                        highlight: stats.incidentsDetected > 0,
                      ),
                      _StatBox(
                        icon: Icons.error_outline,
                        label: 'Failed',
                        value: stats.clipsFailed.toString(),
                        color: Colors.grey,
                      ),
                      _StatBox(
                        icon: Icons.speed,
                        label: 'Rate',
                        value: '${stats.clipsPerMinute.toStringAsFixed(1)}/m',
                        color: Colors.purple,
                      ),
                      _StatBox(
                        icon: Icons.trending_up,
                        label: 'Success',
                        value: '${(stats.uploadSuccessRate * 100).toStringAsFixed(0)}%',
                        color: stats.uploadSuccessRate > 0.8 ? Colors.green : Colors.orange,
                      ),
                    ],
                  ),
                  
                  const SizedBox(height: 16),
                  
                  // Control button
                  SizedBox(
                    width: double.infinity,
                    height: 56,
                    child: ElevatedButton.icon(
                      onPressed: _isInitializing ? null : _toggleCapture,
                      icon: _isInitializing
                          ? const SizedBox(
                              width: 24,
                              height: 24,
                              child: CircularProgressIndicator(color: Colors.white, strokeWidth: 2),
                            )
                          : Icon(
                              isRunning ? Icons.stop : Icons.play_arrow,
                              size: 32,
                            ),
                      label: Text(
                        _isInitializing
                            ? 'Starting...'
                            : isRunning
                                ? 'STOP CAPTURE'
                                : 'START FAST CAPTURE',
                        style: const TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
                      ),
                      style: ElevatedButton.styleFrom(
                        backgroundColor: isRunning ? Colors.red : Colors.green,
                        foregroundColor: Colors.white,
                        shape: RoundedRectangleBorder(
                          borderRadius: BorderRadius.circular(12),
                        ),
                      ),
                    ),
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildUploadLagIndicator(CaptureStats stats) {
    final lag = stats.uploadLag;
    Color lagColor;
    String lagText;
    IconData lagIcon;
    
    if (lag <= 1) {
      lagColor = Colors.green;
      lagText = 'Real-time sync';
      lagIcon = Icons.check_circle;
    } else if (lag <= 3) {
      lagColor = Colors.yellow;
      lagText = '$lag clips behind';
      lagIcon = Icons.sync;
    } else {
      lagColor = Colors.red;
      lagText = '$lag clips behind!';
      lagIcon = Icons.warning;
    }
    
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
      decoration: BoxDecoration(
        color: lagColor.withOpacity(0.2),
        borderRadius: BorderRadius.circular(8),
        border: Border.all(color: lagColor, width: 1),
      ),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Icon(lagIcon, color: lagColor, size: 20),
          const SizedBox(width: 8),
          Text(
            lagText,
            style: TextStyle(color: lagColor, fontWeight: FontWeight.bold),
          ),
          const SizedBox(width: 16),
          if (stats.clipsUploading > 0)
            SizedBox(
              width: 16,
              height: 16,
              child: CircularProgressIndicator(
                strokeWidth: 2,
                color: lagColor,
              ),
            ),
        ],
      ),
    );
  }
}

class _StatBox extends StatelessWidget {
  final IconData icon;
  final String label;
  final String value;
  final Color color;
  final bool highlight;

  const _StatBox({
    required this.icon,
    required this.label,
    required this.value,
    required this.color,
    this.highlight = false,
  });

  @override
  Widget build(BuildContext context) {
    return Expanded(
      child: Container(
        margin: const EdgeInsets.symmetric(horizontal: 4),
        padding: const EdgeInsets.symmetric(vertical: 12),
        decoration: BoxDecoration(
          color: highlight ? color.withOpacity(0.2) : Colors.white.withOpacity(0.05),
          borderRadius: BorderRadius.circular(8),
          border: highlight ? Border.all(color: color, width: 1) : null,
        ),
        child: Column(
          children: [
            Icon(icon, color: color, size: 20),
            const SizedBox(height: 4),
            Text(
              value,
              style: TextStyle(
                fontSize: 18,
                fontWeight: FontWeight.bold,
                color: color,
              ),
            ),
            Text(
              label,
              style: TextStyle(
                fontSize: 10,
                color: Colors.grey[400],
              ),
            ),
          ],
        ),
      ),
    );
  }
}
