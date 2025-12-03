#!/bin/bash
set -e

echo "🔧 FIXING ALL ISSUES..."

# 1. Kill old backend
echo "1. Stopping old backend..."
pkill -f "node.*backend" || true
sleep 2

# 2. Start new backend with fixed MIME validation
echo "2. Starting backend with fixed video validation..."
cd /home/jambo/New_Traffic_Project/backend
nohup npm start > ../backend.log 2>&1 &
BACKEND_PID=$!
echo "   Backend PID: $BACKEND_PID"
sleep 5

# 3. Test backend health
echo "3. Testing backend..."
curl -s http://192.168.34.237:3000/health

# 4. Rebuild mobile app
echo "4. Rebuilding mobile app..."
cd /home/jambo/New_Traffic_Project/mobile_app
flutter clean
flutter build apk --release

# 5. Uninstall old app
echo "5. Uninstalling old app from phone..."
adb uninstall ai.trafficguard.trafficguard_mobile || true

# 6. Install new app
echo "6. Installing fixed app..."
adb install build/app/outputs/flutter-apk/app-release.apk

echo ""
echo "✅ ALL FIXES APPLIED!"
echo ""
echo "NOW TEST:"
echo "1. Open app on phone"
echo "2. Go to Auto Monitor"
echo "3. Run for 60 seconds"
echo ""
echo "Monitor logs:"
echo "tail -f /home/jambo/New_Traffic_Project/backend.log | grep POST"
