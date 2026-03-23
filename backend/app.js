const express = require('express');
const path = require('path');
const cors = require('cors');
const session = require('express-session');
const passport = require('passport');
require('dotenv').config();

const app = express();

// Standard Middleware
app.use(cors());
app.use(express.json());

// Sovereign Firewall (SOAR Enforcement Layer)
const firewall = require('./middleware/firewall.middleware');
app.use(firewall);

// Session Config with Database Persistence
const SequelizeStore = require('connect-session-sequelize')(session.Store);
const sequelize = require('./database');

const sessionStore = new SequelizeStore({
  db: sequelize,
  tableName: 'Sessions', // Default but explicit for audit
  checkExpirationInterval: 15 * 60 * 1000, // 15 min cleanup
  expiration: 24 * 60 * 60 * 1000 // 24 hour max session
});

app.use(session({
  secret: process.env.SESSION_SECRET || 'sentinelx_enterprise_nexus_2026',
  store: sessionStore,
  resave: false,
  saveUninitialized: false,
  proxy: true, // Required for secure cookie behind reverse proxies
  cookie: { secure: false, maxAge: 24 * 60 * 60 * 1000 }
}));

sessionStore.sync();

app.use(passport.initialize());
app.use(passport.session());

// Identity Synchronizer
app.use((req, res, next) => {
  if (!req.user && req.session && req.session.user) {
    req.user = req.session.user;
  }
  next();
});

// Route Definitions
const ingestRoutes = require('./routes/ingest.routes');
const analysisRoutes = require('./routes/analysis.routes');
const authRoutes = require('./routes/auth.routes');
const metricsRoutes = require('./routes/metrics.routes');
const aiRoutes = require('./routes/ai.routes');
const automationRoutes = require('./routes/automation.routes');
const maintenanceRoutes = require('./routes/maintenance.routes');
const testingRoutes = require('./routes/testing.routes');
const soarRoutes = require('./routes/soar.routes');

// Sockets requirement for these routes (will use global.io anyway)
const infrastructureRoutes = require('./routes/infrastructure.routes')(null);
const logsRoutes = require('./routes/logs.routes')(null);

// Mount
app.use('/api/ingest', ingestRoutes);
app.use('/api/analysis', analysisRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/metrics', metricsRoutes);
app.use('/api/infrastructure', infrastructureRoutes);
app.use('/api/logs', logsRoutes);
app.use('/api/ai', aiRoutes);
app.use('/api/automation', automationRoutes);
app.use('/api/maintenance', maintenanceRoutes);
app.use('/api/testing', testingRoutes);
app.use('/api/soar', soarRoutes);

app.use(express.static(path.join(__dirname, 'public')));

// --- MONITORING HOOK (Phase 4 Reliability) ---
app.get('/api/healthcheck', (req, res) => {
  res.json({
    status: 'ACTIVE',
    handshake: 'PRODUCED',
    timestamp: new Date(),
    service: 'SentinelX PROFESSIONAL CORE'
  });
});

// SPA Catch-all (Phase 1 UI Persistence)
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

module.exports = app;
