import { test, expect } from '@playwright/test';
import { _electron as electron } from 'playwright';

// NOTE: These tests require your app to use data-testid attributes as referenced below.
test.describe('Chat Functionality', () => {
  let app;
  let window;

  test.beforeEach(async () => {
    app = await electron.launch({ args: ['.'] });
    window = await app.firstWindow();
    // Wait for the app to be ready
    await window.waitForLoadState('domcontentloaded');
    await window.waitForLoadState('networkidle');
  });

  test.afterEach(async () => {
    await app?.close();
  });

  test('should send and receive chat messages', async () => {
    // Wait for the chat input to be ready
    const chatInput = await window.waitForSelector('[data-testid="chat-input"]', { timeout: 10000 });
    expect(chatInput).toBeTruthy();
    
    // Type a message
    await chatInput.type('Hello, AI Assistant');
    
    // Click the send button
    const sendButton = await window.waitForSelector('[data-testid="send-button"]', { timeout: 10000 });
    expect(sendButton).toBeTruthy();
    await sendButton.click();
    
    // Wait for the response
    const response = await window.waitForSelector('[data-testid="chat-message"]', { timeout: 30000 });
    expect(response).toBeTruthy();
    expect(await response.textContent()).toBeTruthy();
  });

  test('should handle persona selection', async () => {
    // Open persona selection
    const personaButton = await window.waitForSelector('[data-testid="persona-selector"]', { timeout: 10000 });
    expect(personaButton).toBeTruthy();
    await personaButton.click();
    
    // Select a persona
    const personaOption = await window.waitForSelector('[data-testid="persona-option"]', { timeout: 10000 });
    expect(personaOption).toBeTruthy();
    await personaOption.click();
    
    // Verify the persona was selected
    const selectedPersona = await window.waitForSelector('[data-testid="selected-persona"]', { timeout: 10000 });
    expect(selectedPersona).toBeTruthy();
    expect(await selectedPersona.textContent()).toBeTruthy();
  });
}); 