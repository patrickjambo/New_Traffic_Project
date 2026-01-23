const { Pool } = require('pg');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });

const pool = new Pool({
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 5432,
    database: process.env.DB_NAME || 'trafficguard',
    user: process.env.DB_USER || 'trafficguard_user',
    password: process.env.DB_PASSWORD || 'process.env.PGPASSWORD || ''',
});

async function setup() {
    const client = await pool.connect();
    try {
        console.log('Creating deployment tables...');
        
        // Create deployments table
        await client.query(`
            CREATE TABLE IF NOT EXISTS deployments (
                id SERIAL PRIMARY KEY,
                unit_name VARCHAR(100) NOT NULL,
                address TEXT,
                latitude DECIMAL(10, 8),
                longitude DECIMAL(11, 8),
                status VARCHAR(20) DEFAULT 'Standby',
                start_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                end_time TIMESTAMP,
                incident_id INTEGER,
                emergency_id INTEGER,
                priority VARCHAR(20) DEFAULT 'normal',
                instructions TEXT,
                scheduled_time TIMESTAMP,
                estimated_duration INTEGER,
                created_by INTEGER,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);
        console.log('✅ deployments table created');
        
        // Create deployment_officers table
        await client.query(`
            CREATE TABLE IF NOT EXISTS deployment_officers (
                deployment_id INTEGER REFERENCES deployments(id) ON DELETE CASCADE,
                officer_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
                acknowledged BOOLEAN DEFAULT FALSE,
                acknowledged_at TIMESTAMP,
                status VARCHAR(50) DEFAULT 'assigned',
                notes TEXT,
                estimated_arrival TIMESTAMP,
                last_location_lat DECIMAL(10, 8),
                last_location_lng DECIMAL(11, 8),
                assigned_at TIMESTAMP DEFAULT NOW(),
                updated_at TIMESTAMP DEFAULT NOW(),
                PRIMARY KEY (deployment_id, officer_id)
            )
        `);
        console.log('✅ deployment_officers table created');
        
        // Create indexes
        await client.query('CREATE INDEX IF NOT EXISTS idx_deployments_status ON deployments(status)');
        await client.query('CREATE INDEX IF NOT EXISTS idx_deployment_officers_acknowledged ON deployment_officers(acknowledged)');
        console.log('✅ Indexes created');
        
        console.log('✅ All done!');
    } catch (error) {
        console.error('❌ Error:', error.message);
    } finally {
        client.release();
        await pool.end();
    }
}

setup();
