// app.js
import { createServer } from "http";
import { Server } from "socket.io";
import { createAdapter } from "@socket.io/redis-adapter";
import { createClient } from "redis";

const httpServer = createServer();
const io = new Server(httpServer,
    {
        cors: {
            origin: "http://localhost:8080"
        }
    });
const PORT = process.env.PORT || 3000;

io.on('connection', (socket) => {
    console.log('A user connected');

    socket.on('disconnect', () => {
        console.log('User disconnected');
    });

    // Example event
    socket.on('chat message', (msg) => {
        console.log('message: ' + msg);
        io.emit('chat message', msg); // Broadcasting message to all connected clients
    });
});

// Create Redis clients
const pubClient = createClient({ url: "redis://redis:6379" });
const subClient = pubClient.duplicate();

// Connect to Redis clients and set up adapter
Promise.all([pubClient.connect(), subClient.connect()]).then(() => {
    const adapter = createAdapter(pubClient, subClient);

    // Set up pub/sub event listener for logging
    subClient.on('message', (channel, message) => {
        console.log(`Received message in channel ${channel}: ${message}`);
    });

    // Set up pub/sub event listener for Socket.IO adapter events
    httpServer.listen(Number(PORT));
});
