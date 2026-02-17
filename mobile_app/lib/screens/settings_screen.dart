import 'package:flutter/material.dart';
import '../services/settings_service.dart';
import '../main.dart' show appState;

class SettingsScreen extends StatefulWidget {
  const SettingsScreen({super.key});

  @override
  State<SettingsScreen> createState() => _SettingsScreenState();
}

class _SettingsScreenState extends State<SettingsScreen> {
  final SettingsService _settingsService = SettingsService();
  
  bool _notificationsEnabled = true;
  bool _locationEnabled = true;
  bool _isLoading = true;

  @override
  void initState() {
    super.initState();
    _loadSettings();
  }

  Future<void> _loadSettings() async {
    final notifications = await _settingsService.getNotificationsEnabled();
    final location = await _settingsService.getLocationEnabled();
    
    setState(() {
      _notificationsEnabled = notifications;
      _locationEnabled = location;
      _isLoading = false;
    });
  }

  Future<void> _updateNotifications(bool value) async {
    await _settingsService.setNotificationsEnabled(value);
    setState(() => _notificationsEnabled = value);
  }

  /// INSTANT theme switching - no restart needed!
  void _toggleDarkMode(bool value) {
    // This instantly updates the entire app theme
    appState.theme.toggleDarkMode(value);
    setState(() {}); // Rebuild this screen to reflect switch state
    
    if (mounted) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Row(
            children: [
              Icon(
                value ? Icons.dark_mode : Icons.light_mode,
                color: Colors.white,
              ),
              const SizedBox(width: 8),
              Text(value ? '🌙 Dark mode enabled' : '☀️ Light mode enabled'),
            ],
          ),
          duration: const Duration(seconds: 1),
          behavior: SnackBarBehavior.floating,
        ),
      );
    }
  }

  Future<void> _updateLocation(bool value) async {
    await _settingsService.setLocationEnabled(value);
    setState(() => _locationEnabled = value);
  }

  @override
  Widget build(BuildContext context) {
    if (_isLoading) {
      return const Scaffold(
        body: Center(child: CircularProgressIndicator()),
      );
    }

    // Listen to theme changes for instant UI updates
    return ListenableBuilder(
      listenable: appState.theme,
      builder: (context, _) {
        return Scaffold(
          appBar: AppBar(
            title: const Text('Settings'),
          ),
          body: ListView(
            children: [
              _buildSectionHeader('Appearance'),
              SwitchListTile(
                title: const Text('Dark Mode'),
                subtitle: const Text('Switch theme instantly ✨'),
                value: appState.theme.isDarkMode,
                onChanged: _toggleDarkMode,
                secondary: AnimatedSwitcher(
                  duration: const Duration(milliseconds: 300),
                  transitionBuilder: (child, animation) {
                    return RotationTransition(
                      turns: animation,
                      child: ScaleTransition(scale: animation, child: child),
                    );
                  },
                  child: Icon(
                    appState.theme.isDarkMode ? Icons.dark_mode : Icons.light_mode,
                    key: ValueKey(appState.theme.isDarkMode),
                    color: appState.theme.isDarkMode ? Colors.amber : Colors.orange,
                  ),
                ),
              ),
              
              _buildSectionHeader('Notifications'),
              SwitchListTile(
                title: const Text('Push Notifications'),
                subtitle: const Text('Receive alerts about nearby incidents'),
                value: _notificationsEnabled,
                onChanged: _updateNotifications,
                secondary: const Icon(Icons.notifications_outlined),
              ),
              
              _buildSectionHeader('Privacy & Location'),
              SwitchListTile(
                title: const Text('Location Services'),
                subtitle: const Text('Allow app to access your location'),
                value: _locationEnabled,
                onChanged: _updateLocation,
                secondary: const Icon(Icons.location_on_outlined),
              ),
              
              _buildSectionHeader('Account'),
              ListTile(
                leading: const Icon(Icons.lock_outline),
                title: const Text('Change Password'),
                trailing: const Icon(Icons.chevron_right),
                onTap: () {
                  ScaffoldMessenger.of(context).showSnackBar(
                    const SnackBar(content: Text('Feature coming soon')),
                  );
                },
              ),
              ListTile(
                leading: const Icon(Icons.delete_outline, color: Colors.red),
                title: const Text('Delete Account'),
                textColor: Colors.red,
                trailing: const Icon(Icons.chevron_right),
                onTap: () {
                  _showDeleteAccountDialog();
                },
              ),
            ],
          ),
        );
      },
    );
  }

  void _showDeleteAccountDialog() {
    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Delete Account'),
        content: const Text(
          'Are you sure you want to delete your account? This action cannot be undone.',
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context),
            child: const Text('Cancel'),
          ),
          TextButton(
            onPressed: () {
              Navigator.pop(context);
              ScaffoldMessenger.of(context).showSnackBar(
                const SnackBar(content: Text('Feature coming soon')),
              );
            },
            style: TextButton.styleFrom(foregroundColor: Colors.red),
            child: const Text('Delete'),
          ),
        ],
      ),
    );
  }

  Widget _buildSectionHeader(String title) {
    return Padding(
      padding: const EdgeInsets.fromLTRB(16, 24, 16, 8),
      child: Text(
        title,
        style: TextStyle(
          fontSize: 14,
          fontWeight: FontWeight.bold,
          color: Theme.of(context).colorScheme.primary,
        ),
      ),
    );
  }
}
