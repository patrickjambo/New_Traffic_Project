-- Create admin_locations table for tracking admin positions
CREATE TABLE IF NOT EXISTS admin_locations (
    id SERIAL PRIMARY KEY,
    admin_id INTEGER NOT NULL UNIQUE,
    latitude DECIMAL(10, 8) NOT NULL,
    longitude DECIMAL(11, 8) NOT NULL,
    address VARCHAR(255),
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (admin_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_admin_locations_admin_id ON admin_locations(admin_id);
CREATE INDEX IF NOT EXISTS idx_admin_locations_updated_at ON admin_locations(updated_at);

-- Add comment
COMMENT ON TABLE admin_locations IS 'Stores real-time location data for admin users for efficient officer tracking and distance calculations';
