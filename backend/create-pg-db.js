const { Client } = require('pg');
require('dotenv').config();

async function createDatabase() {
    const dbName = process.env.DB_NAME || 'sentinelx';
    const config = {
        host: process.env.DB_HOST || 'localhost',
        port: process.env.DB_PORT || 5432,
        user: process.env.DB_USER || 'postgres',
        password: process.env.DB_PASS || 'postgres',
        database: 'postgres' // Connect to default DB to create new one
    };

    const client = new Client(config);

    try {
        await client.connect();
        console.log(`Checking for database "${dbName}"...`);

        const res = await client.query(`SELECT 1 FROM pg_database WHERE datname = '${dbName}'`);

        if (res.rowCount === 0) {
            console.log(`Database "${dbName}" does not exist. Creating...`);
            await client.query(`CREATE DATABASE ${dbName}`);
            console.log(`[OK] Database "${dbName}" created successfully.`);
        } else {
            console.log(`[INFO] Database "${dbName}" already exists.`);
        }
    } catch (err) {
        console.error('[ERROR] Could not create database:', err.message);
        console.log('Please ensure PostgreSQL is running and your credentials in .env are correct.');
    } finally {
        await client.end();
    }
}

createDatabase();
