# Auto-Capture Flow - FIXED

## What Happens Now:

### Every 5 Seconds Loop:
```
[Second 0]  → Start recording
[Second 5]  → Stop recording
            ✅ Counter shows: "Captured: 1" (IMMEDIATELY)
            🚀 Upload starts in background
[Second 5]  → Start next recording (doesn't wait for upload)
[Second 10] → Stop recording  
            ✅ Counter shows: "Captured: 2" (IMMEDIATELY)
            🚀 Upload starts in background
            ✅ First upload completes → "Uploaded: 1"
[Second 10] → Start next recording
[Second 15] → Stop recording
            ✅ Counter shows: "Captured: 3" (IMMEDIATELY)
            🚀 Upload starts in background
            ✅ Second upload completes → "Uploaded: 2"
            🚨 AI detects incident → "Incidents: 1"
```

## UI Display (Real-Time):
```
┌─────────────────────────────┐
│ Real-Time Statistics        │
├─────────────────────────────┤
│ 📹 Captured: 15            │  ← Updates every 5 sec
│ ☁️  Uploaded: 14            │  ← Updates when upload completes
│ ⚠️  Incidents: 3            │  ← Updates when AI detects
└─────────────────────────────┘
```

## Key Changes:

1. **Capture Counter**: Increments IMMEDIATELY after 5-second recording
2. **Upload Counter**: Increments when upload completes (may lag behind)
3. **Incident Counter**: Increments when AI detects incident in uploaded video
4. **No Blocking**: Next capture starts immediately (doesn't wait for upload)
5. **Real-Time UI**: Stats update instantly using callback

## Code Flow:
```dart
_captureAndUpload() {
  // Record 5 seconds
  startRecording();
  await 5 seconds;
  stopRecording();
  
  // ✅ UPDATE UI IMMEDIATELY
  videosCaptured++;
  onStatsUpdate?.call(...);  // UI updates NOW
  
  // 🚀 UPLOAD IN BACKGROUND (async, don't wait)
  _uploadVideo(file);  // No 'await' - runs in background
}

_uploadVideo() async {
  // Upload video
  send to backend;
  
  // ✅ UPDATE UI WHEN DONE
  videosUploaded++;
  if (incident_detected) incidentsDetected++;
  onStatsUpdate?.call(...);  // UI updates again
}
```

## Test Scenario:
Start Auto Monitor, wait 30 seconds:

**Expected:**
- Captured: 6 (30÷5 = 6 clips)
- Uploaded: 5-6 (slightly behind due to network)
- Incidents: 0-6 (depends on what AI detects)

**User sees:**
- Counter increments every 5 seconds (smooth)
- No waiting for stop button
- Upload happens automatically
- Incidents appear as detected
