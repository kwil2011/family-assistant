// Fetch providers and models from backend
export async function getProviders() {
  if (window && window.electronAPI && window.electronAPI.getAllProvidersAndModels) {
    return await window.electronAPI.getAllProvidersAndModels();
  } else {
    throw new Error('IPC API not available');
  }
} 