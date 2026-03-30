/**
 * --- SENTINELX NEURAL PARSER (PHASE 2) ---
 * Standardizes raw log packets for the Ingest Pipeline.
 * Mimics Elastic/Datadog ingestion logic.
 */
function parse(log) {
    // If it's already an object, enrich; otherwise, wrap.
    const raw = typeof log === 'object' ? log : { message: String(log) };
    
    return {
        message: raw.message || "No payload detected",
        level: (raw.level || raw.severity || "info").toLowerCase(),
        source: raw.source || raw.hostname || "unknown_node",
        timestamp: raw.timestamp || new Date(),
        component: raw.component || "SYSTEM"
    };
}

module.exports = { parse };
