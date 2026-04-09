const router = require('express').Router();
const multer = require('multer');
const fs = require('fs');
const upload = multer({ dest: 'uploads/' });
const { authorize } = require('../middleware/auth.middleware');

// POST /api/analysis/upload
// Proxies to Python NLP Engine for Professional Analysis
router.post('/upload', authorize(['super_admin', 'admin', 'analyst']), upload.single('log'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No file uploaded' });

    console.log('Forwarding logs to Python Intelligence Engine...');

    // Use native FormData and fetch (Node 18+)
    const formData = new FormData();
    const fileContent = fs.readFileSync(req.file.path);
    const blob = new Blob([fileContent], { type: req.file.mimetype });
    formData.append('log', blob, req.file.originalname);

    // 10s Timeout for Python Service
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000);
    const PYTHON_URL = process.env.PYTHON_URL || 'http://127.0.0.1:5000';
    const response = await fetch(`${PYTHON_URL}/analysis/upload`, {
      method: 'POST',
      body: formData,
      signal: controller.signal
    });

    clearTimeout(timeout);
    console.log(`[ANALYSIS] Python Response: ${response.status}`);

    if (!response.ok) {
      throw new Error(`Python Service returned ${response.status}: ${response.statusText}`);
    }

    const data = await response.json();

    // Clean up temp file
    if (fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);

    res.json(data);

  } catch (err) {
    console.error('Python Analysis Proxy Error:', err.message);

    // Fallback to basic Node analysis if Python is down
    if (req.file && fs.existsSync(req.file.path)) {
      const content = fs.readFileSync(req.file.path, 'utf8');
      const lines = content.split('\n');
      const issues = [];
      const summary = { INFO: 0, WARN: 0, ERROR: 0 };

      lines.forEach(line => {
        if (!line.trim()) return;
        const l = line.toLowerCase();
        let sev = "INFO";
        if (l.includes('error')) sev = "ERROR";
        else if (l.includes('warn')) sev = "WARN";
        summary[sev]++;

        if (sev !== 'INFO') {
          issues.push({
            device: 'Node-Fallback',
            severity: sev,
            message: line,
            suggestion: 'Fix manually or wait for Python Engine restore.'
          });
        }
      });
      fs.unlinkSync(req.file.path);
      return res.json({ summary, issues, engine: 'Node-Local-Fallback' });
    }
    res.status(500).json({ error: 'Log analysis failed' });
  }
});

// GET /api/analysis/report
// Generates Forensic Security PDF (Phase 4 Premium)
const reportingService = require('../services/reporting.service');

// Unified Report Handling
router.get('/', authorize(['super_admin', 'admin', 'analyst']), async (req, res) => {
    try {
        const { type = 'security', format = 'pdf', limit = 100 } = req.query;
        
        // Simulating different formats for different types
        if (format === 'excel') {
            // Excel simulation — returning a text description as CSV or similar
            const filename = `SentinelX_${type}_Report_${Date.now()}.csv`;
            res.setHeader('Content-Type', 'text/csv');
            res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
            return res.send(`ID,Severity,Device,Message,Timestamp\n1,CRITICAL,NEXUS,Simulated Excel Data for ${type},${new Date().toISOString()}`);
        }

        const pdfBuffer = await reportingService.generateForensicReport(req.user.id, { 
            limit: parseInt(limit),
            type 
        });
        
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const filename = `SentinelX_${type.toUpperCase()}_Report_${timestamp}.pdf`;
        
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
        res.send(pdfBuffer);
    } catch (err) {
        console.error('Report Generation Error:', err.message);
        res.status(500).json({ success: false, error: "Neural PDF Generation Failed" });
    }
});

router.get('/report', authorize(['super_admin', 'admin', 'analyst']), async (req, res) => {
    // Legacy redirect to root
    res.redirect(`${req.baseUrl}?${new URLSearchParams(req.query).toString()}`);
});

module.exports = router;
