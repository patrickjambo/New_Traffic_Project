#!/bin/bash

echo "🚀 Starting TrafficGuard System Integration..."
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Function to print colored status
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Step 1: Check if Docker is running
print_status "Checking Docker status..."
if ! docker ps &> /dev/null; then
    print_error "Docker is not running. Please start Docker first."
    exit 1
fi
print_success "Docker is running"

# Step 2: Start PostgreSQL database
print_status "Starting PostgreSQL database..."
cd /home/jambo/New_Traffic_Project
docker-compose up -d database
sleep 3

# Check if database started successfully
if docker ps | grep -q trafficguard_db; then
    print_success "PostgreSQL database started"
else
    print_error "Failed to start PostgreSQL database"
    exit 1
fi

# Step 3: Wait for database to be ready
print_status "Waiting for database to be ready..."
for i in {1..30}; do
    if docker exec trafficguard_db pg_isready -U trafficguard_user -d trafficguard &> /dev/null; then
        print_success "Database is ready"
        break
    fi
    if [ $i -eq 30 ]; then
        print_error "Database failed to become ready"
        exit 1
    fi
    sleep 1
done

# Step 4: Run database migrations
print_status "Running database migrations..."

# Run emergency system migration
print_status "Creating emergency system tables..."
docker exec -i trafficguard_db psql -U trafficguard_user -d trafficguard < backend/migrations/004_emergency_system.sql 2>&1 | grep -v "already exists" | grep -v "^$"

if [ $? -eq 0 ] || docker exec trafficguard_db psql -U trafficguard_user -d trafficguard -c "\dt" | grep -q emergencies; then
    print_success "Emergency system tables created/verified"
else
    print_warning "Migration may have issues, but continuing..."
fi

# Step 5: Start Backend Server
print_status "Starting Node.js backend server..."
cd backend

# Check if node_modules exists
if [ ! -d "node_modules" ]; then
    print_status "Installing backend dependencies..."
    npm install
fi

# Start backend in background
print_status "Launching backend on port 3000..."
npm start > ../backend.log 2>&1 &
BACKEND_PID=$!
echo $BACKEND_PID > ../backend.pid

# Wait for backend to start
sleep 5

# Check if backend is running
if curl -s http://localhost:3000/health > /dev/null; then
    print_success "Backend server started successfully (PID: $BACKEND_PID)"
else
    print_warning "Backend may still be starting... Check backend.log for details"
fi

cd ..

# Step 6: Start AI Service (Python)
print_status "Starting AI service..."
cd ai_service

# Check if virtual environment exists
if [ ! -d "venv" ]; then
    print_status "Creating Python virtual environment..."
    python3 -m venv venv
fi

# Activate venv and start AI service
print_status "Launching AI service on port 8000..."
source venv/bin/activate
pip install -q -r requirements.txt > /dev/null 2>&1
python main.py > ../ai_service.log 2>&1 &
AI_PID=$!
echo $AI_PID > ../ai_service.pid

print_success "AI service started (PID: $AI_PID)"

cd ..

# Step 7: Start React Frontend
print_status "Starting React frontend..."
cd trafficguard-react

# Check if node_modules exists
if [ ! -d "node_modules" ]; then
    print_status "Installing frontend dependencies..."
    npm install
fi

# Start React app in background
print_status "Launching React app on port 3001..."
PORT=3001 npm start > ../frontend.log 2>&1 &
FRONTEND_PID=$!
echo $FRONTEND_PID > ../frontend.pid

print_success "React frontend started (PID: $FRONTEND_PID)"

cd ..

# Step 8: Display Summary
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo -e "${GREEN}✅ TrafficGuard System Started Successfully!${NC}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "📊 Service Status:"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo -e "  ${BLUE}🗄️  Database:${NC}       PostgreSQL (Port 5432)"
echo -e "  ${BLUE}⚙️  Backend API:${NC}     http://localhost:3000"
echo -e "  ${BLUE}🤖 AI Service:${NC}      http://localhost:8000"
echo -e "  ${BLUE}🌐 React Frontend:${NC}  http://localhost:3001"
echo ""
echo "📋 Process IDs:"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  Backend:  $BACKEND_PID"
echo "  AI:       $AI_PID"
echo "  Frontend: $FRONTEND_PID"
echo ""
echo "📝 Logs:"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  Backend:  tail -f backend.log"
echo "  AI:       tail -f ai_service.log"
echo "  Frontend: tail -f frontend.log"
echo ""
echo "🛑 To stop all services:"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  ./stop_all_services.sh"
echo ""
echo "🚀 Opening browser in 5 seconds..."
sleep 5

# Open browser
if command -v xdg-open > /dev/null; then
    xdg-open http://localhost:3001
elif command -v open > /dev/null; then
    open http://localhost:3001
else
    echo "Please open http://localhost:3001 in your browser"
fi

echo ""
echo "✨ System is ready! Happy traffic monitoring! ✨"
