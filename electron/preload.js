const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  openFile: (filter) => ipcRenderer.invoke('open-file', filter),
  saveFile: (suggested) => ipcRenderer.invoke('save-file', suggested),
  readFile: (filePath) => ipcRenderer.invoke('read-file', filePath),
  writeFile: (filePath, content) => ipcRenderer.invoke('write-file', filePath, content),
  rotateBackups: (filePath) => ipcRenderer.invoke('rotate-backups', filePath),
  openInElectron: () => ipcRenderer.invoke('open-in-electron'),
});