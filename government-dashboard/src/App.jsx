import React, { useState } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { WebSocketProvider } from './context/WebSocketContext';
import { DataProvider } from './context/DataContext';
import Sidebar from './components/Sidebar';
import Header from './components/Header';
import HomePage from './pages/HomePage';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import Dashboard from './pages/Dashboard';
import DashboardPage from './pages/DashboardPage';
import Incidents from './pages/Incidents';
import Reports from './pages/Reports';
import Emergency from './pages/Emergency';
import Analytics from './pages/Analytics';
import Settings from './pages/Settings';

function AppContent() {
  const { isAuthenticated, user } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // If user is admin/police, show the admin dashboard layout with sidebar
  if (isAuthenticated && (user?.role === 'admin' || user?.role === 'police')) {
    return (
      <div className="flex h-screen bg-slate-900 relative overflow-hidden">
        {/* Background Watermark */}
        <div className="absolute inset-0 pointer-events-none z-0">
          <div className="absolute inset-0 bg-gradient-to-br from-slate-900 via-slate-900 to-blue-950 opacity-90"></div>
          <img
            src="/assets/rnp-logo.png"
            alt=""
            className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] object-contain opacity-5"
            style={{
              filter: 'grayscale(100%) brightness(2)'
            }}
          />
        </div>

        <div className="relative z-10 flex h-full w-full">
          <Sidebar isOpen={sidebarOpen} />

          <div className="flex-1 flex flex-col overflow-hidden">
            <Header onMenuClick={() => setSidebarOpen(!sidebarOpen)} />

            <main className="flex-1 overflow-x-hidden overflow-y-auto">
              <Routes>
                <Route path="/" element={<Navigate to="/dashboard" replace />} />
                <Route path="/dashboard" element={<DashboardPage />} />
                <Route path="/incidents" element={<Incidents />} />
                <Route path="/reports" element={<Reports />} />
                <Route path="/emergency" element={<Emergency />} />
                <Route path="/analytics" element={<Analytics />} />
                <Route path="/settings" element={<Settings />} />
                <Route path="*" element={<Navigate to="/dashboard" replace />} />
              </Routes>
            </main>
          </div>
        </div>
      </div>
    );
  }

  // For public users, show the regular layout
  return (
    <div className="min-h-screen bg-gray-50">
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/dashboard" element={<DashboardPage />} />
        <Route path="/incidents" element={<HomePage />} />
        <Route path="/report" element={<HomePage />} />
        <Route path="/emergency" element={<HomePage />} />
      </Routes>
    </div>
  );
}

function App() {
  return (
    <AuthProvider>
      <WebSocketProvider>
        <DataProvider>
          <AppContent />
        </DataProvider>
      </WebSocketProvider>
    </AuthProvider>
  );
}

export default App;

