/**
 * Test Configuration
 * Database credentials should be set via environment variables
 */

module.exports = {
    BASE_URL: process.env.TEST_BASE_URL || 'http://localhost:3000',
    API_URL: process.env.TEST_API_URL || 'http://localhost:3000/api',
    WS_URL: process.env.TEST_WS_URL || 'http://localhost:3000',
    DB: {
        host: process.env.PGHOST || 'localhost',
        port: parseInt(process.env.PGPORT || '5432'),
        database: process.env.PGDATABASE || 'trafficguard',
        user: process.env.PGUSER || 'trafficguard_user',
        password: process.env.PGPASSWORD || process.env.TEST_DB_PASSWORD || ''
    }
};
