const sequelize = require('../database');

/**
 * --- DATABASE INTEGRITY MIDDLEWARE ---
 * Verifies that the database layer is responsive before proceeding with the request.
 * Returns 503 Service Unavailable if the core storage is unreachable.
 */
async function dbCheck(req, res, next) {
    try {
        // Simple authentication check - very fast for SQLite
        await sequelize.authenticate();
        next();
    } catch (err) {
        console.error('[CRITICAL] Database Connectivity Lost:', err.message);
        res.status(503).json({
            error: 'Infrastructure Fault',
            message: 'Core database is currently offline. SentinelX is in emergency fallback mode.',
            timestamp: new Date().toISOString()
        });
    }
}

module.exports = { dbCheck };
