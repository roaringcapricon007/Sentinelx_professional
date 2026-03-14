const sequelize = require('./database');
const { User } = require('./models');
const bcrypt = require('bcryptjs');

async function forceReset() {
  try {
    await sequelize.authenticate();
    const pass = "12345SuperAdmin!";
    const hashed = await bcrypt.hash(pass, 10);
    
    const emails = ['Superadmin@SentinelX.com', 'kamaleshselvakumar007@gmail.com'];
    
    for (const email of emails) {
      const user = await User.findOne({ where: { email } });
      if (user) {
        user.password = hashed;
        await user.save();
        console.log(`PASSWORD RESET SUCCESS: ${email}`);
      } else {
        await User.create({
          name: email === 'Superadmin@SentinelX.com' ? 'Super Admin' : 'Director',
          email: email,
          password: hashed,
          role: 'super_admin',
          provider: 'local'
        });
        console.log(`USER CREATED & PASSWORD SET: ${email}`);
      }
    }
  } catch (err) {
    console.error('RESET FAILED:', err);
  } finally {
    process.exit();
  }
}

forceReset();
