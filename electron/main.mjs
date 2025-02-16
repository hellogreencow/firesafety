import { app, BrowserWindow, ipcMain, protocol, dialog } from 'electron';
import path from 'path';
import { fileURLToPath } from 'url';
import isDev from 'electron-is-dev';
import Store from 'electron-store';
import fs from 'fs';

// Get __dirname equivalent in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Initialize electron store
const store = new Store();

let mainWindow;

// Setup error logging
const logFile = path.join(app.getPath('userData'), 'error.log');

function logError(error) {
  const timestamp = new Date().toISOString();
  const errorMessage = `${timestamp}: ${error.stack || error}\n`;
  
  fs.appendFileSync(logFile, errorMessage);
  console.error(errorMessage);
  
  if (mainWindow) {
    dialog.showErrorBox('Application Error', 
      `An error occurred. Error details have been logged to:\n${logFile}\n\nError: ${error.message || error}`
    );
  }
}

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  logError(error);
});

process.on('unhandledRejection', (error) => {
  logError(error);
});

// Register IPC handlers once
ipcMain.handle('save-database', (event, data) => {
  try {
    store.set('database', data);
  } catch (error) {
    logError(error);
    throw error;
  }
});

ipcMain.handle('load-database', () => {
  try {
    return store.get('database');
  } catch (error) {
    logError(error);
    throw error;
  }
});

function createWindow() {
  try {
    // Register custom protocol for sql.js wasm file
    protocol.registerFileProtocol('wasm', (request, callback) => {
      const url = request.url.substring(7); // Remove 'wasm://' prefix
      callback({ path: path.join(process.resourcesPath, url) });
    });

    mainWindow = new BrowserWindow({
      width: 1200,
      height: 800,
      webPreferences: {
        nodeIntegration: true,
        contextIsolation: false,
        webSecurity: false // Required for loading local wasm files
      },
      title: 'Fire Safety AI Assistant',
      backgroundColor: '#1a1a1a',
    });

    mainWindow.loadURL(
      isDev
        ? 'http://localhost:5555'
        : `file://${path.join(__dirname, '../dist/index.html')}`
    );

    if (isDev) {
      mainWindow.webContents.openDevTools();
    }

    // Monitor window for crashes
    mainWindow.webContents.on('crashed', (event) => {
      logError(new Error('Window crashed: ' + event));
    });

    mainWindow.on('unresponsive', () => {
      logError(new Error('Window became unresponsive'));
    });

  } catch (error) {
    logError(error);
  }
}

app.whenReady().then(() => {
  try {
    createWindow();
  } catch (error) {
    logError(error);
  }
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
}); 