#!/bin/bash
# =============================================================================
# TrafficGuard - Service Status Checker
# =============================================================================

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m'

PROJECT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PID_DIR="$PROJECT_DIR/.pids"

echo -e "${CYAN}"
echo "╔═══════════════════════════════════════════════════════════════╗"
echo "║              TrafficGuard - Service Status                    ║"
echo "╚═══════════════════════════════════════════════════════════════╝"
echo -e "${NC}"

check_port() {
    local port=$1 service=$2 url=$3
    if nc -z localhost "$port" 2>/dev/null; then
        echo -e "  ${GREEN}✓${NC} $service : ${GREEN}RUNNING${NC} on port $port"
        [ -n "$url" ] && echo -e "    URL: $url"
        return 0
    else
        echo -e "  ${RED}✗${NC} $service : ${RED}NOT RUNNING${NC}"
        return 1
    fi
}

# Database
echo -e "\n${YELLOW}Database:${NC}"
if pg_isready -h localhost -q 2>/dev/null; then
    echo -e "  ${GREEN}✓${NC} PostgreSQL : ${GREEN}RUNNING${NC} (port 5432)"
else
    echo -e "  ${RED}✗${NC} PostgreSQL : ${RED}NOT RUNNING${NC}"
fi

# Services
echo -e "\n${YELLOW}Services:${NC}"
check_port 3000 "Backend Server" "http://localhost:3000"
check_port 8000 "AI Service" "http://localhost:8000"
check_port 5176 "Frontend Dashboard" "http://localhost:5176"

# Watchdog
echo -e "\n${YELLOW}Watchdog Guardian:${NC}"
WD_PID=""
[ -f "$PID_DIR/watchdog.pid" ] && WD_PID=$(cat "$PID_DIR/watchdog.pid" 2>/dev/null)
if [ -n "$WD_PID" ] && kill -0 "$WD_PID" 2>/dev/null; then
    echo -e "  ${GREEN}✓${NC} Watchdog : ${GREEN}ACTIVE${NC} (PID: $WD_PID, every 10s)"
else
    echo -e "  ${RED}✗${NC} Watchdog : ${RED}NOT RUNNING${NC} — services won't auto-restart!"
fi

# Health Checks
echo -e "\n${YELLOW}Health Checks:${NC}"
BACKEND_HEALTH=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/api/health 2>/dev/null)
if [ "$BACKEND_HEALTH" = "200" ]; then
    echo -e "  ${GREEN}✓${NC} Backend API: ${GREEN}HEALTHY${NC}"
else
    echo -e "  ${RED}✗${NC} Backend API: ${RED}NOT RESPONDING${NC}"
fi

AI_HEALTH=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:8000/health 2>/dev/null)
if [ "$AI_HEALTH" = "200" ]; then
    echo -e "  ${GREEN}✓${NC} AI Service: ${GREEN}HEALTHY${NC}"
else
    echo -e "  ${RED}✗${NC} AI Service: ${RED}NOT RESPONDING${NC}"
fi

# Recent watchdog activity
if [ -f "$PROJECT_DIR/watchdog.log" ]; then
    echo -e "\n${YELLOW}Last 5 Watchdog Events:${NC}"
    tail -5 "$PROJECT_DIR/watchdog.log" | while read -r line; do
        echo -e "  ${CYAN}$line${NC}"
    done
fi

echo -e "\n${CYAN}Commands:${NC}"
echo "  Start all:  ./start_local.sh"
echo "  Stop all:   ./stop_local.sh"
echo "  Watch logs: tail -f watchdog.log"
echo ""
