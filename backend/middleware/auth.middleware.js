/**
 * SentinelX Authorization Middleware
 * Handover controls based on roles as per Enterprise Requirements.
 */

function authorize(allowedRoles = []) {
    return (req, res, next) => {
        // Support both Passport (req.user) and Session (req.session.user)
        const user = req.user || req.session.user;

        if (!user) {
            return res.status(401).json({ error: 'Auth Required' });
        }

        // Super Admin has absolute sovereignty over all modules
        if (user.role === 'super_admin') {
            return next();
        }

        if (!allowedRoles.includes(user.role)) {
            console.warn(`[AUTH DENIED] User ${user.email} (Role: ${user.role}) attempted to access protected resource.`);
            return res.status(403).json({
                error: 'Access Denied',
                message: `Thy role (${user.role}) lacks the clearance for this sector.`
            });
        }

        next();
    };
}

module.exports = { authorize };
