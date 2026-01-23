/**
 * Create test users for deployment flow testing
 */
const { Pool } = require('pg');
const bcrypt = require('bcryptjs');

require('dotenv').config({ path: './backend/.env' });

const pool = new Pool({
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT) || 5432,
    database: process.env.DB_NAME || 'trafficguard',
    user: process.env.DB_USER || 'trafficguard_user',
    password: String(process.env.DB_PASSWORD || '')
});

async function createTestUsers() {
    try {
        console.log('Creating test users for deployment flow...\n');
        
        const password = 'test123';
        const hashedPassword = await bcrypt.hash(password, 10);
        
        // Create admin user
        const adminEmail = 'deployment_admin@test.com';
        const adminResult = await pool.query(`
            INSERT INTO users (email, password_hash, full_name, role, phone)
            VALUES ($1, $2, 'Deployment Test Admin', 'admin', '0788111222')
            ON CONFLICT (email) DO UPDATE SET password_hash = $2
            RETURNING id, email, role
        `, [adminEmail, hashedPassword]);
        
        console.log('✅ Admin user created/updated:', adminResult.rows[0]);
        
        // Create police officer user
        const policeEmail = 'deployment_police@test.com';
        const policeResult = await pool.query(`
            INSERT INTO users (email, password_hash, full_name, role, phone)
            VALUES ($1, $2, 'Test Police Officer', 'police', '0788333444')
            ON CONFLICT (email) DO UPDATE SET password_hash = $2
            RETURNING id, email, role
        `, [policeEmail, hashedPassword]);
        
        console.log('✅ Police user created/updated:', policeResult.rows[0]);
        
        console.log('\n🔐 Test Credentials:');
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.log('Admin:');
        console.log(`  Email: ${adminEmail}`);
        console.log(`  Password: ${password}`);
        console.log('');
        console.log('Police Officer:');
        console.log(`  Email: ${policeEmail}`);
        console.log(`  Password: ${password}`);
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        
        // Test login
        console.log('\n🧪 Testing login...');
        const axios = require('axios');
        const BASE_URL = 'http://localhost:3000/api';
        
        try {
            const adminLogin = await axios.post(`${BASE_URL}/auth/login`, {
                email: adminEmail,
                password: password
            });
            console.log('✅ Admin login successful:', adminLogin.data.success);
            
            const policeLogin = await axios.post(`${BASE_URL}/auth/login`, {
                email: policeEmail,
                password: password
            });
            console.log('✅ Police login successful:', policeLogin.data.success);
            console.log('   Police User ID:', policeLogin.data.user?.id);
            
        } catch (loginErr) {
            console.error('❌ Login test failed:', loginErr.response?.data || loginErr.message);
        }
        
    } catch (error) {
        console.error('Error:', error.message);
    } finally {
        await pool.end();
    }
}

createTestUsers();
