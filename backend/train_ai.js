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

// 2. Security / Alerts
classifier.addDocument('show me security alerts', 'security');
classifier.addDocument('any threats detected', 'security');
classifier.addDocument('check for hacks', 'security');
classifier.addDocument('system breaches', 'security');
classifier.addDocument('critical errors in logs', 'security');
classifier.addDocument('security report', 'security');
classifier.addDocument('firewall status', 'security');

// 3. Performance / Metrics
classifier.addDocument('current cpu load', 'performance');
classifier.addDocument('memory usage', 'performance');
classifier.addDocument('network traffic analysis', 'performance');
classifier.addDocument('is the server slow', 'performance');
classifier.addDocument('performance metrics', 'performance');
classifier.addDocument('resource utilization', 'performance');

// 4. Logs / History
classifier.addDocument('show recent logs', 'logs');
classifier.addDocument('analyze system logs', 'logs');
classifier.addDocument('log history', 'logs');
classifier.addDocument('what happened recently', 'logs');
classifier.addDocument('export log report', 'logs');

// 5. Help / Greeting
classifier.addDocument('hello', 'greeting');
classifier.addDocument('hi sentinel', 'greeting');
classifier.addDocument('who are you', 'greeting');
classifier.addDocument('help me', 'greeting');
classifier.addDocument('what can you do', 'greeting');

// 6. Remote / Agent
classifier.addDocument('how to connect agent', 'agent');
classifier.addDocument('remote connection help', 'agent');
classifier.addDocument('add new server', 'agent');

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
