-- Migration for auto-capture feature
-- Add columns to incidents table for auto-captured videos

ALTER TABLE incidents 
ADD COLUMN IF NOT EXISTS auto_captured BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS ai_confidence DECIMAL(3,2);

-- Create table for auto-capture statistics
CREATE TABLE IF NOT EXISTS auto_capture_stats (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) UNIQUE,
    videos_captured INTEGER DEFAULT 0,
    incidents_detected INTEGER DEFAULT 0,
    data_uploaded_mb DECIMAL(10,2) DEFAULT 0,
    last_capture_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Index for faster queries
CREATE INDEX IF NOT EXISTS idx_auto_capture_stats_user_id ON auto_capture_stats(user_id);
CREATE INDEX IF NOT EXISTS idx_incidents_auto_captured ON incidents(auto_captured);
