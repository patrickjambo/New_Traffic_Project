import 'package:flutter/material.dart';
import 'package:flutter/foundation.dart';
import 'package:flutter/services.dart';
import 'package:firebase_core/firebase_core.dart';
import 'package:firebase_messaging/firebase_messaging.dart';
import 'screens/splash_screen.dart';
import 'screens/login_screen.dart';
import 'screens/register_screen.dart';
import 'screens/home_screen.dart';
import 'screens/map_screen.dart';
import 'screens/report_screen.dart';
import 'screens/profile_screen.dart';
import 'screens/auto_capture_screen.dart';
import 'screens/high_performance_capture_screen.dart';
import 'screens/report_history_screen.dart';
import 'screens/notifications_screen.dart';
import 'screens/settings_screen.dart';
import 'screens/help_support_screen.dart';
import 'screens/about_screen.dart';
import 'screens/emergency_report_screen.dart';
import 'screens/auto_monitor_screen.dart';
import 'screens/emergency_alert_screen.dart';
import 'screens/deployments_screen.dart';
import 'screens/ai_video_capture_screen.dart';
import 'services/websocket_service.dart';
import 'services/notification_service.dart';
import 'services/api_service.dart';
import 'services/emergency_alert_service.dart';
import 'services/critical_alert_service.dart';
import 'services/deployment_alert_service.dart';
import 'services/fcm_service.dart';
import 'providers/app_state_provider.dart';
import 'utils/error_handler.dart';
import 'config/server_config.dart';

// Global navigator key for showing alerts from anywhere
final GlobalKey<NavigatorState> navigatorKey = GlobalKey<NavigatorState>();

// Global app state manager - singleton for instant theme switching
final appState = AppStateManager();

void main() async {
  WidgetsFlutterBinding.ensureInitialized();
  
  // 🔥 CRITICAL: Initialize Firebase FIRST (required for background messages)
  try {
    await Firebase.initializeApp();
    print('✅ Firebase initialized');
    
    // 🚨 Register background message handler for when app is closed
    // This enables emergency alerts even when app is not running
    FirebaseMessaging.onBackgroundMessage(firebaseMessagingBackgroundHandler);
    print('✅ Background message handler registered');
  } catch (e) {
    print('❌ Firebase initialization failed: $e');
  }
  
  // Set up global error handling
  FlutterError.onError = (FlutterErrorDetails details) {
    FlutterError.presentError(details);
    ErrorHandler.handleError(details.exception, details.stack, context: details.context.toString());
  };
  
  PlatformDispatcher.instance.onError = (error, stack) {
    ErrorHandler.handleError(error, stack);
    return true;
  };
  
  // 🚀 OPTIMIZED: Initialize critical services in parallel (non-blocking)
  // Only await ServerConfig as it's needed for API calls
  try {
    await ServerConfig.init();
    print('✅ ServerConfig initialized: ${ServerConfig.baseApiUrl}');
  } catch (e) {
    print('Failed to initialize ServerConfig: $e');
  }
  
  // Initialize API service (sync, no await needed)
  try {
    final apiService = ApiService();
    apiService.initialize();
  } catch (e) {
    print('Failed to initialize API Service: $e');
  }
  
  // 🚀 OPTIMIZED: Initialize app state early (needed for theme)
  await appState.initialize();
  
  // Set system UI overlay style
  SystemChrome.setSystemUIOverlayStyle(
    appState.theme.isDarkMode
        ? SystemUiOverlayStyle.light.copyWith(
            statusBarColor: Colors.transparent,
            systemNavigationBarColor: const Color(0xFF1E1E1E),
          )
        : SystemUiOverlayStyle.dark.copyWith(
            statusBarColor: Colors.transparent,
            systemNavigationBarColor: Colors.white,
          ),
  );
  
  // 🚀 OPTIMIZED: Launch app immediately, defer heavy services
  runApp(const TrafficGuardApp());
  
  // 🚀 DEFERRED: Initialize non-critical services AFTER app is running
  _initializeDeferredServices();
}

/// Initialize non-critical services after the app UI is shown
/// 🚀 OPTIMIZED: Parallel initialization for faster startup
void _initializeDeferredServices() async {
  // Small delay to let the first frame render
  await Future.delayed(const Duration(milliseconds: 100));
  
  // 🚀 PRIORITY 1: Initialize Critical Alert Service FIRST (needed for emergencies)
  // This MUST be ready before WebSocket connects to avoid delayed red screen
  try {
    final criticalAlertService = CriticalAlertService();
    await criticalAlertService.initialize();
    
    // Set callback for non-WebSocket triggers (e.g., FCM notification tap)
    criticalAlertService.onCriticalEmergency = (data) {
      print('🚨🚨🚨 CRITICAL EMERGENCY CALLBACK: $data');
      if (navigatorKey.currentState != null) {
        navigatorKey.currentState!.pushNamed('/emergency-alert', arguments: data);
      }
    };
    
    print('✅ Critical Alert Service initialized');
  } catch (e) {
    print('Failed to initialize Critical Alert Service: $e');
  }
  
  // 🚀 PRIORITY 2: Connect WebSocket EARLY (receives emergency events)
  try {
    final websocketService = WebSocketService();
    websocketService.connect();
    print('✅ WebSocket Service connecting');
  } catch (e) {
    print('Failed to initialize WebSocket Service: $e');
  }
  
  // 🚀 PRIORITY 3: Initialize remaining services IN PARALLEL (non-blocking)
  await Future.wait([
    // Notification service
    Future(() async {
      try {
        final notificationService = NotificationService();
        await notificationService.initialize();
        print('✅ Notification Service initialized');
      } catch (e) {
        print('Failed to initialize Notification Service: $e');
      }
    }),
    // Emergency Alert Service
    Future(() async {
      try {
        final emergencyAlertService = EmergencyAlertService();
        await emergencyAlertService.initialize();
        
        // Set callback for non-WebSocket triggers (e.g., FCM notification tap)
        emergencyAlertService.onEmergencyAlarm = (data) {
          print('🚨 EMERGENCY ALARM CALLBACK TRIGGERED: $data');
          if (navigatorKey.currentState != null) {
            navigatorKey.currentState!.pushNamed('/emergency-alert', arguments: data);
          }
        };
        
        print('✅ Emergency Alert Service initialized');
      } catch (e) {
        print('Failed to initialize Emergency Alert Service: $e');
      }
    }),
    // Deployment Alert Service
    Future(() async {
      try {
        final deploymentAlertService = DeploymentAlertService();
        await deploymentAlertService.initialize();
        
        // Set callback to navigate to deployments screen when notification tapped
        deploymentAlertService.onDeploymentReceived = (data) {
          print('📋 DEPLOYMENT NOTIFICATION TAPPED: $data');
          if (navigatorKey.currentState != null) {
            // Navigate to deployments screen with tab index (0 = Pending)
            navigatorKey.currentState!.pushNamed('/deployments', arguments: {'initialTab': 0});
          }
        };
        
        print('✅ Deployment Alert Service initialized');
      } catch (e) {
        print('Failed to initialize Deployment Alert Service: $e');
      }
    }),
  ]);
}

class TrafficGuardApp extends StatefulWidget {
  const TrafficGuardApp({super.key});

  @override
  State<TrafficGuardApp> createState() => _TrafficGuardAppState();
}

class _TrafficGuardAppState extends State<TrafficGuardApp> {
  
  @override
  void initState() {
    super.initState();
    // Listen to theme changes for instant UI updates
    appState.theme.addListener(_onThemeChanged);
  }
  
  @override
  void dispose() {
    appState.theme.removeListener(_onThemeChanged);
    super.dispose();
  }
  
  void _onThemeChanged() {
    // Force rebuild when theme changes - this is instant!
    setState(() {});
    
    // Update system UI to match theme
    SystemChrome.setSystemUIOverlayStyle(
      appState.theme.isDarkMode
          ? SystemUiOverlayStyle.light.copyWith(
              statusBarColor: Colors.transparent,
              systemNavigationBarColor: const Color(0xFF1E1E1E),
            )
          : SystemUiOverlayStyle.dark.copyWith(
              statusBarColor: Colors.transparent,
              systemNavigationBarColor: Colors.white,
            ),
    );
  }

  @override
  Widget build(BuildContext context) {
    // Use AnimatedTheme for smooth transitions
    return MaterialApp(
      navigatorKey: navigatorKey,
      title: 'TrafficGuard AI',
      debugShowCheckedModeBanner: false,
      theme: ThemeData(
        primarySwatch: Colors.blue,
        useMaterial3: true,
        colorScheme: ColorScheme.fromSeed(
          seedColor: const Color(0xFF2563EB),
          brightness: Brightness.light,
        ),
        appBarTheme: const AppBarTheme(
          elevation: 0,
          centerTitle: true,
        ),
        cardTheme: CardThemeData(
          elevation: 2,
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(12),
          ),
        ),
        inputDecorationTheme: InputDecorationTheme(
          border: OutlineInputBorder(
            borderRadius: BorderRadius.circular(8),
          ),
          filled: true,
        ),
      ),
      darkTheme: ThemeData(
        primarySwatch: Colors.blue,
        useMaterial3: true,
        colorScheme: ColorScheme.fromSeed(
          seedColor: const Color(0xFF2563EB),
          brightness: Brightness.dark,
        ),
        appBarTheme: const AppBarTheme(
          elevation: 0,
          centerTitle: true,
        ),
        cardTheme: CardThemeData(
          elevation: 2,
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(12),
          ),
        ),
        inputDecorationTheme: InputDecorationTheme(
          border: OutlineInputBorder(
            borderRadius: BorderRadius.circular(8),
          ),
          filled: true,
        ),
      ),
      themeMode: appState.theme.isDarkMode ? ThemeMode.dark : ThemeMode.light,
      // Wrap home with alert overlay for real-time notifications
      builder: (context, child) {
        return Stack(
          children: [
            child!,
            // Connection status banner
            ListenableBuilder(
              listenable: appState.connection,
              builder: (context, _) {
                if (appState.connection.isOnline) {
                  return const SizedBox.shrink();
                }
                return Positioned(
                  top: MediaQuery.of(context).padding.top,
                  left: 0,
                  right: 0,
                  child: Material(
                    color: Colors.orange,
                    child: Padding(
                      padding: const EdgeInsets.symmetric(vertical: 6, horizontal: 16),
                      child: Row(
                        children: [
                          const Icon(Icons.wifi_off, color: Colors.white, size: 16),
                          const SizedBox(width: 8),
                          const Text(
                            'No internet connection',
                            style: TextStyle(color: Colors.white, fontSize: 12),
                          ),
                          const Spacer(),
                          if (appState.connection.isReconnecting)
                            const SizedBox(
                              width: 12,
                              height: 12,
                              child: CircularProgressIndicator(
                                strokeWidth: 2,
                                valueColor: AlwaysStoppedAnimation<Color>(Colors.white),
                              ),
                            ),
                        ],
                      ),
                    ),
                  ),
                );
              },
            ),
          ],
        );
      },
      home: const SplashScreen(),
      onGenerateRoute: (settings) {
        switch (settings.name) {
          case '/':
            return MaterialPageRoute(builder: (_) => const SplashScreen());
          case '/login':
            return MaterialPageRoute(builder: (_) => const LoginScreen());
          case '/register':
            return MaterialPageRoute(builder: (_) => const RegisterScreen());
          case '/home':
            return MaterialPageRoute(builder: (_) => const HomeScreen());
          case '/map':
            return MaterialPageRoute(builder: (_) => const MapScreen());
          case '/report':
            return MaterialPageRoute(builder: (_) => const ReportScreen());
          case '/profile':
            return MaterialPageRoute(builder: (_) => const ProfileScreen());
          case '/auto-capture':
            return MaterialPageRoute(builder: (_) => const AutoCaptureScreen());
          case '/fast-capture':
            return MaterialPageRoute(builder: (_) => const HighPerformanceCaptureScreen());
          case '/emergency-report':
            return MaterialPageRoute(builder: (_) => const EmergencyReportScreen());
          case '/auto-monitor':
            return MaterialPageRoute(builder: (_) => const AutoMonitorScreen());
          case '/ai-video':
            return MaterialPageRoute(builder: (_) => const AIVideoCaptureScreen());
          case '/emergency-alert':
            final args = settings.arguments as Map<String, dynamic>?;
            return MaterialPageRoute(
              builder: (_) => EmergencyAlertScreen(alertData: args ?? {}),
              fullscreenDialog: true,
            );
          case '/history':
            return MaterialPageRoute(builder: (_) => const ReportHistoryScreen());
          case '/notifications':
            return MaterialPageRoute(builder: (_) => const NotificationsScreen());
          case '/settings':
            return MaterialPageRoute(builder: (_) => const SettingsScreen());
          case '/help':
            return MaterialPageRoute(builder: (_) => const HelpSupportScreen());
          case '/about':
            return MaterialPageRoute(builder: (_) => const AboutScreen());
          case '/deployments':
            // Support passing initialTab argument for notification navigation
            final args = settings.arguments as Map<String, dynamic>?;
            final initialTab = args?['initialTab'] as int? ?? 0;
            return MaterialPageRoute(builder: (_) => DeploymentsScreen(initialTab: initialTab));
          default:
            return MaterialPageRoute(builder: (_) => const SplashScreen());
        }
      },
    );
  }
}
