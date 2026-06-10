import React, { useState, useMemo, useEffect } from 'react';
import { FileText, Download, BarChart2, Calendar, FileBarChart, Activity, Zap, RefreshCw } from 'lucide-react';
import { useData } from '../context/DataContext';
import axios from '../config/axios';
import toast from 'react-hot-toast';
import { useTranslation } from 'react-i18next';
import {
  generateEmergencyReportPDF,
  generateIncidentReportPDF,
  generateMonthlyReportPDF,
  generateAnnualReportPDF,
  downloadPDF
} from '../services/pdfReportGenerator';
import {
  generateExcelReport,
  formatIncidentDataForExcel
} from '../services/excelReportGenerator';

const Reports = () => {
  const { t } = useTranslation();
  const { incidents, emergencies, loading, fetchIncidents, fetchEmergencies } = useData();
  const [generating, setGenerating] = useState(false);
  const [selectedMonth, setSelectedMonth] = useState(new Date());
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [showMonthlyModal, setShowMonthlyModal] = useState(false);
  const [showAnnualModal, setShowAnnualModal] = useState(false);
  const [lastUpdated, setLastUpdated] = useState(new Date());

  // Auto-refresh data every 10 seconds for real-time updates
  useEffect(() => {
    const refreshData = async () => {
      try {
        await Promise.all([fetchIncidents?.(), fetchEmergencies?.()]);
        setLastUpdated(new Date());
      } catch (error) {
        console.error('Error refreshing reports data:', error);
      }
    };

    // Initial refresh
    refreshData();

    // Set up interval for real-time updates
    const interval = setInterval(refreshData, 10000);
    return () => clearInterval(interval);
  }, [fetchIncidents, fetchEmergencies]);

  // Format time ago helper - defined before useMemo that uses it
  const formatTimeAgo = (date) => {
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return t('reports_just_now');
    if (diffMins < 60) return t('reports_min_ago', { count: diffMins });
    if (diffHours < 24) return t('reports_hour_ago', { count: diffHours });
    if (diffDays < 7) return t('reports_day_ago', { count: diffDays });
    return date.toLocaleDateString();
  };

  // Calculate real metrics from data - updates automatically when data changes
  const metrics = useMemo(() => {
    const totalReports = (incidents?.length || 0) + (emergencies?.length || 0);
    const aiReports = (incidents?.filter(i => i.source === 'ai' || i.detected_by === 'ai').length || 0) + 
                      (emergencies?.filter(e => e.automatic || e.source === 'ai').length || 0);
    const manualReports = totalReports - aiReports;
    
    // Calculate data points (all individual data entries)
    const dataPoints = (incidents || []).reduce((acc, inc) => {
      return acc + (inc.vehicle_count || 0) + (inc.pedestrian_count || 0) + 1;
    }, (emergencies?.length || 0));

    // Get last generated time from most recent report
    const allDates = [
      ...(incidents || []).map(i => new Date(i.created_at || i.timestamp)),
      ...(emergencies || []).map(e => new Date(e.created_at || e.timestamp))
    ].filter(d => !isNaN(d.getTime()));
    
    const lastDate = allDates.length > 0 ? new Date(Math.max(...allDates)) : null;
    const lastGenerated = lastDate ? formatTimeAgo(lastDate) : t('reports_no_reports_yet');

    return {
      total: totalReports,
      aiCount: aiReports,
      manualCount: manualReports,
      dataPoints: dataPoints > 1000 ? `${(dataPoints / 1000).toFixed(1)}k` : dataPoints,
      lastGenerated
    };
  }, [incidents, emergencies]);

  // Combine real emergencies and incidents into reports - real-time
  const allReports = useMemo(() => {
    if (!emergencies && !incidents) return [];
    
    // Emergency reports (both AI and Manual)
    const emergencyReports = (emergencies || []).map(em => ({
      id: `em-${em.id}`,
      realId: em.id,
      type: 'emergency',
      title: `${em.emergency_type?.charAt(0).toUpperCase() + em.emergency_type?.slice(1) || t('reports_emergency')} ${t('reports_report')}`,
      date: new Date(em.created_at || em.timestamp).toLocaleDateString(),
      timestamp: new Date(em.created_at || em.timestamp).getTime(),
      source: em.automatic || em.source === 'ai' ? t('reports_source_ai') : t('reports_source_manual'),
      severity: em.severity || 'medium',
      data: em
    }));

    // Incident reports (both AI and Manual)
    const incidentReports = (incidents || []).map(inc => ({
      id: `inc-${inc.id}`,
      realId: inc.id,
      type: 'incident',
      title: `${inc.incident_type?.charAt(0).toUpperCase() + inc.incident_type?.slice(1) || t('reports_traffic')} ${t('reports_incident_report')}`,
      date: new Date(inc.created_at || inc.timestamp).toLocaleDateString(),
      timestamp: new Date(inc.created_at || inc.timestamp).getTime(),
      source: inc.source === 'ai' || inc.detected_by === 'ai' ? t('reports_source_ai') : t('reports_source_manual'),
      severity: inc.severity || 'low',
      data: inc
    }));

    return [...emergencyReports, ...incidentReports]
      .sort((a, b) => b.timestamp - a.timestamp); // Show all reports, sorted by date
  }, [emergencies, incidents]);

  // Fetch historical data for report generation — bypasses the daily display filter.
  // Pass startDate+endDate for a scoped range (monthly/annual PDFs).
  // Omit both to fetch ALL records across all days (Excel full export).
  const fetchReportData = async (startDate, endDate) => {
    const params = { includeResolved: 'true', limit: 10000 };
    if (startDate) params.startDate = startDate;
    if (endDate) params.endDate = endDate;
    const [incRes, emRes] = await Promise.all([
      axios.get('/api/incidents', { params }),
      axios.get('/api/emergency', { params }),
    ]);
    return {
      reportIncidents: incRes.data?.data || [],
      reportEmergencies: emRes.data?.data || [],
    };
  };

  // Generate Monthly Report
  const handleGenerateMonthlyReport = async () => {
    try {
      setGenerating(true);
      // Fetch all data for the selected month (including resolved) for the report
      const year = selectedMonth.getFullYear();
      const month = selectedMonth.getMonth();
      const startDate = new Date(year, month, 1).toISOString();
      const endDate = new Date(year, month + 1, 0, 23, 59, 59).toISOString();
      const { reportIncidents, reportEmergencies } = await fetchReportData(startDate, endDate);

      const doc = await generateMonthlyReportPDF(reportIncidents, reportEmergencies, selectedMonth);
      const monthName = selectedMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
      downloadPDF(doc, `RNP_Traffic_Report_${monthName.replace(' ', '_')}.pdf`);
      toast.success(t('reports_monthly_success'));
      setShowMonthlyModal(false);
    } catch (error) {
      console.error('Error generating monthly report:', error);
      toast.error(t('reports_monthly_failed'));
    } finally {
      setGenerating(false);
    }
  };

  // Generate Annual Report
  const handleGenerateAnnualReport = async () => {
    try {
      setGenerating(true);
      // Fetch all data for the selected year (including resolved) for the report
      const startDate = new Date(selectedYear, 0, 1).toISOString();
      const endDate = new Date(selectedYear, 11, 31, 23, 59, 59).toISOString();
      const { reportIncidents, reportEmergencies } = await fetchReportData(startDate, endDate);

      const doc = await generateAnnualReportPDF(reportIncidents, reportEmergencies, selectedYear);
      downloadPDF(doc, `RNP_Traffic_Annual_Report_${selectedYear}.pdf`);
      toast.success(t('reports_annual_success'));
      setShowAnnualModal(false);
    } catch (error) {
      console.error('Error generating annual report:', error);
      toast.error(t('reports_annual_failed'));
    } finally {
      setGenerating(false);
    }
  };

  // Generate Excel Report — fetches ALL records from ALL days (no date restriction)
  const handleGenerateExcelReport = async () => {
    try {
      setGenerating(true);
      const { reportIncidents, reportEmergencies } = await fetchReportData();

      const formattedData = formatIncidentDataForExcel(reportIncidents, reportEmergencies);
      const timestamp = new Date().toISOString().slice(0, 10);
      generateExcelReport(formattedData, `RNP_Traffic_Complete_Report_${timestamp}.xlsx`);
      toast.success('Excel report generated successfully');
    } catch (error) {
      console.error('Error generating Excel report:', error);
      toast.error('Failed to generate Excel report');
    } finally {
      setGenerating(false);
    }
  };

  // Download Emergency Report
  const handleDownloadEmergencyReport = async (emergency) => {
    console.log('Download emergency report called with:', emergency);
    if (!emergency) {
      toast.error(t('reports_no_emergency'));
      return;
    }
    try {
      setGenerating(true);
      toast.loading(t('reports_generating_emergency'), { id: 'generating' });
      console.log('Calling generateEmergencyReportPDF...');
      const doc = await generateEmergencyReportPDF(emergency, incidents || []);
      console.log('PDF generated, downloading...');
      downloadPDF(doc, `RNP_Emergency_Report_${emergency.id || Date.now()}.pdf`);
      toast.dismiss('generating');
      toast.success(t('reports_emergency_download_success'));
    } catch (error) {
      console.error('Error downloading emergency report:', error);
      toast.dismiss('generating');
      toast.error(`${t('reports_emergency_download_failed')}${error.message || t('reports_unknown_error')}`);
    } finally {
      setGenerating(false);
    }
  };

  // Download Incident Report
  const handleDownloadIncidentReport = async (incident) => {
    console.log('Download incident report called with:', incident);
    if (!incident) {
      toast.error(t('reports_no_incident'));
      return;
    }
    try {
      setGenerating(true);
      toast.loading(t('reports_generating_incident'), { id: 'generating' });
      console.log('Calling generateIncidentReportPDF...');
      const doc = await generateIncidentReportPDF(incident);
      console.log('PDF generated, downloading...');
      downloadPDF(doc, `RNP_Incident_Report_${incident.id || Date.now()}.pdf`);
      toast.dismiss('generating');
      toast.success(t('reports_incident_download_success'));
    } catch (error) {
      console.error('Error downloading incident report:', error);
      toast.dismiss('generating');
      toast.error(`${t('reports_incident_download_failed')}${error.message || t('reports_unknown_error')}`);
    } finally {
      setGenerating(false);
    }
  };

  // Download any report based on type
  const handleDownloadReport = async (report) => {
    console.log('handleDownloadReport called with:', report);
    console.log('Report type:', report?.type);
    console.log('Report data:', report?.data);
    
    if (!report || !report.data) {
      console.error('Missing report or report.data');
      toast.error(t('reports_no_report_data'));
      return;
    }
    if (report.type === 'emergency') {
      await handleDownloadEmergencyReport(report.data);
    } else if (report.type === 'incident') {
      await handleDownloadIncidentReport(report.data);
    } else {
      console.error('Unknown report type:', report.type);
      toast.error(t('reports_unknown_report_type'));
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-cyan-500"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <FileText className="w-8 h-8 text-cyan-500" />
            {t('reports_analytics')}
          </h1>
          <p className="text-gray-400 mt-1">
            {t('reports_generate_desc')}
            <span className="ml-2 text-xs text-cyan-400">
              • {t('reports_live_updates')} • {t('reports_last_label')}: {lastUpdated.toLocaleTimeString()}
            </span>
          </p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={handleGenerateExcelReport}
            disabled={generating}
            className="bg-green-600 hover:bg-green-700 text-white px-6 py-3 rounded-xl font-medium transition-all flex items-center gap-2 shadow-lg shadow-green-600/20 hover:scale-105 disabled:opacity-50"
          >
            <Download className="w-5 h-5" />
            Excel Report
          </button>
          <button
            onClick={() => setShowMonthlyModal(true)}
            className="bg-cyan-600 hover:bg-cyan-700 text-white px-6 py-3 rounded-xl font-medium transition-all flex items-center gap-2 shadow-lg shadow-cyan-600/20 hover:scale-105"
          >
            <Calendar className="w-5 h-5" />
            {t('reports_monthly_report')}
          </button>
          <button
            onClick={() => setShowAnnualModal(true)}
            className="bg-cyan-700 hover:bg-cyan-800 text-white px-6 py-3 rounded-xl font-medium transition-all flex items-center gap-2 shadow-lg shadow-cyan-700/20 hover:scale-105"
          >
            <Zap className="w-5 h-5" />
            {t('reports_annual_report')}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-slate-800/50 backdrop-blur-md border border-white/5 rounded-xl p-6">
          <div className="flex items-center gap-4 mb-4">
            <div className="p-3 bg-cyan-500/20 rounded-lg">
              <FileBarChart className="w-6 h-6 text-cyan-400" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-white">{t('reports_total_reports')}</h3>
              <p className="text-sm text-gray-400">{t('reports_ai')}: {metrics.aiCount} • {t('reports_manual')}: {metrics.manualCount}</p>
            </div>
          </div>
          <p className="text-3xl font-bold text-cyan-400">{metrics.total}</p>
        </div>

        <div className="bg-slate-800/50 backdrop-blur-md border border-white/5 rounded-xl p-6">
          <div className="flex items-center gap-4 mb-4">
            <div className="p-3 bg-cyan-500/20 rounded-lg">
              <Calendar className="w-6 h-6 text-cyan-400" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-white">{t('reports_last_generated')}</h3>
              <p className="text-sm text-gray-400">{t('reports_most_recent')}</p>
            </div>
          </div>
          <p className="text-xl font-bold text-cyan-400">{metrics.lastGenerated}</p>
        </div>

        <div className="bg-slate-800/50 backdrop-blur-md border border-white/5 rounded-xl p-6">
          <div className="flex items-center gap-4 mb-4">
            <div className="p-3 bg-cyan-500/20 rounded-lg">
              <BarChart2 className="w-6 h-6 text-cyan-400" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-white">{t('reports_data_points')}</h3>
              <p className="text-sm text-gray-400">{t('reports_processed_in_reports')}</p>
            </div>
          </div>
          <p className="text-3xl font-bold text-cyan-400">{metrics.dataPoints}</p>
        </div>
      </div>

      <div className="bg-slate-800/50 backdrop-blur-md border border-white/5 rounded-xl p-6">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-xl font-bold text-white">{t('reports_recent_reports')}</h3>
          <div className="flex items-center gap-2 text-xs text-gray-400">
            <RefreshCw className="w-3 h-3 animate-spin" />
            <span>{t('reports_auto_updating')}</span>
          </div>
        </div>
        <div className="space-y-4">
          {allReports.length > 0 ? (
            allReports.map((report) => (
              <div key={report.id} className="flex items-center justify-between p-4 bg-slate-900/50 rounded-lg border border-white/5 hover:border-cyan-500/30 transition-colors group">
                <div className="flex items-center gap-4">
                  <div className="p-2 bg-slate-800 rounded text-gray-400 group-hover:text-cyan-400 transition-colors">
                    <FileText className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <h4 className="font-medium text-white">{report.title}</h4>
                      <span className="text-[10px] px-2 py-0.5 rounded font-bold bg-cyan-900/60 text-cyan-200 border border-cyan-700/40">
                        {report.source}
                      </span>
                      {report.severity && (
                        <span className="text-[10px] px-2 py-0.5 rounded font-bold bg-cyan-900/60 text-cyan-200 border border-cyan-700/40">
                          {report.severity.toUpperCase()}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-gray-500">{t('reports_generated_on')} {report.date} • {report.type}</p>
                  </div>
                </div>
                <button
                  onClick={() => handleDownloadReport(report)}
                  disabled={generating}
                  className="text-sm text-cyan-400 hover:text-cyan-300 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity disabled:opacity-50"
                >
                  <Download className="w-4 h-4" /> {t('reports_download')}
                </button>
              </div>
            ))
          ) : (
            <div className="text-center py-12 text-gray-500">
              <Activity className="w-12 h-12 mx-auto mb-2 opacity-20" />
              <p>{t('reports_no_reports')}</p>
              <p className="text-xs mt-1">{t('reports_reports_will_appear')}</p>
            </div>
          )}
        </div>
      </div>

      {/* Monthly Report Modal */}
      {showMonthlyModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-slate-800 rounded-xl p-6 max-w-md w-full mx-4 border border-white/10">
            <h2 className="text-xl font-bold text-white mb-4">{t('reports_generate_monthly_title')}</h2>
            
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-300 mb-2">{t('reports_select_month')}</label>
              <input
                type="month"
                value={selectedMonth.toISOString().slice(0, 7)}
                onChange={(e) => setSelectedMonth(new Date(e.target.value + '-01'))}
                className="w-full px-4 py-2 bg-slate-700 border border-white/10 rounded-lg text-white focus:outline-none focus:border-cyan-500"
              />
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setShowMonthlyModal(false)}
                className="flex-1 px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition-colors"
              >
                {t('reports_cancel')}
              </button>
              <button
                onClick={handleGenerateMonthlyReport}
                disabled={generating}
                className="flex-1 px-4 py-2 bg-cyan-600 hover:bg-cyan-700 text-white rounded-lg transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {generating ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    {t('reports_generating')}
                  </>
                ) : (
                  <>
                    <Download className="w-4 h-4" />
                    {t('reports_generate_download')}
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
            <h2 className="text-xl font-bold text-white mb-4">{t('reports_generate_annual_title')}</h2>
            
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-300 mb-2">{t('reports_select_year')}</label>
              <select
                value={selectedYear}
                onChange={(e) => setSelectedYear(parseInt(e.target.value))}
                className="w-full px-4 py-2 bg-slate-700 border border-white/10 rounded-lg text-white focus:outline-none focus:border-cyan-500"
              >
                {[2026, 2025, 2024, 2023, 2022, 2021, 2020].map(year => (
                  <option key={year} value={year}>{year}</option>
                ))}
              </select>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setShowAnnualModal(false)}
                className="flex-1 px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition-colors"
              >
                {t('reports_cancel')}
              </button>
              <button
                onClick={handleGenerateAnnualReport}
                disabled={generating}
                className="flex-1 px-4 py-2 bg-cyan-700 hover:bg-cyan-800 text-white rounded-lg transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {generating ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    {t('reports_generating')}
                  </>
                ) : (
                  <>
                    <Download className="w-4 h-4" />
                    {t('reports_generate_download')}
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
