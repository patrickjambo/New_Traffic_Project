-- Add source column to emergencies table
ALTER TABLE emergencies ADD COLUMN IF NOT EXISTS source VARCHAR(20) DEFAULT 'manual' CHECK (source IN ('manual', 'ai'));

-- Update existing records: if contact_name is 'TrafficGuard AI System', it's likely AI
UPDATE emergencies SET source = 'ai' WHERE contact_name = 'TrafficGuard AI System';
UPDATE emergencies SET source = 'manual' WHERE source IS NULL;
