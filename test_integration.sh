#!/bin/bash

# TrafficGuard AI - Full Stack Integration Test
# Tests backend, frontend, and API connectivity

echo "🧪 TrafficGuard AI - Integration Tests"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

BASE_URL="http://localhost:3000"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Test counter
PASSED=0
FAILED=0

# Function to test endpoint
test_endpoint() {
    local name=$1
    local url=$2
    local expected_code=$3
    
    echo -n "Testing $name... "
    
    response=$(curl -s -o /dev/null -w "%{http_code}" "$url")
    
    if [ "$response" -eq "$expected_code" ]; then
        echo -e "${GREEN}✓ PASSED${NC} (HTTP $response)"
        ((PASSED++))
    else
        echo -e "${RED}✗ FAILED${NC} (Expected $expected_code, got $response)"
        ((FAILED++))
    fi
}

echo ""
echo "📡 Testing Backend Endpoints..."
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# Health check
test_endpoint "Health Check" "$BASE_URL/health" 200

# API info
test_endpoint "API Info" "$BASE_URL/api" 200

# Frontend pages
test_endpoint "Home Page" "$BASE_URL/" 200
test_endpoint "Police Dashboard" "$BASE_URL/police-dashboard.html" 200
test_endpoint "Admin Dashboard" "$BASE_URL/admin-dashboard.html" 200

# Static assets
test_endpoint "Main CSS" "$BASE_URL/css/main.css" 200
test_endpoint "Map CSS" "$BASE_URL/css/maps.css" 200
test_endpoint "App JS" "$BASE_URL/js/app.js" 200

# API endpoints (public)
test_endpoint "Get Incidents" "$BASE_URL/api/incidents?latitude=-1.9441&longitude=30.0619&radius=10" 200

echo ""
echo "📊 Test Summary"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo -e "${GREEN}Passed:${NC} $PASSED"
echo -e "${RED}Failed:${NC} $FAILED"
echo ""

if [ $FAILED -eq 0 ]; then
    echo -e "${GREEN}✓ All tests passed!${NC}"
    exit 0
else
    echo -e "${RED}✗ Some tests failed${NC}"
    exit 1
fi
