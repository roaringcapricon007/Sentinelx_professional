const { User } = require('./models');
const sequelize = require('./database');

async function check() {
    try {
        await sequelize.authenticate();
        const users = await User.findAll({ attributes: ['id', 'email', 'name', 'role'] });
        console.log('--- USER DATABASE INVENTORY ---');
        console.log(JSON.stringify(users, null, 2));
        process.exit(0);
    } catch (err) {
        console.error('FAILED:', err.message);
        process.exit(1);
    }
}
check();
