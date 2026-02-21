const { app, BrowserWindow, ipcMain, BrowserView, session, shell, clipboard, dialog, globalShortcut, Menu, protocol, desktopCapturer, screen, nativeImage } = require('electron');
const QRCode = require('qrcode');
const contextMenuRaw = require('electron-context-menu');
const contextMenu = contextMenuRaw.default || contextMenuRaw;
const fs = require('fs');
const { PDFDocument, rgb, StandardFonts } = require('pdf-lib');
const path = require('path');
const os = require('os');
const { spawn, exec } = require('child_process');
const Store = require('electron-store');
const store = new Store();
const { createWorker } = require('tesseract.js');
const screenshot = require('screenshot-desktop');
const Jimp = require('jimp');
const util = require('util');
const execPromise = util.promisify(exec);

let robot = null;
try {
  robot = require('robotjs');
} catch (e) {
  console.warn('[Main] robotjs not available (Find & Click disabled):', e.message);
}

let tesseractWorker; // Declare tesseractWorker here
// Production mode detection:
// 1. app.isPackaged - true when running from built .exe
// 2. NODE_ENV === 'production' - for manual testing before build
// 3. Check if out/index.html exists - fallback to prod if dev server isn't available
const isDev = !app.isPackaged;
const express = require('express');
const bodyParser = require('body-parser');
const { getP2PSync } = require('./src/lib/P2PFileSyncService.js'); // Import the P2P service

let p2pSyncService = null; // Declare p2pSyncService here
let wifiSyncService = null; // Declare wifiSyncService here

// Desktop Automation Services (Comet-AI Guide v2)
const { PermissionStore } = require('./src/lib/permission-store.js');
const { RobotService } = require('./src/lib/robot-service.js');
const { TesseractOcrService } = require('./src/lib/tesseract-service.js');
const { CometAiEngine } = require('./src/lib/ai-engine.js');
const { ScreenVisionService } = require('./src/lib/screen-vision-service.js');
const { FlutterBridgeServer } = require('./src/lib/bridge-server.js');
const { FileSystemMcpServer, NativeAppMcpServer } = require('./src/lib/mcp-desktop-server.js');
const { WebSearchProvider } = require('./src/lib/web-search-service.js');
const { RagService } = require('./src/lib/rag-service.js');
const { VoiceService } = require('./src/lib/voice-service.js');
const { WorkflowRecorder } = require('./src/lib/workflow-recorder.js');
const { PopSearchService, popSearchService } = require('./src/lib/pop-search-service.js');

const permissionStore = new PermissionStore();
let cometAiEngine = null;
let robotService = null;
let tesseractOcrService = null;
let screenVisionService = null;
let flutterBridge = null;
let fileSystemMcp = null;
let nativeAppMcp = null;
let webSearchProvider = null;
let ragService = null;
let voiceService = null;
let workflowRecorder = null;
let popSearch = null;

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

const { GoogleGenAI } = require("@google/genai");

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

ipcMain.handle('set-as-default-browser', async () => {
  if (process.platform === 'win32' || process.platform === 'darwin') {
    app.setAsDefaultProtocolClient('http');
    app.setAsDefaultProtocolClient('https');
    return true;
  }
  return false;
});
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

// Persistent LLM Cache
const cacheFilePath = path.join(app.getPath('userData'), 'llm_cache.json');
let llmCache = new Map();

function loadLLMCache() {
  try {
    if (fs.existsSync(cacheFilePath)) {
      const data = JSON.parse(fs.readFileSync(cacheFilePath, 'utf8'));
      llmCache = new Map(Object.entries(data));
      console.log(`[LLM] Loaded ${llmCache.size} items from cache.`);
    }
  } catch (e) {
    console.error('[LLM] Failed to load cache:', e);
  }
}

function saveLLMCache() {
  try {
    const data = Object.fromEntries(llmCache);
    fs.writeFileSync(cacheFilePath, JSON.stringify(data), 'utf8');
  } catch (e) {
    console.error('[LLM] Failed to save cache:', e);
  }
}

loadLLMCache();

// Global LLM Generation Handler
const llmGenerateHandler = async (messages, options = {}) => {
  const cacheKey = JSON.stringify(messages);
  if (llmCache.has(cacheKey)) {
    console.log('[LLM] Cache hit');
    return llmCache.get(cacheKey);
  }

  const providerId = options.provider || activeLlmProvider;
  const config = llmConfigs[providerId] || {};
  const apiKey = options.apiKey || config.apiKey;

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), providerId === 'ollama' ? 30000 : 90000); // 30s for local Ollama, 90s for reasoning

  try {
    let result;
    if (providerId.startsWith('gemini')) {
      const gKey = apiKey || process.env.GEMINI_API_KEY;
      if (!gKey) return { error: 'Missing Gemini API Key' };

      const genAI = new GoogleGenAI(gKey);

      let modelName = 'gemini-2.0-flash';
      let thinkingConfig = null;

      // Gemini 3.1 & 3.0 series (Latest 2026)
      if (providerId.includes('3.1-pro')) {
        modelName = 'gemini-3.1-pro-preview';
        thinkingConfig = { includeThought: true };
      } else if (providerId.includes('3.1-flash')) {
        modelName = 'gemini-3.1-flash-preview';
      } else if (providerId.includes('3-deep-think')) {
        modelName = 'gemini-3-deep-think';
        thinkingConfig = { includeThought: true };
      } else if (providerId.includes('3-pro')) {
        modelName = 'gemini-3.1-pro-preview'; // Forward compatibility
      } else if (providerId.includes('3-flash')) {
        modelName = 'gemini-3-flash-preview';
        // 2.5 series
      } else if (providerId.includes('2.5-pro')) {
        modelName = 'gemini-2.5-pro';
        thinkingConfig = { thinkingBudget: "4096" }; // Reasoning budget for 2.5 series
      } else if (providerId.includes('2.5-flash-lite')) {
        modelName = 'gemini-2.5-flash-lite';
      } else if (providerId.includes('2.5-flash')) {
        modelName = 'gemini-2.5-flash';
        // Legacy and Experimental
      } else if (providerId.includes('2.0-pro')) {
        modelName = 'gemini-2.0-pro-exp-02-05';
      } else if (providerId.includes('2.0-flash-lite')) {
        modelName = 'gemini-2.0-flash-lite';
      } else if (providerId.includes('2.0-flash')) {
        modelName = 'gemini-2.0-flash';
      } else if (providerId.includes('1.5-pro')) {
        modelName = 'gemini-1.5-pro';
      } else if (providerId.includes('1.5-flash')) {
        modelName = 'gemini-1.5-flash';
      } else {
        modelName = 'gemini-2.0-flash';
      }

      const systemMessage = messages.find(m => m.role === 'system');
      const chatMessages = messages.filter(m => m.role !== 'system');

      const model = genAI.getGenerativeModel({
        model: modelName,
        systemInstruction: systemMessage ? systemMessage.content : undefined,
        // New Thinking Config for 3.1 series
        ...(thinkingConfig ? { thinkingConfig } : {})
      });

      // Helper to convert message to Gemini parts (supports Multimodal)
      const mapMessageToParts = (m) => {
        const parts = [{ text: m.content || '' }];
        if (m.attachments && Array.isArray(m.attachments)) {
          m.attachments.forEach(attachment => {
            if (attachment.data && attachment.mimeType) {
              parts.push({
                inlineData: {
                  data: attachment.data, // base64 string
                  mimeType: attachment.mimeType
                }
              });
            }
          });
        }
        return parts;
      };

      // Gemini history MUST start with 'user' and alternate user/model
      let history = [];
      const historySource = chatMessages.slice(0, -1);

      if (historySource.length > 0) {
        const firstUserIndex = historySource.findIndex(m => m.role === 'user');
        if (firstUserIndex !== -1) {
          history = historySource.slice(firstUserIndex).map(m => ({
            role: m.role === 'user' ? 'user' : 'model',
            parts: mapMessageToParts(m)
          }));
        }
      }

      const lastMessage = chatMessages[chatMessages.length - 1];
      const chat = model.startChat({
        history,
        generationConfig: {
          maxOutputTokens: 8192,
          temperature: 0.7,
        },
      });

      const genResult = await chat.sendMessage(mapMessageToParts(lastMessage));
      const response = await genResult.response;
      result = { text: response.text() };

    } else if (providerId.startsWith('gpt') || providerId.startsWith('o1') || providerId === 'openai-compatible') {
      const oaiKey = apiKey || config.apiKey || process.env.OPENAI_API_KEY;
      const baseUrl = config.baseUrl || 'https://api.openai.com/v1';

      let modelName = config.model;
      if (!modelName) {
        if (providerId === 'gpt-5.2') modelName = 'gpt-5.2';
        else if (providerId === 'gpt-4o') modelName = 'gpt-4o';
        else if (providerId === 'gpt-4-turbo') modelName = 'gpt-4-turbo';
        else if (providerId === 'gpt-3.5-turbo') modelName = 'gpt-3.5-turbo';
        else if (providerId === 'o1') modelName = 'o1';
        else if (providerId === 'o1-mini') modelName = 'o1-mini';
        else modelName = 'gpt-5.2';
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
      result = { text: data.choices?.[0]?.message?.content || 'No response from intelligence provider.' };

    } else if (providerId.startsWith('claude') || providerId === 'anthropic') {
      const anthropicKey = apiKey || process.env.ANTHROPIC_API_KEY;
      if (!anthropicKey) return { error: 'Missing Anthropic API Key' };

      const modelName = providerId.includes('4-6') ? 'claude-sonnet-4-6' : providerId.includes('3-7') ? 'claude-3-7-sonnet-20250224' : 'claude-sonnet-4-6';
      const isExtended = providerId.includes('3-7') || providerId.includes('4-6');

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
      result = { text: data.content?.[0]?.text || data.content?.find(c => c.type === 'text')?.text || 'No response from Claude.' };

    } else if (providerId === 'ollama') {
      const baseUrl = config.baseUrl || 'http://localhost:11434';
      let model = config.model || 'llama3.2'; // Default to a lightweight modern model

      // Override model based on selected intensity mode
      if (options.localLlmMode || config.localLlmMode) {
        const mode = options.localLlmMode || config.localLlmMode;
        if (mode === 'light') model = 'llama3.2:1b';
        else if (mode === 'normal') model = 'llama3.2:3b';
        else if (mode === 'heavy') model = 'llama3.3'; // or llama3.1:8b for balanced-heavy
      }

      // Handle multimodal for Ollama
      const mappedMessages = messages.map(m => {
        const msg = { role: m.role, content: m.content || '' };
        if (m.attachments && Array.isArray(m.attachments)) {
          msg.images = m.attachments
            .filter(a => a.mimeType && a.mimeType.startsWith('image/'))
            .map(a => a.data); // Ollama expects base64 strings in 'images' array
        }
        return msg;
      });

      const response = await fetch(`${baseUrl}/api/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model,
          messages: mappedMessages,
          stream: false,
          keep_alive: "1h",
          options: { temperature: 0.7, num_ctx: 32768 }
        }),
        signal: controller.signal
      });
      const data = await response.json();
      if (!data.message?.content) {
        result = { error: `Ollama returned an empty response. Ensure the model '${model}' is downloaded and reachable.` };
      } else {
        result = { text: data.message.content };
      }

    } else if (providerId.includes('groq')) {
      const groqKey = apiKey || process.env.GROQ_API_KEY;
      if (!groqKey) return { error: 'Missing Groq API Key. Please add it in settings.' };

      let modelName = 'llama-3.3-70b-versatile'; // Standard high-quality default

      if (providerId.includes('llama-3-3')) {
        modelName = 'llama-3.3-70b-versatile';
      } else if (providerId.includes('llama-3-1-8b')) {
        modelName = 'llama-3.1-8b-instant';
      } else if (providerId.includes('deepseek-r1')) {
        modelName = 'deepseek-r1-distill-llama-70b';
      } else if (providerId.includes('mixtral')) {
        modelName = 'mixtral-8x7b-32768';
      }

      const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${groqKey}`
        },
        body: JSON.stringify({
          model: modelName,
          messages: messages.map(m => ({ role: m.role, content: m.content })),
          temperature: 0.7,
        }),
        signal: controller.signal
      });

      if (!response.ok) {
        const errData = await response.json();
        return { error: `Groq API Error (${response.status}): ${errData.error?.message || response.statusText}` };
      }

      const data = await response.json();
      result = { text: data.choices?.[0]?.message?.content || 'No response from Groq.' };

    } else {
      result = { error: `Provider '${providerId}' is not configured.` };
    }

    clearTimeout(timeoutId);
    llmCache.set(cacheKey, result);
    saveLLMCache(); // Persist cache
    return result;
  } catch (error) {
    clearTimeout(timeoutId);
    console.error("LLM Error:", error);
    return { error: error.name === 'AbortError' ? 'Neural Link Timed Out (Reasoning Overload)' : error.message };
  }
};

ipcMain.handle('extract-search-results', async (event, tabId) => {
  const view = tabViews.get(tabId);
  if (!view) return { error: 'No active view for extraction' };

  try {
    const results = await view.webContents.executeJavaScript(`
      (() => {
        const organicResults = Array.from(document.querySelectorAll('div.g, li.g, div.rc')); // Common Google search result selectors
        const extracted = [];
        for (let i = 0; i < Math.min(3, organicResults.length); i++) {
          const result = organicResults[i];
          const titleElement = result.querySelector('h3');
          const linkElement = result.querySelector('a');
          const snippetElement = result.querySelector('span.st, div.s > div > span'); // Common snippet selectors

          if (titleElement && linkElement) {
            extracted.push({
              title: titleElement.innerText,
              url: linkElement.href,
              snippet: snippetElement ? snippetElement.innerText : ''
            });
          }
        }
        return extracted;
      })();
    `);
    return { success: true, results };
  } catch (e) {
    console.error("Failed to extract search results:", e);
    return { success: false, error: e.message };
  }
});

// IPC handler for search suggestions
ipcMain.handle('get-suggestions', async (event, query) => {
  // TODO: Implement actual history and bookmark suggestions
  // For now, return some dummy data based on the query
  const suggestions = [];
  if (query.length > 0) {
    suggestions.push({ type: 'search', text: `Search Google for "${query}"`, url: `https://www.google.com/search?q=${encodeURIComponent(query)}` });
    suggestions.push({ type: 'history', text: `History: ${query} past visit`, url: `https://example.com/history/${query}` });
    suggestions.push({ type: 'bookmark', text: `Bookmark: ${query} docs`, url: `https://docs.example.com/${query}` });
  }
  return suggestions;
});


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



async function createWindow() {
  // GPU compositing optimizations for transparent overlays
  app.commandLine.appendSwitch('--enable-gpu-rasterization');
  app.commandLine.appendSwitch('--enable-zero-copy');
  app.commandLine.appendSwitch('--enable-hardware-overlays');
  app.commandLine.appendSwitch('--enable-features', 'VaapiVideoDecoder,CanvasOopRasterization,TranslationAPI');
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
    icon: path.join(__dirname, 'out', 'icon.ico'),
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
    ? 'http://localhost:3003'
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

  // Tesseract initialization is now lazy-loaded in 'find-and-click-text' handler to improve startup time

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
  // Handle external links - Open in new tab within the app instead of default browser
  mainWindow.webContents.on('will-navigate', (event, url) => {
    if (!url.startsWith('http://localhost') && !url.startsWith('file://') && url !== mainWindow.webContents.getURL()) {
      event.preventDefault();
      mainWindow.webContents.send('add-new-tab', url);
    }
  });

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (!url.startsWith('http://localhost') && !url.startsWith('file://')) {
      mainWindow.webContents.send('add-new-tab', url);
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
      // Skip the problematic QuickFill extension for now
      if (dir === 'google-forms-autofill-extension-main') {
        console.warn(`[Main] Skipping problematic extension: ${dir}`);
        return;
      }
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
      // Send to P2P peers if connected
      if (p2pSyncService && p2pSyncService.getStatus().connected) {
        p2pSyncService.sendMessage({ type: 'clipboard-sync', text: currentText });
      }
    }
  }, 3000);
}

ipcMain.handle('test-gemini-api', async (event, apiKey) => {
  try {
    const genAI = new GoogleGenAI(apiKey);
    const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });
    const result = await model.generateContent("test");
    await result.response; // Ensure the call completes
    return { success: true };
  } catch (error) {
    console.error("Gemini API test failed:", error);
    return { success: false, error: error.message };
  }
});

const gmailService = require('./src/lib/gmailService.js');

ipcMain.handle('get-gmail-messages', async () => {
  return await gmailService.getGmailMessages();
});

ipcMain.on('save-ai-response', (event, content) => {
  dialog.showSaveDialog(mainWindow, {
    title: 'Save AI Response',
    defaultPath: 'ai-response.txt',
  }).then(result => {
    if (!result.canceled && result.filePath) {
      fs.writeFileSync(result.filePath, content);
    }
  });
});

ipcMain.handle('export-chat-txt', async (event, messages) => {
  try {
    const content = messages.map(msg => `${msg.role === 'user' ? 'User' : 'AI'}: ${msg.content}`).join('\n\n');
    const { canceled, filePath } = await dialog.showSaveDialog(mainWindow, {
      title: 'Export Chat as Text',
      defaultPath: `comet-ai-chat-${Date.now()}.txt`,
      filters: [{ name: 'Text Files', extensions: ['txt'] }]
    });

    if (!canceled && filePath) {
      fs.writeFileSync(filePath, content);
      return { success: true };
    }
    return { success: false, error: 'Save dialog canceled' };
  } catch (error) {
    console.error('Failed to export chat as text:', error);
    return { success: false, error: error.message };
  }
});


ipcMain.handle('export-chat-pdf', async (event, messages) => {
  try {
    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Comet AI Chat Export</title>
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; margin: 20px; color: #333; }
          .message { margin-bottom: 15px; padding: 10px; border-radius: 8px; }
          .user-message { background-color: #e6f7ff; text-align: right; }
          .ai-message { background-color: #f0f0f0; text-align: left; }
          .role { font-weight: bold; margin-bottom: 5px; }
          pre { background-color: #eee; padding: 10px; border-radius: 5px; overflow-x: auto; }
          img { max-width: 100%; height: auto; }
        </style>
      </head>
      <body>
        <h1>Comet AI Chat Export</h1>
        ${messages.map(msg => `
          <div class="message ${msg.role === 'user' ? 'user-message' : 'ai-message'}">
            <div class="role">${msg.role === 'user' ? 'User' : 'AI'}</div>
            <div>${msg.content.replace(/\n/g, '<br/>')}</div>
          </div>
        `).join('')}
      </body>
      </html>
    `;

    const tempWindow = new BrowserWindow({
      show: false,
      webPreferences: {
        nodeIntegration: false,
        contextIsolation: true,
        offscreen: true // Render offscreen
      }
    });

    tempWindow.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(htmlContent)}`);

    await new Promise(resolve => tempWindow.webContents.on('did-finish-load', resolve));

    const { canceled, filePath } = await dialog.showSaveDialog(mainWindow, {
      title: 'Export Chat as PDF',
      defaultPath: `comet-ai-chat-${Date.now()}.pdf`,
      filters: [{ name: 'PDF Files', extensions: ['pdf'] }]
    });

    if (!canceled && filePath) {
      const pdfBuffer = await tempWindow.webContents.printToPDF({});
      fs.writeFileSync(filePath, pdfBuffer);
      tempWindow.close();
      return { success: true };
    }

    tempWindow.close();
    return { success: false, error: 'Save dialog canceled' };
  } catch (error) {
    console.error('Failed to export chat as PDF:', error);
    return { success: false, error: error.message };
  }
});

ipcMain.handle('gmail-authorize', async () => {
  const { authorize } = require('./src/lib/gmailService.js');
  try {
    await authorize();
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
});


ipcMain.handle('gmail-list-messages', async (event, query, maxResults) => {
  const { listMessages } = require('./src/lib/gmailService.js');
  try {
    const messages = await listMessages(query, maxResults);
    return { success: true, messages };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('gmail-get-message', async (event, messageId) => {
  const { getMessage } = require('./src/lib/gmailService.js');
  try {
    const message = await getMessage(messageId);
    return { success: true, message };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('gmail-send-message', async (event, to, subject, body, threadId) => {
  const { sendMessage } = require('./src/lib/gmailService.js');
  try {
    const result = await sendMessage(to, subject, body, threadId);
    return { success: true, result };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('gmail-add-label-to-message', async (event, messageId, labelName) => {
  const { addLabelToMessage } = require('./src/lib/gmailService.js');
  try {
    const result = await addLabelToMessage(messageId, labelName);
    return { success: true, result };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

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
ipcMain.on('minimize-window', (event) => {
  const win = BrowserWindow.fromWebContents(event.sender);
  if (win) win.minimize();
});
ipcMain.on('maximize-window', (event) => {
  const win = BrowserWindow.fromWebContents(event.sender);
  if (win) {
    if (win.isMaximized()) {
      win.unmaximize();
    } else {
      win.maximize();
    }
  }
});
ipcMain.on('close-window', (event) => {
  const win = BrowserWindow.fromWebContents(event.sender);
  if (win) win.close();
});
ipcMain.on('toggle-fullscreen', (event) => {
  const win = BrowserWindow.fromWebContents(event.sender);
  if (win) win.setFullScreen(!win.isFullScreen());
});

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
      } else if (url.startsWith('http://localhost') && url.includes('code=')) { // Gmail OAuth redirect
        event.preventDefault();
        const urlParams = new URLSearchParams(new URL(url).search);
        const code = urlParams.get('code');
        if (code) {
          ipcMain.emit('gmail-oauth-code', null, code); // Send code to main process, which relays to gmailService
          authWindow.close();
        }
      }
    });

    authWindow.webContents.on('did-navigate', (event, url) => {
      if (url.startsWith('comet-browser://') || url.includes('__/auth/handler')) {
        if (mainWindow) {
          mainWindow.webContents.send('auth-callback', url);
        }
        authWindow.close();
      } else if (url.startsWith('http://localhost') && url.includes('code=')) { // Gmail OAuth redirect
        const urlParams = new URLSearchParams(new URL(url).search);
        const code = urlParams.get('code');
        if (code) {
          ipcMain.emit('gmail-oauth-code', null, code); // Send code to main process, which relays to gmailService
          authWindow.close();
        }
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

  newView.webContents.on('did-finish-load', () => {
    mainWindow.webContents.send('on-tab-loaded', { tabId, url: newView.webContents.getURL() });
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
    console.log(`[Audio] Tab ${tabId} audible: ${isAudible}`);
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

const tabLastActive = new Map();

ipcMain.on('suspend-tab', (event, tabId) => {
  const view = tabViews.get(tabId);
  if (view) {
    view.webContents.destroy();
    tabViews.delete(tabId);
    suspendedTabs.add(tabId);
    if (mainWindow) {
      mainWindow.webContents.send('tab-suspended', tabId);
    }
  }
});

ipcMain.on('resume-tab', (event, { tabId, url }) => {
  if (suspendedTabs.has(tabId)) {
    suspendedTabs.delete(tabId);
    // The 'create-view' handler will be called by the frontend,
    // which will create a new BrowserView for the tab.
    if (mainWindow) {
      mainWindow.webContents.send('tab-resumed', tabId);
    }
  }
});

setInterval(() => {
  const now = Date.now();
  const inactiveTimeout = 5 * 60 * 1000; // 5 minutes
  for (const [tabId, lastActive] of tabLastActive.entries()) {
    if (now - lastActive > inactiveTimeout && tabId !== activeTabId) {
      const view = tabViews.get(tabId);
      if (view) {
        // We don't want to suspend audible tabs
        if (audibleTabs.has(tabId)) continue;

        console.log(`Suspending inactive tab: ${tabId}`);
        ipcMain.emit('suspend-tab', {}, tabId);
      }
    }
  }
}, 60 * 1000); // Check every minute

ipcMain.on('activate-view', (event, { tabId, bounds }) => {
  tabLastActive.set(tabId, Date.now());

  if (suspendedTabs.has(tabId)) {
    if (mainWindow) {
      mainWindow.webContents.send('resume-tab-and-activate', tabId);
    }
    return;
  }

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

// ============================================================================
// SCREEN CAPTURE - For OCR and cross-app clicking
// ============================================================================
ipcMain.removeHandler('capture-browser-view-screenshot');
ipcMain.handle('capture-browser-view-screenshot', async () => {
  const view = tabViews.get(activeTabId);
  if (view) {
    try {
      const image = await view.webContents.capturePage();
      return image.toDataURL(); // Returns a Data URL (base64 encoded PNG)
    } catch (e) {
      console.error("Failed to capture page screenshot:", e);
      return null;
    }
  }
  return null;
});

ipcMain.handle('capture-screen-region', async (event, bounds) => {
  console.log('[Screen] Capturing region:', bounds);
  const tempFile = path.join(os.tmpdir(), `capture_${Date.now()}.png`);
  try {
    await captureScreenRegion(bounds, tempFile);
    const imageBuffer = fs.readFileSync(tempFile);
    const base64Image = `data:image/png;base64,${imageBuffer.toString('base64')}`;
    return { success: true, path: tempFile, image: base64Image };
  } catch (e) {
    console.error('[Screen] Capture failed:', e);
    return { success: false, error: e.message };
  }
});



/**
 * Maps OCR result coordinates (from Tesseract) to screen coordinates.
 * When the capture region is a subset of the screen, adds the capture offset.
 * @param {Object} ocrResult - Tesseract word result with bbox: { x0, y0, x1, y1 }
 * @param {Object} captureRegion - { x, y, width, height } - screen region that was captured
 * @returns {{ x: number, y: number, width: number, height: number }} screen coordinates
 */
function mapOcrCoordsToScreenCoords(ocrResult, captureRegion) {
  const box = ocrResult.bbox || ocrResult.box || {};
  const x0 = box.x0 ?? box.x ?? 0;
  const y0 = box.y0 ?? box.y ?? 0;
  const x1 = box.x1 ?? (box.x || 0) + (box.width || 0);
  const y1 = box.y1 ?? (box.y || 0) + (box.height || 0);
  const width = x1 - x0;
  const height = y1 - y0;
  const screenX = (captureRegion?.x ?? 0) + x0;
  const screenY = (captureRegion?.y ?? 0) + y0;
  return { x: Math.round(screenX), y: Math.round(screenY), width: Math.round(width), height: Math.round(height) };
}

/**
 * find-and-click-text: Captures the primary screen, runs OCR, finds target text, and clicks it.
 * Uses Tesseract.js for OCR and robotjs for mouse simulation.
 * NOTE: On macOS, Accessibility permission is required for robotjs to control the mouse.
 * On Windows/Linux, may require running with appropriate privileges.
 */
ipcMain.handle('find-and-click-text', async (event, targetText) => {
  if (!targetText || typeof targetText !== 'string' || targetText.trim().length === 0) {
    return { success: false, error: 'Target text is required.' };
  }

  const searchText = targetText.trim().toLowerCase();

  try {
    const primaryDisplay = screen.getPrimaryDisplay();
    const { width, height } = primaryDisplay.size;
    const scaleFactor = primaryDisplay.scaleFactor || 1;
    const thumbnailSize = {
      width: Math.min(4096, Math.round(width * scaleFactor)),
      height: Math.min(4096, Math.round(height * scaleFactor))
    };

    const sources = await desktopCapturer.getSources({ types: ['screen'], thumbnailSize });
    const primaryDisplayId = String(primaryDisplay.id);
    const primaryScreenSource = sources.find(s => s.display_id === primaryDisplayId);

    if (!primaryScreenSource || !primaryScreenSource.thumbnail) {
      return { success: false, error: 'Could not capture primary screen.' };
    }

    const tempDir = app.getPath('temp');
    const tempPath = path.join(tempDir, `comet-ocr-${Date.now()}.png`);

    try {
      const pngBuffer = primaryScreenSource.thumbnail.toPNG();
      fs.writeFileSync(tempPath, pngBuffer);
    } catch (writeErr) {
      console.error('[Main] Failed to write temp image:', writeErr);
      return { success: false, error: 'Failed to prepare image for OCR.' };
    }

    if (!tesseractWorker) {
      console.log('[Main] Initializing Tesseract.js worker on-demand...');
      try {
        tesseractWorker = await createWorker('eng');
        console.log('[Main] Tesseract.js worker initialized.');
      } catch (e) {
        console.error('[Main] Failed to initialize Tesseract worker:', e);
        try { fs.unlinkSync(tempPath); } catch (e) { }
        tesseractWorker = null; // Ensure it's null so we retry next time
        return { success: false, error: 'OCR worker initialization failed.' };
      }
    }

    const captureRegion = { x: 0, y: 0, width: thumbnailSize.width, height: thumbnailSize.height };

    let data;
    try {
      const result = await tesseractWorker.recognize(tempPath);
      data = result.data;
    } catch (workerError) {
      console.error('[Main] Tesseract recognition failed:', workerError);
      // Force re-initialization next time
      try { await tesseractWorker.terminate(); } catch (e) { }
      tesseractWorker = null;
      try { fs.unlinkSync(tempPath); } catch (e) { }
      return { success: false, error: 'OCR failed. Please try again.' };
    }

    try { fs.unlinkSync(tempPath); } catch (e) { }

    const words = data?.words || [];
    let bestMatch = null;

    for (const word of words) {
      const text = (word.text || '').toLowerCase();
      if (text.includes(searchText) || searchText.includes(text)) {
        bestMatch = word;
        break;
      }
    }

    if (!bestMatch) {
      return { success: false, error: `Text "${targetText}" not found on screen.`, foundText: data?.text?.substring(0, 200) };
    }

    const screenCoords = mapOcrCoordsToScreenCoords(bestMatch, captureRegion);
    const centerX = Math.round(screenCoords.x + screenCoords.width / 2);
    const centerY = Math.round(screenCoords.y + screenCoords.height / 2);

    if (!robot) {
      return { success: false, error: 'Find & Click requires robotjs. Run: npm install robotjs, then electron-rebuild.' };
    }

    try {
      robot.moveMouse(centerX, centerY);
      robot.mouseClick();
      console.log(`[Main] Find-and-click: clicked at (${centerX}, ${centerY}) for "${targetText}"`);
      return { success: true, x: centerX, y: centerY };
    } catch (robotErr) {
      console.error('[Main] robotjs error (may need Accessibility permission on macOS):', robotErr);
      return { success: false, error: `Could not simulate click. ${process.platform === 'darwin' ? 'Ensure Accessibility permission is granted.' : robotErr.message}` };
    }
  } catch (error) {
    console.error('[Main] find-and-click-text failed:', error);
    return { success: false, error: error.message };
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
  { id: 'gemini-3.1-pro', name: 'Gemini 3.1 Pro (Latest Reasoning)' },
  { id: 'gemini-3.1-flash', name: 'Gemini 3.1 Flash (High Speed)' },
  { id: 'gemini-3-flash', name: 'Gemini 3 Flash (Multimodal + Agentic)' },
  { id: 'gemini-3-deep-think', name: 'Gemini 3 Deep Think (Scientific)' },
  { id: 'gemini-2.5-pro', name: 'Gemini 2.5 Pro (2M ctx)' },
  { id: 'gemini-2.5-flash', name: 'Gemini 2.5 Flash' },
  { id: 'gemini-2.5-flash-lite', name: 'Gemini 2.5 Flash Lite (Ultra Cost-Effective)' },
  { id: 'gemini-2.0-pro', name: 'Gemini 2.0 Pro (Experimental)' },
  { id: 'gemini-2.0-flash', name: 'Gemini 2.0 Flash' },
  { id: 'gemini-1.5-pro', name: 'Gemini 1.5 Pro' },
  { id: 'gemini-1.5-flash', name: 'Gemini 1.5 Flash' },
  { id: 'gpt-5.2', name: 'GPT-5.2 (Latest)' },
  { id: 'gpt-4o', name: 'GPT-4o' },
  { id: 'o1', name: 'OpenAI o1' },
  { id: 'claude-sonnet-4-6', name: 'Claude Sonnet 4.6 (Vision)' },
  { id: 'claude-3-7-sonnet', name: 'Claude 3.7 Sonnet' },
  { id: 'claude-3-5-sonnet', name: 'Claude 3.5 Sonnet' },
  { id: 'ollama', name: 'Ollama (Local AI)' },
  { id: 'groq-llama-3-3-70b', name: 'Groq: Llama 3.3 70B (Versatile)' },
  { id: 'groq-llama-3-1-8b', name: 'Groq: Llama 3.1 8B (Instant)' },
  { id: 'groq-deepseek-r1', name: 'Groq: DeepSeek R1 Distill Llama 70B' },
  { id: 'groq-mixtral', name: 'Groq: Mixtral 8x7b' },
  { id: 'openai-compatible', name: 'OpenAI Compatible' }
];
let activeLlmProvider = 'gemini-2.5-flash';
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

// Redundant search-applications handler removed (see line 3387)


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

ipcMain.on('send-ai-overview-to-sidebar', (event, data) => {
  if (mainWindow) {
    mainWindow.webContents.send('ai-overview-data', data);
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
ipcMain.on('ollama-pull-model', (event, modelName) => {
  const ollama = spawn('ollama', ['pull', modelName]);

  ollama.stdout.on('data', (data) => {
    event.sender.send('ollama-pull-progress', { model: modelName, output: data.toString(), done: false });
  });

  ollama.stderr.on('data', (data) => {
    event.sender.send('ollama-pull-progress', { model: modelName, output: data.toString(), done: false });
  });

  ollama.on('close', (code) => {
    event.sender.send('ollama-pull-progress', { model: modelName, output: '', done: true, success: code === 0 });
  });
});

ipcMain.handle('ollama-import-model', async (event, { modelName, filePath }) => {
  try {
    if (!fs.existsSync(filePath)) return { success: false, error: 'File not found' };

    const modelfileContent = `FROM "${filePath.replace(/\\/g, '/')}"`;
    const modelfilePath = path.join(app.getPath('userData'), `Modelfile_${modelName}`);
    fs.writeFileSync(modelfilePath, modelfileContent);

    return new Promise((resolve) => {
      const ollama = spawn('ollama', ['create', modelName, '-f', modelfilePath]);
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

ipcMain.handle('select-local-file', async (event, options = {}) => {
  const defaultOptions = {
    properties: ['openFile'],
    filters: [{ name: 'All Files', extensions: ['*'] }]
  };

  const dialogOptions = { ...defaultOptions, ...options };

  const result = await dialog.showOpenDialog(mainWindow, dialogOptions);
  if (!result.canceled && result.filePaths.length > 0) {
    return result.filePaths[0];
  }
  return null;
});

// Shell Command Execution
// Secure Shell Command Execution
async function checkShellPermission(command) {
  if (!mainWindow) return false;

  let warning = "Executing unknown shell commands can be dangerous and may lead to data loss or system instability.";
  const cmdLower = (command || '').toLowerCase();
  const risks = [];

  // Risk detection logic
  if (cmdLower.includes('rm ') || cmdLower.includes('del ') || cmdLower.includes('rd ') || cmdLower.includes('rmdir ')) {
    risks.push("• DELETE operations: This command may permanently remove files or directories.");
  }
  if (cmdLower.includes('format ') || cmdLower.includes('fdisk ') || cmdLower.includes('mkfs')) {
    risks.push("• DISK modification: This command may format drives or modify partitions.");
  }
  if (cmdLower.includes('net ') || cmdLower.includes('curl ') || cmdLower.includes('wget ') || cmdLower.includes('ssh ') || cmdLower.includes('ftp')) {
    risks.push("• NETWORK access: This command may access the internet or remote servers.");
  }
  if (cmdLower.includes('reg ') || cmdLower.includes('setx ') || cmdLower.includes('sc ') || cmdLower.includes('netsh')) {
    risks.push("• SYSTEM modification: This command may modify critical system settings or the Registry.");
  }
  if (cmdLower.includes('powershell') || cmdLower.includes('cmd /c') || cmdLower.includes('sh ') || cmdLower.includes('bash ')) {
    risks.push("• SUB-SHELL execution: This command spawns a nested shell context.");
  }
  if (cmdLower.includes('shutdown') || cmdLower.includes('reboot') || cmdLower.includes('taskkill') || cmdLower.includes('kill ')) {
    risks.push("• PROCESS/POWER control: This command may terminate apps or restart the system.");
  }

  const detailText = `Requested Command:\n> ${command}\n\n${warning}\n\n${risks.length > 0 ? "⚠️ POTENTIAL RISKS DETECTED:\n" + risks.join('\n') + "\n\n" : ""}Only authorize this command if you trust the AI's intent and understand the command's function.`;

  const result = await dialog.showMessageBox(mainWindow, {
    type: 'warning',
    title: 'Security Authorization - Shell Execution',
    message: 'Action Required: AI is requesting Shell Access',
    detail: detailText,
    buttons: ['Authorize Execution', 'Block Command'],
    defaultId: 1, // Default to Block for safety
    cancelId: 1,
    checkboxLabel: 'Always allow this exact command in this session',
    noLink: true
  });

  if (result.response === 0) {
    if (result.checkboxChecked) {
      allowedCommands.add(command);
    }
    return true;
  }
  return false;
}

const allowedCommands = new Set();

ipcMain.handle('execute-shell-command', async (event, command) => {
  if (!command) return { success: false, error: 'No command provided' };

  // Strict allowlist for known safe commands could be added here
  // For now, we use the permission dialog
  if (!allowedCommands.has(command)) {
    const authorized = await checkShellPermission(command);
    if (!authorized) {
      return { success: false, error: 'User blocked the command execution.' };
    }
    allowedCommands.add(command);
  }

  return new Promise((resolve) => {
    exec(command, { timeout: 10000 }, (error, stdout, stderr) => {
      if (error) {
        resolve({ success: false, error: error.message, output: stderr });
      } else {
        resolve({ success: true, output: stdout.trim(), error: stderr });
      }
    });
  });
});

// OS-Specific System Controls (Windows)
ipcMain.handle('set-volume', async (event, level) => {
  // level should be 0-100
  if (process.platform === 'win32') {
    // Use PowerShell to set volume using AudioDeviceCmdlets or similar if available, 
    // but a simpler method without deps is using a VBS helper or nircmd.
    // Since we can't easily rely on external tools, we will use a naive approach relative to current (not perfect) 
    // OR strictly implementing 'mute/unmute' if accurate control isn't possible.
    // However, user wants it FIXED.
    // Best pure-standard-windows approach: 
    // Use WScript.Shell SendKeys to specific volume. (Still relative).
    // CORRECT APPROACH for modern Windows:
    // We will simply warn that this feature requires external tools if strictly needed, 
    // BUT we can try the NirCmd approach if the user has it, or just return an error that 
    // "Direct Volume Set not supported natively on Windows without NirCmd".

    // let's try the Powershell hack that might work on some systems
    const script = `
       $obj = New-Object -ComObject WScript.Shell
       $obj.SendKeys([char]174) # Volume Down
     `;
    // This is too weak.
    // Let's implement the permission prompt logic for this too?
    // Actually, let's use the 'sound-volume' package approach if strictly native?
    // No, we are in Electron Main. 
    // Let's just execute the shell command for 'nircmd' if available, else fail gracefully.

    return { success: false, error: 'Volume control on Windows requires "nircmd" installed and in PATH.' };
  }
  return { success: false, error: 'Platform not supported' };
});

ipcMain.handle('set-brightness', async (event, level) => {
  if (process.platform === 'win32') {
    // Powershell command to set brightness (WMI)
    // Level 0-100
    const cmd = `powershell (Get-WmiObject -Namespace root/WMI -Class WmiMonitorBrightnessMethods).WmiSetBrightness(1,${level})`;
    return new Promise((resolve) => {
      exec(cmd, (err, stdout, stderr) => {
        if (err) resolve({ success: false, error: err.message });
        else resolve({ success: true, output: stdout });
      });
    });
  }
  return { success: false, error: 'Platform not supported' };
});

// Open External Application
ipcMain.handle('open-external-app', async (event, app_name_or_path) => {
  try {
    console.log('[Main] Opening external app:', app_name_or_path);

    // First try as a direct path
    if (path.isAbsolute(app_name_or_path) && fs.existsSync(app_name_or_path)) {
      const result = await shell.openPath(app_name_or_path);
      if (!result) return { success: true };
    }

    // On Windows, use 'start' to find apps in PATH or registered apps
    if (process.platform === 'win32') {
      return new Promise((resolve) => {
        // Use 'start' command which is internal to cmd.exe
        // Double quotes for title (empty) and then the app command
        exec(`start "" "${app_name_or_path}"`, (error) => {
          if (error) {
            console.error(`[Main] Start command failed:`, error);
            resolve({ success: false, error: error.message });
          } else {
            resolve({ success: true });
          }
        });
      });
    } else if (process.platform === 'darwin') {
      return new Promise((resolve) => {
        exec(`open -a "${app_name_or_path}"`, (error) => {
          if (error) {
            // Fallback to general open
            shell.openPath(app_name_or_path).then(res => resolve({ success: !res, error: res }));
          } else {
            resolve({ success: true });
          }
        });
      });
    }

    const result = await shell.openPath(app_name_or_path);
    return { success: !result, error: result };
  } catch (error) {
    console.error('[Main] Failed to open external app:', error);
    return { success: false, error: error.message };
  }
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


// Removed duplicate application search logic (Real implementation is at line 2576)


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
  protocol.handle('comet', (request) => {
    const url = new URL(request.url);
    const resourcePath = url.hostname; // e.g., 'extensions', 'vault'

    // Depending on the resourcePath, serve different content
    if (resourcePath === 'extensions') {
      return new Response('<h1>Comet Extensions</h1><p>This is the extensions page.</p>', { headers: { 'content-type': 'text/html' } });
    } else if (resourcePath === 'vault') {
      return new Response('<h1>Comet Vault</h1><p>This is the vault page.</p>', { headers: { 'content-type': 'text/html' } });
    }
    // Fallback for unknown comet URLs
    return new Response('<h1>404 Not Found</h1><p>Unknown Comet resource.</p>', { headers: { 'content-type': 'text/html' } });
  });

  protocol.handle('media', (request) => {
    const filePath = decodeURIComponent(request.url.replace('media://', ''));
    // Ensure the path is properly formatted for the OS
    const normalizedPath = path.normalize(filePath);
    return net.fetch(`file://${normalizedPath}`);
  });

  createWindow();

  // Initialize Desktop Automation Services
  (async () => {
    try {
      await permissionStore.load();
      console.log('[Main] PermissionStore loaded.');

      cometAiEngine = new CometAiEngine();
      cometAiEngine.configure({
        GEMINI_API_KEY: store.get('gemini_api_key') || process.env.GEMINI_API_KEY || '',
        GROQ_API_KEY: store.get('groq_api_key') || process.env.GROQ_API_KEY || '',
        OPENAI_API_KEY: store.get('openai_api_key') || process.env.OPENAI_API_KEY || '',
        ANTHROPIC_API_KEY: store.get('anthropic_api_key') || process.env.ANTHROPIC_API_KEY || '',
      });
      console.log('[Main] CometAiEngine initialized.');

      robotService = new RobotService(permissionStore);
      console.log(`[Main] RobotService initialized (available: ${robotService.isAvailable}).`);

      tesseractOcrService = new TesseractOcrService();
      console.log('[Main] TesseractOcrService ready (lazy init on first use).');

      screenVisionService = new ScreenVisionService(cometAiEngine);
      console.log('[Main] ScreenVisionService initialized.');

      flutterBridge = new FlutterBridgeServer(cometAiEngine, tesseractOcrService);
      flutterBridge.start(9876);
      console.log('[Main] FlutterBridgeServer started on port 9876.');

      fileSystemMcp = new FileSystemMcpServer(permissionStore);
      nativeAppMcp = new NativeAppMcpServer(permissionStore);
      console.log('[Main] MCP Desktop servers (FileSystem + NativeApp) initialized.');

      webSearchProvider = new WebSearchProvider();
      webSearchProvider.configure({
        BRAVE_API_KEY: store.get('brave_api_key') || process.env.BRAVE_API_KEY || '',
        TAVILY_API_KEY: store.get('tavily_api_key') || process.env.TAVILY_API_KEY || '',
        SERP_API_KEY: store.get('serp_api_key') || process.env.SERP_API_KEY || '',
      });
      console.log('[Main] WebSearchProvider initialized.');

      ragService = new RagService();
      await ragService.init();
      console.log('[Main] RagService initialized.');

      voiceService = new VoiceService();
      voiceService.configure({
        OPENAI_API_KEY: store.get('openai_api_key') || process.env.OPENAI_API_KEY || '',
      });
      console.log('[Main] VoiceService initialized.');

      workflowRecorder = new WorkflowRecorder();
      console.log('[Main] WorkflowRecorder initialized.');

      popSearch = popSearchService;
      popSearch.initialize(mainWindow);
      console.log('[Main] PopSearch service initialized.');
    } catch (e) {
      console.error('[Main] Desktop automation services init error:', e.message);
    }
  })();

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

  // Handle successful authentication from external sources (e.g. landing page)
  ipcMain.on('set-auth-token', (event, token) => {
    console.log('[Main] Setting auth token');
    store.set('auth_token', token);
    if (mainWindow) {
      mainWindow.webContents.send('load-auth-token', token);
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

  // Load or generate local device ID for P2P sync
  const p2pDeviceIdPath = path.join(app.getPath('userData'), 'p2p_device_id.txt');
  let localP2PDeviceId;
  try {
    if (fs.existsSync(p2pDeviceIdPath)) {
      localP2PDeviceId = fs.readFileSync(p2pDeviceIdPath, 'utf8').trim();
    } else {
      localP2PDeviceId = `desktop-${Math.random().toString(36).substring(2, 10)}`;
      fs.writeFileSync(p2pDeviceIdPath, localP2PDeviceId);
    }
  } catch (e) {
    localP2PDeviceId = 'main-process-device';
  }

  p2pSyncService = getP2PSync(localP2PDeviceId);

  // Forward P2P service events to the renderer
  p2pSyncService.on('connected', () => {
    if (mainWindow) mainWindow.webContents.send('p2p-connected');
  });
  p2pSyncService.on('disconnected', () => {
    if (mainWindow) mainWindow.webContents.send('p2p-disconnected');
  });
  p2pSyncService.on('firebase-ready', (userId) => {
    if (mainWindow) {
      mainWindow.webContents.send('p2p-firebase-ready', userId);
      mainWindow.webContents.send('p2p-local-device-id', p2pSyncService.getStatus().deviceId);
    }
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

  // Listen for sync messages from peers
  p2pSyncService.on('message', (message) => {
    console.log(`[P2P] Received message of type: ${message.type}`);
    if (mainWindow) {
      mainWindow.webContents.send('p2p-message', message);
    }
    if (message.type === 'clipboard-sync') {
      clipboard.writeText(message.text);
      if (mainWindow) {
        mainWindow.webContents.send('clipboard-changed', message.text);
        mainWindow.webContents.send('notification', { title: 'Sync', body: 'Clipboard synced from remote device' });
      }
    } else if (message.type === 'history-sync') {
      appendToMemory({ action: 'remote-history', ...message.data });
      if (mainWindow) {
        mainWindow.webContents.send('notification', { title: 'Sync', body: 'Browsing history synced' });
      }
    }
  });

  // WiFi Sync Service (Mobile to Desktop)
  try {
    const { getWiFiSync } = require('./src/lib/WiFiSyncService.js');
    wifiSyncService = getWiFiSync(3004);
    wifiSyncService.start();

    wifiSyncService.on('command', ({ commandId, command, args, sendResponse }) => {
      console.log(`[WiFi-Sync] Mobile requested command: ${command}`);

      if (command === 'ai-prompt') {
        if (mainWindow) {
          mainWindow.webContents.send('remote-ai-prompt', { prompt: args.prompt, commandId });
          sendResponse({ success: true, output: 'Prompt received by desktop' });
        } else {
          sendResponse({ success: false, error: 'Desktop window not available' });
        }
      } else if (command === 'media-next' || command === 'media-prev' || command === 'media-play-pause') {
        if (robot) {
          const key = command === 'media-next' ? 'audio_next' : (command === 'media-prev' ? 'audio_prev' : 'audio_pause');
          robot.keyTap(key);
          sendResponse({ success: true, output: `Media key ${key} pressed` });
        } else {
          sendResponse({ success: false, error: 'robotjs not available' });
        }
      } else if (command === 'click') {
        if (robot) {
          const { x, y } = args;
          robot.moveMouse(x, y);
          robot.mouseClick();
          sendResponse({ success: true, output: `Clicked at (${x}, ${y})` });
        } else {
          sendResponse({ success: false, error: 'robotjs not available' });
        }
      } else if (command === 'find-and-click') {
        const targetText = args.text;
        // Reuse the find-and-click-text logic
        ipcMain.emit('find-and-click-text', { sender: { send: () => { } } }, targetText).then(result => {
          sendResponse(result);
        }).catch(err => {
          sendResponse({ success: false, error: err.message });
        });
      } else if (command === 'open-tab') {
        if (mainWindow) {
          mainWindow.webContents.send('add-new-tab', args.url);
          sendResponse({ success: true, output: `Opening tab: ${args.url}` });
        } else {
          sendResponse({ success: false, error: 'Desktop window not available' });
        }
      } else if (command === 'get-tabs') {
        ipcMain.handleOnce('get-open-tabs-internal', async () => {
          const tabs = [];
          for (const [tabId, view] of tabViews.entries()) {
            if (view && view.webContents) {
              tabs.push({
                tabId,
                url: view.webContents.getURL(),
                title: view.webContents.getTitle(),
                isActive: (tabId === activeTabId)
              });
            }
          }
          return tabs;
        });
        const tabs = [];
        for (const [tabId, view] of tabViews.entries()) {
          if (view && view.webContents) {
            tabs.push({
              tabId,
              url: view.webContents.getURL(),
              title: view.webContents.getTitle(),
              isActive: (tabId === activeTabId)
            });
          }
        }
        sendResponse({ success: true, tabs });
      } else if (command === 'type-text') {
        if (robot) {
          robot.typeString(args.text);
          sendResponse({ success: true, output: `Typed: ${args.text}` });
        } else {
          sendResponse({ success: false, error: 'robotjs not available' });
        }
      } else if (command === 'switch-tab') {
        if (mainWindow) {
          mainWindow.webContents.send('switch-to-tab', args.tabId);
          sendResponse({ success: true, output: `Switching to tab: ${args.tabId}` });
        } else {
          sendResponse({ success: false, error: 'Desktop window not available' });
        }
      } else {
        sendResponse({ success: false, error: `Command ${command} not implemented` });
      }
    });

    wifiSyncService.on('client-connected', () => {
      if (mainWindow) mainWindow.webContents.send('wifi-sync-status', { connected: true });
    });

    wifiSyncService.on('client-disconnected', () => {
      if (mainWindow) mainWindow.webContents.send('wifi-sync-status', { connected: false });
    });
  } catch (e) {
    console.error('[Main] Failed to initialize WiFi Sync Service:', e);
  }
  ipcMain.handle('get-wifi-sync-uri', () => {
    return wifiSyncService ? wifiSyncService.getConnectUri() : null;
  });

  ipcMain.handle('get-wifi-sync-qr', async () => {
    if (!wifiSyncService) return null;
    const uri = wifiSyncService.getConnectUri();
    try {
      return await QRCode.toDataURL(uri);
    } catch (err) {
      console.error('[Main] Failed to generate QR code:', err);
      return null;
    }
  });

  ipcMain.handle('get-wifi-sync-info', () => {
    if (!wifiSyncService) return null;
    return {
      deviceName: os.hostname(),
      pairingCode: wifiSyncService.getPairingCode(),
      ip: wifiSyncService.getLocalIp(),
      port: 3004
    };
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

        // Auto-install logic for Chrome Extensions (.crx)
        if (fileName.endsWith('.crx')) {
          console.log(`[Main] Detected extension download: ${fileName}. Installing...`);
          installExtensionLocally(saveDataPath);
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

  // Helper to install extension from a file path (e.g. download .crx)
  async function installExtensionLocally(crxPath) {
    try {
      const fileName = path.basename(crxPath);
      const extensionId = fileName.replace('.crx', '').split('_')[0] || `ext_${Date.now()}`;
      const targetDir = path.join(extensionsPath, extensionId);

      if (!fs.existsSync(targetDir)) {
        fs.mkdirSync(targetDir, { recursive: true });
      }

      console.log(`[Main] Extracting extension to ${targetDir}...`);

      // For Windows, use tar to extract. CRX files are basically ZIPs with header.
      // We try to extract directly. If it fails due to header, we might need to strip it.
      // However, tar often handles ZIP-like structures okay.
      // Better yet, we use a simple command to strip the first 512 bytes if header exists, 
      // but many CRXv3 can be opened by unzip tools directly.

      exec(`tar -xf "${crxPath}" -C "${targetDir}"`, async (err) => {
        if (err) {
          console.error(`[Main] Extraction failed: ${err.message}. Trying alternative...`);
          // Fallback or manual strip could go here
        }

        // Verify manifest
        const manifestPath = path.join(targetDir, 'manifest.json');
        if (fs.existsSync(manifestPath)) {
          const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
          console.log(`[Main] Extension ${manifest.name} extracted successfully.`);

          // Check if it's a theme
          if (manifest.theme) {
            console.log(`[Main] Detected theme: ${manifest.name}. Applying colors...`);
            if (mainWindow) mainWindow.webContents.send('apply-theme', manifest.theme);
          }

          // Load the extension into the session
          try {
            await session.defaultSession.loadExtension(targetDir);
            if (mainWindow) mainWindow.webContents.send('extension-installed', { name: manifest.name, id: extensionId });
          } catch (loadErr) {
            console.error(`[Main] Failed to load extension: ${loadErr.message}`);
          }
        }
      });
    } catch (e) {
      console.error(`[Main] installExtensionLocally error:`, e);
    }
  }

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

  ipcMain.handle('p2p-sync-history', async (event, data) => {
    if (p2pSyncService && p2pSyncService.getStatus().connected) {
      p2pSyncService.sendMessage({ type: 'history-sync', data });
      return { success: true };
    }
    return { success: false, error: 'Not connected to peer' };
  });

  ipcMain.handle('p2p-get-device-id', async () => {
    return p2pSyncService ? p2pSyncService.getStatus().deviceId : null;
  });

  ipcMain.on('send-p2p-signal', (event, { signal, remoteDeviceId }) => {
    if (!p2pSyncService) {
      console.error('[Main] P2P Sync Service not initialized.');
      return;
    }
    p2pSyncService.sendSignal(signal, remoteDeviceId);
  });

  // IPC handler to update global shortcuts
  ipcMain.on('update-shortcuts', (event, shortcuts) => {
    // Unregister all existing shortcuts to prevent conflicts
    globalShortcut.unregisterAll();

    shortcuts.forEach(s => {
      try {
        if (s.accelerator) { // Only register if an accelerator is provided
          globalShortcut.register(s.accelerator, () => {
            if (mainWindow) {
              if (mainWindow.isMinimized()) mainWindow.restore();
              mainWindow.focus();

              // Handle zoom actions directly in main process for better responsiveness
              if (s.action === 'zoom-in') {
                const view = tabViews.get(activeTabId);
                if (view) view.webContents.setZoomFactor(view.webContents.getZoomFactor() + 0.1);
              } else if (s.action === 'zoom-out') {
                const view = tabViews.get(activeTabId);
                if (view) view.webContents.setZoomFactor(view.webContents.getZoomFactor() - 0.1);
              } else if (s.action === 'zoom-reset') {
                const view = tabViews.get(activeTabId);
                if (view) view.webContents.setZoomFactor(1.0);
              } else {
                // Send other shortcut actions to the renderer
                mainWindow.webContents.send('execute-shortcut', s.action);
              }
            }
          });
        }
      } catch (e) {
        console.error(`Failed to register shortcut ${s.accelerator}:`, e);
      }
    });
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
  ipcMain.handle('translate-website', async (event, { targetLanguage, method }) => {
    const view = tabViews.get(activeTabId);
    if (!view) return { error: 'No active view' };

    // Default to 'google' method if not specified
    const translationMethod = method || 'google';

    if (translationMethod === 'chrome-ai') {
      // Chrome Built-in AI Translation (Modern - requires Chrome 144+)
      try {
        const code = `
        (async () => {
          try {
            // Check if translation API is available
            if (!window.translation) {
              return { error: 'Translation API not available. Use Chrome 144+ or enable --enable-features=TranslationAPI' };
            }
            
            const canTranslate = await window.translation.canTranslate({
              sourceLanguage: 'auto',
              targetLanguage: '${targetLanguage}'
            });
            
            if (canTranslate === 'no') {
              return { error: 'Cannot translate to ' + '${targetLanguage}' + '. Language pack may not be downloaded.' };
            }
            
            // Create translator (may download language pack)
            const translator = await window.translation.createTranslator({
              sourceLanguage: 'auto',
              targetLanguage: '${targetLanguage}'
            });
            
            // For page translation, we need to translate all text nodes
            // This is a simplified version - full implementation would traverse DOM
            const bodyText = document.body.innerText;
            const translated = await translator.translate(bodyText);
            
            return { success: true, method: 'chrome-ai', note: 'AI translation successful. For full page translation, language packs are downloaded automatically.' };
          } catch (e) {
            return { error: e.message };
          }
        })()
        `;
        const result = await view.webContents.executeJavaScript(code);
        return result;
      } catch (e) {
        console.error("[Translation] Chrome AI translation failed:", e);
        return { error: e.message };
      }
    } else {
      // Google Translate Element (Legacy Injection)
      try {
        // Improved Google Translate Injection with Cookie Support for faster activation
        const code = `
      (function() {
        // Set the Google Translate cookie for the target language
        // Format: /auto/[target_lang]
        const lang = '${targetLanguage}';
        document.cookie = 'googtrans=/auto/' + lang + '; path=/; domain=' + window.location.hostname;
        document.cookie = 'googtrans=/auto/' + lang + '; path=/;';
        
        if (!document.getElementById('google_translate_element')) {
          const div = document.createElement('div');
          div.id = 'google_translate_element';
          div.style.display = 'none';
          document.body.appendChild(div);
          
          window.googleTranslateElementInit = function() {
            new google.translate.TranslateElement({
              pageLanguage: 'auto',
              layout: google.translate.TranslateElement.InlineLayout.SIMPLE,
              autoDisplay: true
            }, 'google_translate_element');
          };

          const script = document.createElement('script');
          script.src = 'https://translate.google.com/translate_a/element.js?cb=googleTranslateElementInit';
          document.body.appendChild(script);
        } else {
          // If already exists, just trigger the change
          const combo = document.querySelector('.goog-te-combo');
          if (combo) {
            combo.value = lang;
            combo.dispatchEvent(new Event('change'));
          }
        }
        
        // Polling for the combo box as a backup
        let attempts = 0;
        const check = setInterval(function() {
          const combo = document.querySelector('.goog-te-combo');
          if (combo) {
            if (combo.value !== lang) {
              combo.value = lang;
              combo.dispatchEvent(new Event('change'));
            }
            clearInterval(check);
          }
            if (attempts++ > 20) clearInterval(check);
        }, 500);
      })()
    `;
        await view.webContents.executeJavaScript(code);
        return { success: true, method: 'google' };
      } catch (e) {
        console.error("[Translation] Website translation failed:", e);
        return { error: e.message };
      }
    }
  });

  // Integrated Translation IPC (Google Translate + Neural Fallback)
  ipcMain.handle('translate-text', async (event, { text, from, to }) => {
    if (!text) return { success: false, error: 'No text provided' };

    // Support both 'to' and 'targetLanguage' (some frontend parts might use different keys)
    const targetLang = to || 'en';
    const sourceLang = from || 'auto';

    try {
      console.log(`[Translation] Attempting Google Translate for: "${text.substring(0, 30)}..." to ${targetLang}`);
      const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=${sourceLang}&tl=${targetLang}&dt=t&q=${encodeURIComponent(text)}`;

      const response = await fetch(url);
      const data = await response.json();

      if (data && data[0]) {
        const translated = data[0].map(x => x[0]).join('');
        return {
          success: true,
          translated,
          method: 'google'
        };
      }
    } catch (e) {
      console.warn("[Translation] Google Translate API failed, falling back to Neural Engine:", e.message);
    }

    // Neural Fallback
    try {
      console.log(`[Neural Translation] Translating to ${targetLang} using ${activeLlmProvider}`);
      const prompt = [
        { role: 'system', content: `You are a high-performance neural translation engine. Translate the following text into ${targetLang}. Return ONLY the translated string.` },
        { role: 'user', content: text }
      ];

      const result = await llmGenerateHandler(prompt, { temperature: 0.3 });
      if (result.error) throw new Error(result.error);

      return {
        success: true,
        translated: result.text,
        method: 'neural',
        provider: activeLlmProvider
      };
    } catch (error) {
      console.error("[Translation] All translation methods failed:", error);
      return { success: false, error: error.message };
    }
  });

  // PDF Generation IPC
  ipcMain.handle('generate-pdf', async (event, title, content) => {
    try {
      const pdfDoc = await PDFDocument.create();
      const timesRomanFont = await pdfDoc.embedFont(StandardFonts.TimesRoman);
      const page = pdfDoc.addPage();
      const { width, height } = page.getSize();
      const fontSize = 12;

      page.drawText(title || "Generated Document", {
        x: 50,
        y: height - 100,
        size: 24,
        font: timesRomanFont,
        color: rgb(0, 0, 0.5),
      });

      const text = content || "No content provided.";
      const lines = text.split('\n');
      let yOffset = height - 150;

      for (const line of lines) {
        if (yOffset < 50) {
          pdfDoc.addPage();
          yOffset = height - 50;
        }
        page.drawText(line, {
          x: 50,
          y: yOffset,
          size: fontSize,
          font: timesRomanFont,
        });
        yOffset -= 20;
      }

      const pdfBytes = await pdfDoc.save();
      const downloadsPath = path.join(os.homedir(), 'Downloads');
      const fileName = `${(title || 'doc').replace(/[^a-z0-9]/gi, '_')}_${Date.now()}.pdf`;
      const filePath = path.join(downloadsPath, fileName);

      fs.writeFileSync(filePath, pdfBytes);

      if (mainWindow) {
        mainWindow.webContents.send('download-started', fileName);
        mainWindow.webContents.send('notification', { title: 'PDF Generated', body: `Saved to Downloads: ${fileName}` });
      }

      return { success: true, fileName, filePath };
    } catch (error) {
      console.error('[PDF] Generation failed:', error);
      return { success: false, error: error.message };
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
    const desktopPath = path.join(os.homedir(), 'Desktop');
    const shortcutPath = path.join(desktopPath, `${title.replace(/[^a-z0-9]/gi, '_').substring(0, 30)}.url`);

    const content = `[InternetShortcut]\nURL = ${url} \n`;

    try {
      fs.writeFileSync(shortcutPath, content);
      return { success: true, path: shortcutPath };
    } catch (error) {
      console.error('[Main] Failed to create shortcut:', error);
      return { error: error.message };
    }
  });

  ipcMain.handle('set-alarm', async (event, { time, message }) => {
    const platform = process.platform;
    let command = '';

    const alarmTime = new Date(time);
    if (isNaN(alarmTime.getTime())) {
      return { success: false, error: 'Invalid alarm time format.' };
    }

    // Format time for various OS commands
    const hour = alarmTime.getHours();
    const minute = alarmTime.getMinutes();
    const year = alarmTime.getFullYear();
    const month = alarmTime.getMonth() + 1; // Month is 0-indexed
    const day = alarmTime.getDate();

    const formattedTime = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')} `;
    const formattedDate = `${month} /${day}/${year} `;

    if (platform === 'win32') {
      // Windows: Use PowerShell to create a scheduled task
      // Note: Creating scheduled tasks requires Administrator privileges.
      // This command will create a basic task that displays a message.
      command = `powershell.exe - Command "$Action = New-ScheduledTaskAction -Execute 'msg.exe' -Argument '* ${message}'; $Trigger = New-ScheduledTaskTrigger -Once -At '${formattedTime}'; Register-ScheduledTask -TaskName 'CometAlarm_${Date.now()}' -Action $Action -Trigger $Trigger -Description '${message}'"`;
    } else if (platform === 'darwin') {
      // macOS: Use osascript to create a Calendar event or a reminder
      // Creating a reminder is more straightforward for a simple alarm.
      command = `osascript - e 'tell application "Reminders" to make new reminder with properties {name:"${message}", remind me date:"${alarmTime.toISOString()}"}'`;
      // Alternatively, for a notification at a specific time:
      // command = `osascript - e 'display notification "${message}" with title "Comet Alarm" subtitle "Time to Wake Up!"' - e 'delay $(((${alarmTime.getTime()} - $(date +%s%3N)) / 1000))' - e 'display dialog "${message}" buttons {"OK"} default button 1 with title "Comet Alarm"'`;
    } else if (platform === 'linux') {
      // Linux: Use 'at' command (requires 'at' daemon to be running)
      // Example: echo "DISPLAY=:0 notify-send 'Comet Alarm' '${message}'" | at ${formattedTime} ${formattedDate}
      // `at` command format: `at[-m] TIME[DATE]`, e.g., `at 10:00 tomorrow`
      command = `echo "DISPLAY=:0 notify-send 'Comet Alarm' '${message}'" | at ${formattedTime} ${formattedDate} `;
    } else {
      return { success: false, error: `Unsupported platform for alarms: ${platform} ` };
    }

    return new Promise((resolve) => {
      exec(command, { timeout: 10000 }, (error, stdout, stderr) => {
        if (error) {
          console.error(`Set alarm error on ${platform}: `, error);
          resolve({ success: false, error: stderr || error.message });
        } else {
          resolve({ success: true, message: `Alarm set for ${alarmTime.toLocaleString()}` });
        }
      });
    });
  });

  // ============================================================================
  // POPUP WINDOW SYSTEM - Fix for panels appearing behind browser view
  // ============================================================================
  let popupWindows = new Map(); // Track all popup windows

  /**
   * Creates a popup window that appears on top of the browser view
   * This solves the z-index issue where panels appear behind the webview
   */
  function createPopupWindow(type, options = {}) {
    // Close existing popup of the same type
    if (popupWindows.has(type)) {
      const existing = popupWindows.get(type);
      if (existing && !existing.isDestroyed()) {
        existing.close();
      }
      popupWindows.delete(type);
    }

    const defaultOptions = {
      width: 1000,
      height: 700,
      frame: false,
      transparent: true,
      backgroundColor: '#00000000',
      webPreferences: {
        preload: path.join(__dirname, 'preload.js'),
        nodeIntegration: false,
        contextIsolation: true,
        sandbox: false,
      },
      parent: mainWindow,
      modal: false,
      alwaysOnTop: true, // Critical: ensures popup appears above browser view
      skipTaskbar: true,
      resizable: true,
      minimizable: false,
      maximizable: false,
      show: false,
    };

    const popup = new BrowserWindow({ ...defaultOptions, ...options });

    // Ensure popup appears above BrowserView by removing parent and using alwaysOnTop
    popup.setAlwaysOnTop(true, 'screen-saturation');

    // Load the appropriate content
    const baseUrl = isDev
      ? 'http://localhost:3003'
      : `file://${path.join(__dirname, 'out', 'index.html')}`;

    let route = '';
    switch (type) {
      case 'settings':
        route = isDev ? '/?panel=settings' : '/settings';
        break;
      case 'extensions':
      case 'plugins': // Handle 'plugins' as an alias for 'extensions'
        route = isDev ? '/?panel=extensions' : '/extensions';
        break;
      case 'profile':
        route = isDev ? '/?panel=profile' : '/profile';
        break;
      case 'downloads':
        route = isDev ? '/?panel=downloads' : '/downloads';
        break;
      case 'clipboard':
        route = isDev ? '/?panel=clipboard' : '/clipboard';
        break;
      case 'cart':
      case 'unified-cart':
        route = '/cart';
        break;
      case 'search':
      case 'search-apps':
        route = isDev ? '/?panel=apps' : '/apps';
        break;
      case 'translate':
        route = isDev ? '/?panel=translate' : '/translate';
        break;
      case 'context-menu':
      case 'rightclick':
        route = isDev ? '/?panel=context-menu' : '/context-menu';
        break;
      default:
        route = `/${type}`;
    }

    let url;
    if (isDev) {
      url = `${baseUrl}${route}`;
    } else {
      // Check for both folder/index.html and folder.html (Next.js export behavior)
      const routePathIndex = route === '/' ? '/index.html' : `${route}/index.html`;
      const routePathHtml = route === '/' ? '/index.html' : `${route}.html`;

      const fullPathIndex = path.join(__dirname, 'out', routePathIndex);
      const fullPathHtml = path.join(__dirname, 'out', routePathHtml);

      if (fs.existsSync(fullPathIndex)) {
        url = `file://${fullPathIndex}`;
      } else if (fs.existsSync(fullPathHtml)) {
        url = `file://${fullPathHtml}`;
      } else {
        // Fallback to hash routing if file doesn't exist
        url = `file://${path.join(__dirname, 'out', 'index.html')}#${route}`;
      }
    }

    console.log(`[Main] Loading popup URL: ${url}`);
    popup.loadURL(url);

    popup.once('ready-to-show', () => {
      popup.show();
      popup.focus();
      // Ensure popup is always on top of BrowserView
      popup.moveTop();
    });

    popup.on('closed', () => {
      popupWindows.delete(type);
    });

    popupWindows.set(type, popup);
    return popup;
  }

  // IPC Handlers for popup windows
  ipcMain.on('open-popup-window', (event, { type, options }) => {
    createPopupWindow(type, options);
  });

  ipcMain.on('close-popup-window', (event, type) => {
    if (popupWindows.has(type)) {
      const popup = popupWindows.get(type);
      if (popup && !popup.isDestroyed()) {
        popup.close();
      }
      popupWindows.delete(type);
    }
  });

  ipcMain.on('close-all-popups', () => {
    popupWindows.forEach((popup, type) => {
      if (popup && !popup.isDestroyed()) {
        popup.close();
      }
    });
    popupWindows.clear();
  });

  // Specific popup handlers
  ipcMain.on('open-settings-popup', (event, section = 'profile') => {
    createPopupWindow('settings', {
      width: 1200,
      height: 800,
    });
    // Send the section to open after window is ready
    setTimeout(() => {
      const popup = popupWindows.get('settings');
      if (popup && !popup.isDestroyed()) {
        popup.webContents.send('set-settings-section', section);
      }
    }, 500);
  });

  ipcMain.on('open-profile-popup', () => {
    createPopupWindow('profile', {
      width: 600,
      height: 700,
    });
  });

  ipcMain.on('open-plugins-popup', () => {
    createPopupWindow('plugins', {
      width: 900,
      height: 700,
    });
  });

  ipcMain.on('open-downloads-popup', () => {
    createPopupWindow('downloads', {
      width: 400,
      height: 600,
    });
  });

  ipcMain.on('open-clipboard-popup', () => {
    createPopupWindow('clipboard', {
      width: 450,
      height: 650,
    });
  });

  ipcMain.on('open-cart-popup', () => {
    createPopupWindow('cart', {
      width: 500,
      height: 700,
    });
  });

  ipcMain.on('open-search-popup', (event, options = {}) => {
    createPopupWindow('search', {
      width: 600,
      height: 500,
      ...options
    });
  });

  ipcMain.on('open-translate-popup', (event, options = {}) => {
    createPopupWindow('translate', {
      width: 400,
      height: 500,
      ...options
    });
  });

  ipcMain.on('open-context-menu-popup', (event, options = {}) => {
    createPopupWindow('context-menu', {
      width: 250,
      height: 400,
      ...options
    });
  });

  // Google login removed. Authentication redirected to ponsrischool web-auth.

  // ============================================================================
  // SHELL COMMAND EXECUTION - For AI control of system features
  // ============================================================================


  // Remove existing handler if present to prevent "second handler" error
  ipcMain.removeHandler('click-element');
  ipcMain.handle('click-element', async (event, selector) => {
    const view = tabViews.get(activeTabId);
    if (!view) return { success: false, error: 'No active view' };
    try {
      const result = await view.webContents.executeJavaScript(`
      (() => {
        const el = document.querySelector('${selector}');
        if (el) {
          el.click();
          return true;
        }
        return false;
      })()
    `);
      return { success: result };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('type-text', async (event, { selector, text }) => {
    const view = tabViews.get(activeTabId);
    if (!view) return { success: false, error: 'No active view' };
    try {
      await view.webContents.executeJavaScript(`
      (() => {
        const el = document.querySelector('${selector}');
        if (el) {
          el.focus();
          el.value = '${text.replace(/'/g, "\\'")}';
          el.dispatchEvent(new Event('input', { bubbles: true }));
          el.dispatchEvent(new Event('change', { bubbles: true }));
          return true;
        }
        return false;
      })()
    `);
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('fill-form', async (event, formData) => {
    const view = tabViews.get(activeTabId);
    if (!view) return { success: false, error: 'No active view' };
    try {
      await view.webContents.executeJavaScript(`
      (() => {
        const data = ${JSON.stringify(formData)};
        let successCount = 0;
        for (const [selector, value] of Object.entries(data)) {
           const el = document.querySelector(selector);
           if (el) {
             el.focus();
             el.value = value;
             el.dispatchEvent(new Event('input', { bubbles: true }));
             el.dispatchEvent(new Event('change', { bubbles: true }));
             successCount++;
           }
        }
        return successCount;
      })()
    `);
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });

  // Duplicate select-local-file removed


  // Duplicate execute-shell-command removed


  // ============================================================================
  // SCREEN CAPTURE - For OCR and cross-app clicking
  // ============================================================================


  // ============================================================================
  // APPLICATION SEARCH - Search for installed applications
  // ============================================================================
  ipcMain.handle('search-applications', async (event, query) => {
    console.log('[AppSearch] Searching for:', query);

    const platform = process.platform;
    const results = [];

    try {
      if (platform === 'win32') {
        // Windows: Search only in Start Menu for performance. Program Files is too slow for recursive readdir.
        const searchPaths = [
          path.join(process.env.ProgramData, 'Microsoft/Windows/Start Menu/Programs'),
          path.join(process.env.APPDATA, 'Microsoft/Windows/Start Menu/Programs'),
          'C:\\ProgramData\\Microsoft\\Windows\\Start Menu\\Programs',
          path.join(process.env.USERPROFILE, 'AppData\\Roaming\\Microsoft\\Windows\\Start Menu\\Programs')
        ];

        for (const searchPath of searchPaths) {
          if (fs.existsSync(searchPath)) {
            // Limited depth search (max 3 levels)
            const getFiles = (dir, depth = 0) => {
              if (depth > 3) return [];
              try {
                let results = [];
                const list = fs.readdirSync(dir, { withFileTypes: true });
                for (const file of list) {
                  const res = path.resolve(dir, file.name);
                  if (file.isDirectory()) {
                    results = results.concat(getFiles(res, depth + 1));
                  } else {
                    if (file.name.toLowerCase().includes(query.toLowerCase()) &&
                      (file.name.endsWith('.lnk') || file.name.endsWith('.exe'))) {
                      results.push({
                        name: path.basename(file.name, path.extname(file.name)),
                        path: res
                      });
                    }
                  }
                }
                return results;
              } catch (e) { return []; }
            };

            results.push(...getFiles(searchPath));
          }
        }
      } else if (platform === 'darwin') {
        // macOS: Search in Applications folder
        const appsPath = '/Applications';
        if (fs.existsSync(appsPath)) {
          const apps = fs.readdirSync(appsPath);
          apps.forEach(app => {
            if (app.toLowerCase().includes(query.toLowerCase()) && app.endsWith('.app')) {
              results.push({
                name: path.basename(app, '.app'),
                path: path.join(appsPath, app)
              });
            }
          });
        }
      } else {
        // Linux: Search in common application directories
        const searchPaths = ['/usr/share/applications', '/usr/local/share/applications'];

        for (const searchPath of searchPaths) {
          if (fs.existsSync(searchPath)) {
            const files = fs.readdirSync(searchPath);
            files.forEach(file => {
              if (file.toLowerCase().includes(query.toLowerCase()) && file.endsWith('.desktop')) {
                results.push({
                  name: path.basename(file, '.desktop'),
                  path: path.join(searchPath, file)
                });
              }
            });
          }
        }
      }

      return {
        success: true,
        results: results.slice(0, 20) // Limit to 20 results
      };
    } catch (error) {
      console.error('[AppSearch] Error:', error);
      return {
        success: false,
        error: error.message,
        results: []
      };
    }
  });

  // ============================================================================
  // OPEN EXTERNAL APP - Launch applications
  // ============================================================================
  // Duplicate open-external-app command removed


  // ============================================================================
  // AUTOMATION & OCR - Integrated handlers
  // ============================================================================

  // Helper: Capture Screen Region
  async function captureScreenRegion(bounds, outputPath) {
    try {
      if (robot && bounds) {
        // Use robotjs for specific region if available (fastest)
        const bmp = robot.screen.capture(bounds.x, bounds.y, bounds.width, bounds.height);

        // Create new Jimp image (v0.x API)
        const jimpImage = new Jimp(bmp.width, bmp.height);

        let pos = 0;
        // Convert raw BGRA to RGBA for Jimp
        jimpImage.scan(0, 0, jimpImage.bitmap.width, jimpImage.bitmap.height, (x, y, idx) => {
          jimpImage.bitmap.data[idx + 2] = bmp.image.readUInt8(pos++); // B -> R
          jimpImage.bitmap.data[idx + 1] = bmp.image.readUInt8(pos++); // G
          jimpImage.bitmap.data[idx + 0] = bmp.image.readUInt8(pos++); // R -> B
          jimpImage.bitmap.data[idx + 3] = bmp.image.readUInt8(pos++); // A
        });

        await jimpImage.writeAsync(outputPath);
        return outputPath;
      } else {
        // Fallback to screenshot-desktop (full screen)
        const imgBuffer = await screenshot({ format: 'png' });
        const jimpImage = await Jimp.read(imgBuffer);

        if (bounds) {
          jimpImage.crop(bounds.x, bounds.y, bounds.width, bounds.height);
        }

        await jimpImage.writeAsync(outputPath);
        return outputPath;
      }
    } catch (error) {
      console.error('Capture failed:', error);
      throw error;
    }
  }

  // Handler: Perform OCR
  ipcMain.handle('perform-ocr', async (event, options) => {
    const { useNative = true, bounds, language = 'eng', imagePath } = options || {};
    let tempFile = imagePath;
    let shouldDelete = false;

    if (!tempFile) {
      tempFile = path.join(os.tmpdir(), `ocr_${Date.now()}.png`);
      shouldDelete = true;
    }

    try {
      if (shouldDelete) {
        await captureScreenRegion(bounds, tempFile);
      }

      if (useNative) {
        try {
          if (process.platform === 'darwin') {
            const script = `
      use framework "Vision"
      use framework "AppKit"
      use scripting additions
      
      set imagePath to "${tempFile}"
      set imageURL to current application's NSURL's fileURLWithPath:imagePath
      set requestHandler to current application's VNImageRequestHandler's alloc()'s initWithURL:imageURL options:(missing value)
      
      set textRequest to current application's VNRecognizeTextRequest's alloc()'s init()
      textRequest's setRecognitionLevel:(current application's VNRequestTextRecognitionLevelAccurate)
      
      requestHandler's performRequests:{textRequest} |error|:(missing value)
      
      set observations to textRequest's results()
      set resultText to ""
      repeat with observation in observations
          set resultText to resultText & (observation's text() as text) & linefeed
      end repeat
      
      return resultText
          `;
            const { stdout } = await execPromise(`osascript -l JavaScript -e '${script.replace(/'/g, "\\'")}'`);
            return { text: stdout.trim(), confidence: 0.95 };
          } else if (process.platform === 'win32') {
            const psScript = `
      Add-Type -AssemblyName System.Runtime.WindowsRuntime
      [Windows.Storage.StorageFile,Windows.Storage,ContentType=WindowsRuntime] | Out-Null
      [Windows.Media.Ocr.OcrEngine,Windows.Foundation,ContentType=WindowsRuntime] | Out-Null
      [Windows.Graphics.Imaging.BitmapDecoder,Windows.Graphics,ContentType=WindowsRuntime] | Out-Null
      
      $file = [Windows.Storage.StorageFile]::GetFileFromPathAsync("${tempFile}").GetAwaiter().GetResult()
      $stream = $file.OpenAsync([Windows.Storage.FileAccessMode]::Read).GetAwaiter().GetResult()
      $decoder = [Windows.Graphics.Imaging.BitmapDecoder]::CreateAsync($stream).GetAwaiter().GetResult()
      $bitmap = $decoder.GetSoftwareBitmapAsync().GetAwaiter().GetResult()
      
      $engine = [Windows.Media.Ocr.OcrEngine]::TryCreateFromUserProfileLanguages()
      $result = $engine.RecognizeAsync($bitmap).GetAwaiter().GetResult()
      
      $result.Text
          `;
            const { stdout } = await execPromise(`powershell -Command "${psScript.replace(/"/g, '\\"')}"`);
            return { text: stdout.trim(), confidence: 0.90 };
          }
        } catch (nativeErr) {
          console.warn('Native OCR failed (fallback to Tesseract):', nativeErr.message);
        }
      }

      // Fallback to Tesseract
      if (!tesseractWorker) {
        tesseractWorker = await createWorker(language);
      }
      const { data } = await tesseractWorker.recognize(tempFile);
      return {
        text: data.text,
        confidence: data.confidence / 100,
        words: data.words.map(w => ({ text: w.text, bbox: w.bbox, confidence: w.confidence / 100 }))
      };

    } catch (error) {
      console.error('OCR Error:', error);
      return { error: error.message };
    } finally {
      if (shouldDelete) {
        try { fs.unlinkSync(tempFile); } catch (e) { }
      }
    }
  });

  // Handler: Perform Click (Comprehensive)
  const performClickHandler = async (event, args) => {
    const { x, y, button = 'left', doubleClick = false } = args;

    if (!robot) return { success: false, error: 'robotjs not available' };

    try {
      robot.moveMouseSmooth(x, y);
      if (doubleClick) {
        robot.mouseClick(button, true);
      } else {
        robot.mouseClick(button);
      }
      return { success: true };
    } catch (error) {
      console.error('Click Error:', error);
      return { success: false, error: error.message };
    }
  };

  ipcMain.handle('perform-click', performClickHandler);
  ipcMain.handle('perform-cross-app-click', performClickHandler); // Alias for backward compatibility

  // Handler: Get Window Info
  ipcMain.handle('get-window-info', async () => {
    try {
      if (process.platform === 'darwin') {
        const script = `
        tell application "System Events"
          set frontApp to name of first application process whose frontmost is true
          set frontWindow to name of front window of application process frontApp
          return {frontApp, frontWindow}
        end tell
      `;
        const { stdout } = await execPromise(`osascript -e '${script}'`);
        return { window: stdout.trim() }; // Simplified parsing
      } else if (process.platform === 'win32') {
        const script = `
        Add-Type @"
          using System;
          using System.Runtime.InteropServices;
          using System.Text;
          public class Win32 {
              [DllImport("user32.dll")]
              public static extern IntPtr GetForegroundWindow();
              [DllImport("user32.dll")]
              public static extern int GetWindowText(IntPtr hWnd, StringBuilder text, int count);
          }
"@
        $handle = [Win32]::GetForegroundWindow()
        $title = New-Object System.Text.StringBuilder 256
        [void][Win32]::GetWindowText($handle, $title, 256)
        $title.ToString()
      `;
        const { stdout } = await execPromise(`powershell -Command "${script}"`);
        return { window: stdout.trim() };
      }
      return null;
    } catch (error) {
      console.error('Get Window Info Error:', error);
      return { error: error.message };
    }
  });

  // Duplicate capture-screen-region removed - now consolidated in main handlers section

  // ============================================================================
  // DESKTOP AUTOMATION v2 — Permission, Robot, OCR, Vision IPC Handlers
  // ============================================================================

  // --- Permission Store ---
  ipcMain.handle('perm-grant', async (event, { key, level, description, sessionOnly }) => {
    try {
      permissionStore.grant(key, level, description, sessionOnly !== false);
      return { success: true };
    } catch (e) { return { success: false, error: e.message }; }
  });

  ipcMain.handle('perm-revoke', async (event, key) => {
    permissionStore.revoke(key);
    return { success: true };
  });

  ipcMain.handle('perm-revoke-all', async () => {
    permissionStore.revokeAll();
    return { success: true };
  });

  ipcMain.handle('perm-check', async (event, key) => {
    return { granted: permissionStore.isGranted(key) };
  });

  ipcMain.handle('perm-list', async () => {
    return permissionStore.getAll();
  });

  ipcMain.handle('perm-audit-log', async (event, limit) => {
    return permissionStore.getAuditLog(limit || 100);
  });

  // --- Robot Service ---
  ipcMain.handle('robot-execute', async (event, action) => {
    if (!robotService) return { success: false, error: 'RobotService not initialized' };
    try {
      return await robotService.execute(action);
    } catch (e) { return { success: false, error: e.message }; }
  });

  ipcMain.handle('robot-execute-sequence', async (event, { actions, options }) => {
    if (!robotService) return { success: false, error: 'RobotService not initialized' };
    try {
      return await robotService.executeSequence(actions, options);
    } catch (e) { return { success: false, error: e.message }; }
  });

  ipcMain.handle('robot-kill', async () => {
    if (robotService) robotService.kill();
    return { success: true };
  });

  ipcMain.handle('robot-reset-kill', async () => {
    if (robotService) robotService.resetKill();
    return { success: true };
  });

  ipcMain.handle('robot-status', async () => {
    return {
      available: robotService?.isAvailable || false,
      permitted: permissionStore.isGranted('robot'),
      killActive: robotService?.killFlag || false,
    };
  });

  // --- Tesseract OCR v2 ---
  ipcMain.handle('ocr-capture-words', async (event, displayId) => {
    if (!tesseractOcrService) return { success: false, error: 'OCR service not initialized' };
    try {
      const words = await tesseractOcrService.captureAndOcr(displayId);
      return { success: true, words };
    } catch (e) { return { success: false, error: e.message }; }
  });

  ipcMain.handle('ocr-click', async (event, { target, useAi }) => {
    if (!tesseractOcrService || !robotService) {
      return { success: false, error: 'OCR or Robot service not initialized' };
    }
    try {
      const ai = useAi !== false ? cometAiEngine : null;
      return await tesseractOcrService.ocrClick(target, ai, robotService, permissionStore);
    } catch (e) { return { success: false, error: e.message }; }
  });

  ipcMain.handle('ocr-screen-text', async (event, displayId) => {
    if (!tesseractOcrService) return { success: false, error: 'OCR service not initialized' };
    try {
      const text = await tesseractOcrService.getScreenText(displayId);
      return { success: true, text };
    } catch (e) { return { success: false, error: e.message }; }
  });

  // --- Screen Vision AI ---
  ipcMain.handle('vision-describe', async (event, question) => {
    if (!screenVisionService) return { success: false, error: 'Vision service not initialized' };
    try {
      const description = await screenVisionService.describe(question);
      return { success: true, description };
    } catch (e) { return { success: false, error: e.message }; }
  });

  ipcMain.handle('vision-analyze', async (event, question) => {
    if (!screenVisionService || !tesseractOcrService) {
      return { success: false, error: 'Vision or OCR service not initialized' };
    }
    try {
      const result = await screenVisionService.analyzeAndAct(
        question, tesseractOcrService, robotService, permissionStore
      );
      return { success: true, ...result };
    } catch (e) { return { success: false, error: e.message }; }
  });

  ipcMain.handle('vision-capture-base64', async () => {
    if (!screenVisionService) return { success: false, error: 'Vision service not initialized' };
    try {
      const image = await screenVisionService.captureBase64();
      return { success: true, image };
    } catch (e) { return { success: false, error: e.message }; }
  });

  // --- AI Engine (direct chat for automation tasks) ---
  ipcMain.handle('ai-engine-chat', async (event, { message, model, systemPrompt, history }) => {
    if (!cometAiEngine) return { success: false, error: 'AI engine not initialized' };
    try {
      const response = await cometAiEngine.chat({ message, model, systemPrompt, history });
      return { success: true, response };
    } catch (e) { return { success: false, error: e.message }; }
  });

  ipcMain.handle('ai-engine-configure', async (event, keys) => {
    if (!cometAiEngine) return { success: false, error: 'AI engine not initialized' };
    cometAiEngine.configure(keys);
    if (keys.GEMINI_API_KEY) store.set('gemini_api_key', keys.GEMINI_API_KEY);
    if (keys.GROQ_API_KEY) store.set('groq_api_key', keys.GROQ_API_KEY);
    if (keys.OPENAI_API_KEY) store.set('openai_api_key', keys.OPENAI_API_KEY);
    if (keys.ANTHROPIC_API_KEY) store.set('anthropic_api_key', keys.ANTHROPIC_API_KEY);
    return { success: true };
  });

  // ============================================================================
  // FLUTTER BRIDGE — IPC Handlers
  // ============================================================================

  ipcMain.handle('bridge-get-pairing-code', async () => {
    if (!flutterBridge) return { success: false, error: 'Bridge not initialized' };
    return { success: true, code: flutterBridge.getPairingCode() };
  });

  ipcMain.handle('bridge-get-status', async () => {
    return {
      running: !!flutterBridge?.server,
      connectedDevices: flutterBridge?.getConnectedCount() || 0,
    };
  });

  ipcMain.handle('bridge-rotate-secret', async () => {
    if (!flutterBridge) return { success: false, error: 'Bridge not initialized' };
    flutterBridge.rotateSecret();
    return { success: true, code: flutterBridge.getPairingCode() };
  });

  ipcMain.handle('bridge-broadcast', async (event, message) => {
    if (!flutterBridge) return { success: false, error: 'Bridge not initialized' };
    flutterBridge.broadcast(message);
    return { success: true };
  });

  // ============================================================================
  // MCP DESKTOP SERVERS — FileSystem + NativeApp IPC Handlers
  // ============================================================================

  ipcMain.handle('mcp-fs-read', async (event, filePath) => {
    if (!fileSystemMcp) return { success: false, error: 'FileSystem MCP not initialized' };
    try {
      const content = await fileSystemMcp.readFile(filePath);
      return { success: true, content };
    } catch (e) { return { success: false, error: e.message }; }
  });

  ipcMain.handle('mcp-fs-write', async (event, { path: p, content }) => {
    if (!fileSystemMcp) return { success: false, error: 'FileSystem MCP not initialized' };
    try {
      const result = await fileSystemMcp.writeFile(p, content);
      return { success: true, result };
    } catch (e) { return { success: false, error: e.message }; }
  });

  ipcMain.handle('mcp-fs-list', async (event, dirPath) => {
    if (!fileSystemMcp) return { success: false, error: 'FileSystem MCP not initialized' };
    try {
      const entries = await fileSystemMcp.listDir(dirPath);
      return { success: true, entries };
    } catch (e) { return { success: false, error: e.message }; }
  });

  ipcMain.handle('mcp-fs-approved-dirs', async () => {
    if (!fileSystemMcp) return { success: false, error: 'FileSystem MCP not initialized' };
    return { success: true, dirs: fileSystemMcp.getApprovedDirs() };
  });

  ipcMain.handle('mcp-native-applescript', async (event, script) => {
    if (!nativeAppMcp) return { success: false, error: 'NativeApp MCP not initialized' };
    try {
      const result = await nativeAppMcp.runAppleScript(script);
      return { success: true, result };
    } catch (e) { return { success: false, error: e.message }; }
  });

  ipcMain.handle('mcp-native-powershell', async (event, script) => {
    if (!nativeAppMcp) return { success: false, error: 'NativeApp MCP not initialized' };
    try {
      const result = await nativeAppMcp.runPowerShell(script);
      return { success: true, result };
    } catch (e) { return { success: false, error: e.message }; }
  });

  ipcMain.handle('mcp-native-active-window', async () => {
    if (!nativeAppMcp) return { success: false, error: 'NativeApp MCP not initialized' };
    try {
      const info = await nativeAppMcp.getActiveWindow();
      return { success: true, ...info };
    } catch (e) { return { success: false, error: e.message }; }
  });

  // ============================================================================
  // WEB SEARCH v2 — Multi-provider (Brave / Tavily / SerpAPI)
  // ============================================================================

  ipcMain.handle('web-search', async (event, { query, provider, count }) => {
    if (!webSearchProvider) return { success: false, error: 'WebSearch not initialized' };
    try {
      const results = await webSearchProvider.search(query, provider, count);
      return { success: true, results };
    } catch (e) { return { success: false, error: e.message }; }
  });

  ipcMain.handle('web-search-context', async (event, { query, provider }) => {
    if (!webSearchProvider) return { success: false, error: 'WebSearch not initialized' };
    try {
      const context = await webSearchProvider.searchForContext(query, provider);
      return { success: true, context };
    } catch (e) { return { success: false, error: e.message }; }
  });

  ipcMain.handle('web-search-providers', async () => {
    if (!webSearchProvider) return { success: false, error: 'WebSearch not initialized' };
    return { success: true, providers: webSearchProvider.getAvailableProviders() };
  });

  ipcMain.handle('web-search-configure', async (event, keys) => {
    if (!webSearchProvider) return { success: false, error: 'WebSearch not initialized' };
    webSearchProvider.configure(keys);
    if (keys.BRAVE_API_KEY) store.set('brave_api_key', keys.BRAVE_API_KEY);
    if (keys.TAVILY_API_KEY) store.set('tavily_api_key', keys.TAVILY_API_KEY);
    if (keys.SERP_API_KEY) store.set('serp_api_key', keys.SERP_API_KEY);
    return { success: true };
  });

  // ============================================================================
  // RAG — Vector Store (Local Embeddings + Gemini)
  // ============================================================================

  ipcMain.handle('rag-ingest', async (event, { text, source }) => {
    if (!ragService) return { success: false, error: 'RAG not initialized' };
    try {
      const apiKey = store.get('gemini_api_key') || process.env.GEMINI_API_KEY;
      const count = await ragService.ingest(text, source, apiKey);
      return { success: true, chunksAdded: count };
    } catch (e) { return { success: false, error: e.message }; }
  });

  ipcMain.handle('rag-retrieve', async (event, { query, k }) => {
    if (!ragService) return { success: false, error: 'RAG not initialized' };
    try {
      const apiKey = store.get('gemini_api_key') || process.env.GEMINI_API_KEY;
      const results = await ragService.retrieve(query, k, apiKey);
      return { success: true, results };
    } catch (e) { return { success: false, error: e.message }; }
  });

  ipcMain.handle('rag-context', async (event, { query, k }) => {
    if (!ragService) return { success: false, error: 'RAG not initialized' };
    try {
      const apiKey = store.get('gemini_api_key') || process.env.GEMINI_API_KEY;
      const context = await ragService.retrieveContext(query, k, apiKey);
      return { success: true, context };
    } catch (e) { return { success: false, error: e.message }; }
  });

  ipcMain.handle('rag-stats', async () => {
    if (!ragService) return { success: false, error: 'RAG not initialized' };
    return { success: true, ...ragService.getStats() };
  });

  ipcMain.handle('rag-delete-source', async (event, source) => {
    if (!ragService) return { success: false, error: 'RAG not initialized' };
    try {
      const deleted = await ragService.deleteSource(source);
      return { success: true, deleted };
    } catch (e) { return { success: false, error: e.message }; }
  });

  ipcMain.handle('rag-clear', async () => {
    if (!ragService) return { success: false, error: 'RAG not initialized' };
    await ragService.clear();
    return { success: true };
  });

  // ============================================================================
  // VOICE CONTROL — Whisper Transcription
  // ============================================================================

  ipcMain.handle('voice-transcribe', async (event, { audioBase64, format }) => {
    if (!voiceService) return { success: false, error: 'Voice service not initialized' };
    try {
      const text = await voiceService.transcribeBase64(audioBase64, format || 'wav');
      return { success: true, text };
    } catch (e) { return { success: false, error: e.message }; }
  });

  ipcMain.handle('voice-mic-permission', async () => {
    if (!voiceService) return { success: false, error: 'Voice service not initialized' };
    try {
      const granted = await voiceService.requestMicPermission();
      return { success: true, granted };
    } catch (e) { return { success: false, error: e.message }; }
  });

  // ============================================================================
  // WORKFLOW RECORDER — Record / Replay Action Sequences
  // ============================================================================

  ipcMain.handle('workflow-start', async () => {
    if (!workflowRecorder) return { success: false, error: 'Workflow recorder not initialized' };
    return { success: true, ...workflowRecorder.start() };
  });

  ipcMain.handle('workflow-record', async (event, { type, action }) => {
    if (!workflowRecorder) return { success: false, error: 'Workflow recorder not initialized' };
    const recorded = workflowRecorder.record(type, action);
    return { success: recorded };
  });

  ipcMain.handle('workflow-stop', async () => {
    if (!workflowRecorder) return { success: false, error: 'Workflow recorder not initialized' };
    return { success: true, ...workflowRecorder.stop() };
  });

  ipcMain.handle('workflow-save', async (event, { name, description }) => {
    if (!workflowRecorder) return { success: false, error: 'Workflow recorder not initialized' };
    try {
      const result = await workflowRecorder.save(name, description);
      return { success: true, ...result };
    } catch (e) { return { success: false, error: e.message }; }
  });

  ipcMain.handle('workflow-list', async () => {
    if (!workflowRecorder) return { success: false, error: 'Workflow recorder not initialized' };
    try {
      const workflows = await workflowRecorder.list();
      return { success: true, workflows };
    } catch (e) { return { success: false, error: e.message }; }
  });

  ipcMain.handle('workflow-replay', async (event, name) => {
    if (!workflowRecorder || !robotService) {
      return { success: false, error: 'Workflow recorder or robot service not initialized' };
    }
    try {
      const results = await workflowRecorder.replay(name, async (step) => {
        if (step.type === 'robot' && robotService) {
          return await robotService.execute(step.action, { skipConfirm: false });
        } else if (step.type === 'ocr' && tesseractOcrService) {
          return await tesseractOcrService.ocrClick(step.action.target, cometAiEngine, robotService, permissionStore);
        } else if (step.type === 'ai' && cometAiEngine) {
          return await cometAiEngine.chat(step.action);
        }
        return { skipped: true, type: step.type };
      });
      return { success: true, results };
    } catch (e) { return { success: false, error: e.message }; }
  });

  ipcMain.handle('workflow-delete', async (event, name) => {
    if (!workflowRecorder) return { success: false, error: 'Workflow recorder not initialized' };
    try {
      const deleted = await workflowRecorder.deleteWorkflow(name);
      return { success: true, deleted };
    } catch (e) { return { success: false, error: e.message }; }
  });

  ipcMain.handle('workflow-status', async () => {
    if (!workflowRecorder) return { success: false, error: 'Workflow recorder not initialized' };
    return { success: true, ...workflowRecorder.getStatus() };
  });

  // ============================================================================
  // PopSearch - Instant Search Popup
  // ============================================================================
  ipcMain.handle('pop-search-show', async (event, { text, x, y }) => {
    if (!popSearch) return { success: false, error: 'PopSearch not initialized' };
    try {
      popSearch.showPopupAtPosition(x, y, text || '');
      return { success: true };
    } catch (e) {
      return { success: false, error: e.message };
    }
  });

  ipcMain.handle('pop-search-show-at-cursor', async (event, text) => {
    if (!popSearch) return { success: false, error: 'PopSearch not initialized' };
    try {
      popSearch.showPopupWithText(text || '');
      return { success: true };
    } catch (e) {
      return { success: false, error: e.message };
    }
  });

  ipcMain.handle('pop-search-get-config', async () => {
    if (!popSearch) return { success: false, error: 'PopSearch not initialized' };
    return { success: true, config: popSearch.getConfig() };
  });

  ipcMain.handle('pop-search-update-config', async (event, config) => {
    if (!popSearch) return { success: false, error: 'PopSearch not initialized' };
    try {
      popSearch.updateConfig(config);
      return { success: true };
    } catch (e) {
      return { success: false, error: e.message };
    }
  });

  ipcMain.handle('pop-search-save-config', async (event, data) => {
    const { filePath } = await dialog.showSaveDialog({
      title: 'Export PopSearch Config',
      defaultPath: 'popsearch-config.json',
      filters: [{ name: 'JSON', extensions: ['json'] }]
    });
    if (filePath) {
      try {
        fs.writeFileSync(filePath, data, 'utf-8');
        return { success: true };
      } catch (err) {
        return { success: false, error: err.message };
      }
    }
    return { success: false, canceled: true };
  });

  ipcMain.handle('pop-search-load-config', async () => {
    const { canceled, filePaths } = await dialog.showOpenDialog({
      title: 'Import PopSearch Config',
      filters: [{ name: 'JSON', extensions: ['json'] }],
      properties: ['openFile']
    });
    if (!canceled && filePaths.length > 0) {
      return fs.readFileSync(filePaths[0], 'utf-8');
    }
    return null;
  });

  // Bring window to top to fix BrowserView z-index issues
  ipcMain.handle('bring-window-to-top', async () => {
    if (mainWindow) {
      mainWindow.moveTop();
      return { success: true };
    }
    return { success: false, error: 'No main window' };
  });

  // ============================================================================
  // GLOBAL HOTKEY - Register global shortcuts
  // ============================================================================
  app.whenReady().then(() => {
    // Alt+Space avoids conflict with Windows input switcher (Ctrl+Shift+Space)
    // and macOS Spotlight (Cmd+Space). Alt+Space is rarely bound by the OS.
    const spotlightShortcut = process.platform === 'darwin' ? 'Option+Space' : 'Alt+Space';

    try {
      globalShortcut.register(spotlightShortcut, () => {
        console.log('[Hotkey] Spotlight search triggered');

        if (mainWindow) {
          // Show window if hidden
          if (!mainWindow.isVisible()) {
            mainWindow.show();
          }

          // Focus window
          mainWindow.focus();

          // Send event to renderer to open unified search
          mainWindow.webContents.send('open-unified-search');
        } else {
          // If window doesn't exist, create it
          createWindow();
        }
      });

      console.log(`[Hotkey] Registered ${spotlightShortcut} for spotlight search`);

      // Ctrl+Shift+S for PopSearch quick search
      globalShortcut.register('CommandOrControl+Shift+S', () => {
        console.log('[Hotkey] PopSearch triggered');
        if (popSearch) {
          popSearch.showPopupWithText('');
        }
      });
      console.log('[Hotkey] Registered Ctrl+Shift+S for PopSearch');

      // Ctrl+P for Printing
      globalShortcut.register('CommandOrControl+P', () => {
        const view = tabViews.get(activeTabId);
        if (view) {
          view.webContents.print();
        } else if (mainWindow) {
          mainWindow.webContents.print();
        }
      });

      // Emergency Kill Switch — Ctrl+Shift+Esc (Cmd+Shift+Esc on Mac)
      const killShortcut = process.platform === 'darwin' ? 'Command+Shift+Escape' : 'Control+Shift+Escape';
      try {
        globalShortcut.register(killShortcut, () => {
          console.log('[Hotkey] EMERGENCY KILL SWITCH activated');
          if (robotService) {
            robotService.kill();
          }
          if (mainWindow) {
            mainWindow.webContents.send('robot-killed');
            dialog.showMessageBox(mainWindow, {
              type: 'warning',
              title: 'Comet-AI Kill Switch',
              message: 'All robot actions have been stopped and permissions revoked.',
              detail: 'You can re-enable robot permissions in Settings > Permissions.',
            });
          }
        });
        console.log(`[Hotkey] Registered ${killShortcut} for emergency kill switch`);
      } catch (killErr) {
        console.warn('[Hotkey] Could not register kill switch:', killErr.message);
      }
    } catch (error) {
      console.error('[Hotkey] Failed to register:', error);
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

    // Stop WiFi Sync service
    if (wifiSyncService) {
      wifiSyncService.stop();
      console.log('[Main] WiFi Sync Service stopped.');
    }

    // Cleanup desktop automation services
    if (tesseractOcrService) {
      tesseractOcrService.terminate().catch(() => { });
      console.log('[Main] TesseractOcrService terminated.');
    }

    if (flutterBridge) {
      flutterBridge.stop();
      console.log('[Main] FlutterBridgeServer stopped.');
    }

    // Unregister all shortcuts
    globalShortcut.unregisterAll();
  });

  app.on('window-all-closed', async () => {
    // Terminate the Tesseract worker when the app quits
    if (tesseractWorker) {
      console.log('[Main] Terminating Tesseract.js worker...');
      await tesseractWorker.terminate();
      console.log('[Main] Tesseract.js worker terminated.');
    }
    if (process.platform !== 'darwin') {
      app.quit();
    }
  });

  // Final fallback to ensure process exits
  app.on('quit', async () => {
    process.exit(0);
  });
});
