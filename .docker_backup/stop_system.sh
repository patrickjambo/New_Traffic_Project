#!/bin/bash

# TrafficGuard System Stop Script
# Stops ALL services cleanly

echo ""
echo "╔══════════════════════════════════════════════════════════════╗"
echo "║  🛑 STOPPING TRAFFICGUARD SYSTEM                             ║"
echo "╚══════════════════════════════════════════════════════════════╝"
echo ""

PROJECT_DIR="/home/jambo/New_Traffic_Project"

# Function to kill process on port
kill_port() {
    local port=$1
    local pids=$(lsof -t -i:$port 2>/dev/null || true)
    if [ -n "$pids" ]; then
        echo "   → Stopping process on port $port"
        echo "$pids" | xargs kill -9 2>/dev/null || true
    fi
}

# Stop Frontend
echo "🌐 Stopping Frontend..."
kill_port 5173
kill_port 5174
kill_port 5175
kill_port 5176
kill_port 3001
kill_port 3002
echo "   ✓ Frontend stopped"

# Stop Docker containers
echo ""
echo "🐳 Stopping Docker containers..."
cd "$PROJECT_DIR"
docker-compose down

echo ""
echo "╔══════════════════════════════════════════════════════════════╗"
echo "║  ✅ ALL SERVICES STOPPED                                     ║"
echo "║  Run ./start_system.sh to start again                        ║"
echo "╚══════════════════════════════════════════════════════════════╝"
echo ""
