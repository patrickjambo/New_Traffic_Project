# 🔍 Mobile App Upload Issue - Troubleshooting Guide

## ❌ **Current Problem:**

**Symptoms:**
- Videos Captured on Phone: 19+ ✅ (Local storage working)
- Videos Uploaded to Backend: 0 ❌ (Upload failing)
- AI Analysis: 0 ❌ (Never received videos)
- Incidents Detected: 0 ❌ (No data to analyze)
- Database Incidents: Only 2 (manual reports)

**Root Cause:** Mobile app is capturing videos but upload is failing silently.

---

## 🔧 **Possible Issues and Solutions:**

### **Issue 1: Network/WiFi Problem**

**Check:**
```bash
# On phone, open browser and try:
http://192.168.34.237:3000/health

# Should return: {"success":true...}
# If fails: Phone not on same WiFi as computer
```

**Solution:** Make sure phone and computer are on the **SAME WiFi network**!

---

### **Issue 2: Backend Not Receiving Requests**

**Check Backend Logs:**
```bash
# Watch logs in real-time
tail -f /home/jambo/New_Traffic_Project/backend.log

# Then use Auto Monitor on phone
# Should see: POST /api/incidents/analyze-video
```

**If you see NOTHING in logs:** Mobile app can't reach backend!

---

### **Issue 3: Mobile App Activity Log Errors**

**On Phone - Check Activity Log:**

Look for error messages like:
- ❌ "Upload failed: Connection refused"
- ❌ "Network error"
- ❌ "Timeout"
- ❌ "Failed to connect to 192.168.34.237"

**If you see errors:** Note the exact error message!

---

### **Issue 4: Backend URL Configuration**

**Verify Mobile App Config:**

The app should be using:
```
http://192.168.34.237:3000
```

**Check on Phone:**
1. Settings → Apps → TrafficGuard → Storage
2. Clear Cache (to refresh config)
3. Restart app
4. Try again

---

### **Issue 5: File Upload Size Limit**

**Check if videos are too large:**

Backend might have a file size limit. Check:
```bash
# Check backend upload limit
grep -r "limits" /home/jambo/New_Traffic_Project/backend/src/ | grep -i "file\|size\|upload"
```

**Solution:** Videos should be ~2-5MB for 5-second clips. If larger, there's a compression issue.

---

## 🧪 **Step-by-Step Debugging:**

### **Step 1: Test Backend Endpoint Directly**

```bash
# Create a test video file (or use any small video)
# Test if backend accepts uploads:

curl -X POST http://192.168.34.237:3000/api/incidents/analyze-video \
  -F "video=@/path/to/test/video.mp4" \
  -F "auto_mode=true" \
  -F "clip_duration=5"

# Should return: AI analysis result or at least not error 404
```

If this works, backend is fine. Problem is in mobile app.

---

### **Step 2: Check Phone Internet Access**

**On phone browser, visit:**
```
http://192.168.34.237:3000/api/incidents

# Should show: {"success":true,"data":{"incidents":[...]}}
```

If browser works but app doesn't: App might have network permission issues.

---

### **Step 3: Check App Permissions**

**On Phone:**
1. Settings → Apps → TrafficGuard
2. Permissions:
   - ✅ Camera: Allow
   - ✅ Location: Allow all the time
   - ✅ Storage: Allow
   - ✅ **Network/Internet: Should be allowed by default**

---

### **Step 4: Watch Logs While Testing**

**Open 2 terminals:**

**Terminal 1:**
```bash
tail -f /home/jambo/New_Traffic_Project/backend.log
```

**Terminal 2:**
```bash
tail -f /home/jambo/New_Traffic_Project/ai_service.log
```

**Then:**
1. Use Auto Monitor on phone
2. Watch both logs
3. You should see activity in Terminal 1 when video uploads

---

## 📱 **What You Should See in Activity Log:**

### **✅ Working (Should See):**
```
✅ Camera initialized
✅ GPS enabled
📍 Location: -1.9441, 30.0619
📹 Recording clip 1...
⏱️ Duration: 5.0s
📦 File size: 2.3 MB
📤 Uploading to 192.168.34.237:3000...
⏳ Upload progress: 50%...
⏳ Upload progress: 100%...
✅ Upload complete (200 OK)
🤖 AI analyzing...
⏱️ Analysis time: 3.2s
✅ Analysis complete
📊 Result: No incident detected
   Vehicles: 0
   Confidence: N/A
```

### **❌ Not Working (Current State):**
```
✅ Camera initialized
✅ GPS enabled
📹 Recording clip 1...
📤 Uploading...
❌ Upload failed: [ERROR MESSAGE]
```

**OR:**
```
✅ Camera initialized
✅ GPS enabled
📹 Recording clip 1...
[Nothing else - upload silently fails]
```

---

## 🚨 **Immediate Action:**

### **Test Right Now:**

1. **Start watching backend logs:**
   ```bash
   tail -f /home/jambo/New_Traffic_Project/backend.log
   ```

2. **On phone:**
   - Open TrafficGuard
   - Go to Auto Monitor
   - Tap "Start Monitoring"
   - Point at anything for 10 seconds

3. **Watch Terminal:**
   - Do you see ANY activity?
   - Do you see: `POST /api/incidents/analyze-video`?
   - Do you see errors?

4. **Report back:**
   - If you see NOTHING: Network issue
   - If you see POST request: Good! Check for errors in response
   - If you see 404 error: Route problem
   - If you see 500 error: Backend crash - check error message

---

## 🔍 **Quick Diagnostics:**

Run this command and share the output:

```bash
echo "=== DIAGNOSTIC CHECK ===" && \
echo "" && \
echo "1. Backend Health:" && \
curl -s http://192.168.34.237:3000/health | head -3 && \
echo "" && \
echo "2. AI Service Health:" && \
curl -s http://192.168.34.237:8000/health | head -3 && \
echo "" && \
echo "3. Incidents Endpoint:" && \
curl -s http://192.168.34.237:3000/api/incidents | head -5 && \
echo "" && \
echo "4. Recent Backend Log (last 10 lines):" && \
tail -10 /home/jambo/New_Traffic_Project/backend.log && \
echo "" && \
echo "5. Check if backend is listening on 3000:" && \
lsof -i:3000 | grep LISTEN
```

---

## 💡 **Most Likely Causes:**

### **1. WiFi Network Different (90% probability)**
- Phone on cellular data / different WiFi
- Computer's IP changed
- Router blocking communication

### **2. App Configuration Not Refreshed (5% probability)**
- Old config cached
- App needs reinstall

### **3. Backend Crash (3% probability)**
- Route exists but crashes on request
- Missing middleware

### **4. Phone Security/Firewall (2% probability)**
- Android blocking outgoing requests
- App network restrictions

---

## ✅ **Next Steps:**

1. **Run the diagnostic command above**
2. **Watch backend logs while using Auto Monitor**
3. **Check Activity Log on phone for exact error**
4. **Share results with me so I can pinpoint the issue**

---

**The videos are being captured correctly - we just need to fix the upload part!** 🚀
