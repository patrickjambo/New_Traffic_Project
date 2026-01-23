/**
 * Test Real-Time Location Streaming
 * Simulates officer location updates being streamed to admin dashboard
 */

const io = require('socket.io-client');

const BASE_URL = 'http://localhost:3000';

async function testLocationStreaming() {
    console.log('\n╔════════════════════════════════════════════════════════════╗');
    console.log('║     REAL-TIME LOCATION STREAMING TEST                       ║');
    console.log('║     Officer Location → Admin Dashboard                      ║');
    console.log('╚════════════════════════════════════════════════════════════╝\n');

    let adminReceived = 0;
    
    return new Promise((resolve) => {
        // Connect as admin
        const adminSocket = io(BASE_URL, { transports: ['websocket'] });
        
        adminSocket.on('connect', () => {
            console.log('✅ Admin socket connected:', adminSocket.id);
            adminSocket.emit('join:role', { role: 'admin', userId: 1 });
        });

        // Listen for officer locations
        adminSocket.on('officer:location', (data) => {
            adminReceived++;
            console.log(`📍 [${adminReceived}] Admin received officer location:`);
            console.log(`   Officer ID: ${data.officerId}`);
            console.log(`   Location: ${data.latitude}, ${data.longitude}`);
            console.log(`   Address: ${data.address || 'N/A'}`);
            console.log(`   Speed: ${data.speed ? Math.round(data.speed * 3.6) + ' km/h' : 'N/A'}`);
            console.log(`   Timestamp: ${data.timestamp}`);
            console.log('');
        });

        // Connect as police officer
        const policeSocket = io(BASE_URL, { transports: ['websocket'] });
        
        policeSocket.on('connect', () => {
            console.log('✅ Police socket connected:', policeSocket.id);
            policeSocket.emit('join:role', { role: 'police', userId: 44 });

            // Start simulating location updates
            console.log('\n🚗 Starting location simulation...\n');
            
            // Simulate moving along a route in Kigali
            const route = [
                { lat: -1.9441, lng: 30.0619, addr: 'Kigali City Center' },
                { lat: -1.9450, lng: 30.0625, addr: 'KN 5 Ave' },
                { lat: -1.9460, lng: 30.0630, addr: 'Nyarugenge District' },
                { lat: -1.9470, lng: 30.0635, addr: 'Near Kigali Convention Center' },
                { lat: -1.9480, lng: 30.0640, addr: 'Kimihurura' },
            ];

            let i = 0;
            const interval = setInterval(() => {
                if (i >= route.length) {
                    clearInterval(interval);
                    
                    setTimeout(() => {
                        console.log('\n╔════════════════════════════════════════════════════════════╗');
                        console.log('║                    TEST RESULTS                             ║');
                        console.log('╠════════════════════════════════════════════════════════════╣');
                        console.log(`║  📍 Location updates sent: ${route.length}                             ║`);
                        console.log(`║  📡 Admin received: ${adminReceived}                                    ║`);
                        console.log(`║  ${adminReceived >= route.length ? '✅ SUCCESS' : '❌ FAILED'}: Real-time streaming working              ║`);
                        console.log('╚════════════════════════════════════════════════════════════╝');
                        
                        adminSocket.disconnect();
                        policeSocket.disconnect();
                        resolve(adminReceived >= route.length);
                    }, 1000);
                    return;
                }

                const loc = route[i];
                const speed = Math.random() * 15 + 20; // 20-35 m/s (72-126 km/h)
                
                console.log(`🚗 Police sending location update ${i + 1}/${route.length}...`);
                
                // Simulate what the mobile app would send
                policeSocket.emit('officer:location_update', {
                    latitude: loc.lat,
                    longitude: loc.lng,
                    accuracy: 10 + Math.random() * 5,
                    speed: speed,
                    heading: 45 + Math.random() * 90,
                    address: loc.addr,
                    timestamp: new Date().toISOString(),
                });

                i++;
            }, 1500); // Send update every 1.5 seconds
        });

        // Timeout after 15 seconds
        setTimeout(() => {
            console.log('\n⏰ Test timeout');
            adminSocket.disconnect();
            policeSocket.disconnect();
            resolve(false);
        }, 15000);
    });
}

testLocationStreaming().then(success => {
    process.exit(success ? 0 : 1);
});
