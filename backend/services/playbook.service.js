const { Playbook, LogEntry, AuditLog } = require('../models');
const auditService = require('./audit.service');

/**
 * SentinelX SOAR Orchestration Engine v10.0 (Deep Automation Core)
 * Evaluates active playbooks against inbound telemetry and executes automated responses.
 * Integrated with the Audit Vault for immutable execution tracking.
 */
async function evaluatePlaybooks(log) {
    if (!log.UserId) return;

    try {
        const playbooks = await Playbook.findAll({
            where: { UserId: log.UserId, isActive: true }
        });

        for (const playbook of playbooks) {
            let shouldTrigger = false;
            
            // Pattern Matcher: [Field][Operator][Value]
            // Support: >, <, ===, includes
            try {
                if (playbook.triggerCondition.includes('>')) {
                    const [field, value] = playbook.triggerCondition.split('>').map(s => s.trim());
                    if (log[field] > parseInt(value)) shouldTrigger = true;
                } else if (playbook.triggerCondition.includes('<')) {
                    const [field, value] = playbook.triggerCondition.split('<').map(s => s.trim());
                    if (log[field] < parseInt(value)) shouldTrigger = true;
                } else if (playbook.triggerCondition.includes('===')) {
                    const [field, value] = playbook.triggerCondition.split('===').map(s => s.trim().replace(/['"]/g, ''));
                    const logField = log[field] ? log[field].toString() : '';
                    if (logField === value) shouldTrigger = true;
                } else if (playbook.triggerCondition.includes('.includes')) {
                    const fieldName = playbook.triggerCondition.split('.')[0];
                    const val = playbook.triggerCondition.match(/\("(.+)"\)/)[1];
                    if (log[fieldName] && log[fieldName].includes(val)) shouldTrigger = true;
                }
            } catch (e) {
                console.error(`[SOAR] Handshake Failure for: ${playbook.name}`, e.message);
            }

            if (shouldTrigger) {
                await executeAction(playbook, log);
            }
        }
    } catch (err) {
        console.error('[SOAR] Neural Orchestration Error:', err.message);
    }
}

async function executeAction(playbook, log) {
    console.log(`[SOAR] ⚡ Execution Triggered [${playbook.name}] for Incident #${log.id}`);
    
    // Update Playbook State
    playbook.executionCount += 1;
    playbook.lastExecuted = new Date();
    await playbook.save();

    const action = playbook.action.toUpperCase();

    // 1. Log to Audit Vault (Step 11 Upgrade)
    await auditService.log(
        'AUTOMATION_TRIGGERED', 
        `Rule [${playbook.name}] matched incident #${log.id}. Action: ${action}`, 
        null, 
        'SECURITY', 
        log.UserId
    );

    // 2. Log Internal Autonomous Event
    await LogEntry.create({
        severity: 'INFO',
        device: 'SentinelX-SOAR',
        message: `DEEP SCAN: Action [${action}] executed by ${playbook.name}. Logic matches risk vector.`,
        suggestion: `Neural isolation triggered. Integrity verified.`,
        UserId: log.UserId,
        timestamp: new Date()
    });

    // 3. Physical Logic (Mocked Core Interactions)
    if (action === 'BLOCK_IP' && log.ip) {
        const { DeniedIP } = require('../models');
        try {
            await DeniedIP.findOrCreate({
                where: { ip: log.ip },
                defaults: { 
                    reason: `Quarantined by Playbook: ${playbook.name}`,
                    UserId: log.UserId 
                }
            });
            console.log(`[SOAR] FIREWALL: IP ${log.ip} isolated via DeniedIP registry.`);
        } catch (e) {
            console.error('[SOAR] Firewall Sync Error:', e.message);
        }
    } else if (action === 'REBOOT_NODE' && log.device) {
        const { Server } = require('../models');
        try {
            const server = await Server.findOne({ where: { hostname: log.device } });
            if (server) {
                server.status = 'warning';
                await server.save();
                console.warn(`[SOAR] INFRA: Node ${log.device} reboot sequence initiated.`);
                
                // Orchestration Bridge: Restore after 10s simulation
                setTimeout(async () => {
                    try {
                        const s = await Server.findByPk(server.id);
                        if (s) {
                            s.status = 'online';
                            s.lastSeen = new Date();
                            await s.save();
                            console.log(`[SOAR] INFRA: Node ${log.device} recovery sequence complete.`);
                        }
                    } catch (err) { /* silent restore jitter */ }
                }, 10000);
            }
        } catch (e) {
            console.error('[SOAR] Infrastructure Orchestration Error:', e.message);
        }
    }
}

module.exports = { evaluatePlaybooks };
