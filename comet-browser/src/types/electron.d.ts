import { ChatMessage } from "../lib/llm/providers/base";

declare global {
    interface Window {
        pdfjsLib: any;
        electronAPI: {
            // BrowserView related APIs
            getIsOnline: () => Promise<boolean>;
            onAiQueryDetected: (callback: (query: string) => void) => () => void;
            createView: (args: { tabId: string; url: string }) => void;
            activateView: (args: { tabId: string; bounds: { x: number; y: number; width: number; height: number } }) => void;
            destroyView: (tabId: string) => void;
            hideAllViews: () => void;
            onBrowserViewUrlChanged: (callback: (data: { tabId: string; url: string }) => void) => () => void;
            onBrowserViewTitleChanged: (callback: (data: { tabId: string; title: string }) => void) => () => void;
            navigateBrowserView: (args: { tabId: string; url: string }) => void;
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
            changeZoom: (deltaY: number) => void;
            onAudioStatusChanged: (callback: (isPlaying: boolean) => void) => () => void;

            // Download APIs
            onDownloadStarted: (callback: (filename: string) => void) => () => void;
            triggerDownload: (url: string, filename: string) => void;
            on: (channel: string, listener: (...args: any[]) => void) => () => void; // Generic 'on' for ipcRenderer events
            onAddNewTab: (callback: (url: string) => void) => () => void; // Specific add new tab event

            // LLM & Memory APIs
            getAvailableLLMProviders: () => Promise<{ id: string; name: string }[]>;
            setActiveLLMProvider: (providerId: string) => Promise<boolean>;
            configureLLMProvider: (providerId: string, options: any) => Promise<boolean>;
            generateChatContent: (messages: ChatMessage[], options?: any) => Promise<{ text?: string; error?: string }>;
            getAiMemory: () => Promise<any[]>;
            addAiMemory: (entry: any) => void;
            getSelectedText: () => Promise<string>; // For context menu integration
            sendToAIChatInput: (text: string) => void; // For sending selected text to AI chat
            captureBrowserViewScreenshot: () => Promise<string>; // For vision capabilities

            // Dev-MCP & Analytics
            sendMcpCommand: (command: string, data: any) => Promise<any>;
            shareDeviceFolder: () => Promise<{ path?: string; success: boolean }>;
            setMcpServerPort: (port: number) => void; // For updating the MCP server port

            // Ollama specific APIs
            ollamaListModels: () => Promise<{ models: { name: string; modified_at: string }[]; error?: string }>;

            // Window Controls
            minimizeWindow: () => void;
            maximizeWindow: () => void;
            closeWindow: () => void;
            toggleFullscreen: () => void;
            showWebview: () => void;
            hideWebview: () => void;
            getOpenTabs: () => Promise<any[]>;

            // Auth
            openAuthWindow: (url: string) => void;
            onAuthCallback: (callback: (event: any, url: string) => void) => () => void;
            onAuthTokenReceived: (callback: (token: string) => void) => () => void;

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
            onShortcut: (callback: (action: string) => void) => () => void;
            updateShortcuts: (shortcuts: { action: string; accelerator: string }[]) => void;

            // Tab Optimization
            suspendTab: (tabId: string) => void;
            resumeTab: (tabId: string) => void;
            getMemoryUsage: () => Promise<any>;
            // RAG Persistence & Ollama
            saveVectorStore: (data: any[]) => Promise<boolean>;
            loadVectorStore: () => Promise<any[]>;
            webSearchRag: (query: string) => Promise<string[]>;
            getPasswordsForSite: (domain: string) => Promise<any[]>;
            proposePasswordSave: (data: { domain: string; username?: string; password?: string }) => void;
            getOllamaModels: () => Promise<{ name: string; modified_at: string }[]>;
            pullOllamaModel: (model: string, callback: (data: any) => void) => () => void;
            importOllamaModel: (data: { modelName: string; filePath: string }) => Promise<{ success: boolean; error?: string }>;
            selectLocalFile: () => Promise<string | null>;
            executeJavaScript: (code: string) => Promise<any>;
            setUserId: (userId: string | null) => void;
            getExtensions: () => Promise<any[]>;
            toggleExtension: (id: string) => Promise<boolean>;
            uninstallExtension: (id: string) => Promise<boolean>;
            openExtensionDir: () => void;
            getExtensionPath: () => Promise<string>;
            connectToRemoteDevice: (remoteDeviceId: string) => Promise<boolean>;
            sendP2PSignal: (signal: any, remoteDeviceId: string) => void;
            onP2PConnected: (callback: () => void) => () => void;
            onP2PDisconnected: (callback: () => void) => () => void;
            onP2PFirebaseReady: (callback: (userId: string) => void) => () => void;
            onP2POfferCreated: (callback: (data: { offer: any; remoteDeviceId: string }) => void) => () => void;
            onP2PAnswerCreated: (callback: (data: { answer: any; remoteDeviceId: string }) => void) => () => void;
            onP2PIceCandidate: (callback: (data: { candidate: any; remoteDeviceId: string }) => void) => () => void;
            encryptData: (data: ArrayBuffer, key: string) => Promise<{ encryptedData: ArrayBuffer; iv: ArrayBuffer; authTag: ArrayBuffer; salt: ArrayBuffer; } | { error: string }>;
            decryptData: (encryptedData: ArrayBuffer, key: string, iv: ArrayBuffer, authTag: ArrayBuffer, salt: ArrayBuffer) => Promise<{ decryptedData: ArrayBuffer; } | { error: string }>;

            // Persistent Storage
            savePersistentData: (key: string, data: any) => Promise<{ success: boolean; error?: string }>;
            loadPersistentData: (key: string) => Promise<{ success: boolean; data?: any; error?: string }>;
            deletePersistentData: (key: string) => Promise<{ success: boolean; error?: string }>;

            // Event Listeners for UI updates
            onNetworkStatusChanged: (callback: (isOnline: boolean) => void) => () => void;
            onClipboardChanged: (callback: (text: string) => void) => () => void;
            onAIChatInputText: (callback: (text: string) => void) => () => void;
            translateWebsite: (args: { targetLanguage: string }) => Promise<{ success?: boolean; error?: string }>;
            onTriggerTranslationDialog: (callback: () => void) => () => void;
            toggleAdblocker: (enable: boolean) => void;
        };
    }
}

export { };
