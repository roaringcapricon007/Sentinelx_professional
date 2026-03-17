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

// Session Config
app.use(session({
  secret: process.env.SESSION_SECRET || 'dev_secret_key',
  resave: false,
  saveUninitialized: false,
  cookie: { secure: false }
}));

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

module.exports = app;
