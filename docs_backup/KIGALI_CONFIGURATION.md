# 🇷🇼 Kigali City Configuration Guide

## 📍 Kigali GPS Coordinates & Streets

### City Center Locations (for testing):

**1. KN 3 Ave (CBD - Central Business District)**
- Latitude: `-1.9441`
- Longitude: `30.0619`
- Area: Downtown Kigali, near Union Trade Centre

**2. KN 4 Ave (City Center)**
- Latitude: `-1.9506`
- Longitude: `30.0588`
- Area: Main commercial street, near Hotel des Mille Collines

**3. KN 2 Rd (Nyarugenge)**
- Latitude: `-1.9536`
- Longitude: `30.0606`
- Area: Near Kigali City Tower

**4. KG 9 Ave (Kimihurura)**
- Latitude: `-1.9403`
- Longitude: `30.1067`
- Area: Residential/Commercial area

**5. KN 78 St (Kacyiru)**
- Latitude: `-1.9559`
- Longitude: `30.0924`
- Area: Government district, near Parliament

**6. KG 11 Ave (Remera)**
- Latitude: `-1.9547`
- Longitude: `30.1155`
- Area: Shopping area, near UTC

**7. KN 5 Rd (Nyabugogo)**
- Latitude: `-1.9676`
- Longitude: `30.0439`
- Area: Bus terminal, high traffic

**8. Umuganda Blvd**
- Latitude: `-1.9578`
- Longitude: `30.1122`
- Area: Main boulevard, Kimironko

---

## 🚨 Common Accident-Prone Areas in Kigali

### High Traffic Zones:
1. **Nyabugogo Roundabout** (-1.9676, 30.0439) - Heavy bus traffic
2. **Kwa Rubangura** (-1.9513, 30.0598) - CBD intersection
3. **Kimironko Junction** (-1.9587, 30.1134) - Market area
4. **Remera Junction** (-1.9547, 30.1155) - Commercial zone
5. **Kicukiro Roundabout** (-1.9851, 30.1018) - Industrial area

---

## 📱 Update Mobile App Configuration

### File: `mobile_app/lib/services/fcm_service.dart`

Update the test location:

```dart
// Example: Subscribe to Kigali city center alerts
await _fcmService.subscribeToLocation(
  -1.9441,  // KN 3 Ave, Kigali CBD
  30.0619
);
```

### File: `mobile_app/lib/services/incident_monitor_service.dart`

The location matching works automatically for any Kigali location!

```dart
// Proximity radius: 100m (perfect for Kigali streets)
static const double proximityRadiusMeters = 100.0;

// Example: Two incidents on KN 3 Ave
Location 1: -1.9441, 30.0619
Location 2: -1.9442, 30.0620 (11 meters away)
Result: SAME INCIDENT ✅

// Example: Different streets
Location 1: -1.9441, 30.0619 (KN 3 Ave)
Location 2: -1.9506, 30.0588 (KN 4 Ave, 750m away)
Result: DIFFERENT INCIDENT ✅
```

---

## 🧪 Test Scenarios for Kigali

### Scenario 1: Accident on KN 3 Ave (CBD)

```dart
// Device location: KN 3 Ave, Kigali
GPS: -1.9441, 30.0619

Time 00:00 - Accident detected
Time 00:05 - Second clip → Matches to same incident
Time 00:10 - Third clip → Matches to same incident
Time 00:15 - Fourth clip → Matches to same incident

Result: 1 incident report for 1 accident ✅
```

### Scenario 2: Multiple Accidents in Kigali

```dart
// Device 1: KN 3 Ave (-1.9441, 30.0619)
Detects accident → Creates Incident #1

// Device 2: KN 4 Ave (-1.9506, 30.0588) - 750m away
Detects accident → Creates Incident #2 (different location)

// Device 1: Still recording KN 3 Ave accident
New clip → Matches to Incident #1 (updates existing)

Result: 2 separate incidents tracked correctly ✅
```

---

## 🗺️ Firebase FCM Location Topics (Kigali)

Firebase will create location-based topics automatically:

```dart
// KN 3 Ave area (CBD)
Topic: "location_-194_306"  // Grid: -1.94, 30.06
Topic: "area_-19_30"        // Broader area

// KN 4 Ave area
Topic: "location_-195_305"
Topic: "area_-19_30"

// Kimihurura area
Topic: "location_-194_301"
Topic: "area_-19_30"

// Police officers in same grid get notified!
```

---

## 📊 Example: Real Kigali Emergency Data

### Emergency Report Format:

```json
{
  "emergencyType": "accident",
  "severity": "high",
  "locationName": "KN 3 Ave, near Union Trade Centre",
  "latitude": -1.9441,
  "longitude": 30.0619,
  "description": "Vehicle collision, 2 cars involved",
  "casualtiesCount": 2,
  "vehiclesInvolved": 2,
  "servicesNeeded": ["police", "ambulance"],
  "contactPhone": "+250788123456",
  "city": "Kigali",
  "district": "Nyarugenge"
}
```

---

## 🚦 Kigali Traffic Patterns (for AI training)

### Peak Hours:
- Morning: 07:00 - 09:00 (rush hour to CBD)
- Evening: 17:00 - 19:00 (rush hour from CBD)

### High-Risk Times:
- Friday evenings (18:00-20:00)
- Saturday nights (22:00-02:00)
- Monday mornings (07:30-08:30)

### Weather Considerations:
- Rainy season (March-May): Increased accident risk
- Foggy mornings: Reduced visibility on hills

---

## 🎯 GPS Accuracy in Kigali

Kigali is built on hills, which can affect GPS:

```dart
// Good GPS accuracy expected:
- CBD (flat area): ±5-10 meters
- Kimihurura (elevated): ±10-15 meters
- Kicukiro (valley): ±5-10 meters

// Our 100m radius handles GPS variations perfectly!
```

---

## 🚨 Emergency Services Contacts (Kigali)

Update these in your backend `.env`:

```env
# Rwanda Emergency Numbers
POLICE_PHONE=112
AMBULANCE_PHONE=912
FIRE_BRIGADE_PHONE=111

# Dispatch Centers
POLICE_DISPATCH_NUMBERS=+250788999111,+250788999112

# For SMS alerts (optional)
KIGALI_POLICE_HQ=+250788999000
```

---

## 📱 Test Commands with Kigali Data

### Create Test Emergency (KN 3 Ave):

```bash
curl -X POST http://localhost:3000/api/emergency \
  -H "Content-Type: application/json" \
  -d '{
    "emergencyType": "accident",
    "severity": "high",
    "locationName": "KN 3 Ave, near Union Trade Centre",
    "latitude": -1.9441,
    "longitude": 30.0619,
    "description": "Vehicle collision on main road",
    "casualtiesCount": 2,
    "vehiclesInvolved": 2,
    "servicesNeeded": ["police", "ambulance"],
    "contactPhone": "+250788123456"
  }'
```

### Get Nearby Emergencies (within 5km of CBD):

```bash
curl "http://localhost:3000/api/emergency?latitude=-1.9441&longitude=30.0619&radius=5"
```

### Firebase Push to Kigali CBD Police:

```javascript
// Backend sends push notification
topic: 'location_-194_306'  // KN 3 Ave area
payload: {
  type: 'emergency_new',
  location: 'KN 3 Ave, Kigali CBD',
  severity: 'critical',
  latitude: -1.9441,
  longitude: 30.0619
}

// All police officers subscribed to this area get alert!
```

---

## 🎯 Incident Tracking Examples (Kigali)

### Example 1: Same Incident

```
Device at: KN 3 Ave (-1.9441, 30.0619)

Clip 1: Accident detected at (-1.9441, 30.0619)
        → Creates Incident #1 ✅

Clip 2: Accident detected at (-1.9442, 30.0620) - 11m away
        → MATCHES Incident #1 (same location) 🔄

Clip 3: Accident detected at (-1.9441, 30.0618) - 11m away
        → MATCHES Incident #1 (same location) 🔄

Result: 1 incident for 3 clips ✅
```

### Example 2: Different Incidents

```
Device moves around Kigali:

Clip 1: Accident at KN 3 Ave (-1.9441, 30.0619)
        → Creates Incident #1 ✅

Clip 2: Accident at KN 4 Ave (-1.9506, 30.0588) - 750m away
        → Creates Incident #2 (different street) ✅

Clip 3: Accident at Remera (-1.9547, 30.1155) - 6km away
        → Creates Incident #3 (different area) ✅

Result: 3 incidents for 3 different locations ✅
```

---

## 🚀 Quick Start for Kigali Setup

### 1. Update App Configuration:

```dart
// mobile_app/lib/config/app_config.dart
class AppConfig {
  // Kigali coordinates
  static const double defaultLatitude = -1.9441;   // KN 3 Ave
  static const double defaultLongitude = 30.0619;
  
  static const String cityName = 'Kigali';
  static const String countryCode = 'RW';
  static const String phonePrefix = '+250';
}
```

### 2. Test in Kigali CBD:

```bash
cd /home/jambo/New_Traffic_Project/mobile_app

# Get dependencies
flutter pub get

# Run on device
flutter run -d <device-id>

# The app will automatically:
# - Use Kigali GPS coordinates
# - Subscribe to Kigali location topics
# - Track incidents in Kigali areas
```

### 3. Monitor Kigali Activity:

```
App shows:
📍 Current Location: KN 3 Ave, Kigali
📍 Subscribed to: location_-194_306
✅ Monitoring Kigali city streets

When incident detected:
⚠️ Incident on KN 3 Ave (-1.9441, 30.0619)
🚨 Emergency created for Kigali CBD
📱 Push sent to police in Nyarugenge district
```

---

## 🗺️ Map Integration

### Google Maps Links (Kigali):

```dart
// Generate Google Maps link
String getMapLink(double lat, double lng) {
  return 'https://maps.google.com/?q=$lat,$lng';
}

// Example: KN 3 Ave
// https://maps.google.com/?q=-1.9441,30.0619
// Opens directly in Google Maps showing exact location in Kigali!
```

---

## ✅ Summary

### Kigali-Specific Features:
- ✅ GPS coordinates for major Kigali streets
- ✅ Rwanda phone number format (+250)
- ✅ Kigali district names (Nyarugenge, Kacyiru, Kimihurura, etc.)
- ✅ 100m proximity perfect for Kigali street density
- ✅ Location-based alerts for Kigali areas
- ✅ Emergency numbers for Rwanda (112, 912, 111)

### Everything works automatically for Kigali! 🇷🇼
- No code changes needed for GPS tracking
- Incident matching works for any Kigali location
- Firebase topics created automatically for Kigali areas
- Push notifications sent to police in same Kigali district

**Your app is now optimized for Kigali City! 🎉**
