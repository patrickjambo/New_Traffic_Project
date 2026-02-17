import 'package:flutter/material.dart';
import 'package:flutter/foundation.dart';
import 'package:flutter/services.dart';
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
import 'services/websocket_service.dart';
import 'services/notification_service.dart';
import 'services/api_service.dart';
import 'services/emergency_alert_service.dart';
import 'providers/app_state_provider.dart';
import 'utils/error_handler.dart';

// Global navigator key for showing alerts from anywhere
final GlobalKey<NavigatorState> navigatorKey = GlobalKey<NavigatorState>();

// Global app state manager instance
final appState = AppStateManager();

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
  
  // Initialize app state manager (loads saved preferences)
  await appState.initialize();
  print('✅ App State Manager initialized');
  
  // Initialize services
  try {
    final apiService = ApiService();
    apiService.initialize();
    print('✅ API Service initialized');
  } catch (e) {
    print('⚠️ Failed to initialize API Service: $e');
  }
  
  try {
    final notificationService = NotificationService();
    await notificationService.initialize();
    print('✅ Notification Service initialized');
  } catch (e) {
    print('⚠️ Failed to initialize Notification Service: $e');
  }
  
  try {
    final emergencyAlertService = EmergencyAlertService();
    await emergencyAlertService.initialize();
    print('✅ Emergency Alert Service initialized');
  } catch (e) {
    print('⚠️ Failed to initialize Emergency Alert Service: $e');
  }
  
  try {
    final websocketService = WebSocketService();
    websocketService.connect();
    print('✅ WebSocket Service initialized');
  } catch (e) {
    print('⚠️ Failed to initialize WebSocket Service: $e');
  }
  
  runApp(const TrafficGuardApp());
}

class TrafficGuardApp extends StatefulWidget {
  const TrafficGuardApp({super.key});

  @override
  State<TrafficGuardApp> createState() => _TrafficGuardAppState();

  /// Static method to access state from anywhere
  static _TrafficGuardAppState? of(BuildContext context) {
    return context.findAncestorStateOfType<_TrafficGuardAppState>();
  }
}

class _TrafficGuardAppState extends State<TrafficGuardApp> with WidgetsBindingObserver {
  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addObserver(this);
    
    // Listen to app state changes for instant updates
    appState.addListener(_onAppStateChanged);
  }

  @override
  void dispose() {
    WidgetsBinding.instance.removeObserver(this);
    appState.removeListener(_onAppStateChanged);
    super.dispose();
  }

  void _onAppStateChanged() {
    // Rebuild the app when theme or settings change
    if (mounted) {
      setState(() {});
    }
  }

  @override
  void didChangePlatformBrightness() {
    // Handle system theme changes
    if (appState.useSystemTheme) {
      setState(() {});
    }
  }

  /// Update system UI overlay style based on theme
  void _updateSystemUI() {
    final isDark = appState.isDarkMode;
    SystemChrome.setSystemUIOverlayStyle(
      SystemUiOverlayStyle(
        statusBarColor: Colors.transparent,
        statusBarIconBrightness: isDark ? Brightness.light : Brightness.dark,
        systemNavigationBarColor: isDark ? const Color(0xFF121212) : Colors.white,
        systemNavigationBarIconBrightness: isDark ? Brightness.light : Brightness.dark,
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    // Update system UI when building
    WidgetsBinding.instance.addPostFrameCallback((_) => _updateSystemUI());

    return AnimatedTheme(
      data: appState.isDarkMode ? appState.buildDarkTheme() : appState.buildLightTheme(),
      duration: appState.animationDuration,
      child: MaterialApp(
        navigatorKey: navigatorKey,
        title: 'TrafficGuard AI',
        debugShowCheckedModeBanner: false,
        theme: appState.buildLightTheme(),
        darkTheme: appState.buildDarkTheme(),
        themeMode: appState.themeMode,
        // Enable smooth theme animation
        themeAnimationDuration: appState.animationDuration,
        themeAnimationCurve: Curves.easeInOut,
        home: const SplashScreen(),
        onGenerateRoute: _generateRoute,
        builder: (context, child) {
          // Apply font scaling
          return MediaQuery(
            data: MediaQuery.of(context).copyWith(
              textScaler: TextScaler.linear(appState.fontSize),
            ),
            child: _AppWrapper(child: child),
          );
        },
      ),
    );
  }

  Route<dynamic>? _generateRoute(RouteSettings settings) {
    // Use smooth page transitions
    Widget page;
    bool fullscreenDialog = false;

    switch (settings.name) {
      case '/':
        page = const SplashScreen();
        break;
      case '/login':
        page = const LoginScreen();
        break;
      case '/register':
        page = const RegisterScreen();
        break;
      case '/home':
        page = const HomeScreen();
        break;
      case '/map':
        page = const MapScreen();
        break;
      case '/report':
        page = const ReportScreen();
        break;
      case '/profile':
        page = const ProfileScreen();
        break;
      case '/auto-capture':
        page = const AutoCaptureScreen();
        break;
      case '/fast-capture':
        page = const HighPerformanceCaptureScreen();
        break;
      case '/emergency-report':
        page = const EmergencyReportScreen();
        break;
      case '/auto-monitor':
        page = const AutoMonitorScreen();
        break;
      case '/emergency-alert':
        final args = settings.arguments as Map<String, dynamic>?;
        page = EmergencyAlertScreen(alertData: args ?? {});
        fullscreenDialog = true;
        break;
      case '/history':
        page = const ReportHistoryScreen();
        break;
      case '/notifications':
        page = const NotificationsScreen();
        break;
      case '/settings':
        page = const SettingsScreenAdvanced();
        break;
      case '/help':
        page = const HelpSupportScreen();
        break;
      case '/about':
        page = const AboutScreen();
        break;
      case '/deployments':
        page = const DeploymentsScreen();
        break;
      default:
        page = const SplashScreen();
    }

    // Use smooth transitions
    return _SmoothPageRoute(
      builder: (_) => page,
      settings: settings,
      fullscreenDialog: fullscreenDialog,
    );
  }
}

/// Wrapper widget for global features
class _AppWrapper extends StatelessWidget {
  final Widget? child;
  
  const _AppWrapper({this.child});

  @override
  Widget build(BuildContext context) {
    return Stack(
      children: [
        child ?? const SizedBox(),
        // Connection status indicator
        if (!appState.isOnline)
          Positioned(
            top: MediaQuery.of(context).padding.top,
            left: 0,
            right: 0,
            child: Container(
              color: Colors.red,
              padding: const EdgeInsets.symmetric(vertical: 4),
              child: const Text(
                '⚠️ No Internet Connection',
                textAlign: TextAlign.center,
                style: TextStyle(color: Colors.white, fontSize: 12),
              ),
            ),
          ),
      ],
    );
  }
}

/// Smooth page transition route
class _SmoothPageRoute<T> extends MaterialPageRoute<T> {
  _SmoothPageRoute({
    required super.builder,
    super.settings,
    super.fullscreenDialog,
  });

  @override
  Duration get transitionDuration => appState.animationDuration;

  @override
  Widget buildTransitions(
    BuildContext context,
    Animation<double> animation,
    Animation<double> secondaryAnimation,
    Widget child,
  ) {
    if (appState.reduceMotion) {
      return FadeTransition(opacity: animation, child: child);
    }
    
    return SlideTransition(
      position: Tween<Offset>(
        begin: const Offset(1.0, 0.0),
        end: Offset.zero,
      ).animate(CurvedAnimation(
        parent: animation,
        curve: Curves.easeOutCubic,
      )),
      child: FadeTransition(
        opacity: animation,
        child: child,
      ),
    );
  }
}

/// ==================== ADVANCED SETTINGS SCREEN ====================
/// Settings screen with instant theme switching
class SettingsScreenAdvanced extends StatefulWidget {
  const SettingsScreenAdvanced({super.key});

  @override
  State<SettingsScreenAdvanced> createState() => _SettingsScreenAdvancedState();
}

class _SettingsScreenAdvancedState extends State<SettingsScreenAdvanced> {
  @override
  void initState() {
    super.initState();
    appState.addListener(_onStateChanged);
  }

  @override
  void dispose() {
    appState.removeListener(_onStateChanged);
    super.dispose();
  }

  void _onStateChanged() {
    if (mounted) setState(() {});
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    
    return Scaffold(
      appBar: AppBar(
        title: const Text('Settings'),
        actions: [
          // Quick theme toggle button
          IconButton(
            icon: AnimatedSwitcher(
              duration: const Duration(milliseconds: 300),
              transitionBuilder: (child, animation) {
                return RotationTransition(
                  turns: animation,
                  child: FadeTransition(opacity: animation, child: child),
                );
              },
              child: Icon(
                appState.isDarkMode ? Icons.light_mode : Icons.dark_mode,
                key: ValueKey(appState.isDarkMode),
              ),
            ),
            onPressed: () => appState.toggleDarkMode(),
            tooltip: appState.isDarkMode ? 'Switch to Light Mode' : 'Switch to Dark Mode',
          ),
        ],
      ),
      body: ListView(
        padding: const EdgeInsets.symmetric(vertical: 8),
        children: [
          // ==================== APPEARANCE ====================
          _buildSectionHeader('Appearance', Icons.palette),
          
          // Theme Mode Selection
          _buildThemeModeSelector(),
          
          // Color Theme Selection
          _buildColorSelector(),
          
          // Font Size
          _buildFontSizeSlider(),
          
          // Reduce Motion
          _buildSwitchTile(
            title: 'Reduce Motion',
            subtitle: 'Minimize animations for accessibility',
            icon: Icons.animation,
            value: appState.reduceMotion,
            onChanged: (value) => appState.setReduceMotion(value),
          ),

          const Divider(height: 32),

          // ==================== NOTIFICATIONS ====================
          _buildSectionHeader('Notifications', Icons.notifications),
          
          _buildSwitchTile(
            title: 'Push Notifications',
            subtitle: 'Receive alerts about incidents',
            icon: Icons.notifications_active,
            value: appState.notificationsEnabled,
            onChanged: (value) => appState.setNotificationsEnabled(value),
          ),
          
          _buildSwitchTile(
            title: 'Sound',
            subtitle: 'Play sound for alerts',
            icon: Icons.volume_up,
            value: appState.soundEnabled,
            onChanged: (value) => appState.setSoundEnabled(value),
          ),
          
          _buildSwitchTile(
            title: 'Vibration',
            subtitle: 'Vibrate for alerts',
            icon: Icons.vibration,
            value: appState.vibrationEnabled,
            onChanged: (value) => appState.setVibrationEnabled(value),
          ),

          const Divider(height: 32),

          // ==================== DATA & SYNC ====================
          _buildSectionHeader('Data & Sync', Icons.sync),
          
          _buildSwitchTile(
            title: 'Auto Refresh',
            subtitle: 'Automatically update incident feed',
            icon: Icons.refresh,
            value: appState.autoRefresh,
            onChanged: (value) => appState.setAutoRefresh(value),
          ),
          
          if (appState.autoRefresh)
            _buildRefreshIntervalSelector(),
          
          _buildSwitchTile(
            title: 'Location Services',
            subtitle: 'Allow app to access location',
            icon: Icons.location_on,
            value: appState.locationEnabled,
            onChanged: (value) => appState.setLocationEnabled(value),
          ),

          const Divider(height: 32),

          // ==================== CONNECTION STATUS ====================
          _buildSectionHeader('Connection Status', Icons.wifi),
          
          _buildStatusTile(
            title: 'Internet',
            status: appState.isOnline,
            icon: Icons.wifi,
          ),
          _buildStatusTile(
            title: 'Backend Server',
            status: appState.isConnectedToBackend,
            icon: Icons.cloud,
          ),
          _buildStatusTile(
            title: 'Real-time Updates',
            status: appState.isConnectedToWebSocket,
            icon: Icons.bolt,
          ),
          if (appState.lastSyncTime != null)
            ListTile(
              leading: const Icon(Icons.access_time),
              title: const Text('Last Sync'),
              subtitle: Text(_formatTime(appState.lastSyncTime!)),
            ),

          const Divider(height: 32),

          // ==================== ACCOUNT ====================
          _buildSectionHeader('Account', Icons.person),
          
          ListTile(
            leading: const Icon(Icons.lock),
            title: const Text('Change Password'),
            trailing: const Icon(Icons.chevron_right),
            onTap: () => _showComingSoon('Change Password'),
          ),
          
          ListTile(
            leading: const Icon(Icons.delete_forever, color: Colors.red),
            title: const Text('Delete Account', style: TextStyle(color: Colors.red)),
            trailing: const Icon(Icons.chevron_right, color: Colors.red),
            onTap: _showDeleteAccountDialog,
          ),

          const SizedBox(height: 32),

          // App Info
          Center(
            child: Column(
              children: [
                Text(
                  'TrafficGuard AI',
                  style: theme.textTheme.titleMedium,
                ),
                const SizedBox(height: 4),
                Text(
                  'Version 2.0.0',
                  style: theme.textTheme.bodySmall,
                ),
              ],
            ),
          ),
          const SizedBox(height: 32),
        ],
      ),
    );
  }

  Widget _buildSectionHeader(String title, IconData icon) {
    return Padding(
      padding: const EdgeInsets.fromLTRB(16, 16, 16, 8),
      child: Row(
        children: [
          Icon(icon, size: 20, color: Theme.of(context).colorScheme.primary),
          const SizedBox(width: 8),
          Text(
            title,
            style: TextStyle(
              fontSize: 14,
              fontWeight: FontWeight.bold,
              color: Theme.of(context).colorScheme.primary,
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildThemeModeSelector() {
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Text('Theme Mode', style: TextStyle(fontWeight: FontWeight.w500)),
          const SizedBox(height: 12),
          Row(
            children: [
              _buildThemeOption(
                'Light',
                Icons.light_mode,
                appState.themeMode == ThemeMode.light,
                () => appState.setThemeMode(ThemeMode.light),
              ),
              const SizedBox(width: 12),
              _buildThemeOption(
                'Dark',
                Icons.dark_mode,
                appState.themeMode == ThemeMode.dark,
                () => appState.setThemeMode(ThemeMode.dark),
              ),
              const SizedBox(width: 12),
              _buildThemeOption(
                'System',
                Icons.brightness_auto,
                appState.themeMode == ThemeMode.system,
                () => appState.setThemeMode(ThemeMode.system),
              ),
            ],
          ),
        ],
      ),
    );
  }

  Widget _buildThemeOption(String label, IconData icon, bool selected, VoidCallback onTap) {
    final theme = Theme.of(context);
    return Expanded(
      child: GestureDetector(
        onTap: onTap,
        child: AnimatedContainer(
          duration: const Duration(milliseconds: 200),
          padding: const EdgeInsets.symmetric(vertical: 16),
          decoration: BoxDecoration(
            color: selected 
                ? theme.colorScheme.primaryContainer
                : theme.colorScheme.surface,
            borderRadius: BorderRadius.circular(12),
            border: Border.all(
              color: selected 
                  ? theme.colorScheme.primary
                  : theme.colorScheme.outline.withOpacity(0.3),
              width: selected ? 2 : 1,
            ),
          ),
          child: Column(
            children: [
              Icon(
                icon,
                color: selected 
                    ? theme.colorScheme.primary
                    : theme.colorScheme.onSurface,
              ),
              const SizedBox(height: 4),
              Text(
                label,
                style: TextStyle(
                  fontSize: 12,
                  fontWeight: selected ? FontWeight.bold : FontWeight.normal,
                  color: selected 
                      ? theme.colorScheme.primary
                      : theme.colorScheme.onSurface,
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildColorSelector() {
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Text('Accent Color', style: TextStyle(fontWeight: FontWeight.w500)),
          const SizedBox(height: 12),
          Wrap(
            spacing: 12,
            runSpacing: 12,
            children: AppStateManager.presetColors.entries.map((entry) {
              final isSelected = appState.primaryColor.value == entry.value.value;
              return GestureDetector(
                onTap: () => appState.setPrimaryColor(entry.value),
                child: AnimatedContainer(
                  duration: const Duration(milliseconds: 200),
                  width: 48,
                  height: 48,
                  decoration: BoxDecoration(
                    color: entry.value,
                    shape: BoxShape.circle,
                    border: Border.all(
                      color: isSelected ? Colors.white : Colors.transparent,
                      width: 3,
                    ),
                    boxShadow: isSelected
                        ? [BoxShadow(color: entry.value.withOpacity(0.5), blurRadius: 8)]
                        : null,
                  ),
                  child: isSelected
                      ? const Icon(Icons.check, color: Colors.white, size: 24)
                      : null,
                ),
              );
            }).toList(),
          ),
        ],
      ),
    );
  }

  Widget _buildFontSizeSlider() {
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              const Text('Font Size', style: TextStyle(fontWeight: FontWeight.w500)),
              Text('${(appState.fontSize * 100).round()}%'),
            ],
          ),
          Row(
            children: [
              const Text('A', style: TextStyle(fontSize: 12)),
              Expanded(
                child: Slider(
                  value: appState.fontSize,
                  min: 0.8,
                  max: 1.4,
                  divisions: 6,
                  onChanged: (value) => appState.setFontSize(value),
                ),
              ),
              const Text('A', style: TextStyle(fontSize: 20, fontWeight: FontWeight.bold)),
            ],
          ),
        ],
      ),
    );
  }

  Widget _buildRefreshIntervalSelector() {
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          const Text('Refresh Interval'),
          DropdownButton<int>(
            value: appState.refreshInterval,
            items: [15, 30, 60, 120].map((seconds) {
              return DropdownMenuItem(
                value: seconds,
                child: Text(seconds < 60 ? '${seconds}s' : '${seconds ~/ 60}m'),
              );
            }).toList(),
            onChanged: (value) {
              if (value != null) appState.setRefreshInterval(value);
            },
          ),
        ],
      ),
    );
  }

  Widget _buildSwitchTile({
    required String title,
    required String subtitle,
    required IconData icon,
    required bool value,
    required ValueChanged<bool> onChanged,
  }) {
    return SwitchListTile(
      secondary: Icon(icon),
      title: Text(title),
      subtitle: Text(subtitle),
      value: value,
      onChanged: onChanged,
    );
  }

  Widget _buildStatusTile({
    required String title,
    required bool status,
    required IconData icon,
  }) {
    return ListTile(
      leading: Icon(icon),
      title: Text(title),
      trailing: AnimatedContainer(
        duration: const Duration(milliseconds: 300),
        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
        decoration: BoxDecoration(
          color: status ? Colors.green.withOpacity(0.2) : Colors.red.withOpacity(0.2),
          borderRadius: BorderRadius.circular(12),
        ),
        child: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            Container(
              width: 8,
              height: 8,
              decoration: BoxDecoration(
                color: status ? Colors.green : Colors.red,
                shape: BoxShape.circle,
              ),
            ),
            const SizedBox(width: 6),
            Text(
              status ? 'Connected' : 'Offline',
              style: TextStyle(
                color: status ? Colors.green : Colors.red,
                fontWeight: FontWeight.w500,
                fontSize: 12,
              ),
            ),
          ],
        ),
      ),
    );
  }

  String _formatTime(DateTime time) {
    final now = DateTime.now();
    final diff = now.difference(time);
    if (diff.inSeconds < 60) return 'Just now';
    if (diff.inMinutes < 60) return '${diff.inMinutes} minutes ago';
    if (diff.inHours < 24) return '${diff.inHours} hours ago';
    return '${diff.inDays} days ago';
  }

  void _showComingSoon(String feature) {
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text('$feature - Coming soon!'),
        behavior: SnackBarBehavior.floating,
      ),
    );
  }

  void _showDeleteAccountDialog() {
    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        title: const Row(
          children: [
            Icon(Icons.warning, color: Colors.red),
            SizedBox(width: 8),
            Text('Delete Account'),
          ],
        ),
        content: const Text(
          'Are you sure you want to delete your account? This action cannot be undone and all your data will be permanently removed.',
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context),
            child: const Text('Cancel'),
          ),
          ElevatedButton(
            onPressed: () {
              Navigator.pop(context);
              _showComingSoon('Account Deletion');
            },
            style: ElevatedButton.styleFrom(
              backgroundColor: Colors.red,
              foregroundColor: Colors.white,
            ),
            child: const Text('Delete'),
          ),
        ],
      ),
    );
  }
}
