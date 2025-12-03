# 🧪 TEST YOUR MOBILE APP AI INTEGRATION NOW

## Step 1: Check Services Status

### A. Check Database
```bash
docker ps | grep postgres
# Should show: trafficguard_db running
```

**If not running:**
```bash
cd /home/jambo/New_Traffic_Project
docker-compose up -d database
```

---

### B. Check Backend
```bash
curl http://localhost:3000/health
# Should return: {"status":"ok"}
```

**If not running:**
```bash
cd /home/jambo/New_Traffic_Project/backend
npm start
# Or use the startup script:
cd /home/jambo/New_Traffic_Project
./start_integrated_system.sh
```

---

### C. Check AI Service
```bash
curl http://localhost:8000/health
# Should return: {"status":"healthy","model_loaded":true}
```

**If not running:**
```bash
cd /home/jambo/New_Traffic_Project/ai_service
source venv/bin/activate
python main.py
```

---

## Step 2: Test Backend Endpoint Directly

### Test with cURL (using a test video)

First, create a short test video or use an existing one:

```bash
# Test the endpoint
curl -X POST \
  -F "video=@/path/to/test_video.mp4" \
  -F "latitude=40.7128" \
  -F "longitude=-74.0060" \
  http://localhost:3000/api/incidents/analyze-video
```

**Expected Response:**
```json
{
  "success": true,
  "data": {
    "incident_detected": true,
    "incident_type": "congestion",
    "confidence": 0.75,
    "vehicle_count": 10,
    "avg_speed": 20.5,
    "stationary_count": 2,
    "incident_created": true,
    "incident_id": 1,
    "severity": "medium"
  }
}
```

---

## Step 3: Setup Mobile App

### A. Update Backend URL

Edit: `mobile_app/lib/config/app_config.dart`

```dart
class AppConfig {
  // For Android Emulator:
  static const String baseUrl = 'http://10.0.2.2:3000';
  
  // For Physical Device (replace with your computer's IP):
  // static const String baseUrl = 'http://192.168.1.100:3000';
  
  static const String nearbyIncidentsEndpoint = '/api/incidents';
  static const double nearbyIncidentsRadius = 5000;
}
```

**To find your computer's IP:**
```bash
# On Linux/Mac:
ip addr show | grep "inet " | grep -v 127.0.0.1

# Or:
ifconfig | grep "inet " | grep -v 127.0.0.1
```

---

### B. Install Dependencies

```bash
cd /home/jambo/New_Traffic_Project/mobile_app
flutter pub add image_picker video_player location
flutter pub get
```

---

### C. Add Screen to Navigation

Edit: `mobile_app/lib/screens/home_screen.dart`

Add this import at the top:
```dart
import 'ai_video_capture_screen.dart';
```

Add this to your navigation menu (in the drawer or home screen grid):
```dart
Card(
  child: InkWell(
    onTap: () {
      Navigator.push(
        context,
        MaterialPageRoute(
          builder: (context) => const AIVideoCaptureScreen(),
        ),
      );
    },
    child: Column(
      mainAxisAlignment: MainAxisAlignment.center,
      children: [
        Icon(Icons.video_camera_front, size: 48, color: Colors.deepPurple),
        SizedBox(height: 8),
        Text('AI Video Analysis', textAlign: TextAlign.center),
      ],
    ),
  ),
),
```

---

## Step 4: Test Mobile App

### A. Run the App

**For Android Emulator:**
```bash
cd /home/jambo/New_Traffic_Project/mobile_app
flutter run
```

**For Physical Device:**
```bash
# Connect device via USB
# Enable USB Debugging on device
flutter devices  # List connected devices
flutter run -d <device-id>
```

---

### B. Test Video Capture Flow

1. **Open App** → Navigate to "AI Video Analysis"
   
2. **Grant Permissions:**
   - Allow camera access when prompted
   - Allow location access when prompted

3. **Record Video:**
   - Tap "Record Video" button
   - **Device camera should open** 📱
   - Record some footage (5-30 seconds)
   - Stop recording

4. **Preview:**
   - Video preview should appear
   - Tap play icon to review
   - If not satisfied, tap "Re-record"

5. **Upload & Analyze:**
   - Tap "Upload & Analyze" button
   - **Watch for:**
     - Progress bar: 0% → 100% ✅
     - "AI analyzing video..." message ✅
     - Results dialog appears ✅

6. **View Results:**
   - Dialog should show:
     - ✅ Incident detected? (Yes/No)
     - 🏷️ Incident type
     - ⚠️ Severity with color
     - 📈 Confidence %
     - 🚗 Vehicle count
     - ⚡ Average speed
     - 🛑 Stationary vehicles
     - ✅ "Incident saved" message
     - 📬 "Notifications sent" message

---

## Step 5: Verify Backend Processing

### Check Backend Logs

You should see in the backend console:
```
📹 Analyzing video for incident detection...
🤖 AI Results: {
  incident_detected: true,
  incident_type: 'congestion',
  confidence: 0.75,
  vehicle_count: 10
}
✅ Incident created: ID 1
📡 WebSocket notification sent
📬 Notifications sent to 3 users
```

### Check AI Service Logs

You should see:
```
POST /ai/analyze-traffic
Analyzing video: recording.webm (2.1 MB)
Frames analyzed: 180
Vehicles detected: 10
Analysis time: 8.2s
```

### Check Database

```bash
docker exec -it trafficguard_db psql -U trafficguard_user -d trafficguard

# Run query:
SELECT 
  id, 
  type, 
  severity, 
  ai_confidence,
  ai_metadata->'vehicle_count' as vehicles,
  created_at
FROM incidents
ORDER BY created_at DESC
LIMIT 5;
```

**Should show new incident with AI data!**

---

## Step 6: Test Error Scenarios

### A. Camera Permission Denied

1. Go to device settings
2. Deny camera permission for app
3. Try to record video
4. **Expected:** Error message "Camera access denied"

---

### B. Location Permission Denied

1. Deny location permission
2. Try to upload video
3. **Expected:** Error message "Location permission denied"

---

### C. Backend Not Running

1. Stop backend: `Ctrl+C` in backend terminal
2. Try to upload video
3. **Expected:** Network error message
4. Restart backend

---

### D. AI Service Down

1. Stop AI service: `Ctrl+C` in AI service terminal
2. Try to upload video
3. **Expected:** "AI service unavailable (503)" error
4. Restart AI service

---

## Step 7: Test Web Dashboard Notifications

### A. Open Web Dashboard

```bash
cd /home/jambo/New_Traffic_Project/trafficguard-react
npm start
```

Open: http://localhost:3001

### B. Login

Use any account (admin/police/user)

### C. Watch for Notifications

After uploading video from mobile:
1. **Notification bell** should update with new count
2. **Click bell** → See new incident notification
3. **Notification should show:**
   - Incident type and severity
   - Confidence percentage
   - Vehicle count and speed
   - Location
   - Timestamp

---

## ✅ Success Checklist

### Mobile App:
- [ ] Camera opens successfully
- [ ] Video records (max 30 seconds)
- [ ] Video preview works
- [ ] GPS location captured
- [ ] Upload progress bar: 0-100%
- [ ] AI analysis loading indicator
- [ ] Results dialog appears
- [ ] All stats displayed correctly
- [ ] Error messages work

### Backend:
- [ ] Endpoint receives video
- [ ] Forwards to AI service
- [ ] Receives AI results
- [ ] Creates database entry
- [ ] Broadcasts WebSocket event
- [ ] Console logs show process

### Database:
- [ ] New incident created
- [ ] ai_confidence populated
- [ ] ai_metadata has vehicle stats
- [ ] Notifications created

### Web Dashboard:
- [ ] Receives WebSocket notification
- [ ] Bell icon updates
- [ ] Notification displays
- [ ] Shows all incident details

---

## 🐛 Common Issues

### Issue: "Network Error" in mobile app

**Check:**
1. Backend URL in app_config.dart is correct
2. Device is on same WiFi network as backend
3. Backend is actually running: `curl http://localhost:3000/health`

**Fix for Android Emulator:**
```dart
// Use this URL for emulator:
static const String baseUrl = 'http://10.0.2.2:3000';
```

**Fix for Physical Device:**
```dart
// Find your computer's IP:
// Linux: ip addr show | grep "inet "
// Use: http://YOUR_IP:3000
static const String baseUrl = 'http://192.168.1.100:3000';
```

---

### Issue: Camera not opening

**Check:**
1. Permissions in AndroidManifest.xml
2. Runtime permissions granted
3. Test on physical device (emulators can be unreliable)

**Fix:**
```bash
# Reinstall app to reset permissions:
flutter clean
flutter run
```

---

### Issue: "AI service unavailable (503)"

**Check:**
```bash
curl http://localhost:8000/health
```

**Fix:**
```bash
cd ai_service
source venv/bin/activate
python main.py
```

---

### Issue: Upload takes too long

**Possible causes:**
- Large video file (> 50MB)
- Slow network connection
- AI service processing many frames

**Fix:**
- Record shorter videos (< 15 seconds)
- Check network speed
- Ensure AI service is not overloaded

---

## 📊 Expected Performance

| Operation | Expected Time |
|-----------|---------------|
| Camera open | 1-2 seconds |
| Recording (10s) | 10 seconds |
| Upload (5MB) | 3-10 seconds |
| AI analysis | 5-15 seconds |
| Database save | < 1 second |
| Notification | < 1 second |
| **Total** | **~20-40 seconds** |

---

## 🎉 What Success Looks Like

When everything works, you should see:

1. **Mobile App:**
   - Smooth camera operation
   - Real-time progress feedback
   - Clear result display with all stats
   - Professional error handling

2. **Backend Logs:**
   ```
   📹 Analyzing video...
   🤖 AI Results: {...}
   ✅ Incident created: ID 1
   📡 WebSocket sent
   📬 Notifications sent to 3 users
   ```

3. **Database:**
   - New incident entry with AI data
   - ai_confidence: 0.75
   - ai_metadata: {"vehicle_count": 10, "avg_speed": 20.5}

4. **Web Dashboard:**
   - Real-time notification appears
   - Shows all incident details
   - Updates incident list live

---

## 🚀 Ready to Test?

### Quick Start Commands:

```bash
# Terminal 1 - Database
docker-compose up -d database

# Terminal 2 - Backend
cd backend
npm start

# Terminal 3 - AI Service
cd ai_service
source venv/bin/activate
python main.py

# Terminal 4 - Mobile App
cd mobile_app
flutter run

# Terminal 5 - Web Dashboard (optional)
cd trafficguard-react
npm start
```

---

## 📞 Need Help?

1. **Check logs** in all terminals
2. **Verify services** with health endpoints
3. **Review documentation:**
   - MOBILE_APP_AI_INTEGRATION.md
   - VIDEO_AI_INTEGRATION_GUIDE.md
   - TEST_VIDEO_CAPTURE.md

---

**Happy Testing! 🎉**

*All systems are ready for your mobile app AI video integration test!*
