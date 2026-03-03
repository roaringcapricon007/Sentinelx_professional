const sequelize = require('./database');
const { User, SystemMetric } = require('./models');

async function testInsert() {
    try {
        await sequelize.sync({ force: true });
        const admin = await User.create({ name: 'Admin', email: 'a@a.com', password: '123' });
        console.log('Admin ID:', admin.id);

        await SystemMetric.create({
            cpuLoad: 10,
            memoryUsage: 20,
            networkTraffic: 30,
            UserId: admin.id
        });
        console.log('INSERT SUCCESSFUL');
        process.exit(0);
    } catch (e) {
        console.error('INSERT FAILED:', e);
        process.exit(1);
    }
}
testInsert();
