const { User } = require('./models');
const { connectDB } = require('./database');
(async () => {
    await connectDB();
    const users = await User.findAll();
    console.log("Current Identity Count:", users.length);
    users.forEach(u => console.log(`- ${u.email} [${u.role}]`));
    process.exit(0);
})();
