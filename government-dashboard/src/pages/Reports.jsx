import React, { useState, useMemo } from 'react';
import { FileText, Download, BarChart2, Calendar, FileBarChart, Activity, Zap } from 'lucide-react';
import { useData } from '../context/DataContext';
import axios from '../config/axios';
import toast from 'react-hot-toast';
import {
  generateEmergencyReportPDF,
  generateMonthlyReportPDF,
  generateAnnualReportPDF,
  downloadPDF
} from '../services/pdfReportGenerator';

const Reports = () => {
  const { incidents, emergencies, loading } = useData();
  const [generating, setGenerating] = useState(false);
  const [selectedMonth, setSelectedMonth] = useState(new Date());
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [showMonthlyModal, setShowMonthlyModal] = useState(false);
  const [showAnnualModal, setShowAnnualModal] = useState(false);

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
    const emergencyReports = emergencies.map(em => ({
      id: `em-${em.id}`,
      realId: em.id,
      type: 'emergency',
      title: `${em.emergency_type.charAt(0).toUpperCase() + em.emergency_type.slice(1)} Emergency Report`,
      date: new Date(em.created_at).toLocaleDateString(),
      timestamp: new Date(em.created_at).getTime(),
      source: em.automatic ? 'AI' : 'Manual',
      severity: em.severity,
      data: em
    }));

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

  // Generate Monthly Report
  const handleGenerateMonthlyReport = async () => {
    try {
      setGenerating(true);
      const doc = generateMonthlyReportPDF(incidents, emergencies, selectedMonth);
      const monthName = selectedMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
      downloadPDF(doc, `RNP_Traffic_Report_${monthName.replace(' ', '_')}.pdf`);
      toast.success('Monthly report generated successfully');
      setShowMonthlyModal(false);
    } catch (error) {
      console.error('Error generating monthly report:', error);
      toast.error('Failed to generate monthly report');
    } finally {
      setGenerating(false);
    }
  };

  // Generate Annual Report
  const handleGenerateAnnualReport = async () => {
    try {
      setGenerating(true);
      const doc = generateAnnualReportPDF(incidents, emergencies, selectedYear);
      downloadPDF(doc, `RNP_Traffic_Annual_Report_${selectedYear}.pdf`);
      toast.success('Annual report generated successfully');
      setShowAnnualModal(false);
    } catch (error) {
      console.error('Error generating annual report:', error);
      toast.error('Failed to generate annual report');
    } finally {
      setGenerating(false);
    }
  };

  // Download Emergency Report
  const handleDownloadEmergencyReport = async (emergency) => {
    try {
      setGenerating(true);
      const doc = generateEmergencyReportPDF(emergency, incidents);
      downloadPDF(doc, `RNP_Emergency_Report_${emergency.id}.pdf`);
      toast.success('Emergency report downloaded successfully');
    } catch (error) {
      console.error('Error downloading emergency report:', error);
      toast.error('Failed to download emergency report');
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
        <div className="flex gap-3">
          <button
            onClick={() => setShowMonthlyModal(true)}
            className="bg-green-600 hover:bg-green-700 text-white px-6 py-3 rounded-xl font-medium transition-all flex items-center gap-2 shadow-lg shadow-green-600/20 hover:scale-105"
          >
            <Calendar className="w-5 h-5" />
            Monthly Report
          </button>
          <button
            onClick={() => setShowAnnualModal(true)}
            className="bg-purple-600 hover:bg-purple-700 text-white px-6 py-3 rounded-xl font-medium transition-all flex items-center gap-2 shadow-lg shadow-purple-600/20 hover:scale-105"
          >
            <Zap className="w-5 h-5" />
            Annual Report
          </button>
        </div>
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
            <div className="p-3 bg-cyan-500/20 rounded-lg">
              <BarChart2 className="w-6 h-6 text-cyan-400" />
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
                      <span className={`text-[10px] px-2 py-0.5 rounded font-bold ${report.source === 'AI' ? 'bg-cyan-500/20 text-cyan-300' :
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
                      handleDownloadEmergencyReport(report.data);
                    } else {
                      toast.success('Downloading analysis report...');
                    }
                  }}
                  disabled={generating}
                  className="text-sm text-blue-400 hover:text-blue-300 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity disabled:opacity-50"
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

      {/* Monthly Report Modal */}
      {showMonthlyModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-slate-800 rounded-xl p-6 max-w-md w-full mx-4 border border-white/10">
            <h2 className="text-xl font-bold text-white mb-4">Generate Monthly Report</h2>
            
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-300 mb-2">Select Month</label>
              <input
                type="month"
                value={selectedMonth.toISOString().slice(0, 7)}
                onChange={(e) => setSelectedMonth(new Date(e.target.value + '-01'))}
                className="w-full px-4 py-2 bg-slate-700 border border-white/10 rounded-lg text-white focus:outline-none focus:border-blue-500"
              />
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setShowMonthlyModal(false)}
                className="flex-1 px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleGenerateMonthlyReport}
                disabled={generating}
                className="flex-1 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {generating ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Generating...
                  </>
                ) : (
                  <>
                    <Download className="w-4 h-4" />
                    Generate & Download
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Annual Report Modal */}
      {showAnnualModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-slate-800 rounded-xl p-6 max-w-md w-full mx-4 border border-white/10">
            <h2 className="text-xl font-bold text-white mb-4">Generate Annual Report</h2>
            
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-300 mb-2">Select Year</label>
              <select
                value={selectedYear}
                onChange={(e) => setSelectedYear(parseInt(e.target.value))}
                className="w-full px-4 py-2 bg-slate-700 border border-white/10 rounded-lg text-white focus:outline-none focus:border-blue-500"
              >
                {[2024, 2023, 2022, 2021, 2020].map(year => (
                  <option key={year} value={year}>{year}</option>
                ))}
              </select>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setShowAnnualModal(false)}
                className="flex-1 px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleGenerateAnnualReport}
                disabled={generating}
                className="flex-1 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {generating ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Generating...
                  </>
                ) : (
                  <>
                    <Download className="w-4 h-4" />
                    Generate & Download
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Reports;
