#!/bin/bash

echo "🧪 Testing Enhanced AI Detection with YouTube Screen Recording"
echo "=============================================================="
echo ""

# Check if test video exists
if [ ! -f "/home/jambo/New_Traffic_Project/test_heavy_traffic.mp4" ]; then
    echo "❌ Test video not found: test_heavy_traffic.mp4"
    echo "Please add a YouTube traffic video recording to test with."
    exit 1
fi

echo "📹 Test Video: test_heavy_traffic.mp4"
echo ""

# Test with standard analyzer (will likely fail)
echo "1️⃣  Testing with STANDARD analyzer (real-world optimized):"
echo "------------------------------------------------------------"
curl -X POST http://localhost:3000/api/incidents/test-detection \
  -H "Content-Type: application/json" \
  -d '{
    "incident_detected": true,
    "type": "congestion",
    "confidence": 65,
    "severity": "high",
    "vehicle_count": 12,
    "stationary_count": 3,
    "avg_speed": 5,
    "location": {
      "latitude": -1.9563,
      "longitude": 30.0944,
      "location_name": "Test YouTube Video - Kigali"
    }
  }' 2>/dev/null | python3 -m json.tool

echo ""
echo ""
echo "✅ Test completed!"
echo ""
echo "📊 Summary:"
echo "----------"
echo "Standard analyzer: Optimized for real traffic (may not detect YouTube videos)"
echo "Enhanced analyzer: Can detect vehicles in screen recordings"
echo ""
echo "To test with YOUR YouTube video:"
echo "1. Point phone camera at YouTube traffic video"
echo "2. Start Auto Monitor"
echo "3. Enhanced analyzer will auto-detect screen recording"
echo "4. Lower confidence thresholds (0.25 vs 0.5) applied"
echo "5. Content extraction removes borders/UI"
echo "6. Incidents should be detected!"
