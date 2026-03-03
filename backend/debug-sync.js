const sequelize = require('./database');
const { DataTypes } = require('sequelize');

async function debugSync() {
    try {
        const MyUser = sequelize.define('MyUser', {
            name: { type: DataTypes.STRING }
        });

        const MyMetric = sequelize.define('MyMetric', {
            cpu: { type: DataTypes.FLOAT },
            UserId: {
                type: DataTypes.INTEGER,
                references: { model: 'MyUser', key: 'id' }
            }
        });

        await sequelize.sync({ force: true });
        console.log('SYNC SUCCESS');

        const cols = await sequelize.query("PRAGMA table_info(MyMetric)", { type: sequelize.QueryTypes.SELECT });
        console.log('COLS:', cols.map(c => c.name));

        process.exit(0);
    } catch (e) {
        console.error('ERROR:', e);
        process.exit(1);
    }
}
debugSync();
