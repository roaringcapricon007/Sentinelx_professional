const parser = require("./parser.service");
const alert = require("./alert.service"); // Ingest -> Alert (Step 2)
const { LogEntry } = require("../models");
const eventBus = require("./event.service");

/**
 * --- NEURAL INGEST SYSTEM (PHASE 2) ---
 * High-performance pipeline from Agent -> API -> DB -> UI
 */
async function ingestLog(rawLog) {
    try {

        // 1. Parse (Like Elastic / Datadog)
        const parsed = parser.parse(rawLog);

        // 2. Validate
        if (!parsed.message || parsed.message.length < 2) {
            throw new Error("Invalid log: Empty payload or length mismatch.");
        }

        // 3. Security Pulse / Alert (Premium Feature)
        alert.checkThreats(parsed);

        // 4. Save to DB (Persistent History)
        await LogEntry.create({
            message: parsed.message,
            severity: parsed.level.toUpperCase(),
            device: parsed.source,
            timestamp: parsed.timestamp
        });

        // 5. Emit to Neural Stream (Realtime Socket)
        // Point 9: eventBus.on('log:processed', (log) => io.emit('new_log', log));
        eventBus.publish("log:processed", parsed);

        return {
            success: true,
            node: parsed.source,
            status: "INGESTED",
            payload: parsed
        };
    } catch (err) {
        console.error("🔥 Ingest error:", err.message);
        return { success: false, error: err.message };
    }
}

module.exports = { ingestLog };
