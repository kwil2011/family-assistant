document.addEventListener('DOMContentLoaded', () => {
    const chatContainer = document.getElementById('chatContainer');
    const messageInput = document.getElementById('messageInput');
    const sendButton = document.getElementById('sendButton');

    // Function to add a message to the chat
    function addMessage(content, isUser = false) {
        const messageDiv = document.createElement('div');
        messageDiv.className = `message ${isUser ? 'user-message' : 'assistant-message'}`;
        messageDiv.textContent = content;
        chatContainer.appendChild(messageDiv);
        chatContainer.scrollTop = chatContainer.scrollHeight;
    }

    // Function to handle sending a message
    async function sendMessage() {
        const message = messageInput.value.trim();
        if (!message) return;

        // Add user message to chat
        addMessage(message, true);
        messageInput.value = '';

        try {
            // Get chat history
            const chatHistory = JSON.parse(localStorage.getItem('chatHistory') || '[]');

            // Send message to main process
            const response = await window.electronAPI.chatMessage(message, model, temperature, chatHistory);
            addMessage(response);
        } catch (error) {
            console.error('Error sending message:', error);
            addMessage('Sorry, there was an error processing your message. Please try again.');
        }
    }

    // Event listeners
    sendButton.addEventListener('click', sendMessage);
    messageInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            sendMessage();
        }
    });

    // Add welcome message
    addMessage('Hello! I\'m your Family AI Assistant. How can I help you today?');
}); 