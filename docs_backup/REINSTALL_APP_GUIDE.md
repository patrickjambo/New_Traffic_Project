# 📱 Step-by-Step: Uninstall & Reinstall Fixed App

## 🎯 Goal
Remove the old app version and install the fixed version so videos get analyzed properly.

---

## 📋 STEP-BY-STEP GUIDE

### ✅ STEP 1: Check Phone Connection

Run this command:
```bash
adb devices
```

**Expected output:**
```
List of devices attached
083163525V008935    device
```

If you see "device" next to your phone number, you're good! If not, reconnect USB cable.

---

### ✅ STEP 2: Uninstall Old App from Phone

#### Option A: Using ADB (Recommended)
```bash
adb uninstall com.trafficguard.mobile
```

**Expected output:**
```
Success
```

#### Option B: Manually on Phone (If ADB doesn't work)
1. On your phone: Settings → Apps → TrafficGuard
2. Tap "Uninstall"
3. Confirm "Yes"

---

### ✅ STEP 3: Verify App is Gone

```bash
adb shell pm list packages | grep trafficguard
```

**Expected:** No output (app is gone)

**If you still see the package:** Try Option B above to uninstall manually.

---

### ✅ STEP 4: Install Fixed Version

```bash
adb install /home/jambo/New_Traffic_Project/mobile_app/build/app/outputs/flutter-apk/app-release.apk
```

**Expected output:**
```
Performing Streamed Install
Success
```

**If you see "INSTALL_FAILED":** Add `-r` flag to force reinstall:
```bash
adb install -r /home/jambo/New_Traffic_Project/mobile_app/build/app/outputs/flutter-apk/app-release.apk
```

---

### ✅ STEP 5: Verify Installation

```bash
adb shell pm list packages | grep trafficguard
```

**Expected output:**
```
package:com.trafficguard.mobile
```

---

### ✅ STEP 6: Open App on Phone

1. Find TrafficGuard app icon
2. Tap to open
3. **Important:** If the app was already open, force close it first:
   - Swipe up (recent apps)
   - Swipe away TrafficGuard
   - Open fresh

---

### ✅ STEP 7: Start Log Monitoring

Open a terminal and run:
```bash
tail -f /home/jambo/New_Traffic_Project/backend.log | grep "POST"
```

Leave this terminal open and visible.

---

### ✅ STEP 8: Test Auto Monitor

On your phone:
1. Open TrafficGuard app
2. Tap **"Auto Monitor"** button
3. Point camera at **anything** (desk, wall, etc.)
4. Let it run for **30 seconds**
5. **Watch the terminal** (Step 7)

---

### ✅ STEP 9: Check Results

#### In the terminal, you should see:

**✅ SUCCESS - Fixed version:**
```
POST /api/incidents/analyze-video 200 1523.456 ms
POST /api/incidents/analyze-video 200 1234.567 ms
POST /api/incidents/analyze-video 200 1456.789 ms
```

**❌ FAILURE - Old version still running:**
```
POST /api/auto-analysis/analyze 500
POST /api/auto-analysis/analyze 500
```

---

### ✅ STEP 10: Verify Database

If you saw SUCCESS in Step 9, check database:

```bash
docker exec trafficguard_db psql -U trafficguard_user -d trafficguard -t -c "SELECT COUNT(*) FROM incidents"
```

**Expected:** Number should increase from 2 to 3, 4, 5, 6...

---

## 🎬 COMPLETE COMMAND SEQUENCE

Copy and paste these one by one:

```bash
# 1. Check connection
adb devices

# 2. Uninstall old app
adb uninstall com.trafficguard.mobile

# 3. Verify gone
adb shell pm list packages | grep trafficguard

# 4. Install fixed version
adb install -r /home/jambo/New_Traffic_Project/mobile_app/build/app/outputs/flutter-apk/app-release.apk

# 5. Verify installed
adb shell pm list packages | grep trafficguard

# 6. Watch logs (keep this running)
tail -f /home/jambo/New_Traffic_Project/backend.log | grep "POST"
```

Then test Auto Monitor on your phone!

---

## 🐛 Troubleshooting

### "adb: command not found"
```bash
# Install adb
sudo apt-get update
sudo apt-get install android-tools-adb
```

### "device offline" or "unauthorized"
1. Disconnect USB cable
2. On phone: Settings → Developer Options → Revoke USB debugging authorizations
3. Reconnect USB
4. Accept the authorization prompt on phone

### "INSTALL_FAILED_UPDATE_INCOMPATIBLE"
The old app is still there. Manually uninstall:
1. Phone: Settings → Apps → TrafficGuard → Uninstall
2. Then try install command again

### Still seeing old endpoint after reinstall
1. Force stop app: Settings → Apps → TrafficGuard → Force Stop
2. Clear cache: Settings → Apps → TrafficGuard → Storage → Clear Cache
3. Open app again

---

## ✅ Success Checklist

After following all steps, you should have:
- [ ] Old app uninstalled
- [ ] New app installed
- [ ] Backend logs showing: `POST /api/incidents/analyze-video 200`
- [ ] No more `/api/auto-analysis/analyze 500` errors
- [ ] Database incidents count increasing
- [ ] Phone Activity Log showing "Upload complete"

---

## 🎉 Expected Final Result

### Backend Terminal:
```
POST /api/incidents/analyze-video 200 1523.456 ms
🎥 Video received: clip_21-00-15.mp4 (5.1MB)
📍 Location: -1.9441, 30.0619
🤖 Forwarding to AI service...
✅ AI analysis complete
📊 Result: No incident detected (confidence: 0.42)

POST /api/incidents/analyze-video 200 1234.567 ms
🎥 Video received: clip_21-00-20.mp4 (4.9MB)
...
```

### Database Check:
```bash
$ docker exec trafficguard_db psql -U trafficguard_user -d trafficguard -t -c "SELECT COUNT(*) FROM incidents"
     8
```
(Increased from 2!)

### Phone Activity Log:
```
✅ Video captured (5.2s)
📤 Uploading to server...
✅ Upload complete (1.3s)
🔍 AI Analysis: No incident
⏰ Next capture in 5s
```

---

## 📞 Ready to Start?

**Begin with STEP 1** above and work through each step.

Let me know at which step you are or if you encounter any issues!

---

**🚀 Once this is done, your system will be FULLY operational!**
