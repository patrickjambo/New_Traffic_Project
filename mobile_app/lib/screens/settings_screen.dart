import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import '../services/settings_service.dart';
import '../config/app_theme.dart';
import '../main.dart' show appState;

/// ============================================================================
/// Settings Screen - TrafficGuard Mobile App
/// ============================================================================
/// Application settings screen featuring:
/// - Appearance settings (Dark Mode toggle)
/// - Notification preferences
/// - Privacy & Location settings
/// - Account management (Change Password, Delete Account)
/// - Professional dark theme design
/// ============================================================================

class SettingsScreen extends StatefulWidget {
  const SettingsScreen({super.key});

  @override
  State<SettingsScreen> createState() => _SettingsScreenState();
}

class _SettingsScreenState extends State<SettingsScreen> {
  // Services
  final SettingsService _settingsService = SettingsService();
  
  // State
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
    appState.theme.toggleDarkMode(value);
    setState(() {});
    
    if (mounted) {
      _showSnackBar(
        value ? 'Dark mode enabled' : 'Light mode enabled',
        icon: value ? Icons.dark_mode_rounded : Icons.light_mode_rounded,
      );
    }
  }

  Future<void> _updateLocation(bool value) async {
    await _settingsService.setLocationEnabled(value);
    setState(() => _locationEnabled = value);
  }

  void _showSnackBar(String message, {IconData? icon}) {
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Row(
          children: [
            if (icon != null) ...[
              Icon(icon, color: Colors.white, size: 20),
              const SizedBox(width: 12),
            ],
            Text(
              message,
              style: AppTextStyles.bodyMedium.copyWith(color: Colors.white),
            ),
          ],
        ),
        backgroundColor: AppColors.primary,
        behavior: SnackBarBehavior.floating,
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
        margin: const EdgeInsets.all(16),
        duration: const Duration(seconds: 2),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    SystemChrome.setSystemUIOverlayStyle(const SystemUiOverlayStyle(
      statusBarColor: Colors.transparent,
      statusBarIconBrightness: Brightness.light,
    ));

    if (_isLoading) {
      return Scaffold(
        backgroundColor: AppColors.background,
        body: Center(
          child: CircularProgressIndicator(
            color: AppColors.primary,
            strokeWidth: 3,
          ),
        ),
      );
    }

    return ListenableBuilder(
      listenable: appState.theme,
      builder: (context, _) {
        return Scaffold(
          backgroundColor: AppColors.background,
          body: SafeArea(
            child: Column(
              children: [
                // Custom App Bar
                _buildAppBar(),
                
                // Content
                Expanded(
                  child: ListView(
                    padding: const EdgeInsets.symmetric(horizontal: 20),
                    children: [
                      const SizedBox(height: 8),
                      
                      // Appearance Section
                      _buildSectionHeader('Appearance'),
                      const SizedBox(height: 12),
                      _buildSettingsCard([
                        _buildSwitchTile(
                          icon: appState.theme.isDarkMode 
                              ? Icons.dark_mode_rounded 
                              : Icons.light_mode_rounded,
                          iconColor: appState.theme.isDarkMode 
                              ? Colors.amber 
                              : AppColors.warning,
                          title: 'Dark Mode',
                          subtitle: 'Switch theme instantly',
                          value: appState.theme.isDarkMode,
                          onChanged: _toggleDarkMode,
                        ),
                      ]),
                      
                      const SizedBox(height: 24),
                      
                      // Notifications Section
                      _buildSectionHeader('Notifications'),
                      const SizedBox(height: 12),
                      _buildSettingsCard([
                        _buildSwitchTile(
                          icon: Icons.notifications_rounded,
                          iconColor: AppColors.primary,
                          title: 'Push Notifications',
                          subtitle: 'Receive alerts about nearby incidents',
                          value: _notificationsEnabled,
                          onChanged: _updateNotifications,
                        ),
                      ]),
                      
                      const SizedBox(height: 24),
                      
                      // Privacy & Location Section
                      _buildSectionHeader('Privacy & Location'),
                      const SizedBox(height: 12),
                      _buildSettingsCard([
                        _buildSwitchTile(
                          icon: Icons.location_on_rounded,
                          iconColor: AppColors.primary,
                          title: 'Location Services',
                          subtitle: 'Allow app to access your location',
                          value: _locationEnabled,
                          onChanged: _updateLocation,
                        ),
                      ]),
                      
                      const SizedBox(height: 24),
                      
                      // Account Section
                      _buildSectionHeader('Account'),
                      const SizedBox(height: 12),
                      _buildSettingsCard([
                        _buildNavigationTile(
                          icon: Icons.lock_rounded,
                          iconColor: AppColors.primary,
                          title: 'Change Password',
                          onTap: () {
                            _showSnackBar('Feature coming soon', icon: Icons.info_rounded);
                          },
                        ),
                        _buildDivider(),
                        _buildNavigationTile(
                          icon: Icons.delete_rounded,
                          iconColor: AppColors.error,
                          title: 'Delete Account',
                          titleColor: AppColors.error,
                          onTap: _showDeleteAccountDialog,
                        ),
                      ]),
                      
                      const SizedBox(height: 32),
                    ],
                  ),
                ),
              ],
            ),
          ),
        );
      },
    );
  }

  // ===========================================================================
  // App Bar
  // ===========================================================================

  Widget _buildAppBar() {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 16),
      child: Row(
        children: [
          // Back Button
          Container(
            decoration: BoxDecoration(
              color: AppColors.backgroundSecondary,
              borderRadius: BorderRadius.circular(12),
              border: Border.all(color: AppColors.border, width: 1),
            ),
            child: IconButton(
              icon: const Icon(
                Icons.arrow_back_rounded,
                color: AppColors.textPrimary,
                size: 22,
              ),
              onPressed: () => Navigator.of(context).pop(),
            ),
          ),
          
          const Spacer(),
          
          // Title
          Text(
            'Settings',
            style: AppTextStyles.titleLarge.copyWith(
              color: AppColors.textPrimary,
              fontWeight: FontWeight.w700,
            ),
          ),
          
          const Spacer(),
          
          // Placeholder for symmetry
          const SizedBox(width: 48),
        ],
      ),
    );
  }

  // ===========================================================================
  // Section Header
  // ===========================================================================

  Widget _buildSectionHeader(String title) {
    return Padding(
      padding: const EdgeInsets.only(left: 4),
      child: Text(
        title,
        style: AppTextStyles.labelLarge.copyWith(
          color: AppColors.primary,
          fontWeight: FontWeight.w700,
          letterSpacing: 0.5,
        ),
      ),
    );
  }

  // ===========================================================================
  // Settings Card Container
  // ===========================================================================

  Widget _buildSettingsCard(List<Widget> children) {
    return Container(
      decoration: BoxDecoration(
        color: AppColors.backgroundSecondary,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: AppColors.border, width: 1),
      ),
      child: Column(children: children),
    );
  }

  Widget _buildDivider() {
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 20),
      child: Divider(color: AppColors.border, height: 1),
    );
  }

  // ===========================================================================
  // Switch Tile
  // ===========================================================================

  Widget _buildSwitchTile({
    required IconData icon,
    required Color iconColor,
    required String title,
    required String subtitle,
    required bool value,
    required ValueChanged<bool> onChanged,
  }) {
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 16),
      child: Row(
        children: [
          // Icon Container
          Container(
            padding: const EdgeInsets.all(10),
            decoration: BoxDecoration(
              color: iconColor.withOpacity(0.15),
              borderRadius: BorderRadius.circular(12),
            ),
            child: Icon(icon, color: iconColor, size: 22),
          ),
          
          const SizedBox(width: 16),
          
          // Title & Subtitle
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  title,
                  style: AppTextStyles.bodyLarge.copyWith(
                    color: AppColors.textPrimary,
                    fontWeight: FontWeight.w600,
                  ),
                ),
                const SizedBox(height: 2),
                Text(
                  subtitle,
                  style: AppTextStyles.bodySmall.copyWith(
                    color: AppColors.textSecondary,
                  ),
                ),
              ],
            ),
          ),
          
          // Switch
          Switch(
            value: value,
            onChanged: onChanged,
            activeColor: AppColors.primary,
            activeTrackColor: AppColors.primary.withOpacity(0.4),
            inactiveThumbColor: AppColors.textTertiary,
            inactiveTrackColor: AppColors.border,
          ),
        ],
      ),
    );
  }

  // ===========================================================================
  // Navigation Tile
  // ===========================================================================

  Widget _buildNavigationTile({
    required IconData icon,
    required Color iconColor,
    required String title,
    Color? titleColor,
    required VoidCallback onTap,
  }) {
    return Material(
      color: Colors.transparent,
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(16),
        child: Padding(
          padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 16),
          child: Row(
            children: [
              // Icon Container
              Container(
                padding: const EdgeInsets.all(10),
                decoration: BoxDecoration(
                  color: iconColor.withOpacity(0.15),
                  borderRadius: BorderRadius.circular(12),
                ),
                child: Icon(icon, color: iconColor, size: 22),
              ),
              
              const SizedBox(width: 16),
              
              // Title
              Expanded(
                child: Text(
                  title,
                  style: AppTextStyles.bodyLarge.copyWith(
                    color: titleColor ?? AppColors.textPrimary,
                    fontWeight: FontWeight.w600,
                  ),
                ),
              ),
              
              // Arrow
              Icon(
                Icons.chevron_right_rounded,
                color: AppColors.textTertiary,
                size: 24,
              ),
            ],
          ),
        ),
      ),
    );
  }

  // ===========================================================================
  // Delete Account Dialog
  // ===========================================================================

  void _showDeleteAccountDialog() {
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
                color: AppColors.error.withOpacity(0.15),
                borderRadius: BorderRadius.circular(12),
              ),
              child: const Icon(
                Icons.warning_rounded,
                color: AppColors.error,
                size: 24,
              ),
            ),
            const SizedBox(width: 12),
            Text(
              'Delete Account',
              style: AppTextStyles.titleLarge.copyWith(
                color: AppColors.textPrimary,
                fontWeight: FontWeight.w700,
              ),
            ),
          ],
        ),
        content: Text(
          'Are you sure you want to delete your account? This action cannot be undone and all your data will be permanently removed.',
          style: AppTextStyles.bodyMedium.copyWith(
            color: AppColors.textSecondary,
            height: 1.4,
          ),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context),
            child: Text(
              'Cancel',
              style: AppTextStyles.labelMedium.copyWith(
                color: AppColors.textSecondary,
              ),
            ),
          ),
          ElevatedButton(
            onPressed: () {
              Navigator.pop(context);
              _showSnackBar('Feature coming soon', icon: Icons.info_rounded);
            },
            style: ElevatedButton.styleFrom(
              backgroundColor: AppColors.error,
              foregroundColor: Colors.white,
              elevation: 0,
              shape: RoundedRectangleBorder(
                borderRadius: BorderRadius.circular(10),
              ),
            ),
            child: Text(
              'Delete',
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
}
