const router = require('express').Router();
const { Playbook } = require('../models');
const { authorize } = require('../middleware/auth.middleware');

// GET /api/soar/playbooks
router.get('/playbooks', authorize(['super_admin', 'analyst']), async (req, res) => {
    try {
        const playbooks = await Playbook.findAll({
            where: { UserId: req.user.id },
            order: [['createdAt', 'DESC']]
        });
        res.json(playbooks);
    } catch (err) {
        res.status(500).json({ error: 'Failed to fetch playbooks' });
    }
});

// POST /api/soar/playbooks
router.post('/playbooks', authorize(['super_admin']), async (req, res) => {
    try {
        const { name, description, triggerCondition, action } = req.body;
        const playbook = await Playbook.create({
            name,
            description,
            triggerCondition,
            action,
            UserId: req.user.id
        });
        res.json(playbook);
    } catch (err) {
        res.status(500).json({ error: 'Failed to create playbook' });
    }
});

// PATCH /api/soar/playbooks/:id
router.patch('/playbooks/:id', authorize(['super_admin']), async (req, res) => {
    try {
        const playbook = await Playbook.findOne({
            where: { id: req.params.id, UserId: req.user.id }
        });
        if (!playbook) return res.status(404).json({ error: 'Playbook not found' });

        const { isActive } = req.body;
        playbook.isActive = isActive !== undefined ? isActive : playbook.isActive;
        await playbook.save();
        res.json(playbook);
    } catch (err) {
        res.status(500).json({ error: 'Failed to update playbook' });
    }
});

module.exports = router;
