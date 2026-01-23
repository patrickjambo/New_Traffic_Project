-- ============================================================
-- GEO-FENCING & INTELLIGENT ALERT SYSTEM SCHEMA
-- Rwanda Police Alert System with Kigali Districts
-- ============================================================

-- Enable PostGIS if not already enabled
CREATE EXTENSION IF NOT EXISTS postgis;

-- ============================================================
-- DISTRICTS & SECTORS TABLE (Kigali Administrative Units)
-- ============================================================
CREATE TABLE IF NOT EXISTS districts (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL UNIQUE,
    code VARCHAR(20) UNIQUE,
    province VARCHAR(100) DEFAULT 'Kigali',
    boundary GEOGRAPHY(POLYGON, 4326),  -- GeoJSON polygon boundary
    center_lat DECIMAL(10, 8) NOT NULL,
    center_lng DECIMAL(11, 8) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Sectors within districts
CREATE TABLE IF NOT EXISTS sectors (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    district_id INTEGER REFERENCES districts(id) ON DELETE CASCADE,
    boundary GEOGRAPHY(POLYGON, 4326),
    center_lat DECIMAL(10, 8) NOT NULL,
    center_lng DECIMAL(11, 8) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(name, district_id)
);

-- Cells within sectors (most granular)
CREATE TABLE IF NOT EXISTS cells (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    sector_id INTEGER REFERENCES sectors(id) ON DELETE CASCADE,
    boundary GEOGRAPHY(POLYGON, 4326),
    center_lat DECIMAL(10, 8),
    center_lng DECIMAL(11, 8),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(name, sector_id)
);

-- ============================================================
-- POLICE STATIONS TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS police_stations (
    id SERIAL PRIMARY KEY,
    name VARCHAR(200) NOT NULL,
    code VARCHAR(50) UNIQUE,
    district_id INTEGER REFERENCES districts(id),
    sector_id INTEGER REFERENCES sectors(id),
    address TEXT,
    location GEOGRAPHY(POINT, 4326),
    phone VARCHAR(50),
    is_headquarters BOOLEAN DEFAULT FALSE,
    jurisdiction_radius DECIMAL(10, 2) DEFAULT 5.0,  -- km
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================
-- OFFICER PROFILE EXTENSION (extends users table)
-- ============================================================
CREATE TABLE IF NOT EXISTS officer_profiles (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE UNIQUE,
    badge_number VARCHAR(50) UNIQUE,
    rank VARCHAR(50),
    assigned_station_id INTEGER REFERENCES police_stations(id),
    assigned_district_id INTEGER REFERENCES districts(id),
    assigned_sector_id INTEGER REFERENCES sectors(id),
    
    -- Current location tracking
    current_location GEOGRAPHY(POINT, 4326),
    current_lat DECIMAL(10, 8),
    current_lng DECIMAL(11, 8),
    last_location_update TIMESTAMP,
    
    -- FCM token for push notifications
    fcm_token TEXT,
    device_id VARCHAR(255),
    device_type VARCHAR(20) DEFAULT 'android',
    
    -- Status
    duty_status VARCHAR(20) DEFAULT 'off_duty' CHECK (duty_status IN ('on_duty', 'off_duty', 'on_break', 'responding')),
    is_available BOOLEAN DEFAULT TRUE,
    
    -- Notification preferences
    receive_standard_alerts BOOLEAN DEFAULT TRUE,
    receive_emergency_alerts BOOLEAN DEFAULT TRUE,
    alert_sound_enabled BOOLEAN DEFAULT TRUE,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================
-- OFFICER LOCATION HISTORY (for tracking/auditing)
-- ============================================================
CREATE TABLE IF NOT EXISTS officer_location_history (
    id SERIAL PRIMARY KEY,
    officer_id INTEGER REFERENCES officer_profiles(id) ON DELETE CASCADE,
    location GEOGRAPHY(POINT, 4326) NOT NULL,
    latitude DECIMAL(10, 8) NOT NULL,
    longitude DECIMAL(11, 8) NOT NULL,
    accuracy DECIMAL(10, 2),  -- meters
    speed DECIMAL(10, 2),     -- km/h
    heading DECIMAL(5, 2),    -- degrees
    recorded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================
-- ALERT TYPES & CONFIGURATIONS
-- ============================================================
CREATE TABLE IF NOT EXISTS alert_types (
    id SERIAL PRIMARY KEY,
    code VARCHAR(50) UNIQUE NOT NULL,
    name VARCHAR(100) NOT NULL,
    is_emergency BOOLEAN DEFAULT FALSE,
    priority INTEGER DEFAULT 5,  -- 1=highest, 10=lowest
    sound_file VARCHAR(255),
    color_code VARCHAR(7),  -- Hex color #FF0000
    icon VARCHAR(50),
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================
-- ALERTS TABLE (All alerts sent to officers)
-- ============================================================
CREATE TABLE IF NOT EXISTS incident_alerts (
    id SERIAL PRIMARY KEY,
    incident_id INTEGER REFERENCES incidents(id) ON DELETE CASCADE,
    emergency_id INTEGER REFERENCES emergencies(id) ON DELETE CASCADE,
    alert_type_id INTEGER REFERENCES alert_types(id),
    
    -- Alert classification
    is_emergency BOOLEAN DEFAULT FALSE,
    priority INTEGER DEFAULT 5,
    
    -- Location of incident
    incident_location GEOGRAPHY(POINT, 4326),
    incident_lat DECIMAL(10, 8) NOT NULL,
    incident_lng DECIMAL(11, 8) NOT NULL,
    district_id INTEGER REFERENCES districts(id),
    sector_id INTEGER REFERENCES sectors(id),
    
    -- Alert content
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    ai_confidence DECIMAL(3, 2),
    detected_object VARCHAR(100),  -- 'firearm', 'accident', etc.
    media_urls TEXT[],
    
    -- Geo-fence targeting
    target_radius_km DECIMAL(10, 2) DEFAULT 5.0,
    target_districts INTEGER[],
    target_stations INTEGER[],
    
    -- Metadata
    source VARCHAR(50) DEFAULT 'ai',  -- 'ai', 'manual', 'public_report'
    created_by INTEGER REFERENCES users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP
);

-- ============================================================
-- ALERT DELIVERIES (Track which officers received which alerts)
-- ============================================================
CREATE TABLE IF NOT EXISTS alert_deliveries (
    id SERIAL PRIMARY KEY,
    alert_id INTEGER REFERENCES incident_alerts(id) ON DELETE CASCADE,
    officer_id INTEGER REFERENCES officer_profiles(id) ON DELETE CASCADE,
    
    -- Delivery method
    delivery_method VARCHAR(20) DEFAULT 'push' CHECK (delivery_method IN ('push', 'websocket', 'sms', 'all')),
    fcm_message_id VARCHAR(255),
    
    -- Status tracking
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'delivered', 'read', 'acknowledged', 'failed')),
    sent_at TIMESTAMP,
    delivered_at TIMESTAMP,
    read_at TIMESTAMP,
    acknowledged_at TIMESTAMP,
    
    -- Distance from incident at time of alert
    distance_km DECIMAL(10, 2),
    
    -- Response
    response_action VARCHAR(50),  -- 'accepted', 'declined', 'forwarded'
    response_note TEXT,
    response_at TIMESTAMP,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    UNIQUE(alert_id, officer_id)
);

-- ============================================================
-- INDEXES FOR PERFORMANCE
-- ============================================================

-- Spatial indexes
CREATE INDEX IF NOT EXISTS idx_districts_boundary ON districts USING GIST(boundary);
CREATE INDEX IF NOT EXISTS idx_sectors_boundary ON sectors USING GIST(boundary);
CREATE INDEX IF NOT EXISTS idx_cells_boundary ON cells USING GIST(boundary);
CREATE INDEX IF NOT EXISTS idx_police_stations_location ON police_stations USING GIST(location);
CREATE INDEX IF NOT EXISTS idx_officer_profiles_location ON officer_profiles USING GIST(current_location);
CREATE INDEX IF NOT EXISTS idx_officer_location_history ON officer_location_history USING GIST(location);
CREATE INDEX IF NOT EXISTS idx_incident_alerts_location ON incident_alerts USING GIST(incident_location);

-- Other indexes
CREATE INDEX IF NOT EXISTS idx_officer_profiles_duty_status ON officer_profiles(duty_status);
CREATE INDEX IF NOT EXISTS idx_officer_profiles_available ON officer_profiles(is_available);
CREATE INDEX IF NOT EXISTS idx_officer_profiles_station ON officer_profiles(assigned_station_id);
CREATE INDEX IF NOT EXISTS idx_officer_profiles_district ON officer_profiles(assigned_district_id);
CREATE INDEX IF NOT EXISTS idx_alert_deliveries_officer ON alert_deliveries(officer_id);
CREATE INDEX IF NOT EXISTS idx_alert_deliveries_status ON alert_deliveries(status);
CREATE INDEX IF NOT EXISTS idx_incident_alerts_emergency ON incident_alerts(is_emergency);
CREATE INDEX IF NOT EXISTS idx_incident_alerts_district ON incident_alerts(district_id);

-- ============================================================
-- INSERT KIGALI DISTRICTS
-- ============================================================
INSERT INTO districts (name, code, province, center_lat, center_lng) VALUES
    ('Nyarugenge', 'NYA', 'Kigali', -1.9536, 30.0606),
    ('Gasabo', 'GAS', 'Kigali', -1.9147, 30.1045),
    ('Kicukiro', 'KIC', 'Kigali', -1.9876, 30.1029)
ON CONFLICT (name) DO NOTHING;

-- ============================================================
-- INSERT COMMON SECTORS (Sample for each district)
-- ============================================================
INSERT INTO sectors (name, district_id, center_lat, center_lng) 
SELECT 'Nyarugenge', d.id, -1.9535, 30.0600 FROM districts d WHERE d.name = 'Nyarugenge'
ON CONFLICT DO NOTHING;

INSERT INTO sectors (name, district_id, center_lat, center_lng)
SELECT 'Nyamirambo', d.id, -1.9658, 30.0396 FROM districts d WHERE d.name = 'Nyarugenge'
ON CONFLICT DO NOTHING;

INSERT INTO sectors (name, district_id, center_lat, center_lng)
SELECT 'Remera', d.id, -1.9547, 30.1155 FROM districts d WHERE d.name = 'Gasabo'
ON CONFLICT DO NOTHING;

INSERT INTO sectors (name, district_id, center_lat, center_lng)
SELECT 'Kimihurura', d.id, -1.9403, 30.1067 FROM districts d WHERE d.name = 'Gasabo'
ON CONFLICT DO NOTHING;

INSERT INTO sectors (name, district_id, center_lat, center_lng)
SELECT 'Kacyiru', d.id, -1.9559, 30.0924 FROM districts d WHERE d.name = 'Gasabo'
ON CONFLICT DO NOTHING;

INSERT INTO sectors (name, district_id, center_lat, center_lng)
SELECT 'Gikondo', d.id, -1.9745, 30.0716 FROM districts d WHERE d.name = 'Kicukiro'
ON CONFLICT DO NOTHING;

INSERT INTO sectors (name, district_id, center_lat, center_lng)
SELECT 'Niboye', d.id, -1.9898, 30.1087 FROM districts d WHERE d.name = 'Kicukiro'
ON CONFLICT DO NOTHING;

-- ============================================================
-- INSERT ALERT TYPES
-- ============================================================
INSERT INTO alert_types (code, name, is_emergency, priority, color_code, icon, description) VALUES
    ('ACCIDENT', 'Traffic Accident', TRUE, 1, '#FF0000', 'car_crash', 'Vehicle collision or road accident'),
    ('FIRE', 'Fire Emergency', TRUE, 1, '#FF4500', 'fire', 'Fire detected in area'),
    ('FIREARM', 'Firearm Detected', TRUE, 1, '#8B0000', 'warning', 'AI detected firearm/weapon'),
    ('ASSAULT', 'Assault', TRUE, 2, '#DC143C', 'person_alert', 'Physical assault reported'),
    ('ROBBERY', 'Robbery', TRUE, 2, '#B22222', 'theft', 'Theft/robbery in progress'),
    ('CONGESTION', 'Traffic Congestion', FALSE, 5, '#FFA500', 'traffic', 'Heavy traffic congestion'),
    ('ROADBLOCK', 'Road Blockage', FALSE, 4, '#FFD700', 'block', 'Road blockage or obstruction'),
    ('GENERAL', 'General Incident', FALSE, 6, '#4682B4', 'info', 'General incident report'),
    ('UPDATE', 'Status Update', FALSE, 8, '#32CD32', 'update', 'Incident status update'),
    ('ANNOUNCEMENT', 'Announcement', FALSE, 9, '#1E90FF', 'announcement', 'General announcement')
ON CONFLICT (code) DO NOTHING;

-- ============================================================
-- FUNCTION: Get District from GPS Coordinates
-- ============================================================
CREATE OR REPLACE FUNCTION get_district_from_location(lat DECIMAL, lng DECIMAL)
RETURNS INTEGER AS $$
DECLARE
    district_id INTEGER;
BEGIN
    -- First try to find district by boundary (if boundaries are defined)
    SELECT id INTO district_id
    FROM districts
    WHERE ST_Contains(boundary::geometry, ST_SetSRID(ST_MakePoint(lng, lat), 4326))
    LIMIT 1;
    
    -- If no boundary match, find closest district by center point
    IF district_id IS NULL THEN
        SELECT id INTO district_id
        FROM districts
        ORDER BY ST_Distance(
            ST_SetSRID(ST_MakePoint(lng, lat), 4326)::geography,
            ST_SetSRID(ST_MakePoint(center_lng, center_lat), 4326)::geography
        )
        LIMIT 1;
    END IF;
    
    RETURN district_id;
END;
$$ LANGUAGE plpgsql;

-- ============================================================
-- FUNCTION: Find Officers in Geo-Fence
-- ============================================================
CREATE OR REPLACE FUNCTION find_officers_in_geofence(
    p_lat DECIMAL,
    p_lng DECIMAL,
    p_radius_km DECIMAL DEFAULT 5.0,
    p_district_id INTEGER DEFAULT NULL,
    p_include_off_duty BOOLEAN DEFAULT FALSE
)
RETURNS TABLE (
    officer_id INTEGER,
    user_id INTEGER,
    badge_number VARCHAR,
    full_name VARCHAR,
    fcm_token TEXT,
    distance_km DECIMAL,
    duty_status VARCHAR,
    assigned_district_id INTEGER
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        op.id as officer_id,
        op.user_id,
        op.badge_number,
        u.full_name,
        op.fcm_token,
        ROUND(
            ST_Distance(
                op.current_location,
                ST_SetSRID(ST_MakePoint(p_lng, p_lat), 4326)::geography
            ) / 1000, 2
        )::DECIMAL as distance_km,
        op.duty_status,
        op.assigned_district_id
    FROM officer_profiles op
    JOIN users u ON op.user_id = u.id
    WHERE 
        -- Active and available
        (p_include_off_duty OR op.duty_status = 'on_duty')
        AND op.is_available = TRUE
        AND op.fcm_token IS NOT NULL
        AND op.current_location IS NOT NULL
        AND (
            -- Within radius
            ST_DWithin(
                op.current_location,
                ST_SetSRID(ST_MakePoint(p_lng, p_lat), 4326)::geography,
                p_radius_km * 1000  -- Convert km to meters
            )
            -- OR assigned to the district
            OR (p_district_id IS NOT NULL AND op.assigned_district_id = p_district_id)
        )
    ORDER BY distance_km;
END;
$$ LANGUAGE plpgsql;

-- ============================================================
-- TRIGGER: Update timestamp on officer profile update
-- ============================================================
CREATE OR REPLACE FUNCTION update_officer_profile_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_officer_profile ON officer_profiles;
CREATE TRIGGER trigger_update_officer_profile
    BEFORE UPDATE ON officer_profiles
    FOR EACH ROW
    EXECUTE FUNCTION update_officer_profile_timestamp();

-- ============================================================
-- COMMENTS
-- ============================================================
COMMENT ON TABLE districts IS 'Kigali administrative districts for geo-fencing';
COMMENT ON TABLE sectors IS 'Sectors within districts for granular targeting';
COMMENT ON TABLE police_stations IS 'Police station locations and jurisdictions';
COMMENT ON TABLE officer_profiles IS 'Extended profile for police officers including location and FCM token';
COMMENT ON TABLE incident_alerts IS 'All alerts generated for incidents/emergencies';
COMMENT ON TABLE alert_deliveries IS 'Tracks delivery status of each alert to each officer';
COMMENT ON FUNCTION get_district_from_location IS 'Returns district ID for given GPS coordinates';
COMMENT ON FUNCTION find_officers_in_geofence IS 'Finds all officers within radius or assigned to district';
