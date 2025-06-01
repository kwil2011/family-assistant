const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');
try {
  const envContents = fs.readFileSync('.env', 'utf8');
  console.log('DEBUG: .env file contents:\n' + envContents);
} catch (e) {
  console.log('DEBUG: Could not read .env file:', e.message);
}

console.log('Main process started');
require('dotenv').config();

// Debug environment variables
console.log('Environment variables:');
console.log('SERPAPI_API_KEY exists:', !!process.env.SERPAPI_API_KEY);
console.log('OPENAI_API_KEY exists:', !!process.env.OPENAI_API_KEY);

const { app, BrowserWindow, ipcMain, session } = require('electron');
const Store = require('electron-store');
const OpenAI = require('openai');
const Typo = require('typo-js');
const { execFile } = require('child_process');
const os = require('os');
const { promisify } = require('util');
const exec = promisify(require('child_process').exec);
const pdfParse = require('pdf-parse');
const mammoth = require('mammoth');
const fetch = require('node-fetch');
const { GoogleSearch } = require('google-search-results-nodejs');
const ExcelJS = require('exceljs');
const { v4: uuidv4 } = require('uuid');
const { GoogleGenerativeAI } = require('@google/generative-ai');

// Initialize store with configuration
const store = new Store({
    name: 'config',
    cwd: app.getPath('userData'),
    encryptionKey: process.env.STORE_ENCRYPTION_KEY || 'your-encryption-key',
    clearInvalidConfig: true
});

// For debugging: Log the store file location
const storeFilePath = path.join(app.getPath('userData'), 'config.json');
// console.log('Store file location:', storeFilePath);

// Clear store if file is deleted
if (!fs.existsSync(storeFilePath)) {
    // console.log('Store file not found, clearing store');
    store.clear();
    // Force a new store instance to ensure complete clearing
    const newStore = new Store({
        name: 'config',
        cwd: app.getPath('userData'),
        encryptionKey: 'your-encryption-key',
        clearInvalidConfig: true
    });
    // Copy the new empty store to the original store
    Object.assign(store, newStore);
}

// Initialize default personas if none exist
function initializeDefaultPersonas() {
    const personas = store.get('personas');
    if (!personas || personas.length === 0) {
        const defaultPersonas = [
            {
                id: uuidv4(),
                title: 'Friendly Assistant',
                prompt: 'You are a friendly and helpful AI assistant. You provide clear, concise, and accurate information while maintaining a warm and approachable tone.',
                temperature: 0.7
            },
            {
                id: uuidv4(),
                title: 'Professional Expert',
                prompt: 'You are a professional expert in your field. You provide detailed, technical, and precise information with a formal and authoritative tone.',
                temperature: 0.3
            },
            {
                id: uuidv4(),
                title: 'Creative Partner',
                prompt: 'You are a creative and imaginative AI partner. You help generate ideas, think outside the box, and approach problems from unique perspectives.',
                temperature: 0.9
            },
            {
                id: uuidv4(),
                title: 'Family Helper',
                prompt: 'You are a helpful family assistant. You provide practical advice, help with daily tasks, and support family activities while maintaining a caring and supportive tone.',
                temperature: 0.6
            }
        ];
        store.set('personas', defaultPersonas);
        console.log('Default personas initialized');
    }
}

// Enable debugging
app.commandLine.appendSwitch('remote-debugging-port', '8315');

let mainWindow;

const createWindow = () => {
  // Create the browser window
  const preloadPath = path.join(__dirname, 'preload.js');
  console.log('Preload script path:', preloadPath, 'Exists:', fs.existsSync(preloadPath));
  
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: preloadPath,
      webSecurity: true,
      allowRunningInsecureContent: false,
      sandbox: false
    }
  });

  // Configure session security with less restrictive CSP
  session.defaultSession.webRequest.onHeadersReceived((details, callback) => {
    callback({
      responseHeaders: {
        ...details.responseHeaders,
        'Content-Security-Policy': [
          "default-src 'self' 'unsafe-inline' 'unsafe-eval' data: blob:; img-src 'self' data: blob: https:;"
        ]
      }
    });
  });

  // Get the absolute path to index.html
  const indexPath = path.join(__dirname, 'renderer', 'index.html');
  console.log('Loading index.html from:', indexPath);

  // Load the index.html file
  mainWindow.loadFile(indexPath)
    .then(() => {
      console.log('Successfully loaded index.html');
      mainWindow.show();
    })
    .catch((err) => {
      console.error('Failed to load index.html:', err);
      app.quit();
    });

  // Open DevTools
  mainWindow.webContents.openDevTools();

  // Log any page errors
  mainWindow.webContents.on('did-fail-load', (event, errorCode, errorDescription) => {
    console.error('Page failed to load:', errorCode, errorDescription);
  });

  mainWindow.webContents.on('did-finish-load', () => {
    console.log('Page finished loading');
  });

  mainWindow.webContents.on('dom-ready', () => {
    console.log('DOM is ready');
  });

  // Add keyboard shortcut to open DevTools (Ctrl+Shift+I)
  mainWindow.webContents.on('before-input-event', (event, input) => {
    if (input.key === 'I' && input.control && input.shift) {
      mainWindow.webContents.openDevTools({ mode: 'detach' });
    }
  });

  // console.log('userData: ' + JSON.stringify(store.get('userData')));
  // console.log('Send button event attached');
};

// This method will be called when Electron has finished initialization
app.whenReady().then(() => {
  // Set spellchecker to Australian English only
  session.defaultSession.setSpellCheckerLanguages(['en-AU']);
  initializeDefaultPersonas();
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

// Quit when all windows are closed
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

// IPC Handlers
ipcMain.handle('store-get', async (event, key) => {
  console.log('store-get called with key:', key);
  const value = store.get(key);
  // Mask sensitive data in logs
  const logValue = value ? {
    ...value,
    password: '********',
    apiKey: value.apiKey ? '********' : undefined
  } : value;
  console.log('Getting from store:', key, logValue);
  return value;
});

ipcMain.handle('store-set', async (event, key, value) => {
  console.log('store-set handler called with:', key, value);
  // Mask sensitive data in logs
  const logValue = value ? {
    ...value,
    password: '********',
    apiKey: value.apiKey ? '********' : undefined
  } : value;
  console.log('Setting in store:', key, logValue);
  try {
    store.set(key, value);
    
    // Clear session system prompt if personalization settings are updated
    if (key.startsWith('personalSettings-')) {
      const userData = store.get('userData');
      if (userData && userData.email) {
        store.delete(`sessionSystemPrompt-${userData.email}`);
      }
    }
    
    return true;
  } catch (error) {
    console.error('Error saving to store:', error);
    throw error;
  }
});

ipcMain.handle('store-delete', async (event, key) => {
  // console.log('Deleting from store:', key);
  store.delete(key);
  return true;
});

// Provider API Key Management
ipcMain.handle('getProviderApiKey', async (event, providerId) => {
  const userData = store.get('userData') || {};
  return userData[`${providerId}ApiKey`] || '';
});

ipcMain.handle('setProviderApiKey', async (event, providerId, apiKey) => {
  const userData = store.get('userData') || {};
  userData[`${providerId}ApiKey`] = apiKey;
  store.set('userData', userData);
  return true;
});

// Get all providers and their models
ipcMain.handle('getAllProvidersAndModels', async () => {
  const providers = [
    {
      id: 'openai',
      name: 'OpenAI',
      models: [
        {
          id: 'gpt-3.5-turbo',
          name: 'GPT-3.5 Turbo',
          maxTokens: 2000,
          temperature: 0.3,
          pricePerTokenUSD: 0.0015 / 1000,
          features: ['Chat', 'Code', 'Text Generation'],
          description: 'Fast and efficient model for most tasks'
        },
        {
          id: 'gpt-4-turbo',
          name: 'GPT-4 Turbo',
          maxTokens: 4000,
          temperature: 0.3,
          pricePerTokenUSD: 0.01 / 1000,
          features: ['Chat', 'Code', 'Text Generation', 'Advanced Reasoning'],
          description: 'Most capable model for complex tasks'
        },
        {
          id: 'gpt-4o',
          name: 'GPT-4 Optimized',
          maxTokens: 8000,
          temperature: 0.3,
          pricePerTokenUSD: 0.005 / 1000,
          features: ['Chat', 'Code', 'Text Generation', 'Vision'],
          description: 'Optimized version of GPT-4'
        },
        {
          id: 'dall-e-3',
          name: 'DALL·E 3',
          maxTokens: 0,
          temperature: 0.3,
          pricePerTokenUSD: 0.04, // $0.04 per image
          features: ['Text to Image', 'Inpainting, Outpainting'],
          description: 'OpenAI image generation model'
        },
        {
          id: 'whisper-1',
          name: 'Whisper',
          maxTokens: 0,
          temperature: 0.3,
          pricePerTokenUSD: 0.006, // $0.006 per minute
          features: ['Audio transcription', 'Speech-to-text'],
          description: 'OpenAI speech-to-text model'
        },
        {
          id: 'tts-1',
          name: 'TTS',
          maxTokens: 0,
          temperature: 0.3,
          pricePerTokenUSD: 0.015, // $0.015 per 1K chars
          features: ['Text to Speech', 'Alloy, Nova, Onyx, etc.'],
          description: 'OpenAI text-to-speech model'
        }
      ]
    },
    {
      id: 'google',
      name: 'Google',
      models: [
        {
          id: 'gemini-2.5-pro-preview-05-06',
          name: 'Gemini 2.5 Pro Preview',
          maxTokens: 2000000,
          temperature: 0.3,
          pricePerTokenUSD: 0.0005 / 1000,
          features: ['Multimodal', 'Advanced Reasoning', 'Vision', 'Audio', 'Video', 'Text'],
          description: 'Gemini 2.5 Pro Preview (multimodal, advanced reasoning, vision, audio, video, text)',
          type: 'multimodal'
        },
        {
          id: 'gemini-2.5-flash-preview-05-20',
          name: 'Gemini 2.5 Flash Preview',
          maxTokens: 1000000,
          temperature: 0.3,
          pricePerTokenUSD: 0.0002 / 1000,
          features: ['Multimodal', 'Fast', 'Vision', 'Audio', 'Video', 'Text'],
          description: 'Gemini 2.5 Flash Preview (multimodal, fast, vision, audio, video, text)',
          type: 'multimodal'
        },
        {
          id: 'gemini-2.0-flash',
          name: 'Gemini 2.0 Flash',
          maxTokens: 1000000,
          temperature: 0.3,
          pricePerTokenUSD: 0.0001 / 1000,
          features: ['Multimodal', 'Vision', 'Audio', 'Video', 'Text'],
          description: 'Gemini 2.0 Flash (multimodal, vision, audio, video, text)',
          type: 'multimodal'
        },
        {
          id: 'gemini-2.0-flash-lite',
          name: 'Gemini 2.0 Flash-Lite',
          maxTokens: 500000,
          temperature: 0.3,
          pricePerTokenUSD: 0.00005 / 1000,
          features: ['Cost Efficient', 'Low Latency', 'Multimodal'],
          description: 'Gemini 2.0 Flash-Lite (cost efficient, low latency, multimodal)',
          type: 'multimodal'
        },
        {
          id: 'gemini-1.5-pro',
          name: 'Gemini 1.5 Pro',
          maxTokens: 2000000,
          temperature: 0.3,
          pricePerTokenUSD: 0.00025 / 1000,
          features: ['Multimodal', 'Up to 2M tokens'],
          description: 'Gemini 1.5 Pro (multimodal, up to 2M tokens)',
          type: 'multimodal'
        },
        {
          id: 'gemini-1.5-flash',
          name: 'Gemini 1.5 Flash',
          maxTokens: 1000000,
          temperature: 0.3,
          pricePerTokenUSD: 0.0001 / 1000,
          features: ['Fast', 'Multimodal'],
          description: 'Gemini 1.5 Flash (fast, multimodal)',
          type: 'multimodal'
        },
        {
          id: 'gemini-1.5-flash-8b',
          name: 'Gemini 1.5 Flash-8B',
          maxTokens: 8000,
          temperature: 0.3,
          pricePerTokenUSD: 0.00005 / 1000,
          features: ['High Volume', 'Lower Intelligence Tasks'],
          description: 'Gemini 1.5 Flash-8B (high volume, lower intelligence tasks)',
          type: 'multimodal'
        },
        {
          id: 'gemini-2.5-flash-preview-native-audio-dialog',
          name: 'Gemini 2.5 Flash Native Audio',
          maxTokens: 0,
          temperature: 0.3,
          pricePerTokenUSD: 0.0002 / 1000,
          features: ['Voice-to-Text', 'Audio', 'Video', 'Text'],
          description: 'Gemini 2.5 Flash Native Audio (voice-to-text, audio, video, text)',
          type: 'audio'
        },
        {
          id: 'gemini-2.5-pro-preview-tts',
          name: 'Gemini 2.5 Pro Preview TTS',
          maxTokens: 0,
          temperature: 0.3,
          pricePerTokenUSD: 0.0002 / 1000,
          features: ['Text-to-Speech'],
          description: 'Gemini 2.5 Pro Preview TTS (text-to-speech)',
          type: 'tts'
        },
        {
          id: 'gemini-2.5-flash-preview-tts',
          name: 'Gemini 2.5 Flash Preview TTS',
          maxTokens: 0,
          temperature: 0.3,
          pricePerTokenUSD: 0.0001 / 1000,
          features: ['Text-to-Speech'],
          description: 'Gemini 2.5 Flash Preview TTS (text-to-speech)',
          type: 'tts'
        },
        {
          id: 'gemini-embedding-exp',
          name: 'Gemini Embedding',
          maxTokens: 2048,
          temperature: 0.3,
          pricePerTokenUSD: 0.00001 / 1000,
          features: ['Text Embeddings', 'Document Analysis'],
          description: 'Gemini Embedding (text embeddings, document analysis)',
          type: 'embedding'
        }
      ]
    }
  ];

  // Get custom models from store
  const customModels = store.get('customModels') || [];
  
  // Add custom models to their respective providers
  if (Array.isArray(customModels)) {
    customModels.forEach(model => {
      const provider = providers.find(p => p.id === model.provider);
      if (provider) {
        provider.models.push({
          ...model,
          isCustom: true
        });
      }
    });
  }

  return providers;
});

// Store exchange rate in memory
let currentExchangeRate = null;
let lastExchangeRateUpdate = null;
const EXCHANGE_RATE_CACHE_DURATION = 3600000; // 1 hour in milliseconds

// Function to get current USD to AUD exchange rate
async function getExchangeRate() {
    // Return cached rate if it's still valid
    if (currentExchangeRate && lastExchangeRateUpdate && 
        (Date.now() - lastExchangeRateUpdate) < EXCHANGE_RATE_CACHE_DURATION) {
        return currentExchangeRate;
    }

    try {
        const response = await fetch('https://api.exchangerate-api.com/v4/latest/USD');
        const data = await response.json();
        currentExchangeRate = data.rates.AUD;
        lastExchangeRateUpdate = Date.now();
        return currentExchangeRate;
    } catch (error) {
        console.error('Error fetching exchange rate:', error);
        // Fallback to a reasonable rate if API fails
        return currentExchangeRate || 1.52;
    }
}

// Initialize exchange rate at startup
getExchangeRate().then(rate => {
    console.log('Initial exchange rate:', rate);
});

// Model configurations with dynamic exchange rate
const MODEL_CONFIGS = {
    // OpenAI Models
    'gpt-3.5-turbo': {
        maxTokens: 2000,
        temperature: 0.3,
        pricePerTokenUSD: 0.0015 / 1000,
        validateResponse: true
    },
    'gpt-4-turbo': {
        maxTokens: 4000,
        temperature: 0.3,
        pricePerTokenUSD: 0.01 / 1000,
        validateResponse: true
    },
    'gpt-4o': {
        maxTokens: 8000,
        temperature: 0.3,
        pricePerTokenUSD: 0.005 / 1000,
        validateResponse: true
    },
    'dall-e-3': {
        maxTokens: 0,
        temperature: 0.3,
        pricePerTokenUSD: 0.04, // $0.04 per image
        validateResponse: false
    },
    'whisper-1': {
        maxTokens: 0,
        temperature: 0.3,
        pricePerTokenUSD: 0.006, // $0.006 per minute
        validateResponse: false
    },
    'tts-1': {
        maxTokens: 0,
        temperature: 0.3,
        pricePerTokenUSD: 0.015, // $0.015 per 1K chars
        validateResponse: false
    },
    'gpt-4-vision-preview': {
        maxTokens: 4000,
        temperature: 0.3,
        pricePerTokenUSD: 0.03 / 1000,
        validateResponse: true
    },
    // Google Gemini models (latest as per docs)
    'gemini-2.5-pro-preview-05-06': {
        maxTokens: 2000000,
        temperature: 0.3,
        pricePerTokenUSD: 0.0005 / 1000,
        provider: 'google',
        description: 'Gemini 2.5 Pro Preview (multimodal, advanced reasoning, vision, audio, video, text)',
        type: 'multimodal'
    },
    'gemini-2.5-flash-preview-05-20': {
        maxTokens: 1000000,
        temperature: 0.3,
        pricePerTokenUSD: 0.0002 / 1000,
        provider: 'google',
        description: 'Gemini 2.5 Flash Preview (multimodal, fast, vision, audio, video, text)',
        type: 'multimodal'
    },
    'gemini-2.0-flash': {
        maxTokens: 1000000,
        temperature: 0.3,
        pricePerTokenUSD: 0.0001 / 1000,
        provider: 'google',
        description: 'Gemini 2.0 Flash (multimodal, vision, audio, video, text)',
        type: 'multimodal'
    },
    'gemini-2.0-flash-lite': {
        maxTokens: 500000,
        temperature: 0.3,
        pricePerTokenUSD: 0.00005 / 1000,
        provider: 'google',
        description: 'Gemini 2.0 Flash-Lite (cost efficient, low latency, multimodal)',
        type: 'multimodal'
    },
    'gemini-1.5-pro': {
        maxTokens: 2000000,
        temperature: 0.3,
        pricePerTokenUSD: 0.00025 / 1000,
        provider: 'google',
        description: 'Gemini 1.5 Pro (multimodal, up to 2M tokens)',
        type: 'multimodal'
    },
    'gemini-1.5-flash': {
        maxTokens: 1000000,
        temperature: 0.3,
        pricePerTokenUSD: 0.0001 / 1000,
        provider: 'google',
        description: 'Gemini 1.5 Flash (fast, multimodal)',
        type: 'multimodal'
    },
    'gemini-1.5-flash-8b': {
        maxTokens: 8000,
        temperature: 0.3,
        pricePerTokenUSD: 0.00005 / 1000,
        provider: 'google',
        description: 'Gemini 1.5 Flash-8B (high volume, lower intelligence tasks)',
        type: 'multimodal'
    },
    // Voice-to-Text (Speech recognition)
    'gemini-1.5-pro-audio': {
        maxTokens: 0,
        temperature: 0.3,
        pricePerTokenUSD: 0.0002 / 1000,
        provider: 'google',
        description: 'Gemini 1.5 Pro Audio (voice-to-text, audio, video, text)',
        type: 'audio'
    },
    // Text-to-Speech
    'gemini-1.5-pro-tts': {
        maxTokens: 0,
        temperature: 0.3,
        pricePerTokenUSD: 0.0002 / 1000,
        provider: 'google',
        description: 'Gemini 1.5 Pro TTS (text-to-speech)',
        type: 'tts'
    },
    'gemini-1.5-flash-tts': {
        maxTokens: 0,
        temperature: 0.3,
        pricePerTokenUSD: 0.0001 / 1000,
        provider: 'google',
        description: 'Gemini 1.5 Flash TTS (text-to-speech)',
        type: 'tts'
    },
    // Embedding/Document analysis
    'gemini-embedding': {
        maxTokens: 2048,
        temperature: 0.3,
        pricePerTokenUSD: 0.00001 / 1000,
        provider: 'google',
        description: 'Gemini Embedding (text embeddings, document analysis)',
        type: 'embedding'
    },
};

// Function to get price in AUD
async function getPriceInAUD(priceUSD) {
    const exchangeRate = await getExchangeRate();
    return priceUSD * exchangeRate;
}

// Function to update model prices in the UI
async function updateModelPrices() {
    const exchangeRate = await getExchangeRate();
    const modelCards = document.querySelectorAll('.model-card');
    
    for (const card of modelCards) {
        const model = card.dataset.model;
        if (MODEL_CONFIGS[model]) {
            const priceUSD = MODEL_CONFIGS[model].pricePerTokenUSD * 1000; // Convert to per 1K tokens
            const priceAUD = priceUSD * exchangeRate;
            const priceElement = card.querySelector('.price');
            if (priceElement) {
                priceElement.textContent = `$${priceAUD.toFixed(4)} AUD / 1K tokens`;
            }
        }
    }
}

// Update prices every hour
setInterval(updateModelPrices, 3600000);

async function handleGoogleChat(message, model, temperature, chatHistory, userData) {
    const genAI = new GoogleGenerativeAI(userData.googleApiKey);
    
    // Validate model name
    if (!MODEL_CONFIGS[model] || MODEL_CONFIGS[model].provider !== 'google') {
        throw new Error(`Invalid Google model: ${model}. Please use a supported Gemini model.`);
    }
    
    const geminiModel = genAI.getGenerativeModel({ model: model });
    const modelConfig = MODEL_CONFIGS[model];
    
    // Get user settings and session prompt
    const settings = store.get(`personalSettings-${userData.email}`) || {};
    let sessionSystemPrompt = store.get(`sessionSystemPrompt-${userData.email}`);
    if (!sessionSystemPrompt) {
        sessionSystemPrompt = "You are a helpful family AI assistant. You help with tasks like homework, scheduling, and general knowledge questions. Keep responses concise and family-friendly.";
        const memory = store.get(`memory-${userData.email}`);
        if (settings.selectedPersona) {
            const personas = store.get('personas') || [];
            const selectedPersona = personas.find(p => p.id === settings.selectedPersona);
            if (selectedPersona) {
                sessionSystemPrompt = selectedPersona.prompt;
            }
        }
        if (memory) sessionSystemPrompt += ` Here is what you know about this family: ${memory}`;
        if (settings.familyMembers) sessionSystemPrompt += ` Family members: ${settings.familyMembers}.`;
        if (settings.interests) sessionSystemPrompt += ` Family interests: ${settings.interests}.`;
        if (settings.responseLength) {
            switch (settings.responseLength) {
                case 'concise': sessionSystemPrompt += ' Keep responses brief and to the point.'; break;
                case 'detailed': sessionSystemPrompt += ' Provide detailed and comprehensive responses.'; break;
                case 'balanced': default: sessionSystemPrompt += ' Provide balanced responses with appropriate detail.';
            }
        }
        if (settings.contentFilter) {
            switch (settings.contentFilter) {
                case 'strict': sessionSystemPrompt += ' Ensure all content is strictly family-friendly and appropriate for all ages.'; break;
                case 'moderate': sessionSystemPrompt += ' Keep content generally family-friendly while allowing for some mature topics when appropriate.'; break;
                case 'minimal': sessionSystemPrompt += ' Use minimal content filtering while still maintaining basic appropriateness.'; break;
            }
        }
        store.set(`sessionSystemPrompt-${userData.email}`, sessionSystemPrompt);
    }
    
    // Format chat history for Gemini
    const formattedMessages = [];
    
    // Add system prompt if it exists
    if (sessionSystemPrompt) {
        formattedMessages.push({
            role: 'user',
            parts: [{ text: sessionSystemPrompt }]
        });
    }
    
    // Add chat history
    formattedMessages.push(...(chatHistory || []).slice(-10).map(msg => ({
        role: msg.isUser ? 'user' : 'model',
        parts: [{ text: msg.content }]
    })));
    
    // Add current message
    formattedMessages.push({ role: 'user', parts: [{ text: message }] });
    
    try {
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
            usage: {
                promptTokens,
                completionTokens,
                totalTokens: promptTokens + completionTokens
            },
            cost: calculateGoogleCost(promptTokens, completionTokens)
        };
    } catch (error) {
        console.error('Google Gemini API Error:', error);

        // Detect quota/rate limit errors
        if (
            error.message &&
            (error.message.includes('429') ||
             error.message.includes('quota') ||
             error.message.includes('Too Many Requests'))
        ) {
            throw new Error(
                "You have reached your Gemini API quota or rate limit. " +
                "Please wait a few minutes and try again, or check your Google Cloud billing and quota settings. " +
                "You may also try switching to the 'gemini-2.0-flash' model, which may have more available quota. " +
                "See: https://ai.google.dev/gemini-api/docs/rate-limits"
            );
        }

        if (error.message.includes('Invalid Google model')) {
            throw error;
        }
        throw new Error(`Failed to get response from Google Gemini: ${error.message}. Please check your API key and try again.`);
    }
}

ipcMain.handle('chat-message', async (event, message, model, temperature, chatHistory) => {
  const userData = store.get('userData');
  const selectedProvider = store.get('selectedProvider') || 'openai';
  
  if (!userData || !userData[`${selectedProvider}ApiKey`]) {
    console.error('API key not found');
    throw new Error(`${selectedProvider.charAt(0).toUpperCase() + selectedProvider.slice(1)} API key not found. Please set your API key in preferences or .env file.`);
  }

  // Validate model selection
  const selectedModel = model || 'gpt-3.5-turbo';
  if (!MODEL_CONFIGS[selectedModel]) {
    console.error('Invalid model:', selectedModel);
    throw new Error(`Unsupported model: ${selectedModel}`);
  }

  const modelConfig = MODEL_CONFIGS[selectedModel];

  // Check if the model requires special capabilities
  if (selectedModel.includes('vision') && !message.includes('data:image')) {
    throw new Error(`Error: You have selected the incorrect model, please select a chat model. If you wish to use vision please upload an image.`);
  }

  // Get user memory if it exists
  const memory = store.get(`memory-${userData.email}`);
  const settings = store.get(`personalSettings-${userData.email}`) || {};
  
  // Get or create session system prompt
  let sessionSystemPrompt = store.get(`sessionSystemPrompt-${userData.email}`);
  if (!sessionSystemPrompt) {
    // Create new system prompt for this session
    sessionSystemPrompt = "You are a helpful family AI assistant. You help with tasks like homework, scheduling, and general knowledge questions. Keep responses concise and family-friendly.";
    
    if (settings.selectedPersona) {
      const personas = store.get('personas') || [];
      const selectedPersona = personas.find(p => p.id === settings.selectedPersona);
      if (selectedPersona) {
        sessionSystemPrompt = selectedPersona.prompt;
        temperature = selectedPersona.temperature;
      }
    }

    // Add family memory if it exists
    if (memory) {
      sessionSystemPrompt += ` Here is what you know about this family: ${memory}`;
    }

    // Add family members and interests if they exist
    if (settings.familyMembers) {
      sessionSystemPrompt += ` Family members: ${settings.familyMembers}.`;
    }
    if (settings.interests) {
      sessionSystemPrompt += ` Family interests: ${settings.interests}.`;
    }

    // Add response length preference
    if (settings.responseLength) {
      switch (settings.responseLength) {
        case 'concise':
          sessionSystemPrompt += ' Keep responses brief and to the point.';
          break;
        case 'detailed':
          sessionSystemPrompt += ' Provide detailed and comprehensive responses.';
          break;
        case 'balanced':
        default:
          sessionSystemPrompt += ' Provide balanced responses with appropriate detail.';
      }
    }

    // Add content filter preference
    if (settings.contentFilter) {
      switch (settings.contentFilter) {
        case 'strict':
          sessionSystemPrompt += ' Ensure all content is strictly family-friendly and appropriate for all ages.';
          break;
        case 'moderate':
          sessionSystemPrompt += ' Keep content generally family-friendly while allowing for some mature topics when appropriate.';
          break;
        case 'minimal':
          sessionSystemPrompt += ' Use minimal content filtering while still maintaining basic appropriateness.';
          break;
      }
    }

    // Store the system prompt for this session
    store.set(`sessionSystemPrompt-${userData.email}`, sessionSystemPrompt);
  }

  // --- GOOGLE GEMINI SUPPORT ---
  if (modelConfig.provider === 'google') {
    try {
      return await handleGoogleChat(message, model, temperature, chatHistory, userData);
    } catch (error) {
        console.error('Google Gemini API Error:', error);
        if (error.message.includes('Invalid Google model')) {
            throw error;
        }
        throw new Error(`Failed to get response from Google Gemini: ${error.message}. Please check your API key and try again.`);
    }
  }

  // --- OPENAI (default) ---
  try {
    const openai = new OpenAI({ apiKey: userData[`${selectedProvider}ApiKey`] });
    
    // Get chat history from chatHistory argument
    const recentHistory = (chatHistory || []).slice(-10);

    // Prepare messages array with system prompt and chat history
    const messages = [
      {
        role: "system",
        content: sessionSystemPrompt
      }
    ];

    // Add chat history (limited to last 10 messages to avoid token limits)
    recentHistory.forEach(msg => {
      messages.push({
        role: msg.isUser ? "user" : "assistant",
        content: msg.content
      });
    });

    // Add current message
    messages.push({ role: "user", content: message });

    const completion = await openai.chat.completions.create({
      model: selectedModel,
      messages: messages,
      max_tokens: modelConfig.maxTokens,
      temperature: typeof temperature === 'number' ? temperature : modelConfig.temperature
    });

    // Calculate cost
    const totalTokens = completion.usage.total_tokens;
    const costUSD = totalTokens * modelConfig.pricePerTokenUSD;
    const exchangeRate = await getExchangeRate();
    const costInAUD = costUSD * exchangeRate;

    // Update user's total cost if needed
    const currentCost = store.get(`totalCost-${userData.email}`) || 0;
    store.set(`totalCost-${userData.email}`, currentCost + costInAUD);

    // Return response with usage and cost information
    return {
      message: completion.choices[0].message.content,
      usage: completion.usage,
      cost: costInAUD.toFixed(6),
      totalCost: (currentCost + costInAUD).toFixed(6)
    };
  } catch (error) {
    console.error('OpenAI API Error:', error);
    
    // Handle specific API errors
    if (error.response) {
      const status = error.response.status;
      switch (status) {
        case 401:
          throw new Error('Invalid API key. Please check your OpenAI API key in preferences.');
        case 429:
          throw new Error('Rate limit exceeded. Please try again later.');
        case 500:
          throw new Error('OpenAI service error. Please try again later.');
        default:
          throw new Error(`OpenAI API error (${status}): ${error.message}`);
      }
    }
    
    throw new Error('Failed to get response from AI model. Please try again.');
  }
});

ipcMain.handle('summarize-chat', async (event, chatHistory) => {
    try {
        // Get user data and selected provider
        const userData = store.get('userData');
        const selectedProvider = store.get('selectedProvider') || 'openai';
        
        if (!userData || !userData[`${selectedProvider}ApiKey`]) {
            throw new Error(`API key not found. Please set your ${selectedProvider.charAt(0).toUpperCase() + selectedProvider.slice(1)} API key in preferences.`);
        }

        const openai = new OpenAI({ apiKey: userData[`${selectedProvider}ApiKey`] });
        
        // If chatHistory is already a string, use it directly
        const historyText = typeof chatHistory === 'string' ? chatHistory : chatHistory.map(msg => `${msg.type === 'user' ? 'User' : 'Assistant'}: ${msg.content}`).join('\n');

        const completion = await openai.chat.completions.create({
            model: "gpt-3.5-turbo",
            messages: [
                {
                    role: "system",
                    content: "You are a helpful assistant. Summarize the following conversation in a concise and clear way for quick review."
                },
                { role: "user", content: historyText }
            ],
            max_tokens: 200
        });

        // Calculate cost
        const totalTokens = completion.usage.total_tokens;
        const pricePerToken = (0.0015 / 1000) * await getPriceInAUD(0.0015); // $0.0015 USD per 1K tokens for GPT-3.5
        const cost = totalTokens * pricePerToken;
        const currentCost = store.get(`totalCost-${userData.email}`) || 0;
        store.set(`totalCost-${userData.email}`, currentCost + cost);

        return completion.choices[0].message.content;
    } catch (error) {
        console.error('Error summarizing chat:', error);
        throw error;
    }
});

ipcMain.handle('refocus-window', async () => {
  if (mainWindow) {
    mainWindow.blur();
    setTimeout(() => mainWindow.focus(), 100);
  }
});

// Cost calculation functions
function calculateOpenAICost(promptTokens, completionTokens) {
    // GPT-4 Turbo pricing: $0.01 USD per 1K tokens for input, $0.03 USD per 1K tokens for output
    const inputCost = (promptTokens / 1000) * 0.01;
    const outputCost = (completionTokens / 1000) * 0.03;
    return inputCost + outputCost;
}

function calculateAnthropicCost(inputTokens, outputTokens) {
    // Claude 3 Sonnet pricing: $0.003 USD per 1K tokens for input, $0.015 USD per 1K tokens for output
    const inputCost = (inputTokens / 1000) * 0.003;
    const outputCost = (outputTokens / 1000) * 0.015;
    return inputCost + outputCost;
}

function calculateGoogleCost(promptTokens, completionTokens) {
    // Gemini Pro pricing: $0.00025 USD per 1K tokens for input, $0.0005 USD per 1K tokens for output
    const inputCost = (promptTokens / 1000) * 0.00025;
    const outputCost = (completionTokens / 1000) * 0.0005;
    return inputCost + outputCost;
}

// Handle document processing
ipcMain.handle('process-document', async (event, filename, fileData, prompt, chatHistory) => {
    try {
        console.log('Processing document:', filename);
        console.log('File data type:', typeof fileData);
        console.log('File data length:', fileData.length);
        
        if (!fileData || !(fileData instanceof Uint8Array)) {
            throw new Error('Invalid file data format');
        }

        // Convert ArrayBuffer to Buffer
        const buffer = Buffer.from(fileData);
        console.log('Buffer created, length:', buffer.length);
        
        // Save the file temporarily
        const tempDir = path.join(os.tmpdir(), 'family-ai-assistant');
        if (!fs.existsSync(tempDir)) {
            fs.mkdirSync(tempDir, { recursive: true });
        }
        const tempFilePath = path.join(tempDir, filename);
        fs.writeFileSync(tempFilePath, buffer);
        console.log('Temporary file saved:', tempFilePath);

        // Read the file content based on file type
        let content = '';
        try {
            if (filename.endsWith('.txt')) {
                content = fs.readFileSync(tempFilePath, 'utf-8');
                console.log('TXT content length:', content.length);
            } else if (filename.endsWith('.pdf')) {
                console.log('Processing PDF file...');
                const pdfData = await pdfParse(buffer);
                content = pdfData.text;
                console.log('PDF content length:', content.length);
            } else if (filename.endsWith('.docx') || filename.endsWith('.doc')) {
                console.log('Processing Word document...');
                const result = await mammoth.extractRawText({ buffer: buffer });
                content = result.value;
                console.log('Word document content length:', content.length);
            } else if (filename.endsWith('.xlsx') || filename.endsWith('.xls')) {
                console.log('Processing Excel file...');
                const workbook = new ExcelJS.Workbook();
                await workbook.xlsx.load(buffer);
                content = '';
                
                for (const worksheet of workbook.worksheets) {
                    content += `Sheet: ${worksheet.name}\n`;
                    worksheet.eachRow((row, rowNumber) => {
                        const rowData = row.values.slice(1); // Skip the first element (undefined)
                        content += rowData.join('\t') + '\n';
                    });
                    content += '\n';
                }
                console.log('Excel content length:', content.length);
            } else {
                throw new Error('Unsupported file type. Only PDF, TXT, DOC, DOCX, XLS, and XLSX are supported.');
            }

            // Log a preview of the extracted content for debugging
            console.log('Extracted content preview:', content.slice(0, 200));

            if (!content || content.trim().length === 0) {
                throw new Error('No content could be extracted from the document. Please check the file format and contents.');
            }
        } catch (parseError) {
            console.error('Error parsing document:', parseError);
            throw new Error(`Error parsing document: ${parseError.message}`);
        }

        // Clean up the temporary file
        try {
            fs.unlinkSync(tempFilePath);
        } catch (cleanupError) {
            console.error('Error cleaning up temporary file:', cleanupError);
        }

        // Limit content length to avoid token limits
        const maxChars = 16000; // Roughly 4000 tokens
        if (content.length > maxChars) {
            content = content.slice(0, maxChars) + '\n...[truncated]';
        }

        // Get user's API key and selected provider
        const userData = store.get('userData');
        const selectedProvider = store.get('selectedProvider') || 'openai';
        const apiKey = userData[`${selectedProvider}ApiKey`];
        if (!apiKey) {
            throw new Error(`${selectedProvider.charAt(0).toUpperCase() + selectedProvider.slice(1)} API key not found. Please set your API key in settings.`);
        }

        // Get document analysis settings
        const settings = store.get(`personalSettings-${userData.email}`) || {};
        const documentAnalysisModel = settings.documentAnalysisModel || 'gpt-4-turbo';
        const maxTokens = settings.documentAnalysisMaxTokens || 16000;

        // Build context-aware prompt
        let fullPrompt = prompt || 'Please analyze this document and provide a summary of its contents.';
        if (chatHistory && Array.isArray(chatHistory) && chatHistory.length > 0) {
            const historyText = chatHistory.slice(-5).map(msg => `${msg.isUser ? 'User' : 'Assistant'}: ${msg.content}`).join('\n');
            fullPrompt = `Previous conversation:\n${historyText}\n\nUser request: ${prompt}`;
        }
        let sessionSystemPrompt = store.get(`sessionSystemPrompt-${userData.email}`);
        if (!sessionSystemPrompt) {
            sessionSystemPrompt = "You are a helpful family AI assistant. You help with tasks like homework, scheduling, and general knowledge questions. Keep responses concise and family-friendly.";
            const memory = store.get(`memory-${userData.email}`);
            if (settings.selectedPersona) {
                const personas = store.get('personas') || [];
                const selectedPersona = personas.find(p => p.id === settings.selectedPersona);
                if (selectedPersona) {
                    sessionSystemPrompt = selectedPersona.prompt;
                }
            }
            if (memory) sessionSystemPrompt += ` Here is what you know about this family: ${memory}`;
            if (settings.familyMembers) sessionSystemPrompt += ` Family members: ${settings.familyMembers}.`;
            if (settings.interests) sessionSystemPrompt += ` Family interests: ${settings.interests}.`;
            if (settings.responseLength) {
                switch (settings.responseLength) {
                    case 'concise': sessionSystemPrompt += ' Keep responses brief and to the point.'; break;
                    case 'detailed': sessionSystemPrompt += ' Provide detailed and comprehensive responses.'; break;
                    case 'balanced': default: sessionSystemPrompt += ' Provide balanced responses with appropriate detail.';
                }
            }
            if (settings.contentFilter) {
                switch (settings.contentFilter) {
                    case 'strict': sessionSystemPrompt += ' Ensure all content is strictly family-friendly and appropriate for all ages.'; break;
                    case 'moderate': sessionSystemPrompt += ' Keep content generally family-friendly while allowing for some mature topics when appropriate.'; break;
                    case 'minimal': sessionSystemPrompt += ' Use minimal content filtering while still maintaining basic appropriateness.'; break;
                }
            }
            store.set(`sessionSystemPrompt-${userData.email}`, sessionSystemPrompt);
        }
        const messages = [
            { role: 'system', content: sessionSystemPrompt },
            { role: 'user', content: `Document content:\n${content}\n\n${fullPrompt}` }
        ];

        // Call the appropriate API based on the selected provider and model
        let response;
        let cost = 0;

        if (selectedProvider === 'openai') {
            const openai = new OpenAI({ apiKey });
            const completion = await openai.chat.completions.create({
                model: documentAnalysisModel,
                messages,
                temperature: 0.7,
                max_tokens: Math.min(1000, maxTokens)
            });
            response = completion.choices[0].message.content;
            cost = calculateOpenAICost(completion.usage.prompt_tokens, completion.usage.completion_tokens);
        } else if (selectedProvider === 'anthropic') {
            const anthropic = new Anthropic({ apiKey });
            const completion = await anthropic.messages.create({
                model: documentAnalysisModel,
                max_tokens: Math.min(1000, maxTokens),
                messages: [
                    { role: 'user', content: messages[1].content }
                ]
            });
            response = completion.content[0].text;
            cost = calculateAnthropicCost(completion.usage.input_tokens, completion.usage.output_tokens);
        } else if (selectedProvider === 'google') {
            const genAI = new GoogleGenerativeAI(apiKey);
            const model = genAI.getGenerativeModel({ model: documentAnalysisModel });
            const result = await model.generateContent(messages[1].content);
            response = result.response.text();
            cost = calculateGoogleCost(result.usageMetadata.promptTokenCount, result.usageMetadata.candidatesTokenCount);
        }

        return {
            analysis: response,
            cost: cost
        };
    } catch (error) {
        console.error('Document processing error:', error);
        throw error;
    }
});

// Initialize spell checker
const dictionary = new Typo('en_US');

// Add spell check handler
ipcMain.handle('get-spell-suggestions', async (event, word) => {
  try {
    if (dictionary.check(word)) {
      return []; // Word is spelled correctly
    }
    return dictionary.suggest(word).slice(0, 5); // Return top 5 suggestions
  } catch (error) {
    console.error('Spell check error:', error);
    return [];
  }
});

// YouTube video summarization handler
ipcMain.handle('summarise-youtube-video', async (event, youtubeUrl, chatHistory) => {
    try {
        const userData = store.get('userData');
        const selectedProvider = store.get('selectedProvider') || 'openai';
        if (!userData || !userData[`${selectedProvider}ApiKey`]) {
            throw new Error(`${selectedProvider.charAt(0).toUpperCase() + selectedProvider.slice(1)} API key not found. Please set your API key in preferences.`);
        }

        // Create a temporary directory for the video and audio files
        const tempDir = path.join(os.tmpdir(), 'youtube-summary');
        try {
            // Clean up any existing temp directory first
            if (fs.existsSync(tempDir)) {
                fs.rmSync(tempDir, { recursive: true, force: true });
            }
            fs.mkdirSync(tempDir);
        } catch (error) {
            console.error('Error creating temporary directory:', error);
            throw new Error('Failed to create temporary directory for video processing');
        }

        // Get paths to executables
        const ytDlpPath = path.join(__dirname, 'yt-dlp.exe');
        const ffmpegPath = path.join(__dirname, 'ffmpeg.exe');

        // Check if required files exist
        if (!fs.existsSync(ytDlpPath)) {
            throw new Error('yt-dlp.exe not found');
        }
        if (!fs.existsSync(ffmpegPath)) {
            throw new Error('ffmpeg.exe not found');
        }

        // Download the video using yt-dlp
        const videoPath = path.join(tempDir, 'video.mp4');
        await new Promise((resolve, reject) => {
            execFile(ytDlpPath, [
                youtubeUrl,
                '-f', 'best[ext=mp4]/best',
                '-o', videoPath,
                '--no-check-certificate',
                '--no-warnings'
            ], (error, stdout, stderr) => {
                if (error) {
                    console.error('yt-dlp error:', error);
                    console.error('yt-dlp stderr:', stderr);
                    console.error('yt-dlp stdout:', stdout);
                    reject(new Error(stderr || error.message));
                } else {
                    resolve();
                }
            });
        });

        // Extract audio using ffmpeg
        const audioPath = path.join(tempDir, 'audio.mp3');
        await exec(`"${ffmpegPath}" -i "${videoPath}" -vn -acodec libmp3lame "${audioPath}"`);

        // Initialize OpenAI client
        const openai = new OpenAI({
            apiKey: userData[`${selectedProvider}ApiKey`]
        });

        // Transcribe audio using Whisper
        const transcription = await openai.audio.transcriptions.create({
            file: fs.createReadStream(audioPath),
            model: "whisper-1",
        });

        // Calculate Whisper cost (Whisper-1 costs $0.006 USD per minute)
        const audioDuration = await new Promise((resolve, reject) => {
            execFile(path.join(__dirname, 'ffprobe.exe'), [
                '-v', 'error',
                '-show_entries', 'format=duration',
                '-of', 'default=noprint_wrappers=1:nokey=1',
                audioPath
            ], (error, stdout, stderr) => {
                if (error) reject(error);
                else resolve(parseFloat(stdout));
            });
        });

        const whisperCostUSD = (audioDuration / 60) * 0.006;
        const whisperCostAUD = whisperCostUSD * await getPriceInAUD(whisperCostUSD);

        // Build context-aware prompt for summary
        let sessionSystemPrompt = store.get(`sessionSystemPrompt-${userData.email}`) || 'You are a helpful assistant that summarizes YouTube videos. Provide a concise but comprehensive summary of the video content.';
        let summaryPrompt = sessionSystemPrompt;
        if (chatHistory && Array.isArray(chatHistory) && chatHistory.length > 0) {
            const historyText = chatHistory.slice(-5).map(msg => `${msg.isUser ? 'User' : 'Assistant'}: ${msg.content}`).join('\n');
            summaryPrompt = `Previous conversation:\n${historyText}\n\n${sessionSystemPrompt}`;
        }

        // Generate summary using GPT
        const summary = await openai.chat.completions.create({
            model: "gpt-4",
            messages: [
                {
                    role: "system",
                    content: summaryPrompt
                },
                {
                    role: "user",
                    content: `Please summarize this YouTube video transcript:\n\n${transcription.text}`
                }
            ],
            temperature: 0.7,
            max_tokens: 500
        });

        // Calculate GPT cost
        const gptCostUSD = (summary.usage.total_tokens / 1000) * 0.03; // $0.03 USD per 1K tokens for GPT-4
        const gptCostAUD = gptCostUSD * await getPriceInAUD(gptCostUSD);

        // Clean up temporary files
        try {
            if (fs.existsSync(videoPath)) {
                fs.unlinkSync(videoPath);
            }
            if (fs.existsSync(audioPath)) {
                fs.unlinkSync(audioPath);
            }
            if (fs.existsSync(tempDir)) {
                fs.rmSync(tempDir, { recursive: true, force: true });
            }
        } catch (cleanupError) {
            console.error('Error cleaning up temporary files:', cleanupError);
            // Don't throw here as the main operation succeeded
        }

        return {
            summary: summary.choices[0].message.content,
            transcript: transcription.text,
            costs: {
                whisper: whisperCostAUD.toFixed(6),
                gpt: gptCostAUD.toFixed(6),
                total: (whisperCostAUD + gptCostAUD).toFixed(6)
            }
        };
    } catch (error) {
        console.error('Error summarizing YouTube video:', error);
        throw new Error('Failed to summarize YouTube video. Please check the URL and try again.');
    }
});

ipcMain.handle('analyze-image', async (event, fileName, fileData, prompt, chatHistory) => {
  try {
    const userData = store.get('userData');
    const selectedProvider = store.get('selectedProvider') || 'openai';
    const selectedModel = store.get('selectedModel') || 'gpt-4o';

    if (!userData || !userData[`${selectedProvider}ApiKey`]) {
      throw new Error(`${selectedProvider.charAt(0).toUpperCase() + selectedProvider.slice(1)} API key not found. Please set your API key in preferences.`);
    }

    // Validate image size (max 20MB)
    const imageBuffer = Buffer.from(new Uint8Array(fileData));
    if (imageBuffer.length > 20 * 1024 * 1024) {
      throw new Error('Image size exceeds 20MB limit. Please use a smaller image.');
    }

    // OpenAI Vision Models
    if (selectedProvider === 'openai') {
      const visionModels = ['gpt-4o', 'gpt-4-vision-preview'];
      if (!visionModels.includes(selectedModel)) {
        return { analysis: 'The selected model does not support image analysis. Please select GPT-4o or GPT-4 Vision.', cost: '0.000000', totalCost: '0.000000' };
      }

      const openai = new OpenAI({ apiKey: userData[`${selectedProvider}ApiKey`] });
      
      // Debug log before sending to OpenAI
      console.log('DEBUG: About to send to OpenAI vision API:', {
        model: selectedModel,
        prompt,
        imageLength: imageBuffer.length,
        imagePreview: imageBuffer.toString('base64').slice(0, 30)
      });

      let sessionSystemPrompt = store.get(`sessionSystemPrompt-${userData.email}`) || 'You are a helpful assistant that can analyze images and answer questions about them.';
      sessionSystemPrompt += ' Always answer the user\'s specific question.';

      const completion = await openai.chat.completions.create({
        model: selectedModel,
        messages: [
          { role: 'system', content: sessionSystemPrompt },
          { role: 'user', content: [
              { type: 'text', text: prompt || 'What is this image about?' },
              { type: 'image_url', image_url: { url: `data:image/png;base64,${imageBuffer.toString('base64')}` } }
            ]
          }
        ],
        max_tokens: 600,
        temperature: 0.3
      });

      // Debug log after receiving response from OpenAI
      console.log('DEBUG: OpenAI completion response:', completion);

      return {
        analysis: completion.choices[0].message.content,
        cost: completion.usage.total_tokens * 0.00001, // Approximate cost calculation
        totalCost: (completion.usage.total_tokens * 0.00001).toFixed(6)
      };
    }
    // Google Gemini Models
    else if (selectedProvider === 'google') {
      // Allow all Gemini models that support vision
      const supportedGeminiVisionModels = [
        'gemini-1.5-pro',
        'gemini-1.5-flash',
        'gemini-2.0-flash',
        'gemini-2.5-pro',
        'gemini-2.5-flash',
        'gemini-2.5-pro-preview-05-06',
        'gemini-2.5-flash-preview-05-20',
        'gemini-2.0-flash-lite',
        'gemini-1.5-flash-8b'
      ];
      if (!supportedGeminiVisionModels.some(m => selectedModel.startsWith(m))) {
        return { analysis: 'The selected Gemini model does not support image analysis. Please select a supported Gemini vision model.', cost: '0.000000', totalCost: '0.000000' };
      }

      const genAI = new GoogleGenerativeAI(userData.googleApiKey);
      // Use the selectedModel directly for Gemini
      const model = genAI.getGenerativeModel({ model: selectedModel });

      // Convert image to base64
      const imageBase64 = imageBuffer.toString('base64');
      const imageData = {
        inlineData: {
          data: imageBase64,
          mimeType: 'image/png'
        }
      };

      // Debug log before sending to Gemini
      console.log('DEBUG: About to send to Gemini API:', {
        model: selectedModel,
        prompt,
        imageLength: imageBuffer.length
      });

      const result = await model.generateContent([
        prompt || 'What is this image about?',
        imageData
      ]);
      const response = await result.response;
      const text = response.text();

      // Debug log after receiving response from Gemini
      console.log('DEBUG: Gemini completion response:', text);

      return {
        analysis: text,
        cost: '0.000000', // Gemini pricing is different, implement actual cost calculation
        totalCost: '0.000000'
      };
    }
    else {
      throw new Error('Unsupported provider for image analysis');
    }
  } catch (error) {
    console.error('Error in analyze-image:', error);
    throw error;
  }
});

// Handle image creation with DALL-E
ipcMain.handle('create-image', async (event, prompt, chatHistory) => {
  try {
    const userData = store.get('userData');
    const selectedProvider = store.get('selectedProvider') || 'openai';
    if (!userData || !userData[`${selectedProvider}ApiKey`]) {
      throw new Error(`${selectedProvider.charAt(0).toUpperCase() + selectedProvider.slice(1)} API key not found. Please set your API key in preferences.`);
    }
    const openai = new OpenAI({ apiKey: userData[`${selectedProvider}ApiKey`] });
    
    // Build context-aware prompt
    let fullPrompt = prompt;
    if (chatHistory && Array.isArray(chatHistory) && chatHistory.length > 0) {
      const historyText = chatHistory.slice(-5).map(msg => `${msg.isUser ? 'User' : 'Assistant'}: ${msg.content}`).join('\n');
      fullPrompt = `Previous conversation:\n${historyText}\n\nUser request: ${prompt}`;
    }
    let sessionSystemPrompt = store.get(`sessionSystemPrompt-${userData.email}`) || 'You are a helpful assistant that can analyze images and answer questions about them.';
    const response = await openai.images.generate({
      model: "dall-e-3",
      prompt: fullPrompt,
      n: 1,
      size: "1024x1024",
      quality: "standard",
      style: "natural"
    });

    // Calculate cost (DALL-E 3 costs $0.04 USD per image)
    const cost = 0.04 * await getPriceInAUD(0.04);
    const currentCost = store.get(`totalCost-${userData.email}`) || 0;
    store.set(`totalCost-${userData.email}`, currentCost + cost);

    return {
      imageUrl: response.data[0].url,
      cost: cost.toFixed(6),
      totalCost: (currentCost + cost).toFixed(6)
    };
  } catch (error) {
    console.error('Error creating image:', error);
    throw error;
  }
});

// Fetch available Gemini models for the user's API key
async function fetchAvailableGeminiModels(apiKey) {
    const url = `https://generativelanguage.googleapis.com/v1/models?key=${apiKey}`;
    try {
        const response = await fetch(url);
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${await response.text()}`);
        }
        const data = await response.json();
        if (data.models && Array.isArray(data.models)) {
            // Map to a simplified structure for the frontend
            return data.models.map(model => ({
                id: model.name,
                description: model.description || '',
                inputTypes: model.inputTokenLimit ? ['text'] : [], // You can expand this based on model details
                outputTypes: model.outputTokenLimit ? ['text'] : [],
                ...model
            }));
        } else {
            return [];
        }
    } catch (error) {
        console.error('Error fetching Gemini models:', error);
        return [];
    }
}

// IPC handler to get available Gemini models for the current user
ipcMain.handle('getGoogleGeminiModels', async () => {
    const userData = store.get('userData') || {};
    const apiKey = userData.googleApiKey;
    if (!apiKey) return [];
    return await fetchAvailableGeminiModels(apiKey);
});

// Add handler for getting personas
ipcMain.handle('get-personas', async () => {
  return store.get('personas') || [];
});

ipcMain.handle('update-persona', async (event, id, title, prompt, temperature) => {
  let personas = store.get('personas') || [];
  personas = personas.map(p => p.id === id ? { ...p, title, prompt, temperature } : p);
  store.set('personas', personas);
  return personas.find(p => p.id === id);
});

ipcMain.handle('web-search', async (event, query, chatHistory) => {
  try {
    const serpApiKey = process.env.SERPAPI_API_KEY;
    if (!serpApiKey) {
      throw new Error('SERPAPI_API_KEY is not configured');
    }

    const search = new GoogleSearch(serpApiKey);
    const params = {
      engine: "google",
      q: query,
      google_domain: "google.com.au",
      gl: "au",
      hl: "en"
    };

    const results = await new Promise((resolve, reject) => {
      search.json(params, (data) => resolve(data));
    });
    
    // Format the results
    const formattedResults = {
      organic_results: results.organic_results?.map(result => ({
        title: result.title,
        link: result.link,
        snippet: result.snippet
      })) || [],
      knowledge_graph: results.knowledge_graph ? {
        title: results.knowledge_graph.title,
        description: results.knowledge_graph.description,
        source: results.knowledge_graph.source?.link
      } : null
    };

    return formattedResults;
  } catch (error) {
    console.error('Web search error:', error);
    throw error;
  }
});