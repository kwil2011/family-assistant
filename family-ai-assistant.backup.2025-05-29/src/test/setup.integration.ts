import { app, BrowserWindow } from 'electron';
import path from 'path';

// Mock the window object and electronAPI
(global as any).window = {
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
  },
};

// Mock app ready state
beforeAll(() => {
  app.isReady = jest.fn().mockReturnValue(true);
});

// Clean up after tests
afterAll(() => {
  jest.clearAllMocks();
});

// Create a new window for each test
let mainWindow: BrowserWindow;

beforeEach(async () => {
  mainWindow = new BrowserWindow({
    width: 800,
    height: 600,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: true,
      preload: path.join(__dirname, '../../preload.js'),
    },
  });
  await mainWindow.loadFile(path.join(__dirname, '../../dist/index.html'));
});

afterEach(async () => {
  await mainWindow.close();
}); 