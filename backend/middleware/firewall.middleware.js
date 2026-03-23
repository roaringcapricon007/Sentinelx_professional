const { DeniedIP } = require('../models');

/**
 * SentinelX Sovereign Firewall v10.0
 * Intercepts every inbound request and verifies the originating IP against the DeniedIP registry.
 * This is the 'Enforcement' layer of the SOAR automation pipeline.
 */
module.exports = async (req, res, next) => {
    const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
    
    // Normalize IP
    const normalizedIp = ip === '::1' ? '127.0.0.1' : ip;

    try {
        const isBlocked = await DeniedIP.findOne({ where: { ip: normalizedIp } });
        
        if (isBlocked) {
            console.warn(`[FIREWALL] 🛑 Intercepted request from BLOCKED IP: ${normalizedIp} [Reason: ${isBlocked.reason}]`);
            return res.status(403).json({
                error: 'ACCESS_DENIED',
                message: 'Your IP has been quarantined by SentinelX SOAR.',
                incident_ref: isBlocked.id
            });
        }
        
        next();
    } catch (e) {
        // Fallback: Default to allow if DB check fails to prevent system-wide outage
        console.error('[FIREWALL] Validation Error:', e.message);
        next();
    }
};
