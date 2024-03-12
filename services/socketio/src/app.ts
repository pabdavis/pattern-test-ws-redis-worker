import { createServer } from "http";
import { Server } from "socket.io";
import { createAdapter } from "@socket.io/redis-adapter";
import { createClient } from "redis";

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


    const taskSubClient = taskPubClient.duplicate();
    await taskSubClient.connect();
    // Subscribe to a Redis channel for task worker messages
    // Handle incoming messages from the task worker
    taskSubClient.on('message', (channel, message) => {
        console.log(`Received message from channel ${channel}:`, message);
        // Parse the message (assuming it's JSON)
        const parsedMessage = JSON.parse(message);
        console.log('Parsed message:', parsedMessage);

        // Extract the client ID from the message (assuming it's included)
        const clientId = parsedMessage.clientId;

        // Emit the message to the targeted client
        io.to(clientId).emit('chat message', parsedMessage.message);
    });

    taskSubClient.on('error', (error) => {
        console.error('Subscription error:', error);
    });
    const taskWorkerChannel = 'task_worker_messages';
    taskSubClient.subscribe(taskWorkerChannel, () => {
        console.log(`Subscribed to channel ${taskWorkerChannel}`);
    });

    const sioPubClient = taskPubClient.duplicate();
    const sioSubClient = taskPubClient.duplicate();
    const adapter = createAdapter(sioPubClient, sioSubClient);
    io.adapter(adapter);

    io.on('connection', (socket) => {
        console.log('A user connected');

        socket.on('chat message', (msg) => {
            console.log(`sid: ${socket.id} sent message: ${msg}`);

            let internalMessage = {
                message: msg,
                sid: socket.id
            }
            taskPubClient.publish('chat_messages', JSON.stringify(internalMessage));
            io.to(socket.id).emit('chat message', 'got your message');
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
