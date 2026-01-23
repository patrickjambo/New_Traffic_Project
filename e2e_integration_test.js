/**
 * End-to-End Integration Test
 * Tests: Backend → AI Service → Geo-fencing → WebSocket → Database
 */

const http = require('http');
const { io } = require('socket.io-client');

const BACKEND_URL = 'http://localhost:3000';
const AI_SERVICE_URL = 'http://localhost:8000';

// Test results
const results = {
    passed: 0,
    failed: 0,
    tests: []
};

function log(msg) {
    console.log(`[${new Date().toISOString().substr(11, 8)}] ${msg}`);
}

function addResult(name, passed, details = '') {
    results.tests.push({ name, passed, details });
    if (passed) results.passed++;
    else results.failed++;
    console.log(`${passed ? '✅' : '❌'} ${name}${details ? ': ' + details : ''}`);
}

// HTTP request helper
function httpRequest(url, method = 'GET', data = null, headers = {}) {
    return new Promise((resolve, reject) => {
        const urlObj = new URL(url);
        const options = {
            hostname: urlObj.hostname,
            port: urlObj.port,
            path: urlObj.pathname + urlObj.search,
            method,
            headers: {
                'Content-Type': 'application/json',
                ...headers
            }
        };
        
        const req = http.request(options, (res) => {
            let body = '';
            res.on('data', chunk => body += chunk);
            res.on('end', () => {
                try {
                    resolve({ status: res.statusCode, data: JSON.parse(body) });
                } catch {
                    resolve({ status: res.statusCode, data: body });
                }
            });
        });
        
        req.on('error', reject);
        req.setTimeout(10000, () => {
            req.destroy();
            reject(new Error('Request timeout'));
        });
        if (data) req.write(JSON.stringify(data));
        req.end();
    });
}

async function runTests() {
    console.log('\n' + '═'.repeat(60));
    console.log('   TRAFFICGUARD END-TO-END INTEGRATION TEST');
    console.log('═'.repeat(60) + '\n');

    let token = null;
    let socket = null;
    const receivedEvents = [];

    try {
        // ========== TEST 1: Backend Health ==========
        log('Testing Backend Health...');
        try {
            const res = await httpRequest(`${BACKEND_URL}/health`);
            addResult('Backend Health', res.status === 200, `Status: ${res.status}`);
        } catch (e) {
            addResult('Backend Health', false, e.message);
        }

        // ========== TEST 2: AI Service Health ==========
        log('Testing AI Service Health...');
        try {
            const res = await httpRequest(`${AI_SERVICE_URL}/health`);
            addResult('AI Service Health', res.data.status === 'healthy', `Model loaded: ${res.data.model_loaded}`);
        } catch (e) {
            addResult('AI Service Health', false, e.message);
        }

        // ========== TEST 3: User Registration ==========
        log('Testing User Registration...');
        const testEmail = `e2e_test_${Date.now()}@test.com`;
        try {
            const res = await httpRequest(`${BACKEND_URL}/api/auth/register`, 'POST', {
                email: testEmail,
                password: 'Test123!',
                full_name: 'E2E Test User',
                phone: '+250788000000',
                role: 'police'
            });
            addResult('User Registration', res.data.success === true);
            if (res.data.data?.token) token = res.data.data.token;
        } catch (e) {
            addResult('User Registration', false, e.message);
        }

        // ========== TEST 4: User Login ==========
        log('Testing User Login...');
        try {
            const res = await httpRequest(`${BACKEND_URL}/api/auth/login`, 'POST', {
                email: testEmail,
                password: 'Test123!'
            });
            addResult('User Login', res.data.success === true);
            if (res.data.data?.token) token = res.data.data.token;
        } catch (e) {
            addResult('User Login', false, e.message);
        }

        // ========== TEST 5: WebSocket Connection ==========
        log('Testing WebSocket Connection...');
        try {
            socket = io(BACKEND_URL, {
                transports: ['websocket'],
                timeout: 5000
            });
            
            await new Promise((resolve, reject) => {
                const timeout = setTimeout(() => reject(new Error('Connection timeout')), 5000);
                socket.on('connect', () => {
                    clearTimeout(timeout);
                    resolve();
                });
                socket.on('connect_error', (err) => {
                    clearTimeout(timeout);
                    reject(err);
                });
            });
            
            // Join police room to receive alerts
            socket.emit('join:role', { role: 'police', userId: 999 });
            
            // Listen for events
            socket.on('incident:new', (data) => receivedEvents.push({ type: 'incident:new', data, time: Date.now() }));
            socket.on('incident:alert', (data) => receivedEvents.push({ type: 'incident:alert', data, time: Date.now() }));
            socket.on('analysis:complete', (data) => receivedEvents.push({ type: 'analysis:complete', data, time: Date.now() }));
            socket.on('notification:new', (data) => receivedEvents.push({ type: 'notification:new', data, time: Date.now() }));
            
            addResult('WebSocket Connection', socket.connected, `Socket ID: ${socket.id}`);
        } catch (e) {
            addResult('WebSocket Connection', false, e.message);
        }

        // ========== TEST 6: Geo-fencing Districts ==========
        log('Testing Geo-fencing Districts...');
        try {
            const res = await httpRequest(`${BACKEND_URL}/api/geofencing/districts`, 'GET', null, {
                Authorization: `Bearer ${token}`
            });
            addResult('Geo-fencing Districts', res.data.success === true, `Districts: ${res.data.data?.length || 0}`);
        } catch (e) {
            addResult('Geo-fencing Districts', false, e.message);
        }

        // ========== TEST 7: Location Update ==========
        log('Testing Location Update...');
        try {
            const res = await httpRequest(`${BACKEND_URL}/api/geofencing/location`, 'POST', {
                latitude: -1.9536,
                longitude: 30.0606,
                accuracy: 10
            }, { Authorization: `Bearer ${token}` });
            addResult('Location Update', res.data.success === true);
        } catch (e) {
            addResult('Location Update', false, e.message);
        }

        // ========== TEST 8: Create Geo-fenced Alert ==========
        log('Testing Geo-fenced Alert Creation...');
        const alertStartTime = Date.now();
        try {
            const res = await httpRequest(`${BACKEND_URL}/api/geofencing/alert`, 'POST', {
                type: 'accident',
                latitude: -1.9540,
                longitude: 30.0610,
                address: 'KN 5 Rd, Nyarugenge, Kigali',
                description: 'E2E Test: Simulated accident for integration testing'
            }, { Authorization: `Bearer ${token}` });
            const alertTime = Date.now() - alertStartTime;
            addResult('Geo-fenced Alert', res.data.success === true, `Officers: ${res.data.data?.targetedOfficers || 0}, Time: ${alertTime}ms`);
        } catch (e) {
            addResult('Geo-fenced Alert', false, e.message);
        }

        // ========== TEST 9: Test Incident Detection (Simulated) ==========
        log('Testing Incident Detection Simulation...');
        try {
            const res = await httpRequest(`${BACKEND_URL}/api/incidents/test-detection`, 'POST', {
                latitude: -1.9550,
                longitude: 30.0620,
                type: 'accident',
                severity: 'high',
                description: 'E2E Test: Simulated AI detection'
            });
            addResult('Incident Detection', res.data.success === true, `Incident ID: ${res.data.data?.incident?.id || 'N/A'}`);
        } catch (e) {
            addResult('Incident Detection', false, e.message);
        }

        // Wait for WebSocket events
        log('Waiting for real-time events (2 seconds)...');
        await new Promise(resolve => setTimeout(resolve, 2000));

        // ========== TEST 10: WebSocket Events Received ==========
        addResult('WebSocket Events', receivedEvents.length > 0, `Events received: ${receivedEvents.length}`);
        if (receivedEvents.length > 0) {
            console.log('   📡 Real-time events received:');
            receivedEvents.forEach(e => {
                console.log(`      • ${e.type} (latency: ${e.time - alertStartTime}ms)`);
            });
        }

        // ========== TEST 11: Get Officers ==========
        log('Testing Get Officers...');
        try {
            const res = await httpRequest(`${BACKEND_URL}/api/geofencing/officers`, 'GET', null, {
                Authorization: `Bearer ${token}`
            });
            addResult('Get Officers', res.data.success === true, `Officers: ${res.data.data?.length || 0}`);
        } catch (e) {
            addResult('Get Officers', false, e.message);
        }

        // ========== TEST 12: Incident Statistics ==========
        log('Testing Incident Statistics...');
        try {
            const res = await httpRequest(`${BACKEND_URL}/api/incidents/statistics`);
            addResult('Incident Statistics', res.data.success === true, `Total: ${res.data.data?.total_incidents || 0}`);
        } catch (e) {
            addResult('Incident Statistics', false, e.message);
        }

    } catch (error) {
        console.error('Test error:', error);
    } finally {
        if (socket) socket.disconnect();
    }

    // Print summary
    console.log('\n' + '═'.repeat(60));
    console.log('   TEST SUMMARY');
    console.log('═'.repeat(60));
    console.log(`   ✅ Passed: ${results.passed}`);
    console.log(`   ❌ Failed: ${results.failed}`);
    console.log(`   📊 Total:  ${results.passed + results.failed}`);
    console.log('═'.repeat(60) + '\n');

    if (results.failed === 0) {
        console.log('🎉 ALL TESTS PASSED! System is fully integrated.\n');
    } else {
        console.log('⚠️  Some tests failed. Check the results above.\n');
    }

    process.exit(results.failed > 0 ? 1 : 0);
}

runTests();
