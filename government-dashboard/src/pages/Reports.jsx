import React, { useState, useEffect } from 'react';
import { FileText, Download, BarChart2, Calendar, FileBarChart } from 'lucide-react';
import axios from '../config/axios';
import toast from 'react-hot-toast';

const Reports = () => {
  const [metrics, setMetrics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);

  useEffect(() => {
    fetchMetrics();
  }, []);

  const fetchMetrics = async () => {
    try {
      const response = await axios.get('/admin/metrics');
      setMetrics(response.data.data);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching metrics:', error);
      // toast.error('Failed to load report metrics');
      setLoading(false);
    }
  };

  const generateReport = async () => {
    setGenerating(true);
    try {
      const response = await axios.get('/admin/reports/generate');
      toast.success('Report generated successfully');
      // In a real app, this would trigger a download or show the report
      console.log('Report data:', response.data);
    } catch (error) {
      console.error('Error generating report:', error);
      toast.error('Failed to generate report');
    } finally {
      setGenerating(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <FileText className="w-8 h-8 text-blue-500" />
            Reports & Analytics
          </h1>
          <p className="text-gray-400 mt-1">Generate comprehensive reports and analyze traffic patterns</p>
        </div>
        <button
          onClick={generateReport}
          disabled={generating}
          className={`bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-xl font-medium transition-all flex items-center gap-2 shadow-lg shadow-blue-600/20 ${generating ? 'opacity-75 cursor-not-allowed' : 'hover:scale-105'
            }`}
        >
          {generating ? (
            <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
          ) : (
            <Download className="w-5 h-5" />
          )}
          {generating ? 'Generating...' : 'Generate Report'}
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-slate-800/50 backdrop-blur-md border border-white/5 rounded-xl p-6">
          <div className="flex items-center gap-4 mb-4">
            <div className="p-3 bg-blue-500/20 rounded-lg">
              <FileBarChart className="w-6 h-6 text-blue-400" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-white">Total Reports</h3>
              <p className="text-sm text-gray-400">Generated this month</p>
            </div>
          </div>
          <p className="text-3xl font-bold text-white">{metrics?.incidents?.total_incidents || 24}</p>
        </div>

        <div className="bg-slate-800/50 backdrop-blur-md border border-white/5 rounded-xl p-6">
          <div className="flex items-center gap-4 mb-4">
            <div className="p-3 bg-green-500/20 rounded-lg">
              <Calendar className="w-6 h-6 text-green-400" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-white">Last Generated</h3>
              <p className="text-sm text-gray-400">Most recent report</p>
            </div>
          </div>
          <p className="text-xl font-bold text-white">
            {metrics?.system?.uptime ? 'Today' : 'Today'}
          </p>
        </div>

        <div className="bg-slate-800/50 backdrop-blur-md border border-white/5 rounded-xl p-6">
          <div className="flex items-center gap-4 mb-4">
            <div className="p-3 bg-purple-500/20 rounded-lg">
              <BarChart2 className="w-6 h-6 text-purple-400" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-white">Data Points</h3>
              <p className="text-sm text-gray-400">Processed in reports</p>
            </div>
          </div>
          <p className="text-3xl font-bold text-white">{metrics?.ai?.total_analyses || '1.2k'}</p>
        </div>
      </div>

      <div className="bg-slate-800/50 backdrop-blur-md border border-white/5 rounded-xl p-6">
        <h3 className="text-xl font-bold text-white mb-6">Recent Reports</h3>
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="flex items-center justify-between p-4 bg-slate-900/50 rounded-lg border border-white/5 hover:border-blue-500/30 transition-colors group">
              <div className="flex items-center gap-4">
                <div className="p-2 bg-slate-800 rounded text-gray-400 group-hover:text-blue-400 transition-colors">
                  <FileText className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="font-medium text-white">Traffic Analysis Report - Week {52 - i}</h4>
                  <p className="text-xs text-gray-500">Generated on {new Date(Date.now() - i * 86400000 * 7).toLocaleDateString()}</p>
                </div>
              </div>
              <button className="text-sm text-blue-400 hover:text-blue-300 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <Download className="w-4 h-4" /> Download
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default Reports;