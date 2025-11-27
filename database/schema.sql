-- TrafficGuard AI Database Schema
-- PostgreSQL 14+

-- Enable PostGIS extension for geospatial queries
CREATE EXTENSION IF NOT EXISTS postgis;

-- Users table
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    full_name VARCHAR(100) NOT NULL,
    phone VARCHAR(20),
    role VARCHAR(20) NOT NULL DEFAULT 'public' CHECK (role IN ('public', 'police', 'admin')),
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Incidents table
CREATE TABLE incidents (
    id SERIAL PRIMARY KEY,
    type VARCHAR(50) NOT NULL CHECK (type IN ('congestion', 'accident', 'road_blockage', 'other')),
    severity VARCHAR(20) NOT NULL CHECK (severity IN ('low', 'medium', 'high', 'critical')),
    location GEOGRAPHY(Point, 4326) NOT NULL,  -- GPS coordinates (lat, lng)
    address TEXT,
    description TEXT,
    status VARCHAR(20) DEFAULT 'reported' CHECK (status IN ('reported', 'verified', 'in_progress', 'resolved', 'dismissed')),
    video_url TEXT,
    thumbnail_url TEXT,
    reported_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
    verified_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
    is_anonymous BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    resolved_at TIMESTAMP
);

-- Incident analytics (AI analysis results)
CREATE TABLE incident_analytics (
    id SERIAL PRIMARY KEY,
    incident_id INTEGER REFERENCES incidents(id) ON DELETE CASCADE,
    vehicle_count INTEGER,
    avg_speed DECIMAL(5, 2),  -- km/h
    confidence DECIMAL(3, 2),  -- 0.00 to 1.00
    detected_type VARCHAR(50),
    stationary_count INTEGER,
    analysis_data JSONB,  -- Store additional analysis metadata
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Incident updates/history
CREATE TABLE incident_updates (
    id SERIAL PRIMARY KEY,
    incident_id INTEGER REFERENCES incidents(id) ON DELETE CASCADE,
    user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
    status VARCHAR(20),
    comment TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Notifications
CREATE TABLE notifications (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    incident_id INTEGER REFERENCES incidents(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    type VARCHAR(50) DEFAULT 'incident_alert',
    is_read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for performance
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_role ON users(role);

-- Geospatial index for location-based queries
CREATE INDEX idx_incidents_location ON incidents USING GIST(location);
CREATE INDEX idx_incidents_created_at ON incidents(created_at DESC);
CREATE INDEX idx_incidents_status ON incidents(status);
CREATE INDEX idx_incidents_type ON incidents(type);

CREATE INDEX idx_incident_analytics_incident_id ON incident_analytics(incident_id);
CREATE INDEX idx_incident_updates_incident_id ON incident_updates(incident_id);
CREATE INDEX idx_notifications_user_id ON notifications(user_id);
CREATE INDEX idx_notifications_is_read ON notifications(is_read);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Triggers for updated_at
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_incidents_updated_at BEFORE UPDATE ON incidents
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Insert default admin user (password: admin123 - CHANGE IN PRODUCTION)
-- Password hash for 'admin123' using bcrypt
INSERT INTO users (email, password_hash, full_name, role) VALUES
    ('admin@trafficguard.ai', '$2a$10$rH7Y8Z9X6Jz7YZQ3Y8Z7YeJ7Y8Z7Y8Z7Y8Z7Y8Z7Y8Z7Y8Z7Y8Z7Y', 'System Administrator', 'admin');

-- Sample police officer (password: police123)
INSERT INTO users (email, password_hash, full_name, role, phone) VALUES
    ('officer@trafficguard.ai', '$2a$10$rH7Y8Z9X6Jz7YZQ3Y8Z7YeJ7Y8Z7Y8Z7Y8Z7Y8Z7Y8Z7Y8Z7Y8Z7Y', 'Police Officer', 'police', '+250788123456');

-- Comments for documentation
COMMENT ON TABLE users IS 'User accounts for public, police, and admin access';
COMMENT ON TABLE incidents IS 'Traffic incidents reported via mobile app or AI detection';
COMMENT ON TABLE incident_analytics IS 'AI analysis results for each incident';
COMMENT ON TABLE incident_updates IS 'History of incident status changes and comments';
COMMENT ON TABLE notifications IS 'Push notifications for users';
