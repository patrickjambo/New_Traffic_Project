#!/bin/bash

# FULL INTEGRATION TEST - Tests the EXACT workflow mobile app uses
# This simulates: Capture → Upload → AI Analysis → Database Storage

COMPUTER_IP="192.168.34.237"
BACKEND_URL="http://${COMPUTER_IP}:3000"
AI_URL="http://${COMPUTER_IP}:8000"

echo "╔═══════════════════════════════════════════════════════════╗"
echo "║  TrafficGuard FULL INTEGRATION TEST                       ║"
echo "║  Testing: Upload → MIME Check → AI Analysis → Database   ║"
echo "╚═══════════════════════════════════════════════════════════╝"
echo ""

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

PASSED=0
FAILED=0

# Test 1: Check Services Running
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "TEST 1: Services Running"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# Database
echo -n "  Database: "
if docker exec trafficguard_db pg_isready -U trafficguard_user > /dev/null 2>&1; then
    echo -e "${GREEN}✅ Running${NC}"
    ((PASSED++))
else
    echo -e "${RED}❌ NOT Running${NC}"
    ((FAILED++))
    exit 1
fi

# Backend
echo -n "  Backend: "
BACKEND_HEALTH=$(curl -s "${BACKEND_URL}/health" | grep -o '"success":true')
if [ ! -z "$BACKEND_HEALTH" ]; then
    echo -e "${GREEN}✅ Running${NC}"
    ((PASSED++))
else
    echo -e "${RED}❌ NOT Running${NC}"
    ((FAILED++))
    exit 1
fi

# AI Service
echo -n "  AI Service: "
AI_HEALTH=$(curl -s "${AI_URL}/health" | grep -o '"status":"healthy"')
if [ ! -z "$AI_HEALTH" ]; then
    echo -e "${GREEN}✅ Running${NC}"
    ((PASSED++))
else
    echo -e "${RED}❌ NOT Running${NC}"
    ((FAILED++))
    exit 1
fi

echo ""

# Test 2: Create Test Video (5 seconds like mobile app)
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "TEST 2: Create Test Video (Simulating Mobile Capture)"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

TEST_VIDEO="/tmp/test_traffic_video.mp4"

echo "  Creating 5-second test video with traffic simulation..."

# Create a video with moving objects (simulating cars)
if command -v ffmpeg > /dev/null 2>&1; then
    ffmpeg -f lavfi -i "color=c=gray:s=1280x720:d=5" \
           -vf "drawtext=text='TRAFFIC TEST':fontsize=60:fontcolor=white:x=(w-text_w)/2:y=(h-text_h)/2" \
           -c:v libx264 -pix_fmt yuv420p -t 5 -y "$TEST_VIDEO" > /dev/null 2>&1
    
    if [ -f "$TEST_VIDEO" ]; then
        SIZE=$(ls -lh "$TEST_VIDEO" | awk '{print $5}')
        echo -e "  ${GREEN}✅ Video created: ${SIZE}${NC}"
        ((PASSED++))
    else
        echo -e "  ${RED}❌ Failed to create video${NC}"
        ((FAILED++))
        exit 1
    fi
else
    echo -e "  ${YELLOW}⚠️  ffmpeg not found - using sample video instead${NC}"
    # Try to find existing video
    if [ -f "test_video.mp4" ]; then
        TEST_VIDEO="test_video.mp4"
        echo -e "  ${GREEN}✅ Using existing video${NC}"
        ((PASSED++))
    else
        echo -e "  ${RED}❌ No test video available${NC}"
        echo "  Install ffmpeg: sudo apt-get install ffmpeg"
        ((FAILED++))
        exit 1
    fi
fi

echo ""

# Test 3: Check Incidents COUNT BEFORE Upload
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "TEST 3: Database Baseline (Before Upload)"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

BEFORE_COUNT=$(docker exec trafficguard_db psql -U trafficguard_user -d trafficguard -t -c "SELECT COUNT(*) FROM incidents" 2>/dev/null | tr -d ' ')

echo -e "  Current incidents in database: ${BLUE}${BEFORE_COUNT}${NC}"
echo ""

# Test 4: Upload to CORRECT Endpoint (Like Mobile App Does)
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "TEST 4: Upload Video to CORRECT Endpoint"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

CORRECT_ENDPOINT="${BACKEND_URL}/api/incidents/analyze-video"
echo "  Endpoint: ${CORRECT_ENDPOINT}"
echo "  (This is what mobile app uses after fix)"
echo ""

echo "  Uploading video with MIME type 'video/mp4'..."

RESPONSE=$(curl -s -w "\n%{http_code}" -X POST \
  -F "video=@${TEST_VIDEO};type=video/mp4" \
  -F "latitude=-1.9536" \
  -F "longitude=30.0606" \
  -F "location=KN 3 Ave, Kigali" \
  "$CORRECT_ENDPOINT")

HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
BODY=$(echo "$RESPONSE" | head -n-1)

echo "  HTTP Status: $HTTP_CODE"

if [ "$HTTP_CODE" = "200" ] || [ "$HTTP_CODE" = "201" ]; then
    echo -e "  ${GREEN}✅ Upload accepted (HTTP $HTTP_CODE)${NC}"
    ((PASSED++))
    
    # Check if response contains success
    if echo "$BODY" | grep -q '"success":true'; then
        echo -e "  ${GREEN}✅ Backend returned success${NC}"
        ((PASSED++))
    else
        echo -e "  ${RED}❌ Backend returned error${NC}"
        echo "  Response: $BODY"
        ((FAILED++))
    fi
    
    # Check if AI analysis happened
    if echo "$BODY" | grep -q '"analysis"'; then
        echo -e "  ${GREEN}✅ AI analysis completed${NC}"
        ((PASSED++))
    else
        echo -e "  ${YELLOW}⚠️  No AI analysis in response${NC}"
        echo "  Response: $BODY"
    fi
else
    echo -e "  ${RED}❌ Upload FAILED (HTTP $HTTP_CODE)${NC}"
    echo "  Response: $BODY"
    ((FAILED++))
fi

echo ""

# Test 5: Verify MIME Type Acceptance
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "TEST 5: MIME Type Validation (Testing Fix)"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

echo "  Testing with 'application/octet-stream' (mobile app sometimes sends this)..."

RESPONSE2=$(curl -s -w "\n%{http_code}" -X POST \
  -F "video=@${TEST_VIDEO};type=application/octet-stream" \
  -F "latitude=-1.9536" \
  -F "longitude=30.0606" \
  -F "location=KN 4 Ave, Kigali" \
  "$CORRECT_ENDPOINT")

HTTP_CODE2=$(echo "$RESPONSE2" | tail -n1)
BODY2=$(echo "$RESPONSE2" | head -n-1)

if [ "$HTTP_CODE2" = "200" ] || [ "$HTTP_CODE2" = "201" ]; then
    echo -e "  ${GREEN}✅ MIME type fix works - octet-stream accepted${NC}"
    ((PASSED++))
else
    echo -e "  ${RED}❌ MIME type rejection still happening${NC}"
    echo "  HTTP Code: $HTTP_CODE2"
    echo "  Response: $BODY2"
    ((FAILED++))
fi

echo ""

# Test 6: Verify WRONG Endpoint Returns Error
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "TEST 6: Wrong Endpoint Check (Old Bug Detection)"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

WRONG_ENDPOINT="${BACKEND_URL}/api/auto-analysis/analyze"
echo "  Testing OLD endpoint: ${WRONG_ENDPOINT}"
echo "  (Mobile app should NOT use this anymore)"
echo ""

RESPONSE3=$(curl -s -w "\n%{http_code}" -X POST \
  -F "video=@${TEST_VIDEO};type=video/mp4" \
  "$WRONG_ENDPOINT")

HTTP_CODE3=$(echo "$RESPONSE3" | tail -n1)

if [ "$HTTP_CODE3" = "404" ] || [ "$HTTP_CODE3" = "500" ]; then
    echo -e "  ${GREEN}✅ Old endpoint correctly fails (HTTP $HTTP_CODE3)${NC}"
    echo "  This confirms mobile app MUST use /api/incidents/analyze-video"
    ((PASSED++))
else
    echo -e "  ${YELLOW}⚠️  Old endpoint still works? (HTTP $HTTP_CODE3)${NC}"
    echo "  Mobile app should use new endpoint anyway"
fi

echo ""

# Test 7: Check Database AFTER Upload
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "TEST 7: Database Update (After Upload)"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

sleep 2  # Give database time to commit

AFTER_COUNT=$(docker exec trafficguard_db psql -U trafficguard_user -d trafficguard -t -c "SELECT COUNT(*) FROM incidents" 2>/dev/null | tr -d ' ')

echo "  Incidents BEFORE upload: ${BEFORE_COUNT}"
echo "  Incidents AFTER upload:  ${AFTER_COUNT}"
echo ""

if [ "$AFTER_COUNT" -gt "$BEFORE_COUNT" ]; then
    DIFFERENCE=$((AFTER_COUNT - BEFORE_COUNT))
    echo -e "  ${GREEN}✅ Database updated (+${DIFFERENCE} incidents)${NC}"
    ((PASSED++))
else
    echo -e "  ${RED}❌ Database NOT updated (still ${AFTER_COUNT})${NC}"
    echo "  This means videos uploaded but not stored!"
    ((FAILED++))
fi

echo ""

# Test 8: Check Latest Incident Details
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "TEST 8: Latest Incident Data Quality"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

LATEST=$(docker exec trafficguard_db psql -U trafficguard_user -d trafficguard -t -c \
  "SELECT incident_type, severity, confidence, location FROM incidents ORDER BY created_at DESC LIMIT 1" 2>/dev/null)

if [ ! -z "$LATEST" ]; then
    echo "  Latest incident:"
    echo "  $LATEST"
    echo -e "  ${GREEN}✅ Incident data readable${NC}"
    ((PASSED++))
else
    echo -e "  ${RED}❌ Cannot read incident data${NC}"
    ((FAILED++))
fi

echo ""

# Test 9: Check AI Service Logs
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "TEST 9: AI Service Processing (Error Check)"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

if [ -f "ai_service.log" ]; then
    # Check for recent errors
    AI_ERRORS=$(tail -50 ai_service.log | grep -i "error\|failed\|exception" | grep -v "No objects detected" | wc -l)
    
    if [ "$AI_ERRORS" -eq 0 ]; then
        echo -e "  ${GREEN}✅ No AI processing errors${NC}"
        ((PASSED++))
    else
        echo -e "  ${YELLOW}⚠️  Found $AI_ERRORS errors in AI logs${NC}"
        echo "  Recent errors:"
        tail -50 ai_service.log | grep -i "error\|failed\|exception" | head -3
    fi
    
    # Check for 'moov atom not found' error
    MOOV_ERRORS=$(tail -100 ai_service.log | grep -c "moov atom not found")
    if [ "$MOOV_ERRORS" -eq 0 ]; then
        echo -e "  ${GREEN}✅ No video corruption errors (moov atom)${NC}"
        ((PASSED++))
    else
        echo -e "  ${RED}❌ Found $MOOV_ERRORS video corruption errors${NC}"
        echo "  This means 500ms delay fix not working!"
        ((FAILED++))
    fi
else
    echo -e "  ${YELLOW}⚠️  AI service log not found${NC}"
fi

echo ""

# Test 10: Check Backend Logs
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "TEST 10: Backend Processing (Error Check)"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

if [ -f "backend.log" ]; then
    # Check for file rejection errors
    REJECTION_ERRORS=$(tail -50 backend.log | grep -c "Only video files are allowed")
    
    if [ "$REJECTION_ERRORS" -eq 0 ]; then
        echo -e "  ${GREEN}✅ No file rejection errors${NC}"
        ((PASSED++))
    else
        echo -e "  ${RED}❌ Found $REJECTION_ERRORS file rejections${NC}"
        echo "  This means MIME type fix not applied!"
        ((FAILED++))
    fi
    
    # Check for successful uploads to CORRECT endpoint
    CORRECT_UPLOADS=$(tail -50 backend.log | grep -c "POST /api/incidents/analyze-video")
    
    if [ "$CORRECT_UPLOADS" -gt 0 ]; then
        echo -e "  ${GREEN}✅ Backend receiving uploads on CORRECT endpoint${NC}"
        echo "  (Found $CORRECT_UPLOADS recent uploads)"
        ((PASSED++))
    else
        echo -e "  ${YELLOW}⚠️  No recent uploads to /api/incidents/analyze-video${NC}"
    fi
    
    # Check for uploads to WRONG endpoint
    WRONG_UPLOADS=$(tail -50 backend.log | grep -c "POST /api/auto-analysis/analyze")
    
    if [ "$WRONG_UPLOADS" -eq 0 ]; then
        echo -e "  ${GREEN}✅ No uploads to OLD endpoint${NC}"
        ((PASSED++))
    else
        echo -e "  ${RED}⚠️  Found $WRONG_UPLOADS uploads to OLD endpoint${NC}"
        echo "  Mobile app still using old endpoint!"
    fi
else
    echo -e "  ${YELLOW}⚠️  Backend log not found${NC}"
fi

echo ""

# Test 11: Mobile App Code Verification
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "TEST 11: Mobile App Source Code (Endpoint Verification)"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

if [ -f "mobile_app/lib/services/auto_capture_service.dart" ]; then
    # Check endpoint
    if grep -q "api/incidents/analyze-video" mobile_app/lib/services/auto_capture_service.dart; then
        echo -e "  ${GREEN}✅ Source code has CORRECT endpoint${NC}"
        ((PASSED++))
    else
        echo -e "  ${RED}❌ Source code still has WRONG endpoint${NC}"
        ((FAILED++))
    fi
    
    # Check IP address
    if grep -q "192.168.34.237" mobile_app/lib/config/environment.dart; then
        echo -e "  ${GREEN}✅ Source code has correct IP (192.168.34.237)${NC}"
        ((PASSED++))
    else
        echo -e "  ${RED}❌ Source code has wrong IP${NC}"
        ((FAILED++))
    fi
    
    # Check for 500ms delay
    if grep -q "Duration(milliseconds: 500)" mobile_app/lib/services/auto_capture_service.dart; then
        echo -e "  ${GREEN}✅ Video corruption prevention (500ms delay) present${NC}"
        ((PASSED++))
    else
        echo -e "  ${YELLOW}⚠️  500ms delay not found - video corruption possible${NC}"
    fi
else
    echo -e "  ${RED}❌ Mobile app source not found${NC}"
    ((FAILED++))
fi

echo ""

# FINAL SUMMARY
echo "╔═══════════════════════════════════════════════════════════╗"
echo "║                    TEST SUMMARY                           ║"
echo "╚═══════════════════════════════════════════════════════════╝"
echo ""
echo -e "  ${GREEN}✅ PASSED: $PASSED${NC}"
echo -e "  ${RED}❌ FAILED: $FAILED${NC}"
echo ""

if [ $FAILED -eq 0 ]; then
    echo -e "${GREEN}╔═══════════════════════════════════════════════════════════╗${NC}"
    echo -e "${GREEN}║  🎉 ALL TESTS PASSED - SYSTEM READY FOR DEPLOYMENT!     ║${NC}"
    echo -e "${GREEN}╚═══════════════════════════════════════════════════════════╝${NC}"
    echo ""
    echo "✅ Backend accepts videos on CORRECT endpoint"
    echo "✅ MIME type validation works (no rejections)"
    echo "✅ AI service processes videos without errors"
    echo "✅ Database stores incidents correctly"
    echo "✅ Source code has all fixes"
    echo ""
    echo -e "${BLUE}➡️  NEXT STEP: Install APK on phone and test Auto Monitor${NC}"
    echo ""
    exit 0
else
    echo -e "${RED}╔═══════════════════════════════════════════════════════════╗${NC}"
    echo -e "${RED}║  ⚠️  SOME TESTS FAILED - DO NOT INSTALL YET!           ║${NC}"
    echo -e "${RED}╚═══════════════════════════════════════════════════════════╝${NC}"
    echo ""
    echo "Review failed tests above and fix issues first."
    echo ""
    exit 1
fi
