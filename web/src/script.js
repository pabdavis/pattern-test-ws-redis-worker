document.addEventListener('DOMContentLoaded', () => {
    const socket = io('http://localhost:3000'); // Connect to the Socket.IO server

    const form = document.getElementById('messageForm');
    const input = document.getElementById('messageInput');
    const messages = document.getElementById('messages');

    form.addEventListener('submit', (event) => {
        event.preventDefault(); // Prevent the form from submitting

        const message = input.value.trim();
        if (message) {
            // Send the message to the server
            socket.emit('chat message', message);

            // Add the message to the list of messages
            const li = document.createElement('li');
            li.textContent = message;
            messages.appendChild(li);

            // Clear the input field
            input.value = '';
        }
    });

    // Listen for incoming messages from the server
    socket.on('chat message', (message) => {
        console.log('Received message:', message);
        // Add the received message to the list of messages
        const li = document.createElement('li');
        li.textContent = message;
        messages.appendChild(li);
    });
});