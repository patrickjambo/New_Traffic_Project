# 🚀 MANUAL START GUIDE - All Services Step by Step

This guide shows you how to manually start each service in separate terminal windows.

---

## 📋 Overview

You'll need **5 terminal windows** (or tabs) open:

1. **Terminal 1:** Database (PostgreSQL)
2. **Terminal 2:** Backend (Node.js)
3. **Terminal 3:** AI Service (Python)
4. **Terminal 4:** Frontend (React)
5. **Terminal 5:** Mobile App (Flutter)

---

## 🗄️ TERMINAL 1: Database (PostgreSQL)

### Start Database Container

```bash
# Navigate to project directory
cd /home/jambo/New_Traffic_Project

# Start PostgreSQL with Docker
docker-compose up database
```

**What you should see:**
```
trafficguard_db  | database system is ready to accept connections
```

**Keep this terminal open** - Don't close it or the database will stop.

### Verify Database is Running (in a new terminal)

```bash
# Check container status
docker ps | grep trafficguard_db

# Test connection
docker exec trafficguard_db pg_isready -U trafficguard_user

# Expected output: /var/run/postgresql:5432 - accepting connections
```

### Run Migrations (first time only)

```bash
cd /home/jambo/New_Traffic_Project

# Run emergency system migration
docker exec -i trafficguard_db psql -U trafficguard_user -d trafficguard < backend/migrations/004_emergency_system.sql
```

---

## ⚙️ TERMINAL 2: Backend (Node.js)

### Start Backend Server

```bash
# Navigate to backend directory
cd /home/jambo/New_Traffic_Project/backend

# Install dependencies (first time only)
npm install

# Start the server
npm start
```

**What you should see:**
```
> trafficguard-backend@1.0.0 start
> node src/server.js

🚀 Server running on port 3000
✅ Database connected successfully
🔌 WebSocket server initialized
```

**Keep this terminal open** - Backend needs to keep running.

### Verify Backend is Running (in a new terminal)

```bash
# Test health endpoint
curl http://localhost:3000/health

# Expected: {"success":true,"message":"TrafficGuard API is running"...}

# Test emergency endpoint
curl http://localhost:3000/api/emergency

# Expected: List of emergencies or empty array
```

### Common Backend Issues

**Issue:** `Cannot find module 'express-validator'`
```bash
cd /home/jambo/New_Traffic_Project/backend
npm install express-validator
npm start
```

**Issue:** `Port 3000 already in use`
```bash
# Kill process on port 3000
lsof -ti:3000 | xargs kill -9

# Then restart
npm start
```

**Issue:** `Database connection error`
```bash
# Make sure database is running (Terminal 1)
docker ps | grep trafficguard_db

# Check environment variables
cat /home/jambo/New_Traffic_Project/backend/.env
```

---

## 🤖 TERMINAL 3: AI Service (Python)

### Start AI Service

```bash
# Navigate to AI service directory
cd /home/jambo/New_Traffic_Project/ai_service

# Activate virtual environment
source venv/bin/activate

# Install dependencies (first time only)
pip install -r requirements.txt

# Start the AI service
python main.py
```

**What you should see:**
```
INFO:     Started server process [12345]
INFO:     Waiting for application startup.
INFO:     Application startup complete.
INFO:     Uvicorn running on http://0.0.0.0:8000
✅ YOLOv8 model loaded successfully
```

**Keep this terminal open** - AI service needs to keep running.

### Verify AI Service is Running (in a new terminal)

```bash
# Test health endpoint
curl http://localhost:8000/health

# Expected: {"status":"healthy","model_loaded":true}

# Test with a sample analysis
curl http://localhost:8000/

# Expected: {"message":"TrafficGuard AI Service","version":"1.0.0"}
```

### Common AI Service Issues

**Issue:** `ModuleNotFoundError: No module named 'fastapi'`
```bash
cd /home/jambo/New_Traffic_Project/ai_service
source venv/bin/activate
pip install -r requirements.txt
python main.py
```

**Issue:** `venv not found`
```bash
cd /home/jambo/New_Traffic_Project/ai_service

# Create virtual environment
python3 -m venv venv

# Activate it
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Start service
python main.py
```

**Issue:** `Port 8000 already in use`
```bash
# Kill process on port 8000
lsof -ti:8000 | xargs kill -9

# Then restart
python main.py
```

---

## 🌐 TERMINAL 4: Frontend (React)

### Start React Frontend

```bash
# Navigate to frontend directory
cd /home/jambo/New_Traffic_Project/trafficguard-react

# Install dependencies (first time only)
npm install

# Start the React app on port 3001
PORT=3001 npm start
```

**What you should see:**
```
Compiled successfully!

You can now view trafficguard-react in the browser.

  Local:            http://localhost:3001
  On Your Network:  http://192.168.x.x:3001

Note that the development build is not optimized.
To create a production build, use npm run build.

webpack compiled successfully
```

**Browser should automatically open** at http://localhost:3001

**Keep this terminal open** - Frontend needs to keep running.

### Verify Frontend is Running

1. **Browser opens automatically** at http://localhost:3001
2. **You should see:** TrafficGuard dashboard
3. **Check browser console:** No errors (F12 → Console tab)

### Common Frontend Issues

**Issue:** `Port 3001 already in use`
```bash
# Kill process on port 3001
lsof -ti:3001 | xargs kill -9

# Or use a different port
PORT=3002 npm start
```

**Issue:** `npm ERR! Missing script: "start"`
```bash
# Check if you're in the right directory
pwd
# Should show: /home/jambo/New_Traffic_Project/trafficguard-react

# If not, navigate there
cd /home/jambo/New_Traffic_Project/trafficguard-react
```

**Issue:** `Module not found` errors
```bash
cd /home/jambo/New_Traffic_Project/trafficguard-react
rm -rf node_modules package-lock.json
npm install
PORT=3001 npm start
```

---

## 📱 TERMINAL 5: Mobile App (Flutter)

### Option A: Run on Chrome (Web Browser)

```bash
# Navigate to mobile app directory
cd /home/jambo/New_Traffic_Project/mobile_app

# Clean build (first time only)
flutter clean
flutter pub get

# Check available devices
flutter devices

# Run on Chrome
flutter run -d chrome
```

**What you should see:**
```
Launching lib/main.dart on Chrome in debug mode...
Building application for the web...
Waiting for connection from debug service on Chrome...

🎉 Application running!

An Observatory debugger and profiler on Chrome is available at:
http://127.0.0.1:xxxxx/

The Flutter DevTools debugger and profiler is available at:
http://127.0.0.1:xxxxx/
```

**Browser opens** with the Flutter app running.

### Option B: Run on Android Emulator

```bash
# Navigate to mobile app directory
cd /home/jambo/New_Traffic_Project/mobile_app

# List available emulators
flutter emulators

# Start an emulator
flutter emulators --launch <emulator_id>

# Wait for emulator to boot (30-60 seconds)

# Run app on emulator
flutter run
```

### Option C: Run on Physical Android Device

```bash
# 1. Enable USB Debugging on your Android device:
#    Settings → About Phone → Tap "Build Number" 7 times
#    Settings → Developer Options → Enable "USB Debugging"

# 2. Connect device via USB

# 3. Check device is connected
flutter devices

# Expected output shows your device:
# Android SDK built for x86 • emulator-5554 • android-x86 • Android 11 (API 30)

# 4. Run app on device
flutter run
```

### Configure Backend URL for Mobile App

**IMPORTANT:** The mobile app needs to connect to your backend server.

#### For Chrome (Web):
```bash
# Edit app config
nano /home/jambo/New_Traffic_Project/mobile_app/lib/config/app_config.dart
```

Change:
```dart
class AppConfig {
  static const String baseUrl = 'http://localhost:3000';
  // ... rest of config
}
```

#### For Android Emulator:
```dart
class AppConfig {
  static const String baseUrl = 'http://10.0.2.2:3000';  // Special emulator IP
  // ... rest of config
}
```

#### For Physical Device:
```bash
# Get your computer's IP address
hostname -I | awk '{print $1}'

# Example output: 192.168.1.100
```

Then edit app_config.dart:
```dart
class AppConfig {
  static const String baseUrl = 'http://192.168.1.100:3000';  // Your computer's IP
  // ... rest of config
}
```

**After changing the URL, restart the Flutter app:**
```bash
# Press 'r' in the terminal for hot reload
# Or press 'R' for hot restart
# Or stop (Ctrl+C) and run again: flutter run
```

### Common Flutter Issues

**Issue:** `No devices found`
```bash
# For web
flutter config --enable-web
flutter devices

# For Android
# Make sure Android Studio is installed
# Make sure USB debugging is enabled
```

**Issue:** `Waiting for another flutter command to release the startup lock`
```bash
# Kill all flutter processes
killall -9 dart flutter

# Then try again
flutter run -d chrome
```

**Issue:** `Error: No pubspec.yaml file found`
```bash
# Make sure you're in the right directory
cd /home/jambo/New_Traffic_Project/mobile_app
pwd  # Should show mobile_app directory

# Then run
flutter run
```

**Issue:** `Build failed` or compilation errors
```bash
cd /home/jambo/New_Traffic_Project/mobile_app

# Clean and rebuild
flutter clean
flutter pub get
flutter run -d chrome
```

---

## 🔍 Verify All Services are Running

### Quick Check Commands

```bash
# 1. Database
docker ps | grep trafficguard_db
# ✅ Should show container running

# 2. Backend
curl -s http://localhost:3000/health | jq
# ✅ Should return: {"success":true,...}

# 3. AI Service
curl -s http://localhost:8000/health | jq
# ✅ Should return: {"status":"healthy","model_loaded":true}

# 4. Frontend
curl -s http://localhost:3001 | head -20
# ✅ Should return HTML content

# 5. Mobile App
# Check if Flutter app is visible in your browser/emulator
```

### Port Summary

| Service | Port | URL |
|---------|------|-----|
| Database | 5432 | localhost:5432 |
| Backend | 3000 | http://localhost:3000 |
| AI Service | 8000 | http://localhost:8000 |
| Frontend | 3001 | http://localhost:3001 |
| Mobile (Chrome) | Auto | Opens in browser |

---

## 🧪 Test the Complete System

### 1. Test Backend Emergency Endpoint

```bash
curl -X POST http://localhost:3000/api/emergency \
  -H "Content-Type: application/json" \
  -d '{
    "emergencyType": "accident",
    "severity": "high",
    "locationName": "Test Location",
    "latitude": 0.3163,
    "longitude": 32.5822,
    "description": "Test emergency from manual setup",
    "casualtiesCount": 1,
    "vehiclesInvolved": 2,
    "servicesNeeded": ["police", "ambulance"],
    "contactPhone": "+256700123456"
  }'
```

**Expected:** 
```json
{
  "success": true,
  "message": "Emergency reported successfully...",
  "data": {
    "id": 8,
    "emergency_type": "accident",
    ...
  }
}
```

### 2. Test Frontend

1. **Open:** http://localhost:3001
2. **Click:** "Emergency" or navigate to emergency section
3. **Fill form** and submit
4. **Verify:** Emergency appears in database

### 3. Test Mobile App

1. **Open Flutter app** in Chrome/emulator/device
2. **Tap:** Red "Report Emergency" card
3. **Fill form:**
   - Type: Accident
   - Severity: High
   - Services: Police + Ambulance
   - Get GPS location
   - Fill description and phone
4. **Submit**
5. **Verify:** Success dialog appears with emergency ID

### 4. Test Real-Time Notifications

1. **Keep Frontend open** at http://localhost:3001
2. **Submit emergency** from mobile app
3. **Watch Frontend:** Notification should appear automatically (no refresh needed)

---

## 🛑 Stop All Services

### Stop Each Service

**Terminal 1 (Database):**
```bash
# Press Ctrl+C to stop
# Then remove container
docker-compose down
```

**Terminal 2 (Backend):**
```bash
# Press Ctrl+C to stop
```

**Terminal 3 (AI Service):**
```bash
# Press Ctrl+C to stop
# Deactivate virtual environment
deactivate
```

**Terminal 4 (Frontend):**
```bash
# Press Ctrl+C to stop
```

**Terminal 5 (Mobile App):**
```bash
# Press 'q' to quit
# Or Ctrl+C to stop
```

### Quick Stop All (One Command)

```bash
cd /home/jambo/New_Traffic_Project
./stop_all_services.sh
```

---

## 📝 Terminal Layout Recommendation

### Using Terminator (Split Screen)

```
┌─────────────────────────────────────────┐
│  Terminal 1: Database  │  Terminal 2:   │
│  (docker-compose up)   │  Backend       │
│                        │  (npm start)   │
├─────────────────────────────────────────┤
│  Terminal 3: AI        │  Terminal 4:   │
│  (python main.py)      │  Frontend      │
│                        │  (npm start)   │
├─────────────────────────────────────────┤
│  Terminal 5: Mobile App (flutter run)   │
│                                          │
└─────────────────────────────────────────┘
```

### Using Tmux (Terminal Multiplexer)

```bash
# Start tmux session
tmux new -s trafficguard

# Split horizontally (Ctrl+b then ")
# Split vertically (Ctrl+b then %)
# Navigate between panes (Ctrl+b then arrow keys)

# Pane 1: Database
docker-compose up database

# Pane 2: Backend (Ctrl+b then %)
cd backend && npm start

# Pane 3: AI Service (Ctrl+b then ")
cd ai_service && source venv/bin/activate && python main.py

# Pane 4: Frontend (Ctrl+b then %)
cd trafficguard-react && PORT=3001 npm start

# Pane 5: Mobile (Ctrl+b then ")
cd mobile_app && flutter run -d chrome
```

---

## 🔧 Environment Setup (First Time)

### Backend Environment

```bash
# Create .env file
cd /home/jambo/New_Traffic_Project/backend
nano .env
```

Paste:
```env
NODE_ENV=development
PORT=3000

# Database
DB_HOST=localhost
DB_PORT=5432
DB_NAME=trafficguard
DB_USER=trafficguard_user
DB_PASSWORD=trafficguard_pass_123

# JWT
JWT_SECRET=your_secret_key_change_in_production

# AI Service
AI_SERVICE_URL=http://localhost:8000
```

### Frontend Environment

```bash
# Create .env file
cd /home/jambo/New_Traffic_Project/trafficguard-react
nano .env
```

Paste:
```env
REACT_APP_API_URL=http://localhost:3000
REACT_APP_WS_URL=http://localhost:3000
REACT_APP_GOOGLE_MAPS_API_KEY=your_key_here
```

---

## 📚 Quick Reference

### Start All Services (Manual)

```bash
# Terminal 1
cd /home/jambo/New_Traffic_Project && docker-compose up database

# Terminal 2
cd /home/jambo/New_Traffic_Project/backend && npm start

# Terminal 3
cd /home/jambo/New_Traffic_Project/ai_service && source venv/bin/activate && python main.py

# Terminal 4
cd /home/jambo/New_Traffic_Project/trafficguard-react && PORT=3001 npm start

# Terminal 5
cd /home/jambo/New_Traffic_Project/mobile_app && flutter run -d chrome
```

### Health Check All

```bash
# One-liner to check all services
echo "Database:" && docker ps | grep trafficguard_db && \
echo "Backend:" && curl -s http://localhost:3000/health | jq .success && \
echo "AI Service:" && curl -s http://localhost:8000/health | jq .status && \
echo "Frontend:" && curl -s http://localhost:3001 > /dev/null && echo "Running" || echo "Not running"
```

### View All Logs

```bash
# In separate terminal
tail -f /home/jambo/New_Traffic_Project/backend.log &
tail -f /home/jambo/New_Traffic_Project/ai_service.log &
tail -f /home/jambo/New_Traffic_Project/frontend.log &
docker logs -f trafficguard_db
```

---

## 🎯 Success Checklist

After starting all services, verify:

- [ ] Database container running (`docker ps`)
- [ ] Backend responds at http://localhost:3000/health
- [ ] AI service responds at http://localhost:8000/health
- [ ] Frontend opens in browser at http://localhost:3001
- [ ] Mobile app running in Chrome/emulator/device
- [ ] No errors in any terminal
- [ ] Can submit emergency from mobile app
- [ ] Emergency appears in database
- [ ] Real-time notifications working on frontend

---

**🎉 You're all set! All services should be running successfully!**

Need help? Check the logs in each terminal window for error messages.
