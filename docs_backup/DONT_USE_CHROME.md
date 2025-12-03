# ⚠️ IMPORTANT: Don't Run Flutter App on Chrome!

## ❌ THIS WON'T WORK:
```bash
flutter run -d chrome  # ❌ DON'T DO THIS!
```

**Why?**
- Camera doesn't work in web browsers for video recording
- Firebase Messaging Web has compatibility issues
- Background services don't work
- GPS/Location less accurate

## ✅ CORRECT WAY:

### 1. Connect Android Phone via USB
```bash
# Enable USB debugging on phone
# Settings → About → Tap Build Number 7 times → Developer Options → USB Debugging

# Verify phone is connected
flutter devices
```

### 2. Run on Physical Device
```bash
cd /home/jambo/New_Traffic_Project/mobile_app

# Find your device
flutter devices

# Run on device (NOT chrome!)
flutter run -d <your-device-id>
```

**Example:**
```bash
flutter devices
# Output: Pixel 6 (mobile) • 1A2B3C4D

flutter run -d 1A2B3C4D  # ✅ THIS IS CORRECT!
```

---

## 🔧 I Fixed the Errors

I already fixed the compilation errors you saw:
- ✅ Fixed null safety issues in `auto_monitor_screen.dart`
- ✅ Fixed const color issue in `fcm_service.dart`
- ✅ App will now compile successfully on Android device

---

## 📚 Complete Guides Available:

1. **`RUN_ON_MOBILE_DEVICE.md`** - How to run on Android/iOS
2. **`TESTING_ON_PHYSICAL_DEVICES.md`** - Complete 600-line testing guide
3. **`MOBILE_OFFLINE_CAPABILITY_ANALYSIS.md`** - Offline features

---

## 🎯 Next Steps:

1. ✅ Fixed compilation errors
2. ✅ Connect Android phone via USB
3. ✅ Run: `flutter run -d <device-id>` (NOT chrome!)
4. ✅ Test on real Kigali streets

**You're ready to test on a real device! 📱🇷🇼**
