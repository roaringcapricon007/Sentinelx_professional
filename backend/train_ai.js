const natural = require('natural');
const fs = require('fs');

const classifier = new natural.BayesClassifier();

// --- Training Data ---

// 1. Status / Health
classifier.addDocument('system status', 'status');
classifier.addDocument('how is the server doing', 'status');
classifier.addDocument('is everything online', 'status');
classifier.addDocument('show me infrastructure health', 'status');
classifier.addDocument('check system health', 'status');
classifier.addDocument('are servers running', 'status');
classifier.addDocument('infrastructure status report', 'status');
classifier.addDocument('uptime of nodes', 'status');
classifier.addDocument('are there any offline servers', 'status');
classifier.addDocument('global status check', 'status');
classifier.addDocument('health overview', 'status');
classifier.addDocument('how many servers are online', 'status');
classifier.addDocument('monitoring status', 'status');
classifier.addDocument('is the fleet healthy', 'status');

// 2. Security / Alerts
classifier.addDocument('show me security alerts', 'security');
classifier.addDocument('any threats detected', 'security');
classifier.addDocument('check for hacks', 'security');
classifier.addDocument('system breaches', 'security');
classifier.addDocument('critical errors in logs', 'security');
classifier.addDocument('security report', 'security');
classifier.addDocument('firewall status', 'security');
classifier.addDocument('brute force attempts', 'security');
classifier.addDocument('unauthorized access', 'security');
classifier.addDocument('security breaches', 'security');
classifier.addDocument('malicious activity', 'security');
classifier.addDocument('audit security logs', 'security');
classifier.addDocument('who tried to login', 'security');
classifier.addDocument('suspicious traffic', 'security');
classifier.addDocument('is the system safe', 'security');
classifier.addDocument('vulnerability scan', 'security');

// 3. Performance / Metrics
classifier.addDocument('current cpu load', 'performance');
classifier.addDocument('memory usage', 'performance');
classifier.addDocument('network traffic analysis', 'performance');
classifier.addDocument('is the server slow', 'performance');
classifier.addDocument('performance metrics', 'performance');
classifier.addDocument('resource utilization', 'performance');
classifier.addDocument('high cpu usage', 'performance');
classifier.addDocument('ram consumption', 'performance');
classifier.addDocument('throughput data', 'performance');
classifier.addDocument('bottlenecks detected', 'performance');
classifier.addDocument('server latency', 'performance');
classifier.addDocument('disk io performance', 'performance');
classifier.addDocument('bandwidth usage', 'performance');
classifier.addDocument('performance trends', 'performance');

// 4. Logs / History
classifier.addDocument('show recent logs', 'logs');
classifier.addDocument('analyze system logs', 'logs');
classifier.addDocument('log history', 'logs');
classifier.addDocument('what happened recently', 'logs');
classifier.addDocument('export log report', 'logs');
classifier.addDocument('last events', 'logs');
classifier.addDocument('audit trail', 'logs');
classifier.addDocument('journal logs', 'logs');
classifier.addDocument('search log files', 'logs');
classifier.addDocument('recent activity list', 'logs');
classifier.addDocument('event viewer', 'logs');
classifier.addDocument('error history', 'logs');

// 5. Help / Greeting
classifier.addDocument('hello', 'greeting');
classifier.addDocument('hi sentinel', 'greeting');
classifier.addDocument('who are you', 'greeting');
classifier.addDocument('help me', 'greeting');
classifier.addDocument('what can you do', 'greeting');
classifier.addDocument('introduce yourself', 'greeting');
classifier.addDocument('good morning', 'greeting');
classifier.addDocument('hey ai', 'greeting');
classifier.addDocument('sentinel capabilities', 'greeting');
classifier.addDocument('how do i use this', 'greeting');

// 6. Remote / Agent
classifier.addDocument('how to connect agent', 'agent');
classifier.addDocument('remote connection help', 'agent');
classifier.addDocument('add new server', 'agent');
classifier.addDocument('install sentinel agent', 'agent');
classifier.addDocument('agent deployment', 'agent');
classifier.addDocument('monitor external node', 'agent');
classifier.addDocument('setup client script', 'agent');
classifier.addDocument('register new device', 'agent');
classifier.addDocument('node onboarding', 'agent');

// 7. Maintenance / Actions
classifier.addDocument('optimize system performance', 'maintenance');
classifier.addDocument('clear memory cache', 'maintenance');
classifier.addDocument('restart monitoring service', 'maintenance');
classifier.addDocument('cleanup logs', 'maintenance');
classifier.addDocument('fix slow system', 'maintenance');
classifier.addDocument('system maintenance', 'maintenance');
classifier.addDocument('reboot cloud nodes', 'maintenance');

// 8. Network / Connectivity
classifier.addDocument('check network latency', 'network');
classifier.addDocument('trace route data', 'network');
classifier.addDocument('bandwidth usage report', 'network');
classifier.addDocument('internet speed check', 'network');
classifier.addDocument('connection issues', 'network');
classifier.addDocument('is the vpc active', 'network');
classifier.addDocument('check port status', 'network');

// --- Train ---
console.log('Training Advanced AI Model...');
classifier.train();

// --- Save ---
classifier.save('classifier.json', (err, classifier) => {
    if (err) {
        console.error('Failed to save model:', err);
    } else {
        console.log('Model trained and saved to classifier.json');

        // Test
        console.log('Test "system ok?":', classifier.classify('system ok?'));
        console.log('Test "hacked?":', classifier.classify('hacked?'));
    }
});
