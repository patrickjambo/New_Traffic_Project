const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
    host: 'localhost',
    database: 'trafficguard',
    user: 'trafficguard_user',
    password: 'trafficguard_pass_123'
});

async function checkAndFix() {
    try {
        // Check users table structure
        const cols = await pool.query("SELECT column_name FROM information_schema.columns WHERE table_name='users'");
        console.log('Users columns:', cols.rows.map(x => x.column_name).join(', '));
        
        // Check if password_hash column exists
        const hasPasswordHash = cols.rows.some(r => r.column_name === 'password_hash');
        const hasPassword = cols.rows.some(r => r.column_name === 'password');
        
        console.log('Has password_hash:', hasPasswordHash);
        console.log('Has password:', hasPassword);
        
        // Insert officers with correct column name
        const bcrypt = require('bcryptjs');
        const hashedPassword = await bcrypt.hash('test123', 10);
        
        const passwordCol = hasPasswordHash ? 'password_hash' : 'password';
        
        const officers = [
            { email: 'officer1@test.com', name: 'Officer James Mugabo', badge: 'RNP001', phone: '+250788000001' },
            { email: 'officer2@test.com', name: 'Officer Alice Uwimana', badge: 'RNP002', phone: '+250788000002' },
            { email: 'officer3@test.com', name: 'Officer Patrick Habimana', badge: 'RNP003', phone: '+250788000003' }
        ];
        
        for (const officer of officers) {
            try {
                await pool.query(`
                    INSERT INTO users (email, ${passwordCol}, full_name, role, badge_number, phone, status)
                    VALUES ($1, $2, $3, 'officer', $4, $5, 'active')
                    ON CONFLICT (email) DO UPDATE SET status = 'active', role = 'officer'
                `, [officer.email, hashedPassword, officer.name, officer.badge, officer.phone]);
                console.log('Created/updated officer:', officer.email);
            } catch (e) {
                console.log('Officer insert error:', e.message);
            }
        }
        
        // Insert sample traffic data
        await pool.query(`
            INSERT INTO traffic_data (location, latitude, longitude, vehicle_count, congestion_level, average_speed)
            VALUES 
                ('Kigali City Center', -1.9403, 29.8739, 45, 'moderate', 35.5),
                ('Kimironko Market', -1.9294, 30.1127, 78, 'high', 15.2),
                ('Nyabugogo Bus Station', -1.9389, 30.0453, 120, 'high', 8.5),
                ('KG 7 Avenue', -1.9536, 30.0615, 25, 'low', 55.0)
            ON CONFLICT DO NOTHING
        `);
        console.log('Added sample traffic data');
        
        // Clean orphaned alert records
        const cleaned = await pool.query(`
            DELETE FROM incident_alerts 
            WHERE incident_id NOT IN (SELECT id FROM incidents)
        `);
        console.log('Cleaned orphaned alerts:', cleaned.rowCount);
        
        // Verify officers
        const officerCount = await pool.query("SELECT COUNT(*) FROM users WHERE role = 'officer'");
        console.log('Total officers:', officerCount.rows[0].count);
        
    } catch (error) {
        console.error('Error:', error.message);
    } finally {
        await pool.end();
    }
}

checkAndFix();
