import { app, BrowserWindow, ipcMain, shell } from 'electron';
import { join } from 'path';
import { setupDialogHandlers } from './dialogs';
import { setupSystemCheckHandlers } from './system-check';
import { setupTerminalHandlers } from './terminal-manager';
import { initializeAppPaths } from './app-paths';
import { NodeExtensionHost } from './node-extension-host';
import { discoverExtensions } from './extension-discovery';
import { registerExtensionIPC } from './extension-ipc';

let mainWindow: BrowserWindow | null = null;

function createWindow(): void {
  mainWindow = new BrowserWindow({
    width: 1440,
    height: 960,
    minWidth: 900,
    minHeight: 680,
    show: false,
    autoHideMenuBar: true,
    titleBarStyle: 'hiddenInset',
    trafficLightPosition: { x: 12, y: 12 },
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false,
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  mainWindow.on('ready-to-show', () => {
    mainWindow?.show();
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  // Load the renderer process
  // electron-vite provides these environment variables
  if (process.env.ELECTRON_RENDERER_URL) {
    // Development mode - load from Vite dev server
    mainWindow.loadURL(process.env.ELECTRON_RENDERER_URL);
  } else {
    // Production mode - load from built files
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'));
  }
}

// App lifecycle handlers
app.whenReady().then(async () => {
  // Initialize application paths (DB + workspace directories)
  initializeAppPaths();

  // Initialize system check handlers for onboarding & config
  setupSystemCheckHandlers();

  // Initialize dialog handlers for file/directory selection
  setupDialogHandlers();

  // Initialize terminal PTY handlers
  setupTerminalHandlers();

  // Utility IPC handlers
  ipcMain.handle('shell:open-external', async (_e, url: string) => {
    if (url.startsWith('http://') || url.startsWith('https://')) {
      await shell.openExternal(url);
    }
  });

  // Initialize Extension system
  const extensions = await discoverExtensions();
  registerExtensionIPC(extensions);
  const nodeExtHost = new NodeExtensionHost();
  await nodeExtHost.initialize(extensions);

  createWindow();

  app.on('activate', () => {
    // On macOS, re-create window when dock icon is clicked and no windows are open
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

// Quit when all windows are closed, except on macOS
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

// Handle any errors that might occur
process.on('uncaughtException', (error) => {
  console.error('Uncaught exception:', error);
});
