const { Pool } = require('pg');
const pool = new Pool({
  host: 'localhost',
  port: 5432,
  database: 'trafficguard',
  user: 'trafficguard_user',
  password: 'trafficguard_pass_123'
});

async function check() {
  try {
    // Check incidents table
    const inc = await pool.query("SELECT column_name FROM information_schema.columns WHERE table_name='incidents' ORDER BY ordinal_position");
    console.log('=== INCIDENTS TABLE ===');
    inc.rows.forEach(r => console.log('  ' + r.column_name));

    // Check emergencies table
    const em = await pool.query("SELECT column_name FROM information_schema.columns WHERE table_name='emergencies' ORDER BY ordinal_position");
    console.log('\n=== EMERGENCIES TABLE ===');
    em.rows.forEach(r => console.log('  ' + r.column_name));

    // Check deployments table
    const dep = await pool.query("SELECT column_name FROM information_schema.columns WHERE table_name='deployments' ORDER BY ordinal_position");
    console.log('\n=== DEPLOYMENTS TABLE ===');
    dep.rows.forEach(r => console.log('  ' + r.column_name));

    // Check users table
    const u = await pool.query("SELECT column_name FROM information_schema.columns WHERE table_name='users' ORDER BY ordinal_position");
    console.log('\n=== USERS TABLE ===');
    u.rows.forEach(r => console.log('  ' + r.column_name));

    // Check all tables
    const tables = await pool.query("SELECT table_name FROM information_schema.tables WHERE table_schema='public' ORDER BY table_name");
    console.log('\n=== ALL TABLES ===');
    tables.rows.forEach(r => console.log('  ' + r.table_name));

    // Check if PostGIS is available
    try {
      await pool.query("SELECT PostGIS_Version()");
      console.log('\n=== PostGIS: INSTALLED ===');
    } catch(e) {
      console.log('\n=== PostGIS: NOT INSTALLED ===');
    }

  } catch(e) {
    console.error('Error:', e.message);
  } finally {
    await pool.end();
  }
}
check();
