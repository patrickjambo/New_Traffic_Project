#!/bin/bash

echo "🧪 Testing Automatic Emergency System with Simulation Mode"
echo "==========================================================="
echo ""
echo "This tests the complete automatic emergency flow without needing AI"
echo ""

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Test counter
TESTS_PASSED=0
TESTS_FAILED=0

# Function to run test
run_test() {
    local test_name="$1"
    local test_data="$2"
    local expected_emergency="$3"
    
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo "Test: $test_name"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    
    RESULT=$(curl -s -X POST http://localhost:3000/api/incidents/test-detection \
      -H "Content-Type: application/json" \
      -d "$test_data")
    
    echo "$RESULT" | python3 -m json.tool
    
    # Check if emergency was created
    EMERGENCY_CREATED=$(echo "$RESULT" | grep -o '"emergency_created":true' || echo "")
    
    if [ "$expected_emergency" = "yes" ]; then
        if [ ! -z "$EMERGENCY_CREATED" ]; then
            echo -e "${GREEN}✅ PASS: Emergency created as expected${NC}"
            TESTS_PASSED=$((TESTS_PASSED + 1))
        else
            echo -e "${RED}❌ FAIL: Emergency should have been created but wasn't${NC}"
            TESTS_FAILED=$((TESTS_FAILED + 1))
        fi
    else
        if [ -z "$EMERGENCY_CREATED" ]; then
            echo -e "${GREEN}✅ PASS: No emergency created (as expected for medium severity)${NC}"
            TESTS_PASSED=$((TESTS_PASSED + 1))
        else
            echo -e "${RED}❌ FAIL: Emergency created but shouldn't have been${NC}"
            TESTS_FAILED=$((TESTS_FAILED + 1))
        fi
    fi
    
    echo ""
    sleep 1
}

# Test 1: Critical Accident (should create emergency)
run_test "Critical Accident - KN 5 Rd" \
'{
  "incident_detected": true,
  "type": "accident",
  "confidence": 92,
  "severity": "critical",
  "vehicle_count": 15,
  "stationary_count": 10,
  "avg_speed": 1,
  "location": {
    "latitude": -1.9506,
    "longitude": 30.0588,
    "location_name": "KN 5 Rd near Kigali Convention Centre, Kigali"
  }
}' "yes"

# Test 2: High Severity Road Blockage (should create emergency)
run_test "High Severity Road Blockage - KN 3 Ave" \
'{
  "incident_detected": true,
  "type": "road_blockage",
  "confidence": 88,
  "severity": "high",
  "vehicle_count": 18,
  "stationary_count": 15,
  "avg_speed": 0,
  "location": {
    "latitude": -1.9441,
    "longitude": 30.0619,
    "location_name": "KN 3 Ave near Kigali City Tower, Kigali"
  }
}' "yes"

# Test 3: Medium Congestion (should NOT create emergency)
run_test "Medium Congestion - KG 9 Ave" \
'{
  "incident_detected": true,
  "type": "congestion",
  "confidence": 65,
  "severity": "medium",
  "vehicle_count": 12,
  "stationary_count": 3,
  "avg_speed": 7,
  "location": {
    "latitude": -1.9563,
    "longitude": 30.0944,
    "location_name": "KG 9 Ave, Kacyiru, Kigali"
  }
}' "no"

# Test 4: Critical Congestion (should create emergency)
run_test "Critical Heavy Congestion - KN 1 Road" \
'{
  "incident_detected": true,
  "type": "congestion",
  "confidence": 95,
  "severity": "critical",
  "vehicle_count": 25,
  "stationary_count": 8,
  "avg_speed": 3,
  "location": {
    "latitude": -1.9500,
    "longitude": 30.0600,
    "location_name": "KN 1 Road, Downtown Kigali"
  }
}' "yes"

# Summary
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "TEST SUMMARY"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
TOTAL_TESTS=$((TESTS_PASSED + TESTS_FAILED))
echo "Total Tests: $TOTAL_TESTS"
echo -e "${GREEN}Passed: $TESTS_PASSED${NC}"
echo -e "${RED}Failed: $TESTS_FAILED${NC}"
echo ""

if [ $TESTS_FAILED -eq 0 ]; then
    echo -e "${GREEN}✅ ALL TESTS PASSED!${NC}"
    echo ""
    echo "🎉 Automatic Emergency System is FULLY OPERATIONAL!"
else
    echo -e "${RED}❌ SOME TESTS FAILED${NC}"
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "VERIFY RESULTS IN DATABASE"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "Check latest emergencies:"
echo "docker exec trafficguard_db psql -U trafficguard_user -d trafficguard \\"
echo "  -c \"SELECT id, emergency_type, severity, location_name, contact_name, incident_id FROM emergencies ORDER BY created_at DESC LIMIT 5;\""
echo ""
echo "Check automatic emergencies only (user_id IS NULL):"
echo "docker exec trafficguard_db psql -U trafficguard_user -d trafficguard \\"
echo "  -c \"SELECT COUNT(*) as automatic_emergencies FROM emergencies WHERE user_id IS NULL;\""
