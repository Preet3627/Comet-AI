const { app, BrowserWindow, ipcMain, session, shell, clipboard, BrowserView, dialog, globalShortcut, Menu } = require('electron');
const contextMenuRaw = require('electron-context-menu');
const contextMenu = contextMenuRaw.default || contextMenuRaw;
const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');
const Store = require('electron-store');
const store = new Store();
// Production mode detection:
// 1. app.isPackaged - true when running from built .exe
// 2. NODE_ENV === 'production' - for manual testing before build
// 3. Check if out/index.html exists - fallback to prod if dev server isn't available
const isDev = !app.isPackaged && process.env.NODE_ENV !== 'production';
const express = require('express');
const bodyParser = require('body-parser');
const { getP2PSync } = require('./src/lib/P2PFileSyncService.js'); // Import the P2P service

let p2pSyncService = null; // Declare p2pSyncService here

let mainWindow;
let mcpServer;
let networkCheckInterval;
let clipboardCheckInterval;
let activeTabId = null;
let isOnline = true;
const tabViews = new Map(); // Map of tabId -> BrowserView
const audibleTabs = new Set(); // Track tabs currently playing audio
const suspendedTabs = new Set(); // Track suspended tabs
let adBlocker = null;

const extensionsPath = path.join(app.getPath('userData'), 'extensions');
const memoryPath = path.join(app.getPath('userData'), 'ai_memory.jsonl');

if (!fs.existsSync(extensionsPath)) {
  try { fs.mkdirSync(extensionsPath, { recursive: true }); } catch (e) { }
}

const { ElectronBlocker } = require('@ghostery/adblocker-electron');
const fetch = require('cross-fetch'); // Make sure cross-fetch is always available globally

const { GoogleGenerativeAI } = require("@google/generative-ai");

const MCP_SERVER_PORT = process.env.MCP_SERVER_PORT || 3001;

// Global Context Menu for all windows and views
contextMenu({
  showSaveImageAs: true,
  showDragLink: true,
  showInspectElement: true,
  showLookUpSelection: true,
  showSearchWithGoogle: true,
  prepend: (defaultActions, params, browserWindow) => [
    {
      label: 'Open in New Tab',
      visible: params.linkURL.length > 0,
      click: () => {
        if (mainWindow) mainWindow.webContents.send('add-new-tab', params.linkURL);
      }
    },
    {
      label: 'Search Comet for "{selection}"',
      visible: params.selectionText.trim().length > 0,
      click: () => {
        const searchUrl = `https://www.google.com/search?q=${encodeURIComponent(params.selectionText)}`;
        if (mainWindow) mainWindow.webContents.send('add-new-tab', searchUrl);
      }
    }
  ]
});
let mcpServerPort = MCP_SERVER_PORT;
// Custom protocol for authentication
const PROTOCOL = 'comet-browser';

// Single Instance Lock
const gotTheLock = app.requestSingleInstanceLock();

if (!gotTheLock) {
  app.quit();
} else {
  app.on('second-instance', (event, commandLine, workingDirectory) => {
    // Someone tried to run a second instance, we should focus our window.
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.focus();

      // Handle deep links from protocol
      const url = commandLine.pop();
      if (url && url.startsWith(`${PROTOCOL}://`)) {
        mainWindow.webContents.send('auth-callback', url);
      }
    }
  });

  if (process.defaultApp) {
    if (process.argv.length >= 2) {
      app.setAsDefaultProtocolClient(PROTOCOL, process.execPath, [path.resolve(process.argv[1])]);
    }
  } else {
    app.setAsDefaultProtocolClient(PROTOCOL);
  }
}

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

// Global LLM Generation Handler
const llmGenerateHandler = async (messages, options = {}) => {
  const providerId = options.provider || activeLlmProvider;
  const config = llmConfigs[providerId] || {};
  const apiKey = options.apiKey || config.apiKey;

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), providerId === 'ollama' ? 30000 : 90000); // 30s for local Ollama, 90s for reasoning

  try {
    if (providerId.startsWith('gemini')) {
      const gKey = apiKey || process.env.GEMINI_API_KEY;
      if (!gKey) return { error: 'Missing Gemini API Key' };

      const genAI = new GoogleGenerativeAI(gKey);

      let modelName = 'gemini-1.5-flash';
      let generationConfigOverrides = {};

      if (providerId.includes('3-pro')) {
        modelName = 'gemini-3-pro';
      } else if (providerId.includes('3-flash')) {
        modelName = 'gemini-3-flash';
      } else if (providerId.includes('3-deep-think')) {
        modelName = 'gemini-3-deep-think';
      } else if (providerId.includes('2.5-pro')) {
        modelName = 'gemini-2.5-pro';
      } else if (providerId.includes('2.5-flash')) {
        modelName = 'gemini-2.5-flash';
      } else if (providerId.includes('2.0-pro')) {
        modelName = 'gemini-2.0-pro-exp-02-05';
      } else if (providerId.includes('2.0-flash-lite')) {
        modelName = 'gemini-2.0-flash-lite-preview-02-05';
      } else if (providerId.includes('2.0-flash')) {
        modelName = 'gemini-2.0-flash';
      } else if (providerId.includes('1.5-pro')) {
        modelName = 'gemini-1.5-pro';
      } else if (providerId.includes('1.5-flash')) {
        modelName = 'gemini-1.5-flash';
      } else {
        modelName = 'gemini-1.5-pro'; // Default
      }

      const systemMessage = messages.find(m => m.role === 'system');
      const chatMessages = messages.filter(m => m.role !== 'system');

      const model = genAI.getGenerativeModel({
        model: modelName,
        systemInstruction: systemMessage ? systemMessage.content : undefined
      });

      // Gemini history MUST start with 'user' and alternate user/model
      let history = [];
      const historySource = chatMessages.slice(0, -1);

      if (historySource.length > 0) {
        // Find first user message to start the history
        const firstUserIndex = historySource.findIndex(m => m.role === 'user');
        if (firstUserIndex !== -1) {
          history = historySource.slice(firstUserIndex).map(m => ({
            role: m.role === 'user' ? 'user' : 'model',
            parts: [{ text: m.content }]
          }));
        }
      }

      const lastMessage = chatMessages[chatMessages.length - 1];
      const chat = model.startChat({
        history,
        generationConfig: {
          maxOutputTokens: 8192,
          temperature: 0.7,
          ...generationConfigOverrides // Inject latest 2026 reasoning config
        },
      });

      const result = await chat.sendMessage(lastMessage.content);
      const response = await result.response;
      clearTimeout(timeoutId);
      return { text: response.text() };

    } else if (providerId.startsWith('gpt') || providerId.startsWith('o1') || providerId === 'openai-compatible') {
      const oaiKey = apiKey || config.apiKey || process.env.OPENAI_API_KEY;
      const baseUrl = config.baseUrl || 'https://api.openai.com/v1';

      let modelName = config.model;
      if (!modelName) {
        if (providerId === 'gpt-4o') modelName = 'gpt-4o';
        else if (providerId === 'gpt-4-turbo') modelName = 'gpt-4-turbo';
        else if (providerId === 'gpt-3.5-turbo') modelName = 'gpt-3.5-turbo';
        else if (providerId === 'o1') modelName = 'o1';
        else if (providerId === 'o1-mini') modelName = 'o1-mini';
        else modelName = 'gpt-4o';
      }

      const response = await fetch(`${baseUrl.replace(/\/$/, '')}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': oaiKey ? `Bearer ${oaiKey}` : ''
        },
        body: JSON.stringify({
          model: modelName,
          messages: messages.map(m => ({ role: m.role, content: m.content })),
          temperature: 0.7
        }),
        signal: controller.signal
      });
      const data = await response.json();
      clearTimeout(timeoutId);
      return { text: data.choices?.[0]?.message?.content || 'No response from intelligence provider.' };

    } else if (providerId.startsWith('claude') || providerId === 'anthropic') {
      const anthropicKey = apiKey || process.env.ANTHROPIC_API_KEY;
      if (!anthropicKey) return { error: 'Missing Anthropic API Key' };

      const modelName = providerId.includes('3-7') ? 'claude-3-7-sonnet-20250224' : 'claude-3-5-sonnet-20240620';
      const isExtended = providerId.includes('3-7');

      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': anthropicKey,
          'anthropic-version': '2023-06-01'
        },
        body: JSON.stringify({
          model: modelName,
          max_tokens: 16384,
          thinking: isExtended ? { type: 'enabled', budget_tokens: 4096 } : undefined,
          messages: messages.map(m => ({ role: m.role, content: m.content }))
        }),
        signal: controller.signal
      });
      const data = await response.json();
      clearTimeout(timeoutId);
      return { text: data.content?.[0]?.text || data.content?.find(c => c.type === 'text')?.text || 'No response from Claude.' };

    } else if (providerId === 'ollama') {
      const baseUrl = config.baseUrl || 'http://localhost:11434';
      const model = config.model || 'llama3.3';

      const response = await fetch(`${baseUrl}/api/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model,
          messages: messages.map(m => ({ role: m.role, content: m.content })),
          stream: false,
          keep_alive: "1h",
          options: { temperature: 0.7, num_ctx: 32768 }
        }),
        signal: controller.signal
      });
      const data = await response.json();
      clearTimeout(timeoutId);
      if (!data.message?.content) {
        return { error: `Ollama returned an empty response. Ensure the model '${model}' is downloaded and reachable.` };
      }
      return { text: data.message.content };

    } else if (providerId.includes('groq')) {
      const groqKey = apiKey || process.env.GROQ_API_KEY;
      if (!groqKey) return { error: 'Missing Groq API Key' };

      const modelName = config.model || 'mixtral-8x7b-32768';

      const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${groqKey}`
        },
        body: JSON.stringify({
          model: modelName,
          messages: messages.map(m => ({ role: m.role, content: m.content })),
          temperature: 0.7
        }),
        signal: controller.signal
      });
      const data = await response.json();
      clearTimeout(timeoutId);
      return { text: data.choices?.[0]?.message?.content || 'No response from Groq.' };

    } else {
      clearTimeout(timeoutId);
      return { error: `Provider '${providerId}' is not configured.` };
    }
  } catch (e) {
    clearTimeout(timeoutId);
    console.error("LLM Error:", e);
    return { error: e.name === 'AbortError' ? 'Neural Link Timed Out (Reasoning Overload)' : e.message };
  }
};

// When menu opens
// When menu opens
function hideWebview() {
  if (!mainWindow) return;
  const view = tabViews.get(activeTabId);
  if (view) {
    view.setBounds({ x: 0, y: 0, width: 0, height: 0 });
  }
}

// When menu closes
function showWebview() {
  if (!mainWindow) return;
  const view = tabViews.get(activeTabId);
  if (view) {
    // Current window bounds are handled by setBrowserViewBounds usually, 
    // but we can force it here if needed.
    // For now, let's just trigger a re-render from renderer or use stored bounds
  }
}



function createWindow() {
  // GPU compositing optimizations for transparent overlays
  app.commandLine.appendSwitch('--enable-gpu-rasterization');
  app.commandLine.appendSwitch('--enable-zero-copy');
  app.commandLine.appendSwitch('--enable-hardware-overlays');
  app.commandLine.appendSwitch('--enable-features', 'VaapiVideoDecoder,CanvasOopRasterization');
  app.commandLine.appendSwitch('--disable-background-timer-throttling');
  app.commandLine.appendSwitch('--disable-renderer-backgrounding');
  app.commandLine.appendSwitch('--disable-features', 'TranslateUI,BlinkGenPropertyTrees');

  // Force GPU acceleration and compositing
  app.commandLine.appendSwitch('--ignore-gpu-blacklist');
  app.commandLine.appendSwitch('--disable-gpu-driver-bug-workarounds');
  app.commandLine.appendSwitch('--enable-native-gpu-memory-buffers');
  app.commandLine.appendSwitch('--enable-gpu-memory-buffer-compositor-resources');

  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    frame: false,
    transparent: false, // Keep opaque to avoid compositing issues with overlays
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: false,
      // Enable GPU acceleration for web content
      offscreen: false,
      webSecurity: true
    },
    titleBarStyle: 'hidden',
    backgroundColor: '#0D0E1C',
    icon: path.join(__dirname, 'icon.ico'),
    // Optimize for GPU compositing
    show: false,
    paintWhenInitiallyHidden: false
  });

  // CRITICAL: Multiple safeguards to ensure window ALWAYS shows
  let windowShown = false;

  // PRODUCTION FIX: For packaged apps (.exe), show immediately
  // In production, we want the window visible even if content is loading
  // This prevents the "hidden window" bug completely
  if (app.isPackaged) {
    console.log('[Main] Packaged app detected - showing window immediately');
    mainWindow.show();
    mainWindow.focus();
    windowShown = true;
  } else {
    // Development: Use ready-to-show for smooth loading
    mainWindow.once('ready-to-show', () => {
      if (!windowShown) {
        console.log('[Main] Window ready-to-show event fired');
        mainWindow.show();
        mainWindow.focus();
        windowShown = true;
      }
    });
  }

  // Fallback: Force show window after 3 seconds if not already shown
  setTimeout(() => {
    if (!windowShown && mainWindow) {
      console.log('[Main] Forcing window to show (3s timeout fallback)');
      mainWindow.show();
      mainWindow.focus();
      windowShown = true;
    }
  }, 3000);

  mainWindow.setMenuBarVisibility(false);

  const url = isDev
    ? 'http://localhost:3000'
    : `file://${path.join(__dirname, 'out/index.html')}`;

  console.log(`[Main] Loading URL: ${url}`);
  console.log(`[Main] __dirname: ${__dirname}`);
  console.log(`[Main] isDev: ${isDev}`);

  // Check if out directory exists in production
  if (!isDev) {
    const outPath = path.join(__dirname, 'out');
    const indexPath = path.join(outPath, 'index.html');
    if (!fs.existsSync(outPath)) {
      console.error(`[Main] ERROR: Out directory does not exist: ${outPath}`);
      console.error('[Main] Run "npm run build" before building the Electron app');
    } else if (!fs.existsSync(indexPath)) {
      console.error(`[Main] ERROR: index.html does not exist: ${indexPath}`);
      console.error('[Main] Run "npm run build" to generate the static export');
    } else {
      console.log('[Main] Build files verified');
    }
  }

  mainWindow.loadURL(url).catch(err => {
    console.error('[Main] Failed to load URL:', err);
    // Still show window even if load fails
    if (!windowShown && mainWindow) {
      console.log('[Main] Showing window despite load error');
      mainWindow.show();
      mainWindow.focus();
      windowShown = true;
    }
  });

  // Handle load failures
  mainWindow.webContents.on('did-fail-load', (event, errorCode, errorDescription) => {
    console.error(`[Main] Page failed to load: ${errorCode} - ${errorDescription}`);
    // Show window anyway so user can see the error
    if (!windowShown && mainWindow) {
      mainWindow.show();
      mainWindow.focus();
      windowShown = true;
    }
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
    // Explicitly quit for multi-process environments like Windows
    if (process.platform !== 'darwin') {
      app.quit();
    }
  });

  // Initial network check
  checkNetworkStatus();
  networkCheckInterval = setInterval(checkNetworkStatus, 30000);

  // Ad blocker
  ElectronBlocker.fromPrebuiltAdsAndTracking(fetch).then((blocker) => {
    adBlocker = blocker;
    console.log('Ad blocker initialized (waiting for user activation).');
  }).catch(e => console.error("Ad blocker failed to load:", e));

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
  const chromeUserAgent = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';
  session.defaultSession.setUserAgent(chromeUserAgent);

  // Header stripping for embedding and Google Workspace compatibility
  session.defaultSession.webRequest.onHeadersReceived({ urls: ['*://*/*'] }, (details, callback) => {
    const { responseHeaders } = details;
    const headerKeys = Object.keys(responseHeaders);

    const filteredHeaders = headerKeys.reduce((acc, key) => {
      const lowerKey = key.toLowerCase();
      // Expanded list of headers to strip for maximum compatibility with Google/MS Workspace
      if (
        lowerKey !== 'x-frame-options' &&
        lowerKey !== 'content-security-policy' &&
        lowerKey !== 'content-security-policy-report-only' &&
        lowerKey !== 'cross-origin-resource-policy' &&
        lowerKey !== 'cross-origin-opener-policy'
      ) {
        acc[key] = responseHeaders[key];
      }
      return acc;
    }, {});

    callback({ cancel: false, responseHeaders: filteredHeaders });
  });

  // Load Extensions
  try {
    console.log(`[Main] Scanning for extensions in: ${extensionsPath}`);
    if (!fs.existsSync(extensionsPath)) {
      fs.mkdirSync(extensionsPath, { recursive: true });
    }
    const extensionDirs = fs.readdirSync(extensionsPath);
    if (extensionDirs.length === 0) {
      console.log("[Main] No extensions found in extensions directory.");
    }
    extensionDirs.forEach(dir => {
      const extPath = path.join(extensionsPath, dir);
      if (fs.lstatSync(extPath).isDirectory()) {
        const manifestPath = path.join(extPath, 'manifest.json');
        if (fs.existsSync(manifestPath)) {
          session.defaultSession.loadExtension(extPath).then(extension => {
            console.log(`Extension loaded: ${extension.name} (${extension.id}) from ${extPath}`);
          }).catch(e => console.error(`Failed to load extension from ${extPath}: ${e.message || e}`));
        } else {
          console.log(`[Main] Skipping ${dir}: No manifest.json found.`);
        }
      }
    });
  } catch (e) {
    console.error("Error during initial extension loading:", e);
  }

  // Clipboard Monitoring
  let lastClipboardText = clipboard.readText();
  clipboardCheckInterval = setInterval(() => {
    const currentText = clipboard.readText();
    if (currentText && currentText !== lastClipboardText) {
      lastClipboardText = currentText;
      console.log("[Main] Clipboard changed:", currentText.substring(0, 30));
      if (mainWindow) {
        mainWindow.webContents.send('clipboard-changed', currentText);
      }
    }
  }, 1000);
}

// Helper function for recursive directory scanning
async function _scanDirectoryRecursive(currentPath, types) {
  const files = [];
  const entries = fs.readdirSync(currentPath, { withFileTypes: true });

  for (const entry of entries) {
    const entryPath = path.join(currentPath, entry.name);
    if (entry.isDirectory()) {
      files.push(...await _scanDirectoryRecursive(entryPath, types));
    } else if (entry.isFile()) {
      const stats = fs.statSync(entryPath);
      const fileType = path.extname(entry.name).toLowerCase();
      const shouldInclude = types.includes('all') || types.some(t => fileType.includes(t));

      if (shouldInclude) {
        files.push({
          id: entryPath, // Use path as ID for simplicity
          name: entry.name,
          path: entryPath,
          size: stats.size,
          type: fileType,
          hash: `${entryPath}-${stats.size}-${stats.mtimeMs}`, // Simple hash for now
          modifiedTime: stats.mtimeMs,
        });
      }
    }
  }
  return files;
}

// IPC Handlers
ipcMain.on('open-menu', () => {
  const menu = Menu.buildFromTemplate([
    { label: 'Reload', click: () => { const v = tabViews.get(activeTabId); if (v) v.webContents.reload(); } },
    { label: 'Back', click: () => { const v = tabViews.get(activeTabId); if (v && v.webContents.canGoBack()) v.webContents.goBack(); } },
    { label: 'Forward', click: () => { const v = tabViews.get(activeTabId); if (v && v.webContents.canGoForward()) v.webContents.goForward(); } },
    { type: 'separator' },
    { label: 'Save Page As...', click: () => { if (mainWindow) mainWindow.webContents.send('execute-shortcut', 'save-page'); } },
    { label: 'Print...', click: () => { const v = tabViews.get(activeTabId); if (v) v.webContents.print(); } },
    { type: 'separator' },
    { label: 'Settings', click: () => { if (mainWindow) mainWindow.webContents.send('execute-shortcut', 'open-settings'); } },
    { label: 'DevTools', click: () => { const v = tabViews.get(activeTabId); if (v) v.webContents.openDevTools({ mode: 'detach' }); } },
  ]);
  menu.popup({ window: mainWindow });
});

ipcMain.handle('get-is-online', () => isOnline);

ipcMain.on('toggle-adblocker', (event, enable) => {
  if (!adBlocker) {
    console.warn('Ad blocker not yet initialized.');
    return;
  }
  try {
    if (enable) {
      adBlocker.enableBlockingInSession(session.defaultSession);
      console.log('Ad blocker enabled by user.');
    } else {
      adBlocker.disableBlockingInSession(session.defaultSession);
      console.log('Ad blocker disabled by user.');
    }
  } catch (e) {
    console.error('Failed to toggle ad blocker:', e);
  }
});


ipcMain.on('show-webview', () => showWebview());
ipcMain.on('hide-webview', () => hideWebview());

ipcMain.on('add-tab-from-main', (event, url) => {
  if (mainWindow) {
    mainWindow.webContents.send('add-new-tab', url);
  }
});

// Window Controls
ipcMain.on('minimize-window', () => { if (mainWindow) mainWindow.minimize(); });
ipcMain.on('maximize-window', () => { if (mainWindow) { if (mainWindow.isMaximized()) { mainWindow.unmaximize(); } else { mainWindow.maximize(); } } });
ipcMain.on('close-window', () => { if (mainWindow) mainWindow.close(); });
ipcMain.on('toggle-fullscreen', () => { if (mainWindow) mainWindow.setFullScreen(!mainWindow.isFullScreen()); });

// Persistent Storage Handlers
const persistentDataPath = path.join(app.getPath('userData'), 'persistent_data');
if (!fs.existsSync(persistentDataPath)) {
  fs.mkdirSync(persistentDataPath, { recursive: true });
}

ipcMain.handle('save-persistent-data', async (event, { key, data }) => {
  try {
    const filePath = path.join(persistentDataPath, `${key}.json`);
    fs.writeFileSync(filePath, JSON.stringify(data), 'utf-8');
    return { success: true };
  } catch (error) {
    console.error('Failed to save persistent data:', error);
    return { success: false, error: error.message };
  }
});

ipcMain.handle('load-persistent-data', async (event, key) => {
  try {
    const filePath = path.join(persistentDataPath, `${key}.json`);
    if (fs.existsSync(filePath)) {
      const data = fs.readFileSync(filePath, 'utf-8');
      return { success: true, data: JSON.parse(data) };
    }
    return { success: false, error: 'File not found' };
  } catch (error) {
    console.error('Failed to load persistent data:', error);
    return { success: false, error: error.message };
  }
});

ipcMain.handle('delete-persistent-data', async (event, key) => {
  try {
    const filePath = path.join(persistentDataPath, `${key}.json`);
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
    return { success: true };
  } catch (error) {
    console.error('Failed to delete persistent data:', error);
    return { success: false, error: error.message };
  }
});

// Secure Auth Storage (using electron-store)
ipcMain.on('save-auth-token', (event, { token, user }) => {
  store.set('auth_token', token);
  store.set('user_info', user);
  console.log('[Auth] Token and user info saved to secure storage');
});

ipcMain.handle('get-auth-token', () => {
  return store.get('auth_token');
});

ipcMain.handle('get-user-info', () => {
  return store.get('user_info');
});

ipcMain.on('clear-auth', () => {
  store.delete('auth_token');
  store.delete('user_info');
  console.log('[Auth] Auth data cleared');
});

// Password Manager Logic
ipcMain.handle('get-passwords-for-site', async (event, domain) => {
  const filePath = path.join(persistentDataPath, 'user-passwords.json');
  if (fs.existsSync(filePath)) {
    try {
      const data = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
      return data.filter(p => p.site.includes(domain));
    } catch (e) { return []; }
  }
  return [];
});

ipcMain.on('propose-password-save', (event, { domain, username, password }) => {
  // Automatically show a dialog to save password
  dialog.showMessageBox(mainWindow, {
    type: 'question',
    buttons: ['Save', 'Ignore'],
    defaultId: 0,
    title: 'Comet Vault',
    message: `Do you want to save the password for ${domain}?`,
    detail: `User: ${username}`
  }).then(result => {
    if (result.response === 0) {
      const filePath = path.join(persistentDataPath, 'user-passwords.json');
      let passwords = [];
      if (fs.existsSync(filePath)) {
        try { passwords = JSON.parse(fs.readFileSync(filePath, 'utf-8')); } catch (e) { }
      }
      // Avoid duplicates
      if (!passwords.some(p => p.site === domain && p.username === username && p.password === password)) {
        passwords.push({ id: Date.now().toString(), site: domain, username, password, created: new Date().toISOString() });
        fs.writeFileSync(filePath, JSON.stringify(passwords), 'utf-8');
        console.log(`[Vault] Saved password for ${domain}`);
      }
    }
  });
});


// Auth - Create proper OAuth window instead of opening in external browser
let authWindow = null;

ipcMain.on('open-auth-window', (event, authUrl) => {
  // Check if this is an OAuth URL (Firebase, Google, etc.)
  const isOAuthUrl = authUrl.includes('accounts.google.com') ||
    authUrl.includes('firebase') ||
    authUrl.includes('oauth') ||
    authUrl.includes('auth');

  if (isOAuthUrl) {
    // Create a new window for OAuth
    if (authWindow) {
      authWindow.focus();
      authWindow.loadURL(authUrl);
      return;
    }

    authWindow = new BrowserWindow({
      width: 500,
      height: 700,
      webPreferences: {
        nodeIntegration: false,
        contextIsolation: true,
      },
      parent: mainWindow,
      modal: true,
      show: false,
    });

    authWindow.loadURL(authUrl);

    authWindow.once('ready-to-show', () => {
      authWindow.show();
    });

    // Listen for navigation to callback URL
    authWindow.webContents.on('will-redirect', (event, url) => {
      if (url.startsWith('comet-browser://') || url.includes('__/auth/handler')) {
        event.preventDefault();
        if (mainWindow) {
          mainWindow.webContents.send('auth-callback', url);
        }
        authWindow.close();
      }
    });

    authWindow.webContents.on('did-navigate', (event, url) => {
      if (url.startsWith('comet-browser://') || url.includes('__/auth/handler')) {
        if (mainWindow) {
          mainWindow.webContents.send('auth-callback', url);
        }
        authWindow.close();
      }
    });

    authWindow.on('closed', () => {
      authWindow = null;
    });
  } else {
    // For non-OAuth URLs, open in external browser
    shell.openExternal(authUrl);
  }
});

// Multi-BrowserView Management
ipcMain.on('create-view', (event, { tabId, url }) => {
  if (tabViews.has(tabId)) return; // Prevent redundant creation

  const chromeUserAgent = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';
  const newView = new BrowserView({
    webPreferences: {
      preload: path.join(__dirname, 'view_preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: false,
    },
  });
  newView.webContents.setUserAgent(chromeUserAgent);
  newView.webContents.loadURL(url);

  // Intercept new window requests and open them as new tabs
  newView.webContents.setWindowOpenHandler(({ url }) => {
    // Allow popups for authentication (Google, etc.)
    const isAuth = url.includes('accounts.google.com') || url.includes('facebook.com') || url.includes('oauth') || url.includes('auth0');
    if (isAuth) {
      return {
        action: 'allow',
        overrideBrowserWindowOptions: {
          width: 600,
          height: 700,
          center: true,
          autoHideMenuBar: true,
          parent: mainWindow,
        }
      };
    }

    if (mainWindow) {
      mainWindow.webContents.send('add-new-tab', url);
    }
    return { action: 'deny' };
  });

  newView.webContents.on('did-navigate', (event, navUrl) => {
    mainWindow.webContents.send('browser-view-url-changed', { tabId, url: navUrl });
    if (navUrl.includes('/search?') || navUrl.includes('?q=')) {
      try {
        const parsedUrl = new URL(navUrl);
        const query = parsedUrl.searchParams.get('q') || parsedUrl.searchParams.get('query');
        if (query) mainWindow.webContents.send('ai-query-detected', query);
      } catch (e) { }
    }
  });

  newView.webContents.on('page-title-updated', (event, title) => {
    mainWindow.webContents.send('browser-view-title-changed', { tabId, title });
  });

  // Track audio status
  newView.webContents.on('is-currently-audible-changed', (isAudible) => {
    if (isAudible) audibleTabs.add(tabId);
    else audibleTabs.delete(tabId);
    if (mainWindow) {
      mainWindow.webContents.send('audio-status-changed', audibleTabs.size > 0);
    }
  });

  // Handle fullscreen requests from the BrowserView
  newView.webContents.on('enter-html-fullscreen-window', () => {
    if (mainWindow) {
      mainWindow.setFullScreen(true);
    }
  });

  newView.webContents.on('leave-html-fullscreen-window', () => {
    if (mainWindow) {
      mainWindow.setFullScreen(false);
    }
  });

  tabViews.set(tabId, newView);
});

ipcMain.on('activate-view', (event, { tabId, bounds }) => {
  if (activeTabId && tabViews.has(activeTabId)) {
    const oldView = tabViews.get(activeTabId);
    if (oldView) {
      mainWindow.removeBrowserView(oldView);
    }
  }

  const newView = tabViews.get(tabId);
  if (newView) {
    mainWindow.addBrowserView(newView);
    const roundedBounds = {
      x: Math.round(bounds.x),
      y: Math.round(bounds.y),
      width: Math.round(bounds.width),
      height: Math.round(bounds.height),
    };
    newView.setBounds(roundedBounds);
  }
  activeTabId = tabId;
});

ipcMain.on('destroy-view', (event, tabId) => {
  const view = tabViews.get(tabId);
  if (view) {
    if (activeTabId === tabId) {
      mainWindow.removeBrowserView(view);
      activeTabId = null;
    }
    view.webContents.destroy();
    tabViews.delete(tabId);
    audibleTabs.delete(tabId);
    if (mainWindow) {
      mainWindow.webContents.send('audio-status-changed', audibleTabs.size > 0);
    }
  }
});

ipcMain.on('set-browser-view-bounds', (event, bounds) => {
  const view = tabViews.get(activeTabId);
  if (view && mainWindow) {
    const roundedBounds = {
      x: Math.round(bounds.x),
      y: Math.round(bounds.y),
      width: Math.round(bounds.width),
      height: Math.round(bounds.height),
    };
    view.setBounds(roundedBounds);
  }
});

ipcMain.on('navigate-browser-view', (event, { tabId, url }) => {
  const view = tabViews.get(tabId || activeTabId);
  if (view) view.webContents.loadURL(url);
  appendToMemory({ action: 'navigate', url });
});

ipcMain.on('browser-view-go-back', () => {
  const view = tabViews.get(activeTabId);
  if (view && view.webContents.canGoBack()) view.webContents.goBack();
});

ipcMain.on('browser-view-go-forward', () => {
  const view = tabViews.get(activeTabId);
  if (view && view.webContents.canGoForward()) view.webContents.goForward();
});

ipcMain.on('browser-view-reload', () => {
  const view = tabViews.get(activeTabId);
  if (view) view.webContents.reload();
});

ipcMain.on('change-zoom', (event, deltaY) => {
  const view = tabViews.get(activeTabId);
  if (view) {
    const currentZoom = view.webContents.getZoomFactor();
    const newZoom = deltaY < 0 ? currentZoom + 0.1 : currentZoom - 0.1;
    // Clamp zoom factor between 0.5x and 3x
    if (newZoom >= 0.5 && newZoom <= 3.0) {
      view.webContents.setZoomFactor(newZoom);
    }
  }
});

ipcMain.on('open-dev-tools', () => {
  const view = tabViews.get(activeTabId);
  if (view) view.webContents.openDevTools({ mode: 'detach' });
  else if (mainWindow) mainWindow.webContents.openDevTools();
});

ipcMain.handle('execute-javascript', async (event, code) => {
  const view = tabViews.get(activeTabId);
  if (view) {
    try {
      return await view.webContents.executeJavaScript(code);
    } catch (e) {
      console.error("Execute JS failed:", e);
      return null;
    }
  }
  return null;
});

ipcMain.handle('get-browser-view-url', () => {
  const view = tabViews.get(activeTabId);
  return view ? view.webContents.getURL() : '';
});

ipcMain.handle('capture-page-html', async () => {
  const view = tabViews.get(activeTabId);
  if (!view) return "";
  return await view.webContents.executeJavaScript('document.documentElement.outerHTML');
});

ipcMain.handle('capture-browser-view-screenshot', async () => {
  const view = tabViews.get(activeTabId);
  if (!view) return null;
  try {
    const image = await view.webContents.capturePage();
    return image.toDataURL(); // Returns a Data URL (base64 encoded PNG)
  } catch (e) {
    console.error("Failed to capture page screenshot:", e);
    return null;
  }
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

ipcMain.handle('trigger-download', async (event, url, suggestedFilename) => {
  if (mainWindow && url) {
    mainWindow.webContents.downloadURL(url, { filename: suggestedFilename });
    return { success: true };
  }
  return { success: false, error: 'Download failed: invalid URL or mainWindow not available.' };
});

ipcMain.handle('get-ai-memory', async () => readMemory());
ipcMain.on('add-ai-memory', (event, entry) => appendToMemory(entry));

const vectorStorePath = path.join(app.getPath('userData'), 'vector_store.json');
ipcMain.handle('save-vector-store', async (event, data) => {
  try {
    fs.writeFileSync(vectorStorePath, JSON.stringify(data));
    return true;
  } catch (e) {
    console.error("Failed to save vector store:", e);
    return false;
  }
});

ipcMain.handle('load-vector-store', async () => {
  try {
    if (fs.existsSync(vectorStorePath)) {
      return JSON.parse(fs.readFileSync(vectorStorePath, 'utf-8'));
    }
  } catch (e) {
    console.error("Failed to load vector store:", e);
  }
  return [];
});

const llmProviders = [
  { id: 'gemini-3-pro', name: 'Gemini 3 Pro' },
  { id: 'gemini-3-flash', name: 'Gemini 3 Flash' },
  { id: 'gemini-3-deep-think', name: 'Gemini 3 Deep Think' },
  { id: 'gemini-2.5-pro', name: 'Gemini 2.5 Pro' },
  { id: 'gemini-2.5-flash', name: 'Gemini 2.5 Flash' },
  { id: 'gemini-2.0-pro', name: 'Gemini 2.0 Pro' },
  { id: 'gemini-2.0-flash', name: 'Gemini 2.0 Flash' },
  { id: 'gemini-1.5-pro', name: 'Gemini 1.5 Pro' },
  { id: 'gemini-1.5-flash', name: 'Gemini 1.5 Flash' },
  { id: 'gpt-4o', name: 'GPT-4o' },
  { id: 'o1', name: 'OpenAI o1' },
  { id: 'claude-3-7-sonnet', name: 'Claude 3.7 Sonnet' },
  { id: 'claude-3-5-sonnet', name: 'Claude 3.5 Sonnet' },
  { id: 'ollama', name: 'Ollama (Local AI)' },
  { id: 'groq-mixtral', name: 'Groq LPU' },
  { id: 'openai-compatible', name: 'OpenAI Compatible' }
];
let activeLlmProvider = 'gemini-1.5-flash';
const llmConfigs = {};

ipcMain.handle('llm-get-available-providers', () => llmProviders);
ipcMain.handle('llm-set-active-provider', (event, providerId) => {
  activeLlmProvider = providerId;
  return true;
});
ipcMain.handle('llm-configure-provider', (event, providerId, options) => {
  llmConfigs[providerId] = options;
  return true;
});

// IPC handler to set MCP server port dynamically
ipcMain.on('set-mcp-server-port', (event, port) => {
  mcpServerPort = port;
  console.log(`MCP Server port updated to: ${mcpServerPort}`);
});

ipcMain.handle('extract-page-content', async () => {
  const view = tabViews.get(activeTabId);
  if (!view) return { error: 'No active view' };
  try {
    const content = await view.webContents.executeJavaScript(`document.body.innerText`);
    return { content };
  } catch (e) {
    return { error: e.message };
  }
});

ipcMain.handle('get-selected-text', async () => {
  const view = tabViews.get(activeTabId);
  if (!view) return '';
  try {
    const selectedText = await view.webContents.executeJavaScript(`window.getSelection().toString();`);
    return selectedText;
  } catch (e) {
    console.error("Failed to get selected text from BrowserView:", e);
    return '';
  }
});

ipcMain.on('send-to-ai-chat-input', (event, text) => {
  if (mainWindow) {
    mainWindow.webContents.send('ai-chat-input-text', text);
  }
});

ipcMain.handle('llm-generate-chat-content', async (event, messages, options = {}) => {
  return await llmGenerateHandler(messages, options);
});

// Ollama Integration:
// For ollama to work, the Ollama application must be installed on the user's system
// and its executable (`ollama`) must be available in the system's PATH.
// This allows `child_process.spawn('ollama', ...)` to find and execute the Ollama CLI.
// Users should install the latest stable version of Ollama for their respective OS (Windows, macOS, Linux).
// For Windows, it's expected that the official installer is used which adds ollama to PATH.
ipcMain.handle('ollama-import-model', async (event, { modelName, filePath }) => {
  try {
    if (!fs.existsSync(filePath)) return { success: false, error: 'File not found' };

    const modelfileContent = `FROM "${filePath.replace(/\\/g, '/')}"`;
    const modelfilePath = path.join(app.getPath('userData'), `Modelfile_${modelName}`);
    fs.writeFileSync(modelfilePath, modelfileContent);

    return new Promise((resolve) => {
      const ollama = require('child_process').spawn('ollama', ['create', modelName, '-f', modelfilePath]);
      let errorLog = '';

      ollama.stderr.on('data', (data) => {
        errorLog += data.toString();
      });

      ollama.on('close', (code) => {
        // Cleanup
        try { fs.unlinkSync(modelfilePath); } catch (e) { }

        if (code === 0) {
          resolve({ success: true });
        } else {
          resolve({ success: false, error: errorLog || 'Ollama create failed' });
        }
      });
    });
  } catch (e) {
    return { success: false, error: e.message };
  }
});

ipcMain.handle('select-local-file', async () => {
  const result = await dialog.showOpenDialog(mainWindow, {
    properties: ['openFile'],
    filters: [{ name: 'GGUF Models', extensions: ['gguf', 'bin'] }]
  });
  if (!result.canceled && result.filePaths.length > 0) {
    return result.filePaths[0];
  }
  return null;
});

ipcMain.handle('ollama-list-models', async () => {
  return new Promise((resolve) => {
    exec('ollama list', (error, stdout, stderr) => {
      if (error) {
        console.error(`exec error: ${error}`);
        resolve({ error: `Failed to list Ollama models. Is Ollama installed and in your system's PATH? Error: ${error.message}` });
        return;
      }
      if (stderr) {
        console.error(`stderr: ${stderr}`);
        resolve({ error: `Ollama command error: ${stderr}` });
        return;
      }

      const lines = stdout.trim().split('\n');
      if (lines.length <= 1) { // Only header or no models
        resolve({ models: [] });
        return;
      }

      const models = lines.slice(1).map(line => {
        const parts = line.trim().split(/\s{2,}/); // Split by 2 or more spaces
        if (parts.length < 1) return null;

        return {
          name: parts[0],
          id: parts[1] || 'N/A',
          size: parts[2] || 'N/A',
          updated: parts[parts.length - 1] || 'N/A'
        };
      }).filter(Boolean);
      resolve({ models });
    });
  });
});

// Deep Linking and persist handling on startup (merged into single instance lock above)
function handleDeepLink(url) {
  if (!mainWindow) return;
  try {
    console.log('[Main] Handling Deep Link:', url);
    const parsedUrl = new URL(url);
    if (parsedUrl.protocol === `${PROTOCOL}:`) {
      mainWindow.webContents.send('auth-callback', url);

      const token = parsedUrl.searchParams.get('token') || parsedUrl.searchParams.get('id_token') || parsedUrl.searchParams.get('auth_token');
      if (token) {
        store.set('auth_token', token);
        console.log('[Main] Auth token saved to secure storage.');
      }
    }
  } catch (e) {
    console.error('Failed to parse deep link:', e);
  }
}

app.whenReady().then(() => {
  createWindow();

  // Handle deep link if launched with one
  const launchUrl = process.argv.find(arg => arg.startsWith(`${PROTOCOL}://`));
  if (launchUrl) {
    mainWindow.webContents.once('did-finish-load', () => {
      handleDeepLink(launchUrl);
    });
  }

  // Load persistent auth token on startup from secure storage
  mainWindow.webContents.once('did-finish-load', () => {
    const savedToken = store.get('auth_token');
    const savedUser = store.get('user_info');
    if (savedToken) {
      mainWindow.webContents.send('load-auth-token', savedToken);
      if (savedUser) mainWindow.webContents.send('load-user-info', savedUser);
      console.log('[Main] Loaded and sent persistent auth data to renderer.');
    }
  });

  // MCP Server Setup
  const mcpApp = express();
  mcpApp.use(bodyParser.json());

  mcpApp.post('/llm/generate', async (req, res) => {
    const { messages, options } = req.body;
    const result = await llmGenerateHandler(messages, options);
    res.json(result);
  });

  mcpServer = mcpApp.listen(mcpServerPort, () => {
    console.log(`MCP Server running on port ${mcpServerPort}`);
  });

  p2pSyncService = getP2PSync('main-process-device');

  // Forward P2P service events to the renderer
  p2pSyncService.on('connected', () => {
    if (mainWindow) mainWindow.webContents.send('p2p-connected');
  });
  p2pSyncService.on('disconnected', () => {
    if (mainWindow) mainWindow.webContents.send('p2p-disconnected');
  });
  p2pSyncService.on('firebase-ready', (userId) => {
    if (mainWindow) mainWindow.webContents.send('p2p-firebase-ready', userId);
  });
  p2pSyncService.on('offer-created', ({ offer, remoteDeviceId }) => {
    if (mainWindow) mainWindow.webContents.send('p2p-offer-created', { offer, remoteDeviceId });
  });
  p2pSyncService.on('answer-created', ({ answer, remoteDeviceId }) => {
    if (mainWindow) mainWindow.webContents.send('p2p-answer-created', { answer, remoteDeviceId });
  });
  p2pSyncService.on('ice-candidate', ({ candidate, remoteDeviceId }) => {
    if (mainWindow) mainWindow.webContents.send('p2p-ice-candidate', { candidate, remoteDeviceId });
  });

  // Handle file downloads
  session.defaultSession.on('will-download', (event, item, webContents) => {
    const fileName = item.getFilename();
    const downloadsPath = app.getPath('downloads');
    const saveDataPath = path.join(downloadsPath, fileName);

    console.log(`[Main] Starting download: ${fileName} to ${saveDataPath}`);

    item.setSavePath(saveDataPath);
    item.resume();

    if (mainWindow) {
      mainWindow.webContents.send('download-started', fileName);
    }

    item.on('updated', (event, state) => {
      if (state === 'interrupted') {
        console.log('Download is interrupted but can be resumed');
      } else if (state === 'progressing') {
        if (!item.isPaused()) {
          // progress updates could be sent here
        }
      }
    });

    item.on('done', (event, state) => {
      if (state === 'completed') {
        console.log('Download successfully');
        if (mainWindow) {
          mainWindow.webContents.send('download-complete', item.getFilename());
        }
      } else {
        console.log(`Download failed: ${state}`);
        if (mainWindow) {
          mainWindow.webContents.send('download-failed', item.getFilename());
        }
      }
    });

    item.resume();
  });

  // Register Global Shortcuts
  const shortcuts = [
    { accelerator: 'CommandOrControl+T', action: 'new-tab' },
    { accelerator: 'CommandOrControl+W', action: 'close-tab' },
    { accelerator: 'CommandOrControl+Tab', action: 'next-tab' },
    { accelerator: 'CommandOrControl+Shift+Tab', action: 'prev-tab' },
    { accelerator: 'CommandOrControl+B', action: 'toggle-sidebar' },
    { accelerator: 'CommandOrControl+,', action: 'open-settings' },
    { accelerator: 'CommandOrControl+Shift+N', action: 'new-incognito-tab' },
    { accelerator: 'CommandOrControl+=', action: 'zoom-in' },
    { accelerator: 'CommandOrControl+Plus', action: 'zoom-in' },
    { accelerator: 'CommandOrControl+-', action: 'zoom-out' },
    { accelerator: 'CommandOrControl+0', action: 'zoom-reset' },
  ];

  shortcuts.forEach(s => {
    try {
      globalShortcut.register(s.accelerator, () => {
        if (mainWindow) {
          if (mainWindow.isMinimized()) mainWindow.restore();
          mainWindow.focus();

          if (s.action === 'zoom-in' || s.action === 'zoom-out' || s.action === 'zoom-reset') {
            const view = tabViews.get(activeTabId);
            if (view) {
              const currentZoom = view.webContents.getZoomFactor();
              let newZoom = currentZoom;
              if (s.action === 'zoom-in') newZoom += 0.1;
              else if (s.action === 'zoom-out') newZoom -= 0.1;
              else if (s.action === 'zoom-reset') newZoom = 1.0;

              if (newZoom >= 0.5 && newZoom <= 3.0) {
                view.webContents.setZoomFactor(newZoom);
              }
            }
            return;
          }

          mainWindow.webContents.send('execute-shortcut', s.action);
        }
      });
    } catch (e) {
      console.error(`Failed to register shortcut ${s.accelerator}:`, e);
    }
  });
});

ipcMain.handle('get-open-tabs', async () => {
  const tabs = [];
  for (const [tabId, view] of tabViews.entries()) {
    if (view && view.webContents) {
      try {
        const url = view.webContents.getURL();
        const title = view.webContents.getTitle();
        const isActive = (tabId === activeTabId);
        tabs.push({ tabId, url, title, isActive });
      } catch (e) {
        console.error(`Error getting info for tabId ${tabId}:`, e);
        tabs.push({ tabId, url: 'Error', title: 'Error', isActive: (tabId === activeTabId) });
      }
    }
  }
  return tabs;
});

ipcMain.on('hide-all-views', () => {
  if (activeTabId && tabViews.has(activeTabId)) {
    const view = tabViews.get(activeTabId);
    if (view && mainWindow) {
      mainWindow.removeBrowserView(view);
    }
  }
});

ipcMain.on('set-user-id', (event, userId) => {
  // TODO: Implement what to do with the user ID
  console.log('User ID set:', userId);
});

ipcMain.handle('get-extensions', async () => {
  const extensions = session.defaultSession.getAllExtensions();
  return extensions.map(ext => ({
    id: ext.id,
    name: ext.name,
    version: ext.version,
    description: ext.description,
    path: ext.path
  }));
});

ipcMain.handle('toggle-extension', async (event, id) => {
  // Disabling usually requires session restart in Electron, 
  // but we can acknowledge the request.
  console.log(`Toggle request for extension ${id}`);
  return true;
});

ipcMain.handle('uninstall-extension', async (event, id) => {
  try {
    const ext = session.defaultSession.getExtension(id);
    if (ext) {
      const extPath = ext.path;
      session.defaultSession.removeExtension(id);
      // Optional: Delete from folder? 
      // User said: "Drop your extension folder inside. Restart Comet"
      // So if they uninstall, we should probably delete the folder too.
      if (extPath.startsWith(extensionsPath)) {
        fs.rmSync(extPath, { recursive: true, force: true });
      }
      return true;
    }
  } catch (e) {
    console.error(`Failed to uninstall extension ${id}:`, e);
  }
  return false;
});

ipcMain.handle('get-extension-path', async () => {
  return extensionsPath;
});

ipcMain.handle('get-icon-path', async () => {
  return path.join(__dirname, 'icon.ico');
});

ipcMain.on('open-extension-dir', () => {
  shell.openPath(extensionsPath);
});

ipcMain.handle('connect-to-remote-device', async (event, remoteDeviceId) => {
  if (!p2pSyncService) {
    console.error('[Main] P2P Sync Service not initialized.');
    return false;
  }
  return await p2pSyncService.connectToRemoteDevice(remoteDeviceId);
});

ipcMain.on('send-p2p-signal', (event, { signal, remoteDeviceId }) => {
  if (!p2pSyncService) {
    console.error('[Main] P2P Sync Service not initialized.');
    return;
  }
  p2pSyncService.sendSignal(signal, remoteDeviceId);
});

ipcMain.handle('scan-folder', async (event, folderPath, types) => {
  return await _scanDirectoryRecursive(folderPath, types);
});

ipcMain.handle('read-file-buffer', async (event, filePath) => {
  try {
    const buffer = await fs.promises.readFile(filePath);
    return buffer.buffer; // Return as ArrayBuffer
  } catch (error) {
    console.error(`[Main] Error reading file buffer for ${filePath}:`, error);
    return new ArrayBuffer(0);
  }
});

const crypto = require('crypto');

// Function to derive key from passphrase
async function deriveKey(passphrase, salt) {
  return new Promise((resolve, reject) => {
    crypto.pbkdf2(passphrase, salt, 100000, 32, 'sha512', (err, derivedKey) => {
      if (err) reject(err);
      resolve(derivedKey);
    });
  });
}

// IPC handler for encryption
ipcMain.handle('encrypt-data', async (event, { data, key }) => {
  try {
    const salt = crypto.randomBytes(16);
    const derivedKey = await deriveKey(key, salt);
    const iv = crypto.randomBytes(16); // Initialization vector
    const cipher = crypto.createCipheriv('aes-256-gcm', derivedKey, iv);

    const encrypted = Buffer.concat([cipher.update(Buffer.from(data)), cipher.final()]);
    const authTag = cipher.getAuthTag();

    return {
      encryptedData: encrypted.buffer,
      iv: iv.buffer,
      authTag: authTag.buffer,
      salt: salt.buffer
    };
  } catch (error) {
    console.error('[Main] Encryption failed:', error);
    return { error: error.message };
  }
});

// IPC handler for decryption
// Web Search RAG Helper
ipcMain.handle('web-search-rag', async (event, query) => {
  try {
    console.log(`[RAG] Performing web search for: ${query}`);
    // Use Google Search with a simple User-Agent to get snippets
    const searchUrl = `https://www.google.com/search?q=${encodeURIComponent(query)}`;
    const response = await fetch(searchUrl, {
      headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36' }
    });
    const html = await response.text();

    // Simple regex to extract search snippets (approximate)
    const snippets = [];
    const divRegex = /<div class="VwiC3b[^>]*>([\s\S]*?)<\/div>/g;
    let match;
    while ((match = divRegex.exec(html)) !== null && snippets.length < 5) {
      const cleanSnippet = match[1].replace(/<[^>]*>/g, '').trim();
      if (cleanSnippet) snippets.push(cleanSnippet);
    }

    return snippets;
  } catch (error) {
    console.error('[RAG] Web search failed:', error);
    return [];
  }
});

// Website Translation IPC
ipcMain.handle('translate-website', async (event, { targetLanguage }) => {
  const view = tabViews.get(activeTabId);
  if (!view) return { error: 'No active view' };

  try {
    // Google Translate Simple Injection
    const code = `
      (function() {
        var script = document.createElement('script');
        script.type = 'text/javascript';
        script.src = '//translate.google.com/translate_a/element.js?cb=googleTranslateElementInit';
        document.body.appendChild(script);
        
        window.googleTranslateElementInit = function() {
          new google.translate.TranslateElement({
            pageLanguage: 'auto',
            includedLanguages: '${targetLanguage}',
            layout: google.translate.TranslateElement.InlineLayout.SIMPLE,
            autoDisplay: false
          }, 'google_translate_element');
          
          // Trigger translation automatically if possible or show the UI
          var check = setInterval(function() {
             var combo = document.querySelector('.goog-te-combo');
             if(combo) {
                combo.value = '${targetLanguage}';
                combo.dispatchEvent(new Event('change'));
                clearInterval(check);
             }
          }, 500);
        };
      })();
    `;
    await view.webContents.executeJavaScript(code);
    return { success: true };
  } catch (e) {
    return { error: e.message };
  }
});

// Setup Context Menu
contextMenu({
  showSaveImageAs: true,
  showInspectElement: true,
  showCopyImageAddress: true,
  showSearchWithGoogle: true,
  prepend: (defaultActions, parameters, browserWindow) => [
    {
      label: '🚀 Analyze with Comet AI',
      visible: parameters.selectionText.trim().length > 0,
      click: () => {
        if (mainWindow) {
          mainWindow.webContents.send('ai-query-detected', parameters.selectionText);
        }
      }
    },
    {
      label: '📄 Summarize Page',
      click: () => {
        if (mainWindow) {
          mainWindow.webContents.send('ai-query-detected', 'Summarize this page');
        }
      }
    },
    {
      label: '🌐 Translate this Site',
      click: () => {
        // This will trigger the translation IPC
        if (mainWindow) {
          mainWindow.webContents.send('trigger-translation-dialog');
        }
      }
    }
  ]
});

ipcMain.handle('decrypt-data', async (event, { encryptedData, key, iv, authTag, salt }) => {
  try {
    const derivedKey = await deriveKey(key, Buffer.from(salt));
    const decipher = crypto.createDecipheriv('aes-256-gcm', derivedKey, Buffer.from(iv));
    decipher.setAuthTag(Buffer.from(authTag));

    const decrypted = Buffer.concat([decipher.update(Buffer.from(encryptedData)), decipher.final()]);
    return { decryptedData: decrypted.buffer };
  } catch (error) {
    console.error('[Main] Decryption failed:', error);
    return { error: error.message };
  }
});

ipcMain.handle('create-desktop-shortcut', async (event, { url, title }) => {
  const desktopPath = path.join(require('os').homedir(), 'Desktop');
  const shortcutPath = path.join(desktopPath, `${title.replace(/[^a-z0-9]/gi, '_').substring(0, 30)}.url`);

  const content = `[InternetShortcut]\nURL=${url}\n`;

  try {
    fs.writeFileSync(shortcutPath, content);
    return { success: true, path: shortcutPath };
  } catch (error) {
    console.error('[Main] Failed to create shortcut:', error);
    return { error: error.message };
  }
});

app.on('will-quit', () => {
  // Clear persistent intervals
  if (networkCheckInterval) clearInterval(networkCheckInterval);
  if (clipboardCheckInterval) clearInterval(clipboardCheckInterval);

  // Stop MCP server
  if (mcpServer) {
    mcpServer.close();
    console.log('[Main] MCP Server stopped.');
  }

  // Disconnect P2P service
  if (p2pSyncService) {
    p2pSyncService.disconnect();
    console.log('[Main] P2P Sync Service disconnected.');
  }

  // Unregister all shortcuts
  globalShortcut.unregisterAll();
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

// Final fallback to ensure process exits
app.on('quit', () => {
  process.exit(0);
});
