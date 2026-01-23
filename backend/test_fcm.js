/**
 * Test Firebase FCM Connection
 */

require('dotenv').config();

const fcmService = require('./src/services/fcmService');

async function testFCM() {
    console.log('🔥 Testing Firebase FCM Connection...\n');
    
    // Try to initialize
    fcmService.initialize();
    
    if (fcmService.initialized && fcmService.firebaseAvailable) {
        console.log('✅ Firebase Admin SDK initialized successfully!');
        console.log('✅ FCM Push Notifications are ENABLED!');
        console.log('\n📱 Your app can now receive:');
        console.log('   - Standard notifications');
        console.log('   - Emergency alarms (high priority)');
        console.log('   - Background push notifications');
    } else {
        console.log('⚠️  Firebase not fully initialized');
        console.log('   Check that firebase-service-account.json exists in config/');
    }
}

testFCM();
