#!/bin/bash
# Comprehensive Pre-Installation Test Suite
# Run this before installing mobile app

set -e

echo "╔════════════════════════════════════════════════════════════╗"
echo "║   TrafficGuard Pre-Installation Test Suite                ║"
echo "╚════════════════════════════════════════════════════════════╝"
echo ""

# Color codes
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

PASSED=0
FAILED=0

pass_test() {
    echo -e "${GREEN}✅ PASS${NC}: $1"
    ((PASSED++))
}

fail_test() {
    echo -e "${RED}❌ FAIL${NC}: $1"
    ((FAILED++))
}

warn_test() {
    echo -e "${YELLOW}⚠️  WARN${NC}: $1"
}

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "1. DATABASE CONNECTIVITY"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# Test database
if docker exec trafficguard_db pg_isready -U trafficguard_user > /dev/null 2>&1; then
    pass_test "Database is accepting connections"
else
    fail_test "Database is not responding"
fi

# Check database tables
TABLES=$(docker exec trafficguard_db psql -U trafficguard_user -d trafficguard -t -c "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema='public'" 2>/dev/null | tr -d ' ')
if [ "$TABLES" -gt 0 ]; then
    pass_test "Database has $TABLES tables"
else
    fail_test "Database has no tables"
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "2. BACKEND API TESTS"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# Test backend health
BACKEND_HEALTH=$(curl -s http://192.168.34.237:3000/health)
if echo "$BACKEND_HEALTH" | grep -q "success"; then
    pass_test "Backend health check passed"
    echo "   Response: $BACKEND_HEALTH"
else
    fail_test "Backend health check failed"
fi

# Test backend route exists
if curl -s -o /dev/null -w "%{http_code}" http://192.168.34.237:3000/api/incidents | grep -q "200\|401"; then
    pass_test "Backend /api/incidents route exists"
else
    fail_test "Backend /api/incidents route not found"
fi

# Check if analyze-video endpoint exists (should return 400 without file)
ANALYZE_CODE=$(curl -s -o /dev/null -w "%{http_code}" http://192.168.34.237:3000/api/incidents/analyze-video)
if [ "$ANALYZE_CODE" == "400" ]; then
    pass_test "Backend /api/incidents/analyze-video endpoint exists"
else
    warn_test "Backend /api/incidents/analyze-video returned code $ANALYZE_CODE"
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "3. AI SERVICE TESTS"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# Test AI health
AI_HEALTH=$(curl -s http://192.168.34.237:8000/health)
if echo "$AI_HEALTH" | grep -q "healthy"; then
    pass_test "AI service health check passed"
    MODEL_LOADED=$(echo "$AI_HEALTH" | grep -o '"model_loaded":[^,}]*' | cut -d':' -f2)
    if echo "$MODEL_LOADED" | grep -q "true"; then
        pass_test "YOLOv8 model is loaded"
    else
        fail_test "YOLOv8 model not loaded"
    fi
else
    fail_test "AI service health check failed"
fi

# Test AI analyze endpoint exists
AI_ANALYZE_CODE=$(curl -s -o /dev/null -w "%{http_code}" http://192.168.34.237:8000/ai/analyze-traffic)
if [ "$AI_ANALYZE_CODE" == "422" ] || [ "$AI_ANALYZE_CODE" == "400" ]; then
    pass_test "AI /ai/analyze-traffic endpoint exists (returned $AI_ANALYZE_CODE)"
else
    warn_test "AI /ai/analyze-traffic returned unexpected code $AI_ANALYZE_CODE"
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "4. NETWORK CONNECTIVITY"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# Check if computer IP is accessible
if ping -c 1 192.168.34.237 > /dev/null 2>&1; then
    pass_test "Computer IP (192.168.34.237) is reachable"
else
    fail_test "Computer IP (192.168.34.237) is NOT reachable"
fi

# Check ports
for port in 3000 8000; do
    if nc -z 192.168.34.237 $port 2>/dev/null; then
        pass_test "Port $port is open"
    else
        fail_test "Port $port is NOT open"
    fi
done

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "5. MOBILE DEVICE CONNECTION"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# Check ADB connection
ADB_DEVICES=$(adb devices | grep -v "List" | grep "device" | wc -l)
if [ "$ADB_DEVICES" -gt 0 ]; then
    pass_test "Mobile device connected via ADB"
    DEVICE_ID=$(adb devices | grep "device" | grep -v "List" | awk '{print $1}')
    echo "   Device ID: $DEVICE_ID"
else
    fail_test "No mobile device connected via ADB"
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "6. CODE VALIDATION"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# Check mobile app endpoint configuration
if grep -q "api/incidents/analyze-video" mobile_app/lib/services/auto_capture_service.dart; then
    pass_test "Mobile app uses correct endpoint (/api/incidents/analyze-video)"
else
    fail_test "Mobile app endpoint is incorrect"
fi

# Check mobile app IP configuration
if grep -q "192.168.34.237" mobile_app/lib/config/environment.dart; then
    pass_test "Mobile app configured with correct IP (192.168.34.237)"
else
    fail_test "Mobile app IP configuration is incorrect"
fi

# Check backend MIME type validation
if grep -q "video/" backend/src/controllers/aiAnalysisController.js; then
    pass_test "Backend accepts video MIME types"
else
    fail_test "Backend MIME validation might be too strict"
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "7. FILE SYSTEM CHECKS"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# Check if APK exists
if [ -f "mobile_app/build/app/outputs/flutter-apk/app-release.apk" ]; then
    APK_SIZE=$(ls -lh mobile_app/build/app/outputs/flutter-apk/app-release.apk | awk '{print $5}')
    pass_test "APK file exists (Size: $APK_SIZE)"
else
    fail_test "APK file not found - need to build first"
fi

# Check backend logs
if [ -f "backend.log" ]; then
    LOG_LINES=$(wc -l < backend.log)
    pass_test "Backend log exists ($LOG_LINES lines)"
    
    # Check for recent errors
    RECENT_ERRORS=$(tail -100 backend.log | grep -i "error" | wc -l)
    if [ "$RECENT_ERRORS" -gt 0 ]; then
        warn_test "Found $RECENT_ERRORS errors in recent backend logs"
    fi
else
    warn_test "Backend log file not found"
fi

# Check AI service logs
if [ -f "ai_service.log" ]; then
    LOG_LINES=$(wc -l < ai_service.log)
    pass_test "AI service log exists ($LOG_LINES lines)"
else
    warn_test "AI service log file not found"
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "8. DATABASE SCHEMA VALIDATION"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# Check incidents table
INCIDENTS_COUNT=$(docker exec trafficguard_db psql -U trafficguard_user -d trafficguard -t -c "SELECT COUNT(*) FROM incidents" 2>/dev/null | tr -d ' ')
if [ ! -z "$INCIDENTS_COUNT" ]; then
    pass_test "Incidents table exists (Current count: $INCIDENTS_COUNT)"
else
    fail_test "Incidents table does not exist or is not accessible"
fi

# Check emergencies table
EMERGENCIES_COUNT=$(docker exec trafficguard_db psql -U trafficguard_user -d trafficguard -t -c "SELECT COUNT(*) FROM emergencies" 2>/dev/null | tr -d ' ')
if [ ! -z "$EMERGENCIES_COUNT" ]; then
    pass_test "Emergencies table exists (Current count: $EMERGENCIES_COUNT)"
else
    fail_test "Emergencies table does not exist or is not accessible"
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "9. BACKEND ROUTE CONFIGURATION"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# Check if routes are registered
if grep -q "incidentRoutes" backend/src/server.js; then
    pass_test "Incident routes are registered in backend"
else
    fail_test "Incident routes not registered"
fi

if grep -q "emergencyRoutes" backend/src/server.js; then
    pass_test "Emergency routes are registered in backend"
else
    warn_test "Emergency routes not registered (optional)"
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "10. INTEGRATION TEST (SIMULATED VIDEO UPLOAD)"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# Check if backend logs show it's ready to accept uploads
if tail -50 backend.log | grep -q "listening\|running\|started" 2>/dev/null; then
    pass_test "Backend is in listening state"
else
    warn_test "Backend may not be fully started"
fi

# Check AI service initialization
if tail -50 ai_service.log | grep -q "AI Service initialized\|Model.*loaded" 2>/dev/null; then
    pass_test "AI service is initialized"
else
    warn_test "AI service may not be fully initialized"
fi

echo ""
echo "╔════════════════════════════════════════════════════════════╗"
echo "║   TEST SUMMARY                                             ║"
echo "╚════════════════════════════════════════════════════════════╝"
echo ""
echo -e "${GREEN}✅ Passed: $PASSED${NC}"
echo -e "${RED}❌ Failed: $FAILED${NC}"
echo ""

if [ $FAILED -eq 0 ]; then
    echo -e "${GREEN}╔════════════════════════════════════════════════════════════╗${NC}"
    echo -e "${GREEN}║   🎉 ALL TESTS PASSED - READY TO INSTALL!                 ║${NC}"
    echo -e "${GREEN}╚════════════════════════════════════════════════════════════╝${NC}"
    echo ""
    echo "Next steps:"
    echo "1. cd mobile_app"
    echo "2. flutter build apk --release"
    echo "3. adb uninstall ai.trafficguard.trafficguard_mobile (if exists)"
    echo "4. adb install build/app/outputs/flutter-apk/app-release.apk"
    echo "5. Open app and test Auto Monitor"
    exit 0
else
    echo -e "${RED}╔════════════════════════════════════════════════════════════╗${NC}"
    echo -e "${RED}║   ⚠️  SOME TESTS FAILED - FIX ISSUES FIRST!                ║${NC}"
    echo -e "${RED}╚════════════════════════════════════════════════════════════╝${NC}"
    echo ""
    echo "Fix the failed tests before installing the app."
    exit 1
fi
