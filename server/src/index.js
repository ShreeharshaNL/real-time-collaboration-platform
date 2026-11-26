const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const { createClient } = require('redis');
const { createAdapter } = require('@socket.io/redis-adapter');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
require('dotenv').config();

const app = express();
const server = http.createServer(app);

// Rate Limiter
const apiLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 100,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: "Too many requests from this IP, please try again after 15 minutes." }
});

app.use(cors());
app.use(express.json());
app.use('/api/', apiLimiter);

// Health check
app.get('/health', (req, res) => {
    res.json({ status: 'UP', service: 'Real-Time Collaboration API', timestamp: new Date() });
});

// Setup Socket.IO with Redis Adapter
const io = new Server(server, {
    cors: { origin: '*', methods: ['GET', 'POST'] }
});

async function initRedis() {
    if (process.env.REDIS_URL) {
        const pubClient = createClient({ url: process.env.REDIS_URL });
        const subClient = pubClient.duplicate();
        await Promise.all([pubClient.connect(), subClient.connect()]);
        io.adapter(createAdapter(pubClient, subClient));
        console.log('Redis pub/sub adapter attached to Socket.IO');
    }
}
initRedis().catch(err => console.log('Redis disabled or local mode:', err.message));

// Real-Time Socket Events
const setupSockets = require('./sockets/collabSocket');
setupSockets(io);

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
    console.log(`Collab Server running on port ${PORT}`);
});

module.exports = { app, server };
