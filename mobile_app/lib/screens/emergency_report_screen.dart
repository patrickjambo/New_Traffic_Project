import 'package:flutter/material.dart';
import 'package:location/location.dart';
import '../services/emergency_service.dart';
import '../services/auth_service.dart';

/// Emergency Report Screen
/// Allows users to report emergencies with full details matching web version
class EmergencyReportScreen extends StatefulWidget {
  const EmergencyReportScreen({super.key});

  @override
  State<EmergencyReportScreen> createState() => _EmergencyReportScreenState();
}

class _EmergencyReportScreenState extends State<EmergencyReportScreen> {
  final _formKey = GlobalKey<FormState>();
  final AuthService _authService = AuthService();
  final EmergencyService _emergencyService = EmergencyService();
  
  // Form controllers
  final _locationNameController = TextEditingController();
  final _descriptionController = TextEditingController();
  final _contactPhoneController = TextEditingController();
  final _casualtiesController = TextEditingController(text: '0');
  final _vehiclesController = TextEditingController(text: '0');
  
  // Form data
  String _selectedType = 'accident';
  String _selectedSeverity = 'medium';
  List<String> _selectedServices = [];
  LocationData? _currentLocation;
  bool _isLoadingLocation = false;
  bool _isSubmitting = false;

  // Emergency types matching web version
  final List<Map<String, dynamic>> _emergencyTypes = [
    {'value': 'accident', 'label': 'Accident', 'icon': Icons.car_crash, 'color': Colors.red},
    {'value': 'fire', 'label': 'Fire', 'icon': Icons.local_fire_department, 'color': Colors.orange},
    {'value': 'medical', 'label': 'Medical Emergency', 'icon': Icons.medical_services, 'color': Colors.pink},
    {'value': 'crime', 'label': 'Crime', 'icon': Icons.shield, 'color': Colors.purple},
    {'value': 'natural_disaster', 'label': 'Natural Disaster', 'icon': Icons.warning, 'color': Colors.brown},
    {'value': 'riot', 'label': 'Riot/Violence', 'icon': Icons.groups, 'color': Colors.deepOrange},
    {'value': 'hazmat', 'label': 'Hazmat Spill', 'icon': Icons.dangerous, 'color': Colors.yellow[800]!},
    {'value': 'other', 'label': 'Other Emergency', 'icon': Icons.error, 'color': Colors.grey},
  ];

  // Severity levels matching web version
  final List<Map<String, dynamic>> _severityLevels = [
    {'value': 'critical', 'label': 'Critical', 'color': Colors.red[900]!, 'description': 'Life-threatening, immediate response'},
    {'value': 'high', 'label': 'High', 'color': Colors.red, 'description': 'Serious situation, urgent response'},
    {'value': 'medium', 'label': 'Medium', 'color': Colors.orange, 'description': 'Moderate concern, priority response'},
    {'value': 'low', 'label': 'Low', 'color': Colors.blue, 'description': 'Minor situation, standard response'},
  ];

  // Emergency services matching web version
  final List<Map<String, dynamic>> _emergencyServices = [
    {'value': 'police', 'label': 'Police', 'icon': Icons.local_police},
    {'value': 'ambulance', 'label': 'Ambulance', 'icon': Icons.medical_services},
    {'value': 'fire', 'label': 'Fire Department', 'icon': Icons.fire_truck},
    {'value': 'rescue', 'label': 'Rescue Team', 'icon': Icons.health_and_safety},
  ];

  @override
  void initState() {
    super.initState();
    _getCurrentLocation();
  }

  @override
  void dispose() {
    _locationNameController.dispose();
    _descriptionController.dispose();
    _contactPhoneController.dispose();
    _casualtiesController.dispose();
    _vehiclesController.dispose();
    super.dispose();
  }

  /// Get current GPS location
  Future<void> _getCurrentLocation() async {
    setState(() => _isLoadingLocation = true);

    final location = Location();
    
    bool serviceEnabled = await location.serviceEnabled();
    if (!serviceEnabled) {
      serviceEnabled = await location.requestService();
      if (!serviceEnabled) {
        setState(() => _isLoadingLocation = false);
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(
              content: Text('Location services are disabled'),
              backgroundColor: Colors.red,
            ),
          );
        }
        return;
      }
    }

    PermissionStatus permissionGranted = await location.hasPermission();
    if (permissionGranted == PermissionStatus.denied) {
      permissionGranted = await location.requestPermission();
      if (permissionGranted != PermissionStatus.granted) {
        setState(() => _isLoadingLocation = false);
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(
              content: Text('Location permission denied'),
              backgroundColor: Colors.red,
            ),
          );
        }
        return;
      }
    }

    try {
      _currentLocation = await location.getLocation();
      setState(() => _isLoadingLocation = false);
      
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('✓ Location acquired'),
            backgroundColor: Colors.green,
            duration: Duration(seconds: 2),
          ),
        );
      }
    } catch (e) {
      setState(() => _isLoadingLocation = false);
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Failed to get location: $e'),
            backgroundColor: Colors.red,
          ),
        );
      }
    }
  }

  /// Submit emergency report
  Future<void> _submitEmergency() async {
    if (!_formKey.currentState!.validate()) return;

    if (_currentLocation == null) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('Please enable location to report emergency'),
          backgroundColor: Colors.red,
        ),
      );
      return;
    }

    if (_selectedServices.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('Please select at least one emergency service'),
          backgroundColor: Colors.orange,
        ),
      );
      return;
    }

    setState(() => _isSubmitting = true);

    final result = await _emergencyService.createEmergency(
      emergencyType: _selectedType,
      severity: _selectedSeverity,
      locationName: _locationNameController.text.trim(),
      latitude: _currentLocation!.latitude!,
      longitude: _currentLocation!.longitude!,
      description: _descriptionController.text.trim(),
      casualtiesCount: int.tryParse(_casualtiesController.text) ?? 0,
      vehiclesInvolved: int.tryParse(_vehiclesController.text) ?? 0,
      servicesNeeded: _selectedServices,
      contactPhone: _contactPhoneController.text.trim(),
    );

    setState(() => _isSubmitting = false);

    if (!mounted) return;

    if (result['success']) {
      // Show success dialog
      showDialog(
        context: context,
        barrierDismissible: false,
        builder: (context) => AlertDialog(
          title: Row(
            children: [
              Icon(Icons.check_circle, color: Colors.green, size: 32),
              SizedBox(width: 12),
              Text('Emergency Reported'),
            ],
          ),
          content: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                'Your emergency has been successfully reported.',
                style: TextStyle(fontSize: 16),
              ),
              SizedBox(height: 16),
              Container(
                padding: EdgeInsets.all(12),
                decoration: BoxDecoration(
                  color: Colors.blue[50],
                  borderRadius: BorderRadius.circular(8),
                  border: Border.all(color: Colors.blue),
                ),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      '📋 Emergency ID: ${result['data']['id']}',
                      style: TextStyle(fontWeight: FontWeight.bold),
                    ),
                    SizedBox(height: 4),
                    Text('Type: ${_selectedType.toUpperCase()}'),
                    Text('Severity: ${_selectedSeverity.toUpperCase()}'),
                    Text('Services: ${_selectedServices.join(", ")}'),
                  ],
                ),
              ),
              SizedBox(height: 16),
              Row(
                children: [
                  Icon(Icons.check_circle_outline, size: 16, color: Colors.green),
                  SizedBox(width: 8),
                  Expanded(
                    child: Text(
                      'Emergency services have been notified',
                      style: TextStyle(color: Colors.green, fontSize: 12),
                    ),
                  ),
                ],
              ),
              SizedBox(height: 4),
              Row(
                children: [
                  Icon(Icons.notifications_active, size: 16, color: Colors.blue),
                  SizedBox(width: 8),
                  Expanded(
                    child: Text(
                      'Nearby authorities will be dispatched',
                      style: TextStyle(color: Colors.blue, fontSize: 12),
                    ),
                  ),
                ],
              ),
            ],
          ),
          actions: [
            TextButton(
              onPressed: () {
                Navigator.pop(context); // Close dialog
                Navigator.pop(context); // Return to previous screen
              },
              child: Text('OK'),
            ),
            ElevatedButton(
              onPressed: () {
                Navigator.pop(context); // Close dialog
                Navigator.pop(context); // Return to previous screen
                // TODO: Navigate to emergency tracking screen
              },
              child: Text('Track Emergency'),
            ),
          ],
        ),
      );
    } else {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(result['message'] ?? 'Failed to report emergency'),
          backgroundColor: Colors.red,
          duration: Duration(seconds: 4),
        ),
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: Text('Report Emergency'),
        backgroundColor: Colors.red,
        elevation: 0,
      ),
      body: SingleChildScrollView(
        padding: EdgeInsets.all(16),
        child: Form(
          key: _formKey,
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              // Warning Banner
              Container(
                padding: EdgeInsets.all(16),
                decoration: BoxDecoration(
                  color: Colors.red[50],
                  border: Border.all(color: Colors.red),
                  borderRadius: BorderRadius.circular(12),
                ),
                child: Row(
                  children: [
                    Icon(Icons.warning_amber, color: Colors.red, size: 32),
                    SizedBox(width: 12),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            '🚨 EMERGENCY REPORT',
                            style: TextStyle(
                              fontWeight: FontWeight.bold,
                              fontSize: 16,
                              color: Colors.red[900],
                            ),
                          ),
                          SizedBox(height: 4),
                          Text(
                            'For life-threatening emergencies, call 999 immediately',
                            style: TextStyle(fontSize: 12),
                          ),
                        ],
                      ),
                    ),
                  ],
                ),
              ),
              
              SizedBox(height: 24),
              
              // Emergency Type
              Text(
                'Emergency Type *',
                style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold),
              ),
              SizedBox(height: 8),
              Wrap(
                spacing: 8,
                runSpacing: 8,
                children: _emergencyTypes.map((type) {
                  final isSelected = _selectedType == type['value'];
                  return ChoiceChip(
                    label: Row(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        Icon(
                          type['icon'],
                          size: 16,
                          color: isSelected ? Colors.white : type['color'],
                        ),
                        SizedBox(width: 4),
                        Text(type['label']),
                      ],
                    ),
                    selected: isSelected,
                    selectedColor: type['color'],
                    onSelected: (selected) {
                      setState(() => _selectedType = type['value']);
                    },
                  );
                }).toList(),
              ),
              
              SizedBox(height: 24),
              
              // Severity Level
              Text(
                'Severity Level *',
                style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold),
              ),
              SizedBox(height: 8),
              ..._severityLevels.map((severity) {
                final isSelected = _selectedSeverity == severity['value'];
                return Container(
                  margin: EdgeInsets.only(bottom: 8),
                  child: RadioListTile<String>(
                    title: Text(
                      severity['label'],
                      style: TextStyle(fontWeight: FontWeight.bold),
                    ),
                    subtitle: Text(
                      severity['description'],
                      style: TextStyle(fontSize: 12),
                    ),
                    value: severity['value'],
                    groupValue: _selectedSeverity,
                    onChanged: (value) {
                      setState(() => _selectedSeverity = value!);
                    },
                    activeColor: severity['color'],
                    tileColor: isSelected ? severity['color'].withOpacity(0.1) : null,
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(8),
                      side: BorderSide(
                        color: isSelected ? severity['color'] : Colors.grey[300]!,
                      ),
                    ),
                  ),
                );
              }).toList(),
              
              SizedBox(height: 24),
              
              // Services Needed
              Text(
                'Emergency Services Needed *',
                style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold),
              ),
              SizedBox(height: 8),
              ..._emergencyServices.map((service) {
                final isSelected = _selectedServices.contains(service['value']);
                return CheckboxListTile(
                  title: Row(
                    children: [
                      Icon(service['icon'], size: 20),
                      SizedBox(width: 8),
                      Text(service['label']),
                    ],
                  ),
                  value: isSelected,
                  onChanged: (checked) {
                    setState(() {
                      if (checked!) {
                        _selectedServices.add(service['value']);
                      } else {
                        _selectedServices.remove(service['value']);
                      }
                    });
                  },
                  activeColor: Colors.blue,
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(8),
                    side: BorderSide(color: Colors.grey[300]!),
                  ),
                );
              }).toList(),
              
              SizedBox(height: 24),
              
              // Location
              Text(
                'Location *',
                style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold),
              ),
              SizedBox(height: 8),
              Card(
                child: Padding(
                  padding: EdgeInsets.all(12),
                  child: Column(
                    children: [
                      if (_currentLocation != null)
                        Column(
                          children: [
                            Row(
                              children: [
                                Icon(Icons.location_on, color: Colors.green),
                                SizedBox(width: 8),
                                Expanded(
                                  child: Column(
                                    crossAxisAlignment: CrossAxisAlignment.start,
                                    children: [
                                      Text(
                                        'GPS Location Acquired',
                                        style: TextStyle(fontWeight: FontWeight.bold),
                                      ),
                                      Text(
                                        'Lat: ${_currentLocation!.latitude!.toStringAsFixed(6)}, '
                                        'Lng: ${_currentLocation!.longitude!.toStringAsFixed(6)}',
                                        style: TextStyle(fontSize: 11, color: Colors.grey[600]),
                                      ),
                                    ],
                                  ),
                                ),
                              ],
                            ),
                            SizedBox(height: 12),
                          ],
                        ),
                      TextFormField(
                        controller: _locationNameController,
                        decoration: InputDecoration(
                          labelText: 'Location Name/Address',
                          hintText: 'e.g., KN 3 Ave near Kigali City Tower',
                          prefixIcon: Icon(Icons.place),
                          border: OutlineInputBorder(),
                        ),
                        validator: (value) {
                          if (value == null || value.trim().isEmpty) {
                            return 'Please enter location name';
                          }
                          return null;
                        },
                        maxLines: 2,
                      ),
                      SizedBox(height: 8),
                      ElevatedButton.icon(
                        onPressed: _isLoadingLocation ? null : _getCurrentLocation,
                        icon: _isLoadingLocation
                            ? SizedBox(
                                width: 16,
                                height: 16,
                                child: CircularProgressIndicator(strokeWidth: 2),
                              )
                            : Icon(Icons.my_location),
                        label: Text(_isLoadingLocation ? 'Getting Location...' : 'Refresh GPS Location'),
                        style: ElevatedButton.styleFrom(
                          backgroundColor: Colors.blue,
                        ),
                      ),
                    ],
                  ),
                ),
              ),
              
              SizedBox(height: 24),
              
              // Description
              Text(
                'Description *',
                style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold),
              ),
              SizedBox(height: 8),
              TextFormField(
                controller: _descriptionController,
                decoration: const InputDecoration(
                  hintText: 'Describe the emergency situation in detail...',
                  border: OutlineInputBorder(),
                ),
                maxLines: 4,
                validator: (value) {
                  if (value == null || value.trim().isEmpty) {
                    return 'Please describe the emergency';
                  }
                  if (value.trim().length < 10) {
                    return 'Description must be at least 10 characters';
                  }
                  return null;
                },
              ),
              
              SizedBox(height: 24),
              
              // Additional Details
              Text(
                'Additional Details',
                style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold),
              ),
              SizedBox(height: 8),
              Row(
                children: [
                  Expanded(
                    child: TextFormField(
                      controller: _casualtiesController,
                      decoration: InputDecoration(
                        labelText: 'Casualties',
                        prefixIcon: Icon(Icons.person_outline),
                        border: OutlineInputBorder(),
                      ),
                      keyboardType: TextInputType.number,
                    ),
                  ),
                  SizedBox(width: 12),
                  Expanded(
                    child: TextFormField(
                      controller: _vehiclesController,
                      decoration: InputDecoration(
                        labelText: 'Vehicles Involved',
                        prefixIcon: Icon(Icons.directions_car),
                        border: OutlineInputBorder(),
                      ),
                      keyboardType: TextInputType.number,
                    ),
                  ),
                ],
              ),
              
              SizedBox(height: 16),
              
              // Contact Phone
              TextFormField(
                controller: _contactPhoneController,
                decoration: InputDecoration(
                  labelText: 'Contact Phone',
                  hintText: '+256700123456',
                  prefixIcon: Icon(Icons.phone),
                  border: OutlineInputBorder(),
                ),
                keyboardType: TextInputType.phone,
                validator: (value) {
                  if (value == null || value.trim().isEmpty) {
                    return 'Please enter contact phone';
                  }
                  return null;
                },
              ),
              
              SizedBox(height: 32),
              
              // Submit Button
              ElevatedButton(
                onPressed: _isSubmitting ? null : _submitEmergency,
                style: ElevatedButton.styleFrom(
                  backgroundColor: Colors.red,
                  padding: EdgeInsets.symmetric(vertical: 16),
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(12),
                  ),
                ),
                child: _isSubmitting
                    ? Row(
                        mainAxisAlignment: MainAxisAlignment.center,
                        children: [
                          SizedBox(
                            width: 20,
                            height: 20,
                            child: CircularProgressIndicator(
                              strokeWidth: 2,
                              valueColor: AlwaysStoppedAnimation<Color>(Colors.white),
                            ),
                          ),
                          SizedBox(width: 12),
                          Text(
                            'Reporting Emergency...',
                            style: TextStyle(fontSize: 18),
                          ),
                        ],
                      )
                    : Row(
                        mainAxisAlignment: MainAxisAlignment.center,
                        children: [
                          Icon(Icons.emergency_share, size: 24),
                          SizedBox(width: 8),
                          Text(
                            'REPORT EMERGENCY',
                            style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
                          ),
                        ],
                      ),
              ),
              
              SizedBox(height: 16),
              
              // Privacy Notice
              Container(
                padding: EdgeInsets.all(12),
                decoration: BoxDecoration(
                  color: Colors.grey[100],
                  borderRadius: BorderRadius.circular(8),
                ),
                child: Row(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Icon(Icons.info_outline, size: 16, color: Colors.grey[600]),
                    SizedBox(width: 8),
                    Expanded(
                      child: Text(
                        'Your location and contact details will be shared with emergency services '
                        'to facilitate rapid response. All reports are logged and verified.',
                        style: TextStyle(fontSize: 11, color: Colors.grey[600]),
                      ),
                    ),
                  ],
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
