# 📱 Run TrafficGuard Mobile App on Device

## ⚠️ Important: Mobile App Requires Physical Device

The AI Video Capture feature REQUIRES a physical Android/iOS device because:
- ✅ Needs real device camera hardware
- ✅ Uses dart:io for file operations
- ✅ Uses MultipartFile.fromPath() (not available on web)
- ✅ Better GPS location accuracy

**Web browsers are NOT supported for video capture.**

---

## 🚀 Run on Android Device

### Step 1: Enable Developer Mode

**On Android Device:**
1. Go to **Settings** → **About Phone**
2. Tap **Build Number** 7 times
3. You'll see "Developer mode enabled"
4. Go back to **Settings** → **Developer Options**
5. Enable **USB Debugging**

---

### Step 2: Connect Device

```bash
# Connect device via USB cable

# Verify device is connected
flutter devices

# Should show something like:
# Android SDK built for x86 (mobile) • emulator-5554 • android-x86    • Android 11 (API 30) (emulator)
# Redmi Note 9 (mobile)              • RZ8N70HXGHX   • android-arm64  • Android 11 (API 30)
```

---

### Step 3: Update Backend URL

**Edit:** `mobile_app/lib/config/app_config.dart`

```dart
class AppConfig {
  // For physical device, use your computer's IP address
  // Find your IP: ip addr show | grep "inet "
  static const String baseUrl = 'http://192.168.1.100:3000';  // Change to YOUR IP
  
  static const String nearbyIncidentsEndpoint = '/api/incidents';
  static const double nearbyIncidentsRadius = 5000;
}
```

**To find your computer's IP:**
```bash
# Linux/Mac:
ip addr show | grep "inet " | grep -v 127.0.0.1

# Or:
ifconfig | grep "inet " | grep -v 127.0.0.1

# Example output:
# inet 192.168.1.100/24 brd 192.168.1.255 scope global dynamic
# Use: 192.168.1.100
```

---

### Step 4: Install Dependencies

```bash
cd /home/jambo/New_Traffic_Project/mobile_app

flutter pub add image_picker video_player location http
flutter pub get
```

---

### Step 5: Run on Device

```bash
# List connected devices
flutter devices

# Run on specific device (use the device ID from above)
flutter run -d RZ8N70HXGHX

# Or just run on the first available device
flutter run
```

---

### Step 6: Test Video Capture

1. **App opens on your device** 📱
2. **Navigate to "AI Video Analysis"**
3. **Grant Permissions:**
   - Camera permission ✅
   - Location permission ✅
4. **Tap "Record Video"** → Device camera opens!
5. **Record traffic footage**
6. **Upload & Analyze**
7. **See AI results!**

---

## 🍎 Run on iOS Device

### Step 1: Setup (One-time)

```bash
cd /home/jambo/New_Traffic_Project/mobile_app

# Open Xcode workspace
open ios/Runner.xcworkspace
```

**In Xcode:**
1. Select your development team
2. Change bundle identifier if needed
3. Connect iPhone via USB
4. Trust computer on iPhone when prompted

---

### Step 2: Run

```bash
flutter run -d <your-iphone-id>
```

---

## 🔧 Troubleshooting

### Issue: "No devices found"

**Solution:**
```bash
# Android: Check USB debugging is enabled
adb devices

# Should show your device:
# List of devices attached
# RZ8N70HXGHX    device

# If "unauthorized", check phone for USB debugging prompt
```

---

### Issue: "Connection to backend failed"

**Check:**
1. **Backend is running:** `curl http://localhost:3000/health`
2. **Device on same WiFi** as your computer
3. **Firewall not blocking** port 3000
4. **Correct IP in app_config.dart**

**Test from device browser:**
- Open Chrome on phone
- Navigate to: `http://YOUR_IP:3000/health`
- Should show: `{"status":"ok"}`

---

### Issue: "Camera permission denied"

**Solution:**
1. Go to device **Settings** → **Apps** → **TrafficGuard**
2. **Permissions** → Enable **Camera** and **Location**
3. Reopen app

---

## ✅ Verification

When everything works:
- ✅ App installs on physical device
- ✅ Camera opens and records video
- ✅ GPS location captured
- ✅ Upload progress shows 0-100%
- ✅ AI analysis completes
- ✅ Results dialog displays
- ✅ Backend logs show incident created

---

## 📊 Expected Performance on Device

| Operation | Duration |
|-----------|----------|
| App launch | 2-3 seconds |
| Camera open | 1-2 seconds |
| Recording (10s) | 10 seconds |
| Upload (5MB) | 5-15 seconds (depends on WiFi) |
| AI analysis | 5-15 seconds |
| Total | ~25-45 seconds |

---

## 🚫 Why Not Web Browser?

Web browsers don't support:
- ❌ `dart:io` library (file system access)
- ❌ `MultipartFile.fromPath()` (native file operations)
- ❌ Native camera APIs the same way
- ❌ Reliable GPS accuracy
- ❌ Background processes

**Mobile video capture MUST run on physical device!**

---

## 🎯 Quick Command Reference

```bash
# Find your computer's IP
ip addr show | grep "inet " | grep -v 127.0.0.1

# Check connected devices
flutter devices

# Run on specific device
flutter run -d <device-id>

# Run on first available device
flutter run

# Check backend from phone browser
# Navigate to: http://YOUR_IP:3000/health

# View logs while running
flutter logs
```

---

## 📱 Alternative: Use Android Emulator with Camera

If you don't have a physical device, you can use an emulator with virtual camera:

```bash
# Create emulator with Play Store
flutter emulators --create

# Launch emulator
flutter emulators --launch <emulator-id>

# Run app
flutter run

# In app_config.dart, use:
static const String baseUrl = 'http://10.0.2.2:3000';
```

**Note:** Emulator camera is virtual and may not work perfectly for real testing.

---

## 🎉 You're Ready!

Your mobile app will:
✅ Use **real device camera** 📱
✅ Capture video with hardware acceleration
✅ Upload to backend over WiFi
✅ Get AI analysis results
✅ Display incident details

**Run on physical device for best experience!**
