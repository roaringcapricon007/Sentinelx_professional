const { SystemMetric, LogEntry, Server } = require('../models');
const fs = require('fs');
const path = require('path');
const natural = require('natural');

let classifier = null;

// Load Trained Model
const modelPath = path.join(__dirname, '../classifier.json');
if (fs.existsSync(modelPath)) {
    natural.BayesClassifier.load(modelPath, null, (err, loadedClassifier) => {
        if (err) {
            console.error('Error loading AI model:', err);
        } else {
            classifier = loadedClassifier;
            console.log('SentinelX v5.0 AI Model Loaded');
        }
    });
}

async function generateResponse(msg) {
    const lower = msg.toLowerCase();
    let intent = 'unknown';

    // 1. Predict Intent with NLP
    if (classifier) {
        intent = classifier.classify(lower);
        console.log(`AI Prediction: "${msg}" -> ${intent}`);
    } else {
        // Fallback if model not loaded
        if (lower.includes('status')) intent = 'status';
        else if (lower.includes('security') || lower.includes('alert')) intent = 'security';
        else if (lower.includes('cpu') || lower.includes('load')) intent = 'performance';
        else if (lower.includes('log')) intent = 'logs';
        else if (lower.includes('hello')) intent = 'greeting';
    }

    // 2. Execute Action based on Intent
    switch (intent) {
        case 'status':
            return await checkSystemStatus();
        case 'security':
            return await checkSecurityStatus();
        case 'performance':
            return await checkPerformance();
        case 'logs':
            return await checkLogs();
        case 'greeting':
            return "Hello Administrator. SentinelX v5.0 AI is online and monitoring your infrastructure.";
        case 'agent':
            return "To add a new node, run the 'sentinelx_agent.js' script on the target machine pointing to this server.";
        default:
            return "I'm analyzing your request. Try asking about 'System Status', 'Security Alerts', or 'Performance Metrics'.";
    }
}

// --- Action Handlers ---

async function checkSystemStatus() {
    const totalServers = await Server.count();
    const offlineServers = await Server.findAll({ where: { status: 'offline' } });

    if (offlineServers.length > 0) {
        const names = offlineServers.map(s => s.hostname).join(', ');
        return `CRITICAL ALERT: ${offlineServers.length}/${totalServers} nodes are OFFLINE (${names}). Immediate action required.`;
    }
    return `All Systems Operational. ${totalServers} nodes are online and healthy.`;
}

async function checkSecurityStatus() {
    const criticalLogs = await LogEntry.findAll({
        where: { severity: ['critical', 'high'] },
        order: [['timestamp', 'DESC']],
        limit: 1
    });

    if (criticalLogs.length > 0) {
        const log = criticalLogs[0];
        return `Security Warning: Recent critical event detected on ${log.device}: "${log.message}". Suggestion: ${log.suggestion}`;
    }
    return "Security Verified. No critical threats detected in the active log stream.";
}

async function checkPerformance() {
    const metric = await SystemMetric.findOne({ order: [['createdAt', 'DESC']] });
    if (metric) {
        return `Performance Report: CPU Load is ${metric.cpuLoad}%, Memory Usage is ${metric.memoryUsage}%. Configuration is stable.`;
    }
    return "No performance data available yet. Please ensure agents are connected.";
}

async function checkLogs() {
    const count = await LogEntry.count();
    return `Log Analysis: I have indexed ${count} total events. You can view detailed breakdowns in the Analysis tab.`;
}

module.exports = { generateResponse };
