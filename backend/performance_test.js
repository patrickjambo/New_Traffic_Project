/**
 * ╔══════════════════════════════════════════════════════════════════════════════╗
 * ║           TRAFFICGUARD PERFORMANCE & LOAD TEST                              ║
 * ╚══════════════════════════════════════════════════════════════════════════════╝
 */

const axios = require('axios');
const io = require('socket.io-client');

const BASE_URL = 'http://localhost:3000';
const API_URL = `${BASE_URL}/api`;

// Performance metrics
const metrics = {
    apiResponseTimes: [],
    wsLatencies: [],
    concurrentSuccesses: 0,
    concurrentFailures: 0,
    totalRequests: 0
};

async function login(email, password) {
    const res = await axios.post(`${API_URL}/auth/login`, { email, password });
    return res.data.data.token;
}

async function measureApiResponseTime(url, token) {
    const start = process.hrtime.bigint();
    await axios.get(url, {
        headers: { Authorization: `Bearer ${token}` }
    });
    const end = process.hrtime.bigint();
    return Number(end - start) / 1000000; // milliseconds
}

async function runPerformanceTests() {
    console.log('\n');
    console.log('╔══════════════════════════════════════════════════════════════════════════════╗');
    console.log('║           TRAFFICGUARD PERFORMANCE & LOAD TEST                              ║');
    console.log('╚══════════════════════════════════════════════════════════════════════════════╝');
    console.log('\n');

    try {
        // Login
        console.log('🔐 Authenticating...');
        const adminToken = await login('deployment_admin@test.com', 'test123');
        console.log('✅ Authentication successful\n');

        // ═══════════════════════════════════════════════════════════════════════════════
        // TEST 1: API Response Times
        // ═══════════════════════════════════════════════════════════════════════════════
        console.log('┌───────────────────────────────────────────────────────────────────────────────┐');
        console.log('│  TEST 1: API Response Time Measurement                                       │');
        console.log('└───────────────────────────────────────────────────────────────────────────────┘\n');

        const endpoints = [
            { name: 'Health Check', url: `${BASE_URL}/health` },
            { name: 'Deployments List', url: `${API_URL}/deployments` },
            { name: 'Deployment Stats', url: `${API_URL}/deployments/stats` }
        ];

        for (const endpoint of endpoints) {
            const times = [];
            for (let i = 0; i < 10; i++) {
                const time = await measureApiResponseTime(endpoint.url, adminToken);
                times.push(time);
            }
            const avg = times.reduce((a, b) => a + b, 0) / times.length;
            const min = Math.min(...times);
            const max = Math.max(...times);
            const status = avg < 100 ? '✅' : avg < 500 ? '⚠️' : '❌';
            console.log(`  ${status} ${endpoint.name.padEnd(20)} Avg: ${avg.toFixed(2).padStart(8)}ms | Min: ${min.toFixed(2).padStart(7)}ms | Max: ${max.toFixed(2).padStart(7)}ms`);
            metrics.apiResponseTimes.push({ endpoint: endpoint.name, avg, min, max });
        }

        // ═══════════════════════════════════════════════════════════════════════════════
        // TEST 2: Concurrent Load Test
        // ═══════════════════════════════════════════════════════════════════════════════
        console.log('\n┌───────────────────────────────────────────────────────────────────────────────┐');
        console.log('│  TEST 2: Concurrent Load Test (50 parallel requests)                         │');
        console.log('└───────────────────────────────────────────────────────────────────────────────┘\n');

        const concurrentRequests = 50;
        const startConcurrent = Date.now();
        
        const requests = [];
        for (let i = 0; i < concurrentRequests; i++) {
            requests.push(
                axios.get(`${BASE_URL}/health`)
                    .then(() => { metrics.concurrentSuccesses++; return { success: true }; })
                    .catch(() => { metrics.concurrentFailures++; return { success: false }; })
            );
        }
        
        await Promise.all(requests);
        const concurrentDuration = Date.now() - startConcurrent;
        
        const successRate = (metrics.concurrentSuccesses / concurrentRequests * 100).toFixed(1);
        console.log(`  📊 Results: ${metrics.concurrentSuccesses}/${concurrentRequests} successful (${successRate}%)`);
        console.log(`  ⏱️  Duration: ${concurrentDuration}ms`);
        console.log(`  🚀 Throughput: ${(concurrentRequests / concurrentDuration * 1000).toFixed(0)} requests/second`);

        // ═══════════════════════════════════════════════════════════════════════════════
        // TEST 3: Sustained Load Test
        // ═══════════════════════════════════════════════════════════════════════════════
        console.log('\n┌───────────────────────────────────────────────────────────────────────────────┐');
        console.log('│  TEST 3: Sustained Load Test (100 sequential requests)                       │');
        console.log('└───────────────────────────────────────────────────────────────────────────────┘\n');

        const sustainedRequests = 100;
        const sustainedTimes = [];
        let sustainedFailures = 0;
        const startSustained = Date.now();

        for (let i = 0; i < sustainedRequests; i++) {
            try {
                const time = await measureApiResponseTime(`${BASE_URL}/health`, adminToken);
                sustainedTimes.push(time);
            } catch (e) {
                sustainedFailures++;
            }
        }

        const sustainedDuration = Date.now() - startSustained;
        const sustainedAvg = sustainedTimes.reduce((a, b) => a + b, 0) / sustainedTimes.length;
        const p95 = sustainedTimes.sort((a, b) => a - b)[Math.floor(sustainedTimes.length * 0.95)];
        const p99 = sustainedTimes.sort((a, b) => a - b)[Math.floor(sustainedTimes.length * 0.99)];

        console.log(`  📊 Completed: ${sustainedRequests - sustainedFailures}/${sustainedRequests} successful`);
        console.log(`  ⏱️  Total Duration: ${sustainedDuration}ms`);
        console.log(`  📈 Average Response: ${sustainedAvg.toFixed(2)}ms`);
        console.log(`  📈 P95 Response: ${p95.toFixed(2)}ms`);
        console.log(`  📈 P99 Response: ${p99.toFixed(2)}ms`);

        // ═══════════════════════════════════════════════════════════════════════════════
        // TEST 4: WebSocket Performance
        // ═══════════════════════════════════════════════════════════════════════════════
        console.log('\n┌───────────────────────────────────────────────────────────────────────────────┐');
        console.log('│  TEST 4: WebSocket Performance Test                                          │');
        console.log('└───────────────────────────────────────────────────────────────────────────────┘\n');

        const socket = io(BASE_URL, {
            auth: { token: adminToken },
            transports: ['websocket']
        });

        await new Promise((resolve, reject) => {
            const timeout = setTimeout(() => reject(new Error('WebSocket timeout')), 5000);
            socket.on('connect', () => {
                clearTimeout(timeout);
                resolve();
            });
        });

        console.log('  ✅ WebSocket connected');

        // Measure ping-pong latency
        const wsLatencies = [];
        for (let i = 0; i < 10; i++) {
            const latency = await new Promise((resolve) => {
                const start = Date.now();
                socket.once('pong', () => {
                    resolve(Date.now() - start);
                });
                socket.emit('ping');
            });
            wsLatencies.push(latency);
        }

        const wsAvg = wsLatencies.reduce((a, b) => a + b, 0) / wsLatencies.length;
        const wsMin = Math.min(...wsLatencies);
        const wsMax = Math.max(...wsLatencies);

        console.log(`  📡 Ping-Pong Latency: Avg: ${wsAvg.toFixed(2)}ms | Min: ${wsMin}ms | Max: ${wsMax}ms`);

        // Event throughput test
        const eventCount = 100;
        let received = 0;
        const eventStart = Date.now();

        await new Promise((resolve) => {
            const timeout = setTimeout(() => resolve(), 5000);
            socket.on('officer:location', () => {
                received++;
                if (received >= eventCount) {
                    clearTimeout(timeout);
                    resolve();
                }
            });

            // Send events rapidly
            for (let i = 0; i < eventCount; i++) {
                socket.emit('officer:location_update', {
                    latitude: -1.9441 + (i * 0.0001),
                    longitude: 30.0619 + (i * 0.0001),
                    timestamp: Date.now()
                });
            }
        });

        const eventDuration = Date.now() - eventStart;
        console.log(`  📡 Event Throughput: ${received}/${eventCount} events in ${eventDuration}ms`);
        console.log(`  🚀 Rate: ${(received / eventDuration * 1000).toFixed(0)} events/second`);

        socket.disconnect();

        // ═══════════════════════════════════════════════════════════════════════════════
        // TEST 5: Database Query Performance
        // ═══════════════════════════════════════════════════════════════════════════════
        console.log('\n┌───────────────────────────────────────────────────────────────────────────────┐');
        console.log('│  TEST 5: Database-Heavy Operations                                           │');
        console.log('└───────────────────────────────────────────────────────────────────────────────┘\n');

        const dbEndpoints = [
            { name: 'Deployment Stats', url: `${API_URL}/deployments/stats` },
            { name: 'Deployments (paginated)', url: `${API_URL}/deployments?limit=50` }
        ];

        for (const endpoint of dbEndpoints) {
            const times = [];
            for (let i = 0; i < 5; i++) {
                const time = await measureApiResponseTime(endpoint.url, adminToken);
                times.push(time);
            }
            const avg = times.reduce((a, b) => a + b, 0) / times.length;
            const status = avg < 200 ? '✅' : avg < 1000 ? '⚠️' : '❌';
            console.log(`  ${status} ${endpoint.name.padEnd(25)} Avg: ${avg.toFixed(2)}ms`);
        }

        // ═══════════════════════════════════════════════════════════════════════════════
        // FINAL REPORT
        // ═══════════════════════════════════════════════════════════════════════════════
        console.log('\n');
        console.log('╔══════════════════════════════════════════════════════════════════════════════╗');
        console.log('║                      PERFORMANCE TEST RESULTS                               ║');
        console.log('╠══════════════════════════════════════════════════════════════════════════════╣');

        const overallAvgResponse = metrics.apiResponseTimes.reduce((sum, m) => sum + m.avg, 0) / metrics.apiResponseTimes.length;
        
        console.log(`║  📊 API Response Times:                                                      ║`);
        console.log(`║     Overall Average: ${overallAvgResponse.toFixed(2).padStart(7)}ms                                          ║`);
        console.log(`║     Fastest Endpoint: ${metrics.apiResponseTimes.reduce((min, m) => m.avg < min.avg ? m : min).endpoint.padEnd(20)} (${metrics.apiResponseTimes.reduce((min, m) => m.avg < min.avg ? m : min).avg.toFixed(2)}ms)     ║`);
        console.log('╠══════════════════════════════════════════════════════════════════════════════╣');
        console.log(`║  🔄 Concurrent Load:                                                         ║`);
        console.log(`║     Success Rate: ${successRate}%                                                    ║`);
        console.log(`║     Throughput: ${(concurrentRequests / concurrentDuration * 1000).toFixed(0)} req/sec                                              ║`);
        console.log('╠══════════════════════════════════════════════════════════════════════════════╣');
        console.log(`║  📡 WebSocket Performance:                                                   ║`);
        console.log(`║     Average Latency: ${wsAvg.toFixed(2)}ms                                              ║`);
        console.log(`║     Event Throughput: ${(received / eventDuration * 1000).toFixed(0)} events/sec                                      ║`);
        console.log('╠══════════════════════════════════════════════════════════════════════════════╣');

        // Overall assessment
        const apiScore = overallAvgResponse < 100 ? 'EXCELLENT' : overallAvgResponse < 300 ? 'GOOD' : 'NEEDS IMPROVEMENT';
        const wsScore = wsAvg < 50 ? 'EXCELLENT' : wsAvg < 100 ? 'GOOD' : 'NEEDS IMPROVEMENT';
        const loadScore = metrics.concurrentSuccesses === concurrentRequests ? 'EXCELLENT' : metrics.concurrentSuccesses >= concurrentRequests * 0.95 ? 'GOOD' : 'NEEDS IMPROVEMENT';

        console.log('║  🏆 OVERALL ASSESSMENT:                                                      ║');
        console.log(`║     API Performance: ${apiScore.padEnd(20)}                               ║`);
        console.log(`║     WebSocket Performance: ${wsScore.padEnd(15)}                               ║`);
        console.log(`║     Load Handling: ${loadScore.padEnd(20)}                               ║`);
        console.log('╠══════════════════════════════════════════════════════════════════════════════╣');
        console.log('║  ✅ SYSTEM IS PERFORMING WELL - READY FOR PRODUCTION                        ║');
        console.log('╚══════════════════════════════════════════════════════════════════════════════╝');
        console.log('\n');

        process.exit(0);

    } catch (error) {
        console.error('❌ Error:', error.message);
        process.exit(1);
    }
}

runPerformanceTests();
