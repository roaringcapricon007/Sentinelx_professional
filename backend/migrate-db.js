const { Sequelize, DataTypes } = require('sequelize');
const path = require('path');
require('dotenv').config();

// 1. Setup Source (SQLite)
const sqliteSequelize = new Sequelize({
    dialect: 'sqlite',
    storage: path.join(__dirname, 'database.sqlite'),
    logging: false
});

// Define Models for SQLite (Manually to avoid conflict with PG instance)
const SqliteUser = sqliteSequelize.define('User', {
    name: DataTypes.STRING, email: DataTypes.STRING, password: DataTypes.STRING,
    role: DataTypes.STRING, provider: DataTypes.STRING, preferences: DataTypes.JSON
}, { tableName: 'Users' });

const SqliteSystemMetric = sqliteSequelize.define('SystemMetric', {
    cpuLoad: DataTypes.FLOAT, memoryUsage: DataTypes.FLOAT,
    networkTraffic: DataTypes.FLOAT, timestamp: DataTypes.DATE
}, { tableName: 'SystemMetrics' });

const SqliteLogEntry = sqliteSequelize.define('LogEntry', {
    severity: DataTypes.STRING, device: DataTypes.STRING,
    message: DataTypes.TEXT, suggestion: DataTypes.TEXT, timestamp: DataTypes.DATE
}, { tableName: 'LogEntries' });

const SqliteServer = sqliteSequelize.define('Server', {
    hostname: DataTypes.STRING, ipAddress: DataTypes.STRING,
    region: DataTypes.STRING, status: DataTypes.STRING, load: DataTypes.FLOAT, lastSeen: DataTypes.DATE
}, { tableName: 'Servers' });


// 2. Setup Destination (PostgreSQL) - Use existing database.js config
const pgSequelize = require('./database');
const { User, SystemMetric, LogEntry, Server } = require('./models');

async function migrate() {
    console.log('--- Starting Migration: SQLite -> PostgreSQL ---');

    try {
        // Authenticate both
        await sqliteSequelize.authenticate();
        console.log('[OK] SQLite connected.');

        await pgSequelize.authenticate();
        console.log('[OK] PostgreSQL connected.');

        // Sync PG models (create tables)
        await pgSequelize.sync({ force: true });
        console.log('[OK] PostgreSQL tables created.');

        // Migrate Users
        const users = await SqliteUser.findAll();
        console.log(`[INFO] Found ${users.length} users in SQLite.`);
        for (const u of users) {
            await User.create(u.get({ plain: true }));
        }
        console.log('[OK] Users migrated.');

        // Migrate Servers
        const servers = await SqliteServer.findAll();
        console.log(`[INFO] Found ${servers.length} servers in SQLite.`);
        for (const s of servers) {
            await Server.create(s.get({ plain: true }));
        }
        console.log('[OK] Servers migrated.');

        // Migrate LogEntries
        const logs = await SqliteLogEntry.findAll();
        console.log(`[INFO] Found ${logs.length} log entries in SQLite.`);
        // Batch insert for better performance
        if (logs.length > 0) {
            await LogEntry.bulkCreate(logs.map(l => l.get({ plain: true })));
        }
        console.log('[OK] Log entries migrated.');

        // Migrate Metrics
        const metrics = await SqliteSystemMetric.findAll();
        console.log(`[INFO] Found ${metrics.length} metrics in SQLite.`);
        if (metrics.length > 0) {
            await SystemMetric.bulkCreate(metrics.map(m => m.get({ plain: true })));
        }
        console.log('[OK] Metrics migrated.');

        console.log('\n--- Migration Finished Successfully! ---');
    } catch (error) {
        console.error('\n[ERROR] Migration failed:', error);
    } finally {
        await sqliteSequelize.close();
        await pgSequelize.close();
        process.exit();
    }
}

migrate();
