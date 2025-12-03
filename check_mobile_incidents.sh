#!/bin/bash

echo "=================================================="
echo "   TrafficGuard Mobile App Verification Script"
echo "=================================================="
echo ""

# Check if services are running
echo "1️⃣  Checking Services Status..."
echo ""

# Check database
echo "📊 Database:"
docker ps | grep trafficguard_db > /dev/null
if [ $? -eq 0 ]; then
    echo "   ✅ PostgreSQL is running"
else
    echo "   ❌ PostgreSQL is NOT running"
fi
echo ""

# Check backend
echo "🟢 Backend API (port 3000):"
curl -s http://192.168.34.237:3000/health > /dev/null 2>&1
if [ $? -eq 0 ]; then
    echo "   ✅ Backend is running"
else
    echo "   ❌ Backend is NOT running"
fi
echo ""

# Check AI service
echo "🐍 AI Service (port 8000):"
curl -s http://192.168.34.237:8000/health > /dev/null 2>&1
if [ $? -eq 0 ]; then
    echo "   ✅ AI Service is running"
else
    echo "   ❌ AI Service is NOT running"
fi
echo ""

# Check incidents in database
echo "2️⃣  Checking Incidents from Mobile App..."
echo ""

echo "📱 Total Incidents in Database:"
INCIDENT_COUNT=$(docker exec trafficguard_db psql -U postgres -d trafficguard -t -c "SELECT COUNT(*) FROM incidents" 2>/dev/null | tr -d ' ')
if [ ! -z "$INCIDENT_COUNT" ]; then
    echo "   Total: $INCIDENT_COUNT incidents"
else
    echo "   ⚠️  Could not query database"
fi
echo ""

# Show recent incidents
echo "📋 Recent Incidents (Last 5):"
docker exec trafficguard_db psql -U postgres -d trafficguard -c "SELECT id, type, severity, location_name, created_at FROM incidents ORDER BY created_at DESC LIMIT 5" 2>/dev/null
echo ""

# Check auto-analysis clips
echo "3️⃣  Checking Auto-Analysis Clips (Mobile Videos)..."
echo ""

echo "🎥 Total Video Clips Uploaded:"
CLIP_COUNT=$(docker exec trafficguard_db psql -U postgres -d trafficguard -t -c "SELECT COUNT(*) FROM auto_analysis_clips" 2>/dev/null | tr -d ' ')
if [ ! -z "$CLIP_COUNT" ]; then
    echo "   Total: $CLIP_COUNT clips"
else
    echo "   ⚠️  Could not query database"
fi
echo ""

# Show recent clips
echo "📹 Recent Video Uploads (Last 5):"
docker exec trafficguard_db psql -U postgres -d trafficguard -c "SELECT id, file_path, analysis_status, created_at FROM auto_analysis_clips ORDER BY created_at DESC LIMIT 5" 2>/dev/null
echo ""

# Check via API
echo "4️⃣  Checking via Backend API..."
echo ""

echo "🌐 API Response (incidents):"
curl -s http://192.168.34.237:3000/api/incidents 2>/dev/null | python3 -m json.tool 2>/dev/null | head -30
echo ""

# Check backend logs for uploads
echo "5️⃣  Recent Backend Activity (Last 20 lines)..."
echo ""
echo "📝 Backend Logs (uploads/analysis):"
tail -20 /home/jambo/New_Traffic_Project/backend.log 2>/dev/null | grep -i "auto-analysis\|analyze\|upload\|POST\|incident" || echo "   No upload activity found in logs"
echo ""

# Check AI logs
echo "6️⃣  Recent AI Analysis Activity..."
echo ""
echo "🤖 AI Service Logs:"
tail -20 /home/jambo/New_Traffic_Project/ai_service.log 2>/dev/null | grep -i "analyzing\|detected\|confidence\|vehicles" || echo "   No analysis activity found in logs"
echo ""

echo "=================================================="
echo "   Verification Complete!"
echo "=================================================="
echo ""
echo "📱 To test the mobile app:"
echo "   1. Open TrafficGuard app on your Infinix X657"
echo "   2. Go to 'Auto Monitor' screen"
echo "   3. Tap 'Start Monitoring'"
echo "   4. Point camera at any scene"
echo "   5. Wait 5-10 seconds"
echo "   6. Check Activity Log for upload status"
echo ""
echo "💻 To view in browser:"
echo "   • Open: http://192.168.34.237:3000/api/incidents"
echo "   • Or wait for React dashboard to start"
echo ""
