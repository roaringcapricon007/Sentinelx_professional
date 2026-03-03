const { LogEntry } = require('../models');
const { Op } = require('sequelize');

// --- ENTERPRISE EXPLANATION DICTIONARY (Step 3) ---
const EXPLANATIONS = {
    'database': {
        problem: 'Database connectivity or schema mismatch.',
        impact: 'Application cannot fetch or persist enterprise records.',
        why: 'Migration failure, unauthorized access, or DB host offline.',
        recommendations: ['Check migration history', 'Verify table exists', 'Verify DB credentials']
    },
    'auth': {
        problem: 'Identity Access Management (IAM) failure.',
        impact: 'Unauthorized access or legitimate users blocked from sensitive nodes.',
        why: 'Brute force attempt, expired certificates, or LDAP timeout.',
        recommendations: ['Check IP geo-velocity', 'Enable account lockout', 'Reset user password']
    },
    'memory': {
        problem: 'Neural Memory Depletion (OOM).',
        impact: 'System instability and abrupt service termination.',
        why: 'In-RAM cache overflow or memory leak in core modules.',
        recommendations: ['Increase resource allocation', 'Run garbage collection', 'Tune heap sizes']
    },
    'cpu': {
        problem: 'Computational Overhead Threshold Breached.',
        impact: 'Significant response latency and interface jitter.',
        why: 'Intensive neural inference or background sync loops.',
        recommendations: ['Scale to additional nodes', 'Throttled non-critical tasks', 'Load balance traffic']
    },
    'brute': {
        problem: 'Brute Force Attack Pattern Detected.',
        impact: 'Potential compromise of administrative accounts.',
        why: 'High-frequency failed logins from localized IP cluster.',
        recommendations: ['Block IP immediately', 'Enable 2FA enforcement', 'Update audit policy']
    }
};

// --- RISK SCORE SYSTEM (Step 4) ---
const SEVERITY_SCORES = {
    'INFO': 5,
    'WARN': 15,
    'ERROR': 30,
    'CRITICAL': 60
};

/**
 * Enterprise Log Ingestion Engine
 * Handles: Alert Grouping, Risk Scoring, and Structured Explanation
 */
async function ingestLog(data, userId = null) {
    const { severity = 'INFO', device, message, ip = '0.0.0.0' } = data;
    const lMsg = message.toLowerCase();

    // 1. SELECT structured explanation based on keywords (Step 3)
    let explanationData = {
        problem: 'Unknown system event.',
        impact: 'Standard operations continue.',
        why: 'Routine telemetry captured by SentinelX.',
        recommendations: ['Monitor metrics', 'Check log history']
    };

    for (const key in EXPLANATIONS) {
        if (lMsg.includes(key)) {
            explanationData = EXPLANATIONS[key];
            break;
        }
    }

    // Special check for brute force
    if (lMsg.includes('failed login') || lMsg.includes('auth fail')) {
        explanationData = EXPLANATIONS['brute'];
    }

    // 2. CALCULATE risk score (Step 4)
    const baseScore = SEVERITY_SCORES[severity.toUpperCase()] || 5;

    // 3. APPLY ALERT GROUPING (Step 2)
    // Find active log within 60 seconds with same IP and similar message
    const windowStart = new Date(Date.now() - 60000);
    const existingLog = await LogEntry.findOne({
        where: {
            ip,
            status: 'ACTIVE',
            timestamp: { [Op.gte]: windowStart },
            message: { [Op.like]: `%${message.substring(0, 30)}%` } // Use substring for fuzzy match
        }
    });

    if (existingLog) {
        // Grouping logic: Increment attempts
        existingLog.attempts += 1;
        existingLog.riskScore += baseScore; // Aggregate risk
        existingLog.timestamp = new Date(); // Update to latest occurrence
        await existingLog.save();
        return existingLog;
    }

    // 4. CREATE NEW log if no recent duplicate found
    const log = await LogEntry.create({
        severity,
        device,
        message,
        ip,
        status: 'ACTIVE',
        attempts: 1,
        riskScore: baseScore,
        impact: explanationData.impact,
        suggestion: `${explanationData.problem} - ${explanationData.why}`,
        recommendations: explanationData.recommendations,
        UserId: userId,
        timestamp: new Date()
    });

    // 5. NOTIFICATION SYSTEM (Step 5) - Stub for actual triggers
    if (severity === 'CRITICAL' || severity === 'HIGH') {
        console.log(`[NOTIFY] Dispatching Critical Alert to Administrator for Log ID: ${log.id}`);
        // Here we would call an EmailService or SlackService
    }

    return log;
}

/**
 * Calculates global system risk score (Step 4)
 */
async function getGlobalRiskScore(userId) {
    const activeLogs = await LogEntry.findAll({
        where: { status: 'ACTIVE', UserId: userId }
    });

    const totalScore = activeLogs.reduce((acc, log) => acc + (log.riskScore || 0), 0);

    // Transform into a percentage (e.g., capped at 100 for display)
    const percentage = Math.min(totalScore, 100);

    let color = 'green';
    if (percentage > 70) color = 'red';
    else if (percentage > 30) color = 'yellow';

    return { percentage, color, total: totalScore };
}

module.exports = {
    ingestLog,
    getGlobalRiskScore
};
