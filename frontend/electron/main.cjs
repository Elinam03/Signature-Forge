// Import electron - in packaged app this will be the builtin,
// in dev mode we may need special handling
const electron = require('electron');
const { app, BrowserWindow, shell, dialog, ipcMain } = electron;
const path = require('path');
const { spawn, exec } = require('child_process');
const fs = require('fs');

// Keep references to avoid garbage collection
let mainWindow = null;
let backendProcess = null;

// Backend configuration
const BACKEND_PORT = 8000;

function isDevelopment() {
  return process.env.NODE_ENV === 'development' || !app.isPackaged;
}

function log(message) {
  console.log(`[SignatureForge] ${message}`);
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1000,
    minHeight: 700,
    title: 'SignatureForge',
    icon: path.join(__dirname, '../public/icon.png'),
    frame: false,
    titleBarStyle: 'hidden',
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.cjs'),
    },
    backgroundColor: '#0D0D0D',
    show: false,
  });

  // Show window when ready
  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
  });

  // Load the app
  if (isDevelopment()) {
    // Development: load from Vite dev server
    mainWindow.loadURL('http://localhost:5173');
    // DevTools can be opened manually with Ctrl+Shift+I
  } else {
    // Production: load built files
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
  }

  // Open external links in browser
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: 'deny' };
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

function findPython() {
  return new Promise((resolve) => {
    // Try common Python paths
    const pythonCmds = ['python', 'python3', 'py'];

    const tryNext = (index) => {
      if (index >= pythonCmds.length) {
        resolve(null);
        return;
      }

      const cmd = pythonCmds[index];
      exec(`${cmd} --version`, (error) => {
        if (error) {
          tryNext(index + 1);
        } else {
          resolve(cmd);
        }
      });
    };

    tryNext(0);
  });
}

async function startBackend() {
  if (isDevelopment()) {
    // In development, backend runs separately
    log('Development mode: Backend should be running separately');
    return;
  }

  // Production: Start Python backend
  const backendPath = path.join(process.resourcesPath, 'backend');
  log(`Backend path: ${backendPath}`);

  // Check if backend exists
  if (!fs.existsSync(backendPath)) {
    log('Backend not found in resources');
    dialog.showErrorBox(
      'Backend Not Found',
      `Could not find backend at: ${backendPath}\n\nPlease reinstall the application.`
    );
    return;
  }

  // Find Python
  const pythonCmd = await findPython();
  if (!pythonCmd) {
    log('Python not found');
    dialog.showErrorBox(
      'Python Required',
      'SignatureForge requires Python 3.8+ to be installed.\n\n' +
      'Please install Python from https://www.python.org/downloads/ and restart the application.'
    );
    return;
  }

  log(`Using Python: ${pythonCmd}`);

  // Check/install dependencies
  const requirementsPath = path.join(backendPath, 'requirements.txt');
  if (fs.existsSync(requirementsPath)) {
    log('Installing Python dependencies...');
    await new Promise((resolve) => {
      exec(
        `${pythonCmd} -m pip install -q -r "${requirementsPath}"`,
        { cwd: backendPath },
        (error) => {
          if (error) {
            log(`Pip install warning: ${error.message}`);
          }
          resolve();
        }
      );
    });
  }

  // Start uvicorn
  log('Starting backend server...');
  backendProcess = spawn(pythonCmd, [
    '-m', 'uvicorn',
    'app.main:app',
    '--host', '127.0.0.1',
    '--port', String(BACKEND_PORT),
  ], {
    cwd: backendPath,
    env: { ...process.env, PYTHONPATH: backendPath },
    shell: true,
  });

  return new Promise((resolve) => {
    let resolved = false;

    backendProcess.stdout.on('data', (data) => {
      const output = data.toString();
      log(`Backend: ${output}`);
      if (!resolved && output.includes('Uvicorn running')) {
        resolved = true;
        resolve();
      }
    });

    backendProcess.stderr.on('data', (data) => {
      const output = data.toString();
      log(`Backend: ${output}`);
      if (!resolved && output.includes('Uvicorn running')) {
        resolved = true;
        resolve();
      }
    });

    backendProcess.on('error', (err) => {
      log(`Backend error: ${err.message}`);
      if (!resolved) {
        resolved = true;
        resolve();
      }
    });

    backendProcess.on('close', (code) => {
      log(`Backend exited with code ${code}`);
      backendProcess = null;
    });

    // Timeout after 30 seconds
    setTimeout(() => {
      if (!resolved) {
        resolved = true;
        log('Backend startup timeout - continuing anyway');
        resolve();
      }
    }, 30000);
  });
}

function stopBackend() {
  if (backendProcess) {
    log('Stopping backend...');
    if (process.platform === 'win32') {
      // Windows: kill the process tree
      exec(`taskkill /pid ${backendProcess.pid} /T /F`, (err) => {
        if (err) log(`Taskkill error: ${err.message}`);
      });
    } else {
      backendProcess.kill('SIGTERM');
    }
    backendProcess = null;
  }
}

// App lifecycle
app.whenReady().then(async () => {
  try {
    await startBackend();
    createWindow();
  } catch (err) {
    log(`Startup error: ${err.message}`);
    createWindow(); // Try to open window anyway
  }

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  stopBackend();
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('before-quit', () => {
  stopBackend();
});

// Handle uncaught exceptions
process.on('uncaughtException', (err) => {
  log(`Uncaught exception: ${err.message}`);
});

// IPC handlers for window controls
ipcMain.on('window-minimize', () => {
  if (mainWindow) mainWindow.minimize();
});

ipcMain.on('window-maximize', () => {
  if (mainWindow) {
    if (mainWindow.isMaximized()) {
      mainWindow.unmaximize();
    } else {
      mainWindow.maximize();
    }
  }
});

ipcMain.on('window-close', () => {
  if (mainWindow) mainWindow.close();
});

ipcMain.handle('window-is-maximized', () => {
  return mainWindow ? mainWindow.isMaximized() : false;
});
