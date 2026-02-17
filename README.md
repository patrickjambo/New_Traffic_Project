# 🚦 TrafficGuard AI - Smart Traffic Management Platform

[![Version](https://img.shields.io/badge/version-1.0.0-blue.svg)](https://github.com)
[![License](https://img.shields.io/badge/license-MIT-green.svg)](LICENSE)

## 📋 Overview

TrafficGuard AI is a real-time traffic incident detection and management system designed for Kigali. The platform leverages AI-powered video analysis to automatically detect traffic incidents and provides a comprehensive mobile application for public reporting and police management.

### Key Features

- 🤖 **AI-Powered Detection**: YOLOv8-based traffic analysis
- 📱 **Cross-Platform Mobile App**: Flutter app for iOS & Android
- 🗺️ **Real-Time Maps**: Live traffic incident visualization
- 🔄 **Offline Support**: Report incidents without internet connection
- 👮‍♂️ **Role-Based Access**: Public, Police, and Admin roles
- ⚡ **Real-Time Updates**: WebSocket-based live notifications

## 🏗️ Architecture

```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   Mobile App    │───▶│   Backend API    │───▶│   AI Processor  │
│   (Flutter)     │    │   (Node.js)      │    │   (Python)      │
└─────────────────┘    └──────────────────┘    └─────────────────┘
         │                      │                       │
         │                      ▼                       ▼
         │              ┌─────────────────┐    ┌─────────────────┐
         └──────────────▶│   PostgreSQL   │    │   Redis Cache   │
                        │   Database     │    │   (Optional)    │
                        └─────────────────┘    └─────────────────┘
```

## 📁 Project Structure

```
New_Traffic_Project/
├── mobile_app/          # Flutter mobile application
├── backend/             # Node.js Express API server
├── ai_service/          # Python FastAPI AI processor
├── database/            # SQL schemas and migrations
├── docs/                # Documentation
└── README.md
```

## 🚀 Quick Start

### Prerequisites

- **Node.js** 16+ and npm
- **Python** 3.8+ with pip
- **Flutter** 3.0+
- **PostgreSQL** 14+
- **Git**

### Installation

1. **Clone the repository**
```bash
git clone <repository-url>
cd New_Traffic_Project
```

2. **Set up the database**
```bash
cd database
psql -U postgres -f schema.sql
```

3. **Start the backend**
```bash
cd backend
npm install
cp .env.example .env
# Edit .env with your configuration
npm run dev
```

4. **Start the AI service**
```bash
cd ai_service
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
pip install -r requirements.txt
uvicorn main:app --reload
```

5. **Run the mobile app**
```bash
cd mobile_app
flutter pub get
flutter run
```

## 🔧 Configuration

### Environment Variables

**Backend (.env)**:
```env
PORT=3000
DATABASE_URL=postgresql://user:password@localhost:5432/trafficguard
JWT_SECRET=your-secret-key
AI_SERVICE_URL=http://localhost:8000
```

**AI Service (.env)**:
```env
MODEL_PATH=./models/yolov8n.pt
MAX_VIDEO_DURATION=30
FRAME_SKIP=5
```

**Mobile App**:
Edit `lib/config/app_config.dart` with your API endpoints and Google Maps API key.

## 📱 User Roles

- **Public Users**: Report incidents, view traffic status
- **Police Officers**: Verify incidents, update status, manage resources
- **Administrators**: Full system access, analytics, user management

## 🧪 Testing

```bash
# Backend tests
cd backend && npm test

# AI service tests
cd ai_service && pytest

# Mobile app tests
cd mobile_app && flutter test
```

## 📊 API Documentation

Once the backend is running, visit:
- Swagger UI: `http://localhost:3000/api-docs`
- API Health: `http://localhost:3000/health`

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Commit your changes
4. Push to the branch
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 👥 Team

TrafficGuard AI - Smart Traffic Management for Kigali

## 📞 Support

For support, email support@trafficguard.ai or open an issue.

---

## 🚀 Lightweight Local Setup (No Docker!)

### Quick Start

```bash
# Start all services
./start_local.sh

# Check status  
./status.sh

# Stop all services
./stop_local.sh
```

### Service Ports

| Service | Port | URL |
|---------|------|-----|
| PostgreSQL | 5432 | localhost |
| Backend API | 3000 | http://localhost:3000 |
| AI Service | 8000 | http://localhost:8000 |
| Dashboard | 5176 | http://localhost:5176 |

### Manual Setup

**Backend:**
```bash
cd backend && npm install && npm run dev
```

**AI Service:**
```bash
cd ai_service
python3 -m venv venv && source venv/bin/activate
pip install -r requirements-light.txt
uvicorn main_light:app --port 8000 --reload
```

**Frontend:**
```bash
cd government-dashboard && npm install && npm run dev
```

### Database Setup

```bash
sudo systemctl start postgresql
sudo -u postgres psql -c "CREATE USER trafficguard_user WITH PASSWORD 'trafficguard_pass_123';"
sudo -u postgres psql -c "CREATE DATABASE trafficguard OWNER trafficguard_user;"
sudo -u postgres psql -d trafficguard -f database/schema.pgsql
```
