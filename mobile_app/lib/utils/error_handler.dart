import 'package:flutter/material.dart';
import 'dart:developer' as developer;

class ErrorHandler {
  static void handleError(Object error, StackTrace? stackTrace, {String? context}) {
    // Log error for debugging
    developer.log(
      'Error occurred',
      error: error,
      stackTrace: stackTrace,
      name: 'ErrorHandler',
    );

    // In production, you would send this to a crash reporting service
    // like Firebase Crashlytics or Sentry
    if (context != null) {
      developer.log('Context: $context', name: 'ErrorHandler');
    }
  }

  static void showErrorSnackBar(BuildContext context, String message) {
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text(message),
        backgroundColor: Colors.red,
        duration: const Duration(seconds: 4),
        action: SnackBarAction(
          label: 'Dismiss',
          textColor: Colors.white,
          onPressed: () {
            ScaffoldMessenger.of(context).hideCurrentSnackBar();
          },
        ),
      ),
    );
  }

  static String getUserFriendlyMessage(Object error) {
    final errorString = error.toString().toLowerCase();
    
    if (errorString.contains('socket') || errorString.contains('network')) {
      return 'Network connection failed. Please check your internet.';
    } else if (errorString.contains('timeout')) {
      return 'Request timed out. Please try again.';
    } else if (errorString.contains('401') || errorString.contains('unauthorized')) {
      return 'Session expired. Please login again.';
    } else if (errorString.contains('403') || errorString.contains('forbidden')) {
      return 'You don\'t have permission to perform this action.';
    } else if (errorString.contains('404')) {
      return 'Resource not found.';
    } else if (errorString.contains('500')) {
      return 'Server error. Please try again later.';
    } else {
      return 'Something went wrong. Please try again.';
    }
  }
}
