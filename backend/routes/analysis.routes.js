const router = require('express').Router();
const multer = require('multer');
const fs = require('fs');

const upload = multer({ dest: 'uploads/' });

// POST /api/analysis/upload
// Proxies to Python NLP Engine for Professional Analysis
router.post('/upload', upload.single('log'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No file uploaded' });

    console.log('Forwarding logs to Python Intelligence Engine...');

    // Use native FormData and fetch (Node 20+)
    const formData = new FormData();
    const fileContent = fs.readFileSync(req.file.path);
    const blob = new Blob([fileContent], { type: req.file.mimetype });
    formData.append('log', blob, req.file.originalname);

    const response = await fetch('http://127.0.0.1:5001/analysis/upload', {
      method: 'POST',
      body: formData
    });

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

module.exports = router;
