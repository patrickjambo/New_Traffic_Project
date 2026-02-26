import 'package:flutter/material.dart';
import 'package:url_launcher/url_launcher.dart';
import '../config/app_theme.dart';

/// ============================================================================
/// Help & Support Screen - TrafficGuard Mobile App
/// ============================================================================
/// Professional help & support screen featuring:
/// - FAQ section with expandable items
/// - Contact information with quick actions
/// - Emergency hotline integration
/// - Consistent dark theme design
/// ============================================================================

class HelpSupportScreen extends StatelessWidget {
  const HelpSupportScreen({super.key});

  Future<void> _launchEmail() async {
    final Uri emailUri = Uri(
      scheme: 'mailto',
      path: 'support@trafficguard.ai',
      query: 'subject=TrafficGuard AI Support Request',
    );
    
    if (await canLaunchUrl(emailUri)) {
      await launchUrl(emailUri);
    }
  }

  Future<void> _launchPhone() async {
    final Uri phoneUri = Uri(scheme: 'tel', path: '112');
    
    if (await canLaunchUrl(phoneUri)) {
      await launchUrl(phoneUri);
    }
  }

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
          'Help & Support',
          style: AppTextStyles.titleLarge.copyWith(color: AppColors.textPrimary),
        ),
        centerTitle: true,
      ),
      body: ListView(
        padding: const EdgeInsets.all(20),
        children: [
          // Header Icon
          Center(
            child: Container(
              width: 80,
              height: 80,
              decoration: BoxDecoration(
                gradient: LinearGradient(
                  colors: [AppColors.primary, AppColors.primary.withValues(alpha: 0.7)],
                  begin: Alignment.topLeft,
                  end: Alignment.bottomRight,
                ),
                borderRadius: BorderRadius.circular(20),
                boxShadow: [
                  BoxShadow(
                    color: AppColors.primary.withValues(alpha: 0.3),
                    blurRadius: 20,
                    offset: const Offset(0, 8),
                  ),
                ],
              ),
              child: const Icon(
                Icons.support_agent,
                color: Colors.white,
                size: 40,
              ),
            ),
          ),
          const SizedBox(height: 12),
          Text(
            'How can we help?',
            style: AppTextStyles.titleLarge.copyWith(color: AppColors.textPrimary),
            textAlign: TextAlign.center,
          ),
          const SizedBox(height: 4),
          Text(
            'Find answers to common questions',
            style: AppTextStyles.bodyMedium.copyWith(color: AppColors.textSecondary),
            textAlign: TextAlign.center,
          ),
          const SizedBox(height: 32),

          // FAQ Section
          _buildSectionHeader('Frequently Asked Questions'),
          const SizedBox(height: 12),
          _buildFAQItem(
            'How do I report an incident?',
            'Tap the "Fast Capture" or "AI Video" button on the home screen. You can record a video which will be automatically analyzed by our AI system to detect incidents.',
            Icons.videocam_outlined,
          ),
          _buildFAQItem(
            'Is my report anonymous?',
            'Yes, you can choose to report anonymously by toggling the "Report Anonymously" switch when submitting a report. Your identity will not be shared.',
            Icons.visibility_off_outlined,
          ),
          _buildFAQItem(
            'How does the AI detection work?',
            'Our AI analyzes the video you upload to automatically detect the type of incident (congestion, accident, etc.), estimate severity, and count vehicles in the scene.',
            Icons.psychology_outlined,
          ),
          _buildFAQItem(
            'Will I receive notifications?',
            'Yes! You\'ll receive real-time notifications about nearby incidents and updates on your reports. You can manage notification preferences in Settings.',
            Icons.notifications_outlined,
          ),
          _buildFAQItem(
            'How do deployments work?',
            'Police officers receive deployment assignments through the app. You can view your assigned duties, check in at locations, and update your status in real-time.',
            Icons.assignment_outlined,
          ),
          
          const SizedBox(height: 32),

          // Contact Section
          _buildSectionHeader('Contact Us'),
          const SizedBox(height: 12),
          _buildContactCard(
            icon: Icons.email_outlined,
            title: 'Email Support',
            subtitle: 'support@trafficguard.ai',
            description: 'Get help within 24 hours',
            color: AppColors.primary,
            onTap: _launchEmail,
          ),
          const SizedBox(height: 12),
          _buildContactCard(
            icon: Icons.phone_outlined,
            title: 'Emergency Hotline',
            subtitle: '112',
            description: 'Available 24/7 for emergencies',
            color: AppColors.error,
            onTap: _launchPhone,
          ),
          
          const SizedBox(height: 32),

          // Additional Resources
          _buildSectionHeader('Additional Resources'),
          const SizedBox(height: 12),
          Container(
            padding: const EdgeInsets.all(16),
            decoration: BoxDecoration(
              color: AppColors.backgroundSecondary,
              borderRadius: BorderRadius.circular(16),
              border: Border.all(color: AppColors.border),
            ),
            child: Column(
              children: [
                _buildResourceItem(
                  Icons.description_outlined,
                  'User Guide',
                  'Learn how to use all features',
                ),
                const Divider(color: AppColors.border, height: 24),
                _buildResourceItem(
                  Icons.video_library_outlined,
                  'Video Tutorials',
                  'Watch step-by-step guides',
                ),
                const Divider(color: AppColors.border, height: 24),
                _buildResourceItem(
                  Icons.feedback_outlined,
                  'Send Feedback',
                  'Help us improve the app',
                ),
              ],
            ),
          ),
          
          const SizedBox(height: 40),
        ],
      ),
    );
  }

  Widget _buildSectionHeader(String title) {
    return Text(
      title,
      style: AppTextStyles.titleMedium.copyWith(color: AppColors.textPrimary),
    );
  }

  Widget _buildFAQItem(String question, String answer, IconData icon) {
    return Container(
      margin: const EdgeInsets.only(bottom: 12),
      decoration: BoxDecoration(
        color: AppColors.backgroundSecondary,
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: AppColors.border),
      ),
      child: Theme(
        data: ThemeData().copyWith(
          dividerColor: Colors.transparent,
          splashColor: AppColors.primary.withValues(alpha: 0.1),
        ),
        child: ExpansionTile(
          leading: Container(
            padding: const EdgeInsets.all(10),
            decoration: BoxDecoration(
              color: AppColors.primary.withValues(alpha: 0.1),
              borderRadius: BorderRadius.circular(10),
            ),
            child: Icon(icon, color: AppColors.primary, size: 20),
          ),
          title: Text(
            question,
            style: AppTextStyles.bodyLarge.copyWith(
              color: AppColors.textPrimary,
              fontWeight: FontWeight.w600,
            ),
          ),
          iconColor: AppColors.textSecondary,
          collapsedIconColor: AppColors.textSecondary,
          children: [
            Padding(
              padding: const EdgeInsets.fromLTRB(16, 0, 16, 16),
              child: Text(
                answer,
                style: AppTextStyles.bodyMedium.copyWith(color: AppColors.textSecondary),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildContactCard({
    required IconData icon,
    required String title,
    required String subtitle,
    required String description,
    required Color color,
    required VoidCallback onTap,
  }) {
    return Material(
      color: AppColors.backgroundSecondary,
      borderRadius: BorderRadius.circular(16),
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(16),
        child: Container(
          padding: const EdgeInsets.all(16),
          decoration: BoxDecoration(
            borderRadius: BorderRadius.circular(16),
            border: Border.all(color: AppColors.border),
          ),
          child: Row(
            children: [
              Container(
                padding: const EdgeInsets.all(14),
                decoration: BoxDecoration(
                  color: color.withValues(alpha: 0.1),
                  borderRadius: BorderRadius.circular(14),
                ),
                child: Icon(icon, color: color, size: 28),
              ),
              const SizedBox(width: 16),
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
                      style: AppTextStyles.bodyMedium.copyWith(color: color),
                    ),
                    const SizedBox(height: 2),
                    Text(
                      description,
                      style: AppTextStyles.bodySmall.copyWith(color: AppColors.textTertiary),
                    ),
                  ],
                ),
              ),
              Icon(
                Icons.arrow_forward_ios,
                color: AppColors.textTertiary,
                size: 16,
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildResourceItem(IconData icon, String title, String subtitle) {
    return Row(
      children: [
        Container(
          padding: const EdgeInsets.all(10),
          decoration: BoxDecoration(
            color: AppColors.primary.withValues(alpha: 0.1),
            borderRadius: BorderRadius.circular(10),
          ),
          child: Icon(icon, color: AppColors.primary, size: 20),
        ),
        const SizedBox(width: 14),
        Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                title,
                style: AppTextStyles.bodyMedium.copyWith(
                  color: AppColors.textPrimary,
                  fontWeight: FontWeight.w500,
                ),
              ),
              Text(
                subtitle,
                style: AppTextStyles.bodySmall.copyWith(color: AppColors.textTertiary),
              ),
            ],
          ),
        ),
        Icon(
          Icons.arrow_forward_ios,
          color: AppColors.textTertiary,
          size: 14,
        ),
      ],
    );
  }
}
