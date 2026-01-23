/**
 * ╔══════════════════════════════════════════════════════════════════════════════╗
 * ║                    TRAFFICGUARD LOAD & METRICS TEST                          ║
 * ║              Comprehensive System Load Testing with Metrics                  ║
 * ╚══════════════════════════════════════════════════════════════════════════════╝
 */

const axios = require('axios');
const io = require('socket.io-client');

const CONFIG = {
    BASE_URL: 'http://localhost:3000',
    API_URL: 'http://localhost:3000/api'
};

const metrics = {
    api: { requests: 0, successes: 0, failures: 0, responseTimes: [] },
    ws: { connections: 0, events: 0, latencies: [] },
    memory: { start: null, peak: null, end: null }
};

async function login() {
    const res = await axios.post(`${CONFIG.API_URL}/auth/login`, {
        email: 'deployment_admin@test.com',
        password: 'test123'
    });
    return res.data.data.token;
}

async function measureRequest(url, token) {
    const start = process.hrtime.bigint();
    try {
        await axios.get(url, { headers: { Authorization: `Bearer ${token}` } });
        metrics.api.successes++;
        const duration = Number(process.hrtime.bigint() - start) / 1e6;
        metrics.api.responseTimes.push(duration);
        return { success: true, duration };
    } catch (e) {
        metrics.api.failures++;
        return { success: false };
    } finally {
        metrics.api.requests++;
    }
}

function calculatePercentile(arr, p) {
    const sorted = [...arr].sort((a, b) => a - b);
    const index = Math.ceil((p / 100) * sorted.length) - 1;
    return sorted[Math.max(0, index)];
}

async function runLoadTest() {
    console.log('\n');
    console.log('╔══════════════════════════════════════════════════════════════════════════════╗');
    console.log('║                    TRAFFICGUARD LOAD & METRICS TEST                          ║');
    console.log('║              Comprehensive System Load Testing with Metrics                  ║');
    console.log('╚══════════════════════════════════════════════════════════════════════════════╝');
    console.log('\n');

    const token = await login();
    console.log('✅ Authentication successful\n');

    // ═══════════════════════════════════════════════════════════════════════════════
    // LOAD TEST 1: SUSTAINED API LOAD
    // ═══════════════════════════════════════════════════════════════════════════════
    console.log('┌───────────────────────────────────────────────────────────────────────────────┐');
    console.log('│  LOAD TEST 1: SUSTAINED API LOAD - 500 requests over 10 seconds              │');
    console.log('└───────────────────────────────────────────────────────────────────────────────┘\n');

    const totalRequests = 500;
    const duration = 10000; // 10 seconds
    const interval = duration / totalRequests;
    
    const startTime = Date.now();
    const requests = [];
    
    for (let i = 0; i < totalRequests; i++) {
        requests.push(measureRequest(`${CONFIG.BASE_URL}/health`, token));
        if (i % 50 === 0) {
            process.stdout.write(`\r  Progress: ${i}/${totalRequests} requests...`);
        }
        await new Promise(r => setTimeout(r, interval));
    }
    
    await Promise.all(requests);
    const totalDuration = Date.now() - startTime;
    
    console.log(`\r  ✅ Completed ${totalRequests} requests in ${(totalDuration/1000).toFixed(1)}s`);
    console.log(`     Throughput: ${(totalRequests / (totalDuration/1000)).toFixed(1)} req/sec`);
    console.log(`     Success Rate: ${((metrics.api.successes / metrics.api.requests) * 100).toFixed(1)}%`);

    // ═══════════════════════════════════════════════════════════════════════════════
    // LOAD TEST 2: BURST LOAD
    // ═══════════════════════════════════════════════════════════════════════════════
    console.log('\n┌───────────────────────────────────────────────────────────────────────────────┐');
    console.log('│  LOAD TEST 2: BURST LOAD - 100 concurrent requests                           │');
    console.log('└───────────────────────────────────────────────────────────────────────────────┘\n');

    const burstSize = 100;
    const burstStart = Date.now();
    
    const burstRequests = [];
    for (let i = 0; i < burstSize; i++) {
        burstRequests.push(measureRequest(`${CONFIG.API_URL}/deployments`, token));
    }
    
    await Promise.all(burstRequests);
    const burstDuration = Date.now() - burstStart;
    
    console.log(`  ✅ Burst completed in ${burstDuration}ms`);
    console.log(`     Peak throughput: ${(burstSize / (burstDuration/1000)).toFixed(0)} req/sec`);

    // ═══════════════════════════════════════════════════════════════════════════════
    // LOAD TEST 3: WEBSOCKET LOAD
    // ═══════════════════════════════════════════════════════════════════════════════
    console.log('\n┌───────────────────────────────────────────────────────────────────────────────┐');
    console.log('│  LOAD TEST 3: WEBSOCKET LOAD - 30 connections, 1000 events                   │');
    console.log('└───────────────────────────────────────────────────────────────────────────────┘\n');

    const sockets = [];
    const wsConnectStart = Date.now();
    
    // Create 30 connections
    for (let i = 0; i < 30; i++) {
        const socket = io(CONFIG.BASE_URL, {
            auth: { token },
            transports: ['websocket'],
            reconnection: false
        });
        
        await new Promise((resolve, reject) => {
            const timeout = setTimeout(() => reject(new Error('Timeout')), 5000);
            socket.on('connect', () => {
                clearTimeout(timeout);
                metrics.ws.connections++;
                resolve();
            });
            socket.on('connect_error', reject);
        });
        
        sockets.push(socket);
    }
    
    const wsConnectDuration = Date.now() - wsConnectStart;
    console.log(`  ✅ 30 WebSocket connections established in ${wsConnectDuration}ms`);
    
    // Send events
    const eventStart = Date.now();
    let eventsReceived = 0;
    
    // Set up listeners
    sockets.forEach(s => {
        s.on('officer:location', () => {
            eventsReceived++;
            metrics.ws.events++;
        });
        s.emit('join:role', { role: 'admin', userId: 1 });
    });
    
    await new Promise(r => setTimeout(r, 200));
    
    // Send 1000 events from first socket
    for (let i = 0; i < 1000; i++) {
        sockets[0].emit('officer:location_update', {
            latitude: -1.9441 + (Math.random() * 0.01),
            longitude: 30.0619 + (Math.random() * 0.01),
            timestamp: Date.now()
        });
    }
    
    await new Promise(r => setTimeout(r, 2000));
    const eventDuration = Date.now() - eventStart;
    
    console.log(`  ✅ Events processed in ${eventDuration}ms`);
    console.log(`     Events received across clients: ${eventsReceived}`);
    
    // Cleanup
    sockets.forEach(s => s.disconnect());

    // ═══════════════════════════════════════════════════════════════════════════════
    // LOAD TEST 4: MIXED WORKLOAD
    // ═══════════════════════════════════════════════════════════════════════════════
    console.log('\n┌───────────────────────────────────────────────────────────────────────────────┐');
    console.log('│  LOAD TEST 4: MIXED WORKLOAD - Simulating Real Usage                         │');
    console.log('└───────────────────────────────────────────────────────────────────────────────┘\n');

    const mixedStart = Date.now();
    const mixedRequests = [];
    
    // 40% health checks, 30% deployments list, 20% stats, 10% create
    for (let i = 0; i < 100; i++) {
        const rand = Math.random();
        if (rand < 0.4) {
            mixedRequests.push(measureRequest(`${CONFIG.BASE_URL}/health`, token));
        } else if (rand < 0.7) {
            mixedRequests.push(measureRequest(`${CONFIG.API_URL}/deployments`, token));
        } else if (rand < 0.9) {
            mixedRequests.push(measureRequest(`${CONFIG.API_URL}/deployments/stats`, token));
        } else {
            mixedRequests.push(
                axios.post(`${CONFIG.API_URL}/deployments`, {
                    unitName: `Load Test ${Date.now()}`,
                    location: { address: 'Load Test', latitude: -1.9441, longitude: 30.0619 },
                    priority: 'normal'
                }, { headers: { Authorization: `Bearer ${token}` } })
                .then(() => { metrics.api.successes++; })
                .catch(() => { metrics.api.failures++; })
            );
            metrics.api.requests++;
        }
    }
    
    await Promise.all(mixedRequests);
    const mixedDuration = Date.now() - mixedStart;
    
    console.log(`  ✅ Mixed workload completed in ${mixedDuration}ms`);

    // ═══════════════════════════════════════════════════════════════════════════════
    // METRICS SUMMARY
    // ═══════════════════════════════════════════════════════════════════════════════
    console.log('\n');
    console.log('╔══════════════════════════════════════════════════════════════════════════════╗');
    console.log('║                         LOAD TEST METRICS SUMMARY                           ║');
    console.log('╠══════════════════════════════════════════════════════════════════════════════╣');
    
    const avgResponse = metrics.api.responseTimes.reduce((a, b) => a + b, 0) / metrics.api.responseTimes.length;
    const p50 = calculatePercentile(metrics.api.responseTimes, 50);
    const p95 = calculatePercentile(metrics.api.responseTimes, 95);
    const p99 = calculatePercentile(metrics.api.responseTimes, 99);
    const minResponse = Math.min(...metrics.api.responseTimes);
    const maxResponse = Math.max(...metrics.api.responseTimes);
    
    console.log('║                                                                              ║');
    console.log('║  📊 API METRICS:                                                             ║');
    console.log(`║     Total Requests:    ${metrics.api.requests.toString().padEnd(10)}                                      ║`);
    console.log(`║     Successful:        ${metrics.api.successes.toString().padEnd(10)}                                      ║`);
    console.log(`║     Failed:            ${metrics.api.failures.toString().padEnd(10)}                                      ║`);
    console.log(`║     Success Rate:      ${((metrics.api.successes / metrics.api.requests) * 100).toFixed(1)}%                                            ║`);
    console.log('║                                                                              ║');
    console.log('║  ⏱️  RESPONSE TIME METRICS:                                                   ║');
    console.log(`║     Average:           ${avgResponse.toFixed(2).padEnd(10)}ms                                    ║`);
    console.log(`║     Minimum:           ${minResponse.toFixed(2).padEnd(10)}ms                                    ║`);
    console.log(`║     Maximum:           ${maxResponse.toFixed(2).padEnd(10)}ms                                    ║`);
    console.log(`║     P50 (Median):      ${p50.toFixed(2).padEnd(10)}ms                                    ║`);
    console.log(`║     P95:               ${p95.toFixed(2).padEnd(10)}ms                                    ║`);
    console.log(`║     P99:               ${p99.toFixed(2).padEnd(10)}ms                                    ║`);
    console.log('║                                                                              ║');
    console.log('║  📡 WEBSOCKET METRICS:                                                       ║');
    console.log(`║     Connections:       ${metrics.ws.connections.toString().padEnd(10)}                                      ║`);
    console.log(`║     Events Processed:  ${metrics.ws.events.toString().padEnd(10)}                                      ║`);
    console.log('║                                                                              ║');
    console.log('╠══════════════════════════════════════════════════════════════════════════════╣');
    
    // Performance Grade
    let grade = 'A+';
    if (avgResponse > 50) grade = 'A';
    if (avgResponse > 100) grade = 'B';
    if (avgResponse > 200) grade = 'C';
    if (avgResponse > 500) grade = 'D';
    if (metrics.api.failures / metrics.api.requests > 0.01) grade = 'B';
    if (metrics.api.failures / metrics.api.requests > 0.05) grade = 'C';
    
    console.log(`║  🏆 PERFORMANCE GRADE: ${grade}                                                   ║`);
    console.log('║                                                                              ║');
    
    if (grade === 'A+' || grade === 'A') {
        console.log('║  🎉 EXCELLENT! System handles load seamlessly and efficiently!              ║');
    } else if (grade === 'B') {
        console.log('║  ✅ GOOD! System performs well under load with minor issues.                ║');
    } else {
        console.log('║  ⚠️  NEEDS ATTENTION! Performance could be improved.                         ║');
    }
    
    console.log('╚══════════════════════════════════════════════════════════════════════════════╝');
    console.log('\n');
}

runLoadTest().catch(console.error);
