# TrafficGuard AI - API Documentation

## Base URL
```
http://localhost:3000
```

## Authentication
All protected endpoints require a JWT token in the `Authorization` header:
```
Authorization: Bearer <token>
```

---

## Authentication Endpoints

### Register User
```http
POST /api/auth/register
Content-Type: application/json

{
  "name": "John Doe",
  "email": "john@example.com",
  "phone": "+250788123456",
  "password": "securePassword123",
  "role": "public"  // or "police", "admin"
}
```

**Response (201)**:
```json
{
  "success": true,
  "message": "User registered successfully",
  "token": "eyJhbGciOiJIUzI1NiIs...",
  "user": {
    "id": "user-uuid",
    "name": "John Doe",
    "email": "john@example.com",
    "role": "public"
  }
}
```

---

### Login
```http
POST /api/auth/login
Content-Type: application/json

{
  "email": "john@example.com",
  "password": "securePassword123",
  "role": "public"
}
```

**Response (200)**:
```json
{
  "success": true,
  "message": "Login successful",
  "token": "eyJhbGciOiJIUzI1NiIs...",
  "user": {
    "id": "user-uuid",
    "name": "John Doe",
    "email": "john@example.com",
    "role": "public"
  }
}
```

---

### Get Profile
```http
GET /api/auth/profile
Authorization: Bearer <token>
```

**Response (200)**:
```json
{
  "success": true,
  "data": {
    "id": "user-uuid",
    "name": "John Doe",
    "email": "john@example.com",
    "phone": "+250788123456",
    "role": "public",
    "created_at": "2025-11-27T10:00:00Z"
  }
}
```

---

## Incident Endpoints

### Report Incident
```http
POST /api/incidents/report
Content-Type: multipart/form-data

Form Data:
- type: "congestion" | "accident" | "road_blockage" | "hazard"
- severity: "low" | "medium" | "high" | "critical"
- address: "Kigali Downtown"
- description: "Traffic jam on main road" (optional)
- latitude: -1.9441
- longitude: 30.0619
- video: <file> (optional)
- is_anonymous: false
```

**Response (201)**:
```json
{
  "success": true,
  "message": "Incident reported successfully",
  "data": {
    "id": "incident-uuid",
    "type": "congestion",
    "severity": "high",
    "location": "POINT(30.0619 -1.9441)",
    "createdAt": "2025-11-27T10:30:00Z"
  }
}
```

---

### Get Nearby Incidents
```http
GET /api/incidents?latitude=-1.9441&longitude=30.0619&radius=5&status=active&type=congestion&limit=20&offset=0
```

**Query Parameters**:
- `latitude`: Center latitude (required)
- `longitude`: Center longitude (required)
- `radius`: Search radius in km (default: 5)
- `status`: Filter by status (optional)
- `type`: Filter by incident type (optional)
- `limit`: Results per page (default: 20)
- `offset`: Pagination offset (default: 0)

**Response (200)**:
```json
{
  "success": true,
  "data": {
    "incidents": [
      {
        "id": "incident-uuid",
        "type": "congestion",
        "severity": "high",
        "status": "active",
        "latitude": -1.9441,
        "longitude": 30.0619,
        "address": "Kigali Downtown",
        "description": "Heavy traffic",
        "distance_km": 0.5,
        "reported_by_name": "Jane Smith",
        "created_at": "2025-11-27T10:00:00Z"
      }
    ],
    "count": 1
  }
}
```

---

### Get Incident by ID
```http
GET /api/incidents/:id
```

**Response (200)**:
```json
{
  "success": true,
  "data": {
    "id": "incident-uuid",
    "type": "accident",
    "severity": "critical",
    "status": "in_progress",
    "latitude": -1.9441,
    "longitude": 30.0619,
    "address": "Kigali Downtown",
    "description": "Vehicle collision",
    "video_url": "/uploads/incident-1234567890.mp4",
    "reported_by_name": "John Doe",
    "verified_by_name": "Officer Smith",
    "created_at": "2025-11-27T10:00:00Z",
    "updated_at": "2025-11-27T10:15:00Z"
  }
}
```

---

### Update Incident Status
```http
PATCH /api/incidents/:id/status
Authorization: Bearer <token>
Content-Type: application/json

{
  "status": "resolved",
  "comment": "Issue has been cleared"
}
```

**Response (200)**:
```json
{
  "success": true,
  "message": "Incident status updated",
  "data": {
    "id": "incident-uuid",
    "status": "resolved",
    "updated_at": "2025-11-27T10:30:00Z"
  }
}
```

---

## Police Endpoints

### Get Police Incidents
```http
GET /api/police/incidents?status=active&type=accident&assigned=me
Authorization: Bearer <token>
```

**Query Parameters**:
- `status`: Filter by status (optional)
- `type`: Filter by type (optional)
- `assigned`: "me" | "unassigned" | undefined

**Response (200)**:
```json
{
  "success": true,
  "data": [
    {
      "id": "incident-uuid",
      "type": "accident",
      "severity": "high",
      "status": "in_progress",
      "latitude": -1.9441,
      "longitude": 30.0619,
      "location": "Kigali Downtown",
      "is_assigned_to_me": true,
      "created_at": "2025-11-27T10:00:00Z"
    }
  ],
  "stats": {
    "unassigned_count": 5,
    "assigned_to_me_count": 3,
    "high_priority_count": 2
  }
}
```

---

### Assign Incident
```http
PUT /api/police/incidents/:id/assign
Authorization: Bearer <token>
```

**Response (200)**:
```json
{
  "success": true,
  "message": "Incident assigned successfully",
  "data": {
    "id": "incident-uuid",
    "status": "in_progress",
    "verified_by": "officer-uuid"
  }
}
```

---

### Broadcast Alert
```http
POST /api/police/broadcast
Authorization: Bearer <token>
Content-Type: application/json

{
  "message": "Major traffic jam on KN 1 road. Avoid this route.",
  "type": "warning"
}
```

**Response (200)**:
```json
{
  "success": true,
  "message": "Alert broadcasted successfully"
}
```

---

### Get Police Statistics
```http
GET /api/police/stats
Authorization: Bearer <token>
```

**Response (200)**:
```json
{
  "success": true,
  "data": {
    "my_active_incidents": 3,
    "unassigned_incidents": 5,
    "resolved_today": 12,
    "high_priority": 2
  }
}
```

---

## Admin Endpoints

### Get System Metrics
```http
GET /api/admin/metrics
Authorization: Bearer <token>
```

**Response (200)**:
```json
{
  "success": true,
  "data": {
    "total_incidents": 156,
    "active_incidents": 12,
    "resolved_today": 45,
    "total_users": 234,
    "active_officers": 18,
    "average_resolution_time_minutes": 23
  }
}
```

---

### Get Users
```http
GET /api/admin/users?role=police&limit=20&offset=0
Authorization: Bearer <token>
```

**Response (200)**:
```json
{
  "success": true,
  "data": [
    {
      "id": "user-uuid",
      "name": "Officer Smith",
      "email": "officer@police.rw",
      "phone": "+250788123456",
      "role": "police",
      "active_incidents": 3,
      "resolved_incidents": 45,
      "created_at": "2025-11-20T09:00:00Z"
    }
  ],
  "count": 18
}
```

---

### Generate Analytics Report
```http
POST /api/admin/analytics/report
Authorization: Bearer <token>
Content-Type: application/json

{
  "start_date": "2025-11-01",
  "end_date": "2025-11-27",
  "report_type": "summary"  // or "detailed"
}
```

**Response (200)**:
```json
{
  "success": true,
  "data": {
    "period": {
      "start": "2025-11-01",
      "end": "2025-11-27"
    },
    "incidents_by_type": {
      "congestion": 45,
      "accident": 12,
      "road_blockage": 8
    },
    "incidents_by_severity": {
      "low": 20,
      "medium": 25,
      "high": 15,
      "critical": 5
    },
    "average_resolution_time": 23,
    "most_active_area": "Kigali Downtown",
    "peak_hours": [8, 9, 17, 18]
  }
}
```

---

## AI Service Endpoints

### Analyze Traffic Video
```http
POST http://localhost:8000/ai/analyze-traffic
Content-Type: multipart/form-data

Form Data:
- video: <file> (mp4, mov, avi, mkv)
```

**Response (200)**:
```json
{
  "success": true,
  "data": {
    "incident_detected": true,
    "incident_type": "congestion",
    "confidence": 0.92,
    "vehicle_count": 45,
    "avg_speed": 15.5,
    "analysis_time": 12.34,
    "video_filename": "incident-video.mp4",
    "video_size_mb": 25.5
  }
}
```

---

### Health Check
```http
GET http://localhost:8000/health
```

**Response (200)**:
```json
{
  "status": "healthy",
  "timestamp": 1701067200,
  "model_loaded": true
}
```

---

## Error Responses

### 400 Bad Request
```json
{
  "success": false,
  "message": "Invalid request data",
  "errors": {
    "email": "Email is required",
    "password": "Password must be at least 8 characters"
  }
}
```

### 401 Unauthorized
```json
{
  "success": false,
  "message": "Invalid or expired token"
}
```

### 403 Forbidden
```json
{
  "success": false,
  "message": "Insufficient permissions"
}
```

### 404 Not Found
```json
{
  "success": false,
  "message": "Incident not found"
}
```

### 500 Internal Server Error
```json
{
  "success": false,
  "message": "Failed to process request",
  "error": "Detailed error message"
}
```

---

## WebSocket Events

### Client Listens For:
- `new_incident` - New incident reported
- `incident_updated` - Incident status changed
- `incident_resolved` - Incident marked as resolved
- `broadcast_alert` - Police/Admin alert
- `system_announcement` - System-wide announcement

### Client Emits:
- `join_location` - Join location-based room
  ```javascript
  socket.emit('join_location', {
    latitude: -1.9441,
    longitude: 30.0619
  });
  ```

---

## Rate Limiting

All API endpoints are rate-limited to **100 requests per 15 minutes** per IP address.

If limit exceeded:
```json
{
  "success": false,
  "message": "Too many requests from this IP, please try again later."
}
```

---

## Status Codes

| Code | Meaning |
|------|---------|
| 200 | OK - Request successful |
| 201 | Created - Resource created successfully |
| 400 | Bad Request - Invalid input |
| 401 | Unauthorized - Authentication required |
| 403 | Forbidden - Insufficient permissions |
| 404 | Not Found - Resource doesn't exist |
| 500 | Server Error - Internal error |

---

## Example Requests

### cURL
```bash
# Login
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "john@example.com",
    "password": "password123",
    "role": "public"
  }'

# Report Incident
curl -X POST http://localhost:3000/api/incidents/report \
  -H "Authorization: Bearer <token>" \
  -F "type=congestion" \
  -F "severity=high" \
  -F "address=Kigali Downtown" \
  -F "latitude=-1.9441" \
  -F "longitude=30.0619" \
  -F "video=@video.mp4"

# Get Nearby Incidents
curl "http://localhost:3000/api/incidents?latitude=-1.9441&longitude=30.0619&radius=5" \
  -H "Authorization: Bearer <token>"
```

### JavaScript (Fetch API)
```javascript
// Login
const response = await fetch('http://localhost:3000/api/auth/login', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    email: 'john@example.com',
    password: 'password123',
    role: 'public'
  })
});

const data = await response.json();
localStorage.setItem('token', data.token);

// Get Incidents
const incidents = await fetch(
  'http://localhost:3000/api/incidents?latitude=-1.9441&longitude=30.0619&radius=5',
  {
    headers: {
      'Authorization': `Bearer ${localStorage.getItem('token')}`
    }
  }
).then(r => r.json());
```

---

## Support

For issues or questions, please refer to:
- Backend: `backend/README.md`
- Frontend: `frontend/README.md`
- AI Service: `ai_service/README.md`
- Mobile App: `mobile_app/README.md`

**Version**: 1.0.0
**Last Updated**: November 27, 2025
