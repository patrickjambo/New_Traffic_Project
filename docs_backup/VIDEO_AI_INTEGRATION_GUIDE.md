# 📹 Video AI Integration - Complete Guide

## 🎯 Overview

This guide explains the **complete video capture → AI analysis → incident creation → notification** flow in the TrafficGuard system.

---

## 🏗️ Architecture

```
┌─────────────────┐
│  Browser/Mobile │
│   Camera Feed   │
└────────┬────────┘
         │ MediaRecorder API
         │ Records 30-sec WebM video
         ↓
┌─────────────────┐
│  VideoCapture   │ (React Component)
│    Component    │
└────────┬────────┘
         │ FormData Upload
         │ with progress tracking
         ↓
┌─────────────────┐
│  Backend API    │ POST /api/incidents/analyze-video
│  (Express +     │
│   Multer)       │
└────────┬────────┘
         │ Forwards video
         │ to AI service
         ↓
┌─────────────────┐
│   AI Service    │ POST /ai/analyze-traffic
│  (FastAPI +     │
│   YOLOv8n)      │
└────────┬────────┘
         │ Returns analysis:
         │ - incident_detected
         │ - incident_type
         │ - confidence
         │ - vehicle_count
         │ - avg_speed
         │ - stationary_count
         ↓
┌─────────────────┐
│  Backend DB     │ INSERT INTO incidents
│  (PostgreSQL)   │ with ai_confidence
└────────┬────────┘
         │ Broadcasts via
         │ Socket.IO
         ↓
┌─────────────────┐
│  WebSocket      │ io.emit('incident:new')
│  Broadcast      │
└────────┬────────┘
         │ Received by
         │ all clients
         ↓
┌─────────────────┐
│ Notification    │ Displays real-time
│   Center        │ alert with details
└─────────────────┘
```

---

## 🔧 Components

### 1. **VideoCapture.js** (Frontend)

**Location:** `trafficguard-react/src/components/video/VideoCapture.js`

**Purpose:** Browser/mobile camera recording component

**Key Features:**
- **Camera Access:** Uses `navigator.mediaDevices.getUserMedia()` with:
  - Resolution: 1280x720 (ideal)
  - Facing mode: `environment` (back camera on mobile)
- **Recording:** MediaRecorder API with WebM codec (`video/webm;codecs=vp8,opus`)
- **Max Duration:** 30 seconds with countdown timer
- **Upload Progress:** Real-time progress bar (0-100%)
- **AI Analysis:** Loading spinner during analysis
- **Results Display:** Shows incident type, severity, confidence, vehicle stats

**State Management:**
```javascript
const [isRecording, setIsRecording] = useState(false);
const [recordedBlob, setRecordedBlob] = useState(null);
const [stream, setStream] = useState(null);
const [uploadProgress, setUploadProgress] = useState(0);
const [aiAnalyzing, setAiAnalyzing] = useState(false);
const [aiResults, setAiResults] = useState(null);
const [recordingTime, setRecordingTime] = useState(0);
```

**Main Functions:**
- `startCamera()` - Request camera access
- `startRecording()` - Begin recording with 30-second auto-stop
- `stopRecording()` - Stop recording and create Blob
- `uploadAndAnalyze()` - Upload video with progress tracking
- `getSeverity(type, confidence)` - Map AI results to severity level

**Usage:**
```jsx
import VideoCapture from './components/video/VideoCapture';

<VideoCapture open={openDialog} onClose={() => setOpenDialog(false)} />
```

---

### 2. **aiAnalysisController.js** (Backend)

**Location:** `backend/src/controllers/aiAnalysisController.js`

**Purpose:** Backend controller for AI integration and incident creation

**Main Function:** `analyzeVideoAndCreateIncident(req, res)`

**Flow:**
1. **Validate Upload:** Check `req.file` exists (multer middleware)
2. **Extract Location:** Get `latitude`, `longitude` from `req.body`
3. **Forward to AI:** Create FormData and POST to AI service
4. **Process Results:** Parse AI response
5. **Create Incident:** If detected, INSERT into database
6. **Broadcast:** Send WebSocket notifications
7. **Notify Users:** Create notifications for police/admin

**Severity Mapping:**
```javascript
// determineSeverity(incidentType, confidence)
accident + confidence > 0.7 → critical
accident                    → high
road_blockage              → high
congestion + confidence > 0.7 → medium
congestion                 → low
```

**Database Fields:**
```javascript
INSERT INTO incidents (
  type,
  severity,
  description,
  latitude,
  longitude,
  video_url,
  ai_confidence,
  ai_metadata,  // JSON: {vehicle_count, avg_speed, stationary_count}
  status
)
```

**WebSocket Events:**
```javascript
io.emit('incident:new', {
  incident_id,
  type,
  severity,
  description,
  latitude,
  longitude,
  ai_confidence,
  vehicle_count,
  avg_speed,
  timestamp
});

io.to(`location_${lat}_${lng}`).emit('incident:nearby', data);
```

---

### 3. **AI Service Endpoint** (Python)

**Location:** `ai_service/main.py`

**Endpoint:** `POST /ai/analyze-traffic`

**Accepted Formats:** `.mp4`, `.mov`, `.avi`, `.mkv`, `.webm`

**Response Structure:**
```json
{
  "success": true,
  "data": {
    "incident_detected": true,
    "incident_type": "accident",
    "confidence": 0.85,
    "vehicle_count": 12,
    "max_vehicle_count": 15,
    "avg_speed": 25.3,
    "stationary_count": 3,
    "frames_analyzed": 150,
    "analysis_time": 8.42,
    "video_filename": "recording.webm",
    "video_size_mb": 2.1
  }
}
```

**Incident Types:**
- `accident` - Collision or crashed vehicles
- `congestion` - Traffic jam or slow-moving vehicles
- `road_blockage` - Blocked road or obstacle

---

### 4. **API Route** (Backend)

**Location:** `backend/src/routes/incidents.js`

**New Route:**
```javascript
router.post(
  '/analyze-video',
  optionalAuth,
  upload.single('video'),
  analyzeVideoAndCreateIncident
);
```

**Middleware:**
- `optionalAuth` - Authentication optional, allows anonymous uploads
- `upload.single('video')` - Multer middleware for file upload
- `analyzeVideoAndCreateIncident` - Controller function

---

### 5. **API Service Method** (Frontend)

**Location:** `trafficguard-react/src/services/api.js`

**New Method:**
```javascript
analyzeVideoAndCreateIncident: (formData, config = {}) => {
  return api.post('/api/incidents/analyze-video', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
    ...config,
  });
}
```

**Usage in VideoCapture:**
```javascript
const response = await apiService.analyzeVideoAndCreateIncident(
  formData,
  {
    onUploadProgress: (progressEvent) => {
      const progress = Math.round(
        (progressEvent.loaded * 100) / progressEvent.total
      );
      setUploadProgress(progress);
    },
  }
);
```

---

## 🚀 Getting Started

### 1. **Start the System**

```bash
cd /home/jambo/New_Traffic_Project
./start_integrated_system.sh
```

This starts:
- ✅ PostgreSQL database (port 5432)
- ✅ Backend API (port 3000)
- ✅ AI Service (port 8000)
- ✅ React Frontend (port 3001)

### 2. **Access the Application**

Open your browser: `http://localhost:3001`

### 3. **Test Video Capture**

1. **Click "Video Capture" button** (on dashboard)
2. **Allow camera access** when prompted
3. **Click "Start Recording"**
4. **Record traffic footage** (5-30 seconds)
5. **Click "Stop Recording"**
6. **Click "Upload & Analyze"**
7. **Watch progress:**
   - Upload progress bar (0-100%)
   - AI analysis spinner
   - Results display with incident details

### 4. **View Real-Time Notification**

After AI analysis completes:
- **Notification bell** will show new count
- **NotificationCenter** displays incident details:
  - Incident type and severity
  - Confidence percentage
  - Vehicle count and speed
  - Location information
  - Timestamp
- **Sound alert** plays for critical incidents

---

## 📊 Data Flow Details

### Upload Flow

```javascript
// 1. Create FormData
const formData = new FormData();
formData.append('video', recordedBlob, 'recording.webm');
formData.append('latitude', position.coords.latitude);
formData.append('longitude', position.coords.longitude);

// 2. Upload with progress tracking
const response = await apiService.analyzeVideoAndCreateIncident(
  formData,
  {
    onUploadProgress: (progressEvent) => {
      const progress = (progressEvent.loaded * 100) / progressEvent.total;
      setUploadProgress(Math.round(progress));
    },
  }
);

// 3. Backend receives video
// multer saves to req.file
// Location in req.body

// 4. Backend forwards to AI service
const aiFormData = new FormData();
aiFormData.append('video', req.file.buffer, req.file.originalname);

const aiResponse = await axios.post(
  'http://localhost:8000/ai/analyze-traffic',
  aiFormData,
  { timeout: 60000 }
);

// 5. AI service processes video
// YOLOv8n detects vehicles and incidents
// Returns analysis results

// 6. Backend creates incident
const incident = await db.query(
  `INSERT INTO incidents (...) VALUES (...) RETURNING *`
);

// 7. Broadcast WebSocket notification
io.emit('incident:new', notificationData);

// 8. Frontend receives notification
socket.on('incident:new', (data) => {
  setNotifications(prev => [data, ...prev]);
  showToast(`New ${data.severity} incident detected!`);
  if (data.severity === 'critical') playAlertSound();
});
```

---

## 🎨 UI/UX Features

### Video Capture Dialog

**Components:**
- **Video Preview** - Live camera feed or recorded video
- **Recording Indicator** - Red pulsing dot when recording
- **Time Display** - MM:SS countdown timer
- **Control Buttons:**
  - Start Recording (green)
  - Stop Recording (red)
  - Re-record (if recorded)
  - Upload & Analyze (blue, with progress)

### Upload Progress

**LinearProgress Bar:**
- Color: Primary blue
- Shows 0-100% progress
- Real-time updates during upload
- Text label: "Uploading: X%"

### AI Analysis

**CircularProgress Spinner:**
- Color: Primary blue
- Centered in dialog
- Text: "AI analyzing video..."
- Shows during processing (typically 5-15 seconds)

### Results Display

**Card with Animation:**
- **Slide-in animation** from bottom
- **Background color** based on severity:
  - Critical/High: `error.light` (red tint)
  - Medium: `warning.light` (yellow tint)
  - Low/None: `success.light` (green tint)
- **Icon:**
  - Warning icon (triangle) if incident detected
  - CheckCircle icon if no incident
- **Content:**
  - Incident type and severity
  - Confidence percentage chip
  - Vehicle count chip
  - Average speed chip
  - Stationary vehicles chip

---

## 🔔 Notification System

### NotificationCenter Integration

**Location:** `trafficguard-react/src/components/notifications/NotificationCenter.js`

**WebSocket Listeners:**
```javascript
socket.on('incident:new', (data) => {
  setNotifications(prev => [{
    id: data.incident_id,
    type: 'incident',
    severity: data.severity,
    title: `${data.severity.toUpperCase()} Incident`,
    message: data.description,
    timestamp: data.timestamp,
    read: false,
    metadata: {
      incident_type: data.type,
      ai_confidence: data.ai_confidence,
      vehicle_count: data.vehicle_count,
      avg_speed: data.avg_speed,
      latitude: data.latitude,
      longitude: data.longitude
    }
  }, ...prev]);
  
  // Sound alert for critical incidents
  if (data.severity === 'critical') {
    playAlertSound();
  }
  
  // Badge update
  setUnreadCount(prev => prev + 1);
  
  // Toast notification
  toast.warning(`New ${data.severity} incident detected!`);
});
```

### Notification Display

**Card Structure:**
```jsx
<Card severity={notification.severity}>
  <Icon based on severity />
  <Typography variant="h6">{notification.title}</Typography>
  <Typography variant="body2">{notification.message}</Typography>
  <Chips>
    <Chip label={`${notification.metadata.ai_confidence}% confidence`} />
    <Chip label={`${notification.metadata.vehicle_count} vehicles`} />
    <Chip label={`${notification.metadata.avg_speed} km/h`} />
  </Chips>
  <Typography variant="caption">{formatTime(notification.timestamp)}</Typography>
</Card>
```

---

## 🧪 Testing Scenarios

### Scenario 1: Accident Detection

1. Record video showing crashed or stopped vehicles
2. Expected result:
   - **incident_type:** `accident`
   - **severity:** `critical` or `high`
   - **confidence:** > 0.7 for critical
   - **stationary_count:** > 0
   - **Notification:** Red alert with sound

### Scenario 2: Traffic Congestion

1. Record video showing slow-moving traffic
2. Expected result:
   - **incident_type:** `congestion`
   - **severity:** `medium` or `low`
   - **confidence:** > 0.7 for medium
   - **vehicle_count:** High (> 10)
   - **avg_speed:** Low (< 20 km/h)
   - **Notification:** Yellow alert

### Scenario 3: Road Blockage

1. Record video showing blocked road or obstacle
2. Expected result:
   - **incident_type:** `road_blockage`
   - **severity:** `high`
   - **Notification:** Orange alert

### Scenario 4: No Incident

1. Record video showing normal flowing traffic
2. Expected result:
   - **incident_detected:** `false`
   - **No database entry**
   - **No notification**
   - **Green success message** in VideoCapture

---

## 🐛 Troubleshooting

### Camera Not Accessible

**Problem:** "Camera permission denied" or "Camera not found"

**Solutions:**
- Check browser permissions (click lock icon in address bar)
- Ensure HTTPS connection (required for camera access)
- Try different browser (Chrome/Firefox recommended)
- On mobile: Grant camera permission in device settings

### Upload Fails

**Problem:** Upload progress stuck or error during upload

**Solutions:**
- Check backend is running: `curl http://localhost:3000/health`
- Check network connectivity
- Verify file size not too large (< 100MB)
- Check browser console for error messages

### AI Service Not Responding

**Problem:** "AI service unavailable" error

**Solutions:**
```bash
# Check AI service status
curl http://localhost:8000/health

# If not running, start it:
cd ai_service
python main.py

# Check logs:
docker-compose logs ai_service

# Verify YOLOv8n model exists:
ls ai_service/models/yolov8n.pt
```

### No Notification Received

**Problem:** Incident created but notification not appearing

**Solutions:**
- Check WebSocket connection in browser console:
  ```javascript
  // Should see: "WebSocket connected"
  ```
- Verify NotificationCenter component is mounted
- Check Socket.IO server logs in backend
- Ensure notification hasn't been filtered by severity

### Wrong Severity Level

**Problem:** Incident severity doesn't match expected level

**Explanation:** Severity is determined by:
```javascript
determineSeverity(incidentType, confidence)
```

**Mapping:**
- `accident` + confidence > 0.7 → `critical`
- `accident` → `high`
- `road_blockage` → `high`
- `congestion` + confidence > 0.7 → `medium`
- `congestion` → `low`

**Solution:** AI confidence level affects severity. Higher confidence = higher severity for same incident type.

---

## 📈 Performance Optimization

### Frontend

**Video Recording:**
- Max duration: 30 seconds (prevents large files)
- Codec: WebM with VP8 (good compression)
- Resolution: 1280x720 (balance between quality and size)

**Upload:**
- Chunked upload with progress tracking
- Cancel support if needed
- Retry logic for failed uploads

**UI:**
- Lazy loading of VideoCapture component
- Debounced re-render during recording
- Memoized severity calculations

### Backend

**Multer Configuration:**
- File size limit: 100MB
- Memory storage for faster processing
- Automatic cleanup after upload

**AI Service Communication:**
- Timeout: 60 seconds (long videos may take time)
- Connection pooling
- Error handling for service downtime

**Database:**
- Indexed fields: `latitude`, `longitude`, `created_at`, `severity`
- PostGIS spatial queries for nearby incidents
- JSON field for flexible AI metadata

### AI Service

**YOLOv8n Model:**
- Nano version for speed (trades slight accuracy for performance)
- Frame sampling (not every frame analyzed)
- Parallel processing where possible

**Video Processing:**
- Temporary file storage with auto-cleanup
- Batch processing for multiple detections
- Early exit if no vehicles detected

---

## 🔒 Security Considerations

### Authentication

- **Optional Auth:** Anonymous users can upload videos
- **Rate Limiting:** Prevent abuse (TODO: implement)
- **File Validation:** Check file type and size

### Privacy

- **Location Data:** GPS coordinates stored but not exposed publicly
- **Video Storage:** Videos stored temporarily during analysis, deleted after
- **User Anonymity:** No user tracking for anonymous uploads

### API Security

- **CORS:** Configured to allow frontend origin
- **HTTPS:** Required for production
- **Input Validation:** All inputs sanitized before database insertion

---

## 📚 Additional Resources

### Documentation Files

- **START_HERE.txt** - Quick start guide
- **QUICKSTART_SUMMARY.md** - System overview
- **FINAL_INTEGRATION_SUMMARY.md** - Integration details
- **REALTIME_FLOW_DIAGRAM.md** - WebSocket flow
- **EMERGENCY_SYSTEM_GUIDE.md** - Emergency features

### Code References

- **VideoCapture Component:** `trafficguard-react/src/components/video/VideoCapture.js`
- **AI Controller:** `backend/src/controllers/aiAnalysisController.js`
- **AI Service:** `ai_service/main.py`
- **API Service:** `trafficguard-react/src/services/api.js`
- **NotificationCenter:** `trafficguard-react/src/components/notifications/NotificationCenter.js`

### API Endpoints

- **Backend:** http://localhost:3000/api/incidents/analyze-video
- **AI Service:** http://localhost:8000/ai/analyze-traffic
- **Health Check:** http://localhost:8000/health

---

## ✅ Success Criteria

The video AI integration is working correctly when:

1. ✅ **Camera Access:** Browser/mobile camera opens successfully
2. ✅ **Recording:** Video records for up to 30 seconds with timer
3. ✅ **Upload:** Progress bar shows 0-100% during upload
4. ✅ **AI Analysis:** Spinner shows during processing
5. ✅ **Results:** Incident details displayed with confidence and stats
6. ✅ **Database:** Incident saved with AI confidence and metadata
7. ✅ **Notification:** Real-time alert appears in NotificationCenter
8. ✅ **Sound:** Critical incidents trigger audio alert
9. ✅ **Severity:** Correct severity level assigned based on type and confidence
10. ✅ **WebSocket:** Broadcast received by all connected clients

---

## 🎉 Congratulations!

You now have a complete **Video Capture → AI Analysis → Incident Creation → Real-Time Notification** system!

**Key Achievements:**
- 📹 Browser/mobile video recording
- 🤖 AI-powered incident detection
- 📊 Automatic severity assessment
- 🔔 Real-time notifications with WebSocket
- 📍 Location-aware incident creation
- 🎨 Modern, responsive UI with progress tracking

**Next Steps:**
- Test with different traffic scenarios
- Fine-tune AI model for better accuracy
- Add more incident types (pedestrian detection, weather conditions, etc.)
- Implement mobile app integration (Flutter)
- Deploy to production environment

---

*Last Updated: 2025*
*TrafficGuard AI-Powered Traffic Management System*
