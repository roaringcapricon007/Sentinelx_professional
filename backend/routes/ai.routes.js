const router = require('express').Router();
const { authorize } = require('../middleware/auth.middleware');
// Native fetch is available in Node 18+

// Proxy to Python Service
// Proxy to Python Service
const PYTHON_URL = process.env.PYTHON_URL || 'http://127.0.0.1:5001';


router.post('/train', authorize(['super_admin', 'admin']), async (req, res) => {
    try {
        const response = await fetch(`${PYTHON_URL}/ai/train`, { method: 'POST' });
        const data = await response.json();
        res.json(data);
    } catch (e) {
        res.status(500).json({ error: "AI Service Unreachable" });
    }
});

router.post('/sync', authorize(['super_admin', 'admin']), async (req, res) => {
    try {
        const response = await fetch(`${PYTHON_URL}/ai/sync`, { method: 'POST' });
        const data = await response.json();
        res.json(data);
    } catch (e) {
        res.status(500).json({ error: "AI Service Unreachable" });
    }
});


router.get('/status', async (req, res) => {
    try {
        const response = await fetch(`${PYTHON_URL}/health`);
        const data = await response.json();
        res.json({
            model: data.advanced_brain ? "PRIME_AI Quantum Nexus (Llama-3)" : "SentinelX Lite-Brain (NLP-MultiBayes)",
            gptEnabled: data.advanced_brain,
            status: "online",
            version: "v7.5.0-Synchronized"
        });
    } catch (e) {
        res.json({ model: "Neural Bridge Offline", gptEnabled: false, status: "offline" });
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
