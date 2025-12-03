enum Environment {
  development,
  staging,
  production,
}

class EnvironmentConfig {
  static Environment _currentEnvironment = Environment.development;
  
  static Environment get currentEnvironment => _currentEnvironment;
  
  static void setEnvironment(Environment env) {
    _currentEnvironment = env;
  }
  
  /// Base API URL
  static String get baseApiUrl {
    switch (_currentEnvironment) {
      case Environment.development:
        // 🔥 UPDATED: Using your computer's IP for mobile device
        // Computer IP: 192.168.34.237
        return 'http://192.168.34.237:3000';
      case Environment.staging:
        return 'https://staging.trafficguard.ai';
      case Environment.production:
        return 'https://api.trafficguard.ai';
    }
  }
  
  /// AI Service URL
  static String get aiServiceUrl {
    switch (_currentEnvironment) {
      case Environment.development:
        // 🔥 UPDATED: Using your computer's IP for mobile device
        return 'http://192.168.34.237:8000';
      case Environment.staging:
        return 'https://staging-ai.trafficguard.ai';
      case Environment.production:
        return 'https://ai.trafficguard.ai';
    }
  }
  
  /// WebSocket URL
  static String get webSocketUrl {
    switch (_currentEnvironment) {
      case Environment.development:
        // 🔥 UPDATED: Using your computer's IP for mobile device
        return 'http://192.168.34.237:3000';
      case Environment.staging:
        return 'https://staging.trafficguard.ai';
      case Environment.production:
        return 'https://api.trafficguard.ai';
    }
  }
  
  /// App Version
  static const String appVersion = '1.0.0';
  
  /// Build Number
  static const int buildNumber = 1;
  
  /// Is Debug Mode
  static bool get isDebug {
    return _currentEnvironment == Environment.development;
  }
  
  /// Is Production
  static bool get isProduction {
    return _currentEnvironment == Environment.production;
  }
  
  /// Enable Logging
  static bool get enableLogging {
    return _currentEnvironment != Environment.production;
  }
  
  /// API Timeout (milliseconds)
  static int get apiTimeout {
    return _currentEnvironment == Environment.production ? 30000 : 60000;
  }
}
