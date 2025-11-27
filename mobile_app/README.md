# TrafficGuard AI - Mobile App

Flutter mobile application for TrafficGuard AI platform.

## Setup Instructions

### 1. Install Dependencies

```bash
cd mobile_app
flutter pub get
```

### 2. Configure API Endpoints

Edit `lib/config/app_config.dart`:

```dart
// For Android Emulator
static const String baseUrl = 'http://10.0.2.2:3000';

// For iOS Simulator
static const String baseUrl = 'http://localhost:3000';

// For Real Device (use your computer's IP)
static const String baseUrl = 'http://192.168.1.XXX:3000';
```

### 3. Add Google Maps API Key (Optional)

1. Get an API key from [Google Cloud Console](https://console.cloud.google.com)
2. Update `lib/config/app_config.dart` with your API key

### 4. Run the App

```bash
# Check connected devices
flutter devices

# Run on connected device/emulator
flutter run
```

## Features Implemented

✅ Authentication (Login, JWT tokens, Guest mode)
✅ Home Screen (Nearby incidents, Statistics)
✅ Incident Reporting (Video recording, GPS, Forms)
✅ Map View (Traffic map)
✅ Profile (User info, Logout)

## Permissions Required

Check `android/app/src/main/AndroidManifest.xml` and `ios/Runner/Info.plist` for location, camera, and microphone permissions.

## Project Structure

```
lib/
├── config/app_config.dart
├── services/
│   ├── auth_service.dart
│   └── incident_service.dart
├── screens/ (splash, login, home, map, report, profile)
└── main.dart
```

## Building for Production

```bash
# Android APK
flutter build apk --release

# iOS
flutter build ios --release
```
