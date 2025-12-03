# 🚦 TrafficGuard AI - React Frontend

A modern, responsive React frontend for the TrafficGuard AI traffic management system.

## 🚀 Features

- ✅ Modern React 18 with Hooks
- ✅ Material-UI (MUI) for beautiful components
- ✅ Real-time updates with Socket.IO
- ✅ Leaflet maps for traffic visualization
- ✅ Framer Motion animations
- ✅ Role-based authentication (Public, Police, Admin)
- ✅ Responsive design for all devices
- ✅ Hot toast notifications
- ✅ Protected routes

## 📦 Installation

### Step 1: Install Dependencies

```bash
cd ~/New_Traffic_Project/trafficguard-react
npm install
```

### Step 2: Configure Environment

The `.env` file is already configured with:
- Backend API: http://localhost:3000
- WebSocket: http://localhost:3000
- Frontend Port: 3001

### Step 3: Start the Development Server

```bash
npm start
```

The app will open at **http://localhost:3001**

## 🎨 Project Structure

```
trafficguard-react/
├── public/
│   └── index.html
├── src/
│   ├── components/
│   │   └── auth/
│   │       └── PrivateRoute.js
│   ├── pages/
│   │   ├── Auth/
│   │   │   └── Login.js
│   │   ├── PublicHome/
│   │   ├── UserDashboard/
│   │   ├── PoliceDashboard/
│   │   └── AdminDashboard/
│   ├── services/
│   │   ├── api.js
│   │   └── auth.js
│   ├── contexts/
│   │   └── AuthContext.js
│   ├── styles/
│   │   ├── theme.js
│   │   └── global.css
│   ├── App.js
│   └── index.js
├── package.json
└── .env
```

## 🔐 Authentication

### User Roles:
- **Public**: Can view incidents and report new ones
- **Police**: Can manage incidents and respond to emergencies
- **Admin**: Full system access including user management

### Login Credentials:
Test with your existing backend users or register a new account.

## 🛠️ Available Scripts

- `npm start` - Start development server
- `npm build` - Build for production
- `npm test` - Run tests

## 🌐 API Integration

The frontend connects to your existing backend at `http://localhost:3000`:
- Authentication: `/api/auth/login`, `/api/auth/register`
- Incidents: `/api/incidents`
- Dashboard: `/api/dashboard`
- Users: `/api/admin/users` (admin only)

## 📱 Responsive Design

- Desktop: Full featured dashboard
- Tablet: Optimized layout
- Mobile: Touch-friendly interface

## 🎨 Theme

Beautiful color scheme:
- Primary: #4285F4 (Google Blue)
- Secondary: #34A853 (Green)
- Warning: #FBBC05 (Yellow)
- Error: #EA4335 (Red)

## 🔄 Real-Time Features

- Live incident updates via WebSocket
- Real-time notifications
- Traffic updates
- Emergency alerts

## 📝 Next Steps

1. Install dependencies: `npm install`
2. Start the app: `npm start`
3. Login or register
4. Explore the dashboards

## 🐛 Troubleshooting

### Port Already in Use
If port 3001 is busy:
```bash
PORT=3002 npm start
```

### Backend Connection Issues
Ensure your backend is running on port 3000:
```bash
cd ~/New_Traffic_Project/backend
npm run dev
```

## 📦 Production Build

```bash
npm run build
```

Builds the app for production to the `build` folder.

---

**Built with ❤️ using React, Material-UI, and modern web technologies**
