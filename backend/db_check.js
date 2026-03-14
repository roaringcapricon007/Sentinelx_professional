const sequelize = require('./database');
const { User, LogEntry, Server } = require('./models');

async function check() {
  try {
    await sequelize.authenticate();
    console.log('DB Connection OK');
    
    // Test sync
    try {
        await sequelize.sync({ alter: true });
        console.log('Sync OK');
    } catch (e) {
        console.error('Sync FAILED:', e);
        if (e.errors) {
            e.errors.forEach(err => console.error('  -', err.message, err.path, err.value));
        }
    }

    const users = await User.findAll();
    console.log('Users:', users.map(u => ({ id: u.id, email: u.email, role: u.role })));
    
  } catch (err) {
    console.error('Check failed:', err);
  } finally {
    process.exit();
  }
}

check();
