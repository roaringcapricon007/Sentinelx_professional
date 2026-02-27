const router = require('express').Router();
const { authorize } = require('../middleware/auth.middleware');
// Native fetch is available in Node 18+

// Proxy to Python Service
const PYTHON_URL = 'http://127.0.0.1:5001';

router.get('/pulse', authorize(['super_admin', 'admin', 'analyst', 'user']), async (req, res) => {
    try {
        const response = await fetch(`${PYTHON_URL}/security/pulse`);
        const data = await response.json();
        res.json(data);
    } catch (e) {
        console.error("Pulse Error:", e);
        // Fallback simulation if Python is down
        res.json({
            status: "active (fallback)",
            pps: 12.5,
            sessions: 900,
            risk_score: 10,
            threat_level: "LOW"
        });
    }
});

router.post('/train', authorize(['super_admin']), async (req, res) => {
    try {
        const response = await fetch(`${PYTHON_URL}/ai/train`, { method: 'POST' });
        const data = await response.json();
        res.json(data);
    } catch (e) {
        res.status(500).json({ error: "AI Service Unreachable" });
    }
});

router.post('/sync', authorize(['super_admin']), async (req, res) => {
    try {
        const response = await fetch(`${PYTHON_URL}/ai/sync`, { method: 'POST' });
        const data = await response.json();
        res.json(data);
    } catch (e) {
        res.status(500).json({ error: "AI Service Unreachable" });
    }
});

router.get('/health', async (req, res) => {
    try {
        const response = await fetch(`${PYTHON_URL}/health`);
        const data = await response.json();
        res.json(data);
    } catch (e) {
        res.status(503).json({ status: "offline", error: "AI Service Unreachable" });
    }
});

module.exports = router;
