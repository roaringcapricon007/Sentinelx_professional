const router = require('express').Router();

const { generateResponse } = require('../controllers/ai.controller');

// POST /api/ai/chat
router.post('/chat', async (req, res) => {
    try {
        const { message } = req.body;
        if (!message) return res.status(400).json({ error: 'Message required' });

        const reply = await generateResponse(message);
        res.json({ reply });
    } catch (err) {
        console.error('AI Error:', err);
        res.status(500).json({ error: 'AI processing failed' });
    }
});

module.exports = router;
