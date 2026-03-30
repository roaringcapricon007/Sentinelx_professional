const { ingestLog } = require("../services/ingest.service");

/**
 * --- NEURAL LOG CONTROLLER ---
 * Handles API orchestration for the ingest pipeline.
 */
exports.receiveLog = async (req, res) => {
    try {
        const result = await ingestLog(req.body);
        
        if (result.success) {
            return res.status(201).json({
                success: true,
                message: "Log synchronized with Neural Matrix",
                node: result.node,
                id: result.payload.id
            });
        }
        
        res.status(400).json({ success: false, error: result.error });
    } catch (err) {
        res.status(500).json({ success: false, error: "Controller Handshake Error" });
    }
};

exports.getLogs = async (req, res) => {
    // Basic filter implementation (Point 10)
    const { level } = req.query;
    const { LogEntry } = require("../models");
    const where = {};
    if (level) where.severity = level.toUpperCase();
    
    const logs = await LogEntry.findAll({ where, limit: 100, order: [['timestamp', 'DESC']] });
    res.json({ success: true, data: logs });
};
