#!/bin/bash
echo "============================================"
echo "🧪 Testing Video Upload Flow"
echo "============================================"

# Create a small test video file (1 second)
echo "📹 Creating test video..."
ffmpeg -f lavfi -i testsrc=duration=1:size=320x240:rate=10 -f lavfi -i sine=frequency=1000:duration=1 -c:v libx264 -c:a aac -y /tmp/test_clip.mp4 2>/dev/null

if [ ! -f /tmp/test_clip.mp4 ]; then
    echo "❌ Failed to create test video"
    exit 1
fi

echo "✅ Test video created: $(ls -lh /tmp/test_clip.mp4 | awk '{print $5}')"

# Test 1: Backend health
echo ""
echo "🔍 Test 1: Backend Health Check..."
BACKEND_HEALTH=$(curl -s http://localhost:3000/health 2>/dev/null)
if [[ "$BACKEND_HEALTH" == *"ok"* ]]; then
    echo "✅ Backend is healthy"
else
    echo "❌ Backend health check failed"
fi

# Test 2: AI Service health
echo ""
echo "🔍 Test 2: AI Service Health Check..."
AI_HEALTH=$(curl -s http://localhost:8000/health 2>/dev/null)
if [[ "$AI_HEALTH" == *"healthy"* ]]; then
    echo "✅ AI Service is healthy"
else
    echo "❌ AI Service health check failed"
fi

# Test 3: Upload video to backend
echo ""
echo "🔍 Test 3: Upload Video to Backend..."
UPLOAD_RESULT=$(curl -s -X POST http://localhost:3000/api/incidents/analyze-video \
    -F "video=@/tmp/test_clip.mp4" \
    -F "latitude=-1.9441" \
    -F "longitude=30.0619" 2>/dev/null)

echo "Response: $UPLOAD_RESULT" | head -c 500

if [[ "$UPLOAD_RESULT" == *"success"* ]]; then
    echo ""
    echo "✅ Video upload to backend SUCCESSFUL"
else
    echo ""
    echo "⚠️ Video upload response (may still be processing)"
fi

# Test 4: Direct AI service upload
echo ""
echo "🔍 Test 4: Direct Upload to AI Service..."
AI_RESULT=$(curl -s -X POST http://localhost:8000/analyze \
    -F "file=@/tmp/test_clip.mp4" 2>/dev/null)

echo "AI Response: $AI_RESULT" | head -c 500

if [[ "$AI_RESULT" == *"success"* ]]; then
    echo ""
    echo "✅ Direct AI upload SUCCESSFUL"
else
    echo ""
    echo "⚠️ AI service response"
fi

# Cleanup
rm -f /tmp/test_clip.mp4

echo ""
echo "============================================"
echo "📊 Summary of Upload Flow URLs:"
echo "============================================"
echo "Mobile App → Backend: http://192.168.31.115:3000/api/incidents/analyze-video"
echo "Backend → AI Service: http://localhost:8000/analyze"
echo ""
echo "🔗 Full flow: Mobile → Backend (port 3000) → AI (port 8000) → Database"
echo "============================================"
