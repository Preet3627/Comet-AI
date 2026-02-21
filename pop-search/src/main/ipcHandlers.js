import { ipcMain, BrowserWindow, dialog, clipboard, Menu, app, nativeTheme, screen, shell } from 'electron';
import fs from 'fs';
import path from 'path';
import { exec } from 'child_process';
import { IPC_CHANNELS } from '../shared/constants';
import { getMainWindow, getPopupWindow, createPopup } from './windowManager.js';
import { updateTrayMenu } from './trayManager.js';
import { log, logToFile } from './logger.js';

export function registerIpcHandlers() {
    ipcMain.on(IPC_CHANNELS.SHOW_POPUP, (event, data) => {
        const { text, x, y } = data;
        createPopup(text, x, y);
    });

    ipcMain.on(IPC_CHANNELS.RESIZE_POPUP, (event, { width, height }) => {
        const popupWindow = getPopupWindow();
        if (popupWindow && !popupWindow.isDestroyed()) {
            const w = Math.ceil(width);
            const h = Math.ceil(height);
            popupWindow.setSize(w, h);

            // Adjust position if it goes off-screen after resize
            const [x, y] = popupWindow.getPosition();
            const display = screen.getDisplayNearestPoint({ x, y });
            const bounds = display.workArea;

            let newX = Math.max(bounds.x, Math.min(x, bounds.x + bounds.width - w));
            let newY = Math.max(bounds.y, Math.min(y, bounds.y + bounds.height - h));

            if (newX !== x || newY !== y) {
                popupWindow.setPosition(newX, newY);
            }
        }
    });


    ipcMain.on(IPC_CHANNELS.SEARCH, (event, { provider, query, type }) => {
        handleAction(provider, query, type || 'url', false);
    });

    ipcMain.on(IPC_CHANNELS.COPY_AND_SEARCH, (event, { provider, query, type }) => {
        handleAction(provider, query, type || 'url', true);
    });

    ipcMain.on(IPC_CHANNELS.LOG, (event, message) => {
        console.log(`[Renderer Log] ${message}`);
    });

    ipcMain.on(IPC_CHANNELS.RELOAD, () => {
        const mainWindow = getMainWindow();
        const popupWindow = getPopupWindow();
        if (mainWindow && !mainWindow.isDestroyed()) mainWindow.reload();
        if (popupWindow && !popupWindow.isDestroyed()) popupWindow.reload();
    });

    ipcMain.on(IPC_CHANNELS.MINIMIZE, () => {
        const mainWindow = getMainWindow();
        if (mainWindow && !mainWindow.isDestroyed()) mainWindow.minimize();
    });

    ipcMain.on(IPC_CHANNELS.CLOSE, () => {
        const mainWindow = getMainWindow();
        if (mainWindow && !mainWindow.isDestroyed()) mainWindow.hide();
    });


    ipcMain.on(IPC_CHANNELS.CONTEXT_MENU, (event) => {
        console.log(`[Main Menu] Creating context menu. Current nativeTheme.themeSource: ${nativeTheme.themeSource}`);
        // Aggressively ensure themeSource is set for native menus
        if (!nativeTheme.themeSource || nativeTheme.themeSource === 'system') {
            console.log('[Main Menu] themeSource was system/null, keeping it for now.');
        }

        const template = [
            {
                label: 'Reload',
                click: () => {
                    console.log('[Main Menu] Reloading windows...');
                    const mainWindow = getMainWindow();
                    const popupWindow = getPopupWindow();
                    if (mainWindow && !mainWindow.isDestroyed()) mainWindow.reload();
                    if (popupWindow && !popupWindow.isDestroyed()) {
                        popupWindow.reload();
                    }
                }
            },
            {
                label: 'Settings',
                click: () => {
                    const mainWindow = getMainWindow();
                    if (mainWindow && !mainWindow.isDestroyed()) {
                        mainWindow.show();
                        mainWindow.focus();
                    }
                }
            },
            { type: 'separator' },
            { label: 'Quit', click: () => app.quit() }
        ];
        const menu = Menu.buildFromTemplate(template);
        menu.popup(BrowserWindow.fromWebContents(event.sender));
    });

    ipcMain.handle(IPC_CHANNELS.SAVE_CONFIG, async (event, data) => {
        const window = BrowserWindow.fromWebContents(event.sender);
        const { filePath } = await dialog.showSaveDialog(window, {
            title: 'Export Configuration',
            defaultPath: 'pop_search_config.json',
            filters: [{ name: 'JSON', extensions: ['json'] }]
        });

        if (filePath) {
            try {
                fs.writeFileSync(filePath, data, 'utf-8');
                if (window && !window.isDestroyed()) window.focus(); // Ensure focus returns
                return { success: true };
            } catch (err) {
                console.error('Save error:', err);
                if (window && !window.isDestroyed()) window.focus(); // Ensure focus returns
                return { success: false, error: err.message };
            }
        }
        if (window && !window.isDestroyed()) window.focus(); // Ensure focus returns
        return { success: false, canceled: true };
    });

    ipcMain.handle(IPC_CHANNELS.LOAD_CONFIG, async (event) => {
        const window = BrowserWindow.fromWebContents(event.sender);
        const { canceled, filePaths } = await dialog.showOpenDialog(window, {
            title: 'Import Configuration',
            filters: [{ name: 'JSON', extensions: ['json'] }],
            properties: ['openFile']
        });

        if (!canceled && filePaths.length > 0) {
            if (window && !window.isDestroyed()) window.focus(); // Ensure focus returns
            return fs.readFileSync(filePaths[0], 'utf-8');
        }
        if (window && !window.isDestroyed()) window.focus(); // Ensure focus returns
        return null;
    });

    ipcMain.on(IPC_CHANNELS.OPEN_EXTERNAL, (event, url) => {
        openInBrowser(url);
    });

    ipcMain.on(IPC_CHANNELS.OPEN_LOG_FILE, () => {
        try {
            console.log('[Main] Received open-log-file request');
            const logPath = log.transports.file.getFile().path;
            console.log(`[Main] Attempting to open log at: ${logPath}`);
            if (fs.existsSync(logPath)) {
                shell.showItemInFolder(logPath);
            } else {
                console.warn('[Main] Log file does not exist yet at:', logPath);
                // Fallback: just open the logs folder
                shell.openPath(path.dirname(logPath));
            }
        } catch (err) {
            console.error('[Main] Failed to open log file:', err);
        }
    });

    // Read a local image file and return it as a base64 data URL.
    // This bypasses Chromium's cross-origin restriction that blocks file:// img src
    // when the renderer is served from http://localhost (Vite dev mode).
    ipcMain.handle(IPC_CHANNELS.READ_LOCAL_ICON, async (event, filePath) => {
        try {
            const ext = path.extname(filePath).toLowerCase();
            const mimeMap = {
                '.ico': 'image/x-icon',
                '.png': 'image/png',
                '.jpg': 'image/jpeg',
                '.jpeg': 'image/jpeg',
                '.gif': 'image/gif',
                '.svg': 'image/svg+xml',
                '.webp': 'image/webp',
                '.bmp': 'image/bmp'
            };
            const mime = mimeMap[ext] || 'image/png';
            const data = fs.readFileSync(filePath);
            return `data:${mime};base64,${data.toString('base64')}`;
        } catch (err) {
            logToFile(`[Main] read-local-icon failed for "${filePath}": ${err.message}`);
            return null;
        }
    });
}

function openInBrowser(url) {
    shell.openExternal(url).catch(err => {
        console.error(`[Main] Failed to open external URL: ${err}`);
    });
}

function handleAction(target, query, type, shouldCopy) {
    if (shouldCopy) {
        clipboard.writeText(query);
    }

    logToFile(`[IPC] ${type.toUpperCase()} action triggered. Target: ${target}`);

    if (type === 'url') {
        const searchUrl = target.replace(/%s|{query}/g, encodeURIComponent(query));
        openInBrowser(searchUrl);
    } else if (type === 'file') {
        shell.openPath(target).catch(err => {
            logToFile(`[Main] openPath failed: ${err}`);
        });
    } else if (type === 'cmd') {
        let command = target;

        // Smart Detection for script extensions
        const lowerTarget = target.toLowerCase();
        if (lowerTarget.endsWith('.py')) {
            command = `python "${target}"`;
        } else if (lowerTarget.endsWith('.ahk')) {
            // Standard AHK v2 path
            command = `"C:\\Program Files\\AutoHotkey\\v2\\AutoHotkey.exe" "${target}"`;
        }

        // Variable Injection (only if explicitly requested via {query})
        if (command.includes('{query}')) {
            command = command.replace(/{query}/g, query);
        }

        exec(command, (error) => {
            if (error) {
                logToFile(`[Main] exec error: ${error.message}`);
                console.error(`[Main] exec error: ${error}`);
            }
        });
    }

    closePopup();
}

function closePopup() {
    const popupWindow = getPopupWindow();
    if (popupWindow && !popupWindow.isDestroyed()) {
        popupWindow.close();
    }
}
