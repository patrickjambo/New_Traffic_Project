-- Add badge_number and unit to users table
ALTER TABLE users ADD COLUMN IF NOT EXISTS badge_number VARCHAR(50);
ALTER TABLE users ADD COLUMN IF NOT EXISTS unit VARCHAR(100);

-- Index for badge_number
CREATE INDEX IF NOT EXISTS idx_users_badge_number ON users(badge_number);
