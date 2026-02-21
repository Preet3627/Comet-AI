// Critical: Ensure we are not running in "Node mode" which blocks Electron APIs
if (process.env.ELECTRON_RUN_AS_NODE) {
    delete process.env.ELECTRON_RUN_AS_NODE;
}

import { app, screen, nativeTheme } from 'electron';
import fs from 'fs';
import path from 'path';
import { createMainWindow, createPopup } from './windowManager.js';
import { registerIpcHandlers } from './ipcHandlers.js';
import { createTray } from './trayManager.js';
import { startServer } from './triggerServer.js';
import { startAhk, stopAhk } from './ahkManager.js';

import { logToFile, log } from './logger.js';

// Global Error Handlers
process.on('uncaughtException', (error) => {
    logToFile(`UNCAUGT EXCEPTION: ${error.stack || error}`);
});

process.on('unhandledRejection', (reason) => {
    logToFile(`UNHANDLED REJECTION: ${reason}`);
});

logToFile(`App starting. Is Packaged: ${app.isPackaged}`);
logToFile(`Log File Path: ${log.transports.file.getFile().path}`);
logToFile(`Exec Path: ${process.execPath}`);
logToFile(`Resources Path: ${process.resourcesPath}`);

// Performance: Disable GPU to save RAM
app.disableHardwareAcceleration();
app.setAppUserModelId('com.popsearch.beta');
nativeTheme.themeSource = 'dark';
app.commandLine.appendSwitch('js-flags', '--max-old-space-size=512');

const gotTheLock = app.requestSingleInstanceLock();

if (!gotTheLock) {
    app.quit();
} else {
    app.on('second-instance', (event, commandLine) => {
        const searchArg = commandLine.find(arg => arg.startsWith('--search='));
        const settingsArg = commandLine.includes('--settings');
        const mainWindow = createMainWindow();

        if (settingsArg || !searchArg) {
            if (mainWindow.isMinimized()) mainWindow.restore();
            mainWindow.show();
            mainWindow.focus();
        }

        if (searchArg) {
            const query = searchArg.split('=')[1];
            const cursorPosition = screen.getCursorScreenPoint();
            createPopup(query, cursorPosition.x, cursorPosition.y + 20);
        }
    });

    app.whenReady().then(() => {
        const mainWindow = createMainWindow();
        registerIpcHandlers();
        startServer();

        try {
            createTray();
        } catch (err) {
            logToFile(`createTray failed: ${err.message}`);
        }

        try {
            startAhk();
        } catch (err) {
            logToFile(`startAhk failed: ${err.message}`);
        }

        const isSearch = process.argv.some(arg => arg.startsWith('--search='));
        if (!isSearch) {
            mainWindow.show();
        }
    });

    app.on('will-quit', () => {
        stopAhk(); // Stop the AHK trigger script before quitting
    });

    app.on('window-all-closed', () => {
        if (process.platform !== 'darwin') {
            app.quit();
        }
    });
}
