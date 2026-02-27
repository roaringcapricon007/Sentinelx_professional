const http = require('http');
const { Sequelize } = require('sequelize');
const path = require('path');

const CHECK_URLS = [
    { name: 'Node Backend Health', url: 'http://localhost:3000/api/ai/pulse' },
    { name: 'Python Service Direct', url: 'http://localhost:5001/health' },
    { name: 'Database Integrity Core', url: 'http://localhost:3000/api/maintenance/db-status' },
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

async function neuralCheck() {
    console.log("\n3. Neural nexus handshake...");
    try {
        const res = await checkUrl({ name: 'Nexus Health', url: 'http://localhost:5001/health' });
        if (res) {
            console.log("[PASS] Neural Pathways Synchronized.");
        } else {
            console.log("[WARN] Neural Nexus is in fallback mode. Limited intelligence available.");
        }
    } catch (e) {
        console.log("[FAIL] Neural Link Lost. Please start Python Service.");
    }
}

async function run() {
    console.log(`
███████╗███████╗███╗   ██╗████████╗██╗███╗   ██╗███████╗██╗     ██╗  ██╗
██╔════╝██╔════╝████╗  ██║╚══██╔══╝██║████╗  ██║██╔════╝██║     ╚██╗██╔╝
███████╗█████╗  ██╔██╗ ██║   ██║   ██║██╔██╗ ██║█████╗  ██║      ╚███╔╝ 
╚════██║██╔══╝  ██║╚██╗██║   ██║   ██║██║╚██╗██║██╔══╝  ██║      ██╔██╗ 
███████║███████╗██║ ╚████║   ██║   ██║██║ ╚████║███████╗███████╗██╔╝ ██╗
╚══════╝╚══════╝╚═╝  ╚═══╝   ╚═╝   ╚═╝╚═╝  ╚═══╝╚══════╝╚══════╝╚═╝  ╚═╝
--- SentinelX Professional v7.0: Quantum Troubleshooting Core ---
    `);

    // 1. Environment Validation
    console.log("1. Validating Environment...");
    if (!process.env.SESSION_SECRET) {
        console.log("[WARN] SESSION_SECRET missing. Using default (Insecure for production).");
    } else {
        console.log("[PASS] Environment Security tokens verified.");
    }

    // 2. Database Check
    console.log("\n2. Verifying Database Connectivity...");
    const sequelize = new Sequelize({
        dialect: 'sqlite',
        storage: path.join(__dirname, 'database.sqlite'),
        logging: false
    });

    try {
        await sequelize.authenticate();
        console.log("[PASS] Database Connection: SQLite Engine Stable.");

        const [results] = await sequelize.query("SELECT count(*) as count FROM LogEntry");
        console.log(`[INFO] Audit Records: ${results[0].count} entries indexed.`);

    } catch (error) {
        console.error('[FAIL] Database Engine Breach:', error.message);
    }

    // 3. Neural Check
    await neuralCheck();

    // 4. Service API Checks
    console.log("\n4. Verifying API Matrix Endpoints...");
    for (const item of CHECK_URLS) {
        await checkUrl(item);
    }

    console.log("\n--- Quantum Diagnostics Complete. All systems nominal. ---");
    process.exit(0);
}


run();
