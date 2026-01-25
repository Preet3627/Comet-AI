const { app, BrowserWindow, ipcMain, session, shell, clipboard, BrowserView, dialog, globalShortcut } = require('electron');
const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');
const isDev = !app.isPackaged;
const express = require('express');
const bodyParser = require('body-parser');
const { getP2PSync } = require('./src/lib/P2PFileSyncService.js'); // Import the P2P service

let p2pSyncService = null; // Declare p2pSyncService here

let mainWindow;
let activeTabId = null;
let isOnline = true;
const tabViews = new Map(); // Map of tabId -> BrowserView
const audibleTabs = new Set(); // Track tabs currently playing audio
const suspendedTabs = new Set(); // Track suspended tabs

const extensionsPath = path.join(app.getPath('userData'), 'extensions');
const memoryPath = path.join(app.getPath('userData'), 'ai_memory.jsonl');

if (!fs.existsSync(extensionsPath)) {
  try { fs.mkdirSync(extensionsPath, { recursive: true }); } catch (e) { }
}

const { ElectronBlocker } = require('@ghostery/adblocker-electron');
const fetch = require('cross-fetch'); // Make sure cross-fetch is always available globally

const MCP_SERVER_PORT = process.env.MCP_SERVER_PORT || 3001;
let mcpServerPort = MCP_SERVER_PORT;
// Custom protocol for authentication
const PROTOCOL = 'comet-browser';

if (process.defaultApp) {
  if (process.argv.length >= 2) {
    app.setAsDefaultProtocolClient(PROTOCOL, process.execPath, [path.resolve(process.argv[1])]);
  }
} else {
  app.setAsDefaultProtocolClient(PROTOCOL);
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

  try {
    if (providerId.startsWith('gemini')) {
      const gKey = apiKey || process.env.GEMINI_API_KEY;
      if (!gKey) return { error: 'Missing Gemini API Key' };
      const modelId = providerId === 'gemini-3-pro' ? 'gemini-1.5-pro-latest' : 'gemini-1.5-flash-latest';
      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${modelId}:generateContent?key=${gKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contents: messages.map(m => ({ role: m.role === 'user' ? 'user' : 'model', parts: [{ text: m.content }] })) })
      });
      const data = await response.json();
      return { text: data.candidates?.[0]?.content?.parts?.[0]?.text || `No response from ${modelId}.` };
    } else if (providerId === 'gpt-4o') {
      const oaiKey = apiKey || process.env.OPENAI_API_KEY;
      if (!oaiKey) return { error: 'Missing OpenAI API Key' };
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${oaiKey}` },
        body: JSON.stringify({ model: 'gpt-4o', messages: messages.map(m => ({ role: m.role, content: m.content })) })
      });
      const data = await response.json();
      return { text: data.choices?.[0]?.message?.content || 'No response from GPT-4o.' };
    } else if (providerId === 'claude-3-5-sonnet') {
      const anthropicKey = apiKey || process.env.ANTHROPIC_API_KEY;
      if (!anthropicKey) return { error: 'Missing Anthropic API Key' };
      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-api-key': anthropicKey, 'anthropic-version': '2023-06-01' },
        body: JSON.stringify({ model: 'claude-3-5-sonnet-20240620', max_tokens: 4096, messages: messages.map(m => ({ role: m.role, content: m.content })) })
      });
      const data = await response.json();
      return { text: data.content?.[0]?.text || 'No response from Claude 3.5 Sonnet.' };
    } else if (providerId === 'mixtral-8x7b-groq') {
      const groqKey = apiKey || process.env.GROQ_API_KEY;
      if (!groqKey) return { error: 'Missing Groq API Key' };
      const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${groqKey}` },
        body: JSON.stringify({ model: 'mixtral-8x7b-32768', messages: messages.map(m => ({ role: m.role, content: m.content })) })
      });
      const data = await response.json();
      return { text: data.choices?.[0]?.message?.content || 'No response from Groq.' };
    } else if (providerId === 'ollama') {
      const baseUrl = config.baseUrl || 'http://localhost:11434';
      const model = config.model || 'llama3';
      const response = await fetch(`${baseUrl}/api/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ model, messages: messages.map(m => ({ role: m.role, content: m.content })), stream: false })
      });
      const data = await response.json();
      return { text: data.message?.content || `No response from Ollama model ${model}.` };
    } else {
      return { error: `Provider '${providerId}' is not configured.` };
    }
  } catch (e) {
    return { error: e.message };
  }
};

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
      if (lowerKey !== 'x-frame-options' && lowerKey !== 'content-security-policy') {
        acc[key] = responseHeaders[key];
      }
      return acc;
    }, {});

    callback({ cancel: false, responseHeaders: filteredHeaders });
  });

  // Load Extensions
  try {
    if (!fs.existsSync(extensionsPath)) {
      fs.mkdirSync(extensionsPath, { recursive: true });
    }
    const extensionDirs = fs.readdirSync(extensionsPath);
    extensionDirs.forEach(dir => {
      const extPath = path.join(extensionsPath, dir);
      if (fs.lstatSync(extPath).isDirectory()) {
        const manifestPath = path.join(extPath, 'manifest.json');
        if (fs.existsSync(manifestPath)) {
          session.defaultSession.loadExtension(extPath).then(extension => {
            console.log(`Extension loaded: ${extension.name} (${extension.id}) from ${extPath}`);
          }).catch(e => console.error(`Failed to load extension from ${extPath}: ${e.message || e}`));
        }
      }
    });
  } catch (e) {
    console.error("Error during initial extension loading:", e);
  }
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
ipcMain.handle('get-is-online', () => isOnline);
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

// Auth
ipcMain.on('open-auth-window', (event, authUrl) => { shell.openExternal(authUrl); });

// Multi-BrowserView Management
ipcMain.on('create-view', (event, { tabId, url }) => {
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
  { id: 'gemini-3-pro', name: 'Google Gemini 3 Pro' },
  { id: 'gemini-3-flash', name: 'Google Gemini 3 Flash' },
  { id: 'gpt-4o', name: 'OpenAI GPT-4o' },
  { id: 'claude-3-5-sonnet', name: 'Anthropic Claude 3.5 Sonnet' },
  { id: 'mixtral-8x7b-groq', name: 'Groq (Mixtral 8x7b)' },
  { id: 'ollama', name: 'Ollama (External Local)' },
  { id: 'local-tfjs', name: 'Comet Neural Engine (Local)' }
];
let activeLlmProvider = 'gemini';
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
  try {
    const response = await fetch(`http://localhost:${mcpServerPort}/llm/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ messages, options })
    });
    const data = await response.json();
    return data;
  } catch (e) {
    console.error("Error communicating with MCP Server:", e);
    return { error: e.message };
  }
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
        const parts = line.split(/\s+/);
        // Assuming format: NAME    ID      SIZE    DIGEST  UPDATED
        return {
          name: parts[0],
          id: parts[1],
          size: parts[2],
          digest: parts[3],
          updated: parts[4] + ' ' + parts[5] // Combine date and time
        };
      });
      resolve({ models });
    });
  });
});

// Deep Linking and Singleton Instance Lock
const handleDeepLink = (url) => {
  if (!mainWindow) return;
  try {
    console.log('[Main] Handling Deep Link:', url);
    const parsedUrl = new URL(url);
    if (parsedUrl.protocol === `${PROTOCOL}:`) {
      // Always send the full URL to any component listening for the callback
      mainWindow.webContents.send('auth-callback', url);

      // Extract token for legacy or direct sign-in handlers
      const token = parsedUrl.searchParams.get('token') || parsedUrl.searchParams.get('id_token');
      if (token) {
        mainWindow.webContents.send('auth-token-received', token);
      }
    }
  } catch (e) {
    console.error('Failed to parse deep link:', e);
  }
};

const gotTheLock = app.requestSingleInstanceLock();

if (!gotTheLock) {
  app.quit();
} else {
  app.on('second-instance', (event, commandLine, workingDirectory) => {
    // Someone tried to run a second instance, we should focus our window.
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.focus();
    }
    // Handle the deep link URL from the command line
    const url = commandLine.find(arg => arg.startsWith(`${PROTOCOL}://`));
    if (url) {
      handleDeepLink(url);
    }
  });

  // Handle the case where the app is launched with a deep link
  app.on('ready', () => {
    const url = process.argv.find(arg => arg.startsWith(`${PROTOCOL}://`));
    if (url) {
      // The createWindow function will handle the window creation.
      // We need to ensure the window is ready before handling the link.
      mainWindow.webContents.once('did-finish-load', () => {
        handleDeepLink(url);
      });
    }
  });
}


app.whenReady().then(() => {
  // MCP Server Setup
  const mcpApp = express();
  mcpApp.use(bodyParser.json());

  mcpApp.post('/llm/generate', async (req, res) => {
    const { messages, options } = req.body;
    const result = await llmGenerateHandler(messages, options);
    res.json(result);
  });

  mcpApp.listen(MCP_SERVER_PORT, () => {
    console.log(`MCP Server running on port ${MCP_SERVER_PORT}`);
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

  createWindow();


  // Handle file downloads
  session.defaultSession.on('will-download', (event, item, webContents) => {
    event.preventDefault();

    const fileName = item.getFilename();
    const filePath = item.getSavePath(); // Get the suggested path

    dialog.showSaveDialog(mainWindow, {
      defaultPath: path.join(filePath, fileName),
      properties: ['createDirectory', 'showOverwriteConfirmation']
    }).then(result => {
      if (!result.canceled && result.filePath) {
        if (mainWindow) {
          mainWindow.webContents.send('download-started', item.getFilename());
        }
        item.setSavePath(result.filePath);
        item.on('updated', (event, state) => {
          if (state === 'interrupted') {
            console.log('Download is interrupted but can be resumed');
            // Optionally, send a message to the renderer about interruption
          } else if (state === 'progressing') {
            if (item.isPaused()) {
              console.log('Download is paused');
              // Optionally, send a message to the renderer about pause
            } else {
              console.log(`Received bytes: ${item.getReceivedBytes()}`);
              // Optionally, send progress updates to the renderer
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
        item.resume(); // Ensure download starts
      } else {
        item.cancel(); // User canceled the save dialog
      }
    }).catch(error => {
      console.error("Error showing save dialog:", error);
      item.cancel();
    });
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
  ];

  shortcuts.forEach(s => {
    try {
      globalShortcut.register(s.accelerator, () => {
        if (mainWindow) {
          if (mainWindow.isMinimized()) mainWindow.restore();
          mainWindow.focus();
          mainWindow.webContents.send('execute-shortcut', s.action);
        }
      });
    } catch (e) {
      console.error(`Failed to register shortcut ${s.accelerator}:`, e);
    }
  });
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

app.on('will-quit', () => {
  globalShortcut.unregisterAll();
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
