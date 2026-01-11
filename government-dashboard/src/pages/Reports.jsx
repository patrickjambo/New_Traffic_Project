import React, { useState, useMemo } from 'react';
import { FileText, Download, BarChart2, Calendar, FileBarChart, Activity } from 'lucide-react';
import { useData } from '../context/DataContext';
import axios from '../config/axios';
import toast from 'react-hot-toast';

const Reports = () => {
  const { incidents, emergencies, loading, downloadEmergencyReport } = useData();
  const [generating, setGenerating] = useState(false);

  // Calculate real metrics from data
  const metrics = useMemo(() => {
    const totalReports = incidents.length + emergencies.length;
    const aiReports = incidents.filter(i => i.source === 'ai').length + emergencies.filter(e => e.automatic).length;

    return {
      total: totalReports,
      aiCount: aiReports > 1000 ? `${(aiReports / 1000).toFixed(1)}k` : aiReports,
      lastGenerated: 'Today'
    };
  }, [incidents, emergencies]);

  // Combine real emergencies with periodic analysis reports
  const allReports = useMemo(() => {
    // 1. Real Emergencies
    const emergencyReports = emergencies.map(em => ({
      id: `em-${em.id}`,
      realId: em.id,
      type: 'emergency',
      title: `${em.emergency_type.charAt(0).toUpperCase() + em.emergency_type.slice(1)} Emergency Report`,
      date: new Date(em.created_at).toLocaleDateString(),
      timestamp: new Date(em.created_at).getTime(),
      source: em.automatic ? 'AI' : 'Manual',
      severity: em.severity
    }));

    // 2. Periodic Analysis Reports (Mocked as before, but could be real in future)
    const analysisReports = [1, 2, 3].map(i => ({
      id: `an-${i}`,
      type: 'analysis',
      title: `Traffic Analysis Report - Week ${52 - i}`,
      date: new Date(Date.now() - i * 86400000 * 7).toLocaleDateString(),
      timestamp: Date.now() - i * 86400000 * 7,
      source: 'System'
    }));

    return [...emergencyReports, ...analysisReports].sort((a, b) => b.timestamp - a.timestamp);
  }, [emergencies]);

  const generateReport = async () => {
    setGenerating(true);
    try {
      // This endpoint might need to be implemented or verified
      const response = await axios.get('/admin/reports/generate');
      toast.success('Report generated successfully');
      console.log('Report data:', response.data);
    } catch (error) {
      console.error('Error generating report:', error);
      toast.error('Failed to generate report');
    } finally {
      setGenerating(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    );
  }

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
          <p className="text-3xl font-bold text-white">{metrics.total}</p>
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
          <p className="text-xl font-bold text-white">{metrics.lastGenerated}</p>
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
          <p className="text-3xl font-bold text-white">{metrics.aiCount}</p>
        </div>
      </div>

      <div className="bg-slate-800/50 backdrop-blur-md border border-white/5 rounded-xl p-6">
        <h3 className="text-xl font-bold text-white mb-6">Recent Reports</h3>
        <div className="space-y-4">
          {allReports.length > 0 ? (
            allReports.map((report) => (
              <div key={report.id} className="flex items-center justify-between p-4 bg-slate-900/50 rounded-lg border border-white/5 hover:border-blue-500/30 transition-colors group">
                <div className="flex items-center gap-4">
                  <div className="p-2 bg-slate-800 rounded text-gray-400 group-hover:text-blue-400 transition-colors">
                    <FileText className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="font-medium text-white">{report.title}</h4>
                      <span className={`text-[10px] px-2 py-0.5 rounded font-bold ${report.source === 'AI' ? 'bg-purple-500/20 text-purple-300' :
                          report.source === 'Manual' ? 'bg-blue-500/20 text-blue-300' : 'bg-slate-500/20 text-slate-300'
                        }`}>
                        {report.source}
                      </span>
                      {report.severity && (
                        <span className={`text-[10px] px-2 py-0.5 rounded font-bold ${report.severity === 'critical' ? 'bg-red-500 text-white' :
                            report.severity === 'high' ? 'bg-orange-500 text-white' : 'bg-yellow-500 text-white'
                          }`}>
                          {report.severity.toUpperCase()}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-gray-500">Generated on {report.date}</p>
                  </div>
                </div>
                <button
                  onClick={() => {
                    if (report.type === 'emergency') {
                      downloadEmergencyReport(report.realId);
                    } else {
                      toast.success('Downloading analysis report...');
                    }
                  }}
                  className="text-sm text-blue-400 hover:text-blue-300 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <Download className="w-4 h-4" /> Download
                </button>
              </div>
            ))
          ) : (
            <div className="text-center py-12 text-gray-500">
              <Activity className="w-12 h-12 mx-auto mb-2 opacity-20" />
              <p>No reports available yet</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Reports;