#!/bin/bash

# TrafficGuard AI - Complete System Setup & Testing Script
# This script sets up and tests the entire system

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
LOG_FILE="system_setup.log"
TIMESTAMP=$(date '+%Y-%m-%d %H:%M:%S')

# Helper functions
log() {
    echo -e "${BLUE}[$(date +'%H:%M:%S')]${NC} $1" | tee -a "$LOG_FILE"
}

success() {
    echo -e "${GREEN}✅ $1${NC}" | tee -a "$LOG_FILE"
}

error() {
    echo -e "${RED}❌ $1${NC}" | tee -a "$LOG_FILE"
}

warning() {
    echo -e "${YELLOW}⚠️  $1${NC}" | tee -a "$LOG_FILE"
}

# Header
echo -e "${BLUE}
╔════════════════════════════════════════════════════════════════╗
║       TrafficGuard AI - System Setup & Testing Script          ║
║                Version 1.0.0 - November 27, 2025               ║
╚════════════════════════════════════════════════════════════════╝
${NC}"

log "Starting system setup at $TIMESTAMP"

# Check dependencies
log "Checking system dependencies..."

check_command() {
    if command -v $1 &> /dev/null; then
        success "$1 is installed"
        return 0
    else
        error "$1 is NOT installed"
        return 1
    fi
}

# Check Node.js
if ! check_command "node"; then
    error "Node.js is required. Please install from https://nodejs.org"
    exit 1
fi

NODE_VERSION=$(node -v)
success "Node.js version: $NODE_VERSION"

# Check npm
if ! check_command "npm"; then
    error "npm is required. Please install Node.js"
    exit 1
fi

NPM_VERSION=$(npm -v)
success "npm version: $NPM_VERSION"

# Check Python
if ! check_command "python3"; then
    error "Python 3 is required. Please install from https://python.org"
    exit 1
fi

PYTHON_VERSION=$(python3 --version)
success "Python version: $PYTHON_VERSION"

# Check PostgreSQL (optional but recommended)
if check_command "psql"; then
    PSQL_VERSION=$(psql --version)
    success "PostgreSQL version: $PSQL_VERSION"
else
    warning "PostgreSQL not found. Database operations may fail."
fi

echo ""

# Setup Backend
log "Setting up Backend..."

if [ -d "backend" ]; then
    cd backend
    
    log "Installing backend dependencies..."
    npm install
    success "Backend dependencies installed"
    
    # Check for .env
    if [ ! -f ".env" ]; then
        log "Creating .env file..."
        cat > .env << EOF
PORT=3000
NODE_ENV=development
DATABASE_URL=postgresql://postgres:password@localhost:5432/trafficguard
JWT_SECRET=your-super-secret-key-change-this-in-production
AI_SERVICE_URL=http://localhost:8000
UPLOAD_DIR=./uploads
MAX_FILE_SIZE=52428800
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100
ALLOWED_ORIGINS=http://localhost:3000,http://localhost:8080
EOF
        success ".env file created (please update DATABASE_URL)"
    else
        success ".env file already exists"
    fi
    
    cd ..
else
    error "Backend directory not found"
    exit 1
fi

echo ""

# Setup AI Service
log "Setting up AI Service..."

if [ -d "ai_service" ]; then
    cd ai_service
    
    log "Creating Python virtual environment..."
    python3 -m venv venv
    source venv/bin/activate
    
    log "Installing Python dependencies..."
    pip install --upgrade pip
    pip install -r requirements.txt
    success "AI Service dependencies installed"
    
    # Check for .env
    if [ ! -f ".env" ]; then
        log "Creating .env file..."
        cat > .env << EOF
HOST=0.0.0.0
PORT=8000
MODEL_PATH=./models/yolov8n.pt
MAX_VIDEO_DURATION=30
FRAME_SKIP=5
EOF
        success ".env file created for AI Service"
    fi
    
    deactivate
    cd ..
else
    error "AI Service directory not found"
    exit 1
fi

echo ""

# Setup Mobile App
log "Setting up Mobile App..."

if [ -d "mobile_app" ]; then
    cd mobile_app
    
    # Check for Flutter
    if check_command "flutter"; then
        log "Getting Flutter dependencies..."
        flutter pub get
        success "Mobile app dependencies installed"
    else
        warning "Flutter not installed. Skipping mobile app setup."
        warning "To install Flutter, visit: https://flutter.dev/docs/get-started/install"
    fi
    
    cd ..
else
    warning "Mobile app directory not found"
fi

echo ""

# Database Setup (optional)
log "Database setup..."

if check_command "psql"; then
    warning "To create database and run migrations, execute:"
    echo -e "${YELLOW}psql -U postgres -c \"CREATE DATABASE trafficguard;\"${NC}"
    echo -e "${YELLOW}psql -U postgres -d trafficguard -f database/schema.sql${NC}"
else
    warning "PostgreSQL not available. Please set up database manually."
fi

echo ""

# Display startup instructions
echo -e "${GREEN}
╔════════════════════════════════════════════════════════════════╗
║                   Setup Complete! ✅                           ║
║                                                                ║
║  To start the system, open 3 terminal windows and run:        ║
║                                                                ║
║  Terminal 1 - Backend:                                        ║
║  $ cd backend && npm run dev                                  ║
║                                                                ║
║  Terminal 2 - AI Service:                                     ║
║  $ cd ai_service && source venv/bin/activate && python main.py║
║                                                                ║
║  Terminal 3 - Access Frontend:                                ║
║  $ open http://localhost:3000                                 ║
║                                                                ║
║  Police Dashboard: http://localhost:3000/police-dashboard.html║
║  Admin Dashboard:  http://localhost:3000/admin-dashboard.html ║
║                                                                ║
╚════════════════════════════════════════════════════════════════╝
${NC}"

# Testing
log "Running integration tests..."

echo ""
echo -e "${BLUE}Would you like to run integration tests? (y/n)${NC}"
read -r response

if [[ "$response" =~ ^[Yy]$ ]]; then
    log "Starting backend for tests..."
    
    cd backend
    
    # Start backend in background
    npm run dev > /dev/null 2>&1 &
    BACKEND_PID=$!
    log "Backend started (PID: $BACKEND_PID)"
    
    # Wait for backend to start
    sleep 5
    
    cd ..
    
    # Run tests
    if [ -f "test_integration.sh" ]; then
        bash test_integration.sh
    else
        warning "Integration test script not found"
    fi
    
    # Kill backend
    kill $BACKEND_PID 2>/dev/null || true
    log "Backend stopped"
else
    log "Skipping integration tests"
fi

echo ""
success "System setup completed successfully!"
log "Setup log saved to $LOG_FILE"

# Summary
echo -e "${GREEN}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
                        Summary
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

✅ Backend environment ready (port 3000)
✅ AI Service environment ready (port 8000)
✅ Frontend configuration ready
✅ Mobile app dependencies installed (if Flutter available)

📚 Next Steps:
   1. Update .env files with your configuration
   2. Set up PostgreSQL database
   3. Start all services in separate terminals
   4. Access http://localhost:3000 in your browser
   5. Read SYSTEM_INTEGRATION_GUIDE.md for detailed information

🔒 Security Reminders:
   • Change JWT_SECRET in backend/.env
   • Use strong database passwords
   • Enable HTTPS in production
   • Update ALLOWED_ORIGINS for your domain

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
${NC}"
