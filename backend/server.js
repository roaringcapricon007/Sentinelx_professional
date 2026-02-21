const express = require('express');
const path = require('path');
const http = require('http');
const socketIo = require('socket.io');

require('dotenv').config();
const session = require('express-session');
const passport = require('passport');

// Routes
const ingestRoutes = require('./routes/ingest.routes');
const analysisRoutes = require('./routes/analysis.routes');
const authRoutes = require('./routes/auth.routes');
const metricsRoutes = require('./routes/metrics.routes');
const aiRoutes = require('./routes/ai.routes');
const automationRoutes = require('./routes/automation.routes');
const maintenanceRoutes = require('./routes/maintenance.routes');
const testingRoutes = require('./routes/testing.routes');


const app = express();
const server = http.createServer(app);
const io = socketIo(server);

// Routes with Socket.IO
const infrastructureRoutes = require('./routes/infrastructure.routes')(io);
const logsRoutes = require('./routes/logs.routes')(io);

// Make io accessible to routes if needed
app.set('io', io);

// Socket.io Config
const chatSocket = require('./sockets/chat.socket');
chatSocket(io);

app.use(express.json());

// Session Config
app.use(session({
  secret: process.env.SESSION_SECRET || 'dev_secret_key',
  resave: false,
  saveUninitialized: false,
  cookie: { secure: false } // Set true if using https
}));

// Passport Config
app.use(passport.initialize());
app.use(passport.session());

// Mount Routes
// Database
const sequelize = require('./database');
const { User, SystemMetric, LogEntry, Server } = require('./models');


// Mount Routes
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

app.use(express.static(path.join(__dirname, 'public')));

// Start Server with DB Sync
sequelize.sync({ force: false }).then(async () => {
  console.log('Database connected and synced');

  // Seed Admin if not exists
  const adminEmail = 'Admin@senitnelX.com';
  const adminPassword = 'SentinelXadmin007';

  const adminCount = await User.count({ where: { email: adminEmail } });
  if (adminCount === 0) {
    const bcrypt = require('bcryptjs');
    const hashedPassword = await bcrypt.hash(adminPassword, 4);

    await User.create({
      name: 'SentinelX Admin',
      email: adminEmail,
      password: hashedPassword,
      role: 'Super Admin',
      provider: 'local'
    });
    console.log('Admin user seeded with requested credentials');
  }


  // Seed Servers for Infrastructure view
  const serverCount = await Server.count();
  if (serverCount === 0) {
    await Server.bulkCreate([
      { hostname: 'PROD-AWS-01', ipAddress: '10.0.0.45', region: 'US-East', status: 'online', load: 12 },
      { hostname: 'PROD-AWS-02', ipAddress: '10.0.0.46', region: 'US-East', status: 'online', load: 45 },
      { hostname: 'DB-CLUSTER-01', ipAddress: '10.0.1.10', region: 'EU-West', status: 'warning', load: 88 },
      { hostname: 'BACKUP-NODE', ipAddress: '192.168.1.15', region: 'Local', status: 'offline', load: 0 }
    ]);
    console.log('Infrastructure servers seeded');
  }

  // Seed Logs for Audit Vault
  const logCount = await LogEntry.count();
  if (logCount === 0) {
    await LogEntry.bulkCreate([
      { device: 'Firewall-01', severity: 'WARN', message: 'Port 22 attempted access from 192.168.1.105', suggestion: 'Ban IP', timestamp: new Date() },
      { device: 'Auth-Server', severity: 'ERROR', message: 'Multiple failed login attempts for root', suggestion: 'Lock account', timestamp: new Date(Date.now() - 86400000) },
      { device: 'Web-Gateway', severity: 'INFO', message: 'SSL Certificate renewed', suggestion: 'None', timestamp: new Date(Date.now() - 172800000) },
      { device: 'Database-Cluster', severity: 'WARN', message: 'Slow query detected on UserTable', suggestion: 'Optimize Index', timestamp: new Date(Date.now() - 259200000) }
    ]);
    console.log('Audit logs seeded');
  }


  // --- Real-time Metrics Emitter (v5.0) ---
  const si = require('systeminformation');

  setInterval(async () => {
    try {
      const [cpu, mem, network] = await Promise.all([
        si.currentLoad(),
        si.mem(),
        si.networkStats()
      ]);

      const data = {
        cpuLoad: Math.round(cpu.currentLoad),
        memoryUsage: Math.round((mem.active / mem.total) * 100),
        networkRx: network && network[0] ? network[0].rx_sec : 0,
        networkTx: network && network[0] ? network[0].tx_sec : 0,
        timestamp: new Date()
      };

      // 1. Broadcast UI Updates
      io.emit('metrics_update', data);

      // 2. Persist "Holding Values" to DB
      SystemMetric.create({
        cpuLoad: data.cpuLoad,
        memoryUsage: data.memoryUsage,
        networkTraffic: data.networkRx + data.networkTx
      }).catch(err => console.error('Metric persist failed:', err));

      // 3. Update Infrastructure Loads randomly for visual flow
      await Server.update(
        { load: parseFloat((Math.random() * 80).toFixed(1)), lastSeen: new Date() },
        { where: { status: 'online' } }
      );

      const allServers = await Server.findAll({ order: [['hostname', 'ASC']] });
      io.emit('infrastructure_update', allServers);

    } catch (e) {
      console.error('Core Telementry Error:', e);
    }
  }, 4000); // Optimized 4s frequency for Enterprise Stability

  const PORT = process.env.PORT || 3000;
  server.listen(PORT, () => {
    console.log(`SentinelX Professional v6.0 running on port ${PORT}`);
  });
}).catch(err => {
  console.error('Core Database connection failed:', err);
});
