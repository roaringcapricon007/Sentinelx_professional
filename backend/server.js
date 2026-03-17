const app = require('./app'); 
const http = require('http');
const socketIo = require('socket.io');
const sequelize = require('./database');
const { Server, User } = require('./models');

const server = http.createServer(app);
const io = socketIo(server, { cors: { origin: '*' } });

// 1. GLOBAL ACCESS
global.io = io;
global.eventBus = require('./services/event.service');

// 2. INITIALIZE WORKERS (Process Layer)
const logWorker = require('./workers/log.worker');
logWorker.initialize().catch(err => console.error('[WORKER] Init Serialized Error:', err));

// 3. EVENT-TO-SOCKET BRIDGE (Push Layer)
/**
 * SentinelX Realtime Bridge v10.0
 * Connects internal event bus to global Socket.io emitters.
 */
global.eventBus.on('log:processed', (log) => {
    io.emit('new_log', log);
});

global.eventBus.on('log:repeat', (log) => {
    io.emit('log_repeat', log);
});

// 4. DATABASE & SEEDING (Initialization Layer)
const PORT = process.env.PORT || 3000;
server.listen(PORT, '0.0.0.0', () => {
    console.log(`
  =================================================
  SentinelX Professional v10.0 (Event-Driven Core)
  Uplink: http://0.0.0.0:${PORT}
  Realtime: Socket.io v4.0 Active
  =================================================
  `);

    sequelize.sync().then(async () => {
        console.log('--- DATABASE HANDSHAKE COMPLETED ---');
        
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
        { name: 'Root Administrator', role: 'super_admin', email: 'Superadmin@SentinelX.com', pass: '12345SuperAdmin!' },
        { name: 'Senior Security Analyst', role: 'analyst', email: 'analyst@sentinelx.com', pass: '12345Analyst!' }
    ];
    const bcrypt = require('bcryptjs');
    for (const r of roles) {
        const hashedPassword = await bcrypt.hash(r.pass, 10);
        const [user, created] = await User.findOrCreate({
            where: { email: r.email },
            defaults: { name: r.name, password: hashedPassword, role: r.role, status: 'ENABLED' }
        });
        if (created) console.log(`[SEED] Role Established: ${r.role}`);
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
            io.emit('metrics_update', {
                cpuLoad: Math.round(metrics.currentLoad),
                memoryUsage: Math.round((mem.active / mem.total) * 100),
                timestamp: new Date()
            });
            
            // Updates servers and pushes to UI
            const servers = await Server.findAll();
            io.emit('infrastructure_update', servers);
        } catch (e) { /* silent telemetry jitter */ }
    }, 5000);
}
