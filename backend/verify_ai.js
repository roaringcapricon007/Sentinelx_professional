const io = require('socket.io-client');

const socket = io('http://localhost:3000');

socket.on('connect', () => {
    console.log('Connected to Backend for AI Test');

    // Test 1: Status
    console.log('Sending: "system status report"');
    socket.emit('chat_message', 'system status report');
});

socket.on('chat_response', (data) => {
    console.log('Received AI Response:', data.message);

    if (data.message.includes('System Status') || data.message.includes('Operational')) {
        console.log('✅ AI Test PASSED');
    } else {
        console.log('❌ AI Test FAILED');
    }

    socket.disconnect();
});

socket.on('disconnect', () => {
    console.log('Disconnected');
});
