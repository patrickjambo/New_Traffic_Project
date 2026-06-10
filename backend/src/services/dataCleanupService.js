const fs = require('fs');
const path = require('path');

const performDailyCleanup = async () => {
    try {
        console.log('🧹 [DataCleanupService] Starting daily cleanup task at', new Date().toISOString());

        // Records are intentionally kept in the database for historical reporting.
        // The dashboard "daily reset to 0" is achieved by date-filtering display queries
        // to only show incidents/emergencies created today (DATE(created_at) = CURRENT_DATE).
        // This allows all past data to remain accessible for report downloads.

        // Clean up uploaded video / image files to free disk space
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
