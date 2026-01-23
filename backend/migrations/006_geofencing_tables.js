/**
 * Migration: Geo-Fencing Tables
 * Creates tables for district-based geo-fencing and intelligent alert system
 */

const { pool } = require('../src/config/database');

async function up() {
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');
    
    console.log('Creating geo-fencing tables...');
    
    // 1. Districts table
    await client.query(`
      CREATE TABLE IF NOT EXISTS districts (
        id SERIAL PRIMARY KEY,
        name VARCHAR(100) NOT NULL UNIQUE,
        code VARCHAR(20) NOT NULL UNIQUE,
        center_lat DECIMAL(10, 8) NOT NULL,
        center_lng DECIMAL(11, 8) NOT NULL,
        radius_km DECIMAL(10, 2) DEFAULT 10,
        boundary_polygon JSONB,
        province VARCHAR(100) DEFAULT 'Kigali',
        is_active BOOLEAN DEFAULT true,
        priority_level INTEGER DEFAULT 3,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('✓ Created districts table');
    
    // 2. Sectors table
    await client.query(`
      CREATE TABLE IF NOT EXISTS sectors (
        id SERIAL PRIMARY KEY,
        name VARCHAR(100) NOT NULL,
        district_id INTEGER REFERENCES districts(id) ON DELETE CASCADE,
        center_lat DECIMAL(10, 8) NOT NULL,
        center_lng DECIMAL(11, 8) NOT NULL,
        radius_km DECIMAL(10, 2) DEFAULT 3,
        boundary_polygon JSONB,
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(name, district_id)
      )
    `);
    console.log('✓ Created sectors table');
    
    // 3. Police stations table
    await client.query(`
      CREATE TABLE IF NOT EXISTS police_stations (
        id SERIAL PRIMARY KEY,
        name VARCHAR(200) NOT NULL,
        station_code VARCHAR(50) UNIQUE,
        district_id INTEGER REFERENCES districts(id),
        sector_id INTEGER REFERENCES sectors(id),
        latitude DECIMAL(10, 8) NOT NULL,
        longitude DECIMAL(11, 8) NOT NULL,
        address TEXT,
        phone VARCHAR(20),
        email VARCHAR(100),
        station_type VARCHAR(50) DEFAULT 'general',
        officer_capacity INTEGER DEFAULT 20,
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('✓ Created police_stations table');
    
    // 4. Officer profiles table (extends users - optional reference)
    await client.query(`
      CREATE TABLE IF NOT EXISTS officer_profiles (
        id SERIAL PRIMARY KEY,
        user_id INTEGER,
        badge_number VARCHAR(50) UNIQUE,
        rank VARCHAR(50),
        full_name VARCHAR(200),
        email VARCHAR(100),
        phone VARCHAR(20),
        assigned_district_id INTEGER REFERENCES districts(id),
        assigned_station_id INTEGER REFERENCES police_stations(id),
        
        current_latitude DECIMAL(10, 8),
        current_longitude DECIMAL(11, 8),
        current_district_id INTEGER REFERENCES districts(id),
        location_updated_at TIMESTAMP,
        
        is_on_duty BOOLEAN DEFAULT false,
        duty_start_time TIMESTAMP,
        duty_end_time TIMESTAMP,
        
        fcm_token TEXT,
        device_id VARCHAR(100),
        notification_enabled BOOLEAN DEFAULT true,
        emergency_alert_enabled BOOLEAN DEFAULT true,
        silent_mode_override BOOLEAN DEFAULT true,
        
        total_responses INTEGER DEFAULT 0,
        avg_response_time_seconds INTEGER,
        
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('✓ Created officer_profiles table');
    
    // 5. Officer location history
    await client.query(`
      CREATE TABLE IF NOT EXISTS officer_location_history (
        id SERIAL PRIMARY KEY,
        officer_id INTEGER REFERENCES officer_profiles(id) ON DELETE CASCADE,
        latitude DECIMAL(10, 8) NOT NULL,
        longitude DECIMAL(11, 8) NOT NULL,
        district_id INTEGER REFERENCES districts(id),
        accuracy_meters DECIMAL(10, 2),
        speed_kmh DECIMAL(10, 2),
        heading DECIMAL(5, 2),
        recorded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('✓ Created officer_location_history table');
    
    // 6. Incident alerts table
    await client.query(`
      CREATE TABLE IF NOT EXISTS incident_alerts (
        id SERIAL PRIMARY KEY,
        incident_id INTEGER,
        analysis_id INTEGER,
        
        alert_type VARCHAR(20) NOT NULL CHECK (alert_type IN ('standard', 'emergency')),
        priority_level INTEGER DEFAULT 3 CHECK (priority_level BETWEEN 1 AND 5),
        
        incident_type VARCHAR(100),
        description TEXT,
        
        latitude DECIMAL(10, 8) NOT NULL,
        longitude DECIMAL(11, 8) NOT NULL,
        district_id INTEGER REFERENCES districts(id),
        sector_id INTEGER REFERENCES sectors(id),
        location_name VARCHAR(200),
        
        source VARCHAR(50) DEFAULT 'ai_detection',
        source_camera_id VARCHAR(100),
        source_user_id INTEGER,
        
        status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'dispatched', 'acknowledged', 'resolved', 'cancelled')),
        
        officers_notified INTEGER DEFAULT 0,
        officers_acknowledged INTEGER DEFAULT 0,
        first_response_at TIMESTAMP,
        resolved_at TIMESTAMP,
        
        media_urls JSONB,
        metadata JSONB,
        
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        expires_at TIMESTAMP
      )
    `);
    console.log('✓ Created incident_alerts table');
    
    // 7. Alert deliveries table
    await client.query(`
      CREATE TABLE IF NOT EXISTS alert_deliveries (
        id SERIAL PRIMARY KEY,
        alert_id INTEGER REFERENCES incident_alerts(id) ON DELETE CASCADE,
        officer_id INTEGER REFERENCES officer_profiles(id) ON DELETE CASCADE,
        
        delivery_method VARCHAR(20) NOT NULL CHECK (delivery_method IN ('websocket', 'fcm', 'sms', 'call')),
        delivery_status VARCHAR(20) DEFAULT 'pending' CHECK (delivery_status IN ('pending', 'sent', 'delivered', 'failed', 'acknowledged')),
        
        sent_at TIMESTAMP,
        delivered_at TIMESTAMP,
        acknowledged_at TIMESTAMP,
        
        officer_latitude DECIMAL(10, 8),
        officer_longitude DECIMAL(11, 8),
        distance_km DECIMAL(10, 2),
        
        response_action VARCHAR(50),
        response_notes TEXT,
        
        retry_count INTEGER DEFAULT 0,
        error_message TEXT,
        
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('✓ Created alert_deliveries table');
    
    // 8. Geo-fence rules table
    await client.query(`
      CREATE TABLE IF NOT EXISTS geofence_rules (
        id SERIAL PRIMARY KEY,
        name VARCHAR(100) NOT NULL,
        description TEXT,
        
        rule_type VARCHAR(50) NOT NULL,
        district_id INTEGER REFERENCES districts(id),
        
        min_officers INTEGER DEFAULT 1,
        max_radius_km DECIMAL(10, 2) DEFAULT 10,
        escalation_timeout_minutes INTEGER DEFAULT 5,
        auto_escalate BOOLEAN DEFAULT true,
        
        incident_types TEXT[],
        priority_threshold INTEGER DEFAULT 3,
        
        active_hours_start TIME,
        active_hours_end TIME,
        active_days INTEGER[],
        
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('✓ Created geofence_rules table');
    
    // Create indexes
    console.log('\nCreating indexes...');
    
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_officer_profiles_location 
      ON officer_profiles(current_latitude, current_longitude) 
      WHERE current_latitude IS NOT NULL AND current_longitude IS NOT NULL
    `);
    
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_officer_profiles_district 
      ON officer_profiles(current_district_id) 
      WHERE current_district_id IS NOT NULL
    `);
    
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_officer_profiles_on_duty 
      ON officer_profiles(is_on_duty) 
      WHERE is_on_duty = true
    `);
    
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_incident_alerts_status 
      ON incident_alerts(status, created_at DESC)
    `);
    
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_incident_alerts_district 
      ON incident_alerts(district_id, created_at DESC)
    `);
    
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_incident_alerts_location 
      ON incident_alerts(latitude, longitude)
    `);
    
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_alert_deliveries_officer 
      ON alert_deliveries(officer_id, created_at DESC)
    `);
    
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_officer_location_history_time 
      ON officer_location_history(officer_id, recorded_at DESC)
    `);
    
    console.log('✓ Created all indexes');
    
    // Insert Kigali districts
    console.log('\nSeeding Kigali districts...');
    
    await client.query(`
      INSERT INTO districts (name, code, center_lat, center_lng, radius_km, province, priority_level)
      VALUES 
        ('Nyarugenge', 'NYA', -1.9536, 30.0606, 8, 'Kigali', 1),
        ('Gasabo', 'GAS', -1.9147, 30.1045, 12, 'Kigali', 2),
        ('Kicukiro', 'KIC', -1.9876, 30.1029, 10, 'Kigali', 2)
      ON CONFLICT (code) DO UPDATE SET
        center_lat = EXCLUDED.center_lat,
        center_lng = EXCLUDED.center_lng,
        radius_km = EXCLUDED.radius_km,
        updated_at = CURRENT_TIMESTAMP
    `);
    console.log('✓ Seeded Kigali districts');
    
    // Insert some sectors
    console.log('\nSeeding sectors...');
    
    await client.query(`
      INSERT INTO sectors (name, district_id, center_lat, center_lng, radius_km)
      SELECT s.name, d.id, s.lat, s.lng, s.radius
      FROM (VALUES
        ('Nyarugenge', 'NYA', -1.9540, 30.0610, 2.5),
        ('Muhima', 'NYA', -1.9480, 30.0580, 2.0),
        ('Gitega', 'NYA', -1.9600, 30.0550, 2.0),
        ('Kimisagara', 'GAS', -1.9300, 30.0700, 2.5),
        ('Remera', 'GAS', -1.9550, 30.1150, 3.0),
        ('Kacyiru', 'GAS', -1.9380, 30.0950, 2.5),
        ('Kimironko', 'GAS', -1.9400, 30.1200, 3.0),
        ('Gikondo', 'KIC', -1.9750, 30.0750, 2.5),
        ('Niboye', 'KIC', -2.0000, 30.1000, 2.5),
        ('Kagarama', 'KIC', -1.9900, 30.1100, 2.0)
      ) AS s(name, district_code, lat, lng, radius)
      JOIN districts d ON d.code = s.district_code
      ON CONFLICT (name, district_id) DO UPDATE SET
        center_lat = EXCLUDED.center_lat,
        center_lng = EXCLUDED.center_lng,
        updated_at = CURRENT_TIMESTAMP
    `);
    console.log('✓ Seeded sectors');
    
    // Create default geo-fence rules
    console.log('\nCreating default geo-fence rules...');
    
    await client.query(`
      INSERT INTO geofence_rules (name, description, rule_type, min_officers, max_radius_km, escalation_timeout_minutes, incident_types, priority_threshold)
      VALUES 
        ('Emergency Response', 'High priority emergency alerts', 'emergency', 3, 15, 3, ARRAY['collision', 'accident', 'emergency', 'fire', 'medical'], 1),
        ('Traffic Incident', 'Standard traffic incident alerts', 'standard', 2, 10, 5, ARRAY['congestion', 'violation', 'road_block', 'traffic_light'], 3),
        ('General Alert', 'Low priority general alerts', 'standard', 1, 5, 10, ARRAY['parking', 'minor_violation', 'assistance'], 4)
      ON CONFLICT DO NOTHING
    `);
    console.log('✓ Created default geo-fence rules');
    
    await client.query('COMMIT');
    console.log('\n✅ Geo-fencing migration completed successfully!');
    
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Migration failed:', error.message);
    throw error;
  } finally {
    client.release();
  }
}

async function down() {
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');
    
    console.log('Rolling back geo-fencing tables...');
    
    await client.query('DROP TABLE IF EXISTS alert_deliveries CASCADE');
    await client.query('DROP TABLE IF EXISTS incident_alerts CASCADE');
    await client.query('DROP TABLE IF EXISTS geofence_rules CASCADE');
    await client.query('DROP TABLE IF EXISTS officer_location_history CASCADE');
    await client.query('DROP TABLE IF EXISTS officer_profiles CASCADE');
    await client.query('DROP TABLE IF EXISTS police_stations CASCADE');
    await client.query('DROP TABLE IF EXISTS sectors CASCADE');
    await client.query('DROP TABLE IF EXISTS districts CASCADE');
    
    await client.query('COMMIT');
    console.log('✅ Rollback completed');
    
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Rollback failed:', error.message);
    throw error;
  } finally {
    client.release();
  }
}

// Run migration
if (require.main === module) {
  const action = process.argv[2] || 'up';
  
  if (action === 'up') {
    up()
      .then(() => process.exit(0))
      .catch(() => process.exit(1));
  } else if (action === 'down') {
    down()
      .then(() => process.exit(0))
      .catch(() => process.exit(1));
  } else {
    console.log('Usage: node 006_geofencing_tables.js [up|down]');
    process.exit(1);
  }
}

module.exports = { up, down };
