import { BrowserWindow, screen } from 'electron';
import path from 'path';

let mainWindow = null;
let popupWindow = null;

export function getMainWindow() {
    return mainWindow;
}

export function getPopupWindow() {
    return popupWindow;
}

export function createMainWindow() {
    if (mainWindow && !mainWindow.isDestroyed()) {
        return mainWindow;
    }

    mainWindow = new BrowserWindow({
        width: 800,
        height: 600,
        frame: false,
        transparent: true,
        backgroundColor: '#00000000',
        show: false,
        alwaysOnTop: true,
        skipTaskbar: true,
        webPreferences: {
            preload: path.join(__dirname, '../preload/index.js'),
            contextIsolation: true,
            nodeIntegration: false
        }
    });

    // Force always on top at a standard level
    mainWindow.setAlwaysOnTop(true);
    mainWindow.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true });


    if (process.env.ELECTRON_RENDERER_URL) {
        mainWindow.loadURL(`${process.env.ELECTRON_RENDERER_URL}/settings/index.html`);
    } else {
        mainWindow.loadFile(path.join(__dirname, '../renderer/settings/index.html')).catch(err => {
            console.error(`[Main] Failed to load Settings: ${err}`);
        });
    }

    mainWindow.webContents.on('render-process-gone', (event, details) => {
        console.error(`[Main] Settings renderer process gone: ${details.reason} (${details.exitCode})`);
    });

    return mainWindow;
}

export function createPopup(selectedText, x, y) {
    if (popupWindow && !popupWindow.isDestroyed()) {
        popupWindow.close();
    }

    const display = screen.getDisplayNearestPoint({ x, y });
    const bounds = display.workArea;

    const popupWidth = 400;
    const popupHeight = 60;

    let popupX = Math.max(bounds.x, Math.min(x, bounds.x + bounds.width - popupWidth));
    let popupY = Math.max(bounds.y, Math.min(y + 5, bounds.y + bounds.height - popupHeight));

    popupWindow = new BrowserWindow({
        width: popupWidth,
        height: popupHeight,
        x: popupX,
        y: popupY,
        frame: false,
        transparent: true,
        backgroundColor: '#00000000',
        hasShadow: false, // Using CSS shadow instead
        alwaysOnTop: true,
        resizable: false,
        skipTaskbar: true,
        focusable: true,
        webPreferences: {
            preload: path.join(__dirname, '../preload/index.js'),
            contextIsolation: true,
            nodeIntegration: false
        }
    });

    if (process.env.ELECTRON_RENDERER_URL) {
        popupWindow.loadURL(`${process.env.ELECTRON_RENDERER_URL}/popup/index.html`);
    } else {
        popupWindow.loadFile(path.join(__dirname, '../renderer/popup/index.html')).catch(err => {
            console.error(`[Main] Failed to load Popup: ${err}`);
        });
    }

    popupWindow.webContents.on('did-finish-load', () => {
        popupWindow.webContents.send('selected-text', selectedText);
        popupWindow.focus();
    });

    popupWindow.webContents.on('render-process-gone', (event, details) => {
        console.error(`[Main] Popup renderer process gone: ${details.reason} (${details.exitCode})`);
    });

    popupWindow.on('blur', () => {
        if (popupWindow && !popupWindow.isDestroyed()) {
            popupWindow.close();
        }
    });

    return popupWindow;
}
