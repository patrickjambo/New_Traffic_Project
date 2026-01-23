/**
 * ╔══════════════════════════════════════════════════════════════════════════════╗
 * ║                    TRAFFICGUARD API CONTRACT TEST                            ║
 * ║              Testing API Responses Match Expected Schema                     ║
 * ╚══════════════════════════════════════════════════════════════════════════════╝
 * 
 * This validates that API responses:
 * - Match expected JSON schema
 * - Return correct HTTP status codes
 * - Include required fields
 * - Have correct data types
 */

const axios = require('axios');

const CONFIG = {
    API_URL: 'http://localhost:3000/api',
    BASE_URL: 'http://localhost:3000'
};

const results = { passed: 0, failed: 0, tests: [] };

function validateSchema(data, schema, path = '') {
    const errors = [];
    
    for (const [key, rules] of Object.entries(schema)) {
        const fullPath = path ? `${path}.${key}` : key;
        const value = data?.[key];
        
        // Check required
        if (rules.required && (value === undefined || value === null)) {
            errors.push(`${fullPath} is required but missing`);
            continue;
        }
        
        if (value === undefined || value === null) continue;
        
        // Check type
        if (rules.type) {
            const actualType = Array.isArray(value) ? 'array' : typeof value;
            if (rules.type !== actualType) {
                errors.push(`${fullPath} should be ${rules.type} but is ${actualType}`);
            }
        }
        
        // Check nested object
        if (rules.properties && typeof value === 'object' && !Array.isArray(value)) {
            errors.push(...validateSchema(value, rules.properties, fullPath));
        }
        
        // Check array items
        if (rules.items && Array.isArray(value)) {
            value.forEach((item, index) => {
                if (rules.items.properties) {
                    errors.push(...validateSchema(item, rules.items.properties, `${fullPath}[${index}]`));
                }
            });
        }
    }
    
    return errors;
}

async function login(email, password) {
    const res = await axios.post(`${CONFIG.API_URL}/auth/login`, { email, password });
    return res.data.data;
}

async function runContractTest(name, testFn) {
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

async function runContractTests() {
    console.log('\n');
    console.log('╔══════════════════════════════════════════════════════════════════════════════╗');
    console.log('║                    TRAFFICGUARD API CONTRACT TEST                            ║');
    console.log('║              Testing API Responses Match Expected Schema                     ║');
    console.log('╚══════════════════════════════════════════════════════════════════════════════╝');
    console.log('\n');

    let adminToken, policeToken;

    try {
        // Setup
        const adminAuth = await login('deployment_admin@test.com', 'test123');
        adminToken = adminAuth.token;
        
        const policeAuth = await login('deployment_police@test.com', 'test123');
        policeToken = policeAuth.token;

        // ═══════════════════════════════════════════════════════════════════════════════
        // CONTRACT TEST 1: HEALTH ENDPOINT
        // ═══════════════════════════════════════════════════════════════════════════════
        console.log('┌───────────────────────────────────────────────────────────────────────────────┐');
        console.log('│  CONTRACT 1: HEALTH ENDPOINT                                                 │');
        console.log('└───────────────────────────────────────────────────────────────────────────────┘\n');

        await runContractTest('Health endpoint returns correct schema', async () => {
            const res = await axios.get(`${CONFIG.BASE_URL}/health`);
            
            const schema = {
                success: { required: true, type: 'boolean' },
                message: { required: true, type: 'string' },
                timestamp: { required: true, type: 'string' },
                uptime: { required: true, type: 'number' }
            };
            
            const errors = validateSchema(res.data, schema);
            if (errors.length > 0) throw new Error(errors.join(', '));
            if (res.status !== 200) throw new Error(`Expected 200, got ${res.status}`);
        });

        // ═══════════════════════════════════════════════════════════════════════════════
        // CONTRACT TEST 2: AUTH ENDPOINTS
        // ═══════════════════════════════════════════════════════════════════════════════
        console.log('\n┌───────────────────────────────────────────────────────────────────────────────┐');
        console.log('│  CONTRACT 2: AUTH ENDPOINTS                                                  │');
        console.log('└───────────────────────────────────────────────────────────────────────────────┘\n');

        await runContractTest('Login response has correct schema', async () => {
            const res = await axios.post(`${CONFIG.API_URL}/auth/login`, {
                email: 'deployment_admin@test.com',
                password: 'test123'
            });
            
            const schema = {
                success: { required: true, type: 'boolean' },
                data: {
                    required: true,
                    type: 'object',
                    properties: {
                        token: { required: true, type: 'string' },
                        user: {
                            required: true,
                            type: 'object',
                            properties: {
                                id: { required: true, type: 'number' },
                                email: { required: true, type: 'string' },
                                role: { required: true, type: 'string' }
                            }
                        }
                    }
                }
            };
            
            const errors = validateSchema(res.data, schema);
            if (errors.length > 0) throw new Error(errors.join(', '));
        });

        await runContractTest('Login error response has correct schema', async () => {
            try {
                await axios.post(`${CONFIG.API_URL}/auth/login`, {
                    email: 'wrong@email.com',
                    password: 'wrongpassword'
                });
                throw new Error('Should have failed');
            } catch (e) {
                if (e.message === 'Should have failed') throw e;
                
                const schema = {
                    success: { required: true, type: 'boolean' },
                    message: { required: true, type: 'string' }
                };
                
                const errors = validateSchema(e.response.data, schema);
                if (errors.length > 0) throw new Error(errors.join(', '));
                if (e.response.data.success !== false) throw new Error('success should be false');
            }
        });

        // ═══════════════════════════════════════════════════════════════════════════════
        // CONTRACT TEST 3: DEPLOYMENTS ENDPOINTS
        // ═══════════════════════════════════════════════════════════════════════════════
        console.log('\n┌───────────────────────────────────────────────────────────────────────────────┐');
        console.log('│  CONTRACT 3: DEPLOYMENTS ENDPOINTS                                           │');
        console.log('└───────────────────────────────────────────────────────────────────────────────┘\n');

        await runContractTest('GET /deployments returns array schema', async () => {
            const res = await axios.get(`${CONFIG.API_URL}/deployments`, {
                headers: { Authorization: `Bearer ${adminToken}` }
            });
            
            const schema = {
                success: { required: true, type: 'boolean' },
                data: { required: true, type: 'array' }
            };
            
            const errors = validateSchema(res.data, schema);
            if (errors.length > 0) throw new Error(errors.join(', '));
        });

        await runContractTest('POST /deployments returns created deployment schema', async () => {
            const res = await axios.post(`${CONFIG.API_URL}/deployments`, {
                unitName: `Contract Test ${Date.now()}`,
                location: { address: 'Contract Test Location', latitude: -1.9441, longitude: 30.0619 },
                priority: 'normal'
            }, {
                headers: { Authorization: `Bearer ${adminToken}` }
            });
            
            const schema = {
                success: { required: true, type: 'boolean' },
                data: {
                    required: true,
                    type: 'object',
                    properties: {
                        id: { required: true, type: 'number' },
                        unit_name: { required: true, type: 'string' },
                        status: { required: true, type: 'string' },
                        priority: { required: true, type: 'string' },
                        created_at: { required: true, type: 'string' }
                    }
                }
            };
            
            const errors = validateSchema(res.data, schema);
            if (errors.length > 0) throw new Error(errors.join(', '));
        });

        await runContractTest('GET /deployments/:id returns single deployment schema', async () => {
            // First create one
            const createRes = await axios.post(`${CONFIG.API_URL}/deployments`, {
                unitName: `Single Contract Test ${Date.now()}`,
                location: { address: 'Test Location', latitude: -1.9441, longitude: 30.0619 },
                priority: 'high'
            }, {
                headers: { Authorization: `Bearer ${adminToken}` }
            });
            
            const id = createRes.data.data.id;
            
            const res = await axios.get(`${CONFIG.API_URL}/deployments/${id}`, {
                headers: { Authorization: `Bearer ${adminToken}` }
            });
            
            const schema = {
                success: { required: true, type: 'boolean' },
                data: {
                    required: true,
                    type: 'object',
                    properties: {
                        id: { required: true, type: 'number' },
                        unit_name: { required: true, type: 'string' },
                        status: { required: true, type: 'string' }
                    }
                }
            };
            
            const errors = validateSchema(res.data, schema);
            if (errors.length > 0) throw new Error(errors.join(', '));
        });

        await runContractTest('GET /deployments/stats returns statistics schema', async () => {
            const res = await axios.get(`${CONFIG.API_URL}/deployments/stats`, {
                headers: { Authorization: `Bearer ${adminToken}` }
            });
            
            const schema = {
                success: { required: true, type: 'boolean' },
                data: {
                    required: true,
                    type: 'object',
                    properties: {
                        total_deployments: { required: true, type: 'string' },
                        active_deployments: { required: true, type: 'string' },
                        pending_deployments: { required: true, type: 'string' }
                    }
                }
            };
            
            const errors = validateSchema(res.data, schema);
            if (errors.length > 0) throw new Error(errors.join(', '));
        });

        // ═══════════════════════════════════════════════════════════════════════════════
        // CONTRACT TEST 4: ERROR RESPONSES
        // ═══════════════════════════════════════════════════════════════════════════════
        console.log('\n┌───────────────────────────────────────────────────────────────────────────────┐');
        console.log('│  CONTRACT 4: ERROR RESPONSES                                                 │');
        console.log('└───────────────────────────────────────────────────────────────────────────────┘\n');

        await runContractTest('401 Unauthorized has correct schema', async () => {
            try {
                await axios.get(`${CONFIG.API_URL}/deployments`, {
                    headers: { Authorization: 'Bearer invalid_token' }
                });
            } catch (e) {
                if (e.response?.status !== 401) throw new Error(`Expected 401, got ${e.response?.status}`);
                
                const schema = {
                    success: { required: true, type: 'boolean' },
                    message: { required: true, type: 'string' }
                };
                
                const errors = validateSchema(e.response.data, schema);
                if (errors.length > 0) throw new Error(errors.join(', '));
            }
        });

        await runContractTest('404 Not Found has correct schema', async () => {
            try {
                await axios.get(`${CONFIG.API_URL}/deployments/99999999`, {
                    headers: { Authorization: `Bearer ${adminToken}` }
                });
            } catch (e) {
                if (e.response?.status !== 404) throw new Error(`Expected 404, got ${e.response?.status}`);
                
                const schema = {
                    success: { required: true, type: 'boolean' },
                    message: { required: true, type: 'string' }
                };
                
                const errors = validateSchema(e.response.data, schema);
                if (errors.length > 0) throw new Error(errors.join(', '));
            }
        });

        // ═══════════════════════════════════════════════════════════════════════════════
        // CONTRACT TEST 5: HTTP STATUS CODES
        // ═══════════════════════════════════════════════════════════════════════════════
        console.log('\n┌───────────────────────────────────────────────────────────────────────────────┐');
        console.log('│  CONTRACT 5: HTTP STATUS CODES                                               │');
        console.log('└───────────────────────────────────────────────────────────────────────────────┘\n');

        await runContractTest('Successful GET returns 200', async () => {
            const res = await axios.get(`${CONFIG.API_URL}/deployments`, {
                headers: { Authorization: `Bearer ${adminToken}` }
            });
            if (res.status !== 200) throw new Error(`Expected 200, got ${res.status}`);
        });

        await runContractTest('Successful POST returns 201 or 200', async () => {
            const res = await axios.post(`${CONFIG.API_URL}/deployments`, {
                unitName: `Status Code Test ${Date.now()}`,
                location: { address: 'Test', latitude: -1.9441, longitude: 30.0619 },
                priority: 'normal'
            }, {
                headers: { Authorization: `Bearer ${adminToken}` }
            });
            if (res.status !== 200 && res.status !== 201) {
                throw new Error(`Expected 200 or 201, got ${res.status}`);
            }
        });

        await runContractTest('No auth returns 401', async () => {
            try {
                await axios.get(`${CONFIG.API_URL}/deployments`);
                throw new Error('Should have failed');
            } catch (e) {
                if (e.message === 'Should have failed') throw e;
                if (e.response?.status !== 401) throw new Error(`Expected 401, got ${e.response?.status}`);
            }
        });

        // ═══════════════════════════════════════════════════════════════════════════════
        // CONTRACT TEST 6: CONTENT-TYPE HEADERS
        // ═══════════════════════════════════════════════════════════════════════════════
        console.log('\n┌───────────────────────────────────────────────────────────────────────────────┐');
        console.log('│  CONTRACT 6: CONTENT-TYPE HEADERS                                            │');
        console.log('└───────────────────────────────────────────────────────────────────────────────┘\n');

        await runContractTest('API returns application/json content-type', async () => {
            const res = await axios.get(`${CONFIG.API_URL}/deployments`, {
                headers: { Authorization: `Bearer ${adminToken}` }
            });
            
            const contentType = res.headers['content-type'];
            if (!contentType?.includes('application/json')) {
                throw new Error(`Expected application/json, got ${contentType}`);
            }
        });

        await runContractTest('Health endpoint returns application/json', async () => {
            const res = await axios.get(`${CONFIG.BASE_URL}/health`);
            
            const contentType = res.headers['content-type'];
            if (!contentType?.includes('application/json')) {
                throw new Error(`Expected application/json, got ${contentType}`);
            }
        });

        // ═══════════════════════════════════════════════════════════════════════════════
        // RESULTS SUMMARY
        // ═══════════════════════════════════════════════════════════════════════════════
        console.log('\n');
        console.log('╔══════════════════════════════════════════════════════════════════════════════╗');
        console.log('║                      API CONTRACT TEST RESULTS                              ║');
        console.log('╠══════════════════════════════════════════════════════════════════════════════╣');
        console.log(`║  Total Tests:     ${(results.passed + results.failed).toString().padEnd(5)}                                                  ║`);
        console.log(`║  ✅ Passed:       ${results.passed.toString().padEnd(5)}                                                  ║`);
        console.log(`║  ❌ Failed:       ${results.failed.toString().padEnd(5)}                                                  ║`);
        console.log(`║  📊 Success Rate: ${((results.passed / (results.passed + results.failed)) * 100).toFixed(1)}%                                               ║`);
        console.log('╠══════════════════════════════════════════════════════════════════════════════╣');
        
        if (results.failed === 0) {
            console.log('║  🎉 ALL API CONTRACTS VALIDATED! Responses match expected schemas!          ║');
        } else {
            console.log('║  ⚠️  Some contracts failed. API responses need attention.                    ║');
        }
        console.log('╚══════════════════════════════════════════════════════════════════════════════╝');
        console.log('\n');

    } catch (error) {
        console.error('\n💀 CRITICAL ERROR:', error.message);
    }
}

runContractTests();
