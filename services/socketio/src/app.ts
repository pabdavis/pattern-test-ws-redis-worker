import { createServer } from "http";
import { Server } from "socket.io";
import { createAdapter } from "@socket.io/redis-adapter";
import { createClient } from "redis";
const celery = require('celery-node');

const cors_origin = 'http://localhost:3000';
const redis_host = 'redis';
const redis_port = 6379;
const redis_db = 0;

const redis_url = `redis://${redis_host}:${redis_port}`;
const redis_db_url = `redis://${redis_host}:${redis_port}/${redis_db}`;

const client = celery.createClient(
    redis_db_url,
    redis_db_url
);

async function startServer() {
    const httpServer = createServer();
    const io = new Server(httpServer, {
        cors: {
            origin: cors_origin
        }
    });
    const PORT = process.env.PORT || 3000;

    const taskSubClient = createClient({ url: redis_url, legacyMode: false });

    taskSubClient.on("error", (error) => {
        console.error("Redis error:", error);
    });

    // Wait for the Redis client to connect
    await taskSubClient.connect();
    console.log("Task subscription client connected to Redis");

    const sioPubClient = taskSubClient.duplicate();
    const sioSubClient = taskSubClient.duplicate();
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
            console.log(`received message from sid: ${socket.id} message: ${msg}`);

            let internalMessage = {
                message: msg,
                sid: socket.id
            }

            let task = 'tasks.process_message'
            console.log(`Sending task ${task} with message:`, internalMessage);
            client.sendTask(task, [JSON.stringify(internalMessage)], {});

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


    const taskWorkerChannel = 'task_worker_messages';
    taskSubClient.subscribe(taskWorkerChannel, async (message) => {
        console.log(`Subscriber to channel ${taskWorkerChannel} received message: ${message}`)

        // Parse the message (assuming it's JSON)
        const parsedMessage = JSON.parse(message);
        console.log('Parsed message:', parsedMessage);

        // Extract the client ID from the message (assuming it's included)
        const clientId = parsedMessage.sid;
        console.log('Client ID:', clientId);

        const connectedIds = await (
            await io.in(clientId).local.fetchSockets()
        ).map((s) => s.id);

        if (connectedIds.includes(clientId)) {
            io.to(clientId).emit('chat message', parsedMessage);
        }
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
