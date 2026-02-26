import 'package:flutter/material.dart';
import '../config/app_config.dart';
import '../config/app_theme.dart';

/// ============================================================================
/// About Screen - TrafficGuard Mobile App
/// ============================================================================
/// Professional about screen featuring:
/// - App branding and version info
/// - Feature highlights
/// - Changelog/What's New section
/// - Privacy information
/// - Technology credits
/// - Consistent dark theme design
/// ============================================================================

class AboutScreen extends StatelessWidget {
  const AboutScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.background,
      appBar: AppBar(
        backgroundColor: AppColors.background,
        elevation: 0,
        leading: IconButton(
          icon: Container(
            padding: const EdgeInsets.all(8),
            decoration: BoxDecoration(
              color: AppColors.backgroundSecondary,
              borderRadius: BorderRadius.circular(10),
              border: Border.all(color: AppColors.border),
            ),
            child: const Icon(
              Icons.arrow_back,
              color: AppColors.textPrimary,
              size: 20,
            ),
          ),
          onPressed: () => Navigator.pop(context),
        ),
        title: Text(
          'About',
          style: AppTextStyles.titleLarge.copyWith(color: AppColors.textPrimary),
        ),
        centerTitle: true,
      ),
      body: ListView(
        padding: const EdgeInsets.all(20),
        children: [
          // App Logo & Version
          Center(
            child: Column(
              children: [
                Container(
                  width: 100,
                  height: 100,
                  decoration: BoxDecoration(
                    gradient: LinearGradient(
                      colors: [AppColors.primary, AppColors.primary.withValues(alpha: 0.7)],
                      begin: Alignment.topLeft,
                      end: Alignment.bottomRight,
                    ),
                    borderRadius: BorderRadius.circular(24),
                    boxShadow: [
                      BoxShadow(
                        color: AppColors.primary.withValues(alpha: 0.3),
                        blurRadius: 24,
                        offset: const Offset(0, 10),
                      ),
                    ],
                  ),
                  child: const Icon(
                    Icons.traffic,
                    size: 50,
                    color: Colors.white,
                  ),
                ),
                const SizedBox(height: 16),
                Text(
                  AppConfig.appName,
                  style: AppTextStyles.titleLarge.copyWith(
                    color: AppColors.textPrimary,
                    fontSize: 24,
                    fontWeight: FontWeight.bold,
                  ),
                ),
                const SizedBox(height: 6),
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 6),
                  decoration: BoxDecoration(
                    color: AppColors.primary.withValues(alpha: 0.1),
                    borderRadius: BorderRadius.circular(20),
                  ),
                  child: Text(
                    'Version ${AppConfig.appVersion}',
                    style: AppTextStyles.bodySmall.copyWith(color: AppColors.primary),
                  ),
                ),
              ],
            ),
          ),
          const SizedBox(height: 32),

          // About Section
          _buildSectionCard(
            title: 'About TrafficGuard AI',
            icon: Icons.info_outline,
            child: Text(
              'TrafficGuard AI is a smart traffic management platform that uses artificial intelligence to detect and report traffic incidents in real-time. Our mission is to make roads safer and traffic flow smoother for everyone in Kigali, Rwanda.',
              style: AppTextStyles.bodyMedium.copyWith(
                color: AppColors.textSecondary,
                height: 1.5,
              ),
            ),
          ),
          const SizedBox(height: 16),

          // Features Section
          _buildSectionCard(
            title: 'Features',
            icon: Icons.star_outline,
            child: Column(
              children: [
                _buildFeatureItem(Icons.psychology, 'AI-powered incident detection'),
                _buildFeatureItem(Icons.speed, 'Real-time traffic updates'),
                _buildFeatureItem(Icons.visibility_off, 'Anonymous reporting option'),
                _buildFeatureItem(Icons.videocam, 'Automatic video capture and analysis'),
                _buildFeatureItem(Icons.map, 'Live map visualization'),
                _buildFeatureItem(Icons.notifications_active, 'Real-time push notifications'),
                _buildFeatureItem(Icons.history, 'Report history tracking'),
                _buildFeatureItem(Icons.assignment, 'Police deployment management'),
                _buildFeatureItem(Icons.emergency, 'Emergency contact integration'),
              ],
            ),
          ),
          const SizedBox(height: 16),

          // What's New Section
          _buildSectionCard(
            title: "What's New",
            icon: Icons.new_releases_outlined,
            child: _buildChangelogItem(
              'v1.0.0',
              'February 2026',
              [
                'Real-time notifications via WebSocket',
                'Report History to track your submissions',
                'Settings persistence across app restarts',
                'Police deployment management system',
                'Enhanced notifications with swipe-to-delete',
                'Improved UI with modern dark theme',
                'Emergency alert system integration',
              ],
            ),
          ),
          const SizedBox(height: 16),

          // Privacy Section
          _buildSectionCard(
            title: 'Privacy',
            icon: Icons.shield_outlined,
            child: Text(
              'We respect your privacy. Videos are only used for incident analysis and are automatically deleted if no incident is detected. Anonymous reporting is available for all users. Your location data is used only to show nearby incidents and is never shared with third parties.',
              style: AppTextStyles.bodyMedium.copyWith(
                color: AppColors.textSecondary,
                height: 1.5,
              ),
            ),
          ),
          const SizedBox(height: 16),

          // Technology Section
          _buildSectionCard(
            title: 'Technologies',
            icon: Icons.code,
            child: Column(
              children: [
                _buildTechItem(Icons.flutter_dash, 'Flutter', 'Cross-platform UI framework'),
                _buildTechItem(Icons.cloud_sync, 'Socket.IO', 'Real-time communication'),
                _buildTechItem(Icons.psychology, 'YOLOv8', 'AI object detection'),
                _buildTechItem(Icons.storage, 'PostgreSQL + PostGIS', 'Geospatial database'),
                _buildTechItem(Icons.api, 'Node.js + Express', 'Backend API'),
              ],
            ),
          ),
          const SizedBox(height: 32),

          // Footer
          Center(
            child: Column(
              children: [
                Container(
                  width: 60,
                  height: 1,
                  color: AppColors.border,
                ),
                const SizedBox(height: 20),
                Text(
                  '© 2026 TrafficGuard AI Team',
                  style: AppTextStyles.bodySmall.copyWith(color: AppColors.textTertiary),
                ),
                const SizedBox(height: 6),
                Row(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    Text(
                      'Made with ',
                      style: AppTextStyles.bodySmall.copyWith(color: AppColors.textTertiary),
                    ),
                    const Icon(Icons.favorite, color: AppColors.error, size: 14),
                    Text(
                      ' in Kigali',
                      style: AppTextStyles.bodySmall.copyWith(color: AppColors.textTertiary),
                    ),
                  ],
                ),
                const SizedBox(height: 6),
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 4),
                  decoration: BoxDecoration(
                    color: AppColors.backgroundSecondary,
                    borderRadius: BorderRadius.circular(12),
                    border: Border.all(color: AppColors.border),
                  ),
                  child: Text(
                    'Final Year Project',
                    style: AppTextStyles.labelSmall.copyWith(color: AppColors.textTertiary),
                  ),
                ),
              ],
            ),
          ),
          const SizedBox(height: 40),
        ],
      ),
    );
  }

  Widget _buildSectionCard({
    required String title,
    required IconData icon,
    required Widget child,
  }) {
    return Container(
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        color: AppColors.backgroundSecondary,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: AppColors.border),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Container(
                padding: const EdgeInsets.all(8),
                decoration: BoxDecoration(
                  color: AppColors.primary.withValues(alpha: 0.1),
                  borderRadius: BorderRadius.circular(10),
                ),
                child: Icon(icon, color: AppColors.primary, size: 20),
              ),
              const SizedBox(width: 12),
              Text(
                title,
                style: AppTextStyles.titleMedium.copyWith(color: AppColors.textPrimary),
              ),
            ],
          ),
          const SizedBox(height: 16),
          child,
        ],
      ),
    );
  }

  Widget _buildFeatureItem(IconData icon, String text) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 12),
      child: Row(
        children: [
          Container(
            padding: const EdgeInsets.all(6),
            decoration: BoxDecoration(
              color: AppColors.success.withValues(alpha: 0.1),
              borderRadius: BorderRadius.circular(8),
            ),
            child: Icon(icon, size: 16, color: AppColors.success),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Text(
              text,
              style: AppTextStyles.bodyMedium.copyWith(color: AppColors.textSecondary),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildTechItem(IconData icon, String name, String description) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 12),
      child: Row(
        children: [
          Container(
            padding: const EdgeInsets.all(8),
            decoration: BoxDecoration(
              color: AppColors.primary.withValues(alpha: 0.1),
              borderRadius: BorderRadius.circular(8),
            ),
            child: Icon(icon, size: 18, color: AppColors.primary),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  name,
                  style: AppTextStyles.bodyMedium.copyWith(
                    color: AppColors.textPrimary,
                    fontWeight: FontWeight.w500,
                  ),
                ),
                Text(
                  description,
                  style: AppTextStyles.bodySmall.copyWith(color: AppColors.textTertiary),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildChangelogItem(String version, String date, List<String> changes) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
              decoration: BoxDecoration(
                color: AppColors.primary.withValues(alpha: 0.1),
                borderRadius: BorderRadius.circular(8),
              ),
              child: Text(
                version,
                style: AppTextStyles.labelMedium.copyWith(
                  color: AppColors.primary,
                  fontWeight: FontWeight.bold,
                ),
              ),
            ),
            Text(
              date,
              style: AppTextStyles.bodySmall.copyWith(color: AppColors.textTertiary),
            ),
          ],
        ),
        const SizedBox(height: 16),
        ...changes.map((change) => Padding(
          padding: const EdgeInsets.only(bottom: 8),
          child: Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Container(
                margin: const EdgeInsets.only(top: 6),
                width: 6,
                height: 6,
                decoration: BoxDecoration(
                  color: AppColors.success,
                  borderRadius: BorderRadius.circular(3),
                ),
              ),
              const SizedBox(width: 10),
              Expanded(
                child: Text(
                  change,
                  style: AppTextStyles.bodyMedium.copyWith(color: AppColors.textSecondary),
                ),
              ),
            ],
          ),
        )),
      ],
    );
  }
}
