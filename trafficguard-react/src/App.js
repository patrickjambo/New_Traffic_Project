import React, { useMemo } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import { Toaster } from 'react-hot-toast';
import { AuthProvider } from './contexts/AuthContext';
import { NotificationProvider } from './contexts/NotificationContext';
import { ThemeContextProvider, useTheme } from './contexts/ThemeContext';
import { getLightTheme, getDarkTheme } from './styles/theme';
import './styles/global.css';

// Pages
import Login from './pages/Auth/Login';
import Register from './pages/Auth/Register';
import PublicHome from './pages/PublicHome';
import UserDashboard from './pages/UserDashboard';
import PoliceDashboard from './pages/PoliceDashboard';
import AdminDashboard from './pages/AdminDashboard';

// Components
import PrivateRoute from './components/auth/PrivateRoute';

const AppContent = () => {
  const { darkMode } = useTheme();

  const muiTheme = useMemo(
    () => createTheme(darkMode ? getDarkTheme() : getLightTheme()),
    [darkMode]
  );


  return (
    <ThemeProvider theme={muiTheme}>
      <CssBaseline />
      <AuthProvider>
        <NotificationProvider>
          <Router>
            <Routes>
              {/* Public Routes */}
              <Route path="/" element={<PublicHome />} />
              <Route path="/login" element={<Login />} />
              <Route path="/register" element={<Register />} />

              {/* Protected Routes */}
              <Route element={<PrivateRoute allowedRoles={['public', 'police', 'admin']} />}>
                <Route path="/dashboard" element={<UserDashboard />} />
              </Route>

              <Route element={<PrivateRoute allowedRoles={['police', 'admin']} />}>
                <Route path="/police" element={<PoliceDashboard />} />
              </Route>

              <Route element={<PrivateRoute allowedRoles={['admin']} />}>
                <Route path="/admin" element={<AdminDashboard />} />
              </Route>

              {/* Fallback */}
              <Route path="*" element={<Navigate to="/" />} />
            </Routes>
          </Router>

          <Toaster
            position="top-right"
            toastOptions={{
              duration: 4000,
              className: 'modern-toast',
              style: {
                background: darkMode ? 'rgba(30, 30, 30, 0.8)' : 'rgba(255, 255, 255, 0.8)',
                backdropFilter: 'blur(10px)',
                color: darkMode ? '#fff' : '#333',
                borderRadius: '16px',
                padding: '16px',
                boxShadow: '0 8px 32px rgba(0, 0, 0, 0.1)',
                border: darkMode ? '1px solid rgba(255, 255, 255, 0.1)' : '1px solid rgba(255, 255, 255, 0.4)',
                fontSize: '14px',
                fontWeight: 500,
              },
              success: {
                duration: 4000,
                iconTheme: {
                  primary: '#34A853',
                  secondary: '#fff',
                },
                style: {
                  borderLeft: '4px solid #34A853',
                },
              },
              error: {
                duration: 5000,
                iconTheme: {
                  primary: '#EA4335',
                  secondary: '#fff',
                },
                style: {
                  borderLeft: '4px solid #EA4335',
                },
              },
              loading: {
                style: {
                  borderLeft: '4px solid #4285F4',
                },
              },
            }}
          />
        </NotificationProvider>
      </AuthProvider>
    </ThemeProvider>
  );
};

function App() {
  return (
    <ThemeContextProvider>
      <AppContent />
    </ThemeContextProvider>
  );
}

export default App;
