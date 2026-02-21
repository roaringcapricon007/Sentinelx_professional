const { DataTypes } = require('sequelize');
const sequelize = require('../database');

// --- User Model ---
const User = sequelize.define('User', {
    name: { type: DataTypes.STRING, allowNull: false },
    email: { type: DataTypes.STRING, allowNull: false, unique: true },
    password: { type: DataTypes.STRING, allowNull: true }, // Nullable for social auth
    role: { type: DataTypes.STRING, defaultValue: 'User' },
    provider: { type: DataTypes.STRING, defaultValue: 'local' },
    preferences: {
        type: DataTypes.JSON,
        defaultValue: { darkMode: true, notifications: true }
    }
});

// --- System Metric Model (For Persistent Charts) ---
const SystemMetric = sequelize.define('SystemMetric', {
    cpuLoad: { type: DataTypes.FLOAT },
    memoryUsage: { type: DataTypes.FLOAT },
    networkTraffic: { type: DataTypes.FLOAT },
    timestamp: { type: DataTypes.DATE, defaultValue: DataTypes.NOW }
});

// --- Log Entry Model (For Log Analysis History) ---
const LogEntry = sequelize.define('LogEntry', {
    severity: { type: DataTypes.STRING },
    device: { type: DataTypes.STRING },
    message: { type: DataTypes.TEXT },
    suggestion: { type: DataTypes.TEXT },
    timestamp: { type: DataTypes.DATE, defaultValue: DataTypes.NOW }
});

// --- Server Model (For Infrastructure Status) ---
const Server = sequelize.define('Server', {
    hostname: { type: DataTypes.STRING, allowNull: false, unique: true },
    ipAddress: { type: DataTypes.STRING, allowNull: false },
    region: { type: DataTypes.STRING },
    status: { type: DataTypes.ENUM('online', 'offline', 'warning'), defaultValue: 'online' },
    load: { type: DataTypes.FLOAT, defaultValue: 0.0 },
    lastSeen: { type: DataTypes.DATE, defaultValue: DataTypes.NOW }
}, {
    indexes: [
        { fields: ['hostname'] },
        { fields: ['status'] }
    ]
});

// Add indexing to SystemMetric and LogEntry for fast time-series queries
SystemMetric.addHook('afterInit', () => { /* Handled by sync indexes */ });
LogEntry.addHook('afterInit', () => { /* Handled by sync indexes */ });

// Re-defining with explicit indexes for volume
SystemMetric.options.indexes = [{ fields: ['timestamp'] }];
LogEntry.options.indexes = [{ fields: ['timestamp'] }, { fields: ['severity'] }];

module.exports = { User, SystemMetric, LogEntry, Server };
