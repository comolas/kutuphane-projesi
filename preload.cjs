const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  onUpdateAvailable: (callback) => ipcRenderer.on('update_available', (event, info) => callback(info)),
  onUpdateNotAvailable: (callback) => ipcRenderer.on('update_not_available', (event) => callback()),
  onDownloadProgress: (callback) => ipcRenderer.on('download_progress', (event, progressObj) => callback(progressObj)),
  onUpdateDownloaded: (callback) => ipcRenderer.on('update_downloaded', (event, info) => callback(info)),
  onUpdateError: (callback) => ipcRenderer.on('update_error', (event, message) => callback(message)),
  downloadUpdate: () => ipcRenderer.send('download_update'),
  installUpdate: () => ipcRenderer.send('install_update'),
});
