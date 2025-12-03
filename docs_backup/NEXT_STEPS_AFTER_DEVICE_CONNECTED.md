# 📱 Next Steps: Your Infinix X657 is Connected!

## ✅ Device Connected Successfully!
Your Infinix X657 Android phone is now connected. Let's get the app running!

---

## 🚀 STEP-BY-STEP GUIDE

### STEP 1: Update Backend IP Address (CRITICAL!)

Your phone needs to connect to your computer's backend server.

**A. Find Your Computer's IP Address:**
```bash
hostname -I
# Example output: 192.168.1.100  ← Copy this number!
```

**B. Update Mobile App Configuration:**

Edit file: **`mobile_app/lib/config/environment.dart`**

```dart
class Environment {
  // 🔥 UPDATE THIS with YOUR computer's IP address!
  static const String baseUrl = 'http://192.168.1.100:3000/api';  // ← Change IP here
  static const String aiServiceUrl = 'http://192.168.1.100:8000'; // ← Change IP here
  static const String wsUrl = 'ws://192.168.1.100:3000';          // ← Change IP here
  
  // Keep these as is
  static const String firebaseApiKey = 'YOUR_FIREBASE_KEY';
}
```

**💡 IMPORTANT:** 
- Replace `192.168.1.100` with YOUR actual computer IP
- Make sure phone and computer are on **same WiFi network**

---

### STEP 2: Start Backend Services

Open 3 separate terminals:

**Terminal 1 - Database:**
```bash
cd /home/jambo/New_Traffic_Project
docker-compose up -d database

# Verify database is running
docker ps | grep trafficguard_db
```

**Terminal 2 - Backend API:**
```bash
cd /home/jambo/New_Traffic_Project/backend
npm start
```

**Expected output:**
```
✓ Connected to PostgreSQL database
✓ WebSocket server initialized
Server running on port 3000
```

**Terminal 3 - AI Service:**
```bash
cd /home/jambo/New_Traffic_Project/ai_service
source venv/bin/activate
python main.py
```

**Expected output:**
```
INFO:     Loading YOLOv8 model...
INFO:     Model loaded successfully
INFO:     Uvicorn running on http://0.0.0.0:8000
```

---

### STEP 3: Verify Services Are Running

In a new terminal:
```bash
# Test backend
curl http://localhost:3000/health
# Should return: {"status":"healthy"}

# Test AI service
curl http://localhost:8000/health
# Should return: {"status":"healthy","model_loaded":true}
```

**✅ If both return "healthy", proceed to next step!**

---

### STEP 4: Build and Install App on Phone

```bash
cd /home/jambo/New_Traffic_Project/mobile_app

# Clean previous builds
flutter clean

# Get dependencies
flutter pub get

# Build and install on your Infinix X657
flutter run -d "Infinix X657"
```

**Expected process:**
```
Launching lib/main.dart on Infinix X657 in debug mode...
Running Gradle task 'assembleDebug'...
✓ Built build/app/outputs/flutter-apk/app-debug.apk.
Installing build/app/outputs/flutter-apk/app.apk...
Synced 45.2MB

🔥 App is now running on your phone!
```

**This will take 2-5 minutes for first build.**

---

### STEP 5: Test Backend Connection from Phone

**On Your Phone:**

1. **Open Chrome browser** on phone
2. **Navigate to:** `http://YOUR_COMPUTER_IP:3000/health`
   - Example: `http://192.168.1.100:3000/health`
3. **Should see:** `{"status":"healthy"}`

**✅ If you see this, your phone can reach the backend!**

**❌ If "Connection refused":**
- Check computer and phone on same WiFi
- Check firewall isn't blocking port 3000:
  ```bash
  sudo ufw allow 3000
  sudo ufw allow 8000
  ```

---

### STEP 6: Grant Permissions on Phone

When app opens, it will ask for permissions:

1. **Camera Permission:**
   - Popup: "Allow TrafficGuard to access camera?"
   - Tap: **"Allow"** or **"While using app"**

2. **Location Permission:**
   - Popup: "Allow TrafficGuard to access location?"
   - Tap: **"Allow all the time"** (recommended)
   - OR: **"Allow while using app"**

3. **Notification Permission:**
   - Popup: "Allow notifications?"
   - Tap: **"Allow"**

---

### STEP 7: Test Basic Functionality

**On Your Phone (TrafficGuard App):**

1. **Home Screen Should Show:**
   - "TrafficGuard" title ✅
   - Bottom navigation (Home, Reports, Settings) ✅
   - Emergency button ✅

2. **Tap "Auto Monitor" Button**
3. **Tap "Start Monitoring"**

**Expected Log Output:**
```
09:15:23 - ✅ Camera initialized
09:15:24 - ✅ GPS enabled
09:15:24 - 📍 Location: Kigali, Rwanda
09:15:25 - ✅ Recording started (clip 1)
09:15:30 - ✅ Recording stopped (5 seconds)
09:15:30 - 📤 Uploading clip 1...
09:15:33 - ✅ AI analysis complete
09:15:33 - ℹ️ No incident detected
```

**✅ If you see this, everything is working!**

---

### STEP 8: Check Backend Receives Videos

**On Computer (Backend Terminal):**

You should see:
```
[POST] /api/auto-analysis/analyze - Received video (3.2 MB)
[AI] Analyzing clip... vehicles: 2, confidence: 0.23
[AI] No incident detected
[200] Analysis complete
```

**✅ Success!** Phone is uploading videos to backend, AI is analyzing them!

---

## 🚗 STEP 9: Real Kigali Test (Optional)

If you want to test on real streets:

1. **Mount phone on car dashboard** (or use phone holder)
2. **Connect car charger** (monitoring drains battery)
3. **Point camera at road**
4. **Start monitoring**
5. **Drive on any Kigali street** (KN 3 Ave, Nyabugogo, etc.)

**System will:**
- ✅ Capture 5-second videos every 5 seconds
- ✅ Upload to backend
- ✅ AI analyzes for incidents
- ✅ Detect accidents, congestion, etc.
- ✅ Send push notifications to police
- ✅ Prevent duplicates

---

## 🐛 TROUBLESHOOTING

### Problem: "Camera initialization failed"

**Solution:**
```
On Phone:
Settings → Apps → TrafficGuard → Permissions
→ Camera: Allow
→ Location: Allow all the time
→ Storage: Allow

Then restart app
```

---

### Problem: "Connection refused" in app logs

**Solution 1: Check IP address**
```bash
# On computer
hostname -I
# Copy the IP (e.g., 192.168.1.100)

# Update mobile_app/lib/config/environment.dart with this IP
```

**Solution 2: Check same WiFi**
```
Phone: Settings → WiFi → Check network name
Computer: Check you're on same WiFi network
```

**Solution 3: Allow firewall**
```bash
sudo ufw allow 3000
sudo ufw allow 8000
```

**Solution 4: Test from phone browser**
```
Open Chrome on phone
Navigate to: http://YOUR_IP:3000/health
Should see: {"status":"healthy"}
```

---

### Problem: "GPS not working" or "Location: 0.0, 0.0"

**Solution:**
```
1. Go outside (GPS works better outdoors)
2. Wait 30-60 seconds for GPS lock
3. Check: Settings → Location → Mode → High Accuracy
4. Make sure Location permission = "Allow all the time"
```

---

### Problem: App builds but crashes on phone

**Check logs:**
```bash
# While phone is connected via USB
flutter logs
```

**Common causes:**
- Out of memory (clear phone storage)
- Camera permission denied
- Missing dependencies

**Solution:**
```bash
flutter clean
flutter pub get
flutter run -d "Infinix X657"
```

---

## ✅ SUCCESS CRITERIA

Your system is working when:

✅ **App installs on phone without errors**
✅ **Camera permission granted**
✅ **Location permission granted**
✅ **"Start Monitoring" button works**
✅ **Videos capture every 5 seconds**
✅ **Activity log shows "Uploading clip..."**
✅ **Backend terminal shows "[POST] /api/auto-analysis/analyze"**
✅ **AI service terminal shows "Analyzing clip..."**
✅ **Activity log shows "✅ AI analysis complete"**

**🎉 If all ✅, your autonomous monitoring system is WORKING!**

---

## 📊 WHAT TO EXPECT

### Normal Operation (No Incidents):
```
Clips Captured: 1 → 2 → 3 → 4 → 5...
Clips Processed: 1 → 2 → 3 → 4 → 5...
Incidents Detected: 0

Activity Log:
09:15:23 - ✅ Recording started (clip 1)
09:15:28 - ✅ Recording stopped
09:15:29 - 📤 Uploading...
09:15:32 - ✅ AI analysis complete
09:15:32 - ℹ️ No incident (confidence: 0.23)
09:15:33 - ✅ Recording started (clip 2)
```

### When Incident Detected:
```
Clips Captured: 12
Clips Processed: 12
Incidents Detected: 1  ← NEW!

Activity Log:
09:20:15 - ⚠️ INCIDENT DETECTED!
09:20:15 - Type: accident
09:20:15 - Severity: HIGH
09:20:15 - Confidence: 87%
09:20:16 - 🆕 Creating incident report...
09:20:17 - ✅ Incident #123 created
09:20:18 - 🚨 Emergency report created
09:20:19 - 📱 Police notified via push
```

---

## 🎯 NEXT ACTIONS

After successful testing on phone:

1. **✅ Test in stationary position** (5-10 minutes)
2. **✅ Test while walking** (simulate driving)
3. **✅ Test incident detection** (point camera at stationary cars)
4. **✅ Check duplicate prevention** (keep camera on same scene)
5. **✅ Test on real Kigali streets** (if you have car/motorcycle)

---

## 📚 USEFUL COMMANDS

**Check app is running:**
```bash
flutter devices
```

**Rebuild app:**
```bash
cd /home/jambo/New_Traffic_Project/mobile_app
flutter clean && flutter pub get && flutter run -d "Infinix X657"
```

**View app logs:**
```bash
flutter logs
```

**Stop app:**
```
Press 'q' in terminal where flutter run is running
OR: Close app on phone
```

---

## 🇷🇼 READY FOR KIGALI TESTING!

Your TrafficGuard system is now ready to test on real Kigali streets:

✅ **Mobile app** - Captures videos autonomously
✅ **Backend API** - Processes uploads
✅ **AI Service** - Detects incidents with YOLOv8
✅ **Database** - Stores incidents with GPS
✅ **Push Notifications** - Alerts police (via Firebase)
✅ **Duplicate Prevention** - Prevents spam reports

**🚗 Go test on KN 3 Ave, Nyabugogo, or any Kigali street!**

**Good luck! 🎉📱🇷🇼**
