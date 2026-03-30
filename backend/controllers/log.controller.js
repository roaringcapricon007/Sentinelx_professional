const { ingestLog } = require("../services/ingest.service");
const { LogEntry, User, DeniedIP } = require("../models");

/**
 * --- NEURAL LOG CONTROLLER (PRO) ---
 * High-performance orchestration for logs, forensic search, and SOAR actions.
 */

// 1. INGEST (Point 6)
exports.receiveLog = async (req, res) => {
    try {
        const result = await ingestLog(req.body);
        if (result.success) {
            return res.status(201).json({
                success: true,
                message: "Log synchronized with Neural Matrix",
                node: result.node
            });
        }
        res.status(400).json({ success: false, error: result.error });
    } catch (err) {
        res.status(500).json({ success: false, error: "Ingest Handshake Error" });
    }
};

// 2. QUERY & FILTER (Point 10)
exports.getLogs = async (req, res) => {
    try {
        const { level, status, limit = 50 } = req.query;
        const where = {};
        if (level) where.severity = level.toUpperCase();
        if (status) where.status = status.toUpperCase();
        
        // Ensure user isolation if needed
        if (req.user && req.user.role !== 'super_admin') {
            where.UserId = req.user.id;
        }

        const logs = await LogEntry.findAll({ 
            where, 
            limit: parseInt(limit), 
            order: [['timestamp', 'DESC']] 
        });
        res.json({ success: true, data: logs });
    } catch (err) {
        res.status(500).json({ success: false, error: "Fetch Query Error" });
    }
};

// 3. SEARCH & FORENSICS
exports.searchLogs = async (req, res) => {
    try {
        const { Op } = require('sequelize');
        const { query } = req.query;
        const logs = await LogEntry.findAll({
            where: {
                message: { [Op.like]: `%${query}%` }
            },
            limit: 100
        });
        res.json({ success: true, count: logs.length, data: logs });
    } catch (err) {
        res.json({ success: false, error: "Search Execution Rejected" });
    }
};

// 4. RESOLUTION (SOAR Step 5)
exports.resolveLog = async (req, res) => {
    try {
        const log = await LogEntry.findByPk(req.params.id);
        if (!log) return res.status(404).json({ error: "Incident not found" });
        
        log.status = 'RESOLVED';
        await log.save();
        
        if (global.io) global.io.emit('log_resolved', log.id);
        res.json({ success: true, message: "Incident neutralized" });
    } catch (err) {
        res.status(500).json({ error: "Resolution Sync Failed" });
    }
};

// 5. SECURITY ACTIONS (IP Quarantine)
exports.blockIP = async (req, res) => {
    try {
        const { ip, reason } = req.body;
        await DeniedIP.findOrCreate({
            where: { ip },
            defaults: { reason: reason || 'Manual Intervention', UserId: req.user.id }
        });
        res.json({ success: true, message: `IP ${ip} quarantined across global cluster.` });
    } catch (err) {
        res.status(500).json({ error: "Quarantine Protocol Rejected" });
    }
};
