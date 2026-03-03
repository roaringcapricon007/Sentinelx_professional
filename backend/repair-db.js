const sequelize = require('./database');
const { User, SystemMetric, LogEntry, Server } = require('./models');

async function repairDB() {
    try {
        console.log('Starting DB Repair...');
        await sequelize.sync({ force: true });
        console.log('SCHEMA RESET SUCCESS');

        const bcrypt = require('bcryptjs');
        const pass = "12345SuperAdmin!";
        const hashed = await bcrypt.hash(pass, 4);

        const admin = await User.create({
            name: 'Super Admin',
            role: 'super_admin',
            email: 'Superadmin@SentinelX.com',
            password: hashed,
            provider: 'local'
        });
        console.log('ADMIN SEEDED:', admin.id);

        process.exit(0);
    } catch (e) {
        console.error('REPAIR FAILED:', e);
        process.exit(1);
    }
}
repairDB();
