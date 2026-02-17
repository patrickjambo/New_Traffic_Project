#!/bin/bash

# TrafficGuard System Startup Script
# Updated: January 28, 2026
# Starts ALL services: Database, Backend, AI, Frontend

set -e  # Exit on error

PROJECT_DIR="/home/jambo/New_Traffic_Project"
FRONTEND_PORT=5176

echo ""
echo "╔══════════════════════════════════════════════════════════════╗"
echo "║  🚦 TRAFFICGUARD SYSTEM STARTUP                              ║"
echo "║  Components: Database | Backend | AI Engine | Dashboard      ║"
echo "╚══════════════════════════════════════════════════════════════╝"
echo ""

# Get current IP address
CURRENT_IP=$(hostname -I | awk '{print $1}')
echo "📡 Current IP: $CURRENT_IP"
echo ""

# ============================================================
# STEP 1: Kill any existing processes
# ============================================================
echo "🛑 Step 1: Stopping any existing services..."

# Function to kill process on port
kill_port() {
    local port=$1
    local pids=$(lsof -t -i:$port 2>/dev/null || true)
    if [ -n "$pids" ]; then
        echo "   → Killing process on port $port"
        echo "$pids" | xargs kill -9 2>/dev/null || true
        sleep 1
    fi
}

# Kill frontend ports
kill_port 5173
kill_port 5174
kill_port 5175
kill_port 5176
kill_port 3001
kill_port 3002

# Kill backend/ai ports (in case running locally)
kill_port 3000
kill_port 8000

echo "   ✓ Cleaned up old processes"
echo ""

# ============================================================
# STEP 2: Stop and restart Docker containers
# ============================================================
echo "🐳 Step 2: Starting Docker containers..."
cd "$PROJECT_DIR"

# Stop existing containers first
docker-compose down 2>/dev/null || true
sleep 2

# Start fresh
docker-compose up -d

echo "   ✓ Docker containers started"
echo ""

# ============================================================
# STEP 3: Wait for Database to be ready
# ============================================================
echo "⏳ Step 3: Waiting for Database to be ready..."
MAX_RETRIES=30
RETRY_COUNT=0

while [ $RETRY_COUNT -lt $MAX_RETRIES ]; do
    if docker exec trafficguard_db pg_isready -U trafficguard_user -d trafficguard > /dev/null 2>&1; then
        echo "   ✓ Database is ready!"
        break
    fi
    RETRY_COUNT=$((RETRY_COUNT + 1))
    echo "   → Waiting for database... ($RETRY_COUNT/$MAX_RETRIES)"
    sleep 2
done

if [ $RETRY_COUNT -eq $MAX_RETRIES ]; then
    echo "   ✗ Database failed to start. Check logs: docker logs trafficguard_db"
    exit 1
fi
echo ""

# ============================================================
# STEP 4: Wait for Backend to be ready
# ============================================================
echo "⏳ Step 4: Waiting for Backend to be ready..."
MAX_RETRIES=30
RETRY_COUNT=0

while [ $RETRY_COUNT -lt $MAX_RETRIES ]; do
    if curl -s http://localhost:3000/api/health > /dev/null 2>&1; then
        echo "   ✓ Backend is ready!"
        break
    fi
    RETRY_COUNT=$((RETRY_COUNT + 1))
    echo "   → Waiting for backend... ($RETRY_COUNT/$MAX_RETRIES)"
    sleep 2
done

if [ $RETRY_COUNT -eq $MAX_RETRIES ]; then
    echo "   ⚠ Backend may still be starting. Check logs: docker logs trafficguard_backend"
fi
echo ""

# ============================================================
# STEP 5: Wait for AI Service to be ready
# ============================================================
echo "⏳ Step 5: Waiting for AI Service to be ready..."
MAX_RETRIES=30
RETRY_COUNT=0

while [ $RETRY_COUNT -lt $MAX_RETRIES ]; do
    if curl -s http://localhost:8000/health > /dev/null 2>&1; then
        echo "   ✓ AI Service is ready!"
        break
    fi
    RETRY_COUNT=$((RETRY_COUNT + 1))
    echo "   → Waiting for AI service... ($RETRY_COUNT/$MAX_RETRIES)"
    sleep 2
done

if [ $RETRY_COUNT -eq $MAX_RETRIES ]; then
    echo "   ⚠ AI Service may still be starting. Check logs: docker logs trafficguard_ai"
fi
echo ""

# ============================================================
# STEP 6: Start Frontend
# ============================================================
echo "🌐 Step 6: Starting Frontend Dashboard..."
cd "$PROJECT_DIR/government-dashboard"

# Clear old log
> "$PROJECT_DIR/frontend.log"

# Start frontend with specific port and host binding
nohup npm run dev -- --host 0.0.0.0 --port $FRONTEND_PORT > "$PROJECT_DIR/frontend.log" 2>&1 &
FRONTEND_PID=$!

# Wait for frontend to start
sleep 3

# Check if frontend started successfully
if ps -p $FRONTEND_PID > /dev/null 2>&1; then
    echo "   ✓ Frontend started (PID: $FRONTEND_PID)"
else
    echo "   ✗ Frontend failed to start. Check: cat $PROJECT_DIR/frontend.log"
fi

cd "$PROJECT_DIR"
echo ""

# ============================================================
# STEP 7: Show container status
# ============================================================
echo "📊 Docker Container Status:"
docker-compose ps
echo ""

# ============================================================
# FINAL: Display access information
# ============================================================
echo "╔══════════════════════════════════════════════════════════════╗"
echo "║  🎉 TRAFFICGUARD IS RUNNING                                  ║"
echo "╠══════════════════════════════════════════════════════════════╣"
printf "║  🖥️  Backend API:     http://%-29s ║\n" "$CURRENT_IP:3000"
printf "║  🤖 AI Service:       http://%-29s ║\n" "$CURRENT_IP:8000"
printf "║  📊 Dashboard:        http://%-29s ║\n" "$CURRENT_IP:$FRONTEND_PORT"
echo "║  🗄️  Database:        localhost:5432                         ║"
echo "╠══════════════════════════════════════════════════════════════╣"
echo "║  📱 MOBILE APP CONFIG:                                       ║"
printf "║     API Base URL: http://%-33s ║\n" "$CURRENT_IP:3000"
echo "╠══════════════════════════════════════════════════════════════╣"
echo "║  📝 VIEW LOGS:                                               ║"
echo "║     docker logs -f trafficguard_backend  (Backend)           ║"
echo "║     docker logs -f trafficguard_ai       (AI Service)        ║"
echo "║     docker logs -f trafficguard_db       (Database)          ║"
echo "║     tail -f frontend.log                 (Frontend)          ║"
echo "╠══════════════════════════════════════════════════════════════╣"
echo "║  � TO STOP ALL SERVICES:                                    ║"
echo "║     ./stop_system.sh  OR  docker-compose down                ║"
echo "╚══════════════════════════════════════════════════════════════╝"
echo ""
echo "✅ All services started successfully!"
echo ""
