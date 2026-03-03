-- Migration: Add district_id to users table
-- This allows officers and admins to be assigned to specific districts

-- Add district_id column to users table
ALTER TABLE users ADD COLUMN IF NOT EXISTS district_id INTEGER REFERENCES districts(id) ON DELETE SET NULL;

-- Create index for district_id
CREATE INDEX IF NOT EXISTS idx_users_district_id ON users(district_id);

-- Comment explaining the column
COMMENT ON COLUMN users.district_id IS 'The district this user is assigned to. District admins see only officers in their district.';
