const router = require('express').Router();

const { LogEntry, Server } = require('../models');

router.post('/', async (req, res) => {
  try {
    const events = req.body.events || [];

    for (const event of events) {
      // 1. Log the event
      if (event.message) {
        await LogEntry.create({
          severity: event.severity || 'info',
          device: event.hostname || 'unknown',
          message: event.message,
          timestamp: event.timestamp || new Date()
        });
      }

      // 2. Update Server Status if heartbeat
      if (event.type === 'heartbeat' && event.hostname) {
        await Server.upsert({
          hostname: event.hostname,
          ipAddress: event.ip || '0.0.0.0',
          status: 'online',
          load: event.load || 0,
          lastSeen: new Date()
        });
      }
    }

    res.json({ status: 'ok', received: events.length });
  } catch (err) {
    console.error('Ingest Error:', err);
    res.status(500).json({ error: 'Ingest failed' });
  }
});

module.exports = router;
