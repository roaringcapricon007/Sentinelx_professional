const sequelize = require('./database');
require('./models');

sequelize.sync({ alter: true }).then(() => {
    console.log('SYNC SUCCESS');
    process.exit(0);
}).catch(e => {
    console.error('SYNC FAILED:', e);
    process.exit(1);
});
