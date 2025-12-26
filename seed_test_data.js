const axios = require('axios');

const API_URL = 'http://localhost:3000/api';

const incidents = [
    {
        incident_detected: true,
        type: 'congestion',
        severity: 'high',
        confidence: 95,
        vehicle_count: 45,
        stationary_count: 12,
        avg_speed: 5,
        frames_analyzed: 100,
        location: {
            location_name: 'Kimironko Market',
            latitude: -1.9300,
            longitude: 30.1300
        }
    },
    {
        incident_detected: true,
        type: 'accident',
        severity: 'medium',
        confidence: 88,
        vehicle_count: 2,
        stationary_count: 2,
        avg_speed: 0,
        frames_analyzed: 100,
        location: {
            location_name: 'Nyabugogo Taxi Park',
            latitude: -1.9390,
            longitude: 30.0450
        }
    },
    {
        incident_detected: true,
        type: 'road_blockage',
        severity: 'medium',
        confidence: 90,
        vehicle_count: 0,
        stationary_count: 0,
        avg_speed: 0,
        frames_analyzed: 100,
        location: {
            location_name: 'Gishushu',
            latitude: -1.9500,
            longitude: 30.1000
        }
    }
];

async function seedIncidents() {
    console.log('🌱 Seeding test incidents...');

    for (const incident of incidents) {
        try {
            const response = await axios.post(`${API_URL}/incidents/test-detection`, incident);
            console.log(`✅ Created incident at ${incident.location.location_name}`);
        } catch (error) {
            console.error(`❌ Failed to create incident at ${incident.location.location_name}:`, error.response?.data || error.message);
        }
    }
    console.log('✨ Seeding complete!');
}

seedIncidents();
