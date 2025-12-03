# 📱 Testing TrafficGuard on Physical Devices - Complete Guide

## 🎯 Overview

This guide will help you test your TrafficGuard mobile app on **real Android/iOS phones** in Kigali, Rwanda.

**What You'll Test:**
- ✅ Autonomous video capture (5-second clips)
- ✅ AI incident detection
- ✅ Firebase push notifications
- ✅ GPS location tracking
- ✅ Emergency reporting
- ✅ Offline queue (if implemented)

**Time Required:** 30 minutes setup + 1-2 hours testing

---

## 📋 PREREQUISITES

### 1. ✅ **Your Computer**
- Backend server running (Node.js)
- AI service running (Python/FastAPI)
- Database running (PostgreSQL)
- Computer and phone on **same WiFi network**

### 2. 📱 **Your Phone**
- Android 6.0+ or iOS 12+
- Camera permission
- Location permission
- 4G/WiFi connection
- Car charger (for prolonged testing)

### 3. 🔌 **USB Cable**
- USB cable to connect phone to computer
- **Android**: USB-C or Micro-USB cable
- **iOS**: Lightning cable

---

## 🚀 STEP-BY-STEP SETUP

### STEP 1: Prepare Your Computer

#### A. Get Your Computer's IP Address

**On Linux/macOS:**
```bash
# Find your local IP address
ifconfig | grep "inet " | grep -v 127.0.0.1

# Or simpler:
hostname -I
```

**Example Output:**
```
192.168.1.100  ← This is your IP
```

**On Windows:**
```cmd
ipconfig
```
Look for "IPv4 Address" under your active network adapter.

**Save this IP!** You'll use it everywhere: `192.168.1.100`

---

#### B. Update Mobile App Configuration

**File:** `mobile_app/lib/config/environment.dart`

```dart
class Environment {
  // DEVELOPMENT: Use your computer's IP address
  static const String baseUrl = 'http://192.168.1.100:3000/api';  // ← UPDATE THIS!
  
  // AI Service
  static const String aiServiceUrl = 'http://192.168.1.100:8000';
  
  // WebSocket
  static const String wsUrl = 'ws://192.168.1.100:3000';
  
  // Firebase (leave as is for now)
  static const String firebaseApiKey = 'YOUR_FIREBASE_KEY';  // Add later
}
```

**💡 Important:** Replace `192.168.1.100` with YOUR actual IP address!

---

#### C. Update Backend CORS Settings

**File:** `backend/src/server.js`

Make sure CORS allows mobile connections:

```javascript
// CORS Configuration - Allow mobile devices
app.use(cors({
  origin: '*',  // ✅ Allow all origins for testing
  credentials: true,
}));

// OR more secure (production):
app.use(cors({
  origin: [
    'http://localhost:3001',  // React frontend
    'http://192.168.1.100:3001',
    'http://192.168.1.*',  // All devices on local network
  ],
  credentials: true,
}));
```

---

#### D. Start All Services

```bash
cd /home/jambo/New_Traffic_Project

# Terminal 1: Start database
docker-compose up -d database

# Terminal 2: Start backend
cd backend
npm start

# Terminal 3: Start AI service
cd ai_service
source venv/bin/activate
python main.py

# Terminal 4: Check services
curl http://localhost:3000/health      # Backend ✅
curl http://localhost:8000/health      # AI ✅
```

**Expected Output:**
```
✅ Backend: {"status":"healthy"}
✅ AI Service: {"status":"healthy","model_loaded":true}
```

---

### STEP 2: Prepare Your Phone

#### A. Enable Developer Mode

**Android:**
1. Open **Settings** → **About Phone**
2. Tap **Build Number** 7 times
3. Message appears: "You are now a developer!"
4. Go to **Settings** → **Developer Options**
5. Enable **USB Debugging**
6. Enable **Install via USB**

**iOS:**
1. No developer mode needed for testing
2. Just connect to Mac with Xcode installed

---

#### B. Connect Phone to Computer

**Android:**
1. Plug in USB cable
2. On phone: Tap **"Allow USB debugging"** → **Allow**
3. On computer, verify connection:
```bash
flutter devices
```

**Expected Output:**
```
Found 2 devices:
  Pixel 6 (mobile) • 1A2B3C4D • android-arm64 • Android 13 (API 33)
  Chrome (web)     • chrome    • web-javascript • Google Chrome 120
```

**iOS:**
1. Plug in Lightning cable
2. On phone: Tap **"Trust This Computer"** → **Trust**
3. On Mac, verify in Xcode: **Window** → **Devices and Simulators**

---

### STEP 3: Build and Install App on Phone

#### A. Navigate to Mobile App

```bash
cd /home/jambo/New_Traffic_Project/mobile_app
```

---

#### B. Get Flutter Dependencies

```bash
flutter pub get
```

**Expected Output:**
```
Running "flutter pub get" in mobile_app...
Resolving dependencies... (1.2s)
+ camera 0.10.5
+ firebase_core 2.24.0
+ firebase_messaging 14.7.0
+ geolocator 10.1.0
...
Got dependencies!
```

---

#### C. Check for Errors

```bash
flutter analyze
```

**If errors appear:** Fix them before proceeding

**Expected:** No errors or only warnings (warnings are OK)

---

#### D. Build and Install

**Android:**
```bash
# Build and install in one command
flutter run -d <device-id>

# Example:
flutter run -d 1A2B3C4D
```

**iOS:**
```bash
# Build and install (requires Mac + Xcode)
flutter run -d <iphone-name>
```

**💡 Tip:** If you see multiple devices, use the device ID from `flutter devices`

**Expected Output:**
```
Launching lib/main.dart on Pixel 6 in debug mode...
Running Gradle task 'assembleDebug'...
✓ Built build/app/outputs/flutter-apk/app-debug.apk.
Installing build/app/outputs/flutter-apk/app-debug.apk...
Waiting for Pixel 6 to report its views...
Debug service listening on ws://127.0.0.1:12345/xyz/
Synced 45.2MB

🔥 To hot reload changes while running, press "r" or "R".
   For a full restart, press "R".
   To quit, press "q".
```

**App should now open on your phone!** 📱✅

---

## 🧪 TESTING SCENARIOS

### TEST 1: Basic App Functionality ✅

**On Phone:**
1. App opens to Home Screen
2. You see: "TrafficGuard" title
3. Bottom navigation works (Home, Reports, Settings)

**✅ Pass:** App loads without crashes

---

### TEST 2: Camera Permission 📸

**On Phone:**
1. Tap **"Start Monitoring"** or **"Auto Monitor"** button
2. **Popup appears:** "Allow TrafficGuard to access camera?"
3. Tap **"Allow"** or **"While using the app"**

**✅ Pass:** Camera permission granted

---

### TEST 3: Location Permission 📍

**On Phone:**
1. **Popup appears:** "Allow TrafficGuard to access location?"
2. Tap **"Allow all the time"** (best for testing)
3. Or: **"Allow while using app"**

**✅ Pass:** Location permission granted

**Check GPS:**
```dart
// In app, should show:
📍 GPS: -1.9441, 30.0619
📍 Location: KN 3 Ave, CBD, Nyarugenge District, Kigali
```

---

### TEST 4: Backend Connection 🌐

**On Phone:**
1. Check app logs (if visible in debug mode)
2. Should see: "✅ Connected to backend"

**On Computer Terminal (Backend logs):**
```bash
# You should see:
[POST] /api/auth/login - 200 OK
[GET] /api/incidents - 200 OK
```

**✅ Pass:** Phone successfully connects to backend

**❌ Fail Troubleshooting:**
```
Error: Connection refused
→ Check: Is backend running? (curl http://localhost:3000/health)
→ Check: Is IP address correct in environment.dart?
→ Check: Are phone and computer on same WiFi?
→ Check: Firewall blocking port 3000?
```

---

### TEST 5: Autonomous Monitoring (THE BIG TEST!) 🎥

#### Setup:
1. **Place phone on dashboard** (or hold steady)
2. **Point camera at road/street**
3. **Make sure GPS is enabled**

#### Start Test:

**On Phone:**
1. Tap **"Auto Monitor"** screen
2. Tap **"Start Monitoring"** button
3. Watch the screen

**Expected Behavior:**

```
Status: Monitoring active...
Clips Captured: 1 → 2 → 3 → 4 → 5...
Clips Processed: 0 → 1 → 2 → 3...
Incidents Detected: 0

Activity Log:
09:15:23 - ✅ Camera initialized
09:15:24 - ✅ Recording started (clip 1)
09:15:29 - ✅ Recording stopped (5 seconds)
09:15:29 - 📤 Uploading clip 1...
09:15:32 - ✅ AI analysis complete
09:15:32 - ℹ️ No incident detected (confidence: 0.23)
09:15:33 - ✅ Recording started (clip 2)
09:15:38 - ✅ Recording stopped (5 seconds)
```

**On Computer (Backend Terminal):**
```
[POST] /api/auto-analysis/analyze - Received video (3.2 MB)
[AI Service] Analyzing clip... vehicles: 2, confidence: 0.23
[AI Service] No incident detected
[200] Analysis complete - No incident
```

**On Computer (AI Service Terminal):**
```
INFO: POST /ai/quick-analyze - Analyzing 5-second clip
INFO: Detected 2 vehicles, avg_speed: 35 km/h
INFO: No incident: confidence 0.23 < threshold 0.6
INFO: Video deleted (no incident)
```

**✅ Pass Criteria:**
- ✅ Videos capture every 5 seconds
- ✅ Videos upload to backend
- ✅ AI analyzes and returns results
- ✅ Activity log updates in real-time
- ✅ Counters increment correctly

---

### TEST 6: Incident Detection 🚨

**How to Trigger:**

**Option 1: Real Kigali Traffic**
- Drive on busy street (KN 3 Ave, Nyabugogo)
- Wait for natural incident (accident, congestion)
- System should detect automatically

**Option 2: Simulate Incident (Testing)**
- Point camera at **stationary cars** (parked cars)
- AI should detect: "2 stationary vehicles → Accident"

**Option 3: Show Video to Camera**
- Play a video of an accident on another phone/laptop
- Point camera at that screen
- AI analyzes the video

**Expected When Incident Detected:**

```
Status: ⚠️ INCIDENT DETECTED!
Incidents Detected: 1
Severity: HIGH

Activity Log:
09:20:15 - ⚠️ Incident detected! Type: accident, Severity: high, Confidence: 87%
09:20:16 - 🆕 Creating new incident report...
09:20:17 - ✅ Incident report created (ID: 123)
09:20:18 - 📍 Location: KN 3 Ave, CBD, Nyarugenge District, Kigali
09:20:19 - 🚨 Critical incident - Creating emergency report...
09:20:20 - ✅ Emergency created (ID: 45)
09:20:21 - 📱 Push notification sent to police
```

**✅ Pass:** Incident detected, reported, and police notified

---

### TEST 7: Duplicate Prevention 🔄

**Setup:**
1. Keep camera pointing at **same location**
2. Trigger incident (stationary cars)
3. Let system capture 5-6 more clips

**Expected Behavior:**

```
Clip 1: 🆕 Creating new incident #123 (accident on KN 3 Ave)
Clip 2: 🔄 Updated incident #123 (11m away, same location)
Clip 3: 🔄 Updated incident #123 (8m away, same location)
Clip 4: 🔄 Updated incident #123 (15m away, same location)
Clip 5: 🔄 Updated incident #123 (9m away, same location)

Result:
Incidents Created: 1  ← Only ONE!
Duplicates Prevented: 4  ← Saved 4 duplicate reports ✅
```

**✅ Pass:** Only 1 incident created, duplicates prevented

---

### TEST 8: Firebase Push Notifications 🔔

**Prerequisites:**
- Firebase project created
- `google-services.json` added to `android/app/`
- App rebuilt with Firebase

**Test:**

**Device 1 (Your Phone):**
1. Start monitoring
2. Trigger incident detection
3. Wait for incident to be created

**Device 2 (Another Phone - Police Role):**
1. Install app
2. Subscribe to Kigali alerts
3. Wait...

**Expected on Device 2:**
```
🔔 Notification appears:
━━━━━━━━━━━━━━━━━━━━━━
🚨 Accident Detected
KN 3 Ave, CBD, Nyarugenge District, Kigali

Severity: High | Confidence: 87%
Tap to view details
━━━━━━━━━━━━━━━━━━━━━━
```

**✅ Pass:** Push notification received on other phone

**Note:** This test requires Firebase setup (see Firebase section below)

---

### TEST 9: Emergency Report 🚨

**On Phone:**
1. Tap **Home** → **"Emergency Report"** card
2. Fill form:
   - **Type:** Accident
   - **Severity:** Critical
   - **Location:** Tap "Get Current Location"
   - **Description:** "Test emergency - Vehicle collision on KN 3 Ave"
   - **Contact:** +250788123456
3. Tap **"Submit Emergency"**

**Expected:**
```
✅ Success Dialog:
━━━━━━━━━━━━━━━━━━━━━━
✅ Emergency Reported Successfully

Emergency ID: #45
Type: Accident
Location: KN 3 Ave, Kigali

Police have been notified and will respond shortly.
━━━━━━━━━━━━━━━━━━━━━━
```

**On Computer (Backend logs):**
```
[POST] /api/emergency - Creating emergency
[Database] Emergency #45 created at (-1.9441, 30.0619)
[FCM] Sending push to topics: nyarugenge_police, kigali_alerts
[WebSocket] Broadcasting emergency:new event
```

**✅ Pass:** Emergency created and police notified

---

### TEST 10: GPS Accuracy 📍

**Test GPS Detection:**

**On Phone:**
1. Open app settings or home screen
2. Check displayed location

**Expected:**
```
📍 Current Location:
GPS: -1.9441, 30.0619
Accuracy: ±10 meters
Location: KN 3 Ave, CBD, Nyarugenge District, Kigali
```

**Test in Different Kigali Locations:**

| Location | Expected GPS | Expected Display |
|----------|-------------|------------------|
| KN 3 Ave, CBD | -1.9441, 30.0619 | "KN 3 Ave, CBD, Nyarugenge" |
| Nyabugogo | -1.9676, 30.0439 | "Nyabugogo, Nyarugenge" |
| Kimihurura | -1.9403, 30.1067 | "Kimihurura, Gasabo" |
| Remera | -1.9547, 30.1155 | "Remera, Gasabo" |

**✅ Pass:** GPS accurately detects Kigali locations

---

## 🚗 REAL-WORLD TESTING SCENARIOS

### Scenario 1: Morning Commute (KN 3 Ave → Kimihurura)

**Setup:**
- Fully charged phone
- Car charger connected
- Phone mounted on dashboard
- App in "Auto Monitor" mode

**Test Duration:** 30 minutes

**Route:**
1. Start at KN 3 Ave (CBD)
2. Drive through Nyabugogo
3. Pass through tunnels
4. End at Kimihurura

**What to Observe:**
- ✅ Videos captured continuously
- ✅ GPS updates along route
- ✅ Internet connection maintained (4G)
- ✅ Incidents detected in busy areas
- ⚠️ Queue activates in tunnel (if offline support added)
- ✅ Battery drains slowly (with charger)

**Expected Results:**
```
Duration: 30 minutes
Clips Captured: 360 (30 min × 12 clips/min)
Clips Uploaded: 360
Incidents Detected: 0-3 (depending on traffic)
Duplicates Prevented: 0-10
Battery Usage: +5% (with charger)
Data Used: ~1 GB (360 clips × 3 MB)
```

---

### Scenario 2: Tunnel Test (Offline Capability)

**Location:** Any Kigali tunnel or underground parking

**Setup:**
1. Start monitoring before tunnel
2. Enter tunnel (lose signal)
3. Exit tunnel (regain signal)

**What to Observe:**

**Without Offline Queue:**
```
Before Tunnel: Videos upload ✅
In Tunnel: Videos fail to upload ❌ (data lost)
After Tunnel: Videos upload again ✅
```

**With Offline Queue (if implemented):**
```
Before Tunnel: Videos upload ✅
In Tunnel: Videos queued 📴 (3 videos)
After Tunnel: Queue processes ✅ (3 videos uploaded)
```

---

### Scenario 3: Accident Simulation

**Location:** Parking lot or safe area

**Setup:**
1. Park 2-3 cars close together
2. Point phone camera at cars
3. Leave cars stationary for 30 seconds

**Expected AI Detection:**
```
Clip 1: Detected 3 stationary vehicles → Possible accident
Confidence: 0.78 → HIGH severity
Result: Incident created, police notified
```

---

## 🔥 FIREBASE SETUP (For Push Notifications)

### Step 1: Create Firebase Project

1. Go to: https://console.firebase.google.com/
2. Click **"Add project"**
3. Name: **"TrafficGuard Kigali"**
4. Disable Google Analytics (not needed)
5. Click **"Create project"**

---

### Step 2: Add Android App

1. Click **⚙️ Settings** → **"Project settings"**
2. Click **"Add app"** → **Android icon**
3. **Android package name:** `com.trafficguard.mobile` (check `android/app/build.gradle`)
4. **App nickname:** "TrafficGuard Mobile"
5. Click **"Register app"**
6. **Download `google-services.json`**

---

### Step 3: Add google-services.json to App

```bash
cd /home/jambo/New_Traffic_Project/mobile_app

# Move downloaded file
cp ~/Downloads/google-services.json android/app/

# Verify file exists
ls -la android/app/google-services.json
```

**Expected:** File exists with size ~1-2 KB

---

### Step 4: Update Android Build Files

**File:** `android/build.gradle`

Add Google Services plugin:

```gradle
buildscript {
    dependencies {
        classpath 'com.android.tools.build:gradle:7.3.0'
        classpath "org.jetbrains.kotlin:kotlin-gradle-plugin:$kotlin_version"
        classpath 'com.google.gms:google-services:4.3.15'  // ← ADD THIS
    }
}
```

**File:** `android/app/build.gradle`

Add at bottom:

```gradle
apply plugin: 'com.android.application'
apply plugin: 'kotlin-android'
apply from: "$flutterRoot/packages/flutter_tools/gradle/flutter.gradle"
apply plugin: 'com.google.gms.google-services'  // ← ADD THIS
```

---

### Step 5: Rebuild App with Firebase

```bash
# Clean previous build
flutter clean

# Get dependencies
flutter pub get

# Rebuild and install
flutter run -d <device-id>
```

**Expected:** App installs with Firebase enabled

---

### Step 6: Test Firebase Notifications

**On Phone:**
1. Open app
2. Allow notification permissions
3. Check logs for FCM token:

```
📱 FCM Token: dA3F...xY9Z (152 characters)
✅ Subscribed to: kigali_alerts
✅ Subscribed to: location_-194_306
✅ Subscribed to: area_-19_30
```

**On Computer (Backend):**

Send test notification:

```bash
# Send test push via Firebase
curl -X POST https://fcm.googleapis.com/fcm/send \
  -H "Authorization: key=YOUR_SERVER_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "to": "/topics/kigali_alerts",
    "notification": {
      "title": "Test Alert",
      "body": "Firebase push working! 🎉"
    }
  }'
```

**Expected:** Notification appears on phone even if app closed! 🔔

---

## 🐛 TROUBLESHOOTING

### Problem 1: "Connection Refused" Error

**Symptoms:**
```
❌ Failed to connect to backend
Error: Connection refused at 192.168.1.100:3000
```

**Solutions:**

1. **Check backend is running:**
```bash
curl http://localhost:3000/health
```
Expected: `{"status":"healthy"}`

2. **Check IP address is correct:**
```bash
hostname -I
```
Update `environment.dart` with correct IP

3. **Check phone and computer on same WiFi:**
- Phone: Settings → WiFi → Check network name
- Computer: Should be on same network

4. **Check firewall:**
```bash
# Linux: Allow port 3000
sudo ufw allow 3000

# Or disable temporarily for testing
sudo ufw disable
```

5. **Try from phone browser:**
- Open Chrome on phone
- Navigate to: `http://192.168.1.100:3000/health`
- Should see: `{"status":"healthy"}`

---

### Problem 2: Camera Not Working

**Symptoms:**
```
❌ Camera initialization failed
PlatformException: Camera access denied
```

**Solutions:**

1. **Check permissions:**
- Settings → Apps → TrafficGuard → Permissions
- Camera: ✅ Allowed
- Location: ✅ Allowed

2. **Uninstall and reinstall:**
```bash
flutter clean
flutter run -d <device-id>
```

3. **Check camera hardware:**
- Open native camera app
- Take photo to verify camera works

---

### Problem 3: GPS Not Accurate

**Symptoms:**
```
📍 GPS: 0.0, 0.0
Accuracy: ±2000 meters
```

**Solutions:**

1. **Enable high accuracy:**
- Settings → Location → Mode → **High Accuracy**

2. **Go outside:**
- GPS works better outdoors
- Wait 30-60 seconds for GPS lock

3. **Check location services:**
```dart
// In app, should show:
GPS Status: ✅ Enabled
Accuracy: ±10 meters  (good)
```

---

### Problem 4: Videos Not Uploading

**Symptoms:**
```
📤 Uploading clip 1...
❌ Upload failed: Timeout
```

**Solutions:**

1. **Check internet connection:**
- WiFi or 4G enabled on phone
- Test: Open browser, visit google.com

2. **Check backend receiving:**
```bash
# Backend terminal should show:
[POST] /api/auto-analysis/analyze
```

3. **Check AI service:**
```bash
curl http://localhost:8000/health
```

4. **Reduce video size:**
- Currently ~3-5 MB per clip
- If too large, add compression (see MOBILE_ENHANCEMENTS_ANALYSIS.md)

---

### Problem 5: App Crashes

**Symptoms:**
```
App closes unexpectedly
"TrafficGuard has stopped"
```

**Solutions:**

1. **Check logs:**
```bash
# While phone is connected
flutter logs
```

2. **Common crash causes:**
- Out of memory (too many videos queued)
- Camera permission denied
- Null pointer exception

3. **Rebuild in debug mode:**
```bash
flutter run -d <device-id> --debug
```

4. **Check storage space:**
- Settings → Storage
- Need 2+ GB free for video buffering

---

## 📊 TESTING CHECKLIST

Use this checklist during testing:

```
📱 DEVICE SETUP
□ Developer mode enabled
□ USB debugging enabled
□ Phone connected to computer
□ Flutter recognizes device
□ Same WiFi network as computer

🔧 APP INSTALLATION
□ environment.dart updated with correct IP
□ flutter pub get completed
□ App builds without errors
□ App installs on phone
□ App opens successfully

📸 BASIC FEATURES
□ Camera permission granted
□ Location permission granted
□ GPS detects Kigali location correctly
□ Backend connection successful
□ Home screen loads properly

🎥 AUTONOMOUS MONITORING
□ "Start Monitoring" button works
□ Videos capture every 5 seconds
□ Videos upload to backend
□ AI analyzes videos
□ Activity log updates in real-time
□ Counters increment correctly

🚨 INCIDENT DETECTION
□ Incident detected (real or simulated)
□ Severity calculated correctly
□ Confidence score shown
□ Incident report created in database
□ Location captured correctly

🔄 DUPLICATE PREVENTION
□ Multiple clips of same incident
□ Only 1 incident created
□ Subsequent clips update same incident
□ Duplicates prevented counter increases

📱 PUSH NOTIFICATIONS (with Firebase)
□ FCM token generated
□ Subscribed to Kigali topics
□ Notification received on other device
□ Notification works when app closed
□ Tap notification opens app

🚨 EMERGENCY REPORTING
□ Emergency form opens
□ All fields validate correctly
□ Location auto-detected
□ Form submits successfully
□ Success dialog appears
□ Backend receives emergency

🗺️ GPS TESTING
□ Accurate in Kigali CBD
□ Accurate in Nyabugogo
□ Accurate in Kimihurura
□ Updates while driving
□ Formatted as Kigali locations

🚗 REAL-WORLD TESTING
□ Tested on real Kigali streets
□ Tested in traffic conditions
□ Tested in tunnel (optional)
□ Battery usage acceptable
□ Data usage tracked
□ No crashes during 30-min test
```

---

## 🎯 SUCCESS CRITERIA

Your app is **READY FOR PILOT LAUNCH** when:

✅ **All basic features work** (camera, GPS, upload)
✅ **Incident detection accuracy >70%** (7/10 real incidents detected)
✅ **No crashes during 30-minute drive**
✅ **Battery drain <20% per hour** (with charger)
✅ **Push notifications delivered** (if Firebase setup)
✅ **Duplicate prevention works** (prevents >80% of duplicates)
✅ **GPS accuracy ±50 meters** in Kigali CBD

---

## 🚀 NEXT STEPS AFTER TESTING

1. **Fix Critical Bugs**
   - Fix any crashes
   - Fix connection issues
   - Improve GPS accuracy

2. **Pilot with 5-10 Users**
   - Recruit volunteer testers in Kigali
   - Test on real commutes for 1 week
   - Collect feedback

3. **Add Missing Features**
   - Wakelock (keep screen on)
   - Video compression
   - Offline queue (if needed)

4. **Launch to Public**
   - Google Play Store
   - Marketing in Kigali
   - Onboard police stations

---

## 📞 SUPPORT

**Need Help?**
- Check `COMPLETE_INTEGRATION_VERIFICATION.md`
- Check `MOBILE_OFFLINE_CAPABILITY_ANALYSIS.md`
- Check backend logs: `tail -f backend.log`
- Check AI logs: `tail -f ai_service.log`

---

**🇷🇼 You're ready to test TrafficGuard on real Kigali streets! Follow this guide step-by-step, and your autonomous incident detection system will be working on physical devices. Good luck with testing! 🚗📱🎉**
