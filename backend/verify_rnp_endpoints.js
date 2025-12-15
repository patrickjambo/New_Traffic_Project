const axios = require('axios');

const BASE_URL = 'http://localhost:3000/api';
const LOGIN_URL = 'http://localhost:3000/api/auth/login';

const email = 'test_admin@trafficguard.ai';
const password = 'password123';

async function verify() {
    try {
        console.log('1. Logging in...');
        const loginRes = await axios.post(LOGIN_URL, { email, password });
        console.log('   Login successful. Response data:', JSON.stringify(loginRes.data, null, 2));
        const token = loginRes.data.data?.token || loginRes.data.token || loginRes.data.accessToken;
        if (!token) {
            console.error('   [ERROR] No token found in login response!');
            return;
        }
        console.log('   Token received:', token.substring(0, 20) + '...');

        const headers = { Authorization: `Bearer ${token}` };

        console.log('\n2. Verifying /api/dashboard/stats...');
        try {
            const statsRes = await axios.get(`${BASE_URL}/dashboard/stats`, { headers });
            console.log('   [SUCCESS] Stats:', JSON.stringify(statsRes.data, null, 2));
        } catch (e) {
            console.log('   [FAILED] Stats:', e.response ? e.response.data : e.message);
        }

        console.log('\n3. Verifying /api/dashboard/regions/overview...');
        try {
            const regionalRes = await axios.get(`${BASE_URL}/dashboard/regions/overview`, { headers });
            console.log('   [SUCCESS] Regional:', JSON.stringify(regionalRes.data, null, 2));
        } catch (e) {
            console.log('   [FAILED] Regional:', e.response ? e.response.data : e.message);
        }

        console.log('\n4. Verifying /api/deployments...');
        try {
            const deployRes = await axios.get(`${BASE_URL}/deployments`, { headers });
            console.log('   [SUCCESS] Deployments count:', deployRes.data.length);
            if (deployRes.data.length > 0) {
                console.log('   Sample Deployment:', JSON.stringify(deployRes.data[0], null, 2));
            }
        } catch (e) {
            console.log('   [FAILED] Deployments:', e.response ? e.response.data : e.message);
        }

        console.log('\n5. Verifying /api/traffic/heatmap...');
        try {
            const trafficRes = await axios.get(`${BASE_URL}/traffic/heatmap`, { headers });
            console.log('   [SUCCESS] Traffic Heatmap count:', trafficRes.data.length);
        } catch (e) {
            console.log('   [FAILED] Traffic Heatmap:', e.response ? e.response.data : e.message);
        }

        console.log('\n6. Verifying /api/notifications...');
        try {
            const notifRes = await axios.get(`${BASE_URL}/notifications`, { headers });
            console.log('   [SUCCESS] Notifications count:', notifRes.data.length);
        } catch (e) {
            console.log('   [FAILED] Notifications:', e.response ? e.response.data : e.message);
        }

    } catch (error) {
        console.error('Verification failed:', error.message);
        if (error.response) {
            console.error('Response data:', error.response.data);
        }
    }
}

verify();
