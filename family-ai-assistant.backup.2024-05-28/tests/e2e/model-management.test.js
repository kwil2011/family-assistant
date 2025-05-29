const { test, expect } = require('@playwright/test');
const path = require('path');

test.describe('Model Management E2E Tests', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to model management page
    await page.goto('file://' + path.join(__dirname, '../../renderer/model-management.html'));
    
    // Mock admin user data using Object.assign
    await page.evaluate(() => {
      const mockAPI = {
        storeGet: async () => ({ isAdmin: true, email: 'test@example.com' }),
        storeSet: async () => true,
        storeDelete: async () => true,
        getProviderApiKey: async () => 'test-api-key',
        setProviderApiKey: async () => true,
        getAllProvidersAndModels: async () => [
          {
            id: 'test-provider',
            name: 'Test Provider',
            models: [
              {
                id: 'test-model',
                name: 'Test Model',
                maxTokens: 1000,
                temperature: 0.7,
                pricePerTokenUSD: 0.0001,
                isCustom: true
              }
            ]
          }
        ],
        addCustomModel: async () => true,
        updateCustomModel: async () => true,
        deleteCustomModel: async () => true
      };

      // Use Object.assign to create a new object with all properties
      window.electronAPI = Object.assign({}, mockAPI);
    });
  });

  test('should load provider list and models', async ({ page }) => {
    // Check if provider dropdown is populated
    const providerSelect = await page.locator('#providerSelect');
    await expect(providerSelect).toBeVisible();
    
    // Check if model list is populated
    const modelList = await page.locator('#modelList');
    await expect(modelList).toBeVisible();
    await expect(modelList.locator('.model-card')).toHaveCount(1);
  });

  test('should add new provider', async ({ page }) => {
    // Click add provider button
    await page.locator('#providerSelect').selectOption('add_new');
    
    // Fill provider form
    await page.locator('#newProviderId').fill('new-provider');
    await page.locator('#newProviderName').fill('New Provider');
    await page.locator('#newProviderApiKey').fill('new-api-key');
    await page.locator('#newProviderEndpoint').fill('https://api.example.com/v1/chat');
    await page.locator('#newProviderResponsePath').fill('choices[0].message.content');
    
    // Add a model
    await page.locator('#addNewModelBtn').click();
    await page.locator('#newModelName').fill('New Model');
    await page.locator('#newModelMaxTokens').fill('2000');
    await page.locator('#newModelTemperature').fill('0.8');
    await page.locator('#newModelPricePerToken').fill('0.0002');
    await page.locator('#addModelForm button[type="submit"]').click();
    
    // Submit provider form
    await page.locator('#addProviderForm button[type="submit"]').click();
    
    // Verify success message
    const successMessage = await page.locator('#successMessage');
    await expect(successMessage).toBeVisible();
  });

  test('should edit existing model', async ({ page }) => {
    // Click edit on existing model
    await page.locator('.model-card').first().locator('button:has-text("Edit")').click();
    
    // Update model details
    await page.locator('#modelName').fill('Updated Model');
    await page.locator('#maxTokens').fill('1500');
    await page.locator('#temperature').fill('0.9');
    await page.locator('#pricePerToken').fill('0.0003');
    
    // Save changes
    await page.locator('#saveButton').click();
    
    // Verify success message
    const successMessage = await page.locator('#successMessage');
    await expect(successMessage).toBeVisible();
  });

  test('should toggle model visibility', async ({ page }) => {
    // Get initial state
    const initialToggle = await page.locator('.model-card').first().locator('input[type="checkbox"]');
    const initialState = await initialToggle.isChecked();
    
    // Toggle visibility
    await initialToggle.click();
    
    // Verify state changed
    const newState = await initialToggle.isChecked();
    expect(newState).not.toBe(initialState);
  });

  test('should manage API keys', async ({ page }) => {
    // Check if API key input is present
    const apiKeyInput = await page.locator('#apiKeyInput-test-provider');
    await expect(apiKeyInput).toBeVisible();
    
    // Toggle API key visibility
    await page.locator('button:has-text("Show/Hide")').first().click();
    await expect(apiKeyInput).toHaveAttribute('type', 'text');
    
    // Save API key
    await page.locator('button:has-text("Save")').first().click();
    
    // Verify success message
    const successMessage = await page.locator('#successMessage');
    await expect(successMessage).toBeVisible();
  });

  test('should handle error cases', async ({ page }) => {
    // Mock error response
    await page.evaluate(() => {
      window.electronAPI.addCustomModel = async () => {
        throw new Error('Test error');
      };
    });
    
    // Try to add invalid model
    await page.locator('#providerSelect').selectOption('add_new');
    await page.locator('#addProviderForm button[type="submit"]').click();
    
    // Verify error message
    const errorMessage = await page.locator('#errorMessage');
    await expect(errorMessage).toBeVisible();
  });

  test('should validate provider form fields', async ({ page }) => {
    // Click add provider button
    await page.locator('#providerSelect').selectOption('add_new');
    
    // Try to submit without filling required fields
    await page.locator('#addProviderForm button[type="submit"]').click();
    
    // Verify form validation
    await expect(page.locator('#newProviderId')).toHaveAttribute('required', '');
    await expect(page.locator('#newProviderName')).toHaveAttribute('required', '');
    await expect(page.locator('#newProviderApiKey')).toHaveAttribute('required', '');
    await expect(page.locator('#newProviderEndpoint')).toHaveAttribute('required', '');
    await expect(page.locator('#newProviderResponsePath')).toHaveAttribute('required', '');
  });

  test('should validate model form fields', async ({ page }) => {
    // Click add provider button
    await page.locator('#providerSelect').selectOption('add_new');
    
    // Click add model button
    await page.locator('#addNewModelBtn').click();
    
    // Try to submit without filling required fields
    await page.locator('#addModelForm button[type="submit"]').click();
    
    // Verify form validation
    await expect(page.locator('#newModelName')).toHaveAttribute('required', '');
    await expect(page.locator('#newModelMaxTokens')).toHaveAttribute('required', '');
    await expect(page.locator('#newModelTemperature')).toHaveAttribute('required', '');
    await expect(page.locator('#newModelPricePerToken')).toHaveAttribute('required', '');
  });

  test('should handle model deletion', async ({ page }) => {
    // Click edit on existing model
    await page.locator('.model-card').first().locator('button:has-text("Edit")').click();
    
    // Click delete button
    await page.locator('#deleteButton').click();
    
    // Verify success message
    const successMessage = await page.locator('#successMessage');
    await expect(successMessage).toBeVisible();
    
    // Verify model is removed from list
    await expect(page.locator('.model-card')).toHaveCount(0);
  });

  test('should handle custom headers in provider form', async ({ page }) => {
    // Click add provider button
    await page.locator('#providerSelect').selectOption('add_new');
    
    // Add custom header
    await page.locator('#addHeaderBtn').click();
    
    // Fill header fields
    const headerInputs = await page.locator('#headersList input');
    await headerInputs.nth(0).fill('Authorization');
    await headerInputs.nth(1).fill('Bearer test-token');
    
    // Verify header is added
    await expect(page.locator('#headersList')).toContainText('Authorization');
    await expect(page.locator('#headersList')).toContainText('Bearer test-token');
  });

  test('should handle provider form cancellation', async ({ page }) => {
    // Click add provider button
    await page.locator('#providerSelect').selectOption('add_new');
    
    // Fill some fields
    await page.locator('#newProviderId').fill('test-provider');
    await page.locator('#newProviderName').fill('Test Provider');
    
    // Click cancel
    await page.locator('#cancelAddProvider').click();
    
    // Verify modal is closed
    await expect(page.locator('#addProviderModal')).not.toBeVisible();
    
    // Verify form is reset
    await expect(page.locator('#newProviderId')).toHaveValue('');
    await expect(page.locator('#newProviderName')).toHaveValue('');
  });

  test('should handle model form cancellation', async ({ page }) => {
    // Click add provider button
    await page.locator('#providerSelect').selectOption('add_new');
    
    // Click add model button
    await page.locator('#addNewModelBtn').click();
    
    // Fill some fields
    await page.locator('#newModelName').fill('Test Model');
    await page.locator('#newModelMaxTokens').fill('1000');
    
    // Click cancel
    await page.locator('#cancelAddModel').click();
    
    // Verify modal is closed
    await expect(page.locator('#addModelInlineForm')).not.toBeVisible();
    
    // Verify form is reset
    await expect(page.locator('#newModelName')).toHaveValue('');
    await expect(page.locator('#newModelMaxTokens')).toHaveValue('');
  });

  test('should handle network errors gracefully', async ({ page }) => {
    // Mock network error
    await page.evaluate(() => {
      window.electronAPI.getAllProvidersAndModels = async () => {
        throw new Error('Network error');
      };
    });
    
    // Reload page to trigger error
    await page.reload();
    
    // Verify error message is shown
    const errorMessage = await page.locator('#errorMessage');
    await expect(errorMessage).toBeVisible();
    await expect(errorMessage).toContainText('Network error');
  });
}); 