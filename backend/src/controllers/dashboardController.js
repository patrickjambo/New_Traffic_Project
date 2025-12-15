const { query } = require('../config/database');

/**
 * Get Dashboard Statistics
 */
const getDashboardData = async (req, res) => {
  try {
    // Active incidents
    const activeResult = await query(
      `SELECT COUNT(*) as count FROM incidents WHERE status IN ('Active', 'Resolving')`
    );

    // Critical incidents
    const criticalResult = await query(
      `SELECT COUNT(*) as count FROM incidents WHERE status = 'Active' AND severity IN ('high', 'critical')`
    );

    // Resolved today
    const resolvedResult = await query(
      `SELECT COUNT(*) as count FROM incidents 
             WHERE status = 'Resolved' AND resolved_at >= CURRENT_DATE`
    );

    // Average response time
    const avgTimeResult = await query(
      `SELECT AVG(EXTRACT(EPOCH FROM (updated_at - created_at))/60) as avg_time 
       FROM (
         SELECT created_at, updated_at 
         FROM incidents 
         WHERE status = 'Resolved' 
         ORDER BY created_at DESC 
         LIMIT 50
       ) as recent_resolved`
    );

    const avgResponseTime = parseFloat(avgTimeResult.rows[0].avg_time) || 0;
    const systemHealth = 99; // Placeholder for now

    res.json({
      activeIncidents: {
        total: parseInt(activeResult.rows[0].count),
        critical: parseInt(criticalResult.rows[0].count)
      },
      avgResponseTime: Math.round(avgResponseTime * 10) / 10,
      resolvedToday: parseInt(resolvedResult.rows[0].count),
      systemHealth
    });
  } catch (error) {
    console.error('Dashboard stats error:', error);
    res.status(500).json({ error: error.message });
  }
};

/**
 * Get Regional Overview
 */
const getRegionalOverview = async (req, res) => {
  try {
    const regions = ['Kigali City', 'Northern Province', 'Southern Province', 'Eastern Province', 'Western Province'];

    const regionData = await Promise.all(
      regions.map(async (region) => {
        // Count incidents
        const incidentResult = await query(
          `SELECT COUNT(*) as count FROM incidents 
                     WHERE address ILIKE $1 AND status IN ('Active', 'Resolving')`,
          [`%${region}%`]
        );

        // Count deployments (approximate officers)
        const deploymentResult = await query(
          `SELECT COUNT(*) as count FROM deployments 
                     WHERE address ILIKE $1 AND status = 'Active'`,
          [`%${region}%`]
        );

        // Get latest traffic data
        const trafficResult = await query(
          `SELECT congestion_level FROM traffic_data 
                     WHERE region = $1 
                     ORDER BY timestamp DESC LIMIT 1`,
          [region]
        );

        return {
          name: region,
          value: trafficResult.rows[0]?.congestion_level || Math.floor(Math.random() * 100),
          incidents: parseInt(incidentResult.rows[0].count),
          officers: parseInt(deploymentResult.rows[0].count) * 6
        };
      })
    );

    res.json(regionData);
  } catch (error) {
    console.error('Regional overview error:', error);
    res.status(500).json({ error: error.message });
  }
};

const testDashboard = (req, res) => {
  console.log('✅ Test dashboard endpoint called');
  res.json({ success: true, message: 'Test dashboard endpoint is working!', timestamp: new Date().toISOString() });
};

module.exports = {
  getDashboardData,
  getRegionalOverview,
  testDashboard
};
