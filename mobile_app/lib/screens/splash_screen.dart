import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import '../config/app_theme.dart';
import '../services/auth_service.dart';
import '../services/location_tracking_service.dart';

/// ============================================================================
/// Splash Screen - TrafficGuard Mobile App
/// ============================================================================
/// A professional, modern splash screen featuring:
/// - Rwanda National Police branding
/// - Smooth animations and transitions
/// - Clean white background with elegant loading indicator
/// - Proper Flutter UI design standards
/// ============================================================================

class SplashScreen extends StatefulWidget {
  const SplashScreen({super.key});

  @override
  State<SplashScreen> createState() => _SplashScreenState();
}

class _SplashScreenState extends State<SplashScreen>
    with TickerProviderStateMixin {
  final AuthService _authService = AuthService();

  // Animation Controllers
  late AnimationController _logoAnimationController;
  late AnimationController _fadeAnimationController;
  late AnimationController _pulseAnimationController;

  // Animations
  late Animation<double> _logoScaleAnimation;
  late Animation<double> _logoOpacityAnimation;
  late Animation<double> _textFadeAnimation;
  late Animation<double> _pulseAnimation;
  late Animation<Offset> _slideAnimation;

  @override
  void initState() {
    super.initState();
    _initializeAnimations();
    _startAnimations();
    _checkAuthentication();
  }

  void _initializeAnimations() {
    // 🚀 OPTIMIZED: Faster animations for quicker perceived startup
    // Logo animation controller (scale + opacity)
    _logoAnimationController = AnimationController(
      duration: const Duration(milliseconds: 600), // Was 1200ms
      vsync: this,
    );

    // Fade animation controller for text elements
    _fadeAnimationController = AnimationController(
      duration: const Duration(milliseconds: 400), // Was 800ms
      vsync: this,
    );

    // Pulse animation for loading indicator
    _pulseAnimationController = AnimationController(
      duration: const Duration(milliseconds: 1000), // Was 1500ms
      vsync: this,
    )..repeat(reverse: true);

    // Logo scale animation with elastic curve
    _logoScaleAnimation = Tween<double>(begin: 0.5, end: 1.0).animate(
      CurvedAnimation(
        parent: _logoAnimationController,
        curve: Curves.elasticOut,
      ),
    );

    // Logo opacity animation
    _logoOpacityAnimation = Tween<double>(begin: 0.0, end: 1.0).animate(
      CurvedAnimation(
        parent: _logoAnimationController,
        curve: const Interval(0.0, 0.5, curve: Curves.easeIn),
      ),
    );

    // Text fade animation
    _textFadeAnimation = Tween<double>(begin: 0.0, end: 1.0).animate(
      CurvedAnimation(
        parent: _fadeAnimationController,
        curve: Curves.easeInOut,
      ),
    );

    // Pulse animation for loading
    _pulseAnimation = Tween<double>(begin: 0.8, end: 1.0).animate(
      CurvedAnimation(
        parent: _pulseAnimationController,
        curve: Curves.easeInOut,
      ),
    );

    // Slide animation for text
    _slideAnimation = Tween<Offset>(
      begin: const Offset(0, 0.3),
      end: Offset.zero,
    ).animate(
      CurvedAnimation(
        parent: _fadeAnimationController,
        curve: Curves.easeOutCubic,
      ),
    );
  }

  void _startAnimations() async {
    // Start logo animation immediately
    _logoAnimationController.forward();

    // 🚀 OPTIMIZED: Start text fade sooner (was 600ms)
    await Future.delayed(const Duration(milliseconds: 300));
    if (mounted) {
      _fadeAnimationController.forward();
    }
  }

  @override
  void dispose() {
    _logoAnimationController.dispose();
    _fadeAnimationController.dispose();
    _pulseAnimationController.dispose();
    super.dispose();
  }

  Future<void> _checkAuthentication() async {
    // 🚀 OPTIMIZED: Reduced delay from 3s to 1.5s (just enough for branding)
    await Future.delayed(const Duration(milliseconds: 1500));

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
  /// 🚀 OPTIMIZED: Non-blocking - runs in background after navigation
  void _startLocationTrackingIfPolice() {
    // Fire and forget - don't await, let it run in background
    Future(() async {
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
            debugPrint('Location tracking auto-started for police officer');
          }
        }
      } catch (e) {
        debugPrint('Auto location tracking error: $e');
      }
    });
  }

  @override
  Widget build(BuildContext context) {
    // Set status bar style for light background
    SystemChrome.setSystemUIOverlayStyle(const SystemUiOverlayStyle(
      statusBarColor: Colors.transparent,
      statusBarIconBrightness: Brightness.dark,
      statusBarBrightness: Brightness.light,
    ));

    return Scaffold(
      backgroundColor: Colors.white,
      body: Container(
        width: double.infinity,
        height: double.infinity,
        decoration: const BoxDecoration(
          // Subtle gradient for depth
          gradient: LinearGradient(
            begin: Alignment.topCenter,
            end: Alignment.bottomCenter,
            colors: [
              Colors.white,
              Color(0xFFF8FAFC), // Very light gray at bottom
            ],
          ),
        ),
        child: SafeArea(
          child: Column(
            children: [
              // Top spacer
              const Spacer(flex: 2),

              // Main content - Logo and text
              _buildMainContent(),

              // Bottom spacer
              const Spacer(flex: 1),

              // Loading indicator
              _buildLoadingIndicator(),

              // Bottom padding
              const SizedBox(height: 60),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildMainContent() {
    return Column(
      mainAxisSize: MainAxisSize.min,
      children: [
        // Rwanda National Police Logo
        _buildAnimatedLogo(),

        const SizedBox(height: 32),

        // App Title and Subtitle
        _buildAnimatedText(),
      ],
    );
  }

  Widget _buildAnimatedLogo() {
    return AnimatedBuilder(
      animation: _logoAnimationController,
      builder: (context, child) {
        return Opacity(
          opacity: _logoOpacityAnimation.value,
          child: Transform.scale(
            scale: _logoScaleAnimation.value,
            child: child,
          ),
        );
      },
      child: Container(
        width: 160,
        height: 160,
        decoration: BoxDecoration(
          shape: BoxShape.circle,
          color: Colors.white,
          boxShadow: [
            BoxShadow(
              color: AppColors.primary.withValues(alpha: 0.15),
              blurRadius: 30,
              spreadRadius: 5,
              offset: const Offset(0, 10),
            ),
            BoxShadow(
              color: Colors.black.withValues(alpha: 0.05),
              blurRadius: 20,
              spreadRadius: 2,
              offset: const Offset(0, 5),
            ),
          ],
        ),
        padding: const EdgeInsets.all(8),
        child: ClipOval(
          child: Image.asset(
            'assets/images/rnp-logo.png',
            fit: BoxFit.contain,
            errorBuilder: (context, error, stackTrace) {
              // Fallback to icon if image fails to load
              return Container(
                decoration: BoxDecoration(
                  color: AppColors.primary.withValues(alpha: 0.1),
                  shape: BoxShape.circle,
                ),
                child: const Icon(
                  Icons.local_police_outlined,
                  size: 80,
                  color: AppColors.primary,
                ),
              );
            },
          ),
        ),
      ),
    );
  }

  Widget _buildAnimatedText() {
    return SlideTransition(
      position: _slideAnimation,
      child: FadeTransition(
        opacity: _textFadeAnimation,
        child: Column(
          children: [
            // App Name
            Text(
              'TrafficGuard',
              style: AppTextStyles.displayLarge.copyWith(
                color: AppColors.primary,
                fontWeight: FontWeight.w800,
                letterSpacing: -1,
              ),
            ),

            const SizedBox(height: 8),

            // Tagline
            Text(
              'Smart Traffic Management',
              style: AppTextStyles.bodyLarge.copyWith(
                color: AppColors.textTertiary,
                fontWeight: FontWeight.w500,
                letterSpacing: 0.5,
              ),
            ),

            const SizedBox(height: 24),

            // Rwanda National Police branding
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
              decoration: BoxDecoration(
                color: AppColors.primary.withValues(alpha: 0.08),
                borderRadius: BorderRadius.circular(20),
                border: Border.all(
                  color: AppColors.primary.withValues(alpha: 0.15),
                  width: 1,
                ),
              ),
              child: Row(
                mainAxisSize: MainAxisSize.min,
                children: [
                  Icon(
                    Icons.shield_outlined,
                    size: 16,
                    color: AppColors.primary.withValues(alpha: 0.8),
                  ),
                  const SizedBox(width: 8),
                  Text(
                    'Rwanda National Police',
                    style: AppTextStyles.labelMedium.copyWith(
                      color: AppColors.primary,
                      fontWeight: FontWeight.w600,
                      letterSpacing: 0.5,
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

  Widget _buildLoadingIndicator() {
    return FadeTransition(
      opacity: _textFadeAnimation,
      child: Column(
        children: [
          // Animated loading bar
          AnimatedBuilder(
            animation: _pulseAnimationController,
            builder: (context, child) {
              return Transform.scale(
                scale: _pulseAnimation.value,
                child: child,
              );
            },
            child: Container(
              width: 48,
              height: 4,
              decoration: BoxDecoration(
                borderRadius: BorderRadius.circular(2),
                color: AppColors.primary.withValues(alpha: 0.2),
              ),
              child: ClipRRect(
                borderRadius: BorderRadius.circular(2),
                child: LinearProgressIndicator(
                  backgroundColor: Colors.transparent,
                  valueColor: AlwaysStoppedAnimation<Color>(
                    AppColors.primary.withValues(alpha: 0.6),
                  ),
                ),
              ),
            ),
          ),

          const SizedBox(height: 16),

          // Loading text
          Text(
            'Initializing...',
            style: AppTextStyles.bodySmall.copyWith(
              color: AppColors.textTertiary,
              letterSpacing: 1,
            ),
          ),
        ],
      ),
    );
  }
}
