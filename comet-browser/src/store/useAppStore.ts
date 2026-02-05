import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { Security } from '@/lib/Security';
import { defaultShortcuts, Shortcut } from '@/lib/constants';
import firebaseService from '@/lib/FirebaseService';
import { auth } from '@/lib/firebase';
import { GoogleAuthProvider, signInWithPopup, onAuthStateChanged, signInWithCredential } from 'firebase/auth';

// ... (rest of the interfaces are the same)

interface BrowserState {
    // URL and navigation
    currentUrl: string;
    defaultUrl: string;
    setDefaultUrl: (url: string) => void;

    tabs: Array<{
        id: string;
        url: string;
        title: string;
        isIncognito?: boolean;
        isAudible?: boolean;
        lastAccessed?: number;
        isSuspended?: boolean;
        priority?: 'low' | 'normal' | 'high';
        keepAlive?: boolean;
    }>;
    activeTabId: string;
    addTab: (url?: string) => void;
    addIncognitoTab: (url?: string) => void;
    removeTab: (id: string) => void;
    updateTab: (id: string, updates: Partial<{ url: string; title: string; isAudible?: boolean; isSuspended?: boolean; priority?: 'low' | 'normal' | 'high'; keepAlive?: boolean }>) => void;
    setCurrentUrl: (url: string) => void;
    setActiveTabId: (id: string) => void;
    setActiveTab: (id: string) => void; // Alias for setActiveTabId

    // Performance Mode
    performanceMode: 'normal' | 'performance';
    performanceModeSettings: {
        maxActiveTabs: number;
        maxRam: number; // in MB
        keepAudioTabsActive: boolean;
    };
    setPerformanceMode: (mode: 'normal' | 'performance') => void;
    updatePerformanceModeSettings: (settings: Partial<BrowserState['performanceModeSettings']>) => void;

    // History and clipboard
    history: Array<{ url: string; title: string; timestamp: number }>;
    clipboard: string[];
    setHistory: (history: Array<{ url: string; title: string; timestamp: number }>) => void;
    fetchHistory: () => void;
    addToHistory: (entry: { url: string; title: string }) => void;
    savePageOffline: (url: string, title: string, html: string) => void;
    addToUnifiedCart: (item: any) => void;
    addClipboardItem: (item: string) => void;
    clearClipboard: () => void;

    // User and auth
    user: { uid: string; email: string; displayName: string; photoURL: string; activeTime?: number } | null;
    isAdmin: boolean;
    setUser: (user: { uid: string; email: string; displayName: string; photoURL: string } | null) => void;
    setAdmin: (isAdmin: boolean) => void;
    googleToken: string | null;
    githubToken: string | null;
    setGoogleToken: (token: string | null) => void;
    setGithubToken: (token: string | null) => void;
    loginWithGoogleToken: (token: string) => void;

    // View and UI
    activeView: string;
    setActiveView: (view: string) => void;

    // Guest mode and sync
    isGuestMode: boolean;
    cloudSyncConsent: boolean | null;
    syncPassphrase: string | undefined;
    setGuestMode: (isGuest: boolean) => void;
    setCloudSyncConsent: (consent: boolean) => void;
    setSyncPassphrase: (passphrase: string) => void;

    // AI settings
    enableAIAssist: boolean;
    openaiApiKey: string;
    geminiApiKey: string;
    aiProvider: string;
    ollamaBaseUrl: string;
    ollamaModel: string;
    anthropicApiKey: string;
    groqApiKey: string;
    setEnableAIAssist: (enable: boolean) => void;
    setOpenaiApiKey: (key: string) => void;
    setGeminiApiKey: (key: string) => void;
    setAnthropicApiKey: (key: string) => void;
    setGroqApiKey: (key: string) => void;
    setAIProvider: (provider: string) => void;
    setOllamaBaseUrl: (url: string) => void;
    setOllamaModel: (model: string) => void;
    localLLMBaseUrl: string;
    localLLMModel: string;
    setLocalLLMBaseUrl: (url: string) => void;
    setLocalLLMModel: (model: string) => void;

    // AI Permission
    askForAiPermission: boolean;
    setAskForAiPermission: (val: boolean) => void;
    showAiMistakeWarning: boolean;
    setShowAiMistakeWarning: (val: boolean) => void;
    hasSeenAiMistakeWarning: boolean;
    setHasSeenAiMistakeWarning: (val: boolean) => void;
    mcpServerPort: number;
    setMcpServerPort: (port: number) => void;
    additionalAIInstructions: string;
    setAdditionalAIInstructions: (instructions: string) => void;

    // Theme settings
    theme: "system" | "dark" | "light";
    setTheme: (theme: "system" | "dark" | "light") => void;

    // Online status
    isOnline: boolean;
    setIsOnline: (online: boolean) => void;

    // Active time tracking
    activeStartTime: number | null;
    startActiveSession: () => void;
    updateActiveTime: () => void;

    // Tab navigation
    nextTab: () => void;
    prevTab: () => void;

    // Sidebar
    sidebarOpen: boolean;
    sidebarWidth: number;
    sidebarSide: "left" | "right";
    isSidebarCollapsed: boolean;
    toggleSidebar: () => void;
    toggleSidebarCollapse: () => void;
    setSidebarSide: (side: "left" | "right") => void;
    setSidebarWidth: (width: number) => void;

    // Student mode
    studentMode: boolean;
    setStudentMode: (student: boolean) => void;

    // Coding mode
    isCodingMode: boolean;
    setCodingMode: (coding: boolean) => void;

    // Vibrant mode
    isVibrant: boolean;

    // Site warnings
    showSiteWarnings: boolean;

    // Unified cart
    unifiedCart: Array<{ id: string; item: string; site: string; price: string; }>;
    removeFromCart: (itemId: string) => void;
    ambientMusicUrl: string;
    enableAmbientMusic: boolean;
    setAmbientMusicUrl: (url: string) => void;
    setEnableAmbientMusic: (enable: boolean) => void;

    // Search and bookmarks
    selectedEngine: string;
    setSelectedEngine: (engine: string) => void;
    bookmarks: Array<{ id: string; url: string; title: string }>;
    addBookmark: (bookmark: { url: string; title: string }) => void;
    removeBookmark: (url: string) => void;

    // Passwords and autofill
    passwords: Array<{ url: string; username: string; password: string }>;
    addresses: Array<{ id: string; name: string; address: string; street: string; city: string; zip: string; country: string }>;
    paymentMethods: Array<{ id: string; name: string; cardNumber: string; expiry: string; cvc: string }>;
    addAddress: (address: Omit<BrowserState['addresses'][0], 'id'>) => void;
    removeAddress: (id: string) => void;
    addPaymentMethod: (method: Omit<BrowserState['paymentMethods'][0], 'id'>) => void;
    removePaymentMethod: (id: string) => void;

    // Settings
    shortcuts: Array<{ action: string; accelerator: string }>;
    updateShortcut: (action: string, accelerator: string) => void;
    hasSeenWelcomePage: boolean;
    setHasSeenWelcomePage: (seen: boolean) => void;
    appName: string;
    backendStrategy: 'firebase' | 'mysql';
    customFirebaseConfig: any | null;
    customMysqlConfig: any | null;
    setBackendStrategy: (strategy: 'firebase' | 'mysql') => void;
    setCustomFirebaseConfig: (config: any | null) => void;
    setCustomMysqlConfig: (config: any | null) => void;

    // Firewall and Security
    firewallLevel: 'standard' | 'strict' | 'paranoid';
    setFirewallLevel: (level: 'standard' | 'strict' | 'paranoid') => void;

    // Language and Translation
    selectedLanguage: string;
    setSelectedLanguage: (lang: string) => void;
    availableLanguages: string[];

    // Ollama Management
    ollamaModelsList: Array<{ name: string; size?: number; details?: any }>;
    setOllamaModelsList: (models: any[]) => void;

    // Offline Reading
    offlineReadingList: Array<{ url: string; title: string; html: string; timestamp: number }>;
    addOfflinePage: (page: { url: string; title: string; html: string }) => void;

    // Logout
    logout: () => void;

    // Adblocker
    enableAdblocker: boolean;
    setEnableAdblocker: (enable: boolean) => void;
}

export const useAppStore = create<BrowserState>()(
    persist(
        (set, get) => ({
            // URL and navigation
            currentUrl: 'https://www.google.com',
            defaultUrl: 'https://www.google.com',

            // Tabs
            tabs: [{ id: 'default', url: 'https://www.google.com', title: 'New Tab' }],
            activeTabId: 'default',

            // History and clipboard
            history: [],
            clipboard: [],

            // User and auth
            user: null,
            isAdmin: false,
            googleToken: null,
            githubToken: null,

            // View and UI
            activeView: 'landing-page',

            // Guest mode and sync
            isGuestMode: false,
            cloudSyncConsent: null,
            syncPassphrase: undefined,

            // AI settings
            enableAIAssist: true,
            openaiApiKey: '',
            geminiApiKey: '',
            anthropicApiKey: '',
            groqApiKey: '',
            aiProvider: 'ollama',
            ollamaBaseUrl: 'http://localhost:11434',
            ollamaModel: 'deepseek-r1:1.5b',
            localLLMBaseUrl: '',
            localLLMModel: '',
            mcpServerPort: 3001,
            additionalAIInstructions: '',

            // Theme settings
            theme: 'system',
            ambientMusicUrl: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3',
            enableAmbientMusic: true,
            setAmbientMusicUrl: (url: string) => set({ ambientMusicUrl: url }),
            setEnableAmbientMusic: (enable: boolean) => set({ enableAmbientMusic: enable }),

            // Online status
            isOnline: true,

            // Active time tracking
            activeStartTime: null,

            // Sidebar
            sidebarOpen: true,
            sidebarWidth: 280,
            sidebarSide: "left",
            isSidebarCollapsed: false,

            // Student mode
            studentMode: false,

            // Coding mode
            isCodingMode: false,

            // Vibrant mode
            isVibrant: false,

            // New states
            firewallLevel: 'standard',
            setFirewallLevel: (level) => set({ firewallLevel: level }),

            selectedLanguage: 'en',
            setSelectedLanguage: (lang) => set({ selectedLanguage: lang }),
            availableLanguages: [
                'en', 'hi', 'bn', 'te', 'mr', 'ta', 'gu', 'ur', 'kn', 'or', 'ml', 'pa', 'as', 'mai', 'sat', 'ks', 'ne', 'kok', 'sd', 'doi', 'mni', 'sa', 'brx', // Indian
                'es', 'fr', 'de', 'ja', 'zh', 'ru', 'pt', 'it', 'ko', 'ar', 'tr', 'vi', 'th', 'nl', 'pl' // World
            ],

            ollamaModelsList: [],
            setOllamaModelsList: (models) => set({ ollamaModelsList: models }),

            offlineReadingList: [],
            addOfflinePage: (page) => set((state) => ({
                offlineReadingList: [...state.offlineReadingList, { ...page, timestamp: Date.now() }]
            })),


            // Site warnings
            showSiteWarnings: true,

            // Unified cart
            unifiedCart: [],

            // Search and bookmarks
            selectedEngine: 'google',
            bookmarks: [],

            // Passwords and autofill
            passwords: [],
            addresses: [],
            paymentMethods: [],

            // Settings
            shortcuts: defaultShortcuts,
            hasSeenWelcomePage: false,
            appName: 'Comet',
            backendStrategy: 'firebase',
            customFirebaseConfig: null,
            customMysqlConfig: null,

            // Adblocker
            enableAdblocker: false,
            setEnableAdblocker: (enable) => {
                set({ enableAdblocker: enable });
                if (window.electronAPI) {
                    window.electronAPI.toggleAdblocker(enable);
                }
            },

            // Performance Mode
            performanceMode: 'normal',
            performanceModeSettings: {
                maxActiveTabs: 5,
                maxRam: 2048, // 2GB
                keepAudioTabsActive: true,
            },

            // URL and navigation
            setDefaultUrl: (url) => set({ defaultUrl: url }),
            setCurrentUrl: (url) => set({ currentUrl: url }),

            // Tabs
            setActiveTabId: (id) => set((state) => {
                const newTab = state.tabs.find(t => t.id === id);
                return {
                    activeTabId: id,
                    currentUrl: newTab?.url || state.currentUrl,
                    tabs: state.tabs.map(t => t.id === id ? { ...t, lastAccessed: Date.now(), isSuspended: false } : t)
                };
            }),
            setActiveTab: (id) => set((state) => {
                const newTab = state.tabs.find(t => t.id === id);
                return {
                    activeTabId: id,
                    currentUrl: newTab?.url || state.currentUrl,
                    tabs: state.tabs.map(t => t.id === id ? { ...t, lastAccessed: Date.now(), isSuspended: false } : t)
                };
            }),
            updateTab: (id, updates) => set((state) => ({
                tabs: state.tabs.map(tab =>
                    tab.id === id ? { ...tab, ...updates } : tab
                )
            })),

            // Performance Mode
            setPerformanceMode: (mode) => set({ performanceMode: mode }),
            updatePerformanceModeSettings: (settings) => set((state) => ({
                performanceModeSettings: { ...state.performanceModeSettings, ...settings }
            })),

            // History and clipboard
            setHistory: (history) => set({ history }),
            fetchHistory: () => {
                // This would be where you fetch history from a backend
                // For now, it does nothing
            },
            addToHistory: (entry) => set((state) => ({
                history: [...state.history, { ...entry, timestamp: Date.now() }]
            })),
            savePageOffline: (url, title, html) => {
                console.log('Saving page offline:', url, title);
            },
            addToUnifiedCart: (item) => {
                console.log('Adding to unified cart:', item);
            },
            addClipboardItem: (item) => set((state) => {
                const newClipboard = [item, ...state.clipboard.filter(i => i !== item)].slice(0, 50);
                return { clipboard: newClipboard };
            }),
            clearClipboard: () => set({ clipboard: [] }),

            // User and auth
            setUser: (user) => set({ user, isAdmin: user?.email === 'preetjgfilj2@gmail.com' }),
            setAdmin: (isAdmin) => set({ isAdmin }),
            setGoogleToken: (token) => set({ googleToken: token }),
            setGithubToken: (token) => set({ githubToken: token }),
            loginWithGoogleToken: (token: string) => {
                // Assuming the token received from browser.ponsrischool.in is a Google ID token
                // If browser.ponsrischool.in uses a different auth method, this logic will need to be updated.
                set({ googleToken: token });
                const credential = GoogleAuthProvider.credential(token);
                if (!auth) return;
                signInWithCredential(auth, credential).catch((error) => {
                    console.error("Deep link sign-in error:", error);
                });
            },


            // View and UI
            setActiveView: (view) => set({ activeView: view }),

            // AI settings
            setEnableAIAssist: (enable) => set({ enableAIAssist: enable }),
            setOpenaiApiKey: (key) => set({ openaiApiKey: key }),
            setGeminiApiKey: (key) => set({ geminiApiKey: key }),
            setAnthropicApiKey: (key) => set({ anthropicApiKey: key }),
            setGroqApiKey: (key) => set({ groqApiKey: key }),
            setAIProvider: (provider) => set({ aiProvider: provider }),
            setOllamaBaseUrl: (url) => set({ ollamaBaseUrl: url }),
            setOllamaModel: (model) => set({ ollamaModel: model }),
            setLocalLLMBaseUrl: (url) => set({ localLLMBaseUrl: url }),
            setLocalLLMModel: (model) => set({ localLLMModel: model }),

            // AI Permission
            askForAiPermission: true,
            setAskForAiPermission: (val) => set({ askForAiPermission: val }),
            showAiMistakeWarning: false,
            setShowAiMistakeWarning: (val) => set({ showAiMistakeWarning: val }),
            hasSeenAiMistakeWarning: false,
            setHasSeenAiMistakeWarning: (val) => set({ hasSeenAiMistakeWarning: val }),
            setMcpServerPort: (port) => set({ mcpServerPort: port }),
            setAdditionalAIInstructions: (instructions) => set({ additionalAIInstructions: instructions }),

            // Theme settings
            setTheme: (theme) => set({ theme }),

            // Online status
            setIsOnline: (online) => set({ isOnline: online }),

            // Active time tracking
            startActiveSession: () => set({ activeStartTime: Date.now() }),
            updateActiveTime: () => {
                // Implementation for updating active time
            },

            // Tab navigation
            nextTab: () => set((state) => {
                const currentIndex = state.tabs.findIndex(tab => tab.id === state.activeTabId);
                const nextIndex = (currentIndex + 1) % state.tabs.length;
                const nextTab = state.tabs[nextIndex];
                return {
                    activeTabId: nextTab.id,
                    currentUrl: nextTab.url
                };
            }),
            prevTab: () => set((state) => {
                const currentIndex = state.tabs.findIndex(tab => tab.id === state.activeTabId);
                const prevIndex = currentIndex === 0 ? state.tabs.length - 1 : currentIndex - 1;
                const prevTab = state.tabs[prevIndex];
                return {
                    activeTabId: prevTab.id,
                    currentUrl: prevTab.url
                };
            }),

            // Sidebar
            toggleSidebar: () => set((state) => ({ sidebarOpen: !state.sidebarOpen })),
            toggleSidebarCollapse: () => set((state) => ({ isSidebarCollapsed: !state.isSidebarCollapsed })),
            setSidebarSide: (side) => set({ sidebarSide: side }),
            setSidebarWidth: (width) => set({ sidebarWidth: width }),

            // Student mode
            setStudentMode: (student) => set({ studentMode: student }),

            // Coding mode
            setCodingMode: (coding) => set({ isCodingMode: coding }),

            // Search engine
            setSelectedEngine: (engine) => set({ selectedEngine: engine }),

            // Bookmarks
            addBookmark: (bookmark) => set((state) => ({
                bookmarks: [...state.bookmarks, { id: `bookmark-${Date.now()}`, ...bookmark }]
            })),
            removeBookmark: (url) => set((state) => ({
                bookmarks: state.bookmarks.filter(b => b.url !== url)
            })),

            // Passwords and autofill
            addAddress: (address) => set((state) => ({
                addresses: [...state.addresses, { id: `address-${Date.now()}`, ...address }]
            })),
            removeAddress: (id) => set((state) => ({
                addresses: state.addresses.filter(a => a.id !== id)
            })),
            addPaymentMethod: (method) => set((state) => ({
                paymentMethods: [...state.paymentMethods, { id: `pm-${Date.now()}`, ...method }]
            })),
            removePaymentMethod: (id) => set((state) => ({
                paymentMethods: state.paymentMethods.filter(pm => pm.id !== id)
            })),

            // Shortcuts
            updateShortcut: (action, accelerator) => set((state) => ({
                shortcuts: state.shortcuts.map(s =>
                    s.action === action ? { ...s, accelerator } : s
                )
            })),
            setHasSeenWelcomePage: (seen) => set({ hasSeenWelcomePage: seen }),

            setBackendStrategy: (strategy) => set({ backendStrategy: strategy }),
            setCustomFirebaseConfig: (config) => set({ customFirebaseConfig: config }),
            setCustomMysqlConfig: (config) => set({ customMysqlConfig: config }),

            setGuestMode: (isGuest) => {
                set({ isGuestMode: isGuest });
                if (isGuest) {
                    set({
                        user: null,
                        history: [],
                        bookmarks: [],
                        passwords: [],
                        addresses: [],
                        paymentMethods: [],
                        selectedEngine: 'google',
                        cloudSyncConsent: false,
                        activeView: 'browser',
                        tabs: [{ id: 'default', url: get().defaultUrl, title: 'New Tab' }],
                        currentUrl: get().defaultUrl,
                    });
                } else {
                    get().logout();
                }
            },

            setCloudSyncConsent: (consent) => set({ cloudSyncConsent: consent }),

            removeFromCart: (itemId) => set((state) => ({
                unifiedCart: state.unifiedCart.filter((item: any) => item.id !== itemId)
            })),

            addTab: (url?: string) => {
                const finalUrl = url || get().defaultUrl;
                const id = `tab-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`;

                if (window.electronAPI) {
                    // Create the view first
                    window.electronAPI.createView({ tabId: id, url: finalUrl });

                    // Activate it immediately with default bounds
                    // The bounds will be updated by the UI component
                    setTimeout(() => {
                        if (window.electronAPI) {
                            window.electronAPI.activateView({
                                tabId: id,
                                bounds: { x: 0, y: 40, width: 1200, height: 760 }
                            });
                        }
                    }, 100);
                }

                set((state) => {
                    let newTabs = [...state.tabs, {
                        id,
                        url: finalUrl,
                        title: 'New Tab',
                        lastAccessed: Date.now(),
                        priority: 'high' as const
                    }];

                    // Enforce 50 tab limit
                    if (newTabs.length > 50) {
                        const tabsToKeep = newTabs.filter(t => t.id === id || t.keepAlive || t.id === state.activeTabId);
                        const others = newTabs.filter(t => !tabsToKeep.find(tk => tk.id === t.id));
                        others.sort((a, b) => {
                            const priorityOrder = { low: 0, normal: 1, high: 2 };
                            const diff = (priorityOrder[a.priority || 'normal'] as number) - (priorityOrder[b.priority || 'normal'] as number);
                            if (diff !== 0) return diff;
                            return (a.lastAccessed || 0) - (b.lastAccessed || 0);
                        });
                        const toRemoveCount = newTabs.length - 50;
                        const removedIds = others.slice(0, toRemoveCount).map(t => t.id);
                        removedIds.forEach(id => {
                            if (window.electronAPI) window.electronAPI.destroyView(id);
                        });
                        newTabs = newTabs.filter(t => !removedIds.includes(t.id));
                    }

                    return {
                        tabs: newTabs,
                        activeTabId: id,
                        currentUrl: finalUrl,
                        activeView: 'browser'
                    };
                });
            },
            addIncognitoTab: (url?: string) => {
                const finalUrl = url || get().defaultUrl;
                set((state) => {
                    const id = `incognito-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`;
                    let newTabs = [...state.tabs, {
                        id,
                        url: finalUrl,
                        title: 'New Incognito Tab',
                        isIncognito: true,
                        lastAccessed: Date.now(),
                        priority: 'high' as const
                    }];

                    if (newTabs.length > 50) {
                        const others = newTabs.filter(t => t.id !== id && !t.keepAlive && t.id !== state.activeTabId);
                        others.sort((a, b) => {
                            const priorityOrder = { low: 0, normal: 1, high: 2 };
                            const diff = (priorityOrder[a.priority || 'normal'] as number) - (priorityOrder[b.priority || 'normal'] as number);
                            if (diff !== 0) return diff;
                            return (a.lastAccessed || 0) - (b.lastAccessed || 0);
                        });
                        const toRemoveCount = newTabs.length - 50;
                        const removedIds = others.slice(0, toRemoveCount).map(t => t.id);
                        newTabs = newTabs.filter(t => !removedIds.includes(t.id));
                    }

                    return {
                        tabs: newTabs,
                        activeTabId: id,
                        currentUrl: finalUrl,
                        activeView: 'browser'
                    };
                });
            },
            removeTab: (id) => {
                if (window.electronAPI) {
                    window.electronAPI.destroyView(id);
                }
                set((state) => {
                    const newTabs = state.tabs.filter(t => t.id !== id);
                    const defaultUrl = get().defaultUrl;
                    let finalTabs = newTabs.length ? newTabs : [{ id: 'default', url: defaultUrl, title: 'New Tab' }];

                    if (newTabs.length === 0) {
                        if (window.electronAPI) {
                            window.electronAPI.createView({ tabId: 'default', url: defaultUrl });
                        }
                    }

                    const nextTabId = state.activeTabId === id ? (finalTabs[0]?.id || 'default') : state.activeTabId;
                    const nextUrl = finalTabs.find(t => t.id === nextTabId)?.url || defaultUrl;

                    return {
                        tabs: finalTabs,
                        activeTabId: nextTabId,
                        currentUrl: nextUrl
                    };
                });
            },

            setSyncPassphrase: (passphrase) => set({ syncPassphrase: passphrase }),

            logout: () => {
                if (window.electronAPI) window.electronAPI.deletePersistentData('user-data');
                set({
                    user: null,
                    isAdmin: false,
                    activeView: 'landing-page',
                    history: [],
                    bookmarks: [],
                    passwords: [],
                    addresses: [],
                    paymentMethods: [],
                    cloudSyncConsent: null,
                    isGuestMode: false,
                    tabs: [{ id: 'default', url: 'https://www.google.com', title: 'New Tab' }],
                    currentUrl: 'https://www.google.com',
                });
            },

            // ...
        }),
        {
            name: 'comet-browser-storage',
        }
    )
);

// Firebase auth listener
if (typeof window !== 'undefined' && window.electronAPI) {
    // Initial load of user data from persistent storage
    window.electronAPI.loadPersistentData('user-data').then((result: any) => {
        if (result.success && result.data) {
            useAppStore.getState().setUser(result.data);
            useAppStore.getState().setActiveView('browser');
        }
    });

    if (auth) {
        onAuthStateChanged(auth, (user) => {
            const { user: currentUser, defaultUrl, tabs, activeTabId } = useAppStore.getState();

            if (user) {
                const userData = {
                    uid: user.uid,
                    email: user.email || '',
                    displayName: user.displayName || '',
                    photoURL: user.photoURL || '',
                };

                // Persist to user data directory
                window.electronAPI.savePersistentData('user-data', userData);

                if (!currentUser || currentUser.uid !== user.uid) {
                    useAppStore.getState().setUser(userData);
                    useAppStore.getState().setActiveView('browser');

                    const activeTab = tabs.find(t => t.id === activeTabId);
                    if (activeTab && (activeTab.url === 'about:blank' || activeTab.url === '')) {
                        useAppStore.getState().updateTab(activeTab.id, { url: defaultUrl });
                        useAppStore.getState().setCurrentUrl(defaultUrl);
                    }
                }
            } else {
                if (currentUser) {
                    window.electronAPI.deletePersistentData('user-data');
                    useAppStore.getState().logout();
                }
            }
        });
    }
}
