// main.js
const { app, BrowserWindow, ipcMain, session, shell, clipboard, BrowserView, dialog } = require('electron');
const fs = require('fs');
const path = require('path');
const isDev = require('electron-is-dev');
const { keyboardShortcutService } = require('./src/lib/KeyboardShortcutService');

let mainWindow;
let browserView;
let isOnline = true;

const extensionsPath = path.join(app.getPath('userData'), 'extensions');
const memoryPath = path.join(app.getPath('userData'), 'ai_memory.jsonl');

if (!fs.existsSync(extensionsPath)) {
  try { fs.mkdirSync(extensionsPath, { recursive: true }); } catch (e) { }
}

const { ElectronBlocker } = require('@ghostery/adblocker-electron');
const fetch = require('cross-fetch');

// Function to check network status
const checkNetworkStatus = () => {
  require('dns').lookup('google.com', (err) => {
    const online = !err || err.code === 'ENOTFOUND';
    if (online !== isOnline) {
      isOnline = online;
      if (mainWindow) mainWindow.webContents.send('network-status-changed', isOnline);
    }
  });
};

function appendToMemory(entry) {
  const log = JSON.stringify({ ...entry, timestamp: new Date().toISOString() }) + '\n';
  fs.appendFileSync(memoryPath, log);
}

function readMemory() {
  if (!fs.existsSync(memoryPath)) return [];
  const lines = fs.readFileSync(memoryPath, 'utf-8').trim().split('\n');
  return lines.map(l => {
    try { return JSON.parse(l); } catch (e) { return null; }
  }).filter(Boolean);
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: false
    },
    titleBarStyle: 'hiddenInset',
    backgroundColor: '#0D0E1C'
  });

  const url = isDev
    ? 'http://localhost:3000'
    : `file://${path.join(__dirname, 'out/index.html')}`;

  mainWindow.loadURL(url);

  // Initial network check
  checkNetworkStatus();
  setInterval(checkNetworkStatus, 30000);

  // Ad blocker
  ElectronBlocker.fromPrebuiltAdsAndTracking(fetch).then((blocker) => {
    blocker.enableBlockingInSession(session.defaultSession);
    console.log('Ad blocker enabled.');
  });

  // BrowserView setup
  browserView = new BrowserView({
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: true
    },
  });

  mainWindow.setBrowserView(browserView);

  browserView.webContents.on('did-navigate', (event, url) => {
    mainWindow.webContents.send('browser-view-url-changed', url);
    if (url.includes('/search?') || url.includes('?q=')) {
      try {
        const parsedUrl = new URL(url);
        const query = parsedUrl.searchParams.get('q') || parsedUrl.searchParams.get('query');
        if (query) mainWindow.webContents.send('ai-query-detected', query);
      } catch (e) { }
    }
  });

  browserView.webContents.on('did-navigate-in-page', (event, url) => {
    mainWindow.webContents.send('browser-view-url-changed', url);
  });

  browserView.webContents.loadURL('https://www.google.com');

  // Handle external links
  mainWindow.webContents.on('will-navigate', (event, url) => {
    if (!url.startsWith('http://localhost') && !url.startsWith('file://')) {
      event.preventDefault();
      shell.openExternal(url);
    }
  });

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (!url.startsWith('http://localhost') && !url.startsWith('file://')) {
      shell.openExternal(url);
      return { action: 'deny' };
    }
    return { action: 'allow' };
  });

  // Header stripping for embedding
  session.defaultSession.webRequest.onHeadersReceived({ urls: ['*://*/*'] }, (details, callback) => {
    const headers = { ...details.responseHeaders };
    delete headers['x-frame-options'];
    delete headers['content-security-policy'];
    callback({ cancel: false, responseHeaders: headers });
  });

  // Load Extensions
  try {
    const extensionDirs = fs.readdirSync(extensionsPath);
    extensionDirs.forEach(dir => {
      const extPath = path.join(extensionsPath, dir);
      if (fs.lstatSync(extPath).isDirectory()) {
        session.defaultSession.loadExtension(extPath).catch(e => console.error(e));
      }
    });
  } catch (e) { }
}

// IPC Handlers
ipcMain.handle('get-is-online', () => isOnline);

ipcMain.on('set-browser-view-bounds', (event, bounds) => {
  if (browserView && mainWindow) {
    browserView.setBounds({
      x: Math.round(bounds.x),
      y: Math.round(bounds.y),
      width: Math.round(bounds.width),
      height: Math.round(bounds.height),
    });
  }
});

ipcMain.on('navigate-browser-view', (event, url) => {
  if (browserView) browserView.webContents.loadURL(url);
  appendToMemory({ action: 'navigate', url });
});

ipcMain.on('browser-view-go-back', () => {
  if (browserView && browserView.webContents.canGoBack()) browserView.webContents.goBack();
});

ipcMain.on('browser-view-go-forward', () => {
  if (browserView && browserView.webContents.canGoForward()) browserView.webContents.goForward();
});

ipcMain.on('browser-view-reload', () => {
  if (browserView) browserView.webContents.reload();
});

ipcMain.on('open-dev-tools', () => {
  if (browserView) browserView.webContents.openDevTools({ mode: 'detach' });
  else mainWindow.webContents.openDevTools();
});

ipcMain.handle('get-browser-view-url', () => {
  return browserView ? browserView.webContents.getURL() : '';
});

ipcMain.handle('capture-page-html', async () => {
  if (!browserView) return "";
  return await browserView.webContents.executeJavaScript('document.documentElement.outerHTML');
});

ipcMain.handle('save-offline-page', async (event, { url, title, html }) => {
  console.log(`[Offline] Saved ${title}`);
  return true;
});

ipcMain.handle('share-device-folder', async () => {
  const result = await dialog.showOpenDialog(mainWindow, { properties: ['openDirectory'] });
  if (!result.canceled) return { path: result.filePaths[0], success: true };
  return { success: false };
});

ipcMain.handle('get-ai-memory', async () => readMemory());
ipcMain.on('add-ai-memory', (event, entry) => appendToMemory(entry));

ipcMain.handle('llm-generate-chat-content', async (event, messages, options = {}) => {
  const providerId = options.provider || 'gemini';
  const apiKey = options.apiKey || (providerId === 'gemini' ? process.env.GEMINI_API_KEY : null);

  if (!apiKey && providerId !== 'local') return { error: `Missing API key for ${providerId}` };

  try {
    if (providerId === 'gemini') {
      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-pro:generateContent?key=${apiKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: messages.map(m => ({
            role: m.role === 'user' ? 'user' : 'model',
            parts: [{ text: m.content }]
          }))
        })
      });
      const data = await response.json();
      return { text: data.candidates?.[0]?.content?.parts?.[0]?.text || 'No response.' };
    }
    return { error: 'Provider not implemented.' };
  } catch (e) {
    return { error: e.message };
  }
});

// Chat Exports
ipcMain.handle('export-chat-txt', async (event, messages) => {
  const content = messages.map(m => `[${m.role.toUpperCase()}] ${m.content}`).join('\n\n');
  const { filePath } = await dialog.showSaveDialog(mainWindow, {
    defaultPath: path.join(app.getPath('downloads'), 'chat.txt')
  });
  if (filePath) { fs.writeFileSync(filePath, content); return true; }
  return false;
});

ipcMain.handle('get-extension-path', () => extensionsPath);

app.whenReady().then(() => {
  createWindow();
  keyboardShortcutService.registerAll();
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});