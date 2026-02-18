#!/bin/bash
# Script to download Rwanda traffic images for homepage
# Run this script from the project root

cd /home/jambo/New_Traffic_Project/government-dashboard/public/assets/hero

echo "Downloading Rwanda traffic images..."

# Image 1: Traffic police at bus lane in Kigali
curl -L -o traffic-police-kigali.jpg "https://www.newtimes.co.rw/sites/default/files/styles/large/public/main/articles/2023/03/28/traffic.jpg" 2>/dev/null || \
curl -L -o traffic-police-kigali.jpg "https://ktpress.rw/wp-content/uploads/2019/08/Traffic-1.jpg" 2>/dev/null || \
echo "Please manually save image 1 as: traffic-police-kigali.jpg"

# Image 2: Night traffic in Kigali
curl -L -o kigali-night-traffic.jpg "https://www.newtimes.co.rw/sites/default/files/styles/large/public/main/articles/2023/01/15/kigali-traffic.jpg" 2>/dev/null || \
echo "Please manually save image 2 as: kigali-night-traffic.jpg"

# Image 3: Road accident (truck)
curl -L -o road-accident.jpg "https://www.ktpress.rw/wp-content/uploads/2022/05/accident.jpg" 2>/dev/null || \
echo "Please manually save image 3 as: road-accident.jpg"

# Image 4: Bus accident with emergency response
echo "Please manually save image 4 as: bus-accident-response.jpg"

# Image 5: RNP Fire Brigade
curl -L -o rnp-fire-brigade.jpg "https://www.police.gov.rw/fileadmin/user_upload/fire_brigade.jpg" 2>/dev/null || \
echo "Please manually save image 5 as: rnp-fire-brigade.jpg"

# Image 6: Firefighter in action
echo "Please manually save image 6 as: firefighter-action.jpg"

echo ""
echo "Images location: /home/jambo/New_Traffic_Project/government-dashboard/public/assets/hero/"
echo ""
ls -la *.jpg 2>/dev/null || echo "No images downloaded yet - please add manually"
