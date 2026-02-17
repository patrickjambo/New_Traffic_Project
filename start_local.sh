#!/bin/bash
# =============================================================================
# TrafficGuard - Lightweight Local Startup Script (No Docker Required)
# =============================================================================
# This script starts all services locally without Docker
# Much lighter on system resources!
# =============================================================================

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Project directory
PROJECT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$PROJECT_DIR"

# Configuration
DB_NAME="trafficguard"
DB_USER="trafficguard_user"
DB_PASSWORD="trafficguard_pass_123"
BACKEND_PORT=3000
AI_SERVICE_PORT=8000
FRONTEND_PORT=5176

# Log files
BACKEND_LOG="$PROJECT_DIR/backend.log"
AI_SERVICE_LOG="$PROJECT_DIR/ai_service.log"
FRONTEND_LOG="$PROJECT_DIR/frontend.log"
DB_LOG="$PROJECT_DIR/database.log"

# PID files for easy stopping
PID_DIR="$PROJECT_DIR/.pids"
mkdir -p "$PID_DIR"

echo -e "${CYAN}"
echo "╔═══════════════════════════════════════════════════════════════╗"
echo "║     TrafficGuard - Lightweight Local System Startup           ║"
echo "║                    (No Docker Required)                       ║"
echo "╚═══════════════════════════════════════════════════════════════╝"
echo -e "${NC}"

# Function to kill process on a port
kill_port() {
    local port=$1
    local pid=$(lsof -t -i:$port 2>/dev/null)
    if [ ! -z "$pid" ]; then
        echo -e "${YELLOW}Killing existing process on port $port (PID: $pid)${NC}"
        kill -9 $pid 2>/dev/null
        sleep 1
    fi
}

# Function to check if a command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Function to wait for port to be ready
wait_for_port() {
    local port=$1
    local service=$2
    local max_wait=60
    local counter=0
    
    echo -ne "${YELLOW}Waiting for $service to be ready..."
    while ! nc -z localhost $port 2>/dev/null; do
        counter=$((counter + 1))
        if [ $counter -ge $max_wait ]; then
            echo -e "${RED} TIMEOUT!${NC}"
            return 1
        fi
        sleep 1
        echo -ne "."
    done
    echo -e "${GREEN} Ready!${NC}"
    return 0
}

# =============================================================================
# STEP 1: Clean up any existing processes
# =============================================================================
echo -e "\n${BLUE}[Step 1/5] Cleaning up existing processes...${NC}"
kill_port $BACKEND_PORT
kill_port $AI_SERVICE_PORT
kill_port $FRONTEND_PORT

# =============================================================================
# STEP 2: Start PostgreSQL Database
# =============================================================================
echo -e "\n${BLUE}[Step 2/5] Starting PostgreSQL Database...${NC}"

# Check if PostgreSQL is installed
if ! command_exists psql; then
    echo -e "${RED}PostgreSQL is not installed!${NC}"
    echo -e "${YELLOW}To install PostgreSQL on your system:${NC}"
    echo "  Ubuntu/Debian/Kali: sudo apt install postgresql postgresql-contrib"
    echo "  Fedora: sudo dnf install postgresql-server postgresql-contrib"
    echo "  macOS: brew install postgresql"
    exit 1
fi

# Check PostgreSQL status and start if needed
if ! systemctl is-active --quiet postgresql 2>/dev/null; then
    echo -e "${YELLOW}Starting PostgreSQL service...${NC}"
    sudo systemctl start postgresql 2>/dev/null || sudo service postgresql start 2>/dev/null
    sleep 2
fi

# Check if PostgreSQL is now running
if systemctl is-active --quiet postgresql 2>/dev/null || pgrep -x "postgres" > /dev/null; then
    echo -e "${GREEN}✓ PostgreSQL is running${NC}"
else
    echo -e "${RED}✗ Failed to start PostgreSQL${NC}"
    echo "  Try manually: sudo systemctl start postgresql"
    exit 1
fi

# Setup database and user if they don't exist
echo -e "${YELLOW}Setting up database...${NC}"

# Create user if not exists
sudo -u postgres psql -tc "SELECT 1 FROM pg_roles WHERE rolname='$DB_USER'" 2>/dev/null | grep -q 1 || {
    echo -e "${YELLOW}Creating database user: $DB_USER${NC}"
    sudo -u postgres psql -c "CREATE USER $DB_USER WITH PASSWORD '$DB_PASSWORD';" 2>/dev/null
}

# Create database if not exists
sudo -u postgres psql -tc "SELECT 1 FROM pg_database WHERE datname='$DB_NAME'" 2>/dev/null | grep -q 1 || {
    echo -e "${YELLOW}Creating database: $DB_NAME${NC}"
    sudo -u postgres psql -c "CREATE DATABASE $DB_NAME OWNER $DB_USER;" 2>/dev/null
}

# Grant privileges
sudo -u postgres psql -c "GRANT ALL PRIVILEGES ON DATABASE $DB_NAME TO $DB_USER;" 2>/dev/null

# Enable PostGIS if available (optional - some systems don't have it)
sudo -u postgres psql -d $DB_NAME -c "CREATE EXTENSION IF NOT EXISTS postgis;" 2>/dev/null && {
    echo -e "${GREEN}✓ PostGIS extension enabled${NC}"
} || {
    echo -e "${YELLOW}Note: PostGIS not available, continuing without spatial features${NC}"
}

# Initialize schema if tables don't exist
if [ -f "$PROJECT_DIR/database/schema.pgsql" ]; then
    TABLE_COUNT=$(sudo -u postgres psql -d $DB_NAME -tc "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema='public';" 2>/dev/null | tr -d ' ')
    if [ "$TABLE_COUNT" -lt "5" ] 2>/dev/null; then
        echo -e "${YELLOW}Initializing database schema...${NC}"
        sudo -u postgres psql -d $DB_NAME -f "$PROJECT_DIR/database/schema.pgsql" 2>/dev/null
    fi
fi

echo -e "${GREEN}✓ Database ready${NC}"

# =============================================================================
# STEP 3: Start Backend Server
# =============================================================================
echo -e "\n${BLUE}[Step 3/5] Starting Backend Server...${NC}"

cd "$PROJECT_DIR/backend"

# Check if node_modules exists
if [ ! -d "node_modules" ]; then
    echo -e "${YELLOW}Installing backend dependencies...${NC}"
    npm install
fi

# Create .env file for backend
cat > .env << EOF
# Database Configuration
DB_HOST=localhost
DB_PORT=5432
DB_NAME=$DB_NAME
DB_USER=$DB_USER
DB_PASSWORD=$DB_PASSWORD

# Server Configuration
PORT=$BACKEND_PORT
NODE_ENV=development

# JWT Secret (generate a secure one for production)
JWT_SECRET=trafficguard_jwt_secret_2024

# AI Service
AI_SERVICE_URL=http://localhost:$AI_SERVICE_PORT

# Frontend URL (for CORS)
FRONTEND_URL=http://localhost:$FRONTEND_PORT
EOF

echo -e "${YELLOW}Starting backend on port $BACKEND_PORT...${NC}"
nohup npm run dev > "$BACKEND_LOG" 2>&1 &
BACKEND_PID=$!
echo $BACKEND_PID > "$PID_DIR/backend.pid"

wait_for_port $BACKEND_PORT "Backend"
echo -e "${GREEN}✓ Backend running (PID: $BACKEND_PID)${NC}"

# =============================================================================
# STEP 4: Start AI Service
# =============================================================================
echo -e "\n${BLUE}[Step 4/5] Starting AI Service...${NC}"

cd "$PROJECT_DIR/ai_service"

# Check if Python is available
if ! command_exists python3; then
    echo -e "${RED}Python3 is not installed!${NC}"
    echo "  Install with: sudo apt install python3 python3-pip python3-venv"
    exit 1
fi

# Create virtual environment if it doesn't exist
if [ ! -d "venv" ]; then
    echo -e "${YELLOW}Creating Python virtual environment...${NC}"
    python3 -m venv venv
fi

# Activate virtual environment and install dependencies
echo -e "${YELLOW}Activating virtual environment...${NC}"
source venv/bin/activate

# Install dependencies
if [ ! -f "venv/.deps_installed" ]; then
    echo -e "${YELLOW}Installing AI service dependencies (lightweight)...${NC}"
    pip install --upgrade pip
    pip install -r requirements-light.txt 2>/dev/null || pip install -r requirements.txt
    touch "venv/.deps_installed"
fi

# Create .env for AI service
cat > .env << EOF
BACKEND_URL=http://localhost:$BACKEND_PORT
BACKEND_NOTIFY_SECRET=trafficguard_ai_notify_secret
EOF

echo -e "${YELLOW}Starting AI service on port $AI_SERVICE_PORT...${NC}"
nohup python3 -m uvicorn main_light:app --host 0.0.0.0 --port $AI_SERVICE_PORT --reload > "$AI_SERVICE_LOG" 2>&1 &
AI_PID=$!
echo $AI_PID > "$PID_DIR/ai_service.pid"

deactivate

wait_for_port $AI_SERVICE_PORT "AI Service"
echo -e "${GREEN}✓ AI Service running (PID: $AI_PID)${NC}"

# =============================================================================
# STEP 5: Start Frontend
# =============================================================================
echo -e "\n${BLUE}[Step 5/5] Starting Frontend...${NC}"

cd "$PROJECT_DIR/government-dashboard"

# Check if node_modules exists
if [ ! -d "node_modules" ]; then
    echo -e "${YELLOW}Installing frontend dependencies...${NC}"
    npm install
fi

echo -e "${YELLOW}Starting frontend on port $FRONTEND_PORT...${NC}"
nohup npm run dev -- --port $FRONTEND_PORT --host > "$FRONTEND_LOG" 2>&1 &
FRONTEND_PID=$!
echo $FRONTEND_PID > "$PID_DIR/frontend.pid"

wait_for_port $FRONTEND_PORT "Frontend"
echo -e "${GREEN}✓ Frontend running (PID: $FRONTEND_PID)${NC}"

# =============================================================================
# SUMMARY
# =============================================================================
cd "$PROJECT_DIR"

echo -e "\n${CYAN}"
echo "╔═══════════════════════════════════════════════════════════════╗"
echo "║                    ALL SERVICES STARTED                        ║"
echo "╚═══════════════════════════════════════════════════════════════╝"
echo -e "${NC}"

echo -e "${GREEN}Services Running:${NC}"
echo "  📊 PostgreSQL Database : localhost:5432"
echo "  🖥️  Backend Server     : http://localhost:$BACKEND_PORT"
echo "  🤖 AI Service          : http://localhost:$AI_SERVICE_PORT"
echo "  🌐 Frontend Dashboard  : http://localhost:$FRONTEND_PORT"

echo -e "\n${YELLOW}Log Files:${NC}"
echo "  Backend   : $BACKEND_LOG"
echo "  AI Service: $AI_SERVICE_LOG"
echo "  Frontend  : $FRONTEND_LOG"

echo -e "\n${YELLOW}Quick Commands:${NC}"
echo "  View backend logs:   tail -f $BACKEND_LOG"
echo "  View AI logs:        tail -f $AI_SERVICE_LOG"
echo "  Stop all services:   ./stop_local.sh"

echo -e "\n${CYAN}Open your browser at: http://localhost:$FRONTEND_PORT${NC}"
echo ""
