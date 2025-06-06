const { test, expect } = require('@playwright/test');
const path = require('path');
const testData = require('../__fixtures__/testData');

test.describe('Personalization E2E Tests', () => {
    test.beforeEach(async ({ page }) => {
        // Start from the dashboard
        await page.goto('file://' + path.join(__dirname, '../../renderer/dashboard.html'));
        
        // Mock electron API for authentication
        await page.evaluate(() => {
            window.electronAPI = {
                storeGet: async (key) => {
                    if (key === 'userData') {
                        return { email: 'test@example.com', isAdmin: true };
                    }
                    return null;
                },
                storeSet: async () => true,
                getPersonas: async () => [
                    { id: 'default', title: 'Default' },
                    { id: 'friendly', title: 'Friendly Assistant' }
                ]
            };
        });
        
        // Navigate to personalization page
        await page.click('text=Personalization');
    });

    test('complete personalization flow', async ({ page }) => {
        // Wait for page to load
        await page.waitForSelector('#settingsForm');
        
        // 1. Update AI Behavior settings
        await page.selectOption('#selectedPersona', 'friendly');
        await page.selectOption('#responseLength', 'detailed');
        
        // 2. Update Family Settings
        await page.fill('#familyMembers', 'Mom, Dad, Sarah, Tommy');
        await page.fill('#interests', 'hiking, board games, cooking, reading');
        
        // 3. Update Content Preferences
        await page.selectOption('#contentFilter', 'moderate');
        
        // 4. Update Document Analysis settings
        await page.selectOption('#documentAnalysisModel', 'gpt-4-turbo');
        await page.fill('#documentAnalysisMaxTokens', '16000');
        
        // 5. Update Family Memory
        await page.fill('#familyMemory', 'Sarah loves hiking. Tommy enjoys board games.');
        await page.click('#saveMemoryButton');
        
        // Verify memory was saved
        const memoryStatus = await page.locator('#memoryStatus');
        await expect(memoryStatus).toBeVisible();
        await expect(memoryStatus).toHaveText('Memory updated!');
        
        // 6. Save all settings
        await page.click('button[type="submit"]');
        
        // Verify settings were saved
        const successMessage = await page.locator('#successMessage');
        await expect(successMessage).toBeVisible();
        await expect(successMessage).toHaveText('Settings saved successfully!');
        
        // 7. Return to dashboard
        await page.click('#backButton');
        expect(page.url()).toContain('dashboard.html');
    });

    test('error handling and validation', async ({ page }) => {
        // Wait for page to load
        await page.waitForSelector('#settingsForm');
        
        // Test invalid document analysis max tokens
        await page.fill('#documentAnalysisMaxTokens', '500');
        await page.click('button[type="submit"]');
        
        const errorMessage = await page.locator('#errorMessage');
        await expect(errorMessage).toBeVisible();
        await expect(errorMessage).toHaveText('Maximum document length must be between 1,000 and 2,000,000 tokens');
        
        // Test memory operations with network error
        await page.evaluate(() => {
            window.electronAPI.storeSet = async () => {
                throw new Error('Network error');
            };
        });
        
        await page.fill('#familyMemory', 'Test memory');
        await page.click('#saveMemoryButton');
        
        const memoryError = await page.locator('#memoryStatus');
        await expect(memoryError).toBeVisible();
        await expect(memoryError).toHaveText('Error saving memory');
    });

    test('settings persistence', async ({ page }) => {
        // Wait for page to load
        await page.waitForSelector('#settingsForm');
        
        // Set initial settings
        await page.selectOption('#selectedPersona', 'friendly');
        await page.fill('#familyMembers', 'Mom, Dad');
        await page.click('button[type="submit"]');
        
        // Reload page
        await page.reload();
        
        // Verify settings persisted
        await expect(page.locator('#selectedPersona')).toHaveValue('friendly');
        await expect(page.locator('#familyMembers')).toHaveValue('Mom, Dad');
    });
}); 