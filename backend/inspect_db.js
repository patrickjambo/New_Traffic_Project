const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 5432,
    database: process.env.DB_NAME || 'rnp_traffic',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD,
});

async function inspect() {
    try {
        const res = await pool.query(`
            SELECT column_name, data_type 
            FROM information_schema.columns 
            WHERE table_name = 'users';
        `);
        console.log('Users table columns:', res.rows);
    } catch (err) {
        console.error(err);
    } finally {
        pool.end();
    }
}

inspect();
