const { generateResponse } = require('../controllers/ai.controller');

module.exports = (io) => {
    io.on('connection', (socket) => {
        console.log('New client connected:', socket.id);

        socket.on('chat_message', async (data) => {
            try {
                const response = await generateResponse(data.message);
                socket.emit('chat_response', {
                    message: response,
                    sender: 'ai',
                    timestamp: new Date()
                });
            } catch (err) {
                console.error("Socket AI Error:", err);
                socket.emit('chat_response', {
                    message: "I am having trouble processing your request right now.",
                    sender: 'ai',
                    error: true
                });
            }
        });

        socket.on('disconnect', () => {
            console.log('Client disconnected:', socket.id);
        });
    });
};
