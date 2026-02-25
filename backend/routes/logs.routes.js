const router = require('express').Router();
const { LogEntry } = require('../models');

module.exports = function (io) {
    const { authorize } = require('../middleware/auth.middleware');

    // GET /api/logs/history
    router.get('/history', authorize(['admin', 'user']), async (req, res) => {
        try {
            const logs = await LogEntry.findAll({
                limit: 50,
                order: [['createdAt', 'DESC']]
            });
            res.json(logs);
        } catch (err) {
            res.status(500).json({ error: 'Failed to fetch logs' });
        }
    });

    // POST /api/logs/ingest
    router.post('/ingest', authorize(['admin']), async (req, res) => {
        try {
            const { severity, device, message, suggestion } = req.body;

            // Save to DB
            const newLog = await LogEntry.create({
                severity,
                device,
                message,
                suggestion,
                timestamp: new Date()
            });

            // Real-time Emit
            if (io) {
                io.emit('new_log', newLog);
            }

            res.status(201).json(newLog);
        } catch (err) {
            console.error('Log Ingest Error:', err);
            res.status(500).json({ error: 'Failed to ingest log' });
        }
    });

    return router;
};
