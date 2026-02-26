import 'package:flutter/material.dart';
import 'package:image_picker/image_picker.dart';
import 'dart:io';
import '../services/incident_service.dart';
import '../services/auth_service.dart';
import '../config/app_theme.dart';
import 'package:location/location.dart';

/// ============================================================================
/// Report Screen - TrafficGuard Mobile App
/// ============================================================================
/// Manual incident reporting screen featuring:
/// - Video capture for evidence
/// - Incident type and severity selection
/// - Location auto-detection
/// - Anonymous reporting option
/// - Consistent dark theme design
/// ============================================================================

class ReportScreen extends StatefulWidget {
  const ReportScreen({super.key});

  @override
  State<ReportScreen> createState() => _ReportScreenState();
}

class _ReportScreenState extends State<ReportScreen> {
  final _formKey = GlobalKey<FormState>();
  final _descriptionController = TextEditingController();
  final IncidentService _incidentService = IncidentService();
  final AuthService _authService = AuthService();
  final ImagePicker _picker = ImagePicker();
  
  File? _videoFile;
  String _selectedType = 'congestion';
  String _selectedSeverity = 'medium';
  bool _isAnonymous = false;
  bool _isLoading = false;
  LocationData? _currentLocation;

  @override
  void initState() {
    super.initState();
    _getCurrentLocation();
  }

  @override
  void dispose() {
    _descriptionController.dispose();
    super.dispose();
  }

  Future<void> _getCurrentLocation() async {
    final location = Location();
    
    bool serviceEnabled = await location.serviceEnabled();
    if (!serviceEnabled) {
      serviceEnabled = await location.requestService();
      if (!serviceEnabled) return;
    }

    PermissionStatus permissionGranted = await location.hasPermission();
    if (permissionGranted == PermissionStatus.denied) {
      permissionGranted = await location.requestPermission();
      if (permissionGranted != PermissionStatus.granted) return;
    }

    _currentLocation = await location.getLocation();
    setState(() {});
  }

  Future<void> _pickVideo() async {
    final XFile? video = await _picker.pickVideo(
      source: ImageSource.camera,
      maxDuration: const Duration(seconds: 30),
    );

    if (video != null) {
      setState(() {
        _videoFile = File(video.path);
      });
    }
  }

  Future<void> _submitReport() async {
    if (!_formKey.currentState!.validate()) return;

    if (_currentLocation == null) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: const Row(
            children: [
              Icon(Icons.location_off, color: Colors.white),
              SizedBox(width: 8),
              Text('Unable to get location. Please enable location services.'),
            ],
          ),
          backgroundColor: AppColors.error,
          behavior: SnackBarBehavior.floating,
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
        ),
      );
      return;
    }

    setState(() => _isLoading = true);

    final result = await _incidentService.reportIncident(
      type: _selectedType,
      severity: _selectedSeverity,
      latitude: _currentLocation!.latitude!,
      longitude: _currentLocation!.longitude!,
      description: _descriptionController.text.trim(),
      videoFile: _videoFile,
      isAnonymous: _isAnonymous,
    );

    setState(() => _isLoading = false);

    if (!mounted) return;

    if (result['success']) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: const Row(
            children: [
              Icon(Icons.check_circle, color: Colors.white),
              SizedBox(width: 8),
              Text('Incident reported successfully'),
            ],
          ),
          backgroundColor: AppColors.success,
          behavior: SnackBarBehavior.floating,
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
        ),
      );
      Navigator.of(context).pop();
    } else {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Row(
            children: [
              const Icon(Icons.error, color: Colors.white),
              const SizedBox(width: 8),
              Expanded(child: Text(result['message'] ?? 'Failed to report incident')),
            ],
          ),
          backgroundColor: AppColors.error,
          behavior: SnackBarBehavior.floating,
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
        ),
      );
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
          'Report Incident',
          style: AppTextStyles.titleLarge.copyWith(color: AppColors.textPrimary),
        ),
        centerTitle: true,
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(20),
        child: Form(
          key: _formKey,
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              // Video Capture Section
              _buildSectionHeader('Evidence', Icons.videocam_outlined),
              const SizedBox(height: 12),
              _buildVideoSection(),
              const SizedBox(height: 24),

              // Incident Type Section
              _buildSectionHeader('Incident Type', Icons.category_outlined),
              const SizedBox(height: 12),
              _buildTypeSelector(),
              const SizedBox(height: 24),

              // Severity Section
              _buildSectionHeader('Severity Level', Icons.warning_outlined),
              const SizedBox(height: 12),
              _buildSeveritySelector(),
              const SizedBox(height: 24),

              // Description Section
              _buildSectionHeader('Description', Icons.description_outlined),
              const SizedBox(height: 12),
              _buildDescriptionField(),
              const SizedBox(height: 24),

              // Location Info
              _buildLocationCard(),
              const SizedBox(height: 16),

              // Anonymous Reporting
              _buildAnonymousOption(),
              const SizedBox(height: 32),

              // Submit Button
              _buildSubmitButton(),
              const SizedBox(height: 20),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildSectionHeader(String title, IconData icon) {
    return Row(
      children: [
        Container(
          padding: const EdgeInsets.all(8),
          decoration: BoxDecoration(
            color: AppColors.primary.withValues(alpha: 0.1),
            borderRadius: BorderRadius.circular(8),
          ),
          child: Icon(icon, color: AppColors.primary, size: 18),
        ),
        const SizedBox(width: 10),
        Text(
          title,
          style: AppTextStyles.titleMedium.copyWith(color: AppColors.textPrimary),
        ),
      ],
    );
  }

  Widget _buildVideoSection() {
    return Material(
      color: AppColors.backgroundSecondary,
      borderRadius: BorderRadius.circular(16),
      child: InkWell(
        onTap: _pickVideo,
        borderRadius: BorderRadius.circular(16),
        child: Container(
          height: 180,
          decoration: BoxDecoration(
            borderRadius: BorderRadius.circular(16),
            border: Border.all(
              color: _videoFile != null ? AppColors.success : AppColors.border,
              width: _videoFile != null ? 2 : 1,
            ),
          ),
          child: _videoFile == null
              ? Column(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    Container(
                      padding: const EdgeInsets.all(16),
                      decoration: BoxDecoration(
                        color: AppColors.primary.withValues(alpha: 0.1),
                        borderRadius: BorderRadius.circular(16),
                      ),
                      child: const Icon(
                        Icons.videocam,
                        size: 40,
                        color: AppColors.primary,
                      ),
                    ),
                    const SizedBox(height: 12),
                    Text(
                      'Tap to record video',
                      style: AppTextStyles.bodyLarge.copyWith(color: AppColors.textPrimary),
                    ),
                    const SizedBox(height: 4),
                    Text(
                      'Max 30 seconds',
                      style: AppTextStyles.bodySmall.copyWith(color: AppColors.textTertiary),
                    ),
                  ],
                )
              : Stack(
                  children: [
                    Center(
                      child: Column(
                        mainAxisAlignment: MainAxisAlignment.center,
                        children: [
                          Container(
                            padding: const EdgeInsets.all(16),
                            decoration: BoxDecoration(
                              color: AppColors.success.withValues(alpha: 0.1),
                              borderRadius: BorderRadius.circular(16),
                            ),
                            child: const Icon(
                              Icons.video_file,
                              size: 40,
                              color: AppColors.success,
                            ),
                          ),
                          const SizedBox(height: 12),
                          Text(
                            'Video recorded',
                            style: AppTextStyles.bodyLarge.copyWith(color: AppColors.success),
                          ),
                          Text(
                            'Tap to re-record',
                            style: AppTextStyles.bodySmall.copyWith(color: AppColors.textTertiary),
                          ),
                        ],
                      ),
                    ),
                    Positioned(
                      top: 8,
                      right: 8,
                      child: IconButton(
                        icon: Container(
                          padding: const EdgeInsets.all(6),
                          decoration: BoxDecoration(
                            color: AppColors.error.withValues(alpha: 0.1),
                            borderRadius: BorderRadius.circular(8),
                          ),
                          child: const Icon(Icons.close, color: AppColors.error, size: 18),
                        ),
                        onPressed: () {
                          setState(() => _videoFile = null);
                        },
                      ),
                    ),
                  ],
                ),
        ),
      ),
    );
  }

  Widget _buildTypeSelector() {
    final types = [
      {'value': 'congestion', 'label': 'Traffic Congestion', 'icon': Icons.traffic},
      {'value': 'accident', 'label': 'Accident', 'icon': Icons.car_crash},
      {'value': 'road_blockage', 'label': 'Road Blockage', 'icon': Icons.block},
      {'value': 'other', 'label': 'Other', 'icon': Icons.more_horiz},
    ];

    return Container(
      padding: const EdgeInsets.all(4),
      decoration: BoxDecoration(
        color: AppColors.backgroundSecondary,
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: AppColors.border),
      ),
      child: Column(
        children: types.map((type) {
          final isSelected = _selectedType == type['value'];
          return Padding(
            padding: const EdgeInsets.only(bottom: 4),
            child: Material(
              color: isSelected ? AppColors.primary.withValues(alpha: 0.1) : Colors.transparent,
              borderRadius: BorderRadius.circular(10),
              child: InkWell(
                onTap: () => setState(() => _selectedType = type['value'] as String),
                borderRadius: BorderRadius.circular(10),
                child: Padding(
                  padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
                  child: Row(
                    children: [
                      Icon(
                        type['icon'] as IconData,
                        color: isSelected ? AppColors.primary : AppColors.textTertiary,
                        size: 22,
                      ),
                      const SizedBox(width: 14),
                      Expanded(
                        child: Text(
                          type['label'] as String,
                          style: AppTextStyles.bodyMedium.copyWith(
                            color: isSelected ? AppColors.primary : AppColors.textSecondary,
                            fontWeight: isSelected ? FontWeight.w600 : FontWeight.normal,
                          ),
                        ),
                      ),
                      if (isSelected)
                        const Icon(Icons.check_circle, color: AppColors.primary, size: 20),
                    ],
                  ),
                ),
              ),
            ),
          );
        }).toList(),
      ),
    );
  }

  Widget _buildSeveritySelector() {
    final severities = [
      {'value': 'low', 'label': 'Low', 'color': AppColors.success},
      {'value': 'medium', 'label': 'Medium', 'color': AppColors.warning},
      {'value': 'high', 'label': 'High', 'color': Colors.orange},
      {'value': 'critical', 'label': 'Critical', 'color': AppColors.error},
    ];

    return Container(
      padding: const EdgeInsets.all(6),
      decoration: BoxDecoration(
        color: AppColors.backgroundSecondary,
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: AppColors.border),
      ),
      child: Row(
        children: severities.map((severity) {
          final isSelected = _selectedSeverity == severity['value'];
          final color = severity['color'] as Color;
          return Expanded(
            child: GestureDetector(
              onTap: () => setState(() => _selectedSeverity = severity['value'] as String),
              child: Container(
                padding: const EdgeInsets.symmetric(vertical: 14),
                margin: const EdgeInsets.all(2),
                decoration: BoxDecoration(
                  color: isSelected ? color.withValues(alpha: 0.15) : Colors.transparent,
                  borderRadius: BorderRadius.circular(10),
                  border: isSelected ? Border.all(color: color, width: 1.5) : null,
                ),
                child: Column(
                  children: [
                    Container(
                      width: 12,
                      height: 12,
                      decoration: BoxDecoration(
                        color: isSelected ? color : color.withValues(alpha: 0.3),
                        borderRadius: BorderRadius.circular(6),
                      ),
                    ),
                    const SizedBox(height: 6),
                    Text(
                      severity['label'] as String,
                      style: AppTextStyles.labelMedium.copyWith(
                        color: isSelected ? color : AppColors.textTertiary,
                        fontWeight: isSelected ? FontWeight.w600 : FontWeight.normal,
                      ),
                    ),
                  ],
                ),
              ),
            ),
          );
        }).toList(),
      ),
    );
  }

  Widget _buildDescriptionField() {
    return Container(
      decoration: BoxDecoration(
        color: AppColors.backgroundSecondary,
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: AppColors.border),
      ),
      child: TextFormField(
        controller: _descriptionController,
        maxLines: 3,
        style: AppTextStyles.bodyMedium.copyWith(color: AppColors.textPrimary),
        decoration: InputDecoration(
          hintText: 'Add any additional details about the incident...',
          hintStyle: AppTextStyles.bodyMedium.copyWith(color: AppColors.textTertiary),
          border: InputBorder.none,
          contentPadding: const EdgeInsets.all(16),
        ),
      ),
    );
  }

  Widget _buildLocationCard() {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: AppColors.backgroundSecondary,
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: AppColors.border),
      ),
      child: Row(
        children: [
          Container(
            padding: const EdgeInsets.all(10),
            decoration: BoxDecoration(
              color: _currentLocation != null
                  ? AppColors.success.withValues(alpha: 0.1)
                  : AppColors.warning.withValues(alpha: 0.1),
              borderRadius: BorderRadius.circular(10),
            ),
            child: Icon(
              Icons.location_on,
              color: _currentLocation != null ? AppColors.success : AppColors.warning,
              size: 22,
            ),
          ),
          const SizedBox(width: 14),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  _currentLocation != null ? 'Location acquired' : 'Getting location...',
                  style: AppTextStyles.bodyMedium.copyWith(
                    color: AppColors.textPrimary,
                    fontWeight: FontWeight.w500,
                  ),
                ),
                if (_currentLocation != null)
                  Text(
                    '${_currentLocation!.latitude!.toStringAsFixed(4)}, ${_currentLocation!.longitude!.toStringAsFixed(4)}',
                    style: AppTextStyles.bodySmall.copyWith(color: AppColors.textTertiary),
                  ),
              ],
            ),
          ),
          if (_currentLocation == null)
            const SizedBox(
              width: 20,
              height: 20,
              child: CircularProgressIndicator(
                strokeWidth: 2,
                color: AppColors.warning,
              ),
            ),
        ],
      ),
    );
  }

  Widget _buildAnonymousOption() {
    return FutureBuilder<bool>(
      future: _authService.isAuthenticated(),
      builder: (context, snapshot) {
        if (snapshot.hasData && snapshot.data!) {
          return Container(
            padding: const EdgeInsets.all(4),
            decoration: BoxDecoration(
              color: AppColors.backgroundSecondary,
              borderRadius: BorderRadius.circular(14),
              border: Border.all(color: AppColors.border),
            ),
            child: SwitchListTile(
              title: Text(
                'Report Anonymously',
                style: AppTextStyles.bodyMedium.copyWith(color: AppColors.textPrimary),
              ),
              subtitle: Text(
                'Your identity will not be shared',
                style: AppTextStyles.bodySmall.copyWith(color: AppColors.textTertiary),
              ),
              secondary: Container(
                padding: const EdgeInsets.all(10),
                decoration: BoxDecoration(
                  color: AppColors.primary.withValues(alpha: 0.1),
                  borderRadius: BorderRadius.circular(10),
                ),
                child: const Icon(Icons.visibility_off, color: AppColors.primary, size: 22),
              ),
              value: _isAnonymous,
              onChanged: (value) => setState(() => _isAnonymous = value),
              activeTrackColor: AppColors.primary,
            ),
          );
        }
        return const SizedBox.shrink();
      },
    );
  }

  Widget _buildSubmitButton() {
    return SizedBox(
      height: 56,
      child: ElevatedButton(
        onPressed: _isLoading ? null : _submitReport,
        style: ElevatedButton.styleFrom(
          backgroundColor: AppColors.primary,
          foregroundColor: Colors.white,
          disabledBackgroundColor: AppColors.primary.withValues(alpha: 0.5),
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(14),
          ),
          elevation: 0,
        ),
        child: _isLoading
            ? const SizedBox(
                height: 24,
                width: 24,
                child: CircularProgressIndicator(
                  strokeWidth: 2.5,
                  color: Colors.white,
                ),
              )
            : Row(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  const Icon(Icons.send, size: 22),
                  const SizedBox(width: 10),
                  Text(
                    'Submit Report',
                    style: AppTextStyles.labelLarge.copyWith(
                      color: Colors.white,
                      fontWeight: FontWeight.w600,
                    ),
                  ),
                ],
              ),
      ),
    );
  }
}
