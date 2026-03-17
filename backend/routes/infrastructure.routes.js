module.exports = function (io) {
    const router = require('express').Router();
    const { Server } = require('../models');

    const { authorize } = require('../middleware/auth.middleware');

    // GET /api/infrastructure
    router.get('/', authorize(['super_admin', 'admin', 'analyst']), async (req, res) => {
        try {
            const servers = await Server.findAll({
                where: { UserId: req.user.id },
                order: [['hostname', 'ASC']]
            });
            res.json(servers);
        } catch (err) {
            console.error('Infrastructure Error:', err);
            res.status(500).json({ error: 'Failed to fetch server list' });
        }
    });

    // POST /api/infrastructure/register
    router.post('/register', authorize(['super_admin', 'admin']), async (req, res) => {
        try {
            const { hostname, ipAddress, region, status, cpu, ram, disk } = req.body;

            if (!hostname || !ipAddress) {
                return res.status(400).json({ error: 'Hostname and IP Address are required' });
            }

            const [server, created] = await Server.upsert({
                hostname,
                ipAddress,
                region,
                status,
                cpu: cpu || 0,
                ram: ram || 0,
                disk: disk || 0,
                lastSeen: new Date(),
                UserId: req.user.id
            });

            const allServers = await Server.findAll({ where: { UserId: req.user.id } });
            if (io) io.emit('infrastructure_update', allServers);

            res.json({ message: created ? 'Server registered' : 'Server updated', server });
        } catch (err) {
            res.status(500).json({ error: 'Failed to register server' });
        }
    });

    // --- AGENT TELEMETRY (PUBLIC ACCESS WITH API_KEY) ---
    router.post('/agent/pulse', async (req, res) => {
        try {
            const { apiKey, cpu, ram, disk, uptime, processes, logs } = req.body;
            
            if (!apiKey) return res.status(401).json({ error: 'Agency Token Required' });

            const server = await Server.findOne({ where: { apiKey } });
            if (!server) return res.status(404).json({ error: 'Node Not Registered' });

            // Update Metrics
            server.cpu = cpu || server.cpu;
            server.ram = ram || server.ram;
            server.disk = disk || server.disk;
            server.uptime = uptime || server.uptime;
            server.activeProcesses = processes || server.activeProcesses;
            server.lastSeen = new Date();
            server.status = 'online';
            await server.save();

            // Process Inbound Logs (Streaming Bridge)
            if (logs && Array.isArray(logs)) {
                const { LogEntry } = require('../models');
                const entries = logs.map(l => ({
                    severity: l.severity || 'INFO',
                    device: server.hostname,
                    message: l.message,
                    ip: server.ipAddress,
                    ServerId: server.id,
                    UserId: server.UserId,
                    timestamp: new Date()
                }));
                await LogEntry.bulkCreate(entries);
                
                // Broadcast live logs individually for smoother terminal animation
                if (io) {
                    entries.forEach(entry => io.emit('streaming_log', entry));
                }
            }

            // Real-time Dashboard Update
            const activeIO = io || global.io;
            if (activeIO) {
                const updatedServers = await Server.findAll({ where: { UserId: server.UserId } });
                activeIO.emit('infrastructure_update', updatedServers);
            }

            // --- ACTIVE ALERT ENGINE ---
            const alertEngine = require('../services/alert.service');
            alertEngine.analyzeTelemetry(server);

            res.json({ status: 'ACK', latency: '2ms' });
        } catch (err) {
            console.error('Agent Pulse Error:', err);
            res.status(500).json({ error: 'Telemetry Sync Failed' });
        }
    });

    return router;
};
