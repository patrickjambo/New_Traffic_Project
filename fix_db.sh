#!/bin/bash
# Fix missing columns in the database

sudo -u postgres psql -d trafficguard -c "ALTER TABLE users ADD COLUMN IF NOT EXISTS badge_number VARCHAR(50);"
sudo -u postgres psql -d trafficguard -c "ALTER TABLE users ADD COLUMN IF NOT EXISTS unit VARCHAR(100);"
sudo -u postgres psql -d trafficguard -c "CREATE INDEX IF NOT EXISTS idx_users_badge_number ON users(badge_number);"

echo "Done! Columns added."
