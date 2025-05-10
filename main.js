const fs = require('fs');
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
const path = require('path');
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
const SerpApi = require('google-search-results-nodejs');
const ExcelJS = require('exceljs');
const { v4: uuidv4 } = require('uuid');

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
    'gpt-3.5-turbo': {
        maxTokens: 2000,
        temperature: 0.3,
        pricePerTokenUSD: 0.0015 / 1000, // $0.0015 USD per 1K tokens
        validateResponse: true
    },
    'gpt-4-turbo': {
        maxTokens: 4000,
        temperature: 0.3,
        pricePerTokenUSD: 0.01 / 1000, // $0.01 USD per 1K tokens
        validateResponse: true
    },
    'gpt-4o': {
        maxTokens: 8000,
        temperature: 0.3,
        pricePerTokenUSD: 0.005 / 1000, // $0.005 USD per 1K tokens
        validateResponse: true
    },
    'gpt-4-vision-preview': {
        maxTokens: 4000,
        temperature: 0.3,
        pricePerTokenUSD: 0.03 / 1000, // $0.03 USD per 1K tokens
        validateResponse: true
    }
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

            if (!content || content.trim().length === 0) {
                throw new Error('No content could be extracted from the document');
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

        // Build context-aware prompt
        let fullPrompt = prompt || 'Please analyze this document and provide a summary of its contents.';
        if (chatHistory && Array.isArray(chatHistory) && chatHistory.length > 0) {
            const historyText = chatHistory.slice(-5).map(msg => `${msg.isUser ? 'User' : 'Assistant'}: ${msg.content}`).join('\n');
            fullPrompt = `Previous conversation:\n${historyText}\n\nUser request: ${prompt}`;
        }
        const messages = [
            { role: 'system', content: 'You are a helpful AI assistant that analyzes documents and answers questions about them.' },
            { role: 'user', content: `Document content:\n${content}\n\n${fullPrompt}` }
        ];

        // Call the appropriate API based on the selected provider
        let response;
        let cost = 0;

        if (selectedProvider === 'openai') {
            const openai = new OpenAI({ apiKey });
            const completion = await openai.chat.completions.create({
                model: 'gpt-4-turbo',
                messages,
                temperature: 0.7,
                max_tokens: 1000
            });
            response = completion.choices[0].message.content;
            cost = calculateOpenAICost(completion.usage.prompt_tokens, completion.usage.completion_tokens);
        } else if (selectedProvider === 'anthropic') {
            const anthropic = new Anthropic({ apiKey });
            const completion = await anthropic.messages.create({
                model: 'claude-3-sonnet-20240229',
                max_tokens: 1000,
                messages: [
                    { role: 'user', content: messages[1].content }
                ]
            });
            response = completion.content[0].text;
            cost = calculateAnthropicCost(completion.usage.input_tokens, completion.usage.output_tokens);
        } else if (selectedProvider === 'google') {
            const genAI = new GoogleGenerativeAI(apiKey);
            const model = genAI.getGenerativeModel({ model: 'gemini-pro' });
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
        let summaryPrompt = 'You are a helpful assistant that summarizes YouTube videos. Provide a concise but comprehensive summary of the video content.';
        if (chatHistory && Array.isArray(chatHistory) && chatHistory.length > 0) {
            const historyText = chatHistory.slice(-5).map(msg => `${msg.isUser ? 'User' : 'Assistant'}: ${msg.content}`).join('\n');
            summaryPrompt = `Previous conversation:\n${historyText}\n\n${summaryPrompt}`;
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

    // OpenAI Vision Models
    if (selectedProvider === 'openai') {
      const visionModels = ['gpt-4o', 'gpt-4-vision-preview'];
      if (!visionModels.includes(selectedModel)) {
        return { analysis: 'The selected model does not support image analysis. Please select GPT-4o or GPT-4 Vision.', cost: '0.000000', totalCost: '0.000000' };
      }
      const openai = new OpenAI({ apiKey: userData[`${selectedProvider}ApiKey`] });
      const imageBuffer = Buffer.from(new Uint8Array(fileData));
      // Debug log before sending to OpenAI
      console.log('DEBUG: About to send to OpenAI vision API:', {
        model: selectedModel,
        prompt,
        imageLength: imageBuffer.length,
        imagePreview: imageBuffer.toString('base64').slice(0, 30)
      });
      const completion = await openai.chat.completions.create({
        model: selectedModel,
        messages: [
          { role: 'system', content: 'You are a helpful assistant that can analyze images and answer questions about them.' },
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
      // Calculate cost
      const totalTokens = completion.usage.total_tokens;
      const pricePerToken = (0.005 / 1000) * await getPriceInAUD(0.005); // $0.005 USD per 1K tokens for gpt-4o
      const cost = totalTokens * pricePerToken;
      const currentCost = store.get(`totalCost-${userData.email}`) || 0;
      store.set(`totalCost-${userData.email}`, currentCost + cost);
      return {
        analysis: completion.choices[0].message.content,
        cost: cost.toFixed(6),
        totalCost: (currentCost + cost).toFixed(6)
      };
    }
    // Anthropic Vision Models (Claude 3)
    else if (selectedProvider === 'anthropic') {
      const visionModels = ['claude-3-opus', 'claude-3-sonnet', 'claude-3-haiku'];
      if (!visionModels.includes(selectedModel)) {
        return { analysis: 'The selected Anthropic model does not support image analysis. Please select Claude 3 Opus, Sonnet, or Haiku.', cost: '0.000000', totalCost: '0.000000' };
      }
      // Placeholder: Implement Anthropic Claude 3 vision API call here
      // Example: Use anthropic SDK or HTTP call to Claude 3 with image and prompt
      return { analysis: 'Anthropic vision support is not yet implemented. Please use OpenAI or check back soon.', cost: '0.000000', totalCost: '0.000000' };
    }
    // Google Gemini Vision Models
    else if (selectedProvider === 'google') {
      const visionModels = ['gemini-1.5-pro'];
      if (!visionModels.includes(selectedModel)) {
        return { analysis: 'The selected Google model does not support image analysis. Please select Gemini 1.5 Pro.', cost: '0.000000', totalCost: '0.000000' };
      }
      // Placeholder: Implement Google Gemini vision API call here
      // Example: Use Google SDK or HTTP call to Gemini with image and prompt
      return { analysis: 'Google Gemini vision support is not yet implemented. Please use OpenAI or check back soon.', cost: '0.000000', totalCost: '0.000000' };
    }
    // Other providers (Cohere, Meta, Mistral, etc.)
    else {
      return { analysis: 'Image analysis is only supported for OpenAI, Anthropic (Claude 3), and Google Gemini vision models at this time.', cost: '0.000000', totalCost: '0.000000' };
    }
  } catch (err) {
    console.error('Image analysis error:', err);
    return { analysis: 'Sorry, there was an error analyzing the image.', cost: '0.000000', totalCost: '0.000000' };
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
  } catch (err) {
    console.error('Image creation error:', err);
    return { error: 'Sorry, there was an error creating the image.', cost: '0.000000', totalCost: '0.000000' };
  }
});

// Removed invalid browser/DevTools code from main.js 

// Removed debug function and all calls to debug() from main.js 

// console.log('DOMContentLoaded handler started'); 

// Initialize SerpAPI client
let serpApiClient;
try {
    if (process.env.SERPAPI_API_KEY) {
        serpApiClient = new SerpApi.GoogleSearch(process.env.SERPAPI_API_KEY);
        console.log('Initializing SerpAPI client...');
    } else {
        console.error('SERPAPI_API_KEY not found in environment variables');
    }
} catch (error) {
    console.error('Error initializing SerpAPI client:', error);
}

// Web search handler
ipcMain.handle('web-search', async (event, query, chatHistory) => {
    try {
        if (!serpApiClient) {
            throw new Error('SerpAPI client not initialized. Please check your SERPAPI_API_KEY in .env file');
        }

        console.log('Performing web search for query:', query);

        // Wrap the callback API in a Promise
        const results = await new Promise((resolve, reject) => {
            serpApiClient.json({
                q: query,
                engine: "google",
                num: 5,
                api_key: process.env.SERPAPI_API_KEY
            }, (data) => {
                if (!data) {
                    reject(new Error('No response received from SerpAPI.'));
                } else {
                    resolve(data);
                }
            });
        });

        // Log the full response for debugging
        console.log('Web search full response:', JSON.stringify(results, null, 2));

        if (!results.organic_results || results.organic_results.length === 0) {
            throw new Error('No search results found. The query might be too specific or the API quota might be exceeded.');
        }

        // If you want to use chatHistory for context-aware web search, you can log or use it here.
        if (chatHistory && Array.isArray(chatHistory) && chatHistory.length > 0) {
            console.log('Context-aware web search, recent chat history:', chatHistory.slice(-5));
        }

        return results.organic_results.map(result => ({
            title: result.title,
            snippet: result.snippet,
            link: result.link
        }));
    } catch (error) {
        console.error('Web search error:', error);
        throw new Error(`Web search failed: ${error.message}`);
    }
});

// IPC Handlers
ipcMain.handle('update-exchange-rate', async () => {
    return await getExchangeRate();
});

ipcMain.handle('get-current-exchange-rate', async () => {
    return currentExchangeRate || await getExchangeRate();
});

ipcMain.handle('export-chat', async (event, messages) => {
    try {
        const { dialog } = require('electron');
        const fs = require('fs');
        const path = require('path');
        const os = require('os');

        // Create a timestamp for the filename
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const defaultPath = path.join(os.homedir(), `chat-export-${timestamp}.txt`);

        // Show save dialog
        const { filePath } = await dialog.showSaveDialog(mainWindow, {
            title: 'Export Chat',
            defaultPath: defaultPath,
            filters: [
                { name: 'Text Files', extensions: ['txt'] },
                { name: 'All Files', extensions: ['*'] }
            ]
        });

        if (!filePath) {
            throw new Error('Export cancelled by user');
        }

        // Write the messages to the file
        fs.writeFileSync(filePath, messages, 'utf8');
        return { success: true, path: filePath };
    } catch (error) {
        console.error('Error exporting chat:', error);
        throw error;
    }
});

// Transcription handler
ipcMain.handle('transcribe-audio', async (event, audioData, chatHistory) => {
    console.log('[Main] Received audio data for transcription:', audioData ? audioData.length : 'No data');
    try {
        // Get user data and selected provider
        const userData = store.get('userData');
        const selectedProvider = store.get('selectedProvider') || 'openai';
        console.log('[Main] User data:', userData);
        console.log('[Main] Selected provider:', selectedProvider);
        
        if (!userData || !userData[`${selectedProvider}ApiKey`]) {
            console.error('[Main] API key not found for provider:', selectedProvider);
            throw new Error(`${selectedProvider.charAt(0).toUpperCase() + selectedProvider.slice(1)} API key not found. Please set your API key in preferences.`);
        }

        // Initialize OpenAI client
        const openai = new OpenAI({ apiKey: userData[`${selectedProvider}ApiKey`] });
        console.log('[Main] OpenAI client initialized');
        
        // Create a temporary file for the audio
        const tempDir = os.tmpdir();
        const audioPath = path.join(tempDir, `audio-${Date.now()}.webm`);
        fs.writeFileSync(audioPath, Buffer.from(audioData));
        
        // Call Whisper API
        const response = await openai.audio.transcriptions.create({
            file: fs.createReadStream(audioPath),
            model: 'whisper-1',
            response_format: 'text',
        });
        console.log('[Main] Whisper API response:', response);
        
        // Clean up temporary file
        fs.unlinkSync(audioPath);
        
        // Calculate and update cost (Whisper-1 costs $0.006 USD per minute)
        const cost = 0.006; // Assuming 1 minute of audio
        const costAUD = cost * await getPriceInAUD(cost);
        updateSessionCost(costAUD);
        
        // If you want to use chatHistory for follow-up context, you can store it or return it with the transcription for further use.
        // For now, just accept and log it for future context-aware features.
        if (chatHistory && Array.isArray(chatHistory) && chatHistory.length > 0) {
            console.log('Context-aware transcription, recent chat history:', chatHistory.slice(-5));
        }
        
        return response || null;
    } catch (error) {
        console.error('[Main] Error in transcription handler:', error);
        return null;
    }
});

// Text-to-speech handler
ipcMain.handle('text-to-speech', async (event, text, chatHistory) => {
    console.log('[Main] Received text for TTS:', text);
    try {
        // Get user data and selected provider
        const userData = store.get('userData');
        const selectedProvider = store.get('selectedProvider') || 'openai';
        console.log('[Main] User data:', userData);
        console.log('[Main] Selected provider:', selectedProvider);
        
        if (!userData || !userData[`${selectedProvider}ApiKey`]) {
            console.error('[Main] API key not found for provider:', selectedProvider);
            throw new Error(`${selectedProvider.charAt(0).toUpperCase() + selectedProvider.slice(1)} API key not found. Please set your API key in preferences.`);
        }

        // Initialize OpenAI client
        const openai = new OpenAI({ apiKey: userData[`${selectedProvider}ApiKey`] });
        console.log('[Main] OpenAI client initialized');
        
        // Call TTS API
        const response = await openai.audio.speech.create({
            model: "tts-1",
            voice: "alloy",
            input: text,
        });
        console.log('[Main] TTS API response:', response);
        
        // Get the audio data as a buffer
        const audioBuffer = await response.arrayBuffer();
        
        // Calculate and update cost (TTS costs $0.015 USD per 1K characters)
        const cost = (text.length / 1000) * 0.015;
        const costAUD = cost * await getPriceInAUD(cost);
        updateSessionCost(costAUD);
        
        // If you want to use chatHistory for context-aware TTS, you can log or use it here.
        if (chatHistory && Array.isArray(chatHistory) && chatHistory.length > 0) {
            console.log('Context-aware TTS, recent chat history:', chatHistory.slice(-5));
        }
        
        return Buffer.from(audioBuffer);
    } catch (error) {
        console.error('[Main] Error in TTS handler:', error);
        return null;
    }
});

// Helper function to update session cost
async function updateSessionCost(cost) {
    const currentCost = parseFloat(store.get('sessionCost') || '0');
    const newCost = currentCost + cost;
    store.set('sessionCost', newCost.toFixed(6));
    return newCost;
}

// Persona Management IPC Handlers
ipcMain.handle('get-personas', async () => {
  return store.get('personas') || [];
});
ipcMain.handle('create-persona', async (event, title, prompt, temperature) => {
  const personas = store.get('personas') || [];
  const newPersona = {
    id: uuidv4(),
    title,
    prompt,
    temperature
  };
  personas.push(newPersona);
  store.set('personas', personas);
  return newPersona;
});
ipcMain.handle('update-persona', async (event, id, title, prompt, temperature) => {
  let personas = store.get('personas') || [];
  personas = personas.map(p => p.id === id ? { ...p, title, prompt, temperature } : p);
  store.set('personas', personas);
  return personas.find(p => p.id === id);
});
ipcMain.handle('delete-persona', async (event, id) => {
  let personas = store.get('personas') || [];
  personas = personas.filter(p => p.id !== id);
  store.set('personas', personas);
  return true;
});

// Add this near other IPC handlers
ipcMain.handle('clear-session-system-prompt', async (event) => {
  const userData = store.get('userData');
  if (userData && userData.email) {
    store.delete(`sessionSystemPrompt-${userData.email}`);
  }
  return true;
}); 