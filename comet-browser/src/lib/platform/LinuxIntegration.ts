/**
 * Linux-Specific Integration
 * Handles Linux native features for KDE, GNOME, and other desktop environments
 */

import { app, shell } from 'electron';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

export class LinuxIntegration {
    private mainWindow: any;
    private desktopEnvironment: string;

    constructor(mainWindow: any) {
        this.mainWindow = mainWindow;
        this.desktopEnvironment = this.detectDesktopEnvironment();
        this.setupLinuxFeatures();
    }

    /**
     * Detect which desktop environment is running
     */
    private detectDesktopEnvironment(): string {
        const env = process.env;

        if (env.KDE_FULL_SESSION) return 'KDE';
        if (env.GNOME_DESKTOP_SESSION_ID || env.GDMSESSION?.includes('gnome')) return 'GNOME';
        if (env.DESKTOP_SESSION?.includes('xfce')) return 'XFCE';
        if (env.DESKTOP_SESSION?.includes('mate')) return 'MATE';
        if (env.DESKTOP_SESSION?.includes('cinnamon')) return 'Cinnamon';

        return 'Unknown';
    }

    private setupLinuxFeatures() {
        if (process.platform !== 'linux') return;

        this.setupDesktopFile();
        this.setupSystemTray();
        this.setupNotifications();
        this.setupMimeTypes();
    }

    /**
     * Create .desktop file for application launcher
     */
    private setupDesktopFile() {
        const desktopFilePath = path.join(
            os.homedir(),
            '.local/share/applications/comet-browser.desktop'
        );

        const desktopFileContent = `[Desktop Entry]
Version=1.0
Type=Application
Name=Comet Browser
Comment=AI-Powered Chromium Browser
Exec=${process.execPath} %U
Icon=${path.join(app.getAppPath(), 'icon.png')}
Terminal=false
Categories=Network;WebBrowser;
MimeType=text/html;text/xml;application/xhtml+xml;x-scheme-handler/http;x-scheme-handler/https;
Actions=NewTab;NewIncognito;History;

[Desktop Action NewTab]
Name=New Tab
Exec=${process.execPath} --new-tab

[Desktop Action NewIncognito]
Name=New Incognito Tab
Exec=${process.execPath} --incognito

[Desktop Action History]
Name=History
Exec=${process.execPath} --history
`;

        try {
            const dir = path.dirname(desktopFilePath);
            if (!fs.existsSync(dir)) {
                fs.mkdirSync(dir, { recursive: true });
            }
            fs.writeFileSync(desktopFilePath, desktopFileContent);
            fs.chmodSync(desktopFilePath, 0o755);
            console.log('Desktop file created successfully');
        } catch (error) {
            console.error('Failed to create desktop file:', error);
        }
    }

    /**
     * Setup system tray icon
     */
    private setupSystemTray() {
        const { Tray, Menu, nativeImage } = require('electron');

        try {
            const iconPath = path.join(app.getAppPath(), 'icon.png');
            const trayIcon = nativeImage.createFromPath(iconPath);
            const tray = new Tray(trayIcon);

            const contextMenu = Menu.buildFromTemplate([
                {
                    label: 'Show Comet',
                    click: () => {
                        this.mainWindow?.show();
                        this.mainWindow?.focus();
                    }
                },
                {
                    label: 'New Tab',
                    click: () => {
                        this.mainWindow?.webContents.send('add-new-tab', 'https://www.google.com');
                        this.mainWindow?.show();
                    }
                },
                {
                    label: 'New Incognito Tab',
                    click: () => {
                        this.mainWindow?.webContents.send('add-incognito-tab');
                        this.mainWindow?.show();
                    }
                },
                { type: 'separator' },
                {
                    label: 'History',
                    click: () => {
                        this.mainWindow?.webContents.send('open-history');
                        this.mainWindow?.show();
                    }
                },
                {
                    label: 'Settings',
                    click: () => {
                        this.mainWindow?.webContents.send('open-settings');
                        this.mainWindow?.show();
                    }
                },
                { type: 'separator' },
                {
                    label: 'Quit',
                    click: () => {
                        app.quit();
                    }
                }
            ]);

            tray.setContextMenu(contextMenu);
            tray.setToolTip('Comet Browser');

            tray.on('click', () => {
                this.mainWindow?.isVisible() ? this.mainWindow?.hide() : this.mainWindow?.show();
            });
        } catch (error) {
            console.error('Failed to create system tray:', error);
        }
    }

    /**
     * Setup Linux notifications
     */
    private setupNotifications() {
        // Linux notifications work through libnotify
        // Electron handles this automatically
    }

    /**
     * Show notification
     */
    showNotification(title: string, body: string, options?: {
        icon?: string;
        urgency?: 'low' | 'normal' | 'critical';
    }) {
        const { Notification } = require('electron');

        const notification = new Notification({
            title,
            body,
            icon: options?.icon,
            urgency: options?.urgency || 'normal'
        });

        notification.show();
    }

    /**
     * Register MIME types for default browser
     */
    private setupMimeTypes() {
        const mimeAppsPath = path.join(
            os.homedir(),
            '.local/share/applications/mimeapps.list'
        );

        try {
            let content = '';
            if (fs.existsSync(mimeAppsPath)) {
                content = fs.readFileSync(mimeAppsPath, 'utf-8');
            } else {
                content = '[Default Applications]\n';
            }

            const mimeTypes = [
                'text/html',
                'text/xml',
                'application/xhtml+xml',
                'x-scheme-handler/http',
                'x-scheme-handler/https'
            ];

            mimeTypes.forEach(mimeType => {
                const regex = new RegExp(`^${mimeType}=.*$`, 'm');
                const replacement = `${mimeType}=comet-browser.desktop`;

                if (regex.test(content)) {
                    content = content.replace(regex, replacement);
                } else {
                    content += `${replacement}\n`;
                }
            });

            const dir = path.dirname(mimeAppsPath);
            if (!fs.existsSync(dir)) {
                fs.mkdirSync(dir, { recursive: true });
            }
            fs.writeFileSync(mimeAppsPath, content);
            console.log('MIME types registered successfully');
        } catch (error) {
            console.error('Failed to register MIME types:', error);
        }
    }

    /**
     * Check if running on Wayland
     */
    isWayland(): boolean {
        return process.env.XDG_SESSION_TYPE === 'wayland';
    }

    /**
     * Check if running on X11
     */
    isX11(): boolean {
        return process.env.XDG_SESSION_TYPE === 'x11';
    }

    /**
     * Get desktop environment
     */
    getDesktopEnvironment(): string {
        return this.desktopEnvironment;
    }

    /**
     * KDE-specific integration
     */
    setupKDEIntegration() {
        if (this.desktopEnvironment !== 'KDE') return;

        // KDE-specific features
        console.log('KDE integration ready');
    }

    /**
     * GNOME-specific integration
     */
    setupGNOMEIntegration() {
        if (this.desktopEnvironment !== 'GNOME') return;

        // GNOME-specific features
        console.log('GNOME integration ready');
    }

    /**
     * Set as default browser
     */
    async setAsDefaultBrowser(): Promise<boolean> {
        try {
            // Update default applications
            const { exec } = require('child_process');
            const util = require('util');
            const execPromise = util.promisify(exec);

            await execPromise('xdg-settings set default-web-browser comet-browser.desktop');
            return true;
        } catch (error) {
            console.error('Failed to set as default browser:', error);
            return false;
        }
    }

    /**
     * Check if Comet is the default browser
     */
    async isDefaultBrowser(): Promise<boolean> {
        try {
            const { exec } = require('child_process');
            const util = require('util');
            const execPromise = util.promisify(exec);

            const { stdout } = await execPromise('xdg-settings get default-web-browser');
            return stdout.trim() === 'comet-browser.desktop';
        } catch (error) {
            return false;
        }
    }

    /**
     * Open file manager at path
     */
    openFileManager(filePath: string) {
        shell.showItemInFolder(filePath);
    }
}

export default LinuxIntegration;
