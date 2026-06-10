const { verifyToken } = require('../utils/auth');

/**
 * Helper: normalize district fields from JWT token
 * JWT stores districtId (camelCase), but code sometimes checks district_id
 * This ensures both fields are always available on req.user
 */
function normalizeUserFields(decoded) {
    if (!decoded) return decoded;
    // Ensure both camelCase and snake_case district fields exist
    if (decoded.districtId && !decoded.district_id) {
        decoded.district_id = decoded.districtId;
    } else if (decoded.district_id && !decoded.districtId) {
        decoded.districtId = decoded.district_id;
    }
    return decoded;
}

/**
 * Middleware to verify JWT token
 */
const authenticate = (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;

        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return res.status(401).json({
                success: false,
                message: 'No token provided'
            });
        }

        const token = authHeader.substring(7); // Remove 'Bearer ' prefix
        if (!token || token === 'null' || token === 'undefined') {
            return res.status(401).json({
                success: false,
                message: 'Invalid token format'
            });
        }

        const decoded = verifyToken(token);
        req.user = normalizeUserFields(decoded); // Attach user info to request
        next();
    } catch (error) {
        return res.status(401).json({
            success: false,
            message: 'Invalid or expired token'
        });
    }
};

/**
 * Middleware to check user role
 * district_admin and co_admin are treated as admin for authorization purposes
 * - district_admin: full admin access but filtered by district
 * - co_admin: admin access but without Officers, Settings, Analytics on frontend
 */
const authorize = (...roles) => {
    // Flatten array if passed as authorize(['admin', 'police'])
    const allowedRoles = roles.flat();
    
    return (req, res, next) => {
        if (!req.user) {
            return res.status(401).json({
                success: false,
                message: 'Unauthorized'
            });
        }

        // district_admin, co_admin, and hospital_admin have same backend access as admin
        const effectiveRole = (req.user.role === 'district_admin' || req.user.role === 'co_admin' || req.user.role === 'hospital_admin') ? 'admin' : req.user.role;
        
        if (!allowedRoles.includes(req.user.role) && !allowedRoles.includes(effectiveRole)) {
            return res.status(403).json({
                success: false,
                message: 'Insufficient permissions'
            });
        }

        next();
    };
};

/**
 * Optional authentication - doesn't fail if no token, but normalizes fields if present
 */
const optionalAuth = (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;

        if (authHeader && authHeader.startsWith('Bearer ')) {
            const token = authHeader.substring(7);
            if (token && token !== 'null' && token !== 'undefined') {
                const decoded = verifyToken(token);
                req.user = normalizeUserFields(decoded);
            }
        }
    } catch (error) {
        // Silently fail for optional auth — req.user stays undefined
    }

    next();
};

module.exports = {
    authenticate,
    authorize,
    optionalAuth,
    protect: authenticate, // Alias for compatibility
};
