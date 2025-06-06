import { test, expect } from '@playwright/test';
import { ElectronLauncher } from '../../test/electron-launcher';
import path from 'path';

test.describe('Personalization Page E2E Tests', () => {
  let launcher: ElectronLauncher;
  let page: any;

  test.beforeAll(async () => {
    launcher = new ElectronLauncher();
    page = await launcher.launch();
  });

  test.afterAll(async () => {
    await launcher.close();
  });

  test.beforeEach(async () => {
    try {
      // Navigate to the personalization page using absolute path
      const filePath = path.join(process.cwd(), 'renderer', 'personalization.html');
      await page.goto(`file://${filePath}`);
      
      // Mock authenticated state
      await page.evaluate(() => {
        window.electronAPI.storeGet = async (key: string) => {
          if (key === 'userData') {
            return { email: 'test@example.com' };
          }
          return null;
        };
      });
    } catch (error) {
      console.error('Error in beforeEach:', error);
      throw error;
    }
  });

  test('should load and display settings form', async () => {
    // Check if the main elements are present
    await expect(page.locator('#settingsForm')).toBeVisible();
    await expect(page.locator('#selectedPersona')).toBeVisible();
    await expect(page.locator('#responseLength')).toBeVisible();
    await expect(page.locator('#familyMembers')).toBeVisible();
  });

  test('should save settings successfully', async () => {
    // Fill in some settings
    await page.selectOption('#selectedPersona', 'default');
    await page.selectOption('#responseLength', 'balanced');
    await page.fill('#familyMembers', 'John, Jane');
    await page.fill('#interests', 'hiking, reading');
    
    // Mock successful save
    await page.evaluate(() => {
      window.electronAPI.storeSet = async () => true;
    });
    
    // Submit the form
    await page.click('button[type="submit"]');
    
    // Check for success message
    const successMessage = page.locator('#successMessage');
    await expect(successMessage).toBeVisible();
    await expect(successMessage).toHaveText('Settings saved successfully!');
  });

  test('should handle memory management', async () => {
    // Mock successful memory operations
    await page.evaluate(() => {
      window.electronAPI.storeSet = async () => true;
    });

    // Test saving memory
    await page.fill('#familyMemory', 'Test memory content');
    await page.click('#saveMemoryButton');
    
    // Check for success message
    const memoryStatus = page.locator('#memoryStatus');
    await expect(memoryStatus).toBeVisible();
    await expect(memoryStatus).toHaveText('Memory updated!');
    
    // Test clearing memory
    await page.click('#clearMemoryButton');
    await expect(page.locator('#familyMemory')).toHaveValue('');
    await expect(memoryStatus).toHaveText('Memory cleared!');
  });

  test('should validate document analysis max tokens', async () => {
    // Test invalid value
    await page.fill('#documentAnalysisMaxTokens', '500');
    await page.click('button[type="submit"]');
    
    // Check for error message
    const errorMessage = page.locator('#errorMessage');
    await expect(errorMessage).toBeVisible();
    await expect(errorMessage).toHaveText('Maximum document length must be between 1,000 and 2,000,000 tokens');
    
    // Test valid value
    await page.fill('#documentAnalysisMaxTokens', '16000');
    await page.click('button[type="submit"]');
    await expect(page.locator('#successMessage')).toBeVisible();
  });

  test('should navigate back to dashboard', async () => {
    await page.click('#backButton');
    await expect(page).toHaveURL(/.*dashboard\.html/);
  });
}); 