import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import Sidebar from '../components/Sidebar';
import Header from '../components/Header';
import { Users } from 'lucide-react';

const Emergency = () => {
  const { isAuthenticated } = useAuth();
  const [sidebarOpen, setSidebarOpen] = React.useState(false);

  if (!isAuthenticated) {
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
                <Users className="w-8 h-8 text-orange-500 mr-3" />
                <h1 className="text-3xl font-bold text-gray-900">Emergency Response</h1>
              </div>
              <p className="text-gray-600 mb-6">Manage critical emergency situations and coordinate response teams.</p>

              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <p className="text-red-800">
                  🚨 <strong>Coming Soon:</strong> Emergency response coordination center with real-time alerts and team management.
                </p>
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
};

export default Emergency;