const sequelize = require('./database');
const { User } = require('./models');

async function verifyConnection() {
    try {
        await sequelize.authenticate();
        console.log('Connection has been established successfully.');

        // Check if tables exist by counting users (optional, assumes User model exists)
        const count = await User.count();
        console.log(`Current user count: ${count}`);

    } catch (error) {
        console.error('Unable to connect to the database:', error);
    } finally {
        await sequelize.close();
    }
}

verifyConnection();
