/**
 * Migration: Add deployment acknowledgment columns
 * Description: Add columns for officer acknowledgment tracking in deployment system
 */

const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 5432,
    database: process.env.DB_NAME || 'trafficguard',
    user: process.env.DB_USER || 'trafficguard_user',
    password: process.env.DB_PASSWORD,
});

async function runMigration() {
    const client = await pool.connect();
    
    try {
        console.log('🔄 Starting deployment acknowledgment migration...');
        
        await client.query('BEGIN');

        // Check if deployment_officers table exists
        const tableCheck = await client.query(`
            SELECT EXISTS (
                SELECT FROM information_schema.tables 
                WHERE table_schema = 'public' AND table_name = 'deployment_officers'
            )
        `);

        if (!tableCheck.rows[0].exists) {
            console.log('📋 deployment_officers table does not exist, creating...');
            await client.query(`
                CREATE TABLE deployment_officers (
                    deployment_id INTEGER REFERENCES deployments(id) ON DELETE CASCADE,
                    officer_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
                    acknowledged BOOLEAN DEFAULT FALSE,
                    acknowledged_at TIMESTAMP,
                    status VARCHAR(50) DEFAULT 'assigned',
                    notes TEXT,
                    estimated_arrival TIMESTAMP,
                    last_location_lat DECIMAL(10, 8),
                    last_location_lng DECIMAL(11, 8),
                    assigned_at TIMESTAMP DEFAULT NOW(),
                    updated_at TIMESTAMP DEFAULT NOW(),
                    PRIMARY KEY (deployment_id, officer_id)
                )
            `);
        } else {
            // Add columns if they don't exist
            console.log('📋 Adding new columns to deployment_officers...');
            
            const columns = [
                { name: 'acknowledged', type: 'BOOLEAN DEFAULT FALSE' },
                { name: 'acknowledged_at', type: 'TIMESTAMP' },
                { name: 'status', type: "VARCHAR(50) DEFAULT 'assigned'" },
                { name: 'notes', type: 'TEXT' },
                { name: 'estimated_arrival', type: 'TIMESTAMP' },
                { name: 'last_location_lat', type: 'DECIMAL(10, 8)' },
                { name: 'last_location_lng', type: 'DECIMAL(11, 8)' },
                { name: 'assigned_at', type: 'TIMESTAMP DEFAULT NOW()' },
                { name: 'updated_at', type: 'TIMESTAMP DEFAULT NOW()' },
            ];

            for (const col of columns) {
                const colCheck = await client.query(`
                    SELECT EXISTS (
                        SELECT FROM information_schema.columns 
                        WHERE table_name = 'deployment_officers' AND column_name = $1
                    )
                `, [col.name]);

                if (!colCheck.rows[0].exists) {
                    console.log(`  Adding column: ${col.name}`);
                    await client.query(`ALTER TABLE deployment_officers ADD COLUMN ${col.name} ${col.type}`);
                }
            }
        }

        // Add columns to deployments table
        console.log('📋 Adding new columns to deployments...');
        
        const deploymentColumns = [
            { name: 'priority', type: "VARCHAR(20) DEFAULT 'normal'" },
            { name: 'instructions', type: 'TEXT' },
            { name: 'scheduled_time', type: 'TIMESTAMP' },
            { name: 'estimated_duration', type: 'INTEGER' },
            { name: 'created_by', type: 'INTEGER REFERENCES users(id)' },
            { name: 'emergency_id', type: 'INTEGER REFERENCES emergencies(id) ON DELETE SET NULL' },
        ];

        for (const col of deploymentColumns) {
            const colCheck = await client.query(`
                SELECT EXISTS (
                    SELECT FROM information_schema.columns 
                    WHERE table_name = 'deployments' AND column_name = $1
                )
            `, [col.name]);

            if (!colCheck.rows[0].exists) {
                console.log(`  Adding column: ${col.name}`);
                try {
                    await client.query(`ALTER TABLE deployments ADD COLUMN ${col.name} ${col.type}`);
                } catch (e) {
                    console.log(`  Column ${col.name} skipped: ${e.message}`);
                }
            }
        }

        // Create indexes
        console.log('📋 Creating indexes...');
        
        const indexes = [
            { name: 'idx_deployment_officers_acknowledged', table: 'deployment_officers', column: 'acknowledged' },
            { name: 'idx_deployment_officers_status', table: 'deployment_officers', column: 'status' },
            { name: 'idx_deployments_priority', table: 'deployments', column: 'priority' },
        ];

        for (const idx of indexes) {
            try {
                await client.query(`CREATE INDEX IF NOT EXISTS ${idx.name} ON ${idx.table}(${idx.column})`);
                console.log(`  Created index: ${idx.name}`);
            } catch (e) {
                console.log(`  Index ${idx.name} skipped: ${e.message}`);
            }
        }

        // Update existing records with defaults
        console.log('📋 Updating existing records with defaults...');
        await client.query(`
            UPDATE deployment_officers 
            SET acknowledged = FALSE, status = 'assigned', assigned_at = NOW()
            WHERE acknowledged IS NULL
        `);

        await client.query('COMMIT');
        console.log('✅ Migration completed successfully!');
        
    } catch (error) {
        await client.query('ROLLBACK');
        console.error('❌ Migration failed:', error.message);
        throw error;
    } finally {
        client.release();
        await pool.end();
    }
}

// Run migration
runMigration().catch(console.error);
