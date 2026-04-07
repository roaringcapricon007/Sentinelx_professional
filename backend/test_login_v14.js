const axios = require('axios');

async function testLogin() {
    try {
        const res = await axios.post('http://localhost:3000/api/auth/login', {
            email: 'Superadmin@SentinelX.com',
            password: 'admin123'
        });
        console.log('--- LOGIN SUCCESS ---');
        console.log('User:', res.data.user.name);
        console.log('Role:', res.data.user.role);
        console.log('Token Received: ✅');
        process.exit(0);
    } catch (err) {
        console.error('--- LOGIN FAILED ---');
        console.error('Status:', err.response?.status);
        console.error('Data:', JSON.stringify(err.response?.data, null, 2));
        process.exit(1);
    }
}

testLogin();
