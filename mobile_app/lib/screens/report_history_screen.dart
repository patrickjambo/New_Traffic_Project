import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import '../services/incident_service.dart';
import '../config/app_theme.dart';
import 'package:intl/intl.dart';

/// ============================================================================
/// Report History Screen - TrafficGuard Mobile App
/// ============================================================================
/// Displays user's incident report history featuring:
/// - List of submitted reports with status
/// - Report type icons and colors
/// - Timestamp formatting
/// - Empty state when no reports
/// - Professional dark theme design
/// ============================================================================

class ReportHistoryScreen extends StatefulWidget {
  const ReportHistoryScreen({super.key});

  @override
  State<ReportHistoryScreen> createState() => _ReportHistoryScreenState();
}

class _ReportHistoryScreenState extends State<ReportHistoryScreen> {
  // Services
  final IncidentService _incidentService = IncidentService();
  
  // State
  List<dynamic> _incidents = [];
  bool _isLoading = true;

  @override
  void initState() {
    super.initState();
    _loadHistory();
  }

  Future<void> _loadHistory() async {
    setState(() => _isLoading = true);
    final result = await _incidentService.getUserIncidents();
    
    if (mounted) {
      setState(() {
        _isLoading = false;
        if (result['success']) {
          _incidents = result['data']['incidents'] ?? [];
        }
      });
    }
  }

  Future<void> _refresh() async {
    await _loadHistory();
  }

  @override
  Widget build(BuildContext context) {
    SystemChrome.setSystemUIOverlayStyle(const SystemUiOverlayStyle(
      statusBarColor: Colors.transparent,
      statusBarIconBrightness: Brightness.light,
    ));

    return Scaffold(
      backgroundColor: AppColors.background,
      body: SafeArea(
        child: Column(
          children: [
            // Custom App Bar
            _buildAppBar(),
            
            // Content
            Expanded(
              child: _isLoading
                  ? _buildLoadingState()
                  : _incidents.isEmpty
                      ? _buildEmptyState()
                      : RefreshIndicator(
                          onRefresh: _refresh,
                          color: AppColors.primary,
                          backgroundColor: AppColors.backgroundSecondary,
                          child: ListView.builder(
                            padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 8),
                            itemCount: _incidents.length,
                            itemBuilder: (context, index) {
                              return _buildIncidentCard(_incidents[index]);
                            },
                          ),
                        ),
            ),
          ],
        ),
      ),
    );
  }

  // ===========================================================================
  // App Bar
  // ===========================================================================

  Widget _buildAppBar() {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 16),
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
              icon: const Icon(
                Icons.arrow_back_rounded,
                color: AppColors.textPrimary,
                size: 22,
              ),
              onPressed: () => Navigator.of(context).pop(),
            ),
          ),
          
          const Spacer(),
          
          // Title
          Text(
            'Report History',
            style: AppTextStyles.titleLarge.copyWith(
              color: AppColors.textPrimary,
              fontWeight: FontWeight.w700,
            ),
          ),
          
          const Spacer(),
          
          // Placeholder for symmetry
          const SizedBox(width: 48),
        ],
      ),
    );
  }

  // ===========================================================================
  // Loading State
  // ===========================================================================

  Widget _buildLoadingState() {
    return Center(
      child: CircularProgressIndicator(
        color: AppColors.primary,
        strokeWidth: 3,
      ),
    );
  }

  // ===========================================================================
  // Empty State
  // ===========================================================================

  Widget _buildEmptyState() {
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(32),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            // Icon Container
            Container(
              padding: const EdgeInsets.all(24),
              decoration: BoxDecoration(
                color: AppColors.backgroundSecondary,
                shape: BoxShape.circle,
                border: Border.all(color: AppColors.border, width: 2),
              ),
              child: Icon(
                Icons.history_rounded,
                size: 56,
                color: AppColors.textTertiary,
              ),
            ),
            
            const SizedBox(height: 24),
            
            // Title
            Text(
              'No reports yet',
              style: AppTextStyles.titleLarge.copyWith(
                color: AppColors.textPrimary,
                fontWeight: FontWeight.w600,
              ),
            ),
            
            const SizedBox(height: 8),
            
            // Subtitle
            Text(
              'Your submitted reports will appear here',
              style: AppTextStyles.bodyMedium.copyWith(
                color: AppColors.textSecondary,
              ),
              textAlign: TextAlign.center,
            ),
          ],
        ),
      ),
    );
  }

  // ===========================================================================
  // Incident Card
  // ===========================================================================

  Widget _buildIncidentCard(Map<String, dynamic> incident) {
    final type = incident['type'] ?? 'unknown';
    final severity = incident['severity'] ?? 'low';
    final status = incident['status'] ?? 'pending';
    final createdAt = DateTime.parse(incident['created_at']);
    final description = incident['description'] ?? '';

    final statusColor = _getStatusColor(status);
    final typeIcon = _getIncidentIcon(type);
    final typeColor = _getTypeColor(type);

    return Container(
      margin: const EdgeInsets.only(bottom: 12),
      decoration: BoxDecoration(
        color: AppColors.backgroundSecondary,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: AppColors.border, width: 1),
      ),
      child: Material(
        color: Colors.transparent,
        child: InkWell(
          onTap: () {
            // Show details if needed
          },
          borderRadius: BorderRadius.circular(16),
          child: Padding(
            padding: const EdgeInsets.all(16),
            child: Row(
              children: [
                // Type Icon
                Container(
                  padding: const EdgeInsets.all(12),
                  decoration: BoxDecoration(
                    color: typeColor.withOpacity(0.15),
                    borderRadius: BorderRadius.circular(14),
                  ),
                  child: Icon(
                    typeIcon,
                    color: typeColor,
                    size: 24,
                  ),
                ),
                
                const SizedBox(width: 14),
                
                // Content
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      // Type Title
                      Text(
                        _formatIncidentType(type),
                        style: AppTextStyles.titleSmall.copyWith(
                          color: AppColors.textPrimary,
                          fontWeight: FontWeight.w700,
                        ),
                      ),
                      
                      const SizedBox(height: 6),
                      
                      // Date & Time
                      Row(
                        children: [
                          Icon(
                            Icons.access_time_rounded,
                            size: 14,
                            color: AppColors.textTertiary,
                          ),
                          const SizedBox(width: 6),
                          Text(
                            DateFormat('MMM d, y • h:mm a').format(createdAt),
                            style: AppTextStyles.labelSmall.copyWith(
                              color: AppColors.textTertiary,
                            ),
                          ),
                        ],
                      ),
                      
                      const SizedBox(height: 10),
                      
                      // Status Badge
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
                        decoration: BoxDecoration(
                          color: statusColor.withOpacity(0.15),
                          borderRadius: BorderRadius.circular(8),
                          border: Border.all(
                            color: statusColor.withOpacity(0.4),
                            width: 1,
                          ),
                        ),
                        child: Text(
                          status.toUpperCase(),
                          style: AppTextStyles.labelSmall.copyWith(
                            color: statusColor,
                            fontWeight: FontWeight.w700,
                            fontSize: 10,
                          ),
                        ),
                      ),
                    ],
                  ),
                ),
                
                // Arrow
                Icon(
                  Icons.chevron_right_rounded,
                  color: AppColors.textTertiary,
                  size: 24,
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }

  // ===========================================================================
  // Helper Methods
  // ===========================================================================

  Color _getStatusColor(String status) {
    switch (status.toLowerCase()) {
      case 'verified':
      case 'resolved':
        return AppColors.success;
      case 'rejected':
        return AppColors.error;
      case 'pending':
      case 'in_progress':
        return AppColors.warning;
      default:
        return AppColors.textSecondary;
    }
  }

  Color _getTypeColor(String type) {
    switch (type.toLowerCase()) {
      case 'accident':
      case 'emergency':
        return AppColors.error;
      case 'congestion':
      case 'traffic':
        return AppColors.warning;
      case 'road_blockage':
        return AppColors.primary;
      default:
        return AppColors.primary;
    }
  }

  IconData _getIncidentIcon(String type) {
    switch (type.toLowerCase()) {
      case 'congestion':
      case 'traffic':
        return Icons.traffic_rounded;
      case 'accident':
        return Icons.car_crash_rounded;
      case 'road_blockage':
        return Icons.block_rounded;
      case 'emergency':
        return Icons.emergency_rounded;
      case 'fire':
        return Icons.local_fire_department_rounded;
      default:
        return Icons.warning_rounded;
    }
  }

  String _formatIncidentType(String type) {
    return type.replaceAll('_', ' ').split(' ').map((word) {
      if (word.isEmpty) return word;
      return word[0].toUpperCase() + word.substring(1);
    }).join(' ');
  }
}
