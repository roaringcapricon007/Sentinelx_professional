const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');

// Create a document
const doc = new PDFDocument({ margin: 50 });
const outputPath = path.join(__dirname, 'SentinelX_Enterprise_System_Guide.pdf');
const stream = fs.createWriteStream(outputPath);

doc.pipe(stream);

// --- Styling ---
const primaryColor = '#00f2ff';
const secondaryColor = '#00ff88';
const accentColor = '#ff0055';
const bgColor = '#0a0a0f';

// Simulated Background
doc.rect(0, 0, 612, 792).fill('#11111b');

// Header
doc.fillColor(primaryColor).fontSize(28).font('Helvetica-Bold').text('SENTINELX PROFESSIONAL', { align: 'center' });
doc.fontSize(12).fillColor('#888').text('Enterprise AI-Driven Security Operations Center - Architecture & Guide', { align: 'center' });
doc.moveDown(2);

// --- 1. SYSTEM ARCHITECTURE ---
doc.fillColor(primaryColor).fontSize(16).text('1. CORE ARCHITECTURE OVERVIEW', { underline: true });
doc.moveDown(0.5);
doc.fontSize(10).fillColor('#ccc').text('SentinelX utilizes a distributed Neural-Handshake architecture consisting of three primary layers:');
doc.moveDown(0.5);
doc.fillColor(primaryColor).text('• Backend Neural Core (Node.js): ', { continuous: true }).fillColor('#ccc').text('Handles authentication, real-time socket broadcasting, and API orchestration.');
doc.fillColor(secondaryColor).text('• AI Machine Learning Engine (Python): ', { continuous: true }).fillColor('#ccc').text('Powered by Flask, Isolation Forest (for Anomaly Detection), and Llama 3 (for LLM Interpretations).');
doc.fillColor('#fff').text('• Immutable Vault (SQLite/Postgres): ', { continuous: true }).fillColor('#ccc').text('Persistent storage for security events, audit trails, and infrastructure state.');
doc.moveDown(2);

// --- 2. LOG INGESTION FLOWCHART (TEXTUAL) ---
doc.fillColor(primaryColor).fontSize(16).text('2. LOG PROCESSING PIPELINE (FLOWCHART)', { underline: true });
doc.moveDown(1);

const startX = 100;
let currentY = doc.y;

function drawBox(text, color, x, y, width = 200, height = 30) {
    doc.rect(x, y, width, height).strokeColor(color).lineWidth(1).stroke();
    doc.fillColor(color).fontSize(9).text(text, x + 5, y + 10, { width: width - 10, align: 'center' });
    return y + height + 25;
}

function drawArrow(x, y) {
    doc.moveTo(x + 100, y - 25).lineTo(x + 100, y - 5).strokeColor('#444').stroke();
}

currentY = drawBox('RAW LOG DATA (API INGEST)', '#fff', startX, currentY);
drawArrow(startX, currentY);
currentY = drawBox('IP INTELLIGENCE (GEO & RISK LOOKUP)', '#fff', startX, currentY);
drawArrow(startX, currentY);
currentY = drawBox('PYTHON ML ANALYZER (ISOLATION FOREST)', primaryColor, startX, currentY);
drawArrow(startX, currentY);
currentY = drawBox('LLAMA 3 NARRATIVE (THREAT EXPLANATION)', accentColor, startX, currentY);
drawArrow(startX, currentY);
currentY = drawBox('RISK SCORING & ALERT GROUPING', secondaryColor, startX, currentY);
drawArrow(startX, currentY);
currentY = drawBox('REAL-TIME SOC DASHBOARD UPDATE', primaryColor, startX, currentY);

doc.moveDown(2);

// --- 3. SECTION GUIDES ---
doc.addPage();
doc.rect(0, 0, 612, 792).fill('#11111b');
doc.fillColor(primaryColor).fontSize(20).text('3. OPERATIONAL SECTION GUIDES', { align: 'center' });
doc.moveDown(1);

const sections = [
    {
        title: 'Neural Gateway (Authentication)',
        desc: 'Multi-factor authentication system utilizing Quantum-OTP and Neural Handshake protocols. Every session is encrypted via AES-256 with role-based sovereignty enforced at the middleware layer.'
    },
    {
        title: 'SOC Command Center (Audit Vault)',
        desc: 'The primary analysis hub. It features live Timeline Charts (showing attack frequency), Threat Overview panels (Critical vs Elevated counts), and Top Source clustering to identify malicious actors.'
    },
    {
        title: 'Security Pulse (Global Monitoring)',
        desc: 'A real-time geospatial visualization of the Intelligence Matrix. It maps incoming threats to physical global nodes, allowing administrators to see attack patterns as they occur geographically.'
    },
    {
        title: 'AI Matrix Lab (Training & Sync)',
        desc: 'The administrative interface for AI maintenance. Supports Weights Synchronization (pulling latest global models) and Model Retraining (optimizing local Isolation Forest thresholds based on new baseline data).'
    },
    {
        title: 'Infrastructure Topology',
        desc: 'A dynamic graph representing the active node mesh. It monitors CPU/RAM/LOAD of every production server and warns of "Dark Nodes" (offline) or "Reactive Nodes" (overloaded) and their dependencies.'
    },
    {
        title: 'Automation Lab (Scanning & Compliance)',
        desc: 'Automated auditing engine. It runs deep-packet inspection and local security audits, generating PDF/Excel compliance reports for enterprise oversight.'
    }
];

sections.forEach(s => {
    doc.fillColor(primaryColor).fontSize(13).font('Helvetica-Bold').text(s.title.toUpperCase());
    doc.moveDown(0.2);
    doc.fillColor('#ccc').fontSize(10).font('Helvetica').text(s.desc);
    doc.moveDown(1.5);
});

// Footer
doc.fontSize(8).fillColor('#666').text('SENTINELX SYSTEM GUIDE v7.5 - CONFIDENTIAL ENCRYPTED DOC', 50, 750, { align: 'center' });

doc.end();

stream.on('finish', () => {
    console.log('PDF Generated successfully at ' + outputPath);
});
