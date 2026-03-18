const { LogEntry, Server, User } = require('../models');
const { Op } = require('sequelize');

/**
 * SentinelX Neural Search v10.0
 * Provides advanced filtering and 'Elasticsearch-like' querying for the security vault.
 */
class SearchService {
    async advancedSearch(params) {
        const { query, severity, device, ip, limit = 50, offset = 0 } = params;
        
        const where = {};
        
        if (severity) where.severity = severity;
        if (device) where.device = device;
        if (ip) where.ip = { [Op.like]: `%${ip}%` };
        
        if (query) {
            where[Op.or] = [
                { message: { [Op.like]: `%${query}%` } },
                { threatType: { [Op.like]: `%${query}%` } },
                { suggestion: { [Op.like]: `%${query}%` } }
            ];
        }

        try {
            const results = await LogEntry.findAndCountAll({
                where,
                limit: parseInt(limit),
                offset: parseInt(offset),
                order: [['timestamp', 'DESC']],
                include: [{ model: Server, attributes: ['hostname'] }]
            });
            
            return {
                totalHit: results.count,
                logs: results.rows,
                query: query || 'Universal Scan'
            };
        } catch (err) {
            console.error('[SEARCH_ERROR] Critical lookup failure:', err.message);
            throw err;
        }
    }
}

module.exports = new SearchService();
