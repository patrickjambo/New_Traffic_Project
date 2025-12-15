import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import Sidebar from '../components/Sidebar';
import Header from '../components/Header';
import { Settings } from 'lucide-react';

const SettingsPage = () => {
  const { isAuthenticated, user } = useAuth();
  const [sidebarOpen, setSidebarOpen] = React.useState(false);

  if (!isAuthenticated || user?.role !== 'admin') {
    return <Navigate to="/login" />;
  }

  return (
    <div className="flex h-screen bg-gray-100">
      <Sidebar isOpen={sidebarOpen} />

      <div className="flex-1 flex flex-col overflow-hidden">
        <Header onMenuClick={() => setSidebarOpen(!sidebarOpen)} />

        <main className="flex-1 overflow-x-hidden overflow-y-auto bg-gray-100 p-6">
          <div className="space-y-6">
            <div className="bg-white rounded-lg shadow-md p-8">
              <div className="flex items-center mb-6">
                <Settings className="w-8 h-8 text-gray-500 mr-3" />
                <h1 className="text-3xl font-bold text-gray-900">System Settings</h1>
              </div>
              <p className="text-gray-600 mb-6">Configure system preferences, user management, and application settings.</p>

              <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                <p className="text-gray-800">
                  ⚙️ <strong>Admin Only:</strong> System configuration panel for managing users, permissions, notifications, and system parameters.
                </p>
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
};

export default SettingsPage;