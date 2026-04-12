const eventBus = require("./event.service");
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

function analyzeTelemetry(server) {
    // 1. Critical Load Detection
    if (server.cpu > 90) {
        eventBus.publish("system:alert", {
            type: "RESOURCE_CRITICAL",
            severity: "CRITICAL",
            message: `Node ${server.hostname} is under extreme CPU stress (${server.cpu}%). Automated cooling protocols recommended.`
        });
    }

    if (server.ram > 95) {
        eventBus.publish("system:alert", {
            type: "MEMORY_EXHAUSTION",
            severity: "CRITICAL",
            message: `Node ${server.hostname} memory saturation detected (${server.ram}%). Potential OOM event imminent.`
        });
    }

    // 2. Connectivity Watchdog
    if (server.status === 'offline') {
        eventBus.publish("system:alert", {
            type: "NODE_OFFLINE",
            severity: "CRITICAL",
            message: `Node ${server.hostname} has lost neural handshake. Investigative triage required.`
        });
    }
}

module.exports = { checkThreats, analyzeTelemetry };
