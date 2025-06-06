const { test, expect } = require('@playwright/test');
const testData = require('../__fixtures__/testData');

test.describe('Chat Interface', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to the chat page
    await page.goto('http://localhost:3000');
  });

  test('should send and receive messages', async ({ page }) => {
    // Type a message
    await page.fill('#messageInput', testData.messages[0].content);
    
    // Click send button
    await page.click('#sendButton');
    
    // Wait for response
    await page.waitForSelector('.message-response');
    
    // Verify message was sent
    const sentMessage = await page.textContent('.message-user');
    expect(sentMessage).toContain(testData.messages[0].content);
    
    // Verify response was received
    const response = await page.textContent('.message-response');
    expect(response).toBeTruthy();
  });

  test('should handle model selection', async ({ page }) => {
    // Open model selection modal
    await page.click('#modelButton');
    
    // Select GPT-4 Turbo
    await page.click('[data-model="gpt-4-turbo"]');
    
    // Verify model was selected
    const selectedModel = await page.textContent('#selectedModel');
    expect(selectedModel).toContain('GPT-4 Turbo');
  });

  test('should handle document upload', async ({ page }) => {
    // Click document upload button
    await page.click('#fileButton');
    
    // Upload a test document
    const fileInput = await page.$('input[type="file"]');
    await fileInput.setInputFiles({
      name: testData.documents.pdf.name,
      mimeType: testData.documents.pdf.type,
      buffer: Buffer.from('test content')
    });
    
    // Verify document was uploaded
    const uploadStatus = await page.textContent('#uploadStatus');
    expect(uploadStatus).toContain('Document uploaded successfully');
  });

  test('should save and load chat history', async ({ page }) => {
    // Send a message
    await page.fill('#messageInput', testData.messages[0].content);
    await page.click('#sendButton');
    
    // Refresh the page
    await page.reload();
    
    // Verify message history is preserved
    const messageHistory = await page.textContent('.message-history');
    expect(messageHistory).toContain(testData.messages[0].content);
  });
}); 