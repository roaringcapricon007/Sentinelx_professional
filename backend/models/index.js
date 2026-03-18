const { DataTypes } = require('sequelize');
const sequelize = require('../database');

// --- User Model (Enhanced with RBAC) ---
const User = sequelize.define('User', {
    name: { type: DataTypes.STRING, allowNull: false },
    email: { type: DataTypes.STRING, allowNull: false, unique: true },
    password: { type: DataTypes.STRING, allowNull: true },
    role: { 
        type: DataTypes.STRING, 
        defaultValue: 'viewer', // Roles: super_admin, analyst, viewer, machine_agent
        validate: {
            isIn: {
                args: [['super_admin', 'analyst', 'viewer', 'machine_agent']],
                msg: "Unauthorized security clearance level specified."
            }
        }
    },
    provider: { type: DataTypes.STRING, defaultValue: 'local' },
    preferences: {
        type: DataTypes.JSON,
        defaultValue: { darkMode: true, notifications: true }
    },
    mfaEnabled: { type: DataTypes.BOOLEAN, defaultValue: false },
    mfaSecret: { type: DataTypes.STRING, allowNull: true },
    status: { type: DataTypes.STRING, defaultValue: 'ENABLED' } 
});

// --- Login History (Session & IP Tracking) ---
const LoginHistory = sequelize.define('LoginHistory', {
    ipAddress: { type: DataTypes.STRING },
    location: { type: DataTypes.STRING, defaultValue: 'Unknown' },
    userAgent: { type: DataTypes.TEXT },
    deviceName: { type: DataTypes.STRING, defaultValue: 'Unknown Device' },
    browserName: { type: DataTypes.STRING, defaultValue: 'Unknown Browser' },
    status: { type: DataTypes.STRING }, // SUCCESS, FAILED
    timestamp: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
    UserId: {
        type: DataTypes.INTEGER,
        references: { model: 'User', key: 'id' }
    }
});

// --- Audit Log (Immutable History) ---
const AuditLog = sequelize.define('AuditLog', {
    action: { type: DataTypes.STRING, allowNull: false }, // e.g., "USER_LOGIN", "RULE_CREATED", "NODE_REBOOTED"
    category: { type: DataTypes.STRING, defaultValue: 'SYSTEM' }, // SECURITY, SYSTEM, AUTH
    details: { type: DataTypes.TEXT },
    ipAddress: { type: DataTypes.STRING },
    UserId: {
        type: DataTypes.INTEGER,
        references: { model: 'User', key: 'id' }
    },
    timestamp: { type: DataTypes.DATE, defaultValue: DataTypes.NOW }
});

// --- Active Sessions (Remote Logout Support) ---
const ActiveSession = sequelize.define('ActiveSession', {
    sid: { type: DataTypes.STRING, primaryKey: true },
    expires: { type: DataTypes.DATE },
    data: { type: DataTypes.TEXT },
    ipAddress: { type: DataTypes.STRING },
    userAgent: { type: DataTypes.TEXT },
    lastActive: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
    UserId: {
        type: DataTypes.INTEGER,
        references: { model: 'User', key: 'id' }
    }
});

// --- System Metric Model (Real-time Analytics) ---
const SystemMetric = sequelize.define('SystemMetric', {
    cpuLoad: { type: DataTypes.FLOAT },
    memoryUsage: { type: DataTypes.FLOAT },
    diskUsage: { type: DataTypes.FLOAT, defaultValue: 0.0 },
    networkTraffic: { type: DataTypes.FLOAT },
    timestamp: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
    ServerId: {
        type: DataTypes.INTEGER,
        references: { model: 'Server', key: 'id' }
    }
});

// --- Log Entry Model (Streaming Architecture) ---
const LogEntry = sequelize.define('LogEntry', {
    severity: { type: DataTypes.STRING, defaultValue: 'INFO' }, 
    device: { type: DataTypes.STRING },
    message: { type: DataTypes.TEXT },
    suggestion: { type: DataTypes.TEXT },
    timestamp: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
    status: { type: DataTypes.STRING, defaultValue: 'ACTIVE' }, 
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
    },
    ServerId: {
        type: DataTypes.INTEGER,
        references: { model: 'Server', key: 'id' }
    }
});

// --- Server Model (Enterprise Infrastructure) ---
const Server = sequelize.define('Server', {
    hostname: { type: DataTypes.STRING, allowNull: false, unique: true },
    ipAddress: { type: DataTypes.STRING, allowNull: false },
    region: { type: DataTypes.STRING },
    status: { type: DataTypes.ENUM('online', 'offline', 'warning'), defaultValue: 'online' },
    cpu: { type: DataTypes.FLOAT, defaultValue: 0.0 },
    ram: { type: DataTypes.FLOAT, defaultValue: 0.0 },
    disk: { type: DataTypes.FLOAT, defaultValue: 0.0 },
    uptime: { type: DataTypes.STRING, defaultValue: '0d 0h 0m' },
    activeProcesses: { type: DataTypes.INTEGER, defaultValue: 0 },
    apiKey: { type: DataTypes.STRING, unique: true, allowNull: true }, // Agent auth
    lastSeen: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
    UserId: {
        type: DataTypes.INTEGER,
        references: { model: 'User', key: 'id' }
    }
});

// --- Playbook Model (SOAR Orchestration / Automation Lab) ---
const Playbook = sequelize.define('Playbook', {
    name: { type: DataTypes.STRING, allowNull: false },
    description: { type: DataTypes.TEXT },
    triggerCondition: { type: DataTypes.STRING }, // e.g., "riskScore > 80", "severity === 'CRITICAL'"
    action: { type: DataTypes.STRING }, // e.g., "BLOCK_IP", "NOTIFY_ADMIN", "REBOOT_NODE"
    isActive: { type: DataTypes.BOOLEAN, defaultValue: true },
    executionCount: { type: DataTypes.INTEGER, defaultValue: 0 },
    lastExecuted: { type: DataTypes.DATE },
    logRetention: { type: DataTypes.INTEGER, defaultValue: 30 }, // Days
    UserId: {
        type: DataTypes.INTEGER,
        references: { model: 'User', key: 'id' }
    }
});

// --- ASSOCIATIONS ---
User.hasMany(LoginHistory, { foreignKey: 'UserId' });
LoginHistory.belongsTo(User, { foreignKey: 'UserId' });

User.hasMany(AuditLog, { foreignKey: 'UserId' });
AuditLog.belongsTo(User, { foreignKey: 'UserId' });

User.hasMany(ActiveSession, { foreignKey: 'UserId' });
ActiveSession.belongsTo(User, { foreignKey: 'UserId' });

User.hasMany(LogEntry, { foreignKey: 'UserId' });
LogEntry.belongsTo(User, { foreignKey: 'UserId' });

User.hasMany(Server, { foreignKey: 'UserId' });
Server.belongsTo(User, { foreignKey: 'UserId' });

User.hasMany(Playbook, { foreignKey: 'UserId' });
Playbook.belongsTo(User, { foreignKey: 'UserId' });

Server.hasMany(SystemMetric, { foreignKey: 'ServerId' });
SystemMetric.belongsTo(Server, { foreignKey: 'ServerId' });

Server.hasMany(LogEntry, { foreignKey: 'ServerId' });
LogEntry.belongsTo(Server, { foreignKey: 'ServerId' });

module.exports = { User, LoginHistory, AuditLog, ActiveSession, SystemMetric, LogEntry, Server, Playbook };
