# TrafficGuard AI - Web Dashboard Frontend

Modern, responsive web dashboard for TrafficGuard AI traffic management platform.

## 🎯 Features

### Public Home Page
- ✅ Real-time interactive map with OpenStreetMap + Leaflet.js
- ✅ Live incident visualization with custom markers
- ✅ Location search functionality (Nominatim geocoding)
- ✅ Traffic status dashboard with statistics
- ✅ WebSocket integration for real-time updates
- ✅ Login/Registration modals with role-based access
- ✅ Responsive design (mobile, tablet, desktop)

### Police Officer Dashboard
- ✅ Enhanced incident management panel
- ✅ Priority-based incident display (High/Medium/Low)
- ✅ Incident assignment functionality
- ✅ Broadcast alert system
- ✅ Quick response tools
- ✅ Real-time incident updates

### Administrator Dashboard
- ✅ System-wide metrics and analytics
- ✅ Tabbed navigation (Dashboard, Incidents, Users, Analytics)
- ✅ Activity logs and monitoring
- ✅ User management interface
- ✅ Report generation tools
- ✅ AI performance monitoring

## 🚀 Technology Stack

- **HTML5** - Semantic structure
- **CSS3** - Modern styling with CSS Grid, Flexbox, and animations
- **Vanilla JavaScript** - No framework dependencies
- **Leaflet.js** - Interactive maps
- **OpenStreetMap** - Free map tiles (no API key required)
- **Socket.IO** - Real-time WebSocket communication
- **Inter Font** - Premium typography

## 📁 Project Structure

```
frontend/
├── index.html                 # Public home page
├── police-dashboard.html      # Police officer dashboard
├── admin-dashboard.html       # Administrator dashboard
├── css/
│   ├── main.css              # Core styles and design system
│   └── maps.css              # Map-specific styling
└── js/
    ├── app.js                # Core application logic & API client
    ├── auth.js               # Authentication handling
    ├── map.js                # Map initialization & management
    ├── incidents.js          # Incident CRUD operations
    └── websocket.js          # Real-time WebSocket client
```

## 🎨 Design System

### Color Palette
- **Primary**: #4285F4 (Google Blue)
- **Success**: #34A853 (Green)
- **Warning**: #FBBC05 (Yellow)
- **Danger**: #EA4335 (Red)
- **Dark**: #202124
- **Light**: #F8F9FA

### Features
- Smooth animations and micro-interactions
- Glassmorphism effects
- Custom gradient backgrounds
- Responsive breakpoints
- Accessible color contrast
- Modern shadows and depth

## 🔧 Configuration

### Backend API URL
Edit `js/app.js` to configure your backend URL:

```javascript
const CONFIG = {
    API_URL: 'http://localhost:3000',
    WS_URL: 'http://localhost:3000',
    // ...
};
```

### Map Settings
Default location is set to Kigali, Rwanda:

```javascript
DEFAULT_CENTER: [-1.9441, 30.0619], // Kigali coordinates
DEFAULT_ZOOM: 13,
```

## 📖 Usage

### Public Users
1. Visit the homepage (`/`)
2. View real-time traffic incidents on the map
3. Search for locations in Kigali
4. Click "Login" to access user-specific features
5. Click "Sign Up" to create a new account

### Police Officers
1. Login with police credentials
2. Access `/police-dashboard.html`
3. View and manage assigned incidents
4. Assign incidents to yourself
5. Mark incidents as resolved
6. Broadcast alerts to public users

### Administrators
1. Login with admin credentials
2. Access `/admin-dashboard.html`
3. Monitor system metrics
4. Manage users
5. View analytics and generate reports
6. Monitor system activity

## 🌐 API Integration

The frontend integrates with the backend API:

### Authentication
- `POST /api/auth/login` - User login
- `POST /api/auth/register` - User registration
- `POST /api/auth/logout` - User logout

### Incidents
- `GET /api/incidents` - Get all incidents
- `GET /api/incidents/:id` - Get incident by ID
- `POST /api/incidents` - Create new incident
- `PUT /api/incidents/:id` - Update incident

### Police
- `GET /api/police/incidents` - Get assigned incidents
- `POST /api/police/broadcast` - Broadcast alert

### Admin
- `GET /api/admin/metrics` - System metrics
- `GET /api/admin/users` - User list

## 🔌 WebSocket Events

### Client Listens For:
- `new_incident` - New incident reported
- `incident_updated` - Incident status changed
- `incident_resolved` - Incident marked as resolved
- `broadcast_alert` - Police/Admin alert
- `system_announcement` - System-wide announcement

### Client Emits:
- `join_location` - Join location-based room
- Custom events via `emitEvent()` function

## 📱 Responsive Design

### Breakpoints
- **Desktop**: > 1024px
- **Tablet**: 768px - 1024px
- **Mobile**: < 768px

### Mobile Optimizations
- Vertical layout (map above, sidebar below)
- Touch-friendly buttons (minimum 44px)
- Simplified navigation
- Optimized font sizes

## 🎯 Key Features

### Real-time Updates
- WebSocket connection with auto-reconnection
- Live incident markers
- Real-time statistics
- Push notifications

### Interactive Map
- Custom incident markers with animations
- Popup information cards
- Click to view details
- Get directions functionality
- User geolocation
- Location search

### Authentication
- JWT token storage in localStorage
- Role-based access control
- Auto-redirect based on user role
- Session persistence

### Notifications
- Toast notifications
- Sound alerts (optional)
- Broadcast alerts
- System announcements

## 🚀 Deployment

### Production Build
The frontend is pure HTML/CSS/JS - no build process required.

1. Ensure backend is running on your server
2. Update API URLs in `js/app.js`
3. Deploy frontend files to your web server
4. Configure web server to serve `index.html` for all routes

### CORS Configuration
Ensure backend allows requests from your frontend domain in `.env`:

```env
ALLOWED_ORIGINS=https://yourdomain.com
```

## 🧪 Testing

### Manual Testing Checklist
- [ ] Homepage loads correctly
- [ ] Map displays and is interactive
- [ ] Incidents appear on map
- [ ] Search functionality works
- [ ] Login/Registration modals work
- [ ] WebSocket connects successfully
- [ ] Real-time updates appear
- [ ] Mobile responsive design works
- [ ] Police dashboard loads for police users
- [ ] Admin dashboard loads for admin users

## 🔒 Security

- JWT tokens stored in localStorage
- Role-based route protection
- XSS protection (sanitized inputs)
- CORS configured on backend
- Rate limiting on API

## 🛠️ Browser Support

- ✅ Chrome 90+
- ✅ Firefox 88+
- ✅ Safari 14+
- ✅ Edge 90+

## 📄 License

MIT License - Part of TrafficGuard AI Platform

## 👥 Credits

Built with:
- [Leaflet.js](https://leafletjs.com/) - Interactive maps
- [OpenStreetMap](https://www.openstreetmap.org/) - Map tiles
- [Socket.IO](https://socket.io/) - Real-time communication
- [Inter Font](https://fonts.google.com/specimen/Inter) - Typography
