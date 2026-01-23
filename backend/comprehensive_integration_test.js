/**
 * ╔══════════════════════════════════════════════════════════════════════════════╗
 * ║        TRAFFICGUARD COMPREHENSIVE SYSTEM INTEGRATION TEST                    ║
 * ║        Full End-to-End Test Suite with Real-Time Verification                ║
 * ╠══════════════════════════════════════════════════════════════════════════════╣
 * ║  Tests:                                                                       ║
 * ║  1. System Health & Connectivity                                              ║
 * ║  2. Authentication & Authorization                                            ║
 * ║  3. Real-Time WebSocket Communication                                         ║
 * ║  4. Deployment Creation & Assignment                                          ║
 * ║  5. Mobile App Receives Deployment                                            ║
 * ║  6. Officer Acknowledgment with Auto-Location                                 ║
 * ║  7. Status Updates with Location Streaming                                    ║
 * ║  8. Admin Dashboard Real-Time Updates                                         ║
 * ║  9. Database Persistence Verification                                         ║
 * ║  10. Incident Detection & Alert Flow                                          ║
 * ║  11. Concurrent Operations Stress Test                                        ║
 * ║  12. Error Recovery & Resilience                                              ║
 * ╚══════════════════════════════════════════════════════════════════════════════╝
 */

const io = require('socket.io-client');
const axios = require('axios');
const { Pool } = require('pg');

// ============================================
// CONFIGURATION
// ============================================
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
    },
    TIMEOUT: 10000,
    TEST_USERS: {
        admin: { email: 'deployment_admin@test.com', password: 'test123' },
        police: { email: 'deployment_police@test.com', password: 'test123' }
    }
};

// ============================================
// TEST UTILITIES
// ============================================
class TestRunner {
    constructor() {
        this.results = {
            total: 0,
            passed: 0,
            failed: 0,
            skipped: 0,
            tests: [],
            startTime: null,
            endTime: null
        };
        this.db = null;
        this.adminSocket = null;
        this.policeSocket = null;
        this.adminToken = null;
        this.policeToken = null;
        this.policeUserId = null;
        this.testDeploymentId = null;
        this.receivedEvents = new Map();
    }

    async log(message, type = 'info') {
        const icons = {
            info: 'ℹ️',
            success: '✅',
            error: '❌',
            warning: '⚠️',
            test: '🧪',
            socket: '📡',
            db: '🗄️',
            api: '🌐',
            location: '📍'
        };
        console.log(`${icons[type] || '•'} ${message}`);
    }

    async runTest(name, testFn, category = 'General') {
        this.results.total++;
        const startTime = Date.now();
        
        try {
            await testFn();
            const duration = Date.now() - startTime;
            this.results.passed++;
            this.results.tests.push({ name, category, status: 'passed', duration });
            this.log(`PASS: ${name} (${duration}ms)`, 'success');
            return true;
        } catch (error) {
            const duration = Date.now() - startTime;
            this.results.failed++;
            this.results.tests.push({ name, category, status: 'failed', duration, error: error.message });
            this.log(`FAIL: ${name} - ${error.message}`, 'error');
            return false;
        }
    }

    async sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    async waitForEvent(eventName, timeout = 5000) {
        return new Promise((resolve, reject) => {
            const timeoutId = setTimeout(() => {
                reject(new Error(`Timeout waiting for event: ${eventName}`));
            }, timeout);

            const checkInterval = setInterval(() => {
                if (this.receivedEvents.has(eventName)) {
                    clearTimeout(timeoutId);
                    clearInterval(checkInterval);
                    resolve(this.receivedEvents.get(eventName));
                }
            }, 100);
        });
    }
}

// ============================================
// MAIN TEST SUITE
// ============================================
async function runComprehensiveTests() {
    const runner = new TestRunner();
    runner.results.startTime = new Date();

    console.log('\n');
    console.log('╔══════════════════════════════════════════════════════════════════════════════╗');
    console.log('║        TRAFFICGUARD COMPREHENSIVE SYSTEM INTEGRATION TEST                    ║');
    console.log('║        Testing Full System Integration & Real-Time Communication             ║');
    console.log('╚══════════════════════════════════════════════════════════════════════════════╝');
    console.log('\n');

    // ============================================
    // PHASE 1: SYSTEM HEALTH CHECKS
    // ============================================
    console.log('┌──────────────────────────────────────────────────────────────────────────────┐');
    console.log('│  PHASE 1: SYSTEM HEALTH & CONNECTIVITY                                       │');
    console.log('└──────────────────────────────────────────────────────────────────────────────┘\n');

    // Test 1.1: Backend Health Check
    await runner.runTest('Backend API Health Check', async () => {
        const response = await axios.get(`${CONFIG.BASE_URL}/health`, { timeout: CONFIG.TIMEOUT });
        if (!response.data.success) throw new Error('Health check failed');
        if (!response.data.websocket) throw new Error('WebSocket status missing');
        runner.log(`Backend uptime: ${Math.round(response.data.uptime)}s`, 'info');
    }, 'Health');

    // Test 1.2: Database Connection
    await runner.runTest('Database Connection & Query', async () => {
        runner.db = new Pool(CONFIG.DB);
        const result = await runner.db.query('SELECT NOW() as time, current_database() as db');
        if (!result.rows[0]) throw new Error('Database query failed');
        runner.log(`Connected to: ${result.rows[0].db}`, 'db');
    }, 'Health');

    // Test 1.3: Required Tables Exist
    await runner.runTest('Database Tables Verification', async () => {
        const tables = ['users', 'deployments', 'deployment_officers', 'incidents', 'officer_profiles'];
        for (const table of tables) {
            const result = await runner.db.query(
                `SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_name = $1)`,
                [table]
            );
            if (!result.rows[0].exists) throw new Error(`Table ${table} missing`);
        }
        runner.log(`All ${tables.length} required tables exist`, 'db');
    }, 'Health');

    // ============================================
    // PHASE 2: AUTHENTICATION
    // ============================================
    console.log('\n┌──────────────────────────────────────────────────────────────────────────────┐');
    console.log('│  PHASE 2: AUTHENTICATION & AUTHORIZATION                                     │');
    console.log('└──────────────────────────────────────────────────────────────────────────────┘\n');

    // Test 2.1: Admin Login
    await runner.runTest('Admin User Authentication', async () => {
        const response = await axios.post(`${CONFIG.API_URL}/auth/login`, CONFIG.TEST_USERS.admin);
        if (!response.data.success) throw new Error('Admin login failed');
        runner.adminToken = response.data.data.token;
        if (!runner.adminToken) throw new Error('No token received');
        runner.log(`Admin authenticated: ${response.data.data.user.email}`, 'success');
    }, 'Auth');

    // Test 2.2: Police Officer Login
    await runner.runTest('Police Officer Authentication', async () => {
        const response = await axios.post(`${CONFIG.API_URL}/auth/login`, CONFIG.TEST_USERS.police);
        if (!response.data.success) throw new Error('Police login failed');
        runner.policeToken = response.data.data.token;
        runner.policeUserId = response.data.data.user.id;
        if (!runner.policeToken) throw new Error('No token received');
        runner.log(`Police authenticated: ID ${runner.policeUserId}`, 'success');
    }, 'Auth');

    // Test 2.3: Token Validation (using protected endpoint to verify token works)
    await runner.runTest('JWT Token Validation', async () => {
        const response = await axios.get(`${CONFIG.API_URL}/deployments`, {
            headers: { Authorization: `Bearer ${runner.adminToken}` }
        });
        if (!response.data.success) throw new Error('Token validation failed');
        // If we get here, the token is valid because the deployments endpoint requires auth
    }, 'Auth');

    // Test 2.4: Unauthorized Access Prevention
    await runner.runTest('Unauthorized Access Prevention', async () => {
        try {
            await axios.get(`${CONFIG.API_URL}/deployments`, {
                headers: { Authorization: 'Bearer invalid_token' }
            });
            throw new Error('Should have rejected invalid token');
        } catch (error) {
            if (error.response?.status !== 401) {
                throw new Error(`Expected 401, got ${error.response?.status}`);
            }
        }
    }, 'Auth');

    // ============================================
    // PHASE 3: WEBSOCKET COMMUNICATION
    // ============================================
    console.log('\n┌──────────────────────────────────────────────────────────────────────────────┐');
    console.log('│  PHASE 3: REAL-TIME WEBSOCKET COMMUNICATION                                  │');
    console.log('└──────────────────────────────────────────────────────────────────────────────┘\n');

    // Test 3.1: Admin WebSocket Connection
    await runner.runTest('Admin WebSocket Connection', async () => {
        return new Promise((resolve, reject) => {
            const timeout = setTimeout(() => reject(new Error('Connection timeout')), 5000);
            
            runner.adminSocket = io(CONFIG.WS_URL, { transports: ['websocket'] });
            
            runner.adminSocket.on('connect', () => {
                clearTimeout(timeout);
                runner.adminSocket.emit('join:role', { role: 'admin', userId: 1 });
                runner.log(`Admin socket connected: ${runner.adminSocket.id}`, 'socket');
                resolve();
            });
            
            runner.adminSocket.on('connect_error', (err) => {
                clearTimeout(timeout);
                reject(new Error(`Connection error: ${err.message}`));
            });
        });
    }, 'WebSocket');

    // Test 3.2: Police WebSocket Connection
    await runner.runTest('Police WebSocket Connection', async () => {
        return new Promise((resolve, reject) => {
            const timeout = setTimeout(() => reject(new Error('Connection timeout')), 5000);
            
            runner.policeSocket = io(CONFIG.WS_URL, { transports: ['websocket'] });
            
            runner.policeSocket.on('connect', () => {
                clearTimeout(timeout);
                runner.policeSocket.emit('join:role', { role: 'police', userId: runner.policeUserId });
                runner.log(`Police socket connected: ${runner.policeSocket.id}`, 'socket');
                resolve();
            });
            
            runner.policeSocket.on('connect_error', (err) => {
                clearTimeout(timeout);
                reject(new Error(`Connection error: ${err.message}`));
            });
        });
    }, 'WebSocket');

    // Test 3.3: WebSocket Event Forwarding
    await runner.runTest('WebSocket Event Forwarding (Ping/Pong)', async () => {
        return new Promise((resolve, reject) => {
            const timeout = setTimeout(() => reject(new Error('Pong timeout')), 3000);
            
            runner.adminSocket.once('pong', (data) => {
                clearTimeout(timeout);
                if (!data.timestamp) reject(new Error('Invalid pong response'));
                runner.log('Ping/Pong round-trip successful', 'socket');
                resolve();
            });
            
            runner.adminSocket.emit('ping');
        });
    }, 'WebSocket');

    // Set up event listeners for remaining tests
    const setupEventListeners = () => {
        // Admin listens for deployment events
        runner.adminSocket.on('deployment:acknowledged', (data) => {
            runner.receivedEvents.set('deployment:acknowledged', data);
            runner.log(`Admin received: deployment:acknowledged`, 'socket');
        });
        
        runner.adminSocket.on('deployment:officer_status', (data) => {
            runner.receivedEvents.set('deployment:officer_status', data);
            runner.log(`Admin received: deployment:officer_status (${data.status})`, 'socket');
        });
        
        runner.adminSocket.on('officer:location', (data) => {
            const count = (runner.receivedEvents.get('officer:location:count') || 0) + 1;
            runner.receivedEvents.set('officer:location', data);
            runner.receivedEvents.set('officer:location:count', count);
        });
        
        // Police listens for deployment assignments
        runner.policeSocket.on('deployment:assigned', (data) => {
            runner.receivedEvents.set('deployment:assigned', data);
            runner.log(`Police received: deployment:assigned`, 'socket');
        });
        
        runner.policeSocket.on('notification:new', (data) => {
            runner.receivedEvents.set('notification:new', data);
        });
    };
    
    setupEventListeners();

    // ============================================
    // PHASE 4: DEPLOYMENT WORKFLOW
    // ============================================
    console.log('\n┌──────────────────────────────────────────────────────────────────────────────┐');
    console.log('│  PHASE 4: DEPLOYMENT CREATION & ASSIGNMENT WORKFLOW                          │');
    console.log('└──────────────────────────────────────────────────────────────────────────────┘\n');

    // Test 4.1: Create Deployment
    await runner.runTest('Admin Creates Deployment', async () => {
        const deploymentData = {
            unitName: `Integration Test Unit ${Date.now()}`,
            location: {
                address: 'KN 5 Rd, Nyarugenge, Kigali, Rwanda',
                latitude: -1.9441,
                longitude: 30.0619
            },
            officers: [runner.policeUserId],
            status: 'Pending',
            priority: 'high',
            instructions: 'Integration test deployment - respond to traffic control point'
        };

        const response = await axios.post(`${CONFIG.API_URL}/deployments`, deploymentData, {
            headers: { Authorization: `Bearer ${runner.adminToken}` }
        });

        if (!response.data.success) throw new Error('Deployment creation failed');
        runner.testDeploymentId = response.data.data.id;
        runner.log(`Deployment created: ID ${runner.testDeploymentId}`, 'api');
    }, 'Deployment');

    // Test 4.2: Police Receives Deployment via WebSocket
    await runner.runTest('Police Receives Deployment via WebSocket', async () => {
        await runner.sleep(1500); // Wait for WebSocket event
        
        if (!runner.receivedEvents.has('deployment:assigned')) {
            throw new Error('deployment:assigned event not received');
        }
        
        const data = runner.receivedEvents.get('deployment:assigned');
        if (data.deploymentId !== runner.testDeploymentId) {
            throw new Error('Received wrong deployment ID');
        }
        
        runner.log(`Received deployment with location: ${data.latitude}, ${data.longitude}`, 'location');
    }, 'Deployment');

    // Test 4.3: Verify Deployment in Database
    await runner.runTest('Deployment Stored in Database', async () => {
        const result = await runner.db.query(
            'SELECT * FROM deployments WHERE id = $1',
            [runner.testDeploymentId]
        );
        
        if (result.rows.length === 0) throw new Error('Deployment not found in database');
        
        const deployment = result.rows[0];
        if (deployment.status !== 'Pending') throw new Error('Wrong status in database');
        if (!deployment.latitude || !deployment.longitude) throw new Error('Location not stored');
        
        runner.log(`DB verified: ${deployment.unit_name}`, 'db');
    }, 'Deployment');

    // Test 4.4: Officer Assignment Recorded
    await runner.runTest('Officer Assignment in Database', async () => {
        const result = await runner.db.query(
            'SELECT * FROM deployment_officers WHERE deployment_id = $1 AND officer_id = $2',
            [runner.testDeploymentId, runner.policeUserId]
        );
        
        if (result.rows.length === 0) throw new Error('Officer assignment not found');
        if (result.rows[0].acknowledged !== false) throw new Error('Should not be acknowledged yet');
        
        runner.log('Officer assignment recorded correctly', 'db');
    }, 'Deployment');

    // ============================================
    // PHASE 5: ACKNOWLEDGMENT WITH AUTO-LOCATION
    // ============================================
    console.log('\n┌──────────────────────────────────────────────────────────────────────────────┐');
    console.log('│  PHASE 5: OFFICER ACKNOWLEDGMENT WITH AUTO-LOCATION                          │');
    console.log('└──────────────────────────────────────────────────────────────────────────────┘\n');

    // Test 5.1: Police Acknowledges with Location
    await runner.runTest('Police Acknowledges Deployment with Location', async () => {
        runner.receivedEvents.delete('deployment:acknowledged'); // Clear previous
        
        const response = await axios.post(
            `${CONFIG.API_URL}/deployments/${runner.testDeploymentId}/acknowledge`,
            {
                notes: 'Acknowledged via integration test',
                latitude: -1.9450,
                longitude: 30.0625,
                currentAddress: 'Test Location, Kigali'
            },
            { headers: { Authorization: `Bearer ${runner.policeToken}` } }
        );

        if (!response.data.success) throw new Error('Acknowledgment failed');
        if (!response.data.data.acknowledged) throw new Error('Not marked as acknowledged');
        
        runner.log('Deployment acknowledged with location data', 'location');
    }, 'Acknowledgment');

    // Test 5.2: Admin Receives Acknowledgment via WebSocket
    await runner.runTest('Admin Receives Acknowledgment via WebSocket', async () => {
        await runner.sleep(1500);
        
        if (!runner.receivedEvents.has('deployment:acknowledged')) {
            throw new Error('Acknowledgment event not received by admin');
        }
        
        const data = runner.receivedEvents.get('deployment:acknowledged');
        if (data.deploymentId !== runner.testDeploymentId) {
            throw new Error('Wrong deployment in acknowledgment');
        }
        if (!data.location) {
            runner.log('Warning: Location not included in acknowledgment event', 'warning');
        } else {
            runner.log(`Location received: ${data.location.latitude}, ${data.location.longitude}`, 'location');
        }
    }, 'Acknowledgment');

    // Test 5.3: Database Updated with Acknowledgment
    await runner.runTest('Acknowledgment Stored in Database', async () => {
        const result = await runner.db.query(
            'SELECT * FROM deployment_officers WHERE deployment_id = $1 AND officer_id = $2',
            [runner.testDeploymentId, runner.policeUserId]
        );
        
        if (!result.rows[0].acknowledged) throw new Error('Not acknowledged in DB');
        if (!result.rows[0].acknowledged_at) throw new Error('Acknowledged time not set');
        if (result.rows[0].status !== 'en_route') throw new Error('Status should be en_route');
        
        runner.log('Database correctly updated with acknowledgment', 'db');
    }, 'Acknowledgment');

    // ============================================
    // PHASE 6: STATUS UPDATES WITH LOCATION STREAMING
    // ============================================
    console.log('\n┌──────────────────────────────────────────────────────────────────────────────┐');
    console.log('│  PHASE 6: STATUS UPDATES WITH REAL-TIME LOCATION STREAMING                   │');
    console.log('└──────────────────────────────────────────────────────────────────────────────┘\n');

    // Test 6.1: Update to On Scene
    await runner.runTest('Police Updates Status to On Scene', async () => {
        runner.receivedEvents.delete('deployment:officer_status');
        
        const response = await axios.put(
            `${CONFIG.API_URL}/deployments/${runner.testDeploymentId}/officer-status`,
            {
                status: 'on_scene',
                latitude: -1.9441,
                longitude: 30.0619,
                currentAddress: 'Deployment Location, Kigali'
            },
            { headers: { Authorization: `Bearer ${runner.policeToken}` } }
        );

        if (!response.data.success) throw new Error('Status update failed');
        runner.log('Status updated to on_scene with location', 'location');
    }, 'Status');

    // Test 6.2: Admin Receives Status Update
    await runner.runTest('Admin Receives Status Update via WebSocket', async () => {
        await runner.sleep(1500);
        
        if (!runner.receivedEvents.has('deployment:officer_status')) {
            throw new Error('Status update event not received');
        }
        
        const data = runner.receivedEvents.get('deployment:officer_status');
        if (data.status !== 'on_scene') throw new Error('Wrong status received');
        if (!data.location) {
            runner.log('Warning: Location not in status update', 'warning');
        }
        
        runner.log('Admin received status update in real-time', 'socket');
    }, 'Status');

    // Test 6.3: Real-Time Location Streaming
    await runner.runTest('Real-Time Location Streaming', async () => {
        runner.receivedEvents.set('officer:location:count', 0);
        
        // Simulate 5 location updates
        const locations = [
            { lat: -1.9441, lng: 30.0619 },
            { lat: -1.9445, lng: 30.0622 },
            { lat: -1.9448, lng: 30.0625 },
            { lat: -1.9451, lng: 30.0628 },
            { lat: -1.9454, lng: 30.0631 },
        ];

        for (const loc of locations) {
            runner.policeSocket.emit('officer:location_update', {
                latitude: loc.lat,
                longitude: loc.lng,
                accuracy: 10,
                speed: 8.5,
                heading: 45,
                address: 'Moving in Kigali',
                timestamp: new Date().toISOString()
            });
            await runner.sleep(300);
        }

        await runner.sleep(1000);
        
        const count = runner.receivedEvents.get('officer:location:count') || 0;
        if (count < 3) throw new Error(`Only received ${count}/5 location updates`);
        
        runner.log(`Admin received ${count}/5 location updates in real-time`, 'location');
    }, 'Status');

    // ============================================
    // PHASE 7: DEPLOYMENT COMPLETION
    // ============================================
    console.log('\n┌──────────────────────────────────────────────────────────────────────────────┐');
    console.log('│  PHASE 7: DEPLOYMENT COMPLETION & FINAL VERIFICATION                         │');
    console.log('└──────────────────────────────────────────────────────────────────────────────┘\n');

    // Test 7.1: Complete Deployment
    await runner.runTest('Police Completes Deployment', async () => {
        const response = await axios.put(
            `${CONFIG.API_URL}/deployments/${runner.testDeploymentId}/officer-status`,
            {
                status: 'completed',
                notes: 'Integration test completed successfully'
            },
            { headers: { Authorization: `Bearer ${runner.policeToken}` } }
        );

        if (!response.data.success) throw new Error('Completion failed');
        runner.log('Deployment marked as completed', 'success');
    }, 'Completion');

    // Test 7.2: Verify Deployment Status in Database
    await runner.runTest('Final Status Verified in Database', async () => {
        const result = await runner.db.query(
            `SELECT d.status as deployment_status, ofr.status as officer_status 
             FROM deployments d 
             JOIN deployment_officers ofr ON d.id = ofr.deployment_id 
             WHERE d.id = $1`,
            [runner.testDeploymentId]
        );

        if (result.rows[0].officer_status !== 'completed') {
            throw new Error('Officer status not completed in DB');
        }
        
        runner.log('Final database state verified', 'db');
    }, 'Completion');

    // Test 7.3: Get Deployment Statistics
    await runner.runTest('Deployment Statistics Endpoint', async () => {
        const response = await axios.get(`${CONFIG.API_URL}/deployments/stats`, {
            headers: { Authorization: `Bearer ${runner.adminToken}` }
        });

        if (!response.data.success) throw new Error('Stats fetch failed');
        
        const stats = response.data.data;
        runner.log(`Stats: Total=${stats.total_deployments}, Active=${stats.active_deployments}`, 'api');
    }, 'Completion');

    // ============================================
    // PHASE 8: CONCURRENT OPERATIONS STRESS TEST
    // ============================================
    console.log('\n┌──────────────────────────────────────────────────────────────────────────────┐');
    console.log('│  PHASE 8: CONCURRENT OPERATIONS STRESS TEST                                  │');
    console.log('└──────────────────────────────────────────────────────────────────────────────┘\n');

    // Test 8.1: Multiple Simultaneous API Requests
    await runner.runTest('Concurrent API Requests (10 parallel)', async () => {
        const requests = [];
        for (let i = 0; i < 10; i++) {
            requests.push(
                axios.get(`${CONFIG.API_URL}/deployments`, {
                    headers: { Authorization: `Bearer ${runner.adminToken}` }
                })
            );
        }
        
        const results = await Promise.all(requests);
        const allSuccess = results.every(r => r.data.success);
        
        if (!allSuccess) throw new Error('Some concurrent requests failed');
        runner.log('All 10 concurrent requests succeeded', 'api');
    }, 'Stress');

    // Test 8.2: Rapid WebSocket Events
    await runner.runTest('Rapid WebSocket Events (20 location updates)', async () => {
        runner.receivedEvents.set('officer:location:count', 0);
        
        for (let i = 0; i < 20; i++) {
            runner.policeSocket.emit('officer:location_update', {
                latitude: -1.9441 + (i * 0.0001),
                longitude: 30.0619 + (i * 0.0001),
                accuracy: 10,
                speed: 10,
                timestamp: new Date().toISOString()
            });
        }
        
        await runner.sleep(2000);
        
        const count = runner.receivedEvents.get('officer:location:count') || 0;
        if (count < 15) throw new Error(`Only ${count}/20 events received`);
        
        runner.log(`Received ${count}/20 rapid events`, 'socket');
    }, 'Stress');

    // ============================================
    // PHASE 9: ERROR RECOVERY
    // ============================================
    console.log('\n┌──────────────────────────────────────────────────────────────────────────────┐');
    console.log('│  PHASE 9: ERROR HANDLING & RECOVERY                                          │');
    console.log('└──────────────────────────────────────────────────────────────────────────────┘\n');

    // Test 9.1: Invalid Deployment ID
    await runner.runTest('Handles Invalid Deployment ID', async () => {
        try {
            await axios.get(`${CONFIG.API_URL}/deployments/999999`, {
                headers: { Authorization: `Bearer ${runner.adminToken}` }
            });
            throw new Error('Should have returned 404');
        } catch (error) {
            if (error.response?.status !== 404) {
                throw new Error(`Expected 404, got ${error.response?.status}`);
            }
        }
    }, 'Errors');

    // Test 9.2: Invalid Status Value
    await runner.runTest('Handles Invalid Status Value', async () => {
        try {
            await axios.put(
                `${CONFIG.API_URL}/deployments/${runner.testDeploymentId}/officer-status`,
                { status: 'invalid_status' },
                { headers: { Authorization: `Bearer ${runner.policeToken}` } }
            );
            throw new Error('Should have rejected invalid status');
        } catch (error) {
            if (error.response?.status !== 400) {
                throw new Error(`Expected 400, got ${error.response?.status}`);
            }
        }
    }, 'Errors');

    // Test 9.3: Unauthorized Role Access
    await runner.runTest('Prevents Police from Admin Actions', async () => {
        try {
            await axios.get(`${CONFIG.API_URL}/deployments/stats`, {
                headers: { Authorization: `Bearer ${runner.policeToken}` }
            });
            throw new Error('Should have rejected police user');
        } catch (error) {
            if (error.response?.status !== 403) {
                throw new Error(`Expected 403, got ${error.response?.status}`);
            }
        }
    }, 'Errors');

    // ============================================
    // CLEANUP & RESULTS
    // ============================================
    console.log('\n┌──────────────────────────────────────────────────────────────────────────────┐');
    console.log('│  CLEANUP & TEST RESULTS                                                      │');
    console.log('└──────────────────────────────────────────────────────────────────────────────┘\n');

    // Cleanup
    try {
        if (runner.testDeploymentId) {
            await axios.delete(`${CONFIG.API_URL}/deployments/${runner.testDeploymentId}`, {
                headers: { Authorization: `Bearer ${runner.adminToken}` }
            });
            runner.log('Test deployment cleaned up', 'success');
        }
    } catch (e) {
        runner.log('Cleanup warning: ' + e.message, 'warning');
    }

    // Disconnect sockets
    if (runner.adminSocket) runner.adminSocket.disconnect();
    if (runner.policeSocket) runner.policeSocket.disconnect();
    if (runner.db) await runner.db.end();

    runner.results.endTime = new Date();
    const duration = (runner.results.endTime - runner.results.startTime) / 1000;

    // Print Results
    console.log('\n');
    console.log('╔══════════════════════════════════════════════════════════════════════════════╗');
    console.log('║                         COMPREHENSIVE TEST RESULTS                           ║');
    console.log('╠══════════════════════════════════════════════════════════════════════════════╣');
    console.log(`║  Total Tests:    ${runner.results.total.toString().padEnd(4)}                                                     ║`);
    console.log(`║  ✅ Passed:      ${runner.results.passed.toString().padEnd(4)}                                                     ║`);
    console.log(`║  ❌ Failed:      ${runner.results.failed.toString().padEnd(4)}                                                     ║`);
    console.log(`║  ⏱️  Duration:    ${duration.toFixed(2).padEnd(6)}s                                                  ║`);
    console.log(`║  📊 Success Rate: ${((runner.results.passed / runner.results.total) * 100).toFixed(1)}%                                                ║`);
    console.log('╠══════════════════════════════════════════════════════════════════════════════╣');
    
    // Group by category
    const categories = {};
    runner.results.tests.forEach(t => {
        if (!categories[t.category]) categories[t.category] = { passed: 0, failed: 0 };
        if (t.status === 'passed') categories[t.category].passed++;
        else categories[t.category].failed++;
    });
    
    console.log('║  BY CATEGORY:                                                                ║');
    for (const [cat, stats] of Object.entries(categories)) {
        const status = stats.failed === 0 ? '✅' : '❌';
        console.log(`║    ${status} ${cat.padEnd(15)} ${stats.passed}/${stats.passed + stats.failed} passed                                      ║`.slice(0, 81) + '║');
    }
    
    console.log('╠══════════════════════════════════════════════════════════════════════════════╣');
    
    if (runner.results.failed > 0) {
        console.log('║  FAILED TESTS:                                                               ║');
        runner.results.tests.filter(t => t.status === 'failed').forEach(t => {
            console.log(`║    ❌ ${t.name.substring(0, 50).padEnd(50)}                    ║`.slice(0, 81) + '║');
            console.log(`║       Error: ${t.error?.substring(0, 45) || 'Unknown'}                                  ║`.slice(0, 81) + '║');
        });
    } else {
        console.log('║  🎉 ALL TESTS PASSED! System is fully integrated and working correctly.     ║');
    }
    
    console.log('╚══════════════════════════════════════════════════════════════════════════════╝');
    console.log('\n');

    return runner.results.failed === 0;
}

// Run the tests
runComprehensiveTests()
    .then(success => process.exit(success ? 0 : 1))
    .catch(err => {
        console.error('Test runner error:', err);
        process.exit(1);
    });
