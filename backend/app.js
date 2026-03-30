const express = require('express');
const path = require('path');
const cors = require('cors');
const session = require('express-session');
const passport = require('passport');
require('dotenv').config();

const app = express();

// Standard Middleware
app.use(cors({ origin: "*" }));
app.use(express.json());

// Sovereign Firewall (SOAR Enforcement Layer)
const firewall = require('./middleware/firewall.middleware');
app.use(firewall);

// 🔥 Best Debug Setup (MANDATORY GATEWAY LOGGING)
app.use((req, res, next) => {
  console.log(`[DEBUG] ${req.method} ${req.url}`);
  next();
});

// ✅ ROOT EXPOSURE (Point 1)
app.get("/", (req, res) => {
  res.json({
    status: "SentinelX Backend Running 🚀",
    message: "Server live",
    time: new Date()
  });
});

// ✅ MANDATORY HEALTH CHECK (Point 5)
app.get("/health", (req, res) => {
    res.status(200).send("OK");
});

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

// API Route Orchestrator (Point 10)
const apiRoutes = require('./routes/api');
app.use('/api', apiRoutes);

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
