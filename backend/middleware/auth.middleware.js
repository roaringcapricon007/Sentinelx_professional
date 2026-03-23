const jwt = require('jsonwebtoken');

/**
 * SentinelX Authorization & Identity Fusion v10.0
 * Handover controls based on roles and JWT/Session integrity.
 * Fulfills Phase 1: JWT & RBAC Compliance.
 */
function authorize(allowedRoles = []) {
    return (req, res, next) => {
        // 1. DUAL IDENTIFIER EXTRACTION (Handshake Phase)
        let user = req.user || req.session.user;

        // 2. JWT UPLINK RECOVERY (Bearer Token Support)
        const authHeader = req.headers['authorization'];
        if (authHeader && authHeader.startsWith('Bearer ')) {
            const token = authHeader.split(' ')[1];
            try {
                const decoded = jwt.verify(token, process.env.JWT_SECRET || 'sentinelx_enterprise_nexus_2026');
                user = decoded; // Shift identity from session to JWT
                req.user = user; 
            } catch (err) {
                return res.status(401).json({ error: 'Neurolink Token Expired or Decrypted' });
            }
        }

        if (!user) {
            return res.status(401).json({ error: 'Authentication Required: Link Failed' });
        }

        // 3. ROLE CLEARANCE ENFORCEMENT (RBAC Phase)
        if (user.role === 'super_admin') {
            return next(); // Absolute system clearance
        }

        if (allowedRoles.length > 0 && !allowedRoles.includes(user.role)) {
            return res.status(403).json({ 
                error: 'Security Level Insufficient', 
                required: allowedRoles, 
                current: user.role 
            });
        }

        next();
    };
}

module.exports = { authorize };
