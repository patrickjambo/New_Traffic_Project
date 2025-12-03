import 'package:flutter/material.dart';
import '../services/settings_service.dart';

class SettingsScreen extends StatefulWidget {
  const SettingsScreen({super.key});

  @override
  State<SettingsScreen> createState() => _SettingsScreenState();
}

class _SettingsScreenState extends State<SettingsScreen> {
  final SettingsService _settingsService = SettingsService();
  
  bool _notificationsEnabled = true;
  bool _darkModeEnabled = false;
  bool _locationEnabled = true;
  bool _isLoading = true;

  @override
  void initState() {
    super.initState();
    _loadSettings();
  }

  Future<void> _loadSettings() async {
    final notifications = await _settingsService.getNotificationsEnabled();
    final darkMode = await _settingsService.getDarkModeEnabled();
    final location = await _settingsService.getLocationEnabled();
    
    setState(() {
      _notificationsEnabled = notifications;
      _darkModeEnabled = darkMode;
      _locationEnabled = location;
      _isLoading = false;
    });
  }

  Future<void> _updateNotifications(bool value) async {
    await _settingsService.setNotificationsEnabled(value);
    setState(() => _notificationsEnabled = value);
  }

  Future<void> _updateDarkMode(bool value) async {
    await _settingsService.setDarkModeEnabled(value);
    setState(() => _darkModeEnabled = value);
    
    if (mounted) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('🌙 Dark mode will be applied on app restart'),
          duration: Duration(seconds: 2),
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

    return Scaffold(
      appBar: AppBar(
        title: const Text('Settings'),
      ),
      body: ListView(
        children: [
          _buildSectionHeader('General'),
          SwitchListTile(
            title: const Text('Push Notifications'),
            subtitle: const Text('Receive alerts about nearby incidents'),
            value: _notificationsEnabled,
            onChanged: _updateNotifications,
          ),
          SwitchListTile(
            title: const Text('Dark Mode'),
            subtitle: const Text('Use dark theme (requires restart)'),
            value: _darkModeEnabled,
            onChanged: _updateDarkMode,
          ),
          
          _buildSectionHeader('Privacy & Location'),
          SwitchListTile(
            title: const Text('Location Services'),
            subtitle: const Text('Allow app to access your location'),
            value: _locationEnabled,
            onChanged: _updateLocation,
          ),
          
          _buildSectionHeader('Account'),
          ListTile(
            title: const Text('Change Password'),
            trailing: const Icon(Icons.chevron_right),
            onTap: () {
              ScaffoldMessenger.of(context).showSnackBar(
                const SnackBar(content: Text('Feature coming soon')),
              );
            },
          ),
          ListTile(
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
