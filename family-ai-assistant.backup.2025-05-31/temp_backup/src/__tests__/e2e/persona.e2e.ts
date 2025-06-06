import { test, expect } from '@playwright/test';
import { _electron as electron } from 'playwright';

test.describe('Persona Management', () => {
  test('should create a new persona', async () => {
    const app = await electron.launch({ args: ['.'] });
    const window = await app.firstWindow();
    
    // Open persona creation dialog
    const createButton = await window.waitForSelector('[data-testid="create-persona-button"]');
    await createButton.click();
    
    // Fill in persona details
    await window.fill('[data-testid="persona-title-input"]', 'Test Persona');
    await window.fill('[data-testid="persona-prompt-input"]', 'You are a helpful test assistant');
    await window.fill('[data-testid="persona-temperature-input"]', '0.7');
    
    // Save the persona
    await window.click('[data-testid="save-persona-button"]');
    
    // Verify the persona was created
    const personaList = await window.waitForSelector('[data-testid="persona-list"]');
    expect(await personaList.textContent()).toContain('Test Persona');
    await app.close();
  });

  test('should edit an existing persona', async () => {
    const app = await electron.launch({ args: ['.'] });
    const window = await app.firstWindow();
    
    // Select existing persona
    const personaItem = await window.waitForSelector('[data-testid="persona-item"]');
    await personaItem.click();
    
    // Click edit button
    await window.click('[data-testid="edit-persona-button"]');
    
    // Update persona details
    await window.fill('[data-testid="persona-title-input"]', 'Updated Test Persona');
    
    // Save changes
    await window.click('[data-testid="save-persona-button"]');
    
    // Verify the update
    const personaList = await window.waitForSelector('[data-testid="persona-list"]');
    expect(await personaList.textContent()).toContain('Updated Test Persona');
    await app.close();
  });

  test('should delete a persona', async () => {
    const app = await electron.launch({ args: ['.'] });
    const window = await app.firstWindow();
    
    // Select persona to delete
    const personaItem = await window.waitForSelector('[data-testid="persona-item"]');
    const personaName = await personaItem.textContent();
    await personaItem.click();
    
    // Click delete button
    await window.click('[data-testid="delete-persona-button"]');
    
    // Confirm deletion
    await window.click('[data-testid="confirm-delete-button"]');
    
    // Verify deletion
    const personaList = await window.waitForSelector('[data-testid="persona-list"]');
    expect(await personaList.textContent()).not.toContain(personaName);
    await app.close();
  });
}); 