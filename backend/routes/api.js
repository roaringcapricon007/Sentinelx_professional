const express = require('express');
const router = express.Router();

// ✅ API ROOT (Point 2)
router.get("/", (req, res) => {
  res.json({
    success: true,
    message: "API working ✅"
  });
});

// ✅ TEST ROUTE
router.get("/test", (req, res) => {
  res.json({
    success: true,
    message: "Test route working 🚀"
  });
});

// --- 1. CORE AUTH & INGEST ---
const authRoutes = require('./auth.routes');
const ingestRoutes = require('./ingest.routes');

// --- 2. INTELLIGENCE & TELEMETRY ---
const aiRoutes = require('./ai.routes');
const metricsRoutes = require('./metrics.routes');
const infrastructureRoutes = require('./infrastructure.routes')(null);
const logsRoutes = require('./logs.routes')(null);

// --- 3. ANALYSIS & SOAR ---
const analysisRoutes = require('./analysis.routes');
const soarRoutes = require('./soar.routes');
const automationRoutes = require('./automation.routes');

// --- 4. MAINTENANCE & TESTING ---
const maintenanceRoutes = require('./maintenance.routes');
const testingRoutes = require('./testing.routes');

// --- MOUNTING (MANDATORY Point 10) ---
router.use('/auth', authRoutes);
router.use('/ingest', ingestRoutes);
router.use('/ai', aiRoutes);
router.use('/metrics', metricsRoutes);
router.use('/infrastructure', infrastructureRoutes);
router.use('/logs', logsRoutes);
router.use('/analysis', analysisRoutes);
router.use('/soar', soarRoutes);
router.use('/automation', automationRoutes);
router.use('/maintenance', maintenanceRoutes);
router.use('/testing', testingRoutes);

module.exports = router;
