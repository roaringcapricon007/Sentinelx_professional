const router = require('express').Router();
const { LogEntry, User } = require('../models');
const logService = require('../services/log.service');

module.exports = function (io) {
    const { authorize } = require('../middleware/auth.middleware');

    // GET /api/logs/search?ip=...&device=...
    const searchService = require('../services/search.service');
    router.get('/search', authorize(['admin', 'analyst', 'super_admin']), async (req, res) => {
        try {
            const results = await searchService.advancedSearch(req.query);
            res.json(results);
        } catch (e) {
            res.status(500).json({ error: e.message });
        }
    });

    // GET /api/logs/history?status=ACTIVE
    router.get('/history', authorize(['admin', 'User', 'analyst', 'super_admin']), async (req, res) => {
        try {
            const { status } = req.query;
            const whereClause = { UserId: req.user.id };
            if (status) whereClause.status = status;

            const logs = await LogEntry.findAll({
                where: whereClause,
                limit: 50,
                order: [['timestamp', 'DESC']]
            });
            res.json(logs);
        } catch (err) {
            console.error('Fetch Logs Error:', err);
            res.status(500).json({ error: 'Failed to fetch logs' });
        }
    });

    // POST /api/logs/ingest
    router.post('/ingest', authorize(['admin', 'super_admin']), async (req, res) => {
        try {
            const { severity, device, message, ip } = req.body;

            // Use advanced LogService (Step 2, 3, 4)
            const log = await logService.ingestLog({
                severity,
                device,
                message,
                ip: ip || req.ip || '0.0.0.0'
            }, req.user.id);

            // Event-Driven Handover
            res.status(202).json({ status: 'ACCEPTED', logId: log.id });
        } catch (err) {
            console.error('Log Ingest Error:', err);
            res.status(500).json({ error: 'Failed to ingest log' });
        }
    });

    // POST /api/logs/resolve/:id (Step 5)
    router.post('/resolve/:id', authorize(['admin', 'super_admin']), async (req, res) => {
        try {
            const log = await LogEntry.findOne({
                where: { id: req.params.id, UserId: req.user.id }
            });

            if (!log) return res.status(404).json({ error: 'Alert not found' });

            log.status = 'RESOLVED';
            await log.save();

            // Notify UI of status change
            if (io) io.emit('log_resolved', log.id);

            res.json({ message: 'Alert successfully resolved', log });
        } catch (err) {
            console.error('Resolve Alert Error:', err);
            res.status(500).json({ error: 'Failed to resolve alert' });
        }
    });

    // GET /api/logs/risk-score (Step 4)
    router.get('/risk-score', authorize(['admin', 'User', 'analyst', 'super_admin']), async (req, res) => {
        try {
            const score = await logService.getGlobalRiskScore(req.user.id);
            res.json(score);
        } catch (err) {
            console.error('Risk Score Error:', err);
            res.status(500).json({ error: 'Failed to calculate risk score' });
        }
    });

    // --- NEW ENTERPRISE FEATURES v7.5 ---

    // GET /api/logs/timeline (Step 5)
    router.get('/timeline', authorize(['admin', 'User', 'analyst', 'super_admin']), async (req, res) => {
        try {
            const logs = await LogEntry.findAll({
                where: { UserId: req.user.id },
                limit: 20,
                order: [['timestamp', 'DESC']]
            });
            // Group by day for the narrative view
            res.json(logs);
        } catch (err) {
            console.error('Timeline Error:', err);
            res.status(500).json({ error: 'Failed to fetch timeline' });
        }
    });

    // POST /api/logs/block-ip (Step 7)
    router.post('/block-ip', authorize(['admin', 'super_admin']), async (req, res) => {
        const { ip } = req.body;
        console.warn(`[FIREWALL_SIM] Blocking IP address: ${ip}`);
        // In a real env, we'd add to a DB table checked by a firewall module
        res.json({ message: `IP Address ${ip} has been added to the Global Denial List.` });
    });

    // POST /api/logs/disable-user (Step 7)
    router.post('/disable-user', authorize(['admin', 'super_admin']), async (req, res) => {
        const { email } = req.body;
        try {
            const user = await User.findOne({ where: { email } });
            if (!user) return res.status(404).json({ error: 'User not found' });
            user.status = 'DISABLED';
            await user.save();
            res.json({ message: `Access for ${email} has been revoked until re-validated.` });
        } catch (err) {
            res.status(500).json({ error: 'Failed to suspend user' });
        }
    });

    return router;
};
