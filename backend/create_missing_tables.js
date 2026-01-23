/**
 * Create missing incidents table
 */

const { pool } = require('./src/config/database');

async function createIncidentsTable() {
    try {
        console.log('Creating incidents table...');
        
        await pool.query(`
            CREATE TABLE IF NOT EXISTS incidents (
                id SERIAL PRIMARY KEY,
                type VARCHAR(50) NOT NULL,
                severity VARCHAR(20) NOT NULL DEFAULT 'medium',
                latitude DECIMAL(10, 8),
                longitude DECIMAL(11, 8),
                address TEXT,
                description TEXT,
                status VARCHAR(20) DEFAULT 'reported',
                video_url TEXT,
                thumbnail_url TEXT,
                reported_by INTEGER,
                verified_by INTEGER,
                is_anonymous BOOLEAN DEFAULT FALSE,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                resolved_at TIMESTAMP
            )
        `);
        console.log('✅ Incidents table created');
        
        await pool.query(`CREATE INDEX IF NOT EXISTS idx_incidents_status ON incidents(status)`);
        await pool.query(`CREATE INDEX IF NOT EXISTS idx_incidents_type ON incidents(type)`);
        await pool.query(`CREATE INDEX IF NOT EXISTS idx_incidents_created_at ON incidents(created_at DESC)`);
        console.log('✅ Indexes created');
        
        // Create incident_analytics table
        await pool.query(`
            CREATE TABLE IF NOT EXISTS incident_analytics (
                id SERIAL PRIMARY KEY,
                incident_id INTEGER REFERENCES incidents(id) ON DELETE CASCADE,
                vehicle_count INTEGER,
                avg_speed DECIMAL(5, 2),
                confidence DECIMAL(3, 2),
                detected_type VARCHAR(50),
                stationary_count INTEGER,
                analysis_data JSONB,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);
        console.log('✅ Incident analytics table created');
        
        // Create notifications table
        await pool.query(`
            CREATE TABLE IF NOT EXISTS notifications (
                id SERIAL PRIMARY KEY,
                user_id INTEGER,
                incident_id INTEGER,
                title VARCHAR(255) NOT NULL,
                message TEXT NOT NULL,
                type VARCHAR(50) DEFAULT 'incident_alert',
                is_read BOOLEAN DEFAULT FALSE,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);
        console.log('✅ Notifications table created');
        
        // Create emergency_reports table
        await pool.query(`
            CREATE TABLE IF NOT EXISTS emergency_reports (
                id SERIAL PRIMARY KEY,
                latitude DECIMAL(10, 8),
                longitude DECIMAL(11, 8),
                address TEXT,
                description TEXT,
                emergency_type VARCHAR(50),
                severity VARCHAR(20) DEFAULT 'high',
                status VARCHAR(20) DEFAULT 'pending',
                reported_by INTEGER,
                assigned_to INTEGER,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                resolved_at TIMESTAMP
            )
        `);
        console.log('✅ Emergency reports table created');
        
        // Create deployments table
        await pool.query(`
            CREATE TABLE IF NOT EXISTS deployments (
                id SERIAL PRIMARY KEY,
                incident_id INTEGER,
                officer_id INTEGER,
                status VARCHAR(20) DEFAULT 'assigned',
                assigned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                arrived_at TIMESTAMP,
                completed_at TIMESTAMP,
                notes TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);
        console.log('✅ Deployments table created');
        
        console.log('\n✅ All missing tables created successfully!');
        
    } catch (error) {
        console.error('Error:', error.message);
    } finally {
        await pool.end();
    }
}

createIncidentsTable();
