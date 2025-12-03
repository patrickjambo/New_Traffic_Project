# 🎮 How Simulation Testing Works

## 📚 Overview

Simulation testing allows you to test your **automatic emergency system** without needing:
- ❌ Real traffic
- ❌ AI video processing
- ❌ Mobile app capturing videos
- ❌ Complex setup

Instead, you send **JSON data directly** to simulate what the AI would normally detect.

---

## 🔄 Normal Flow vs Simulation Flow

### Normal Production Flow (Real Traffic):
```
┌─────────────┐
│ Mobile App  │ Captures video every 5 seconds
│   Camera    │
└──────┬──────┘
       │ Video Upload (MP4)
       ▼
┌─────────────┐
│   Backend   │ Receives video file
│   Node.js   │
└──────┬──────┘
       │ Forward video
       ▼
┌─────────────┐
│ AI Service  │ YOLOv8 analyzes video
│   Python    │ Detects: vehicles, accidents, blockages
└──────┬──────┘
       │ Returns JSON result:
       │ {
       │   "incident_detected": true,
       │   "type": "accident",
       │   "severity": "critical",
       │   "confidence": 85,
       │   "vehicle_count": 10
       │ }
       ▼
┌─────────────┐
│   Backend   │ Creates incident in database
│  Database   │ If critical/high → Creates emergency
└─────────────┘
```

### Simulation Flow (Testing):
```
┌─────────────┐
│  Your Test  │ You create JSON data manually
│   (curl)    │
└──────┬──────┘
       │ POST /api/incidents/test-detection
       │ {
       │   "incident_detected": true,
       │   "type": "accident",
       │   "severity": "critical",
       │   "confidence": 85,
       │   "vehicle_count": 10
       │ }
       ▼
┌─────────────┐
│   Backend   │ Skips AI processing
│   Node.js   │ Directly creates incident
└──────┬──────┘
       │ Same code path as real flow!
       ▼
┌─────────────┐
│   Backend   │ Creates incident in database
│  Database   │ If critical/high → Creates emergency
└─────────────┘
```

**Key Point:** The simulation **skips only the AI video processing** part. Everything else (incident creation, emergency creation, notifications, database storage, WebSocket broadcasts) uses the **exact same code** as production!

---

## 💡 Why Simulation is Powerful

### 1. **Tests the Same Code Path**
```javascript
// This is the SAME function used for both real AI and simulation:
async function createAutomaticEmergency(incident, aiResults, latitude, longitude) {
    // Determine emergency type
    let emergencyType = 'traffic';
    let servicesNeeded = [];
    
    if (incident.type === 'accident') {
        emergencyType = 'accident';
        servicesNeeded = ['police', 'ambulance'];
    } else if (incident.type === 'road_blockage') {
        emergencyType = 'road_blockage';
        servicesNeeded = ['police', 'traffic_police'];
    }
    
    // Create emergency in database
    const result = await db.query(
        `INSERT INTO emergencies (...) VALUES (...)`,
        [null, emergencyType, severity, location, ...]
    );
    
    // Send notifications
    await createIncidentNotifications(incident);
    
    // Broadcast via WebSocket
    io.emit('emergency:auto', { emergency });
    
    return emergency;
}
```

Whether the data comes from **AI** or **simulation**, this function executes identically!

### 2. **100% Reliable**
- ✅ No AI variability (confidence can fluctuate)
- ✅ No video quality issues
- ✅ No network upload problems
- ✅ Instant results (no 10-15 second processing time)

### 3. **Easy to Automate**
```bash
# Run same test 100 times
for i in {1..100}; do
  curl -X POST http://localhost:3000/api/incidents/test-detection \
    -H "Content-Type: application/json" \
    -d '{"incident_detected": true, "type": "accident", ...}'
done
```

### 4. **Perfect for CI/CD**
```yaml
# In GitHub Actions or GitLab CI
- name: Test Automatic Emergency System
  run: |
    ./test_emergency_system.sh
    # Exits with error if any test fails
```

---

## 🧪 How to Use Simulation Testing

### Method 1: Manual curl Command

**Test a Critical Accident:**
```bash
curl -X POST http://localhost:3000/api/incidents/test-detection \
  -H "Content-Type: application/json" \
  -d '{
    "incident_detected": true,
    "type": "accident",
    "confidence": 92,
    "severity": "critical",
    "vehicle_count": 15,
    "stationary_count": 10,
    "avg_speed": 2,
    "frames_analyzed": 30,
    "location": {
      "latitude": -1.9506,
      "longitude": 30.0588,
      "location_name": "KN 5 Rd near Convention Centre, Kigali"
    }
  }'
```

**Response:**
```json
{
  "success": true,
  "message": "Test incident created successfully",
  "data": {
    "incident_detected": true,
    "incident_id": 8,
    "incident_type": "accident",
    "severity": "critical",
    "confidence": 92,
    "emergency_created": true,    ← Emergency auto-created!
    "emergency_id": 13,
    "location": "KN 5 Rd near Convention Centre, Kigali"
  }
}
```

### Method 2: Automated Test Script

**Run the full test suite:**
```bash
./test_emergency_system.sh
```

This script tests:
1. ✅ Critical accident → Emergency created
2. ✅ High road blockage → Emergency created
3. ✅ Medium congestion → NO emergency (correct!)
4. ✅ Critical congestion → Emergency created

---

## 🔍 What Simulation Tests

### ✅ **Does Test:**
1. **Incident Creation Logic**
   - Database INSERT operations
   - PostGIS geography columns
   - Field validation
   - Status assignment

2. **Automatic Emergency Creation**
   - Severity threshold logic (critical/high)
   - Emergency type determination
   - Service assignment (police/ambulance)
   - Auto-fill system fields (user_id=NULL)

3. **Database Relationships**
   - Foreign keys (incident_id → incident.id)
   - Geography point storage
   - Timestamp handling

4. **Notification System**
   - Finding police/admin users
   - Creating in-app notifications
   - Notification content generation

5. **WebSocket Broadcasting**
   - emergency:auto event
   - incident:new event
   - Real-time dashboard updates

6. **Business Logic**
   - "Critical + High = Emergency" rule
   - "Medium + Low = No Emergency" rule
   - Emergency type mapping

### ❌ **Does NOT Test:**
1. AI video processing (YOLO detection)
2. Video upload handling
3. Mobile app functionality
4. Camera capture quality
5. Network bandwidth/reliability

---

## 📊 Simulation Test Data Structure

### Required Fields:
```json
{
  "incident_detected": true,      // boolean - trigger incident creation
  "type": "accident",             // string - accident | road_blockage | congestion | fire
  "severity": "critical",         // string - critical | high | medium | low
  "confidence": 85,               // number - AI confidence (0-100)
  "location": {
    "latitude": -1.9506,          // number - GPS latitude
    "longitude": 30.0588,         // number - GPS longitude
    "location_name": "KN 5 Rd"    // string - human readable location
  }
}
```

### Optional Fields:
```json
{
  "vehicle_count": 10,            // number - vehicles detected
  "stationary_count": 5,          // number - stationary vehicles
  "avg_speed": 2,                 // number - average speed (km/h)
  "frames_analyzed": 30           // number - video frames processed
}
```

---

## 🎯 Example Test Scenarios

### Scenario 1: Critical Accident (Emergency Expected)
```bash
curl -X POST http://localhost:3000/api/incidents/test-detection \
  -H "Content-Type: application/json" \
  -d '{
    "incident_detected": true,
    "type": "accident",
    "severity": "critical",
    "confidence": 90,
    "vehicle_count": 15,
    "stationary_count": 12,
    "avg_speed": 1,
    "location": {
      "latitude": -1.9447,
      "longitude": 30.0597,
      "location_name": "KN 3 Ave, Kigali City Tower"
    }
  }'
```

**Expected Result:**
- ✅ Incident created in database
- ✅ **Emergency created** (severity = critical)
- ✅ Services: ["police", "ambulance"]
- ✅ Notifications sent to all police/admin users
- ✅ WebSocket broadcast to dashboards

### Scenario 2: Medium Congestion (No Emergency)
```bash
curl -X POST http://localhost:3000/api/incidents/test-detection \
  -H "Content-Type: application/json" \
  -d '{
    "incident_detected": true,
    "type": "congestion",
    "severity": "medium",
    "confidence": 65,
    "vehicle_count": 20,
    "avg_speed": 15,
    "location": {
      "latitude": -1.9537,
      "longitude": 30.0909,
      "location_name": "KG 9 Ave, Kacyiru"
    }
  }'
```

**Expected Result:**
- ✅ Incident created in database
- ✅ **No emergency created** (severity = medium)
- ✅ Notifications sent (incident only, not emergency)
- ✅ WebSocket broadcast (incident:new only)

### Scenario 3: High Road Blockage (Emergency Expected)
```bash
curl -X POST http://localhost:3000/api/incidents/test-detection \
  -H "Content-Type: application/json" \
  -d '{
    "incident_detected": true,
    "type": "road_blockage",
    "severity": "high",
    "confidence": 88,
    "vehicle_count": 8,
    "stationary_count": 8,
    "avg_speed": 0,
    "location": {
      "latitude": -1.9563,
      "longitude": 30.0944,
      "location_name": "KN 1 Rd, Downtown Kigali"
    }
  }'
```

**Expected Result:**
- ✅ Incident created in database
- ✅ **Emergency created** (severity = high)
- ✅ Services: ["police", "traffic_police"]
- ✅ Notifications sent
- ✅ WebSocket broadcast

---

## 🔧 How It Works Under the Hood

### 1. **Test Endpoint** (`backend/src/controllers/aiAnalysisController.js`)

```javascript
const testIncidentDetection = async (req, res) => {
    try {
        // Extract data from request body (instead of AI analysis)
        const { 
            incident_detected, 
            type, 
            severity, 
            confidence, 
            vehicle_count,
            location 
        } = req.body;
        
        // If no incident, return early
        if (!incident_detected) {
            return res.status(200).json({
                success: true,
                message: 'No incident detected (test)',
                data: { incident_detected: false }
            });
        }
        
        // Create incident in database (SAME as real flow)
        const incidentResult = await db.query(
            `INSERT INTO incidents (type, severity, location, address, description, status) 
             VALUES ($1, $2, ST_SetSRID(ST_MakePoint($3, $4), 4326), $5, $6, $7) 
             RETURNING *`,
            [type, severity, longitude, latitude, location_name, description, 'reported']
        );
        
        const incident = incidentResult.rows[0];
        
        // Create notifications (SAME as real flow)
        await createIncidentNotifications(incident, { confidence, vehicle_count });
        
        // Broadcast to dashboards (SAME as real flow)
        io.emit('incident:new', { incident, ai_analysis: { confidence } });
        
        // Check if emergency needed (SAME logic as real flow)
        let emergency = null;
        if (incident.severity === 'critical' || incident.severity === 'high') {
            // This function is IDENTICAL for real and simulation
            emergency = await createAutomaticEmergency(
                incident, 
                { confidence, vehicle_count }, 
                latitude, 
                longitude
            );
        }
        
        // Return response
        return res.status(200).json({
            success: true,
            data: {
                incident_detected: true,
                incident_id: incident.id,
                emergency_created: !!emergency,
                emergency_id: emergency?.id
            }
        });
        
    } catch (error) {
        console.error('Test incident detection error:', error);
        return res.status(500).json({ 
            success: false, 
            message: 'Test failed' 
        });
    }
};
```

### 2. **Key Insight: Same Function Called**

```javascript
// This function is called by BOTH:
// 1. Real AI video analysis endpoint
// 2. Simulation test endpoint

async function createAutomaticEmergency(incident, aiResults, latitude, longitude) {
    console.log(`Creating automatic emergency for incident ${incident.id}`);
    
    // Determine emergency type based on incident type
    let emergencyType = 'traffic';
    let servicesNeeded = [];
    
    if (incident.type === 'accident') {
        emergencyType = 'accident';
        servicesNeeded = ['police', 'ambulance'];
    } else if (incident.type === 'road_blockage') {
        emergencyType = 'road_blockage';
        servicesNeeded = ['police', 'traffic_police'];
    } else if (incident.type === 'fire') {
        emergencyType = 'fire';
        servicesNeeded = ['fire_department', 'police', 'ambulance'];
    }
    
    // Create emergency in database
    const emergencyResult = await db.query(
        `INSERT INTO emergencies (
            user_id, emergency_type, severity, location_name, 
            latitude, longitude, services_needed, description, 
            contact_phone, contact_name, incident_id, status
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12) 
        RETURNING *`,
        [
            null,  // user_id = NULL (system-generated)
            emergencyType,
            incident.severity,
            incident.address,
            latitude,
            longitude,
            JSON.stringify(servicesNeeded),
            `Automatic emergency created from ${incident.type}`,
            '112',  // Rwanda emergency hotline
            'TrafficGuard AI System',
            incident.id,
            'pending'
        ]
    );
    
    const emergency = emergencyResult.rows[0];
    
    // Broadcast to dashboards
    io.emit('emergency:auto', { 
        emergency, 
        incident, 
        message: 'Automatic emergency created' 
    });
    
    return emergency;
}
```

**The magic:** Whether called from real AI analysis or simulation, this function executes **identically**!

---

## ✅ Verification: How to Confirm It Worked

### 1. **Check Response**
```json
{
  "success": true,
  "data": {
    "incident_id": 8,
    "emergency_created": true,  ← Look for this!
    "emergency_id": 13
  }
}
```

### 2. **Verify in Database**
```bash
# Check incident created
docker exec trafficguard_db psql -U trafficguard_user -d trafficguard \
  -c "SELECT id, type, severity, address FROM incidents ORDER BY id DESC LIMIT 1;"

# Check emergency created (if critical/high)
docker exec trafficguard_db psql -U trafficguard_user -d trafficguard \
  -c "SELECT id, emergency_type, severity, contact_name, incident_id 
      FROM emergencies ORDER BY id DESC LIMIT 1;"

# Verify it's automatic (user_id IS NULL)
docker exec trafficguard_db psql -U trafficguard_user -d trafficguard \
  -c "SELECT id, user_id, contact_name FROM emergencies 
      WHERE user_id IS NULL ORDER BY id DESC LIMIT 1;"
```

### 3. **Check Logs**
```bash
# Backend logs show the process
tail -f backend.log

# Look for:
# - "Creating automatic emergency for incident X"
# - "Emergency created with ID: Y"
# - "Notifications sent to Z users"
```

### 4. **Dashboard Should Show**
- 🚨 New emergency alert
- 📍 Map marker at location
- 🔔 Notification badge
- 📊 Updated statistics

---

## 🎓 Summary

**Simulation Testing:**
1. **Bypasses only AI video processing**
2. **Uses exact same code** for everything else
3. **Tests the most important parts:**
   - Automatic emergency creation logic ✅
   - Database operations ✅
   - Notification system ✅
   - WebSocket broadcasts ✅
   - Business rules (severity thresholds) ✅

**Benefits:**
- ✅ Instant results
- ✅ 100% reliable
- ✅ Easy to automate
- ✅ Perfect for CI/CD
- ✅ No need for real traffic during development

**Limitations:**
- ❌ Doesn't test AI accuracy
- ❌ Doesn't test video processing
- ❌ Doesn't test mobile app

**Conclusion:**  
Simulation testing is **perfect for validating your automatic emergency dispatch system** works correctly, which is your main requirement! When you have real traffic, the AI will provide the same JSON structure, and everything will work identically. 🎉
