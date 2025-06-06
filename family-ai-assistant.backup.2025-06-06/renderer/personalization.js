// personalization.js

async function setupPersonalizationPage(windowObj = window) {
    // Ensure windowObj has all required properties
    const win = {
        ...windowObj,
        electronAPI: windowObj.electronAPI || {
            storeGet: async () => null,
            storeSet: async () => {},
            getPersonas: async () => []
        },
        location: windowObj.location || { replace: () => {}, href: '' },
        document: windowObj.document || document
    };

    const form = win.document.getElementById('settingsForm');
    const successMessage = win.document.getElementById('successMessage');
    const errorMessage = win.document.getElementById('errorMessage');

    // Debug logging
    console.log("Loading personalization settings...");
    const userData = await win.electronAPI.storeGet('userData');
    console.log("Loaded userData:", userData);
    if (!userData || !userData.email) {
        // In test environment, just call replace without actual navigation
        if (typeof win.location.replace === 'function') {
            win.location.replace('index.html');
        }
        return;
    }

    // Create user-specific settings key
    const settingsKey = `personalSettings-${userData.email}`;
    console.log("Using settingsKey:", settingsKey);

    // Load existing settings
    const settings = await win.electronAPI.storeGet(settingsKey);
    console.log("Loaded settings:", settings);

    // Load available personas
    const personas = await win.electronAPI.getPersonas();
    const personaSelect = win.document.getElementById('selectedPersona');
    personas.forEach(persona => {
        const option = win.document.createElement('option');
        option.value = persona.id;
        option.textContent = persona.title;
        personaSelect.appendChild(option);
    });

    // Now set the values, after options are loaded
    if (settings) {
        win.document.getElementById('selectedPersona').value = settings.selectedPersona || '';
        win.document.getElementById('responseLength').value = settings.responseLength || 'balanced';
        win.document.getElementById('familyMembers').value = settings.familyMembers || '';
        win.document.getElementById('interests').value = settings.interests || '';
        win.document.getElementById('contentFilter').value = settings.contentFilter || 'strict';
        win.document.getElementById('documentAnalysisModel').value = settings.documentAnalysisModel || 'gpt-4-turbo';
        win.document.getElementById('documentAnalysisMaxTokens').value = settings.documentAnalysisMaxTokens || 16000;
    }

    // Load and handle memory
    const memoryKey = `memory-${userData.email}`;
    const memoryTextarea = win.document.getElementById('familyMemory');
    const saveMemoryButton = win.document.getElementById('saveMemoryButton');
    const clearMemoryButton = win.document.getElementById('clearMemoryButton');
    const memoryStatus = win.document.getElementById('memoryStatus');
    const currentMemory = await win.electronAPI.storeGet(memoryKey);
    memoryTextarea.value = currentMemory || '';

    saveMemoryButton.addEventListener('click', async () => {
        try {
            saveMemoryButton.disabled = true;
            saveMemoryButton.textContent = 'Saving...';
            await win.electronAPI.storeSet(memoryKey, memoryTextarea.value.trim());
            memoryStatus.textContent = 'Memory updated!';
            memoryStatus.style.display = 'block';
            setTimeout(() => { memoryStatus.style.display = 'none'; }, 2000);
        } catch (error) {
            console.error('Error saving memory:', error);
            memoryStatus.textContent = 'Error saving memory';
            memoryStatus.style.display = 'block';
            memoryStatus.style.color = '#dc2626';
            setTimeout(() => { memoryStatus.style.display = 'none'; }, 2000);
        } finally {
            saveMemoryButton.disabled = false;
            saveMemoryButton.textContent = 'Save Memory';
        }
    });

    clearMemoryButton.addEventListener('click', async () => {
        try {
            clearMemoryButton.disabled = true;
            clearMemoryButton.textContent = 'Clearing...';
            await win.electronAPI.storeSet(memoryKey, '');
            memoryTextarea.value = '';
            memoryStatus.textContent = 'Memory cleared!';
            memoryStatus.style.display = 'block';
            setTimeout(() => { memoryStatus.style.display = 'none'; }, 2000);
        } catch (error) {
            console.error('Error clearing memory:', error);
            memoryStatus.textContent = 'Error clearing memory';
            memoryStatus.style.display = 'block';
            memoryStatus.style.color = '#dc2626';
            setTimeout(() => { memoryStatus.style.display = 'none'; }, 2000);
        } finally {
            clearMemoryButton.disabled = false;
            clearMemoryButton.textContent = 'Clear Memory';
        }
    });

    // Handle form submission
    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        // Validate settings
        const maxTokens = parseInt(win.document.getElementById('documentAnalysisMaxTokens').value);
        if (isNaN(maxTokens) || maxTokens < 1000 || maxTokens > 2000000) {
            errorMessage.textContent = 'Maximum document length must be between 1,000 and 2,000,000 tokens';
            errorMessage.style.display = 'block';
            return;
        }

        const newSettings = {
            selectedPersona: win.document.getElementById('selectedPersona').value,
            responseLength: win.document.getElementById('responseLength').value,
            familyMembers: win.document.getElementById('familyMembers').value,
            interests: win.document.getElementById('interests').value,
            contentFilter: win.document.getElementById('contentFilter').value,
            documentAnalysisModel: win.document.getElementById('documentAnalysisModel').value,
            documentAnalysisMaxTokens: maxTokens
        };

        try {
            // Show loading state
            form.classList.add('loading');
            const submitButton = form.querySelector('button[type="submit"]');
            submitButton.disabled = true;
            submitButton.textContent = 'Saving...';

            console.log("Saving settings:", newSettings);
            await win.electronAPI.storeSet(settingsKey, newSettings);

            // Show success message
            successMessage.style.display = 'block';
            errorMessage.style.display = 'none';
            setTimeout(() => {
                successMessage.style.display = 'none';
            }, 3000);
        } catch (error) {
            console.error('Error saving settings:', error);
            errorMessage.textContent = 'Error saving settings. Please try again.';
            errorMessage.style.display = 'block';
            successMessage.style.display = 'none';
        } finally {
            // Remove loading state
            form.classList.remove('loading');
            const submitButton = form.querySelector('button[type="submit"]');
            submitButton.disabled = false;
            submitButton.textContent = 'Save Settings';
        }
    });

    // Handle back button
    win.document.getElementById('backButton').addEventListener('click', () => {
        if (typeof win.location.href === 'string') {
            win.location.href = 'dashboard.html';
        }
    });
}

// If running in browser, auto-setup
if (typeof window !== 'undefined') {
    setupPersonalizationPage(window);
} 