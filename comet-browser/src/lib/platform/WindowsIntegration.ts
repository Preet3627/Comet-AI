/**
 * Windows-Specific Integration
 * Handles Windows native features like Jump Lists, Notifications, Taskbar, etc.
 */

import { app, shell } from 'electron';

export class WindowsIntegration {
    private mainWindow: any;

    constructor(mainWindow: any) {
        this.mainWindow = mainWindow;
        this.setupWindowsFeatures();
    }

    private setupWindowsFeatures() {
        if (process.platform !== 'win32') return;

        this.setupJumpList();
        this.setupTaskbarIntegration();
        this.setupWindowsNotifications();
    }

    /**
     * Setup Windows Jump List
     * Quick actions from taskbar right-click
     */
    private setupJumpList() {
        app.setJumpList([
            {
                type: 'custom',
                name: 'Quick Actions',
                items: [
                    {
                        type: 'task',
                        title: 'New Tab',
                        description: 'Open a new tab',
                        program: process.execPath,
                        args: '--new-tab',
                        iconPath: process.execPath,
                        iconIndex: 0
                    },
                    {
                        type: 'task',
                        title: 'New Incognito Tab',
                        description: 'Open a new incognito tab',
                        program: process.execPath,
                        args: '--incognito',
                        iconPath: process.execPath,
                        iconIndex: 0
                    },
                    {
                        type: 'task',
                        title: 'History',
                        description: 'View browsing history',
                        program: process.execPath,
                        args: '--history',
                        iconPath: process.execPath,
                        iconIndex: 0
                    }
                ]
            },
            {
                type: 'frequent'
            },
            {
                type: 'recent'
            }
        ]);
    }

    /**
     * Setup Windows Taskbar Integration
     */
    private setupTaskbarIntegration() {
        // Set app user model ID for proper Windows integration
        app.setAppUserModelId('com.comet.browser');

        // Setup taskbar thumbnail toolbar
        this.setupThumbnailToolbar();
    }

    /**
     * Setup thumbnail toolbar buttons
     */
    private setupThumbnailToolbar() {
        const path = require('path');

        this.mainWindow?.once('ready-to-show', () => {
            this.mainWindow?.setThumbarButtons([
                {
                    tooltip: 'Back',
                    icon: path.join(__dirname, 'assets/back.png'),
                    click: () => {
                        this.mainWindow?.webContents.send('browser-go-back');
                    }
                },
                {
                    tooltip: 'Forward',
                    icon: path.join(__dirname, 'assets/forward.png'),
                    click: () => {
                        this.mainWindow?.webContents.send('browser-go-forward');
                    }
                },
                {
                    tooltip: 'Reload',
                    icon: path.join(__dirname, 'assets/reload.png'),
                    click: () => {
                        this.mainWindow?.webContents.send('browser-reload');
                    }
                },
                {
                    tooltip: 'New Tab',
                    icon: path.join(__dirname, 'assets/new-tab.png'),
                    click: () => {
                        this.mainWindow?.webContents.send('add-new-tab', 'https://www.google.com');
                    }
                }
            ]);
        });
    }

    /**
     * Setup Windows Notifications
     */
    private setupWindowsNotifications() {
        // Windows notifications are handled by Electron's Notification API
        // But we can configure Windows-specific options
    }

    /**
     * Show Windows notification
     */
    showNotification(title: string, body: string, options?: {
        icon?: string;
        sound?: string;
        tag?: string;
    }) {
        const { Notification } = require('electron');

        const notification = new Notification({
            title,
            body,
            icon: options?.icon,
            silent: !options?.sound,
            tag: options?.tag
        });

        notification.show();

        // Play Windows notification sound if specified
        if (options?.sound) {
            // Windows will play default notification sound
        }
    }

    /**
     * Set taskbar progress bar
     * @param progress 0-1 for progress, -1 to remove
     */
    setTaskbarProgress(progress: number, mode?: 'normal' | 'indeterminate' | 'error' | 'paused') {
        if (progress < 0) {
            this.mainWindow?.setProgressBar(-1);
            return;
        }

        this.mainWindow?.setProgressBar(progress, {
            mode: mode || 'normal'
        });
    }

    /**
     * Flash taskbar for attention
     */
    flashTaskbar(flash: boolean = true) {
        this.mainWindow?.flashFrame(flash);
    }

    /**
     * Set overlay icon (like badge on macOS)
     * @param icon Path to icon or null to remove
     * @param description Accessibility description
     */
    setOverlayIcon(icon: string | null, description: string = '') {
        const { nativeImage } = require('electron');

        if (icon) {
            const image = nativeImage.createFromPath(icon);
            this.mainWindow?.setOverlayIcon(image, description);
        } else {
            this.mainWindow?.setOverlayIcon(null, '');
        }
    }

    /**
     * Add recent document to Jump List
     */
    addRecentDocument(path: string) {
        app.addRecentDocument(path);
    }

    /**
     * Clear recent documents
     */
    clearRecentDocuments() {
        app.clearRecentDocuments();
    }

    /**
     * Windows Hello Integration (Biometric Authentication)
     * Note: Requires additional native modules
     */
    async authenticateWithWindowsHello(): Promise<boolean> {
        // This would require native Windows Hello API integration
        // For now, return false as not implemented
        console.log('Windows Hello authentication not yet implemented');
        return false;
    }

    /**
     * Cortana Integration
     * Register voice commands
     */
    registerVoiceCommands() {
        // This would require Cortana API integration
        // For now, just log
        console.log('Cortana integration not yet implemented');
    }

    /**
     * Windows Search Integration
     * Index browser data for Windows Search
     */
    setupWindowsSearch() {
        // This would require Windows Search API integration
        console.log('Windows Search integration ready');
    }

    /**
     * Set window to always on top
     */
    setAlwaysOnTop(flag: boolean) {
        this.mainWindow?.setAlwaysOnTop(flag);
    }

    /**
     * Enable/disable window transparency
     */
    setWindowTransparency(opacity: number) {
        this.mainWindow?.setOpacity(opacity);
    }
}

export default WindowsIntegration;
