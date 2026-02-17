-- ============================================
-- TrafficGuard Database Fix Script
-- Fixes all missing columns and extensions
-- ============================================

-- 1. Enable PostGIS extension
CREATE EXTENSION IF NOT EXISTS postgis;

-- 2. Add missing columns to users table
ALTER TABLE users ADD COLUMN IF NOT EXISTS badge_number VARCHAR(50);
ALTER TABLE users ADD COLUMN IF NOT EXISTS unit VARCHAR(100);
ALTER TABLE users ADD COLUMN IF NOT EXISTS phone VARCHAR(20);
ALTER TABLE users ADD COLUMN IF NOT EXISTS station VARCHAR(100);
ALTER TABLE users ADD COLUMN IF NOT EXISTS latitude DECIMAL(10, 8);
ALTER TABLE users ADD COLUMN IF NOT EXISTS longitude DECIMAL(11, 8);
ALTER TABLE users ADD COLUMN IF NOT EXISTS last_location_update TIMESTAMP;
ALTER TABLE users ADD COLUMN IF NOT EXISTS is_available BOOLEAN DEFAULT true;

-- 3. Add missing columns to emergencies table
ALTER TABLE emergencies ADD COLUMN IF NOT EXISTS user_id INTEGER REFERENCES users(id);

-- 4. Add missing columns to officer_profiles if it exists
DO $$
BEGIN
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'officer_profiles') THEN
        ALTER TABLE officer_profiles ADD COLUMN IF NOT EXISTS unit VARCHAR(100);
    END IF;
END $$;

-- 5. Create indexes
CREATE INDEX IF NOT EXISTS idx_users_badge_number ON users(badge_number);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);

-- 6. Verify
SELECT 'PostGIS version: ' || PostGIS_Version() AS info;
SELECT 'Users columns: ' || string_agg(column_name, ', ') AS info FROM information_schema.columns WHERE table_name = 'users';
