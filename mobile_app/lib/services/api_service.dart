import 'package:dio/dio.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import '../config/environment.dart';
import 'dart:developer' as developer;

class ApiService {
  static final ApiService _instance = ApiService._internal();
  factory ApiService() => _instance;
  ApiService._internal();

  late final Dio _dio;
  final _secureStorage = const FlutterSecureStorage();

  /// Initialize the API service
  void initialize() {
    _dio = Dio(
      BaseOptions(
        baseUrl: EnvironmentConfig.baseApiUrl,
        connectTimeout: Duration(milliseconds: EnvironmentConfig.apiTimeout),
        receiveTimeout: Duration(milliseconds: EnvironmentConfig.apiTimeout),
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
      ),
    );

    // Add interceptors
    _dio.interceptors.add(_getLogInterceptor());
    _dio.interceptors.add(_getAuthInterceptor());
    _dio.interceptors.add(_getErrorInterceptor());
  }

  /// Get Dio instance
  Dio get dio => _dio;

  /// Logging interceptor
  InterceptorsWrapper _getLogInterceptor() {
    return InterceptorsWrapper(
      onRequest: (options, handler) {
        if (EnvironmentConfig.enableLogging) {
          developer.log(
            '🌐 REQUEST[${options.method}] => ${options.path}',
            name: 'API',
          );
          if (options.data != null) {
            developer.log('📤 Data: ${options.data}', name: 'API');
          }
        }
        handler.next(options);
      },
      onResponse: (response, handler) {
        if (EnvironmentConfig.enableLogging) {
          developer.log(
            '✅ RESPONSE[${response.statusCode}] => ${response.requestOptions.path}',
            name: 'API',
          );
        }
        handler.next(response);
      },
      onError: (error, handler) {
        if (EnvironmentConfig.enableLogging) {
          developer.log(
            '❌ ERROR[${error.response?.statusCode}] => ${error.requestOptions.path}',
            error: error.message,
            name: 'API',
          );
        }
        handler.next(error);
      },
    );
  }

  /// Auth interceptor - automatically inject token
  InterceptorsWrapper _getAuthInterceptor() {
    return InterceptorsWrapper(
      onRequest: (options, handler) async {
        // Get token from secure storage
        final token = await _secureStorage.read(key: 'auth_token');
        
        if (token != null && token.isNotEmpty) {
          options.headers['Authorization'] = 'Bearer $token';
        }
        
        handler.next(options);
      },
    );
  }

  /// Error interceptor - retry logic
  InterceptorsWrapper _getErrorInterceptor() {
    return InterceptorsWrapper(
      onError: (error, handler) async {
        // Handle 401 Unauthorized - token expired
        if (error.response?.statusCode == 401) {
          // Could implement token refresh here
          developer.log('Token expired or invalid', name: 'API');
        }

        // Retry logic for network errors
        if (error.type == DioExceptionType.connectionTimeout ||
            error.type == DioExceptionType.receiveTimeout ||
            error.type == DioExceptionType.sendTimeout) {
          // Implement retry logic here if needed
          developer.log('Network timeout, consider retry', name: 'API');
        }

        handler.next(error);
      },
    );
  }

  /// Perform GET request
  Future<Response> get(String path, {Map<String, dynamic>? queryParameters}) async {
    return await _dio.get(path, queryParameters: queryParameters);
  }

  /// Perform POST request
  Future<Response> post(String path, {dynamic data, Map<String, dynamic>? queryParameters}) async {
    return await _dio.post(path, data: data, queryParameters: queryParameters);
  }

  /// Perform PUT request
  Future<Response> put(String path, {dynamic data}) async {
    return await _dio.put(path, data: data);
  }

  /// Perform PATCH request
  Future<Response> patch(String path, {dynamic data}) async {
    return await _dio.patch(path, data: data);
  }

  /// Perform DELETE request
  Future<Response> delete(String path) async {
    return await _dio.delete(path);
  }

  /// Upload file with progress
  Future<Response> uploadFile(
    String path,
    String filePath, {
    String fieldName = 'file',
    Map<String, dynamic>? additionalData,
    Function(int, int)? onProgress,
  }) async {
    final formData = FormData.fromMap({
      fieldName: await MultipartFile.fromFile(filePath),
      if (additionalData != null) ...additionalData,
    });

    return await _dio.post(
      path,
      data: formData,
      onSendProgress: onProgress,
    );
  }
}
