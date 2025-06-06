const { test, expect } = require('@playwright/test');
const path = require('path');
const testData = require('../__fixtures__/testData');

test.describe('Personalization Integration Tests', () => {
    test.beforeEach(async ({ page }) => {
        // Navigate to personalization page
        await page.goto('file://' + path.join(__dirname, '../../renderer/personalization.html'));
        
        // Mock electron API
        await page.evaluate(() => {
            window.electronAPI = {
                storeGet: async (key) => {
                    if (key === 'userData') {
                        return { email: 'test@example.com' };
                    }
                    if (key === 'personalSettings-test@example.com') {
                        return {
                            selectedPersona: 'friendly',
                            responseLength: 'detailed',
                            familyMembers: 'Mom, Dad, Sarah',
                            interests: 'hiking, reading',
                            contentFilter: 'moderate',
                            documentAnalysisModel: 'gpt-4-turbo',
                            documentAnalysisMaxTokens: 16000
                        };
                    }
                    if (key === 'memory-test@example.com') {
                        return 'Test memory content';
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
    });

    test('should load and display all settings correctly', async ({ page }) => {
        // Wait for settings to load
        await page.waitForSelector('#selectedPersona');
        
        // Verify all form fields are populated
        await expect(page.locator('#selectedPersona')).toHaveValue('friendly');
        await expect(page.locator('#responseLength')).toHaveValue('detailed');
        await expect(page.locator('#familyMembers')).toHaveValue('Mom, Dad, Sarah');
        await expect(page.locator('#interests')).toHaveValue('hiking, reading');
        await expect(page.locator('#contentFilter')).toHaveValue('moderate');
        await expect(page.locator('#documentAnalysisModel')).toHaveValue('gpt-4-turbo');
        await expect(page.locator('#documentAnalysisMaxTokens')).toHaveValue('16000');
    });

    test('should save settings and show success message', async ({ page }) => {
        // Fill in new settings
        await page.selectOption('#selectedPersona', 'default');
        await page.selectOption('#responseLength', 'concise');
        await page.fill('#familyMembers', 'John, Jane');
        await page.fill('#interests', 'cooking, gardening');
        
        // Submit form
        await page.click('button[type="submit"]');
        
        // Verify success message
        const successMessage = await page.locator('#successMessage');
        await expect(successMessage).toBeVisible();
        await expect(successMessage).toHaveText('Settings saved successfully!');
    });

    test('should handle memory operations', async ({ page }) => {
        // Verify initial memory content
        await expect(page.locator('#familyMemory')).toHaveValue('Test memory content');
        
        // Update memory
        await page.fill('#familyMemory', 'Updated memory content');
        await page.click('#saveMemoryButton');
        
        // Verify success message
        const memoryStatus = await page.locator('#memoryStatus');
        await expect(memoryStatus).toBeVisible();
        await expect(memoryStatus).toHaveText('Memory updated!');
        
        // Clear memory
        await page.click('#clearMemoryButton');
        await expect(page.locator('#familyMemory')).toHaveValue('');
    });

    test('should validate document analysis max tokens', async ({ page }) => {
        // Set invalid max tokens
        await page.fill('#documentAnalysisMaxTokens', '500');
        await page.click('button[type="submit"]');
        
        // Verify error message
        const errorMessage = await page.locator('#errorMessage');
        await expect(errorMessage).toBeVisible();
        await expect(errorMessage).toHaveText('Maximum document length must be between 1,000 and 2,000,000 tokens');
    });

    test('should navigate back to dashboard', async ({ page }) => {
        await page.click('#backButton');
        expect(page.url()).toContain('dashboard.html');
    });
}); 