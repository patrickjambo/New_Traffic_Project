# TrafficGuard AI - Database Setup

## Prerequisites

- PostgreSQL 14 or higher
- PostGIS extension

## Installation

### 1. Install PostgreSQL and PostGIS

**Ubuntu/Debian:**
```bash
sudo apt update
sudo apt install postgresql postgresql-contrib postgis
```

**macOS:**
```bash
brew install postgresql postgis
```

### 2. Create Database

```bash
# Start PostgreSQL service
sudo service postgresql start

# Create database and user
sudo -u postgres psql

# In PostgreSQL prompt:
CREATE DATABASE trafficguard;
CREATE USER trafficguard_user WITH PASSWORD 'your_secure_password';
GRANT ALL PRIVILEGES ON DATABASE trafficguard TO trafficguard_user;
\q
```

### 3. Initialize Schema

```bash
# Run the schema file
psql -U trafficguard_user -d trafficguard -f schema.sql

# Or if you're using postgres user:
sudo -u postgres psql -d trafficguard -f schema.sql
```

## Database Connection

**Connection String Format:**
```
postgresql://trafficguard_user:your_secure_password@localhost:5432/trafficguard
```

## Default Users

The schema includes default test users:

| Email | Password | Role | Notes |
|-------|----------|------|-------|
| admin@trafficguard.ai | admin123 | admin | **CHANGE PASSWORD IN PRODUCTION** |
| officer@trafficguard.ai | police123 | police | **CHANGE PASSWORD IN PRODUCTION** |

## Geospatial Queries

The database uses PostGIS for efficient location-based queries.

### Example: Find Nearby Incidents

```sql
-- Find incidents within 5km of a location
SELECT 
    id, 
    type, 
    severity, 
    ST_AsText(location::geometry) as coordinates,
    ST_Distance(
        location,
        ST_SetSRID(ST_MakePoint(30.104, -1.939), 4326)::geography
    ) / 1000 as distance_km
FROM incidents
WHERE ST_DWithin(
    location,
    ST_SetSRID(ST_MakePoint(30.104, -1.939), 4326)::geography,
    5000  -- 5km in meters
)
ORDER BY distance_km;
```

## Maintenance

### Backup Database

```bash
pg_dump -U trafficguard_user trafficguard > backup_$(date +%Y%m%d).sql
```

### Restore Database

```bash
psql -U trafficguard_user trafficguard < backup_20231126.sql
```

### View Table Sizes

```sql
SELECT 
    schemaname,
    tablename,
    pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS size
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;
```
