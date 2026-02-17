#!/bin/bash
# =============================================================================
# TrafficGuard - Service Status Checker
# =============================================================================

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m'

echo -e "${CYAN}"
echo "╔═══════════════════════════════════════════════════════════════╗"
echo "║              TrafficGuard - Service Status                    ║"
echo "╚═══════════════════════════════════════════════════════════════╝"
echo -e "${NC}"

# Function to check port
check_port() {
    local port=$1
    local service=$2
    local url=$3
    
    if nc -z localhost $port 2>/dev/null; then
        echo -e "  ${GREEN}✓${NC} $service : ${GREEN}RUNNING${NC} on port $port"
        if [ ! -z "$url" ]; then
            echo -e "    URL: $url"
        fi
        return 0
    else
        echo -e "  ${RED}✗${NC} $service : ${RED}NOT RUNNING${NC}"
        return 1
    fi
}

# Check PostgreSQL
echo -e "\n${YELLOW}Database:${NC}"
if systemctl is-active --quiet postgresql 2>/dev/null || pgrep -x "postgres" > /dev/null; then
    echo -e "  ${GREEN}✓${NC} PostgreSQL : ${GREEN}RUNNING${NC}"
else
    echo -e "  ${RED}✗${NC} PostgreSQL : ${RED}NOT RUNNING${NC}"
fi

# Check services
echo -e "\n${YELLOW}Services:${NC}"
check_port 3000 "Backend Server" "http://localhost:3000"
check_port 8000 "AI Service" "http://localhost:8000"
check_port 5176 "Frontend Dashboard" "http://localhost:5176"

# Check API health
echo -e "\n${YELLOW}Health Checks:${NC}"

# Backend health
BACKEND_HEALTH=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/api/health 2>/dev/null)
if [ "$BACKEND_HEALTH" = "200" ]; then
    echo -e "  ${GREEN}✓${NC} Backend API: ${GREEN}HEALTHY${NC}"
else
    echo -e "  ${RED}✗${NC} Backend API: ${RED}NOT RESPONDING${NC}"
fi

# AI Service health
AI_HEALTH=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:8000/health 2>/dev/null)
if [ "$AI_HEALTH" = "200" ]; then
    echo -e "  ${GREEN}✓${NC} AI Service: ${GREEN}HEALTHY${NC}"
else
    echo -e "  ${RED}✗${NC} AI Service: ${RED}NOT RESPONDING${NC}"
fi

echo -e "\n${CYAN}Commands:${NC}"
echo "  Start all:  ./start_local.sh"
echo "  Stop all:   ./stop_local.sh"
echo ""
