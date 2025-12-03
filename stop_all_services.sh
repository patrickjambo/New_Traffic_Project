#!/bin/bash

echo "🛑 Stopping TrafficGuard System..."
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

# Function to stop process by PID file
stop_process() {
    local name=$1
    local pidfile=$2
    
    if [ -f "$pidfile" ]; then
        local pid=$(cat "$pidfile")
        if ps -p $pid > /dev/null 2>&1; then
            echo -e "${YELLOW}Stopping $name (PID: $pid)...${NC}"
            kill $pid
            sleep 2
            if ps -p $pid > /dev/null 2>&1; then
                echo -e "${RED}Force killing $name...${NC}"
                kill -9 $pid
            fi
            echo -e "${GREEN}✓ $name stopped${NC}"
        else
            echo -e "${YELLOW}$name is not running${NC}"
        fi
        rm -f "$pidfile"
    else
        echo -e "${YELLOW}No PID file for $name${NC}"
    fi
}

cd /home/jambo/New_Traffic_Project

# Stop Frontend
stop_process "React Frontend" "frontend.pid"

# Stop AI Service
stop_process "AI Service" "ai_service.pid"

# Stop Backend
stop_process "Backend Server" "backend.pid"

# Stop Database
echo -e "${YELLOW}Stopping PostgreSQL database...${NC}"
docker-compose down
echo -e "${GREEN}✓ Database stopped${NC}"

# Clean up log files (optional)
read -p "Delete log files? (y/N): " delete_logs
if [ "$delete_logs" = "y" ] || [ "$delete_logs" = "Y" ]; then
    rm -f backend.log ai_service.log frontend.log
    echo -e "${GREEN}✓ Log files deleted${NC}"
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo -e "${GREEN}✅ All services stopped${NC}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
