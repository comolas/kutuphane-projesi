const electron = require('electron');
const app = electron.app;
const BrowserWindow = electron.BrowserWindow;
const path = require('path');
const { ipcMain } = require('electron'); // Added ipcMain

let mainWindow; // Declared mainWindow globally

function createWindow(isDev) {
  mainWindow = new BrowserWindow({ // Assigned to global mainWindow
    width: 1200,
    height: 800,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.cjs') // Added preload script
    },
  });

  // The port 5173 is hardcoded, but vite might use another one if it's busy.
  const startUrl = isDev ? 'http://localhost:5173' : `file://${path.join(__dirname, 'dist', 'index.html')}`;
  
  mainWindow.loadURL(startUrl);

  // Open DevTools only in development
  if (isDev) {
    mainWindow.webContents.openDevTools();
  }
}

app.whenReady().then(() => {
  const isDev = !app.isPackaged;
  createWindow(isDev);

  // Only require and check for updates in a packaged app
  if (!isDev) {
    const { autoUpdater } = require('electron-updater');

    // Set auto download to false so we can control the update process
    autoUpdater.autoDownload = false;

    // Check for updates on app start
    autoUpdater.checkForUpdates();

    // Event listeners for autoUpdater
    autoUpdater.on('update-available', (info) => {
      console.log('Update available:', info);
      mainWindow.webContents.send('update_available', info);
    });

    autoUpdater.on('update-not-available', () => {
      console.log('Update not available.');
      mainWindow.webContents.send('update_not_available');
    });

    autoUpdater.on('download-progress', (progressObj) => {
      console.log('Download progress:', progressObj);
      mainWindow.webContents.send('download_progress', progressObj);
    });

    autoUpdater.on('update-downloaded', (info) => {
      console.log('Update downloaded:', info);
      mainWindow.webContents.send('update_downloaded', info);
    });

    autoUpdater.on('error', (err) => {
      console.error('Error in autoUpdater:', err);
      mainWindow.webContents.send('update_error', err.message);
    });

    // Listen for renderer process to request update download
    ipcMain.on('download_update', () => {
      autoUpdater.downloadUpdate();
    });

    // Listen for renderer process to request update installation
    ipcMain.on('install_update', () => {
      autoUpdater.quitAndInstall();
    });
  }

  app.on('activate', function () {
    if (BrowserWindow.getAllWindows().length === 0) createWindow(isDev);
  });
});

app.on('window-all-closed', function () {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});