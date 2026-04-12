const express = require('express');
const router = express.Router();
const logController = require("../controllers/log.controller");
const { authorize } = require('../middleware/auth.middleware');

// ✅ API ROOT (Point 2)
router.get("/", (req, res) => {
  res.json({
    success: true,
    message: "API working ✅"
  });
});

// ✅ LOGGING & FORENSICS (Point 10 Premium)
router.post("/log", logController.receiveLog);
router.get("/logs", authorize(), logController.getLogs);
router.get("/logs/timeline", authorize(), logController.getTimeline);
router.get("/logs/history", authorize(), logController.getLogs);
router.get("/logs/search", authorize(), logController.searchLogs);
router.post("/logs/resolve/:id", authorize(['super_admin']), logController.resolveLog);
router.post("/logs/block-ip", authorize(['super_admin']), logController.blockIP);
router.post("/logs/disable-user", authorize(['super_admin']), logController.disableUser);
router.get("/logs/risk-score", authorize(), logController.getRiskScore);

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

// --- 3. ANALYSIS & TESTING ---
const analysisRoutes = require('./analysis.routes');
const testingRoutes = require('./testing.routes');

// --- 4. MAINTENANCE ---
const maintenanceRoutes = require('./maintenance.routes');

// --- MOUNTING (MANDATORY Point 10) ---
router.use('/auth', authRoutes); // Auth routes manage their own protection
router.use('/ai', authorize(['super_admin']), aiRoutes);
router.use('/metrics', authorize(), metricsRoutes);
router.use('/infrastructure', authorize(['super_admin']), infrastructureRoutes);
router.use('/analysis', authorize(), analysisRoutes);
router.use('/testing', authorize(['super_admin']), testingRoutes);
router.use('/maintenance', authorize(['super_admin']), maintenanceRoutes);

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
