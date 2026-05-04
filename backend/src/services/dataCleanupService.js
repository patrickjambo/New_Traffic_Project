const db = require('../config/database');
const fs = require('fs');
const path = require('path');

const performDailyCleanup = async () => {
    try {
        console.log('🧹 [DataCleanupService] Starting daily cleanup task at', new Date().toISOString());

        // 1. Delete records from database
        console.log('🧹 Clearing incident and emergency reports...');
        
        await db.query('BEGIN');
        
        // Delete related table records first (children)
        await db.query('DELETE FROM deployment_officers');
        await db.query('DELETE FROM deployments');
        
        await db.query('DELETE FROM alert_deliveries');
        await db.query('DELETE FROM emergency_notifications');
        await db.query('DELETE FROM incident_updates');
        await db.query('DELETE FROM incident_analytics');
        await db.query('DELETE FROM incident_alerts');
        
        // Delete emergency reports
        await db.query('DELETE FROM emergency_status_history');
        await db.query('DELETE FROM emergency_response_log');
        await db.query('DELETE FROM emergency_reports');
        await db.query('DELETE FROM emergencies');
        
        // Delete incidents last
        await db.query('DELETE FROM incidents');
        
        await db.query('COMMIT');
        
        console.log('✅ Database tables cleared successfully.');
        
        // 2. Clear uploaded video / image files
        const uploadDirs = [
            path.join(__dirname, '../../uploads'),
            path.join(__dirname, '../../../ai_service/temp_uploads')
        ];
        
        for (const dir of uploadDirs) {
            console.log(`🧹 Clearing files in directory: ${dir}`);
            if (fs.existsSync(dir)) {
                const files = fs.readdirSync(dir);
                for (const file of files) {
                    const fullPath = path.join(dir, file);
                    const stat = fs.statSync(fullPath);
                    // Do not delete placeholders, or profile directories
                    if (stat.isFile() && file !== '.gitkeep' && file !== 'README.md') {
                        fs.unlinkSync(fullPath);
                    }
                }
            } else {
                console.log(`Directory not found: ${dir}`);
            }
        }
        
        console.log('✅ Uploaded files cleared successfully.');
        console.log('🧹 [DataCleanupService] Daily cleanup task finished!');
        
    } catch (error) {
        await db.query('ROLLBACK');
        console.error('❌ [DataCleanupService] Error during cleanup:', error);
    }
};

// Schedule cleanup task to run at midnight (Daily)
const scheduleCleanup = () => {
    const now = new Date();
    const msUntilMidnight = new Date(
        now.getFullYear(),
        now.getMonth(),
        now.getDate() + 1,
        0, 0, 0
    ) - now;

    setTimeout(() => {
        performDailyCleanup();
        // Set up the next one
        setInterval(performDailyCleanup, 24 * 60 * 60 * 1000);
    }, msUntilMidnight);
    
    console.log('📅 Scheduled daily data cleanup for midnight');
};

module.exports = {
    performDailyCleanup,
    scheduleCleanup
};
