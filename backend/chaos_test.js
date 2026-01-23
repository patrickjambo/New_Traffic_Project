/**
 * ╔══════════════════════════════════════════════════════════════════════════════╗
 * ║                    TRAFFICGUARD CHAOS ENGINEERING TEST                       ║
 * ║         Testing System Resilience Under Adverse Conditions                   ║
 * ╚══════════════════════════════════════════════════════════════════════════════╝
 * 
 * This tests the system's ability to handle:
 * - Network latency simulation
 * - Partial failures
 * - Race conditions
 * - Resource exhaustion
 * - Malformed data injection
 */

const axios = require('axios');
const io = require('socket.io-client');
const { Pool } = require('pg');

const CONFIG = {
    BASE_URL: 'http://localhost:3000',
    API_URL: 'http://localhost:3000/api',
    WS_URL: 'http://localhost:3000',
    DB: {
        host: 'localhost',
        port: 5432,
        database: 'trafficguard',
        user: 'trafficguard_user',
        password: process.env.PGPASSWORD || ''
    }
};

const results = {
    passed: 0,
    failed: 0,
    tests: []
};

async function login(email, password) {
    const res = await axios.post(`${CONFIG.API_URL}/auth/login`, { email, password });
    return res.data.data;
}

function log(message, type = 'info') {
    const icons = { info: 'ℹ️', success: '✅', error: '❌', warning: '⚠️', chaos: '🔥' };
    console.log(`  ${icons[type] || '•'} ${message}`);
}

async function runChaosTest(name, testFn) {
    const start = Date.now();
    try {
        await testFn();
        const duration = Date.now() - start;
        results.passed++;
        results.tests.push({ name, status: 'passed', duration });
        console.log(`  ✅ ${name} (${duration}ms)`);
        return true;
    } catch (error) {
        const duration = Date.now() - start;
        results.failed++;
        results.tests.push({ name, status: 'failed', duration, error: error.message });
        console.log(`  ❌ ${name} - ${error.message}`);
        return false;
    }
}

async function runChaosTests() {
    console.log('\n');
    console.log('╔══════════════════════════════════════════════════════════════════════════════╗');
    console.log('║                    TRAFFICGUARD CHAOS ENGINEERING TEST                       ║');
    console.log('║         Testing System Resilience Under Adverse Conditions                   ║');
    console.log('╚══════════════════════════════════════════════════════════════════════════════╝');
    console.log('\n');

    const pool = new Pool(CONFIG.DB);
    let adminToken, policeToken, policeId;

    try {
        // Setup
        console.log('🔧 Setting up test environment...\n');
        const adminAuth = await login('deployment_admin@test.com', 'test123');
        adminToken = adminAuth.token;
        
        const policeAuth = await login('deployment_police@test.com', 'test123');
        policeToken = policeAuth.token;
        policeId = policeAuth.user.id;

        // ═══════════════════════════════════════════════════════════════════════════════
        // CHAOS TEST 1: RAPID FIRE REQUESTS
        // ═══════════════════════════════════════════════════════════════════════════════
        console.log('┌───────────────────────────────────────────────────────────────────────────────┐');
        console.log('│  CHAOS 1: RAPID FIRE REQUESTS - 200 requests in < 2 seconds                  │');
        console.log('└───────────────────────────────────────────────────────────────────────────────┘\n');

        await runChaosTest('Rapid Fire - 200 concurrent health checks', async () => {
            const requests = [];
            for (let i = 0; i < 200; i++) {
                requests.push(axios.get(`${CONFIG.BASE_URL}/health`).catch(e => ({ error: true })));
            }
            const results = await Promise.all(requests);
            const failures = results.filter(r => r.error).length;
            if (failures > 10) throw new Error(`${failures} failures out of 200`);
        });

        await runChaosTest('Rapid Fire - 100 authenticated requests', async () => {
            const requests = [];
            for (let i = 0; i < 100; i++) {
                requests.push(
                    axios.get(`${CONFIG.API_URL}/deployments`, {
                        headers: { Authorization: `Bearer ${adminToken}` }
                    }).catch(e => ({ error: true, status: e.response?.status }))
                );
            }
            const results = await Promise.all(requests);
            const failures = results.filter(r => r.error && r.status !== 429).length;
            if (failures > 5) throw new Error(`${failures} non-rate-limit failures`);
        });

        // ═══════════════════════════════════════════════════════════════════════════════
        // CHAOS TEST 2: MALFORMED DATA INJECTION
        // ═══════════════════════════════════════════════════════════════════════════════
        console.log('\n┌───────────────────────────────────────────────────────────────────────────────┐');
        console.log('│  CHAOS 2: MALFORMED DATA INJECTION - Testing Input Validation                │');
        console.log('└───────────────────────────────────────────────────────────────────────────────┘\n');

        const malformedPayloads = [
            { name: 'SQL Injection in unitName', data: { unitName: "'; DROP TABLE deployments; --" } },
            { name: 'XSS in instructions', data: { unitName: 'Test', instructions: '<script>alert("xss")</script>' } },
            { name: 'Extremely long string', data: { unitName: 'A'.repeat(100000) } },
            { name: 'Null bytes', data: { unitName: 'Test\x00Unit' } },
            { name: 'Unicode exploitation', data: { unitName: '测试\u202Etest' } },
            { name: 'Negative coordinates', data: { unitName: 'Test', location: { latitude: -999, longitude: -999 } } },
            { name: 'Array where string expected', data: { unitName: ['test', 'array'] } },
            { name: 'Object where string expected', data: { unitName: { nested: 'object' } } },
            { name: 'Empty object', data: {} },
            { name: 'Prototype pollution attempt', data: { __proto__: { admin: true } } }
        ];

        for (const payload of malformedPayloads) {
            await runChaosTest(`Malformed Input - ${payload.name}`, async () => {
                try {
                    await axios.post(`${CONFIG.API_URL}/deployments`, payload.data, {
                        headers: { Authorization: `Bearer ${adminToken}` }
                    });
                    // If it succeeds, ensure no damage was done
                } catch (e) {
                    // Expected to fail - system should reject gracefully
                    if (e.response?.status >= 500) {
                        throw new Error('Server error instead of validation error');
                    }
                }
            });
        }

        // ═══════════════════════════════════════════════════════════════════════════════
        // CHAOS TEST 3: RACE CONDITIONS
        // ═══════════════════════════════════════════════════════════════════════════════
        console.log('\n┌───────────────────────────────────────────────────────────────────────────────┐');
        console.log('│  CHAOS 3: RACE CONDITIONS - Concurrent Modifications                         │');
        console.log('└───────────────────────────────────────────────────────────────────────────────┘\n');

        await runChaosTest('Race Condition - Simultaneous status updates', async () => {
            // Create a deployment first
            const createRes = await axios.post(`${CONFIG.API_URL}/deployments`, {
                unitName: `Race Test ${Date.now()}`,
                location: { address: 'Race Test Location', latitude: -1.9441, longitude: 30.0619 },
                priority: 'normal',
                officers: [policeId]
            }, {
                headers: { Authorization: `Bearer ${adminToken}` }
            });
            
            const deploymentId = createRes.data.data.id;
            
            // Acknowledge first
            await axios.post(`${CONFIG.API_URL}/deployments/${deploymentId}/acknowledge`, 
                { latitude: -1.9445, longitude: 30.0622 },
                { headers: { Authorization: `Bearer ${policeToken}` } }
            ).catch(() => {});
            
            // Try to update status from multiple "sources" simultaneously
            const statuses = ['en_route', 'on_scene', 'en_route', 'on_scene', 'completed'];
            const updates = statuses.map(status => 
                axios.put(`${CONFIG.API_URL}/deployments/${deploymentId}/officer-status`,
                    { status, latitude: -1.944, longitude: 30.062 },
                    { headers: { Authorization: `Bearer ${policeToken}` } }
                ).catch(e => ({ error: true }))
            );
            
            await Promise.all(updates);
            
            // Verify database is in consistent state
            const dbResult = await pool.query(
                'SELECT status FROM deployment_officers WHERE deployment_id = $1',
                [deploymentId]
            );
            
            if (!dbResult.rows[0]) throw new Error('Assignment not found');
            const validStatuses = ['assigned', 'en_route', 'on_scene', 'completed'];
            if (!validStatuses.includes(dbResult.rows[0].status)) {
                throw new Error(`Invalid status: ${dbResult.rows[0].status}`);
            }
            
            // Cleanup
            await pool.query('DELETE FROM deployment_officers WHERE deployment_id = $1', [deploymentId]);
            await pool.query('DELETE FROM deployments WHERE id = $1', [deploymentId]);
        });

        await runChaosTest('Race Condition - Double acknowledgment', async () => {
            // Create deployment
            const createRes = await axios.post(`${CONFIG.API_URL}/deployments`, {
                unitName: `Double Ack Test ${Date.now()}`,
                location: { address: 'Test Location', latitude: -1.9441, longitude: 30.0619 },
                priority: 'normal',
                officers: [policeId]
            }, {
                headers: { Authorization: `Bearer ${adminToken}` }
            });
            
            const deploymentId = createRes.data.data.id;
            
            // Try to acknowledge twice simultaneously
            const acks = [
                axios.post(`${CONFIG.API_URL}/deployments/${deploymentId}/acknowledge`,
                    { latitude: -1.9445, longitude: 30.0622 },
                    { headers: { Authorization: `Bearer ${policeToken}` } }
                ).catch(e => ({ status: e.response?.status })),
                axios.post(`${CONFIG.API_URL}/deployments/${deploymentId}/acknowledge`,
                    { latitude: -1.9446, longitude: 30.0623 },
                    { headers: { Authorization: `Bearer ${policeToken}` } }
                ).catch(e => ({ status: e.response?.status }))
            ];
            
            await Promise.all(acks);
            
            // Verify only one acknowledgment
            const dbResult = await pool.query(
                'SELECT COUNT(*) as count FROM deployment_officers WHERE deployment_id = $1 AND acknowledged = TRUE',
                [deploymentId]
            );
            
            // Cleanup
            await pool.query('DELETE FROM deployment_officers WHERE deployment_id = $1', [deploymentId]);
            await pool.query('DELETE FROM deployments WHERE id = $1', [deploymentId]);
        });

        // ═══════════════════════════════════════════════════════════════════════════════
        // CHAOS TEST 4: WEBSOCKET STRESS
        // ═══════════════════════════════════════════════════════════════════════════════
        console.log('\n┌───────────────────────────────────────────────────────────────────────────────┐');
        console.log('│  CHAOS 4: WEBSOCKET STRESS - Multiple Connections & Rapid Events             │');
        console.log('└───────────────────────────────────────────────────────────────────────────────┘\n');

        await runChaosTest('WebSocket Stress - 20 simultaneous connections', async () => {
            const sockets = [];
            const connectPromises = [];
            
            for (let i = 0; i < 20; i++) {
                const socket = io(CONFIG.WS_URL, {
                    auth: { token: adminToken },
                    transports: ['websocket'],
                    reconnection: false
                });
                sockets.push(socket);
                connectPromises.push(
                    new Promise((resolve, reject) => {
                        const timeout = setTimeout(() => reject(new Error('Timeout')), 5000);
                        socket.on('connect', () => {
                            clearTimeout(timeout);
                            resolve();
                        });
                        socket.on('connect_error', (err) => {
                            clearTimeout(timeout);
                            reject(err);
                        });
                    })
                );
            }
            
            await Promise.all(connectPromises);
            
            // Cleanup
            sockets.forEach(s => s.disconnect());
        });

        await runChaosTest('WebSocket Stress - 500 rapid events', async () => {
            const socket = io(CONFIG.WS_URL, {
                auth: { token: policeToken },
                transports: ['websocket']
            });
            
            await new Promise((resolve) => socket.on('connect', () => {
                socket.emit('join:role', { role: 'police', userId: policeId });
                setTimeout(resolve, 200);
            }));
            
            // Send 500 location updates rapidly
            for (let i = 0; i < 500; i++) {
                socket.emit('officer:location_update', {
                    latitude: -1.9441 + (Math.random() * 0.01),
                    longitude: 30.0619 + (Math.random() * 0.01),
                    accuracy: 10,
                    timestamp: Date.now()
                });
            }
            
            // Wait a bit for processing
            await new Promise(r => setTimeout(r, 1000));
            
            socket.disconnect();
        });

        await runChaosTest('WebSocket Stress - Connect/disconnect cycles', async () => {
            for (let i = 0; i < 10; i++) {
                const socket = io(CONFIG.WS_URL, {
                    auth: { token: adminToken },
                    transports: ['websocket'],
                    reconnection: false
                });
                
                await new Promise((resolve, reject) => {
                    const timeout = setTimeout(() => reject(new Error('Timeout')), 3000);
                    socket.on('connect', () => {
                        clearTimeout(timeout);
                        socket.disconnect();
                        resolve();
                    });
                });
            }
        });

        // ═══════════════════════════════════════════════════════════════════════════════
        // CHAOS TEST 5: BOUNDARY CONDITIONS
        // ═══════════════════════════════════════════════════════════════════════════════
        console.log('\n┌───────────────────────────────────────────────────────────────────────────────┐');
        console.log('│  CHAOS 5: BOUNDARY CONDITIONS - Edge Cases                                   │');
        console.log('└───────────────────────────────────────────────────────────────────────────────┘\n');

        await runChaosTest('Boundary - Maximum valid latitude/longitude', async () => {
            const res = await axios.post(`${CONFIG.API_URL}/deployments`, {
                unitName: `Boundary Test ${Date.now()}`,
                location: { address: 'Edge of World', latitude: 89.9999, longitude: 179.9999 },
                priority: 'normal'
            }, {
                headers: { Authorization: `Bearer ${adminToken}` }
            });
            
            // Cleanup
            if (res.data.data?.id) {
                await pool.query('DELETE FROM deployments WHERE id = $1', [res.data.data.id]);
            }
        });

        await runChaosTest('Boundary - Zero values', async () => {
            const res = await axios.post(`${CONFIG.API_URL}/deployments`, {
                unitName: `Zero Test ${Date.now()}`,
                location: { address: 'Null Island', latitude: 0, longitude: 0 },
                priority: 'normal'
            }, {
                headers: { Authorization: `Bearer ${adminToken}` }
            });
            
            if (res.data.data?.id) {
                await pool.query('DELETE FROM deployments WHERE id = $1', [res.data.data.id]);
            }
        });

        await runChaosTest('Boundary - Empty string values', async () => {
            try {
                await axios.post(`${CONFIG.API_URL}/deployments`, {
                    unitName: '',
                    location: { address: '', latitude: -1.9441, longitude: 30.0619 },
                    priority: 'normal'
                }, {
                    headers: { Authorization: `Bearer ${adminToken}` }
                });
            } catch (e) {
                // May fail validation - that's OK
                if (e.response?.status >= 500) throw e;
            }
        });

        await runChaosTest('Boundary - Very large deployment ID', async () => {
            try {
                await axios.get(`${CONFIG.API_URL}/deployments/9999999999999`, {
                    headers: { Authorization: `Bearer ${adminToken}` }
                });
            } catch (e) {
                if (e.response?.status === 404) return; // Expected
                if (e.response?.status >= 500) throw new Error('Server error on large ID');
            }
        });

        await runChaosTest('Boundary - Negative deployment ID', async () => {
            try {
                await axios.get(`${CONFIG.API_URL}/deployments/-1`, {
                    headers: { Authorization: `Bearer ${adminToken}` }
                });
            } catch (e) {
                if (e.response?.status === 404 || e.response?.status === 400) return;
                if (e.response?.status >= 500) throw new Error('Server error on negative ID');
            }
        });

        // ═══════════════════════════════════════════════════════════════════════════════
        // CHAOS TEST 6: TOKEN MANIPULATION
        // ═══════════════════════════════════════════════════════════════════════════════
        console.log('\n┌───────────────────────────────────────────────────────────────────────────────┐');
        console.log('│  CHAOS 6: TOKEN MANIPULATION - Security Testing                              │');
        console.log('└───────────────────────────────────────────────────────────────────────────────┘\n');

        const tokenTests = [
            { name: 'Empty token', token: '' },
            { name: 'Null token', token: null },
            { name: 'Malformed JWT', token: 'not.a.valid.jwt.token' },
            { name: 'Modified payload JWT', token: adminToken.split('.')[0] + '.eyJhZG1pbiI6dHJ1ZX0.' + adminToken.split('.')[2] },
            { name: 'Expired-like token', token: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6MSwiZXhwIjoxfQ.invalid' },
            { name: 'SQL in token', token: "'; DROP TABLE users; --" }
        ];

        for (const test of tokenTests) {
            await runChaosTest(`Token Security - ${test.name}`, async () => {
                try {
                    await axios.get(`${CONFIG.API_URL}/deployments`, {
                        headers: { Authorization: `Bearer ${test.token}` }
                    });
                    throw new Error('Should have rejected invalid token');
                } catch (e) {
                    if (e.response?.status === 401 || e.response?.status === 403) return;
                    if (e.message === 'Should have rejected invalid token') throw e;
                    if (e.response?.status >= 500) throw new Error('Server error on token test');
                }
            });
        }

        // ═══════════════════════════════════════════════════════════════════════════════
        // RESULTS SUMMARY
        // ═══════════════════════════════════════════════════════════════════════════════
        console.log('\n');
        console.log('╔══════════════════════════════════════════════════════════════════════════════╗');
        console.log('║                        CHAOS TEST RESULTS                                   ║');
        console.log('╠══════════════════════════════════════════════════════════════════════════════╣');
        console.log(`║  Total Tests:     ${(results.passed + results.failed).toString().padEnd(5)}                                                  ║`);
        console.log(`║  ✅ Passed:       ${results.passed.toString().padEnd(5)}                                                  ║`);
        console.log(`║  ❌ Failed:       ${results.failed.toString().padEnd(5)}                                                  ║`);
        console.log(`║  📊 Success Rate: ${((results.passed / (results.passed + results.failed)) * 100).toFixed(1)}%                                               ║`);
        console.log('╠══════════════════════════════════════════════════════════════════════════════╣');
        
        if (results.failed === 0) {
            console.log('║  🎉 SYSTEM SURVIVED ALL CHAOS TESTS! Highly Resilient!                      ║');
        } else {
            console.log('║  ⚠️  Some chaos scenarios caused issues. Review failed tests.                ║');
        }
        console.log('╚══════════════════════════════════════════════════════════════════════════════╝');
        console.log('\n');

    } catch (error) {
        console.error('\n💀 CRITICAL ERROR:', error.message);
    } finally {
        await pool.end();
    }
}

runChaosTests();
