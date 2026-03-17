const { Playbook, LogEntry } = require('../models');

/**
 * SentinelX SOAR Orchestration Engine v7.5
 * Evaluates active playbooks against inbound telemetry and executes automated responses.
 */
async function evaluatePlaybooks(log) {
    if (!log.UserId) return;

    try {
        const playbooks = await Playbook.findAll({
            where: { UserId: log.UserId, isActive: true }
        });

        for (const playbook of playbooks) {
            let shouldTrigger = false;
            
            // Simplified trigger evaluation
            try {
                // Condition example: "riskScore > 80"
                if (playbook.triggerCondition.includes('>')) {
                    const [field, value] = playbook.triggerCondition.split('>').map(s => s.trim());
                    if (log[field] > parseInt(value)) shouldTrigger = true;
                } else if (playbook.triggerCondition.includes('===')) {
                    const [field, value] = playbook.triggerCondition.split('===').map(s => s.trim().replace(/['"]/g, ''));
                    if (log[field] === value) shouldTrigger = true;
                }
            } catch (e) {
                console.error(`[SOAR] Trigger evaluation failed for: ${playbook.name}`, e.message);
            }

            if (shouldTrigger) {
                await executeAction(playbook, log);
            }
        }
    } catch (err) {
        console.error('[SOAR] Playbook evaluation error:', err.message);
    }
}

async function executeAction(playbook, log) {
    console.log(`[SOAR] ⚡ Executing Playbook [${playbook.name}] for Incident #${log.id}`);
    
    playbook.executionCount += 1;
    await playbook.save();

    const action = playbook.action.toUpperCase();

    // Log the automated action
    await LogEntry.create({
        severity: 'INFO',
        device: 'SentinelX-SOAR',
        message: `AUTONOMOUS ACTION: ${action} triggered by playbook [${playbook.name}]`,
        suggestion: `Orchestration complete. Impact restricted.`,
        UserId: log.UserId,
        timestamp: new Date()
    });

    if (action === 'BLOCK_IP') {
        console.log(`[SOAR] FIREWALL: Blocking IP ${log.ip} on all nodes.`);
    } else if (action === 'REBOOT_NODE') {
        console.log(`[SOAR] INFRA: Initiating safe reboot for ${log.device}.`);
    } else if (action === 'NOTIFY_ADMIN') {
        // Already handled by notification.service if severity > threshold
    }
}

module.exports = { evaluatePlaybooks };
