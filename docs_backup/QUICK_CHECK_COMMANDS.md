# 🔍 Quick Commands to Check Mobile App Status

## Copy and paste these commands into a NEW terminal

### 1️⃣ Check if Services are Running

```bash
# Check Database
docker ps | grep trafficguard_db
```
**Expected**: Should show container running with "Up X hours" and "(healthy)"

```bash
# Check Backend
curl http://192.168.34.237:3000/health
```
**Expected**: `{"success":true,"message":"TrafficGuard API is running"...}`

```bash
# Check AI Service
curl http://192.168.34.237:8000/health
```
**Expected**: `{"status":"healthy","model_loaded":true}`

---

### 2️⃣ Check Incidents from Mobile App

```bash
# Count total incidents
docker exec trafficguard_db psql -U postgres -d trafficguard -t -c "SELECT COUNT(*) FROM incidents"
```
**Expected**: A number (if 0, no incidents captured yet)

```bash
# Show recent incidents
docker exec trafficguard_db psql -U postgres -d trafficguard -c "SELECT id, type, severity, location_name, created_at FROM incidents ORDER BY created_at DESC LIMIT 5"
```
**Expected**: List of recent incidents with details

---

### 3️⃣ Check Video Uploads from Mobile

```bash
# Count video clips uploaded
docker exec trafficguard_db psql -U postgres -d trafficguard -t -c "SELECT COUNT(*) FROM auto_analysis_clips"
```
**Expected**: A number (if 0, no videos uploaded yet)

```bash
# Show recent video uploads
docker exec trafficguard_db psql -U postgres -d trafficguard -c "SELECT id, file_path, analysis_status, created_at FROM auto_analysis_clips ORDER BY created_at DESC LIMIT 5"
```
**Expected**: List of video clips with analysis status

---

### 4️⃣ Check via Backend API

```bash
# Get incidents via API
curl -s http://192.168.34.237:3000/api/incidents | python3 -m json.tool
```
**Expected**: JSON array of incidents (empty `[]` if none yet)

---

### 5️⃣ Check Backend Logs (Last 30 lines)

```bash
# View recent backend activity
tail -30 /home/jambo/New_Traffic_Project/backend.log | grep -E "POST|auto-analysis|analyze|upload"
```
**Expected**: Lines showing video uploads if mobile app is active

---

### 6️⃣ Check AI Service Logs (Last 30 lines)

```bash
# View recent AI analysis
tail -30 /home/jambo/New_Traffic_Project/ai_service.log | grep -E "Analyzing|detected|confidence|vehicles"
```
**Expected**: Lines showing video analysis if uploads happened

---

## 📱 If You See Zero Incidents/Videos:

This means your mobile app hasn't uploaded anything yet. To test:

### On Your Infinix X657:

1. **Open TrafficGuard app**
2. **Tap "Auto Monitor"** (bottom navigation)
3. **Grant camera permission** if asked
4. **Tap "Start Monitoring"** button
5. **Point camera at anything** (desk, room, street view)
6. **Wait 10-15 seconds**
7. **Check Activity Log** on phone screen

You should see:
```
✅ Camera initialized
📹 Recording clip 1
📤 Uploading to 192.168.34.237...
✅ Upload complete
🤖 AI analyzing...
✅ Analysis complete
ℹ️ No incident detected (or incident details)
```

Then run the database check commands again!

---

## 🌐 View in Browser (Alternative)

Open your web browser and go to:

```
http://192.168.34.237:3000/api/incidents
```

This shows all incidents in JSON format directly from backend.

---

## ✅ Success Indicators:

- **Backend log** shows: `POST /api/auto-analysis/analyze`
- **AI log** shows: `Analyzing clip...` or `Detected X vehicles`
- **Database** shows: Count > 0 for incidents or clips
- **API response** shows: Array with incident objects

---

## ❌ If Nothing Works:

1. **Check phone WiFi**: Must be on same network as computer
2. **Check backend running**: `curl http://192.168.34.237:3000/health`
3. **Check AI running**: `curl http://192.168.34.237:8000/health`
4. **Check phone app config**: Should use IP `192.168.34.237` not `localhost`
5. **Try Auto Monitor again**: Start → Wait 15 seconds → Check logs

---

**Copy these commands one by one into a fresh terminal and share the results!** 🚀
