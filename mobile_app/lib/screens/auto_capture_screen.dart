import 'package:flutter/material.dart';
import 'package:camera/camera.dart';
import '../services/auto_capture_service.dart';

class AutoCaptureScreen extends StatefulWidget {
  const AutoCaptureScreen({super.key});

  @override
  State<AutoCaptureScreen> createState() => _AutoCaptureScreenState();
}

class _AutoCaptureScreenState extends State<AutoCaptureScreen> {
  final AutoCaptureService _autoCaptureService = AutoCaptureService();
  bool _isInitializing = false;
  String? _errorMessage;
  
  // Real-time stats
  int _videosCaptured = 0;
  int _videosUploaded = 0;
  int _incidentsDetected = 0;

  @override
  void initState() {
    super.initState();
    // Listen for real-time stat updates
    _autoCaptureService.onStatsUpdate = (captured, uploaded, incidents) {
      if (mounted) {
        setState(() {
          _videosCaptured = captured;
          _videosUploaded = uploaded;
          _incidentsDetected = incidents;
        });
      }
    };
  }

  @override
  void dispose() {
    // Don't dispose service here, let it run in background
    _autoCaptureService.onStatsUpdate = null;
    super.dispose();
  }

  Future<void> _toggleAutoCapture() async {
    if (_autoCaptureService.isRunning) {
      await _autoCaptureService.stop();
      setState(() {});
    } else {
      setState(() {
        _isInitializing = true;
        _errorMessage = null;
      });

      final success = await _autoCaptureService.start();
      
      setState(() {
        _isInitializing = false;
        if (!success) {
          _errorMessage = _autoCaptureService.lastError ?? 'Failed to start';
        }
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    final isRunning = _autoCaptureService.isRunning;
    final cameraController = _autoCaptureService.cameraController;

    return Scaffold(
      appBar: AppBar(
        title: const Text('Auto Monitor'),
        actions: [
          if (isRunning)
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 16),
              child: Center(
                child: Container(
                  padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                  decoration: BoxDecoration(
                    color: Colors.red,
                    borderRadius: BorderRadius.circular(16),
                  ),
                  child: const Row(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Icon(Icons.fiber_manual_record, size: 12, color: Colors.white),
                      SizedBox(width: 6),
                      Text('LIVE', style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold)),
                    ],
                  ),
                ),
              ),
            ),
        ],
      ),
      body: SafeArea(
        child: Column(
          children: [
            // Camera Preview
            Expanded(
              flex: 2,
              child: Container(
                color: Colors.black,
                child: cameraController != null && cameraController.value.isInitialized
                    ? CameraPreview(cameraController)
                    : Center(
                        child: Column(
                          mainAxisAlignment: MainAxisAlignment.center,
                          children: [
                            Icon(
                              Icons.videocam_off,
                              size: 64,
                              color: Colors.grey[400],
                            ),
                            const SizedBox(height: 16),
                            Text(
                              isRunning ? 'Starting camera...' : 'Camera not active',
                              style: TextStyle(color: Colors.grey[400]),
                            ),
                          ],
                        ),
                      ),
              ),
            ),

            // Controls and Stats
            Expanded(
              child: SingleChildScrollView(
                padding: const EdgeInsets.all(16),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.stretch,
                  children: [
                    // Control Button
                    ElevatedButton.icon(
                      onPressed: _isInitializing ? null : _toggleAutoCapture,
                      icon: Icon(
                        isRunning ? Icons.stop : Icons.play_arrow,
                        size: 32,
                      ),
                      label: Text(
                        isRunning ? 'Stop Auto-Capture' : 'Start Auto-Capture',
                        style: const TextStyle(fontSize: 18),
                      ),
                      style: ElevatedButton.styleFrom(
                        padding: const EdgeInsets.symmetric(vertical: 16),
                        backgroundColor: isRunning ? Colors.red : Colors.green,
                        foregroundColor: Colors.white,
                      ),
                    ),

                    if (_isInitializing) ...[
                      const SizedBox(height: 16),
                      const Center(child: CircularProgressIndicator()),
                    ],

                    if (_errorMessage != null) ...[
                      const SizedBox(height: 16),
                      Card(
                        color: Colors.red[50],
                        child: Padding(
                          padding: const EdgeInsets.all(12),
                          child: Row(
                            children: [
                              const Icon(Icons.error, color: Colors.red),
                              const SizedBox(width: 8),
                              Expanded(
                                child: Text(
                                  _errorMessage!,
                                  style: const TextStyle(color: Colors.red),
                                ),
                              ),
                            ],
                          ),
                        ),
                      ),
                    ],

                    const SizedBox(height: 24),

                    // Statistics
                    Text(
                      'Real-Time Statistics',
                      style: Theme.of(context).textTheme.titleLarge,
                    ),
                    const SizedBox(height: 12),

                    Row(
                      children: [
                        Expanded(
                          child: _StatCard(
                            icon: Icons.videocam,
                            label: 'Captured',
                            value: _videosCaptured.toString(),
                            color: Colors.blue,
                          ),
                        ),
                        const SizedBox(width: 8),
                        Expanded(
                          child: _StatCard(
                            icon: Icons.cloud_upload,
                            label: 'Uploaded',
                            value: _videosUploaded.toString(),
                            color: Colors.green,
                          ),
                        ),
                        const SizedBox(width: 8),
                        Expanded(
                          child: _StatCard(
                            icon: Icons.warning,
                            label: 'Incidents',
                            value: _incidentsDetected.toString(),
                            color: Colors.orange,
                          ),
                        ),
                      ],
                    ),

                    const SizedBox(height: 16),

                    // Info Card
                    Card(
                      child: Padding(
                        padding: const EdgeInsets.all(16),
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Row(
                              children: [
                                Icon(
                                  Icons.info_outline,
                                  color: Theme.of(context).colorScheme.primary,
                                ),
                                const SizedBox(width: 8),
                                Text(
                                  'How it works',
                                  style: Theme.of(context).textTheme.titleMedium,
                                ),
                              ],
                            ),
                            const SizedBox(height: 12),
                            const Text(
                              '• Records 5-second video clips continuously\n'
                              '• AI analyzes each clip for traffic incidents\n'
                              '• Incidents are stored, empty videos deleted\n'
                              '• Runs in background while active\n'
                              '• Requires camera and location permissions',
                              style: TextStyle(fontSize: 13, height: 1.5),
                            ),
                          ],
                        ),
                      ),
                    ),

                    const SizedBox(height: 16),

                    // Warning Card
                    Card(
                      color: Colors.amber[50],
                      child: Padding(
                        padding: const EdgeInsets.all(16),
                        child: Row(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Icon(Icons.battery_alert, color: Colors.amber[900]),
                            const SizedBox(width: 8),
                            Expanded(
                              child: Text(
                                'Auto-capture uses battery and mobile data. Use WiFi when possible.',
                                style: TextStyle(color: Colors.amber[900], fontSize: 12),
                              ),
                            ),
                          ],
                        ),
                      ),
                    ),
                  ],
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _StatCard extends StatelessWidget {
  final IconData icon;
  final String label;
  final String value;
  final Color color;

  const _StatCard({
    required this.icon,
    required this.label,
    required this.value,
    required this.color,
  });

  @override
  Widget build(BuildContext context) {
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          children: [
            Icon(icon, size: 32, color: color),
            const SizedBox(height: 8),
            Text(
              value,
              style: TextStyle(
                fontSize: 24,
                fontWeight: FontWeight.bold,
                color: color,
              ),
            ),
            const SizedBox(height: 4),
            Text(
              label,
              textAlign: TextAlign.center,
              style: TextStyle(
                fontSize: 11,
                color: Colors.grey[600],
              ),
            ),
          ],
        ),
      ),
    );
  }
}
