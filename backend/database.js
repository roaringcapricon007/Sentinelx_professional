const { Sequelize } = require('sequelize');
const path = require('path');
require('dotenv').config();

const isRemote = !!(process.env.DATABASE_URL || process.env.DB_HOST);

const sequelizeConfig = process.env.DATABASE_URL
    ? {
        // Production Cloud Database Config
        dialect: 'postgres',
        protocol: 'postgres',
        dialectOptions: {
            ssl: {
                require: true,
                rejectUnauthorized: false
            }
        },
        logging: false
    }
    : (isRemote ? {
        host: process.env.DB_HOST,
        port: process.env.DB_PORT || 5432,
        username: process.env.DB_USER,
        password: process.env.DB_PASS,
        database: process.env.DB_NAME,
        dialect: process.env.DB_DIALECT || 'postgres',
        logging: false,
        dialectOptions: {
            ssl: {
                require: true,
                rejectUnauthorized: false
            }
        }
    } : {
        dialect: 'sqlite',
        storage: path.join(__dirname, 'database.sqlite'),
        logging: false
    });

const connectionString = process.env.DATABASE_URL;

const sequelize = connectionString
    ? new Sequelize(connectionString, sequelizeConfig)
    : new Sequelize({
        ...sequelizeConfig,
        pool: {
            max: 10,
            min: 0,
            acquire: 10000,
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
            console.log(`Mode: ${isRemote ? 'Enterprise Cloud-Sync' : 'Local Matrix Storage'}`);
            console.log(`Engine: ${sequelize.getDialect().toUpperCase()}`);
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

