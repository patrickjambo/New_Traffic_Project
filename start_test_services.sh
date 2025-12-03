#!/bin/bash

# TrafficGuard - Start All Services for Mobile App Testing
# This script starts Database, Backend, and AI Service

echo "════════════════════════════════════════════════════════════"
echo "  🚀 TrafficGuard - Starting All Services"
echo "════════════════════════════════════════════════════════════"
echo ""

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Get the script directory
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
cd "$SCRIPT_DIR"

# 1. Start Database
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "1️⃣  Starting Database (PostgreSQL)..."
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
docker-compose up -d database

# Wait for database to be ready
echo "⏳ Waiting for database to be ready..."
sleep 5

# Check if database is running
if docker ps | grep -q "trafficguard_db"; then
    echo -e "${GREEN}✅ Database is running${NC}"
else
    echo -e "${RED}❌ Database failed to start${NC}"
    echo "Run: docker-compose logs database"
    exit 1
fi

echo ""

# 2. Start Backend
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "2️⃣  Starting Backend API (Node.js)..."
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# Check if backend is already running
if lsof -Pi :3000 -sTCP:LISTEN -t >/dev/null 2>&1; then
    echo -e "${YELLOW}⚠️  Backend already running on port 3000${NC}"
else
    echo "📦 Installing backend dependencies..."
    cd backend
    npm install --silent > /dev/null 2>&1
    
    echo "🚀 Starting backend server..."
    # Start backend in background
    nohup npm start > ../backend.log 2>&1 &
    BACKEND_PID=$!
    echo $BACKEND_PID > ../backend.pid
    
    # Wait for backend to start
    echo "⏳ Waiting for backend to start..."
    sleep 5
    
    # Check if backend is responding
    if curl -s http://localhost:3000/health > /dev/null 2>&1; then
        echo -e "${GREEN}✅ Backend is running (PID: $BACKEND_PID)${NC}"
        echo "   URL: http://localhost:3000"
    else
        echo -e "${RED}❌ Backend failed to start${NC}"
        echo "Check logs: tail -f backend.log"
        exit 1
    fi
    
    cd ..
fi

echo ""

# 3. Start AI Service
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "3️⃣  Starting AI Service (Python FastAPI)..."
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# Check if AI service is already running
if lsof -Pi :8000 -sTCP:LISTEN -t >/dev/null 2>&1; then
    echo -e "${YELLOW}⚠️  AI Service already running on port 8000${NC}"
else
    cd ai_service
    
    # Check if venv exists
    if [ ! -d "venv" ]; then
        echo "📦 Creating Python virtual environment..."
        python3 -m venv venv
    fi
    
    # Activate venv and install dependencies
    source venv/bin/activate
    echo "📦 Installing Python dependencies..."
    pip install -q -r requirements.txt
    
    echo "🤖 Starting AI service..."
    # Start AI service in background
    nohup python main.py > ../ai_service.log 2>&1 &
    AI_PID=$!
    echo $AI_PID > ../ai_service.pid
    
    # Wait for AI service to start
    echo "⏳ Waiting for AI service to start..."
    sleep 8
    
    # Check if AI service is responding
    if curl -s http://localhost:8000/health > /dev/null 2>&1; then
        echo -e "${GREEN}✅ AI Service is running (PID: $AI_PID)${NC}"
        echo "   URL: http://localhost:8000"
    else
        echo -e "${RED}❌ AI Service failed to start${NC}"
        echo "Check logs: tail -f ai_service.log"
        exit 1
    fi
    
    cd ..
fi

echo ""
echo "════════════════════════════════════════════════════════════"
echo "  ✅ All Services Started Successfully!"
echo "════════════════════════════════════════════════════════════"
echo ""
echo "📊 Service Status:"
echo "   • Database:   http://localhost:5432  ✅"
echo "   • Backend:    http://localhost:3000  ✅"
echo "   • AI Service: http://localhost:8000  ✅"
echo ""
echo "📱 Next Steps:"
echo "   1. Open mobile app: cd mobile_app && flutter run"
echo "   2. Test video capture and AI analysis"
echo "   3. Check logs: tail -f backend.log ai_service.log"
echo ""
echo "🛑 To stop all services:"
echo "   ./stop_all_services.sh"
echo ""
echo "════════════════════════════════════════════════════════════"
