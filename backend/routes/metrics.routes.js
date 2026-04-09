const express = require('express');
const router = express.Router();
const si = require('systeminformation');
const { SystemMetric } = require('../models');
const { authorize } = require('../middleware/auth.middleware');

// GET /api/metrics/realtime
// Returns live system stats
router.get('/realtime', authorize(['super_admin', 'admin', 'analyst', 'User']), async (req, res) => {
    try {
        const [cpu, mem, network] = await Promise.all([
            si.currentLoad(),
            si.mem(),
            si.networkStats()
        ]);

        const data = {
            cpuLoad: Math.round(cpu.currentLoad || 0),
            memoryUsage: Math.round(((mem.active || 1) / (mem.total || 1)) * 100),
            networkRx: (network && network[0] && network[0].rx_sec) ? network[0].rx_sec : 0, // Bytes per sec
            networkTx: (network && network[0] && network[0].tx_sec) ? network[0].tx_sec : 0,
            uptime: si.time().uptime,
            timestamp: new Date()
        };

        // Persist to DB for historical charts (Filtered by authenticated user)
        SystemMetric.create({
            cpuLoad: data.cpuLoad,
            memoryUsage: data.memoryUsage,
            networkTraffic: data.networkRx + data.networkTx,
            UserId: req.user.id
        }).catch(err => console.error('Metric save error:', err));

        res.json(data);
    } catch (err) {
        console.error('Metrics Error:', err);
        res.status(500).json({ error: 'Failed to fetch metrics' });
    }
});

// GET /api/metrics/history
// Returns last 50 data points for charts (Partitioned by user)
router.get('/history', authorize(['super_admin', 'admin', 'analyst', 'User']), async (req, res) => {
    try {
        const history = await SystemMetric.findAll({
            where: { UserId: req.user.id },
            limit: 50,
            order: [['createdAt', 'DESC']]
        });
        res.json(history.reverse());
    } catch (err) {
        res.status(500).json({ error: 'Failed to fetch history' });
    }
});

// GET /api/metrics/predict (Step 10: Predictive Analysis)
router.get('/predict', authorize(['super_admin', 'admin', 'analyst', 'User']), async (req, res) => {
    try {
        const history = await SystemMetric.findAll({
            where: { UserId: req.user.id },
            limit: 20,
            order: [['createdAt', 'DESC']]
        });

        if (history.length < 5) {
            return res.json({ predictions: [], message: 'Not enough data for prediction (need 5+ snapshots).' });
        }

        const data = history.reverse(); // oldest first
        const predictions = [];

        // --- Simple Linear Regression for CPU & Memory ---
        function linearPredict(values, label) {
            const n = values.length;
            const xMean = (n - 1) / 2;
            const yMean = values.reduce((a, b) => a + b, 0) / n;

            let num = 0, den = 0;
            for (let i = 0; i < n; i++) {
                num += (i - xMean) * (values[i] - yMean);
                den += (i - xMean) * (i - xMean);
            }
            const slope = den !== 0 ? num / den : 0;
            const intercept = yMean - slope * xMean;

            // If slope is positive (increasing), predict when it hits 90%
            if (slope > 0.3) {
                const target = 90;
                const stepsToTarget = (target - values[n - 1]) / slope;
                if (stepsToTarget > 0 && stepsToTarget < 200) {
                    // Each step is ~3 seconds (metric sampling interval)
                    const minutesLeft = Math.round((stepsToTarget * 3) / 60);
                    const hoursLeft = (minutesLeft / 60).toFixed(1);
                    const timeStr = minutesLeft > 120 ? `~${hoursLeft} hours` : `~${minutesLeft} minutes`;

                    predictions.push({
                        metric: label,
                        current: Math.round(values[n - 1]),
                        trend: 'INCREASING',
                        slope: parseFloat(slope.toFixed(2)),
                        prediction: `⚠ ${label} may reach CRITICAL levels (90%) in ${timeStr}.`,
                        severity: minutesLeft < 30 ? 'CRITICAL' : minutesLeft < 120 ? 'WARNING' : 'WATCH',
                        eta_minutes: minutesLeft
                    });
                }
            } else if (slope < -0.3) {
                predictions.push({
                    metric: label,
                    current: Math.round(values[n - 1]),
                    trend: 'DECREASING',
                    slope: parseFloat(slope.toFixed(2)),
                    prediction: `✅ ${label} is trending downward. System recovering.`,
                    severity: 'OK',
                    eta_minutes: null
                });
            } else {
                predictions.push({
                    metric: label,
                    current: Math.round(values[n - 1]),
                    trend: 'STABLE',
                    slope: parseFloat(slope.toFixed(2)),
                    prediction: `✅ ${label} is stable. No action needed.`,
                    severity: 'OK',
                    eta_minutes: null
                });
            }
        }

        const cpuValues = data.map(d => d.cpuLoad || 0);
        const memValues = data.map(d => d.memoryUsage || 0);

        linearPredict(cpuValues, 'CPU Load');
        linearPredict(memValues, 'Memory Usage');

        res.json({ predictions, dataPoints: data.length });
    } catch (err) {
        console.error('Prediction Error:', err);
        res.status(500).json({ error: 'Predictive analysis failed' });
    }
});


// Aggregated System Overview
router.get('/summary', authorize(['super_admin', 'admin', 'analyst', 'User']), async (req, res) => {
    try {
        const { LogEntry, Server } = require('../models');
        const [cpu, mem] = await Promise.all([si.currentLoad(), si.mem()]);
        
        const summary = {
            system: {
                cpu: Math.round(cpu.currentLoad),
                mem: Math.round((mem.active / mem.total) * 100),
                uptime: si.time().uptime
            },
            counts: {
                logs: await LogEntry.count({ where: { UserId: req.user.id } }),
                devices: await Server.count({ where: { UserId: req.user.id } }),
                anomalies: await LogEntry.count({ where: { UserId: req.user.id, severity: 'CRITICAL' } })
            }
        };
        res.json(summary);
    } catch (e) {
        res.status(500).json({ error: 'Summary aggregation failed' });
    }
});

module.exports = router;
