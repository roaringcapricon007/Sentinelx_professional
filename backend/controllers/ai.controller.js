const { SystemMetric, LogEntry, Server } = require('../models');
const fs = require('fs');
const path = require('path');
const natural = require('natural');
require('dotenv').config();

async function generateResponse(msg) {
    const lower = msg.toLowerCase();

    // 1. Primary Intelligence: Python PrimeBrain
    try {
        const pyResponse = await fetch('http://127.0.0.1:5001/chat', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ message: msg })
        });
        if (pyResponse.ok) {
            const data = await pyResponse.json();
            return data.response;
        }
    } catch (err) {
        console.warn('Python AI Engine Offline, using local heuristics.');
    }

    // --- 2. Local Heuristic Fallback ---
    if (lower.includes('status')) return await checkSystemStatus();
    if (lower.includes('security') || lower.includes('alert')) return await checkSecurityStatus();
    if (lower.includes('performance') || lower.includes('cpu') || lower.includes('load')) return await checkPerformance();
    if (lower.includes('log')) return await checkLogs();
    if (lower.includes('hello')) return "Greetings Administrator. I am PRIME_AI. My neural network is monitoring the matrix of your infrastructure.";
    if (lower.includes('agent') || lower.includes('node')) return "To add a new node, run the 'sentinelx_agent.js' script on the target machine pointing to this server.";
    
    return "I'm analyzing your request. Try asking about 'System Status', 'Security Alerts', or 'Performance Metrics'.";
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

