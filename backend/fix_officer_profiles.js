// Fix officer_profiles table constraint
const { Pool } = require('pg');

const pool = new Pool({
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 5432,
    database: process.env.DB_NAME || 'trafficguard',
    user: process.env.DB_USER || 'trafficguard_user',
    password: process.env.DB_PASSWORD || 'trafficguard_pass_123'
});

async function fixOfficerProfiles() {
    const client = await pool.connect();
    
    try {
        console.log('🔍 Checking officer_profiles table structure...\n');
        
        // Check if table exists
        const tableCheck = await client.query(`
            SELECT EXISTS (
                SELECT FROM information_schema.tables 
                WHERE table_name = 'officer_profiles'
            );
        `);
        
        if (!tableCheck.rows[0].exists) {
            console.log('❌ officer_profiles table does not exist. Creating it...\n');
            
            await client.query(`
                CREATE TABLE officer_profiles (
                    id SERIAL PRIMARY KEY,
                    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE UNIQUE,
                    badge_number VARCHAR(50),
                    unit VARCHAR(100) DEFAULT 'Traffic Unit',
                    rank VARCHAR(50),
                    
                    -- Location tracking
                    current_latitude DECIMAL(10, 8),
                    current_longitude DECIMAL(11, 8),
                    location_updated_at TIMESTAMP,
                    
                    -- Status
                    is_on_duty BOOLEAN DEFAULT FALSE,
                    is_available BOOLEAN DEFAULT TRUE,
                    
                    -- FCM for mobile push notifications
                    fcm_token TEXT,
                    device_id VARCHAR(255),
                    
                    -- Notification preferences
                    notification_enabled BOOLEAN DEFAULT TRUE,
                    emergency_alert_enabled BOOLEAN DEFAULT TRUE,
                    
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                );
                
                CREATE INDEX idx_officer_profiles_user_id ON officer_profiles(user_id);
                CREATE INDEX idx_officer_profiles_badge ON officer_profiles(badge_number);
            `);
            
            console.log('✅ officer_profiles table created successfully!\n');
        } else {
            console.log('✅ officer_profiles table exists\n');
            
            // Check columns
            const columns = await client.query(`
                SELECT column_name, data_type, is_nullable
                FROM information_schema.columns 
                WHERE table_name = 'officer_profiles'
                ORDER BY ordinal_position;
            `);
            
            console.log('Current columns:');
            columns.rows.forEach(col => {
                console.log(`  - ${col.column_name}: ${col.data_type} (nullable: ${col.is_nullable})`);
            });
            
            // Check for unique constraint on user_id
            const constraints = await client.query(`
                SELECT conname, contype
                FROM pg_constraint
                WHERE conrelid = 'officer_profiles'::regclass;
            `);
            
            console.log('\nCurrent constraints:');
            constraints.rows.forEach(con => {
                const type = con.contype === 'u' ? 'UNIQUE' : con.contype === 'p' ? 'PRIMARY KEY' : con.contype === 'f' ? 'FOREIGN KEY' : con.contype;
                console.log(`  - ${con.conname}: ${type}`);
            });
            
            // Check if user_id has a unique constraint
            const hasUserIdUnique = constraints.rows.some(c => 
                c.conname.includes('user_id') && c.contype === 'u'
            );
            
            if (!hasUserIdUnique) {
                console.log('\n⚠️ No UNIQUE constraint on user_id found. Adding it...\n');
                
                try {
                    await client.query(`
                        ALTER TABLE officer_profiles 
                        ADD CONSTRAINT officer_profiles_user_id_key UNIQUE (user_id);
                    `);
                    console.log('✅ Added UNIQUE constraint on user_id\n');
                } catch (err) {
                    if (err.code === '23505') {
                        console.log('⚠️ Duplicate user_ids exist. Cleaning up...');
                        // Remove duplicates keeping the latest
                        await client.query(`
                            DELETE FROM officer_profiles a
                            USING officer_profiles b
                            WHERE a.id < b.id 
                            AND a.user_id = b.user_id;
                        `);
                        // Try again
                        await client.query(`
                            ALTER TABLE officer_profiles 
                            ADD CONSTRAINT officer_profiles_user_id_key UNIQUE (user_id);
                        `);
                        console.log('✅ Cleaned duplicates and added UNIQUE constraint\n');
                    } else if (err.code === '42710') {
                        console.log('✅ UNIQUE constraint already exists (different name)\n');
                    } else {
                        throw err;
                    }
                }
            } else {
                console.log('\n✅ UNIQUE constraint on user_id already exists\n');
            }
            
            // Check and add missing columns
            const columnNames = columns.rows.map(c => c.column_name);
            
            const requiredColumns = [
                { name: 'current_latitude', type: 'DECIMAL(10, 8)' },
                { name: 'current_longitude', type: 'DECIMAL(11, 8)' },
                { name: 'location_updated_at', type: 'TIMESTAMP' },
                { name: 'is_on_duty', type: 'BOOLEAN DEFAULT FALSE' },
                { name: 'is_available', type: 'BOOLEAN DEFAULT TRUE' },
                { name: 'fcm_token', type: 'TEXT' },
                { name: 'device_id', type: 'VARCHAR(255)' },
                { name: 'notification_enabled', type: 'BOOLEAN DEFAULT TRUE' },
                { name: 'emergency_alert_enabled', type: 'BOOLEAN DEFAULT TRUE' },
                { name: 'unit', type: 'VARCHAR(100) DEFAULT \'Traffic Unit\'' }
            ];
            
            for (const col of requiredColumns) {
                if (!columnNames.includes(col.name)) {
                    console.log(`Adding missing column: ${col.name}`);
                    await client.query(`ALTER TABLE officer_profiles ADD COLUMN IF NOT EXISTS ${col.name} ${col.type};`);
                }
            }
        }
        
        // Verify the fix
        console.log('\n🔍 Verifying constraints after fix...\n');
        const finalConstraints = await client.query(`
            SELECT conname, contype, 
                   pg_get_constraintdef(oid) as definition
            FROM pg_constraint
            WHERE conrelid = 'officer_profiles'::regclass;
        `);
        
        console.log('Final constraints:');
        finalConstraints.rows.forEach(con => {
            console.log(`  - ${con.conname}: ${con.definition}`);
        });
        
        console.log('\n✅ Fix complete! You can now create officers.\n');
        
    } catch (error) {
        console.error('❌ Error:', error.message);
    } finally {
        client.release();
        await pool.end();
    }
}

fixOfficerProfiles();
