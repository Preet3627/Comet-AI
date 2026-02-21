import { contextBridge, ipcRenderer } from 'electron';
import { IPC_CHANNELS } from '../shared/constants';

contextBridge.exposeInMainWorld('electronAPI', {
  showPopup: (text, x, y) => ipcRenderer.send(IPC_CHANNELS.SHOW_POPUP, { text, x, y }),
  search: (provider, query, type) => ipcRenderer.send(IPC_CHANNELS.SEARCH, { provider, query, type }),
  copyAndSearch: (provider, query, type) => ipcRenderer.send(IPC_CHANNELS.COPY_AND_SEARCH, { provider, query, type }),
  onSelectedText: (callback) => ipcRenderer.on('selected-text', (event, text) => callback(text)),
  resizePopup: (width, height) => ipcRenderer.send(IPC_CHANNELS.RESIZE_POPUP, { width, height }),
  logToTerminal: (message) => ipcRenderer.send(IPC_CHANNELS.LOG, message),
  reloadApp: () => ipcRenderer.send(IPC_CHANNELS.RELOAD),
  minimizeWindow: () => ipcRenderer.send(IPC_CHANNELS.MINIMIZE),
  closeWindow: () => ipcRenderer.send(IPC_CHANNELS.CLOSE),
  showPopupContextMenu: () => ipcRenderer.send(IPC_CHANNELS.CONTEXT_MENU),
  saveConfig: (data) => ipcRenderer.invoke(IPC_CHANNELS.SAVE_CONFIG, data),
  loadConfig: () => ipcRenderer.invoke(IPC_CHANNELS.LOAD_CONFIG),
  openExternal: (url) => ipcRenderer.send(IPC_CHANNELS.OPEN_EXTERNAL, url),
  openLogFile: () => ipcRenderer.send(IPC_CHANNELS.OPEN_LOG_FILE),
  readLocalIcon: (filePath) => ipcRenderer.invoke(IPC_CHANNELS.READ_LOCAL_ICON, filePath)
});
