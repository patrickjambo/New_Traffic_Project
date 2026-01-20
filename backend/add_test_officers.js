const { query } = require('./src/config/database');
const bcrypt = require('bcryptjs');

async function addOfficers() {
    try {
        const hash = await bcrypt.hash('password', 10);
        const officers = [
            ['officer_a@trafficguard.ai', 'Officer Alpha', hash, 'police', 'P-1001'],
            ['officer_b@trafficguard.ai', 'Officer Bravo', hash, 'police', 'P-1002'],
            ['officer_c@trafficguard.ai', 'Officer Charlie', hash, 'police', 'P-1003'],
            ['officer_d@trafficguard.ai', 'Officer Delta', hash, 'police', 'P-1004'],
            ['officer_e@trafficguard.ai', 'Officer Echo', hash, 'police', 'P-1005'],
        ];

        for (const officer of officers) {
            await query(
                'INSERT INTO users (email, full_name, password_hash, role, badge_number) VALUES ($1, $2, $3, $4, $5) ON CONFLICT (email) DO NOTHING',
                officer
            );
        }
        console.log('Successfully added test officers');
    } catch (error) {
        console.error('Error adding officers:', error);
    } finally {
        process.exit();
    }
}

addOfficers();
