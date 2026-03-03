const sequelize = require('./database');
const { QueryTypes } = require('sequelize');

async function checkSchema() {
    try {
        const columns = await sequelize.query("PRAGMA table_info(SystemMetric)", { type: QueryTypes.SELECT });
        console.log('SystemMetric Columns:', columns.map(c => c.name));

        const logsColumns = await sequelize.query("PRAGMA table_info(LogEntry)", { type: QueryTypes.SELECT });
        console.log('LogEntry Columns:', logsColumns.map(c => c.name));

        const serverColumns = await sequelize.query("PRAGMA table_info(Server)", { type: QueryTypes.SELECT });
        console.log('Server Columns:', serverColumns.map(c => c.name));

        process.exit(0);
    } catch (e) {
        console.error(e);
        process.exit(1);
    }
}
checkSchema();
