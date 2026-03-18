const EventEmitter = require('events');
const Redis = require('ioredis');

/**
 * SentinelX Event Bus v10.0 (Enterprise Scaling Core)
 * Handles internal decoupling of API ingestion and background processing.
 * Upgraded to Redis Pub/Sub for multi-server scaling (Server 1 -> Server 2 -> Server 3).
 */
class SentinelEventBus extends EventEmitter {
    constructor() {
        super();
        this.useRedis = !!process.env.REDIS_URL;
        
        if (this.useRedis) {
            this.pub = new Redis(process.env.REDIS_URL);
            this.sub = new Redis(process.env.REDIS_URL);
            
            this.sub.subscribe('sentinel:events');
            this.sub.on('message', (channel, message) => {
                const { topic, data } = JSON.parse(message);
                // Emit locally what came from Redis
                super.emit(topic, data);
            });
            console.log('[EVENT_BUS] Redis Pub/Sub Cluster Sync: ONLINE');
        } else {
            console.log('[EVENT_BUS] Local EventEmitter Matrix: ONLINE');
        }

        this.on('error', (err) => {
            console.error('[EVENT_BUS] Unhandled Exception:', err);
        });
    }

    /**
     * Publish an event to the stream (Local or Redis)
     */
    publish(topic, data) {
        if (this.useRedis) {
            this.pub.publish('sentinel:events', JSON.stringify({ topic, data }));
        } else {
            this.emit(topic, data);
        }
    }
}

const eventBus = new SentinelEventBus();

module.exports = eventBus;
