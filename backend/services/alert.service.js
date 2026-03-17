const eventBus = require('./event.service');

/**
 * SentinelX Alert Engine v9.0
 * Real-time monitoring of machine metrics to detect high-stress conditions.
 */
class AlertEngine {
    constructor() {
        this.thresholds = {
            cpu: 90,
            ram: 95,
            disk: 98
        };
    }

    /**
     * Inspect telemetry for violations
     */
    analyzeTelemetry(machine) {
        if (machine.cpu > this.thresholds.cpu) {
            this.triggerAlert('CRITICAL_LOAD', {
                target: machine.hostname,
                metric: 'CPU',
                value: machine.cpu,
                message: `Neural overload detected on ${machine.hostname}. Thread saturation at ${machine.cpu}%.`
            });
        }

        if (machine.ram > this.thresholds.ram) {
            this.triggerAlert('MEMORY_EXHAUSTION', {
                target: machine.hostname,
                metric: 'RAM',
                value: machine.ram,
                message: `Memory leak suspected on ${machine.hostname}. Available buffers near zero.`
            });
        }
    }

    triggerAlert(type, data) {
        console.warn(`[ALERT_ENGINE] 🚨 ${type}: ${data.message}`);
        
        // Publish to stream
        eventBus.publish('system:alert', {
            type,
            severity: 'CRITICAL',
            ...data,
            timestamp: new Date()
        });

        // Trigger notification bridge if needed
        const { sendEmailAlert } = require('./notification.service');
        // sendEmailAlert can be called here for truly critical alerts
    }
}

module.exports = new AlertEngine();
