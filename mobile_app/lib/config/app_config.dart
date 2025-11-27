class AppConfig {
  // API Configuration
  static const String baseUrl = 'http://10.0.2.2:3000'; // Android emulator
  // For iOS simulator use: 'http://localhost:3000'
  // For real device use your computer's IP: 'http://192.168.x.x:3000'
  
  static const String aiServiceUrl = 'http://10.0.2.2:8000';
  
  // Google Maps API Key
  static const String googleMapsApiKey = 'YOUR_GOOGLE_MAPS_API_KEY_HERE';
  
  // App Configuration
  static const String appName = 'TrafficGuard AI';
  static const String appVersion = '1.0.0';
  
  // Video Configuration
  static const int maxVideoDuration = 30; // seconds
  static const int maxVideoSize = 50 * 1024 * 1024; // 50MB
  
  // Map Configuration
  static const double defaultLatitude = -1.9441;  // Kigali, Rwanda
  static const double defaultLongitude = 30.0619;
  static const double defaultZoom = 13.0;
  static const double nearbyIncidentsRadius = 5.0; // km
  
  // API Endpoints
  static const String loginEndpoint = '/api/auth/login';
  static const String registerEndpoint = '/api/auth/register';
  static const String profileEndpoint = '/api/auth/profile';
  static const String reportIncidentEndpoint = '/api/incidents/report';
  static const String nearbyIncidentsEndpoint = '/api/incidents';
  
  // Colors
  static const int primaryColor = 0xFF2563EB; // Blue
  static const int accentColor = 0xFF10B981; // Green
  static const int errorColor = 0xFFEF4444; // Red
  static const int warningColor = 0xFFF59E0B; // Amber
}
