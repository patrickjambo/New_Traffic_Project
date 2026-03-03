# Emergency Siren Sound Setup

## Option 1: Download a Free Police/Ambulance Siren Sound

Download a free emergency siren sound from one of these sources:

1. **Pixabay** (Free, no attribution required):
   - https://pixabay.com/sound-effects/search/police%20siren/
   - https://pixabay.com/sound-effects/search/ambulance/

2. **FreeSound.org** (Free with attribution):
   - https://freesound.org/search/?q=police+siren

3. **Zapsplat** (Free with account):
   - https://www.zapsplat.com/sound-effect-category/police-sirens/

## Option 2: Use This Default Sound

If you don't add a custom sound, the app will use rapid system alert sounds
which still creates an alarm-like effect.

## How to Add the Sound

1. Download an MP3 siren file (keep it under 500KB for quick loading)
2. Rename it to `emergency_siren.mp3`
3. Place it in this folder: `assets/sounds/emergency_siren.mp3`

## Recommended Sound Characteristics

- **Duration**: 3-5 seconds (will loop)
- **Format**: MP3
- **Size**: Under 500KB
- **Type**: Police siren, ambulance siren, or emergency tone

## Already Configured

The app is already configured to:
- Look for `assets/sounds/emergency_siren.mp3`
- Fall back to system alert sounds if not found
- Play the sound on loop until acknowledged
- Override user notification preferences for emergencies
