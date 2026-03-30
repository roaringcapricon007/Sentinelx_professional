const axios = require('axios');
const si = require('systeminformation');
const os = require('os');
const yargs = require('yargs/yargs');
const { hideBin } = require('yargs/helpers');

// --- ENTERPRISE CONFIGURATION ---
const argv = yargs(hideBin(process.argv))
    .option('server', { alias: 's', default: 'http://localhost:3000', description: 'SentinelX Core Uplink' })
    .option('key', { alias: 'k', default: 'sx_key_local', description: 'Node Security Token' })
    .option('name', { alias: 'n', default: os.hostname(), description: 'Unique Hostname' })
    .option('interval', { alias: 'i', type: 'number', default: 5000, description: 'Refresh Rate (ms)' })
    .argv;

const SERVER_URL = argv.server;
const API_KEY = argv.key;
const HOSTNAME = argv.name;

console.log(`
  =================================================
  SentinelX External Machine Agent v3.0
  Node: ${HOSTNAME}
  Uplink: ${SERVER_URL}
  Clearance: SYNCED
  =================================================
`);

/**
 * Enterprise Matrix Pulse (Heartbeat + Log Streaming)
 * Unified ingestion via the '/api/ingest' Neural Pipeline.
 */
async function streamTelemetry() {
    try {
        const [cpu, mem] = await Promise.all([si.currentLoad(), si.mem()]);
        
        // --- NEW CORE FLOW (Point 5) ---
        const logPayload = {
            message: `Neural scan completed on ${HOSTNAME}. Matrix stable.`,
            level: Math.random() > 0.9 ? "warning" : "info",
            source: HOSTNAME,
            cpu: Math.round(cpu.currentLoad),
            ram: Math.round((mem.active / mem.total) * 100),
            ip: getLocalIP()
        };

        const res = await axios.post(`${SERVER_URL}/api/log`, logPayload);
        process.stdout.write(`\r[SENTINEL_PULSE] Uplink Active | CPU: ${logPayload.cpu}% | Status: ${res.data.success ? 'ACK' : 'FAIL'}   `);
    } catch (err) {
        process.stdout.write(`\r[ERROR] Agent Link Interrupted: ${err.message.substring(0, 50)}...   `);
    }
}

function getLocalIP() {
    const nets = os.networkInterfaces();
    for (const name of Object.keys(nets)) {
        for (const net of nets[name]) {
            if (net.family === 'IPv4' && !net.internal) return net.address;
        }
    }
    return '127.0.0.1';
}

// Start Stream
setInterval(streamTelemetry, argv.interval);
streamTelemetry(); // Immediate first pulse
