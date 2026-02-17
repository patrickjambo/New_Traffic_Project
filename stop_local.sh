#!/bin/bash
# =============================================================================
# TrafficGuard - Stop All Local Services
# =============================================================================

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m'

PROJECT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PID_DIR="$PROJECT_DIR/.pids"

echo -e "${CYAN}"
echo "╔═══════════════════════════════════════════════════════════════╗"
echo "║          TrafficGuard - Stopping Local Services               ║"
echo "╚═══════════════════════════════════════════════════════════════╝"
echo -e "${NC}"

# Function to stop a service by PID file
stop_service() {
    local name=$1
    local pid_file="$PID_DIR/$2"
    
    if [ -f "$pid_file" ]; then
        local pid=$(cat "$pid_file")
        if kill -0 $pid 2>/dev/null; then
            echo -e "${YELLOW}Stopping $name (PID: $pid)...${NC}"
            kill $pid 2>/dev/null
            sleep 1
            # Force kill if still running
            if kill -0 $pid 2>/dev/null; then
                kill -9 $pid 2>/dev/null
            fi
            echo -e "${GREEN}✓ $name stopped${NC}"
        else
            echo -e "${YELLOW}$name already stopped${NC}"
        fi
        rm -f "$pid_file"
    else
        echo -e "${YELLOW}$name PID file not found${NC}"
    fi
}

# Function to kill process on a port
kill_port() {
    local port=$1
    local name=$2
    local pid=$(lsof -t -i:$port 2>/dev/null)
    if [ ! -z "$pid" ]; then
        echo -e "${YELLOW}Stopping $name on port $port (PID: $pid)...${NC}"
        kill -9 $pid 2>/dev/null
        echo -e "${GREEN}✓ $name stopped${NC}"
    fi
}

echo -e "\n${BLUE}Stopping services...${NC}\n"

# Stop services using PID files
stop_service "Frontend" "frontend.pid"
stop_service "AI Service" "ai_service.pid"
stop_service "Backend" "backend.pid"

# Also kill by port in case PID files are missing
echo -e "\n${YELLOW}Cleaning up any remaining processes...${NC}"
kill_port 5176 "Frontend"
kill_port 8000 "AI Service"
kill_port 3000 "Backend"

# Kill any remaining node/python processes from this project
pkill -f "government-dashboard" 2>/dev/null
pkill -f "uvicorn main_light" 2>/dev/null
pkill -f "backend/src/server.js" 2>/dev/null

echo -e "\n${GREEN}╔═══════════════════════════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║              All Services Stopped Successfully                ║${NC}"
echo -e "${GREEN}╚═══════════════════════════════════════════════════════════════╝${NC}"

echo -e "\n${YELLOW}Note: PostgreSQL is still running (system service)${NC}"
echo -e "${YELLOW}To stop PostgreSQL: sudo systemctl stop postgresql${NC}\n"
