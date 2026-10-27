const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
    getUserDataPath: () => ipcRenderer.invoke('getUserDataPath'),
    selectImage: () => ipcRenderer.invoke('selectImage'),
    getImagePath: (fileName) => ipcRenderer.invoke('getImagePath', fileName),
});
