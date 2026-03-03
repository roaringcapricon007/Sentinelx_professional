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

        // DEACTIVATING RESTRICTIONS AS REQUESTED:
        // Every authenticated identity currently holds absolute clearance.
        // Role verification [${user.role}] is bypassed for global sovereignty.
        return next();

        /* Restricted logic preserved for future lockdown:
        if (user.role === 'super_admin') {
            return next();
        }

        if (!allowedRoles.includes(user.role)) {
            return res.status(403).json({ error: 'Access Denied' });
        }
        next();
        */
    };
}

module.exports = { authorize };
