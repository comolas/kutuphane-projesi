const electron = require('electron');
const app = electron.app;
const BrowserWindow = electron.BrowserWindow;
const path = require('path');
const { ipcMain } = require('electron');
const { initializeApp } = require('firebase/app');
const { getFirestore, doc, getDoc } = require('firebase/firestore');

// --- Firebase Configuration ---
const firebaseConfig = {
  apiKey: "AIzaSyD8YMDfxMgJkIyTI9WCtZRfXthUUpP5vPM",
  authDomain: "data-49543.firebaseapp.com",
  projectId: "data-49543",
  storageBucket: "data-49543.appspot.com",
  messagingSenderId: "172190505514",
  appId: "1:172190505514:web:4b222b7ce52dbaeddb0153"
};

// Initialize Firebase
const firebaseApp = initializeApp(firebaseConfig);
const db = getFirestore(firebaseApp);
// --- End of Firebase Configuration ---

let mainWindow;

function createWindow(isDev) {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.cjs')
    },
  });

  const startUrl = isDev ? 'http://localhost:5173' : `file://${path.join(__dirname, 'dist', 'index.html')}`;
  
  mainWindow.loadURL(startUrl);

  if (isDev) {
    mainWindow.webContents.openDevTools();
  }
}

// --- Custom Update Check Function ---
async function checkForUpdatesFromFirebase() {
  try {
    const versionDocRef = doc(db, 'appInfo', 'version');
    const docSnap = await getDoc(versionDocRef);

    if (docSnap.exists()) {
      const data = docSnap.data();
      const latestVersion = data.latestVersion;
      const currentVersion = app.getVersion();

      console.log(`Current version: ${currentVersion}, Latest version from Firebase: ${latestVersion}`);

      // Simple version comparison
      if (latestVersion > currentVersion) {
        console.log('Firebase: Update available.');
        // Pass info object similar to electron-updater's
        mainWindow.webContents.send('update_available', { version: latestVersion });
      } else {
        console.log('Firebase: Update not available.');
        mainWindow.webContents.send('update_not_available');
      }
    } else {
      console.log('Firebase: "appInfo/version" document not found.');
      mainWindow.webContents.send('update_not_available');
    }
  } catch (error) {
    console.error('Error checking for updates from Firebase:', error);
    // If there's an error, assume no update is available to prevent issues
    mainWindow.webContents.send('update_not_available');
  }
}


app.whenReady().then(() => {
  const isDev = !app.isPackaged;
  createWindow(isDev);

  if (!isDev) {
    const { autoUpdater } = require('electron-updater');
    autoUpdater.autoDownload = false;

    // --- Replaced original check with Firebase check ---
    checkForUpdatesFromFirebase();

    // Event listeners for autoUpdater (still used for download/install)
    autoUpdater.on('update-available', (info) => {
      // This event might still be triggered if checkForUpdates() is called elsewhere,
      // but our primary check is now Firebase. We can choose to ignore it or log it.
      console.log('Default updater: Update available. Source:', info);
    });

    autoUpdater.on('update-not-available', () => {
      console.log('Default updater: Update not available.');
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

    ipcMain.on('download_update', () => {
      // Manually trigger the download from the default provider (GitHub)
      autoUpdater.downloadUpdate();
    });

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