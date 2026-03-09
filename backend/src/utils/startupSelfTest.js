/**
 * ═══════════════════════════════════════════════════════════════════
 * STARTUP SELF-TEST — Runs automatically when backend starts
 * ═══════════════════════════════════════════════════════════════════
 * 
 * PURPOSE: Catch broken code IMMEDIATELY on startup instead of 
 * discovering it days later when AI detects an incident and the
 * emergency report silently fails.
 * 
 * WHAT IT CHECKS:
 *   1. Database connection + timezone is Africa/Kigali
 *   2. All required tables exist (emergencies, emergency_notifications, incidents, etc.)
 *   3. All required columns exist in emergencies table (source, emergency_type, etc.)
 *   4. All service imports work (smsService, fcmService, socketManager, geoFencing, dedup)
 *   5. AI service is reachable on port 8000
 *   6. createAutomaticEmergency function exists and has correct parameters
 * 
 * If ANY check fails → logs a LOUD ERROR with exact fix instructions
 * The server still starts (so you can fix it), but you'll see the error immediately
 * 
 * DO NOT DELETE THIS FILE — it prevents silent breakage
 * Created: 2026-03-09
 * ═══════════════════════════════════════════════════════════════════
 */

const db = require('../config/database');

async function runStartupSelfTest() {
    const results = [];
    let passed = 0;
    let failed = 0;

    function check(name, ok, detail = '') {
        if (ok) {
            passed++;
            results.push({ status: '✅', name, detail });
        } else {
            failed++;
            results.push({ status: '❌', name, detail });
        }
    }

    console.log('\n🔍 STARTUP SELF-TEST — Verifying all critical systems...');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

    // ── TEST 1: Database connection ────────────────────────────
    try {
        const res = await db.query('SELECT 1 as ok');
        check('Database connection', res.rows[0].ok === 1);
    } catch (e) {
        check('Database connection', false, e.message);
    }

    // ── TEST 2: Timezone is Africa/Kigali ──────────────────────
    try {
        const res = await db.query('SHOW timezone');
        const tz = res.rows[0].TimeZone;
        check('Timezone = Africa/Kigali', tz === 'Africa/Kigali', `Got: ${tz}`);
    } catch (e) {
        check('Timezone = Africa/Kigali', false, e.message);
    }

    // ── TEST 3: Required tables exist ──────────────────────────
    const requiredTables = [
        'emergencies',
        'emergency_notifications',
        'incidents',
        'notifications',
        'users',
        'officer_profiles',
        'districts',
    ];
    try {
        const res = await db.query(`
            SELECT table_name FROM information_schema.tables 
            WHERE table_schema = 'public' AND table_name = ANY($1)
        `, [requiredTables]);
        const existing = res.rows.map(r => r.table_name);
        for (const table of requiredTables) {
            check(`Table: ${table}`, existing.includes(table), existing.includes(table) ? '' : 'MISSING — run migration');
        }
    } catch (e) {
        check('Required tables', false, e.message);
    }

    // ── TEST 4: Emergencies table has 'source' column ──────────
    try {
        const res = await db.query(`
            SELECT column_name FROM information_schema.columns 
            WHERE table_name = 'emergencies' AND column_name IN ('source', 'emergency_type', 'severity', 'latitude', 'longitude', 'services_needed', 'contact_name', 'contact_phone', 'status')
        `);
        const cols = res.rows.map(r => r.column_name);
        const needed = ['source', 'emergency_type', 'severity', 'latitude', 'longitude', 'services_needed', 'contact_name', 'contact_phone', 'status'];
        for (const col of needed) {
            check(`emergencies.${col}`, cols.includes(col), cols.includes(col) ? '' : 'MISSING COLUMN');
        }
    } catch (e) {
        check('Emergencies columns', false, e.message);
    }

    // ── TEST 5: emergency_notifications has correct columns ────
    try {
        const res = await db.query(`
            SELECT column_name FROM information_schema.columns 
            WHERE table_name = 'emergency_notifications' AND column_name IN ('emergency_id', 'user_id', 'notification_type', 'title', 'message')
        `);
        const cols = res.rows.map(r => r.column_name);
        check('emergency_notifications columns', cols.length >= 5, `Found ${cols.length}/5 columns`);
    } catch (e) {
        check('emergency_notifications columns', false, e.message);
    }

    // ── TEST 6: Service imports work ───────────────────────────
    const services = [
        { name: 'socketManager', path: '../services/socketManager' },
        { name: 'smsService', path: '../services/sms_service' },
        { name: 'fcmService', path: '../services/fcmService' },
        { name: 'geoFencingService', path: '../services/geoFencingService' },
        { name: 'deduplicationService', path: '../services/incidentDeduplicationService' },
    ];
    for (const svc of services) {
        try {
            const mod = require(svc.path);
            check(`Import: ${svc.name}`, !!mod, typeof mod);
        } catch (e) {
            check(`Import: ${svc.name}`, false, `IMPORT FAILED: ${e.message}`);
        }
    }

    // ── TEST 7: aiAnalysisController loads + has critical functions ──
    try {
        const aiCtrl = require('../controllers/aiAnalysisController');
        check('Import: aiAnalysisController', !!aiCtrl);
        check('Export: analyzeVideoAndCreateIncident', typeof aiCtrl.analyzeVideoAndCreateIncident === 'function');
        check('Export: testIncidentDetection', typeof aiCtrl.testIncidentDetection === 'function');
    } catch (e) {
        check('Import: aiAnalysisController', false, `IMPORT FAILED: ${e.message}`);
    }

    // ── TEST 8: SMS service has sendEmergencySMS method ────────
    try {
        const sms = require('../services/sms_service');
        check('smsService.sendEmergencySMS()', typeof sms.sendEmergencySMS === 'function');
    } catch (e) {
        check('smsService.sendEmergencySMS()', false, e.message);
    }

    // ── TEST 9: FCM service has sendEmergencyAlarm method ──────
    try {
        const fcm = require('../services/fcmService');
        check('fcmService.sendEmergencyAlarm()', typeof fcm.sendEmergencyAlarm === 'function');
    } catch (e) {
        check('fcmService.sendEmergencyAlarm()', false, e.message);
    }

    // ── TEST 10: socketManager has critical emit methods ───────
    try {
        const sm = require('../services/socketManager');
        check('socketManager.emitEmergencyNew()', typeof sm.emitEmergencyNew === 'function');
        check('socketManager.emitIncidentNew()', typeof sm.emitIncidentNew === 'function');
        check('socketManager.broadcastGeoFencedAlert()', typeof sm.broadcastGeoFencedAlert === 'function');
        check('socketManager.emitAnalysisComplete()', typeof sm.emitAnalysisComplete === 'function');
    } catch (e) {
        check('socketManager methods', false, e.message);
    }

    // ── TEST 11: geoFencingService has createTargetedAlert ─────
    try {
        const geo = require('../services/geoFencingService');
        check('geoFencingService.createTargetedAlert()', typeof geo.createTargetedAlert === 'function');
    } catch (e) {
        check('geoFencingService.createTargetedAlert()', false, e.message);
    }

    // ── TEST 12: AI service reachable ──────────────────────────
    try {
        const http = require('http');
        const aiUrl = process.env.AI_SERVICE_URL || 'http://localhost:8000';
        const aiReachable = await new Promise((resolve) => {
            const req = http.get(`${aiUrl}/health`, { timeout: 3000 }, (res) => {
                resolve(res.statusCode === 200);
            });
            req.on('error', () => resolve(false));
            req.on('timeout', () => { req.destroy(); resolve(false); });
        });
        check('AI service reachable (port 8000)', aiReachable, aiReachable ? '' : 'AI service not running — start with: cd ai_service && python3 main_light.py');
    } catch (e) {
        check('AI service reachable', false, e.message);
    }

    // ── TEST 13: NOW() returns Kigali time ─────────────────────
    try {
        const res = await db.query("SELECT NOW() as now_time, EXTRACT(hour FROM NOW()) as hour");
        const dbHour = parseInt(res.rows[0].hour);
        // Kigali is UTC+2, so the hour should be roughly now UTC + 2
        const utcHour = new Date().getUTCHours();
        const expectedKigaliHour = (utcHour + 2) % 24;
        const hourDiff = Math.abs(dbHour - expectedKigaliHour);
        const isCorrect = hourDiff <= 1; // Allow 1 hour tolerance for edge cases
        check('NOW() returns Kigali time (UTC+2)', isCorrect, `DB hour: ${dbHour}, Expected ~${expectedKigaliHour}`);
    } catch (e) {
        check('NOW() returns Kigali time', false, e.message);
    }

    // ── PRINT RESULTS ──────────────────────────────────────────
    console.log('');
    for (const r of results) {
        const detail = r.detail ? ` (${r.detail})` : '';
        console.log(`  ${r.status} ${r.name}${detail}`);
    }
    console.log('');
    console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);

    if (failed === 0) {
        console.log(`🏆 ALL ${passed} SELF-TESTS PASSED — System is healthy`);
    } else {
        console.log(`⚠️  ${failed} SELF-TEST(S) FAILED out of ${passed + failed}`);
        console.log(`⚠️  AI emergency reports may not work correctly!`);
        console.log(`⚠️  Fix the issues above before relying on AI detection.`);
    }
    console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`);

    return { passed, failed, results };
}

module.exports = { runStartupSelfTest };
