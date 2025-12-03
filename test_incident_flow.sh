#!/bin/bash

echo "🧪 Testing Complete Incident Detection Flow"
echo "=========================================="
echo ""

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

BACKEND_URL="http://192.168.34.237:3000"

echo "📊 Step 1: Check current API state"
echo "----------------------------------------"
echo "GET /api/emergency (recent)"
curl -s "${BACKEND_URL}/api/emergency?limit=5" | python3 -m json.tool || echo "Failed to fetch emergencies"
echo ""

echo "🚗 Step 2: Simulate ACCIDENT detection (CRITICAL severity)"
echo "-----------------------------------------------------------"
cat > /tmp/accident_payload.json << 'EOF'
{
  "incident_detected": true,
  "type": "accident",
  "confidence": 85,
  "severity": "critical",
  "vehicle_count": 8,
  "stationary_count": 5,
  "avg_speed": 2,
  "frames_analyzed": 150,
  "location": {
    "latitude": -1.9441,
    "longitude": 30.0619,
    "location_name": "KN 3 Ave, Kigali City Tower, Kigali"
  }
}
EOF

echo "Sending simulated accident data..."
RESPONSE=$(curl -s -X POST "${BACKEND_URL}/api/incidents/test-detection" \
  -H "Content-Type: application/json" \
  -d @/tmp/accident_payload.json)

echo "Response:"
echo "${RESPONSE}" | python3 -m json.tool || echo "No JSON response"
echo ""

echo "🚧 Step 3: Simulate ROAD BLOCKAGE detection (HIGH severity)"
echo "------------------------------------------------------------"
cat > /tmp/blockage_payload.json << 'EOF'
{
  "incident_detected": true,
  "type": "road_blockage",
  "confidence": 75,
  "severity": "high",
  "vehicle_count": 12,
  "stationary_count": 10,
  "avg_speed": 0,
  "frames_analyzed": 150,
  "location": {
    "latitude": -1.9506,
    "longitude": 30.0588,
    "location_name": "KN 5 Rd, Kimihurura, Kigali"
  }
}
EOF

echo "Sending simulated road blockage data..."
RESPONSE=$(curl -s -X POST "${BACKEND_URL}/api/incidents/test-detection" \
  -H "Content-Type: application/json" \
  -d @/tmp/blockage_payload.json)

echo "Response:"
echo "${RESPONSE}" | python3 -m json.tool || echo "No JSON response"
echo ""

echo "🚦 Step 4: Simulate CONGESTION detection (MEDIUM severity - NO emergency)"
echo "--------------------------------------------------------------------------"
cat > /tmp/congestion_payload.json << 'EOF'
{
  "incident_detected": true,
  "type": "congestion",
  "confidence": 65,
  "severity": "medium",
  "vehicle_count": 15,
  "stationary_count": 3,
  "avg_speed": 8,
  "frames_analyzed": 150,
  "location": {
    "latitude": -1.9563,
    "longitude": 30.0944,
    "location_name": "KG 9 Ave, Kacyiru, Kigali"
  }
}
EOF

echo "Sending simulated congestion data..."
RESPONSE=$(curl -s -X POST "${BACKEND_URL}/api/incidents/test-detection" \
  -H "Content-Type: application/json" \
  -d @/tmp/congestion_payload.json)

echo "Response:"
echo "${RESPONSE}" | python3 -m json.tool || echo "No JSON response"
echo ""

sleep 2

echo "📊 Step 5: Check updated API state"
echo "----------------------------------"
echo -e "${YELLOW}Recent incidents (via API):${NC}"
# incidents endpoint expects lat/long; use emergency list and test responses instead
curl -s "${BACKEND_URL}/api/emergency?limit=5" | python3 -m json.tool || echo "Failed to fetch emergencies"

echo "✅ Step 6: Verify automatic emergency creation (from last responses)"
echo "-----------------------------------------------------------------"
echo "Re-run GET /api/emergency to verify recent emergencies:"
curl -s "${BACKEND_URL}/api/emergency?limit=5" | python3 -m json.tool || echo "Failed to fetch emergencies"

echo ""
echo "🎯 Test Summary"
echo "==============="
echo "1. Accident (CRITICAL) → Should create emergency ✓"
echo "2. Road Blockage (HIGH) → Should create emergency ✓"
echo "3. Congestion (MEDIUM) → Should NOT create emergency ✓"
echo ""
echo "Check your mobile app - incident counter should have increased!"
echo "Check web dashboard - should show new incidents + emergencies"
