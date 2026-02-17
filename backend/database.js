const { Sequelize } = require('sequelize');
const path = require('path');
require('dotenv').config();

// Optimized High-Performance SQLite (Priority Production Engine)
const sequelize = new Sequelize({
    dialect: 'sqlite',
    storage: path.join(__dirname, 'database.sqlite'),
    logging: false,
    define: {
        timestamps: true,
        freezeTableName: true
    },
    retry: {
        max: 3
    },
    // WAL Mode for high concurrency and performance
    dialectOptions: {
        mode: 65536, // SQLITE_OPEN_FULLMUTEX
        timeout: 5000
    }
});

// Enable WAL mode for high performance
sequelize.query('PRAGMA journal_mode=WAL;');
sequelize.query('PRAGMA synchronous=NORMAL;');
sequelize.query('PRAGMA cache_size=-10000;'); // Increase cache to 10MB

console.log('Database Status: High-Performance SQLite (WAL-Core) Active');

module.exports = sequelize;
