const electron = require('electron');
const app = electron.app;
const BrowserWindow = electron.BrowserWindow;
const path = require('path');

function createWindow(isDev) {
  const mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
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
    autoUpdater.checkForUpdatesAndNotify();
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