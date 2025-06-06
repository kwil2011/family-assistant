import { TextEncoder, TextDecoder } from 'util';

// Mock Electron's ipcRenderer
global.ipcRenderer = {
  invoke: jest.fn(),
  on: jest.fn(),
  removeListener: jest.fn(),
};

// Mock Electron's desktopCapturer
global.desktopCapturer = {
  getSources: jest.fn(),
};

// Mock TextEncoder and TextDecoder for tests
global.TextEncoder = TextEncoder;
global.TextDecoder = TextDecoder;

// Mock Electron's contextBridge
global.contextBridge = {
  exposeInMainWorld: jest.fn(),
};

// Mock window.electronAPI
global.window = {
  electronAPI: {
    chatMessage: jest.fn(),
    storeGet: jest.fn(),
    storeSet: jest.fn(),
    storeDelete: jest.fn(),
    summarizeChat: jest.fn(),
    exportChat: jest.fn(),
    refocusWindow: jest.fn(),
    takeScreenshot: jest.fn(),
    processDocument: jest.fn(),
    getSpellSuggestions: jest.fn(),
    summariseYoutubeVideo: jest.fn(),
    analyzeImage: jest.fn(),
    webSearch: jest.fn(),
    createImage: jest.fn(),
    transcribeAudio: jest.fn(),
    textToSpeech: jest.fn(),
    getDailyCost: jest.fn(),
    onDailyCostWarning: jest.fn(),
    testEmailNotification: jest.fn(),
    getPersonas: jest.fn(),
  },
} as any; 