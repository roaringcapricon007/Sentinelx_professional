console.log("🔥 SENTINELX CORE: STARTING INITIALIZATION...");
const app = require('./app'); 
console.log("🔥 SENTINELX CORE: APP MODULE LOADED.");
const http = require('http');
const socketIo = require('socket.io');
const sequelize = require('./database');
const { Server, User } = require('./models');

const server = http.createServer(app);
const io = socketIo(server, { cors: { origin: '*' } });
console.log("🔥 SENTINELX CORE: HTTP SERVER & SOCKETS CREATED.");

// 1. GLOBAL ACCESS
global.io = io;
global.eventBus = require('./services/event.service');

// 2. INITIALIZE WORKERS (Process Layer)
const logWorker = require('./workers/log.worker');
const infraWorker = require('./workers/infrastructure.worker');

logWorker.initialize().catch(err => console.error('[WORKER] Init Serialized Error:', err));
infraWorker.initialize().catch(err => console.error('[WATCHDOG] Init Serialized Error:', err));

// 3. EVENT-TO-SOCKET BRIDGE (Push Layer)
/**
 * SentinelX Realtime Bridge v10.0
 * Translates internal Neural Stream events to Socket.io UI pushes.
 * This is the 'Push' layer (Step 3 of the Perfectionist Flow).
 */
global.eventBus.on('log:processed', (log) => {
    io.emit('new_log', log);
    io.emit('live_log', log); // Point 10 — Premium Live Tail
});
global.eventBus.on('log:repeat', (log) => io.emit('log_repeat', log));
global.eventBus.on('system:alert', (alert) => io.emit('system:alert', alert));
global.eventBus.on('infrastructure:update', (servers) => io.emit('infrastructure_update', servers));
global.eventBus.on('metrics:update', (data) => io.emit('metrics_update', data));

// 4. DATABASE & SEEDING (Initialization Layer)
const PORT = process.env.PORT || 3000;
server.listen(PORT, "0.0.0.0", () => {
    console.log(`🚀 Server running on port ${PORT}`);
    console.log(`
  =================================================
  SentinelX Professional v10.0 (Event-Driven Core)
  Uplink: http://0.0.0.0:${PORT}
  Realtime: Socket.io v4.0 Active
  =================================================
  `);

    sequelize.sync({ alter: true }).then(async () => {
        console.log('--- DATABASE HANDSHAKE COMPLETED ---');
        
        // --- ENSURE SESSION VAULT (v13.2) ---
        if (app.sessionStore) {
            app.sessionStore.sync().catch(e => console.error('[AUTH] Session Sync Error:', e.message));
        }

        // --- SEEDING LOGIC (Internal) ---
        await seedEnterpriseRoles();
        await seedInfrastructureNodes();
        
        // --- TELEMETRY BROADCASTER ---
        startTelemetryCycle();
        
    }).catch(err => {
        console.error('--- DATABASE INITIALIZATION FAILED ---');
        console.error(err.message);
    });
});

async function seedEnterpriseRoles() {
    const roles = [
        { name: 'Root Administrator', role: 'super_admin', email: 'Superadmin@SentinelX.com', pass: 'admin123' },
        { name: 'Senior Security Analyst', role: 'analyst', email: 'analyst@sentinelx.com', pass: 'analyst123' }
    ];
    const bcrypt = require('bcryptjs');
    for (const r of roles) {
        const hashedPassword = await bcrypt.hash(r.pass, 10);
        let user = await User.findOne({ where: { email: r.email } });
        
        if (user) {
            user.role = r.role;
            user.password = hashedPassword;
            user.name = r.name;
            await user.save();
            console.log(`[SEED] Identity Recovered: ${r.email} [${r.role}]`);
        } else {
            await User.create({ name: r.name, email: r.email, password: hashedPassword, role: r.role, status: 'ENABLED' });
            console.log(`[SEED] Admin Established: ${r.role}`);
        }
    }
}

async function seedInfrastructureNodes() {
    const count = await Server.count();
    if (count === 0) {
        const admin = await User.findOne({ where: { role: 'super_admin' } });
        await Server.bulkCreate([
            { hostname: 'SOC-GATEWAY-PROD', ipAddress: '10.0.0.1', region: 'US-East', status: 'online', cpu: 15, ram: 22, UserId: admin.id, apiKey: 'sx_key_gw_prod' },
            { hostname: 'NEURAL-MATRIX-01', ipAddress: '127.0.0.1', region: 'Local', status: 'online', cpu: 5, ram: 10, UserId: admin.id, apiKey: 'sx_key_neural_01' },
            { hostname: 'DB-CLUSTER-MASTER', ipAddress: '10.0.1.10', region: 'EU-West', status: 'online', cpu: 65, ram: 88, UserId: admin.id, apiKey: 'sx_key_db_master' }
        ]);
        console.log('[SEED] Infrastructure Baseline Deployed.');
    }
}

function startTelemetryCycle() {
    const si = require('systeminformation');
    setInterval(async () => {
        try {
            const metrics = await si.currentLoad();
            const mem = await si.mem();
            
            // Publish to Neural Stream for Global Sync
            eventBus.publish('metrics:update', {
                cpuLoad: Math.round(metrics.currentLoad),
                memoryUsage: Math.round((mem.active / mem.total) * 100),
                timestamp: new Date()
            });
            
            const servers = await Server.findAll();
            eventBus.publish('infrastructure:update', servers);
        } catch (e) { /* silent telemetry jitter */ }
    }, 5000);
}
