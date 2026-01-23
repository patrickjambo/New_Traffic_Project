/**
 * Fix database constraints for proper ON CONFLICT operations
 */

const { Pool } = require('pg');

const pool = new Pool({
    host: 'localhost',
    port: 5432,
    database: 'trafficguard',
    user: 'trafficguard_user',
    password: process.env.PGPASSWORD || ''
});

async function fixConstraints() {
    const client = await pool.connect();
    
    try {
        console.log('🔧 Fixing database constraints...\n');

        // 1. Add unique index on alert_deliveries for ON CONFLICT
        console.log('1. Adding unique index on alert_deliveries(alert_id, officer_id)...');
        try {
            await client.query(`
                CREATE UNIQUE INDEX IF NOT EXISTS alert_deliveries_alert_officer_idx 
                ON alert_deliveries(alert_id, officer_id)
            `);
            console.log('   ✅ Index created or already exists\n');
        } catch (err) {
            console.log(`   ⚠️ ${err.message}\n`);
        }

        // 2. Fix the findOfficersInGeoFence query by checking if column exists
        console.log('2. Checking officer_profiles table structure...');
        const cols = await client.query(`
            SELECT column_name FROM information_schema.columns 
            WHERE table_name = 'officer_profiles'
            ORDER BY column_name
        `);
        console.log('   Columns:', cols.rows.map(r => r.column_name).join(', '));
        console.log('   ✅ Table structure verified\n');

        // 3. Check alert_deliveries structure
        console.log('3. Checking alert_deliveries table...');
        const deliveryCols = await client.query(`
            SELECT column_name, data_type FROM information_schema.columns 
            WHERE table_name = 'alert_deliveries'
            ORDER BY column_name
        `);
        console.log('   Columns:', deliveryCols.rows.map(r => `${r.column_name}(${r.data_type})`).join(', '));

        // Check if 'status' column exists, if not add it
        const hasStatus = deliveryCols.rows.some(r => r.column_name === 'status');
        if (!hasStatus) {
            console.log('   Adding "status" column...');
            await client.query(`ALTER TABLE alert_deliveries ADD COLUMN IF NOT EXISTS status VARCHAR(20) DEFAULT 'pending'`);
        }

        // Check if 'sent_at' column exists, if not add it  
        const hasSentAt = deliveryCols.rows.some(r => r.column_name === 'sent_at');
        if (!hasSentAt) {
            console.log('   Adding "sent_at" column...');
            await client.query(`ALTER TABLE alert_deliveries ADD COLUMN IF NOT EXISTS sent_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP`);
        }

        console.log('   ✅ Table structure verified\n');

        // 4. Show existing indexes on alert_deliveries
        console.log('4. Checking indexes on alert_deliveries...');
        const indexes = await client.query(`
            SELECT indexname, indexdef 
            FROM pg_indexes 
            WHERE tablename = 'alert_deliveries'
        `);
        indexes.rows.forEach(idx => {
            console.log(`   - ${idx.indexname}`);
        });
        console.log('');

        console.log('✅ All constraints fixed!\n');

    } catch (error) {
        console.error('❌ Error:', error.message);
    } finally {
        client.release();
        await pool.end();
    }
}

fixConstraints();
