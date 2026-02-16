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
// Logs Route (requires IO, so imported later)
// const infrastructureRoutes = require('./routes/infrastructure.routes'); // Moved below
const aiRoutes = require('./routes/ai.routes');


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

      io.emit('metrics_update', data);

    } catch (e) {
      console.error('Metrics Emit Error:', e);
    }
  }, 3000); // Frequency reduced to 3s to stabilize performance

  server.listen(3000, () => {
    console.log('SentinelX v5.0 (AI+Realtime) running on port 3000');
  });
}).catch(err => {
  console.error('Database connection failed:', err);
});
