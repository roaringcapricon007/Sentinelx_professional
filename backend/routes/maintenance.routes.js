const router = require('express').Router();
const fs = require('fs');
const path = require('path');
const sequelize = require('../database');
const { LogEntry } = require('../models');

// POST /api/automation/clear-cache
router.post('/clear-cache', async (req, res) => {
    try {
        console.log('Initiating System-Wide Cache Purge...');

        let filesCleared = 0;
        let bytesFreed = 0;

        // 1. Clear Temp Uploads
        const uploadDir = path.join(__dirname, '../uploads');
        if (fs.existsSync(uploadDir)) {
            const files = fs.readdirSync(uploadDir);
            files.forEach(file => {
                if (file !== '.gitkeep') {
                    const filePath = path.join(uploadDir, file);
                    try {
                        const stats = fs.statSync(filePath);
                        bytesFreed += stats.size;
                        fs.rmSync(filePath, { recursive: true, force: true });
                        filesCleared++;
                    } catch (e) {
                        console.error(`Failed to delete ${file}:`, e.message);
                    }
                }
            });
        }

        // 2. Clear Python Cache
        const pyCacheDir = path.join(__dirname, '../python_service/__pycache__');
        if (fs.existsSync(pyCacheDir)) {
            const pyFiles = fs.readdirSync(pyCacheDir);
            pyFiles.forEach(file => {
                const filePath = path.join(pyCacheDir, file);
                try {
                    const stats = fs.statSync(filePath);
                    bytesFreed += stats.size;
                    fs.rmSync(filePath, { recursive: true, force: true });
                    filesCleared++;
                } catch (e) {
                    console.error(`Failed to delete ${file} from pycache:`, e.message);
                }
            });
        }

        // 3. Optimized DB Maintenance (Vacuum & Re-index)
        // Also clear old log entries (older than 7 days) if needed
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
        const deletedLogs = await LogEntry.destroy({
            where: {
                createdAt: { [require('sequelize').Op.lt]: sevenDaysAgo }
            }
        });

        await sequelize.query('VACUUM;');
        console.log(`Database Vacuumed. Deleted ${deletedLogs} old logs.`);

        res.json({
            status: 'Success',
            message: 'All system caches purged successfully.',
            details: {
                filesRemoved: filesCleared,
                diskSpaceFreed: bytesFreed > 1024 * 1024
                    ? (bytesFreed / (1024 * 1024)).toFixed(2) + ' MB'
                    : (bytesFreed / 1024).toFixed(2) + ' KB',
                dbOptimized: true
            }
        });
    } catch (err) {
        console.error('Cache Clear Error:', err);
        res.status(500).json({ error: 'Maintenance task failed.' });
    }
});

// GET /api/maintenance/db-status
router.get('/db-status', async (req, res) => {
    try {
        const stats = await sequelize.query("SELECT count(*) as count FROM sqlite_master WHERE type='table';");
        const tableCount = stats[0][0].count;

        // Check each core table
        const tables = ['User', 'SystemMetric', 'LogEntry', 'Server'];
        const details = {};

        for (const table of tables) {
            const count = await sequelize.models[table].count();
            details[table] = count;
        }

        res.json({
            status: 'Nominal',
            engine: 'SQLite 3',
            tablesInitialized: tableCount,
            recordMatrix: details,
            uptime: process.uptime()
        });
    } catch (err) {
        res.status(500).json({ status: 'Error', message: err.message });
    }
});

module.exports = router;

