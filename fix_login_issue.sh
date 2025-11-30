#!/bin/bash

echo "🔧 TrafficGuard AI - Login Fix Script"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Step 1: Kill the old backend process
echo "1️⃣  Stopping old backend process..."
pkill -f "node src/server.js"
sleep 2

# Step 2: Navigate to backend and restart with new CORS settings
echo "2️⃣  Starting backend with updated CORS settings..."
cd /home/jambo/New_Traffic_Project/backend

# Show current CORS config
echo "   Current ALLOWED_ORIGINS:"
grep ALLOWED_ORIGINS .env

echo ""
echo "3️⃣  Restarting backend server..."
npm run dev &

sleep 3

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "✅ Backend restarted with new CORS settings!"
echo ""
echo "🌐 Now try logging in at: http://localhost:8080/index.html"
echo ""
echo "🔑 Test credentials:"
echo "   Email:    admin@trafficguard.ai"
echo "   Password: admin123"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
