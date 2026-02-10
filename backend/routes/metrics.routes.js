const express = require('express');
const router = express.Router();
const si = require('systeminformation');
const { SystemMetric } = require('../models');

// GET /api/metrics/realtime
// Returns live system stats
router.get('/realtime', async (req, res) => {
    try {
        const [cpu, mem, network] = await Promise.all([
            si.currentLoad(),
            si.mem(),
            si.networkStats()
        ]);

        const data = {
            cpuLoad: Math.round(cpu.currentLoad),
            memoryUsage: Math.round((mem.active / mem.total) * 100),
            networkRx: network && network[0] ? network[0].rx_sec : 0, // Bytes per sec
            networkTx: network && network[0] ? network[0].tx_sec : 0,
            uptime: si.time().uptime,
            timestamp: new Date()
        };

        // Persist to DB for historical charts (Fire and Forget)
        SystemMetric.create({
            cpuLoad: data.cpuLoad,
            memoryUsage: data.memoryUsage,
            networkTraffic: data.networkRx + data.networkTx
        }).catch(err => console.error('Metric save error:', err));

        res.json(data);
    } catch (err) {
        console.error('Metrics Error:', err);
        res.status(500).json({ error: 'Failed to fetch metrics' });
    }
});

// GET /api/metrics/history
// Returns last 50 data points for charts
router.get('/history', async (req, res) => {
    try {
        const history = await SystemMetric.findAll({
            limit: 50,
            order: [['createdAt', 'DESC']]
        });
        res.json(history.reverse());
    } catch (err) {
        res.status(500).json({ error: 'Failed to fetch history' });
    }
});

module.exports = router;
