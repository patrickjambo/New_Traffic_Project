const axios = require('axios');

const API_URL = 'http://localhost:3000/api';

async function checkApis() {
    try {
        // 1. Login
        const loginRes = await axios.post(`${API_URL}/auth/login`, {
            email: 'admin@trafficguard.ai',
            password: 'admin'
        });
        const token = loginRes.data.data.token;
        const config = { headers: { Authorization: `Bearer ${token}` } };

        // 2. Check Incidents
        const incidentsRes = await axios.get(`${API_URL}/incidents?status=reported`, config);
        console.log('Incidents Response Structure:', Object.keys(incidentsRes.data));
        console.log('Incidents Data Length:', incidentsRes.data.data?.length);

        // 3. Check Emergencies
        const emergenciesRes = await axios.get(`${API_URL}/emergency`, config);
        console.log('Emergencies Response Structure:', Object.keys(emergenciesRes.data));
        console.log('Emergencies Data Length:', emergenciesRes.data.data?.length);

        // 4. Check Available Officers
        const officersRes = await axios.get(`${API_URL}/deployments/officers/available`, config);
        console.log('Officers Response Structure:', Object.keys(officersRes.data));
        console.log('Officers Data Length:', officersRes.data.data?.length);

    } catch (error) {
        console.error('API Check Error:', error.response?.data || error.message);
    } finally {
        process.exit();
    }
}

checkApis();
