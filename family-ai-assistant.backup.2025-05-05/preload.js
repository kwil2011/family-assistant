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

    // Chat operations
    chatMessage: (message, model, temperature) => ipcRenderer.invoke('chat-message', message, model, temperature),
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
    processDocument: (fileName, fileData, prompt) => {
      console.log('Preload: processDocument called with:', fileName, fileData?.length, prompt);
      return ipcRenderer.invoke('process-document', fileName, fileData, prompt);
    },
    getSpellSuggestions: (word) => ipcRenderer.invoke('get-spell-suggestions', word),
    summariseYoutubeVideo: (youtubeUrl) => ipcRenderer.invoke('summarise-youtube-video', youtubeUrl),
    analyzeImage: (fileName, fileData, prompt) => ipcRenderer.invoke('analyze-image', fileName, fileData, prompt),
    webSearch: (query) => ipcRenderer.invoke('web-search', query),
    createImage: (prompt) => ipcRenderer.invoke('create-image', prompt),
    transcribeAudio: (audioData) => ipcRenderer.invoke('transcribe-audio', audioData),
    textToSpeech: (text) => ipcRenderer.invoke('text-to-speech', text)
  }
); 