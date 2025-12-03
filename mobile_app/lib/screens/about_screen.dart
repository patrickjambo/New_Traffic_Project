import 'package:flutter/material.dart';
import '../config/app_config.dart';

class AboutScreen extends StatelessWidget {
  const AboutScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('About'),
      ),
      body: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          Center(
            child: Column(
              children: [
                Container(
                  padding: const EdgeInsets.all(20),
                  decoration: BoxDecoration(
                    color: Theme.of(context).colorScheme.primaryContainer,
                    borderRadius: BorderRadius.circular(20),
                  ),
                  child: Icon(
                    Icons.traffic,
                    size: 64,
                    color: Theme.of(context).colorScheme.primary,
                  ),
                ),
                const SizedBox(height: 16),
                Text(
                  AppConfig.appName,
                  style: const TextStyle(
                    fontSize: 24,
                    fontWeight: FontWeight.bold,
                  ),
                ),
                const SizedBox(height: 8),
                Text(
                  'Version ${AppConfig.appVersion}',
                  style: TextStyle(
                    color: Colors.grey[600],
                  ),
                ),
              ],
            ),
          ),
          const SizedBox(height: 32),
          const Text(
            'About TrafficGuard AI',
            style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
          ),
          const SizedBox(height: 8),
          const Text(
            'TrafficGuard AI is a smart traffic management platform that uses artificial intelligence to detect and report traffic incidents in real-time. Our mission is to make roads safer and traffic flow smoother for everyone in Kigali, Rwanda.',
          ),
          const SizedBox(height: 24),
          const Text(
            'Features',
            style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
          ),
          const SizedBox(height: 8),
          _buildFeatureItem('AI-powered incident detection'),
          _buildFeatureItem('Real-time traffic updates'),
          _buildFeatureItem('Anonymous reporting option'),
          _buildFeatureItem('Automatic video capture and analysis'),
          _buildFeatureItem('Live map visualization'),
          _buildFeatureItem('Real-time WebSocket notifications'),
          _buildFeatureItem('Report history tracking'),
          _buildFeatureItem('Persistent settings'),
          _buildFeatureItem('Emergency contact integration'),
          
          const SizedBox(height: 24),
          const Text(
            'What\'s New',
            style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
          ),
          const SizedBox(height: 8),
          _buildChangelogItem(
            'v1.0.0',
            'December 2024',
            [
              'Real-time notifications via WebSocket',
              'Report History to track your submissions', 
              'Settings persistence across app restarts',
              'Email and phone contact integration',
              'Enhanced notifications with swipe-to-delete',
              'Improved UI with better navigation',
              'Full dark mode support (coming soon)',
            ],
          ),
          const SizedBox(height: 24),
          const Text(
            'Privacy',
            style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
          ),
          const SizedBox(height: 8),
          const Text(
            'We respect your privacy. Videos are only used for incident analysis and are automatically deleted if no incident is detected. Anonymous reporting is available for all users. Your location data is used only to show nearby incidents and is never shared with third parties.',
          ),
          
          const SizedBox(height: 24),
          const Text(
            'Open Source',
            style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
          ),
          const SizedBox(height: 8),
          const Text(
            'TrafficGuard AI uses the following open-source technologies:',
          ),
          const SizedBox(height: 8),
          _buildTechItem('Flutter - Cross-platform UI framework'),
          _buildTechItem('Socket.IO - Real-time communication'),
          _buildTechItem('YOLOv8 - AI object detection'),
          _buildTechItem('PostgreSQL + PostGIS - Geospatial database'),
          _buildTechItem('Node.js + Express - Backend API'),
          
          const SizedBox(height: 24),
          const Divider(),
          const SizedBox(height: 8),
          Center(
            child: Text(
              '© 2024 TrafficGuard AI Team',
              style: TextStyle(color: Colors.grey[600]),
            ),
          ),
          const SizedBox(height: 8),
          Center(
            child: Text(
              'Made with ❤️ in Kigali',
              style: TextStyle(color: Colors.grey[600]),
            ),
          ),
          const SizedBox(height: 8),
          Center(
            child: Text(
              'Final Year Project',
              style: TextStyle(
                color: Colors.grey[500],
                fontSize: 12,
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildFeatureItem(String text) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 8),
      child: Row(
        children: [
          const Icon(Icons.check_circle, size: 20, color: Colors.green),
          const SizedBox(width: 8),
          Expanded(child: Text(text)),
        ],
      ),
    );
  }

  Widget _buildTechItem(String text) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 4, left: 8),
      child: Row(
        children: [
          const Icon(Icons.code, size: 16, color: Colors.blue),
          const SizedBox(width: 8),
          Expanded(child: Text(text, style: const TextStyle(fontSize: 14))),
        ],
      ),
    );
  }

  Widget _buildChangelogItem(String version, String date, List<String> changes) {
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Text(
                  version,
                  style: const TextStyle(
                    fontWeight: FontWeight.bold,
                    fontSize: 16,
                  ),
                ),
                Text(
                  date,
                  style: TextStyle(
                    color: Colors.grey[600],
                    fontSize: 12,
                  ),
                ),
              ],
            ),
            const SizedBox(height: 12),
            ...changes.map((change) => Padding(
              padding: const EdgeInsets.only(bottom: 6),
              child: Row(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Text('• ', style: TextStyle(fontWeight: FontWeight.bold)),
                  Expanded(child: Text(change)),
                ],
              ),
            )),
          ],
        ),
      ),
    );
  }
}
