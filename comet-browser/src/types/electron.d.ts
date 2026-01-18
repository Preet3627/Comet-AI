import { ChatMessage } from "@/lib/llm/providers/base";

declare global {
    interface Window {
        electronAPI: {
            // BrowserView related APIs
            getIsOnline: () => Promise<boolean>;
            onAiQueryDetected: (callback: (query: string) => void) => () => void;
            navigateTo: (url: string) => void;
            goBack: () => void;
            goForward: () => void;
            reload: () => void;
            getCurrentUrl: () => Promise<string>;
            extractPageContent: () => Promise<{ content?: string; error?: string }>;
            setBrowserViewBounds: (bounds: { x: number; y: number; width: number; height: number }) => void;
            capturePageHtml: () => Promise<string>;
            saveOfflinePage: (data: { url: string; title: string, html: string }) => Promise<boolean>;
            setUserAgent: (userAgent: string) => Promise<boolean>;
            setProxy: (config: any) => Promise<boolean>;
            capturePage: () => Promise<string>;
            sendInputEvent: (input: any) => Promise<void>;
            openDevTools: () => void;

            // LLM & Memory APIs
            getAvailableLLMProviders: () => Promise<{ id: string; name: string }[]>;
            setActiveLLMProvider: (providerId: string) => Promise<boolean>;
            configureLLMProvider: (providerId: string, options: any) => Promise<boolean>;
            generateChatContent: (messages: ChatMessage[], options?: any) => Promise<{ text?: string; error?: string }>;
            getAiMemory: () => Promise<any[]>;
            addAiMemory: (entry: any) => void;

            // Dev-MCP & Analytics
            sendMcpCommand: (command: string, data: any) => Promise<any>;
            shareDeviceFolder: () => Promise<{ path?: string; success: boolean }>;

            // Utils
            setUserId: (userId: string | null) => void;
            getClipboardText: () => Promise<string>;
            setClipboardText: (text: string) => void;

            // Extensions
            getExtensionPath: () => Promise<string>;
            getExtensions: () => Promise<any[]>;
            toggleExtension: (id: string) => Promise<boolean>;
            uninstallExtension: (id: string) => Promise<boolean>;

            // Window Controls
            minimizeWindow: () => void;
            maximizeWindow: () => void;
            closeWindow: () => void;

            // Chat & File Export
            exportChatAsTxt: (messages: ChatMessage[]) => Promise<boolean>;
            exportChatAsPdf: (messages: ChatMessage[]) => Promise<boolean>;

            // MCP Support
            mcpCommand: (command: string, data: any) => Promise<any>;

            // Database & Sync
            initDatabase: (config: { host?: string; port?: number; user?: string; password?: string; database?: string }) => Promise<{ success: boolean; error?: string }>;
            syncData: (params: { userId: string; type: string; data: any[]; direction: 'push' | 'pull' }) => Promise<{ success: boolean; synced?: number }>;

            // P2P File Sync
            scanFolder: (path: string, types: string[]) => Promise<any[]>;
            readFileBuffer: (path: string) => Promise<ArrayBuffer>;

            // Phone Control
            sendPhoneCommand: (command: string, data: any) => Promise<void>;

            // Contacts
            getDeviceContacts: () => Promise<any[]>;
            syncContacts: (deviceId: string, contacts: any[]) => Promise<{ success: boolean; synced: number }>;

            // OTP
            startSMSListener: () => Promise<boolean>;
            startEmailListener: () => Promise<boolean>;
            syncOTP: (otp: any) => Promise<void>;
            requestSMSPermission: () => Promise<boolean>;
        };
    }
}

export { };
