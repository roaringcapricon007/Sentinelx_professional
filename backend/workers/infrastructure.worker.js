const { Server } = require('../models');
const eventBus = require('../services/event.service');
const { Op } = require('sequelize');

/**
 * SentinelX Infrastructure Watchdog v10.0
 * Monitors node heartbeats and marks machines as 'offline' after 10s of silence.
 */
class InfrastructureWorker {
    async initialize() {
        console.log('[WATCHDOG] Infrastructure Heartbeat Monitor: ONLINE');
        
        // Check every 5 seconds for stale nodes
        setInterval(async () => {
            try {
                await this.checkStaleNodes();
            } catch (err) {
                console.error('[WATCHDOG] Heartbeat Validation Error:', err.message);
            }
        }, 5000);
    }

    async checkStaleNodes() {
        const timeoutThreshold = new Date(Date.now() - 15000); // 15 seconds of silence
        
        const staleServers = await Server.findAll({
            where: {
                status: 'online',
                lastSeen: { [Op.lt]: timeoutThreshold }
            }
        });

        if (staleServers.length > 0) {
            console.warn(`[WATCHDOG] 📡 Lost uplink with ${staleServers.length} machines. Marking offline.`);
            
            for (const server of staleServers) {
                server.status = 'offline';
                await server.save();
                
                // Publish system alert
                eventBus.publish('system:alert', {
                    type: 'NODE_OFFLINE',
                    target: server.hostname,
                    message: `Uplink Lost: Machine ${server.hostname} [${server.ipAddress}] is no longer responding to neural pulses.`
                });
            }

            // Sync UI
            const allServers = await Server.findAll();
            eventBus.publish('infrastructure:update', allServers);
        }
    }
}

module.exports = new InfrastructureWorker();
