const eventBus = global.eventBus;
/**
 * --- NEURAL ALERT SYSTEM (PHASE 2) ---
 * Real-time threat detection and autonomous notification.
 */
function checkThreats(log) {
    // 1. Critical Level Check
    if (log.severity === "CRITICAL" || log.level === "critical") {
        console.log(`[ALERT] CRITICAL Log detected from ${log.device || log.source}`);
        eventBus.publish("system:alert", {
            type: "SEVERITY_ALERT",
            severity: "CRITICAL",
            message: `Node ${log.device || log.source} reported a critical failure: ${log.message}`
        });
    }

    // 2. Pattern Matching (Basic Heuristic)
    const patterns = ["failure", "denied", "unauthorized", "refused", "attack"];
    const message = (log.message || "").toLowerCase();
    
    if (patterns.some(p => message.includes(p))) {
        eventBus.publish("system:alert", {
            type: "PATTERN_MATCH",
            severity: "WARNING",
            message: `Neural scan identified suspicious pattern in logs from ${log.device || log.source}`
        });
    }
}

module.exports = { checkThreats };
