/**
 * Incident Deduplication Service
 * 
 * Prevents duplicate emergency reports when AI continuously detects 
 * the same ongoing incident (e.g., same fire, same accident scene)
 * 
 * How it works:
 * 1. Tracks recent incidents by location and type
 * 2. When a new detection comes in, checks if similar incident exists within:
 *    - Same location (within radius)
 *    - Same incident type
 *    - Recent time window (e.g., last 30 minutes)
 * 3. If duplicate found, skips creating new emergency
 * 4. Optionally updates existing incident with new confidence data
 */

const db = require('../config/database');

// In-memory cache for faster deduplication (cleared periodically)
const recentIncidentsCache = new Map();

// Configuration
const CONFIG = {
    // Radius in meters to consider incidents as same location
    LOCATION_RADIUS_METERS: 100,
    
    // Time window in minutes - incidents within this window are potential duplicates
    TIME_WINDOW_MINUTES: 30,
    
    // Minimum confidence to override existing incident
    MIN_CONFIDENCE_TO_UPDATE: 0.7,
    
    // How often to clear old cache entries (in ms)
    CACHE_CLEANUP_INTERVAL_MS: 5 * 60 * 1000, // 5 minutes
    
    // Maximum age of cache entries (in ms)
    MAX_CACHE_AGE_MS: 60 * 60 * 1000, // 1 hour
};

/**
 * Calculate distance between two GPS coordinates (Haversine formula)
 * @returns distance in meters
 */
function calculateDistanceMeters(lat1, lon1, lat2, lon2) {
    const R = 6371000; // Earth radius in meters
    const φ1 = lat1 * Math.PI / 180;
    const φ2 = lat2 * Math.PI / 180;
    const Δφ = (lat2 - lat1) * Math.PI / 180;
    const Δλ = (lon2 - lon1) * Math.PI / 180;

    const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) +
              Math.cos(φ1) * Math.cos(φ2) *
              Math.sin(Δλ/2) * Math.sin(Δλ/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));

    return R * c;
}

/**
 * Generate a location-based cache key
 */
function generateLocationKey(latitude, longitude, type) {
    // Round coordinates to ~10 meter precision for cache key
    const latRounded = Math.round(latitude * 10000) / 10000;
    const lonRounded = Math.round(longitude * 10000) / 10000;
    return `${type}_${latRounded}_${lonRounded}`;
}

/**
 * Check if a similar incident already exists (main deduplication function)
 * 
 * @param {string} incidentType - Type of incident (fire, accident, traffic_jam)
 * @param {number} latitude - GPS latitude
 * @param {number} longitude - GPS longitude
 * @param {number} confidence - AI confidence score (0-1)
 * @returns {Object} { isDuplicate: boolean, existingIncident: Object|null, reason: string }
 */
async function checkDuplicateIncident(incidentType, latitude, longitude, confidence = 0) {
    try {
        const lat = parseFloat(latitude) || -1.9536;
        const lon = parseFloat(longitude) || 30.0606;
        
        console.log(`🔍 Checking for duplicate: type=${incidentType}, lat=${lat}, lon=${lon}`);

        // Step 1: Quick check in-memory cache first
        const cacheKey = generateLocationKey(lat, lon, incidentType);
        const cachedIncident = recentIncidentsCache.get(cacheKey);
        
        if (cachedIncident && (Date.now() - cachedIncident.timestamp) < CONFIG.TIME_WINDOW_MINUTES * 60 * 1000) {
            console.log(`⚡ Cache hit! Duplicate found in cache: Incident #${cachedIncident.incidentId}`);
            return {
                isDuplicate: true,
                existingIncident: cachedIncident,
                reason: `Similar ${incidentType} already reported ${Math.round((Date.now() - cachedIncident.timestamp) / 60000)} minutes ago (cached)`,
                source: 'cache'
            };
        }

        // Step 2: Check database for recent incidents of same type near same location
        const timeWindowStart = new Date(Date.now() - CONFIG.TIME_WINDOW_MINUTES * 60 * 1000);
        
        // Map incident types that should be considered similar
        const similarTypes = getSimilarIncidentTypes(incidentType);
        
        const query = `
            SELECT i.*, e.id as emergency_id, e.status as emergency_status
            FROM incidents i
            LEFT JOIN emergencies e ON (
                e.latitude = i.latitude 
                AND e.longitude = i.longitude 
                AND e.created_at > $4
            )
            WHERE i.type = ANY($1::varchar[])
              AND i.created_at > $4
              AND i.status IN ('active', 'pending', 'assigned', 'in_progress')
              AND ABS(i.latitude - $2) < 0.001  -- ~111 meters latitude
              AND ABS(i.longitude - $3) < 0.001 -- ~85 meters longitude at equator
            ORDER BY i.created_at DESC
            LIMIT 5
        `;
        
        const result = await db.query(query, [similarTypes, lat, lon, timeWindowStart]);
        
        if (result.rows.length === 0) {
            console.log(`✅ No duplicate found - this is a NEW incident`);
            return {
                isDuplicate: false,
                existingIncident: null,
                reason: 'No similar recent incident found',
                source: 'database'
            };
        }

        // Step 3: Check precise distance for each potential duplicate
        for (const existingIncident of result.rows) {
            const distance = calculateDistanceMeters(
                lat, lon,
                parseFloat(existingIncident.latitude),
                parseFloat(existingIncident.longitude)
            );

            if (distance <= CONFIG.LOCATION_RADIUS_METERS) {
                const ageMinutes = Math.round((Date.now() - new Date(existingIncident.created_at).getTime()) / 60000);
                
                console.log(`🔄 DUPLICATE FOUND: Incident #${existingIncident.id} (${distance.toFixed(0)}m away, ${ageMinutes} min ago)`);
                
                // Update cache for faster future lookups
                recentIncidentsCache.set(cacheKey, {
                    incidentId: existingIncident.id,
                    emergencyId: existingIncident.emergency_id,
                    type: existingIncident.type,
                    latitude: parseFloat(existingIncident.latitude),
                    longitude: parseFloat(existingIncident.longitude),
                    timestamp: new Date(existingIncident.created_at).getTime(),
                    status: existingIncident.status
                });

                return {
                    isDuplicate: true,
                    existingIncident: existingIncident,
                    reason: `Similar ${incidentType} incident #${existingIncident.id} already exists ${distance.toFixed(0)}m away (reported ${ageMinutes} min ago)`,
                    source: 'database',
                    distance: distance,
                    ageMinutes: ageMinutes
                };
            }
        }

        console.log(`✅ Found ${result.rows.length} incidents but none within ${CONFIG.LOCATION_RADIUS_METERS}m - this is NEW`);
        return {
            isDuplicate: false,
            existingIncident: null,
            reason: 'No similar incident within radius',
            source: 'database'
        };

    } catch (error) {
        console.error('❌ Error checking duplicate incident:', error);
        // On error, allow the incident to be created (fail open)
        return {
            isDuplicate: false,
            existingIncident: null,
            reason: `Error checking duplicates: ${error.message}`,
            source: 'error'
        };
    }
}

/**
 * Get similar incident types for deduplication
 * (e.g., 'fire' and 'fire_emergency' should be considered same)
 */
function getSimilarIncidentTypes(type) {
    const typeGroups = {
        'fire': ['fire', 'fire_emergency', 'burning_vehicle', 'vehicle_fire'],
        'accident': ['accident', 'collision', 'crash', 'vehicle_accident'],
        'traffic_jam': ['traffic_jam', 'congestion', 'heavy_traffic', 'traffic_congestion'],
        'roadblock': ['roadblock', 'road_closure', 'obstruction'],
    };

    // Find which group this type belongs to
    for (const [key, group] of Object.entries(typeGroups)) {
        if (group.includes(type.toLowerCase())) {
            return group;
        }
    }

    // If no group found, return just the type itself
    return [type];
}

/**
 * Register a new incident in the cache (call after creating incident)
 */
function registerNewIncident(incidentId, type, latitude, longitude, emergencyId = null) {
    const lat = parseFloat(latitude) || -1.9536;
    const lon = parseFloat(longitude) || 30.0606;
    const cacheKey = generateLocationKey(lat, lon, type);
    
    recentIncidentsCache.set(cacheKey, {
        incidentId: incidentId,
        emergencyId: emergencyId,
        type: type,
        latitude: lat,
        longitude: lon,
        timestamp: Date.now(),
        status: 'active'
    });
    
    console.log(`📝 Registered incident #${incidentId} in deduplication cache`);
}

/**
 * Update an existing incident with new AI detection data
 * (Useful when same incident is detected again with higher confidence)
 */
async function updateExistingIncident(incidentId, newConfidence, additionalData = {}) {
    try {
        // Add a detection count or update timestamp
        await db.query(
            `UPDATE incidents 
             SET updated_at = NOW(),
                 description = description || ' [Updated: ' || NOW()::text || ' - AI re-detected]'
             WHERE id = $1`,
            [incidentId]
        );
        
        console.log(`🔄 Updated existing incident #${incidentId} with new detection data`);
        return true;
    } catch (error) {
        console.error('❌ Error updating existing incident:', error);
        return false;
    }
}

/**
 * Clear old entries from the cache
 */
function cleanupCache() {
    const now = Date.now();
    let cleaned = 0;
    
    for (const [key, value] of recentIncidentsCache.entries()) {
        if (now - value.timestamp > CONFIG.MAX_CACHE_AGE_MS) {
            recentIncidentsCache.delete(key);
            cleaned++;
        }
    }
    
    if (cleaned > 0) {
        console.log(`🧹 Deduplication cache cleanup: removed ${cleaned} old entries`);
    }
}

/**
 * Mark an incident as resolved (remove from deduplication)
 * Call this when incident is closed/resolved
 */
function markIncidentResolved(incidentId) {
    for (const [key, value] of recentIncidentsCache.entries()) {
        if (value.incidentId === incidentId) {
            recentIncidentsCache.delete(key);
            console.log(`✓ Removed resolved incident #${incidentId} from deduplication cache`);
            return true;
        }
    }
    return false;
}

/**
 * Get cache statistics (for debugging)
 */
function getCacheStats() {
    return {
        size: recentIncidentsCache.size,
        entries: Array.from(recentIncidentsCache.entries()).map(([key, value]) => ({
            key,
            incidentId: value.incidentId,
            type: value.type,
            ageMinutes: Math.round((Date.now() - value.timestamp) / 60000)
        })),
        config: CONFIG
    };
}

// Start periodic cache cleanup
setInterval(cleanupCache, CONFIG.CACHE_CLEANUP_INTERVAL_MS);

module.exports = {
    checkDuplicateIncident,
    registerNewIncident,
    updateExistingIncident,
    markIncidentResolved,
    getCacheStats,
    CONFIG
};
