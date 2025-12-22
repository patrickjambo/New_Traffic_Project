import React from 'react';
import { Link, Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useData } from '../context/DataContext';
import { BarChart3, Users, AlertTriangle, TrendingUp } from 'lucide-react';

const DashboardPage = () => {
  const { user, isAuthenticated } = useAuth();
  const { incidents, statistics } = useData();

  if (!isAuthenticated) {
    return <Navigate to="/login" />;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="rwanda-accent"></div>
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">
            Welcome, {user?.full_name}!
          </h1>
          <p className="text-gray-600 mt-2">Manage incidents and monitor traffic across Kigali</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="gov-card">
            <AlertTriangle className="w-8 h-8 text-red-500 mb-3" />
            <div className="text-3xl font-bold text-gray-900">{statistics?.total_incidents || 19}</div>
            <div className="text-sm text-gray-600">Total Incidents</div>
          </div>

          <div className="gov-card">
            <BarChart3 className="w-8 h-8 text-blue-500 mb-3" />
            <div className="text-3xl font-bold text-gray-900">{statistics?.active_reports || 5}</div>
            <div className="text-sm text-gray-600">Active Reports</div>
          </div>

          <div className="gov-card">
            <Users className="w-8 h-8 text-green-500 mb-3" />
            <div className="text-3xl font-bold text-gray-900">{statistics?.mobile_captures || 12}</div>
            <div className="text-sm text-gray-600">Mobile Captures</div>
          </div>

          <div className="gov-card">
            <TrendingUp className="w-8 h-8 text-yellow-500 mb-3" />
            <div className="text-3xl font-bold text-gray-900">95%</div>
            <div className="text-sm text-gray-600">System Uptime</div>
          </div>
        </div>

        <div className="gov-card">
          <h2 className="text-xl font-bold text-gray-900 mb-4">Quick Actions</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Link to="/report" className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50">
              <div className="font-semibold text-gray-900">Report Incident</div>
              <div className="text-sm text-gray-600 mt-1">Submit a new traffic incident</div>
            </Link>
            <Link to="/incidents" className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50">
              <div className="font-semibold text-gray-900">View All Incidents</div>
              <div className="text-sm text-gray-600 mt-1">Browse all reported incidents</div>
            </Link>
            <Link to="/analytics" className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50">
              <div className="font-semibold text-gray-900">Analytics</div>
              <div className="text-sm text-gray-600 mt-1">View traffic statistics</div>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DashboardPage;
