const { Sequelize } = require('sequelize');
const path = require('path');
require('dotenv').config();

const sequelize = new Sequelize({
    dialect: 'sqlite',
    storage: path.join(__dirname, 'database.sqlite'),
    logging: false, // Set to console.log for deep debugging
    pool: {
        max: 5,
        min: 0,
        acquire: 30000,
        idle: 10000
    },
    define: {
        timestamps: true,
        freezeTableName: true
    }
});

/**
 * --- DATABASE INTEGRITY LAYER ---
 * Ensures the connection is stable and retries on failure.
 */
async function connectDB(retries = 5) {
    while (retries > 0) {
        try {
            await sequelize.authenticate();
            console.log('--- DATABASE HANDSHAKE SUCCESSFUL ---');
            console.log('Dialect: SQLite Engine');
            console.log('Node: Internal Matrix Storage');
            return true;
        } catch (err) {
            retries -= 1;
            console.error(`[CRITICAL] DB Connection Failed. Retries remaining: ${retries}`);
            console.error(`Error: ${err.message}`);
            if (retries === 0) {
                console.error('FATAL: Database connection could not be established.');
                process.exit(1);
            }
            // Wait 2 seconds before retrying
            await new Promise(res => setTimeout(res, 2000));
        }
    }
}

// Initial authentication attempt (async)
connectDB();

module.exports = sequelize;

