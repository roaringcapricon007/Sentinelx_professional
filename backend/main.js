const server = require('./server');
// Wait, server.js exports nothing. It just runs.
// I'll just run it with a listener.

process.on('unhandledRejection', (reason, promise) => {
    console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});
require('./server');
