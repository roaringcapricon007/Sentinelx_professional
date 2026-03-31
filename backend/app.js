const express = require('express');
const path = require('path');
const cors = require('cors');
const session = require('express-session');
const passport = require('passport');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
require('dotenv').config();

const app = express();

// Standard Middleware
// app.use(helmet()); 
app.use(cors({ origin: "*" }));
app.use(express.json({ limit: "10kb" }));

// UI Rate Limiting & Firewall Neutralized for SOC Sync (v10.9)
// app.use(limiter); 
// app.use(firewall);

// ✅ ROOT UI (Serve Dashboard - PRIORITY 1)
app.get("/", (req, res) => {
    console.log("🔥 SENTINELX CORE: SERVING DASHBOARD UI...");
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// 🔥 Best Debug Setup (MANDATORY GATEWAY LOGGING)
app.use((req, res, next) => {
  console.log(`[DEBUG] ${req.method} ${req.url}`);
  next();
});

// ✅ HEALTH CHECK
app.get("/health", (req, res) => {
  res.send("OK ✅");
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

// Session synchronization handled asynchronously to prevent startup deadlock
// sessionStore.sync();

app.use(passport.initialize());
app.use(passport.session());

// Identity Synchronizer
app.use((req, res, next) => {
  if (!req.user && req.session && req.session.user) {
    req.user = req.session.user;
  }
  next();
});

// ✅ DEVICE REGISTER (Point 7)
app.use("/device", require("./routes/device.routes"));

// ✅ DEBUG TEST ROUTER (STEP 2 MANDATORY)
app.get("/debug", (req, res) => {
  res.send("DEBUG WORKING ✅");
});

// API Route Orchestrator (Point 10)
const apiRoutes = require('./routes/api');
console.log("ROUTES LOADING STATUS:", typeof apiRoutes === 'function' ? '✅ CORRECT [Function: router]' : '❌ ERROR: Export was ' + typeof apiRoutes);
app.use('/api', apiRoutes);

app.use(express.static(path.join(__dirname, 'public')));

// ❌ 404 HANDLER
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: "Route not found ❌"
  });
});

// ❌ GLOBAL ERROR HANDLER
app.use((err, req, res, next) => {
  console.error("🔥 ERROR:", err);
  res.status(500).json({
    success: false,
    message: "Internal Server Error"
  });
});

module.exports = app;
