const express = require('express');
const router = express.Router();
const logController = require("../controllers/log.controller");

// ✅ API ROOT (Point 2)
router.get("/", (req, res) => {
  res.json({
    success: true,
    message: "API working ✅"
  });
});

// ✅ LOGGING & FORENSICS (Point 10 Premium)
router.post("/log", logController.receiveLog);
router.get("/logs", logController.getLogs);
router.get("/logs/search", logController.searchLogs);
router.post("/logs/resolve/:id", logController.resolveLog);
router.post("/logs/block-ip", logController.blockIP);

// ✅ TEST ROUTE
router.get("/test", (req, res) => {
    res.json({ success: true, message: "Test route working 🚀" });
});

// --- 1. CORE AUTH ---
const authRoutes = require('./auth.routes');

// --- 2. INTELLIGENCE & TELEMETRY ---
const aiRoutes = require('./ai.routes');
const metricsRoutes = require('./metrics.routes');
const infrastructureRoutes = require('./infrastructure.routes')(null);

// --- 3. ANALYSIS ---
const analysisRoutes = require('./analysis.routes');

// --- 4. MAINTENANCE ---
const maintenanceRoutes = require('./maintenance.routes');

// --- MOUNTING (MANDATORY Point 10) ---
router.use('/auth', authRoutes);
router.use('/ai', aiRoutes);
router.use('/metrics', metricsRoutes);
router.use('/infrastructure', infrastructureRoutes);
router.use('/analysis', analysisRoutes);
router.use('/maintenance', maintenanceRoutes);

// --- ALIASES FOR FRONTEND SYNC ---
router.use('/overview', metricsRoutes); 
router.use('/devices', infrastructureRoutes);
router.use('/stats', metricsRoutes);
router.use('/reports', analysisRoutes);
router.use('/topology', infrastructureRoutes);
router.use('/audit', logController.getLogs); 

// Catch-all for undefined /api routes inside this router
router.use((req, res) => {
  res.status(404).json({
    success: false,
    error: "NOT_FOUND",
    message: "Requested neural endpoint not mapped."
  });
});

module.exports = router;
