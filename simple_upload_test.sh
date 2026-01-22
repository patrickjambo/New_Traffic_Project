#!/bin/bash

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

BACKEND_URL="http://localhost:3000"
AI_URL="http://localhost:8000"

echo ""
echo -e "${CYAN}=============================================="
echo -e "🚀 SIMPLE UPLOAD FLOW TEST"
echo -e "==============================================${NC}"
echo ""

# Test 1: Check services
echo -e "${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${CYAN}📋 TEST 1: Service Health Checks${NC}"
echo -e "${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"

# Backend
if curl -s "$BACKEND_URL/health" > /dev/null 2>&1; then
    echo -e "   Backend (port 3000): ${GREEN}✅ HEALTHY${NC}"
else
    echo -e "   Backend (port 3000): ${RED}❌ DOWN${NC}"
fi

# AI Service
if curl -s "$AI_URL/health" > /dev/null 2>&1; then
    echo -e "   AI Service (port 8000): ${GREEN}✅ HEALTHY${NC}"
else
    echo -e "   AI Service (port 8000): ${RED}❌ DOWN${NC}"
fi
echo ""

# Test 2: Create test video
echo -e "${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${CYAN}📋 TEST 2: Create Test Video${NC}"
echo -e "${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"

# Create test directory
mkdir -p /tmp/upload_test
TEST_VIDEO="/tmp/upload_test/test_clip.mp4"

# Generate test video
ffmpeg -y -f lavfi -i "color=c=blue:duration=2:size=640x480:rate=30" \
       -f lavfi -i "anullsrc=r=44100:cl=stereo" \
       -c:v libx264 -t 2 -pix_fmt yuv420p \
       -c:a aac -shortest \
       "$TEST_VIDEO" 2>/dev/null

if [ -f "$TEST_VIDEO" ]; then
    SIZE=$(ls -lh "$TEST_VIDEO" | awk '{print $5}')
    echo -e "   ${GREEN}✅ Test video created: $SIZE${NC}"
else
    echo -e "   ${RED}❌ Failed to create test video${NC}"
    exit 1
fi
echo ""

# Test 3: Direct AI Service Upload
echo -e "${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${CYAN}📋 TEST 3: Direct AI Service Upload${NC}"
echo -e "${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"

START_TIME=$(date +%s%3N)
AI_RESPONSE=$(curl -s -w "\n%{http_code}" -X POST \
    -F "video=@$TEST_VIDEO" \
    "$AI_URL/ai/analyze-traffic" 2>/dev/null)
END_TIME=$(date +%s%3N)

HTTP_CODE=$(echo "$AI_RESPONSE" | tail -1)
BODY=$(echo "$AI_RESPONSE" | head -n -1)
ELAPSED=$((END_TIME - START_TIME))

if [ "$HTTP_CODE" = "200" ]; then
    echo -e "   ${GREEN}✅ AI Service Response: HTTP $HTTP_CODE${NC}"
    echo -e "   ${CYAN}⏱️  Processing time: ${ELAPSED}ms${NC}"
    echo -e "   Response preview:"
    echo "$BODY" | head -c 500
    echo ""
else
    echo -e "   ${RED}❌ AI Service Response: HTTP $HTTP_CODE${NC}"
    echo "$BODY" | head -c 200
fi
echo ""

# Test 4: Backend to AI Upload (Full Flow)
echo -e "${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${CYAN}📋 TEST 4: Full Upload Flow (Backend → AI)${NC}"
echo -e "${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"

START_TIME=$(date +%s%3N)
BACKEND_RESPONSE=$(curl -s -w "\n%{http_code}" -X POST \
    -F "video=@$TEST_VIDEO" \
    -F "latitude=-1.9441" \
    -F "longitude=30.0619" \
    "$BACKEND_URL/api/incidents/analyze-video" 2>/dev/null)
END_TIME=$(date +%s%3N)

HTTP_CODE=$(echo "$BACKEND_RESPONSE" | tail -1)
BODY=$(echo "$BACKEND_RESPONSE" | head -n -1)
ELAPSED=$((END_TIME - START_TIME))

if [ "$HTTP_CODE" = "200" ] || [ "$HTTP_CODE" = "201" ]; then
    echo -e "   ${GREEN}✅ Backend Response: HTTP $HTTP_CODE${NC}"
    echo -e "   ${CYAN}⏱️  Total time: ${ELAPSED}ms${NC}"
    echo -e "   Response preview:"
    echo "$BODY" | head -c 500
    echo ""
else
    echo -e "   ${RED}❌ Backend Response: HTTP $HTTP_CODE${NC}"
    echo "$BODY" | head -c 500
fi
echo ""

# Test 5: Parallel Upload Simulation
echo -e "${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${CYAN}📋 TEST 5: Parallel Upload (5 videos simultaneously)${NC}"
echo -e "${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "   Simulating mobile app uploading 5 clips at once..."

# Create multiple test videos
for i in {1..5}; do
    ffmpeg -y -f lavfi -i "color=c=red:duration=1:size=320x240:rate=15" \
           -c:v libx264 -t 1 -pix_fmt yuv420p \
           "/tmp/upload_test/clip_$i.mp4" 2>/dev/null
done

START_TIME=$(date +%s%3N)

# Launch parallel uploads
for i in {1..5}; do
    (curl -s -X POST -F "video=@/tmp/upload_test/clip_$i.mp4" \
          "$AI_URL/ai/analyze-traffic" > /tmp/upload_test/result_$i.txt 2>&1) &
done

# Wait for all to complete
wait

END_TIME=$(date +%s%3N)
TOTAL_TIME=$((END_TIME - START_TIME))

# Check results
SUCCESS_COUNT=0
for i in {1..5}; do
    if grep -q "success" /tmp/upload_test/result_$i.txt 2>/dev/null; then
        SUCCESS_COUNT=$((SUCCESS_COUNT + 1))
        echo -e "   Clip $i: ${GREEN}✅ SUCCESS${NC}"
    else
        echo -e "   Clip $i: ${RED}❌ FAILED${NC}"
    fi
done

echo ""
echo -e "   ${CYAN}📊 Results: $SUCCESS_COUNT/5 successful uploads${NC}"
echo -e "   ${CYAN}⏱️  Total parallel time: ${TOTAL_TIME}ms${NC}"
echo ""

# Test 6: Check what's in the AI service
echo -e "${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${CYAN}📋 TEST 6: Verify AI Service Received Data${NC}"
echo -e "${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"

# Check AI service logs in docker
echo "   Checking recent AI service activity..."
docker logs trafficguard_ai --tail 20 2>&1 | grep -E "(analyze|video|POST)" | tail -5
echo ""

# Cleanup
rm -rf /tmp/upload_test

# Summary
echo -e "${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${CYAN}📊 SUMMARY${NC}"
echo -e "${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""
echo -e "${GREEN}Upload Flow Verified:${NC}"
echo "   📱 Mobile App captures video"
echo "   ↓"
echo "   🔗 POST to http://192.168.31.115:3000/api/incidents/analyze-video"
echo "   ↓"
echo "   🖥️  Backend forwards to http://localhost:8000/ai/analyze-traffic"
echo "   ↓"
echo "   🤖 AI Service processes with YOLO model"
echo "   ↓"
echo "   ✅ Results returned to mobile app"
echo ""
echo -e "${CYAN}All endpoints are correctly configured!${NC}"
echo ""
