const { contextBridge, ipcRenderer, desktopCapturer } = require('electron');
const path = require('path');
const fs = require('fs');

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld(
  'electronAPI',
  {
    // Store operations
    storeGet: (key) => ipcRenderer.invoke('store-get', key),
    storeSet: (key, value) => ipcRenderer.invoke('store-set', key, value),
    storeDelete: (key) => ipcRenderer.invoke('store-delete', key),

    // Provider API Key Management
    getProviderApiKey: (providerId) => ipcRenderer.invoke('getProviderApiKey', providerId),
    setProviderApiKey: (providerId, apiKey) => ipcRenderer.invoke('setProviderApiKey', providerId, apiKey),
    getAllProvidersAndModels: () => ipcRenderer.invoke('getAllProvidersAndModels'),

    // Chat operations
    chatMessage: (message, model, temperature, chatHistory) => ipcRenderer.invoke('chat-message', message, model, temperature, chatHistory),
    summarizeChat: (chatHistory) => ipcRenderer.invoke('summarize-chat', chatHistory),
    exportChat: (messages) => ipcRenderer.invoke('export-chat', messages),

    // Window operations
    refocusWindow: () => ipcRenderer.invoke('refocus-window'),
    takeScreenshot: async () => {
      const sources = await desktopCapturer.getSources({ types: ['window', 'screen'] });
      let source = sources.find(s => s.name === document.title) || sources[0];
      if (!source) throw new Error('Could not find a window to capture.');
      return source.thumbnail.toDataURL();
    },

    // Document and media operations
    processDocument: (fileName, fileData, prompt, chatHistory) => {
      console.log('Preload: processDocument called with:', fileName, fileData?.length, prompt);
      return ipcRenderer.invoke('process-document', fileName, fileData, prompt, chatHistory);
    },
    getSpellSuggestions: (word) => ipcRenderer.invoke('get-spell-suggestions', word),
    summariseYoutubeVideo: (youtubeUrl, chatHistory) => ipcRenderer.invoke('summarise-youtube-video', youtubeUrl, chatHistory),
    analyzeImage: (fileName, fileData, prompt, chatHistory) => ipcRenderer.invoke('analyze-image', fileName, fileData, prompt, chatHistory),
    webSearch: (query, chatHistory) => ipcRenderer.invoke('web-search', query, chatHistory),
    createImage: (prompt, chatHistory, model) => ipcRenderer.invoke('create-image', prompt, chatHistory, model),
    transcribeAudio: (audioData, chatHistory) => ipcRenderer.invoke('transcribe-audio', audioData, chatHistory),
    textToSpeech: (text, chatHistory) => ipcRenderer.invoke('text-to-speech', text, chatHistory),
    createPersona: (title, prompt, temperature) => ipcRenderer.invoke('create-persona', title, prompt, temperature),
    updatePersona: (id, title, prompt, temperature) => ipcRenderer.invoke('update-persona', id, title, prompt, temperature),
    deletePersona: (id) => ipcRenderer.invoke('delete-persona', id),
    getPersonas: () => ipcRenderer.invoke('get-personas'),

    // Environment Variables
    getEnvironmentVariables: () => ipcRenderer.invoke('getEnvironmentVariables'),
    updateEnvironmentVariables: (envVars) => ipcRenderer.invoke('updateEnvironmentVariables', envVars)
  }
); 