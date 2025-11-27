#!/bin/bash

# TrafficGuard AI - Quick Start Web Dashboard
# This script starts the backend server which serves the web dashboard

echo "🚦 TrafficGuard AI - Starting Web Dashboard..."
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# Check if in correct directory
if [ ! -d "backend" ]; then
    echo "❌ Error: Please run this script from the project root directory"
    exit 1
fi

# Start backend server
echo "📡 Starting backend server..."
cd backend

# Check if node_modules exists
if [ ! -d "node_modules" ]; then
    echo "📦 Installing dependencies..."
    npm install
fi

echo ""
echo "✅ Backend server starting..."
echo ""
echo "🌐 Access the dashboard at:"
echo "   → Public Home:    http://localhost:3000"
echo "   → Police Dashboard: http://localhost:3000/police-dashboard.html"
echo "   → Admin Dashboard:  http://localhost:3000/admin-dashboard.html"
echo ""
echo "Press Ctrl+C to stop the server"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Start the server
npm start
