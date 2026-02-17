const { verifyToken } = require('../utils/auth');

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
        const decoded = verifyToken(token);

        req.user = decoded; // Attach user info to request
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
 * district_admin is treated as admin for authorization purposes but with district filtering
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

        // district_admin has same access as admin but filtered by district
        const effectiveRole = req.user.role === 'district_admin' ? 'admin' : req.user.role;
        
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
 * Optional authentication - doesn't fail if no token
 */
const optionalAuth = (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;

        if (authHeader && authHeader.startsWith('Bearer ')) {
            const token = authHeader.substring(7);
            const decoded = verifyToken(token);
            req.user = decoded;
        }
    } catch (error) {
        // Silently fail for optional auth
    }

    next();
};

module.exports = {
    authenticate,
    authorize,
    optionalAuth,
    protect: authenticate, // Alias for compatibility
};
