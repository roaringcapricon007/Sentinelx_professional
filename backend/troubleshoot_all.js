const http = require('http');
const { Sequelize } = require('sequelize');
const path = require('path');

const CHECK_URLS = [
    { name: 'Node Backend Health', url: 'http://localhost:3000/api/ai/pulse' }, // This hits Python via proxy too
    { name: 'Python Service Direct', url: 'http://localhost:5001/health' },
    { name: 'Database Logs', url: 'http://localhost:3000/api/logs/history' },
    { name: 'Automation Stats', url: 'http://localhost:3000/api/automation/stats' }
];

async function checkUrl(item) {
    return new Promise((resolve) => {
        const req = http.get(item.url, (res) => {
            let data = '';
            res.on('data', (chunk) => data += chunk);
            res.on('end', () => {
                if (res.statusCode >= 200 && res.statusCode < 300) {
                    try {
                        const json = JSON.parse(data);
                        console.log(`[PASS] ${item.name}: Status ${res.statusCode}`);
                        resolve(true); // Success
                    } catch (e) {
                        console.log(`[WARN] ${item.name}: Status ${res.statusCode} (Invalid JSON)`);
                        resolve(false);
                    }
                } else {
                    console.log(`[FAIL] ${item.name}: Status ${res.statusCode}`);
                    resolve(false);
                }
            });
        });

        req.on('error', (err) => {
            console.log(`[FAIL] ${item.name}: ${err.message}`);
            resolve(false);
        });

        req.setTimeout(5000, () => {
            req.abort();
            console.log(`[FAIL] ${item.name}: Timeout`);
            resolve(false);
        });
    });
}

async function run() {
    console.log("--- SentinelX Comprehensive System Troubleshooting ---");

    // 1. Database Check
    console.log("\n1. Verifying Database Connectivity...");
    const sequelize = new Sequelize({
        dialect: 'sqlite',
        storage: path.join(__dirname, 'database.sqlite'),
        logging: false
    });

    try {
        await sequelize.authenticate();
        console.log("[PASS] Database Connection: SQLite Ready");

        // Count logs to ensure seeding worked
        const [results] = await sequelize.query("SELECT count(*) as count FROM LogEntry");
        console.log(`[INFO] Audit Log Count: ${results[0].count}`);

    } catch (error) {
        console.error('[FAIL] Database Connection:', error.message);
    }

    // 2. Service API Checks
    console.log("\n2. Verifying Service Endpoints...");
    for (const item of CHECK_URLS) {
        await checkUrl(item);
    }

    console.log("\n--- Troubleshooting Complete ---");
    process.exit(0); // Exit process
}

run();
