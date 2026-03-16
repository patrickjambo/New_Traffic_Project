/**
 * District Resolver - Determines which Kigali district a coordinate belongs to
 * Uses database district centers + radii with point-in-polygon for accurate boundaries
 */

const { query } = require('../config/database');

// Cache districts to avoid repeated DB queries
let districtCache = null;
let cacheTimestamp = 0;
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

/**
 * Kigali district boundary polygons (approximate but accurate for urban routing)
 * These cover the three districts of Kigali City:
 * - Nyarugenge (west-central): includes city center, Nyamirambo, Gitega
 * - Gasabo (north-east): includes Kimironko, Remera, Kacyiru, Kimihurura
 * - Kicukiro (south-east): includes Gikondo, Kanombe, Masaka, Niboye
 */
const KIGALI_DISTRICT_POLYGONS = {
    // Nyarugenge - western Kigali
    1: [
        [-1.9200, 30.0300], [-1.9200, 30.0650], [-1.9350, 30.0700],
        [-1.9450, 30.0750], [-1.9550, 30.0800], [-1.9600, 30.0850],
        [-1.9650, 30.0830], [-1.9700, 30.0780], [-1.9750, 30.0700],
        [-1.9800, 30.0650], [-1.9850, 30.0600], [-1.9900, 30.0550],
        [-1.9950, 30.0500], [-1.9900, 30.0400], [-1.9850, 30.0350],
        [-1.9750, 30.0300], [-1.9650, 30.0280], [-1.9550, 30.0270],
        [-1.9450, 30.0260], [-1.9350, 30.0270], [-1.9250, 30.0290],
        [-1.9200, 30.0300],
    ],
    // Gasabo - northern/eastern Kigali
    2: [
        [-1.8800, 30.0650], [-1.8800, 30.1000], [-1.8850, 30.1200],
        [-1.8900, 30.1400], [-1.9000, 30.1500], [-1.9100, 30.1550],
        [-1.9200, 30.1500], [-1.9300, 30.1400], [-1.9400, 30.1300],
        [-1.9500, 30.1200], [-1.9600, 30.1100], [-1.9650, 30.1000],
        [-1.9650, 30.0900], [-1.9600, 30.0850], [-1.9550, 30.0800],
        [-1.9450, 30.0750], [-1.9350, 30.0700], [-1.9200, 30.0650],
        [-1.9100, 30.0650], [-1.9000, 30.0650], [-1.8900, 30.0650],
        [-1.8800, 30.0650],
    ],
    // Kicukiro - southern/eastern Kigali
    3: [
        [-1.9650, 30.0830], [-1.9650, 30.0900], [-1.9650, 30.1000],
        [-1.9600, 30.1100], [-1.9700, 30.1200], [-1.9800, 30.1300],
        [-1.9900, 30.1400], [-2.0000, 30.1450], [-2.0100, 30.1400],
        [-2.0200, 30.1300], [-2.0250, 30.1200], [-2.0250, 30.1100],
        [-2.0200, 30.1000], [-2.0150, 30.0900], [-2.0100, 30.0800],
        [-2.0050, 30.0700], [-2.0000, 30.0600], [-1.9950, 30.0500],
        [-1.9900, 30.0550], [-1.9850, 30.0600], [-1.9800, 30.0650],
        [-1.9750, 30.0700], [-1.9700, 30.0780], [-1.9650, 30.0830],
    ],
};

/**
 * Point-in-polygon test using ray casting algorithm
 */
function pointInPolygon(lat, lng, polygon) {
    let inside = false;
    for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
        const xi = polygon[i][0], yi = polygon[i][1];
        const xj = polygon[j][0], yj = polygon[j][1];
        const intersect = ((yi > lng) !== (yj > lng)) &&
            (lat < (xj - xi) * (lng - yi) / (yj - yi) + xi);
        if (intersect) inside = !inside;
    }
    return inside;
}

/**
 * Haversine distance between two points in km
 */
function haversineDistance(lat1, lng1, lat2, lng2) {
    const R = 6371;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLng = (lng2 - lng1) * Math.PI / 180;
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
        Math.sin(dLng / 2) * Math.sin(dLng / 2);
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

/**
 * Load districts from database (with caching)
 */
async function loadDistricts() {
    const now = Date.now();
    if (districtCache && (now - cacheTimestamp) < CACHE_TTL) {
        return districtCache;
    }
    try {
        const result = await query(
            'SELECT id, name, center_lat, center_lng, radius_km FROM districts WHERE is_active = true ORDER BY id'
        );
        districtCache = result.rows;
        cacheTimestamp = now;
        return districtCache;
    } catch (err) {
        console.error('❌ Failed to load districts:', err.message);
        // Fallback to hardcoded Kigali districts
        return [
            { id: 1, name: 'Nyarugenge', center_lat: -1.9536, center_lng: 30.0606, radius_km: 8 },
            { id: 2, name: 'Gasabo', center_lat: -1.9147, center_lng: 30.1045, radius_km: 12 },
            { id: 3, name: 'Kicukiro', center_lat: -1.9876, center_lng: 30.1029, radius_km: 10 },
        ];
    }
}

/**
 * Resolve a lat/lng coordinate to a district_id
 * 
 * Strategy:
 * 1. First try polygon boundaries (most accurate)
 * 2. Fall back to nearest center within radius
 * 3. Fall back to absolute nearest center
 * 
 * @param {number} latitude
 * @param {number} longitude
 * @returns {Promise<{districtId: number|null, districtName: string|null}>}
 */
async function resolveDistrict(latitude, longitude) {
    if (!latitude || !longitude) {
        return { districtId: null, districtName: null };
    }

    const lat = parseFloat(latitude);
    const lng = parseFloat(longitude);

    if (isNaN(lat) || isNaN(lng)) {
        return { districtId: null, districtName: null };
    }

    const districts = await loadDistricts();

    // Step 1: Try polygon match (most accurate)
    for (const [districtIdStr, polygon] of Object.entries(KIGALI_DISTRICT_POLYGONS)) {
        if (pointInPolygon(lat, lng, polygon)) {
            const districtId = parseInt(districtIdStr);
            const district = districts.find(d => d.id === districtId);
            return {
                districtId,
                districtName: district ? district.name : null,
            };
        }
    }

    // Step 2: Fall back to nearest center within radius
    let nearest = null;
    let nearestDist = Infinity;

    for (const d of districts) {
        const dist = haversineDistance(lat, lng, parseFloat(d.center_lat), parseFloat(d.center_lng));
        if (dist < parseFloat(d.radius_km) && dist < nearestDist) {
            nearest = d;
            nearestDist = dist;
        }
    }

    if (nearest) {
        return { districtId: nearest.id, districtName: nearest.name };
    }

    // Step 3: Absolute nearest (for locations slightly outside boundaries)
    for (const d of districts) {
        const dist = haversineDistance(lat, lng, parseFloat(d.center_lat), parseFloat(d.center_lng));
        if (dist < nearestDist) {
            nearest = d;
            nearestDist = dist;
        }
    }

    // Only if within 20km of any center (reasonable for Kigali metro area)
    if (nearest && nearestDist < 20) {
        return { districtId: nearest.id, districtName: nearest.name };
    }

    return { districtId: null, districtName: null };
}

/**
 * Resolve district synchronously from cache (for WebSocket use)
 * Only works if districts have been loaded at least once
 */
function resolveDistrictSync(latitude, longitude) {
    if (!latitude || !longitude || !districtCache) {
        return { districtId: null, districtName: null };
    }

    const lat = parseFloat(latitude);
    const lng = parseFloat(longitude);

    // Try polygon first
    for (const [districtIdStr, polygon] of Object.entries(KIGALI_DISTRICT_POLYGONS)) {
        if (pointInPolygon(lat, lng, polygon)) {
            const districtId = parseInt(districtIdStr);
            const district = districtCache.find(d => d.id === districtId);
            return { districtId, districtName: district ? district.name : null };
        }
    }

    // Nearest center
    let nearest = null;
    let nearestDist = Infinity;
    for (const d of districtCache) {
        const dist = haversineDistance(lat, lng, parseFloat(d.center_lat), parseFloat(d.center_lng));
        if (dist < nearestDist) {
            nearest = d;
            nearestDist = dist;
        }
    }

    if (nearest && nearestDist < 20) {
        return { districtId: nearest.id, districtName: nearest.name };
    }

    return { districtId: null, districtName: null };
}

// Pre-load districts on module load (with retry)
(async () => {
    for (let attempt = 1; attempt <= 3; attempt++) {
        try {
            await loadDistricts();
            console.log('📍 District resolver initialized');
            return;
        } catch (err) {
            console.warn(`📍 District resolver init attempt ${attempt}/3 failed:`, err.message);
            if (attempt < 3) await new Promise(r => setTimeout(r, 2000));
        }
    }
    console.warn('📍 District resolver using hardcoded fallback (DB unavailable at startup)');
})();

module.exports = {
    resolveDistrict,
    resolveDistrictSync,
    loadDistricts,
    haversineDistance,
};
