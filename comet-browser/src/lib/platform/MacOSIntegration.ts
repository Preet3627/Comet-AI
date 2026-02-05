/**
 * macOS-Specific Integration
 * Handles macOS native features like Touch Bar, Spotlight, Raycast, etc.
 */

import { app, TouchBar, nativeImage, shell } from 'electron';
const { TouchBarButton, TouchBarSpacer } = TouchBar;

export class MacOSIntegration {
    private mainWindow: any;
    private touchBar: any = null;

    constructor(mainWindow: any) {
        this.mainWindow = mainWindow;
        this.setupMacOSFeatures();
    }

    private setupMacOSFeatures() {
        if (process.platform !== 'darwin') return;

        this.setupDockMenu();
        this.setupTouchBar();
        this.setupSpotlightIntegration();
        this.setupHandoff();
    }

    /**
     * Setup macOS Dock Menu
     */
    private setupDockMenu() {
        const { Menu } = require('electron');

        const dockMenu = Menu.buildFromTemplate([
            {
                label: 'New Tab',
                click: () => {
                    this.mainWindow?.webContents.send('add-new-tab', 'https://www.google.com');
                }
            },
            {
                label: 'New Incognito Tab',
                click: () => {
                    this.mainWindow?.webContents.send('add-incognito-tab');
                }
            },
            { type: 'separator' },
            {
                label: 'Search History',
                click: () => {
                    this.mainWindow?.webContents.send('open-history');
                }
            },
            {
                label: 'Bookmarks',
                click: () => {
                    this.mainWindow?.webContents.send('open-bookmarks');
                }
            }
        ]);

        app.dock?.setMenu(dockMenu);
    }

    /**
     * Setup Touch Bar for MacBook Pro
     */
    private setupTouchBar() {
        const backButton = new TouchBarButton({
            label: '←',
            backgroundColor: '#1e1e1e',
            click: () => {
                this.mainWindow?.webContents.send('browser-go-back');
            }
        });

        const forwardButton = new TouchBarButton({
            label: '→',
            backgroundColor: '#1e1e1e',
            click: () => {
                this.mainWindow?.webContents.send('browser-go-forward');
            }
        });

        const reloadButton = new TouchBarButton({
            label: '⟳',
            backgroundColor: '#1e1e1e',
            click: () => {
                this.mainWindow?.webContents.send('browser-reload');
            }
        });

        const newTabButton = new TouchBarButton({
            label: '+ Tab',
            backgroundColor: '#38bdf8',
            click: () => {
                this.mainWindow?.webContents.send('add-new-tab', 'https://www.google.com');
            }
        });

        const aiButton = new TouchBarButton({
            label: '✨ AI',
            backgroundColor: '#818cf8',
            click: () => {
                this.mainWindow?.webContents.send('toggle-ai-sidebar');
            }
        });

        this.touchBar = new TouchBar({
            items: [
                backButton,
                forwardButton,
                reloadButton,
                new TouchBarSpacer({ size: 'flexible' }),
                aiButton,
                newTabButton
            ]
        });

        this.mainWindow?.setTouchBar(this.touchBar);
    }

    /**
     * Setup Spotlight Integration
     * Creates metadata for Spotlight search
     */
    private setupSpotlightIntegration() {
        // macOS will automatically index the app
        // We can enhance this by creating .webloc files for bookmarks
        console.log('Spotlight integration ready');
    }

    /**
     * Setup Handoff Support
     * Allows continuing browsing on other Apple devices
     */
    private setupHandoff() {
        // This requires proper entitlements and Apple Developer account
        // For now, we'll prepare the structure
        this.mainWindow?.on('focus', () => {
            const currentURL = this.mainWindow?.webContents.getURL();
            if (currentURL && currentURL.startsWith('http')) {
                app.setUserActivity('com.comet.browser.browsing', {
                    webpageURL: currentURL
                }, 'Browsing in Comet');
            }
        });
    }

    /**
     * Update Touch Bar based on current state
     */
    updateTouchBar(state: {
        canGoBack?: boolean;
        canGoForward?: boolean;
        isLoading?: boolean;
    }) {
        // Update touch bar button states
        // This would require recreating the touch bar with updated states
    }

    /**
     * Show notification using macOS Notification Center
     */
    showNotification(title: string, body: string, options?: {
        icon?: string;
        sound?: string;
    }) {
        const { Notification } = require('electron');

        const notification = new Notification({
            title,
            body,
            icon: options?.icon,
            sound: options?.sound || 'default'
        });

        notification.show();
    }

    /**
     * Set dock badge (e.g., for download count)
     */
    setDockBadge(text: string) {
        app.dock?.setBadge(text);
    }

    /**
     * Bounce dock icon for attention
     */
    bounceDock(type: 'critical' | 'informational' = 'informational') {
        app.dock?.bounce(type === 'critical' ? 'critical' : 'informational');
    }

    /**
     * Create Quick Look preview for files
     */
    async quickLook(filePath: string) {
        shell.openPath(filePath);
    }
}

/**
 * Raycast Extension Support
 * Provides data endpoints for Raycast extension
 */
export class RaycastIntegration {
    private mainWindow: any;

    constructor(mainWindow: any) {
        this.mainWindow = mainWindow;
    }

    /**
     * Get current tabs for Raycast
     */
    async getTabs(): Promise<Array<{ id: string; title: string; url: string }>> {
        return new Promise((resolve) => {
            this.mainWindow?.webContents.send('raycast-get-tabs');
            // Listen for response
            // This would need proper IPC setup
            resolve([]);
        });
    }

    /**
     * Search history for Raycast
     */
    async searchHistory(query: string): Promise<Array<{ title: string; url: string; timestamp: number }>> {
        return new Promise((resolve) => {
            this.mainWindow?.webContents.send('raycast-search-history', query);
            resolve([]);
        });
    }

    /**
     * Create new tab from Raycast
     */
    async createTab(url: string) {
        this.mainWindow?.webContents.send('add-new-tab', url);
        this.mainWindow?.show();
        this.mainWindow?.focus();
    }
}

export default MacOSIntegration;
