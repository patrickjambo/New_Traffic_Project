import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:url_launcher/url_launcher.dart';
import '../services/api_service.dart';
import '../services/websocket_service.dart';
import '../services/auth_service.dart';
import '../config/app_theme.dart';

/// ============================================================================
/// Emergency Response Screen - TrafficGuard Mobile App
/// ============================================================================
/// Displays after officer accepts an emergency alert.
/// Features:
/// - Emergency details with type and severity
/// - Status update functionality (En Route, On Scene, Resolved)
/// - Navigation to emergency location
/// - Contact reporter option
/// ============================================================================

class EmergencyResponseScreen extends StatefulWidget {
  final Map<String, dynamic> emergencyData;

  const EmergencyResponseScreen({
    super.key,
    required this.emergencyData,
  });

  @override
  State<EmergencyResponseScreen> createState() => _EmergencyResponseScreenState();
}

class _EmergencyResponseScreenState extends State<EmergencyResponseScreen> {
  // Services
  final ApiService _apiService = ApiService();
  final WebSocketService _wsService = WebSocketService();
  final AuthService _authService = AuthService();
  
  // State
  String _currentStatus = 'dispatched';
  bool _isUpdating = false;
  int? _currentUserId;
  String? _currentUserName;
  
  // Status options for emergency response - ALL using AppColors.primary
  final List<Map<String, dynamic>> _statusOptions = [
    {'status': 'en_route', 'label': 'En Route', 'icon': Icons.directions_car_rounded, 'description': 'I am on my way'},
    {'status': 'on_scene', 'label': 'On Scene', 'icon': Icons.location_on_rounded, 'description': 'I have arrived'},
    {'status': 'resolved', 'label': 'Resolved', 'icon': Icons.check_circle_rounded, 'description': 'Emergency handled'},
  ];

  @override
  void initState() {
    super.initState();
    _currentStatus = widget.emergencyData['status'] ?? 'dispatched';
    _loadCurrentUser();
    
    // Set system UI style
    SystemChrome.setSystemUIOverlayStyle(const SystemUiOverlayStyle(
      statusBarColor: Colors.transparent,
      statusBarIconBrightness: Brightness.light,
    ));
  }

  Future<void> _loadCurrentUser() async {
    final userData = await _authService.getUserData();
    if (userData != null && mounted) {
      setState(() {
        _currentUserId = userData['id'];
        _currentUserName = userData['full_name'] ?? userData['fullName'] ?? userData['name'] ?? 'Officer';
      });
    }
  }

  Future<void> _updateStatus(String newStatus) async {
    if (_isUpdating || _currentStatus == newStatus) return;
    
    final emergencyId = widget.emergencyData['emergencyId'] ?? 
                        widget.emergencyData['id'] ?? 
                        widget.emergencyData['alertId'];
    
    // Update UI immediately (optimistic)
    setState(() {
      _currentStatus = newStatus;
      _isUpdating = true;
    });
    
    _showSnackBar('Status: ${_getStatusLabel(newStatus)}', isSuccess: true);
    
    // 🚀 INSTANT: Emit WebSocket event IMMEDIATELY for real-time dashboard update
    _wsService.emit('emergency:status_change', {
      'emergencyId': emergencyId,
      'id': emergencyId,
      'newStatus': newStatus,
      'status': newStatus,
      'officerId': _currentUserId,
      'officerName': _currentUserName ?? 'Officer',
      'responder_name': _currentUserName ?? 'Officer',
      'timestamp': DateTime.now().toIso8601String(),
    });
    print('📤 WebSocket status change emitted: $newStatus');
    
    // If resolved, ask to go back home
    if (newStatus == 'resolved') {
      _showResolvedDialog();
    }
    
    // Send to backend (non-blocking)
    if (emergencyId != null) {
      _apiService.dio.put(
        '/api/emergency/$emergencyId/status',
        data: {'status': newStatus},
      ).timeout(const Duration(seconds: 10)).then((response) {
        print('✅ Status updated in DB: ${response.data}');
      }).catchError((e) {
        print('⚠️ Status update error (non-blocking): $e');
      });
    }
    
    if (mounted) {
      setState(() => _isUpdating = false);
    }
  }

  String _getStatusLabel(String status) {
    switch (status) {
      case 'dispatched': return 'Dispatched';
      case 'en_route': return 'En Route';
      case 'on_scene': return 'On Scene';
      case 'resolved': return 'Resolved';
      default: return status;
    }
  }

  Color _getStatusColor(String status) {
    switch (status) {
      case 'dispatched': return AppColors.primary;
      case 'en_route': return AppColors.primary;
      case 'on_scene': return AppColors.warning;
      case 'resolved': return AppColors.success;
      default: return AppColors.textTertiary;
    }
  }

  void _showSnackBar(String message, {bool isSuccess = false, bool isError = false}) {
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Row(
          children: [
            Icon(
              isSuccess ? Icons.check_circle_rounded : 
              isError ? Icons.error_rounded : Icons.info_rounded,
              color: Colors.white,
              size: 20,
            ),
            const SizedBox(width: 12),
            Text(
              message,
              style: AppTextStyles.bodyMedium.copyWith(color: Colors.white),
            ),
          ],
        ),
        backgroundColor: isSuccess ? AppColors.success : 
                        isError ? AppColors.error : AppColors.primary,
        behavior: SnackBarBehavior.floating,
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
        margin: const EdgeInsets.all(16),
      ),
    );
  }

  void _showResolvedDialog() {
    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        backgroundColor: AppColors.backgroundSecondary,
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
        title: Row(
          children: [
            Container(
              padding: const EdgeInsets.all(10),
              decoration: BoxDecoration(
                color: AppColors.success.withOpacity(0.15),
                borderRadius: BorderRadius.circular(12),
              ),
              child: const Icon(
                Icons.check_circle_rounded,
                color: AppColors.success,
                size: 24,
              ),
            ),
            const SizedBox(width: 12),
            Text(
              'Emergency Resolved',
              style: AppTextStyles.titleMedium.copyWith(
                color: AppColors.textPrimary,
                fontWeight: FontWeight.w700,
              ),
            ),
          ],
        ),
        content: Text(
          'Great job! The emergency has been marked as resolved.',
          style: AppTextStyles.bodyMedium.copyWith(
            color: AppColors.textSecondary,
          ),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context),
            child: Text(
              'Stay Here',
              style: AppTextStyles.labelMedium.copyWith(
                color: AppColors.textSecondary,
              ),
            ),
          ),
          ElevatedButton(
            onPressed: () {
              Navigator.pop(context);
              Navigator.of(context).popUntil((route) => route.isFirst);
            },
            style: ElevatedButton.styleFrom(
              backgroundColor: AppColors.primary,
              foregroundColor: Colors.white,
              elevation: 0,
              shape: RoundedRectangleBorder(
                borderRadius: BorderRadius.circular(10),
              ),
            ),
            child: Text(
              'Go Home',
              style: AppTextStyles.labelMedium.copyWith(
                color: Colors.white,
                fontWeight: FontWeight.w600,
              ),
            ),
          ),
        ],
      ),
    );
  }

  Future<void> _openNavigation() async {
    double? lat;
    double? lng;
    
    final location = widget.emergencyData['location'];
    if (location is Map) {
      lat = (location['latitude'] as num?)?.toDouble();
      lng = (location['longitude'] as num?)?.toDouble();
    }
    
    lat ??= (widget.emergencyData['latitude'] as num?)?.toDouble();
    lng ??= (widget.emergencyData['longitude'] as num?)?.toDouble();
    
    if (lat != null && lng != null) {
      final googleMapsUrl = Uri.parse('google.navigation:q=$lat,$lng&mode=d');
      
      if (await canLaunchUrl(googleMapsUrl)) {
        await launchUrl(googleMapsUrl);
      } else {
        final webUrl = Uri.parse(
          'https://www.google.com/maps/dir/?api=1&destination=$lat,$lng&travelmode=driving'
        );
        await launchUrl(webUrl, mode: LaunchMode.externalApplication);
      }
    } else {
      _showSnackBar('Location coordinates not available', isError: true);
    }
  }

  @override
  Widget build(BuildContext context) {
    final emergencyType = widget.emergencyData['type'] ?? 
                          widget.emergencyData['emergency_type'] ?? 
                          'Emergency';
    final severity = widget.emergencyData['severity'] ?? 'high';
    final description = widget.emergencyData['description'] ?? 'No description';
    final locationName = widget.emergencyData['location_name'] ?? 
                         widget.emergencyData['location']?['name'] ?? 
                         'Unknown location';
    final contactPhone = widget.emergencyData['contact_phone'] ?? 
                         widget.emergencyData['reporter_phone'] ?? '';

    return Scaffold(
      backgroundColor: AppColors.background,
      appBar: _buildAppBar(),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(20),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Status Card
            _buildStatusCard(),
            
            const SizedBox(height: 20),
            
            // Emergency Details Card
            _buildEmergencyDetailsCard(
              emergencyType: emergencyType,
              severity: severity,
              description: description,
              locationName: locationName,
            ),
            
            const SizedBox(height: 24),
            
            // Navigation Button - using AppColors.primary
            _buildNavigateButton(),
            
            // Call Contact Button
            if (contactPhone.isNotEmpty) ...[
              const SizedBox(height: 12),
              _buildCallContactButton(contactPhone),
            ],
            
            const SizedBox(height: 32),
            
            // Status Update Section
            _buildStatusUpdateSection(),
          ],
        ),
      ),
    );
  }

  // ===========================================================================
  // App Bar
  // ===========================================================================

  PreferredSizeWidget _buildAppBar() {
    return AppBar(
      backgroundColor: AppColors.error,
      elevation: 0,
      leading: IconButton(
        icon: const Icon(Icons.arrow_back_rounded, color: Colors.white),
        onPressed: () => Navigator.of(context).pop(),
      ),
      title: Text(
        'Emergency Response',
        style: AppTextStyles.titleMedium.copyWith(
          color: Colors.white,
          fontWeight: FontWeight.w600,
        ),
      ),
      actions: [
        IconButton(
          icon: const Icon(Icons.home_rounded, color: Colors.white),
          onPressed: () {
            Navigator.of(context).popUntil((route) => route.isFirst);
          },
          tooltip: 'Go Home',
        ),
      ],
    );
  }

  // ===========================================================================
  // Status Card
  // ===========================================================================

  Widget _buildStatusCard() {
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: _getStatusColor(_currentStatus).withOpacity(0.1),
        borderRadius: BorderRadius.circular(16),
        border: Border.all(
          color: _getStatusColor(_currentStatus).withOpacity(0.3),
          width: 1,
        ),
      ),
      child: Row(
        children: [
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
            decoration: BoxDecoration(
              color: _getStatusColor(_currentStatus),
              borderRadius: BorderRadius.circular(20),
            ),
            child: Text(
              _getStatusLabel(_currentStatus).toUpperCase(),
              style: AppTextStyles.labelMedium.copyWith(
                color: Colors.white,
                fontWeight: FontWeight.w700,
                letterSpacing: 0.5,
              ),
            ),
          ),
          const Spacer(),
          if (_isUpdating)
            SizedBox(
              width: 22,
              height: 22,
              child: CircularProgressIndicator(
                strokeWidth: 2.5,
                color: _getStatusColor(_currentStatus),
              ),
            ),
        ],
      ),
    );
  }

  // ===========================================================================
  // Emergency Details Card
  // ===========================================================================

  Widget _buildEmergencyDetailsCard({
    required String emergencyType,
    required String severity,
    required String description,
    required String locationName,
  }) {
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        color: AppColors.backgroundSecondary,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: AppColors.border, width: 1),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Header Row
          Row(
            children: [
              Container(
                padding: const EdgeInsets.all(10),
                decoration: BoxDecoration(
                  color: AppColors.warning.withOpacity(0.15),
                  borderRadius: BorderRadius.circular(12),
                ),
                child: Icon(
                  Icons.warning_rounded,
                  color: severity == 'critical' ? AppColors.error : AppColors.warning,
                  size: 24,
                ),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Text(
                  emergencyType.toString().toUpperCase(),
                  style: AppTextStyles.titleLarge.copyWith(
                    color: AppColors.textPrimary,
                    fontWeight: FontWeight.w700,
                  ),
                ),
              ),
              // Severity Badge
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
                decoration: BoxDecoration(
                  color: severity == 'critical' ? AppColors.error : AppColors.warning,
                  borderRadius: BorderRadius.circular(8),
                ),
                child: Text(
                  severity.toString().toUpperCase(),
                  style: AppTextStyles.labelSmall.copyWith(
                    color: Colors.white,
                    fontWeight: FontWeight.w700,
                  ),
                ),
              ),
            ],
          ),
          
          const SizedBox(height: 20),
          Divider(color: AppColors.border, height: 1),
          const SizedBox(height: 20),
          
          // Description
          _buildInfoRow(
            icon: Icons.description_rounded,
            label: 'Description',
            value: description,
          ),
          
          const SizedBox(height: 16),
          
          // Location
          _buildInfoRow(
            icon: Icons.location_on_rounded,
            label: 'Location',
            value: locationName,
          ),
        ],
      ),
    );
  }

  Widget _buildInfoRow({
    required IconData icon,
    required String label,
    required String value,
  }) {
    return Row(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Icon(icon, size: 20, color: AppColors.textTertiary),
        const SizedBox(width: 12),
        Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                label,
                style: AppTextStyles.labelSmall.copyWith(
                  color: AppColors.textTertiary,
                ),
              ),
              const SizedBox(height: 4),
              Text(
                value,
                style: AppTextStyles.bodyMedium.copyWith(
                  color: AppColors.textPrimary,
                ),
              ),
            ],
          ),
        ),
      ],
    );
  }

  // ===========================================================================
  // Navigation Button - Using AppColors.primary
  // ===========================================================================

  Widget _buildNavigateButton() {
    return SizedBox(
      width: double.infinity,
      height: 56,
      child: ElevatedButton.icon(
        onPressed: _openNavigation,
        icon: const Icon(Icons.navigation_rounded, size: 24),
        label: Text(
          'NAVIGATE TO LOCATION',
          style: AppTextStyles.labelLarge.copyWith(
            color: Colors.white,
            fontWeight: FontWeight.w700,
          ),
        ),
        style: ElevatedButton.styleFrom(
          backgroundColor: AppColors.primary,
          foregroundColor: Colors.white,
          elevation: 0,
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(14),
          ),
        ),
      ),
    );
  }

  // ===========================================================================
  // Call Contact Button
  // ===========================================================================

  Widget _buildCallContactButton(String contactPhone) {
    return SizedBox(
      width: double.infinity,
      height: 52,
      child: OutlinedButton.icon(
        onPressed: () async {
          final phoneUrl = Uri.parse('tel:$contactPhone');
          if (await canLaunchUrl(phoneUrl)) {
            await launchUrl(phoneUrl);
          }
        },
        icon: const Icon(Icons.phone_rounded, size: 22),
        label: Text(
          'Call $contactPhone',
          style: AppTextStyles.labelMedium.copyWith(
            fontWeight: FontWeight.w600,
          ),
        ),
        style: OutlinedButton.styleFrom(
          foregroundColor: AppColors.primary,
          side: BorderSide(
            color: AppColors.primary.withOpacity(0.5),
            width: 1.5,
          ),
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(14),
          ),
        ),
      ),
    );
  }

  // ===========================================================================
  // Status Update Section - ALL buttons using AppColors.primary
  // ===========================================================================

  Widget _buildStatusUpdateSection() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          'Update Status',
          style: AppTextStyles.titleMedium.copyWith(
            color: AppColors.textPrimary,
            fontWeight: FontWeight.w700,
          ),
        ),
        const SizedBox(height: 16),
        
        // Status Buttons - ALL using AppColors.primary
        ..._statusOptions.map((option) {
          final isCurrentStatus = _currentStatus == option['status'];
          final isPastStatus = _getStatusIndex(_currentStatus) > _getStatusIndex(option['status']);
          final isResolved = option['status'] == 'resolved';
          
          // Use success color only for resolved button, primary for others
          final buttonColor = isResolved ? AppColors.success : AppColors.primary;
          
          return Padding(
            padding: const EdgeInsets.only(bottom: 12),
            child: SizedBox(
              width: double.infinity,
              height: 56,
              child: ElevatedButton(
                onPressed: (isCurrentStatus || isPastStatus || _isUpdating)
                    ? null
                    : () => _updateStatus(option['status']),
                style: ElevatedButton.styleFrom(
                  backgroundColor: isCurrentStatus 
                      ? buttonColor 
                      : buttonColor.withOpacity(0.12),
                  foregroundColor: isCurrentStatus ? Colors.white : buttonColor,
                  disabledBackgroundColor: isPastStatus 
                      ? AppColors.backgroundSecondary 
                      : isCurrentStatus ? buttonColor : buttonColor.withOpacity(0.12),
                  disabledForegroundColor: isPastStatus 
                      ? AppColors.textTertiary 
                      : isCurrentStatus ? Colors.white : buttonColor,
                  elevation: 0,
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(14),
                    side: BorderSide(
                      color: isPastStatus 
                          ? AppColors.border 
                          : buttonColor.withOpacity(0.4),
                      width: 1.5,
                    ),
                  ),
                ),
                child: Row(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    Icon(
                      isCurrentStatus ? Icons.check_rounded : option['icon'],
                      size: 22,
                    ),
                    const SizedBox(width: 12),
                    Text(
                      isCurrentStatus 
                          ? '${option['label']} ✓' 
                          : option['label'],
                      style: AppTextStyles.labelLarge.copyWith(
                        fontWeight: FontWeight.w700,
                      ),
                    ),
                  ],
                ),
              ),
            ),
          );
        }).toList(),
      ],
    );
  }

  int _getStatusIndex(String status) {
    switch (status) {
      case 'dispatched': return 0;
      case 'en_route': return 1;
      case 'on_scene': return 2;
      case 'resolved': return 3;
      default: return 0;
    }
  }
}
