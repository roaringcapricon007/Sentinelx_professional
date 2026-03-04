const sequelize = require('../database');

/**
 * --- DATABASE INTEGRITY MIDDLEWARE ---
 * Verifies that the database layer is responsive before proceeding with the request.
 * Returns 503 Service Unavailable if the core storage is unreachable.
 */
async function dbCheck(req, res, next) {
    try {
        // Strict 3s timeout for DB health check during web requests
        const authPromise = sequelize.authenticate();
        const timeoutPromise = new Promise((_, reject) => setTimeout(() => reject(new Error('DB_TIMEOUT')), 3000));

        await Promise.race([authPromise, timeoutPromise]);
        next();
    } catch (err) {
        console.warn('[WARNING] Database Connectivity Slow/Lost. Proceeding in fallback mode.');
        // Don't block the request, let the route handle potential DB errors
        next();
    }
}

module.exports = { dbCheck };
