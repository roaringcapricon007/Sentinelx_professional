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
    },
    // Security Status (Step 7)
    status: { type: DataTypes.STRING, defaultValue: 'ENABLED' } // ENABLED, DISABLED, LOCKED
});

// --- System Metric Model (For Persistent Charts) ---
const SystemMetric = sequelize.define('SystemMetric', {
    cpuLoad: { type: DataTypes.FLOAT },
    memoryUsage: { type: DataTypes.FLOAT },
    networkTraffic: { type: DataTypes.FLOAT },
    timestamp: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
    UserId: {
        type: DataTypes.INTEGER,
        references: { model: 'User', key: 'id' }
    }
}, {
    indexes: [
        { fields: ['timestamp'] },
        { fields: ['UserId'] }
    ]
});

// --- Log Entry Model (Enterprise Alerting Engine) ---
const LogEntry = sequelize.define('LogEntry', {
    severity: { type: DataTypes.STRING, defaultValue: 'INFO' }, // INFO, WARN, ERROR, CRITICAL
    device: { type: DataTypes.STRING },
    message: { type: DataTypes.TEXT },
    suggestion: { type: DataTypes.TEXT },
    timestamp: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },

    // Advanced Enterprise Fields
    status: { type: DataTypes.STRING, defaultValue: 'ACTIVE' }, // ACTIVE or RESOLVED
    attempts: { type: DataTypes.INTEGER, defaultValue: 1 },
    ip: { type: DataTypes.STRING, allowNull: true },
    riskScore: { type: DataTypes.INTEGER, defaultValue: 0 },
    threatType: { type: DataTypes.STRING, defaultValue: 'Standard Operational Noise' },
    isAnomaly: { type: DataTypes.BOOLEAN, defaultValue: false },
    impact: { type: DataTypes.TEXT, allowNull: true },
    recommendations: { type: DataTypes.JSON, defaultValue: [] },

    UserId: {
        type: DataTypes.INTEGER,
        references: { model: 'User', key: 'id' }
    }
}, {
    indexes: [
        { fields: ['timestamp'] },
        { fields: ['severity'] },
        { fields: ['status'] },
        { fields: ['ip'] },
        { fields: ['UserId'] }
    ]
});

// --- Server Model (For Infrastructure Status) ---
const Server = sequelize.define('Server', {
    hostname: { type: DataTypes.STRING, allowNull: false, unique: true },
    ipAddress: { type: DataTypes.STRING, allowNull: false },
    region: { type: DataTypes.STRING },
    status: { type: DataTypes.ENUM('online', 'offline', 'warning'), defaultValue: 'online' },
    load: { type: DataTypes.FLOAT, defaultValue: 0.0 },
    lastSeen: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
    UserId: {
        type: DataTypes.INTEGER,
        references: { model: 'User', key: 'id' }
    }
}, {
    indexes: [
        { fields: ['hostname'] },
        { fields: ['status'] }
    ]
});

// --- ASSOCIATIONS (Privacy Layer) ---
User.hasMany(SystemMetric, { foreignKey: 'UserId' });
SystemMetric.belongsTo(User, { foreignKey: 'UserId' });

User.hasMany(LogEntry, { foreignKey: 'UserId' });
LogEntry.belongsTo(User, { foreignKey: 'UserId' });

User.hasMany(Server, { foreignKey: 'UserId' });
Server.belongsTo(User, { foreignKey: 'UserId' });

// Associations established correctly above

module.exports = { User, SystemMetric, LogEntry, Server };
