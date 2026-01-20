const { query } = require('./src/config/database');

async function checkActiveEvents() {
    try {
        const incidents = await query('SELECT id, type, status, address FROM incidents LIMIT 10');
        const emergencies = await query('SELECT id, emergency_type, status, location_name FROM emergencies LIMIT 10');

        console.log('Incidents:', JSON.stringify(incidents.rows, null, 2));
        console.log('Emergencies:', JSON.stringify(emergencies.rows, null, 2));
    } catch (error) {
        console.error('Error checking active events:', error);
    } finally {
        process.exit();
    }
}

checkActiveEvents();
