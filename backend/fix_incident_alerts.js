/**
 * Fix incident_alerts table schema
 * Adds missing columns needed for geo-fencing alert system
 */

require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    database: process.env.DB_NAME,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD
});

async function fixIncidentAlertsTable() {
    const client = await pool.connect();
    
    try {
        console.log('🔧 Fixing incident_alerts table schema...\n');
        
        // First, let's see the current structure
        const columns = await client.query(`
            SELECT column_name, data_type 
            FROM information_schema.columns 
            WHERE table_name = 'incident_alerts' 
            ORDER BY ordinal_position
        `);
        
        console.log('Current columns:', columns.rows.map(r => r.column_name).join(', '));
        
        // Add missing columns if they don't exist
        const addColumnIfNotExists = async (column, definition) => {
            try {
                await client.query(`ALTER TABLE incident_alerts ADD COLUMN IF NOT EXISTS ${column} ${definition}`);
                console.log(`✅ Added/verified column: ${column}`);
            } catch (err) {
                if (err.code === '42701') { // Column already exists
                    console.log(`ℹ️  Column already exists: ${column}`);
                } else {
                    console.error(`❌ Error adding ${column}:`, err.message);
                }
            }
        };
        
        // Add all required columns
        await addColumnIfNotExists('emergency_id', 'INTEGER');
        await addColumnIfNotExists('alert_type_id', 'INTEGER');
        await addColumnIfNotExists('is_emergency', 'BOOLEAN DEFAULT FALSE');
        await addColumnIfNotExists('priority', 'INTEGER DEFAULT 5');
        await addColumnIfNotExists('incident_location', 'TEXT'); // Simplified from GEOGRAPHY
        await addColumnIfNotExists('incident_lat', 'DECIMAL(10, 8)');
        await addColumnIfNotExists('incident_lng', 'DECIMAL(11, 8)');
        await addColumnIfNotExists('district_id', 'INTEGER');
        await addColumnIfNotExists('sector_id', 'INTEGER');
        await addColumnIfNotExists('title', 'VARCHAR(255)');
        await addColumnIfNotExists('message', 'TEXT');
        await addColumnIfNotExists('ai_confidence', 'DECIMAL(5, 2)');
        await addColumnIfNotExists('detected_object', 'VARCHAR(100)');
        await addColumnIfNotExists('media_urls', 'TEXT[]');
        await addColumnIfNotExists('target_radius_km', 'DECIMAL(5, 2) DEFAULT 5.0');
        await addColumnIfNotExists('source', 'VARCHAR(50) DEFAULT \'manual\'');
        await addColumnIfNotExists('created_by', 'INTEGER');
        await addColumnIfNotExists('created_at', 'TIMESTAMP DEFAULT CURRENT_TIMESTAMP');
        await addColumnIfNotExists('status', 'VARCHAR(20) DEFAULT \'active\'');
        
        // Create alert_types table if it doesn't exist
        await client.query(`
            CREATE TABLE IF NOT EXISTS alert_types (
                id SERIAL PRIMARY KEY,
                code VARCHAR(50) UNIQUE NOT NULL,
                name VARCHAR(100) NOT NULL,
                is_emergency BOOLEAN DEFAULT FALSE,
                priority INTEGER DEFAULT 5,
                sound_file VARCHAR(255),
                color_code VARCHAR(7),
                icon VARCHAR(50),
                description TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);
        console.log('✅ Alert types table verified');
        
        // Insert default alert types
        await client.query(`
            INSERT INTO alert_types (code, name, is_emergency, priority, color_code, icon)
            VALUES 
                ('accident', 'Traffic Accident', false, 3, '#FF6600', 'car_crash'),
                ('emergency', 'Emergency', true, 1, '#FF0000', 'emergency'),
                ('traffic_jam', 'Traffic Congestion', false, 5, '#FFAA00', 'traffic'),
                ('road_hazard', 'Road Hazard', false, 4, '#FF9900', 'warning'),
                ('vehicle_fire', 'Vehicle Fire', true, 1, '#FF0000', 'fire'),
                ('pedestrian', 'Pedestrian Incident', false, 3, '#FF6600', 'person'),
                ('collision', 'Vehicle Collision', true, 2, '#FF3300', 'collision')
            ON CONFLICT (code) DO NOTHING
        `);
        console.log('✅ Default alert types inserted');
        
        // Create emergencies table if it doesn't exist
        await client.query(`
            CREATE TABLE IF NOT EXISTS emergencies (
                id SERIAL PRIMARY KEY,
                type VARCHAR(100) NOT NULL,
                severity VARCHAR(20) DEFAULT 'medium',
                latitude DECIMAL(10, 8),
                longitude DECIMAL(11, 8),
                address TEXT,
                description TEXT,
                status VARCHAR(20) DEFAULT 'active',
                reported_by INTEGER,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);
        console.log('✅ Emergencies table verified');
        
        // Final column check
        const finalColumns = await client.query(`
            SELECT column_name 
            FROM information_schema.columns 
            WHERE table_name = 'incident_alerts' 
            ORDER BY ordinal_position
        `);
        
        console.log('\n📋 Final incident_alerts columns:', finalColumns.rows.map(r => r.column_name).join(', '));
        console.log('\n✅ Schema fix complete!');
        
    } catch (error) {
        console.error('❌ Error:', error);
    } finally {
        client.release();
        await pool.end();
    }
}

fixIncidentAlertsTable();
