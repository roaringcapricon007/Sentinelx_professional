const { LogEntry, User } = require('../models');
const { Op } = require('sequelize');
const geoip = require('geoip-lite');

// --- ENTERPRISE EXPLANATION DICTIONARY (UPGRADED v7.5) ---
const EXPLANATIONS = {
    'database': {
        problem: 'The system is having trouble talking to its storage (Database).',
        impact: 'We cannot save or retrieve important security records right now.',
        why: 'The connection may have timed out, or a table is missing.',
        recommendations: ['Check database connection', 'Verify schema integrity', 'Restart database service']
    },
    'auth': {
        problem: 'A security lock (Authentication) failed to open.',
        impact: 'Users might be blocked, or an intruder is trying different keys.',
        why: 'Wrong password entered multiple times (Brute Force).',
        recommendations: ['Verify user identity', 'Temporarily block suspicious IP', 'Ensure account isn\'t expired']
    },
    'memory': {
        problem: 'The server is running out of "thinking space" (RAM).',
        impact: 'The system might crash or become very slow.',
        why: 'Too many background tasks or a memory leak.',
        recommendations: ['Clear system cache', 'Restart non-critical modules', 'Increase RAM if persistent']
    },
    'cpu': {
        problem: 'The server\'s "brain" (CPU) is working too hard.',
        impact: 'Everything in the dashboard will feel sluggish.',
        why: 'Heavy AI analysis or a high influx of network data.',
        recommendations: ['Check active processes', 'Distribute server load', 'Throttle background syncing']
    },
    'brute': {
        problem: 'High-speed guessing attack suspected (Brute Force).',
        impact: 'Admin or user accounts could be hacked.',
        why: 'Someone is trying hundreds of passwords very quickly.',
        recommendations: ['BLOCK IP IMMEDIATELY', 'Notify the account owner', 'Enforce 2-Factor Auth']
    }
};

const SEVERITY_SCORES = {
    'INFO': 5,
    'WARN': 15,
    'ERROR': 30,
    'CRITICAL': 60
};

/**
 * IP Intelligence v1.0
 * Decodes Geo-location and Risk from raw IP
 */
function getIpIntelligence(ip) {
    if (!ip || ip === '127.0.0.1' || ip === '::1') return { country: 'LOCAL', city: 'System', risk: 'MINIMAL' };

    const geo = geoip.lookup(ip);
    if (!geo) return { country: 'UNKNOWN', risk: 'NEUTRAL' };

    // Simple heuristic for risk: Non-local/foreign countries + high-activity triggers
    const suspiciousCountries = ['KP', 'IR', 'RU', 'CN'];
    const risk = suspiciousCountries.includes(geo.country) ? 'SUSPICIOUS' : 'TRUSTED';

    return {
        country: geo.country,
        city: geo.city,
        region: geo.region,
        risk: risk
    };
}

/**
 * Enterprise Log Ingestion Engine v9.0 (Asynchronous Architecture)
 */
async function ingestLog(data, userId = null) {
    const { severity = 'INFO', device, message, ip = '0.0.0.0' } = data;
    const eventBus = require('./event.service');

    // 1. Grouping Logic (Detect high-velocity repeats synchronously)
    const windowStart = new Date(Date.now() - 30000); 
    const existingLog = await LogEntry.findOne({
        where: {
            ip,
            status: 'ACTIVE',
            timestamp: { [Op.gte]: windowStart },
            message: { [Op.like]: `%${message.substring(0, 20)}%` }
        }
    });

    if (existingLog) {
        existingLog.attempts += 1;
        existingLog.timestamp = new Date();
        await existingLog.save();
        
        // Notify of repeat
        eventBus.publish('log:repeat', existingLog);
        return existingLog;
    }

    // 2. Create Initial Record
    const log = await LogEntry.create({
        severity,
        device,
        message,
        ip,
        status: 'ACTIVE',
        attempts: 1,
        riskScore: SEVERITY_SCORES[severity.toUpperCase()] || 0,
        UserId: userId,
        timestamp: new Date()
    });

    // 3. Handover to Background Stream (Event Layer)
    eventBus.publish('log:ingest', { logId: log.id, userId });

    return log;
}

const { dispatchCriticalAlert } = require('./notification.service');

async function dispatchAlerts(log, ipIntel) {
    try {
        await dispatchCriticalAlert(log, ipIntel);
    } catch (e) {
        console.error('[ALERT_DISPATCH] Notification pipeline error:', e.message);
    }
}

async function getGlobalRiskScore(userId) {
    const activeLogs = await LogEntry.findAll({
        where: { status: 'ACTIVE', UserId: userId }
    });

    const totalScore = activeLogs.reduce((acc, log) => acc + (log.riskScore || 0), 0);
    const percentage = Math.min(totalScore, 100);

    let color = 'green';
    if (percentage > 70) color = 'red';
    else if (percentage > 30) color = 'yellow';

    return { percentage, color, total: totalScore };
}

module.exports = {
    ingestLog,
    getGlobalRiskScore,
    getIpIntelligence
};

