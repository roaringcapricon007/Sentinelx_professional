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
 * Enterprise Log Ingestion Engine v7.5
 */
async function ingestLog(data, userId = null) {
    const { severity = 'INFO', device, message, ip = '0.0.0.0' } = data;
    const lMsg = (message || '').toLowerCase();

    // 1. IP INTELLIGENCE (Step 1)
    const ipIntel = getIpIntelligence(ip);

    // 2. HUMAN EXPLANATION (Step 3) - Enhanced labels
    let explanationData = {
        problem: 'Standard system event.',
        impact: 'Operating normally.',
        why: 'Routine telemetry recorded.',
        recommendations: ['No action needed.', 'Continue monitoring.']
    };

    for (const key in EXPLANATIONS) {
        if (lMsg.includes(key)) {
            explanationData = EXPLANATIONS[key];
            break;
        }
    }

    if (lMsg.includes('failed login') || lMsg.includes('auth fail')) {
        explanationData = EXPLANATIONS['brute'];
    }

    // 3. RISK CALCULATION (Step 4)
    let baseScore = SEVERITY_SCORES[severity.toUpperCase()] || 5;
    if (ipIntel.risk === 'SUSPICIOUS') baseScore += 20; // Geographic risk penalty

    // 4. ALERT GROUPING (Step 2)
    const windowStart = new Date(Date.now() - 60000);
    const existingLog = await LogEntry.findOne({
        where: {
            ip,
            status: 'ACTIVE',
            timestamp: { [Op.gte]: windowStart },
            [Op.or]: [
                { message: { [Op.like]: `%${message.substring(0, 30)}%` } },
                { device: device }
            ]
        }
    });

    if (existingLog) {
        existingLog.attempts += 1;
        existingLog.riskScore += Math.floor(baseScore * 0.5); // Accrue interest
        existingLog.timestamp = new Date();
        // Update message to show grouping if it's a brute force
        if (explanationData === EXPLANATIONS['brute'] && existingLog.attempts > 1) {
            existingLog.message = `⚠ ${existingLog.attempts} SUSPICIOUS LOGIN ATTEMPTS from IP: ${ip} [${ipIntel.country}]`;
        }
        await existingLog.save();
        return existingLog;
    }

    // 5. CREATE ENRICHED LOG
    const log = await LogEntry.create({
        severity,
        device,
        message: severity === 'CRITICAL' ? `🚨 ${message}` : message,
        ip: `${ip} (${ipIntel.country})`,
        status: 'ACTIVE',
        attempts: 1,
        riskScore: baseScore,
        impact: explanationData.impact,
        suggestion: `${explanationData.problem} Why: ${explanationData.why}`,
        recommendations: explanationData.recommendations,
        UserId: userId,
        timestamp: new Date()
    });

    // 6. NOTIFICATION SYSTEM (Step 6) - staged
    if (severity === 'CRITICAL' || baseScore > 50) {
        dispatchAlerts(log, ipIntel);
    }

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

