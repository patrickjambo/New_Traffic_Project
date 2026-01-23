#!/bin/bash

# Firebase Setup Helper Script
# Run this after downloading files from Firebase Console

echo "🔥 Firebase Setup Helper"
echo "========================"
echo ""

# Check for service account file
SERVICE_ACCOUNT_PATH="$HOME/New_Traffic_Project/backend/config/firebase-service-account.json"
GOOGLE_SERVICES_PATH="$HOME/New_Traffic_Project/mobile_app/android/app/google-services.json"

echo "📋 Checklist:"
echo ""

# Check backend service account
if [ -f "$SERVICE_ACCOUNT_PATH" ]; then
    echo "✅ Backend service account found: $SERVICE_ACCOUNT_PATH"
else
    echo "❌ Missing: Backend service account"
    echo "   Download from: https://console.firebase.google.com/project/traffic-fbecb/settings/serviceaccounts/adminsdk"
    echo "   Save to: $SERVICE_ACCOUNT_PATH"
fi

echo ""

# Check Android google-services.json
if [ -f "$GOOGLE_SERVICES_PATH" ]; then
    echo "✅ Android google-services.json found: $GOOGLE_SERVICES_PATH"
else
    echo "❌ Missing: Android google-services.json"
    echo "   1. Go to: https://console.firebase.google.com/project/traffic-fbecb/settings/general"
    echo "   2. Add Android app with package: ai.trafficguard.trafficguard_mobile"
    echo "   3. Download google-services.json"
    echo "   Save to: $GOOGLE_SERVICES_PATH"
fi

echo ""
echo "========================"

# If both files exist, verify
if [ -f "$SERVICE_ACCOUNT_PATH" ] && [ -f "$GOOGLE_SERVICES_PATH" ]; then
    echo "🎉 All Firebase files are in place!"
    echo ""
    echo "Next steps:"
    echo "1. Restart the backend: cd ~/New_Traffic_Project/backend && npm start"
    echo "2. Rebuild Flutter app: cd ~/New_Traffic_Project/mobile_app && flutter build apk"
    echo ""
    echo "✅ FCM Push Notifications will be enabled!"
else
    echo "⚠️  Some files are missing. Please download them from Firebase Console."
fi
