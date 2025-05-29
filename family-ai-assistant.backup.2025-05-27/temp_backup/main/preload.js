const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
    // ... existing code ...
    
    // Password recovery functions
    sendRecoveryCode: (email) => ipcRenderer.invoke('sendRecoveryCode', email),
    resetAdminPassword: (data) => ipcRenderer.invoke('resetAdminPassword', data)
});
// ... existing code ... 