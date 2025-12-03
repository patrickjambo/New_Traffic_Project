# 🧪 Video Capture Testing Guide

## Quick Test Instructions

### 1️⃣ Start the System

```bash
cd /home/jambo/New_Traffic_Project
./start_integrated_system.sh
```

Wait for all services to start:
- ✅ Database (PostgreSQL)
- ✅ Backend API (port 3000)
- ✅ AI Service (port 8000)
- ✅ Frontend (port 3001)

---

### 2️⃣ Open Application

Open browser: **http://localhost:3001**

---

### 3️⃣ Access Video Capture

**Option A: From Dashboard**
- Look for "Video Capture" button
- Click to open camera dialog

**Option B: Direct Component Test**
Create test page:

```jsx
// src/pages/TestVideoCapture.js
import React, { useState } from 'react';
import VideoCapture from '../components/video/VideoCapture';
import { Button } from '@mui/material';

function TestVideoCapture() {
  const [open, setOpen] = useState(false);

  return (
    <div style={{ padding: 20 }}>
      <Button variant="contained" onClick={() => setOpen(true)}>
        Test Video Capture
      </Button>
      <VideoCapture open={open} onClose={() => setOpen(false)} />
    </div>
  );
}

export default TestVideoCapture;
```

---

### 4️⃣ Test Scenarios

#### ✅ **Scenario 1: Normal Recording**

1. Click "Start Recording"
2. Allow camera access
3. Record for 10 seconds
4. Click "Stop Recording"
5. **Expected:** Video preview shows recorded content

#### ✅ **Scenario 2: Upload & Analysis**

1. After recording, click "Upload & Analyze"
2. **Expected:**
   - Progress bar shows 0% → 100%
   - "AI analyzing video..." appears
   - Results card displays after ~5-15 seconds
   - Shows incident details or "No incident detected"

#### ✅ **Scenario 3: Re-record**

1. After recording, click "Re-record"
2. Record again
3. **Expected:** Previous recording replaced

#### ✅ **Scenario 4: Auto-stop at 30 seconds**

1. Click "Start Recording"
2. Wait 30 seconds (don't stop manually)
3. **Expected:** Recording stops automatically

---

### 5️⃣ Verify AI Analysis

#### Check Backend Logs

```bash
# In backend terminal, you should see:
📹 Analyzing video for incident detection...
🤖 AI Results: {
  incident_detected: true,
  incident_type: 'congestion',
  confidence: 0.82,
  vehicle_count: 15,
  avg_speed: 18.5
}
✅ Incident created: ID 123
📡 WebSocket notification sent
📬 Notifications sent to 3 users
```

#### Check AI Service Logs

```bash
# In AI service terminal, you should see:
POST /ai/analyze-traffic
Analyzing video: recording.webm (2.1 MB)
Frames analyzed: 180
Vehicles detected: 15
Analysis time: 8.2s
```

---

### 6️⃣ Verify Database Entry

```bash
# Connect to database
docker exec -it new_traffic_project_database_1 psql -U trafficguard -d trafficguard

# Query recent incidents
SELECT 
  id, 
  type, 
  severity, 
  ai_confidence,
  ai_metadata->'vehicle_count' as vehicles,
  ai_metadata->'avg_speed' as speed,
  created_at
FROM incidents
ORDER BY created_at DESC
LIMIT 5;
```

**Expected Result:**
```
 id | type       | severity | ai_confidence | vehicles | speed | created_at
----+------------+----------+---------------+----------+-------+------------------------
 45 | congestion | medium   | 0.82          | 15       | 18.5  | 2025-01-15 14:30:22
```

---

### 7️⃣ Verify Notification

#### Check NotificationCenter

1. Click notification bell icon (top-right)
2. **Expected:** New notification showing:
   - Incident type and severity
   - Confidence percentage
   - Vehicle count
   - Average speed
   - Location
   - Timestamp

#### Check WebSocket Connection

**Browser Console:**
```javascript
// Should see:
WebSocket connected
Received incident:new event: { incident_id: 45, type: 'congestion', ... }
```

---

### 8️⃣ Test Error Scenarios

#### ❌ **Camera Permission Denied**

1. Block camera permission
2. Try to start recording
3. **Expected:** Error toast "Camera access denied"

#### ❌ **Upload Without Recording**

1. Don't record anything
2. Try to click upload (button should be disabled)
3. **Expected:** Button disabled until video recorded

#### ❌ **AI Service Down**

1. Stop AI service: `docker-compose stop ai_service`
2. Record and upload video
3. **Expected:** Error toast "AI service unavailable (503)"
4. Restart AI service: `docker-compose start ai_service`

#### ❌ **Network Disconnection**

1. Disconnect network
2. Try to upload
3. **Expected:** Error toast "Network error"

---

## 🔍 Debugging Tips

### Check Service Status

```bash
# Backend health
curl http://localhost:3000/health

# AI service health
curl http://localhost:8000/health

# Database connection
docker exec new_traffic_project_database_1 pg_isready
```

### View Logs

```bash
# Backend logs
docker-compose logs -f backend

# AI service logs
docker-compose logs -f ai_service

# Frontend logs
# Check browser console (F12)
```

### Test API Directly

```bash
# Test AI endpoint directly
curl -X POST \
  -F "video=@test_video.mp4" \
  http://localhost:8000/ai/analyze-traffic

# Test backend endpoint
curl -X POST \
  -H "Content-Type: multipart/form-data" \
  -F "video=@test_video.mp4" \
  -F "latitude=40.7128" \
  -F "longitude=-74.0060" \
  http://localhost:3000/api/incidents/analyze-video
```

---

## 📊 Expected Performance

| Operation | Expected Time |
|-----------|---------------|
| Camera start | 1-2 seconds |
| Recording (10s) | 10 seconds |
| Stop recording | < 1 second |
| Upload (2MB) | 2-5 seconds |
| AI analysis | 5-15 seconds |
| Notification | < 1 second |
| **Total** | **~20-35 seconds** |

---

## ✅ Success Checklist

- [ ] Camera opens successfully
- [ ] Recording timer counts down from 30s
- [ ] Video preview shows during recording
- [ ] Stop button works correctly
- [ ] Re-record replaces previous video
- [ ] Upload progress bar works (0-100%)
- [ ] AI analysis spinner appears
- [ ] Results card displays with incident details
- [ ] Severity color-coding works (red/yellow/green)
- [ ] Confidence chips show correct percentage
- [ ] Vehicle count and speed displayed
- [ ] Database entry created
- [ ] Notification appears in NotificationCenter
- [ ] WebSocket broadcast received
- [ ] Sound plays for critical incidents
- [ ] Error handling works (camera denied, upload failed, etc.)

---

## 🐛 Common Issues

### Issue: "Camera not found"
**Solution:** 
- Use HTTPS (camera requires secure context)
- Check browser permissions
- Try different browser (Chrome/Firefox recommended)

### Issue: "Upload stuck at 0%"
**Solution:**
- Check backend is running
- Verify network connection
- Check browser console for errors

### Issue: "AI service unavailable"
**Solution:**
```bash
# Restart AI service
cd ai_service
python main.py
```

### Issue: "No notification received"
**Solution:**
- Check WebSocket connection in console
- Verify NotificationCenter component mounted
- Check backend Socket.IO logs

---

## 📞 Need Help?

1. **Check logs:** All services log to console/docker logs
2. **Verify services:** Use health check endpoints
3. **Test components:** Use browser console for debugging
4. **Read docs:** See VIDEO_AI_INTEGRATION_GUIDE.md for details

---

*Happy Testing! 🚀*
