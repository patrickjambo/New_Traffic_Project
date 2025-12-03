# 🤖 AUTONOMOUS AI MONITORING SYSTEM - COMPLETE GUIDE

## 🎯 Overview

The **Auto Monitor** feature transforms your mobile phone into an **intelligent, autonomous traffic monitoring station**. Place your device, press START, and let the AI do the work!

## ✨ Key Features

### Fully Automated Operation
- ⏱️ **Continuous 5-second clip recording** - No manual intervention
- 🤖 **Automatic AI analysis** - Every clip analyzed by YOLOv8 AI
- 📊 **Automatic incident detection** - AI determines if incident exists
- 📝 **Automatic report creation** - Incident reports auto-generated
- 🚨 **Automatic emergency escalation** - Critical situations escalate to police/admin
- 📢 **Automatic notifications** - Public, police, and admin notified
- 💾 **Smart storage management** - Only keeps clips with incidents

### Intelligence Features
- 🧠 **AI Confidence Scoring** - Know how confident the AI is
- 🎯 **Incident Type Detection** - Accident, fire, medical, traffic
- ⚠️ **Severity Assessment** - Critical, high, medium, low
- 🚗 **Vehicle Counting** - Counts vehicles involved
- 👥 **Casualty Estimation** - Estimates potential casualties
- 📍 **GPS Location** - Automatic location capture
- 🚑 **Service Determination** - Auto-selects needed emergency services

### User Experience
- 📱 **Live Camera Preview** - See what's being monitored
- 📊 **Real-time Statistics** - Clips/Incidents/Emergencies counts
- 📜 **Activity Log** - Terminal-style log of last 10 actions
- 🔴 **Recording Indicator** - Visual REC/PROCESSING status
- 🎛️ **Simple Controls** - Just START and STOP
- 🚨 **Critical Alerts** - Red dialogs for emergencies

---

## 🏗️ Architecture

### Recording Cycle
```
START MONITORING
    ↓
┌──Record 5-second clip──┐
│   [Camera captures]    │
│   Timer: 5 seconds     │
└────────────────────────┘
    ↓
┌──Stop & Save Clip──────┐
│   XFile saved          │
│   Clip #X (XXX KB)     │
└────────────────────────┘
    ↓
┌──AI Analysis───────────┐
│   Send to AIAutoService│
│   Analyze with YOLOv8  │
│   Confidence: XX%      │
└────────────────────────┘
    ↓
    ┌─[Has Incident?]─┐
    │                 │
    NO                YES
    │                 │
    ↓                 ↓
Delete Clip     Create Incident Report
    │                 │
    │                 ↓
    │           Send Public Notification
    │                 │
    │                 ↓
    │           [Severity Critical/High?]
    │                 │
    │           NO    │    YES
    │           │     │     │
    │           │     │     ↓
    │           │     │  Create Emergency Report
    │           │     │     │
    │           │     │     ↓
    │           │     │  Notify Police/Admin
    │           │     │     │
    │           │     │     ↓
    │           │     │  Show Critical Alert
    │           │     │
    └───────────┴─────┴────┐
                           │
                   Loop back to Record
```

### Decision Logic

#### Incident Detection
AI determines `has_incident = true` if:
- ✅ Confidence > 60%
- ✅ Multiple vehicles detected (≥3)
- ✅ Fire/smoke/emergency keywords in detected objects
- ✅ Collision indicators present

#### Severity Assessment
- **Critical**: Fire detected OR 4+ vehicles with 80%+ confidence
- **High**: 3+ vehicles OR 75%+ confidence
- **Medium**: 2 vehicles OR 60%+ confidence
- **Low**: Default for detected incidents

#### Emergency Escalation
Auto-creates emergency if:
- ✅ Severity = Critical
- ✅ Severity = High AND Type = Accident
- ✅ Type = Fire (always)
- ✅ Type = Medical (always)

#### Service Selection
- **Accident** → Police + Ambulance
- **Fire** → Fire Department + Rescue
- **Medical** → Ambulance
- **Default** → Police

---

## 📱 Mobile App Components

### 1. Auto Monitor Screen
**File**: `mobile_app/lib/screens/auto_monitor_screen.dart` (643 lines)

#### Key Methods

##### Recording Management
- `_initializeCamera()` - Discovers cameras, selects back camera
- `_startMonitoring()` - Validates camera, begins monitoring
- `_startRecordingCycle()` - Initiates 5-second recording timer
- `_stopAndProcessClip()` - Saves clip, triggers analysis, restarts cycle
- `_stopMonitoring()` - Stops monitoring, logs session summary

##### AI Integration
- `_analyzeClip(XFile)` - Sends video to AI, gets analysis results
- `_createIncidentReport()` - Creates incident in database with AI data
- `_createEmergencyReport()` - Creates emergency for critical incidents
- `_determineServicesNeeded()` - Logic to select emergency services

##### Utilities
- `_getCurrentLocation()` - Gets GPS coordinates (requests permissions)
- `_showCriticalAlert()` - Displays red emergency dialog
- `_addLog(message)` - Adds timestamped entry to activity log

#### UI Components
- **AppBar**: Title with green/grey color, REC indicator with colored dot
- **Camera Preview**: Live feed in 16:9 aspect ratio
- **Status Bar**: Green background when active, current operation message
- **Statistics Row**: 3 chips showing clips/incidents/emergencies counts
- **Activity Log**: Terminal-style scrollable log (green text on black)
- **Control Button**: Large 60px height START/STOP button

#### State Variables
```dart
CameraController? _controller          // Camera control
AIAutoService _aiService              // AI analysis service
EmergencyService _emergencyService    // Emergency API
NotificationService _notificationService // Notifications
bool _isMonitoring                    // Monitoring active flag
bool _isRecording                     // Currently recording flag
Timer? _clipTimer                     // 5-second clip timer
int _clipsProcessed                   // Total clips count
int _incidentsDetected                // Detected incidents count
int _emergenciesCreated               // Created emergencies count
String _status                        // Current status message
List<String> _recentLogs              // Last 10 log entries
```

---

### 2. AI Auto Service
**File**: `mobile_app/lib/services/ai_auto_service.dart` (350+ lines)

#### Methods

##### `analyzeVideoClip(File videoFile)`
Sends video to backend for AI analysis.

**Request**:
```dart
POST /api/incidents/analyze-video
Content-Type: multipart/form-data
Fields:
  - video: <video_file>
  - auto_mode: 'true'
  - clip_duration: '5'
```

**Response**:
```json
{
  "success": true,
  "data": {
    "has_incident": true,
    "incident_type": "accident",
    "severity": "high",
    "confidence": 0.85,
    "description": "Traffic accident detected involving 3 vehicles...",
    "detected_objects": [
      {"name": "car", "confidence": 0.92},
      {"name": "truck", "confidence": 0.88}
    ],
    "vehicles_count": 3,
    "estimated_casualties": 2,
    "requires_emergency": true
  }
}
```

##### `createIncidentReport(videoPath, aiData)`
Creates incident report in database.

**Request**:
```dart
POST /api/incidents/report
Content-Type: application/json
Body:
{
  "type": "accident",
  "severity": "high",
  "description": "Auto-detected incident...",
  "location": "Auto-detected location",
  "latitude": 0.3476,
  "longitude": 32.5825,
  "aiConfidence": 0.85,
  "aiMetadata": { ... },
  "videoUrl": "/videos/clip_123.mp4",
  "status": "pending"
}
```

**Response**:
```json
{
  "success": true,
  "data": {
    "id": 42,
    "type": "accident",
    "severity": "high",
    ...
  }
}
```

#### Internal Logic Methods
- `_hasIncident()` - Checks if AI detected incident
- `_determineIncidentType()` - Categorizes incident (accident/fire/medical/traffic)
- `_determineSeverity()` - Assesses severity level
- `_generateDescription()` - Creates human-readable description
- `_countVehicles()` - Counts vehicles in detected objects
- `_estimateCasualties()` - Estimates potential casualties
- `_requiresEmergency()` - Determines if emergency response needed

---

### 3. Notification Service
**File**: `mobile_app/lib/services/notification_service.dart` (Enhanced)

#### New Methods for Auto-Monitoring

##### `sendIncidentNotification(incidentId, type, severity)`
Sends local notification for detected incident.

**Parameters**:
- `incidentId`: Database ID of incident
- `type`: Incident type (accident/fire/medical/traffic)
- `severity`: Severity level (critical/high/medium/low)

**Notification**:
```
Title: 🚨 Traffic Incident Detected
Message: A high severity accident incident has been reported. Incident #42
Type: incident
```

##### `sendEmergencyNotification(emergencyId, type, severity)`
Sends critical alert for emergency situations.

**Parameters**:
- `emergencyId`: Database ID of emergency
- `type`: Emergency type
- `severity`: Severity level

**Notification**:
```
Title: 🚨 EMERGENCY ALERT
Message: Critical accident emergency detected! Police and admin notified. Emergency #7
Type: emergency
```

---

## 🎮 How to Use

### Setup

#### 1. Start All Services
```bash
# Terminal 1: Database
cd database
docker-compose up

# Terminal 2: Backend
cd backend
npm start

# Terminal 3: AI Service
cd ai_service
python main.py

# Terminal 4: Mobile App
cd mobile_app
flutter run
```

#### 2. Grant Permissions
On first launch, the app will request:
- 📷 **Camera Permission** - For video capture
- 📍 **Location Permission** - For GPS coordinates

**IMPORTANT**: Both permissions must be granted for full functionality.

---

### Operation

#### Starting Monitoring

1. Open TrafficGuard Mobile App
2. Navigate to **Home Screen**
3. Tap the **"AI Auto-Monitor"** card (purple with sparkle icon)
4. See live camera preview
5. Position phone to view traffic area
6. Tap large green **"START AUTO-MONITORING"** button
7. App begins autonomous operation:
   - ✅ Records 5-second clips continuously
   - ✅ Analyzes each clip with AI
   - ✅ Creates reports for incidents
   - ✅ Escalates critical situations
   - ✅ Sends notifications automatically

#### During Monitoring

Watch the real-time feedback:

**Status Bar** (Green when active):
```
Recording clip #5...
Processing clip #5...
AI Analysis: Incident detected!
Creating incident report...
Notifying public...
```

**Statistics** (Updated live):
```
📹 Clips: 15
⚠️  Incidents: 3
🚨 Emergencies: 1
```

**Activity Log** (Terminal-style, scrollable):
```
14:23:45 - Started monitoring
14:23:50 - Clip #1 saved (1.2 MB)
14:23:52 - AI Analysis: No incident detected
14:23:52 - Clip deleted (no incident)
14:23:57 - Clip #2 saved (1.1 MB)
14:23:59 - AI Analysis: Incident detected! Type: accident, Confidence: 87%
14:24:01 - Incident report created: ID #42
14:24:02 - Public notification sent
14:24:02 - High severity - creating emergency
14:24:04 - Emergency created: ID #7
14:24:05 - Police and admin notified
```

#### Critical Emergency Alert

If AI detects critical situation, you'll see:

```
┌──────────────────────────────────┐
│  🚨 CRITICAL EMERGENCY           │
├──────────────────────────────────┤
│  Emergency ID: #7                │
│  Type: accident                  │
│  Severity: critical              │
│  Confidence: 92%                 │
│                                  │
│  ✓ Police notified              │
│  ✓ Admin alerted                │
│  ✓ Emergency services dispatched │
│                                  │
│  [Continue Monitoring]           │
└──────────────────────────────────┘
```

Tap **"Continue Monitoring"** to resume autonomous operation.

#### Stopping Monitoring

1. Tap large red **"STOP MONITORING"** button
2. Session summary logged:
   ```
   Monitoring session completed.
   Duration: 15 minutes
   Clips processed: 180
   Incidents detected: 12
   Emergencies created: 2
   ```

---

## 🔧 Testing

### Test Scenarios

#### Scenario 1: No Incident Detection
**Setup**: Point camera at empty road or static scene  
**Expected**:
- Clips recorded every 5 seconds
- AI analysis: "No incident detected"
- Clips deleted immediately
- No reports created
- Logs show: "Clip deleted (no incident)"

#### Scenario 2: Traffic Incident
**Setup**: Point camera at busy traffic (2-3 vehicles)  
**Expected**:
- AI detects vehicles: "3 vehicles detected"
- Incident created with type "traffic" or "accident"
- Severity: "medium" or "high"
- Public notification sent
- Clip saved (not deleted)
- Logs show incident ID

#### Scenario 3: Critical Emergency
**Setup**: Show video of accident/fire (or simulate with recorded video)  
**Expected**:
- AI detects incident with high confidence (>75%)
- Severity: "critical"
- Incident report created
- Emergency report auto-created
- Police/admin notifications sent
- Red critical alert dialog appears
- Logs show emergency ID

---

### Device Testing

#### Android Testing
```bash
# Connect Android device via USB
# Enable USB Debugging in Developer Options

cd mobile_app
flutter run -d <device-id>
```

#### iOS Testing
```bash
# Connect iPhone via USB or WiFi
# Trust computer on device

cd mobile_app
flutter run -d <device-id>
```

#### Check Device Connection
```bash
flutter devices

# Should show:
# Android device (mobile) • <id> • android-arm64 • Android 12 (API 31)
# iPhone 13 (mobile) • <id> • ios • iOS 15.5
```

---

### Backend Configuration

For testing on physical device, update backend URL:

**File**: `mobile_app/lib/config/app_config.dart`
```dart
class AppConfig {
  // For Android emulator
  static const String baseUrl = 'http://10.0.2.2:3000';
  
  // For physical device (replace with your computer's IP)
  static const String baseUrl = 'http://192.168.1.100:3000';
  
  // For iOS simulator
  static const String baseUrl = 'http://localhost:3000';
}
```

**Find Your IP**:
```bash
# Linux/Mac
ifconfig | grep inet

# Windows
ipconfig
```

---

## 📊 Statistics & Monitoring

### Session Statistics

The app tracks:
- **Clips Processed**: Total number of 5-second clips recorded and analyzed
- **Incidents Detected**: Number of incidents AI identified
- **Emergencies Created**: Number of critical situations escalated

### Performance Metrics

Typical performance:
- **Clip Duration**: 5 seconds
- **Recording Time**: 5 seconds
- **Processing Time**: 2-4 seconds (depends on network)
- **Total Cycle**: ~7-9 seconds per clip
- **Clips per Hour**: ~450-500 clips
- **Storage per Hour**: ~500 MB (if all clips saved, but most deleted)
- **Actual Storage**: ~50-100 MB/hour (only incident clips kept)

---

## 🚨 Troubleshooting

### Camera Issues

**Problem**: "No cameras available"  
**Solution**:
1. Grant camera permission in Settings
2. Restart app
3. Check if other apps can access camera
4. Reboot device

**Problem**: "Camera initialization failed"  
**Solution**:
1. Close other apps using camera
2. Clear app cache
3. Reinstall app

---

### Location Issues

**Problem**: "Location service disabled"  
**Solution**:
1. Enable Location in device Settings
2. Grant location permission to app
3. Ensure GPS is working (check Maps app)

**Problem**: "Location permission denied"  
**Solution**:
1. Go to Settings → Apps → TrafficGuard → Permissions
2. Enable Location permission
3. Set to "Allow all the time" for background operation

---

### AI Analysis Issues

**Problem**: "AI analysis failed" or "Network error"  
**Solution**:
1. Check internet connection
2. Verify backend is running: `http://YOUR_IP:3000/health`
3. Verify AI service is running: `http://localhost:8000/health`
4. Check backend logs for errors
5. Ensure device and computer on same WiFi

**Problem**: "No incidents detected" (but there are vehicles)  
**Solution**:
- AI requires 60%+ confidence or 3+ vehicles
- Try better lighting conditions
- Ensure camera is stable (not shaky)
- Position camera with clear view of traffic

---

### Performance Issues

**Problem**: App is slow or laggy  
**Solution**:
1. Close other apps
2. Clear app cache
3. Restart device
4. Reduce camera resolution in code (if needed)

**Problem**: High battery drain  
**Solution**:
- Plug device into power for extended monitoring
- Reduce screen brightness
- Close unnecessary background apps
- Monitor for shorter periods

**Problem**: Storage filling up  
**Solution**:
- App auto-deletes non-incident clips
- Manually clear old incident clips from storage
- Check logs: "Clip deleted (no incident)" should appear frequently

---

## 🎯 Best Practices

### Positioning the Device

✅ **DO**:
- Mount device in fixed position
- Point camera at traffic flow
- Ensure stable mount (no shaking)
- Keep camera lens clean
- Have clear view of road
- Position at slight angle (not directly perpendicular)
- Use tripod or car mount if available

❌ **DON'T**:
- Hold device by hand (too shaky)
- Place where camera can be blocked
- Point at sun directly (glare issues)
- Use in very dark conditions (AI needs visibility)
- Move device during monitoring

---

### Monitoring Duration

- **Short Session** (15-30 min): Testing, specific event monitoring
- **Medium Session** (1-2 hours): Traffic peak hours, event coverage
- **Long Session** (4+ hours): Autonomous monitoring (plug into power)

---

### Network Optimization

- Use WiFi when possible (faster uploads)
- If using mobile data, ensure good signal (4G/5G)
- Monitor data usage (each clip ~1-2 MB)
- Consider unlimited data plan for extended use

---

### Safety & Legal

⚠️ **Important Considerations**:
- Only use in public areas where recording is legal
- Follow local privacy and surveillance laws
- Don't record private property without permission
- Secure device when unattended (theft prevention)
- Inform relevant authorities if using for official monitoring
- Ensure recorded data is handled securely

---

## 📈 Future Enhancements

### Planned Features
- 🌙 Night mode with enhanced visibility
- 🔋 Battery optimization for 24/7 operation
- 📶 Offline mode with local storage and sync
- 🎯 Custom AI model training for specific roads
- 📊 Advanced analytics and heatmaps
- 🔊 Audio analysis for sirens and crashes
- 🚁 Drone integration for aerial monitoring
- 🤝 Multi-device coordination
- 📡 Real-time streaming to command center

---

## 💡 Tips for Maximum Effectiveness

1. **Position device at intersections** - Most incidents occur at intersections
2. **Monitor during peak hours** - Morning (7-9 AM) and evening (5-7 PM)
3. **Use during events** - Concerts, sports, festivals (high traffic)
4. **Weather monitoring** - Rain/fog increase incident likelihood
5. **Collaborate with authorities** - Share access with police/traffic dept
6. **Regular testing** - Test monthly to ensure everything works
7. **Update regularly** - Keep app and AI models updated
8. **Review logs** - Check activity logs to understand patterns
9. **Optimize placement** - Experiment with angles and positions
10. **Power management** - Always have charging cable ready

---

## 📞 Support

### Getting Help

**Documentation**:
- `MANUAL_START_GUIDE.md` - Starting all services
- `MOBILE_AI_COMPLETE.md` - Mobile AI integration
- `EMERGENCY_REPORT_COMPLETE.md` - Emergency system

**Common Issues**:
- Camera/GPS permissions
- Network connectivity
- Backend configuration
- AI analysis failures

**Contact**:
- Check logs first: Activity log in app
- Backend logs: `backend/logs/`
- AI service logs: `ai_service/logs/`
- Submit issues with log excerpts

---

## 🎓 Understanding the AI

### What the AI Sees

The YOLOv8 model detects:
- 🚗 **Vehicles**: Cars, trucks, buses, motorcycles, vans
- 👥 **People**: Pedestrians, cyclists
- 🚦 **Traffic Elements**: Traffic lights, signs
- 🔥 **Emergency Indicators**: Fire, smoke
- 🚧 **Road Features**: Barriers, cones

### Confidence Scoring

- **90-100%**: Very high confidence (clear detection)
- **75-90%**: High confidence (likely accurate)
- **60-75%**: Medium confidence (probable detection)
- **Below 60%**: Low confidence (not reported as incident)

### Detection Triggers

Incident flagged if:
- Multiple vehicles in unusual arrangement (collision pattern)
- Fire/smoke detected (immediate critical)
- High-confidence detection of emergency situation
- Vehicle count + position suggests accident

---

## ✅ Success Criteria

Your autonomous monitoring is working correctly if:

✅ Clips recorded every 5 seconds automatically  
✅ Activity log updates in real-time  
✅ Statistics incrementing (clips processed)  
✅ Non-incident clips deleted (logs show "Clip deleted")  
✅ Incident reports created when vehicles detected  
✅ Emergency alerts shown for critical situations  
✅ Notifications sent successfully  
✅ GPS location captured correctly  
✅ App runs continuously without crashes  
✅ Storage managed efficiently (doesn't fill up)  

---

## 🎉 Conclusion

The **Auto Monitor** feature represents the pinnacle of the TrafficGuard system - transforming a simple mobile device into an intelligent, autonomous traffic monitoring station powered by AI.

**Key Benefits**:
- 🤖 Minimal human intervention
- 📊 Continuous operation
- 🧠 Intelligent detection
- 🚨 Automatic emergency response
- 📢 Multi-tier notifications
- 💾 Efficient storage management
- 📍 GPS integration
- 📱 Real-time feedback

**Perfect For**:
- Traffic police departments
- Emergency response teams
- City traffic management
- Event security
- Highway monitoring
- Intersection surveillance
- Citizen reporting initiatives

---

**Made with 💙 by TrafficGuard Team**  
*Keeping Uganda's roads safer with AI*

🚀 **Ready to start?** Just tap START AUTO-MONITORING!
