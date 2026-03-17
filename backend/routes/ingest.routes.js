const router = require('express').Router();

const { LogEntry, Server } = require('../models');

router.post('/', async (req, res) => {
  try {
    const events = req.body.events || [];

    const logService = require('../services/log.service');
    const alertEngine = require('../services/alert.service');

    for (const event of events) {
      // 1. Enter the Neural Stream
      if (event.message) {
        await logService.ingestLog({
          severity: event.severity || 'INFO',
          device: event.hostname || 'REMOTE_NODE',
          message: event.message,
          ip: event.ip || '0.0.0.0'
        });
      }

      // 2. Machine Pulse Validation
      if (event.type === 'heartbeat' && event.hostname) {
        const [server] = await Server.upsert({
          hostname: event.hostname,
          ipAddress: event.ip || '0.0.0.0',
          status: 'online',
          cpu: event.cpu || 0,
          ram: event.ram || 0,
          lastSeen: new Date()
        });
        
        // Active Security Check
        alertEngine.analyzeTelemetry(server);
      }
    }

    res.json({ status: 'ACK', processed: events.length });
  } catch (err) {
    console.error('Ingest Error:', err);
    res.status(500).json({ error: 'Ingest failed' });
  }
});

module.exports = router;
