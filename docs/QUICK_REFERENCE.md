# TrafficGuard AI - Quick Reference Guide

## System Overview

| Component | Technology | Port | Purpose |
|-----------|------------|------|---------|
| **Backend** | Node.js/Express | 3000 | REST API, Authentication |
| **AI Service** | Python/FastAPI | 8000 | Video Analysis |
| **Database** | PostgreSQL | 5432 | Data Storage |
| **Mobile App** | Flutter/Dart | - | Police Interface |
| **Dashboard** | React.js | 3001 | Government Monitoring |

---

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                    TRAFFICGUARD AI                          │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│   ┌─────────────┐      ┌─────────────┐                     │
│   │ Mobile App  │      │  Dashboard  │                     │
│   │  (Flutter)  │      │  (React)    │                     │
│   └──────┬──────┘      └──────┬──────┘                     │
│          │                    │                             │
│          └────────┬───────────┘                             │
│                   │                                         │
│                   ▼                                         │
│          ┌───────────────┐                                  │
│          │   Backend     │                                  │
│          │  (Node.js)    │◄──────────────┐                  │
│          │   :3000       │               │                  │
│          └───────┬───────┘               │                  │
│                  │                       │                  │
│         ┌────────┼────────┐              │                  │
│         │        │        │              │                  │
│         ▼        ▼        ▼              │                  │
│  ┌──────────┐ ┌──────┐ ┌─────────┐       │                  │
│  │PostgreSQL│ │Upload│ │   AI    │───────┘                  │
│  │  :5432   │ │Files │ │ :8000   │                          │
│  └──────────┘ └──────┘ └─────────┘                          │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

## Technology Stack Summary

### Backend (Node.js)
```
├── Express.js     → REST API Framework
├── pg             → PostgreSQL Client
├── jsonwebtoken   → JWT Authentication
├── bcryptjs       → Password Hashing
├── multer         → File Upload
├── ws             → WebSocket Server
├── axios          → HTTP Client
└── cors           → Cross-Origin Support
```

### AI Service (Python)
```
├── FastAPI        → API Framework
├── uvicorn        → ASGI Server
├── OpenCV         → Video Processing
├── NumPy          → Numerical Computing
├── Pillow         → Image Processing
└── python-multipart → File Handling
```

### Mobile App (Flutter)
```
├── dio            → HTTP Client
├── google_maps_flutter → Maps Integration
├── geolocator     → GPS Location
├── camera         → Video Capture
├── provider       → State Management
├── shared_preferences → Local Storage
└── firebase_messaging → Push Notifications
```

### Database (PostgreSQL)
```
├── users          → User accounts
├── incidents      → Traffic incidents
├── incident_alerts → Notifications
├── traffic_data   → Real-time traffic
├── camera_feeds   → Camera info
└── user_sessions  → Active sessions
```

---

## Development Methodology

### Agile Framework
- **Sprint Duration**: 2 weeks
- **Ceremonies**: Daily standup, Sprint planning, Retrospective
- **Tools**: Git for version control, GitHub for collaboration

### Git Workflow
```
main
 └── develop
      ├── feature/auth
      ├── feature/incidents
      └── feature/ai-analysis
```

### Commit Convention
```
feat(scope): description    # New feature
fix(scope): description     # Bug fix
docs(scope): description    # Documentation
test(scope): description    # Tests
```

---

## Quick Start Commands

### Start All Services
```bash
# Using Docker
docker-compose up -d

# Manual start
cd backend && npm start &
cd ai_service && python main.py &
```

### Build Mobile App
```bash
cd mobile_app
flutter pub get
flutter build apk --release
```

### Install on Phone
```bash
adb install -r mobile_app/build/app/outputs/flutter-apk/app-release.apk
```

---

## API Endpoints

### Authentication
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/login` | Login |
| POST | `/api/auth/register` | Register |

### Incidents
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/incidents` | List all |
| POST | `/api/incidents` | Create new |
| GET | `/api/incidents/:id` | Get by ID |

### Detection
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/detect` | Upload video |

### AI Service
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/ai/analyze-traffic` | Analyze video |
| GET | `/health` | Health check |

---

## Test Credentials

| Role | Email | Password |
|------|-------|----------|
| Police | officer@trafficguard.ai | password123 |
| Admin | admin@trafficguard.ai | admin123 |

---

## Configuration Files

| File | Purpose |
|------|---------|
| `backend/.env` | Backend environment |
| `mobile_app/lib/config/environment.dart` | Mobile API config |
| `docker-compose.yml` | Container orchestration |
| `ai_service/requirements.txt` | Python dependencies |
| `mobile_app/pubspec.yaml` | Flutter dependencies |

---

## Troubleshooting

### Connection Refused
```bash
# Check services
curl http://localhost:3000/api/health
curl http://localhost:8000/health

# Check IP address
hostname -I
```

### Mobile App IP Change
Update `mobile_app/lib/config/environment.dart`:
```dart
static const String serverIP = 'NEW_IP_HERE';
```
Then rebuild APK.

### Database Connection
```bash
psql -U trafficguard_user -d trafficguard -h localhost
```

---

## Key Features

1. ✅ **Real-time Incident Detection** - AI-powered video analysis
2. ✅ **Mobile Reporting** - Police capture & upload
3. ✅ **Live Dashboard** - Government monitoring
4. ✅ **Push Notifications** - Instant alerts
5. ✅ **Traffic Analytics** - Historical data
6. ✅ **Google Maps Integration** - Visual incident tracking

---

*TrafficGuard AI v2.3 - Kigali, Rwanda*
