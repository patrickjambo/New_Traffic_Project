/**
 * FCM (Firebase Cloud Messaging) Service
 * Handles server-side push notifications to mobile devices
 * 
 * FREE TIER: Firebase provides unlimited push notifications
 * 
 * Features:
 * - Standard notifications (normal sound/vibration)
 * - Emergency alarms (override DND, critical priority)
 * - Topic-based messaging for districts
 * - Location-based targeting
 */

let admin = null;
try {
    admin = require('firebase-admin');
} catch (e) {
    console.warn('⚠️ firebase-admin not installed. FCM push notifications will be disabled.');
    console.warn('   Run: npm install firebase-admin');
}

const { query } = require('../config/database');

class FCMService {
    constructor() {
        this.initialized = false;
        this.app = null;
        this.firebaseAvailable = admin !== null;
    }

    /**
     * Initialize Firebase Admin SDK
     * Uses service account credentials from environment or file
     */
    initialize() {
        if (this.initialized) return;
        
        if (!this.firebaseAvailable) {
            console.warn('⚠️ FCM Service: Firebase Admin not available, using fallback mode');
            this.initialized = true;
            return;
        }

        try {
            // Option 1: Use service account JSON file
            const serviceAccountPath = process.env.FIREBASE_SERVICE_ACCOUNT_PATH;
            
            // Option 2: Use individual environment variables
            const projectId = process.env.FIREBASE_PROJECT_ID;
            const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
            const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n');

            if (serviceAccountPath) {
                // Initialize with service account file
                const serviceAccount = require(serviceAccountPath);
                this.app = admin.initializeApp({
                    credential: admin.credential.cert(serviceAccount)
                });
                console.log('✅ FCM initialized with service account file');
            } else if (projectId && clientEmail && privateKey) {
                // Initialize with environment variables
                this.app = admin.initializeApp({
                    credential: admin.credential.cert({
                        projectId,
                        clientEmail,
                        privateKey
                    })
                });
                console.log('✅ FCM initialized with environment variables');
            } else {
                console.log('⚠️ FCM not configured - push notifications disabled');
                console.log('   Set FIREBASE_SERVICE_ACCOUNT_PATH or FIREBASE_PROJECT_ID/CLIENT_EMAIL/PRIVATE_KEY');
                return;
            }

            this.initialized = true;
        } catch (error) {
            console.error('❌ FCM initialization error:', error.message);
            console.log('   Push notifications will be disabled');
        }
    }

    /**
     * Send push notification to a single device
     * @param {string} fcmToken - Device FCM token
     * @param {object} notification - { title, body }
     * @param {object} data - Additional data payload
     * @param {boolean} isEmergency - Whether this is an emergency alert
     */
    async sendToDevice(fcmToken, notification, data = {}, isEmergency = false) {
        if (!this.initialized || !this.firebaseAvailable) {
            console.log('⚠️ FCM not available, logging push notification:');
            console.log(`   To: ${fcmToken?.substring(0, 20)}...`);
            console.log(`   Title: ${notification.title}`);
            console.log(`   Body: ${notification.body}`);
            return { success: false, error: 'FCM not initialized', logged: true };
        }

        try {
            const message = {
                token: fcmToken,
                notification: {
                    title: notification.title,
                    body: notification.body,
                },
                data: {
                    ...data,
                    click_action: 'FLUTTER_NOTIFICATION_CLICK',
                    isEmergency: String(isEmergency),
                },
                android: this._getAndroidConfig(isEmergency),
                apns: this._getAPNSConfig(isEmergency),
            };

            const response = await admin.messaging().send(message);
            console.log(`📱 FCM sent to device: ${response}`);
            
            return { success: true, messageId: response };
        } catch (error) {
            console.error('❌ FCM send error:', error.message);
            
            // Handle invalid token
            if (error.code === 'messaging/invalid-registration-token' ||
                error.code === 'messaging/registration-token-not-registered') {
                await this._removeInvalidToken(fcmToken);
            }
            
            return { success: false, error: error.message };
        }
    }

    /**
     * Send to multiple devices (multicast)
     * @param {string[]} fcmTokens - Array of device tokens
     * @param {object} notification - { title, body }
     * @param {object} data - Additional data payload
     * @param {boolean} isEmergency - Whether this is an emergency alert
     */
    async sendToMultipleDevices(fcmTokens, notification, data = {}, isEmergency = false) {
        if (!this.initialized || !this.firebaseAvailable || fcmTokens.length === 0) {
            console.log('⚠️ FCM multicast not available, logging:');
            console.log(`   Recipients: ${fcmTokens.length} devices`);
            console.log(`   Title: ${notification.title}`);
            return { success: false, successCount: 0, failureCount: fcmTokens.length, logged: true };
        }

        try {
            const message = {
                notification: {
                    title: notification.title,
                    body: notification.body,
                },
                data: {
                    ...data,
                    click_action: 'FLUTTER_NOTIFICATION_CLICK',
                    isEmergency: String(isEmergency),
                },
                android: this._getAndroidConfig(isEmergency),
                apns: this._getAPNSConfig(isEmergency),
                tokens: fcmTokens,
            };

            const response = await admin.messaging().sendEachForMulticast(message);
            
            console.log(`📱 FCM multicast: ${response.successCount} success, ${response.failureCount} failed`);

            // Handle failed tokens
            if (response.failureCount > 0) {
                const failedTokens = [];
                response.responses.forEach((resp, idx) => {
                    if (!resp.success) {
                        failedTokens.push(fcmTokens[idx]);
                    }
                });
                // Remove invalid tokens in background
                this._removeInvalidTokens(failedTokens);
            }

            return {
                success: true,
                successCount: response.successCount,
                failureCount: response.failureCount
            };
        } catch (error) {
            console.error('❌ FCM multicast error:', error.message);
            return { success: false, error: error.message };
        }
    }

    /**
     * Send to a topic (e.g., all officers in a district)
     * @param {string} topic - Topic name (e.g., 'district_NYA', 'all_officers')
     * @param {object} notification - { title, body }
     * @param {object} data - Additional data payload
     * @param {boolean} isEmergency - Whether this is an emergency alert
     */
    async sendToTopic(topic, notification, data = {}, isEmergency = false) {
        if (!this.initialized) {
            return { success: false, error: 'FCM not initialized' };
        }

        try {
            const message = {
                topic: topic,
                notification: {
                    title: notification.title,
                    body: notification.body,
                },
                data: {
                    ...data,
                    click_action: 'FLUTTER_NOTIFICATION_CLICK',
                    isEmergency: String(isEmergency),
                },
                android: this._getAndroidConfig(isEmergency),
                apns: this._getAPNSConfig(isEmergency),
            };

            const response = await admin.messaging().send(message);
            console.log(`📱 FCM sent to topic '${topic}': ${response}`);
            
            return { success: true, messageId: response };
        } catch (error) {
            console.error('❌ FCM topic send error:', error.message);
            return { success: false, error: error.message };
        }
    }

    /**
     * Subscribe device to a topic
     */
    async subscribeToTopic(fcmToken, topic) {
        if (!this.initialized) return { success: false };

        try {
            await admin.messaging().subscribeToTopic([fcmToken], topic);
            console.log(`📱 Device subscribed to topic: ${topic}`);
            return { success: true };
        } catch (error) {
            console.error('❌ Topic subscription error:', error.message);
            return { success: false, error: error.message };
        }
    }

    /**
     * Unsubscribe device from a topic
     */
    async unsubscribeFromTopic(fcmToken, topic) {
        if (!this.initialized) return { success: false };

        try {
            await admin.messaging().unsubscribeFromTopic([fcmToken], topic);
            console.log(`📱 Device unsubscribed from topic: ${topic}`);
            return { success: true };
        } catch (error) {
            console.error('❌ Topic unsubscription error:', error.message);
            return { success: false, error: error.message };
        }
    }

    // ============================================================
    // EMERGENCY ALERT SPECIFIC METHODS
    // ============================================================

    /**
     * Send emergency alarm to officers (highest priority)
     * This should override Do Not Disturb on supported devices
     */
    async sendEmergencyAlarm(officers, alertData) {
        const tokens = officers
            .filter(o => o.fcm_token)
            .map(o => o.fcm_token);

        if (tokens.length === 0) {
            console.log('⚠️ No FCM tokens available for emergency alert');
            return { success: false, error: 'No tokens' };
        }

        const notification = {
            title: `🚨 ${alertData.title || 'EMERGENCY ALERT'}`,
            body: alertData.message || 'Immediate response required!',
        };

        const data = {
            alertId: String(alertData.alertId || ''),
            incidentId: String(alertData.incidentId || ''),
            emergencyId: String(alertData.emergencyId || ''),
            type: alertData.type || 'emergency',
            severity: 'critical',
            latitude: String(alertData.location?.latitude || ''),
            longitude: String(alertData.location?.longitude || ''),
            address: alertData.location?.address || '',
            district: alertData.location?.district || '',
            aiConfidence: String(alertData.ai?.confidence || ''),
            detectedObject: alertData.ai?.detectedObject || '',
            timestamp: new Date().toISOString(),
        };

        return await this.sendToMultipleDevices(tokens, notification, data, true);
    }

    /**
     * Send standard incident notification to officers
     */
    async sendIncidentNotification(officers, incidentData) {
        const tokens = officers
            .filter(o => o.fcm_token && o.receive_standard_alerts !== false)
            .map(o => o.fcm_token);

        if (tokens.length === 0) {
            return { success: false, error: 'No tokens' };
        }

        const notification = {
            title: `📢 ${incidentData.type || 'Incident'} Reported`,
            body: `${incidentData.severity || 'Medium'} severity at ${incidentData.address || 'unknown location'}`,
        };

        const data = {
            incidentId: String(incidentData.id || ''),
            type: incidentData.type || 'incident',
            severity: incidentData.severity || 'medium',
            latitude: String(incidentData.latitude || ''),
            longitude: String(incidentData.longitude || ''),
            address: incidentData.address || '',
            timestamp: new Date().toISOString(),
        };

        return await this.sendToMultipleDevices(tokens, notification, data, false);
    }

    // ============================================================
    // PRIVATE HELPER METHODS
    // ============================================================

    /**
     * Get Android-specific notification config
     */
    _getAndroidConfig(isEmergency) {
        if (isEmergency) {
            return {
                priority: 'high',
                ttl: 0, // Immediate delivery
                notification: {
                    channelId: 'emergency_channel',
                    priority: 'max',
                    visibility: 'public',
                    sound: 'emergency_siren', // Custom sound in app
                    defaultSound: false,
                    defaultVibrateTimings: false,
                    vibrateTimingsMillis: [0, 500, 200, 500, 200, 500],
                    lightSettings: {
                        color: '#FF0000',
                        lightOnDurationMillis: 500,
                        lightOffDurationMillis: 500,
                    },
                    notificationCount: 1,
                },
            };
        }

        return {
            priority: 'high',
            notification: {
                channelId: 'incident_channel',
                priority: 'high',
                sound: 'default',
            },
        };
    }

    /**
     * Get iOS (APNS) specific notification config
     */
    _getAPNSConfig(isEmergency) {
        if (isEmergency) {
            return {
                payload: {
                    aps: {
                        alert: {
                            // Will use notification title/body
                        },
                        sound: {
                            critical: 1, // Critical alert (overrides DND)
                            name: 'emergency_siren.caf',
                            volume: 1.0,
                        },
                        badge: 1,
                        'content-available': 1,
                        'interruption-level': 'critical',
                    },
                },
                headers: {
                    'apns-priority': '10', // Immediate delivery
                    'apns-push-type': 'alert',
                },
            };
        }

        return {
            payload: {
                aps: {
                    sound: 'default',
                    badge: 1,
                },
            },
            headers: {
                'apns-priority': '10',
            },
        };
    }

    /**
     * Remove invalid FCM token from database
     */
    async _removeInvalidToken(token) {
        try {
            await query(`
                UPDATE officer_profiles 
                SET fcm_token = NULL 
                WHERE fcm_token = $1
            `, [token]);
            console.log('🗑️ Removed invalid FCM token');
        } catch (error) {
            console.error('Error removing invalid token:', error.message);
        }
    }

    /**
     * Remove multiple invalid tokens
     */
    async _removeInvalidTokens(tokens) {
        if (tokens.length === 0) return;
        
        try {
            await query(`
                UPDATE officer_profiles 
                SET fcm_token = NULL 
                WHERE fcm_token = ANY($1)
            `, [tokens]);
            console.log(`🗑️ Removed ${tokens.length} invalid FCM tokens`);
        } catch (error) {
            console.error('Error removing invalid tokens:', error.message);
        }
    }
}

// Export singleton instance
const fcmService = new FCMService();
module.exports = fcmService;
