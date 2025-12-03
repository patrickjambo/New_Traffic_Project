import 'package:socket_io_client/socket_io_client.dart' as IO;
import '../config/app_config.dart';
import 'notification_service.dart';

class WebSocketService {
  static final WebSocketService _instance = WebSocketService._internal();
  factory WebSocketService() => _instance;
  WebSocketService._internal();

  IO.Socket? _socket;
  final NotificationService _notificationService = NotificationService();
  bool _isConnected = false;
  bool _isConnecting = false;

  bool get isConnected => _isConnected;

  /// Initialize WebSocket connection
  void connect() {
    try {
      if (_socket != null && _socket!.connected) {
        return; // Already connected
      }

      if (_isConnecting) {
        return; // Connection attempt already in progress
      }

      _isConnecting = true;

      _socket = IO.io(
        AppConfig.baseUrl,
        IO.OptionBuilder()
            .setTransports(['websocket'])
            .disableAutoConnect()
            .setReconnectionDelay(5000)
            .setReconnectionAttempts(3)
            .build(),
      );

      _socket!.connect();

      _socket!.onConnect((_) {
        print('✅ WebSocket connected');
        _isConnected = true;
        _isConnecting = false;
      });

      _socket!.onDisconnect((_) {
        print('❌ WebSocket disconnected');
        _isConnected = false;
        _isConnecting = false;
      });

      _socket!.onConnectError((error) {
        if (!_isConnected) {
          print('⚠️ WebSocket connection error (will retry): ${error.toString().substring(0, 50)}');
        }
        _isConnected = false;
        _isConnecting = false;
      });

      // Listen for incident updates
      _socket!.on('incident_update', (data) {
        _handleIncidentUpdate(data);
      });
    } catch (e) {
      print('❌ Failed to initialize WebSocket: $e');
      _isConnected = false;
    }
  }

  /// Handle incident update events
  void _handleIncidentUpdate(dynamic data) {
    print('📡 Received incident update: $data');
    
    try {
      final type = data['type'];
      final incidentData = data['data'];

      String title = 'Traffic Incident Update';
      String message = 'A new incident has been reported.';

      if (type == 'new_incident') {
        title = 'New Traffic Incident';
        message = 'A new ${incidentData['type']} incident has been reported nearby.';
      } else if (type == 'status_change') {
        title = 'Incident Status Updated';
        message = 'Incident status changed to ${incidentData['status']}.';
      }

      // Add notification
      _notificationService.addNotification(
        title: title,
        message: message,
        type: 'traffic_alert',
      );
    } catch (e) {
      print('Error handling incident update: $e');
    }
  }

  /// Join a location-based room
  void joinLocation(double latitude, double longitude) {
    if (_socket != null && _socket!.connected) {
      _socket!.emit('join_location', {
        'latitude': latitude,
        'longitude': longitude,
      });
    }
  }

  /// Disconnect WebSocket
  void disconnect() {
    if (_socket != null) {
      _socket!.disconnect();
      _socket = null;
      _isConnected = false;
    }
  }

  /// Reconnect WebSocket
  void reconnect() {
    disconnect();
    connect();
  }
}
