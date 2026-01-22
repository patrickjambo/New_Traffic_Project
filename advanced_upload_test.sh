#!/bin/bash

echo "=============================================="
echo "🚀 ADVANCED UPLOAD FLOW TEST"
echo "=============================================="
echo "Testing: Mobile App → Backend → AI Service"
echo "=============================================="

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
BACKEND_URL="http://localhost:3000"
AI_SERVICE_URL="http://localhost:8000"
MOBILE_BACKEND_URL="http://192.168.31.115:3000"

echo ""
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}📋 TEST 1: Service Health Checks${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"

# Test Backend Health
echo -n "   Backend (port 3000): "
BACKEND_HEALTH=$(curl -s -w "%{http_code}" -o /tmp/backend_health.json "$BACKEND_URL/health" 2>/dev/null)
if [ "$BACKEND_HEALTH" == "200" ]; then
    echo -e "${GREEN}✅ HEALTHY${NC}"
else
    echo -e "${RED}❌ FAILED (HTTP $BACKEND_HEALTH)${NC}"
fi

# Test AI Service Health
echo -n "   AI Service (port 8000): "
AI_HEALTH=$(curl -s -w "%{http_code}" -o /tmp/ai_health.json "$AI_SERVICE_URL/health" 2>/dev/null)
if [ "$AI_HEALTH" == "200" ]; then
    echo -e "${GREEN}✅ HEALTHY${NC}"
    cat /tmp/ai_health.json | python3 -c "import sys,json; d=json.load(sys.stdin); print(f'      Model loaded: {d.get(\"model_loaded\", False)}')"
else
    echo -e "${RED}❌ FAILED (HTTP $AI_HEALTH)${NC}"
fi

# Test Database Connection via Backend
echo -n "   Database (via Backend): "
DB_TEST=$(curl -s "$BACKEND_URL/api/incidents/statistics" 2>/dev/null)
if [[ "$DB_TEST" == *"success"* ]]; then
    echo -e "${GREEN}✅ CONNECTED${NC}"
else
    echo -e "${RED}❌ FAILED${NC}"
fi

echo ""
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}📋 TEST 2: URL Endpoint Verification${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"

# Check Backend analyze-video endpoint exists
echo -n "   Backend /api/incidents/analyze-video: "
ENDPOINT_CHECK=$(curl -s -X POST "$BACKEND_URL/api/incidents/analyze-video" 2>/dev/null)
if [[ "$ENDPOINT_CHECK" == *"No video file"* ]] || [[ "$ENDPOINT_CHECK" == *"video"* ]]; then
    echo -e "${GREEN}✅ ENDPOINT EXISTS${NC}"
else
    echo -e "${RED}❌ ENDPOINT NOT FOUND${NC}"
    echo "   Response: $ENDPOINT_CHECK"
fi

# Check AI Service analyze endpoint exists
echo -n "   AI Service /ai/analyze-traffic: "
AI_ENDPOINT_CHECK=$(curl -s -X POST "$AI_SERVICE_URL/ai/analyze-traffic" 2>/dev/null)
if [[ "$AI_ENDPOINT_CHECK" == *"detail"* ]] || [[ "$AI_ENDPOINT_CHECK" == *"field required"* ]]; then
    echo -e "${GREEN}✅ ENDPOINT EXISTS${NC}"
else
    echo -e "${RED}❌ ENDPOINT NOT FOUND${NC}"
    echo "   Response: $AI_ENDPOINT_CHECK"
fi

echo ""
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}📋 TEST 3: Create Test Video Clips${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"

# Create test videos directory
mkdir -p /tmp/test_clips

# Create multiple test videos (simulating mobile capture)
echo "   Creating 5 test video clips (simulating mobile capture)..."
for i in {1..5}; do
    ffmpeg -f lavfi -i testsrc=duration=2:size=640x480:rate=15 \
           -c:v libx264 -preset ultrafast -y \
           /tmp/test_clips/clip_$i.mp4 2>/dev/null
    SIZE=$(ls -lh /tmp/test_clips/clip_$i.mp4 | awk '{print $5}')
    echo "      Clip $i created: $SIZE"
done

echo ""
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}📋 TEST 4: Sequential Upload Test (Simulating Old Behavior)${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"

echo "   Uploading 3 clips sequentially..."
TOTAL_SEQ_TIME=0

for i in {1..3}; do
    START_TIME=$(date +%s.%N)
    
    RESPONSE=$(curl -s -X POST "$BACKEND_URL/api/incidents/analyze-video" \
        -F "video=@/tmp/test_clips/clip_$i.mp4" \
        -F "latitude=-1.9441" \
        -F "longitude=30.0619" 2>/dev/null)
    
    END_TIME=$(date +%s.%N)
    ELAPSED=$(echo "$END_TIME - $START_TIME" | bc)
    TOTAL_SEQ_TIME=$(echo "$TOTAL_SEQ_TIME + $ELAPSED" | bc)
    
    if [[ "$RESPONSE" == *"success\":true"* ]]; then
        echo -e "      Clip $i: ${GREEN}✅ SUCCESS${NC} (${ELAPSED}s)"
    elif [[ "$RESPONSE" == *"success\":false"* ]]; then
        # Check if it was analyzed but no incident
        if [[ "$RESPONSE" == *"analyzed"* ]] || [[ "$RESPONSE" == *"No incident"* ]]; then
            echo -e "      Clip $i: ${GREEN}✅ ANALYZED${NC} (${ELAPSED}s) - No incident detected"
        else
            echo -e "      Clip $i: ${YELLOW}⚠️ PROCESSED${NC} (${ELAPSED}s)"
        fi
    else
        echo -e "      Clip $i: ${RED}❌ FAILED${NC} (${ELAPSED}s)"
        echo "      Response: ${RESPONSE:0:100}..."
    fi
done

echo "   Total sequential time: ${TOTAL_SEQ_TIME}s"

echo ""
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}📋 TEST 5: Parallel Upload Test (Simulating New Fast Behavior)${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"

echo "   Uploading 3 clips in parallel..."
START_PARALLEL=$(date +%s.%N)

# Upload in parallel using background processes
for i in {1..3}; do
    (
        RESPONSE=$(curl -s -X POST "$BACKEND_URL/api/incidents/analyze-video" \
            -F "video=@/tmp/test_clips/clip_$i.mp4" \
            -F "latitude=-1.9441" \
            -F "longitude=30.0619" 2>/dev/null)
        
        if [[ "$RESPONSE" == *"success"* ]]; then
            echo "      Clip $i: ✅ DONE"
        else
            echo "      Clip $i: ⚠️ RESPONSE: ${RESPONSE:0:50}"
        fi
    ) &
done

# Wait for all background processes
wait

END_PARALLEL=$(date +%s.%N)
PARALLEL_TIME=$(echo "$END_PARALLEL - $START_PARALLEL" | bc)
echo "   Total parallel time: ${PARALLEL_TIME}s"

# Calculate speedup
if (( $(echo "$TOTAL_SEQ_TIME > 0" | bc -l) )); then
    SPEEDUP=$(echo "scale=2; $TOTAL_SEQ_TIME / $PARALLEL_TIME" | bc)
    echo -e "   ${GREEN}⚡ Speedup: ${SPEEDUP}x faster with parallel uploads${NC}"
fi

echo ""
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}📋 TEST 6: Direct AI Service Upload Test${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"

echo "   Testing direct upload to AI service..."
START_AI=$(date +%s.%N)

AI_RESPONSE=$(curl -s -X POST "$AI_SERVICE_URL/ai/analyze-traffic" \
    -F "video=@/tmp/test_clips/clip_1.mp4" \
    -F "test_mode=true" 2>/dev/null)

END_AI=$(date +%s.%N)
AI_TIME=$(echo "$END_AI - $START_AI" | bc)

echo "   AI Service response time: ${AI_TIME}s"

if [[ "$AI_RESPONSE" == *"success\":true"* ]]; then
    echo -e "   ${GREEN}✅ AI ANALYSIS SUCCESSFUL${NC}"
    # Parse and display AI results
    echo "$AI_RESPONSE" | python3 -c "
import sys, json
try:
    d = json.load(sys.stdin)
    data = d.get('data', {})
    print(f'      • Incident Detected: {data.get(\"incident_detected\", False)}')
    print(f'      • Vehicle Count: {data.get(\"vehicle_count\", 0)}')
    print(f'      • Confidence: {data.get(\"confidence\", 0)}')
    print(f'      • Frames Analyzed: {data.get(\"frames_analyzed\", 0)}')
    print(f'      • Analysis Time: {data.get(\"analysis_time\", 0)}s')
except Exception as e:
    print(f'      Error parsing response: {e}')
"
else
    echo -e "   ${RED}❌ AI ANALYSIS FAILED${NC}"
    echo "   Response: ${AI_RESPONSE:0:200}"
fi

echo ""
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}📋 TEST 7: Mobile App URL Simulation${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"

echo "   Mobile app will use these URLs:"
echo "      • Backend API: $MOBILE_BACKEND_URL"
echo "      • Upload endpoint: $MOBILE_BACKEND_URL/api/incidents/analyze-video"
echo ""
echo "   Testing connectivity from mobile perspective..."

# Test if backend is accessible on the network IP
MOBILE_TEST=$(curl -s -w "%{http_code}" -o /dev/null "$MOBILE_BACKEND_URL/health" --connect-timeout 5 2>/dev/null)
if [ "$MOBILE_TEST" == "200" ]; then
    echo -e "   ${GREEN}✅ Backend accessible on network IP${NC}"
else
    echo -e "   ${YELLOW}⚠️ Backend may not be accessible on $MOBILE_BACKEND_URL${NC}"
    echo "      Make sure your mobile device is on the same network"
fi

echo ""
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}📋 TEST 8: Backend Logs Check${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"

echo "   Recent backend logs (last 10 lines):"
docker logs trafficguard_backend --tail 10 2>&1 | head -15

echo ""
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}📋 TEST 9: AI Service Logs Check${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"

echo "   Recent AI service logs (last 10 lines):"
docker logs trafficguard_ai --tail 10 2>&1 | head -15

# Cleanup
rm -rf /tmp/test_clips

echo ""
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${GREEN}📊 TEST SUMMARY${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""
echo "   Upload Flow:"
echo "   ┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐"
echo "   │   Mobile App    │ ──► │    Backend      │ ──► │   AI Service    │"
echo "   │  (Flutter)      │     │   (Node.js)     │     │   (Python)      │"
echo "   │                 │     │   Port 3000     │     │   Port 8000     │"
echo "   └─────────────────┘     └─────────────────┘     └─────────────────┘"
echo ""
echo "   URLs Used:"
echo "   • Mobile → Backend: http://192.168.31.115:3000/api/incidents/analyze-video"
echo "   • Backend → AI:     http://localhost:8000/ai/analyze-traffic"
echo ""
echo "=============================================="
echo "🎉 ADVANCED TESTING COMPLETE"
echo "=============================================="
