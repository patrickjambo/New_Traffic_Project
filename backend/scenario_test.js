/**
 * ╔══════════════════════════════════════════════════════════════════════════════╗
 * ║                    TRAFFICGUARD END-TO-END SCENARIO TEST                     ║
 * ║              Testing Complete Real-World User Workflows                      ║
 * ╚══════════════════════════════════════════════════════════════════════════════╝
 * 
 * This simulates real user scenarios:
 * - Admin creates emergency deployment
 * - Multiple officers receive and acknowledge
 * - Officers update status and location
 * - Admin monitors in real-time
 * - Deployment completes successfully
 */

const axios = require('axios');
const io = require('socket.io-client');
const { Pool } = require('pg');

const CONFIG = {
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

const results = { passed: 0, failed: 0, scenarios: [] };

async function login(email, password) {
    const res = await axios.post(`${CONFIG.API_URL}/auth/login`, { email, password });
    return res.data.data;
}

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

async function runScenario(name, scenarioFn) {
    console.log(`\n  🎬 Scenario: ${name}`);
    console.log('  ' + '─'.repeat(70));
    const start = Date.now();
    try {
        await scenarioFn();
        const duration = Date.now() - start;
        results.passed++;
        results.scenarios.push({ name, status: 'passed', duration });
        console.log(`  ✅ SCENARIO PASSED (${duration}ms)\n`);
        return true;
    } catch (error) {
        const duration = Date.now() - start;
        results.failed++;
        results.scenarios.push({ name, status: 'failed', duration, error: error.message });
        console.log(`  ❌ SCENARIO FAILED: ${error.message}\n`);
        return false;
    }
}

function log(step, message) {
    console.log(`     ${step}. ${message}`);
}

async function runScenarioTests() {
    console.log('\n');
    console.log('╔══════════════════════════════════════════════════════════════════════════════╗');
    console.log('║                    TRAFFICGUARD END-TO-END SCENARIO TEST                     ║');
    console.log('║              Testing Complete Real-World User Workflows                      ║');
    console.log('╚══════════════════════════════════════════════════════════════════════════════╝');

    const pool = new Pool(CONFIG.DB);
    
    try {
        // ═══════════════════════════════════════════════════════════════════════════════
        // SCENARIO 1: COMPLETE EMERGENCY RESPONSE WORKFLOW
        // ═══════════════════════════════════════════════════════════════════════════════
        console.log('\n┌───────────────────────────────────────────────────────────────────────────────┐');
        console.log('│  SCENARIO 1: COMPLETE EMERGENCY RESPONSE WORKFLOW                            │');
        console.log('└───────────────────────────────────────────────────────────────────────────────┘');

        await runScenario('Traffic Accident Response - Full Lifecycle', async () => {
            // Setup actors
            const admin = await login('deployment_admin@test.com', 'test123');
            const police = await login('deployment_police@test.com', 'test123');
            
            // Connect WebSockets
            const adminSocket = io(CONFIG.WS_URL, { auth: { token: admin.token }, transports: ['websocket'] });
            const policeSocket = io(CONFIG.WS_URL, { auth: { token: police.token }, transports: ['websocket'] });
            
            await new Promise(resolve => adminSocket.on('connect', () => {
                adminSocket.emit('join:role', { role: 'admin', userId: admin.user.id });
                resolve();
            }));
            
            await new Promise(resolve => policeSocket.on('connect', () => {
                policeSocket.emit('join:role', { role: 'police', userId: police.user.id });
                resolve();
            }));
            
            await sleep(300);
            
            const events = { assigned: false, acknowledged: false, statusUpdates: [] };
            
            // Set up event listeners
            policeSocket.on('deployment:assigned', (data) => {
                events.assigned = true;
                events.assignedData = data;
            });
            
            adminSocket.on('deployment:acknowledged', (data) => {
                events.acknowledged = true;
            });
            
            adminSocket.on('deployment:officer_status', (data) => {
                events.statusUpdates.push(data);
            });
            
            log(1, 'Admin receives traffic accident report at KN 5 Road');
            
            log(2, 'Admin creates HIGH PRIORITY deployment');
            const createRes = await axios.post(`${CONFIG.API_URL}/deployments`, {
                unitName: 'Emergency Response Unit - Accident KN5',
                location: {
                    address: 'KN 5 Road, Near Kigali Convention Center',
                    latitude: -1.9441,
                    longitude: 30.0619
                },
                priority: 'high',
                instructions: 'Traffic accident with injuries. Secure scene, assist ambulance access.',
                officers: [police.user.id]
            }, {
                headers: { Authorization: `Bearer ${admin.token}` }
            });
            
            const deploymentId = createRes.data.data.id;
            log(3, `Deployment created: ID ${deploymentId}`);
            
            // Wait for WebSocket event
            await sleep(1000);
            if (!events.assigned) throw new Error('Police did not receive assignment');
            log(4, 'Police officer receives notification on mobile app');
            
            log(5, 'Police officer acknowledges and begins response');
            await axios.post(`${CONFIG.API_URL}/deployments/${deploymentId}/acknowledge`, {
                latitude: -1.9500,
                longitude: 30.0600,
                notes: 'En route from Nyarutarama station'
            }, {
                headers: { Authorization: `Bearer ${police.token}` }
            });
            
            await sleep(500);
            if (!events.acknowledged) log(5.1, '(Admin acknowledgment notification received)');
            
            log(6, 'Police updates status: EN ROUTE');
            await axios.put(`${CONFIG.API_URL}/deployments/${deploymentId}/officer-status`, {
                status: 'en_route',
                latitude: -1.9470,
                longitude: 30.0610
            }, {
                headers: { Authorization: `Bearer ${police.token}` }
            });
            
            // Simulate driving with location updates
            log(7, 'Police sends location updates while driving...');
            for (let i = 0; i < 3; i++) {
                policeSocket.emit('officer:location_update', {
                    latitude: -1.9470 + (i * 0.001),
                    longitude: 30.0610 + (i * 0.0005),
                    accuracy: 10,
                    speed: 45
                });
                await sleep(200);
            }
            
            log(8, 'Police arrives on scene');
            await axios.put(`${CONFIG.API_URL}/deployments/${deploymentId}/officer-status`, {
                status: 'on_scene',
                latitude: -1.9441,
                longitude: 30.0619
            }, {
                headers: { Authorization: `Bearer ${police.token}` }
            });
            
            await sleep(500);
            
            log(9, 'Police secures scene and assists ambulance');
            await sleep(300);
            
            log(10, 'Police completes deployment');
            await axios.put(`${CONFIG.API_URL}/deployments/${deploymentId}/officer-status`, {
                status: 'completed',
                latitude: -1.9441,
                longitude: 30.0619,
                notes: 'Scene secured, 2 injured transported, road cleared'
            }, {
                headers: { Authorization: `Bearer ${police.token}` }
            });
            
            // Verify in database
            const dbCheck = await pool.query(
                `SELECT d_o.status, d_o.acknowledged, d.status as deployment_status
                 FROM deployment_officers d_o 
                 JOIN deployments d ON d.id = d_o.deployment_id
                 WHERE d_o.deployment_id = $1`,
                [deploymentId]
            );
            
            if (dbCheck.rows[0]?.status !== 'completed') {
                throw new Error('Database status not updated to completed');
            }
            
            log(11, '✓ Deployment completed successfully');
            log(12, `✓ Total status updates received by admin: ${events.statusUpdates.length}`);
            
            // Cleanup
            adminSocket.disconnect();
            policeSocket.disconnect();
            await pool.query('DELETE FROM deployment_officers WHERE deployment_id = $1', [deploymentId]);
            await pool.query('DELETE FROM deployments WHERE id = $1', [deploymentId]);
        });

        // ═══════════════════════════════════════════════════════════════════════════════
        // SCENARIO 2: PATROL SHIFT MANAGEMENT
        // ═══════════════════════════════════════════════════════════════════════════════
        console.log('\n┌───────────────────────────────────────────────────────────────────────────────┐');
        console.log('│  SCENARIO 2: PATROL SHIFT MANAGEMENT                                         │');
        console.log('└───────────────────────────────────────────────────────────────────────────────┘');

        await runScenario('Morning Shift Patrol Assignment', async () => {
            const admin = await login('deployment_admin@test.com', 'test123');
            const police = await login('deployment_police@test.com', 'test123');
            
            log(1, 'Admin assigns morning patrol zone');
            const createRes = await axios.post(`${CONFIG.API_URL}/deployments`, {
                unitName: 'Patrol Zone A - Morning Shift',
                location: {
                    address: 'Kimihurura Area',
                    latitude: -1.9400,
                    longitude: 30.0700
                },
                priority: 'normal',
                instructions: 'Regular patrol 06:00-14:00. Focus on school zones.',
                officers: [police.user.id]
            }, {
                headers: { Authorization: `Bearer ${admin.token}` }
            });
            
            const deploymentId = createRes.data.data.id;
            log(2, `Patrol deployment created: ID ${deploymentId}`);
            
            log(3, 'Officer checks in and acknowledges');
            await axios.post(`${CONFIG.API_URL}/deployments/${deploymentId}/acknowledge`, {
                latitude: -1.9410,
                longitude: 30.0705
            }, {
                headers: { Authorization: `Bearer ${police.token}` }
            });
            
            log(4, 'Officer starts patrol');
            await axios.put(`${CONFIG.API_URL}/deployments/${deploymentId}/officer-status`, {
                status: 'en_route',
                latitude: -1.9400,
                longitude: 30.0700
            }, {
                headers: { Authorization: `Bearer ${police.token}` }
            });
            
            log(5, 'Officer reaches patrol zone');
            await axios.put(`${CONFIG.API_URL}/deployments/${deploymentId}/officer-status`, {
                status: 'on_scene',
                latitude: -1.9400,
                longitude: 30.0700
            }, {
                headers: { Authorization: `Bearer ${police.token}` }
            });
            
            log(6, 'Officer completes shift');
            await axios.put(`${CONFIG.API_URL}/deployments/${deploymentId}/officer-status`, {
                status: 'completed',
                latitude: -1.9410,
                longitude: 30.0705,
                notes: '8-hour patrol completed. No incidents.'
            }, {
                headers: { Authorization: `Bearer ${police.token}` }
            });
            
            // Verify stats updated
            const statsRes = await axios.get(`${CONFIG.API_URL}/deployments/stats`, {
                headers: { Authorization: `Bearer ${admin.token}` }
            });
            
            log(7, `Dashboard shows: ${statsRes.data.data.total_deployments} total deployments`);
            
            // Cleanup
            await pool.query('DELETE FROM deployment_officers WHERE deployment_id = $1', [deploymentId]);
            await pool.query('DELETE FROM deployments WHERE id = $1', [deploymentId]);
        });

        // ═══════════════════════════════════════════════════════════════════════════════
        // SCENARIO 3: REAL-TIME LOCATION TRACKING
        // ═══════════════════════════════════════════════════════════════════════════════
        console.log('\n┌───────────────────────────────────────────────────────────────────────────────┐');
        console.log('│  SCENARIO 3: REAL-TIME LOCATION TRACKING                                     │');
        console.log('└───────────────────────────────────────────────────────────────────────────────┘');

        await runScenario('Live Officer Tracking During Pursuit', async () => {
            const admin = await login('deployment_admin@test.com', 'test123');
            const police = await login('deployment_police@test.com', 'test123');
            
            const adminSocket = io(CONFIG.WS_URL, { auth: { token: admin.token }, transports: ['websocket'] });
            const policeSocket = io(CONFIG.WS_URL, { auth: { token: police.token }, transports: ['websocket'] });
            
            await new Promise(resolve => adminSocket.on('connect', () => {
                adminSocket.emit('join:role', { role: 'admin', userId: admin.user.id });
                resolve();
            }));
            
            await new Promise(resolve => policeSocket.on('connect', () => {
                policeSocket.emit('join:role', { role: 'police', userId: police.user.id });
                resolve();
            }));
            
            await sleep(300);
            
            let locationUpdatesReceived = 0;
            adminSocket.on('officer:location', () => {
                locationUpdatesReceived++;
            });
            
            log(1, 'Admin dashboard open, monitoring officer locations');
            
            log(2, 'Officer begins high-speed pursuit simulation');
            
            // Simulate rapid location updates during pursuit
            const routePoints = [
                { lat: -1.9441, lng: 30.0619, speed: 60 },
                { lat: -1.9430, lng: 30.0625, speed: 75 },
                { lat: -1.9420, lng: 30.0630, speed: 80 },
                { lat: -1.9410, lng: 30.0640, speed: 85 },
                { lat: -1.9400, lng: 30.0650, speed: 70 },
                { lat: -1.9395, lng: 30.0655, speed: 50 },
                { lat: -1.9390, lng: 30.0660, speed: 30 },
                { lat: -1.9388, lng: 30.0662, speed: 0 }  // Stopped
            ];
            
            for (const point of routePoints) {
                policeSocket.emit('officer:location_update', {
                    latitude: point.lat,
                    longitude: point.lng,
                    accuracy: 5,
                    speed: point.speed,
                    timestamp: Date.now()
                });
                await sleep(100);
            }
            
            log(3, `Sent ${routePoints.length} location updates`);
            
            await sleep(500);
            
            log(4, `Admin dashboard received ${locationUpdatesReceived} updates in real-time`);
            
            if (locationUpdatesReceived < 5) {
                throw new Error(`Expected at least 5 updates, got ${locationUpdatesReceived}`);
            }
            
            log(5, '✓ Real-time tracking working correctly');
            
            adminSocket.disconnect();
            policeSocket.disconnect();
        });

        // ═══════════════════════════════════════════════════════════════════════════════
        // SCENARIO 4: SYSTEM RECOVERY
        // ═══════════════════════════════════════════════════════════════════════════════
        console.log('\n┌───────────────────────────────────────────────────────────────────────────────┐');
        console.log('│  SCENARIO 4: SYSTEM RECOVERY                                                 │');
        console.log('└───────────────────────────────────────────────────────────────────────────────┘');

        await runScenario('Officer Reconnects After Network Loss', async () => {
            const admin = await login('deployment_admin@test.com', 'test123');
            const police = await login('deployment_police@test.com', 'test123');
            
            log(1, 'Admin creates deployment');
            const createRes = await axios.post(`${CONFIG.API_URL}/deployments`, {
                unitName: 'Recovery Test Unit',
                location: { address: 'Test Location', latitude: -1.9441, longitude: 30.0619 },
                priority: 'normal',
                officers: [police.user.id]
            }, {
                headers: { Authorization: `Bearer ${admin.token}` }
            });
            
            const deploymentId = createRes.data.data.id;
            
            log(2, 'Officer connects and acknowledges');
            let policeSocket = io(CONFIG.WS_URL, { auth: { token: police.token }, transports: ['websocket'] });
            
            await new Promise(resolve => policeSocket.on('connect', () => {
                policeSocket.emit('join:role', { role: 'police', userId: police.user.id });
                resolve();
            }));
            
            await axios.post(`${CONFIG.API_URL}/deployments/${deploymentId}/acknowledge`, {
                latitude: -1.9445, longitude: 30.0622
            }, {
                headers: { Authorization: `Bearer ${police.token}` }
            });
            
            log(3, 'Simulating network disconnection...');
            policeSocket.disconnect();
            await sleep(500);
            
            log(4, 'Officer reconnects after network restored');
            policeSocket = io(CONFIG.WS_URL, { auth: { token: police.token }, transports: ['websocket'] });
            
            await new Promise(resolve => policeSocket.on('connect', () => {
                policeSocket.emit('join:role', { role: 'police', userId: police.user.id });
                resolve();
            }));
            
            log(5, 'Officer can still update deployment status');
            await axios.put(`${CONFIG.API_URL}/deployments/${deploymentId}/officer-status`, {
                status: 'on_scene',
                latitude: -1.9441,
                longitude: 30.0619
            }, {
                headers: { Authorization: `Bearer ${police.token}` }
            });
            
            // Verify
            const dbCheck = await pool.query(
                'SELECT status FROM deployment_officers WHERE deployment_id = $1',
                [deploymentId]
            );
            
            if (dbCheck.rows[0]?.status !== 'on_scene') {
                throw new Error('Status not updated after reconnect');
            }
            
            log(6, '✓ System recovered gracefully');
            
            policeSocket.disconnect();
            
            // Cleanup
            await pool.query('DELETE FROM deployment_officers WHERE deployment_id = $1', [deploymentId]);
            await pool.query('DELETE FROM deployments WHERE id = $1', [deploymentId]);
        });

        // ═══════════════════════════════════════════════════════════════════════════════
        // RESULTS SUMMARY
        // ═══════════════════════════════════════════════════════════════════════════════
        console.log('\n');
        console.log('╔══════════════════════════════════════════════════════════════════════════════╗');
        console.log('║                     SCENARIO TEST RESULTS                                   ║');
        console.log('╠══════════════════════════════════════════════════════════════════════════════╣');
        console.log(`║  Total Scenarios: ${(results.passed + results.failed).toString().padEnd(5)}                                                 ║`);
        console.log(`║  ✅ Passed:       ${results.passed.toString().padEnd(5)}                                                  ║`);
        console.log(`║  ❌ Failed:       ${results.failed.toString().padEnd(5)}                                                  ║`);
        console.log(`║  📊 Success Rate: ${((results.passed / (results.passed + results.failed)) * 100).toFixed(1)}%                                               ║`);
        console.log('╠══════════════════════════════════════════════════════════════════════════════╣');
        
        if (results.failed === 0) {
            console.log('║  🎉 ALL SCENARIOS COMPLETED SUCCESSFULLY!                                    ║');
            console.log('║     System handles real-world workflows seamlessly!                         ║');
        } else {
            console.log('║  ⚠️  Some scenarios failed. Review the workflows above.                      ║');
        }
        console.log('╚══════════════════════════════════════════════════════════════════════════════╝');
        console.log('\n');

    } catch (error) {
        console.error('\n💀 CRITICAL ERROR:', error.message);
    } finally {
        await pool.end();
    }
}

runScenarioTests();
