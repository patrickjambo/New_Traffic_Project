/**
 * Migration 011: Add hospital_admin to users role constraint
 */

const { pool } = require('../src/config/database');

async function up() {
    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        // Drop old constraint and recreate with hospital_admin included
        await client.query(`ALTER TABLE users DROP CONSTRAINT IF EXISTS users_role_check`);
        await client.query(`
            ALTER TABLE users ADD CONSTRAINT users_role_check
            CHECK (role IN ('public', 'police', 'admin', 'district_admin', 'co_admin', 'hospital_admin'))
        `);

        console.log('✓ Updated users_role_check to include hospital_admin');
        await client.query('COMMIT');
    } catch (err) {
        await client.query('ROLLBACK');
        throw err;
    } finally {
        client.release();
    }
}

up()
    .then(() => { console.log('Migration 011 complete'); process.exit(0); })
    .catch(err => { console.error('Migration 011 failed:', err.message); process.exit(1); });
