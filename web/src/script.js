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
    socket.on('chat message', (msg) => {
        console.log('Received message:', msg);

        if (msg.type === 'status') {
            // Find and update existing status message, or create a new one
            let existingStatusLi = document.querySelector('li[data-type="status"]');
            if (!existingStatusLi) {
                existingStatusLi = document.createElement('li');
                existingStatusLi.setAttribute('data-type', 'status');
                messages.appendChild(existingStatusLi);
            }
            existingStatusLi.textContent = msg.text;
        } else if (msg.type === 'response') {
            // Remove existing status message, if any
            let existingStatusLi = document.querySelector('li[data-type="status"]');
            if (existingStatusLi) {
                existingStatusLi.remove();
            }

            // Append the received response message to the list of messages
            const li = document.createElement('li');
            li.textContent = msg.text;
            messages.appendChild(li);
        }
    });

    socket.onAny((event, ...args) => {
        console.log(event, args);
    });
});