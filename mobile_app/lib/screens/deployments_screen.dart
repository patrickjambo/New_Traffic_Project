import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:geolocator/geolocator.dart';
import 'package:intl/intl.dart';
import '../services/deployment_service.dart';
import '../config/app_theme.dart';
import 'package:url_launcher/url_launcher.dart';

/// ============================================================================
/// Deployments Screen - TrafficGuard Mobile App
/// ============================================================================
/// Police officer deployment management screen featuring:
/// - Tabbed interface for Pending, Active, and History deployments
/// - Real-time deployment updates via WebSocket
/// - Acknowledgment and status update functionality
/// - Professional design with consistent styling
/// ============================================================================

class DeploymentsScreen extends StatefulWidget {
  const DeploymentsScreen({super.key});

  @override
  State<DeploymentsScreen> createState() => _DeploymentsScreenState();
}

class _DeploymentsScreenState extends State<DeploymentsScreen>
    with SingleTickerProviderStateMixin {
  // Service
  final DeploymentService _deploymentService = DeploymentService();

  // Controllers
  late TabController _tabController;

  // State
  List<Deployment> _pendingDeployments = [];
  List<Deployment> _activeDeployments = [];
  List<Deployment> _completedDeployments = [];
  bool _isLoading = true;
  String? _error;

  @override
  void initState() {
    super.initState();
    _tabController = TabController(length: 3, vsync: this);
    _deploymentService.initialize();
    _setupRealtimeListeners();
    _loadDeployments();
  }

  @override
  void dispose() {
    _tabController.dispose();
    _deploymentService.dispose();
    super.dispose();
  }

  void _setupRealtimeListeners() {
    _deploymentService.onNewDeployment = (deployment) {
      setState(() {
        if (deployment.needsAcknowledgment) {
          _pendingDeployments.insert(0, deployment);
          // Switch to Pending tab to show new deployment
          _tabController.animateTo(0);
        } else {
          _activeDeployments.insert(0, deployment);
          // Switch to Active tab
          _tabController.animateTo(1);
        }
      });
      _showDeploymentNotification(deployment);
    };

    _deploymentService.onDeploymentUpdated = (deployment) {
      // REAL-TIME UPDATE: Update UI instantly
      setState(() {
        // Remove from pending if it was there
        _pendingDeployments.removeWhere((d) => d.id == deployment.id);
        
        // Check if deployment is now acknowledged/active
        if (deployment.acknowledged && deployment.status != 'completed') {
          // Update or add to active list
          final existingIndex = _activeDeployments.indexWhere((d) => d.id == deployment.id);
          if (existingIndex >= 0) {
            _activeDeployments[existingIndex] = deployment;
          } else {
            _activeDeployments.insert(0, deployment);
          }
          // Switch to Active tab
          _tabController.animateTo(1);
        } else if (deployment.status == 'completed') {
          // Move to completed
          _activeDeployments.removeWhere((d) => d.id == deployment.id);
          _completedDeployments.insert(0, deployment);
        }
      });
      
      // Refresh from server in background
      _loadDeployments();
    };

    _deploymentService.onDeploymentCancelled = (deploymentId) {
      setState(() {
        _pendingDeployments.removeWhere((d) => d.id == deploymentId);
        _activeDeployments.removeWhere((d) => d.id == deploymentId);
      });
      _showSnackBar('A deployment has been cancelled', isWarning: true);
    };
  }

  Future<void> _loadDeployments() async {
    setState(() {
      _isLoading = true;
      _error = null;
    });

    try {
      final results = await Future.wait([
        _deploymentService.getPendingDeployments(),
        _deploymentService.getActiveDeployments(),
        _deploymentService.getCompletedDeployments(),
      ]);

      setState(() {
        _pendingDeployments = results[0];
        _activeDeployments = results[1].where((d) => d.acknowledged).toList();
        _completedDeployments = results[2];
        _isLoading = false;
      });
    } catch (e) {
      setState(() {
        _error = e.toString();
        _isLoading = false;
      });
    }
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
        child: Column(
          children: [
            // Custom App Bar
            _buildAppBar(),

            // Tab Bar
            _buildTabBar(),

            // Content
            Expanded(
              child: _isLoading
                  ? _buildLoadingState()
                  : _error != null
                      ? _buildErrorState()
                      : TabBarView(
                          controller: _tabController,
                          children: [
                            _buildDeploymentList(_pendingDeployments,
                                isPending: true),
                            _buildDeploymentList(_activeDeployments,
                                isActive: true),
                            _buildDeploymentList(_completedDeployments,
                                isHistory: true),
                          ],
                        ),
            ),
          ],
        ),
      ),
    );
  }

  // ===========================================================================
  // App Bar
  // ===========================================================================

  Widget _buildAppBar() {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
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
              icon: Icon(
                Icons.arrow_back_ios_rounded,
                color: AppColors.textSecondary,
                size: 20,
              ),
              onPressed: () => Navigator.pop(context),
            ),
          ),
          const SizedBox(width: 16),

          // Title
          Text(
            'My Deployments',
            style: AppTextStyles.headlineSmall.copyWith(
              color: AppColors.textPrimary,
              fontWeight: FontWeight.w700,
            ),
          ),

          const Spacer(),

          // Refresh Button
          Container(
            decoration: BoxDecoration(
              color: AppColors.backgroundSecondary,
              borderRadius: BorderRadius.circular(12),
              border: Border.all(color: AppColors.border, width: 1),
            ),
            child: IconButton(
              icon: Icon(
                Icons.refresh_rounded,
                color: AppColors.textSecondary,
                size: 22,
              ),
              onPressed: _loadDeployments,
            ),
          ),
        ],
      ),
    );
  }

  // ===========================================================================
  // Tab Bar
  // ===========================================================================

  Widget _buildTabBar() {
    return Container(
      margin: const EdgeInsets.symmetric(horizontal: 16),
      decoration: BoxDecoration(
        color: AppColors.backgroundSecondary,
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: AppColors.border, width: 1),
      ),
      child: TabBar(
        controller: _tabController,
        indicator: BoxDecoration(
          color: AppColors.primary,
          borderRadius: BorderRadius.circular(12),
        ),
        indicatorSize: TabBarIndicatorSize.tab,
        indicatorPadding: const EdgeInsets.all(4),
        labelColor: Colors.white,
        unselectedLabelColor: AppColors.textTertiary,
        labelStyle: AppTextStyles.labelLarge.copyWith(fontWeight: FontWeight.w700),
        unselectedLabelStyle: AppTextStyles.labelLarge,
        dividerColor: Colors.transparent,
        tabs: [
          _buildTabItem('Pending', _pendingDeployments.length, AppColors.error),
          _buildTabItem('Active', _activeDeployments.length, AppColors.success),
          const Tab(text: 'History'),
        ],
      ),
    );
  }

  Widget _buildTabItem(String label, int count, Color badgeColor) {
    return Tab(
      child: Row(
        mainAxisSize: MainAxisSize.min,
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Text(label),
          if (count > 0) ...[
            const SizedBox(width: 6),
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 7, vertical: 2),
              decoration: BoxDecoration(
                color: badgeColor,
                borderRadius: BorderRadius.circular(10),
              ),
              child: Text(
                '$count',
                style: AppTextStyles.labelSmall.copyWith(
                  color: Colors.white,
                  fontWeight: FontWeight.w700,
                  fontSize: 11,
                ),
              ),
            ),
          ],
        ],
      ),
    );
  }

  // ===========================================================================
  // Loading & Error States
  // ===========================================================================

  Widget _buildLoadingState() {
    return Center(
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          CircularProgressIndicator(
            color: AppColors.primary,
            strokeWidth: 3,
          ),
          const SizedBox(height: 16),
          Text(
            'Loading deployments...',
            style: AppTextStyles.bodyMedium.copyWith(
              color: AppColors.textTertiary,
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildErrorState() {
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(32),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Container(
              padding: const EdgeInsets.all(20),
              decoration: BoxDecoration(
                color: AppColors.error.withOpacity(0.1),
                shape: BoxShape.circle,
              ),
              child: Icon(
                Icons.error_outline_rounded,
                size: 48,
                color: AppColors.error,
              ),
            ),
            const SizedBox(height: 20),
            Text(
              'Failed to load deployments',
              style: AppTextStyles.titleMedium.copyWith(
                color: AppColors.textPrimary,
                fontWeight: FontWeight.w600,
              ),
            ),
            const SizedBox(height: 8),
            Text(
              _error ?? 'Unknown error',
              textAlign: TextAlign.center,
              style: AppTextStyles.bodySmall.copyWith(
                color: AppColors.textTertiary,
              ),
            ),
            const SizedBox(height: 24),
            SizedBox(
              height: 48,
              child: ElevatedButton.icon(
                onPressed: _loadDeployments,
                icon: const Icon(Icons.refresh_rounded, size: 20),
                label: Text(
                  'Retry',
                  style: AppTextStyles.labelLarge.copyWith(
                    color: Colors.white,
                    fontWeight: FontWeight.w600,
                  ),
                ),
                style: ElevatedButton.styleFrom(
                  backgroundColor: AppColors.primary,
                  elevation: 0,
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(12),
                  ),
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }

  // ===========================================================================
  // Deployment List
  // ===========================================================================

  Widget _buildDeploymentList(
    List<Deployment> deployments, {
    bool isPending = false,
    bool isActive = false,
    bool isHistory = false,
  }) {
    if (deployments.isEmpty) {
      return _buildEmptyState(isPending, isActive, isHistory);
    }

    return RefreshIndicator(
      onRefresh: _loadDeployments,
      color: AppColors.primary,
      backgroundColor: AppColors.backgroundSecondary,
      child: ListView.builder(
        padding: const EdgeInsets.all(16),
        itemCount: deployments.length,
        itemBuilder: (context, index) {
          final deployment = deployments[index];
          return _buildDeploymentCard(
            deployment,
            isPending: isPending,
            isActive: isActive,
          );
        },
      ),
    );
  }

  Widget _buildEmptyState(bool isPending, bool isActive, bool isHistory) {
    IconData icon;
    String title;
    String subtitle;

    if (isPending) {
      icon = Icons.inbox_rounded;
      title = 'No pending deployments';
      subtitle = 'New assignments will appear here';
    } else if (isActive) {
      icon = Icons.assignment_rounded;
      title = 'No active deployments';
      subtitle = 'Acknowledged deployments will appear here';
    } else {
      icon = Icons.history_rounded;
      title = 'No deployment history';
      subtitle = 'Completed deployments will appear here';
    }

    return Center(
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Container(
            padding: const EdgeInsets.all(20),
            decoration: BoxDecoration(
              color: AppColors.backgroundSecondary,
              shape: BoxShape.circle,
              border: Border.all(color: AppColors.border, width: 1),
            ),
            child: Icon(icon, size: 48, color: AppColors.textTertiary),
          ),
          const SizedBox(height: 20),
          Text(
            title,
            style: AppTextStyles.titleMedium.copyWith(
              color: AppColors.textSecondary,
              fontWeight: FontWeight.w600,
            ),
          ),
          const SizedBox(height: 8),
          Text(
            subtitle,
            style: AppTextStyles.bodySmall.copyWith(
              color: AppColors.textTertiary,
            ),
          ),
        ],
      ),
    );
  }

  // ===========================================================================
  // Deployment Card
  // ===========================================================================

  Widget _buildDeploymentCard(
    Deployment deployment, {
    bool isPending = false,
    bool isActive = false,
  }) {
    final priorityColor = _getPriorityColor(deployment.priority ?? 'normal');

    return Container(
      margin: const EdgeInsets.only(bottom: 16),
      decoration: BoxDecoration(
        color: AppColors.backgroundSecondary,
        borderRadius: BorderRadius.circular(20),
        border: Border.all(
          color: isPending ? priorityColor.withOpacity(0.5) : AppColors.border,
          width: isPending ? 2 : 1,
        ),
      ),
      child: Material(
        color: Colors.transparent,
        child: InkWell(
          onTap: () => _showDeploymentDetails(
            deployment,
            isPending: isPending,
            isActive: isActive,
          ),
          borderRadius: BorderRadius.circular(20),
          child: Padding(
            padding: const EdgeInsets.all(20),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                // Header Row
                Row(
                  children: [
                    // Priority Badge
                    _buildBadge(
                      text: (deployment.priority ?? 'NORMAL').toUpperCase(),
                      color: priorityColor,
                      filled: true,
                    ),
                    const SizedBox(width: 8),
                    // Type Badge
                    _buildBadge(
                      text: deployment.deploymentType,
                      color: AppColors.textTertiary,
                    ),
                    const Spacer(),
                    // Status Badge (for active)
                    if (isActive && deployment.officerStatus != null)
                      _buildBadge(
                        text: _getStatusLabel(deployment.officerStatus!),
                        color: _getStatusColor(deployment.officerStatus),
                        filled: true,
                      ),
                  ],
                ),

                const SizedBox(height: 16),

                // Title
                Text(
                  deployment.unitName,
                  style: AppTextStyles.titleLarge.copyWith(
                    color: AppColors.textPrimary,
                    fontWeight: FontWeight.w700,
                  ),
                ),

                const SizedBox(height: 12),

                // Location Row
                if (deployment.address != null)
                  Row(
                    children: [
                      Icon(
                        Icons.location_on_rounded,
                        size: 18,
                        color: AppColors.textTertiary,
                      ),
                      const SizedBox(width: 8),
                      Expanded(
                        child: Text(
                          deployment.address!,
                          style: AppTextStyles.bodySmall.copyWith(
                            color: AppColors.textSecondary,
                          ),
                          maxLines: 2,
                          overflow: TextOverflow.ellipsis,
                        ),
                      ),
                      if (deployment.latitude != null &&
                          deployment.longitude != null)
                        Container(
                          padding: const EdgeInsets.all(8),
                          decoration: BoxDecoration(
                            color: AppColors.primary.withOpacity(0.1),
                            borderRadius: BorderRadius.circular(10),
                          ),
                          child: InkWell(
                            onTap: () => _openInMaps(deployment),
                            child: Icon(
                              Icons.directions_rounded,
                              size: 20,
                              color: AppColors.primary,
                            ),
                          ),
                        ),
                    ],
                  ),

                const SizedBox(height: 12),

                // Time Row
                Row(
                  children: [
                    Icon(
                      Icons.access_time_rounded,
                      size: 16,
                      color: AppColors.textTertiary,
                    ),
                    const SizedBox(width: 8),
                    Text(
                      DateFormat('MMM d, yyyy h:mm a')
                          .format(deployment.createdAt),
                      style: AppTextStyles.labelSmall.copyWith(
                        color: AppColors.textTertiary,
                      ),
                    ),
                  ],
                ),

                // Instructions
                if (deployment.instructions != null) ...[
                  const SizedBox(height: 16),
                  Container(
                    width: double.infinity,
                    padding: const EdgeInsets.all(14),
                    decoration: BoxDecoration(
                      color: AppColors.primary.withOpacity(0.08),
                      borderRadius: BorderRadius.circular(12),
                      border: Border.all(
                        color: AppColors.primary.withOpacity(0.2),
                        width: 1,
                      ),
                    ),
                    child: Row(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Icon(
                          Icons.info_outline_rounded,
                          size: 18,
                          color: AppColors.primary,
                        ),
                        const SizedBox(width: 10),
                        Expanded(
                          child: Text(
                            deployment.instructions!,
                            style: AppTextStyles.bodySmall.copyWith(
                              color: AppColors.textSecondary,
                              height: 1.4,
                            ),
                          ),
                        ),
                      ],
                    ),
                  ),
                ],

                const SizedBox(height: 20),

                // Action Buttons
                if (isPending) _buildAcknowledgeButton(deployment),
                if (isActive) _buildStatusButtons(deployment),
              ],
            ),
          ),
        ),
      ),
    );
  }

  Widget _buildBadge({
    required String text,
    required Color color,
    bool filled = false,
  }) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
      decoration: BoxDecoration(
        color: filled ? color : color.withOpacity(0.1),
        borderRadius: BorderRadius.circular(8),
        border: filled ? null : Border.all(color: color.withOpacity(0.3)),
      ),
      child: Text(
        text,
        style: AppTextStyles.labelSmall.copyWith(
          color: filled ? Colors.white : color,
          fontWeight: FontWeight.w700,
          fontSize: 11,
        ),
      ),
    );
  }

  // ===========================================================================
  // Action Buttons - ALL USING AppColors.primary
  // ===========================================================================

  Widget _buildAcknowledgeButton(Deployment deployment) {
    return SizedBox(
      width: double.infinity,
      height: 52,
      child: ElevatedButton.icon(
        onPressed: () => _acknowledgeDeployment(deployment),
        icon: const Icon(Icons.check_rounded, size: 22),
        label: Text(
          'ACKNOWLEDGE',
          style: AppTextStyles.labelLarge.copyWith(
            color: Colors.white,
            fontWeight: FontWeight.w700,
            letterSpacing: 0.5,
          ),
        ),
        style: ElevatedButton.styleFrom(
          backgroundColor: AppColors.primary,
          foregroundColor: Colors.white,
          elevation: 0,
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(14),
          ),
        ),
      ),
    );
  }

  Widget _buildStatusButtons(Deployment deployment) {
    final currentStatus = deployment.officerStatus ?? 'assigned';

    return Wrap(
      spacing: 10,
      runSpacing: 10,
      children: [
        // On Scene Button
        if (currentStatus == 'en_route' || currentStatus == 'assigned')
          _buildActionButton(
            label: 'On Scene',
            icon: Icons.location_on_rounded,
            onPressed: () => _updateStatus(deployment, 'on_scene'),
          ),

        // Complete Button
        if (currentStatus != 'completed')
          _buildActionButton(
            label: 'Complete',
            icon: Icons.check_circle_rounded,
            onPressed: () => _showCompletionDialog(deployment),
          ),

        // Unable Button
        if (currentStatus != 'completed' && currentStatus != 'unable')
          _buildActionButton(
            label: 'Unable',
            icon: Icons.cancel_rounded,
            onPressed: () => _showUnableDialog(deployment),
            isDestructive: true,
          ),
      ],
    );
  }

  Widget _buildActionButton({
    required String label,
    required IconData icon,
    required VoidCallback onPressed,
    bool isDestructive = false,
  }) {
    return OutlinedButton.icon(
      onPressed: onPressed,
      icon: Icon(icon, size: 18),
      label: Text(
        label,
        style: AppTextStyles.labelMedium.copyWith(
          fontWeight: FontWeight.w600,
        ),
      ),
      style: OutlinedButton.styleFrom(
        foregroundColor: isDestructive ? AppColors.error : AppColors.primary,
        side: BorderSide(
          color: isDestructive
              ? AppColors.error.withOpacity(0.5)
              : AppColors.primary.withOpacity(0.5),
          width: 1.5,
        ),
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(12),
        ),
      ),
    );
  }

  // ===========================================================================
  // Dialogs
  // ===========================================================================

  void _showDeploymentNotification(Deployment deployment) {
    showDialog(
      context: context,
      barrierDismissible: false,
      builder: (context) => AlertDialog(
        backgroundColor: AppColors.backgroundSecondary,
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
        title: Row(
          children: [
            Container(
              padding: const EdgeInsets.all(10),
              decoration: BoxDecoration(
                color: _getPriorityColor(deployment.priority ?? 'normal')
                    .withOpacity(0.15),
                borderRadius: BorderRadius.circular(12),
              ),
              child: Icon(
                deployment.priority == 'critical'
                    ? Icons.warning_rounded
                    : Icons.assignment_rounded,
                color: _getPriorityColor(deployment.priority ?? 'normal'),
                size: 24,
              ),
            ),
            const SizedBox(width: 12),
            Text(
              'New Deployment',
              style: AppTextStyles.titleLarge.copyWith(
                color: AppColors.textPrimary,
                fontWeight: FontWeight.w700,
              ),
            ),
          ],
        ),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              deployment.unitName,
              style: AppTextStyles.titleMedium.copyWith(
                color: AppColors.textPrimary,
                fontWeight: FontWeight.w600,
              ),
            ),
            const SizedBox(height: 12),
            if (deployment.address != null)
              _buildDialogDetailRow(
                Icons.location_on_rounded,
                deployment.address!,
              ),
            const SizedBox(height: 8),
            _buildDialogDetailRow(
              Icons.category_rounded,
              'Type: ${deployment.deploymentType}',
            ),
            const SizedBox(height: 8),
            _buildDialogDetailRow(
              Icons.priority_high_rounded,
              'Priority: ${deployment.priority ?? 'Normal'}',
            ),
            if (deployment.instructions != null) ...[
              const SizedBox(height: 12),
              Container(
                padding: const EdgeInsets.all(12),
                decoration: BoxDecoration(
                  color: AppColors.primary.withOpacity(0.08),
                  borderRadius: BorderRadius.circular(10),
                ),
                child: Text(
                  deployment.instructions!,
                  style: AppTextStyles.bodySmall.copyWith(
                    color: AppColors.textSecondary,
                    fontStyle: FontStyle.italic,
                  ),
                ),
              ),
            ],
          ],
        ),
        actions: [
          TextButton(
            onPressed: () {
              Navigator.pop(context);
              _tabController.animateTo(0);
            },
            child: Text(
              'View Details',
              style: AppTextStyles.labelLarge.copyWith(
                color: AppColors.textTertiary,
              ),
            ),
          ),
          ElevatedButton(
            onPressed: () async {
              Navigator.pop(context);
              await _acknowledgeDeployment(deployment);
            },
            style: ElevatedButton.styleFrom(
              backgroundColor: AppColors.primary,
              foregroundColor: Colors.white,
              elevation: 0,
              shape: RoundedRectangleBorder(
                borderRadius: BorderRadius.circular(12),
              ),
            ),
            child: Text(
              'Acknowledge',
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

  Widget _buildDialogDetailRow(IconData icon, String text) {
    return Row(
      children: [
        Icon(icon, size: 18, color: AppColors.textTertiary),
        const SizedBox(width: 10),
        Expanded(
          child: Text(
            text,
            style: AppTextStyles.bodySmall.copyWith(
              color: AppColors.textSecondary,
            ),
          ),
        ),
      ],
    );
  }

  void _showCompletionDialog(Deployment deployment) {
    final notesController = TextEditingController();

    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        backgroundColor: AppColors.backgroundSecondary,
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
        title: Text(
          'Complete Deployment',
          style: AppTextStyles.titleLarge.copyWith(
            color: AppColors.textPrimary,
            fontWeight: FontWeight.w700,
          ),
        ),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              'Add any final notes about this deployment:',
              style: AppTextStyles.bodyMedium.copyWith(
                color: AppColors.textSecondary,
              ),
            ),
            const SizedBox(height: 16),
            TextField(
              controller: notesController,
              maxLines: 3,
              style: AppTextStyles.bodyMedium.copyWith(
                color: AppColors.textPrimary,
              ),
              decoration: InputDecoration(
                hintText: 'Notes (optional)',
                hintStyle: AppTextStyles.bodyMedium.copyWith(
                  color: AppColors.textTertiary,
                ),
                filled: true,
                fillColor: AppColors.background,
                border: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(12),
                  borderSide: BorderSide(color: AppColors.border),
                ),
                enabledBorder: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(12),
                  borderSide: BorderSide(color: AppColors.border),
                ),
                focusedBorder: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(12),
                  borderSide: BorderSide(color: AppColors.primary, width: 2),
                ),
              ),
            ),
          ],
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context),
            child: Text(
              'Cancel',
              style: AppTextStyles.labelLarge.copyWith(
                color: AppColors.textTertiary,
              ),
            ),
          ),
          ElevatedButton(
            onPressed: () async {
              Navigator.pop(context);
              
              // Instantly update UI for real-time feel
              final updatedDeployment = Deployment(
                id: deployment.id,
                incidentId: deployment.incidentId,
                officerId: deployment.officerId,
                assignedBy: deployment.assignedBy,
                officerStatus: 'completed',
                deployedAt: deployment.deployedAt,
                acknowledgedAt: deployment.acknowledgedAt,
                completedAt: DateTime.now(),
                notes: notesController.text.isNotEmpty ? notesController.text : deployment.notes,
                latitude: deployment.latitude,
                longitude: deployment.longitude,
                incidentType: deployment.incidentType,
                incidentLocation: deployment.incidentLocation,
                incidentDescription: deployment.incidentDescription,
                officerName: deployment.officerName,
                assignerName: deployment.assignerName,
                priority: deployment.priority,
                incidentLatitude: deployment.incidentLatitude,
                incidentLongitude: deployment.incidentLongitude,
              );
              
              setState(() {
                final activeIndex = _activeDeployments.indexWhere((d) => d.id == deployment.id);
                if (activeIndex != -1) {
                  _activeDeployments.removeAt(activeIndex);
                  _completedDeployments.insert(0, updatedDeployment);
                  // Switch to History tab
                  _tabController.animateTo(2);
                }
              });
              
              _showSnackBar('Deployment completed');
              
              // Call API in background
              final result = await _deploymentService.markCompleted(
                deployment.id,
                notes: notesController.text.isNotEmpty
                    ? notesController.text
                    : null,
              );

              if (result['success'] == true) {
                _loadDeployments();
              } else {
                // Revert on failure
                _loadDeployments();
              }
            },
            style: ElevatedButton.styleFrom(
              backgroundColor: AppColors.primary,
              elevation: 0,
              shape: RoundedRectangleBorder(
                borderRadius: BorderRadius.circular(12),
              ),
            ),
            child: Text(
              'Complete',
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

  void _showUnableDialog(Deployment deployment) {
    final reasonController = TextEditingController();

    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        backgroundColor: AppColors.backgroundSecondary,
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
        title: Text(
          'Unable to Respond',
          style: AppTextStyles.titleLarge.copyWith(
            color: AppColors.textPrimary,
            fontWeight: FontWeight.w700,
          ),
        ),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              'Please provide a reason:',
              style: AppTextStyles.bodyMedium.copyWith(
                color: AppColors.textSecondary,
              ),
            ),
            const SizedBox(height: 16),
            TextField(
              controller: reasonController,
              maxLines: 3,
              style: AppTextStyles.bodyMedium.copyWith(
                color: AppColors.textPrimary,
              ),
              decoration: InputDecoration(
                hintText: 'Reason (required)',
                hintStyle: AppTextStyles.bodyMedium.copyWith(
                  color: AppColors.textTertiary,
                ),
                filled: true,
                fillColor: AppColors.background,
                border: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(12),
                  borderSide: BorderSide(color: AppColors.border),
                ),
                enabledBorder: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(12),
                  borderSide: BorderSide(color: AppColors.border),
                ),
                focusedBorder: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(12),
                  borderSide: BorderSide(color: AppColors.primary, width: 2),
                ),
              ),
            ),
          ],
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context),
            child: Text(
              'Cancel',
              style: AppTextStyles.labelLarge.copyWith(
                color: AppColors.textTertiary,
              ),
            ),
          ),
          ElevatedButton(
            onPressed: () async {
              if (reasonController.text.isEmpty) {
                _showSnackBar('Please provide a reason', isError: true);
                return;
              }

              Navigator.pop(context);
              
              // Instantly update UI for real-time feel
              final updatedDeployment = Deployment(
                id: deployment.id,
                incidentId: deployment.incidentId,
                officerId: deployment.officerId,
                assignedBy: deployment.assignedBy,
                officerStatus: 'unable',
                deployedAt: deployment.deployedAt,
                acknowledgedAt: deployment.acknowledgedAt,
                completedAt: DateTime.now(),
                notes: reasonController.text,
                latitude: deployment.latitude,
                longitude: deployment.longitude,
                incidentType: deployment.incidentType,
                incidentLocation: deployment.incidentLocation,
                incidentDescription: deployment.incidentDescription,
                officerName: deployment.officerName,
                assignerName: deployment.assignerName,
                priority: deployment.priority,
                incidentLatitude: deployment.incidentLatitude,
                incidentLongitude: deployment.incidentLongitude,
              );
              
              setState(() {
                // Remove from active or pending
                final activeIndex = _activeDeployments.indexWhere((d) => d.id == deployment.id);
                if (activeIndex != -1) {
                  _activeDeployments.removeAt(activeIndex);
                  _completedDeployments.insert(0, updatedDeployment);
                  // Switch to History tab
                  _tabController.animateTo(2);
                } else {
                  final pendingIndex = _pendingDeployments.indexWhere((d) => d.id == deployment.id);
                  if (pendingIndex != -1) {
                    _pendingDeployments.removeAt(pendingIndex);
                    _completedDeployments.insert(0, updatedDeployment);
                    _tabController.animateTo(2);
                  }
                }
              });
              
              _showSnackBar('Status updated', isWarning: true);
              
              // Call API in background
              final result = await _deploymentService.markUnable(
                deployment.id,
                reasonController.text,
              );

              if (result['success'] == true) {
                _loadDeployments();
              } else {
                // Revert on failure
                _loadDeployments();
              }
            },
            style: ElevatedButton.styleFrom(
              backgroundColor: AppColors.error,
              elevation: 0,
              shape: RoundedRectangleBorder(
                borderRadius: BorderRadius.circular(12),
              ),
            ),
            child: Text(
              'Submit',
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

  // ===========================================================================
  // Deployment Details Bottom Sheet
  // ===========================================================================

  void _showDeploymentDetails(
    Deployment deployment, {
    bool isPending = false,
    bool isActive = false,
  }) {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (context) => DraggableScrollableSheet(
        initialChildSize: 0.75,
        minChildSize: 0.5,
        maxChildSize: 0.95,
        expand: false,
        builder: (context, scrollController) => Container(
          decoration: BoxDecoration(
            color: AppColors.backgroundSecondary,
            borderRadius: const BorderRadius.vertical(top: Radius.circular(24)),
          ),
          child: SingleChildScrollView(
            controller: scrollController,
            padding: const EdgeInsets.all(24),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                // Handle
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

                const SizedBox(height: 24),

                // Header Badges
                Row(
                  children: [
                    _buildBadge(
                      text: (deployment.priority ?? 'NORMAL').toUpperCase(),
                      color: _getPriorityColor(deployment.priority ?? 'normal'),
                      filled: true,
                    ),
                    const SizedBox(width: 10),
                    _buildBadge(
                      text: deployment.deploymentType,
                      color: AppColors.textTertiary,
                    ),
                  ],
                ),

                const SizedBox(height: 20),

                // Title
                Text(
                  deployment.unitName,
                  style: AppTextStyles.headlineMedium.copyWith(
                    color: AppColors.textPrimary,
                    fontWeight: FontWeight.w800,
                  ),
                ),

                const SizedBox(height: 24),

                // Details Card
                Container(
                  padding: const EdgeInsets.all(20),
                  decoration: BoxDecoration(
                    color: AppColors.background,
                    borderRadius: BorderRadius.circular(16),
                    border: Border.all(color: AppColors.border),
                  ),
                  child: Column(
                    children: [
                      _buildDetailItem(
                        Icons.location_on_rounded,
                        'Location',
                        deployment.address ?? 'Not specified',
                      ),
                      _buildDivider(),
                      _buildDetailItem(
                        Icons.category_rounded,
                        'Type',
                        deployment.typeDetails,
                      ),
                      _buildDivider(),
                      _buildDetailItem(
                        Icons.warning_rounded,
                        'Severity',
                        deployment.severity,
                      ),
                      _buildDivider(),
                      _buildDetailItem(
                        Icons.access_time_rounded,
                        'Created',
                        DateFormat('MMM d, yyyy h:mm a')
                            .format(deployment.createdAt),
                      ),
                      if (deployment.acknowledgedAt != null) ...[
                        _buildDivider(),
                        _buildDetailItem(
                          Icons.check_circle_rounded,
                          'Acknowledged',
                          DateFormat('MMM d, yyyy h:mm a')
                              .format(deployment.acknowledgedAt!),
                        ),
                      ],
                      if (deployment.estimatedDuration != null) ...[
                        _buildDivider(),
                        _buildDetailItem(
                          Icons.timer_rounded,
                          'Est. Duration',
                          '${deployment.estimatedDuration} minutes',
                        ),
                      ],
                    ],
                  ),
                ),

                // Instructions
                if (deployment.instructions != null) ...[
                  const SizedBox(height: 24),
                  Text(
                    'Instructions',
                    style: AppTextStyles.titleMedium.copyWith(
                      color: AppColors.textPrimary,
                      fontWeight: FontWeight.w700,
                    ),
                  ),
                  const SizedBox(height: 12),
                  Container(
                    width: double.infinity,
                    padding: const EdgeInsets.all(16),
                    decoration: BoxDecoration(
                      color: AppColors.primary.withOpacity(0.08),
                      borderRadius: BorderRadius.circular(14),
                      border: Border.all(
                        color: AppColors.primary.withOpacity(0.2),
                      ),
                    ),
                    child: Text(
                      deployment.instructions!,
                      style: AppTextStyles.bodyMedium.copyWith(
                        color: AppColors.textSecondary,
                        height: 1.5,
                      ),
                    ),
                  ),
                ],

                // Incident/Emergency Details
                if (deployment.incidentDescription != null) ...[
                  const SizedBox(height: 24),
                  Text(
                    'Incident Details',
                    style: AppTextStyles.titleMedium.copyWith(
                      color: AppColors.textPrimary,
                      fontWeight: FontWeight.w700,
                    ),
                  ),
                  const SizedBox(height: 12),
                  Container(
                    width: double.infinity,
                    padding: const EdgeInsets.all(16),
                    decoration: BoxDecoration(
                      color: AppColors.background,
                      borderRadius: BorderRadius.circular(14),
                      border: Border.all(color: AppColors.border),
                    ),
                    child: Text(
                      deployment.incidentDescription!,
                      style: AppTextStyles.bodyMedium.copyWith(
                        color: AppColors.textSecondary,
                        height: 1.5,
                      ),
                    ),
                  ),
                ],

                if (deployment.emergencyDescription != null) ...[
                  const SizedBox(height: 24),
                  Text(
                    'Emergency Details',
                    style: AppTextStyles.titleMedium.copyWith(
                      color: AppColors.textPrimary,
                      fontWeight: FontWeight.w700,
                    ),
                  ),
                  const SizedBox(height: 12),
                  Container(
                    width: double.infinity,
                    padding: const EdgeInsets.all(16),
                    decoration: BoxDecoration(
                      color: AppColors.error.withOpacity(0.08),
                      borderRadius: BorderRadius.circular(14),
                      border: Border.all(
                        color: AppColors.error.withOpacity(0.2),
                      ),
                    ),
                    child: Text(
                      deployment.emergencyDescription!,
                      style: AppTextStyles.bodyMedium.copyWith(
                        color: AppColors.textSecondary,
                        height: 1.5,
                      ),
                    ),
                  ),
                ],

                const SizedBox(height: 28),

                // Navigation Button
                if (deployment.latitude != null && deployment.longitude != null)
                  SizedBox(
                    width: double.infinity,
                    height: 52,
                    child: OutlinedButton.icon(
                      onPressed: () => _openInMaps(deployment),
                      icon: Icon(
                        Icons.directions_rounded,
                        color: AppColors.primary,
                        size: 22,
                      ),
                      label: Text(
                        'NAVIGATE TO LOCATION',
                        style: AppTextStyles.labelLarge.copyWith(
                          color: AppColors.primary,
                          fontWeight: FontWeight.w700,
                          letterSpacing: 0.5,
                        ),
                      ),
                      style: OutlinedButton.styleFrom(
                        side: BorderSide(
                          color: AppColors.primary.withOpacity(0.5),
                          width: 1.5,
                        ),
                        shape: RoundedRectangleBorder(
                          borderRadius: BorderRadius.circular(14),
                        ),
                      ),
                    ),
                  ),

                const SizedBox(height: 12),

                // Action Buttons
                if (isPending)
                  SizedBox(
                    width: double.infinity,
                    height: 52,
                    child: ElevatedButton.icon(
                      onPressed: () {
                        Navigator.pop(context);
                        _acknowledgeDeployment(deployment);
                      },
                      icon: const Icon(Icons.check_rounded, size: 22),
                      label: Text(
                        'ACKNOWLEDGE',
                        style: AppTextStyles.labelLarge.copyWith(
                          color: Colors.white,
                          fontWeight: FontWeight.w700,
                          letterSpacing: 0.5,
                        ),
                      ),
                      style: ElevatedButton.styleFrom(
                        backgroundColor: AppColors.primary,
                        foregroundColor: Colors.white,
                        elevation: 0,
                        shape: RoundedRectangleBorder(
                          borderRadius: BorderRadius.circular(14),
                        ),
                      ),
                    ),
                  ),

                if (isActive) ...[
                  const SizedBox(height: 8),
                  _buildStatusButtons(deployment),
                ],

                const SizedBox(height: 24),
              ],
            ),
          ),
        ),
      ),
    );
  }

  Widget _buildDetailItem(IconData icon, String label, String value) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 12),
      child: Row(
        children: [
          Icon(icon, size: 20, color: AppColors.textTertiary),
          const SizedBox(width: 14),
          Expanded(
            child: Text(
              label,
              style: AppTextStyles.bodySmall.copyWith(
                color: AppColors.textTertiary,
              ),
            ),
          ),
          Expanded(
            flex: 2,
            child: Text(
              value,
              style: AppTextStyles.bodyMedium.copyWith(
                color: AppColors.textPrimary,
                fontWeight: FontWeight.w500,
              ),
              textAlign: TextAlign.right,
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildDivider() {
    return Divider(color: AppColors.border, height: 1);
  }

  // ===========================================================================
  // Service Methods
  // ===========================================================================

  Future<void> _acknowledgeDeployment(Deployment deployment) async {
    final result =
        await _deploymentService.acknowledgeDeployment(deployment.id);

    if (result['success'] == true) {
      _showSnackBar('Deployment acknowledged successfully');
      
      // INSTANT UI UPDATE: Move deployment from pending to active
      setState(() {
        _pendingDeployments.removeWhere((d) => d.id == deployment.id);
        // Create updated deployment with acknowledged status using correct fields
        final acknowledgedDeployment = Deployment(
          id: deployment.id,
          unitName: deployment.unitName,
          address: deployment.address,
          latitude: deployment.latitude,
          longitude: deployment.longitude,
          status: 'acknowledged',
          priority: deployment.priority,
          instructions: deployment.instructions,
          scheduledTime: deployment.scheduledTime,
          estimatedDuration: deployment.estimatedDuration,
          createdAt: deployment.createdAt,
          acknowledged: true,
          acknowledgedAt: DateTime.now(),
          officerStatus: deployment.officerStatus,
          officerNotes: deployment.officerNotes,
          incidentType: deployment.incidentType,
          incidentSeverity: deployment.incidentSeverity,
          incidentDescription: deployment.incidentDescription,
          emergencyType: deployment.emergencyType,
          emergencySeverity: deployment.emergencySeverity,
          emergencyDescription: deployment.emergencyDescription,
        );
        _activeDeployments.insert(0, acknowledgedDeployment);
      });
      
      // SWITCH TO ACTIVE TAB IMMEDIATELY
      _tabController.animateTo(1); // Index 1 = Active tab
      
      // Refresh from server in background (for any other updates)
      _loadDeployments();
    } else {
      _showSnackBar(result['message'] ?? 'Failed to acknowledge', isError: true);
    }
  }

  Future<void> _updateStatus(Deployment deployment, String newStatus) async {
    // Instantly update UI before API call for real-time feel
    final updatedDeployment = Deployment(
      id: deployment.id,
      incidentId: deployment.incidentId,
      officerId: deployment.officerId,
      assignedBy: deployment.assignedBy,
      officerStatus: newStatus,
      deployedAt: deployment.deployedAt,
      acknowledgedAt: deployment.acknowledgedAt,
      completedAt: newStatus == 'completed' ? DateTime.now() : deployment.completedAt,
      notes: deployment.notes,
      latitude: deployment.latitude,
      longitude: deployment.longitude,
      incidentType: deployment.incidentType,
      incidentLocation: deployment.incidentLocation,
      incidentDescription: deployment.incidentDescription,
      officerName: deployment.officerName,
      assignerName: deployment.assignerName,
      priority: deployment.priority,
      incidentLatitude: deployment.incidentLatitude,
      incidentLongitude: deployment.incidentLongitude,
    );
    
    setState(() {
      // Update in active list
      final activeIndex = _activeDeployments.indexWhere((d) => d.id == deployment.id);
      if (activeIndex != -1) {
        if (newStatus == 'completed') {
          // Move to completed/history
          _activeDeployments.removeAt(activeIndex);
          _completedDeployments.insert(0, updatedDeployment);
          // Switch to History tab
          _tabController.animateTo(2);
        } else {
          // Update in place
          _activeDeployments[activeIndex] = updatedDeployment;
        }
      }
    });
    
    _showSnackBar('Status updated to: ${_getStatusLabel(newStatus)}');
    
    // Get position and call API in background
    Position? position;
    try {
      position = await Geolocator.getCurrentPosition(
        desiredAccuracy: LocationAccuracy.high,
      );
    } catch (e) {
      // Location not available
    }

    final result = await _deploymentService.updateMyStatus(
      deployment.id,
      newStatus,
      latitude: position?.latitude,
      longitude: position?.longitude,
    );

    if (result['success'] == true) {
      // Refresh to get server-confirmed data
      _loadDeployments();
    } else {
      // Revert on failure
      _showSnackBar(result['message'] ?? 'Failed to update status',
          isError: true);
      _loadDeployments();
    }
  }

  Future<void> _openInMaps(Deployment deployment) async {
    if (deployment.latitude != null && deployment.longitude != null) {
      final url =
          'https://www.google.com/maps/dir/?api=1&destination=${deployment.latitude},${deployment.longitude}';
      if (await canLaunchUrl(Uri.parse(url))) {
        await launchUrl(Uri.parse(url), mode: LaunchMode.externalApplication);
      }
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
        backgroundColor: isError
            ? AppColors.error
            : isWarning
                ? AppColors.warning
                : AppColors.success,
        behavior: SnackBarBehavior.floating,
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
        margin: const EdgeInsets.all(16),
      ),
    );
  }

  String _getStatusLabel(String status) {
    switch (status) {
      case 'en_route':
        return 'En Route';
      case 'on_scene':
        return 'On Scene';
      case 'completed':
        return 'Completed';
      case 'unable':
        return 'Unable';
      default:
        return status;
    }
  }

  Color _getPriorityColor(String priority) {
    switch (priority.toLowerCase()) {
      case 'critical':
        return AppColors.error;
      case 'high':
        return const Color(0xFFEA580C);
      case 'normal':
        return AppColors.primary;
      case 'low':
        return AppColors.textTertiary;
      default:
        return AppColors.primary;
    }
  }

  Color _getStatusColor(String? status) {
    switch (status?.toLowerCase()) {
      case 'assigned':
        return AppColors.textTertiary;
      case 'en_route':
        return AppColors.primary;
      case 'on_scene':
        return AppColors.warning;
      case 'completed':
        return AppColors.success;
      case 'unable':
        return AppColors.error;
      default:
        return AppColors.textTertiary;
    }
  }
}
