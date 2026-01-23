-- Emergency Management System Migration
-- This adds tables for emergency requests and tracking

-- Create emergencies table
CREATE TABLE IF NOT EXISTS emergencies (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    emergency_type VARCHAR(50) NOT NULL,
    severity VARCHAR(20) NOT NULL DEFAULT 'medium',
    location_name TEXT NOT NULL,
    location_description TEXT,
    latitude DECIMAL(10, 8) NOT NULL,
    longitude DECIMAL(11, 8) NOT NULL,
    
    -- Emergency details
    description TEXT NOT NULL,
    casualties_count INTEGER DEFAULT 0,
    vehicles_involved INTEGER DEFAULT 0,
    
    -- Services needed
    services_needed JSONB DEFAULT '[]'::jsonb,
    
    -- Contact info
    contact_name VARCHAR(255),
    contact_phone VARCHAR(20) NOT NULL,
    
    -- Media
    images JSONB DEFAULT '[]'::jsonb,
    video_url TEXT,
    
    -- Status tracking
    status VARCHAR(50) DEFAULT 'pending',
    priority INTEGER DEFAULT 3,
    assigned_to INTEGER REFERENCES users(id) ON DELETE SET NULL,
    
    -- Response tracking
    response_time INTERVAL,
    resolution_time INTERVAL,
    responder_notes TEXT,
    
    -- Timestamps
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    resolved_at TIMESTAMP,
    
    -- Spatial index for location queries
    location GEOGRAPHY(POINT, 4326)
);

-- Create spatial index
CREATE INDEX IF NOT EXISTS idx_emergencies_location ON emergencies USING GIST(location);

-- Create indexes for common queries
CREATE INDEX IF NOT EXISTS idx_emergencies_status ON emergencies(status);
CREATE INDEX IF NOT EXISTS idx_emergencies_severity ON emergencies(severity);
CREATE INDEX IF NOT EXISTS idx_emergencies_user_id ON emergencies(user_id);
CREATE INDEX IF NOT EXISTS idx_emergencies_created_at ON emergencies(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_emergencies_assigned_to ON emergencies(assigned_to);

-- Create trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_emergency_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    
    -- Update location geography point
    NEW.location = ST_SetSRID(ST_MakePoint(NEW.longitude, NEW.latitude), 4326)::geography;
    
    -- Calculate response time when status changes from pending
    IF OLD.status = 'pending' AND NEW.status != 'pending' AND NEW.response_time IS NULL THEN
        NEW.response_time = NEW.updated_at - NEW.created_at;
    END IF;
    
    -- Calculate resolution time when resolved
    IF NEW.status IN ('resolved', 'completed') AND OLD.status NOT IN ('resolved', 'completed') THEN
        NEW.resolved_at = CURRENT_TIMESTAMP;
        NEW.resolution_time = CURRENT_TIMESTAMP - NEW.created_at;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER emergency_update_timestamp
    BEFORE UPDATE ON emergencies
    FOR EACH ROW
    EXECUTE FUNCTION update_emergency_timestamp();

-- Create trigger to set location on insert
CREATE OR REPLACE FUNCTION set_emergency_location()
RETURNS TRIGGER AS $$
BEGIN
    NEW.location = ST_SetSRID(ST_MakePoint(NEW.longitude, NEW.latitude), 4326)::geography;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER emergency_set_location
    BEFORE INSERT ON emergencies
    FOR EACH ROW
    EXECUTE FUNCTION set_emergency_location();

-- Create emergency_notifications table for real-time notifications
CREATE TABLE IF NOT EXISTS emergency_notifications (
    id SERIAL PRIMARY KEY,
    emergency_id INTEGER REFERENCES emergencies(id) ON DELETE CASCADE,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    notification_type VARCHAR(50) NOT NULL,
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    is_read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    read_at TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_emergency_notifications_user_id ON emergency_notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_emergency_notifications_is_read ON emergency_notifications(is_read);
CREATE INDEX IF NOT EXISTS idx_emergency_notifications_created_at ON emergency_notifications(created_at DESC);

-- Create emergency_status_history table for tracking status changes
CREATE TABLE IF NOT EXISTS emergency_status_history (
    id SERIAL PRIMARY KEY,
    emergency_id INTEGER REFERENCES emergencies(id) ON DELETE CASCADE,
    old_status VARCHAR(50),
    new_status VARCHAR(50) NOT NULL,
    changed_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_emergency_status_history_emergency_id ON emergency_status_history(emergency_id);

-- Function to get nearby emergencies
CREATE OR REPLACE FUNCTION get_nearby_emergencies(
    user_lat DECIMAL,
    user_lng DECIMAL,
    radius_km DECIMAL DEFAULT 10,
    limit_count INTEGER DEFAULT 50
)
RETURNS TABLE (
    id INTEGER,
    emergency_type VARCHAR(50),
    severity VARCHAR(20),
    location_name TEXT,
    description TEXT,
    status VARCHAR(50),
    distance_km DECIMAL
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        e.id,
        e.emergency_type,
        e.severity,
        e.location_name,
        e.description,
        e.status,
        (ST_Distance(
            e.location::geography,
            ST_SetSRID(ST_MakePoint(user_lng, user_lat), 4326)::geography
        ) / 1000)::DECIMAL AS distance_km
    FROM emergencies e
    WHERE ST_DWithin(
        e.location::geography,
        ST_SetSRID(ST_MakePoint(user_lng, user_lat), 4326)::geography,
        radius_km * 1000
    )
    ORDER BY distance_km ASC
    LIMIT limit_count;
END;
$$ LANGUAGE plpgsql;

-- Add some demo emergency data for testing
INSERT INTO emergencies (
    user_id,
    emergency_type,
    severity,
    location_name,
    location_description,
    latitude,
    longitude,
    description,
    casualties_count,
    vehicles_involved,
    services_needed,
    contact_name,
    contact_phone,
    status
) VALUES 
(
    1,
    'accident',
    'critical',
    'Kampala Road - City Center',
    'Near Kampala Capital City Authority building',
    0.3163,
    32.5822,
    'Major vehicle collision involving 3 vehicles. Multiple casualties. Road completely blocked.',
    5,
    3,
    '["police", "ambulance", "fire"]'::jsonb,
    'John Doe',
    '+256700123456',
    'active'
),
(
    1,
    'fire',
    'high',
    'Nakawa Market',
    'Inside main market area, near vegetable section',
    0.3311,
    32.6186,
    'Fire outbreak in market stalls. Spreading rapidly.',
    0,
    0,
    '["fire", "police"]'::jsonb,
    'Jane Smith',
    '+256701234567',
    'pending'
),
(
    2,
    'medical',
    'high',
    'Makerere University - Main Gate',
    'Outside main entrance gate',
    0.3293,
    32.5689,
    'Person collapsed, unconscious. Needs immediate medical attention.',
    1,
    0,
    '["ambulance"]'::jsonb,
    'Peter Okello',
    '+256702345678',
    'dispatched'
);

COMMENT ON TABLE emergencies IS 'Stores emergency requests from users with location tracking';
COMMENT ON TABLE emergency_notifications IS 'Stores notifications sent to users about emergencies';
COMMENT ON TABLE emergency_status_history IS 'Tracks all status changes for emergencies';
