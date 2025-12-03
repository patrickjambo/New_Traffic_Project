# 🚨 EMERGENCY REPORT FEATURE - TESTING GUIDE

## Overview
This guide will help you test the new emergency report feature in the mobile app. Users can now report emergencies with detailed information including type, severity, location, casualties, and required services.

---

## Prerequisites

### 1. Services Must Be Running
```bash
# Check all services
docker ps | grep postgres  # Database should be running
curl http://localhost:3000/health  # Backend should respond
```

### 2. Physical Device or Emulator
**IMPORTANT:** Emergency report requires:
- GPS/Location services (for coordinates)
- Network connection (to submit report)
- Must run on physical device or emulator (NOT web browser)

---

## Setup Instructions

### Step 1: Start All Services
```bash
cd /home/jambo/New_Traffic_Project
./start_integrated_system.sh
```

### Step 2: Connect Your Device

#### Option A: Physical Android Device
1. Enable USB debugging on your device
2. Connect device via USB
3. Verify connection: `flutter devices`
4. Make sure device and computer are on same WiFi network

#### Option B: Android Emulator
1. Start emulator: `flutter emulators --launch <emulator_id>`
2. Verify: `flutter devices`

### Step 3: Configure Backend URL

**CRITICAL:** Update the backend URL in app_config.dart

For **physical device**, find your computer's IP:
```bash
# Linux/Mac
hostname -I | awk '{print $1}'

# Windows
ipconfig | findstr IPv4
```

Edit: `mobile_app/lib/config/app_config.dart`
```dart
class AppConfig {
  static const String baseUrl = 'http://YOUR_COMPUTER_IP:3000';  // NOT localhost!
  // ...
}
```

For **emulator**, use:
```dart
static const String baseUrl = 'http://10.0.2.2:3000';  // Emulator special IP
```

### Step 4: Run the App
```bash
cd /home/jambo/New_Traffic_Project/mobile_app
flutter run
```

---

## Testing the Emergency Report Feature

### Test 1: Access Emergency Report Screen

1. **Launch the app** on your device
2. **Login** to your account
3. On the **Home Screen**, look for the red "Report Emergency" card
4. **Tap** on the "Report Emergency" card
5. **Expected:** Emergency Report screen opens with form

### Test 2: Select Emergency Type

1. **View** the 8 emergency type chips at the top
2. **Tap** each type to see icon/color changes:
   - 🚗 **Accident** (Red)
   - 🔥 **Fire** (Orange)
   - 🏥 **Medical** (Pink)
   - 🛡️ **Crime** (Purple)
   - ⚠️ **Natural Disaster** (Brown)
   - 👥 **Riot** (Deep Orange)
   - ☢️ **Hazmat** (Yellow)
   - ❗ **Other** (Grey)
3. **Expected:** Selected chip shows checkmark and highlighted color

### Test 3: Select Severity Level

1. **View** the 4 severity levels with descriptions
2. **Tap** each severity:
   - 🔴 **Critical:** Life-threatening, immediate response
   - 🟠 **High:** Serious situation, urgent response
   - 🟡 **Medium:** Moderate concern, priority response
   - 🔵 **Low:** Minor situation, standard response
3. **Expected:** Selected severity shows with colored background

### Test 4: Select Emergency Services

1. **View** the 4 service checkboxes
2. **Tap** to select/deselect:
   - 👮 **Police**
   - 🚑 **Ambulance**
   - 🚒 **Fire Department**
   - 🆘 **Rescue Team**
3. **Select multiple** services (e.g., Police + Ambulance)
4. **Expected:** Checkboxes update, can select multiple

### Test 5: Capture GPS Location

1. **Find** the "GPS Location" section
2. **Tap** the "📍 Get Current Location" button
3. **Grant** location permission if prompted
4. **Expected:**
   - Loading indicator appears
   - Success snackbar: "✓ Location acquired"
   - Latitude and Longitude display
   - Green checkmark shows location acquired

**Troubleshooting:**
- If "Location services disabled": Enable GPS in device settings
- If "Permission denied": Grant location permission in app settings
- If stuck loading: Tap refresh button, try again

### Test 6: Fill Form Fields

#### A. Location Name (Required)
```
Test input: "Kampala Road, near Sheraton Hotel"
```

#### B. Description (Required, Min 10 characters)
```
Test input: "Multiple vehicle collision blocking traffic. Two cars and a motorcycle involved. Injuries reported."
```

#### C. Casualties Count (Optional)
```
Test input: 3
```

#### D. Vehicles Involved (Optional)
```
Test input: 3
```

#### E. Contact Phone (Required)
```
Test input: +256700123456
```

### Test 7: Submit Emergency Report

1. **Verify** all required fields are filled:
   - ✅ Emergency type selected
   - ✅ Severity selected
   - ✅ At least one service selected
   - ✅ GPS location acquired
   - ✅ Location name filled
   - ✅ Description filled (min 10 chars)
   - ✅ Contact phone filled

2. **Tap** the large red "🚨 REPORT EMERGENCY" button

3. **Expected:**
   - Button shows loading indicator
   - Text changes to "Reporting Emergency..."
   - Brief pause while submitting

4. **Success Dialog appears:**
   ```
   ✅ Emergency Reported
   
   Emergency ID: #12345
   Type: Accident | Severity: High
   Services: Police, Ambulance
   
   ✅ Emergency services have been notified
   📍 Nearby authorities are being dispatched
   
   [Track Emergency] [OK]
   ```

5. **Verify** emergency ID is displayed
6. **Tap** "OK" to close dialog and return to home

### Test 8: Validation Testing

Test the form validation by trying to submit with missing fields:

#### A. Test Without Location
1. Don't tap "Get Current Location"
2. Fill other fields
3. Tap "REPORT EMERGENCY"
4. **Expected:** Error message: "Please enable location to report emergency"

#### B. Test Without Services
1. Deselect all emergency services
2. Fill other fields
3. Tap "REPORT EMERGENCY"
4. **Expected:** Error message: "Please select at least one emergency service"

#### C. Test Short Description
1. Enter description: "Help" (< 10 characters)
2. Fill other fields
3. Tap "REPORT EMERGENCY"
4. **Expected:** Validation error: "Description must be at least 10 characters"

#### D. Test Empty Required Fields
1. Leave location name empty
2. Tap "REPORT EMERGENCY"
3. **Expected:** Validation error: "Please enter location name"

---

## Backend Verification

### Check Emergency in Database

```bash
# Connect to database
docker exec -it trafficguard_db psql -U trafficguard -d trafficguard_db

# Query emergencies
SELECT 
  id,
  emergency_type,
  severity,
  location_name,
  services_needed,
  status,
  created_at
FROM emergencies
ORDER BY created_at DESC
LIMIT 5;

# Exit
\q
```

### Check Backend Logs

```bash
# View backend logs
cd /home/jambo/New_Traffic_Project/backend
tail -f backend.log

# Look for:
# POST /api/emergency - 201 Created
# Emergency created with ID: 12345
```

### Test API Endpoint Directly

```bash
# Get your emergency by ID (replace 1 with actual ID)
curl http://localhost:3000/api/emergency/1

# Expected response:
{
  "success": true,
  "data": {
    "id": 1,
    "emergency_type": "accident",
    "severity": "high",
    "location_name": "Kampala Road, near Sheraton Hotel",
    "latitude": 0.3476,
    "longitude": 32.5825,
    "description": "Multiple vehicle collision...",
    "casualties_count": 3,
    "vehicles_involved": 3,
    "services_needed": ["police", "ambulance"],
    "contact_phone": "+256700123456",
    "status": "pending",
    "created_at": "2025-01-15T10:30:00Z"
  }
}
```

---

## Web Dashboard Verification

### Check Emergency Appears on Dashboard

1. **Open web browser:** `http://localhost:3000`
2. **Login** as admin or police officer
3. **Navigate** to Emergency Management section
4. **Expected:** Your test emergency appears in the list
5. **Verify details:**
   - Emergency type and severity correct
   - Location shows on map
   - Services needed listed
   - Casualties and vehicles match
   - Status shows "Pending"

### Test Real-Time Notifications

1. **Keep web dashboard open**
2. **Submit another emergency** from mobile app
3. **Expected:** 
   - Notification appears on web dashboard
   - Sound alert plays (if enabled)
   - Emergency count updates
   - New emergency appears in list without refresh

---

## Mobile App Features Testing

### Test UI Components

#### Emergency Type Icons
- Each type shows correct icon (car, fire, medical, etc.)
- Colors change based on selection
- Checkmark appears on selected type

#### Severity Levels
- Radio buttons work correctly
- Background color changes on selection
- Descriptions are clear and helpful

#### GPS Location
- Refresh button works to re-acquire location
- Coordinates display correctly
- Loading state shows during acquisition
- Error messages clear if location fails

#### Form Inputs
- Text fields accept input correctly
- Number fields only accept numbers
- Phone field shows phone keyboard
- Validation errors display clearly

#### Warning Banner
- Red banner visible at top
- Warning about life-threatening emergencies
- Call 999 message clear

#### Privacy Notice
- Grey box at bottom
- Explains data sharing with services
- Text is readable and clear

### Test Success Dialog

1. **Submit emergency successfully**
2. **Verify dialog shows:**
   - ✅ Green checkmark icon
   - "Emergency Reported" title
   - Emergency ID prominently displayed
   - Blue info box with summary
   - Confirmation messages
   - "Track Emergency" button (TODO)
   - "OK" button functional

3. **Tap "Track Emergency"** (if implemented)
4. **Tap "OK"** to close and return

---

## Integration Testing

### Test Full Emergency Flow

1. **Start:** User opens app on mobile device
2. **Navigate:** Tap "Report Emergency" from home
3. **Select:** Choose emergency type (e.g., Accident)
4. **Set:** Choose severity (e.g., High)
5. **Pick:** Select services (e.g., Police + Ambulance)
6. **Locate:** Tap "Get Current Location", grant permission
7. **Fill:** Enter location name, description, casualties, vehicles, phone
8. **Submit:** Tap "REPORT EMERGENCY"
9. **Confirm:** Success dialog appears with emergency ID
10. **Verify:** Check web dashboard for new emergency
11. **Notify:** Confirm WebSocket notification received
12. **Database:** Verify record in PostgreSQL
13. **Status:** Check emergency status is "pending"

**Expected Time:** 2-3 minutes for complete flow

---

## Troubleshooting

### Issue 1: "Network Error" on Submit

**Symptoms:** Error message when tapping REPORT EMERGENCY

**Solutions:**
```bash
# 1. Check backend is running
curl http://YOUR_IP:3000/health

# 2. Verify app_config.dart has correct IP
# Edit: mobile_app/lib/config/app_config.dart
# Ensure: baseUrl = 'http://YOUR_COMPUTER_IP:3000'

# 3. Check device and computer on same WiFi
# 4. Check firewall not blocking port 3000

# 5. Test backend from device browser
# Open browser on device, visit: http://YOUR_IP:3000/health
```

### Issue 2: Location Permission Denied

**Symptoms:** Can't acquire GPS location

**Solutions:**
1. Open device Settings → Apps → TrafficGuard AI
2. Permissions → Location → Allow
3. Return to app, tap refresh button
4. Verify GPS is enabled on device

### Issue 3: Emergency Not Showing on Dashboard

**Symptoms:** Submit success but not visible on web

**Solutions:**
```bash
# 1. Check database
docker exec -it trafficguard_db psql -U trafficguard -d trafficguard_db
SELECT COUNT(*) FROM emergencies;
\q

# 2. Check backend received request
cd /home/jambo/New_Traffic_Project/backend
tail -n 20 backend.log | grep emergency

# 3. Check WebSocket connection
# In browser console: check for Socket.IO connection

# 4. Refresh web dashboard
# Press F5 or Ctrl+R
```

### Issue 4: App Crashes on Submit

**Symptoms:** App closes when tapping REPORT EMERGENCY

**Solutions:**
```bash
# 1. Check Flutter logs
flutter logs

# 2. Look for stack trace
# Common issues:
# - EmergencyService not initialized
# - Network timeout
# - JSON parsing error

# 3. Verify EmergencyService exists
ls mobile_app/lib/services/emergency_service.dart

# 4. Check imports in emergency_report_screen.dart
```

### Issue 5: "No Route Found" Error

**Symptoms:** Tapping "Report Emergency" does nothing or shows error

**Solutions:**
```bash
# 1. Verify route added in main.dart
grep "emergency-report" mobile_app/lib/main.dart

# 2. Check import in main.dart
grep "emergency_report_screen" mobile_app/lib/main.dart

# 3. Rebuild app
cd mobile_app
flutter clean
flutter pub get
flutter run
```

---

## Performance Testing

### Load Testing

1. **Submit 5 emergencies** quickly (different types)
2. **Expected:**
   - Each submission takes < 2 seconds
   - No crashes or errors
   - All emergencies appear on dashboard
   - Database has all 5 records

### Stress Testing

1. **Fill form with maximum data:**
   - Long location name (100+ characters)
   - Long description (500+ characters)
   - High casualty count (99)
   - High vehicle count (50)

2. **Submit and verify:**
   - Backend accepts request
   - Database stores all data
   - Dashboard displays correctly

### Network Testing

1. **Submit with slow connection:**
   - Enable "slow 3G" in device settings
   - Submit emergency
   - Expected: Loading indicator shows, eventual success

2. **Submit with no connection:**
   - Enable airplane mode
   - Try to submit
   - Expected: "Network error" message

3. **Submit then lose connection:**
   - Start submission
   - Quickly enable airplane mode
   - Expected: Graceful error handling

---

## Success Criteria

### Mobile App
✅ Emergency report card visible on home screen  
✅ Navigation to emergency report screen works  
✅ All 8 emergency types selectable with correct icons  
✅ All 4 severity levels selectable with descriptions  
✅ All 4 services multi-selectable  
✅ GPS location capture works with permission handling  
✅ Form validation prevents invalid submissions  
✅ Required fields enforced (location name, description, phone)  
✅ Min 10 characters enforced on description  
✅ Success dialog shows with emergency ID  
✅ Error messages clear and helpful  

### Backend
✅ POST /api/emergency endpoint receives requests  
✅ Emergency saved to database with all fields  
✅ Emergency ID returned in response  
✅ WebSocket broadcasts emergency:new event  
✅ Backend logs show successful creation  

### Database
✅ Emergency record created in emergencies table  
✅ All fields stored correctly (type, severity, location, etc.)  
✅ GPS coordinates stored as PostGIS geometry  
✅ Timestamp and status set correctly  

### Web Dashboard
✅ New emergency appears in list  
✅ Real-time notification received via WebSocket  
✅ Emergency details display correctly  
✅ Location shows on map  
✅ Services needed listed  

---

## Next Steps After Testing

### 1. Implement Emergency Tracking Screen
Create `mobile_app/lib/screens/emergency_tracking_screen.dart` to:
- Show real-time emergency status
- Display assigned responders
- Show estimated time of arrival
- Map with responder location
- Status timeline (pending → active → dispatched → resolved)

### 2. Add Push Notifications
Integrate Firebase Cloud Messaging:
- Notify user when emergency status changes
- Alert when responders are dispatched
- Notify when responders arrive
- Send completion confirmation

### 3. Add Emergency History
Create screen to view past emergencies:
- List user's submitted emergencies
- Filter by status (pending, active, resolved)
- View details of each emergency
- Track response times

### 4. Enhanced Location Features
- Show emergency location on map
- Display nearby emergency services
- Estimate response time based on distance
- Show traffic conditions

---

## Support

### Get Help
- **Documentation:** Check MOBILE_APP_AI_INTEGRATION.md
- **Logs:** Check backend.log and Flutter console
- **Database:** Use psql to inspect data
- **API:** Test endpoints with cURL

### Report Issues
If you encounter bugs:
1. Note exact steps to reproduce
2. Capture error messages
3. Check Flutter logs: `flutter logs`
4. Check backend logs: `tail backend.log`
5. Provide device info (Android/iOS version)

---

**Good luck with testing! 🚨🚑🚒👮**
