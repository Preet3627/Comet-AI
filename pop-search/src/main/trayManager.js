import { Tray, Menu, nativeImage, app } from 'electron';
import path from 'path';
import { getMainWindow, getPopupWindow } from './windowManager.js';
import { logToFile } from './logger.js';

let tray = null;

export function updateTrayMenu() {
    if (!tray) return;

    const contextMenu = Menu.buildFromTemplate([
        {
            label: 'Settings',
            click: () => {
                const mainWindow = getMainWindow();
                if (mainWindow) {
                    mainWindow.show();
                    mainWindow.focus();
                }
            }
        },
        {
            label: 'Reload',
            click: () => {
                const mainWindow = getMainWindow();
                const popupWindow = getPopupWindow();
                if (mainWindow && !mainWindow.isDestroyed()) mainWindow.reload();
                if (popupWindow && !popupWindow.isDestroyed()) popupWindow.reload();
            }
        },
        { type: 'separator' },
        {
            label: 'Quit',
            click: () => app.quit()
        }
    ]);

    tray.setContextMenu(contextMenu);
}

export function createTray() {
    let iconPath;
    if (app.isPackaged) {
        iconPath = path.join(process.resourcesPath, 'assets', 'icon.png');
    } else {
        iconPath = path.join(__dirname, '../../assets/icon.png');
    }

    logToFile(`[Tray Manager] Loading icon from: ${iconPath}`);
    const icon = nativeImage.createFromPath(iconPath);

    if (icon.isEmpty()) {
        logToFile(`[Tray Manager] CRITICAL: Icon is empty or invalid at ${iconPath}`);
    }

    tray = new Tray(icon.resize({ width: 16, height: 16 }));

    updateTrayMenu();

    tray.setToolTip('Pop Search');

    tray.on('double-click', () => {
        const mainWindow = getMainWindow();
        if (mainWindow) {
            mainWindow.show();
            mainWindow.focus();
        }
    });

    return tray;
}
