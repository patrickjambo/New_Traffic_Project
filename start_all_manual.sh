#!/bin/bash

# TrafficGuard AI - Manual Startup Helper Script
# This script provides the commands to run in separate terminals

cat << 'EOF'
╔═══════════════════════════════════════════════════════════════╗
║    🚦 TrafficGuard AI - Complete System Startup Guide        ║
╚═══════════════════════════════════════════════════════════════╝

Run these commands in SEPARATE terminal windows/tabs:

┌───────────────────────────────────────────────────────────────┐
│ TERMINAL 1: Backend API (Node.js)                            │
└───────────────────────────────────────────────────────────────┘

cd /home/jambo/New_Traffic_Project/backend && npm run dev

Expected: Server running on http://localhost:3000

┌───────────────────────────────────────────────────────────────┐
│ TERMINAL 2: AI Service (Python/FastAPI)                      │
└───────────────────────────────────────────────────────────────┘

cd /home/jambo/New_Traffic_Project/ai_service && source venv/bin/activate && python main.py

Expected: Uvicorn running on http://localhost:8000

┌───────────────────────────────────────────────────────────────┐
│ TERMINAL 3: Frontend Dashboard (Web Server)                  │
└───────────────────────────────────────────────────────────────┘

cd /home/jambo/New_Traffic_Project/frontend && python3 -m http.server 8080

Expected: Serving on http://localhost:8080

┌───────────────────────────────────────────────────────────────┐
│ TERMINAL 4: Mobile App on Browser (Flutter Web)              │
└───────────────────────────────────────────────────────────────┘

cd /home/jambo/New_Traffic_Project/mobile_app && flutter run -d chrome

Expected: Chrome opens with mobile app

═══════════════════════════════════════════════════════════════

🌐 ACCESS URLS:

  ✓ Public Dashboard:    http://localhost:8080/index.html
  ✓ Police Dashboard:    http://localhost:8080/police-dashboard.html
  ✓ Admin Dashboard:     http://localhost:8080/admin-dashboard.html
  ✓ Mobile App:          Launched in Chrome browser
  ✓ Backend API:         http://localhost:3000/health
  ✓ AI Service:          http://localhost:8000/health

🔑 TEST CREDENTIALS:

  Admin:   admin@trafficguard.ai / admin123
  Police:  officer@trafficguard.ai / police123
  User:    test@example.com / test123

═══════════════════════════════════════════════════════════════

📋 QUICK VERIFICATION:

1. Check Backend:    curl http://localhost:3000/health
2. Check AI Service: curl http://localhost:8000/health
3. Open Frontend:    http://localhost:8080/index.html
4. Login with admin credentials to see live data

═══════════════════════════════════════════════════════════════
EOF

echo ""
echo "Do you want to see detailed troubleshooting? (y/n)"
read -r response

if [[ "$response" == "y" ]]; then
    cat << 'EOF'

🔧 TROUBLESHOOTING TIPS:

Port Already in Use:
  lsof -i :3000     # Check what's using port 3000
  lsof -i :8000     # Check what's using port 8000
  kill -9 <PID>     # Kill the process

Database Not Running:
  sudo systemctl status postgresql
  sudo systemctl start postgresql

Python Virtual Environment:
  cd ai_service
  python3 -m venv venv
  source venv/bin/activate
  pip install -r requirements.txt

Flutter Dependencies:
  cd mobile_app
  flutter clean
  flutter pub get
  flutter doctor     # Check Flutter setup

Node Dependencies:
  cd backend
  npm install

EOF
fi
