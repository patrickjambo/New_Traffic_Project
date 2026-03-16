import React, { useState } from 'react';
import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { WebSocketProvider } from './context/WebSocketContext';
import { DataProvider } from './context/DataContext';
import Sidebar from './components/Sidebar';
import Header from './components/Header';
import ErrorBoundary from './components/ErrorBoundary';
import useKeyboardNavigation from './hooks/useKeyboardNavigation';
import HomePage from './pages/HomePage';
import LoginPage from './pages/LoginPage';
// RegisterPage removed - no public registration allowed
import Dashboard from './pages/Dashboard';
import DashboardPage from './pages/DashboardPage';
import Incidents from './pages/Incidents';
import Reports from './pages/Reports';
import Emergency from './pages/Emergency';
import Analytics from './pages/Analytics';
import Settings from './pages/Settings';
import Profile from './pages/Profile';
import DeploymentsPage from './pages/DeploymentsPage';
import GeoFencingPage from './pages/GeoFencingPage';
import OfficerManagement from './pages/OfficerManagement';

// Sidebar menu items definition (shared between sidebar and keyboard nav)
const allMenuItems = [
  { path: '/', label: 'Home', roles: ['public', 'police', 'admin', 'district_admin', 'co_admin'] },
  { path: '/dashboard', label: 'Dashboard', roles: ['police', 'admin', 'district_admin', 'co_admin'] },
  { path: '/incidents', label: 'Incidents', roles: ['police', 'admin', 'district_admin', 'co_admin'] },
  { path: '/reports', label: 'Reports', roles: ['police', 'admin', 'district_admin', 'co_admin'] },
  { path: '/emergency', label: 'Emergency', roles: ['police', 'admin', 'district_admin', 'co_admin'] },
  { path: '/deployments', label: 'Deployments', roles: ['police', 'admin', 'district_admin', 'co_admin'] },
  { path: '/geofencing', label: 'Geo-Fencing', roles: ['admin', 'district_admin', 'co_admin'] },
  { path: '/officers', label: 'Officers', roles: ['admin', 'district_admin'] },
  { path: '/analytics', label: 'Analytics', roles: ['admin', 'district_admin'] },
  { path: '/settings', label: 'Settings', roles: ['admin', 'district_admin'] },
];

// Admin Dashboard Layout with keyboard navigation
function AdminDashboardLayout({ sidebarOpen, setSidebarOpen, user }) {
  const userRole = user?.role || 'public';
  const sidebarItems = allMenuItems.filter(item => item.roles.includes(userRole));
  const { focusedSidebarIndex, isKeyboardMode, mainContentRef } = useKeyboardNavigation(sidebarItems);

  return (
    <div className="flex h-screen bg-slate-900 relative overflow-hidden">
      {/* Background Watermark */}
      <div className="absolute inset-0 pointer-events-none z-0">
        <div className="absolute inset-0 bg-gradient-to-br from-slate-900 via-slate-900 to-blue-950 opacity-90"></div>
        <img
          src="/assets/rnp-logo.png"
          alt=""
          className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] object-contain opacity-5"
          style={{ filter: 'grayscale(100%) brightness(2)' }}
        />
      </div>

      <div className="relative z-10 flex h-full w-full">
        <Sidebar isOpen={sidebarOpen} focusedIndex={focusedSidebarIndex} isKeyboardMode={isKeyboardMode} />

        <div className="flex-1 flex flex-col overflow-hidden">
          <Header onMenuClick={() => setSidebarOpen(!sidebarOpen)} />

          <main ref={mainContentRef} className="flex-1 overflow-x-hidden overflow-y-auto">
            <Routes>
              <Route path="/dashboard" element={<DashboardPage />} />
              <Route path="/incidents" element={<Incidents />} />
              <Route path="/reports" element={<Reports />} />
              <Route path="/emergency" element={<Emergency />} />
              <Route path="/analytics" element={<Analytics />} />
              <Route path="/settings" element={<Settings />} />
              <Route path="/profile" element={<Profile />} />
              <Route path="/deployments" element={<ErrorBoundary><DeploymentsPage /></ErrorBoundary>} />
              <Route path="/geofencing" element={<ErrorBoundary><GeoFencingPage /></ErrorBoundary>} />
              <Route path="/officers" element={<OfficerManagement />} />
              <Route path="*" element={<Navigate to="/dashboard" replace />} />
            </Routes>
          </main>
        </div>
      </div>

      {/* Keyboard shortcut hint - bottom right, only in keyboard mode */}
      {isKeyboardMode && (
        <div className="fixed bottom-4 right-4 z-50 bg-slate-800/90 backdrop-blur-xl border border-cyan-500/30 rounded-xl px-4 py-2.5 shadow-2xl shadow-cyan-500/10">
          <div className="flex items-center gap-3 text-[11px] text-slate-400">
            <span className="flex items-center gap-1"><kbd className="px-1.5 py-0.5 rounded bg-slate-700 border border-slate-600 text-cyan-400 font-mono text-[10px]">↑↓</kbd> Pages</span>
            <span className="text-slate-600">•</span>
            <span className="flex items-center gap-1"><kbd className="px-1.5 py-0.5 rounded bg-slate-700 border border-slate-600 text-cyan-400 font-mono text-[10px]">←→</kbd> Scroll</span>
            <span className="text-slate-600">•</span>
            <span className="flex items-center gap-1"><kbd className="px-1.5 py-0.5 rounded bg-slate-700 border border-slate-600 text-cyan-400 font-mono text-[10px]">1-9</kbd> Jump</span>
            <span className="text-slate-600">•</span>
            <span className="flex items-center gap-1"><kbd className="px-1.5 py-0.5 rounded bg-slate-700 border border-slate-600 text-cyan-400 font-mono text-[10px]">S</kbd> Search</span>
            <span className="text-slate-600">•</span>
            <span className="flex items-center gap-1"><kbd className="px-1.5 py-0.5 rounded bg-slate-700 border border-slate-600 text-cyan-400 font-mono text-[10px]">Esc</kbd> Exit</span>
          </div>
        </div>
      )}
    </div>
  );
}

function AppContent() {
  const { isAuthenticated, user } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const location = useLocation();

  // Define routes that should use the admin dashboard layout
  const dashboardRoutes = [
    '/dashboard',
    '/incidents',
    '/reports',
    '/emergency',
    '/analytics',
    '/settings',
    '/profile',
    '/deployments',
    '/geofencing',
    '/officers'
  ];

  const isAdminRoute = dashboardRoutes.some(path =>
    location.pathname === path || location.pathname.startsWith(path + '/')
  );

  // If user is admin/district_admin/co_admin/police AND on a dashboard route, show the admin dashboard layout
  if (isAuthenticated && (user?.role === 'admin' || user?.role === 'district_admin' || user?.role === 'co_admin' || user?.role === 'police') && isAdminRoute) {
    return <AdminDashboardLayout sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen} user={user} />;
  }

  // For all other cases (public routes or admin on public pages), show the regular layout
  return (
    <div className="min-h-screen bg-gray-50">
      <Routes>
        <Route path="/" element={
          <ErrorBoundary>
            <HomePage />
          </ErrorBoundary>
        } />
        <Route path="/login" element={<LoginPage />} />
        {/* Register route removed - no public registration allowed */}
        <Route path="/register" element={<Navigate to="/login" replace />} />
        <Route path="/dashboard" element={<DashboardPage />} />
        <Route path="/incidents" element={<HomePage />} />
        <Route path="/report" element={<HomePage />} />
        <Route path="/emergency" element={<HomePage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
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

