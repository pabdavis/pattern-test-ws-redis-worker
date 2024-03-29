import { createServer } from "http";
import { Server } from "socket.io";
import { createAdapter } from "@socket.io/redis-adapter";
import { createClient } from "redis";
const celery = require('celery-node');

const client = celery.createClient(
    "redis://redis:6379/0",
    "redis://redis:6379/0"
);

async function startServer() {
    const httpServer = createServer();
    const io = new Server(httpServer, {
        cors: {
            origin: "http://localhost:8080"
        }
    });
    const PORT = process.env.PORT || 3000;

    const taskPubClient = createClient({ url: "redis://redis:6379", legacyMode: false });

    taskPubClient.on("error", (error) => {
        console.error("Redis error:", error);
    });

    // Wait for the Redis client to connect
    await taskPubClient.connect();
    console.log("Connected to Redis");

    const sioPubClient = taskPubClient.duplicate();
    const sioSubClient = taskPubClient.duplicate();
    const adapter = createAdapter(sioPubClient, sioSubClient);
    io.adapter(adapter);

    // io.use((socket, next) => {
    //     const sessionID = socket.handshake.auth.sessionID;
    //     if (sessionID) {
    //         // find existing session
    //         const session = sessionStore.findSession(sessionID);
    //         if (session) {
    //             socket.sessionID = sessionID;
    //             socket.userID = session.userID;
    //             return next();
    //         }
    //     }

    //     // create new session
    //     socket.sessionID = randomId();
    //     socket.userID = randomId();
    //     next();
    // });

    io.on('connection', (socket) => {
        console.log('A user connected');

        socket.on('chat message', (msg) => {
            console.log(`sid: ${socket.id} sent message: ${msg}`);

            let internalMessage = {
                message: msg,
                sid: socket.id
            }

            client.sendTask("tasks.process_message", [JSON.stringify(internalMessage)], {});

            let statusMessage = {
                type: 'status',
                text: 'got your message'
            }
            io.to(internalMessage.sid).emit('chat message', statusMessage);
        });

        socket.on('disconnect', () => {
            console.log('User disconnected');
        });

        // Listen for a specific message targeted to this client
        socket.on('targeted message', (msg) => {
            // Process the message
            console.log('Received targeted message:', msg);
        });
    });

    const taskSubClient = taskPubClient.duplicate();
    await taskSubClient.connect();
    // Subscribe to a Redis channel for task worker messages
    taskSubClient.on('error', (error) => {
        console.error('Subscription error:', error);
    });

    const taskWorkerChannel = 'task_worker_messages';
    taskSubClient.subscribe(taskWorkerChannel, async (message) => {
        console.log(`Subscriber to channel ${taskWorkerChannel} received message: ${message}`)

        // Parse the message (assuming it's JSON)
        const parsedMessage = JSON.parse(message);
        console.log('Parsed message:', parsedMessage);

        // Extract the client ID from the message (assuming it's included)
        const clientId = parsedMessage.sid;
        console.log('Client ID:', clientId);

        io.to(clientId).emit('chat message', parsedMessage);
    });

    Promise.all([sioPubClient.connect(), sioSubClient.connect()]).then(() => {
        httpServer.listen(PORT, () => {
            console.log(`Server running on port ${PORT}`);
        });
    });
}

// Call the startServer function to start the server
startServer().catch(error => {
    console.error('Failed to start server:', error);
});
