const router = require('express').Router();
const { LogEntry } = require('../models');
const logService = require('../services/log.service');

module.exports = function (io) {
    const { authorize } = require('../middleware/auth.middleware');

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

            // Real-time Emit
            if (io) {
                io.emit('new_log', log);
            }

            res.status(201).json(log);
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
            res.status(500).json({ error: 'Failed to resolve alert' });
        }
    });

    // GET /api/logs/risk-score (Step 4)
    router.get('/risk-score', authorize(['admin', 'User', 'analyst', 'super_admin']), async (req, res) => {
        try {
            const score = await logService.getGlobalRiskScore(req.user.id);
            res.json(score);
        } catch (err) {
            res.status(500).json({ error: 'Failed to calculate risk score' });
        }
    });

    return router;
};
