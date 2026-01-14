const db = require('./src/config/database');
const fs = require('fs');
const path = require('path');

async function runMigration() {
    try {
        const migrationPath = path.join(__dirname, 'migrations', '005_add_source_to_emergencies.sql');
        const sql = fs.readFileSync(migrationPath, 'utf8');

        console.log('🚀 Running migration: 005_add_source_to_emergencies.sql');
        await db.query(sql);
        console.log('✅ Migration completed successfully');
        process.exit(0);
    } catch (error) {
        console.error('❌ Migration failed:', error);
        process.exit(1);
    }
}

runMigration();
