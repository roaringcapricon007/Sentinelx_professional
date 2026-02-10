const router = require('express').Router();
const multer = require('multer');
const fs = require('fs');

const upload = multer({ dest: 'uploads/' });

function detectDevice(line) {
  const l = line.toLowerCase();
  if (l.includes('sshd') || l.includes('kernel')) return 'Linux Server';
  if (l.includes('system32') || l.includes('windows')) return 'Windows Server';
  if (l.includes('docker') || l.includes('container')) return 'Docker Container';
  if (l.includes('nginx') || l.includes('apache')) return 'Web Server';
  return 'Unknown Device';
}

function detectSeverity(line) {
  const l = line.toLowerCase();
  if (l.includes('error')) return 'ERROR';
  if (l.includes('warn')) return 'WARN';
  return 'INFO';
}

function suggestFix(line) {
  const l = line.toLowerCase();
  if (l.includes('login failed'))
    return 'Check authentication policy or reset credentials';
  if (l.includes('disk'))
    return 'Clear disk space or extend volume';
  if (l.includes('memory') || l.includes('oom'))
    return 'Increase RAM or optimize application';
  if (l.includes('timeout'))
    return 'Check network connectivity or service health';
  return 'No immediate action required';
}

router.post('/upload', upload.single('log'), (req, res) => {
  const content = fs.readFileSync(req.file.path, 'utf8');
  const lines = content.split('\n');

  const issues = [];
  const summary = { INFO: 0, WARN: 0, ERROR: 0 };

  lines.forEach(line => {
    if (!line.trim()) return;

    const severity = detectSeverity(line);
    summary[severity]++;

    if (severity !== 'INFO') {
      issues.push({
        device: detectDevice(line),
        severity,
        message: line,
        suggestion: suggestFix(line)
      });
    }
  });

  res.json({ summary, issues });
});

module.exports = router;
