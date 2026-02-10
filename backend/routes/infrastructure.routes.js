module.exports = function (io) {
    const router = require('express').Router();
    const { Server } = require('../models');

    // GET /api/infrastructure
    router.get('/', async (req, res) => {
        try {
            const servers = await Server.findAll({
                order: [['hostname', 'ASC']]
            });
            res.json(servers);
        } catch (err) {
            console.error('Infrastructure Error:', err);
            res.status(500).json({ error: 'Failed to fetch server list' });
        }
    });

    // POST /api/infrastructure/register
    router.post('/register', async (req, res) => {
        try {
            const { hostname, ipAddress, region, status, load } = req.body;

            if (!hostname || !ipAddress) {
                return res.status(400).json({ error: 'Hostname and IP Address are required' });
            }

            const [server, created] = await Server.upsert({
                hostname,
                ipAddress,
                region,
                status,
                load,
                lastSeen: new Date()
            });

            // Real-time Update
            const allServers = await Server.findAll({ order: [['hostname', 'ASC']] });
            if (io) {
                io.emit('infrastructure_update', allServers);
            }

            res.json({ message: created ? 'Server registered' : 'Server updated', server });
        } catch (err) {
            console.error('Registration Error:', err);
            res.status(500).json({ error: 'Failed to register server' });
        }
    });

    return router;
};
