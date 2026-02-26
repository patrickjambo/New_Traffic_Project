import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import '../services/notification_service.dart';
import '../config/app_theme.dart';
import 'package:intl/intl.dart';

/// ============================================================================
/// Notifications Screen - TrafficGuard Mobile App
/// ============================================================================
/// Displays all notifications with support for:
/// - Different notification types (emergency, AI detection, system, etc.)
/// - Swipe to delete functionality
/// - Clear all option
/// - Professional dark theme design
/// ============================================================================

class NotificationsScreen extends StatefulWidget {
  const NotificationsScreen({super.key});

  @override
  State<NotificationsScreen> createState() => _NotificationsScreenState();
}

class _NotificationsScreenState extends State<NotificationsScreen> {
  // Services
  final NotificationService _notificationService = NotificationService();
  
  // State
  List<Map<String, dynamic>> _notifications = [];

  @override
  void initState() {
    super.initState();
    _loadNotifications();
  }

  void _loadNotifications() {
    setState(() {
      _notifications = _notificationService.getNotifications();
    });
  }

  Future<void> _refresh() async {
    _loadNotifications();
  }

  Future<void> _deleteNotification(String id) async {
    await _notificationService.deleteNotification(id);
    _loadNotifications();
  }

  Future<void> _clearAll() async {
    final confirm = await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        backgroundColor: AppColors.backgroundSecondary,
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
        title: Row(
          children: [
            Container(
              padding: const EdgeInsets.all(10),
              decoration: BoxDecoration(
                color: AppColors.error.withOpacity(0.15),
                borderRadius: BorderRadius.circular(12),
              ),
              child: const Icon(
                Icons.delete_sweep_rounded,
                color: AppColors.error,
                size: 24,
              ),
            ),
            const SizedBox(width: 12),
            Text(
              'Clear All',
              style: AppTextStyles.titleLarge.copyWith(
                color: AppColors.textPrimary,
                fontWeight: FontWeight.w700,
              ),
            ),
          ],
        ),
        content: Text(
          'Are you sure you want to clear all notifications? This action cannot be undone.',
          style: AppTextStyles.bodyMedium.copyWith(
            color: AppColors.textSecondary,
          ),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context, false),
            child: Text(
              'Cancel',
              style: AppTextStyles.labelMedium.copyWith(
                color: AppColors.textSecondary,
              ),
            ),
          ),
          ElevatedButton(
            onPressed: () => Navigator.pop(context, true),
            style: ElevatedButton.styleFrom(
              backgroundColor: AppColors.error,
              foregroundColor: Colors.white,
              elevation: 0,
              shape: RoundedRectangleBorder(
                borderRadius: BorderRadius.circular(10),
              ),
            ),
            child: Text(
              'Clear All',
              style: AppTextStyles.labelMedium.copyWith(
                color: Colors.white,
                fontWeight: FontWeight.w600,
              ),
            ),
          ),
        ],
      ),
    );

    if (confirm == true) {
      await _notificationService.clearAll();
      _loadNotifications();
      if (mounted) {
        _showSnackBar('All notifications cleared');
      }
    }
  }

  void _showSnackBar(String message) {
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Row(
          children: [
            const Icon(Icons.check_circle_rounded, color: Colors.white, size: 20),
            const SizedBox(width: 12),
            Text(
              message,
              style: AppTextStyles.bodyMedium.copyWith(color: Colors.white),
            ),
          ],
        ),
        backgroundColor: AppColors.success,
        behavior: SnackBarBehavior.floating,
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
        margin: const EdgeInsets.all(16),
      ),
    );
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
              child: _notifications.isEmpty
                  ? _buildEmptyState()
                  : RefreshIndicator(
                      onRefresh: _refresh,
                      color: AppColors.primary,
                      backgroundColor: AppColors.backgroundSecondary,
                      child: ListView.builder(
                        padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 8),
                        itemCount: _notifications.length,
                        itemBuilder: (context, index) {
                          return _buildNotificationItem(_notifications[index]);
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
            'Notifications',
            style: AppTextStyles.titleLarge.copyWith(
              color: AppColors.textPrimary,
              fontWeight: FontWeight.w700,
            ),
          ),
          
          const Spacer(),
          
          // Clear All Button
          if (_notifications.isNotEmpty)
            Container(
              decoration: BoxDecoration(
                color: AppColors.backgroundSecondary,
                borderRadius: BorderRadius.circular(12),
                border: Border.all(color: AppColors.border, width: 1),
              ),
              child: IconButton(
                icon: const Icon(
                  Icons.delete_sweep_rounded,
                  color: AppColors.textSecondary,
                  size: 22,
                ),
                onPressed: _clearAll,
                tooltip: 'Clear All',
              ),
            )
          else
            const SizedBox(width: 48),
        ],
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
            Container(
              padding: const EdgeInsets.all(24),
              decoration: BoxDecoration(
                color: AppColors.backgroundSecondary,
                shape: BoxShape.circle,
                border: Border.all(color: AppColors.border, width: 2),
              ),
              child: Icon(
                Icons.notifications_off_rounded,
                size: 56,
                color: AppColors.textTertiary,
              ),
            ),
            const SizedBox(height: 24),
            Text(
              'No notifications',
              style: AppTextStyles.titleLarge.copyWith(
                color: AppColors.textPrimary,
                fontWeight: FontWeight.w600,
              ),
            ),
            const SizedBox(height: 8),
            Text(
              'You\'re all caught up!',
              style: AppTextStyles.bodyMedium.copyWith(
                color: AppColors.textSecondary,
              ),
            ),
          ],
        ),
      ),
    );
  }

  // ===========================================================================
  // Notification Item
  // ===========================================================================

  Widget _buildNotificationItem(Map<String, dynamic> notification) {
    final title = notification['title'] ?? 'Notification';
    final message = notification['message'] ?? '';
    final timestamp = DateTime.parse(notification['timestamp']);
    final type = notification['type'] ?? 'info';
    final id = notification['id'];

    final icon = _getIconForType(type);
    final color = _getColorForType(type);
    final isUrgent = type.contains('emergency') || type.contains('critical');
    
    return Dismissible(
      key: Key(id),
      direction: DismissDirection.endToStart,
      background: Container(
        alignment: Alignment.centerRight,
        padding: const EdgeInsets.only(right: 24),
        margin: const EdgeInsets.only(bottom: 12),
        decoration: BoxDecoration(
          color: AppColors.error,
          borderRadius: BorderRadius.circular(16),
        ),
        child: const Icon(
          Icons.delete_rounded,
          color: Colors.white,
          size: 26,
        ),
      ),
      onDismissed: (direction) {
        _deleteNotification(id);
        _showSnackBar('Notification deleted');
      },
      child: Container(
        margin: const EdgeInsets.only(bottom: 12),
        decoration: BoxDecoration(
          color: AppColors.backgroundSecondary,
          borderRadius: BorderRadius.circular(16),
          border: Border.all(
            color: isUrgent ? color.withOpacity(0.5) : AppColors.border,
            width: isUrgent ? 1.5 : 1,
          ),
        ),
        child: Material(
          color: Colors.transparent,
          child: InkWell(
            onTap: () {
              // Handle notification tap if needed
            },
            borderRadius: BorderRadius.circular(16),
            child: Padding(
              padding: const EdgeInsets.all(16),
              child: Row(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  // Icon
                  Container(
                    padding: const EdgeInsets.all(12),
                    decoration: BoxDecoration(
                      color: color.withOpacity(0.15),
                      borderRadius: BorderRadius.circular(14),
                    ),
                    child: Icon(
                      icon,
                      color: color,
                      size: 24,
                    ),
                  ),
                  
                  const SizedBox(width: 14),
                  
                  // Content
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        // Title
                        Text(
                          title,
                          style: AppTextStyles.titleSmall.copyWith(
                            color: AppColors.textPrimary,
                            fontWeight: FontWeight.w700,
                          ),
                        ),
                        
                        const SizedBox(height: 6),
                        
                        // Message
                        Text(
                          message,
                          style: AppTextStyles.bodySmall.copyWith(
                            color: AppColors.textSecondary,
                            height: 1.4,
                          ),
                          maxLines: 4,
                          overflow: TextOverflow.ellipsis,
                        ),
                        
                        const SizedBox(height: 10),
                        
                        // Timestamp
                        Row(
                          children: [
                            Icon(
                              Icons.access_time_rounded,
                              size: 14,
                              color: AppColors.textTertiary,
                            ),
                            const SizedBox(width: 6),
                            Text(
                              _formatTime(timestamp),
                              style: AppTextStyles.labelSmall.copyWith(
                                color: AppColors.textTertiary,
                              ),
                            ),
                          ],
                        ),
                      ],
                    ),
                  ),
                ],
              ),
            ),
          ),
        ),
      ),
    );
  }

  // ===========================================================================
  // Helper Methods
  // ===========================================================================

  IconData _getIconForType(String type) {
    switch (type.toLowerCase()) {
      case 'emergency':
      case 'critical_emergency':
        return Icons.emergency_rounded;
      case 'traffic_alert':
        return Icons.traffic_rounded;
      case 'status_update':
        return Icons.check_circle_rounded;
      case 'system':
        return Icons.system_update_rounded;
      case 'ai_detection':
        return Icons.smart_toy_rounded;
      case 'fire':
        return Icons.local_fire_department_rounded;
      case 'accident':
        return Icons.car_crash_rounded;
      default:
        return Icons.notifications_rounded;
    }
  }

  Color _getColorForType(String type) {
    switch (type.toLowerCase()) {
      case 'emergency':
      case 'critical_emergency':
      case 'fire':
        return AppColors.error;
      case 'traffic_alert':
      case 'accident':
        return AppColors.warning;
      case 'status_update':
        return AppColors.success;
      case 'system':
      case 'ai_detection':
        return AppColors.primary;
      default:
        return AppColors.textSecondary;
    }
  }

  String _formatTime(DateTime dateTime) {
    final now = DateTime.now();
    final difference = now.difference(dateTime);

    if (difference.inMinutes < 1) {
      return 'Just now';
    } else if (difference.inMinutes < 60) {
      return '${difference.inMinutes} mins ago';
    } else if (difference.inHours < 24) {
      final hours = difference.inHours;
      return '$hours ${hours == 1 ? 'hour' : 'hours'} ago';
    } else if (difference.inDays < 7) {
      final days = difference.inDays;
      return '$days ${days == 1 ? 'day' : 'days'} ago';
    } else {
      return DateFormat('MMM d, y').format(dateTime);
    }
  }
}
