import 'package:flutter/material.dart';
import 'package:flutter/foundation.dart';
import 'screens/splash_screen.dart';
import 'screens/login_screen.dart';
import 'screens/register_screen.dart';
import 'screens/home_screen.dart';
import 'screens/map_screen.dart';
import 'screens/report_screen.dart';
import 'screens/profile_screen.dart';
import 'screens/auto_capture_screen.dart';
import 'screens/report_history_screen.dart';
import 'screens/notifications_screen.dart';
import 'screens/settings_screen.dart';
import 'screens/help_support_screen.dart';
import 'screens/about_screen.dart';
import 'screens/emergency_report_screen.dart';
import 'screens/auto_monitor_screen.dart';
import 'services/websocket_service.dart';
import 'services/notification_service.dart';
import 'services/settings_service.dart';
import 'services/api_service.dart';
import 'utils/error_handler.dart';
import 'widgets/network_banner.dart';

void main() async {
  WidgetsFlutterBinding.ensureInitialized();
  
  // Set up global error handling
  FlutterError.onError = (FlutterErrorDetails details) {
    FlutterError.presentError(details);
    ErrorHandler.handleError(details.exception, details.stack, context: details.context.toString());
  };
  
  PlatformDispatcher.instance.onError = (error, stack) {
    ErrorHandler.handleError(error, stack);
    return true;
  };
  
  // Initialize services
  try {
    final apiService = ApiService();
    apiService.initialize();
  } catch (e) {
    print('Failed to initialize API Service: $e');
  }
  
  try {
    final notificationService = NotificationService();
    await notificationService.initialize();
  } catch (e) {
    print('Failed to initialize Notification Service: $e');
  }
  
  try {
    final websocketService = WebSocketService();
    websocketService.connect();
  } catch (e) {
    print('Failed to initialize WebSocket Service: $e');
  }
  
  runApp(const TrafficGuardApp());
}

class TrafficGuardApp extends StatefulWidget {
  const TrafficGuardApp({super.key});

  @override
  State<TrafficGuardApp> createState() => _TrafficGuardAppState();
}

class _TrafficGuardAppState extends State<TrafficGuardApp> {
  final SettingsService _settingsService = SettingsService();
  bool _darkModeEnabled = false;
  bool _isLoading = true;

  @override
  void initState() {
    super.initState();
    _loadSettings();
  }

  Future<void> _loadSettings() async {
    final darkMode = await _settingsService.getDarkModeEnabled();
    setState(() {
      _darkModeEnabled = darkMode;
      _isLoading = false;
    });
  }

  @override
  Widget build(BuildContext context) {
    if (_isLoading) {
      return const MaterialApp(
        home: Scaffold(
          body: Center(child: CircularProgressIndicator()),
        ),
      );
    }

    return MaterialApp(
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
      themeMode: _darkModeEnabled ? ThemeMode.dark : ThemeMode.light,
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
          case '/emergency-report':
            return MaterialPageRoute(builder: (_) => const EmergencyReportScreen());
          case '/auto-monitor':
            return MaterialPageRoute(builder: (_) => const AutoMonitorScreen());
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
          default:
            return MaterialPageRoute(builder: (_) => const SplashScreen());
        }
      },
    );
  }
}
