const eventBus = require('../services/event.service');
const { LogEntry } = require('../models');
const { Op } = require('sequelize');
const { getIpIntelligence } = require('../services/log.service');
const { evaluatePlaybooks } = require('../services/playbook.service');
const { dispatchCriticalAlert } = require('../services/notification.service');

/**
 * SentinelX Log Worker v9.0
 * Handles high-cpu neural analysis and SOAR orchestration in the background.
 * This prevents the main API thread from blocking during heavy attacks.
 */
class LogWorker {
    async initialize() {
        console.log('[WORKER] Neural Processing Layer Online.');
        
        // Listen for new logs ingested by the API
        eventBus.on('log:ingest', async (payload) => {
            try {
                await this.processLog(payload.logId, payload.userId);
            } catch (err) {
                console.error('[WORKER] Processing Error:', err.message);
            }
        });
    }

    async processLog(logId, userId) {
        const log = await LogEntry.findByPk(logId);
        if (!log) return;

        console.log(`[WORKER] 🔍 Analyzing Incident #${log.id} (${log.severity})`);

        // 1. Neural Analysis (AI Service Handover)
        let isAnomaly = false;
        let aiThreatType = "Standard Operational Noise";
        let aiExplanation = log.suggestion || "Analyzing...";
        let aiRecommendations = log.recommendations || [];
        let riskScore = log.riskScore || 0;

        try {
            const PYTHON_URL = process.env.PYTHON_URL || 'http://127.0.0.1:5001';
            const aiRes = await fetch(`${PYTHON_URL}/api/analyze-log`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ message: log.message, ip: log.ip, severity: log.severity })
            });

            if (aiRes.ok) {
                const aiData = await aiRes.json();
                isAnomaly = aiData.is_anomaly;
                riskScore = Math.max(riskScore, aiData.risk_score);
                aiThreatType = aiData.threat_type;
                aiExplanation = aiData.explanation;
                if (aiData.recommendations && aiData.recommendations.length > 0) {
                    aiRecommendations = aiData.recommendations;
                }
            }
        } catch (err) {
            console.warn("[WORKER] AI Node Unreachable. Using heuristics.");
        }

        // 2. Intelligence Enrichment
        const ipIntel = getIpIntelligence(log.ip.split(' ')[0]);
        if (ipIntel.risk === 'SUSPICIOUS') riskScore += 20;

        // 3. Persist Transformation
        log.riskScore = Math.min(riskScore, 100);
        log.threatType = aiThreatType;
        log.isAnomaly = isAnomaly;
        log.suggestion = `${aiExplanation} [LOCATION: ${ipIntel.city || 'N/A'}, ${ipIntel.country || 'N/A'}]`;
        log.recommendations = aiRecommendations;
        await log.save();

        // 4. SOAR Strategy Evaluation (Automation Lab Rules)
        await evaluatePlaybooks(log);

        // 5. Actionable Intelligence & Dispatch
        if (riskScore > 85) {
            log.status = 'BLOCKED'; // Immediate status upgrade
            await log.save();

            // Trigger Real-time System Alert (Step 12)
            eventBus.publish('system:alert', {
                type: 'THREAT_NEUTRALIZED',
                severity: 'CRITICAL',
                target: log.ip,
                message: `AI identified a ${aiThreatType} vector with ${riskScore}% certainty. Autonomous containment (BLOCK_IP) executed.`
            });
        }

        if (log.severity === 'CRITICAL' || riskScore > 50) {
            await dispatchCriticalAlert(log, ipIntel);
        }

        // 6. Push Update to UI (Neural Cloud -> Frontend)
        eventBus.publish('log:processed', log);
    }
}

module.exports = new LogWorker();
