import { test, expect } from '@playwright/test';
import { _electron as electron } from 'playwright';
import path from 'path';

test.describe('Document Processing', () => {
  test('should process a PDF document', async () => {
    const app = await electron.launch({ args: ['.'] });
    const window = await app.firstWindow();
    
    // Open document processing dialog
    const processButton = await window.waitForSelector('[data-testid="process-document-button"]');
    await processButton.click();
    
    // Select PDF file
    const fileInput = await window.waitForSelector('[data-testid="document-file-input"]');
    await fileInput.setInputFiles(path.join(__dirname, '../../../test.pdf'));
    
    // Enter processing prompt
    await window.fill('[data-testid="document-prompt-input"]', 'Summarize this document');
    
    // Start processing
    await window.click('[data-testid="start-processing-button"]');
    
    // Wait for and verify results
    const results = await window.waitForSelector('[data-testid="processing-results"]');
    expect(await results.textContent()).toBeTruthy();
    await app.close();
  });

  test('should process an Excel document', async () => {
    const app = await electron.launch({ args: ['.'] });
    const window = await app.firstWindow();
    
    // Open document processing dialog
    const processButton = await window.waitForSelector('[data-testid="process-document-button"]');
    await processButton.click();
    
    // Select Excel file
    const fileInput = await window.waitForSelector('[data-testid="document-file-input"]');
    await fileInput.setInputFiles(path.join(__dirname, '../../../test.xlsx'));
    
    // Enter processing prompt
    await window.fill('[data-testid="document-prompt-input"]', 'Analyze this spreadsheet');
    
    // Start processing
    await window.click('[data-testid="start-processing-button"]');
    
    // Wait for and verify results
    const results = await window.waitForSelector('[data-testid="processing-results"]');
    expect(await results.textContent()).toBeTruthy();
    await app.close();
  });

  test('should handle invalid document format', async () => {
    const app = await electron.launch({ args: ['.'] });
    const window = await app.firstWindow();
    
    // Open document processing dialog
    const processButton = await window.waitForSelector('[data-testid="process-document-button"]');
    await processButton.click();
    
    // Select invalid file
    const fileInput = await window.waitForSelector('[data-testid="document-file-input"]');
    await fileInput.setInputFiles(path.join(__dirname, '../../../test.txt'));
    
    // Verify error message
    const errorMessage = await window.waitForSelector('[data-testid="error-message"]');
    expect(await errorMessage.textContent()).toContain('Unsupported file format');
    await app.close();
  });
}); 