import { BrowserWindow } from 'electron';
import path from 'path';

// Mock data for testing
export const mockProviders = [
  {
    id: 'openai',
    name: 'OpenAI',
    models: [
      {
        id: 'gpt-4',
        name: 'GPT-4',
        maxTokens: 8192,
        temperature: 0.7,
        pricePerTokenUSD: 0.0001
      }
    ]
  }
];

export const mockChatHistory = [
  { role: 'user', content: 'Hello' },
  { role: 'assistant', content: 'Hi there!' }
];

// Helper to create a test window
export async function createTestWindow() {
  const window = new BrowserWindow({
    width: 800,
    height: 600,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: true,
      preload: path.join(__dirname, '../../preload.js')
    }
  });
  await window.loadFile(path.join(__dirname, '../../dist/index.html'));
  return window;
}

// Helper to wait for API response
export async function waitForResponse(window: any, urlPattern: string) {
  return window.waitForResponse(response => response.url().includes(urlPattern));
}

// Helper to mock API responses
export function mockAPIResponse(mock: jest.Mock, response: any) {
  mock.mockResolvedValue(response);
}

// Helper to mock API errors
export function mockAPIError(mock: jest.Mock, error: Error) {
  mock.mockRejectedValue(error);
}

// Helper to create test files
export function createTestFile(content: string, extension: string) {
  const buffer = Buffer.from(content);
  return {
    name: `test.${extension}`,
    data: buffer
  };
}

// Helper to check if element exists
export async function elementExists(window: any, selector: string) {
  try {
    await window.waitForSelector(selector, { timeout: 1000 });
    return true;
  } catch {
    return false;
  }
}

// Helper to get element text
export async function getElementText(window: any, selector: string) {
  const element = await window.waitForSelector(selector);
  return element.textContent();
}

// Helper to simulate user input
export async function typeText(window: any, selector: string, text: string) {
  const element = await window.waitForSelector(selector);
  await element.type(text);
}

// Helper to click element
export async function clickElement(window: any, selector: string) {
  const element = await window.waitForSelector(selector);
  await element.click();
} 