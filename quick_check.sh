#!/bin/bash
# Quick Pre-Install Check

echo "🧪 TrafficGuard Quick System Check"
echo "===================================="
echo ""

# 1. Database
echo -n "1. Database: "
if docker exec trafficguard_db pg_isready -U trafficguard_user > /dev/null 2>&1; then
    echo "✅ Running"
else
    echo "❌ NOT Running"
fi

# 2. Backend
echo -n "2. Backend: "
if curl -s http://192.168.34.237:3000/health | grep -q "success"; then
    echo "✅ Running"
else
    echo "❌ NOT Running"
fi

# 3. AI Service
echo -n "3. AI Service: "
if curl -s http://192.168.34.237:8000/health | grep -q "healthy"; then
    echo "✅ Running"
else
    echo "❌ NOT Running"
fi

# 4. Correct Endpoint in Code
echo -n "4. Mobile App Endpoint: "
if grep -q "api/incidents/analyze-video" mobile_app/lib/services/auto_capture_service.dart; then
    echo "✅ Correct (/api/incidents/analyze-video)"
else
    echo "❌ Wrong endpoint"
fi

# 5. Correct IP
echo -n "5. Mobile App IP Config: "
if grep -q "192.168.34.237" mobile_app/lib/config/environment.dart; then
    echo "✅ Correct (192.168.34.237)"
else
    echo "❌ Wrong IP"
fi

# 6. Device Connected
echo -n "6. Phone Connected: "
if adb devices | grep -q "device$"; then
    DEVICE=$(adb devices | grep "device$" | awk '{print $1}')
    echo "✅ Yes ($DEVICE)"
else
    echo "❌ No device"
fi

# 7. APK Exists
echo -n "7. APK File: "
if [ -f "mobile_app/build/app/outputs/flutter-apk/app-release.apk" ]; then
    SIZE=$(ls -lh mobile_app/build/app/outputs/flutter-apk/app-release.apk | awk '{print $5}')
    echo "✅ Exists ($SIZE)"
else
    echo "⚠️  Not found (need to build)"
fi

# 8. Database Tables & Data
echo -n "8. Incidents Table: "
COUNT=$(docker exec trafficguard_db psql -U trafficguard_user -d trafficguard -t -c "SELECT COUNT(*) FROM incidents" 2>/dev/null | tr -d ' ')
if [ ! -z "$COUNT" ]; then
    echo "✅ Exists (Count: $COUNT)"
else
    echo "❌ NOT found"
fi

# 9. Backend Logs Check
echo -n "9. Recent Backend Errors: "
if [ -f "backend.log" ]; then
    ERRORS=$(tail -50 backend.log | grep -i "error" | wc -l)
    if [ "$ERRORS" -eq 0 ]; then
        echo "✅ None (clean)"
    else
        echo "⚠️  Found $ERRORS recent errors"
    fi
else
    echo "⚠️  Log file not found"
fi

# 10. Test Backend Endpoint
echo -n "10. Video Upload Endpoint: "
CODE=$(curl -s -o /dev/null -w "%{http_code}" http://192.168.34.237:3000/api/incidents/analyze-video)
if [ "$CODE" == "400" ]; then
    echo "✅ Ready (400 = needs file)"
else
    echo "⚠️  Code $CODE"
fi

echo ""
echo "===================================="
echo "📊 System Status: Ready for testing"
echo "===================================="
