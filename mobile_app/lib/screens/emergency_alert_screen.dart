import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:url_launcher/url_launcher.dart';
import 'package:dio/dio.dart';
import 'package:vibration/vibration.dart';
import 'dart:async';
import '../services/emergency_alert_service.dart';
import '../services/critical_alert_service.dart';
import '../services/api_service.dart';
import '../services/websocket_service.dart';
import '../services/auth_service.dart';
import '../config/app_theme.dart';
import 'emergency_response_screen.dart';

/// ============================================================================
/// Emergency Alert Screen - TrafficGuard Mobile App
/// ============================================================================
/// Full-screen emergency alert that displays when a critical alert is received.
/// Features:
/// - Full-screen red overlay with pulsing animation
/// - Countdown timer for auto-decline
/// - Accept/Decline/Forward actions
/// - Navigate to location functionality
/// - Real-time sync with other officers
/// ============================================================================

class EmergencyAlertScreen extends StatefulWidget {
  final Map<String, dynamic> alertData;

  const EmergencyAlertScreen({
    super.key,
    required this.alertData,
  });

  @override
  State<EmergencyAlertScreen> createState() => _EmergencyAlertScreenState();
}

class _EmergencyAlertScreenState extends State<EmergencyAlertScreen>
    with TickerProviderStateMixin {
  
  // Animation Controllers
  late AnimationController _pulseController;
  late AnimationController _flashController;
  late Animation<double> _pulseAnimation;
  late Animation<Color?> _flashAnimation;
  
  // Services
  final EmergencyAlertService _alertService = EmergencyAlertService();
  final ApiService _apiService = ApiService();
  final WebSocketService _wsService = WebSocketService();
  
  // State
  Timer? _autoTimeoutTimer;
  int _secondsRemaining = 60;
  bool _isAccepting = false;
  bool _isAccepted = false;
  String? _acceptedByOfficer;
  bool _showDetails = false;
  String _currentStatus = 'dispatched';
  bool _isUpdatingStatus = false;
  int? _currentUserId;
  String? _currentUserName;
  
  // Auth Service to get current user
  final AuthService _authService = AuthService();
  
  // Emergency Colors (keeping red theme)
  static const Color _emergencyDark = Color(0xFFB71C1C);
  static const Color _emergencyBright = Color(0xFFEF5350);

  @override
  void initState() {
    super.initState();
    
    // Get current user ID to avoid showing "Another officer" screen to self
    _loadCurrentUser();
    
    // Set system UI to immersive mode
    SystemChrome.setEnabledSystemUIMode(SystemUiMode.immersiveSticky);
    
    // Pulse animation for icon
    _pulseController = AnimationController(
      duration: const Duration(milliseconds: 600),
      vsync: this,
    )..repeat(reverse: true);
    
    _pulseAnimation = Tween<double>(begin: 1.0, end: 1.2).animate(
      CurvedAnimation(parent: _pulseController, curve: Curves.easeInOut),
    );
    
    // Flash animation for background
    _flashController = AnimationController(
      duration: const Duration(milliseconds: 1000),
      vsync: this,
    )..repeat(reverse: true);
    
    _flashAnimation = ColorTween(
      begin: _emergencyDark,
      end: _emergencyBright,
    ).animate(CurvedAnimation(
      parent: _flashController,
      curve: Curves.easeInOut,
    ));
    
    // Auto-timeout countdown
    _startTimeout();
    
    // Listen for emergency accepted by another officer
    _listenForAcceptance();
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

  void _startTimeout() {
    _autoTimeoutTimer = Timer.periodic(const Duration(seconds: 1), (timer) {
      if (!mounted) {
        timer.cancel();
        return;
      }
      setState(() {
        _secondsRemaining--;
      });
      
      if (_secondsRemaining <= 0) {
        timer.cancel();
        _handleDecline();
      }
    });
  }

  void _listenForAcceptance() {
    // Listen for when another officer accepts this emergency
    _wsService.onCustomEvent('emergency:accepted', (data) {
      final emergencyId = widget.alertData['emergencyId'] ?? widget.alertData['alertId'];
      if (data['emergencyId'] == emergencyId || data['emergencyId']?.toString() == emergencyId?.toString()) {
        
        // Check if the current user is the one who accepted
        final acceptingOfficerId = data['acceptedBy']?['officerId'];
        final isCurrentUser = _currentUserId != null && 
            (acceptingOfficerId == _currentUserId || 
             acceptingOfficerId?.toString() == _currentUserId?.toString());
        
        // If current user accepted, don't show "Another officer" screen
        // Just stop the alarm and let _handleAccept handle the navigation
        if (isCurrentUser) {
          print('🚔 Current user accepted - skipping "Another officer" screen');
          _alertService.stopEmergencyAlarm();
          return; // Don't show the "Another officer" screen
        }
        
        // Another officer accepted - show notification
        print('🚔 Another officer (${data['acceptedBy']?['officerName']}) accepted emergency');
        setState(() {
          _isAccepted = true;
          _acceptedByOfficer = data['acceptedBy']?['officerName'] ?? 'Another officer';
        });
        
        // Stop alarm since someone else accepted
        _alertService.stopEmergencyAlarm();
        
        // Show message and close after 3 seconds
        Future.delayed(const Duration(seconds: 3), () {
          if (mounted) {
            Navigator.of(context).pop({'action': 'accepted_by_other', 'acceptedBy': _acceptedByOfficer});
          }
        });
      }
    });
  }

  @override
  void dispose() {
    _pulseController.dispose();
    _flashController.dispose();
    _autoTimeoutTimer?.cancel();
    SystemChrome.setEnabledSystemUIMode(SystemUiMode.edgeToEdge);
    super.dispose();
  }

  Future<void> _handleAccept() async {
    if (_isAccepting || _isAccepted) return;
    
    setState(() => _isAccepting = true);

    final emergencyId = widget.alertData['emergencyId'] ?? widget.alertData['alertId'] ?? widget.alertData['id'];
    
    print('🚨 Accepting emergency ID: $emergencyId');
    
    // INSTANT: Stop ALL alarms and vibration IMMEDIATELY
    // Stop vibration FIRST (most noticeable to user)
    Vibration.cancel();
    
    // Stop emergency alarm service
    _alertService.stopEmergencyAlarm();
    
    // Stop critical alert service
    CriticalAlertService().stopCriticalAlert();
    
    // Stop animations
    _flashController.stop();
    _pulseController.stop();
    
    // Cancel auto-timeout
    _autoTimeoutTimer?.cancel();
    
    print('✅ All alarms and vibrations stopped');
    
    // Mark this emergency as accepted to prevent duplicate alerts
    _wsService.markEmergencyAccepted(emergencyId);
    
    // 🚀 INSTANT: Emit WebSocket event IMMEDIATELY for real-time dashboard update
    // This updates admin dashboard BEFORE the API call completes
    _wsService.emit('emergency:officer_response', {
      'emergencyId': emergencyId,
      'id': emergencyId,
      'action': 'accept',
      'status': 'dispatched',
      'officerId': _currentUserId,
      'officerName': _currentUserName ?? 'Officer',
      'responder_name': _currentUserName ?? 'Officer',
      'assigned_to': _currentUserId,
      'assigned_to_name': _currentUserName ?? 'Officer',
      'timestamp': DateTime.now().toIso8601String(),
    });
    print('📤 WebSocket accept event emitted immediately - Officer: $_currentUserName');
    
    // 🚀 INSTANT: Navigate to response screen IMMEDIATELY
    // Don't wait for API - navigate first for instant UX
    if (mounted) {
      Navigator.of(context).pushReplacement(
        MaterialPageRoute(
          builder: (context) => EmergencyResponseScreen(
            emergencyData: {
              ...widget.alertData,
              'emergencyId': emergencyId,
              'status': 'dispatched',
            },
          ),
        ),
      );
    }
    
    // 📝 BACKGROUND: Call API to update database (non-blocking)
    // This runs after navigation - user doesn't wait
    if (emergencyId != null) {
      _apiService.dio.post(
        '/api/emergency/$emergencyId/respond',
        data: {'action': 'accept'},
      ).timeout(const Duration(seconds: 10)).then((response) {
        print('✅ Accept API success: ${response.data}');
      }).catchError((e) {
        print('⚠️ Accept API error (non-blocking): $e');
      });
    }
  }
  
  Future<void> _handleDecline() async {
    try {
      final emergencyId = widget.alertData['emergencyId'] ?? widget.alertData['alertId'];
      
      await _apiService.dio.post(
        '/api/emergency/$emergencyId/respond',
        data: {'action': 'decline'},
      );
    } catch (e) {
      print('Error declining: $e');
    }
    
    await _alertService.stopEmergencyAlarm();
    
    if (mounted) {
      Navigator.of(context).pop({'action': 'declined'});
    }
  }

  Future<void> _showForwardDialog() async {
    final emergencyId = widget.alertData['emergencyId'] ?? widget.alertData['alertId'];
    
    // Get nearby officers
    try {
      final response = await _apiService.dio.get('/api/emergency/$emergencyId/nearby-officers');
      
      if (response.data['success'] == true) {
        final officers = response.data['data'] as List;
        
        if (officers.isEmpty) {
          if (mounted) {
            ScaffoldMessenger.of(context).showSnackBar(
              const SnackBar(content: Text('No nearby officers available')),
            );
          }
          return;
        }
        
        // Show dialog to select officer
        if (mounted) {
          final selectedOfficer = await showDialog<Map<String, dynamic>>(
            context: context,
            builder: (context) => AlertDialog(
              title: const Text('Forward to Officer'),
              content: SizedBox(
                width: double.maxFinite,
                child: ListView.builder(
                  shrinkWrap: true,
                  itemCount: officers.length,
                  itemBuilder: (context, index) {
                    final officer = officers[index];
                    return ListTile(
                      leading: const CircleAvatar(child: Icon(Icons.person)),
                      title: Text(officer['fullName']),
                      subtitle: Text('${officer['distanceKm']} km away'),
                      onTap: () => Navigator.pop(context, officer),
                    );
                  },
                ),
              ),
              actions: [
                TextButton(
                  onPressed: () => Navigator.pop(context),
                  child: const Text('Cancel'),
                ),
              ],
            ),
          );
          
          if (selectedOfficer != null) {
            await _forwardToOfficer(selectedOfficer['id']);
          }
        }
      }
    } catch (e) {
      print('Error getting nearby officers: $e');
    }
  }

  Future<void> _forwardToOfficer(int officerId) async {
    try {
      final emergencyId = widget.alertData['emergencyId'] ?? widget.alertData['alertId'];
      
      await _apiService.dio.post(
        '/api/emergency/$emergencyId/respond',
        data: {
          'action': 'forward',
          'forwardToOfficerId': officerId,
        },
      );
      
      await _alertService.stopEmergencyAlarm();
      
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Emergency forwarded successfully')),
        );
        Navigator.of(context).pop({'action': 'forwarded'});
      }
    } catch (e) {
      print('Error forwarding: $e');
    }
  }

  Future<void> _openNavigation() async {
    final location = widget.alertData['location'];
    double? lat;
    double? lng;
    
    if (location != null) {
      lat = location['latitude']?.toDouble();
      lng = location['longitude']?.toDouble();
    } else {
      lat = widget.alertData['latitude']?.toDouble();
      lng = widget.alertData['longitude']?.toDouble();
    }
    
    if (lat != null && lng != null) {
      // Try Google Maps first
      final googleMapsUrl = Uri.parse(
        'google.navigation:q=$lat,$lng&mode=d'
      );
      
      if (await canLaunchUrl(googleMapsUrl)) {
        await launchUrl(googleMapsUrl);
      } else {
        // Fallback to web maps
        final webUrl = Uri.parse(
          'https://www.google.com/maps/dir/?api=1&destination=$lat,$lng&travelmode=driving'
        );
        await launchUrl(webUrl, mode: LaunchMode.externalApplication);
      }
    } else {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Location not available')),
        );
      }
    }
  }

  /// Update emergency status (en_route, on_scene, resolved)
  Future<void> _updateEmergencyStatus(String newStatus) async {
    if (_isUpdatingStatus) return;
    
    setState(() => _isUpdatingStatus = true);
    
    try {
      final emergencyId = widget.alertData['emergencyId'] ?? 
                          widget.alertData['alertId'] ?? 
                          widget.alertData['id'];
      
      if (emergencyId == null) {
        throw Exception('Emergency ID not found');
      }
      
      print('📡 Updating emergency $emergencyId status to: $newStatus');
      
      final response = await _apiService.dio.put(
        '/api/emergency/$emergencyId/status',
        data: {'status': newStatus},
      );
      
      if (response.data['success'] == true) {
        setState(() {
          _currentStatus = newStatus;
        });
        
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(
              content: Text('Status updated to: ${_getStatusLabel(newStatus)}'),
              backgroundColor: Colors.green,
            ),
          );
        }
        
        // If resolved, close and go home
        if (newStatus == 'resolved') {
          await Future.delayed(const Duration(seconds: 1));
          _closeAndGoHome();
        }
      } else {
        throw Exception(response.data['message'] ?? 'Failed to update status');
      }
    } catch (e) {
      print('❌ Error updating status: $e');
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Failed to update status: $e'),
            backgroundColor: Colors.red,
          ),
        );
      }
    } finally {
      if (mounted) {
        setState(() => _isUpdatingStatus = false);
      }
    }
  }
  
  String _getStatusLabel(String status) {
    switch (status) {
      case 'dispatched': return 'Dispatched';
      case 'en_route': return 'En Route';
      case 'on_scene': return 'On Scene';
      case 'resolved': return 'Resolved';
      case 'cancelled': return 'Cancelled';
      default: return status;
    }
  }
  
  Color _getStatusColor(String status) {
    switch (status) {
      case 'dispatched': return AppColors.primary;
      case 'en_route': return AppColors.primary;
      case 'on_scene': return AppColors.warning;
      case 'resolved': return AppColors.success;
      case 'cancelled': return AppColors.textTertiary;
      default: return AppColors.primary;
    }
  }

  void _closeAndGoHome() {
    Navigator.of(context).popUntil((route) => route.isFirst);
  }

  @override
  Widget build(BuildContext context) {
    // If accepted by another officer (NOT the current user who is accepting)
    // Don't show this screen if the current user is the one accepting (_isAccepting flag)
    if (_isAccepted && _acceptedByOfficer != null && !_showDetails && !_isAccepting) {
      return Scaffold(
        backgroundColor: AppColors.success,
        body: Center(
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Container(
                padding: const EdgeInsets.all(24),
                decoration: BoxDecoration(
                  color: Colors.white.withOpacity(0.2),
                  shape: BoxShape.circle,
                ),
                child: const Icon(
                  Icons.check_circle_rounded,
                  color: Colors.white,
                  size: 80,
                ),
              ),
              const SizedBox(height: 24),
              Text(
                _acceptedByOfficer!,
                textAlign: TextAlign.center,
                style: AppTextStyles.headlineMedium.copyWith(
                  color: Colors.white,
                  fontWeight: FontWeight.w700,
                ),
              ),
              const SizedBox(height: 8),
              Text(
                'is responding to this emergency',
                textAlign: TextAlign.center,
                style: AppTextStyles.bodyLarge.copyWith(
                  color: Colors.white.withOpacity(0.9),
                ),
              ),
              const SizedBox(height: 16),
              Text(
                'This alert will close automatically',
                style: AppTextStyles.bodySmall.copyWith(
                  color: Colors.white.withOpacity(0.7),
                ),
              ),
            ],
          ),
        ),
      );
    }

    // Show emergency details after accepting
    if (_showDetails) {
      return _buildDetailsView();
    }

    // Main alert view
    return WillPopScope(
      onWillPop: () async => false,
      child: AnimatedBuilder(
        animation: _flashAnimation,
        builder: (context, child) {
          return Scaffold(
            backgroundColor: _flashAnimation.value,
            body: SafeArea(
              child: Padding(
                padding: const EdgeInsets.all(24),
                child: Column(
                  children: [
                    // Top: Timer and mute
                    _buildTopBar(),
                    
                    // Center: Alert content
                    Expanded(
                      child: SingleChildScrollView(
                        child: _buildAlertContent(),
                      ),
                    ),
                    
                    // Bottom: Action buttons
                    _buildActionButtons(),
                  ],
                ),
              ),
            ),
          );
        },
      ),
    );
  }

  // ===========================================================================
  // Top Bar with Timer and Mute
  // ===========================================================================

  Widget _buildTopBar() {
    return Padding(
      padding: const EdgeInsets.only(bottom: 20),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          // Timer Badge
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
            decoration: BoxDecoration(
              color: Colors.black.withOpacity(0.3),
              borderRadius: BorderRadius.circular(24),
              border: Border.all(
                color: Colors.white.withOpacity(0.2),
                width: 1,
              ),
            ),
            child: Row(
              children: [
                Icon(
                  Icons.timer_outlined,
                  color: Colors.white.withOpacity(0.9),
                  size: 18,
                ),
                const SizedBox(width: 8),
                Text(
                  'Response in: ${_secondsRemaining}s',
                  style: AppTextStyles.labelLarge.copyWith(
                    color: Colors.white,
                    fontWeight: FontWeight.w600,
                  ),
                ),
              ],
            ),
          ),
          
          // Mute Button
          Container(
            decoration: BoxDecoration(
              color: Colors.black.withOpacity(0.3),
              shape: BoxShape.circle,
              border: Border.all(
                color: Colors.white.withOpacity(0.2),
                width: 1,
              ),
            ),
            child: IconButton(
              icon: const Icon(
                Icons.volume_off_rounded,
                color: Colors.white,
                size: 24,
              ),
              onPressed: () => _alertService.stopEmergencyAlarm(),
              tooltip: 'Mute Alarm',
            ),
          ),
        ],
      ),
    );
  }

  // ===========================================================================
  // Alert Content
  // ===========================================================================

  Widget _buildAlertContent() {
    return Column(
      mainAxisAlignment: MainAxisAlignment.center,
      children: [
        const SizedBox(height: 20),
        
        // Pulsing emergency icon
        ScaleTransition(
          scale: _pulseAnimation,
          child: Container(
            padding: const EdgeInsets.all(32),
            decoration: BoxDecoration(
              color: Colors.white.withOpacity(0.15),
              shape: BoxShape.circle,
              border: Border.all(
                color: Colors.white.withOpacity(0.3),
                width: 2,
              ),
              boxShadow: [
                BoxShadow(
                  color: Colors.black.withOpacity(0.2),
                  blurRadius: 30,
                  spreadRadius: 5,
                ),
              ],
            ),
            child: const Icon(
              Icons.warning_rounded,
              size: 72,
              color: Colors.white,
            ),
          ),
        ),
        
        const SizedBox(height: 32),
        
        // EMERGENCY text with icon
        Row(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(
              Icons.emergency_rounded,
              color: Colors.white.withOpacity(0.9),
              size: 28,
            ),
            const SizedBox(width: 12),
            Text(
              'EMERGENCY',
              style: AppTextStyles.headlineMedium.copyWith(
                color: Colors.white,
                fontWeight: FontWeight.w900,
                letterSpacing: 4,
              ),
            ),
            const SizedBox(width: 12),
            Icon(
              Icons.emergency_rounded,
              color: Colors.white.withOpacity(0.9),
              size: 28,
            ),
          ],
        ),
        
        const SizedBox(height: 16),
        
        // Alert title
        Text(
          widget.alertData['title'] ?? 'Critical Alert',
          textAlign: TextAlign.center,
          style: AppTextStyles.titleLarge.copyWith(
            color: Colors.white,
            fontWeight: FontWeight.w700,
            fontSize: 20,
          ),
        ),
        
        const SizedBox(height: 20),
        
        // Alert message box
        Container(
          width: double.infinity,
          padding: const EdgeInsets.all(20),
          decoration: BoxDecoration(
            color: Colors.black.withOpacity(0.25),
            borderRadius: BorderRadius.circular(16),
            border: Border.all(
              color: Colors.white.withOpacity(0.15),
              width: 1,
            ),
          ),
          child: Column(
            children: [
              Text(
                'URGENT RESPONSE REQUIRED!',
                textAlign: TextAlign.center,
                style: AppTextStyles.labelLarge.copyWith(
                  color: Colors.white,
                  fontWeight: FontWeight.w700,
                  letterSpacing: 0.5,
                ),
              ),
              const SizedBox(height: 12),
              Text(
                widget.alertData['message'] ?? 
                widget.alertData['description'] ?? 
                'Immediate response required',
                textAlign: TextAlign.center,
                style: AppTextStyles.bodyMedium.copyWith(
                  color: Colors.white.withOpacity(0.9),
                  height: 1.4,
                ),
              ),
              const SizedBox(height: 16),
              
              // Location Info
              _buildAlertInfoRow(
                icon: Icons.location_on_rounded,
                label: _getLocationText(),
              ),
              
              // AI Confidence if available
              if (widget.alertData['confidence'] != null) ...[
                const SizedBox(height: 8),
                _buildAlertInfoRow(
                  icon: Icons.smart_toy_rounded,
                  label: 'AI Confidence: ${widget.alertData['confidence']}%',
                ),
              ],
              
              // Detection type if available
              if (widget.alertData['detectedType'] != null ||
                  widget.alertData['type'] != null) ...[
                const SizedBox(height: 8),
                _buildAlertInfoRow(
                  icon: Icons.warning_amber_rounded,
                  label: 'Detected: ${widget.alertData['detectedType'] ?? widget.alertData['type']}',
                ),
              ],
            ],
          ),
        ),
        
        const SizedBox(height: 16),
        
        // Location button
        _buildLocationButton(),
        
        // Distance info
        if (widget.alertData['distanceKm'] != null)
          Padding(
            padding: const EdgeInsets.only(top: 12),
            child: Row(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                Icon(
                  Icons.near_me_rounded,
                  color: Colors.white.withOpacity(0.8),
                  size: 16,
                ),
                const SizedBox(width: 8),
                Text(
                  '${widget.alertData['distanceKm']} km away',
                  style: AppTextStyles.bodySmall.copyWith(
                    color: Colors.white.withOpacity(0.8),
                  ),
                ),
              ],
            ),
          ),
        
        const SizedBox(height: 20),
      ],
    );
  }

  Widget _buildAlertInfoRow({required IconData icon, required String label}) {
    return Row(
      mainAxisAlignment: MainAxisAlignment.center,
      children: [
        Icon(icon, color: Colors.amber, size: 18),
        const SizedBox(width: 8),
        Flexible(
          child: Text(
            label,
            style: AppTextStyles.bodySmall.copyWith(
              color: Colors.white.withOpacity(0.9),
            ),
          ),
        ),
      ],
    );
  }

  String _getLocationText() {
    String? address;
    final location = widget.alertData['location'];
    
    if (location != null && location is Map) {
      address = location['address'] ?? location['district'];
      if (location['latitude'] != null && location['longitude'] != null) {
        final lat = location['latitude'];
        final lng = location['longitude'];
        if (address == null || address.isEmpty) {
          address = 'Current Location ($lat, $lng)';
        }
      }
    } else {
      address = widget.alertData['address'] ?? widget.alertData['location_name'];
    }
    
    return address ?? 'Location shared';
  }

  Widget _buildLocationButton() {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 12),
      decoration: BoxDecoration(
        color: Colors.black.withOpacity(0.25),
        borderRadius: BorderRadius.circular(30),
        border: Border.all(
          color: Colors.white.withOpacity(0.2),
          width: 1,
        ),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          const Icon(
            Icons.location_on_rounded,
            color: Colors.white,
            size: 20,
          ),
          const SizedBox(width: 10),
          Flexible(
            child: Text(
              _getLocationText(),
              style: AppTextStyles.bodySmall.copyWith(
                color: Colors.white,
              ),
            ),
          ),
        ],
      ),
    );
  }

  // ===========================================================================
  // Action Buttons
  // ===========================================================================

  Widget _buildActionButtons() {
    return Column(
      children: [
        // Accept button - Using AppColors.primary for consistency
        SizedBox(
          width: double.infinity,
          height: 56,
          child: ElevatedButton(
            onPressed: _isAccepting ? null : _handleAccept,
            style: ElevatedButton.styleFrom(
              backgroundColor: AppColors.primary,
              foregroundColor: Colors.white,
              disabledBackgroundColor: AppColors.primary.withOpacity(0.6),
              elevation: 4,
              shadowColor: Colors.black.withOpacity(0.3),
              shape: RoundedRectangleBorder(
                borderRadius: BorderRadius.circular(16),
              ),
            ),
            child: _isAccepting
                ? const SizedBox(
                    width: 24,
                    height: 24,
                    child: CircularProgressIndicator(
                      color: Colors.white,
                      strokeWidth: 2.5,
                    ),
                  )
                : Row(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      const Icon(Icons.check_circle_rounded, size: 24),
                      const SizedBox(width: 12),
                      Text(
                        'ACCEPT & RESPOND',
                        style: AppTextStyles.labelLarge.copyWith(
                          color: Colors.white,
                          fontWeight: FontWeight.w700,
                          letterSpacing: 0.5,
                        ),
                      ),
                    ],
                  ),
          ),
        ),
        
        const SizedBox(height: 12),
        
        // Navigate button
        SizedBox(
          width: double.infinity,
          height: 52,
          child: OutlinedButton(
            onPressed: _openNavigation,
            style: OutlinedButton.styleFrom(
              foregroundColor: Colors.white,
              side: const BorderSide(color: Colors.white, width: 2),
              shape: RoundedRectangleBorder(
                borderRadius: BorderRadius.circular(14),
              ),
            ),
            child: Row(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                const Icon(Icons.navigation_rounded, size: 22),
                const SizedBox(width: 10),
                Text(
                  'NAVIGATE TO LOCATION',
                  style: AppTextStyles.labelMedium.copyWith(
                    color: Colors.white,
                    fontWeight: FontWeight.w600,
                  ),
                ),
              ],
            ),
          ),
        ),
        
        const SizedBox(height: 16),
        
        // Decline / Forward
        Row(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            TextButton(
              onPressed: _handleDecline,
              style: TextButton.styleFrom(
                foregroundColor: Colors.white.withOpacity(0.8),
              ),
              child: Text(
                'Decline',
                style: AppTextStyles.labelMedium.copyWith(
                  color: Colors.white.withOpacity(0.8),
                ),
              ),
            ),
            Text(
              '/',
              style: TextStyle(color: Colors.white.withOpacity(0.5)),
            ),
            TextButton(
              onPressed: _showForwardDialog,
              style: TextButton.styleFrom(
                foregroundColor: Colors.white.withOpacity(0.8),
              ),
              child: Text(
                'Forward to Another Officer',
                style: AppTextStyles.labelMedium.copyWith(
                  color: Colors.white.withOpacity(0.8),
                ),
              ),
            ),
          ],
        ),
      ],
    );
  }

  // ===========================================================================
  // Details View (after accepting)
  // ===========================================================================

  Widget _buildDetailsView() {
    final location = widget.alertData['location'];
    final address = location?['address'] ?? 
                    widget.alertData['address'] ?? 
                    widget.alertData['location_name'] ?? 
                    'Location shared';
    
    return Scaffold(
      backgroundColor: AppColors.background,
      appBar: AppBar(
        backgroundColor: AppColors.success,
        elevation: 0,
        title: Text(
          'Emergency Accepted',
          style: AppTextStyles.titleMedium.copyWith(
            color: Colors.white,
            fontWeight: FontWeight.w600,
          ),
        ),
        leading: IconButton(
          icon: const Icon(Icons.close_rounded, color: Colors.white),
          onPressed: _closeAndGoHome,
        ),
        actions: [
          IconButton(
            icon: const Icon(Icons.navigation_rounded, color: Colors.white),
            onPressed: _openNavigation,
            tooltip: 'Navigate',
          ),
        ],
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(20),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Success status banner
            Container(
              width: double.infinity,
              padding: const EdgeInsets.all(20),
              decoration: BoxDecoration(
                color: AppColors.success.withOpacity(0.15),
                borderRadius: BorderRadius.circular(16),
                border: Border.all(
                  color: AppColors.success.withOpacity(0.3),
                  width: 1,
                ),
              ),
              child: Row(
                children: [
                  Container(
                    padding: const EdgeInsets.all(12),
                    decoration: BoxDecoration(
                      color: AppColors.success.withOpacity(0.2),
                      borderRadius: BorderRadius.circular(12),
                    ),
                    child: const Icon(
                      Icons.check_circle_rounded,
                      color: AppColors.success,
                      size: 28,
                    ),
                  ),
                  const SizedBox(width: 16),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          'You are responding',
                          style: AppTextStyles.titleMedium.copyWith(
                            color: AppColors.textPrimary,
                            fontWeight: FontWeight.w700,
                          ),
                        ),
                        const SizedBox(height: 4),
                        Text(
                          'Other officers have been notified',
                          style: AppTextStyles.bodySmall.copyWith(
                            color: AppColors.textSecondary,
                          ),
                        ),
                      ],
                    ),
                  ),
                ],
              ),
            ),
            
            const SizedBox(height: 24),
            
            // Emergency details card
            Container(
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
                  Text(
                    widget.alertData['title'] ?? 'Emergency',
                    style: AppTextStyles.titleLarge.copyWith(
                      color: AppColors.textPrimary,
                      fontWeight: FontWeight.w700,
                    ),
                  ),
                  const SizedBox(height: 16),
                  
                  // Type & Severity badges
                  Row(
                    children: [
                      _buildDetailBadge(
                        icon: Icons.warning_rounded,
                        label: widget.alertData['type'] ?? 'Emergency',
                        color: AppColors.warning,
                      ),
                      const SizedBox(width: 10),
                      _buildDetailBadge(
                        icon: Icons.priority_high_rounded,
                        label: widget.alertData['severity']?.toString().toUpperCase() ?? 'HIGH',
                        color: AppColors.error,
                        filled: true,
                      ),
                    ],
                  ),
                  
                  const SizedBox(height: 20),
                  Divider(color: AppColors.border, height: 1),
                  const SizedBox(height: 20),
                  
                  // Description
                  _buildDetailRow(
                    icon: Icons.description_rounded,
                    label: 'Description',
                    value: widget.alertData['message'] ?? 
                           widget.alertData['description'] ?? 
                           'No description provided',
                  ),
                  
                  const SizedBox(height: 16),
                  
                  // Location
                  _buildDetailRow(
                    icon: Icons.location_on_rounded,
                    label: 'Location',
                    value: address,
                    valueColor: AppColors.error,
                  ),
                  
                  if (widget.alertData['distanceKm'] != null) ...[
                    const SizedBox(height: 8),
                    Text(
                      '${widget.alertData['distanceKm']} km away from your location',
                      style: AppTextStyles.bodySmall.copyWith(
                        color: AppColors.textTertiary,
                      ),
                    ),
                  ],
                  
                  // Contact info
                  if (widget.alertData['contact_phone'] != null || 
                      widget.alertData['reporter_phone'] != null) ...[
                    const SizedBox(height: 16),
                    _buildDetailRow(
                      icon: Icons.phone_rounded,
                      label: 'Reporter Contact',
                      value: widget.alertData['contact_phone'] ?? 
                             widget.alertData['reporter_phone'] ?? '',
                      valueColor: AppColors.success,
                      onTap: () async {
                        final phone = widget.alertData['contact_phone'] ?? 
                                     widget.alertData['reporter_phone'];
                        final url = Uri.parse('tel:$phone');
                        if (await canLaunchUrl(url)) {
                          await launchUrl(url);
                        }
                      },
                    ),
                  ],
                ],
              ),
            ),
            
            const SizedBox(height: 24),
            
            // Status Update Section
            Container(
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
                  Row(
                    children: [
                      Icon(
                        Icons.update_rounded,
                        color: AppColors.textSecondary,
                        size: 22,
                      ),
                      const SizedBox(width: 10),
                      Text(
                        'Update Status',
                        style: AppTextStyles.titleMedium.copyWith(
                          color: AppColors.textPrimary,
                          fontWeight: FontWeight.w600,
                        ),
                      ),
                      const Spacer(),
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                        decoration: BoxDecoration(
                          color: _getStatusColor(_currentStatus).withOpacity(0.15),
                          borderRadius: BorderRadius.circular(20),
                          border: Border.all(
                            color: _getStatusColor(_currentStatus).withOpacity(0.4),
                            width: 1,
                          ),
                        ),
                        child: Text(
                          _getStatusLabel(_currentStatus),
                          style: AppTextStyles.labelSmall.copyWith(
                            color: _getStatusColor(_currentStatus),
                            fontWeight: FontWeight.w700,
                          ),
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 20),
                  
                  // Status buttons - ALL using AppColors.primary
                  if (_currentStatus == 'dispatched')
                    _buildStatusButton(
                      'en_route',
                      'EN ROUTE',
                      Icons.directions_car_rounded,
                      'I am on my way to the location',
                    ),
                  
                  if (_currentStatus == 'dispatched' || _currentStatus == 'en_route')
                    _buildStatusButton(
                      'on_scene',
                      'ARRIVED ON SCENE',
                      Icons.location_on_rounded,
                      'I have arrived at the emergency location',
                    ),
                  
                  if (_currentStatus != 'resolved')
                    _buildStatusButton(
                      'resolved',
                      'MARK AS RESOLVED',
                      Icons.check_circle_rounded,
                      'The emergency has been handled',
                      isSuccess: true,
                    ),
                ],
              ),
            ),
            
            const SizedBox(height: 24),
            
            // Navigate button - using AppColors.primary
            SizedBox(
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
            ),
            
            const SizedBox(height: 12),
            
            // Call reporter button
            if (widget.alertData['contact_phone'] != null || 
                widget.alertData['reporter_phone'] != null)
              SizedBox(
                width: double.infinity,
                height: 52,
                child: OutlinedButton.icon(
                  onPressed: () async {
                    final phone = widget.alertData['contact_phone'] ?? 
                                 widget.alertData['reporter_phone'];
                    final url = Uri.parse('tel:$phone');
                    if (await canLaunchUrl(url)) {
                      await launchUrl(url);
                    }
                  },
                  icon: const Icon(Icons.phone_rounded, size: 22),
                  label: Text(
                    'Call Reporter',
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
              ),
            
            const SizedBox(height: 24),
            
            // Close button
            Center(
              child: TextButton(
                onPressed: _closeAndGoHome,
                child: Text(
                  'Close & Return to Home',
                  style: AppTextStyles.bodySmall.copyWith(
                    color: AppColors.textTertiary,
                  ),
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildDetailBadge({
    required IconData icon,
    required String label,
    required Color color,
    bool filled = false,
  }) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
      decoration: BoxDecoration(
        color: filled ? color : color.withOpacity(0.15),
        borderRadius: BorderRadius.circular(20),
        border: filled ? null : Border.all(color: color.withOpacity(0.4)),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(icon, color: filled ? Colors.white : color, size: 16),
          const SizedBox(width: 6),
          Text(
            label,
            style: AppTextStyles.labelSmall.copyWith(
              color: filled ? Colors.white : color,
              fontWeight: FontWeight.w700,
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildDetailRow({
    required IconData icon,
    required String label,
    required String value,
    Color? valueColor,
    VoidCallback? onTap,
  }) {
    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(8),
      child: Row(
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
                    color: valueColor ?? AppColors.textPrimary,
                    decoration: onTap != null ? TextDecoration.underline : null,
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildStatusButton(
    String status,
    String label,
    IconData icon,
    String description, {
    bool isSuccess = false,
  }) {
    final isCurrentStatus = _currentStatus == status;
    final buttonColor = isSuccess ? AppColors.success : AppColors.primary;
    
    return Padding(
      padding: const EdgeInsets.only(bottom: 12),
      child: SizedBox(
        width: double.infinity,
        child: ElevatedButton(
          onPressed: isCurrentStatus || _isUpdatingStatus
              ? null
              : () => _updateEmergencyStatus(status),
          style: ElevatedButton.styleFrom(
            backgroundColor: isCurrentStatus ? buttonColor : buttonColor.withOpacity(0.15),
            foregroundColor: isCurrentStatus ? Colors.white : buttonColor,
            disabledBackgroundColor: isCurrentStatus ? buttonColor : AppColors.backgroundSecondary,
            disabledForegroundColor: isCurrentStatus ? Colors.white : AppColors.textTertiary,
            elevation: 0,
            padding: const EdgeInsets.all(16),
            shape: RoundedRectangleBorder(
              borderRadius: BorderRadius.circular(14),
              side: BorderSide(
                color: isCurrentStatus ? buttonColor : buttonColor.withOpacity(0.3),
                width: 1.5,
              ),
            ),
          ),
          child: _isUpdatingStatus && !isCurrentStatus
              ? SizedBox(
                  height: 24,
                  width: 24,
                  child: CircularProgressIndicator(
                    color: buttonColor,
                    strokeWidth: 2.5,
                  ),
                )
              : Row(
                  children: [
                    Icon(icon, size: 26),
                    const SizedBox(width: 14),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            label,
                            style: AppTextStyles.labelLarge.copyWith(
                              fontWeight: FontWeight.w700,
                            ),
                          ),
                          const SizedBox(height: 2),
                          Text(
                            description,
                            style: AppTextStyles.bodySmall.copyWith(
                              color: isCurrentStatus 
                                  ? Colors.white.withOpacity(0.8) 
                                  : AppColors.textSecondary,
                            ),
                          ),
                        ],
                      ),
                    ),
                    if (isCurrentStatus)
                      const Icon(Icons.check_rounded, size: 24),
                  ],
                ),
        ),
      ),
    );
  }

  Widget _buildInfoChip({
    required IconData icon,
    required String label,
    required Color color,
  }) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
      decoration: BoxDecoration(
        color: color.withOpacity(0.15),
        borderRadius: BorderRadius.circular(20),
        border: Border.all(color: color.withOpacity(0.4)),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(icon, color: color, size: 16),
          const SizedBox(width: 6),
          Text(
            label,
            style: AppTextStyles.labelSmall.copyWith(
              color: color,
              fontWeight: FontWeight.w700,
            ),
          ),
        ],
      ),
    );
  }
}

/// Show the emergency alert as a full-screen overlay
Future<Map<String, dynamic>?> showEmergencyAlert(
  BuildContext context,
  Map<String, dynamic> alertData,
) async {
  return await Navigator.of(context).push<Map<String, dynamic>>(
    PageRouteBuilder(
      opaque: true,
      barrierDismissible: false,
      pageBuilder: (context, animation, secondaryAnimation) {
        return EmergencyAlertScreen(alertData: alertData);
      },
      transitionsBuilder: (context, animation, secondaryAnimation, child) {
        return FadeTransition(
          opacity: animation,
          child: child,
        );
      },
    ),
  );
}
