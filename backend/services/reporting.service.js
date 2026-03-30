const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');
const { LogEntry, User } = require('../models');

/**
 * --- NEURAL REPORTING ENGINE (PHASE 4) ---
 * Generates forensic PDF reports and automated security summaries.
 */
async function generateForensicReport(userId, options = {}) {
    return new Promise(async (resolve, reject) => {
        try {
            const user = await User.findByPk(userId);
            const logs = await LogEntry.findAll({
                where: { UserId: userId },
                limit: options.limit || 50,
                order: [['timestamp', 'DESC']]
            });

            const doc = new PDFDocument({ margin: 50 });
            const buffers = [];
            doc.on('data', buffers.push.bind(buffers));
            doc.on('end', () => resolve(Buffer.concat(buffers)));

            // --- HEADER ---
            doc.fillColor("#00ff88")
               .fontSize(25)
               .text("SENTINELX ENTERPRISE BEYOND", { align: 'center' });
            
            doc.moveDown();
            doc.fillColor("#ffffff")
               .fontSize(12)
               .text(`Forensic Report Generated: ${new Date().toLocaleString()}`, { align: 'center' });
            
            doc.moveDown();
            doc.rect(50, doc.y, 500, 2).fill("#00ff88");
            doc.moveDown(2);

            // --- SUMMARY SECTION ---
            doc.fillColor("#00ff88").fontSize(18).text("1. EXECUTIVE SUMMARY");
            doc.moveDown();
            doc.fillColor("#ffffff").fontSize(12).text(`Target User: ${user ? user.name : 'Unknown Platform Entity'}`);
            doc.text(`Incident Count: ${logs.length}`);
            doc.text(`Neural Analysis: ${logs.some(l => l.riskScore > 80) ? 'THREAT_DETECTED_CRITICAL' : 'STABLE'}`);
            doc.moveDown(2);

            // --- INCIDENT LOGS ---
            doc.fillColor("#00ff88").fontSize(18).text("2. NEURAL INCIDENT DATA");
            doc.moveDown();

            logs.forEach((log, index) => {
                if (doc.y > 700) doc.addPage();
                
                doc.fillColor("#00ff88").fontSize(10).text(`[ID: ${log.id}] [${log.severity}] - ${new Date(log.timestamp).toLocaleString()}`);
                doc.fillColor("#ffffff").text(`Node: ${log.device || 'REMOTE_NODE'}`);
                doc.text(`Payload: ${log.message}`);
                doc.fillColor("#cccccc").fontSize(8).text(`AI Suggested Resolution: ${log.suggestion || 'Awaiting analysis...'}`);
                doc.moveDown();
            });

            // --- FOOTER ---
            doc.fontSize(8).fillColor("#777777")
               .text("FOR OFFICIAL SOC USE ONLY - CLASSIFIED: LEVEL 1 FORENSICS", 50, 750, { align: 'center' });

            doc.end();
        } catch (err) {
            reject(err);
        }
    });
}

module.exports = { generateForensicReport };
