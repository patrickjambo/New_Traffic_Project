import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:camera/camera.dart';
import '../services/high_performance_capture_service.dart';
import '../config/app_theme.dart';

/// ============================================================================
/// Fast Capture Screen - TrafficGuard Mobile App
/// ============================================================================
/// High-performance video capture screen featuring:
/// - Real-time camera preview with status overlay
/// - Live upload statistics with visual indicators
/// - Professional dark theme optimized for video capture
/// - Sync status indicator for upload lag monitoring
/// ============================================================================

class HighPerformanceCaptureScreen extends StatefulWidget {
  const HighPerformanceCaptureScreen({super.key});

  @override
  State<HighPerformanceCaptureScreen> createState() =>
      _HighPerformanceCaptureScreenState();
}

class _HighPerformanceCaptureScreenState
    extends State<HighPerformanceCaptureScreen> with TickerProviderStateMixin {
  // Service
  final HighPerformanceCaptureService _captureService =
      HighPerformanceCaptureService();

  // State
  bool _isInitializing = false;
  String _statusMessage = 'Ready to start capture';
  CaptureStats? _stats;

  // Animation
  late AnimationController _pulseController;
  late Animation<double> _pulseAnimation;

  @override
  void initState() {
    super.initState();
    _initializeAnimations();
    _setupServiceListeners();
  }

  void _initializeAnimations() {
    _pulseController = AnimationController(
      duration: const Duration(milliseconds: 1500),
      vsync: this,
    );
    _pulseAnimation = Tween<double>(begin: 1.0, end: 1.15).animate(
      CurvedAnimation(parent: _pulseController, curve: Curves.easeInOut),
    );
    _pulseController.repeat(reverse: true);
  }

  void _setupServiceListeners() {
    // Listen for stats updates
    _captureService.onStatsUpdate = (stats) {
      if (mounted) {
        setState(() => _stats = stats);
      }
    };

    // Listen for status messages
    _captureService.onStatusMessage = (message) {
      if (mounted) {
        setState(() => _statusMessage = message);
      }
    };
  }

  @override
  void dispose() {
    _captureService.onStatsUpdate = null;
    _captureService.onStatusMessage = null;
    _pulseController.dispose();
    super.dispose();
  }

  Future<void> _toggleCapture() async {
    if (_captureService.isRunning) {
      await _captureService.stop();
      setState(() {});
    } else {
      setState(() => _isInitializing = true);

      final success = await _captureService.start();

      setState(() {
        _isInitializing = false;
        if (!success) {
          _statusMessage = 'Failed to start capture';
        }
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    SystemChrome.setSystemUIOverlayStyle(const SystemUiOverlayStyle(
      statusBarColor: Colors.transparent,
      statusBarIconBrightness: Brightness.light,
    ));

    final isRunning = _captureService.isRunning;
    final cameraController = _captureService.cameraController;
    final stats = _stats ??
        CaptureStats(
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
      backgroundColor: AppColors.background,
      body: SafeArea(
        child: Column(
          children: [
            // Custom App Bar
            _buildAppBar(isRunning, stats),

            // Camera Preview Section
            Expanded(
              child: _buildCameraSection(cameraController, isRunning, stats),
            ),

            // Statistics Panel
            _buildStatisticsPanel(stats, isRunning),
          ],
        ),
      ),
    );
  }

  // ===========================================================================
  // App Bar
  // ===========================================================================

  Widget _buildAppBar(bool isRunning, CaptureStats stats) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
      child: Row(
        children: [
          // Back Button
          Container(
            decoration: BoxDecoration(
              color: AppColors.backgroundSecondary,
              borderRadius: BorderRadius.circular(12),
              border: Border.all(color: AppColors.border, width: 1),
            ),
            child: IconButton(
              icon: Icon(
                Icons.arrow_back_ios_rounded,
                color: AppColors.textSecondary,
                size: 20,
              ),
              onPressed: () => Navigator.pop(context),
            ),
          ),
          const SizedBox(width: 16),

          // Title with Icon
          Container(
            padding: const EdgeInsets.all(8),
            decoration: BoxDecoration(
              color: AppColors.primary.withOpacity(0.15),
              borderRadius: BorderRadius.circular(10),
            ),
            child: Icon(
              Icons.rocket_launch_rounded,
              color: AppColors.primary,
              size: 20,
            ),
          ),
          const SizedBox(width: 12),
          Text(
            'Fast Capture',
            style: AppTextStyles.headlineSmall.copyWith(
              color: AppColors.textPrimary,
              fontWeight: FontWeight.w700,
            ),
          ),

          const Spacer(),

          // Live Badge (when running)
          if (isRunning) _buildLiveBadge(),
        ],
      ),
    );
  }

  Widget _buildLiveBadge() {
    return AnimatedBuilder(
      animation: _pulseAnimation,
      builder: (context, child) {
        return Transform.scale(
          scale: _pulseAnimation.value,
          child: Container(
            padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
            decoration: BoxDecoration(
              color: AppColors.error,
              borderRadius: BorderRadius.circular(20),
              boxShadow: [
                BoxShadow(
                  color: AppColors.error.withOpacity(0.4),
                  blurRadius: 12,
                  spreadRadius: 2,
                ),
              ],
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
                const SizedBox(width: 8),
                Text(
                  'LIVE',
                  style: AppTextStyles.labelMedium.copyWith(
                    color: Colors.white,
                    fontWeight: FontWeight.w800,
                    letterSpacing: 1,
                  ),
                ),
              ],
            ),
          ),
        );
      },
    );
  }

  // ===========================================================================
  // Camera Section
  // ===========================================================================

  Widget _buildCameraSection(
    CameraController? cameraController,
    bool isRunning,
    CaptureStats stats,
  ) {
    return Container(
      margin: const EdgeInsets.symmetric(horizontal: 16),
      decoration: BoxDecoration(
        color: Colors.black,
        borderRadius: BorderRadius.circular(24),
        border: Border.all(
          color: isRunning
              ? AppColors.primary.withOpacity(0.5)
              : AppColors.border,
          width: 2,
        ),
      ),
      clipBehavior: Clip.antiAlias,
      child: Stack(
        children: [
          // Camera Preview
          Positioned.fill(
            child: cameraController != null &&
                    cameraController.value.isInitialized
                ? CameraPreview(cameraController)
                : _buildCameraPlaceholder(isRunning),
          ),

          // Status Overlay (top)
          Positioned(
            top: 16,
            left: 16,
            right: 16,
            child: _buildStatusOverlay(isRunning, stats),
          ),

          // Upload Sync Indicator (bottom)
          if (isRunning)
            Positioned(
              bottom: 16,
              left: 16,
              right: 16,
              child: _buildSyncIndicator(stats),
            ),
        ],
      ),
    );
  }

  Widget _buildCameraPlaceholder(bool isRunning) {
    return Container(
      color: const Color(0xFF0D1117),
      child: Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Container(
              padding: const EdgeInsets.all(20),
              decoration: BoxDecoration(
                color: AppColors.backgroundSecondary,
                shape: BoxShape.circle,
              ),
              child: Icon(
                isRunning ? Icons.videocam_rounded : Icons.videocam_off_rounded,
                size: 48,
                color: AppColors.textTertiary,
              ),
            ),
            const SizedBox(height: 20),
            Text(
              isRunning ? 'Starting camera...' : 'Camera not active',
              style: AppTextStyles.bodyLarge.copyWith(
                color: AppColors.textTertiary,
              ),
            ),
            if (isRunning) ...[
              const SizedBox(height: 16),
              SizedBox(
                width: 24,
                height: 24,
                child: CircularProgressIndicator(
                  color: AppColors.primary,
                  strokeWidth: 2.5,
                ),
              ),
            ],
          ],
        ),
      ),
    );
  }

  Widget _buildStatusOverlay(bool isRunning, CaptureStats stats) {
    final isRecording = _captureService.isRecording;
    final hasError = _statusMessage.toLowerCase().contains('error') ||
        _statusMessage.toLowerCase().contains('failed');

    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
      decoration: BoxDecoration(
        color: Colors.black.withOpacity(0.7),
        borderRadius: BorderRadius.circular(14),
        border: Border.all(
          color: hasError
              ? AppColors.error.withOpacity(0.5)
              : Colors.white.withOpacity(0.1),
          width: 1,
        ),
      ),
      child: Row(
        children: [
          // Recording Indicator
          if (isRecording)
            Container(
              width: 12,
              height: 12,
              decoration: BoxDecoration(
                color: AppColors.error,
                shape: BoxShape.circle,
                boxShadow: [
                  BoxShadow(
                    color: AppColors.error.withOpacity(0.6),
                    blurRadius: 8,
                    spreadRadius: 2,
                  ),
                ],
              ),
            )
          else if (isRunning)
            Icon(Icons.pause_rounded, color: AppColors.warning, size: 16)
          else if (hasError)
            Icon(Icons.error_rounded, color: AppColors.error, size: 16)
          else
            Icon(Icons.circle_outlined, color: AppColors.textTertiary, size: 16),

          const SizedBox(width: 12),

          // Status Message
          Expanded(
            child: Text(
              _statusMessage,
              style: AppTextStyles.bodySmall.copyWith(
                color: hasError ? AppColors.error : Colors.white,
                fontWeight: FontWeight.w500,
              ),
              overflow: TextOverflow.ellipsis,
            ),
          ),

          // Runtime
          if (isRunning)
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
              decoration: BoxDecoration(
                color: AppColors.primary.withOpacity(0.2),
                borderRadius: BorderRadius.circular(8),
              ),
              child: Text(
                stats.runtimeFormatted,
                style: AppTextStyles.labelMedium.copyWith(
                  color: AppColors.primary,
                  fontWeight: FontWeight.w700,
                ),
              ),
            ),
        ],
      ),
    );
  }

  Widget _buildSyncIndicator(CaptureStats stats) {
    final lag = stats.uploadLag;
    Color statusColor;
    String statusText;
    IconData statusIcon;

    if (lag <= 1) {
      statusColor = AppColors.success;
      statusText = 'Real-time sync';
      statusIcon = Icons.check_circle_rounded;
    } else if (lag <= 3) {
      statusColor = AppColors.warning;
      statusText = '$lag clips behind';
      statusIcon = Icons.sync_rounded;
    } else {
      statusColor = AppColors.error;
      statusText = '$lag clips behind!';
      statusIcon = Icons.warning_rounded;
    }

    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 14),
      decoration: BoxDecoration(
        color: statusColor.withOpacity(0.15),
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: statusColor.withOpacity(0.5), width: 1.5),
      ),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Icon(statusIcon, color: statusColor, size: 22),
          const SizedBox(width: 10),
          Text(
            statusText,
            style: AppTextStyles.labelLarge.copyWith(
              color: statusColor,
              fontWeight: FontWeight.w700,
            ),
          ),
          if (stats.clipsUploading > 0) ...[
            const SizedBox(width: 16),
            SizedBox(
              width: 18,
              height: 18,
              child: CircularProgressIndicator(
                strokeWidth: 2.5,
                color: statusColor,
              ),
            ),
          ],
        ],
      ),
    );
  }

  // ===========================================================================
  // Statistics Panel
  // ===========================================================================

  Widget _buildStatisticsPanel(CaptureStats stats, bool isRunning) {
    return Container(
      margin: const EdgeInsets.all(16),
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        color: AppColors.backgroundSecondary,
        borderRadius: BorderRadius.circular(24),
        border: Border.all(color: AppColors.border, width: 1),
      ),
      child: Column(
        children: [
          // Primary Stats Row
          Row(
            children: [
              _CaptureStatTile(
                icon: Icons.videocam_rounded,
                label: 'Captured',
                value: stats.clipsCaptured.toString(),
                color: AppColors.primary,
              ),
              _CaptureStatTile(
                icon: Icons.cloud_queue_rounded,
                label: 'Queued',
                value: stats.clipsQueued.toString(),
                color: AppColors.warning,
                isHighlighted: stats.clipsQueued > 2,
              ),
              _CaptureStatTile(
                icon: Icons.cloud_upload_rounded,
                label: 'Uploading',
                value: stats.clipsUploading.toString(),
                color: const Color(0xFF06B6D4),
                isHighlighted: stats.clipsUploading > 0,
              ),
              _CaptureStatTile(
                icon: Icons.cloud_done_rounded,
                label: 'Uploaded',
                value: stats.clipsUploaded.toString(),
                color: AppColors.success,
              ),
            ],
          ),

          const SizedBox(height: 12),

          // Secondary Stats Row
          Row(
            children: [
              _CaptureStatTile(
                icon: Icons.warning_amber_rounded,
                label: 'Incidents',
                value: stats.incidentsDetected.toString(),
                color: AppColors.error,
                isHighlighted: stats.incidentsDetected > 0,
              ),
              _CaptureStatTile(
                icon: Icons.error_outline_rounded,
                label: 'Failed',
                value: stats.clipsFailed.toString(),
                color: AppColors.textTertiary,
              ),
              _CaptureStatTile(
                icon: Icons.speed_rounded,
                label: 'Rate',
                value: '${stats.clipsPerMinute.toStringAsFixed(1)}/m',
                color: const Color(0xFF8B5CF6),
              ),
              _CaptureStatTile(
                icon: Icons.trending_up_rounded,
                label: 'Success',
                value: '${(stats.uploadSuccessRate * 100).toStringAsFixed(0)}%',
                color: stats.uploadSuccessRate > 0.8
                    ? AppColors.success
                    : AppColors.warning,
              ),
            ],
          ),

          const SizedBox(height: 20),

          // Control Button
          _buildControlButton(isRunning),
        ],
      ),
    );
  }

  Widget _buildControlButton(bool isRunning) {
    return SizedBox(
      width: double.infinity,
      height: 60,
      child: ElevatedButton(
        onPressed: _isInitializing ? null : _toggleCapture,
        style: ElevatedButton.styleFrom(
          backgroundColor: isRunning ? AppColors.error : AppColors.success,
          foregroundColor: Colors.white,
          disabledBackgroundColor:
              (isRunning ? AppColors.error : AppColors.success).withOpacity(0.5),
          elevation: 0,
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(16),
          ),
        ),
        child: _isInitializing
            ? Row(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  SizedBox(
                    width: 24,
                    height: 24,
                    child: CircularProgressIndicator(
                      color: Colors.white.withOpacity(0.8),
                      strokeWidth: 2.5,
                    ),
                  ),
                  const SizedBox(width: 14),
                  Text(
                    'Starting...',
                    style: AppTextStyles.titleMedium.copyWith(
                      color: Colors.white,
                      fontWeight: FontWeight.w700,
                    ),
                  ),
                ],
              )
            : Row(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  Icon(
                    isRunning ? Icons.stop_rounded : Icons.play_arrow_rounded,
                    size: 28,
                  ),
                  const SizedBox(width: 12),
                  Text(
                    isRunning ? 'STOP CAPTURE' : 'START CAPTURE',
                    style: AppTextStyles.titleMedium.copyWith(
                      color: Colors.white,
                      fontWeight: FontWeight.w800,
                      letterSpacing: 0.5,
                    ),
                  ),
                ],
              ),
      ),
    );
  }
}

// =============================================================================
// Capture Stat Tile Widget
// =============================================================================

class _CaptureStatTile extends StatelessWidget {
  final IconData icon;
  final String label;
  final String value;
  final Color color;
  final bool isHighlighted;

  const _CaptureStatTile({
    required this.icon,
    required this.label,
    required this.value,
    required this.color,
    this.isHighlighted = false,
  });

  @override
  Widget build(BuildContext context) {
    return Expanded(
      child: Container(
        margin: const EdgeInsets.symmetric(horizontal: 4),
        padding: const EdgeInsets.symmetric(vertical: 14),
        decoration: BoxDecoration(
          color: isHighlighted
              ? color.withOpacity(0.15)
              : AppColors.background.withOpacity(0.5),
          borderRadius: BorderRadius.circular(14),
          border: Border.all(
            color: isHighlighted ? color.withOpacity(0.4) : AppColors.border,
            width: 1,
          ),
        ),
        child: Column(
          children: [
            Icon(icon, color: color, size: 22),
            const SizedBox(height: 8),
            Text(
              value,
              style: AppTextStyles.titleLarge.copyWith(
                color: color,
                fontWeight: FontWeight.w800,
              ),
            ),
            const SizedBox(height: 2),
            Text(
              label,
              style: AppTextStyles.labelSmall.copyWith(
                color: AppColors.textTertiary,
                fontWeight: FontWeight.w500,
              ),
            ),
          ],
        ),
      ),
    );
  }
}
