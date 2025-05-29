import { test, expect } from '@playwright/test';
import { _electron as electron } from 'playwright';
import { waitForResponse } from './setup';

test.describe('Chat History and Summarization', () => {
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

  test('should maintain chat history across messages', async () => {
    // Send first message
    const chatInput = await window.locator('[data-testid="chat-input"]');
    await chatInput.fill('First message');
    const sendButton = await window.locator('[data-testid="send-button"]');
    await sendButton.click();
    await waitForResponse(window, 'chat-message');

    // Send second message
    await chatInput.fill('Second message');
    await sendButton.click();
    await waitForResponse(window, 'chat-message');

    // Verify both messages are in history
    const chatHistory = await window.locator('[data-testid="chat-history"]');
    const historyText = await chatHistory.textContent();
    expect(historyText).toContain('First message');
    expect(historyText).toContain('Second message');
  });

  test('should summarize chat history', async () => {
    const chatInput = await window.locator('[data-testid="chat-input"]');
    const sendButton = await window.locator('[data-testid="send-button"]');
    
    // Send multiple messages to create history
    const messages = ['Message 1', 'Message 2', 'Message 3'];
    for (const message of messages) {
      await chatInput.fill(message);
      await sendButton.click();
      await waitForResponse(window, 'chat-message');
    }

    // Click summarize button
    const summarizeButton = await window.locator('[data-testid="summarize-button"]');
    await summarizeButton.click();
    await waitForResponse(window, 'summarize-chat');

    // Wait for and verify summary
    const summary = await window.locator('[data-testid="chat-summary"]');
    const summaryText = await summary.textContent();
    expect(summaryText).toBeTruthy();
    expect(summaryText.length).toBeGreaterThan(0);
  });

  test('should export chat history', async () => {
    const chatInput = await window.locator('[data-testid="chat-input"]');
    const sendButton = await window.locator('[data-testid="send-button"]');
    
    // Send some messages
    await chatInput.fill('Test message for export');
    await sendButton.click();
    await waitForResponse(window, 'chat-message');

    // Click export button
    const exportButton = await window.locator('[data-testid="export-button"]');
    await exportButton.click();

    // Verify export dialog appears
    const exportDialog = await window.locator('[data-testid="export-dialog"]');
    await expect(exportDialog).toBeVisible();

    // Select export format and confirm
    const pdfFormat = await window.locator('[data-testid="export-format-pdf"]');
    await pdfFormat.click();
    const confirmExport = await window.locator('[data-testid="confirm-export-button"]');
    await confirmExport.click();
    await waitForResponse(window, 'export-chat');

    // Verify success message
    const successMessage = await window.locator('[data-testid="export-success-message"]');
    await expect(successMessage).toBeVisible();
  });

  test('should clear chat history', async () => {
    const chatInput = await window.locator('[data-testid="chat-input"]');
    const sendButton = await window.locator('[data-testid="send-button"]');
    
    // Send a message
    await chatInput.fill('Message to be cleared');
    await sendButton.click();
    await waitForResponse(window, 'chat-message');

    // Click clear history button
    const clearButton = await window.locator('[data-testid="clear-history-button"]');
    await clearButton.click();

    // Confirm clearing
    const confirmClear = await window.locator('[data-testid="confirm-clear-button"]');
    await confirmClear.click();

    // Verify history is empty
    const chatHistory = await window.locator('[data-testid="chat-history"]');
    const historyText = await chatHistory.textContent();
    expect(historyText).not.toContain('Message to be cleared');
  });
}); 