#!/bin/bash

# TrafficGuard AI - Development Startup Script

echo "🚦 TrafficGuard AI - Starting Development Environment"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if Docker is installed
if ! command -v docker-compose &> /dev/null; then
    echo "${YELLOW}⚠️  Docker Compose not found. Please install Docker first.${NC}"
    exit 1
fi

# Option 1: Start with Docker Compose
echo ""
echo "Choose an option:"
echo "1) Start all services with Docker Compose (Recommended)"
echo "2) Start services manually (for development)"
read -p "Enter your choice (1 or 2): " choice

if [ "$choice" == "1" ]; then
    echo ""
    echo "${GREEN}📦 Starting services with Docker Compose...${NC}"
    docker-compose up -d
    
    echo ""
    echo "${GREEN}✅ Services started!${NC}"
    echo ""
    echo "Backend API:     http://localhost:3000"
    echo "AI Service:      http://localhost:8000"
    echo "Database:        localhost:5432"
    echo ""
    echo "View logs:       docker-compose logs -f"
    echo "Stop services:   docker-compose down"
    
elif [ "$choice" == "2" ]; then
    echo ""
    echo "${GREEN}🔧 Manual startup instructions:${NC}"
    echo ""
    echo "Terminal 1 - Database:"
    echo "  Start PostgreSQL with PostGIS extension"
    echo "  psql -U postgres -f database/schema.sql"
    echo ""
    echo "Terminal 2 - Backend:"
    echo "  cd backend"
    echo "  cp .env.example .env  # Edit with your config"
    echo "  npm install"
    echo "  npm run dev"
    echo ""
    echo "Terminal 3 - AI Service:"
    echo "  cd ai_service"
    echo "  python -m venv venv"
    echo "  source venv/bin/activate"
    echo "  pip install -r requirements.txt"
    echo "  python main.py"
    echo ""
    echo "Terminal 4 - Mobile App:"
    echo "  cd mobile_app"
    echo "  flutter pub get"
    echo "  flutter run"
else
    echo "${YELLOW}Invalid choice. Exiting.${NC}"
    exit 1
fi
