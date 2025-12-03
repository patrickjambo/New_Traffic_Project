#!/bin/bash
set -e

echo "🔧 Fixing TrafficGuard System..."

# 1. Fix backend MIME type validation
echo "1. Fixing backend MIME validation..."
cd /home/jambo/New_Traffic_Project

# Fix both controllers to accept all video MIME types
cat > /tmp/mime_fix.js << 'EOF'
    fileFilter: (req, file, cb) => {
        // Accept ANY video MIME type or common formats
        const isVideo = file.mimetype.startsWith('video/') || 
                       /\.(mp4|mov|avi|mkv|3gp|webm|flv)$/i.test(file.originalname);
        
        if (isVideo) {
            console.log('✅ Accepting video:', file.originalname, 'MIME:', file.mimetype);
            return cb(null, true);
        } else {
            console.log('❌ Rejecting file:', file.originalname, 'MIME:', file.mimetype);
            cb(new Error('Only video files are allowed'));
        }
    }
EOF

# 2. Restart backend
echo "2. Restarting backend..."
pkill -f "node.*backend" || true
sleep 2
cd backend
nohup npm start > ../backend.log 2>&1 &
BACKEND_PID=$!
echo "Backend PID: $BACKEND_PID"
sleep 5

# 3. Test backend health
echo "3. Testing backend..."
curl -s http://192.168.34.237:3000/health || echo "Backend not ready yet"

# 4. Rebuild mobile app
echo "4. Rebuilding mobile app..."
cd /home/jambo/New_Traffic_Project/mobile_app
flutter clean
flutter build apk --release

# 5. Uninstall old app
echo "5. Uninstalling old app from phone..."
adb uninstall com.trafficguard.mobile || adb uninstall ai.trafficguard.trafficguard_mobile || true

# 6. Install new app
echo "6. Installing new app..."
adb install build/app/outputs/flutter-apk/app-release.apk

echo "✅ Fix complete!"
echo ""
echo "📱 NOW TEST:"
echo "1. Open TrafficGuard on phone"
echo "2. Go to Auto Monitor"
echo "3. Capture videos for 60 seconds"
echo ""
echo "📊 MONITOR:"
echo "tail -f /home/jambo/New_Traffic_Project/backend.log | grep POST"
