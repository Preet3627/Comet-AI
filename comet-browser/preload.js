const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  // BrowserView related APIs
  getIsOnline: () => ipcRenderer.invoke('get-is-online'),
  onAiQueryDetected: (callback) => {
    const subscription = (event, query) => callback(query);
    ipcRenderer.on('ai-query-detected', subscription);
    return () => ipcRenderer.removeListener('ai-query-detected', subscription);
  },
  navigateTo: (url) => ipcRenderer.send('navigate-browser-view', url),
  goBack: () => ipcRenderer.send('browser-view-go-back'),
  goForward: () => ipcRenderer.send('browser-view-go-forward'),
  reload: () => ipcRenderer.send('browser-view-reload'),
  getCurrentUrl: () => ipcRenderer.invoke('get-browser-view-url'),
  extractPageContent: () => ipcRenderer.invoke('extract-page-content'),
  setBrowserViewBounds: (bounds) => ipcRenderer.send('set-browser-view-bounds', bounds),
  setUserAgent: (userAgent) => ipcRenderer.invoke('set-user-agent', userAgent),
  setProxy: (config) => ipcRenderer.invoke('set-proxy', config),
  capturePage: () => ipcRenderer.invoke('capture-page'),
  sendInputEvent: (input) => ipcRenderer.invoke('send-input-event', input),
  openDevTools: () => ipcRenderer.send('open-dev-tools'),

  // LLM & Memory APIs
  getAvailableLLMProviders: () => ipcRenderer.invoke('llm-get-available-providers'),
  setActiveLLMProvider: (providerId) => ipcRenderer.invoke('llm-set-active-provider', providerId),
  configureLLMProvider: (providerId, options) => ipcRenderer.invoke('llm-configure-provider', providerId, options),
  generateChatContent: (messages, options) => ipcRenderer.invoke('llm-generate-chat-content', messages, options),
  getAiMemory: () => ipcRenderer.invoke('get-ai-memory'),
  addAiMemory: (entry) => ipcRenderer.send('add-ai-memory', entry),

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
  getExtensions: () => ipcRenderer.invoke('get-extensions'),
  toggleExtension: (id) => ipcRenderer.invoke('toggle-extension', id),
  uninstallExtension: (id) => ipcRenderer.invoke('uninstall-extension', id),

  // Window Controls
  minimizeWindow: () => ipcRenderer.send('window-minimize'),
  maximizeWindow: () => ipcRenderer.send('window-maximize'),
  closeWindow: () => ipcRenderer.send('window-close'),

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
});
