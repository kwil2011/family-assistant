const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const { sendRecoveryCode, resetPassword } = require('./password-recovery');

// Add IPC handlers for password recovery
ipcMain.handle('sendRecoveryCode', async (event, email) => {
    try {
        await sendRecoveryCode(email);
        return { success: true };
    } catch (error) {
        console.error('Error sending recovery code:', error);
        throw error;
    }
});

ipcMain.handle('resetAdminPassword', async (event, { email, recoveryCode, newPassword }) => {
    try {
        await resetPassword(email, recoveryCode, newPassword);
        return { success: true };
    } catch (error) {
        console.error('Error resetting password:', error);
        throw error;
    }
});

// Model configurations with dynamic exchange rate
const MODEL_CONFIGS = {
    // OpenAI Models
    'gpt-3.5-turbo': {
        provider: 'openai',
        maxTokens: 4096,
        temperature: 0.7,
        pricePerTokenUSD: 0.000002,
        description: 'Fast and efficient for most tasks'
    },
    'gpt-4': {
        provider: 'openai',
        maxTokens: 8192,
        temperature: 0.7,
        pricePerTokenUSD: 0.00003,
        description: 'Most capable model, best for complex tasks'
    },
    'gpt-4-turbo': {
        provider: 'openai',
        maxTokens: 128000,
        temperature: 0.7,
        pricePerTokenUSD: 0.00001,
        description: 'Latest GPT-4 model with improved capabilities'
    },
    'gpt-4o': {
        provider: 'openai',
        maxTokens: 8000,
        temperature: 0.3,
        pricePerTokenUSD: 0.005 / 1000,
        description: 'OpenAI\'s audio model',
        type: 'audio'
    },
    'whisper-1': {
        provider: 'openai',
        maxTokens: 0,
        temperature: 0.3,
        pricePerTokenUSD: 0.006 / 60,
        description: 'OpenAI\'s speech recognition model',
        type: 'audio'
    },
    'tts-1': {
        provider: 'openai',
        maxTokens: 0,
        temperature: 0.3,
        pricePerTokenUSD: 0.015 / 1000,
        description: 'OpenAI\'s text-to-speech model',
        type: 'audio'
    },
    'dall-e-3': {
        provider: 'openai',
        maxTokens: 0,
        temperature: 0.3,
        pricePerTokenUSD: 0.04,
        description: 'OpenAI\'s image generation model',
        type: 'image'
    },
    
    // Google Models
    'gemini-pro': {
        provider: 'google',
        maxTokens: 32768,
        temperature: 0.7,
        pricePerTokenUSD: 0.000001,
        description: 'Google\'s advanced language model'
    },
    'gemini-pro-vision': {
        provider: 'google',
        maxTokens: 32768,
        temperature: 0.7,
        pricePerTokenUSD: 0.000001,
        description: 'Google\'s vision-language model'
    },
    'gemini-1.5-flash-latest': {
        provider: 'google',
        maxTokens: 4000,
        temperature: 0.3,
        pricePerTokenUSD: 0.001 / 1000,
        description: 'Google\'s fast language model'
    },
    'gemini-2.5-pro-preview-05-06': {
        provider: 'google',
        maxTokens: 8000,
        temperature: 0.3,
        pricePerTokenUSD: 0.002 / 1000,
        description: 'Google\'s multimodal model',
        type: 'multimodal'
    },
    'veo-2.0-generate-001': {
        provider: 'google',
        maxTokens: 0,
        temperature: 0.3,
        pricePerTokenUSD: 0.02,
        description: 'Google\'s video generation model',
        type: 'video'
    },
    'imagen-3.0-generate-002': {
        provider: 'google',
        maxTokens: 0,
        temperature: 0.3,
        pricePerTokenUSD: 0.03,
        description: 'Google\'s image generation model',
        type: 'image'
    },
    'gemini-2.5-flash-preview-tts': {
        provider: 'google',
        maxTokens: 0,
        temperature: 0.3,
        pricePerTokenUSD: 0.015 / 1000,
        description: 'Google\'s text-to-speech model',
        type: 'audio'
    },
    'gemini-2.5-flash-live-001': {
        provider: 'google',
        maxTokens: 0,
        temperature: 0.3,
        pricePerTokenUSD: 0.02 / 1000,
        description: 'Google\'s live audio model',
        type: 'audio'
    }
};

const preloadPath = path.join(__dirname, '..', 'preload.js');

ipcMain.handle('create-image', async (event, prompt, chatHistory, model) => {
    // Ensure model is a string
    if (typeof model !== 'string') {
        console.warn('Image model name is not a string, converting:', model);
        model = String(model || '');
        console.log('Converted image model name:', model);
    }
    
    try {
        const userData = store.get('userData');
        // Use selectedProvider based on model if possible
        let selectedProvider = 'openai';
        if (model && MODEL_CONFIGS[model] && MODEL_CONFIGS[model].provider) {
            selectedProvider = MODEL_CONFIGS[model].provider;
        } else {
            selectedProvider = store.get('selectedProvider') || 'openai';
        }
        if (!userData || !userData[`${selectedProvider}ApiKey`]) {
            throw new Error(`${selectedProvider.charAt(0).toUpperCase() + selectedProvider.slice(1)} API key not found. Please set your API key in preferences.`);
        }
        let imageUrl = null;
        let cost = 0;
        let response = null;
        let fullPrompt = prompt;
        if (chatHistory && Array.isArray(chatHistory) && chatHistory.length > 0) {
            const historyText = chatHistory.slice(-5).map(msg => `${msg.isUser ? 'User' : 'Assistant'}: ${msg.content}`).join('\n');
            fullPrompt = `Previous conversation:\n${historyText}\n\nUser request: ${prompt}`;
        }
        if (model === 'dall-e-3' || (!model && selectedProvider === 'openai')) {
            // OpenAI DALL-E
            const OpenAI = require('openai');
            const openai = new OpenAI({ apiKey: userData['openaiApiKey'] });
            response = await openai.images.generate({
                model: 'dall-e-3',
                prompt: fullPrompt,
                n: 1,
                size: '1024x1024',
                quality: 'standard',
                style: 'natural'
            });
            imageUrl = response.data[0].url;
            cost = 0.04 * await getPriceInAUD(0.04);
        } else if (model === 'imagen-3.0-generate-002') {
            // Google Imagen (real call)
            const { GoogleGenerativeAI } = require('@google/generative-ai');
            const genAI = new GoogleGenerativeAI(userData['googleApiKey']);
            const imagenModel = genAI.getGenerativeModel({ model: 'imagen-3.0-generate-002' });
            // Call the model to generate an image
            const result = await imagenModel.generateContent({ prompt: fullPrompt });
            // The SDK's response structure may vary; adjust as needed
            let url = null;
            if (result && result.response && result.response.candidates && result.response.candidates[0].content && result.response.candidates[0].content.parts) {
                // Try to find an image URL in the response
                const part = result.response.candidates[0].content.parts.find(p => p.inlineData && p.inlineData.mimeType && p.inlineData.data);
                if (part) {
                    // The data is likely a base64-encoded image
                    url = `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
                }
            }
            if (!url) {
                throw new Error('No image returned from Google Imagen.');
            }
            imageUrl = url;
            cost = 0.03 * await getPriceInAUD(0.03);
        } else {
            throw new Error(`Unsupported image model: ${model}`);
        }
        const currentCost = store.get(`totalCost-${userData.email}`) || 0;
        store.set(`totalCost-${userData.email}`, currentCost + cost);
        return {
            imageUrl,
            cost: cost.toFixed(6),
            totalCost: (currentCost + cost).toFixed(6)
        };
    } catch (err) {
        console.error('Image creation error:', err);
        return { error: 'Sorry, there was an error creating the image.', cost: '0.000000', totalCost: '0.000000' };
    }
});

// Add provider-specific chat handlers
async function handleOpenAIChat(message, model, temperature, chatHistory, userData) {
    const OpenAI = require('openai');
    const openai = new OpenAI({ apiKey: userData.openaiApiKey });
    
    const formattedMessages = formatChatHistory(chatHistory, message);
    const response = await openai.chat.completions.create({
        model: model,
        messages: formattedMessages,
        temperature: temperature || MODEL_CONFIGS[model].temperature,
        max_tokens: MODEL_CONFIGS[model].maxTokens
    });
    
    return {
        message: response.choices[0].message.content,
        cost: calculateOpenAICost(response.usage.prompt_tokens, response.usage.completion_tokens)
    };
}

async function handleGoogleChat(message, model, temperature, chatHistory, userData) {
    const { GoogleGenerativeAI } = require('@google/generative-ai');
    const genAI = new GoogleGenerativeAI(userData.googleApiKey);
    const geminiModel = genAI.getGenerativeModel({ model: model });
    
    const formattedMessages = formatChatHistory(chatHistory, message);
    const modelConfig = MODEL_CONFIGS[model];
    
    // Handle multimodal content if the model supports it
    if (modelConfig.type === 'multimodal') {
        const result = await geminiModel.generateContent({
            contents: formattedMessages,
            generationConfig: {
                temperature: temperature || modelConfig.temperature,
                maxOutputTokens: modelConfig.maxTokens
            }
        });
        
        const response = result.response;
        const promptTokens = response.promptTokenCount || 0;
        const completionTokens = response.candidates?.[0]?.tokenCount || 0;
        
        return {
            message: response.text(),
            cost: calculateGoogleCost(promptTokens, completionTokens)
        };
    } else {
        // Handle text-only content
        const result = await geminiModel.generateContent({
            contents: formattedMessages,
            generationConfig: {
                temperature: temperature || modelConfig.temperature,
                maxOutputTokens: modelConfig.maxTokens
            }
        });
        
        const response = result.response;
        const promptTokens = response.promptTokenCount || 0;
        const completionTokens = response.candidates?.[0]?.tokenCount || 0;
        
        return {
            message: response.text(),
            cost: calculateGoogleCost(promptTokens, completionTokens)
        };
    }
}

function formatChatHistory(chatHistory, currentMessage) {
    if (!chatHistory || !Array.isArray(chatHistory)) {
        return [{ role: 'user', content: currentMessage }];
    }

    const formattedHistory = chatHistory.map(msg => ({
        role: msg.isUser ? 'user' : 'assistant',
        content: msg.content
    }));

    formattedHistory.push({ role: 'user', content: currentMessage });
    return formattedHistory;
}

// Update the chat-message handler
ipcMain.handle('chat-message', async (event, message, model, temperature, chatHistory) => {
    try {
        const userData = store.get('userData');
        const selectedProvider = store.get('selectedProvider') || 'openai';
        
        // Validate API key
        const apiKey = userData?.[`${selectedProvider}ApiKey`];
        if (!userData || !apiKey) {
            throw new Error(`${selectedProvider.charAt(0).toUpperCase() + selectedProvider.slice(1)} API key not found. Please set your API key in preferences.`);
        }

        // Validate model selection and ensure it's a string
        let selectedModel = model || (selectedProvider === 'openai' ? 'gpt-3.5-turbo' : 'gemini-pro');
        if (typeof selectedModel !== 'string') {
            console.warn('Model name is not a string, converting:', selectedModel);
            selectedModel = String(selectedModel);
            console.log('Converted model name:', selectedModel);
        }
        
        // Validate model format
        if (typeof selectedModel !== 'string') {
            console.error('Failed to convert model to string:', selectedModel);
            throw new Error(`Invalid model format: ${JSON.stringify(selectedModel)}`);
        }

        const modelConfig = MODEL_CONFIGS[selectedModel];
        if (!modelConfig) {
            console.warn(`Model ${selectedModel} not found, defaulting to ${selectedProvider === 'openai' ? 'gpt-3.5-turbo' : 'gemini-pro'}.`);
            selectedModel = selectedProvider === 'openai' ? 'gpt-3.5-turbo' : 'gemini-pro';
            console.log('Using default model:', selectedModel);
        }

        // Validate provider-model compatibility
        if (modelConfig.provider !== selectedProvider) {
            console.warn(`Model ${selectedModel} is not compatible with ${selectedProvider}, defaulting to ${selectedProvider === 'openai' ? 'gpt-3.5-turbo' : 'gemini-pro'}.`);
            selectedModel = selectedProvider === 'openai' ? 'gpt-3.5-turbo' : 'gemini-pro';
            console.log('Using compatible model:', selectedModel);
        }

        // Validate model type
        if (modelConfig.type && !['text', 'multimodal'].includes(modelConfig.type)) {
            console.warn(`Model ${selectedModel} is not a text/multimodal model, defaulting to ${selectedProvider === 'openai' ? 'gpt-3.5-turbo' : 'gemini-pro'}.`);
            selectedModel = selectedProvider === 'openai' ? 'gpt-3.5-turbo' : 'gemini-pro';
            console.log('Using text-compatible model:', selectedModel);
        }

        // Handle chat based on provider
        let response;
        if (selectedProvider === 'openai') {
            response = await handleOpenAIChat(message, selectedModel, temperature, chatHistory, userData);
        } else if (selectedProvider === 'google') {
            response = await handleGoogleChat(message, selectedModel, temperature, chatHistory, userData);
        } else {
            throw new Error(`Unsupported provider: ${selectedProvider}`);
        }

        // Update session cost
        if (response.cost) {
            const currentCost = store.get('sessionCost') || 0;
            store.set('sessionCost', currentCost + response.cost);
        }

        return response;
    } catch (error) {
        console.error('Chat error:', error);
        if (error.code === 'invalid_api_key') {
            throw new Error(`Invalid ${selectedProvider} API key. Please check your API key in preferences.`);
        }
        throw error;
    }
});

function calculateOpenAICost(promptTokens, completionTokens) {
    const model = store.get('selectedModel') || 'gpt-3.5-turbo';
    const config = MODEL_CONFIGS[model];
    if (!config) return 0;

    const promptCost = (promptTokens / 1000) * config.pricePerTokenUSD;
    const completionCost = (completionTokens / 1000) * config.pricePerTokenUSD;
    return promptCost + completionCost;
}

function calculateGoogleCost(promptTokens, completionTokens) {
    const model = store.get('selectedModel') || 'gemini-pro';
    const config = MODEL_CONFIGS[model];
    if (!config) return 0;

    const totalTokens = promptTokens + completionTokens;
    return (totalTokens / 1000) * config.pricePerTokenUSD;
}

// Add a helper function to safely set model in store
function setModelInStore(modelName) {
    if (typeof modelName !== 'string') {
        console.warn('Model name is not a string, converting:', modelName);
        modelName = String(modelName);
        console.log('Converted model name:', modelName);
    }
    store.set('selectedModel', modelName);
}

// Add a helper function to safely get model from store
function getModelFromStore() {
    const model = store.get('selectedModel');
    if (typeof model !== 'string') {
        console.warn('Retrieved model is not a string:', model);
        const convertedModel = String(model);
        console.log('Auto-converted model name:', convertedModel);
        return convertedModel;
    }
    return model;
}

ipcMain.handle('getAllProvidersAndModels', async () => {
  const providers = [
    {
      id: 'google',
      name: 'Google',
      models: [
        {
          id: 'gemini-pro',
          name: 'Gemini Pro',
          maxTokens: 32768,
          temperature: 0.7,
          pricePerTokenUSD: 0.000001,
          features: ['Multimodal', 'Advanced Reasoning'],
          description: "Google's advanced language model",
          type: 'multimodal',
          price: '$0.001/1K tokens'
        },
        {
          id: 'gemini-pro-vision',
          name: 'Gemini Pro Vision',
          maxTokens: 32768,
          temperature: 0.7,
          pricePerTokenUSD: 0.000001,
          features: ['Vision', 'Multimodal'],
          description: "Google's vision-language model",
          type: 'multimodal',
          price: '$0.001/1K tokens'
        },
        {
          id: 'gemini-1.5-flash-latest',
          name: 'Gemini 1.5 Flash',
          maxTokens: 4000,
          temperature: 0.3,
          pricePerTokenUSD: 0.001 / 1000,
          features: ['Fast', 'Multimodal'],
          description: "Google's fast language model",
          type: 'multimodal',
          price: '$0.001/1K tokens'
        },
        {
          id: 'gemini-2.5-pro-preview-05-06',
          name: 'Gemini 2.5 Pro Preview',
          maxTokens: 8000,
          temperature: 0.3,
          pricePerTokenUSD: 0.002 / 1000,
          features: ['Multimodal'],
          description: "Google's multimodal model",
          type: 'multimodal',
          price: '$0.002/1K tokens'
        },
        {
          id: 'gemini-2.5-flash-preview-tts',
          name: 'Gemini 2.5 Flash Preview TTS',
          maxTokens: 0,
          temperature: 0.3,
          pricePerTokenUSD: 0.015 / 1000,
          features: ['Text-to-Speech'],
          description: "Google's text-to-speech model",
          type: 'audio',
          price: '$0.015/1K tokens'
        },
        {
          id: 'gemini-2.5-flash-live-001',
          name: 'Gemini 2.5 Flash Live',
          maxTokens: 0,
          temperature: 0.3,
          pricePerTokenUSD: 0.02 / 1000,
          features: ['Live Audio'],
          description: "Google's live audio model",
          type: 'audio',
          price: '$0.02/1K tokens'
        },
        {
          id: 'veo-2.0-generate-001',
          name: 'Veo 2.0',
          maxTokens: 0,
          temperature: 0.3,
          pricePerTokenUSD: 0.02,
          features: ['Video Generation'],
          description: "Google's video generation model",
          type: 'video',
          price: '$0.02/video'
        },
        {
          id: 'imagen-3.0-generate-002',
          name: 'Imagen 3.0',
          maxTokens: 0,
          temperature: 0.3,
          pricePerTokenUSD: 0.03,
          features: ['Image Generation'],
          description: "Google's image generation model",
          type: 'image',
          price: '$0.03/image'
        }
      ]
    }
  ];

  return providers;
});

// Add IPC handlers for store operations
ipcMain.handle('store-get', (event, key) => {
    return store.get(key);
});

ipcMain.handle('store-set', (event, key, value) => {
    store.set(key, value);
});

ipcMain.handle('store-delete', (event, key) => {
    store.delete(key);
});

// Quit when all windows are closed
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

// Clear user data before quitting
app.on('before-quit', () => {
  try {
    console.log('Before quit: Current userData:', store.get('userData'));
    store.delete('userData');
    store.delete('isLoggingOut');
    console.log('After quit: UserData cleared, current value:', store.get('userData'));
  } catch (error) {
    console.error('Error clearing user data on quit:', error);
  }
}); 