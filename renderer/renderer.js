document.addEventListener('DOMContentLoaded', async () => {
    // Check if user is logged in
    const userData = await window.electronAPI.storeGet('userData');
    const selectedProvider = userData.llmProvider || 'openai';
    if (!userData || !userData.email || !userData[`${selectedProvider}ApiKey`]) {
        window.location.href = 'index.html';
        return;
    }

    const chatContainer = document.getElementById('chatContainer');
    const messageInput = document.getElementById('messageInput');
    const sendButton = document.getElementById('sendButton');
    const selectModelBtn = document.getElementById('selectModelBtn');
    const modelModal = document.getElementById('modelModal');
    const closeModelModal = document.getElementById('closeModelModal');
    const refreshRateBtn = document.getElementById('refreshRateBtn');
    const exchangeRateDisplay = document.getElementById('exchangeRateDisplay');
    const sessionCostDisplay = document.getElementById('sessionCostDisplay');
    let selectedModel = await window.electronAPI.storeGet('selectedModel') || 'gpt-4o';

    // Initialize session cost
    let sessionCost = parseFloat(localStorage.getItem('sessionCost')) || 0;
    updateSessionCostDisplay(sessionCost);

    // Update session cost display
    function updateSessionCostDisplay(newCost) {
        console.log('updateSessionCostDisplay called with:', newCost); // Debug log
        // Get current session cost from main process store
        window.electronAPI.storeGet('sessionCost').then(currentCost => {
            let currentSessionCost = parseFloat(currentCost) || 0;
            console.log('Current session cost:', currentSessionCost); // Debug log
            
            // Add the new cost to the current session cost
            let addCost = !isNaN(parseFloat(newCost)) ? parseFloat(newCost) : 0;
            let sessionCost = currentSessionCost + addCost;
            console.log('New total session cost:', sessionCost); // Debug log
            
            // Update the display
            sessionCostDisplay.textContent = `Session Cost: $${sessionCost.toFixed(6)} AUD`;
            // Store the updated session cost in main process
            window.electronAPI.storeSet('sessionCost', sessionCost.toFixed(6));
        });
    }
    window.updateSessionCostDisplay = updateSessionCostDisplay;

    // Event listeners for top bar buttons
    if (refreshRateBtn) {
        refreshRateBtn.addEventListener('click', async () => {
            refreshRateBtn.classList.add('spinning');
            setTimeout(() => refreshRateBtn.classList.remove('spinning'), 1000);
        });
    }

    // Debug logs
    console.log('selectModelBtn:', selectModelBtn);
    console.log('modelModal:', modelModal);

    // Update button text
    function updateModelButton() {
        const modelNames = {
            // OpenAI Models
            'gpt-4o': 'GPT-4o',
            'gpt-4-turbo': 'GPT-4 Turbo',
            'gpt-3.5-turbo': 'GPT-3.5 Turbo',
            
            // Anthropic Models
            'claude-3-opus': 'Claude 3 Opus',
            'claude-3-sonnet': 'Claude 3 Sonnet',
            
            // Google Models
            'gemini-1.5-pro': 'Gemini 1.5 Pro',
            'gemini-1.0-pro': 'Gemini 1.0 Pro',
            
            // Mistral Models
            'mistral-large': 'Mistral Large',
            'mistral-medium': 'Mistral Medium',
            
            // Cohere Models
            'command-r-plus': 'Command R+',
            'command': 'Command',
            
            // Meta Models
            'llama-3-70b': 'Llama 3 70B',
            'llama-3-8b': 'Llama 3 8B'
        };
        selectModelBtn.textContent = `Model: ${modelNames[selectedModel] || selectedModel}`;
    }
    updateModelButton();

    // Model selection (update both selectedModel and llmProvider)
    document.querySelectorAll('.model-card').forEach(card => {
        card.addEventListener('click', async (e) => {
            e.stopPropagation();
            const model = card.getAttribute('data-model');
            const provider = card.closest('.model-section').getAttribute('data-provider');
            
            // Check for API key for this provider
            const userData = await window.electronAPI.storeGet('userData');
            const apiKey = userData[`${provider}ApiKey`];
            
            if (!apiKey) {
                const providerName = provider.charAt(0).toUpperCase() + provider.slice(1);
                const confirm = window.confirm(`No API key found for ${providerName}. Would you like to go to Account Settings to add your API key?`);
                if (confirm) {
                    window.location.href = 'account.html';
                }
                return;
            }
            
            // Update selected model and provider in storage
            selectedModel = model;
            await window.electronAPI.storeSet('selectedModel', selectedModel);
            await window.electronAPI.storeSet('selectedProvider', provider);
            await window.electronAPI.storeSet('userData', { ...userData, llmProvider: provider });
            
            // Update UI
            updateModelButton();
            document.querySelectorAll('.model-card').forEach(c => c.classList.remove('selected'));
            card.classList.add('selected');
            modelModal.style.display = 'none';

            // Clear image context if model is changed to a non-vision model
            if (!isVisionModel(model)) {
                console.log('DEBUG: Model changed to non-vision model, clearing image context.');
                window.currentImageData = undefined;
                window.addMessage('You are now in normal chat mode.');
            }
        });
    });

    // Provider tab switching
    document.querySelectorAll('.provider-tab').forEach(tab => {
        tab.addEventListener('click', async (e) => {
            e.stopPropagation();
            const provider = tab.getAttribute('data-provider');
            
            // Update active tab
            document.querySelectorAll('.provider-tab').forEach(t => t.classList.remove('active'));
            tab.classList.add('active');
            
            // Show/hide model sections
            document.querySelectorAll('.model-section').forEach(section => {
                if (section.getAttribute('data-provider') === provider) {
                    section.style.display = 'grid';
                } else {
                    section.style.display = 'none';
                }
            });
        });
    });

    // Load saved provider and model
    const savedProvider = await window.electronAPI.storeGet('selectedProvider') || 'openai';
    const savedModel = await window.electronAPI.storeGet('selectedModel') || 'gpt-4o';
    
    // Set initial provider tab
    document.querySelector(`.provider-tab[data-provider="${savedProvider}"]`).classList.add('active');
    document.querySelectorAll('.model-section').forEach(section => {
        if (section.getAttribute('data-provider') === savedProvider) {
            section.style.display = 'grid';
        } else {
            section.style.display = 'none';
        }
    });
    
    // Set initial selected model
    selectedModel = savedModel;
    document.querySelector(`.model-card[data-model="${savedModel}"]`)?.classList.add('selected');
    updateModelButton();

    // Modal open/close
    if (selectModelBtn) {
        selectModelBtn.addEventListener('click', async (e) => {
            e.stopPropagation();
            // Get the provider from userData (account info)
            const userData = await window.electronAPI.storeGet('userData');
            const provider = userData.llmProvider || 'openai';
            
            // Set the correct provider tab active
            document.querySelectorAll('.provider-tab').forEach(tab => {
                if (tab.getAttribute('data-provider') === provider) {
                    tab.classList.add('active');
                } else {
                    tab.classList.remove('active');
                }
            });
            
            // Show only the correct model section
            document.querySelectorAll('.model-section').forEach(section => {
                if (section.getAttribute('data-provider') === provider) {
                    section.style.display = 'grid';
                } else {
                    section.style.display = 'none';
                }
            });
            
            // Highlight the selected model
            const selectedModel = await window.electronAPI.storeGet('selectedModel');
            document.querySelectorAll('.model-card').forEach(card => card.classList.remove('selected'));
            if (selectedModel) {
                document.querySelector(`.model-card[data-model="${selectedModel}"]`)?.classList.add('selected');
            }
            
            modelModal.style.display = 'flex';
            modelModal.focus();
        });
    }
    if (closeModelModal) {
        closeModelModal.addEventListener('click', (e) => {
            e.stopPropagation();
            modelModal.style.display = 'none';
        });
    }
    if (modelModal) {
        modelModal.addEventListener('click', (e) => {
            if (e.target === modelModal) {
                modelModal.style.display = 'none';
            }
        });
    }

    // Function to handle sending a message
    async function sendMessage(content) {
        const messageInput = document.getElementById('messageInput');
        const sendButton = document.getElementById('sendButton');
        const isVoiceInput = content.startsWith('VOICE_INPUT:');
        const actualContent = isVoiceInput ? content.replace('VOICE_INPUT:', '') : content;

        // Clear input and disable send button
        messageInput.value = '';
        sendButton.disabled = true;

        // Add user message to chat
        window.addMessage(actualContent, true);

        // Show typing indicator
        const typingIndicator = document.getElementById('typingIndicator');
        typingIndicator.style.display = 'block';

        try {
            // Get chat history
            const chatHistory = JSON.parse(localStorage.getItem('chatHistory') || '[]');

            // Send message to main process
            const response = await window.electronAPI.chatMessage(actualContent, selectedModel, 0.7, chatHistory);
            
            // Hide typing indicator
            typingIndicator.style.display = 'none';

            // Update session cost if response includes cost
            if (response && response.cost) {
                console.log('Updating cost with:', response.cost);
                const cost = parseFloat(response.cost);
                if (!isNaN(cost)) {
                    updateSessionCostDisplay(cost);
                } else {
                    console.error('Invalid cost value received:', response.cost);
                }
            }

            // If this was a voice input, start TTS before displaying the message
            if (isVoiceInput) {
                const speakerButton = document.getElementById('speakerButton');
                if (!speakerButton.classList.contains('speaking')) {
                    // Create audio element and start loading
                    const audio = new Audio(URL.createObjectURL(new Blob([await window.electronAPI.textToSpeech(response.message, chatHistory)], { type: 'audio/mpeg' })));
                    
                    // Start playing as soon as possible
                    audio.play().catch(error => {
                        console.error('Error playing audio:', error);
                        showError('Failed to play audio. Please try again.');
                    });
                    
                    // Add the speaking class to the button
                    speakerButton.classList.add('speaking');
                    
                    // Remove the speaking class when audio ends
                    audio.onended = () => {
                        speakerButton.classList.remove('speaking');
                    };
                }
            }

            // Add AI response to chat
            window.addMessage(response.message, false);

            // Save chat history
            saveChatHistory();
        } catch (error) {
            // Hide typing indicator
            typingIndicator.style.display = 'none';
            
            // Show error message
            showError(error.message);
        }

        // Re-enable send button
        sendButton.disabled = false;
    }

    // Event listeners
    if (messageInput) messageInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            sendMessage(messageInput.value.trim());
        }
    });

    if (sendButton) sendButton.addEventListener('click', () => {
        sendMessage(messageInput.value.trim());
    });

    // --- Chat Persistence ---
    function saveChatHistory() {
        const messages = Array.from(chatContainer.querySelectorAll('.message')).map(msg => ({
            content: msg.textContent,
            isUser: msg.classList.contains('user'),
            isError: msg.classList.contains('error-message')
        }));
        localStorage.setItem('chatHistory', JSON.stringify(messages));
        console.log('[ChatPersist] Saved chatHistory:', messages);
    }

    function loadChatHistory() {
        const history = JSON.parse(localStorage.getItem('chatHistory') || '[]');
        console.log('[ChatPersist] Loaded chatHistory:', history);
        chatContainer.innerHTML = '';
        history.forEach(msg => {
            window.addMessage(msg.content, msg.isUser, msg.isError);
        });
    }

    // Define addMessage globally on window
    window.addMessage = function(content, isUser = false, isError = false) {
        console.log('[ChatPersist] addMessage:', {content, isUser, isError});
        const messageDiv = document.createElement('div');
        messageDiv.className = `message ${isUser ? 'user' : 'assistant'} ${isError ? 'error-message' : ''}`;
        messageDiv.textContent = content;
        chatContainer.appendChild(messageDiv);
        chatContainer.scrollTop = chatContainer.scrollHeight;
        saveChatHistory();
    };

    // On page load, load chat history
    loadChatHistory();
    // Only show welcome message if chat is empty
    if (chatContainer.children.length === 0) {
        window.addMessage('Hello! I\'m your Family AI Assistant. How can I help you today?');
    }

    // Quick actions menu functionality
    const plusButton = document.getElementById('plusButton');
    const quickActionsMenu = document.getElementById('quickActionsMenu');

    if (plusButton) {
        plusButton.addEventListener('click', (e) => {
            e.stopPropagation();
            quickActionsMenu.style.display = quickActionsMenu.style.display === 'block' ? 'none' : 'block';
        });
    }

    if (quickActionsMenu) {
        document.addEventListener('click', (e) => {
            if (!plusButton.contains(e.target) && !quickActionsMenu.contains(e.target)) {
                quickActionsMenu.style.display = 'none';
            }
        });
    }

    // Handle quick action buttons
    if (document.getElementById('youtubeButton')) {
        document.getElementById('youtubeButton').addEventListener('click', () => {
            const quickActionModal = document.getElementById('quickActionModal');
            const youtubeSummariserPanel = document.getElementById('youtubeSummariserPanel');
            quickActionModal.style.display = 'flex';
            youtubeSummariserPanel.style.display = 'block';
            quickActionsMenu.style.display = 'none';
        });
    }

    // Handle image upload button
    if (document.getElementById('imageButton')) {
        document.getElementById('imageButton').addEventListener('click', () => {
            const fileInput = document.getElementById('imageUpload');
            if (fileInput) {
                fileInput.click();
            }
            quickActionsMenu.style.display = 'none';
        });
    }

    // Handle document upload button
    if (document.getElementById('fileButton')) {
        document.getElementById('fileButton').addEventListener('click', () => {
            const fileInput = document.getElementById('documentUpload');
            if (fileInput) {
                fileInput.click();
            }
            quickActionsMenu.style.display = 'none';
        });
    }

    // Close quick action modal
    if (document.getElementById('closeQuickActionModal')) {
        document.getElementById('closeQuickActionModal').addEventListener('click', () => {
            const quickActionModal = document.getElementById('quickActionModal');
            quickActionModal.style.display = 'none';
        });
    }

    // Handle YouTube summarization
    if (document.getElementById('summariseYoutubeBtn')) {
        document.getElementById('summariseYoutubeBtn').addEventListener('click', async () => {
            const youtubeUrlInput = document.getElementById('youtubeUrlInput');
            const youtubeSummaryStatus = document.getElementById('youtubeSummaryStatus');
            const youtubeSummaryResult = document.getElementById('youtubeSummaryResult');
            const youtubeActionButtons = document.getElementById('youtubeActionButtons');
            
            const url = youtubeUrlInput.value.trim();
            if (!url) {
                youtubeSummaryStatus.textContent = 'Please enter a valid YouTube URL';
                return;
            }

            youtubeSummaryStatus.textContent = 'Processing video...';
            youtubeSummaryResult.style.display = 'none';
            youtubeActionButtons.style.display = 'none';

            try {
                const response = await window.electronAPI.summariseYoutubeVideo(url, JSON.parse(localStorage.getItem('chatHistory') || '[]'));
                youtubeSummaryStatus.textContent = 'Video processed successfully!';
                const summaryElem = document.getElementById('summaryText');
                const transcriptElem = document.getElementById('transcriptText');
                if (summaryElem) summaryElem.textContent = response.summary;
                if (transcriptElem) transcriptElem.textContent = response.transcript;
                youtubeSummaryResult.style.display = 'block';
                youtubeActionButtons.style.display = 'flex';

                // Update session cost with YouTube processing costs using localStorage
                const youtubeCost = parseFloat(response.costs.total);
                if (!isNaN(youtubeCost)) {
                    updateSessionCostDisplay(youtubeCost);
                }
            } catch (error) {
                console.error('Error processing YouTube video:', error);
                youtubeSummaryStatus.textContent = 'Error processing video. Please try again.';
            }
        });
    }

    // Handle sending YouTube content to chat
    if (document.getElementById('sendSummaryToChat')) {
        document.getElementById('sendSummaryToChat').addEventListener('click', () => {
            const summaryElem = document.getElementById('summaryText');
            if (summaryElem) {
                const summaryText = summaryElem.textContent;
                window.addMessage(summaryText, true);
            }
            document.getElementById('quickActionModal').style.display = 'none';
        });
    }

    if (document.getElementById('sendTranscriptToChat')) {
        document.getElementById('sendTranscriptToChat').addEventListener('click', () => {
            const transcriptElem = document.getElementById('transcriptText');
            if (transcriptElem) {
                const transcriptText = transcriptElem.textContent;
                window.addMessage(transcriptText, true);
            }
            document.getElementById('quickActionModal').style.display = 'none';
        });
    }

    if (document.getElementById('sendBothToChat')) {
        document.getElementById('sendBothToChat').addEventListener('click', () => {
            const summaryElem = document.getElementById('summaryText');
            const transcriptElem = document.getElementById('transcriptText');
            const summaryText = summaryElem ? summaryElem.textContent : '';
            const transcriptText = transcriptElem ? transcriptElem.textContent : '';
            window.addMessage(`Summary:\n${summaryText}\n\nFull Transcript:\n${transcriptText}`, true);
            document.getElementById('quickActionModal').style.display = 'none';
        });
    }

    // Advanced image analysis modal state
    let currentImageAnalysis = {
        file: null,
        history: []
    };

    // Handle image file selection and open image analysis modal
    let fileInput = document.getElementById('imageUpload');
    if (!fileInput) {
        fileInput = document.createElement('input');
        fileInput.type = 'file';
        fileInput.accept = 'image/*';
        fileInput.id = 'imageUpload';
        fileInput.style.display = 'none';
        document.body.appendChild(fileInput);
    }
    if (fileInput) fileInput.addEventListener('change', function(event) {
        const file = event.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = function(e) {
                // Store image for modal use
                currentImageAnalysis.file = {
                    name: file.name,
                    data: (() => {
                        const base64Data = e.target.result.split(',')[1];
                        const byteCharacters = atob(base64Data);
                        const byteNumbers = new Array(byteCharacters.length);
                        for (let i = 0; i < byteCharacters.length; i++) {
                            byteNumbers[i] = byteCharacters.charCodeAt(i);
                        }
                        return new Uint8Array(byteNumbers);
                    })(),
                    base64: e.target.result
                };
                currentImageAnalysis.history = [];
                // Show modal
                showImageAnalysisModal();
            };
            reader.readAsDataURL(file);
        }
    });

    if (document.getElementById('fileButton')) {
        document.getElementById('fileButton').addEventListener('click', () => {
            const fileInput = document.getElementById('documentUpload');
            if (fileInput) {
                fileInput.click();
            }
        });
        
        // Trigger the hidden file input for document upload
        let fileInput = document.getElementById('documentUpload');
        if (!fileInput) {
            fileInput = document.createElement('input');
            fileInput.type = 'file';
            fileInput.accept = '.pdf,.txt,.doc,.docx,.xls,.xlsx';
            fileInput.id = 'documentUpload';
            fileInput.multiple = true;
            fileInput.style.display = 'none';
            document.body.appendChild(fileInput);
        }
        
        fileInput.addEventListener('change', function(event) {
            const files = Array.from(event.target.files);
            if (files.length === 0) return;
            
            // Process each file
            files.forEach(async (file, index) => {
                const reader = new FileReader();
                reader.onload = async function(e) {
                    try {
                        // Store file for analysis (FIX: use currentDocumentAnalysis)
                        currentDocumentAnalysis.file = {
                            name: file.name,
                            data: (() => {
                                const base64Data = e.target.result.split(',')[1];
                                const byteCharacters = atob(base64Data);
                                const byteNumbers = new Array(byteCharacters.length);
                                for (let i = 0; i < byteCharacters.length; i++) {
                                    byteNumbers[i] = byteCharacters.charCodeAt(i);
                                }
                                return new Uint8Array(byteNumbers);
                            })()
                        };
                        currentDocumentAnalysis.history = [];
                        
                        // Show analysis modal
                        showDocumentAnalysisModal();
                    } catch (err) {
                        console.error('Document processing error:', err);
                        const errorDiv = document.createElement('div');
                        errorDiv.className = 'message assistant error-message';
                        errorDiv.textContent = `Error processing ${file.name}: ${err.message}`;
                        chatContainer.appendChild(errorDiv);
                        chatContainer.scrollTop = chatContainer.scrollHeight;
                    }
                };
                reader.readAsDataURL(file);
            });
        });
    }

    // Document analysis state
    let currentDocumentAnalysis = {
        file: null,
        history: []
    };

    // Show document analysis modal
    function showDocumentAnalysisModal() {
        const modal = document.getElementById('documentAnalysisModal');
        const documentName = document.getElementById('documentName');
        const documentType = document.getElementById('documentType');
        const historyDiv = document.getElementById('documentAnalysisHistory');
        
        if (currentDocumentAnalysis.file) {
            documentName.textContent = currentDocumentAnalysis.file.name;
            documentType.textContent = `Type: ${currentDocumentAnalysis.file.name.split('.').pop().toUpperCase()}`;
        }
        
        // Clear and rebuild history
        historyDiv.innerHTML = '';
        currentDocumentAnalysis.history.forEach(item => {
            const messageDiv = document.createElement('div');
            messageDiv.style.marginBottom = '8px';
            messageDiv.style.padding = '8px';
            messageDiv.style.borderRadius = '4px';
            messageDiv.style.backgroundColor = item.role === 'user' ? '#e3f2fd' : '#f5f5f5';
            messageDiv.textContent = item.content;
            historyDiv.appendChild(messageDiv);
        });
        
        modal.style.display = 'flex';
    }

    // Close document analysis modal
    document.getElementById('closeDocumentAnalysisModal').addEventListener('click', () => {
        document.getElementById('documentAnalysisModal').style.display = 'none';
    });

    // Handle document analysis input
    document.getElementById('documentAnalysisSendBtn').addEventListener('click', async () => {
        const input = document.getElementById('documentAnalysisInput');
        const question = input.value.trim();
        if (!question || !currentDocumentAnalysis.file) return;
        
        // Add user question to history
        currentDocumentAnalysis.history.push({ role: 'user', content: question });
        showDocumentAnalysisModal();
        input.value = '';
        
        try {
            // Show loading message
            const loadingDiv = document.createElement('div');
            loadingDiv.className = 'message assistant';
            loadingDiv.textContent = 'Analyzing document...';
            document.getElementById('documentAnalysisHistory').appendChild(loadingDiv);
            
            // Process the document with the question
            const result = await window.electronAPI.processDocument(
                currentDocumentAnalysis.file.name,
                currentDocumentAnalysis.file.data,
                question,
                JSON.parse(localStorage.getItem('chatHistory') || '[]')
            );
            
            // Remove loading message
            loadingDiv.remove();
            
            // Add AI response to history
            currentDocumentAnalysis.history.push({ role: 'assistant', content: result.analysis });
            
            // Update cost display
            if (result.cost) {
                updateSessionCostDisplay(result.cost);
            }
            
            // Enable Send to Chat button
            const toChatBtn = document.getElementById('documentAnalysisToChatBtn');
            toChatBtn.style.background = '#4caf50';
            toChatBtn.style.cursor = 'pointer';
            toChatBtn.disabled = false;
            
            // Update modal with new history
            showDocumentAnalysisModal();
        } catch (error) {
            console.error('Document analysis error:', error);
            const errorDiv = document.createElement('div');
            errorDiv.className = 'message assistant error-message';
            errorDiv.textContent = `Error analyzing document: ${error.message}`;
            document.getElementById('documentAnalysisHistory').appendChild(errorDiv);
        }
    });

    // Handle sending document analysis to chat
    document.getElementById('documentAnalysisToChatBtn').addEventListener('click', () => {
        if (!currentDocumentAnalysis.history || currentDocumentAnalysis.history.length === 0) return;

        // Create a formatted message with the document name and analysis history
        let formattedMessage = `Document Analysis for "${currentDocumentAnalysis.file.name}":\n\n`;
        currentDocumentAnalysis.history.forEach((entry, index) => {
            formattedMessage += `${entry.role === 'user' ? 'Q' : 'A'}: ${entry.content}\n\n`;
        });

        // Add the message to the chat
        addMessage(formattedMessage, 'assistant');

        // Close the document analysis modal
        document.getElementById('documentAnalysisModal').style.display = 'none';
    });

    // Show image analysis modal
    function showImageAnalysisModal() {
        const modal = document.getElementById('imageAnalysisModal');
        const previewDiv = document.getElementById('imageAnalysisPreview');
        const historyDiv = document.getElementById('imageAnalysisHistory');
        
        if (currentImageAnalysis.file) {
            // Create and display image preview
            const img = document.createElement('img');
            img.src = currentImageAnalysis.file.base64;
            img.style.maxWidth = '100%';
            img.style.maxHeight = '200px';
            img.style.borderRadius = '8px';
            previewDiv.innerHTML = '';
            previewDiv.appendChild(img);
        }
        
        // Clear and rebuild history
        historyDiv.innerHTML = '';
        currentImageAnalysis.history.forEach(item => {
            const messageDiv = document.createElement('div');
            messageDiv.style.marginBottom = '8px';
            messageDiv.style.padding = '8px';
            messageDiv.style.borderRadius = '4px';
            messageDiv.style.backgroundColor = item.role === 'user' ? '#e3f2fd' : '#f5f5f5';
            messageDiv.textContent = item.content;
            historyDiv.appendChild(messageDiv);
        });
        
        // Reset Send to Chat button
        const toChatBtn = document.getElementById('imageAnalysisToChatBtn');
        toChatBtn.style.background = '#ccc';
        toChatBtn.style.cursor = 'not-allowed';
        toChatBtn.disabled = true;
        
        modal.style.display = 'flex';
    }

    // Close image analysis modal
    document.getElementById('closeImageAnalysisModal').addEventListener('click', () => {
        document.getElementById('imageAnalysisModal').style.display = 'none';
    });

    // Handle image analysis input
    document.getElementById('imageAnalysisSendBtn').addEventListener('click', async () => {
        const input = document.getElementById('imageAnalysisInput');
        const question = input.value.trim();
        if (!question || !currentImageAnalysis.file) return;
        
        // Add user question to history
        currentImageAnalysis.history.push({ role: 'user', content: question });
        showImageAnalysisModal();
        input.value = '';
        
        try {
            // Show loading message
            const loadingDiv = document.createElement('div');
            loadingDiv.className = 'message assistant';
            loadingDiv.textContent = 'Analyzing image...';
            document.getElementById('imageAnalysisHistory').appendChild(loadingDiv);
            
            // Process the image with the question
            const result = await window.electronAPI.analyzeImage(
                currentImageAnalysis.file.name,
                currentImageAnalysis.file.data,
                question,
                JSON.parse(localStorage.getItem('chatHistory') || '[]')
            );
            
            // Remove loading message
            loadingDiv.remove();
            
            // Add AI response to history
            currentImageAnalysis.history.push({ role: 'assistant', content: result.analysis });
            
            // Update cost display
            if (result.cost) {
                updateSessionCostDisplay(result.cost);
            }
            
            // Enable Send to Chat button
            const toChatBtn = document.getElementById('imageAnalysisToChatBtn');
            toChatBtn.style.background = '#4caf50';
            toChatBtn.style.cursor = 'pointer';
            toChatBtn.disabled = false;
            
            // Update modal with new history
            showImageAnalysisModal();
        } catch (error) {
            console.error('Image analysis error:', error);
            const errorDiv = document.createElement('div');
            errorDiv.className = 'message assistant error-message';
            errorDiv.textContent = `Error analyzing image: ${error.message}`;
            document.getElementById('imageAnalysisHistory').appendChild(errorDiv);
        }
    });

    // Handle sending image analysis to chat
    document.getElementById('imageAnalysisToChatBtn').addEventListener('click', () => {
        if (!currentImageAnalysis.history || currentImageAnalysis.history.length === 0) return;

        // Create a formatted message with the image name and analysis history
        let formattedMessage = `Image Analysis for "${currentImageAnalysis.file.name}":\n\n`;
        currentImageAnalysis.history.forEach((entry, index) => {
            formattedMessage += `${entry.role === 'user' ? 'Q' : 'A'}: ${entry.content}\n\n`;
        });

        // Add the message to the chat
        addMessage(formattedMessage, 'assistant');

        // Close the image analysis modal
        document.getElementById('imageAnalysisModal').style.display = 'none';
    });

    // Handle top bar buttons
    if (document.getElementById('backButton')) {
        document.getElementById('backButton').addEventListener('click', () => {
            window.location.href = 'index.html';
        });
    }

    if (document.getElementById('clearChat')) {
        document.getElementById('clearChat').addEventListener('click', () => {
            chatContainer.innerHTML = '';
            localStorage.removeItem('chatHistory');
            window.currentImageData = undefined;
            window.addMessage('Hello! I\'m your Family AI Assistant. How can I help you today?');
        });
    }

    if (document.getElementById('exportChat')) {
        document.getElementById('exportChat').addEventListener('click', async () => {
            const messages = Array.from(chatContainer.children).map(msg => {
                const isUser = msg.classList.contains('user');
                return `${isUser ? 'User' : 'Assistant'}: ${msg.textContent}`;
            }).join('\n\n');

            const blob = new Blob([messages], { type: 'text/plain' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `chat-export-${new Date().toISOString().split('T')[0]}.txt`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
        });
    }

    if (document.getElementById('summariseChat')) {
        document.getElementById('summariseChat').addEventListener('click', async () => {
            const messages = Array.from(chatContainer.children).map(msg => {
                const isUser = msg.classList.contains('user');
                return {
                    type: isUser ? 'user' : 'assistant',
                    content: msg.textContent
                };
            });

            try {
                const summary = await window.electronAPI.summarizeChat(messages);
                const summaryModal = document.getElementById('summaryModal');
                const summaryContent = document.getElementById('summaryContent');
                summaryContent.textContent = summary;
                summaryModal.style.display = 'flex';
            } catch (error) {
                console.error('Error summarizing chat:', error);
                window.addMessage('Sorry, there was an error summarizing the chat.', false);
            }
        });
    }

    if (document.getElementById('resetUI')) {
        document.getElementById('resetUI').addEventListener('click', () => {
            // Reset the UI state
            chatContainer.innerHTML = '';
            messageInput.value = '';
            window.addMessage('Hello! I\'m your Family AI Assistant. How can I help you today?');
            updateSessionCostDisplay(0);
            localStorage.setItem('sessionCost', 0);
        });
    }

    if (document.getElementById('debugButton')) {
        document.getElementById('debugButton').addEventListener('click', () => {
            const debugOutput = document.getElementById('debugOutput');
            debugOutput.style.display = debugOutput.style.display === 'none' ? 'block' : 'none';
            
            if (debugOutput.style.display === 'block') {
                const debugInfo = {
                    selectedModel,
                    chatMessages: Array.from(chatContainer.children).length,
                    inputValue: messageInput.value,
                    windowSize: {
                        width: window.innerWidth,
                        height: window.innerHeight
                    }
                };
                debugOutput.textContent = JSON.stringify(debugInfo, null, 2);
            }
        });
    }

    // Close summary modal
    if (document.getElementById('closeSummaryModal')) {
        document.getElementById('closeSummaryModal').addEventListener('click', () => {
            document.getElementById('summaryModal').style.display = 'none';
        });
    }

    // Commit memory button
    if (document.getElementById('commitMemoryButton')) {
        document.getElementById('commitMemoryButton').addEventListener('click', async () => {
            const summaryContent = document.getElementById('summaryContent').textContent;
            const commitStatus = document.getElementById('commitMemoryStatus');
            
            try {
                await window.electronAPI.storeSet(`memory-${userData.email}`, summaryContent);
                commitStatus.style.display = 'block';
                setTimeout(() => {
                    commitStatus.style.display = 'none';
                }, 3000);
            } catch (error) {
                console.error('Error committing to memory:', error);
                window.addMessage('Sorry, there was an error committing the summary to memory.', false);
            }
        });
    }

    // Utility: Build prompt with web search results
    function buildWebSearchPrompt(userQuery, searchResults) {
        let context = searchResults.map(
            (r, i) => `Result ${i+1}:\nTitle: ${r.title}\nSnippet: ${r.snippet}`
        ).join('\n\n');
        return `You are an assistant with access to real-time web search.\n\nUser query: "${userQuery}"\n\nHere are the top web results:\n${context}\n\nUsing these, answer the user's question as helpfully as possible.`;
    }

    // Web Search button handler
    const webSearchButton = document.getElementById('webSearchButton');
    if (webSearchButton) {
        webSearchButton.addEventListener('click', async () => {
            const userQuery = messageInput.value.trim();
            if (!userQuery) {
                alert('Please enter a search query');
                return;
            }
            
            window.addMessage(userQuery, true);
            messageInput.value = '';
            
            // Show interim message
            const interimDiv = document.createElement('div');
            interimDiv.className = 'message assistant';
            interimDiv.textContent = 'Searching the web...';
            chatContainer.appendChild(interimDiv);
            chatContainer.scrollTop = chatContainer.scrollHeight;
            
            try {
                const results = await window.electronAPI.webSearch(userQuery, JSON.parse(localStorage.getItem('chatHistory') || '[]'));
                if (!results || results.length === 0) {
                    throw new Error('No results found');
                }
                
                const prompt = buildWebSearchPrompt(userQuery, results);
                const chatHistory = JSON.parse(localStorage.getItem('chatHistory') || '[]');
                const response = await window.electronAPI.chatMessage(prompt, selectedModel, 0.7, chatHistory);
                
                if (typeof response === 'object' && response !== null && response.message) {
                    interimDiv.textContent = response.message;
                } else {
                    interimDiv.textContent = response;
                }
                updateSessionCostDisplay(response.cost || 0);
            } catch (err) {
                console.error('Web search error:', err);
                interimDiv.textContent = `Web search failed: ${err.message}. Please check your SerpAPI key in the .env file.`;
            }
        });
    }

    // Image Creation Modal logic
    const imageCreationModal = document.getElementById('imageCreationModal');
    const imagePromptInput = document.getElementById('imagePromptInput');
    const imagePromptCancel = document.getElementById('imagePromptCancel');
    const imagePromptCreate = document.getElementById('imagePromptCreate');

    function openImageCreationModal() {
        if (imageCreationModal) {
            imageCreationModal.style.display = 'flex';
            if (imagePromptInput) {
                imagePromptInput.value = '';
                imagePromptInput.focus();
            }
        }
    }

    function closeImageCreationModal() {
        if (imageCreationModal) {
            imageCreationModal.style.display = 'none';
        }
    }

    // Handle image creation button click
    const imageCreationButton = document.getElementById('imageCreationButton');
    if (imageCreationButton) {
        imageCreationButton.addEventListener('click', (e) => {
            e.preventDefault();
            openImageCreationModal();
        });
    }

    if (imagePromptCancel) {
        imagePromptCancel.addEventListener('click', closeImageCreationModal);
    }

    if (imageCreationModal) {
        imageCreationModal.addEventListener('click', (e) => {
            if (e.target === imageCreationModal) {
                closeImageCreationModal();
            }
        });
    }

    // Handle image creation
    if (imagePromptCreate) {
        imagePromptCreate.addEventListener('click', async () => {
            const prompt = imagePromptInput.value.trim();
            if (!prompt) return;
            
            closeImageCreationModal();
            
            // Add user's prompt to chat
            window.addMessage(prompt, true);
            
            // Show loading message
            const loadingDiv = document.createElement('div');
            loadingDiv.className = 'message assistant';
            loadingDiv.textContent = 'Creating image...';
            chatContainer.appendChild(loadingDiv);
            chatContainer.scrollTop = chatContainer.scrollHeight;
            
            try {
                const chatHistory = JSON.parse(localStorage.getItem('chatHistory') || '[]');
                const result = await window.electronAPI.createImage(prompt, chatHistory);
                console.log('Image creation result:', result);
                
                if (result.error) {
                    loadingDiv.textContent = result.error;
                    return;
                }
                
                // Create image element
                const img = document.createElement('img');
                img.src = result.imageUrl;
                img.style.maxWidth = '100%';
                img.style.maxHeight = '400px';
                img.style.display = 'block';
                img.style.margin = '8px 0';
                img.style.borderRadius = '8px';
                
                // Replace loading message with image
                loadingDiv.innerHTML = '';
                loadingDiv.appendChild(img);
                
                // Add cost information
                const costDiv = document.createElement('div');
                costDiv.style.marginTop = '8px';
                costDiv.style.fontSize = '12px';
                costDiv.style.color = '#666';
                costDiv.textContent = `Cost: ${result.cost} AUD (Total: ${result.totalCost} AUD)`;
                loadingDiv.appendChild(costDiv);
                
                // Update session cost display
                if (result.cost) {
                    updateSessionCostDisplay(result.cost);
                }
            } catch (err) {
                console.error('Image creation error:', err);
                loadingDiv.textContent = 'Sorry, there was an error creating the image.';
            }
        });
    }

    // Initialize voice buttons and media recording setup
    const microphoneButton = document.getElementById('microphoneButton');
    const speakerButton = document.getElementById('speakerButton');
    let mediaRecorder;
    let audioChunks = [];
    let isRecording = false;
    let isSpeaking = false;

    // Setup voice input
    async function setupVoiceInput() {
        try {
            console.log('Requesting microphone access...');
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            console.log('Microphone access granted');
            
            mediaRecorder = new MediaRecorder(stream, {
                mimeType: 'audio/webm;codecs=opus'
            });
            console.log('MediaRecorder initialized');
            
            mediaRecorder.ondataavailable = (event) => {
                console.log('Audio data available:', event.data.size, 'bytes');
                audioChunks.push(event.data);
            };
            
            mediaRecorder.onstop = async () => {
                console.log('Recording stopped, processing audio...');
                const audioBlob = new Blob(audioChunks, { type: 'audio/webm;codecs=opus' });
                console.log('Audio blob created:', audioBlob.size, 'bytes');
                audioChunks = [];
                
                // Convert Blob to ArrayBuffer
                const arrayBuffer = await audioBlob.arrayBuffer();
                // Convert ArrayBuffer to Uint8Array
                const uint8Array = new Uint8Array(arrayBuffer);
                console.log('Audio data converted to Uint8Array:', uint8Array.length, 'bytes');
                
                try {
                    console.log('Sending audio for transcription...');
                    const chatHistory = JSON.parse(localStorage.getItem('chatHistory') || '[]');
                    const transcribedText = await window.electronAPI.transcribeAudio(uint8Array, chatHistory);
                    console.log('Transcription received:', transcribedText);
                    if (transcribedText) {
                        // Add VOICE_INPUT: prefix to indicate this was a voice input
                        sendMessage('VOICE_INPUT:' + transcribedText);
                    }
                } catch (error) {
                    console.error('Error transcribing audio:', error);
                    showError('Failed to transcribe audio. Please try again.');
                }
            };
        } catch (error) {
            console.error('Error accessing microphone:', error);
            showError('Microphone access denied. Please check your permissions.');
        }
    }

    // Handle microphone button click
    microphoneButton.addEventListener('click', async () => {
        if (!mediaRecorder) {
            await setupVoiceInput();
        }
        
        if (!isRecording) {
            // Start recording
            audioChunks = [];
            mediaRecorder.start();
            isRecording = true;
            microphoneButton.classList.add('recording');
        } else {
            // Stop recording
            mediaRecorder.stop();
            isRecording = false;
            microphoneButton.classList.remove('recording');
        }
    });

    // Add a showError function to display errors in the chat
    function showError(message) {
        window.addMessage(message, false, true);
    }

    // Handle speaker button click
    speakerButton.addEventListener('click', async () => {
        console.log('Speaker button clicked');
        
        if (isSpeaking) {
            console.log('Stopping current speech');
            window.speechSynthesis.cancel();
            isSpeaking = false;
            speakerButton.classList.remove('speaking');
            return;
        }
        
        // Get the last AI message
        const messages = document.querySelectorAll('.message.assistant');
        if (messages.length > 0) {
            const lastMessage = messages[messages.length - 1];
            const messageText = lastMessage.textContent;
            console.log('Found message to speak:', messageText);
            
            try {
                console.log('Requesting TTS for message...');
                const chatHistory = JSON.parse(localStorage.getItem('chatHistory') || '[]');
                const audioData = await window.electronAPI.textToSpeech(messageText, chatHistory);
                console.log('TTS audio data received:', audioData ? 'Yes' : 'No');
                
                if (audioData) {
                    console.log('Creating audio object...');
                    const audio = new Audio(URL.createObjectURL(new Blob([audioData], { type: 'audio/mpeg' })));
                    isSpeaking = true;
                    speakerButton.classList.add('speaking');
                    console.log('Playing audio...');
                    
                    audio.onended = () => {
                        console.log('Audio playback ended');
                        isSpeaking = false;
                        speakerButton.classList.remove('speaking');
                    };
                    
                    audio.play().catch(error => {
                        console.error('Error playing audio:', error);
                        isSpeaking = false;
                        speakerButton.classList.remove('speaking');
                        showError('Failed to play audio. Please try again.');
                    });
                }
            } catch (error) {
                console.error('Error with TTS:', error);
                showError('Failed to generate speech. Please try again.');
            }
        } else {
            console.log('No AI messages found to speak');
            showError('No message available to speak.');
        }
    });
});