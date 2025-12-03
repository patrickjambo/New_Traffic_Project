import 'package:flutter/material.dart';
import 'package:url_launcher/url_launcher.dart';

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
      appBar: AppBar(
        title: const Text('Help & Support'),
      ),
      body: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          const Text(
            'Frequently Asked Questions',
            style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
          ),
          const SizedBox(height: 8),
          _buildFAQItem(
            'How do I report an incident?',
            'Tap the "Report Incident" button on the home screen or the video icon in the bottom right corner. You can record a video or take a photo.',
          ),
          _buildFAQItem(
            'Is my report anonymous?',
            'You can choose to report anonymously by toggling the "Report Anonymously" switch on the report screen.',
          ),
          _buildFAQItem(
            'How does the AI work?',
            'Our AI analyzes the video you upload to automatically detect the type of incident (congestion, accident, etc.) and estimate severity.',
          ),
          _buildFAQItem(
            'Will I receive notifications?',
            'Yes! You\'ll receive real-time notifications about nearby incidents and updates on your reports. You can manage notification preferences in Settings.',
          ),
          const SizedBox(height: 24),
          const Text(
            'Contact Us',
            style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
          ),
          const SizedBox(height: 16),
          ListTile(
            leading: const Icon(Icons.email, color: Colors.blue),
            title: const Text('Email Support'),
            subtitle: const Text('support@trafficguard.ai'),
            trailing: const Icon(Icons.chevron_right),
            onTap: _launchEmail,
          ),
          ListTile(
            leading: const Icon(Icons.phone, color: Colors.green),
            title: const Text('Emergency Hotline'),
            subtitle: const Text('112'),
            trailing: const Icon(Icons.chevron_right),
            onTap: _launchPhone,
          ),
        ],
      ),
    );
  }

  Widget _buildFAQItem(String question, String answer) {
    return ExpansionTile(
      title: Text(
        question,
        style: const TextStyle(fontWeight: FontWeight.bold),
      ),
      children: [
        Padding(
          padding: const EdgeInsets.fromLTRB(16, 0, 16, 16),
          child: Text(answer),
        ),
      ],
    );
  }
}
