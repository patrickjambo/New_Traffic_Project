import 'package:flutter/material.dart';
import 'package:geolocator/geolocator.dart';
import 'package:intl/intl.dart';
import '../services/deployment_service.dart';
import 'package:url_launcher/url_launcher.dart';

/// Deployments screen for police officers
/// Shows assigned deployments with acknowledgment functionality
class DeploymentsScreen extends StatefulWidget {
  const DeploymentsScreen({super.key});

  @override
  State<DeploymentsScreen> createState() => _DeploymentsScreenState();
}

class _DeploymentsScreenState extends State<DeploymentsScreen> with SingleTickerProviderStateMixin {
  final DeploymentService _deploymentService = DeploymentService();
  late TabController _tabController;
  
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

  void _setupRealtimeListeners() {
    _deploymentService.onNewDeployment = (deployment) {
      setState(() {
        if (deployment.needsAcknowledgment) {
          _pendingDeployments.insert(0, deployment);
        } else {
          _activeDeployments.insert(0, deployment);
        }
      });
      _showDeploymentNotification(deployment);
    };

    _deploymentService.onDeploymentUpdated = (deployment) {
      _loadDeployments(); // Refresh all
    };

    _deploymentService.onDeploymentCancelled = (deploymentId) {
      setState(() {
        _pendingDeployments.removeWhere((d) => d.id == deploymentId);
        _activeDeployments.removeWhere((d) => d.id == deploymentId);
      });
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('A deployment has been cancelled'),
          backgroundColor: Colors.orange,
        ),
      );
    };
  }

  void _showDeploymentNotification(Deployment deployment) {
    showDialog(
      context: context,
      barrierDismissible: false,
      builder: (context) => AlertDialog(
        title: Row(
          children: [
            Icon(
              deployment.priority == 'critical' ? Icons.warning : Icons.assignment,
              color: _getPriorityColor(deployment.priority ?? 'normal'),
            ),
            const SizedBox(width: 8),
            const Text('New Deployment'),
          ],
        ),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              deployment.unitName,
              style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 18),
            ),
            const SizedBox(height: 8),
            if (deployment.address != null)
              Text('📍 ${deployment.address}'),
            const SizedBox(height: 4),
            Text('Type: ${deployment.deploymentType}'),
            Text('Priority: ${deployment.priority ?? 'Normal'}'),
            if (deployment.instructions != null) ...[
              const SizedBox(height: 8),
              Text(
                'Instructions: ${deployment.instructions}',
                style: const TextStyle(fontStyle: FontStyle.italic),
              ),
            ],
          ],
        ),
        actions: [
          TextButton(
            onPressed: () {
              Navigator.pop(context);
              _tabController.animateTo(0); // Go to pending tab
            },
            child: const Text('View Details'),
          ),
          ElevatedButton(
            onPressed: () async {
              Navigator.pop(context);
              await _acknowledgeDeployment(deployment);
            },
            style: ElevatedButton.styleFrom(
              backgroundColor: Colors.green,
              foregroundColor: Colors.white,
            ),
            child: const Text('Acknowledge'),
          ),
        ],
      ),
    );
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

  Future<void> _acknowledgeDeployment(Deployment deployment) async {
    final result = await _deploymentService.acknowledgeDeployment(deployment.id);
    
    if (result['success'] == true) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('Deployment acknowledged successfully'),
          backgroundColor: Colors.green,
        ),
      );
      _loadDeployments();
    } else {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(result['message'] ?? 'Failed to acknowledge'),
          backgroundColor: Colors.red,
        ),
      );
    }
  }

  Future<void> _updateStatus(Deployment deployment, String newStatus) async {
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
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text('Status updated to: ${_getStatusLabel(newStatus)}'),
          backgroundColor: Colors.green,
        ),
      );
      _loadDeployments();
    } else {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(result['message'] ?? 'Failed to update status'),
          backgroundColor: Colors.red,
        ),
      );
    }
  }

  String _getStatusLabel(String status) {
    switch (status) {
      case 'en_route': return 'En Route';
      case 'on_scene': return 'On Scene';
      case 'completed': return 'Completed';
      case 'unable': return 'Unable';
      default: return status;
    }
  }

  Color _getPriorityColor(String priority) {
    switch (priority.toLowerCase()) {
      case 'critical': return Colors.red;
      case 'high': return Colors.orange;
      case 'normal': return Colors.blue;
      case 'low': return Colors.grey;
      default: return Colors.blue;
    }
  }

  Color _getStatusColor(String? status) {
    switch (status?.toLowerCase()) {
      case 'assigned': return Colors.grey;
      case 'en_route': return Colors.blue;
      case 'on_scene': return Colors.orange;
      case 'completed': return Colors.green;
      case 'unable': return Colors.red;
      default: return Colors.grey;
    }
  }

  Future<void> _openInMaps(Deployment deployment) async {
    if (deployment.latitude != null && deployment.longitude != null) {
      final url = 'https://www.google.com/maps/dir/?api=1&destination=${deployment.latitude},${deployment.longitude}';
      if (await canLaunchUrl(Uri.parse(url))) {
        await launchUrl(Uri.parse(url), mode: LaunchMode.externalApplication);
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('My Deployments'),
        bottom: TabBar(
          controller: _tabController,
          tabs: [
            Tab(
              child: Row(
                mainAxisSize: MainAxisSize.min,
                children: [
                  const Text('Pending'),
                  if (_pendingDeployments.isNotEmpty)
                    Container(
                      margin: const EdgeInsets.only(left: 4),
                      padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                      decoration: BoxDecoration(
                        color: Colors.red,
                        borderRadius: BorderRadius.circular(10),
                      ),
                      child: Text(
                        '${_pendingDeployments.length}',
                        style: const TextStyle(color: Colors.white, fontSize: 12),
                      ),
                    ),
                ],
              ),
            ),
            Tab(
              child: Row(
                mainAxisSize: MainAxisSize.min,
                children: [
                  const Text('Active'),
                  if (_activeDeployments.isNotEmpty)
                    Container(
                      margin: const EdgeInsets.only(left: 4),
                      padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                      decoration: BoxDecoration(
                        color: Colors.green,
                        borderRadius: BorderRadius.circular(10),
                      ),
                      child: Text(
                        '${_activeDeployments.length}',
                        style: const TextStyle(color: Colors.white, fontSize: 12),
                      ),
                    ),
                ],
              ),
            ),
            const Tab(text: 'History'),
          ],
        ),
        actions: [
          IconButton(
            icon: const Icon(Icons.refresh),
            onPressed: _loadDeployments,
          ),
        ],
      ),
      body: _isLoading
          ? const Center(child: CircularProgressIndicator())
          : _error != null
              ? Center(
                  child: Column(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      Text('Error: $_error'),
                      const SizedBox(height: 16),
                      ElevatedButton(
                        onPressed: _loadDeployments,
                        child: const Text('Retry'),
                      ),
                    ],
                  ),
                )
              : TabBarView(
                  controller: _tabController,
                  children: [
                    _buildDeploymentList(_pendingDeployments, isPending: true),
                    _buildDeploymentList(_activeDeployments, isActive: true),
                    _buildDeploymentList(_completedDeployments, isHistory: true),
                  ],
                ),
    );
  }

  Widget _buildDeploymentList(List<Deployment> deployments, {
    bool isPending = false,
    bool isActive = false,
    bool isHistory = false,
  }) {
    if (deployments.isEmpty) {
      return Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(
              isPending ? Icons.inbox : (isActive ? Icons.assignment : Icons.history),
              size: 64,
              color: Colors.grey,
            ),
            const SizedBox(height: 16),
            Text(
              isPending
                  ? 'No pending deployments'
                  : (isActive ? 'No active deployments' : 'No deployment history'),
              style: const TextStyle(color: Colors.grey, fontSize: 16),
            ),
          ],
        ),
      );
    }

    return RefreshIndicator(
      onRefresh: _loadDeployments,
      child: ListView.builder(
        padding: const EdgeInsets.all(8),
        itemCount: deployments.length,
        itemBuilder: (context, index) {
          final deployment = deployments[index];
          return _buildDeploymentCard(deployment, isPending: isPending, isActive: isActive);
        },
      ),
    );
  }

  Widget _buildDeploymentCard(Deployment deployment, {
    bool isPending = false,
    bool isActive = false,
  }) {
    return Card(
      margin: const EdgeInsets.symmetric(vertical: 8),
      elevation: isPending ? 4 : 2,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(12),
        side: isPending
            ? BorderSide(color: _getPriorityColor(deployment.priority ?? 'normal'), width: 2)
            : BorderSide.none,
      ),
      child: InkWell(
        onTap: () => _showDeploymentDetails(deployment, isPending: isPending, isActive: isActive),
        borderRadius: BorderRadius.circular(12),
        child: Padding(
          padding: const EdgeInsets.all(16),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              // Header
              Row(
                children: [
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                    decoration: BoxDecoration(
                      color: _getPriorityColor(deployment.priority ?? 'normal').withOpacity(0.1),
                      borderRadius: BorderRadius.circular(8),
                      border: Border.all(
                        color: _getPriorityColor(deployment.priority ?? 'normal'),
                      ),
                    ),
                    child: Text(
                      deployment.priority?.toUpperCase() ?? 'NORMAL',
                      style: TextStyle(
                        color: _getPriorityColor(deployment.priority ?? 'normal'),
                        fontWeight: FontWeight.bold,
                        fontSize: 12,
                      ),
                    ),
                  ),
                  const SizedBox(width: 8),
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                    decoration: BoxDecoration(
                      color: Colors.grey[200],
                      borderRadius: BorderRadius.circular(8),
                    ),
                    child: Text(
                      deployment.deploymentType,
                      style: TextStyle(
                        color: Colors.grey[700],
                        fontSize: 12,
                      ),
                    ),
                  ),
                  const Spacer(),
                  if (isActive && deployment.officerStatus != null)
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                      decoration: BoxDecoration(
                        color: _getStatusColor(deployment.officerStatus).withOpacity(0.1),
                        borderRadius: BorderRadius.circular(8),
                        border: Border.all(color: _getStatusColor(deployment.officerStatus)),
                      ),
                      child: Text(
                        _getStatusLabel(deployment.officerStatus!),
                        style: TextStyle(
                          color: _getStatusColor(deployment.officerStatus),
                          fontWeight: FontWeight.bold,
                          fontSize: 12,
                        ),
                      ),
                    ),
                ],
              ),
              
              const SizedBox(height: 12),
              
              // Title
              Text(
                deployment.unitName,
                style: const TextStyle(
                  fontSize: 18,
                  fontWeight: FontWeight.bold,
                ),
              ),
              
              const SizedBox(height: 8),
              
              // Location
              if (deployment.address != null)
                Row(
                  children: [
                    const Icon(Icons.location_on, size: 16, color: Colors.grey),
                    const SizedBox(width: 4),
                    Expanded(
                      child: Text(
                        deployment.address!,
                        style: const TextStyle(color: Colors.grey),
                        maxLines: 2,
                        overflow: TextOverflow.ellipsis,
                      ),
                    ),
                    if (deployment.latitude != null && deployment.longitude != null)
                      IconButton(
                        icon: const Icon(Icons.directions, color: Colors.blue),
                        onPressed: () => _openInMaps(deployment),
                        tooltip: 'Navigate',
                        padding: EdgeInsets.zero,
                        constraints: const BoxConstraints(),
                      ),
                  ],
                ),
              
              const SizedBox(height: 8),
              
              // Time
              Row(
                children: [
                  const Icon(Icons.access_time, size: 16, color: Colors.grey),
                  const SizedBox(width: 4),
                  Text(
                    DateFormat('MMM d, yyyy h:mm a').format(deployment.createdAt),
                    style: const TextStyle(color: Colors.grey, fontSize: 12),
                  ),
                ],
              ),
              
              // Instructions
              if (deployment.instructions != null) ...[
                const SizedBox(height: 8),
                Container(
                  width: double.infinity,
                  padding: const EdgeInsets.all(8),
                  decoration: BoxDecoration(
                    color: Colors.blue[50],
                    borderRadius: BorderRadius.circular(8),
                  ),
                  child: Row(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      const Icon(Icons.info_outline, size: 16, color: Colors.blue),
                      const SizedBox(width: 8),
                      Expanded(
                        child: Text(
                          deployment.instructions!,
                          style: const TextStyle(fontSize: 13),
                        ),
                      ),
                    ],
                  ),
                ),
              ],
              
              const SizedBox(height: 16),
              
              // Action Buttons
              if (isPending)
                SizedBox(
                  width: double.infinity,
                  child: ElevatedButton.icon(
                    onPressed: () => _acknowledgeDeployment(deployment),
                    icon: const Icon(Icons.check),
                    label: const Text('ACKNOWLEDGE'),
                    style: ElevatedButton.styleFrom(
                      backgroundColor: Colors.green,
                      foregroundColor: Colors.white,
                      padding: const EdgeInsets.symmetric(vertical: 12),
                    ),
                  ),
                ),
              
              if (isActive)
                _buildStatusButtons(deployment),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildStatusButtons(Deployment deployment) {
    final currentStatus = deployment.officerStatus ?? 'assigned';
    
    return Wrap(
      spacing: 8,
      runSpacing: 8,
      children: [
        if (currentStatus == 'en_route' || currentStatus == 'assigned')
          OutlinedButton.icon(
            onPressed: () => _updateStatus(deployment, 'on_scene'),
            icon: const Icon(Icons.place),
            label: const Text('On Scene'),
            style: OutlinedButton.styleFrom(foregroundColor: Colors.orange),
          ),
        if (currentStatus != 'completed')
          OutlinedButton.icon(
            onPressed: () => _showCompletionDialog(deployment),
            icon: const Icon(Icons.check_circle),
            label: const Text('Complete'),
            style: OutlinedButton.styleFrom(foregroundColor: Colors.green),
          ),
        if (currentStatus != 'completed' && currentStatus != 'unable')
          OutlinedButton.icon(
            onPressed: () => _showUnableDialog(deployment),
            icon: const Icon(Icons.cancel),
            label: const Text('Unable'),
            style: OutlinedButton.styleFrom(foregroundColor: Colors.red),
          ),
      ],
    );
  }

  void _showCompletionDialog(Deployment deployment) {
    final notesController = TextEditingController();
    
    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Complete Deployment'),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            const Text('Add any final notes about this deployment:'),
            const SizedBox(height: 16),
            TextField(
              controller: notesController,
              maxLines: 3,
              decoration: const InputDecoration(
                hintText: 'Notes (optional)',
                border: OutlineInputBorder(),
              ),
            ),
          ],
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context),
            child: const Text('Cancel'),
          ),
          ElevatedButton(
            onPressed: () async {
              Navigator.pop(context);
              final result = await _deploymentService.markCompleted(
                deployment.id,
                notes: notesController.text.isNotEmpty ? notesController.text : null,
              );
              
              if (result['success'] == true) {
                ScaffoldMessenger.of(context).showSnackBar(
                  const SnackBar(
                    content: Text('Deployment completed'),
                    backgroundColor: Colors.green,
                  ),
                );
                _loadDeployments();
              }
            },
            style: ElevatedButton.styleFrom(backgroundColor: Colors.green),
            child: const Text('Complete'),
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
        title: const Text('Unable to Respond'),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            const Text('Please provide a reason:'),
            const SizedBox(height: 16),
            TextField(
              controller: reasonController,
              maxLines: 3,
              decoration: const InputDecoration(
                hintText: 'Reason (required)',
                border: OutlineInputBorder(),
              ),
            ),
          ],
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context),
            child: const Text('Cancel'),
          ),
          ElevatedButton(
            onPressed: () async {
              if (reasonController.text.isEmpty) {
                ScaffoldMessenger.of(context).showSnackBar(
                  const SnackBar(
                    content: Text('Please provide a reason'),
                    backgroundColor: Colors.red,
                  ),
                );
                return;
              }
              
              Navigator.pop(context);
              final result = await _deploymentService.markUnable(
                deployment.id,
                reasonController.text,
              );
              
              if (result['success'] == true) {
                ScaffoldMessenger.of(context).showSnackBar(
                  const SnackBar(
                    content: Text('Status updated'),
                    backgroundColor: Colors.orange,
                  ),
                );
                _loadDeployments();
              }
            },
            style: ElevatedButton.styleFrom(backgroundColor: Colors.red),
            child: const Text('Submit'),
          ),
        ],
      ),
    );
  }

  void _showDeploymentDetails(Deployment deployment, {
    bool isPending = false,
    bool isActive = false,
  }) {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
      ),
      builder: (context) => DraggableScrollableSheet(
        initialChildSize: 0.7,
        minChildSize: 0.5,
        maxChildSize: 0.95,
        expand: false,
        builder: (context, scrollController) => SingleChildScrollView(
          controller: scrollController,
          padding: const EdgeInsets.all(20),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              // Handle
              Center(
                child: Container(
                  width: 40,
                  height: 4,
                  decoration: BoxDecoration(
                    color: Colors.grey[300],
                    borderRadius: BorderRadius.circular(2),
                  ),
                ),
              ),
              
              const SizedBox(height: 20),
              
              // Header
              Row(
                children: [
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                    decoration: BoxDecoration(
                      color: _getPriorityColor(deployment.priority ?? 'normal'),
                      borderRadius: BorderRadius.circular(8),
                    ),
                    child: Text(
                      deployment.priority?.toUpperCase() ?? 'NORMAL',
                      style: const TextStyle(
                        color: Colors.white,
                        fontWeight: FontWeight.bold,
                      ),
                    ),
                  ),
                  const SizedBox(width: 8),
                  Chip(
                    label: Text(deployment.deploymentType),
                    backgroundColor: Colors.grey[200],
                  ),
                ],
              ),
              
              const SizedBox(height: 16),
              
              // Title
              Text(
                deployment.unitName,
                style: const TextStyle(
                  fontSize: 24,
                  fontWeight: FontWeight.bold,
                ),
              ),
              
              const SizedBox(height: 16),
              
              // Details Card
              Card(
                child: Padding(
                  padding: const EdgeInsets.all(16),
                  child: Column(
                    children: [
                      _detailRow(Icons.location_on, 'Location', deployment.address ?? 'Not specified'),
                      const Divider(),
                      _detailRow(Icons.category, 'Type', deployment.typeDetails),
                      const Divider(),
                      _detailRow(Icons.warning, 'Severity', deployment.severity),
                      const Divider(),
                      _detailRow(Icons.access_time, 'Created', DateFormat('MMM d, yyyy h:mm a').format(deployment.createdAt)),
                      if (deployment.acknowledgedAt != null) ...[
                        const Divider(),
                        _detailRow(Icons.check_circle, 'Acknowledged', DateFormat('MMM d, yyyy h:mm a').format(deployment.acknowledgedAt!)),
                      ],
                      if (deployment.estimatedDuration != null) ...[
                        const Divider(),
                        _detailRow(Icons.timer, 'Est. Duration', '${deployment.estimatedDuration} minutes'),
                      ],
                    ],
                  ),
                ),
              ),
              
              // Instructions
              if (deployment.instructions != null) ...[
                const SizedBox(height: 16),
                const Text(
                  'Instructions',
                  style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
                ),
                const SizedBox(height: 8),
                Card(
                  color: Colors.blue[50],
                  child: Padding(
                    padding: const EdgeInsets.all(16),
                    child: Text(deployment.instructions!),
                  ),
                ),
              ],
              
              // Incident/Emergency Details
              if (deployment.incidentDescription != null) ...[
                const SizedBox(height: 16),
                const Text(
                  'Incident Details',
                  style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
                ),
                const SizedBox(height: 8),
                Card(
                  child: Padding(
                    padding: const EdgeInsets.all(16),
                    child: Text(deployment.incidentDescription!),
                  ),
                ),
              ],
              
              if (deployment.emergencyDescription != null) ...[
                const SizedBox(height: 16),
                const Text(
                  'Emergency Details',
                  style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
                ),
                const SizedBox(height: 8),
                Card(
                  child: Padding(
                    padding: const EdgeInsets.all(16),
                    child: Text(deployment.emergencyDescription!),
                  ),
                ),
              ],
              
              const SizedBox(height: 24),
              
              // Navigation Button
              if (deployment.latitude != null && deployment.longitude != null)
                SizedBox(
                  width: double.infinity,
                  child: ElevatedButton.icon(
                    onPressed: () => _openInMaps(deployment),
                    icon: const Icon(Icons.directions),
                    label: const Text('NAVIGATE TO LOCATION'),
                    style: ElevatedButton.styleFrom(
                      padding: const EdgeInsets.symmetric(vertical: 14),
                    ),
                  ),
                ),
              
              const SizedBox(height: 12),
              
              // Action Buttons
              if (isPending)
                SizedBox(
                  width: double.infinity,
                  child: ElevatedButton.icon(
                    onPressed: () {
                      Navigator.pop(context);
                      _acknowledgeDeployment(deployment);
                    },
                    icon: const Icon(Icons.check),
                    label: const Text('ACKNOWLEDGE'),
                    style: ElevatedButton.styleFrom(
                      backgroundColor: Colors.green,
                      foregroundColor: Colors.white,
                      padding: const EdgeInsets.symmetric(vertical: 14),
                    ),
                  ),
                ),
              
              if (isActive) ...[
                const SizedBox(height: 8),
                _buildStatusButtons(deployment),
              ],
              
              const SizedBox(height: 20),
            ],
          ),
        ),
      ),
    );
  }

  Widget _detailRow(IconData icon, String label, String value) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 8),
      child: Row(
        children: [
          Icon(icon, size: 20, color: Colors.grey),
          const SizedBox(width: 12),
          Text(
            '$label:',
            style: const TextStyle(color: Colors.grey),
          ),
          const SizedBox(width: 8),
          Expanded(
            child: Text(
              value,
              style: const TextStyle(fontWeight: FontWeight.w500),
              textAlign: TextAlign.right,
            ),
          ),
        ],
      ),
    );
  }

  @override
  void dispose() {
    _tabController.dispose();
    _deploymentService.dispose();
    super.dispose();
  }
}
