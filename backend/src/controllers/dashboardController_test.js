const getDashboardData = async (req, res) => {
  console.log('📊 [test] Dashboard endpoint called');
  return res.json({
    success: true,
    message: 'Dashboard endpoint (test controller) is working',
    data: {
      stats: { total_incidents: 0, incidents_today: 0, high_priority: 0 },
      incidentTypes: [],
      recentIncidents: []
    },
    timestamp: new Date().toISOString()
  });
};

const testDashboard = (req, res) => {
  console.log('✅ [test] Test dashboard endpoint called');
  res.json({ success: true, message: 'Test dashboard endpoint is working!', timestamp: new Date().toISOString() });
};

module.exports = { getDashboardData, testDashboard };
