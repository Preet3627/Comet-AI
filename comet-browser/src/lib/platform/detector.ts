/**
 * Platform Detection Utility
 * Detects the current operating system and provides platform-specific helpers
 */

export const platform = {
    isMac: process.platform === 'darwin',
    isWindows: process.platform === 'win32',
    isLinux: process.platform === 'linux',

    getOS(): 'macos' | 'windows' | 'linux' {
        if (this.isMac) return 'macos';
        if (this.isWindows) return 'windows';
        return 'linux';
    },

    /**
     * Get platform-specific modifier key
     * @returns 'Cmd' for macOS, 'Ctrl' for Windows/Linux
     */
    getModifierKey(): 'Cmd' | 'Ctrl' {
        return this.isMac ? 'Cmd' : 'Ctrl';
    },

    /**
     * Get platform-specific keyboard shortcut format
     * @param key The key combination
     * @returns Formatted shortcut string
     */
    formatShortcut(key: string): string {
        if (this.isMac) {
            return key
                .replace('CommandOrControl', '⌘')
                .replace('Cmd', '⌘')
                .replace('Alt', '⌥')
                .replace('Shift', '⇧')
                .replace('Ctrl', '⌃');
        }
        return key.replace('CommandOrControl', 'Ctrl');
    },

    /**
     * Check if running on Apple Silicon
     */
    isAppleSilicon(): boolean {
        return this.isMac && process.arch === 'arm64';
    },

    /**
     * Get platform-specific app data path
     */
    getAppDataPath(): string {
        if (typeof window !== 'undefined' && window.electronAPI) {
            // Will be implemented in Electron main process
            return '';
        }
        return '';
    }
};

export default platform;
