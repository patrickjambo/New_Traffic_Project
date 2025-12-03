# 🚨 EMERGENCY REPORT - QUICK REFERENCE

## Start Testing (3 Commands)

```bash
# 1. Start all services
cd /home/jambo/New_Traffic_Project && ./start_integrated_system.sh

# 2. Configure backend URL (replace YOUR_IP)
nano mobile_app/lib/config/app_config.dart
# Change: baseUrl = 'http://YOUR_IP:3000'

# 3. Run app on device
cd mobile_app && flutter run
```

---

## Test Emergency Report (7 Steps)

1. **Tap** red "Report Emergency" card on home screen
2. **Select** emergency type (e.g., Accident 🚗)
3. **Choose** severity (e.g., High 🔴)
4. **Pick** services (e.g., Police + Ambulance ✓✓)
5. **Tap** "📍 Get Current Location" button
6. **Fill** location name, description (min 10 chars), phone
7. **Tap** "🚨 REPORT EMERGENCY" button

**Expected:** Success dialog with emergency ID

---

## Verify Emergency (3 Checks)

```bash
# 1. Check database
docker exec -it trafficguard_db psql -U trafficguard -d trafficguard_db -c "SELECT id, emergency_type, severity, status FROM emergencies ORDER BY created_at DESC LIMIT 1;"

# 2. Check backend response
curl http://localhost:3000/api/emergency | jq '.data[0]'

# 3. Check web dashboard
# Open: http://localhost:3000
# Login and check Emergency Management section
```

---

## Emergency Types

| Type | Icon | Use Case |
|------|------|----------|
| Accident 🚗 | car_crash | Traffic collisions |
| Fire 🔥 | local_fire_department | Fires, smoke |
| Medical 🏥 | medical_services | Health emergencies |
| Crime 🛡️ | shield | Theft, violence |
| Natural Disaster ⚠️ | warning | Floods, storms |
| Riot 👥 | groups | Mob violence |
| Hazmat ☢️ | dangerous | Chemical spills |
| Other ❗ | error | Uncategorized |

---

## Severity Levels

- 🔴 **Critical:** Life-threatening, immediate response
- 🟠 **High:** Serious situation, urgent response  
- 🟡 **Medium:** Moderate concern, priority response
- 🔵 **Low:** Minor situation, standard response

---

## Services

- 👮 **Police** - Law enforcement
- 🚑 **Ambulance** - Medical assistance
- 🚒 **Fire Department** - Fire/rescue
- 🆘 **Rescue Team** - Search and rescue

---

## Required Fields

✅ Emergency type (1 of 8)  
✅ Severity level (1 of 4)  
✅ Services needed (≥1)  
✅ GPS location (lat/lng)  
✅ Location name (text)  
✅ Description (≥10 chars)  
✅ Contact phone (number)

---

## Common Issues

| Problem | Solution |
|---------|----------|
| Network error | Check backend URL in app_config.dart |
| Location denied | Settings → Apps → TrafficGuard → Location |
| Not in database | Check backend logs: `tail backend.log` |
| WebSocket fail | Restart backend, check Socket.IO |

---

## API Endpoint

```bash
# Create emergency
curl -X POST http://localhost:3000/api/emergency \
  -H "Content-Type: application/json" \
  -d '{
    "emergencyType": "accident",
    "severity": "high",
    "locationName": "Kampala Road",
    "latitude": 0.3476,
    "longitude": 32.5825,
    "description": "Multiple vehicle collision",
    "casualtiesCount": 3,
    "vehiclesInvolved": 3,
    "servicesNeeded": ["police", "ambulance"],
    "contactPhone": "+256700123456"
  }'
```

---

## Files Created

```
mobile_app/lib/screens/emergency_report_screen.dart (NEW - 680 lines)
mobile_app/lib/services/emergency_service.dart (NEW - 250 lines)
TEST_EMERGENCY_REPORT.md (NEW - full testing guide)
EMERGENCY_REPORT_COMPLETE.md (NEW - complete summary)
```

---

## Files Modified

```
mobile_app/lib/screens/home_screen.dart (added emergency card)
mobile_app/lib/main.dart (added route + import)
```

---

## Quick Commands

```bash
# Get your computer IP (for app_config.dart)
hostname -I | awk '{print $1}'

# Check services running
docker ps && curl http://localhost:3000/health

# Run app on connected device
cd mobile_app && flutter devices && flutter run

# View backend logs
tail -f backend/backend.log

# Check emergencies in database
docker exec -it trafficguard_db psql -U trafficguard -d trafficguard_db -c "SELECT COUNT(*) FROM emergencies;"

# Test API endpoint
curl http://localhost:3000/api/emergency | jq
```

---

## Success Criteria

✅ Red emergency card on home screen  
✅ Form opens with 8 types, 4 severities  
✅ GPS location captures coordinates  
✅ Form validation works (required fields)  
✅ Submit shows success dialog with ID  
✅ Emergency saved to database  
✅ WebSocket broadcasts to dashboard  
✅ Web dashboard displays emergency  

---

## Next Steps

1. **Test on physical device** (GPS, network)
2. **Implement emergency tracking screen**
3. **Add push notifications (Firebase)**
4. **Create emergency history view**
5. **Add map integration**

---

## Documentation

📚 **Full Testing Guide:** TEST_EMERGENCY_REPORT.md  
📚 **Complete Summary:** EMERGENCY_REPORT_COMPLETE.md  
📚 **Mobile Integration:** MOBILE_APP_AI_INTEGRATION.md  
📚 **API Documentation:** API_DOCUMENTATION.md  

---

**Emergency Report is READY! Test it now! 🚨🚑🚒👮**
