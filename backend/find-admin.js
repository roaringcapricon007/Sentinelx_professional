const { User } = require('./models');
User.findOne({ where: { email: 'Superadmin@SentinelX.com' } }).then(u => {
    console.log('Admin user found:', u ? u.id : 'NOT FOUND');
    process.exit(0);
});
