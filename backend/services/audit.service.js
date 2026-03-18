const { AuditLog } = require('../models');

/**
 * SentinelX Audit Intelligence Service
 * Provides immutable logs of user and system actions.
 */
class AuditService {
    /**
     * Log an action to the persistent audit vault.
     */
    async log(action, details, req = null, category = 'SYSTEM', userId = null) {
        try {
            const ip = req ? (req.headers['x-forwarded-for'] || req.socket.remoteAddress) : '127.0.0.1';
            const targetUserId = userId || (req?.user?.id) || (req?.session?.user?.id);

            await AuditLog.create({
                action,
                category,
                details: typeof details === 'object' ? JSON.stringify(details) : details,
                ipAddress: ip,
                UserId: targetUserId,
                timestamp: new Date()
            });

            console.log(`[AUDIT] ${category}:${action} - ${targetUserId || 'ANONYMOUS'}`);
        } catch (err) {
            console.error('[AUDIT_ERROR] Failed to persist audit entry:', err.message);
        }
    }
}

module.exports = new AuditService();
