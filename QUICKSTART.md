# 🚀 TrafficGuard AI - Quick Start Guide

## Prerequisites

- **Node.js** 16+
- **Python** 3.8+  
- **Flutter** 3.0+
- **PostgreSQL** 14+ (or use Docker)
- **Docker** & **Docker Compose** (recommended)

## Option 1: Docker Compose (Recommended)

```bash
# Start all services
./start_development.sh

# Or directly:
docker-compose up -d

# View logs
docker-compose logs -f

# Stop
docker-compose down
```

**Services will be available at:**
- Backend API: http://localhost:3000
- AI Service: http://localhost:8000
- Database: localhost:5432

## Option 2: Manual Setup

### 1. Database

```bash
# Install PostgreSQL with PostGIS
sudo apt-get install postgresql postgis

# Create database
sudo -u postgres psql
CREATE DATABASE trafficguard;
CREATE USER trafficguard_user WITH PASSWORD 'your_password';
GRANT ALL PRIVILEGES ON DATABASE trafficguard TO trafficguard_user;
\q

# Initialize schema
psql -U trafficguard_user -d trafficguard -f database/schema.sql
```

### 2. Backend API

```bash
cd backend
cp .env.example .env
# Edit .env with your database credentials
npm install
npm run dev
```

Backend runs on http://localhost:3000

### 3. AI Service

```bash
cd ai_service
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate
pip install -r requirements.txt
python main.py
```

AI service runs on http://localhost:8000

### 4. Mobile App

```bash
cd mobile_app
flutter pub get

# Edit lib/config/app_config.dart with your backend URL
# For Android emulator: http://10.0.2.2:3000
# For iOS simulator: http://localhost:3000
# For real device: http://YOUR_COMPUTER_IP:3000

flutter run
```

## Testing the System

### 1. Test Backend API

```bash
# Health check
curl http://localhost:3000/health

# Register user
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"test123","fullName":"Test User"}'

# Login
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"test123"}'
```

### 2. Test AI Service

```bash
# Health check
curl http://localhost:8000/health

# Analyze video (requires video file)
curl -X POST http://localhost:8000/ai/analyze-traffic \
  -F "video=@test_video.mp4"
```

### 3. Test Mobile App

1. Launch app on emulator/device
2. Login or continue as guest
3. View nearby incidents on home screen
4. Tap "Report Incident" to test video capture
5. Fill form and submit

## Default Users

| Email | Password | Role |
|-------|----------|------|
| admin@trafficguard.ai | admin123 | admin |
| officer@trafficguard.ai | police123 | police |

**⚠️ CHANGE THESE PASSWORDS IN PRODUCTION!**

## Troubleshooting

**Backend won't start:**
- Check PostgreSQL is running
- Verify database credentials in .env
- Ensure port 3000 is available

**AI service errors:**
- Install system dependencies: `libgl1-mesa-glx libglib2.0-0`
- YOLOv8 model will auto-download on first run

**Mobile app can't connect:**
- Check backend URL in app_config.dart
- Ensure backend is running
- For real devices, use computer's IP address
- Check firewall settings

**Database connection fails:**
- Ensure PostgreSQL is running
- Check connection string format
- Verify PostGIS extension is installed

## Next Steps

1. ✅ Configure Google Maps API key for mobile app
2. ✅ Add real traffic videos for testing
3. ✅ Deploy to production server
4. ✅ Set up monitoring and logging
5. ✅ Implement push notifications

## Documentation

- [Main README](README.md) - Project overview
- [Backend README](backend/README.md) - API documentation
- [AI Service README](ai_service/README.md) - AI configuration
- [Mobile App README](mobile_app/README.md) - Mobile setup
- [Database README](database/README.md) - Database queries

## Support

For issues, check the respective component READMEs or the main documentation.

---

**Built with ❤️ for Kigali's Traffic Management**
