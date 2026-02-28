import 'dart:async';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:provider/provider.dart';
import 'package:http/http.dart' as http;
import 'package:url_launcher/url_launcher.dart';
import 'dart:convert';
import '../services/incident_service.dart';
import '../services/auth_service.dart';
import '../services/websocket_service.dart';
import '../config/app_config.dart';
import '../config/app_theme.dart';

/// ============================================================================
/// Home Screen - TrafficGuard Mobile App
/// ============================================================================
/// The main dashboard screen featuring:
/// - Statistics overview cards
/// - Quick action cards for different features
/// - Recent incidents list with real-time updates
/// - Professional Material Design 3 styling
/// ============================================================================

class HomeScreen extends StatefulWidget {
  const HomeScreen({super.key});

  @override
  State<HomeScreen> createState() => _HomeScreenState();
}

class _HomeScreenState extends State<HomeScreen> with TickerProviderStateMixin {
  // Services
  final IncidentService _incidentService = IncidentService();
  final AuthService _authService = AuthService();

  // State
  List<dynamic> _incidents = [];
  bool _isLoading = true;
  int _selectedNavIndex = 0;
  String _userRole = 'public';
  String _userName = '';
  StreamSubscription<Map<String, dynamic>>? _incidentSubscription;

  // Animation controllers
  late AnimationController _fadeController;
  late Animation<double> _fadeAnimation;

  @override
  void initState() {
    super.initState();
    _initializeAnimations();
    _loadUserData();
    _loadNearbyIncidents();
    _subscribeToIncidentUpdates();
  }

  void _initializeAnimations() {
    _fadeController = AnimationController(
      duration: const Duration(milliseconds: 600),
      vsync: this,
    );
    _fadeAnimation = Tween<double>(begin: 0.0, end: 1.0).animate(
      CurvedAnimation(parent: _fadeController, curve: Curves.easeOut),
    );
    _fadeController.forward();
  }

  @override
  void dispose() {
    _incidentSubscription?.cancel();
    _fadeController.dispose();
    super.dispose();
  }

  void _subscribeToIncidentUpdates() {
    try {
      final wsService = Provider.of<WebSocketService>(context, listen: false);
      _incidentSubscription = wsService.incidentStream.listen((event) {
        final type = event['type'];
        debugPrint('Home screen received incident event: $type');

        // Refresh incidents list when there's a new incident, update, or response
        if (type == 'new' || type == 'update' || type == 'response') {
          _loadNearbyIncidents();
        }
      });
    } catch (e) {
      debugPrint('Error subscribing to incident updates: $e');
    }
  }

  Future<void> _loadUserData() async {
    final userData = await _authService.getUserData();
    if (userData != null && mounted) {
      setState(() {
        _userRole = userData['role'] ?? 'public';
        _userName = userData['full_name'] ?? '';
      });
    }
  }

  Future<void> _loadNearbyIncidents() async {
    setState(() => _isLoading = true);

    final result = await _incidentService.getNearbyIncidents(
      latitude: AppConfig.defaultLatitude,
      longitude: AppConfig.defaultLongitude,
      radius: AppConfig.nearbyIncidentsRadius,
    );

    setState(() {
      _isLoading = false;
      if (result['success']) {
        _incidents = result['data']['incidents'] ?? [];
      }
    });
  }

  @override
  Widget build(BuildContext context) {
    SystemChrome.setSystemUIOverlayStyle(const SystemUiOverlayStyle(
      statusBarColor: Colors.transparent,
      statusBarIconBrightness: Brightness.light,
    ));

    return Scaffold(
      backgroundColor: AppColors.background,
      body: SafeArea(
        child: RefreshIndicator(
          onRefresh: _loadNearbyIncidents,
          color: AppColors.primary,
          backgroundColor: AppColors.backgroundSecondary,
          child: CustomScrollView(
            physics: const BouncingScrollPhysics(),
            slivers: [
              // Custom App Bar
              _buildSliverAppBar(),

              // Main Content
              SliverToBoxAdapter(
                child: FadeTransition(
                  opacity: _fadeAnimation,
                  child: Padding(
                    padding: const EdgeInsets.symmetric(horizontal: 20),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        const SizedBox(height: 24),

                        // Statistics Row
                        _buildStatisticsRow(),

                        const SizedBox(height: 24),

                        // Quick Actions Section
                        _buildSectionHeader(
                          title: 'Quick Actions',
                          icon: Icons.flash_on_rounded,
                        ),
                        const SizedBox(height: 16),

                        // Fast Capture Card
                        _buildQuickActionCard(
                          title: 'Fast Capture',
                          subtitle: 'High-speed parallel upload with real-time AI analysis',
                          icon: Icons.rocket_launch_rounded,
                          iconBackgroundColor: AppColors.primary,
                          cardColor: AppColors.primary.withValues(alpha: 0.08),
                          badge: 'NEW',
                          badgeColor: AppColors.success,
                          onTap: () => Navigator.of(context).pushNamed('/fast-capture'),
                        ),

                        const SizedBox(height: 12),

                        // AI Video Analysis Card
                        _buildQuickActionCard(
                          title: 'AI Video Analysis',
                          subtitle: 'Record video and let AI detect incidents automatically',
                          icon: Icons.smart_toy_rounded,
                          iconBackgroundColor: const Color(0xFF7C3AED),
                          cardColor: const Color(0xFF7C3AED).withValues(alpha: 0.08),
                          badge: 'AI',
                          badgeColor: const Color(0xFF7C3AED),
                          onTap: () => Navigator.of(context).pushNamed('/ai-video'),
                        ),

                        // Deployments Card (Police Officers only)
                        if (_userRole == 'police') ...[
                          const SizedBox(height: 12),
                          _buildQuickActionCard(
                            title: 'My Deployments',
                            subtitle: 'View and acknowledge your assigned deployments',
                            icon: Icons.assignment_rounded,
                            iconBackgroundColor: const Color(0xFF4F46E5),
                            cardColor: const Color(0xFF4F46E5).withValues(alpha: 0.08),
                            badge: 'OFFICER',
                            badgeColor: const Color(0xFF4F46E5),
                            onTap: () => Navigator.of(context).pushNamed('/deployments'),
                          ),
                        ],

                        const SizedBox(height: 32),

                        // Recent Incidents Section
                        _buildSectionHeader(
                          title: 'Recent Incidents',
                          icon: Icons.history_rounded,
                          trailing: TextButton(
                            onPressed: () => Navigator.of(context).pushNamed('/map'),
                            child: Text(
                              'View Map',
                              style: AppTextStyles.labelLarge.copyWith(
                                color: AppColors.primary,
                                fontWeight: FontWeight.w600,
                              ),
                            ),
                          ),
                        ),
                        const SizedBox(height: 16),

                        // Incidents List
                        _buildIncidentsList(),

                        const SizedBox(height: 100), // Space for FAB
                      ],
                    ),
                  ),
                ),
              ),
            ],
          ),
        ),
      ),

      // Floating Action Button
      floatingActionButton: _buildFloatingActionButton(),
      floatingActionButtonLocation: FloatingActionButtonLocation.endFloat,

      // Bottom Navigation Bar
      bottomNavigationBar: _buildBottomNavigationBar(),
    );
  }

  // ===========================================================================
  // App Bar
  // ===========================================================================

  Widget _buildSliverAppBar() {
    return SliverAppBar(
      expandedHeight: 80,
      floating: true,
      pinned: true,
      backgroundColor: AppColors.background,
      elevation: 0,
      automaticallyImplyLeading: false,
      flexibleSpace: FlexibleSpaceBar(
        titlePadding: const EdgeInsets.only(left: 20, bottom: 16),
        title: Row(
          children: [
            // Logo
            Container(
              width: 36,
              height: 36,
              decoration: BoxDecoration(
                shape: BoxShape.circle,
                color: Colors.white,
                boxShadow: [
                  BoxShadow(
                    color: AppColors.primary.withValues(alpha: 0.2),
                    blurRadius: 8,
                    spreadRadius: 1,
                  ),
                ],
              ),
              padding: const EdgeInsets.all(2),
              child: ClipOval(
                child: Image.asset(
                  'assets/images/rnp-logo.png',
                  fit: BoxFit.contain,
                  errorBuilder: (context, error, stackTrace) {
                    return Icon(
                      Icons.local_police_rounded,
                      size: 20,
                      color: AppColors.primary,
                    );
                  },
                ),
              ),
            ),
            const SizedBox(width: 12),
            Text(
              'TrafficGuard',
              style: AppTextStyles.headlineSmall.copyWith(
                color: AppColors.textPrimary,
                fontWeight: FontWeight.w800,
                fontSize: 18,
              ),
            ),
          ],
        ),
      ),
      actions: [
        // Notification Button
        Padding(
          padding: const EdgeInsets.only(right: 12),
          child: Container(
            decoration: BoxDecoration(
              color: AppColors.backgroundSecondary,
              borderRadius: BorderRadius.circular(12),
              border: Border.all(color: AppColors.border, width: 1),
            ),
            child: IconButton(
              icon: Icon(
                Icons.notifications_outlined,
                color: AppColors.textSecondary,
                size: 22,
              ),
              onPressed: () => Navigator.of(context).pushNamed('/notifications'),
            ),
          ),
        ),
      ],
    );
  }

  // ===========================================================================
  // Statistics Cards
  // ===========================================================================

  Widget _buildStatisticsRow() {
    final activeCount = _incidents.where((i) => i['status'] != 'resolved').length;
    final resolvedCount = _incidents.where((i) => i['status'] == 'resolved').length;

    return Row(
      children: [
        Expanded(
          child: _buildStatCard(
            label: 'Active',
            value: activeCount.toString(),
            icon: Icons.warning_amber_rounded,
            iconColor: AppColors.warning,
            backgroundColor: AppColors.warning.withValues(alpha: 0.1),
          ),
        ),
        const SizedBox(width: 16),
        Expanded(
          child: _buildStatCard(
            label: 'Resolved',
            value: resolvedCount.toString(),
            icon: Icons.check_circle_outline_rounded,
            iconColor: AppColors.success,
            backgroundColor: AppColors.success.withValues(alpha: 0.1),
          ),
        ),
      ],
    );
  }

  Widget _buildStatCard({
    required String label,
    required String value,
    required IconData icon,
    required Color iconColor,
    required Color backgroundColor,
  }) {
    return Container(
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        color: AppColors.backgroundSecondary,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: AppColors.border, width: 1),
      ),
      child: Row(
        children: [
          Container(
            padding: const EdgeInsets.all(10),
            decoration: BoxDecoration(
              color: backgroundColor,
              borderRadius: BorderRadius.circular(12),
            ),
            child: Icon(icon, color: iconColor, size: 24),
          ),
          const SizedBox(width: 16),
          Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                value,
                style: AppTextStyles.headlineMedium.copyWith(
                  color: AppColors.textPrimary,
                  fontWeight: FontWeight.w800,
                ),
              ),
              Text(
                label,
                style: AppTextStyles.bodySmall.copyWith(
                  color: AppColors.textTertiary,
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }

  // ===========================================================================
  // Section Headers
  // ===========================================================================

  Widget _buildSectionHeader({
    required String title,
    required IconData icon,
    Widget? trailing,
  }) {
    return Row(
      mainAxisAlignment: MainAxisAlignment.spaceBetween,
      children: [
        Row(
          children: [
            Icon(icon, color: AppColors.primary, size: 20),
            const SizedBox(width: 8),
            Text(
              title,
              style: AppTextStyles.titleLarge.copyWith(
                color: AppColors.textPrimary,
                fontWeight: FontWeight.w700,
              ),
            ),
          ],
        ),
        if (trailing != null) trailing,
      ],
    );
  }

  // ===========================================================================
  // Quick Action Cards
  // ===========================================================================

  Widget _buildQuickActionCard({
    required String title,
    required String subtitle,
    required IconData icon,
    required Color iconBackgroundColor,
    required Color cardColor,
    String? badge,
    Color? badgeColor,
    required VoidCallback onTap,
  }) {
    return Material(
      color: Colors.transparent,
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(16),
        child: Container(
          padding: const EdgeInsets.all(16),
          decoration: BoxDecoration(
            color: AppColors.backgroundSecondary,
            borderRadius: BorderRadius.circular(16),
            border: Border.all(color: AppColors.border, width: 1),
          ),
          child: Row(
            children: [
              // Icon Container
              Container(
                padding: const EdgeInsets.all(14),
                decoration: BoxDecoration(
                  color: iconBackgroundColor,
                  borderRadius: BorderRadius.circular(14),
                ),
                child: Icon(icon, color: Colors.white, size: 26),
              ),
              const SizedBox(width: 16),

              // Title & Subtitle
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      children: [
                        Text(
                          title,
                          style: AppTextStyles.titleMedium.copyWith(
                            color: AppColors.textPrimary,
                            fontWeight: FontWeight.w700,
                          ),
                        ),
                        if (badge != null) ...[
                          const SizedBox(width: 8),
                          Container(
                            padding: const EdgeInsets.symmetric(
                              horizontal: 8,
                              vertical: 3,
                            ),
                            decoration: BoxDecoration(
                              color: badgeColor ?? AppColors.primary,
                              borderRadius: BorderRadius.circular(6),
                            ),
                            child: Text(
                              badge,
                              style: AppTextStyles.labelSmall.copyWith(
                                color: Colors.white,
                                fontWeight: FontWeight.w700,
                                fontSize: 9,
                              ),
                            ),
                          ),
                        ],
                      ],
                    ),
                    const SizedBox(height: 4),
                    Text(
                      subtitle,
                      style: AppTextStyles.bodySmall.copyWith(
                        color: AppColors.textTertiary,
                        height: 1.3,
                      ),
                    ),
                  ],
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
  // Incidents List
  // ===========================================================================

  Widget _buildIncidentsList() {
    if (_isLoading) {
      return Center(
        child: Padding(
          padding: const EdgeInsets.all(48),
          child: CircularProgressIndicator(
            color: AppColors.primary,
            strokeWidth: 3,
          ),
        ),
      );
    }

    if (_incidents.isEmpty) {
      return _buildEmptyState();
    }

    return ListView.separated(
      shrinkWrap: true,
      physics: const NeverScrollableScrollPhysics(),
      itemCount: _incidents.length,
      separatorBuilder: (context, index) => const SizedBox(height: 12),
      itemBuilder: (context, index) => _buildIncidentCard(_incidents[index]),
    );
  }

  Widget _buildIncidentCard(Map<String, dynamic> incident) {
    final type = incident['type'] ?? 'unknown';
    final severity = incident['severity'] ?? 'low';
    final status = incident['status'] ?? 'active';
    final respondingOfficerId = incident['responding_officer_id'];
    final createdAt = DateTime.parse(incident['created_at']);
    final timeAgo = _formatTimeAgo(createdAt);

    final hasResponder = respondingOfficerId != null;
    final isResponding = status == 'responding' || status == 'in_progress';

    return Material(
      color: Colors.transparent,
      child: InkWell(
        onTap: () => _showIncidentDetails(incident),
        borderRadius: BorderRadius.circular(16),
        child: Container(
          padding: const EdgeInsets.all(16),
          decoration: BoxDecoration(
            color: isResponding
                ? AppColors.primary.withValues(alpha: 0.05)
                : AppColors.backgroundSecondary,
            borderRadius: BorderRadius.circular(16),
            border: Border.all(
              color: isResponding
                  ? AppColors.primary.withValues(alpha: 0.3)
                  : AppColors.border,
              width: 1,
            ),
          ),
          child: Row(
            children: [
              // Incident Icon with Badge
              Stack(
                children: [
                  Container(
                    padding: const EdgeInsets.all(12),
                    decoration: BoxDecoration(
                      color: _getSeverityColor(severity).withValues(alpha: 0.15),
                      borderRadius: BorderRadius.circular(14),
                    ),
                    child: Icon(
                      _getIncidentIcon(type),
                      color: _getSeverityColor(severity),
                      size: 24,
                    ),
                  ),
                  if (hasResponder)
                    Positioned(
                      right: -2,
                      bottom: -2,
                      child: Container(
                        padding: const EdgeInsets.all(3),
                        decoration: BoxDecoration(
                          color: AppColors.success,
                          shape: BoxShape.circle,
                          border: Border.all(
                            color: AppColors.backgroundSecondary,
                            width: 2,
                          ),
                        ),
                        child: const Icon(
                          Icons.local_police_rounded,
                          size: 10,
                          color: Colors.white,
                        ),
                      ),
                    ),
                ],
              ),
              const SizedBox(width: 14),

              // Content
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      _formatIncidentType(type),
                      style: AppTextStyles.titleSmall.copyWith(
                        color: AppColors.textPrimary,
                        fontWeight: FontWeight.w700,
                      ),
                    ),
                    const SizedBox(height: 4),
                    Text(
                      incident['address'] ?? 'Unknown location',
                      style: AppTextStyles.bodySmall.copyWith(
                        color: AppColors.textTertiary,
                      ),
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                    ),
                    const SizedBox(height: 6),
                    Row(
                      children: [
                        Icon(
                          Icons.access_time_rounded,
                          size: 14,
                          color: AppColors.textTertiary,
                        ),
                        const SizedBox(width: 4),
                        Text(
                          timeAgo,
                          style: AppTextStyles.labelSmall.copyWith(
                            color: AppColors.textTertiary,
                          ),
                        ),
                        if (isResponding) ...[
                          const SizedBox(width: 12),
                          Container(
                            padding: const EdgeInsets.symmetric(
                              horizontal: 8,
                              vertical: 3,
                            ),
                            decoration: BoxDecoration(
                              color: AppColors.success.withValues(alpha: 0.15),
                              borderRadius: BorderRadius.circular(6),
                            ),
                            child: Row(
                              mainAxisSize: MainAxisSize.min,
                              children: [
                                Icon(
                                  Icons.local_police_rounded,
                                  size: 12,
                                  color: AppColors.success,
                                ),
                                const SizedBox(width: 4),
                                Text(
                                  'Responding',
                                  style: AppTextStyles.labelSmall.copyWith(
                                    color: AppColors.success,
                                    fontWeight: FontWeight.w600,
                                    fontSize: 10,
                                  ),
                                ),
                              ],
                            ),
                          ),
                        ],
                      ],
                    ),
                  ],
                ),
              ),

              // Severity Badge
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
                decoration: BoxDecoration(
                  color: _getSeverityColor(severity).withValues(alpha: 0.15),
                  borderRadius: BorderRadius.circular(8),
                ),
                child: Text(
                  severity.toUpperCase(),
                  style: AppTextStyles.labelSmall.copyWith(
                    color: _getSeverityColor(severity),
                    fontWeight: FontWeight.w700,
                    fontSize: 10,
                  ),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildEmptyState() {
    return Container(
      padding: const EdgeInsets.symmetric(vertical: 48),
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Container(
            padding: const EdgeInsets.all(20),
            decoration: BoxDecoration(
              color: AppColors.success.withValues(alpha: 0.1),
              shape: BoxShape.circle,
            ),
            child: Icon(
              Icons.check_circle_outline_rounded,
              size: 48,
              color: AppColors.success.withValues(alpha: 0.6),
            ),
          ),
          const SizedBox(height: 20),
          Text(
            'No incidents nearby',
            style: AppTextStyles.titleMedium.copyWith(
              color: AppColors.textSecondary,
              fontWeight: FontWeight.w600,
            ),
          ),
          const SizedBox(height: 8),
          Text(
            'Traffic is clear in your area',
            style: AppTextStyles.bodyMedium.copyWith(
              color: AppColors.textTertiary,
            ),
          ),
        ],
      ),
    );
  }

  // ===========================================================================
  // Floating Action Button
  // ===========================================================================

  Widget _buildFloatingActionButton() {
    return Container(
      decoration: BoxDecoration(
        borderRadius: BorderRadius.circular(16),
        boxShadow: [
          BoxShadow(
            color: AppColors.primary.withValues(alpha: 0.3),
            blurRadius: 16,
            spreadRadius: 2,
            offset: const Offset(0, 4),
          ),
        ],
      ),
      child: FloatingActionButton.extended(
        onPressed: () => Navigator.of(context).pushNamed('/report'),
        backgroundColor: AppColors.primary,
        elevation: 0,
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(16),
        ),
        icon: const Icon(Icons.videocam_rounded, color: Colors.white),
        label: Text(
          'Report Incident',
          style: AppTextStyles.labelLarge.copyWith(
            color: Colors.white,
            fontWeight: FontWeight.w700,
          ),
        ),
      ),
    );
  }

  // ===========================================================================
  // Bottom Navigation Bar
  // ===========================================================================

  Widget _buildBottomNavigationBar() {
    return Container(
      decoration: BoxDecoration(
        color: AppColors.backgroundSecondary,
        border: Border(
          top: BorderSide(color: AppColors.border, width: 1),
        ),
      ),
      child: SafeArea(
        child: Padding(
          padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
          child: Row(
            mainAxisAlignment: MainAxisAlignment.spaceAround,
            children: [
              _buildNavItem(
                icon: Icons.home_rounded,
                label: 'Home',
                index: 0,
              ),
              _buildNavItem(
                icon: Icons.map_rounded,
                label: 'Map',
                index: 1,
              ),
              _buildNavItem(
                icon: Icons.person_rounded,
                label: 'Profile',
                index: 2,
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildNavItem({
    required IconData icon,
    required String label,
    required int index,
  }) {
    final isSelected = _selectedNavIndex == index;

    return GestureDetector(
      onTap: () {
        setState(() => _selectedNavIndex = index);

        switch (index) {
          case 0:
            // Home - already here
            break;
          case 1:
            Navigator.of(context).pushNamed('/map');
            break;
          case 2:
            Navigator.of(context).pushNamed('/profile');
            break;
        }
      },
      child: AnimatedContainer(
        duration: const Duration(milliseconds: 200),
        padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 10),
        decoration: BoxDecoration(
          color: isSelected ? AppColors.primary.withValues(alpha: 0.1) : Colors.transparent,
          borderRadius: BorderRadius.circular(12),
        ),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(
              icon,
              color: isSelected ? AppColors.primary : AppColors.textTertiary,
              size: 24,
            ),
            const SizedBox(height: 4),
            Text(
              label,
              style: AppTextStyles.labelSmall.copyWith(
                color: isSelected ? AppColors.primary : AppColors.textTertiary,
                fontWeight: isSelected ? FontWeight.w700 : FontWeight.w500,
              ),
            ),
          ],
        ),
      ),
    );
  }

  // ===========================================================================
  // Incident Details Bottom Sheet (Preserved functionality)
  // ===========================================================================

  void _showIncidentDetails(Map<String, dynamic> incident) {
    final isPolice = _userRole == 'police';
    final status = incident['status'] ?? 'active';
    final latitude = incident['latitude'];
    final longitude = incident['longitude'];

    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (context) {
        return Container(
          decoration: BoxDecoration(
            color: AppColors.backgroundSecondary,
            borderRadius: const BorderRadius.vertical(top: Radius.circular(24)),
          ),
          padding: const EdgeInsets.all(24),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              // Handle bar
              Center(
                child: Container(
                  width: 40,
                  height: 4,
                  decoration: BoxDecoration(
                    color: AppColors.border,
                    borderRadius: BorderRadius.circular(2),
                  ),
                ),
              ),
              const SizedBox(height: 20),

              // Header with severity indicator
              Row(
                children: [
                  Container(
                    padding: const EdgeInsets.all(14),
                    decoration: BoxDecoration(
                      color: _getSeverityColor(incident['severity'] ?? 'low')
                          .withValues(alpha: 0.15),
                      borderRadius: BorderRadius.circular(14),
                    ),
                    child: Icon(
                      _getIncidentIcon(incident['type'] ?? 'unknown'),
                      color: _getSeverityColor(incident['severity'] ?? 'low'),
                      size: 28,
                    ),
                  ),
                  const SizedBox(width: 16),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          _formatIncidentType(incident['type'] ?? 'Unknown'),
                          style: AppTextStyles.headlineSmall.copyWith(
                            color: AppColors.textPrimary,
                            fontWeight: FontWeight.w700,
                          ),
                        ),
                        const SizedBox(height: 4),
                        Container(
                          padding: const EdgeInsets.symmetric(
                            horizontal: 10,
                            vertical: 4,
                          ),
                          decoration: BoxDecoration(
                            color: _getSeverityColor(incident['severity'] ?? 'low'),
                            borderRadius: BorderRadius.circular(6),
                          ),
                          child: Text(
                            (incident['severity'] ?? 'unknown').toUpperCase(),
                            style: AppTextStyles.labelSmall.copyWith(
                              color: Colors.white,
                              fontWeight: FontWeight.w700,
                            ),
                          ),
                        ),
                      ],
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 24),

              // Details
              _buildDetailRow(
                  icon: Icons.category_rounded,
                  label: 'Type',
                  value: _formatIncidentType(incident['type'] ?? 'Unknown')),
              _buildDetailRow(
                  icon: Icons.priority_high_rounded,
                  label: 'Severity',
                  value: (incident['severity'] ?? 'Unknown').toString().toUpperCase()),
              _buildDetailRow(
                  icon: Icons.info_rounded,
                  label: 'Status',
                  value: _formatIncidentType(status)),
              _buildDetailRow(
                  icon: Icons.location_on_rounded,
                  label: 'Location',
                  value: incident['address'] ?? 'Unknown'),
              if (incident['description'] != null)
                _buildDetailRow(
                    icon: Icons.description_rounded,
                    label: 'Description',
                    value: incident['description']),
              if (incident['reported_by_name'] != null)
                _buildDetailRow(
                    icon: Icons.person_rounded,
                    label: 'Reported by',
                    value: incident['reported_by_name']),

              const SizedBox(height: 24),

              // Action buttons based on role
              if (isPolice && status == 'active') ...[
                // Police action buttons
                Row(
                  children: [
                    Expanded(
                      child: SizedBox(
                        height: 52,
                        child: ElevatedButton.icon(
                          onPressed: () {
                            Navigator.pop(context);
                            _respondToIncident(incident, 'responding');
                          },
                          style: ElevatedButton.styleFrom(
                            backgroundColor: AppColors.success,
                            foregroundColor: Colors.white,
                            elevation: 0,
                            shape: RoundedRectangleBorder(
                              borderRadius: BorderRadius.circular(14),
                            ),
                          ),
                          icon: const Icon(Icons.check_circle_rounded, size: 20),
                          label: Text(
                            'Respond',
                            style: AppTextStyles.labelLarge.copyWith(
                              color: Colors.white,
                              fontWeight: FontWeight.w700,
                            ),
                          ),
                        ),
                      ),
                    ),
                    const SizedBox(width: 12),
                    Expanded(
                      child: SizedBox(
                        height: 52,
                        child: ElevatedButton.icon(
                          onPressed: (latitude != null && longitude != null)
                              ? () {
                                  Navigator.pop(context);
                                  _navigateToIncident(incident);
                                }
                              : null,
                          style: ElevatedButton.styleFrom(
                            backgroundColor: AppColors.primary,
                            foregroundColor: Colors.white,
                            disabledBackgroundColor: AppColors.primary.withValues(alpha: 0.4),
                            elevation: 0,
                            shape: RoundedRectangleBorder(
                              borderRadius: BorderRadius.circular(14),
                            ),
                          ),
                          icon: const Icon(Icons.navigation_rounded, size: 20),
                          label: Text(
                            'Navigate',
                            style: AppTextStyles.labelLarge.copyWith(
                              color: Colors.white,
                              fontWeight: FontWeight.w700,
                            ),
                          ),
                        ),
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 12),
                SizedBox(
                  width: double.infinity,
                  height: 52,
                  child: OutlinedButton.icon(
                    onPressed: () {
                      Navigator.pop(context);
                      Navigator.of(context).pushNamed('/map');
                    },
                    style: OutlinedButton.styleFrom(
                      side: BorderSide(color: AppColors.border, width: 1.5),
                      shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(14),
                      ),
                    ),
                    icon: Icon(Icons.map_rounded, color: AppColors.textSecondary, size: 20),
                    label: Text(
                      'View on Map',
                      style: AppTextStyles.labelLarge.copyWith(
                        color: AppColors.textSecondary,
                        fontWeight: FontWeight.w600,
                      ),
                    ),
                  ),
                ),
              ] else ...[
                // Non-police or non-active - just show map button
                SizedBox(
                  width: double.infinity,
                  height: 52,
                  child: ElevatedButton.icon(
                    onPressed: () {
                      Navigator.pop(context);
                      Navigator.of(context).pushNamed('/map');
                    },
                    style: ElevatedButton.styleFrom(
                      backgroundColor: AppColors.primary,
                      foregroundColor: Colors.white,
                      elevation: 0,
                      shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(14),
                      ),
                    ),
                    icon: const Icon(Icons.map_rounded, size: 20),
                    label: Text(
                      'View on Map',
                      style: AppTextStyles.labelLarge.copyWith(
                        color: Colors.white,
                        fontWeight: FontWeight.w700,
                      ),
                    ),
                  ),
                ),
              ],
              const SizedBox(height: 16),
            ],
          ),
        );
      },
    );
  }

  Widget _buildDetailRow({
    required IconData icon,
    required String label,
    required String value,
  }) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 12),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Icon(icon, color: AppColors.textTertiary, size: 18),
          const SizedBox(width: 10),
          SizedBox(
            width: 80,
            child: Text(
              label,
              style: AppTextStyles.bodySmall.copyWith(
                color: AppColors.textTertiary,
                fontWeight: FontWeight.w500,
              ),
            ),
          ),
          Expanded(
            child: Text(
              value,
              style: AppTextStyles.bodyMedium.copyWith(
                color: AppColors.textPrimary,
                fontWeight: FontWeight.w500,
              ),
            ),
          ),
        ],
      ),
    );
  }

  // ===========================================================================
  // Police Response Functions (Preserved functionality)
  // ===========================================================================

  Future<void> _respondToIncident(
      Map<String, dynamic> incident, String action) async {
    try {
      final incidentId = incident['id'];
      final authService = AuthService();
      final token = await authService.getToken();
      final userData = await authService.getUserData();

      if (token == null) {
        _showSnackBar('Please login again', isError: true);
        return;
      }

      // Call backend to update incident status
      final response = await http.put(
        Uri.parse('${AppConfig.baseUrl}/api/incidents/$incidentId/respond'),
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer $token',
        },
        body: json.encode({
          'action': action,
          'response_notes': 'Officer responding to incident',
        }),
      );

      if (response.statusCode == 200) {
        _showSnackBar('You are now responding to this incident');

        // Emit socket event to notify others
        final wsService =
            Provider.of<WebSocketService>(context, listen: false);
        wsService.emit('incident:response', {
          'incidentId': incidentId,
          'action': action,
          'officerId': userData?['id'],
          'officerName': userData?['full_name'] ?? 'Officer',
        });

        // Ask if user wants to navigate
        _showNavigationPrompt(incident);

        // Refresh incidents list
        _loadNearbyIncidents();
      } else {
        final error = json.decode(response.body);
        _showSnackBar(error['error'] ?? 'Failed to respond', isError: true);
      }
    } catch (e) {
      _showSnackBar('Error: $e', isError: true);
    }
  }

  void _showNavigationPrompt(Map<String, dynamic> incident) {
    final latitude = incident['latitude'];
    final longitude = incident['longitude'];

    if (latitude == null || longitude == null) return;

    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        backgroundColor: AppColors.backgroundSecondary,
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
        title: Text(
          'Navigate to Incident?',
          style: AppTextStyles.titleLarge.copyWith(
            color: AppColors.textPrimary,
            fontWeight: FontWeight.w700,
          ),
        ),
        content: Text(
          'Do you want to open navigation to the incident location?',
          style: AppTextStyles.bodyMedium.copyWith(
            color: AppColors.textSecondary,
          ),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context),
            child: Text(
              'Later',
              style: AppTextStyles.labelLarge.copyWith(
                color: AppColors.textTertiary,
              ),
            ),
          ),
          ElevatedButton(
            onPressed: () {
              Navigator.pop(context);
              _navigateToIncident(incident);
            },
            style: ElevatedButton.styleFrom(
              backgroundColor: AppColors.primary,
              elevation: 0,
              shape: RoundedRectangleBorder(
                borderRadius: BorderRadius.circular(12),
              ),
            ),
            child: Text(
              'Navigate',
              style: AppTextStyles.labelLarge.copyWith(
                color: Colors.white,
                fontWeight: FontWeight.w600,
              ),
            ),
          ),
        ],
      ),
    );
  }

  Future<void> _navigateToIncident(Map<String, dynamic> incident) async {
    final latitude = incident['latitude'];
    final longitude = incident['longitude'];

    if (latitude == null || longitude == null) {
      _showSnackBar('Location coordinates not available', isWarning: true);
      return;
    }

    // Open Google Maps navigation
    final url =
        'https://www.google.com/maps/dir/?api=1&destination=$latitude,$longitude&travelmode=driving';
    final uri = Uri.parse(url);

    if (await canLaunchUrl(uri)) {
      await launchUrl(uri, mode: LaunchMode.externalApplication);
    } else {
      _showSnackBar('Could not open maps application', isError: true);
    }
  }

  // ===========================================================================
  // Helper Methods
  // ===========================================================================

  void _showSnackBar(String message,
      {bool isError = false, bool isWarning = false}) {
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Row(
          children: [
            Icon(
              isError
                  ? Icons.error_outline_rounded
                  : isWarning
                      ? Icons.warning_amber_rounded
                      : Icons.check_circle_outline_rounded,
              color: Colors.white,
              size: 20,
            ),
            const SizedBox(width: 12),
            Expanded(
              child: Text(
                message,
                style: AppTextStyles.bodyMedium.copyWith(color: Colors.white),
              ),
            ),
          ],
        ),
        backgroundColor:
            isError ? AppColors.error : isWarning ? AppColors.warning : AppColors.success,
        behavior: SnackBarBehavior.floating,
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
        margin: const EdgeInsets.all(16),
      ),
    );
  }

  Color _getSeverityColor(String severity) {
    switch (severity.toLowerCase()) {
      case 'critical':
        return AppColors.error;
      case 'high':
        return const Color(0xFFEA580C);
      case 'medium':
        return AppColors.warning;
      case 'low':
        return AppColors.primary;
      default:
        return AppColors.textTertiary;
    }
  }

  IconData _getIncidentIcon(String type) {
    switch (type.toLowerCase()) {
      case 'congestion':
        return Icons.traffic_rounded;
      case 'accident':
        return Icons.car_crash_rounded;
      case 'road_blockage':
        return Icons.block_rounded;
      default:
        return Icons.warning_rounded;
    }
  }

  String _formatIncidentType(String type) {
    return type.replaceAll('_', ' ').split(' ').map((word) {
      if (word.isEmpty) return word;
      return word[0].toUpperCase() + word.substring(1);
    }).join(' ');
  }

  String _formatTimeAgo(DateTime dateTime) {
    final diff = DateTime.now().difference(dateTime);

    if (diff.inDays > 0) {
      return '${diff.inDays}d ago';
    } else if (diff.inHours > 0) {
      return '${diff.inHours}h ago';
    } else if (diff.inMinutes > 0) {
      return '${diff.inMinutes}m ago';
    } else {
      return 'Just now';
    }
  }
}
