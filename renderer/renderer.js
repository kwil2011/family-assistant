import { getProviders } from './models.js';

// Helper to check if a model is a vision model
function isVisionModel(modelId) {
  // OpenAI Vision
  if (modelId === 'gpt-4o' || modelId === 'gpt-4-vision-preview') return true;
  // Google Gemini Vision (add all that support vision)
  if (
    modelId.startsWith('gemini-1.5-pro') ||
    modelId.startsWith('gemini-1.5-flash') ||
    modelId.startsWith('gemini-2.0-flash') ||
    modelId.startsWith('gemini-2.5-pro') ||
    modelId.startsWith('gemini-2.5-flash')
  ) return true;
  return false;
}

async function main() {
    console.log('DOM Content Loaded - Initializing chat interface');
    try {
        // Check if user is logged in
        const userData = await window.electronAPI.storeGet('userData');
        console.log('User data loaded:', userData ? 'User logged in' : 'No user data');
        
        if (!userData || !userData.email) {
            console.log('No user data or email found, redirecting to index');
            window.location.href = 'index.html';
            return;
        }

        // Check if API key is set up
        const selectedProvider = userData.llmProvider || 'openai';
        console.log('Selected provider:', selectedProvider);
        
        if (!userData[`${selectedProvider}ApiKey`]) {
            console.log('No API key found, redirecting to account settings');
            window.location.href = 'account.html?setup=api';
            return;
        }

        // Initialize session cost
        let sessionCost = parseFloat(localStorage.getItem('sessionCost')) || 0;
        console.log('Initial session cost:', sessionCost);
        updateSessionCostDisplay(sessionCost);

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
        if (typeof selectedModel !== 'string') {
          if (Array.isArray(selectedModel)) selectedModel = selectedModel.join('');
          else if (selectedModel && selectedModel.toString) selectedModel = selectedModel.toString();
          else selectedModel = 'gpt-4o';
        }

        // Replace static PROVIDERS with dynamic fetch
        let providers = await getProviders();

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

        function getSelectedModels() {
            return JSON.parse(localStorage.getItem('selectedModels') || '{}');
        }

        function renderModelModal() {
            const providerTabsContainer = modelModal.querySelector('div[style*="gap:8px"]');
            const modelSections = Array.from(modelModal.querySelectorAll('.model-section'));
            // Remove all existing provider tabs and model sections
            providerTabsContainer.innerHTML = '';
            modelSections.forEach(section => section.remove());

            // Get admin-enabled models from localStorage
            const selectedModels = getSelectedModels();

            // Render provider tabs
            providers.forEach((provider, idx) => {
                const tab = document.createElement('button');
                tab.className = 'provider-tab' + (idx === 0 ? ' active' : '');
                tab.setAttribute('data-provider', provider.id);
                tab.textContent = provider.name;
                providerTabsContainer.appendChild(tab);
            });

            // Render model sections (show ONLY admin-enabled models for each provider)
            providers.forEach((provider, idx) => {
                const section = document.createElement('div');
                section.className = 'model-section';
                section.setAttribute('data-provider', provider.id);
                section.style.display = idx === 0 ? 'grid' : 'none';
                // Only show models enabled by admin
                const enabledModelIds = selectedModels[provider.id] || [];
                provider.models.filter(model => enabledModelIds.includes(model.id)).forEach(model => {
                    const card = document.createElement('div');
                    card.className = 'model-card';
                    card.setAttribute('data-model', model.id);
                    card.innerHTML = `
                        <b>${model.name}</b><br>
                        <ul>${model.features ? model.features.map(f => `<li>${f}</li>`).join('') : ''}</ul>
                        <div class="price">${model.price || ''}</div>
                    `;
                    section.appendChild(card);
                });
                modelModal.querySelector('div[style*="box-shadow"]').appendChild(section);
            });

            // Provider tab switching
            providerTabsContainer.querySelectorAll('.provider-tab').forEach(tab => {
                tab.addEventListener('click', (e) => {
                    e.stopPropagation();
                    const provider = tab.getAttribute('data-provider');
                    providerTabsContainer.querySelectorAll('.provider-tab').forEach(t => t.classList.remove('active'));
                    tab.classList.add('active');
                    modelModal.querySelectorAll('.model-section').forEach(section => {
                        section.style.display = section.getAttribute('data-provider') === provider ? 'grid' : 'none';
                    });
                });
            });

            // Model selection (update both selectedModel and llmProvider)
            modelModal.querySelectorAll('.model-card').forEach(card => {
                card.addEventListener('click', async (e) => {
                    e.stopPropagation();
                    const model = card.getAttribute('data-model');
                    const provider = card.closest('.model-section').getAttribute('data-provider');
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
                    selectedModel = String(model);
                    await window.electronAPI.storeSet('selectedModel', selectedModel);
                    await window.electronAPI.storeSet('selectedProvider', String(provider));
                    await window.electronAPI.storeSet('userData', { ...userData, llmProvider: provider });
                    updateModelButton();
                    modelModal.querySelectorAll('.model-card').forEach(c => c.classList.remove('selected'));
                    card.classList.add('selected');
                    modelModal.style.display = 'none';
                    if (!isVisionModel(model)) {
                        window.currentImageData = undefined;
                        window.addMessage('You are now in normal chat mode.');
                    }
                });
            });
        }

        // Call renderModelModal when opening the modal
        if (selectModelBtn) {
            selectModelBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                renderModelModal();
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
                const response = await window.electronAPI.chatMessage(actualContent, String(selectedModel), 0.7, chatHistory);
                
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
                if (!isVisionModel(selectedModel)) {
                    window.addMessage('Image analysis is only available for vision models (GPT-4o, GPT-4 Vision, Gemini 1.5 Pro). Please select a supported model.', false, true);
                    return;
                }
                let fileInput = document.getElementById('imageUpload');
                if (!fileInput) {
                    fileInput = document.createElement('input');
                    fileInput.type = 'file';
                    fileInput.accept = 'image/*';
                    fileInput.id = 'imageUpload';
                    fileInput.style.display = 'none';
                    document.body.appendChild(fileInput);
                }
                
                // Remove the old file input and create a new one
                if (fileInput.parentNode) {
                    fileInput.parentNode.removeChild(fileInput);
                }
                fileInput = document.createElement('input');
                fileInput.type = 'file';
                fileInput.accept = 'image/*';
                fileInput.id = 'imageUpload';
                fileInput.style.display = 'none';
                document.body.appendChild(fileInput);
                
                fileInput.addEventListener('change', function(event) {
                    const file = event.target.files[0];
                    if (file) {
                        const reader = new FileReader();
                        reader.onload = function(e) {
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
                            showImageAnalysisModal();
                        };
                        reader.readAsDataURL(file);
                    }
                });
                fileInput.click();
                quickActionsMenu.style.display = 'none';
            });
        }

        // Handle document upload button (now matches image upload behavior)
        if (document.getElementById('fileButton')) {
            document.getElementById('fileButton').addEventListener('click', () => {
                let fileInput = document.getElementById('documentUploadInput');
                if (!fileInput) {
                    fileInput = document.createElement('input');
                    fileInput.type = 'file';
                    fileInput.accept = '.pdf,.txt,.doc,.docx,.xls,.xlsx';
                    fileInput.id = 'documentUploadInput';
                    fileInput.style.display = 'none';
                    document.body.appendChild(fileInput);
                }
                // Remove the old file input and create a new one
                if (fileInput.parentNode) {
                    fileInput.parentNode.removeChild(fileInput);
                }
                fileInput = document.createElement('input');
                fileInput.type = 'file';
                fileInput.accept = '.pdf,.txt,.doc,.docx,.xls,.xlsx';
                fileInput.id = 'documentUploadInput';
                fileInput.style.display = 'none';
                document.body.appendChild(fileInput);
                fileInput.addEventListener('change', function(event) {
                    const file = event.target.files[0];
                    if (file) {
                        const reader = new FileReader();
                        reader.onload = function(e) {
                            currentDocumentAnalysis.file = file;
                            currentDocumentAnalysis.data = new Uint8Array(e.target.result);
                            currentDocumentAnalysis.history = [];
                            showDocumentAnalysisModal();
                        };
                        reader.readAsArrayBuffer(file);
                    }
                });
                fileInput.click();
                quickActionsMenu.style.display = 'none';
            });
        }

        // Show document upload modal when 'Upload File' is clicked in quick actions
        // (Removed: now handled by direct file picker)
        // if (document.getElementById('fileButton')) {
        //     document.getElementById('fileButton').addEventListener('click', () => {
        //         const modal = document.getElementById('documentUploadModal');
        //         if (modal) modal.style.display = 'flex';
        //         // Reset status and input
        //         document.getElementById('documentUploadStatus').textContent = '';
        //         document.getElementById('documentUploadInput').value = '';
        //     });
        // }
        // Hide document upload modal on close
        // if (document.getElementById('closeDocumentUploadModal')) {
        //     document.getElementById('closeDocumentUploadModal').addEventListener('click', () => {
        //         document.getElementById('documentUploadModal').style.display = 'none';
        //     });
        // }
        // Document Analysis State
        let currentDocumentAnalysis = {
            file: null,
            data: null,
            history: [],
            isAnalyzing: false
        };

        // Show Document Analysis Modal (matching image modal logic)
        function showDocumentAnalysisModal() {
            const modal = document.getElementById('documentAnalysisModal');
            const documentName = document.getElementById('documentName');
            const documentType = document.getElementById('documentType');
            const historyDiv = document.getElementById('documentAnalysisHistory');
            const toChatBtn = document.getElementById('documentAnalysisToChatBtn');
            const clearBtn = document.getElementById('documentAnalysisClearBtn');

            // Set file info
            if (currentDocumentAnalysis.file) {
                documentName.textContent = currentDocumentAnalysis.file.name;
                documentType.textContent = `Type: ${currentDocumentAnalysis.file.name.split('.').pop().toUpperCase()}`;
            } else {
                documentName.textContent = '';
                documentType.textContent = '';
            }

            // Render history
            historyDiv.innerHTML = '';
            currentDocumentAnalysis.history.forEach(item => {
                const div = document.createElement('div');
                div.style.marginBottom = '8px';
                div.style.padding = '8px';
                div.style.borderRadius = '4px';
                div.style.backgroundColor = item.type === 'user' ? '#e3f2fd' : '#f5f5f5';
                const label = document.createElement('div');
                label.style.fontWeight = 'bold';
                label.style.marginBottom = '4px';
                label.textContent = item.type === 'user' ? 'You: ' + item.text : 'Assistant: ' + item.text;
                div.appendChild(label);
                historyDiv.appendChild(div);
            });

            // Enable/disable buttons
            toChatBtn.disabled = currentDocumentAnalysis.history.length === 0;
            clearBtn.disabled = currentDocumentAnalysis.history.length === 0;

            // Show modal
            modal.style.display = 'flex';
            document.getElementById('documentAnalysisInput').focus();
        }

        // Hide Document Analysis Modal
        document.getElementById('closeDocumentAnalysisModal').addEventListener('click', () => {
            document.getElementById('documentAnalysisModal').style.display = 'none';
        });

        // Document upload and analysis logic
        const documentUploadInput = document.getElementById('documentUploadInput');
        const documentUploadBtn = document.getElementById('documentUploadBtn');
        const documentUploadStatus = document.getElementById('documentUploadStatus');

        documentUploadBtn.addEventListener('click', () => {
            if (!documentUploadInput.files || documentUploadInput.files.length === 0) {
                documentUploadStatus.textContent = 'Please select a document file.';
                return;
            }
            const file = documentUploadInput.files[0];
            documentUploadStatus.textContent = 'Reading file...';
            const reader = new FileReader();
            reader.onload = function(e) {
                const arrayBuffer = e.target.result;
                currentDocumentAnalysis.file = file;
                currentDocumentAnalysis.data = new Uint8Array(arrayBuffer);
                currentDocumentAnalysis.history = [];
                documentUploadStatus.textContent = `Loaded: ${file.name}`;
                document.getElementById('documentUploadModal').style.display = 'none';
                showDocumentAnalysisModal();
            };
            reader.onerror = function() {
                documentUploadStatus.textContent = 'Error reading file.';
            };
            reader.readAsArrayBuffer(file);
        });

        // Handle document analysis question
        document.getElementById('documentAnalysisSendBtn').addEventListener('click', async () => {
            const input = document.getElementById('documentAnalysisInput');
            const question = input.value.trim();
            if (!question || !currentDocumentAnalysis.file || !currentDocumentAnalysis.data) {
                return;
            }
            // Add user question to history
            currentDocumentAnalysis.history.push({ type: 'user', text: question });
            showDocumentAnalysisModal();
            input.value = '';
            // Show loading
            currentDocumentAnalysis.isAnalyzing = true;
            const historyDiv = document.getElementById('documentAnalysisHistory');
            const loadingDiv = document.createElement('div');
            loadingDiv.className = 'message assistant';
            loadingDiv.textContent = 'Analyzing document...';
            historyDiv.appendChild(loadingDiv);
            try {
                const result = await window.electronAPI.processDocument(
                    currentDocumentAnalysis.file.name,
                    currentDocumentAnalysis.data,
                    question,
                    currentDocumentAnalysis.history
                );
                loadingDiv.remove();
                currentDocumentAnalysis.history.push({ type: 'assistant', text: result.analysis });
                showDocumentAnalysisModal();
            } catch (err) {
                loadingDiv.remove();
                currentDocumentAnalysis.history.push({ type: 'assistant', text: 'Error: ' + (err.message || err) });
                showDocumentAnalysisModal();
            } finally {
                currentDocumentAnalysis.isAnalyzing = false;
            }
        });

        // Send Document Analysis to Chat
        document.getElementById('documentAnalysisToChatBtn').addEventListener('click', () => {
            if (!currentDocumentAnalysis.history.length) return;
            const lastResponse = currentDocumentAnalysis.history[currentDocumentAnalysis.history.length - 1];
            if (lastResponse.type === 'assistant') {
                window.addMessage(`[Document Analysis]\n${lastResponse.text}`, true);
                document.getElementById('documentAnalysisModal').style.display = 'none';
            }
        });

        // Clear Document Analysis History
        document.getElementById('documentAnalysisClearBtn').addEventListener('click', () => {
            currentDocumentAnalysis.history = [];
            showDocumentAnalysisModal();
        });

        // Image Analysis State
        let currentImageAnalysis = {
            file: null,
            history: [],
            isAnalyzing: false
        };

        // Show Image Analysis Modal
        function showImageAnalysisModal() {
            const modal = document.getElementById('imageAnalysisModal');
            const preview = document.getElementById('previewImage');
            const history = document.getElementById('imageAnalysisHistory');
            const input = document.getElementById('imageAnalysisInput');
            const sendBtn = document.getElementById('imageAnalysisSendBtn');
            const toChatBtn = document.getElementById('imageAnalysisToChatBtn');
            const clearBtn = document.getElementById('imageAnalysisClearBtn');
            const loading = document.getElementById('imageAnalysisLoading');

            // Display the image
            if (currentImageAnalysis.file && currentImageAnalysis.file.base64) {
                preview.src = currentImageAnalysis.file.base64;
            }

            // Clear and populate history
            history.innerHTML = '';
            currentImageAnalysis.history.forEach(item => {
                const div = document.createElement('div');
                div.style.marginBottom = '8px';
                div.style.padding = '8px';
                div.style.borderRadius = '4px';
                div.style.backgroundColor = item.type === 'user' ? '#e3f2fd' : '#f5f5f5';
                
                const question = document.createElement('div');
                question.style.fontWeight = 'bold';
                question.style.marginBottom = '4px';
                question.textContent = item.type === 'user' ? 'You: ' + item.text : 'Assistant: ' + item.text;
                
                div.appendChild(question);
                history.appendChild(div);
            });

            // Enable/disable buttons based on state
            sendBtn.disabled = currentImageAnalysis.isAnalyzing;
            toChatBtn.disabled = currentImageAnalysis.history.length === 0;
            loading.style.display = currentImageAnalysis.isAnalyzing ? 'block' : 'none';

            // Show modal
            modal.style.display = 'flex';
            input.focus();
        }

        // Hide Image Analysis Modal
        function hideImageAnalysisModal() {
            const modal = document.getElementById('imageAnalysisModal');
            modal.style.display = 'none';
        }

        // Handle Image Analysis
        async function handleImageAnalysis() {
            if (!currentImageAnalysis.file || currentImageAnalysis.isAnalyzing) return;

            const input = document.getElementById('imageAnalysisInput');
            const prompt = input.value.trim();
            if (!prompt) return;

            const sendBtn = document.getElementById('imageAnalysisSendBtn');
            const loading = document.getElementById('imageAnalysisLoading');
            const toChatBtn = document.getElementById('imageAnalysisToChatBtn');

            try {
                // Add user question to history
                currentImageAnalysis.history.push({
                    type: 'user',
                    text: prompt
                });

                // Clear input and disable send button immediately
                input.value = '';
                sendBtn.disabled = true;

                // Show updated history
                showImageAnalysisModal();

                // Update UI state
                currentImageAnalysis.isAnalyzing = true;
                loading.style.display = 'block';

                // Send to main process
                const result = await window.electronAPI.analyzeImage(
                    currentImageAnalysis.file.name,
                    currentImageAnalysis.file.data,
                    prompt,
                    currentImageAnalysis.history
                );

                // Add response to history
                currentImageAnalysis.history.push({
                    type: 'assistant',
                    text: result.analysis
                });

                // Update UI
                showImageAnalysisModal();
            } catch (error) {
                console.error('Image analysis error:', error);
                alert(error.message || 'An error occurred while analyzing the image.');
            } finally {
                // Reset UI state
                currentImageAnalysis.isAnalyzing = false;
                sendBtn.disabled = false;
                loading.style.display = 'none';
                toChatBtn.disabled = currentImageAnalysis.history.length === 0;
            }
        }

        // Send Image Analysis to Chat
        function sendImageAnalysisToChat() {
            if (!currentImageAnalysis.history.length) return;

            const lastResponse = currentImageAnalysis.history[currentImageAnalysis.history.length - 1];
            if (lastResponse.type === 'assistant') {
                // Add image and analysis to chat
                const chatInput = document.getElementById('messageInput');
                const imagePreview = document.getElementById('previewImage');
                
                // Create message with image and analysis
                const message = `[Image Analysis]\n${lastResponse.text}`;
                chatInput.value = message;
                
                // Trigger send
                document.getElementById('sendButton').click();
                
                // Close modal
                hideImageAnalysisModal();
            }
        }

        // Clear Image Analysis History
        function clearImageAnalysisHistory() {
            currentImageAnalysis.history = [];
            showImageAnalysisModal();
        }

        // Image Analysis Event Listeners
        const imageUploadInput = document.getElementById('imageUpload');
        const imageAnalysisModal = document.getElementById('imageAnalysisModal');
        const closeImageAnalysisModal = document.getElementById('closeImageAnalysisModal');
        const imageAnalysisSendBtn = document.getElementById('imageAnalysisSendBtn');
        const imageAnalysisToChatBtn = document.getElementById('imageAnalysisToChatBtn');
        const imageAnalysisClearBtn = document.getElementById('imageAnalysisClearBtn');
        const imageAnalysisInput = document.getElementById('imageAnalysisInput');

        if (imageUploadInput) {
            imageUploadInput.addEventListener('change', function(event) {
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
        }

        if (closeImageAnalysisModal) {
            closeImageAnalysisModal.addEventListener('click', hideImageAnalysisModal);
        }

        if (imageAnalysisSendBtn) {
            imageAnalysisSendBtn.addEventListener('click', handleImageAnalysis);
        }

        if (imageAnalysisToChatBtn) {
            imageAnalysisToChatBtn.addEventListener('click', sendImageAnalysisToChat);
        }

        if (imageAnalysisClearBtn) {
            imageAnalysisClearBtn.addEventListener('click', clearImageAnalysisHistory);
        }

        if (imageAnalysisInput) {
            imageAnalysisInput.addEventListener('keypress', function(e) {
                if (e.key === 'Enter' && !currentImageAnalysis.isAnalyzing) {
                    handleImageAnalysis();
                }
            });
        }

        if (imageAnalysisModal) {
            imageAnalysisModal.addEventListener('click', function(e) {
                if (e.target === imageAnalysisModal) {
                    hideImageAnalysisModal();
                }
            });
        }

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
            const organicResults = searchResults.organic_results || [];
            let context = organicResults.map(
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
                    const organicResults = results.organic_results || [];
                    if (!organicResults || organicResults.length === 0) {
                        throw new Error('No results found');
                    }
                    
                    const prompt = buildWebSearchPrompt(userQuery, results);
                    const chatHistory = JSON.parse(localStorage.getItem('chatHistory') || '[]');
                    const response = await window.electronAPI.chatMessage(prompt, String(selectedModel), 0.7, chatHistory);
                    
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
        const imagePromptGemini = document.getElementById('imagePromptGemini');
        const imagePromptOpenAI = document.getElementById('imagePromptOpenAI');

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
        if (imagePromptGemini) {
            imagePromptGemini.addEventListener('click', async () => {
                const prompt = imagePromptInput.value.trim();
                if (!prompt) return;
                closeImageCreationModal();
                window.addMessage(prompt, true);
                const loadingDiv = document.createElement('div');
                loadingDiv.className = 'message assistant';
                loadingDiv.textContent = 'Creating image with Gemini...';
                chatContainer.appendChild(loadingDiv);
                chatContainer.scrollTop = chatContainer.scrollHeight;
                try {
                    const chatHistory = JSON.parse(localStorage.getItem('chatHistory') || '[]');
                    const result = await window.electronAPI.createImage(prompt, chatHistory, 'imagen-3.0-generate-002');
                    if (result.error) {
                        loadingDiv.textContent = result.error;
                        return;
                    }
                    const img = document.createElement('img');
                    img.src = result.imageUrl;
                    img.style.maxWidth = '100%';
                    img.style.maxHeight = '400px';
                    img.style.display = 'block';
                    img.style.margin = '8px 0';
                    img.style.borderRadius = '8px';
                    loadingDiv.innerHTML = '';
                    loadingDiv.appendChild(img);
                    const costDiv = document.createElement('div');
                    costDiv.style.marginTop = '8px';
                    costDiv.style.fontSize = '12px';
                    costDiv.style.color = '#666';
                    costDiv.textContent = `Cost: ${result.cost} AUD (Total: ${result.totalCost} AUD)`;
                    loadingDiv.appendChild(costDiv);
                    if (result.cost) {
                        updateSessionCostDisplay(result.cost);
                    }
                } catch (err) {
                    console.error('Image creation error:', err);
                    loadingDiv.textContent = 'Sorry, there was an error creating the image.';
                }
            });
        }

        if (imagePromptOpenAI) {
            imagePromptOpenAI.addEventListener('click', async () => {
                const prompt = imagePromptInput.value.trim();
                if (!prompt) return;
                closeImageCreationModal();
                window.addMessage(prompt, true);
                const loadingDiv = document.createElement('div');
                loadingDiv.className = 'message assistant';
                loadingDiv.textContent = 'Creating image with OpenAI...';
                chatContainer.appendChild(loadingDiv);
                chatContainer.scrollTop = chatContainer.scrollHeight;
                try {
                    const chatHistory = JSON.parse(localStorage.getItem('chatHistory') || '[]');
                    const result = await window.electronAPI.createImage(prompt, chatHistory, 'dall-e-3');
                    if (result.error) {
                        loadingDiv.textContent = result.error;
                        return;
                    }
                    const img = document.createElement('img');
                    img.src = result.imageUrl;
                    img.style.maxWidth = '100%';
                    img.style.maxHeight = '400px';
                    img.style.display = 'block';
                    img.style.margin = '8px 0';
                    img.style.borderRadius = '8px';
                    loadingDiv.innerHTML = '';
                    loadingDiv.appendChild(img);
                    const costDiv = document.createElement('div');
                    costDiv.style.marginTop = '8px';
                    costDiv.style.fontSize = '12px';
                    costDiv.style.color = '#666';
                    costDiv.textContent = `Cost: ${result.cost} AUD (Total: ${result.totalCost} AUD)`;
                    loadingDiv.appendChild(costDiv);
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
    } catch (error) {
        console.error('Error initializing chat interface:', error);
        showError('Sorry, there was an error initializing the chat interface. Please try again later.');
    }
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', main);
} else {
  main();
}