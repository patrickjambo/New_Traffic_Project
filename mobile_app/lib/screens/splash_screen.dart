import 'package:flutter/material.dart';
import '../services/auth_service.dart';
import '../services/location_tracking_service.dart';

class SplashScreen extends StatefulWidget {
  const SplashScreen({super.key});

  @override
  State<SplashScreen> createState() => _SplashScreenState();
}

class _SplashScreenState extends State<SplashScreen> {
  final AuthService _authService = AuthService();

  @override
  void initState() {
    super.initState();
    _checkAuthentication();
  }

  Future<void> _checkAuthentication() async {
    // Wait for splash animation
    await Future.delayed(const Duration(seconds: 2));

    // Check if user is authenticated
    final isAuthenticated = await _authService.isAuthenticated();

    if (!mounted) return;

    if (isAuthenticated) {
      // Start location tracking for police officers on auto-login
      _startLocationTrackingIfPolice();
      Navigator.of(context).pushReplacementNamed('/home');
    } else {
      Navigator.of(context).pushReplacementNamed('/login');
    }
  }

  /// Start location tracking if user is a police officer
  Future<void> _startLocationTrackingIfPolice() async {
    try {
      final userData = await _authService.getUserData();
      if (userData != null && userData['role'] == 'police') {
        final locationService = LocationTrackingService();
        final initialized = await locationService.initialize();
        if (initialized) {
          await locationService.startTracking(
            streamIntervalSeconds: 30,
            highAccuracy: true,
            streamToServer: true,
          );
          print('📍 Location tracking auto-started for police officer');
        }
      }
    } catch (e) {
      print('⚠️ Auto location tracking error: $e');
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Theme.of(context).colorScheme.primary,
      body: Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(
              Icons.traffic,
              size: 100,
              color: Colors.white,
            ),
            const SizedBox(height: 24),
            const Text(
              'TrafficGuard AI',
              style: TextStyle(
                fontSize: 32,
                fontWeight: FontWeight.bold,
                color: Colors.white,
              ),
            ),
            const SizedBox(height: 8),
            const Text(
              'Smart Traffic Management',
              style: TextStyle(
                fontSize: 16,
                color: Colors.white70,
              ),
            ),
            const SizedBox(height: 48),
            const CircularProgressIndicator(
              valueColor: AlwaysStoppedAnimation<Color>(Colors.white),
            ),
          ],
        ),
      ),
    );
  }
}
