/**
 * Deployment Flow Integration Test
 * Tests the complete flow: Admin creates deployment → Mobile receives → Officer acknowledges
 */

const io = require('socket.io-client');
const axios = require('axios');

const BASE_URL = 'http://localhost:3000';
const API = `${BASE_URL}/api`;

// Test data
let adminToken = null;
let policeToken = null;
let policeUserId = null;
let testDeploymentId = null;

// Socket connections
let adminSocket = null;
let policeSocket = null;

// Test results tracking
const testResults = {
    passed: 0,
    failed: 0,
    tests: []
};

function logTest(name, passed, details = '') {
    const status = passed ? '✅ PASS' : '❌ FAIL';
    console.log(`${status}: ${name}${details ? ` - ${details}` : ''}`);
    testResults.tests.push({ name, passed, details });
    if (passed) testResults.passed++;
    else testResults.failed++;
}

async function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

// ============================================
// SETUP: Login and get tokens
// ============================================

async function setupAuth() {
    console.log('\n🔐 Setting up authentication...\n');
    
    try {
        // Login as admin
        const adminLogin = await axios.post(`${API}/auth/login`, {
            email: 'deployment_admin@test.com',
            password: 'test123'
        });
        adminToken = adminLogin.data.data.token;
        logTest('Admin login', !!adminToken);
        
        // Login as police officer
        try {
            const policeLogin = await axios.post(`${API}/auth/login`, {
                email: 'deployment_police@test.com',
                password: 'test123'
            });
            policeToken = policeLogin.data.data.token;
            policeUserId = policeLogin.data.data.user.id;
            logTest('Police officer login', !!policeToken, `User ID: ${policeUserId}`);
        } catch (e) {
            // Create police officer if doesn't exist
            console.log('  Creating test police officer...');
            const createOfficer = await axios.post(`${API}/admin/officers`, {
                email: 'officer@trafficguard.rw',
                password: 'police123',
                full_name: 'Test Police Officer',
                badge_number: 'TRG-001',
                unit: 'Traffic Unit',
                phone: '+250788000001'
            }, {
                headers: { Authorization: `Bearer ${adminToken}` }
            });
            
            // Now login
            const policeLogin = await axios.post(`${API}/auth/login`, {
                email: 'officer@trafficguard.rw',
                password: 'police123'
            });
            policeToken = policeLogin.data.data.token;
            policeUserId = policeLogin.data.data.user.id;
            logTest('Police officer created and logged in', !!policeToken, `User ID: ${policeUserId}`);
        }
        
        return true;
    } catch (error) {
        console.error('Auth setup failed:', error.response?.data || error.message);
        logTest('Authentication setup', false, error.message);
        return false;
    }
}

// ============================================
// SETUP: WebSocket connections
// ============================================

async function setupWebSockets() {
    console.log('\n🔌 Setting up WebSocket connections...\n');
    
    return new Promise((resolve) => {
        let adminConnected = false;
        let policeConnected = false;
        
        // Admin socket
        adminSocket = io(BASE_URL, {
            transports: ['websocket'],
            timeout: 5000
        });
        
        adminSocket.on('connect', () => {
            console.log('  Admin socket connected:', adminSocket.id);
            adminSocket.emit('join:role', { role: 'admin', userId: 1 });
            adminConnected = true;
            checkBothConnected();
        });
        
        adminSocket.on('connect_error', (err) => {
            console.log('  Admin socket error:', err.message);
        });
        
        // Police socket
        policeSocket = io(BASE_URL, {
            transports: ['websocket'],
            timeout: 5000
        });
        
        policeSocket.on('connect', () => {
            console.log('  Police socket connected:', policeSocket.id);
            policeSocket.emit('join:role', { role: 'police', userId: policeUserId });
            policeConnected = true;
            checkBothConnected();
        });
        
        policeSocket.on('connect_error', (err) => {
            console.log('  Police socket error:', err.message);
        });
        
        function checkBothConnected() {
            if (adminConnected && policeConnected) {
                logTest('WebSocket connections established', true);
                setTimeout(resolve, 500); // Give time for room joins
            }
        }
        
        // Timeout after 5 seconds
        setTimeout(() => {
            if (!adminConnected || !policeConnected) {
                logTest('WebSocket connections', false, 'Connection timeout');
                resolve();
            }
        }, 5000);
    });
}

// ============================================
// TEST 1: Admin creates deployment for police officer
// ============================================

async function testAdminCreateDeployment() {
    console.log('\n📋 TEST 1: Admin creates deployment...\n');
    
    return new Promise(async (resolve) => {
        let receivedByPolice = false;
        
        // Set up listener for police to receive deployment
        policeSocket.on('deployment:assigned', (data) => {
            console.log('  📱 Police received deployment:assigned event!');
            console.log('    - Deployment ID:', data.deploymentId);
            console.log('    - Unit Name:', data.unitName);
            console.log('    - Address:', data.address);
            console.log('    - Location:', data.latitude, data.longitude);
            console.log('    - Priority:', data.priority);
            console.log('    - Requires Acknowledgment:', data.requiresAcknowledgment);
            receivedByPolice = true;
        });

        // Also listen for notification
        policeSocket.on('notification:new', (data) => {
            console.log('  🔔 Police received notification:', data.title);
        });
        
        try {
            // Admin creates deployment
            const deploymentData = {
                unitName: 'Test Unit Alpha-' + Date.now(),
                location: {
                    address: 'KN 5 Rd, Kigali, Rwanda',
                    latitude: -1.9403,
                    longitude: 30.0618
                },
                officers: [policeUserId],
                status: 'Pending',
                priority: 'high',
                instructions: 'Report to location for traffic control during peak hours'
            };
            
            console.log('  Admin creating deployment with:', JSON.stringify(deploymentData, null, 2));
            
            const response = await axios.post(`${API}/deployments`, deploymentData, {
                headers: { Authorization: `Bearer ${adminToken}` }
            });
            
            testDeploymentId = response.data.data.id;
            console.log('  ✅ Deployment created with ID:', testDeploymentId);
            
            logTest('Admin create deployment API', response.data.success, `ID: ${testDeploymentId}`);
            
            // Wait for socket event
            await sleep(2000);
            
            logTest('Police receives deployment via WebSocket', receivedByPolice);
            
        } catch (error) {
            console.error('  Create deployment failed:', error.response?.data || error.message);
            logTest('Admin create deployment', false, error.message);
        }
        
        resolve();
    });
}

// ============================================
// TEST 2: Police views their deployments
// ============================================

async function testPoliceViewDeployments() {
    console.log('\n📱 TEST 2: Police views their deployments...\n');
    
    try {
        const response = await axios.get(`${API}/deployments/my-deployments`, {
            headers: { Authorization: `Bearer ${policeToken}` }
        });
        
        console.log('  Police deployments count:', response.data.data.length);
        
        const ourDeployment = response.data.data.find(d => d.id === testDeploymentId);
        
        if (ourDeployment) {
            console.log('  Found our deployment:');
            console.log('    - ID:', ourDeployment.id);
            console.log('    - Unit Name:', ourDeployment.unit_name);
            console.log('    - Address:', ourDeployment.address);
            console.log('    - Location:', ourDeployment.latitude, ourDeployment.longitude);
            console.log('    - Status:', ourDeployment.status);
            console.log('    - Acknowledged:', ourDeployment.acknowledged);
            console.log('    - Instructions:', ourDeployment.instructions);
            
            logTest('Police can view deployment details', true);
            logTest('Deployment has location data', !!(ourDeployment.latitude && ourDeployment.longitude));
            logTest('Deployment shows as not acknowledged', ourDeployment.acknowledged === false);
        } else {
            logTest('Police can find their deployment', false, 'Deployment not in list');
        }
        
    } catch (error) {
        console.error('  View deployments failed:', error.response?.data || error.message);
        logTest('Police view deployments', false, error.message);
    }
}

// ============================================
// TEST 3: Police acknowledges deployment
// ============================================

async function testPoliceAcknowledgeDeployment() {
    console.log('\n✅ TEST 3: Police acknowledges deployment...\n');
    
    return new Promise(async (resolve) => {
        let adminReceivedAck = false;
        
        // Set up listener for admin to receive acknowledgment
        adminSocket.on('deployment:acknowledged', (data) => {
            console.log('  📡 Admin received acknowledgment event!');
            console.log('    - Deployment ID:', data.deploymentId);
            console.log('    - Officer Name:', data.officerName);
            console.log('    - Badge Number:', data.badgeNumber);
            console.log('    - Acknowledged At:', data.acknowledgedAt);
            console.log('    - All Acknowledged:', data.allAcknowledged);
            adminReceivedAck = true;
        });
        
        try {
            // Police acknowledges deployment
            const ackData = {
                notes: 'On my way, ETA 15 minutes',
                estimatedArrival: new Date(Date.now() + 15 * 60 * 1000).toISOString()
            };
            
            console.log('  Police acknowledging deployment...');
            
            const response = await axios.post(
                `${API}/deployments/${testDeploymentId}/acknowledge`,
                ackData,
                { headers: { Authorization: `Bearer ${policeToken}` } }
            );
            
            console.log('  ✅ Acknowledgment response:', response.data.message);
            console.log('    - Acknowledged:', response.data.data.acknowledged);
            console.log('    - Acknowledged At:', response.data.data.acknowledgedAt);
            
            logTest('Police acknowledge deployment API', response.data.success);
            
            // Wait for socket event
            await sleep(2000);
            
            logTest('Admin receives acknowledgment via WebSocket', adminReceivedAck);
            
        } catch (error) {
            console.error('  Acknowledge failed:', error.response?.data || error.message);
            logTest('Police acknowledge deployment', false, error.message);
        }
        
        resolve();
    });
}

// ============================================
// TEST 4: Police updates status (en_route → on_scene)
// ============================================

async function testPoliceUpdateStatus() {
    console.log('\n🚗 TEST 4: Police updates deployment status...\n');
    
    return new Promise(async (resolve) => {
        let adminReceivedStatus = false;
        
        // Set up listener for admin to receive status update
        adminSocket.on('deployment:officer_status', (data) => {
            console.log('  📡 Admin received status update!');
            console.log('    - Status:', data.status);
            console.log('    - Location:', data.location);
            adminReceivedStatus = true;
        });
        
        try {
            // Update to en_route
            console.log('  Police updating status to: en_route');
            
            let response = await axios.put(
                `${API}/deployments/${testDeploymentId}/officer-status`,
                {
                    status: 'en_route',
                    latitude: -1.9420,
                    longitude: 30.0625,
                    notes: 'Currently in traffic'
                },
                { headers: { Authorization: `Bearer ${policeToken}` } }
            );
            
            logTest('Update status to en_route', response.data.success);
            
            await sleep(1000);
            
            // Update to on_scene
            console.log('  Police updating status to: on_scene');
            
            response = await axios.put(
                `${API}/deployments/${testDeploymentId}/officer-status`,
                {
                    status: 'on_scene',
                    latitude: -1.9403,
                    longitude: 30.0618,
                    notes: 'Arrived at location'
                },
                { headers: { Authorization: `Bearer ${policeToken}` } }
            );
            
            logTest('Update status to on_scene', response.data.success);
            
            await sleep(2000);
            
            logTest('Admin receives status updates via WebSocket', adminReceivedStatus);
            
        } catch (error) {
            console.error('  Status update failed:', error.response?.data || error.message);
            logTest('Police update status', false, error.message);
        }
        
        resolve();
    });
}

// ============================================
// TEST 5: Verify final deployment state
// ============================================

async function testVerifyFinalState() {
    console.log('\n🔍 TEST 5: Verify final deployment state...\n');
    
    try {
        // Check from police side
        const policeView = await axios.get(`${API}/deployments/my-deployments?status=active`, {
            headers: { Authorization: `Bearer ${policeToken}` }
        });
        
        const deployment = policeView.data.data.find(d => d.id === testDeploymentId);
        
        if (deployment) {
            console.log('  Final deployment state:');
            console.log('    - Acknowledged:', deployment.acknowledged);
            console.log('    - Officer Status:', deployment.officer_status);
            console.log('    - Has Location:', !!(deployment.latitude && deployment.longitude));
            
            logTest('Deployment shows as acknowledged', deployment.acknowledged === true);
            logTest('Officer status is on_scene', deployment.officer_status === 'on_scene');
        }
        
        // Check stats from admin side
        const stats = await axios.get(`${API}/deployments/stats`, {
            headers: { Authorization: `Bearer ${adminToken}` }
        });
        
        console.log('\n  Deployment stats:', stats.data.data);
        logTest('Admin can see deployment stats', stats.data.success);
        
    } catch (error) {
        console.error('  Verify state failed:', error.response?.data || error.message);
        logTest('Verify final state', false, error.message);
    }
}

// ============================================
// TEST 6: Complete deployment
// ============================================

async function testCompleteDeployment() {
    console.log('\n🏁 TEST 6: Police completes deployment...\n');
    
    try {
        const response = await axios.put(
            `${API}/deployments/${testDeploymentId}/officer-status`,
            {
                status: 'completed',
                notes: 'Traffic control completed successfully. No incidents.'
            },
            { headers: { Authorization: `Bearer ${policeToken}` } }
        );
        
        console.log('  Deployment completed!');
        logTest('Police complete deployment', response.data.success);
        
    } catch (error) {
        console.error('  Complete deployment failed:', error.response?.data || error.message);
        logTest('Police complete deployment', false, error.message);
    }
}

// ============================================
// CLEANUP
// ============================================

async function cleanup() {
    console.log('\n🧹 Cleaning up...\n');
    
    if (adminSocket) adminSocket.disconnect();
    if (policeSocket) policeSocket.disconnect();
    
    // Optionally delete test deployment
    if (testDeploymentId && adminToken) {
        try {
            await axios.delete(`${API}/deployments/${testDeploymentId}`, {
                headers: { Authorization: `Bearer ${adminToken}` }
            });
            console.log('  Test deployment deleted');
        } catch (e) {
            console.log('  Could not delete test deployment:', e.message);
        }
    }
}

// ============================================
// MAIN
// ============================================

async function runTests() {
    console.log('╔════════════════════════════════════════════════════════════╗');
    console.log('║     DEPLOYMENT FLOW INTEGRATION TEST                       ║');
    console.log('║     Admin → Mobile App → Acknowledge → Location            ║');
    console.log('╚════════════════════════════════════════════════════════════╝');
    
    const startTime = Date.now();
    
    // Run tests
    const authOk = await setupAuth();
    if (!authOk) {
        console.log('\n❌ Auth failed, cannot continue tests');
        return;
    }
    
    await setupWebSockets();
    await testAdminCreateDeployment();
    await testPoliceViewDeployments();
    await testPoliceAcknowledgeDeployment();
    await testPoliceUpdateStatus();
    await testVerifyFinalState();
    await testCompleteDeployment();
    await cleanup();
    
    // Summary
    const duration = ((Date.now() - startTime) / 1000).toFixed(2);
    
    console.log('\n╔════════════════════════════════════════════════════════════╗');
    console.log('║                    TEST SUMMARY                            ║');
    console.log('╠════════════════════════════════════════════════════════════╣');
    console.log(`║  ✅ Passed: ${testResults.passed.toString().padEnd(3)} | ❌ Failed: ${testResults.failed.toString().padEnd(3)} | ⏱️  Time: ${duration}s`.padEnd(61) + '║');
    console.log('╠════════════════════════════════════════════════════════════╣');
    
    testResults.tests.forEach(t => {
        const icon = t.passed ? '✅' : '❌';
        const line = `║  ${icon} ${t.name}`.padEnd(61) + '║';
        console.log(line);
    });
    
    console.log('╚════════════════════════════════════════════════════════════╝');
    
    if (testResults.failed === 0) {
        console.log('\n🎉 ALL TESTS PASSED! Deployment flow is working correctly.');
    } else {
        console.log(`\n⚠️  ${testResults.failed} test(s) failed. Please review the issues above.`);
    }
    
    process.exit(testResults.failed > 0 ? 1 : 0);
}

// Run
runTests().catch(err => {
    console.error('Test runner error:', err);
    process.exit(1);
});
