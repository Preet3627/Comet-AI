const { app, BrowserWindow, ipcMain, session, shell, clipboard, BrowserView, dialog, globalShortcut } = require('electron');
const fs = require('fs');
const path = require('path');
const isDev = !app.isPackaged;

let mainWindow;
let browserView;
let isOnline = true;
const tabViews = new Map(); // Map of tabId -> BrowserView for active tabs only
const suspendedTabs = new Set(); // Track suspended tabs

const extensionsPath = path.join(app.getPath('userData'), 'extensions');
const memoryPath = path.join(app.getPath('userData'), 'ai_memory.jsonl');

if (!fs.existsSync(extensionsPath)) {
  try { fs.mkdirSync(extensionsPath, { recursive: true }); } catch (e) { }
}

const { ElectronBlocker } = require('@ghostery/adblocker-electron');
const fetch = require('cross-fetch');

// Custom protocol for authentication
const PROTOCOL = 'comet-browser';
app.setAsDefaultProtocolClient(PROTOCOL);

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
    frame: false,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: false
    },
    titleBarStyle: 'hidden',
    backgroundColor: '#0D0E1C',
    icon: path.join(__dirname, 'icon.ico')
  });

  mainWindow.setMenuBarVisibility(false);

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

  // BrowserView setup with Chrome User-Agent
  const chromeUserAgent = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

  browserView = new BrowserView({
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: true
    },
  });

  // Set Chrome User-Agent for browser detection
  browserView.webContents.setUserAgent(chromeUserAgent);

  mainWindow.setBrowserView(browserView);

  browserView.webContents.on('did-navigate', (event, url) => {
    console.log('[BrowserView] Navigated to:', url);
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
    console.log('[BrowserView] In-page navigation:', url);
    mainWindow.webContents.send('browser-view-url-changed', url);
  });

  // Set initial bounds to make BrowserView visible
  const initialBounds = {
    x: 280,  // Assuming sidebar width
    y: 112,  // Header height (titlebar + toolbar)
    width: mainWindow.getBounds().width - 280,
    height: mainWindow.getBounds().height - 112
  };

  browserView.setBounds(initialBounds);
  console.log('[BrowserView] Initial bounds set:', initialBounds);
  console.log('[BrowserView] BrowserView created and attached to main window');

  browserView.webContents.loadURL('https://www.google.com');
  console.log('[BrowserView] Loading initial URL: https://www.google.com');

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

  // Set Chrome User-Agent for all sessions (for browser detection)
  session.defaultSession.setUserAgent(chromeUserAgent);

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

// Window Controls
ipcMain.on('minimize-window', () => {
  if (mainWindow) mainWindow.minimize();
});

ipcMain.on('maximize-window', () => {
  if (mainWindow) {
    if (mainWindow.isMaximized()) {
      mainWindow.unmaximize();
    } else {
      mainWindow.maximize();
    }
  }
});

ipcMain.on('close-window', () => {
  if (mainWindow) mainWindow.close();
});

ipcMain.on('open-auth-window', (event, authUrl) => {
  // Instead of opening a new window, open the URL in the user's default browser
  shell.openExternal(authUrl);
});

ipcMain.on('set-browser-view-bounds', (event, bounds) => {
  console.log('[IPC] set-browser-view-bounds received:', bounds);
  if (browserView && mainWindow) {
    const roundedBounds = {
      x: Math.round(bounds.x),
      y: Math.round(bounds.y),
      width: Math.round(bounds.width),
      height: Math.round(bounds.height),
    };
    browserView.setBounds(roundedBounds);
    console.log('[BrowserView] Bounds updated to:', roundedBounds);
  } else {
    console.error('[BrowserView] Cannot set bounds - browserView or mainWindow is null');
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

// Tab Optimization Handlers
ipcMain.on('suspend-tab', (event, tabId) => {
  const view = tabViews.get(tabId);
  if (view && view !== browserView) {
    // Hide and pause the view
    view.setBounds({ x: 0, y: 0, width: 0, height: 0 });
    view.webContents.executeJavaScript(`
      document.body.style.display = 'none';
      if (window.stop) window.stop();
    `).catch(() => { });
    suspendedTabs.add(tabId);
    console.log(`Tab ${tabId} suspended`);
  }
});

ipcMain.on('resume-tab', (event, tabId) => {
  const view = tabViews.get(tabId);
  if (view && suspendedTabs.has(tabId)) {
    // Restore view
    view.webContents.executeJavaScript(`
      document.body.style.display = '';
    `).catch(() => { });
    suspendedTabs.delete(tabId);
    console.log(`Tab ${tabId} resumed`);
  }
});

ipcMain.handle('get-memory-usage', async () => {
  const process = require('process');
  const usage = process.memoryUsage();
  return {
    heapUsed: Math.round(usage.heapUsed / 1048576), // MB
    heapTotal: Math.round(usage.heapTotal / 1048576), // MB
    rss: Math.round(usage.rss / 1048576), // MB
    activeTabs: tabViews.size,
    suspendedTabs: suspendedTabs.size,
  };
});

ipcMain.on('update-shortcuts', (event, shortcuts) => {
  globalShortcut.unregisterAll();
  shortcuts.forEach(s => {
    try {
      globalShortcut.register(s.accelerator, () => {
        if (mainWindow) mainWindow.webContents.send('execute-shortcut', s.action);
      });
    } catch (e) {
      console.error(`Failed to register shortcut ${s.accelerator}:`, e);
    }
  });
});

app.on('open-url', (event, url) => {
  event.preventDefault();
  if (mainWindow) {
    // Bring the main window to the front
    if (mainWindow.isMinimized()) mainWindow.restore();
    mainWindow.focus();
    // Send the URL to the renderer process
    mainWindow.webContents.send('auth-callback', url);
  }
});

app.whenReady().then(() => {
  createWindow();

  // Register Global Shortcuts
  const shortcuts = [
    { accelerator: 'CommandOrControl+T', action: 'new-tab' },
    { accelerator: 'CommandOrControl+W', action: 'close-tab' },
    { accelerator: 'CommandOrControl+Tab', action: 'next-tab' },
    { accelerator: 'CommandOrControl+Shift+Tab', action: 'prev-tab' },
    { accelerator: 'CommandOrControl+B', action: 'toggle-sidebar' },
    { accelerator: 'CommandOrControl+,', action: 'open-settings' },
    { accelerator: 'CommandOrControl+Shift+N', action: 'new-incognito-tab' },
  ];

  shortcuts.forEach(s => {
    try {
      globalShortcut.register(s.accelerator, () => {
        if (mainWindow) mainWindow.webContents.send('execute-shortcut', s.action);
      });
    } catch (e) {
      console.error(`Failed to register shortcut ${s.accelerator}:`, e);
    }
  });
});

app.on('will-quit', () => {
  globalShortcut.unregisterAll();
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});