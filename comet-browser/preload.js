const { contextBridge, ipcRenderer } = require('electron');
const path = require('path');

contextBridge.exposeInMainWorld('electronAPI', {
  // BrowserView related APIs
  getIsOnline: () => ipcRenderer.invoke('get-is-online'),
  onAddNewTab: (callback) => {
    const subscription = (event, url) => callback(url);
    ipcRenderer.on('add-new-tab', subscription);
    return () => ipcRenderer.removeListener('add-new-tab', subscription);
  },
  onAiQueryDetected: (callback) => {
    const subscription = (event, query) => callback(query);
    ipcRenderer.on('ai-query-detected', subscription);
    return () => ipcRenderer.removeListener('ai-query-detected', subscription);
  },
  createView: (args) => ipcRenderer.send('create-view', args),
  activateView: (args) => ipcRenderer.send('activate-view', args),
  hideAllViews: () => ipcRenderer.send('hide-all-views'),
  destroyView: (tabId) => ipcRenderer.send('destroy-view', tabId),
  onBrowserViewUrlChanged: (callback) => {
    const subscription = (event, { tabId, url }) => callback({ tabId, url });
    ipcRenderer.on('browser-view-url-changed', subscription);
    return () => ipcRenderer.removeListener('browser-view-url-changed', subscription);
  },
  onBrowserViewTitleChanged: (callback) => {
    const subscription = (event, { tabId, title }) => callback({ tabId, title });
    ipcRenderer.on('browser-view-title-changed', subscription);
    return () => ipcRenderer.removeListener('browser-view-title-changed', subscription);
  },
  navigateBrowserView: (args) => ipcRenderer.send('navigate-browser-view', args),
  goBack: () => ipcRenderer.send('browser-view-go-back'),
  goForward: () => ipcRenderer.send('browser-view-go-forward'),
  reload: () => ipcRenderer.send('browser-view-reload'),
  getCurrentUrl: () => ipcRenderer.invoke('get-browser-view-url'),
  getOpenTabs: () => ipcRenderer.invoke('get-open-tabs'),
  extractPageContent: () => ipcRenderer.invoke('extract-page-content'),
  getSelectedText: () => ipcRenderer.invoke('get-selected-text'),
  setBrowserViewBounds: (bounds) => ipcRenderer.send('set-browser-view-bounds', bounds),
  setUserAgent: (userAgent) => ipcRenderer.invoke('set-user-agent', userAgent),
  setProxy: (config) => ipcRenderer.invoke('set-proxy', config),
  capturePage: () => ipcRenderer.invoke('capture-page'),
  captureBrowserViewScreenshot: () => ipcRenderer.invoke('capture-browser-view-screenshot'),
  sendInputEvent: (input) => ipcRenderer.invoke('send-input-event', input),
  openDevTools: () => ipcRenderer.send('open-dev-tools'),
  changeZoom: (deltaY) => ipcRenderer.send('change-zoom', deltaY),
  executeJavaScript: (code) => ipcRenderer.invoke('execute-javascript', code),
  onAudioStatusChanged: (callback) => {
    const subscription = (event, isPlaying) => callback(isPlaying);
    ipcRenderer.on('audio-status-changed', subscription);
    return () => ipcRenderer.removeListener('audio-status-changed', subscription);
  },

  // Download Started Listener
  onDownloadStarted: (callback) => {
    const subscription = (event, filename) => callback(filename);
    ipcRenderer.on('download-started', subscription);
    return () => ipcRenderer.removeListener('download-started', subscription);
  },

  // LLM & Memory APIs
  getAvailableLLMProviders: () => ipcRenderer.invoke('llm-get-available-providers'),
  setActiveLLMProvider: (providerId) => ipcRenderer.invoke('llm-set-active-provider', providerId),
  configureLLMProvider: (providerId, options) => ipcRenderer.invoke('llm-configure-provider', providerId, options),
  generateChatContent: (messages, options) => ipcRenderer.invoke('llm-generate-chat-content', messages, options),
  getAiMemory: () => ipcRenderer.invoke('get-ai-memory'),
  addAiMemory: (entry) => ipcRenderer.send('add-ai-memory', entry),
  saveVectorStore: (data) => ipcRenderer.invoke('save-vector-store', data),
  loadVectorStore: () => ipcRenderer.invoke('load-vector-store'),
  webSearchRag: (query) => ipcRenderer.invoke('web-search-rag', query),
  translateWebsite: (args) => ipcRenderer.invoke('translate-website', args),
  onTriggerTranslationDialog: (callback) => {
    const subscription = () => callback();
    ipcRenderer.on('trigger-translation-dialog', subscription);
    return () => ipcRenderer.removeListener('trigger-translation-dialog', subscription);
  },

  // Auth
  openAuthWindow: (url) => ipcRenderer.send('open-auth-window', url),
  onAuthCallback: (callback) => {
    const subscription = (event, url) => callback(event, url);
    ipcRenderer.on('auth-callback', subscription);
    return () => ipcRenderer.removeListener('auth-callback', subscription);
  },
  onAuthTokenReceived: (callback) => {
    const subscription = (event, token) => callback(token);
    ipcRenderer.on('auth-token-received', subscription);
    return () => ipcRenderer.removeListener('auth-token-received', subscription);
  },
  onLoadAuthToken: (callback) => {
    const subscription = (event, token) => callback(token);
    ipcRenderer.on('load-auth-token', subscription);
    return () => ipcRenderer.removeListener('load-auth-token', subscription);
  },
  saveAuthToken: (args) => ipcRenderer.send('save-auth-token', args),
  getAuthToken: () => ipcRenderer.invoke('get-auth-token'),
  getUserInfo: () => ipcRenderer.invoke('get-user-info'),
  clearAuth: () => ipcRenderer.send('clear-auth'),

  // Dev-MCP & Analytics
  sendMcpCommand: (command, data) => ipcRenderer.invoke('mcp-command', { command, data }),
  shareDeviceFolder: () => ipcRenderer.invoke('share-device-folder'),
  capturePageHtml: () => ipcRenderer.invoke('capture-page-html'),
  saveOfflinePage: (data) => ipcRenderer.invoke('save-offline-page', data),

  // Utils
  setUserId: (userId) => ipcRenderer.send('set-user-id', userId),
  getClipboardText: () => ipcRenderer.invoke('get-clipboard-text'),
  setClipboardText: (text) => ipcRenderer.send('set-clipboard-text', text),

  // Extension & File Utils
  getExtensionPath: () => ipcRenderer.invoke('get-extension-path'),
  getIconPath: () => ipcRenderer.invoke('get-icon-path'),
  getExtensions: () => ipcRenderer.invoke('get-extensions'),
  toggleExtension: (id) => ipcRenderer.invoke('toggle-extension', id),
  uninstallExtension: (id) => ipcRenderer.invoke('uninstall-extension', id),
  openExtensionDir: () => ipcRenderer.send('open-extension-dir'),
  toggleAdblocker: (enable) => ipcRenderer.send('toggle-adblocker', enable),

  // Window Controls
  minimizeWindow: () => ipcRenderer.send('minimize-window'),
  maximizeWindow: () => ipcRenderer.send('maximize-window'),
  closeWindow: () => ipcRenderer.send('close-window'),
  toggleFullscreen: () => ipcRenderer.send('toggle-fullscreen'),
  hideWebview: () => ipcRenderer.send('hide-webview'),
  showWebview: () => ipcRenderer.send('show-webview'),

  // Chat & File Export
  exportChatAsTxt: (messages) => ipcRenderer.invoke('export-chat-txt', messages),
  exportChatAsPdf: (messages) => ipcRenderer.invoke('export-chat-pdf', messages),

  // MCP Support
  mcpCommand: (command, data) => ipcRenderer.invoke('mcp-command', { command, data }),

  // Database & Sync
  initDatabase: (config) => ipcRenderer.invoke('init-database', config),
  syncData: (params) => ipcRenderer.invoke('sync-data', params),

  // P2P File Sync
  scanFolder: (path, types) => ipcRenderer.invoke('scan-folder', { path, types }),
  readFileBuffer: (path) => ipcRenderer.invoke('read-file-buffer', path),

  // Phone Control
  sendPhoneCommand: (command, data) => ipcRenderer.invoke('send-phone-command', { command, data }),

  // Contacts
  getDeviceContacts: () => ipcRenderer.invoke('get-device-contacts'),
  syncContacts: (deviceId, contacts) => ipcRenderer.invoke('sync-contacts', { deviceId, contacts }),

  // OTP
  startSMSListener: () => ipcRenderer.invoke('start-sms-listener'),
  startEmailListener: () => ipcRenderer.invoke('start-email-listener'),
  syncOTP: (otp) => ipcRenderer.invoke('sync-otp', otp),
  requestSMSPermission: () => ipcRenderer.invoke('request-sms-permission'),
  onShortcut: (callback) => {
    const subscription = (event, action) => callback(action);
    ipcRenderer.on('execute-shortcut', subscription);
    return () => ipcRenderer.removeListener('execute-shortcut', subscription);
  },
  updateShortcuts: (shortcuts) => ipcRenderer.send('update-shortcuts', shortcuts),

  // Tab Optimization APIs
  suspendTab: (tabId) => ipcRenderer.send('suspend-tab', tabId),
  resumeTab: (tabId) => ipcRenderer.send('resume-tab', tabId),
  getMemoryUsage: () => ipcRenderer.invoke('get-memory-usage'),

  importOllamaModel: (data) => ipcRenderer.invoke('ollama-import-model', data),
  selectLocalFile: () => ipcRenderer.invoke('select-local-file'),
  triggerDownload: (url, filename) => ipcRenderer.invoke('trigger-download', url, filename),
  setMcpServerPort: (port) => ipcRenderer.send('set-mcp-server-port', port),
  sendToAIChatInput: (text) => ipcRenderer.send('send-to-ai-chat-input', text),
  ollamaListModels: () => ipcRenderer.invoke('ollama-list-models'),
  connectToRemoteDevice: (remoteDeviceId) => ipcRenderer.invoke('connect-to-remote-device', remoteDeviceId),
  sendP2PSignal: (signal, remoteDeviceId) => ipcRenderer.send('send-p2p-signal', { signal, remoteDeviceId }),

  onP2PConnected: (callback) => {
    const subscription = () => callback();
    ipcRenderer.on('p2p-connected', subscription);
    return () => ipcRenderer.removeListener('p2p-connected', subscription);
  },
  onP2PDisconnected: (callback) => {
    const subscription = () => callback();
    ipcRenderer.on('p2p-disconnected', subscription);
    return () => ipcRenderer.removeListener('p2p-disconnected', subscription);
  },
  onP2PFirebaseReady: (callback) => {
    const subscription = (event, userId) => callback(userId);
    ipcRenderer.on('p2p-firebase-ready', subscription);
    return () => ipcRenderer.removeListener('p2p-firebase-ready', subscription);
  },
  onP2POfferCreated: (callback) => {
    const subscription = (event, { offer, remoteDeviceId }) => callback({ offer, remoteDeviceId });
    ipcRenderer.on('p2p-offer-created', subscription);
    return () => ipcRenderer.removeListener('p2p-offer-created', subscription);
  },
  onP2PAnswerCreated: (callback) => {
    const subscription = (event, { answer, remoteDeviceId }) => callback({ answer, remoteDeviceId });
    ipcRenderer.on('p2p-answer-created', subscription);
    return () => ipcRenderer.removeListener('p2p-answer-created', subscription);
  },
  onP2PIceCandidate: (callback) => {
    const subscription = (event, { candidate, remoteDeviceId }) => callback({ candidate, remoteDeviceId });
    ipcRenderer.on('p2p-ice-candidate', subscription);
    return () => ipcRenderer.removeListener('p2p-ice-candidate', subscription);
  },
  on: (channel, callback) => {
    const subscription = (event, ...args) => callback(...args);
    ipcRenderer.on(channel, subscription);
    return () => ipcRenderer.removeListener(channel, subscription);
  },

  // Persistent Storage APIs for user data
  savePersistentData: (key, data) => ipcRenderer.invoke('save-persistent-data', { key, data }),
  loadPersistentData: (key) => ipcRenderer.invoke('load-persistent-data', key),
  deletePersistentData: (key) => ipcRenderer.invoke('delete-persistent-data', key),

  // Network status
  onNetworkStatusChanged: (callback) => {
    const subscription = (event, isOnline) => callback(isOnline);
    ipcRenderer.on('network-status-changed', subscription);
    return () => ipcRenderer.removeListener('network-status-changed', subscription);
  },

  // Clipboard monitoring
  onClipboardChanged: (callback) => {
    const subscription = (event, text) => callback(text);
    ipcRenderer.on('clipboard-changed', subscription);
    return () => ipcRenderer.removeListener('clipboard-changed', subscription);
  },

  // AI chat input
  onAIChatInputText: (callback) => {
    const subscription = (event, text) => callback(text);
    ipcRenderer.on('ai-chat-input-text', subscription);
    return () => ipcRenderer.removeListener('ai-chat-input-text', subscription);
  },
});
