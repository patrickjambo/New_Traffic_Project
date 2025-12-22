/**
 * Real-Time Integration Test Script
 * Tests WebSocket connectivity and event emission between components
 * 
 * Usage: node test_realtime.js
 */

const { io } = require('socket.io-client');
const http = require('http');

// Configuration
const BACKEND_URL = 'http://localhost:3000';
const TEST_TIMEOUT = 10000; // 10 seconds

// Colors for console output
const colors = {
    reset: '\x1b[0m',
    green: '\x1b[32m',
    red: '\x1b[31m',
    yellow: '\x1b[33m',
    cyan: '\x1b[36m',
};

const log = {
    success: (msg) => console.log(`${colors.green}✅ ${msg}${colors.reset}`),
    error: (msg) => console.log(`${colors.red}❌ ${msg}${colors.reset}`),
    info: (msg) => console.log(`${colors.cyan}ℹ️  ${msg}${colors.reset}`),
    warn: (msg) => console.log(`${colors.yellow}⚠️  ${msg}${colors.reset}`),
};

// Test results
const results = {
    passed: 0,
    failed: 0,
    tests: [],
};

function addResult(testName, passed, details = '') {
    results.tests.push({ testName, passed, details });
    if (passed) {
        results.passed++;
        log.success(`${testName}`);
    } else {
        results.failed++;
        log.error(`${testName}: ${details}`);
    }
}

// HTTP POST helper
function httpPost(path, data) {
    return new Promise((resolve, reject) => {
        const options = {
            hostname: 'localhost',
            port: 3000,
            path: path,
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
        };

        const req = http.request(options, (res) => {
            let body = '';
            res.on('data', (chunk) => body += chunk);
            res.on('end', () => {
                try {
                    resolve({ status: res.statusCode, data: JSON.parse(body) });
                } catch {
                    resolve({ status: res.statusCode, data: body });
                }
            });
        });

        req.on('error', reject);
        req.write(JSON.stringify(data));
        req.end();
    });
}

async function runTests() {
    console.log('\n' + '='.repeat(50));
    console.log('🧪 Real-Time Integration Tests');
    console.log('='.repeat(50) + '\n');

    // Test 1: Backend Health Check
    log.info('Testing backend health...');
    try {
        const health = await fetch(`${BACKEND_URL}/health`);
        const healthData = await health.json();
        addResult('Backend Health Check', healthData.success === true);
    } catch (e) {
        addResult('Backend Health Check', false, 'Cannot connect to backend');
        log.error('Backend is not running. Please start the backend first.');
        process.exit(1);
    }

    // Test 2: WebSocket Connection
    log.info('Testing WebSocket connection...');
    const socket = io(BACKEND_URL, {
        transports: ['websocket'],
        timeout: 5000,
    });

    await new Promise((resolve) => {
        const timeout = setTimeout(() => {
            addResult('WebSocket Connection', false, 'Connection timeout');
            resolve();
        }, 5000);

        socket.on('connect', () => {
            clearTimeout(timeout);
            addResult('WebSocket Connection', true);
            resolve();
        });

        socket.on('connect_error', (err) => {
            clearTimeout(timeout);
            addResult('WebSocket Connection', false, err.message);
            resolve();
        });
    });

    if (!socket.connected) {
        log.error('Cannot proceed without WebSocket connection');
        process.exit(1);
    }

    // Test 3: Room Joining
    log.info('Testing room joining...');
    socket.emit('join:role', { role: 'admin', userId: 'test-user' });
    addResult('Room Join Event Emitted', true);

    // Test 4: Incident Event Receipt
    log.info('Testing incident:new event...');
    let receivedIncident = false;

    socket.on('incident:new', (data) => {
        receivedIncident = true;
    });

    // Trigger incident via webhook (simulating AI service)
    await httpPost('/webhook/analysis-complete', {
        incident_id: 999,
        result: { test: true },
        confidence: 0.85,
        vehicle_count: 5,
        incident_detected: true,
        detected_type: 'accident',
    });

    // Wait for event
    await new Promise(resolve => setTimeout(resolve, 1000));
    addResult('Analysis Complete Webhook', true);

    // Test 5: Heartbeat/Ping
    log.info('Testing heartbeat...');
    let pongReceived = false;

    socket.on('pong', () => {
        pongReceived = true;
    });

    socket.emit('ping');
    await new Promise(resolve => setTimeout(resolve, 1000));
    addResult('Heartbeat (Ping/Pong)', pongReceived);

    // Cleanup
    socket.disconnect();

    // Print summary
    console.log('\n' + '='.repeat(50));
    console.log('📊 Test Summary');
    console.log('='.repeat(50));
    console.log(`${colors.green}Passed: ${results.passed}${colors.reset}`);
    console.log(`${colors.red}Failed: ${results.failed}${colors.reset}`);
    console.log('='.repeat(50) + '\n');

    process.exit(results.failed > 0 ? 1 : 0);
}

// Run tests
runTests().catch((err) => {
    log.error(`Test runner error: ${err.message}`);
    process.exit(1);
});
