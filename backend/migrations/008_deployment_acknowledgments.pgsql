-- Migration: Add deployment acknowledgment columns
-- Description: Add columns for officer acknowledgment tracking in deployment system

-- First, ensure deployment_officers table exists with new columns
-- Drop and recreate if needed for composite primary key tables
DO $$ 
BEGIN
    -- Check if acknowledged column exists, if not add all new columns
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'deployment_officers' AND column_name = 'acknowledged'
    ) THEN
        -- Add new columns to deployment_officers table
        ALTER TABLE deployment_officers 
            ADD COLUMN IF NOT EXISTS acknowledged BOOLEAN DEFAULT FALSE,
            ADD COLUMN IF NOT EXISTS acknowledged_at TIMESTAMP,
            ADD COLUMN IF NOT EXISTS status VARCHAR(50) DEFAULT 'assigned',
            ADD COLUMN IF NOT EXISTS notes TEXT,
            ADD COLUMN IF NOT EXISTS estimated_arrival TIMESTAMP,
            ADD COLUMN IF NOT EXISTS last_location_lat DECIMAL(10, 8),
            ADD COLUMN IF NOT EXISTS last_location_lng DECIMAL(11, 8),
            ADD COLUMN IF NOT EXISTS assigned_at TIMESTAMP DEFAULT NOW(),
            ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT NOW();
    END IF;
END $$;

-- Add new columns to deployments table
ALTER TABLE deployments 
ADD COLUMN IF NOT EXISTS priority VARCHAR(20) DEFAULT 'normal',
ADD COLUMN IF NOT EXISTS instructions TEXT,
ADD COLUMN IF NOT EXISTS scheduled_time TIMESTAMP,
ADD COLUMN IF NOT EXISTS estimated_duration INTEGER,
ADD COLUMN IF NOT EXISTS created_by INTEGER REFERENCES users(id);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_deployment_officers_acknowledged 
ON deployment_officers(acknowledged);

CREATE INDEX IF NOT EXISTS idx_deployment_officers_status 
ON deployment_officers(status);

CREATE INDEX IF NOT EXISTS idx_deployments_status 
ON deployments(status);

CREATE INDEX IF NOT EXISTS idx_deployments_priority 
ON deployments(priority);

-- Add constraint for status values
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'deployment_officers_status_check'
    ) THEN
        ALTER TABLE deployment_officers 
        ADD CONSTRAINT deployment_officers_status_check 
        CHECK (status IN ('assigned', 'en_route', 'on_scene', 'completed', 'unable'));
    END IF;
END $$;

-- Add constraint for priority values
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'deployments_priority_check'
    ) THEN
        ALTER TABLE deployments 
        ADD CONSTRAINT deployments_priority_check 
        CHECK (priority IN ('low', 'normal', 'high', 'critical'));
    END IF;
END $$;

-- Update any existing records to have default values
UPDATE deployment_officers 
SET acknowledged = FALSE, status = 'assigned', assigned_at = NOW()
WHERE acknowledged IS NULL;

UPDATE deployments 
SET priority = 'normal'
WHERE priority IS NULL;

-- Comment on columns for documentation
COMMENT ON COLUMN deployment_officers.acknowledged IS 'Whether the officer has acknowledged the deployment assignment';
COMMENT ON COLUMN deployment_officers.acknowledged_at IS 'Timestamp when officer acknowledged the deployment';
COMMENT ON COLUMN deployment_officers.status IS 'Current status of officer for this deployment: assigned, en_route, on_scene, completed, unable';
COMMENT ON COLUMN deployment_officers.notes IS 'Notes from the officer about the deployment';
COMMENT ON COLUMN deployment_officers.estimated_arrival IS 'Officer estimated time of arrival';
COMMENT ON COLUMN deployment_officers.last_location_lat IS 'Last known latitude of officer';
COMMENT ON COLUMN deployment_officers.last_location_lng IS 'Last known longitude of officer';
COMMENT ON COLUMN deployments.priority IS 'Deployment priority: low, normal, high, critical';
COMMENT ON COLUMN deployments.instructions IS 'Special instructions for the deployment';
COMMENT ON COLUMN deployments.scheduled_time IS 'Scheduled time for the deployment';
COMMENT ON COLUMN deployments.estimated_duration IS 'Estimated duration in minutes';
COMMENT ON COLUMN deployments.created_by IS 'Admin user who created the deployment';
