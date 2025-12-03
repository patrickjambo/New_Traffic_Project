#!/bin/bash
# Test video upload flow

echo "🧪 Testing Video Upload & Analysis Flow"
echo "========================================"

# 1. Check services running
echo ""
echo "1️⃣ Checking services..."
curl -s http://192.168.34.237:3000/health | head -1
curl -s http://192.168.34.237:8000/health | head -1

# 2. Test AI service directly with a sample video
echo ""
echo "2️⃣ Testing AI service directly..."
# You need a test video file for this
# curl -X POST http://192.168.34.237:8000/ai/analyze-traffic \
#   -F "video=@test_video.mp4"

# 3. Monitor backend logs for uploads
echo ""
echo "3️⃣ Monitoring backend for uploads (Ctrl+C to stop)..."
echo "Expected to see:"
echo "  ✅ 📹 Received video: ... KB"
echo "  ✅ 🤖 AI Analysis Results: ..."
echo "  ✅ Video accepted: ..."
echo ""
tail -f /home/jambo/New_Traffic_Project/backend.log | grep --line-buffered -E "Received video|Video accepted|Analysis Results|incident_detected"
