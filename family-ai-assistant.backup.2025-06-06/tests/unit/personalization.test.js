import { setupPersonalizationPage } from '../../renderer/personalization.js';
const { jest } = require('@jest/globals');

// Mock the window object and electronAPI
const mockWindow = {
    electronAPI: {
        storeGet: jest.fn(),
        storeSet: jest.fn(),
        getPersonas: jest.fn()
    },
    location: {
        replace: jest.fn(),
        href: ''
    },
    document: document
};

// Ensure the mock functions return the expected values
mockWindow.electronAPI.storeGet.mockResolvedValue({ email: 'test@example.com' });
mockWindow.electronAPI.getPersonas.mockResolvedValue([
    { id: 'friendly', title: 'Friendly' },
    { id: 'professional', title: 'Professional' }
]);

// Mock DOM elements
document.body.innerHTML = `
    <form id="settingsForm">
        <select id="selectedPersona">
            <option value="">Default (No specific persona)</option>
        </select>
        <select id="responseLength">
            <option value="concise">Concise</option>
            <option value="balanced">Balanced</option>
            <option value="detailed">Detailed</option>
        </select>
        <input id="familyMembers" type="text">
        <textarea id="interests"></textarea>
        <select id="contentFilter">
            <option value="strict">Strict (Family-friendly only)</option>
            <option value="moderate">Moderate</option>
            <option value="minimal">Minimal</option>
        </select>
        <select id="documentAnalysisModel">
            <option value="gpt-4-turbo">GPT-4 Turbo (OpenAI)</option>
            <option value="claude-3-sonnet">Claude 3 Sonnet (Anthropic)</option>
            <option value="gemini-1.5-pro">Gemini 1.5 Pro (Google)</option>
            <option value="gemini-2.0-flash">Gemini 2.0 Flash (Google)</option>
            <option value="gemini-2.0-flash-lite">Gemini 2.0 Flash-Lite (Google)</option>
        </select>
        <input id="documentAnalysisMaxTokens" type="number">
        <button type="submit">Save Settings</button>
    </form>
    <div id="successMessage"></div>
    <div id="errorMessage"></div>
    <textarea id="familyMemory"></textarea>
    <button id="saveMemoryButton">Save Memory</button>
    <button id="clearMemoryButton">Clear Memory</button>
    <div id="memoryStatus"></div>
    <button id="backButton">Back</button>
`;

// Helper to create the minimal HTML needed for the test
function setupDOM() {
    document.body.innerHTML = `
        <form id="settingsForm">
            <select id="selectedPersona">
                <option value="">Default (No specific persona)</option>
            </select>
            <select id="responseLength">
                <option value="concise">Concise</option>
                <option value="balanced">Balanced</option>
                <option value="detailed">Detailed</option>
            </select>
            <input id="familyMembers" type="text">
            <textarea id="interests"></textarea>
            <select id="contentFilter">
                <option value="strict">Strict (Family-friendly only)</option>
                <option value="moderate">Moderate</option>
                <option value="minimal">Minimal</option>
            </select>
            <select id="documentAnalysisModel">
                <option value="gpt-4-turbo">GPT-4 Turbo (OpenAI)</option>
                <option value="claude-3-sonnet">Claude 3 Sonnet (Anthropic)</option>
                <option value="gemini-1.5-pro">Gemini 1.5 Pro (Google)</option>
                <option value="gemini-2.0-flash">Gemini 2.0 Flash (Google)</option>
                <option value="gemini-2.0-flash-lite">Gemini 2.0 Flash-Lite (Google)</option>
            </select>
            <input id="documentAnalysisMaxTokens" type="number">
            <button type="submit">Save Settings</button>
        </form>
        <div id="successMessage"></div>
        <div id="errorMessage"></div>
        <textarea id="familyMemory"></textarea>
        <button id="saveMemoryButton">Save Memory</button>
        <button id="clearMemoryButton">Clear Memory</button>
        <div id="memoryStatus"></div>
        <button id="backButton">Back</button>
    `;
}

describe('Personalization Page Tests', () => {
    let mockWindow;

    beforeEach(() => {
        setupDOM();
        mockWindow = {
            electronAPI: {
                storeGet: jest.fn((key) => {
                    if (key === 'userData') {
                        return Promise.resolve({ email: 'test@example.com' });
                    }
                    if (key === 'personalSettings-test@example.com') {
                        return Promise.resolve({
                            selectedPersona: 'friendly',
                            responseLength: 'detailed',
                            familyMembers: 'Mom, Dad',
                            interests: 'hiking, reading',
                            contentFilter: 'moderate',
                            documentAnalysisModel: 'gpt-4-turbo',
                            documentAnalysisMaxTokens: 16000
                        });
                    }
                    if (key === 'memory-test@example.com') {
                        return Promise.resolve('');
                    }
                    return Promise.resolve(null);
                }),
                storeSet: jest.fn(),
                getPersonas: jest.fn().mockResolvedValue([
                    { id: 'friendly', title: 'Friendly' },
                    { id: 'professional', title: 'Professional' }
                ])
            },
            location: {
                replace: jest.fn(),
                href: ''
            },
            document: document
        };
    });

    it('should redirect to index if no user data', async () => {
        mockWindow.electronAPI.storeGet.mockResolvedValueOnce(null);
        await setupPersonalizationPage(mockWindow);
        expect(mockWindow.location.replace).toHaveBeenCalledWith('index.html');
    });

    it('should load and display existing settings', async () => {
        await setupPersonalizationPage(mockWindow);
        await new Promise(resolve => setTimeout(resolve, 0));
        expect(document.getElementById('selectedPersona').value).toBe('friendly');
        expect(document.getElementById('responseLength').value).toBe('detailed');
        expect(document.getElementById('familyMembers').value).toBe('Mom, Dad');
        expect(document.getElementById('interests').value).toBe('hiking, reading');
        expect(document.getElementById('contentFilter').value).toBe('moderate');
        expect(document.getElementById('documentAnalysisModel').value).toBe('gpt-4-turbo');
        expect(document.getElementById('documentAnalysisMaxTokens').value).toBe('16000');
    });

    it('should save settings successfully', async () => {
        await setupPersonalizationPage(mockWindow);
        document.getElementById('selectedPersona').value = 'friendly';
        document.getElementById('responseLength').value = 'detailed';
        document.getElementById('familyMembers').value = 'Mom, Dad';
        document.getElementById('interests').value = 'hiking, reading';
        document.getElementById('contentFilter').value = 'moderate';
        document.getElementById('documentAnalysisModel').value = 'gpt-4-turbo';
        document.getElementById('documentAnalysisMaxTokens').value = '16000';
        const form = document.getElementById('settingsForm');
        form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
        await new Promise(resolve => setTimeout(resolve, 0));
        expect(mockWindow.electronAPI.storeSet).toHaveBeenCalledWith(
            'personalSettings-test@example.com',
            expect.objectContaining({
                selectedPersona: 'friendly',
                responseLength: 'detailed',
                familyMembers: 'Mom, Dad',
                interests: 'hiking, reading',
                contentFilter: 'moderate',
                documentAnalysisModel: 'gpt-4-turbo',
                documentAnalysisMaxTokens: 16000
            })
        );
        expect(document.getElementById('successMessage').style.display).toBe('block');
    });

    it('should handle memory operations', async () => {
        await setupPersonalizationPage(mockWindow);
        const memoryTextarea = document.getElementById('familyMemory');
        const saveMemoryButton = document.getElementById('saveMemoryButton');
        memoryTextarea.value = 'Test memory content';
        saveMemoryButton.click();
        await new Promise(resolve => setTimeout(resolve, 0));
        expect(mockWindow.electronAPI.storeSet).toHaveBeenCalledWith(
            'memory-test@example.com',
            'Test memory content'
        );
        const clearMemoryButton = document.getElementById('clearMemoryButton');
        clearMemoryButton.click();
        await new Promise(resolve => setTimeout(resolve, 0));
        expect(mockWindow.electronAPI.storeSet).toHaveBeenCalledWith(
            'memory-test@example.com',
            ''
        );
    });

    it('should validate document analysis max tokens', async () => {
        await setupPersonalizationPage(mockWindow);
        document.getElementById('documentAnalysisMaxTokens').value = '500';
        const form = document.getElementById('settingsForm');
        form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
        await new Promise(resolve => setTimeout(resolve, 0));
        expect(document.getElementById('errorMessage').style.display).toBe('block');
        expect(mockWindow.electronAPI.storeSet).not.toHaveBeenCalled();
    });
}); 