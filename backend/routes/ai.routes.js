const router = require('express').Router();

const { generateResponse } = require('../controllers/ai.controller');

// GET /api/ai/status
router.get('/status', (req, res) => {
    const hasOpenAI = !!process.env.OPENAI_API_KEY && process.env.OPENAI_API_KEY !== 'PLACEHOLDER_API_KEY' && process.env.OPENAI_API_KEY !== 'PLACEHOLDER';
    res.json({
        model: hasOpenAI ? 'ChatGPT (GPT-4o)' : 'SentinelX Local NLP',
        status: 'Active',
        gptEnabled: hasOpenAI
    });
});

// POST /api/ai/chat
router.post('/chat', async (req, res) => {
    try {
        const { message, engine } = req.body;
        if (!message) return res.status(400).json({ error: 'Message required' });

        const reply = await generateResponse(message, engine || 'auto');
        res.json({ reply });
    } catch (err) {
        console.error('AI Error:', err);
        res.status(500).json({ error: 'AI processing failed' });
    }
});

// POST /api/ai/train
router.post('/train', async (req, res) => {
    const { exec } = require('child_process');
    const path = require('path');

    const scriptPath = path.join(__dirname, '../train_ai.js');

    exec(`node "${scriptPath}"`, (error, stdout, stderr) => {
        if (error) {
            console.error(`Train Error: ${error}`);
            return res.status(500).json({ error: 'Training failed' });
        }
        res.json({ message: 'AI Model Retrained Successfully', details: stdout });
    });
});

module.exports = router;
