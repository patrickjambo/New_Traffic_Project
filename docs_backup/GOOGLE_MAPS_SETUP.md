# 🗺️ Google Maps API Key Setup for TrafficGuard
## Kigali, Rwanda - Mobile App

---

## ✅ QUICK SETUP (5 minutes)

### Step 1: Go to Google Cloud Console
1. Open: https://console.cloud.google.com/
2. Sign in with your Google account

### Step 2: Create Project
1. Click "Select a project" (top left)
2. Click "NEW PROJECT"
3. Name: **TrafficGuard-Kigali**
4. Click "CREATE"

### Step 3: Enable Maps SDK
1. Go to: https://console.cloud.google.com/apis/library
2. Search: **"Maps SDK for Android"**
3. Click on it
4. Click **"ENABLE"**

### Step 4: Create API Key
1. Go to: https://console.cloud.google.com/apis/credentials
2. Click **"CREATE CREDENTIALS"**
3. Select **"API Key"**
4. Copy the API key (looks like: `AIzaSyD...`)

### Step 5: Restrict API Key (IMPORTANT for security)
1. Click "RESTRICT KEY"
2. Under "Application restrictions":
   - Select **"Android apps"**
3. Click "ADD AN ITEM"
   - Package name: `ai.trafficguard.trafficguard_mobile`
   - SHA-1: Get it by running this command:
     ```bash
     keytool -list -v -keystore ~/.android/debug.keystore -alias androiddebugkey -storepass android -keypass android
     ```
   - Copy the SHA-1 certificate fingerprint
4. Under "API restrictions":
   - Select **"Restrict key"**
   - Check: **Maps SDK for Android**
5. Click **"SAVE"**

### Step 6: Add to Mobile App
1. Open file: `mobile_app/lib/config/app_config.dart`
2. Replace line 10:
   ```dart
   static const String googleMapsApiKey = 'YOUR_ACTUAL_API_KEY_HERE';
   ```

3. Open file: `mobile_app/android/app/src/main/AndroidManifest.xml`
4. Find line with `com.google.android.geo.API_KEY`
5. Replace:
   ```xml
   android:value="YOUR_ACTUAL_API_KEY_HERE"/>
   ```

### Step 7: Rebuild App
```bash
cd /home/jambo/New_Traffic_Project/mobile_app
flutter clean
flutter build apk --release
adb install build/app/outputs/flutter-apk/app-release.apk
```

---

## 💰 PRICING (FREE Tier)

Google Maps is **FREE** for:
- ✅ Up to 28,000 map loads per month
- ✅ Up to 40,000 directions requests per month
- ✅ Perfect for Kigali city deployment

**Cost:** $0/month for normal usage

---

## 🗺️ What You'll Get

With Google Maps enabled:
- ✅ See incidents on Kigali map
- ✅ Navigate to incident locations
- ✅ Satellite view of traffic situations
- ✅ Street view of Kigali roads
- ✅ Real-time traffic layer

---

## ⚠️ Without Google Maps

The app will still work but with limited features:
- ✅ GPS coordinates captured
- ✅ Incidents detected and reported
- ✅ Emergency services alerted
- ❌ No map visualization (just coordinates)

---

## 🚀 Quick Test After Setup

1. Open TrafficGuard app
2. Go to "View Incidents"
3. You should see a Google Map centered on Kigali
4. Incidents appear as markers on the map

---

## 📝 Files Modified

1. ✅ `mobile_app/lib/config/app_config.dart` - Ready for API key
2. ✅ `mobile_app/android/app/src/main/AndroidManifest.xml` - Configured

---

## 🔐 Security Note

- ✅ Always restrict API keys to your Android package
- ✅ Add SHA-1 fingerprint restriction
- ✅ Never commit API keys to public GitHub repos
- ✅ Use environment variables for production

---

## ✅ Current Status

- ✅ AndroidManifest.xml configured with placeholder
- ✅ app_config.dart ready for API key
- ⏳ Waiting for your Google Maps API key

**Get your API key and add it to the 2 files above, then rebuild!**

---

## 🌍 Kigali Map Center

Default coordinates in app:
- **Latitude:** -1.9536
- **Longitude:** 30.0606
- **Location:** Kigali City Center

Perfect for TrafficGuard deployment! 🇷🇼
