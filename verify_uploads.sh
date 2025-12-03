#!/bin/bash

# Quick verification script for mobile app upload fix
# Usage: ./verify_uploads.sh

echo "=========================================="
echo "📊 MOBILE APP UPLOAD VERIFICATION"
echo "=========================================="
echo ""

# Check backend health
echo "1️⃣ Backend Health Check..."
BACKEND_HEALTH=$(curl -s http://192.168.34.237:3000/health | grep -o 'success')
if [ "$BACKEND_HEALTH" = "success" ]; then
    echo "   ✅ Backend: RUNNING"
else
    echo "   ❌ Backend: NOT RESPONDING"
    exit 1
fi
echo ""

# Check AI service health
echo "2️⃣ AI Service Health Check..."
AI_HEALTH=$(curl -s http://192.168.34.237:8000/health | grep -o 'healthy')
if [ "$AI_HEALTH" = "healthy" ]; then
    echo "   ✅ AI Service: RUNNING"
else
    echo "   ❌ AI Service: NOT RESPONDING"
    exit 1
fi
echo ""

# Check database
echo "3️⃣ Database Check..."
DB_CHECK=$(docker exec trafficguard_db pg_isready -U trafficguard_user 2>/dev/null)
if [[ $DB_CHECK == *"accepting connections"* ]]; then
    echo "   ✅ Database: CONNECTED"
else
    echo "   ❌ Database: NOT CONNECTED"
    exit 1
fi
echo ""

# Count incidents BEFORE test
echo "4️⃣ Current Incidents Count..."
INCIDENTS_BEFORE=$(docker exec trafficguard_db psql -U trafficguard_user -d trafficguard -t -c "SELECT COUNT(*) FROM incidents" 2>/dev/null | tr -d ' ')
echo "   📊 Incidents in database: $INCIDENTS_BEFORE"
echo ""

# Count emergencies BEFORE test
echo "5️⃣ Current Emergencies Count..."
EMERGENCIES_BEFORE=$(docker exec trafficguard_db psql -U trafficguard_user -d trafficguard -t -c "SELECT COUNT(*) FROM emergencies" 2>/dev/null | tr -d ' ')
echo "   🚨 Emergencies in database: $EMERGENCIES_BEFORE"
echo ""

echo "=========================================="
echo "🎬 READY TO TEST!"
echo "=========================================="
echo ""
echo "📱 NOW DO THIS:"
echo "   1. Open TrafficGuard app on your phone"
echo "   2. Tap 'Auto Monitor'"
echo "   3. Point camera at anything"
echo "   4. Wait 30 seconds"
echo ""
echo "👀 WATCH FOR:"
echo "   - Backend logs (running in other terminal)"
echo "   - Should see: POST /api/incidents/analyze-video 200"
echo "   - NOT: POST /api/auto-analysis/analyze 404"
echo ""
echo "⏳ Waiting 40 seconds for you to test..."
echo "   (This script will check results after)"
echo ""

# Countdown timer
for i in {40..1}; do
    echo -ne "   ⏱️  $i seconds remaining...\r"
    sleep 1
done
echo ""
echo ""

echo "=========================================="
echo "📊 VERIFICATION RESULTS"
echo "=========================================="
echo ""

# Count incidents AFTER test
echo "6️⃣ Checking Incidents After Test..."
INCIDENTS_AFTER=$(docker exec trafficguard_db psql -U trafficguard_user -d trafficguard -t -c "SELECT COUNT(*) FROM incidents" 2>/dev/null | tr -d ' ')
echo "   📊 Incidents now: $INCIDENTS_AFTER"

if [ "$INCIDENTS_AFTER" -gt "$INCIDENTS_BEFORE" ]; then
    INCIDENTS_NEW=$((INCIDENTS_AFTER - INCIDENTS_BEFORE))
    echo "   ✅ SUCCESS! $INCIDENTS_NEW new incident(s) created!"
else
    echo "   ⚠️  No new incidents yet (might be normal scenes)"
fi
echo ""

# Count emergencies AFTER test
echo "7️⃣ Checking Emergencies After Test..."
EMERGENCIES_AFTER=$(docker exec trafficguard_db psql -U trafficguard_user -d trafficguard -t -c "SELECT COUNT(*) FROM emergencies" 2>/dev/null | tr -d ' ')
echo "   🚨 Emergencies now: $EMERGENCIES_AFTER"

if [ "$EMERGENCIES_AFTER" -gt "$EMERGENCIES_BEFORE" ]; then
    EMERGENCIES_NEW=$((EMERGENCIES_AFTER - EMERGENCIES_BEFORE))
    echo "   ✅ $EMERGENCIES_NEW new emergency created!"
else
    echo "   ℹ️  No new emergencies (normal - only high-severity creates emergencies)"
fi
echo ""

# Check recent backend activity
echo "8️⃣ Checking Backend Upload Activity..."
UPLOAD_COUNT=$(tail -100 /home/jambo/New_Traffic_Project/backend.log | grep -c "POST /api/incidents/analyze-video")
ERROR_COUNT=$(tail -100 /home/jambo/New_Traffic_Project/backend.log | grep -c "POST /api/auto-analysis/analyze 404")

echo "   📤 Upload requests (last 100 logs): $UPLOAD_COUNT"
echo "   ❌ 404 errors (last 100 logs): $ERROR_COUNT"
echo ""

if [ "$UPLOAD_COUNT" -gt 0 ]; then
    echo "   ✅ SUCCESS! Uploads are reaching backend!"
elif [ "$ERROR_COUNT" -gt 0 ]; then
    echo "   ❌ FAILED! Still getting 404 errors (wrong endpoint)"
    echo "   💡 Try: Force close app and reopen, or reinstall"
else
    echo "   ⚠️  WARNING! No upload requests seen"
    echo "   💡 Check: Is Auto Monitor running on phone?"
fi
echo ""

# Show recent incidents
echo "9️⃣ Recent Incidents (Last 3)..."
docker exec trafficguard_db psql -U trafficguard_user -d trafficguard -c "SELECT id, type, severity, description, created_at FROM incidents ORDER BY created_at DESC LIMIT 3" 2>/dev/null
echo ""

# Check AI activity
echo "🔟 AI Service Activity..."
AI_REQUESTS=$(tail -50 /home/jambo/New_Traffic_Project/ai_service.log | grep -c "POST /analyze")
echo "   🤖 AI analysis requests: $AI_REQUESTS"
if [ "$AI_REQUESTS" -gt 0 ]; then
    echo "   ✅ AI service is analyzing videos!"
else
    echo "   ⚠️  No AI analysis yet"
fi
echo ""

echo "=========================================="
echo "📋 SUMMARY"
echo "=========================================="
echo ""

ALL_GOOD=true

if [ "$UPLOAD_COUNT" -gt 0 ] && [ "$ERROR_COUNT" -eq 0 ]; then
    echo "✅ Uploads working correctly"
else
    echo "❌ Upload issues detected"
    ALL_GOOD=false
fi

if [ "$AI_REQUESTS" -gt 0 ]; then
    echo "✅ AI analysis working"
else
    echo "⚠️  AI analysis not receiving requests"
    ALL_GOOD=false
fi

if [ "$INCIDENTS_AFTER" -ge "$INCIDENTS_BEFORE" ]; then
    echo "✅ Database connectivity confirmed"
else
    echo "⚠️  Database issues possible"
    ALL_GOOD=false
fi

echo ""

if [ "$ALL_GOOD" = true ]; then
    echo "🎉 SYSTEM FULLY OPERATIONAL!"
    echo ""
    echo "Next steps:"
    echo "  1. Test with real accident videos (YouTube on screen)"
    echo "  2. Verify incident detection works"
    echo "  3. Check emergency creation for high-severity"
    echo "  4. Real-world Kigali street testing"
else
    echo "⚠️  SOME ISSUES DETECTED"
    echo ""
    echo "Troubleshooting:"
    echo "  1. Check backend logs: tail -f backend.log"
    echo "  2. Force close and reopen app"
    echo "  3. Verify phone on same WiFi as computer"
    echo "  4. Check Activity Log on phone for errors"
fi

echo ""
echo "=========================================="
echo "For detailed testing guide, see:"
echo "📄 TEST_FIXED_APP_NOW.md"
echo "=========================================="
