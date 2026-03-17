const axios = require('axios');
const si = require('systeminformation');
const { io } = require('socket.io-client');
const yargs = require('yargs/yargs');
const { hideBin } = require('yargs/helpers');
const os = require('os');

// Parse Arguments
const argv = yargs(hideBin(process.argv))
    .option('server', {
        alias: 's',
        type: 'string',
        description: 'SentinelX Backend URL (e.g., http://192.168.1.5:3000)',
        default: 'http://localhost:3000'
    })
    .option('name', {
        alias: 'n',
        type: 'string',
        description: 'Unique Device Name',
        default: os.hostname()
    })
    .option('interval', {
        alias: 'i',
        type: 'number',
        description: 'Metrics Interval (ms)',
        default: 5000
    })
    .help()
    .help()
    .argv;

process.on('uncaughtException', (err) => {
    console.error('UNCAUGHT EXCEPTION:', err);
});
process.on('unhandledRejection', (reason, promise) => {
    console.error('UNHANDLED REJECTION:', reason);
});

const SERVER_URL = argv.server;
const DEVICE_NAME = argv.name;

console.log(`\n--- SentinelX Client Agent v1.0 ---`);
console.log(`Target Server: ${SERVER_URL}`);
console.log(`Device Name:   ${DEVICE_NAME}`);
console.log(`Interval:      ${argv.interval}ms`);
console.log(`-----------------------------------\n`);

// --- 1. Infrastructure Heartbeat ---
async function sendHeartbeat() {
    try {
        const [cpu, mem, osInfo] = await Promise.all([
            si.currentLoad(),
            si.mem(),
            si.osInfo()
        ]);

        const payload = {
            hostname: DEVICE_NAME,
            ipAddress: getLocalIP(),
            region: 'Remote-Office', // Configurable if needed
            status: 'online',
            load: Math.round(cpu.currentLoad),
            memory: Math.round((mem.active / mem.total) * 100),
            platform: osInfo.platform,
            distro: osInfo.distro
        };

        await axios.post(`${SERVER_URL}/api/infrastructure/register`, payload);
        process.stdout.write('.'); // Dot for each heartbeat
    } catch (err) {
        process.stdout.write('X'); // X for failure
        // console.error(`\nHeartbeat Failed: ${err.message}`);
    }
}

// --- 2. Log Simulation (Demo Mode) ---
// In a real scenario, this would tail a file like /var/log/syslog
const SEVERITIES = ['low', 'medium', 'high', 'critical'];
const MESSAGES = [
    'User login successful',
    'Failed SSH attempt from 192.168.1.55',
    'Disk usage exceeded 85%',
    'Service "nginx" restarted',
    'Firewall dropped packet from external IP',
    'Backup completed successfully',
    'Memory fragmentation detected'
];

async function sendLog() {
    // Only send a log 30% of the time to avoid spamming
    if (Math.random() > 0.3) return;

    try {
        const severity = SEVERITIES[Math.floor(Math.random() * SEVERITIES.length)];
        const message = MESSAGES[Math.floor(Math.random() * MESSAGES.length)];

        const payload = {
            severity,
            device: DEVICE_NAME,
            message: `[${new Date().toISOString()}] ${message}`,
            suggestion: getSuggestion(severity)
        };

        await axios.post(`${SERVER_URL}/api/logs/ingest`, payload);
    } catch (err) {
        // console.error(`\nLog Send Failed: ${err.message}`);
    }
}

function getSuggestion(severity) {
    if (severity === 'critical') return 'Immediate investigation required. Check firewall logs.';
    if (severity === 'high') return 'Monitor closely. Potential security risk.';
    if (severity === 'medium') return 'Review system performance benchmarks.';
    return 'Routine activity. No action needed.';
}

function getLocalIP() {
    const nets = os.networkInterfaces();
    for (const name of Object.keys(nets)) {
        for (const net of nets[name]) {
            if (net.family === 'IPv4' && !net.internal) {
                return net.address;
            }
        }
    }
    return '127.0.0.1';
}

// --- Main Loop ---
setInterval(sendHeartbeat, argv.interval);
setInterval(sendLog, 8000); // Logs every 8s approx

console.log('Agent is running... (Press Ctrl+C to stop)');
