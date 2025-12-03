# 📱 Mobile App AI Video Integration Guide

## 🎯 Overview

This guide explains how the **TrafficGuard Flutter mobile app** captures video, uploads to backend, triggers AI analysis, and receives real-time notifications.

---

## 🏗️ Architecture Flow

```
┌─────────────────┐
│  Mobile Camera  │ (Flutter image_picker)
│  Records Video  │ Max 30 seconds
└────────┬────────┘
         │
         │ User records traffic footage
         ↓
┌─────────────────┐
│ AIVideoCapture  │ (Flutter Screen)
│     Screen      │ - Video preview
└────────┬────────┘ - Play/Re-record
         │
         │ User clicks "Upload & Analyze"
         │ GPS location added automatically
         ↓
┌─────────────────┐
│ IncidentService │ analyzeVideoAndCreateIncident()
│  (Flutter HTTP) │ - FormData with video file
└────────┬────────┘ - Upload progress tracking
         │
         │ POST /api/incidents/analyze-video
         │ multipart/form-data
         ↓
┌─────────────────┐
│  Backend API    │ aiAnalysisController.js
│  (Node/Express) │ - Receives video + location
└────────┬────────┘ - Forwards to AI service
         │
         │ POST http://localhost:8000/ai/analyze-traffic
         ↓
┌─────────────────┐
│   AI Service    │ TrafficAnalyzer (YOLOv8n)
│ (Python/FastAPI)│ - Detects vehicles
└────────┬────────┘ - Identifies incidents
         │          - Calculates confidence
         │
         │ Returns AI results:
         │ {incident_detected, type, confidence,
         │  vehicle_count, avg_speed, stationary_count}
         ↓
┌─────────────────┐
│  Backend API    │ - Determines severity
│  Creates Entry  │ - INSERT INTO incidents
└────────┬────────┘ - Saves ai_confidence, ai_metadata
         │
         │ Broadcasts WebSocket event
         ↓
┌─────────────────┐
│  WebSocket      │ io.emit('incident:new')
│  Broadcast      │ Socket.IO to all clients
└────────┬────────┘
         │
         ├──────────────────┬─────────────────┐
         │                  │                 │
         ↓                  ↓                 ↓
┌──────────────┐   ┌──────────────┐   ┌──────────────┐
│ Mobile App   │   │ Web Dashboard│   │ Police App   │
│ Notification │   │ Notification │   │ Notification │
└──────────────┘   └──────────────┘   └──────────────┘
```

---

## 📂 Files Modified/Created

### 1. **Mobile App Service** (Modified)

**File:** `mobile_app/lib/services/incident_service.dart`

**Added Method:**
```dart
Future<Map<String, dynamic>> analyzeVideoAndCreateIncident({
  required File videoFile,
  required double latitude,
  required double longitude,
  Function(double)? onUploadProgress,
})
```

**Purpose:**
- Uploads video file to backend
- Tracks upload progress (0-100%)
- Handles AI service errors (503 for service down)
- Returns AI analysis results + incident details

**Key Features:**
- Uses `http.MultipartRequest` for file upload
- Optional authentication (token if logged in)
- Progress callback for UI updates
- Error handling for network issues and AI service downtime

---

### 2. **Mobile App Screen** (New)

**File:** `mobile_app/lib/screens/ai_video_capture_screen.dart`

**Purpose:** Complete UI for video capture and AI analysis

**Key Features:**

#### 📹 **Video Recording**
- Uses `image_picker` package
- Camera source with 30-second max duration
- Automatic location capture via GPS

#### 🎬 **Video Preview**
- Uses `video_player` package
- Play/pause controls
- Re-record option

#### 📊 **Upload Progress**
- Linear progress bar (0-100%)
- Real-time percentage display
- Upload status text

#### 🤖 **AI Analysis**
- Circular progress indicator
- "AI analyzing video..." message
- Processing status

#### 📋 **Results Dialog**
Shows:
- ✅ Incident detected (Yes/No)
- 🏷️ Incident type (accident/congestion/blockage)
- ⚠️ Severity (critical/high/medium/low) with color coding
- 📈 Confidence percentage
- 🚗 Vehicle count
- ⚡ Average speed (km/h)
- 🛑 Stationary vehicles count
- ✅ Database save confirmation
- 📬 Notification sent confirmation

#### 🎨 **UI Components**
- Info card explaining AI feature
- Location status card with GPS coordinates
- Video preview card with playback controls
- Progress indicators for upload and analysis
- Error messages in red card
- Success dialog with detailed results

---

### 3. **Backend Controller** (Created)

**File:** `backend/src/controllers/aiAnalysisController.js`

**Main Function:** `analyzeVideoAndCreateIncident(req, res)`

**Flow:**
1. Validates video file upload (via multer)
2. Extracts location from request body
3. Creates FormData with video buffer
4. POSTs to AI service `/ai/analyze-traffic`
5. Processes AI response
6. If incident detected:
   - Determines severity based on type + confidence
   - Creates incident in database
   - Broadcasts WebSocket notification
   - Creates notifications for police/admin users
7. Returns results to mobile app

**Severity Mapping:**
```javascript
accident + confidence > 0.7 → critical
accident                    → high
road_blockage              → high
congestion + confidence > 0.7 → medium
congestion                 → low
```

---

### 4. **Backend Route** (Modified)

**File:** `backend/src/routes/incidents.js`

**Added Route:**
```javascript
router.post(
  '/analyze-video',
  optionalAuth,
  upload.single('video'),
  analyzeVideoAndCreateIncident
);
```

**Endpoint:** `POST /api/incidents/analyze-video`

**Middleware:**
- `optionalAuth` - Works with or without authentication
- `upload.single('video')` - Multer file upload handler

---

### 5. **AI Service** (Modified)

**File:** `ai_service/main.py`

**Updated:** Added `.webm` format support

**Endpoint:** `POST /ai/analyze-traffic`

**Accepted Formats:** `.mp4`, `.mov`, `.avi`, `.mkv`, `.webm`

---

## 🚀 Setup Instructions

### 1. **Install Flutter Dependencies**

Add to `pubspec.yaml`:
```yaml
dependencies:
  image_picker: ^1.0.4
  video_player: ^2.7.2
  location: ^5.0.3
  http: ^1.1.0
```

Run:
```bash
cd mobile_app
flutter pub get
```

### 2. **Update App Config**

Ensure `lib/config/app_config.dart` has correct backend URL:
```dart
class AppConfig {
  static const String baseUrl = 'http://YOUR_BACKEND_IP:3000';
  static const String nearbyIncidentsEndpoint = '/api/incidents';
  // ...
}
```

**Important:** Replace `YOUR_BACKEND_IP` with:
- Local testing: `http://10.0.2.2:3000` (Android emulator)
- Physical device: `http://192.168.x.x:3000` (your computer's IP)

### 3. **Add to Navigation**

Update your main navigation to include AI Video Capture:

```dart
// In home_screen.dart or navigation drawer
ListTile(
  leading: const Icon(Icons.video_camera_front),
  title: const Text('AI Video Analysis'),
  onTap: () {
    Navigator.push(
      context,
      MaterialPageRoute(
        builder: (context) => const AIVideoCaptureScreen(),
      ),
    );
  },
),
```

### 4. **Platform-Specific Configuration**

#### **Android** (`android/app/src/main/AndroidManifest.xml`)
```xml
<uses-permission android:name="android.permission.CAMERA" />
<uses-permission android:name="android.permission.RECORD_AUDIO" />
<uses-permission android:name="android.permission.WRITE_EXTERNAL_STORAGE" />
<uses-permission android:name="android.permission.READ_EXTERNAL_STORAGE" />
<uses-permission android:name="android.permission.ACCESS_FINE_LOCATION" />
<uses-permission android:name="android.permission.ACCESS_COARSE_LOCATION" />
<uses-permission android:name="android.permission.INTERNET" />
```

#### **iOS** (`ios/Runner/Info.plist`)
```xml
<key>NSCameraUsageDescription</key>
<string>We need camera access to record traffic incidents</string>
<key>NSMicrophoneUsageDescription</key>
<string>We need microphone access to record video</string>
<key>NSPhotoLibraryUsageDescription</key>
<string>We need photo library access to save videos</string>
<key>NSLocationWhenInUseUsageDescription</key>
<string>We need your location to tag incidents</string>
```

---

## 📱 Usage Instructions

### For Users

1. **Open TrafficGuard App**
2. **Navigate to "AI Video Analysis"** (from menu or home screen)
3. **Grant Permissions:**
   - Camera access
   - Location access
4. **Record Video:**
   - Tap "Record Video" button
   - Camera opens automatically
   - Record traffic footage (5-30 seconds)
   - Stop recording when done
5. **Preview:**
   - Video preview appears
   - Tap play icon to review
   - Tap "Re-record" if needed
6. **Upload & Analyze:**
   - Tap "Upload & Analyze" button
   - Watch upload progress (0-100%)
   - Wait for AI analysis (~5-15 seconds)
7. **View Results:**
   - Results dialog appears automatically
   - Shows incident detection status
   - Displays severity, confidence, vehicle stats
   - Confirmation that incident saved (if detected)
8. **Done:**
   - Tap "Record Another" to capture more
   - Or tap "Done" to return

---

## 🧪 Testing Guide

### Test Scenario 1: Accident Detection

**Steps:**
1. Record video showing:
   - Crashed vehicles
   - Stopped cars in traffic
   - Emergency vehicles
2. Upload and analyze
3. **Expected Results:**
   - ✅ Incident detected: Yes
   - 🏷️ Type: Accident
   - ⚠️ Severity: Critical or High
   - 📈 Confidence: > 70%
   - 🛑 Stationary vehicles: > 0
   - ✅ Incident saved to database
   - 📬 Notifications sent

### Test Scenario 2: Traffic Congestion

**Steps:**
1. Record video showing:
   - Slow-moving traffic
   - Many vehicles close together
   - Low average speed
2. Upload and analyze
3. **Expected Results:**
   - ✅ Incident detected: Yes
   - 🏷️ Type: Congestion
   - ⚠️ Severity: Medium or Low
   - 📈 Confidence: Variable
   - 🚗 Vehicle count: High (>10)
   - ⚡ Average speed: Low (<20 km/h)

### Test Scenario 3: Normal Traffic

**Steps:**
1. Record video showing:
   - Flowing traffic
   - Normal speeds
   - No incidents
2. Upload and analyze
3. **Expected Results:**
   - ❌ Incident detected: No
   - 🚗 Vehicles counted: Yes
   - ⚡ Speed calculated: Yes
   - ❌ No database entry
   - ❌ No notifications sent

### Test Scenario 4: Error Handling

**Test A: No Location Permission**
- Deny location permission
- Try to upload
- **Expected:** Error message "Location permission denied"

**Test B: No Camera Permission**
- Deny camera permission
- Try to record
- **Expected:** Error message from system

**Test C: AI Service Down**
- Stop AI service on backend
- Upload video
- **Expected:** Error "AI service is currently unavailable"

**Test D: Network Issues**
- Disable internet
- Try to upload
- **Expected:** Error "Network error"

---

## 🔔 Notification Integration

### Firebase Cloud Messaging (FCM)

To receive real-time notifications on mobile when incidents are detected:

#### 1. **Add Firebase to Project**

```bash
# Install FlutterFire CLI
dart pub global activate flutterfire_cli

# Configure Firebase for your project
flutterfire configure
```

#### 2. **Add Dependencies**

```yaml
dependencies:
  firebase_core: ^2.24.0
  firebase_messaging: ^14.7.0
```

#### 3. **Update Main**

```dart
import 'package:firebase_core/firebase_core.dart';
import 'package:firebase_messaging/firebase_messaging.dart';

Future<void> _firebaseMessagingBackgroundHandler(RemoteMessage message) async {
  await Firebase.initializeApp();
  print("Handling background message: ${message.messageId}");
}

void main() async {
  WidgetsFlutterBinding.ensureInitialized();
  await Firebase.initializeApp();
  
  FirebaseMessaging.onBackgroundMessage(_firebaseMessagingBackgroundHandler);
  
  runApp(const MyApp());
}
```

#### 4. **Request Permission**

```dart
// In your app initialization
Future<void> setupNotifications() async {
  FirebaseMessaging messaging = FirebaseMessaging.instance;
  
  NotificationSettings settings = await messaging.requestPermission(
    alert: true,
    badge: true,
    sound: true,
  );
  
  if (settings.authorizationStatus == AuthorizationStatus.authorized) {
    print('User granted permission');
    
    // Get FCM token
    String? token = await messaging.getToken();
    print('FCM Token: $token');
    
    // Send token to backend
    await _sendTokenToBackend(token);
  }
}
```

#### 5. **Handle Notifications**

```dart
void setupNotificationHandlers() {
  // Foreground messages
  FirebaseMessaging.onMessage.listen((RemoteMessage message) {
    print('Got a message while in foreground!');
    
    if (message.notification != null) {
      showDialog(
        context: context,
        builder: (context) => AlertDialog(
          title: Text(message.notification!.title ?? 'Notification'),
          content: Text(message.notification!.body ?? ''),
          actions: [
            TextButton(
              onPressed: () => Navigator.pop(context),
              child: const Text('OK'),
            ),
          ],
        ),
      );
    }
  });
  
  // When app opened from notification
  FirebaseMessaging.onMessageOpenedApp.listen((RemoteMessage message) {
    print('Message clicked!');
    // Navigate to incident details
  });
}
```

---

## 🐛 Troubleshooting

### Issue: "Camera not accessible"

**Solutions:**
1. Check AndroidManifest.xml has camera permissions
2. Request runtime permissions in app
3. Test on physical device (emulators may have camera issues)
4. Check Android SDK version (min 21)

### Issue: "Upload fails immediately"

**Solutions:**
1. Check backend URL in app_config.dart
2. Verify backend is running: `curl http://YOUR_IP:3000/health`
3. Check network connectivity on device
4. Ensure device is on same network as backend (for local testing)

### Issue: "AI service unavailable (503)"

**Solutions:**
```bash
# Check AI service status
curl http://localhost:8000/health

# Start AI service
cd ai_service
source venv/bin/activate
python main.py

# Check Docker logs
docker-compose logs ai_service
```

### Issue: "Location not found"

**Solutions:**
1. Check location permissions granted
2. Enable GPS/location services on device
3. Test outdoors (GPS works better outside)
4. Wait a few seconds for GPS lock

### Issue: "Video file too large"

**Solutions:**
- Reduce recording duration (< 30 seconds)
- Backend accepts up to 100MB
- Check available storage on device

---

## 📊 Performance Metrics

### Expected Timings

| Operation | Duration | Notes |
|-----------|----------|-------|
| Camera open | 1-2s | First time may be slower |
| Recording (10s) | 10s | As long as video |
| Video processing | < 1s | Local processing |
| Upload (5MB video) | 3-10s | Depends on network |
| AI analysis | 5-15s | Depends on video length |
| DB save + notification | < 1s | Nearly instant |
| **Total** | **~20-40s** | For 10-second video |

### Optimization Tips

**Mobile App:**
- Use lower video quality for faster upload
- Compress video before upload (optional)
- Cache location to avoid GPS wait

**Backend:**
- Enable GZIP compression for API responses
- Use connection pooling for database
- Implement request rate limiting

**AI Service:**
- Frame sampling (analyze every Nth frame)
- Use GPU acceleration if available
- Implement video pre-processing queue

---

## ✅ Success Criteria

The integration is working correctly when:

1. ✅ **Camera Access:** App opens device camera successfully
2. ✅ **Recording:** Video records with 30-second max limit
3. ✅ **Preview:** Video plays back in app
4. ✅ **Location:** GPS coordinates captured automatically
5. ✅ **Upload:** Progress bar shows 0-100% smoothly
6. ✅ **AI Analysis:** "Analyzing..." appears during processing
7. ✅ **Results:** Dialog shows incident details with stats
8. ✅ **Database:** Incident saved (verify in backend logs)
9. ✅ **Notifications:** Real-time alerts sent to all users
10. ✅ **Error Handling:** Appropriate errors for failures

---

## 🎉 Features Summary

### What the Mobile App Can Do:

✅ **Record Video** from device camera (max 30 seconds)  
✅ **Auto-Capture Location** using GPS  
✅ **Preview Video** with play/pause controls  
✅ **Upload with Progress** tracking (0-100%)  
✅ **AI Analysis** with loading indicator  
✅ **View Results** in detailed dialog:
   - Incident detection status
   - Incident type and severity
   - Confidence percentage
   - Vehicle count and speed
   - Stationary vehicles
   - Database save confirmation
✅ **Error Handling** for:
   - Camera permission denied
   - Location permission denied
   - Network errors
   - AI service unavailable
✅ **Re-record Option** if not satisfied  
✅ **Automatic Notifications** to all users when incident detected

---

## 📚 Additional Resources

### Code Files

- **Service:** `mobile_app/lib/services/incident_service.dart`
- **Screen:** `mobile_app/lib/screens/ai_video_capture_screen.dart`
- **Backend Controller:** `backend/src/controllers/aiAnalysisController.js`
- **Backend Route:** `backend/src/routes/incidents.js`
- **AI Service:** `ai_service/main.py`

### Documentation

- **Main Guide:** `VIDEO_AI_INTEGRATION_GUIDE.md`
- **Testing:** `TEST_VIDEO_CAPTURE.md`
- **Quickstart:** `QUICKSTART_SUMMARY.md`
- **API Docs:** `API_DOCUMENTATION.md`

### API Endpoints

- **Backend:** `POST http://YOUR_IP:3000/api/incidents/analyze-video`
- **AI Service:** `POST http://localhost:8000/ai/analyze-traffic`
- **Health Check:** `GET http://localhost:8000/health`

---

## 🔄 Next Steps

1. **Build and Test App:**
   ```bash
   cd mobile_app
   flutter run
   ```

2. **Test with Real Device:** Connect Android/iOS device via USB

3. **Test All Scenarios:** Run through all test cases

4. **Deploy Backend:** Move to production server

5. **Configure Firebase:** Set up FCM for notifications

6. **App Store Submission:** Prepare for deployment

---

*Last Updated: December 2025*  
*TrafficGuard Mobile App - AI-Powered Traffic Management*
