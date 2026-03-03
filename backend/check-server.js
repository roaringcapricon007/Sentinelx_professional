const sequelize = require('./database');
const { QueryTypes } = require('sequelize');

async function checkServer() {
    try {
        const columns = await sequelize.query("PRAGMA table_info(Server)", { type: QueryTypes.SELECT });
        console.log('Server Columns:', columns.map(c => c.name));
        process.exit(0);
    } catch (e) {
        console.error(e);
        process.exit(1);
    }
}
checkServer();
