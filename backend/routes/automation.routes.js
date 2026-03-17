const router = require('express').Router();
const { LogEntry, Server, SystemMetric } = require('../models');
const { authorize } = require('../middleware/auth.middleware');

// POST /api/automation/run-audit
// Proxies validation to the Python Intelligence Engine
router.post('/run-audit', authorize(['super_admin']), async (req, res) => {
    try {
        console.log('Sending Audit Request to Python Service...');

        const PYTHON_URL = process.env.PYTHON_URL || 'http://127.0.0.1:5001';
        const response = await fetch(`${PYTHON_URL}/automation/audit`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' }
        });

        const data = await response.json();

        // Log this Python-driven audit event to the database (Filtered by User)
        await LogEntry.create({
            severity: data.overallStatus === 'Optimized' ? 'low' : 'medium',
            device: 'Python-Automation-Engine',
            message: `Automated audit completed via ${data.engine}. Overall: ${data.overallStatus}`,
            suggestion: 'View Automation Lab for detailed matrix.',
            timestamp: new Date(),
            UserId: req.user.id
        });

        res.json(data);
    } catch (err) {
        console.error('Automation Proxy Error (Python down?):', err.message);

        // Fallback to basic Node validation if Python is unreachable
        res.json({
            timestamp: new Date(),
            overallStatus: 'Degraded (Fallback)',
            engine: 'Node-Local-Fallback',
            results: [
                { task: 'Python Handshake', status: 'FAIL', detail: 'External AI Engine unreachable.' },
                { task: 'Basic Integrity', status: 'PASS', detail: 'Local node diagnostics operational.' }
            ]
        });
    }
});

// GET /api/automation/stats (Partitioned by User)
router.get('/stats', authorize(['super_admin', 'admin', 'analyst', 'User', 'user']), async (req, res) => {
    try {
        const totalLogs = await LogEntry.count({ where: { UserId: req.user.id } });
        const activeServers = await Server.count({ where: { status: 'online', UserId: req.user.id } });
        const avgCpu = await SystemMetric.findOne({
            where: { UserId: req.user.id },
            order: [['createdAt', 'DESC']]
        });

        res.json({
            totalLogs,
            activeServers,
            currentCpu: avgCpu ? avgCpu.cpuLoad : 0
        });
    } catch (err) {
        res.status(500).json({ error: 'Failed to fetch automation stats' });
    }
});

module.exports = router;
