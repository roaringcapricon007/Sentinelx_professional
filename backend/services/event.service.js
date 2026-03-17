const EventEmitter = require('events');

/**
 * SentinelX Event Bus v9.0 (Enterprise Core)
 * Handles internal decoupling of API ingestion and background processing.
 * Can be upgraded to Redis Pub/Sub for multi-server scaling.
 */
class SentinelEventBus extends EventEmitter {
    constructor() {
        super();
        this.on('error', (err) => {
            console.error('[EVENT_BUS] Unhandled Exception:', err);
        });
    }

    /**
     * Publish an event to the stream
     */
    publish(topic, data) {
        // In the future: await redis.publish(topic, JSON.stringify(data));
        this.emit(topic, data);
        
        // Push-to-UI capability (Bridge to Socket.io)
        if (global.io) {
            global.io.emit(topic, data);
        }
    }
}

const eventBus = new SentinelEventBus();

module.exports = eventBus;
