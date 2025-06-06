import { jest } from '@jest/globals';
import { setupPersonalizationPage } from 'renderer/personalization.js';

describe('Personalization Page Unit Tests', () => {
  let mockWindow;

  beforeEach(() => {
    // Reset all mocks before each test
    jest.clearAllMocks();

    // Mock the DOM elements
    document.body.innerHTML = `
      <form id="settingsForm">
        <select id="selectedPersona"></select>
        <select id="responseLength"></select>
        <input type="text" id="familyMembers" />
        <textarea id="interests"></textarea>
        <select id="contentFilter"></select>
        <select id="documentAnalysisModel"></select>
        <input type="number" id="documentAnalysisMaxTokens" />
        <textarea id="familyMemory"></textarea>
        <button type="button" id="saveMemoryButton"></button>
        <button type="button" id="clearMemoryButton"></button>
        <button type="submit"></button>
      </form>
      <div id="successMessage" style="display:none"></div>
      <div id="errorMessage" style="display:none"></div>
      <div id="memoryStatus" style="display:none"></div>
      <button id="backButton"></button>
    `;

    // Mock window and electronAPI
    mockWindow = {
      electronAPI: {
        storeGet: jest.fn(),
        storeSet: jest.fn(),
        getPersonas: jest.fn(),
      },
      location: { replace: jest.fn(), href: '' }
    };
  });

  describe('Settings Loading', () => {
    it('should load existing settings correctly', async () => {
      const mockSettings = {
        selectedPersona: 'test-persona',
        responseLength: 'balanced',
        familyMembers: 'John, Jane',
        interests: 'hiking, reading',
        contentFilter: 'strict',
        documentAnalysisModel: 'gpt-4-turbo',
        documentAnalysisMaxTokens: 16000
      };
      mockWindow.electronAPI.storeGet
        .mockResolvedValueOnce({ email: 'test@example.com' }) // userData
        .mockResolvedValueOnce(mockSettings); // settings
      mockWindow.electronAPI.getPersonas.mockResolvedValue([]);

      await setupPersonalizationPage(mockWindow);

      expect(document.getElementById('selectedPersona').value).toBe('test-persona');
      expect(document.getElementById('responseLength').value).toBe('balanced');
      expect(document.getElementById('familyMembers').value).toBe('John, Jane');
      expect(document.getElementById('interests').value).toBe('hiking, reading');
      expect(document.getElementById('contentFilter').value).toBe('strict');
      expect(document.getElementById('documentAnalysisModel').value).toBe('gpt-4-turbo');
      expect(document.getElementById('documentAnalysisMaxTokens').value).toBe('16000');
    });

    it('should handle missing settings gracefully', async () => {
      mockWindow.electronAPI.storeGet
        .mockResolvedValueOnce({ email: 'test@example.com' }) // userData
        .mockResolvedValueOnce(null); // settings
      mockWindow.electronAPI.getPersonas.mockResolvedValue([]);

      await setupPersonalizationPage(mockWindow);

      expect(document.getElementById('selectedPersona').value).toBe('');
      expect(document.getElementById('responseLength').value).toBe('balanced');
      expect(document.getElementById('familyMembers').value).toBe('');
      expect(document.getElementById('interests').value).toBe('');
      expect(document.getElementById('contentFilter').value).toBe('strict');
      expect(document.getElementById('documentAnalysisModel').value).toBe('gpt-4-turbo');
      expect(document.getElementById('documentAnalysisMaxTokens').value).toBe('16000');
    });
  });

  describe('Settings Validation', () => {
    it('should validate document analysis max tokens', async () => {
      mockWindow.electronAPI.storeGet
        .mockResolvedValueOnce({ email: 'test@example.com' }) // userData
        .mockResolvedValueOnce(null); // settings
      mockWindow.electronAPI.getPersonas.mockResolvedValue([]);

      await setupPersonalizationPage(mockWindow);

      const form = document.getElementById('settingsForm');
      const maxTokensInput = document.getElementById('documentAnalysisMaxTokens');
      const errorMessage = document.getElementById('errorMessage');
      const submitButton = form.querySelector('button[type="submit"]');

      // Test invalid value
      maxTokensInput.value = '500'; // Too low
      form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
      expect(errorMessage.style.display).toBe('block');
      expect(mockWindow.electronAPI.storeSet).not.toHaveBeenCalled();

      // Test valid value
      maxTokensInput.value = '16000';
      form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
      // storeSet is async, so we can only check it was called eventually
      await new Promise(resolve => setTimeout(resolve, 0));
      expect(mockWindow.electronAPI.storeSet).toHaveBeenCalled();
    });
  });

  describe('Memory Management', () => {
    it('should save family memory correctly', async () => {
      mockWindow.electronAPI.storeGet
        .mockResolvedValueOnce({ email: 'test@example.com' }) // userData
        .mockResolvedValueOnce(null) // settings
        .mockResolvedValueOnce(''); // memory
      mockWindow.electronAPI.getPersonas.mockResolvedValue([]);

      await setupPersonalizationPage(mockWindow);

      const memoryTextarea = document.getElementById('familyMemory');
      const saveMemoryButton = document.getElementById('saveMemoryButton');
      memoryTextarea.value = 'Test memory content';
      saveMemoryButton.click();
      await new Promise(resolve => setTimeout(resolve, 0));
      expect(mockWindow.electronAPI.storeSet).toHaveBeenCalledWith(
        expect.stringContaining('memory-'),
        'Test memory content'
      );
    });

    it('should clear family memory correctly', async () => {
      mockWindow.electronAPI.storeGet
        .mockResolvedValueOnce({ email: 'test@example.com' }) // userData
        .mockResolvedValueOnce(null) // settings
        .mockResolvedValueOnce('Existing memory'); // memory
      mockWindow.electronAPI.getPersonas.mockResolvedValue([]);

      await setupPersonalizationPage(mockWindow);

      const clearMemoryButton = document.getElementById('clearMemoryButton');
      const memoryTextarea = document.getElementById('familyMemory');
      memoryTextarea.value = 'Existing memory';
      clearMemoryButton.click();
      await new Promise(resolve => setTimeout(resolve, 0));
      expect(mockWindow.electronAPI.storeSet).toHaveBeenCalledWith(
        expect.stringContaining('memory-'),
        ''
      );
      expect(memoryTextarea.value).toBe('');
    });
  });

  describe('Error Handling', () => {
    it('should handle API errors gracefully', async () => {
      mockWindow.electronAPI.storeGet
        .mockResolvedValueOnce({ email: 'test@example.com' }) // userData
        .mockResolvedValueOnce(null); // settings
      mockWindow.electronAPI.getPersonas.mockResolvedValue([]);
      mockWindow.electronAPI.storeSet.mockRejectedValue(new Error('API Error'));

      await setupPersonalizationPage(mockWindow);

      const form = document.getElementById('settingsForm');
      form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
      await new Promise(resolve => setTimeout(resolve, 0));
      const errorMessage = document.getElementById('errorMessage');
      expect(errorMessage.style.display).toBe('block');
      expect(errorMessage.textContent).toContain('Error saving settings');
    });
  });
}); 