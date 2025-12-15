-- RNP Integration Migration Script

-- Deployments table
CREATE TABLE IF NOT EXISTS deployments (
    id SERIAL PRIMARY KEY,
    unit_name VARCHAR(100) NOT NULL,
    address TEXT,
    latitude DECIMAL(10, 8),
    longitude DECIMAL(11, 8),
    status VARCHAR(20) DEFAULT 'Standby' CHECK (status IN ('Standby', 'Active', 'Completed', 'Cancelled')),
    start_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    end_time TIMESTAMP,
    incident_id INTEGER REFERENCES incidents(id) ON DELETE SET NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Deployment Officers (Many-to-Many)
CREATE TABLE IF NOT EXISTS deployment_officers (
    deployment_id INTEGER REFERENCES deployments(id) ON DELETE CASCADE,
    officer_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    PRIMARY KEY (deployment_id, officer_id)
);

-- Traffic Data table
CREATE TABLE IF NOT EXISTS traffic_data (
    id SERIAL PRIMARY KEY,
    region VARCHAR(100) NOT NULL,
    congestion_level INTEGER CHECK (congestion_level BETWEEN 0 AND 100),
    vehicle_count INTEGER,
    average_speed DECIMAL(5, 2),
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- System Alerts table (if not exists)
CREATE TABLE IF NOT EXISTS system_alerts (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
    message TEXT NOT NULL,
    type VARCHAR(50) DEFAULT 'warning',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_deployments_status ON deployments(status);
CREATE INDEX IF NOT EXISTS idx_traffic_data_region ON traffic_data(region);
CREATE INDEX IF NOT EXISTS idx_traffic_data_timestamp ON traffic_data(timestamp DESC);

-- Triggers for updated_at
CREATE TRIGGER update_deployments_updated_at BEFORE UPDATE ON deployments
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
