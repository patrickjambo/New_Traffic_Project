# TrafficGuard AI - Technical Documentation

## Complete System Architecture & Development Guide

**Version:** 2.3  
**Last Updated:** January 26, 2026  
**Project:** TrafficGuard AI - Intelligent Traffic Monitoring System  
**Location:** Kigali, Rwanda

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [System Architecture Overview](#2-system-architecture-overview)
3. [Development Methodology](#3-development-methodology)
4. [Technology Stack](#4-technology-stack)
5. [Backend Service](#5-backend-service)
6. [AI Service / Engine](#6-ai-service--engine)
7. [Database Layer](#7-database-layer)
8. [Mobile Application](#8-mobile-application)
9. [Government Dashboard (Frontend)](#9-government-dashboard-frontend)
10. [System Integration](#10-system-integration)
11. [API Documentation](#11-api-documentation)
12. [Deployment Guide](#12-deployment-guide)
13. [Security Implementation](#13-security-implementation)
14. [Testing Strategy](#14-testing-strategy)
15. [Performance Optimization](#15-performance-optimization)

---

## 1. Executive Summary

### 1.1 Project Overview

TrafficGuard AI is an intelligent traffic monitoring and incident detection system designed for Kigali, Rwanda. The system leverages artificial intelligence to analyze traffic camera feeds, detect incidents in real-time, and alert relevant authorities through a mobile application and government dashboard.

### 1.2 Key Features

- **Real-time Incident Detection**: AI-powered analysis of traffic video feeds
- **Mobile Reporting**: Police officers can capture and upload traffic incidents
- **Live Dashboard**: Government officials monitor traffic across Kigali
- **Automated Alerts**: Push notifications for critical incidents
- **Traffic Analytics**: Historical data analysis and pattern recognition
- **Multi-platform Support**: Android mobile app + Web dashboard

### 1.3 System Components

| Component | Technology | Purpose |
|-----------|------------|---------|
| Backend API | Node.js/Express | REST API, Authentication, Business Logic |
| AI Service | Python/FastAPI | Video Analysis, Incident Detection |
| Database | PostgreSQL | Data Persistence |
| Mobile App | Flutter/Dart | Police Officer Interface |
| Dashboard | React.js | Government Monitoring Interface |
| Containerization | Docker | Service Orchestration |

---

## 2. System Architecture Overview

### 2.1 High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           TRAFFICGUARD AI SYSTEM                            │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────────────────────┐  │
│  │  Mobile App  │    │  Web Dashboard│    │     Traffic Cameras          │  │
│  │  (Flutter)   │    │  (React.js)   │    │     (IP Cameras)             │  │
│  └──────┬───────┘    └──────┬───────┘    └──────────────┬───────────────┘  │
│         │                   │                           │                   │
│         │    HTTPS/WSS      │       HTTPS               │    RTSP          │
│         ▼                   ▼                           ▼                   │
│  ┌──────────────────────────────────────────────────────────────────────┐  │
│  │                        BACKEND API (Node.js/Express)                  │  │
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  │  │
│  │  │    Auth     │  │  Incidents  │  │   Alerts    │  │   Upload    │  │  │
│  │  │   Module    │  │   Module    │  │   Module    │  │   Module    │  │  │
│  │  └─────────────┘  └─────────────┘  └─────────────┘  └─────────────┘  │  │
│  └──────────────────────────────┬───────────────────────────────────────┘  │
│                                 │                                           │
│                    ┌────────────┼────────────┐                             │
│                    │            │            │                             │
│                    ▼            ▼            ▼                             │
│  ┌─────────────────────┐  ┌─────────────────────┐  ┌──────────────────┐   │
│  │   AI SERVICE        │  │     DATABASE        │  │   FILE STORAGE   │   │
│  │   (Python/FastAPI)  │  │   (PostgreSQL)      │  │   (Local/S3)     │   │
│  │                     │  │                     │  │                  │   │
│  │  ┌───────────────┐  │  │  ┌───────────────┐  │  │  ┌────────────┐  │   │
│  │  │ Traffic       │  │  │  │ Users         │  │  │  │ Videos     │  │   │
│  │  │ Analyzer      │  │  │  │ Incidents     │  │  │  │ Images     │  │   │
│  │  │ (OpenCV/YOLO) │  │  │  │ Alerts        │  │  │  │ Reports    │  │   │
│  │  └───────────────┘  │  │  │ Traffic Data  │  │  │  └────────────┘  │   │
│  └─────────────────────┘  │  └───────────────┘  │  └──────────────────┘   │
│                           └─────────────────────┘                          │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 2.2 Data Flow Diagram

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              DATA FLOW                                       │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  1. INCIDENT CAPTURE FLOW                                                   │
│  ┌──────────┐    ┌──────────┐    ┌──────────┐    ┌──────────┐              │
│  │ Officer  │───▶│ Mobile   │───▶│ Backend  │───▶│    AI    │              │
│  │ Records  │    │   App    │    │   API    │    │ Analysis │              │
│  └──────────┘    └──────────┘    └──────────┘    └────┬─────┘              │
│                                                       │                     │
│                  ┌──────────┐    ┌──────────┐    ┌────▼─────┐              │
│                  │Dashboard │◀───│  Alert   │◀───│ Database │              │
│                  │  Update  │    │  System  │    │  Store   │              │
│                  └──────────┘    └──────────┘    └──────────┘              │
│                                                                             │
│  2. REAL-TIME MONITORING FLOW                                               │
│  ┌──────────┐    ┌──────────┐    ┌──────────┐    ┌──────────┐              │
│  │ Traffic  │───▶│   AI     │───▶│ Backend  │───▶│WebSocket │              │
│  │ Camera   │    │ Service  │    │   API    │    │ Broadcast│              │
│  └──────────┘    └──────────┘    └──────────┘    └────┬─────┘              │
│                                                       │                     │
│                  ┌──────────┐                    ┌────▼─────┐              │
│                  │ Mobile + │◀───────────────────│  Clients │              │
│                  │Dashboard │                    │ Receive  │              │
│                  └──────────┘                    └──────────┘              │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 2.3 Network Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                    NETWORK TOPOLOGY                              │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  EXTERNAL NETWORK (Internet/WiFi)                               │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │                                                         │   │
│  │  ┌─────────────┐        ┌─────────────┐                │   │
│  │  │ Mobile App  │        │ Web Browser │                │   │
│  │  │ (Android)   │        │ (Dashboard) │                │   │
│  │  └──────┬──────┘        └──────┬──────┘                │   │
│  │         │                      │                        │   │
│  └─────────┼──────────────────────┼────────────────────────┘   │
│            │                      │                             │
│            │    WiFi Network      │                             │
│            │  192.168.x.x/24      │                             │
│            ▼                      ▼                             │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │                   SERVER (Development)                   │   │
│  │                   IP: 192.168.32.146                     │   │
│  │  ┌─────────────────────────────────────────────────┐    │   │
│  │  │ Docker Network (trafficguard_network)           │    │   │
│  │  │                                                 │    │   │
│  │  │  ┌───────────┐ ┌───────────┐ ┌───────────┐     │    │   │
│  │  │  │ Backend   │ │ AI Service│ │ PostgreSQL│     │    │   │
│  │  │  │ :3000     │ │ :8000     │ │ :5432     │     │    │   │
│  │  │  └───────────┘ └───────────┘ └───────────┘     │    │   │
│  │  │                                                 │    │   │
│  │  └─────────────────────────────────────────────────┘    │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## 3. Development Methodology

### 3.1 Agile Methodology

The TrafficGuard project follows **Agile Software Development** methodology with the following practices:

#### Sprint Structure
- **Sprint Duration**: 2 weeks
- **Daily Standups**: 15-minute sync meetings
- **Sprint Planning**: Beginning of each sprint
- **Sprint Review**: End of sprint demonstration
- **Retrospective**: Process improvement discussions

#### User Stories Format
```
As a [role]
I want [feature]
So that [benefit]

Acceptance Criteria:
- [ ] Criterion 1
- [ ] Criterion 2
- [ ] Criterion 3
```

### 3.2 Development Workflow

```
┌─────────────────────────────────────────────────────────────────┐
│                    DEVELOPMENT WORKFLOW                          │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌──────────┐    ┌──────────┐    ┌──────────┐    ┌──────────┐  │
│  │ Feature  │───▶│  Code    │───▶│  Code    │───▶│   Pull   │  │
│  │ Branch   │    │ Changes  │    │  Review  │    │ Request  │  │
│  └──────────┘    └──────────┘    └──────────┘    └────┬─────┘  │
│                                                       │         │
│  ┌──────────┐    ┌──────────┐    ┌──────────┐    ┌────▼─────┐  │
│  │  Deploy  │◀───│  Merge   │◀───│   CI/CD  │◀───│ Approved │  │
│  │Production│    │  Main    │    │  Tests   │    │  Review  │  │
│  └──────────┘    └──────────┘    └──────────┘    └──────────┘  │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### 3.3 Version Control Strategy

#### Git Branching Model
```
main (production)
  │
  ├── develop (integration)
  │     │
  │     ├── feature/user-authentication
  │     ├── feature/incident-detection
  │     ├── feature/mobile-upload
  │     └── feature/dashboard-analytics
  │
  ├── release/v2.3
  │
  └── hotfix/critical-bug
```

#### Commit Message Convention
```
<type>(<scope>): <subject>

Types:
- feat: New feature
- fix: Bug fix
- docs: Documentation
- style: Formatting
- refactor: Code restructuring
- test: Adding tests
- chore: Maintenance

Example:
feat(auth): add JWT token refresh mechanism
fix(upload): resolve video processing timeout
docs(api): update incident endpoint documentation
```

### 3.4 Testing Methodology

#### Test-Driven Development (TDD)
```
┌─────────────────────────────────────────────────────────────────┐
│                    TDD CYCLE                                     │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│            ┌─────────────┐                                      │
│            │  RED        │                                      │
│            │ Write Test  │                                      │
│            │ (Fails)     │                                      │
│            └──────┬──────┘                                      │
│                   │                                             │
│     ┌─────────────▼─────────────┐                               │
│     │                           │                               │
│     ▼                           │                               │
│  ┌─────────────┐         ┌──────┴──────┐                        │
│  │  GREEN      │         │  REFACTOR   │                        │
│  │ Write Code  │────────▶│  Improve    │                        │
│  │ (Passes)    │         │  Code       │                        │
│  └─────────────┘         └─────────────┘                        │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

#### Testing Levels
1. **Unit Tests**: Individual component testing
2. **Integration Tests**: Module interaction testing
3. **End-to-End Tests**: Full system workflow testing
4. **Performance Tests**: Load and stress testing

---

## 4. Technology Stack

### 4.1 Complete Technology Overview

| Layer | Technology | Version | Purpose |
|-------|------------|---------|---------|
| **Mobile** | Flutter | 3.x | Cross-platform mobile development |
| **Mobile Language** | Dart | 3.x | Mobile app programming |
| **Backend** | Node.js | 18.x | Server-side runtime |
| **Backend Framework** | Express.js | 4.x | REST API framework |
| **AI Runtime** | Python | 3.11 | AI/ML processing |
| **AI Framework** | FastAPI | 0.100+ | AI service API |
| **AI Libraries** | OpenCV, NumPy | Latest | Image/video processing |
| **Database** | PostgreSQL | 15.x | Relational data storage |
| **Containerization** | Docker | 24.x | Service containers |
| **Orchestration** | Docker Compose | 2.x | Multi-container management |
| **Frontend** | React.js | 18.x | Government dashboard |
| **State Management** | Redux | 4.x | Frontend state |
| **Maps** | Google Maps SDK | Latest | Location services |
| **Authentication** | JWT | - | Token-based auth |
| **Real-time** | WebSocket | - | Live updates |

### 4.2 Development Tools

| Tool | Purpose |
|------|---------|
| VS Code | Primary IDE |
| Git | Version control |
| Postman | API testing |
| Android Studio | Mobile debugging |
| pgAdmin | Database management |
| Docker Desktop | Container management |

### 4.3 Package Dependencies

#### Backend (Node.js) - package.json
```json
{
  "dependencies": {
    "express": "^4.18.2",
    "pg": "^8.11.0",
    "jsonwebtoken": "^9.0.0",
    "bcryptjs": "^2.4.3",
    "multer": "^1.4.5-lts.1",
    "cors": "^2.8.5",
    "dotenv": "^16.0.3",
    "axios": "^1.4.0",
    "ws": "^8.13.0",
    "firebase-admin": "^11.9.0"
  }
}
```

#### AI Service (Python) - requirements.txt
```
fastapi==0.100.0
uvicorn==0.22.0
opencv-python==4.8.0.74
numpy==1.24.3
python-multipart==0.0.6
Pillow==10.0.0
torch==2.0.1
ultralytics==8.0.0
```

#### Mobile App (Flutter) - pubspec.yaml
```yaml
dependencies:
  flutter:
    sdk: flutter
  http: ^1.1.0
  dio: ^5.3.0
  google_maps_flutter: ^2.5.0
  geolocator: ^10.1.0
  camera: ^0.10.5
  video_player: ^2.8.1
  shared_preferences: ^2.2.0
  provider: ^6.0.5
  firebase_messaging: ^14.7.0
```

---

## 5. Backend Service

### 5.1 Overview

The backend service is built with **Node.js** and **Express.js**, providing RESTful APIs for all system operations.

### 5.2 Project Structure

```
backend/
├── src/
│   ├── config/
│   │   ├── database.js        # PostgreSQL connection
│   │   ├── firebase.js        # Firebase Admin SDK
│   │   └── multer.js          # File upload config
│   │
│   ├── controllers/
│   │   ├── authController.js      # Authentication logic
│   │   ├── incidentController.js  # Incident CRUD
│   │   ├── alertController.js     # Alert management
│   │   ├── userController.js      # User management
│   │   └── aiAnalysisController.js # AI integration
│   │
│   ├── middleware/
│   │   ├── authMiddleware.js   # JWT verification
│   │   ├── errorHandler.js     # Global error handling
│   │   └── rateLimiter.js      # API rate limiting
│   │
│   ├── routes/
│   │   ├── auth.js             # /api/auth/*
│   │   ├── incidents.js        # /api/incidents/*
│   │   ├── alerts.js           # /api/alerts/*
│   │   ├── users.js            # /api/users/*
│   │   └── detection.js        # /api/detect/*
│   │
│   ├── services/
│   │   ├── aiService.js        # AI communication
│   │   ├── notificationService.js # Push notifications
│   │   └── websocketService.js # Real-time updates
│   │
│   ├── utils/
│   │   ├── logger.js           # Logging utility
│   │   └── validators.js       # Input validation
│   │
│   └── server.js               # Application entry point
│
├── uploads/                    # Video/image storage
├── package.json
├── Dockerfile
└── .env
```

### 5.3 Server Configuration

**File: `backend/src/server.js`**

```javascript
const express = require('express');
const cors = require('cors');
const http = require('http');
const WebSocket = require('ws');
const { Pool } = require('pg');

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Database connection
const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || 'trafficguard',
  user: process.env.DB_USER || 'trafficguard_user',
  password: process.env.DB_PASSWORD || 's_123'
});

// Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/incidents', require('./routes/incidents'));
app.use('/api/alerts', require('./routes/alerts'));
app.use('/api/users', require('./routes/users'));
app.use('/api/detect', require('./routes/detection'));

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'healthy', timestamp: new Date() });
});

// WebSocket handling
wss.on('connection', (ws) => {
  console.log('Client connected');
  
  ws.on('message', (message) => {
    // Handle incoming messages
  });
  
  ws.on('close', () => {
    console.log('Client disconnected');
  });
});

// Broadcast function
function broadcast(data) {
  wss.clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(JSON.stringify(data));
    }
  });
}

const PORT = process.env.PORT || 3000;
server.listen(PORT, '0.0.0.0', () => {
  console.log(`Backend server running on port ${PORT}`);
});

module.exports = { app, pool, broadcast };
```

### 5.4 Authentication System

**JWT Token Flow:**
```
┌─────────────────────────────────────────────────────────────────┐
│                    AUTHENTICATION FLOW                           │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  1. LOGIN REQUEST                                               │
│  ┌──────────┐         ┌──────────┐         ┌──────────┐        │
│  │  Client  │──POST──▶│ /api/auth│──Verify─▶│ Database │        │
│  │  (App)   │ /login  │  /login  │ Password │ (Users)  │        │
│  └──────────┘         └────┬─────┘         └──────────┘        │
│                            │                                    │
│  2. TOKEN GENERATION       │                                    │
│                       ┌────▼─────┐                              │
│                       │ Generate │                              │
│                       │   JWT    │                              │
│                       │  Token   │                              │
│                       └────┬─────┘                              │
│                            │                                    │
│  3. TOKEN RETURNED         │                                    │
│  ┌──────────┐         ┌────▼─────┐                              │
│  │  Client  │◀─Token──│ Response │                              │
│  │ Stores   │         │ {token,  │                              │
│  │ Token    │         │  user}   │                              │
│  └──────────┘         └──────────┘                              │
│                                                                 │
│  4. AUTHENTICATED REQUEST                                       │
│  ┌──────────┐         ┌──────────┐         ┌──────────┐        │
│  │  Client  │──GET───▶│Middleware│──Valid─▶│Protected │        │
│  │ + Token  │ /api/*  │  Verify  │ Token   │ Resource │        │
│  └──────────┘         └──────────┘         └──────────┘        │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

**File: `backend/src/controllers/authController.js`**

```javascript
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { pool } = require('../config/database');

const JWT_SECRET = process.env.JWT_SECRET || 'trafficguard_secret_key';

exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;
    
    // Find user
    const result = await pool.query(
      'SELECT * FROM users WHERE email = $1',
      [email]
    );
    
    if (result.rows.length === 0) {
      return res.status(401).json({ 
        success: false, 
        message: 'Invalid credentials' 
      });
    }
    
    const user = result.rows[0];
    
    // Verify password
    const isMatch = await bcrypt.compare(password, user.password_hash);
    
    if (!isMatch) {
      return res.status(401).json({ 
        success: false, 
        message: 'Invalid credentials' 
      });
    }
    
    // Generate token
    const token = jwt.sign(
      { userId: user.id, email: user.email, role: user.role },
      JWT_SECRET,
      { expiresIn: '24h' }
    );
    
    res.json({
      success: true,
      token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role
      }
    });
    
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Server error' 
    });
  }
};

exports.register = async (req, res) => {
  try {
    const { email, password, name, role } = req.body;
    
    // Hash password
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);
    
    // Create user
    const result = await pool.query(
      `INSERT INTO users (email, password_hash, name, role) 
       VALUES ($1, $2, $3, $4) RETURNING id, email, name, role`,
      [email, passwordHash, name, role || 'police']
    );
    
    res.status(201).json({
      success: true,
      user: result.rows[0]
    });
    
  } catch (error) {
    if (error.code === '23505') {
      return res.status(400).json({ 
        success: false, 
        message: 'Email already exists' 
      });
    }
    res.status(500).json({ 
      success: false, 
      message: 'Server error' 
    });
  }
};
```

### 5.5 Video Upload & Processing

**Asynchronous Processing Architecture:**

```
┌─────────────────────────────────────────────────────────────────┐
│                 ASYNC VIDEO PROCESSING                           │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌──────────┐    ┌──────────┐    ┌──────────┐                  │
│  │  Mobile  │───▶│ Upload   │───▶│ Save to  │                  │
│  │   App    │    │ Video    │    │  Disk    │                  │
│  └──────────┘    └──────────┘    └────┬─────┘                  │
│                                       │                         │
│                       ┌───────────────┼───────────────┐         │
│                       │               │               │         │
│                       ▼               ▼               ▼         │
│               ┌──────────┐    ┌──────────┐    ┌──────────┐     │
│               │ Return   │    │ Create   │    │ Start    │     │
│               │ Success  │    │ Incident │    │ Async    │     │
│               │ (202)    │    │ Record   │    │ AI Job   │     │
│               └──────────┘    └──────────┘    └────┬─────┘     │
│                                                    │            │
│                              BACKGROUND PROCESS    │            │
│                       ┌────────────────────────────┼──────┐     │
│                       │                            ▼      │     │
│                       │  ┌──────────┐    ┌──────────┐    │     │
│                       │  │   AI     │───▶│ Update   │    │     │
│                       │  │ Analysis │    │ Incident │    │     │
│                       │  └──────────┘    └────┬─────┘    │     │
│                       │                       │          │     │
│                       │              ┌────────▼────────┐ │     │
│                       │              │ Send Alert via  │ │     │
│                       │              │ WebSocket + FCM │ │     │
│                       │              └─────────────────┘ │     │
│                       └──────────────────────────────────┘     │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

**File: `backend/src/controllers/aiAnalysisController.js`**

```javascript
const axios = require('axios');
const { pool, broadcast } = require('../server');

const AI_SERVICE_URL = process.env.AI_SERVICE_URL || 'http://localhost:8000';

exports.analyzeVideo = async (req, res) => {
  try {
    const { file } = req;
    const { latitude, longitude, description } = req.body;
    
    // 1. Create incident record immediately
    const incidentResult = await pool.query(
      `INSERT INTO incidents (incident_type, severity, status, latitude, longitude, description, video_url, source)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *`,
      ['pending', 'medium', 'processing', latitude, longitude, description, file.path, 'mobile']
    );
    
    const incident = incidentResult.rows[0];
    
    // 2. Return success immediately (async processing)
    res.status(202).json({
      success: true,
      message: 'Video uploaded successfully. Processing in background.',
      incident: incident
    });
    
    // 3. Process AI analysis in background
    analyzeInBackground(incident.id, file.path, latitude, longitude);
    
  } catch (error) {
    console.error('Upload error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Upload failed' 
    });
  }
};

async function analyzeInBackground(incidentId, videoPath, latitude, longitude) {
  try {
    // Call AI service
    const response = await axios.post(
      `${AI_SERVICE_URL}/ai/analyze-traffic`,
      { video_path: videoPath, latitude, longitude },
      { timeout: 180000 } // 3 minute timeout
    );
    
    const analysis = response.data;
    
    // Update incident with AI results
    await pool.query(
      `UPDATE incidents 
       SET incident_type = $1, severity = $2, status = $3, ai_analysis = $4
       WHERE id = $5`,
      [
        analysis.incident_type || 'unknown',
        analysis.severity || 'medium',
        'reported',
        JSON.stringify(analysis),
        incidentId
      ]
    );
    
    // Broadcast update via WebSocket
    broadcast({
      type: 'incident_update',
      incident_id: incidentId,
      status: 'analyzed',
      analysis: analysis
    });
    
    // Send push notification
    await sendPushNotification(incidentId, analysis);
    
  } catch (error) {
    console.error('Background AI analysis error:', error);
    
    // Update incident as failed
    await pool.query(
      `UPDATE incidents SET status = $1 WHERE id = $2`,
      ['analysis_failed', incidentId]
    );
  }
}
```

### 5.6 Environment Variables

**File: `backend/.env`**

```env
# Server
PORT=3000
NODE_ENV=development

# Database
DB_HOST=localhost
DB_PORT=5432
DB_NAME=trafficguard
DB_USER=trafficguard_user
DB_PASSWORD=s_123

# JWT
JWT_SECRET=trafficguard_jwt_secret_key_2026

# AI Service
AI_SERVICE_URL=http://localhost:8000

# Firebase
FIREBASE_PROJECT_ID=trafficguard-ai
FIREBASE_PRIVATE_KEY_PATH=./firebase-service-account.json

# File Upload
UPLOAD_PATH=./uploads
MAX_FILE_SIZE=100000000
```

---

## 6. AI Service / Engine

### 6.1 Overview

The AI Service is built with **Python** and **FastAPI**, providing real-time traffic analysis and incident detection using computer vision and machine learning.

### 6.2 Project Structure

```
ai_service/
├── main.py                        # FastAPI application entry
├── api.py                         # API endpoints
├── enhanced_traffic_analyzer.py   # Main analysis engine
├── incident_detector.py           # Incident detection logic
├── backend_notifier.py            # Backend communication
├── requirements.txt               # Python dependencies
├── Dockerfile                     # Container configuration
├── models/                        # ML model files
│   └── yolov8n.pt                # YOLO object detection
└── training_workspace/            # Model training data
```

### 6.3 AI Analysis Pipeline

```
┌─────────────────────────────────────────────────────────────────┐
│                    AI ANALYSIS PIPELINE                          │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  INPUT                                                          │
│  ┌──────────┐                                                   │
│  │  Video   │                                                   │
│  │  File    │                                                   │
│  └────┬─────┘                                                   │
│       │                                                         │
│       ▼                                                         │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │ STAGE 1: VIDEO PREPROCESSING                              │  │
│  │ ┌─────────────┐  ┌─────────────┐  ┌─────────────┐        │  │
│  │ │ Load Video  │─▶│ Extract     │─▶│ Resize &    │        │  │
│  │ │ (OpenCV)    │  │ Frames      │  │ Normalize   │        │  │
│  │ └─────────────┘  └─────────────┘  └─────────────┘        │  │
│  └──────────────────────────────────────────────────────────┘  │
│       │                                                         │
│       ▼                                                         │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │ STAGE 2: OBJECT DETECTION (YOLO v8)                       │  │
│  │ ┌─────────────┐  ┌─────────────┐  ┌─────────────┐        │  │
│  │ │ Detect      │─▶│ Classify    │─▶│ Track       │        │  │
│  │ │ Objects     │  │ Vehicles    │  │ Movement    │        │  │
│  │ └─────────────┘  └─────────────┘  └─────────────┘        │  │
│  └──────────────────────────────────────────────────────────┘  │
│       │                                                         │
│       ▼                                                         │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │ STAGE 3: INCIDENT DETECTION                               │  │
│  │ ┌─────────────┐  ┌─────────────┐  ┌─────────────┐        │  │
│  │ │ Collision   │  │ Congestion  │  │ Anomaly     │        │  │
│  │ │ Detection   │  │ Analysis    │  │ Detection   │        │  │
│  │ └─────────────┘  └─────────────┘  └─────────────┘        │  │
│  └──────────────────────────────────────────────────────────┘  │
│       │                                                         │
│       ▼                                                         │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │ STAGE 4: SEVERITY CLASSIFICATION                          │  │
│  │ ┌─────────────────────────────────────────────────┐      │  │
│  │ │ Factors: Vehicle count, Speed, Impact force,    │      │  │
│  │ │         Road blockage, Time of day              │      │  │
│  │ └─────────────────────────────────────────────────┘      │  │
│  │ Output: LOW | MEDIUM | HIGH | CRITICAL                    │  │
│  └──────────────────────────────────────────────────────────┘  │
│       │                                                         │
│       ▼                                                         │
│  OUTPUT                                                         │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │ {                                                         │  │
│  │   "incident_detected": true,                              │  │
│  │   "incident_type": "accident",                            │  │
│  │   "severity": "high",                                     │  │
│  │   "confidence": 0.87,                                     │  │
│  │   "vehicles_detected": 3,                                 │  │
│  │   "description": "Multi-vehicle collision detected"       │  │
│  │ }                                                         │  │
│  └──────────────────────────────────────────────────────────┘  │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### 6.4 FastAPI Application

**File: `ai_service/main.py`**

```python
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
import uvicorn

app = FastAPI(
    title="TrafficGuard AI Service",
    description="AI-powered traffic analysis and incident detection",
    version="2.3.0"
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Import routes
from api import router as api_router
app.include_router(api_router, prefix="/ai")

@app.get("/health")
async def health_check():
    return {
        "status": "healthy",
        "service": "TrafficGuard AI",
        "version": "2.3.0"
    }

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)
```

### 6.5 Traffic Analyzer Engine

**File: `ai_service/enhanced_traffic_analyzer.py`**

```python
import cv2
import numpy as np
from typing import Dict, Any, List
import os

class EnhancedTrafficAnalyzer:
    """
    Advanced traffic analysis engine using computer vision
    """
    
    def __init__(self):
        self.confidence_threshold = 0.5
        self.vehicle_classes = ['car', 'truck', 'bus', 'motorcycle', 'bicycle']
        
    def analyze_video(self, video_path: str) -> Dict[str, Any]:
        """
        Analyze video for traffic incidents
        
        Args:
            video_path: Path to video file
            
        Returns:
            Analysis results dictionary
        """
        if not os.path.exists(video_path):
            return self._create_error_response("Video file not found")
        
        try:
            # Open video
            cap = cv2.VideoCapture(video_path)
            
            if not cap.isOpened():
                return self._create_error_response("Could not open video")
            
            # Get video properties
            fps = cap.get(cv2.CAP_PROP_FPS)
            frame_count = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
            duration = frame_count / fps if fps > 0 else 0
            
            # Analyze frames
            vehicles_detected = []
            anomalies = []
            frame_analyses = []
            
            frame_interval = max(1, int(fps / 2))  # Analyze 2 frames per second
            frame_idx = 0
            
            while cap.isOpened():
                ret, frame = cap.read()
                if not ret:
                    break
                
                if frame_idx % frame_interval == 0:
                    analysis = self._analyze_frame(frame)
                    frame_analyses.append(analysis)
                    vehicles_detected.extend(analysis.get('vehicles', []))
                    if analysis.get('anomaly'):
                        anomalies.append(analysis['anomaly'])
                
                frame_idx += 1
            
            cap.release()
            
            # Determine incident type and severity
            incident_result = self._determine_incident(
                frame_analyses, 
                vehicles_detected, 
                anomalies
            )
            
            return {
                "success": True,
                "incident_detected": incident_result['detected'],
                "incident_type": incident_result['type'],
                "severity": incident_result['severity'],
                "confidence": float(incident_result['confidence']),
                "vehicles_detected": int(len(set(vehicles_detected))),
                "duration_seconds": float(duration),
                "frames_analyzed": int(len(frame_analyses)),
                "description": incident_result['description']
            }
            
        except Exception as e:
            return self._create_error_response(str(e))
    
    def _analyze_frame(self, frame: np.ndarray) -> Dict[str, Any]:
        """Analyze a single frame for vehicles and anomalies"""
        # Convert to grayscale for motion detection
        gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)
        
        # Simple vehicle detection using edge detection
        edges = cv2.Canny(gray, 50, 150)
        contours, _ = cv2.findContours(
            edges, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE
        )
        
        vehicles = []
        for contour in contours:
            area = cv2.contourArea(contour)
            if area > 1000:  # Minimum vehicle size
                vehicles.append({
                    'area': int(area),
                    'position': cv2.boundingRect(contour)
                })
        
        return {
            'vehicles': vehicles,
            'vehicle_count': len(vehicles),
            'anomaly': None
        }
    
    def _determine_incident(
        self, 
        analyses: List[Dict], 
        vehicles: List, 
        anomalies: List
    ) -> Dict[str, Any]:
        """Determine if an incident occurred and its severity"""
        
        if not analyses:
            return {
                'detected': False,
                'type': 'none',
                'severity': 'low',
                'confidence': 0.0,
                'description': 'No frames analyzed'
            }
        
        avg_vehicles = sum(a['vehicle_count'] for a in analyses) / len(analyses)
        
        # Determine incident based on analysis
        if avg_vehicles > 5:
            return {
                'detected': True,
                'type': 'congestion',
                'severity': 'medium' if avg_vehicles < 10 else 'high',
                'confidence': 0.75,
                'description': f'Traffic congestion detected with {int(avg_vehicles)} vehicles average'
            }
        elif anomalies:
            return {
                'detected': True,
                'type': 'accident',
                'severity': 'high',
                'confidence': 0.85,
                'description': 'Potential accident detected'
            }
        else:
            return {
                'detected': True,
                'type': 'normal',
                'severity': 'low',
                'confidence': 0.90,
                'description': 'Normal traffic flow observed'
            }
    
    def _create_error_response(self, error: str) -> Dict[str, Any]:
        """Create error response"""
        return {
            "success": False,
            "incident_detected": False,
            "incident_type": "error",
            "severity": "low",
            "confidence": 0.0,
            "error": error
        }


# Singleton instance
analyzer = EnhancedTrafficAnalyzer()
```

### 6.6 API Endpoints

**File: `ai_service/api.py`**

```python
from fastapi import APIRouter, UploadFile, File, Form, HTTPException
from pydantic import BaseModel
from typing import Optional
import os
import shutil

from enhanced_traffic_analyzer import analyzer

router = APIRouter()

class AnalysisRequest(BaseModel):
    video_path: str
    latitude: Optional[float] = None
    longitude: Optional[float] = None

class AnalysisResponse(BaseModel):
    success: bool
    incident_detected: bool
    incident_type: str
    severity: str
    confidence: float
    vehicles_detected: int
    description: str

@router.post("/analyze-traffic", response_model=AnalysisResponse)
async def analyze_traffic(request: AnalysisRequest):
    """
    Analyze traffic video for incidents
    """
    result = analyzer.analyze_video(request.video_path)
    
    if not result.get('success', False):
        raise HTTPException(status_code=500, detail=result.get('error', 'Analysis failed'))
    
    return result

@router.post("/analyze-upload")
async def analyze_upload(
    file: UploadFile = File(...),
    latitude: float = Form(None),
    longitude: float = Form(None)
):
    """
    Upload and analyze video file directly
    """
    # Save uploaded file
    upload_dir = "/tmp/ai_uploads"
    os.makedirs(upload_dir, exist_ok=True)
    
    file_path = os.path.join(upload_dir, file.filename)
    
    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)
    
    # Analyze
    result = analyzer.analyze_video(file_path)
    
    # Cleanup
    os.remove(file_path)
    
    return result

@router.get("/status")
async def get_status():
    """Get AI service status"""
    return {
        "status": "operational",
        "analyzer": "EnhancedTrafficAnalyzer",
        "version": "2.3.0",
        "capabilities": [
            "vehicle_detection",
            "incident_detection",
            "congestion_analysis",
            "severity_classification"
        ]
    }
```

### 6.7 Docker Configuration

**File: `ai_service/Dockerfile`**

```dockerfile
FROM python:3.11-slim

WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y \
    libgl1-mesa-glx \
    libglib2.0-0 \
    libsm6 \
    libxext6 \
    libxrender-dev \
    && rm -rf /var/lib/apt/lists/*

# Install Python dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy application
COPY . .

# Expose port
EXPOSE 8000

# Run application
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
```

---

## 7. Database Layer

### 7.1 Overview

TrafficGuard uses **PostgreSQL 15** as its primary database, providing robust relational data storage with ACID compliance.

### 7.2 Database Schema

```
┌─────────────────────────────────────────────────────────────────┐
│                    DATABASE SCHEMA                               │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌─────────────────────┐       ┌─────────────────────┐         │
│  │       USERS         │       │      INCIDENTS      │         │
│  ├─────────────────────┤       ├─────────────────────┤         │
│  │ id (PK)             │       │ id (PK)             │         │
│  │ email               │───┐   │ incident_type       │         │
│  │ password_hash       │   │   │ severity            │         │
│  │ name                │   │   │ status              │         │
│  │ role                │   │   │ latitude            │         │
│  │ badge_number        │   │   │ longitude           │         │
│  │ phone               │   │   │ description         │         │
│  │ created_at          │   │   │ video_url           │         │
│  │ updated_at          │   └──▶│ reported_by (FK)    │         │
│  └─────────────────────┘       │ ai_analysis         │         │
│                                │ created_at          │         │
│                                │ updated_at          │         │
│  ┌─────────────────────┐       └──────────┬──────────┘         │
│  │   INCIDENT_ALERTS   │                  │                    │
│  ├─────────────────────┤                  │                    │
│  │ id (PK)             │                  │                    │
│  │ incident_id (FK)    │◀─────────────────┘                    │
│  │ user_id (FK)        │                                       │
│  │ alert_type          │       ┌─────────────────────┐         │
│  │ status              │       │    TRAFFIC_DATA     │         │
│  │ sent_at             │       ├─────────────────────┤         │
│  │ read_at             │       │ id (PK)             │         │
│  └─────────────────────┘       │ latitude            │         │
│                                │ longitude           │         │
│                                │ density             │         │
│  ┌─────────────────────┐       │ speed_avg           │         │
│  │    USER_SESSIONS    │       │ vehicle_count       │         │
│  ├─────────────────────┤       │ recorded_at         │         │
│  │ id (PK)             │       └─────────────────────┘         │
│  │ user_id (FK)        │                                       │
│  │ token               │       ┌─────────────────────┐         │
│  │ device_info         │       │   CAMERA_FEEDS      │         │
│  │ fcm_token           │       ├─────────────────────┤         │
│  │ created_at          │       │ id (PK)             │         │
│  │ expires_at          │       │ name                │         │
│  └─────────────────────┘       │ location            │         │
│                                │ stream_url          │         │
│                                │ status              │         │
│                                │ last_active         │         │
│                                └─────────────────────┘         │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### 7.3 Schema Definitions

**File: `database/schema.sql`**

```sql
-- Users table
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    name VARCHAR(255) NOT NULL,
    role VARCHAR(50) DEFAULT 'police' CHECK (role IN ('admin', 'police', 'government', 'viewer')),
    badge_number VARCHAR(50),
    phone VARCHAR(20),
    avatar_url VARCHAR(500),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Incidents table
CREATE TABLE incidents (
    id SERIAL PRIMARY KEY,
    incident_type VARCHAR(50) NOT NULL CHECK (incident_type IN ('accident', 'congestion', 'roadblock', 'hazard', 'emergency', 'pending', 'normal', 'unknown')),
    severity VARCHAR(20) DEFAULT 'medium' CHECK (severity IN ('low', 'medium', 'high', 'critical')),
    status VARCHAR(50) DEFAULT 'reported' CHECK (status IN ('reported', 'processing', 'verified', 'resolved', 'dismissed', 'analysis_failed')),
    latitude DECIMAL(10, 8),
    longitude DECIMAL(11, 8),
    address VARCHAR(500),
    description TEXT,
    video_url VARCHAR(500),
    image_url VARCHAR(500),
    reported_by INTEGER REFERENCES users(id),
    reported_by_name VARCHAR(255),
    ai_analysis JSONB,
    source VARCHAR(50) DEFAULT 'mobile' CHECK (source IN ('mobile', 'camera', 'manual', 'ai')),
    is_anonymous BOOLEAN DEFAULT false,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Incident alerts table
CREATE TABLE incident_alerts (
    id SERIAL PRIMARY KEY,
    incident_id INTEGER REFERENCES incidents(id) ON DELETE CASCADE,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    alert_type VARCHAR(50) DEFAULT 'push',
    title VARCHAR(255),
    message TEXT,
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'delivered', 'read', 'failed')),
    sent_at TIMESTAMP,
    delivered_at TIMESTAMP,
    read_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Traffic data table
CREATE TABLE traffic_data (
    id SERIAL PRIMARY KEY,
    latitude DECIMAL(10, 8) NOT NULL,
    longitude DECIMAL(11, 8) NOT NULL,
    density DECIMAL(3, 2) DEFAULT 0.5,
    speed_avg DECIMAL(5, 2),
    vehicle_count INTEGER DEFAULT 0,
    camera_id INTEGER,
    recorded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Camera feeds table
CREATE TABLE camera_feeds (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    location VARCHAR(500),
    latitude DECIMAL(10, 8),
    longitude DECIMAL(11, 8),
    stream_url VARCHAR(500),
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'maintenance')),
    last_active TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- User sessions table
CREATE TABLE user_sessions (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    token VARCHAR(500) NOT NULL,
    device_info JSONB,
    fcm_token VARCHAR(500),
    ip_address VARCHAR(45),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP,
    last_active TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for performance
CREATE INDEX idx_incidents_status ON incidents(status);
CREATE INDEX idx_incidents_created ON incidents(created_at DESC);
CREATE INDEX idx_incidents_location ON incidents(latitude, longitude);
CREATE INDEX idx_incidents_type ON incidents(incident_type);
CREATE INDEX idx_traffic_data_location ON traffic_data(latitude, longitude);
CREATE INDEX idx_traffic_data_recorded ON traffic_data(recorded_at DESC);
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_alerts_user ON incident_alerts(user_id);
CREATE INDEX idx_alerts_incident ON incident_alerts(incident_id);
```

### 7.4 Docker Compose Configuration

**File: `docker-compose.yml`**

```yaml
version: '3.8'

services:
  # PostgreSQL Database
  postgres:
    image: postgres:15
    container_name: trafficguard_db
    environment:
      POSTGRES_DB: trafficguard
      POSTGRES_USER: trafficguard_user
      POSTGRES_PASSWORD: s_123
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data
      - ./database/schema.sql:/docker-entrypoint-initdb.d/01-schema.sql
      - ./database/seed.sql:/docker-entrypoint-initdb.d/02-seed.sql
    networks:
      - trafficguard_network
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U trafficguard_user -d trafficguard"]
      interval: 10s
      timeout: 5s
      retries: 5

  # Backend API
  backend:
    build: ./backend
    container_name: trafficguard_backend
    environment:
      - NODE_ENV=production
      - PORT=3000
      - DB_HOST=postgres
      - DB_PORT=5432
      - DB_NAME=trafficguard
      - DB_USER=trafficguard_user
      - DB_PASSWORD=s_123
      - AI_SERVICE_URL=http://ai_service:8000
    ports:
      - "3000:3000"
    depends_on:
      postgres:
        condition: service_healthy
    networks:
      - trafficguard_network
    volumes:
      - ./uploads:/app/uploads

  # AI Service
  ai_service:
    build: ./ai_service
    container_name: trafficguard_ai
    environment:
      - PYTHONUNBUFFERED=1
    ports:
      - "8000:8000"
    networks:
      - trafficguard_network
    volumes:
      - ./uploads:/app/uploads

volumes:
  postgres_data:

networks:
  trafficguard_network:
    driver: bridge
```

### 7.5 Database Connection

**File: `backend/src/config/database.js`**

```javascript
const { Pool } = require('pg');

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT) || 5432,
  database: process.env.DB_NAME || 'trafficguard',
  user: process.env.DB_USER || 'trafficguard_user',
  password: process.env.DB_PASSWORD || 's_123',
  max: 20,                    // Maximum connections in pool
  idleTimeoutMillis: 30000,   // Close idle connections after 30s
  connectionTimeoutMillis: 2000, // Connection timeout
});

// Test connection
pool.on('connect', () => {
  console.log('Connected to PostgreSQL database');
});

pool.on('error', (err) => {
  console.error('PostgreSQL pool error:', err);
});

module.exports = { pool };
```

---

## 8. Mobile Application

### 8.1 Overview

The mobile application is built with **Flutter/Dart**, providing a cross-platform solution for police officers to report traffic incidents.

### 8.2 Project Structure

```
mobile_app/
├── lib/
│   ├── main.dart                    # Application entry point
│   ├── config/
│   │   ├── app_config.dart          # App configuration
│   │   ├── environment.dart         # Environment settings
│   │   └── theme.dart               # Theme configuration
│   │
│   ├── models/
│   │   ├── user.dart                # User model
│   │   ├── incident.dart            # Incident model
│   │   └── alert.dart               # Alert model
│   │
│   ├── services/
│   │   ├── api_service.dart         # HTTP API client
│   │   ├── auth_service.dart        # Authentication
│   │   ├── websocket_service.dart   # Real-time updates
│   │   ├── location_service.dart    # GPS location
│   │   └── notification_service.dart # Push notifications
│   │
│   ├── screens/
│   │   ├── login_screen.dart        # Login UI
│   │   ├── home_screen.dart         # Main dashboard
│   │   ├── map_screen.dart          # Traffic map
│   │   ├── capture_screen.dart      # Video capture
│   │   ├── alerts_screen.dart       # Alerts list
│   │   └── settings_screen.dart     # App settings
│   │
│   ├── widgets/
│   │   ├── incident_card.dart       # Incident display
│   │   ├── alert_badge.dart         # Alert indicator
│   │   └── loading_overlay.dart     # Loading state
│   │
│   └── utils/
│       ├── validators.dart          # Input validation
│       └── formatters.dart          # Data formatting
│
├── android/
│   └── app/
│       └── src/main/
│           └── AndroidManifest.xml  # Android permissions
│
├── pubspec.yaml                     # Dependencies
└── README.md
```

### 8.3 Environment Configuration

**File: `mobile_app/lib/config/environment.dart`**

```dart
class Environment {
  // Server Configuration
  // Change this IP when your network changes
  static const String serverIP = '192.168.32.146';
  static const String serverPort = '3000';
  static const String aiPort = '8000';
  
  // API URLs
  static String get baseApiUrl => 'http://$serverIP:$serverPort';
  static String get aiServiceUrl => 'http://$serverIP:$aiPort';
  static String get webSocketUrl => 'ws://$serverIP:$serverPort';
  
  // Timeouts
  static const int connectionTimeout = 30000;  // 30 seconds
  static const int receiveTimeout = 60000;     // 60 seconds
  static const int uploadTimeout = 120000;     // 2 minutes
  
  // Feature Flags
  static const bool enableOfflineMode = true;
  static const bool enableDebugLogs = true;
}
```

### 8.4 API Service

**File: `mobile_app/lib/services/api_service.dart`**

```dart
import 'package:dio/dio.dart';
import '../config/environment.dart';

class ApiService {
  static final ApiService _instance = ApiService._internal();
  factory ApiService() => _instance;
  
  late Dio _dio;
  String? _authToken;
  
  ApiService._internal() {
    _dio = Dio(BaseOptions(
      baseUrl: Environment.baseApiUrl,
      connectTimeout: Duration(milliseconds: Environment.connectionTimeout),
      receiveTimeout: Duration(milliseconds: Environment.receiveTimeout),
      headers: {
        'Content-Type': 'application/json',
      },
    ));
    
    // Add interceptors
    _dio.interceptors.add(InterceptorsWrapper(
      onRequest: (options, handler) {
        if (_authToken != null) {
          options.headers['Authorization'] = 'Bearer $_authToken';
        }
        return handler.next(options);
      },
      onError: (error, handler) {
        print('API Error: ${error.message}');
        return handler.next(error);
      },
    ));
  }
  
  void setAuthToken(String token) {
    _authToken = token;
  }
  
  void clearAuthToken() {
    _authToken = null;
  }
  
  // GET request
  Future<Response> get(String path, {Map<String, dynamic>? params}) async {
    return await _dio.get(path, queryParameters: params);
  }
  
  // POST request
  Future<Response> post(String path, {dynamic data}) async {
    return await _dio.post(path, data: data);
  }
  
  // Upload file
  Future<Response> uploadFile(String path, String filePath, {
    Map<String, dynamic>? extraData,
    void Function(int, int)? onProgress,
  }) async {
    final formData = FormData.fromMap({
      'video': await MultipartFile.fromFile(filePath),
      ...?extraData,
    });
    
    return await _dio.post(
      path,
      data: formData,
      options: Options(
        receiveTimeout: Duration(milliseconds: Environment.uploadTimeout),
      ),
      onSendProgress: onProgress,
    );
  }
}
```

### 8.5 Map Screen Implementation

**File: `mobile_app/lib/screens/map_screen.dart`**

```dart
import 'package:flutter/material.dart';
import 'package:google_maps_flutter/google_maps_flutter.dart';
import 'package:geolocator/geolocator.dart';
import '../services/api_service.dart';
import '../config/app_config.dart';

class MapScreen extends StatefulWidget {
  const MapScreen({super.key});

  @override
  State<MapScreen> createState() => _MapScreenState();
}

class _MapScreenState extends State<MapScreen> {
  GoogleMapController? _mapController;
  final ApiService _apiService = ApiService();
  
  Set<Marker> _markers = {};
  List<Map<String, dynamic>> _incidents = [];
  bool _isLoading = true;
  
  // Default position: Kigali CBD
  LatLng _currentPosition = const LatLng(-1.9441, 30.0619);

  @override
  void initState() {
    super.initState();
    _initializeMap();
  }

  Future<void> _initializeMap() async {
    await _getCurrentLocation();
    await _loadIncidents();
    setState(() => _isLoading = false);
  }

  Future<void> _getCurrentLocation() async {
    try {
      final permission = await Geolocator.checkPermission();
      if (permission == LocationPermission.denied) {
        await Geolocator.requestPermission();
      }
      
      final position = await Geolocator.getCurrentPosition();
      setState(() {
        _currentPosition = LatLng(position.latitude, position.longitude);
      });
    } catch (e) {
      print('Location error: $e');
    }
  }

  Future<void> _loadIncidents() async {
    try {
      final response = await _apiService.get('/api/incidents');
      final data = response.data;
      
      if (data['success'] == true && data['data'] != null) {
        setState(() {
          _incidents = List<Map<String, dynamic>>.from(data['data']);
          _updateMarkers();
        });
      }
    } catch (e) {
      print('Error loading incidents: $e');
    }
  }

  void _updateMarkers() {
    final markers = <Marker>{};
    
    for (final incident in _incidents) {
      final lat = _parseDouble(incident['latitude']);
      final lng = _parseDouble(incident['longitude']);
      
      if (lat != null && lng != null) {
        final type = incident['incident_type'] ?? 'unknown';
        final severity = incident['severity'] ?? 'medium';
        
        markers.add(Marker(
          markerId: MarkerId('incident_${incident['id']}'),
          position: LatLng(lat, lng),
          icon: BitmapDescriptor.defaultMarkerWithHue(
            _getMarkerHue(severity),
          ),
          infoWindow: InfoWindow(
            title: _getIncidentTitle(type),
            snippet: 'Severity: ${severity.toUpperCase()}',
          ),
          onTap: () => _showIncidentDetails(incident),
        ));
      }
    }
    
    setState(() => _markers = markers);
  }

  double _getMarkerHue(String severity) {
    switch (severity.toLowerCase()) {
      case 'critical':
      case 'high':
        return BitmapDescriptor.hueRed;
      case 'medium':
        return BitmapDescriptor.hueOrange;
      default:
        return BitmapDescriptor.hueYellow;
    }
  }

  String _getIncidentTitle(String type) {
    switch (type.toLowerCase()) {
      case 'accident':
        return '🚗 Accident';
      case 'congestion':
        return '🚦 Congestion';
      case 'roadblock':
        return '🚧 Road Block';
      default:
        return '📍 Incident';
    }
  }

  double? _parseDouble(dynamic value) {
    if (value == null) return null;
    if (value is double) return value;
    if (value is int) return value.toDouble();
    if (value is String) return double.tryParse(value);
    return null;
  }

  void _showIncidentDetails(Map<String, dynamic> incident) {
    showModalBottomSheet(
      context: context,
      builder: (context) => Container(
        padding: const EdgeInsets.all(20),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              _getIncidentTitle(incident['incident_type'] ?? 'unknown'),
              style: Theme.of(context).textTheme.headlineSmall,
            ),
            const SizedBox(height: 8),
            Text('Severity: ${incident['severity']?.toUpperCase()}'),
            Text('Status: ${incident['status']}'),
            const SizedBox(height: 8),
            Text(incident['description'] ?? 'No description'),
          ],
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Traffic Map'),
        actions: [
          IconButton(
            icon: const Icon(Icons.refresh),
            onPressed: _loadIncidents,
          ),
        ],
      ),
      body: Stack(
        children: [
          GoogleMap(
            initialCameraPosition: CameraPosition(
              target: _currentPosition,
              zoom: 13,
            ),
            onMapCreated: (controller) => _mapController = controller,
            markers: _markers,
            myLocationEnabled: true,
            myLocationButtonEnabled: false,
          ),
          if (_isLoading)
            const Center(child: CircularProgressIndicator()),
          Positioned(
            bottom: 20,
            right: 20,
            child: FloatingActionButton(
              onPressed: () {
                _mapController?.animateCamera(
                  CameraUpdate.newLatLngZoom(_currentPosition, 15),
                );
              },
              child: const Icon(Icons.my_location),
            ),
          ),
        ],
      ),
    );
  }
}
```

### 8.6 Android Configuration

**File: `mobile_app/android/app/src/main/AndroidManifest.xml`**

```xml
<manifest xmlns:android="http://schemas.android.com/apk/res/android">
    <!-- Permissions -->
    <uses-permission android:name="android.permission.INTERNET"/>
    <uses-permission android:name="android.permission.ACCESS_FINE_LOCATION"/>
    <uses-permission android:name="android.permission.ACCESS_COARSE_LOCATION"/>
    <uses-permission android:name="android.permission.CAMERA"/>
    <uses-permission android:name="android.permission.RECORD_AUDIO"/>
    <uses-permission android:name="android.permission.WRITE_EXTERNAL_STORAGE"/>
    <uses-permission android:name="android.permission.READ_EXTERNAL_STORAGE"/>

    <application
        android:label="TrafficGuard AI"
        android:name="${applicationName}"
        android:icon="@mipmap/ic_launcher">
        
        <activity
            android:name=".MainActivity"
            android:exported="true"
            android:launchMode="singleTop"
            android:theme="@style/LaunchTheme"
            android:configChanges="orientation|keyboardHidden|keyboard|screenSize|smallestScreenSize|locale|layoutDirection|fontScale|screenLayout|density|uiMode"
            android:hardwareAccelerated="true"
            android:windowSoftInputMode="adjustResize">
            <intent-filter>
                <action android:name="android.intent.action.MAIN"/>
                <category android:name="android.intent.category.LAUNCHER"/>
            </intent-filter>
        </activity>
        
        <!-- Google Maps API Key -->
        <meta-data
            android:name="com.google.android.geo.API_KEY"
            android:value="AIzaSyDF_uxx281M_FLL27eBa-JosIUPCxc8NMI"/>
            
        <meta-data
            android:name="flutterEmbedding"
            android:value="2" />
    </application>
</manifest>
```

### 8.7 Dependencies

**File: `mobile_app/pubspec.yaml`**

```yaml
name: trafficguard_mobile
description: TrafficGuard AI Mobile Application
version: 2.3.0+1

environment:
  sdk: '>=3.0.0 <4.0.0'

dependencies:
  flutter:
    sdk: flutter
  
  # HTTP & Networking
  dio: ^5.3.0
  http: ^1.1.0
  web_socket_channel: ^2.4.0
  
  # Maps & Location
  google_maps_flutter: ^2.5.0
  geolocator: ^10.1.0
  geocoding: ^2.1.0
  
  # Camera & Media
  camera: ^0.10.5+5
  video_player: ^2.8.1
  image_picker: ^1.0.4
  
  # State Management
  provider: ^6.0.5
  
  # Storage
  shared_preferences: ^2.2.0
  path_provider: ^2.1.1
  
  # Firebase
  firebase_core: ^2.24.0
  firebase_messaging: ^14.7.0
  
  # UI Components
  cupertino_icons: ^1.0.2
  flutter_local_notifications: ^16.1.0
  
  # Utilities
  intl: ^0.18.1
  connectivity_plus: ^5.0.1

dev_dependencies:
  flutter_test:
    sdk: flutter
  flutter_lints: ^2.0.0

flutter:
  uses-material-design: true
  
  assets:
    - assets/images/
    - assets/icons/
```

---

## 9. Government Dashboard (Frontend)

### 9.1 Overview

The government dashboard is built with **React.js**, providing real-time traffic monitoring for government officials.

### 9.2 Project Structure

```
government-dashboard/
├── src/
│   ├── index.js                 # Entry point
│   ├── App.js                   # Root component
│   │
│   ├── components/
│   │   ├── Header.jsx           # Navigation header
│   │   ├── Sidebar.jsx          # Side navigation
│   │   ├── MapView.jsx          # Google Maps component
│   │   ├── IncidentList.jsx     # Incident table
│   │   ├── AlertPanel.jsx       # Real-time alerts
│   │   ├── Statistics.jsx       # Analytics dashboard
│   │   └── CameraFeed.jsx       # Live camera view
│   │
│   ├── pages/
│   │   ├── Dashboard.jsx        # Main dashboard
│   │   ├── Incidents.jsx        # Incident management
│   │   ├── Analytics.jsx        # Reports & analytics
│   │   ├── Cameras.jsx          # Camera management
│   │   └── Settings.jsx         # System settings
│   │
│   ├── services/
│   │   ├── api.js               # API client
│   │   ├── websocket.js         # WebSocket connection
│   │   └── auth.js              # Authentication
│   │
│   ├── store/
│   │   ├── index.js             # Redux store
│   │   ├── incidentSlice.js     # Incident state
│   │   └── authSlice.js         # Auth state
│   │
│   └── styles/
│       └── main.css             # Global styles
│
├── public/
│   └── index.html
│
├── package.json
└── .env
```

### 9.3 Main Dashboard Component

**File: `government-dashboard/src/pages/Dashboard.jsx`**

```jsx
import React, { useEffect, useState } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import MapView from '../components/MapView';
import IncidentList from '../components/IncidentList';
import AlertPanel from '../components/AlertPanel';
import Statistics from '../components/Statistics';
import { fetchIncidents } from '../store/incidentSlice';
import { connectWebSocket } from '../services/websocket';

const Dashboard = () => {
  const dispatch = useDispatch();
  const { incidents, loading } = useSelector(state => state.incidents);
  const [selectedIncident, setSelectedIncident] = useState(null);

  useEffect(() => {
    // Fetch initial data
    dispatch(fetchIncidents());
    
    // Connect to WebSocket for real-time updates
    const ws = connectWebSocket((data) => {
      if (data.type === 'incident_update') {
        dispatch(fetchIncidents());
      }
    });
    
    return () => ws.close();
  }, [dispatch]);

  return (
    <div className="dashboard">
      <div className="dashboard-header">
        <h1>TrafficGuard AI - Control Center</h1>
        <Statistics incidents={incidents} />
      </div>
      
      <div className="dashboard-content">
        <div className="map-container">
          <MapView 
            incidents={incidents}
            onIncidentSelect={setSelectedIncident}
          />
        </div>
        
        <div className="sidebar">
          <AlertPanel />
          <IncidentList 
            incidents={incidents}
            loading={loading}
            selectedId={selectedIncident?.id}
            onSelect={setSelectedIncident}
          />
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
```

### 9.4 WebSocket Service

**File: `government-dashboard/src/services/websocket.js`**

```javascript
const WS_URL = process.env.REACT_APP_WS_URL || 'ws://localhost:3000';

export function connectWebSocket(onMessage) {
  const ws = new WebSocket(WS_URL);
  
  ws.onopen = () => {
    console.log('WebSocket connected');
  };
  
  ws.onmessage = (event) => {
    try {
      const data = JSON.parse(event.data);
      onMessage(data);
    } catch (e) {
      console.error('WebSocket message error:', e);
    }
  };
  
  ws.onerror = (error) => {
    console.error('WebSocket error:', error);
  };
  
  ws.onclose = () => {
    console.log('WebSocket disconnected');
    // Reconnect after 5 seconds
    setTimeout(() => connectWebSocket(onMessage), 5000);
  };
  
  return ws;
}
```

---

## 10. System Integration

### 10.1 Integration Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                    SYSTEM INTEGRATION                            │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │                 MOBILE APP (Flutter)                     │   │
│  │  ┌─────────┐  ┌─────────┐  ┌─────────┐  ┌─────────┐    │   │
│  │  │ Camera  │  │ GPS     │  │ Upload  │  │ WebSocket│    │   │
│  │  │ Service │  │ Service │  │ Service │  │ Client  │    │   │
│  │  └────┬────┘  └────┬────┘  └────┬────┘  └────┬────┘    │   │
│  └───────┼────────────┼────────────┼────────────┼──────────┘   │
│          │            │            │            │               │
│          │   HTTP     │   HTTP     │   HTTP     │   WS          │
│          ▼            ▼            ▼            ▼               │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │                 BACKEND API (Node.js)                    │   │
│  │  ┌─────────┐  ┌─────────┐  ┌─────────┐  ┌─────────┐    │   │
│  │  │ Auth    │  │Incidents│  │ Upload  │  │WebSocket│    │   │
│  │  │ API     │  │ API     │  │ Handler │  │ Server  │    │   │
│  │  └────┬────┘  └────┬────┘  └────┬────┘  └────┬────┘    │   │
│  └───────┼────────────┼────────────┼────────────┼──────────┘   │
│          │            │            │            │               │
│          │    SQL     │    SQL     │    HTTP    │   Broadcast   │
│          ▼            ▼            ▼            ▼               │
│  ┌───────────────┐  ┌─────────────────────────────────────┐    │
│  │  PostgreSQL   │  │         AI SERVICE (Python)          │    │
│  │  ┌─────────┐  │  │  ┌─────────┐  ┌─────────┐           │    │
│  │  │ Users   │  │  │  │ Video   │  │Incident │           │    │
│  │  │Incidents│  │  │  │Analyzer │  │Detector │           │    │
│  │  │ Alerts  │  │  │  └─────────┘  └─────────┘           │    │
│  │  └─────────┘  │  └─────────────────────────────────────┘    │
│  └───────────────┘                                              │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### 10.2 API Communication Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                 REQUEST/RESPONSE FLOW                            │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  1. AUTHENTICATION                                              │
│  ┌────────┐    POST /api/auth/login    ┌────────┐              │
│  │ Client │ ─────────────────────────▶ │ Backend│              │
│  │        │ ◀───────────────────────── │        │              │
│  └────────┘    {token, user}           └────────┘              │
│                                                                 │
│  2. DATA RETRIEVAL                                              │
│  ┌────────┐    GET /api/incidents      ┌────────┐              │
│  │ Client │ ─────────────────────────▶ │ Backend│              │
│  │+ Token │ ◀───────────────────────── │        │              │
│  └────────┘    {incidents[]}           └────────┘              │
│                                                                 │
│  3. VIDEO UPLOAD                                                │
│  ┌────────┐    POST /api/detect        ┌────────┐              │
│  │ Client │ ─────────────────────────▶ │ Backend│              │
│  │+ Video │                            │        │              │
│  └────────┘                            └───┬────┘              │
│       ▲                                    │                    │
│       │ 202 Accepted                       │ HTTP               │
│       │                                    ▼                    │
│       │                            ┌────────────┐              │
│       │                            │ AI Service │              │
│       │                            │  Analyze   │              │
│       │                            └─────┬──────┘              │
│       │                                  │                      │
│       │    WebSocket: incident_update    │                      │
│       └──────────────────────────────────┘                      │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### 10.3 Real-time Updates

The system uses WebSocket connections for real-time updates:

```javascript
// Backend broadcasts to all connected clients
function broadcast(data) {
  wss.clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(JSON.stringify(data));
    }
  });
}

// Event types
const eventTypes = {
  INCIDENT_NEW: 'incident_new',
  INCIDENT_UPDATE: 'incident_update',
  ALERT_NEW: 'alert_new',
  TRAFFIC_UPDATE: 'traffic_update'
};

// Example broadcast
broadcast({
  type: eventTypes.INCIDENT_NEW,
  data: newIncident,
  timestamp: new Date().toISOString()
});
```

---

## 11. API Documentation

### 11.1 Authentication Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/login` | User login |
| POST | `/api/auth/register` | User registration |
| POST | `/api/auth/logout` | User logout |
| GET | `/api/auth/verify` | Verify token |

**Login Request:**
```json
POST /api/auth/login
{
  "email": "officer@trafficguard.ai",
  "password": "password123"
}
```

**Login Response:**
```json
{
  "success": true,
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": 1,
    "email": "officer@trafficguard.ai",
    "name": "Police Officer",
    "role": "police"
  }
}
```

### 11.2 Incident Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/incidents` | List all incidents |
| GET | `/api/incidents/:id` | Get incident by ID |
| POST | `/api/incidents` | Create incident |
| PUT | `/api/incidents/:id` | Update incident |
| DELETE | `/api/incidents/:id` | Delete incident |

**Get Incidents Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "incident_type": "accident",
      "severity": "high",
      "status": "reported",
      "latitude": -1.9441,
      "longitude": 30.0619,
      "description": "Vehicle collision at KN 3 Ave",
      "created_at": "2026-01-26T10:30:00Z"
    }
  ]
}
```

### 11.3 Detection Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/detect` | Upload video for analysis |
| GET | `/api/detect/status/:id` | Check analysis status |

**Upload Request:**
```
POST /api/detect
Content-Type: multipart/form-data

video: [binary file]
latitude: -1.9441
longitude: 30.0619
description: "Incident at roundabout"
```

**Upload Response:**
```json
{
  "success": true,
  "message": "Video uploaded successfully. Processing in background.",
  "incident": {
    "id": 48,
    "status": "processing"
  }
}
```

### 11.4 AI Service Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/ai/analyze-traffic` | Analyze video |
| GET | `/ai/status` | Service status |
| GET | `/health` | Health check |

**Analysis Response:**
```json
{
  "success": true,
  "incident_detected": true,
  "incident_type": "accident",
  "severity": "high",
  "confidence": 0.87,
  "vehicles_detected": 3,
  "description": "Multi-vehicle collision detected"
}
```

---

## 12. Deployment Guide

### 12.1 Prerequisites

- Docker & Docker Compose
- Node.js 18+ (for development)
- Python 3.11+ (for development)
- Flutter SDK 3.x (for mobile development)
- PostgreSQL 15 (if running without Docker)

### 12.2 Quick Start with Docker

```bash
# Clone repository
git clone https://github.com/patrickjambo/New_Traffic_Project.git
cd New_Traffic_Project

# Start all services
docker-compose up -d

# Check status
docker-compose ps

# View logs
docker-compose logs -f
```

### 12.3 Manual Deployment

```bash
# 1. Start Database
docker-compose up -d postgres

# 2. Start Backend
cd backend
npm install
npm start

# 3. Start AI Service
cd ai_service
pip install -r requirements.txt
python main.py

# 4. Build Mobile App
cd mobile_app
flutter pub get
flutter build apk --release
```

### 12.4 Environment Setup

**Backend (.env):**
```env
PORT=3000
DB_HOST=localhost
DB_PORT=5432
DB_NAME=trafficguard
DB_USER=trafficguard_user
DB_PASSWORD=s_123
AI_SERVICE_URL=http://localhost:8000
JWT_SECRET=your_secret_key
```

**Mobile App (environment.dart):**
```dart
static const String serverIP = 'YOUR_SERVER_IP';
static const String serverPort = '3000';
```

### 12.5 Service Ports

| Service | Port | Protocol |
|---------|------|----------|
| Backend API | 3000 | HTTP |
| AI Service | 8000 | HTTP |
| PostgreSQL | 5432 | TCP |
| WebSocket | 3000 | WS |

---

## 13. Security Implementation

### 13.1 Authentication Security

- **JWT Tokens**: 24-hour expiration
- **Password Hashing**: bcrypt with salt rounds of 10
- **HTTPS**: Required for production
- **Token Refresh**: Automatic token refresh mechanism

### 13.2 API Security

- **Rate Limiting**: 100 requests per minute per IP
- **Input Validation**: All inputs sanitized
- **SQL Injection Prevention**: Parameterized queries
- **CORS**: Configured for allowed origins

### 13.3 Data Security

- **Encryption at Rest**: Database encryption
- **Encryption in Transit**: TLS 1.3
- **Access Control**: Role-based permissions

---

## 14. Testing Strategy

### 14.1 Test Categories

| Category | Tool | Coverage |
|----------|------|----------|
| Unit Tests | Jest/pytest | Components |
| Integration | Supertest | API endpoints |
| E2E | Cypress | User flows |
| Performance | Artillery | Load testing |

### 14.2 Running Tests

```bash
# Backend tests
cd backend
npm test

# AI Service tests
cd ai_service
pytest

# Mobile tests
cd mobile_app
flutter test

# E2E tests
npm run test:e2e
```

### 14.3 Test Coverage Goals

- Unit Tests: 80%+
- Integration Tests: 70%+
- E2E Tests: Critical paths

---

## 15. Performance Optimization

### 15.1 Backend Optimizations

- **Connection Pooling**: 20 max connections
- **Async Processing**: Background AI analysis
- **Caching**: Redis for frequent queries
- **Compression**: Gzip enabled

### 15.2 Database Optimizations

- **Indexes**: On frequently queried columns
- **Query Optimization**: EXPLAIN ANALYZE
- **Partitioning**: For large tables

### 15.3 Mobile Optimizations

- **Image Compression**: Before upload
- **Lazy Loading**: For lists
- **Offline Support**: Local caching

---

## Appendix

### A. Troubleshooting

**Issue: Connection Refused**
```bash
# Check if services are running
docker-compose ps

# Check network connectivity
curl http://localhost:3000/api/health
```

**Issue: Map Not Loading**
- Verify Google Maps API key
- Check package name matches API restriction
- Ensure billing is enabled

### B. Contact & Support

- **Project Repository**: https://github.com/patrickjambo/New_Traffic_Project
- **Documentation**: /docs folder
- **Issues**: GitHub Issues

---

*Document generated for TrafficGuard AI v2.3*
*Last updated: January 26, 2026*
