import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'dart:async';
import '../services/emergency_alert_service.dart';

/// Full-Screen Emergency Alert Screen
/// Displays when a critical EMERGENCY alert is received
/// Features:
/// - Full-screen red overlay (bypasses normal UI)
/// - Flashing warning effect
/// - Large alert details
/// - Acknowledge/Accept buttons
/// - Distance to incident
/// - GPS navigation option
class EmergencyAlertScreen extends StatefulWidget {
  final Map<String, dynamic> alertData;

  const EmergencyAlertScreen({
    Key? key,
    required this.alertData,
  }) : super(key: key);

  @override
  State<EmergencyAlertScreen> createState() => _EmergencyAlertScreenState();
}

class _EmergencyAlertScreenState extends State<EmergencyAlertScreen>
    with TickerProviderStateMixin {
  
  late AnimationController _pulseController;
  late AnimationController _flashController;
  late Animation<double> _pulseAnimation;
  late Animation<Color?> _flashAnimation;
  
  final EmergencyAlertService _alertService = EmergencyAlertService();
  Timer? _autoTimeoutTimer;
  int _secondsRemaining = 60;

  @override
  void initState() {
    super.initState();
    
    // Set system UI to immersive mode
    SystemChrome.setEnabledSystemUIMode(SystemUiMode.immersiveSticky);
    
    // Keep screen on
    // Wakelock.enable(); // Uncomment if using wakelock package
    
    // Pulse animation for icon
    _pulseController = AnimationController(
      duration: const Duration(milliseconds: 500),
      vsync: this,
    )..repeat(reverse: true);
    
    _pulseAnimation = Tween<double>(begin: 1.0, end: 1.3).animate(
      CurvedAnimation(parent: _pulseController, curve: Curves.easeInOut),
    );
    
    // Flash animation for background
    _flashController = AnimationController(
      duration: const Duration(milliseconds: 800),
      vsync: this,
    )..repeat(reverse: true);
    
    _flashAnimation = ColorTween(
      begin: const Color(0xFFB71C1C), // Dark red
      end: const Color(0xFFFF1744),    // Bright red
    ).animate(_flashController);
    
    // Auto-timeout countdown
    _startTimeout();
  }

  void _startTimeout() {
    _autoTimeoutTimer = Timer.periodic(const Duration(seconds: 1), (timer) {
      setState(() {
        _secondsRemaining--;
      });
      
      if (_secondsRemaining <= 0) {
        timer.cancel();
        // Auto-decline after timeout
        _handleDecline();
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
    final alertId = widget.alertData['alertId'];
    if (alertId != null) {
      await _alertService.acknowledgeAlert(alertId, action: 'accepted');
    }
    await _alertService.stopEmergencyAlarm();
    
    if (mounted) {
      Navigator.of(context).pop({'action': 'accepted', 'alertId': alertId});
    }
  }

  Future<void> _handleDecline() async {
    final alertId = widget.alertData['alertId'];
    if (alertId != null) {
      await _alertService.acknowledgeAlert(alertId, action: 'declined');
    }
    await _alertService.stopEmergencyAlarm();
    
    if (mounted) {
      Navigator.of(context).pop({'action': 'declined', 'alertId': alertId});
    }
  }

  void _openNavigation() {
    final location = widget.alertData['location'];
    if (location != null) {
      final lat = location['latitude'];
      final lng = location['longitude'];
      // Open Google Maps or default map app
      // launchUrl(Uri.parse('geo:$lat,$lng?q=$lat,$lng'));
    }
  }

  @override
  Widget build(BuildContext context) {
    return WillPopScope(
      onWillPop: () async => false, // Prevent back button
      child: AnimatedBuilder(
        animation: _flashAnimation,
        builder: (context, child) {
          return Scaffold(
            backgroundColor: _flashAnimation.value,
            body: SafeArea(
              child: Padding(
                padding: const EdgeInsets.all(20),
                child: Column(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    // Top: Timer and dismiss
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        Container(
                          padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
                          decoration: BoxDecoration(
                            color: Colors.black26,
                            borderRadius: BorderRadius.circular(20),
                          ),
                          child: Text(
                            'Response in: ${_secondsRemaining}s',
                            style: const TextStyle(
                              color: Colors.white,
                              fontWeight: FontWeight.bold,
                            ),
                          ),
                        ),
                        IconButton(
                          icon: const Icon(Icons.volume_off, color: Colors.white, size: 30),
                          onPressed: () => _alertService.stopEmergencyAlarm(),
                        ),
                      ],
                    ),
                    
                    // Center: Alert content
                    Expanded(
                      child: Column(
                        mainAxisAlignment: MainAxisAlignment.center,
                        children: [
                          // Pulsing emergency icon
                          ScaleTransition(
                            scale: _pulseAnimation,
                            child: Container(
                              padding: const EdgeInsets.all(30),
                              decoration: BoxDecoration(
                                color: Colors.white.withOpacity(0.2),
                                shape: BoxShape.circle,
                              ),
                              child: const Icon(
                                Icons.warning_amber_rounded,
                                size: 100,
                                color: Colors.white,
                              ),
                            ),
                          ),
                          
                          const SizedBox(height: 30),
                          
                          // EMERGENCY text
                          const Text(
                            '🚨 EMERGENCY 🚨',
                            style: TextStyle(
                              fontSize: 32,
                              fontWeight: FontWeight.bold,
                              color: Colors.white,
                              letterSpacing: 3,
                            ),
                          ),
                          
                          const SizedBox(height: 20),
                          
                          // Alert title
                          Text(
                            widget.alertData['title'] ?? 'Critical Alert',
                            textAlign: TextAlign.center,
                            style: const TextStyle(
                              fontSize: 24,
                              fontWeight: FontWeight.bold,
                              color: Colors.white,
                            ),
                          ),
                          
                          const SizedBox(height: 15),
                          
                          // Alert message
                          Container(
                            padding: const EdgeInsets.all(15),
                            decoration: BoxDecoration(
                              color: Colors.black26,
                              borderRadius: BorderRadius.circular(15),
                            ),
                            child: Text(
                              widget.alertData['message'] ?? 'Immediate response required',
                              textAlign: TextAlign.center,
                              style: const TextStyle(
                                fontSize: 18,
                                color: Colors.white,
                              ),
                            ),
                          ),
                          
                          const SizedBox(height: 20),
                          
                          // Location info
                          if (widget.alertData['location'] != null) ...[
                            Container(
                              padding: const EdgeInsets.symmetric(
                                horizontal: 20, vertical: 12,
                              ),
                              decoration: BoxDecoration(
                                color: Colors.black38,
                                borderRadius: BorderRadius.circular(10),
                              ),
                              child: Row(
                                mainAxisSize: MainAxisSize.min,
                                children: [
                                  const Icon(Icons.location_on, color: Colors.white),
                                  const SizedBox(width: 10),
                                  Flexible(
                                    child: Text(
                                      widget.alertData['location']['address'] ?? 
                                      widget.alertData['location']['district'] ?? 
                                      'Location shared',
                                      style: const TextStyle(
                                        color: Colors.white,
                                        fontSize: 16,
                                      ),
                                    ),
                                  ),
                                ],
                              ),
                            ),
                            
                            const SizedBox(height: 10),
                            
                            // Distance
                            if (widget.alertData['distanceKm'] != null)
                              Text(
                                '📍 ${widget.alertData['distanceKm']} km away',
                                style: const TextStyle(
                                  color: Colors.white70,
                                  fontSize: 16,
                                ),
                              ),
                          ],
                          
                          // AI detection info
                          if (widget.alertData['ai']?['confidence'] != null) ...[
                            const SizedBox(height: 15),
                            Container(
                              padding: const EdgeInsets.symmetric(
                                horizontal: 15, vertical: 8,
                              ),
                              decoration: BoxDecoration(
                                color: Colors.orange.withOpacity(0.3),
                                borderRadius: BorderRadius.circular(20),
                                border: Border.all(color: Colors.orange, width: 2),
                              ),
                              child: Row(
                                mainAxisSize: MainAxisSize.min,
                                children: [
                                  const Icon(Icons.smart_toy, color: Colors.white),
                                  const SizedBox(width: 8),
                                  Text(
                                    'AI: ${((widget.alertData['ai']['confidence'] ?? 0) * 100).toInt()}% - ${widget.alertData['ai']['detectedObject'] ?? 'Incident'}',
                                    style: const TextStyle(
                                      color: Colors.white,
                                      fontWeight: FontWeight.bold,
                                    ),
                                  ),
                                ],
                              ),
                            ),
                          ],
                        ],
                      ),
                    ),
                    
                    // Bottom: Action buttons
                    Column(
                      children: [
                        // Accept button (primary)
                        SizedBox(
                          width: double.infinity,
                          height: 60,
                          child: ElevatedButton(
                            onPressed: _handleAccept,
                            style: ElevatedButton.styleFrom(
                              backgroundColor: Colors.green,
                              foregroundColor: Colors.white,
                              shape: RoundedRectangleBorder(
                                borderRadius: BorderRadius.circular(30),
                              ),
                            ),
                            child: const Row(
                              mainAxisAlignment: MainAxisAlignment.center,
                              children: [
                                Icon(Icons.check_circle, size: 30),
                                SizedBox(width: 10),
                                Text(
                                  'ACCEPT & RESPOND',
                                  style: TextStyle(
                                    fontSize: 20,
                                    fontWeight: FontWeight.bold,
                                  ),
                                ),
                              ],
                            ),
                          ),
                        ),
                        
                        const SizedBox(height: 15),
                        
                        // Navigate button
                        SizedBox(
                          width: double.infinity,
                          height: 50,
                          child: OutlinedButton(
                            onPressed: _openNavigation,
                            style: OutlinedButton.styleFrom(
                              foregroundColor: Colors.white,
                              side: const BorderSide(color: Colors.white, width: 2),
                              shape: RoundedRectangleBorder(
                                borderRadius: BorderRadius.circular(25),
                              ),
                            ),
                            child: const Row(
                              mainAxisAlignment: MainAxisAlignment.center,
                              children: [
                                Icon(Icons.navigation),
                                SizedBox(width: 8),
                                Text(
                                  'NAVIGATE TO LOCATION',
                                  style: TextStyle(fontSize: 16),
                                ),
                              ],
                            ),
                          ),
                        ),
                        
                        const SizedBox(height: 15),
                        
                        // Decline button
                        TextButton(
                          onPressed: _handleDecline,
                          child: const Text(
                            'Decline / Forward to Another Officer',
                            style: TextStyle(
                              color: Colors.white70,
                              fontSize: 14,
                            ),
                          ),
                        ),
                      ],
                    ),
                  ],
                ),
              ),
            ),
          );
        },
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
