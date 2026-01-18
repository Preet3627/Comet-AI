import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { Security } from '@/lib/Security';
import { defaultShortcuts, Shortcut } from '@/lib/constants';
import firebaseService from '@/lib/FirebaseService';
import { auth } from '@/lib/firebase';
import { GoogleAuthProvider, signInWithPopup, onAuthStateChanged } from 'firebase/auth';

// ... (rest of the interfaces are the same)

interface BrowserState {
    // URL and navigation
    currentUrl: string;
    defaultUrl: string;
    setDefaultUrl: (url: string) => void;

    // Tabs
    tabs: Array<{ id: string; url: string; title: string; isIncognito?: boolean; isAudible?: boolean }>;
    activeTabId: string;
    addTab: (url?: string) => void;
    addIncognitoTab: (url?: string) => void;
    removeTab: (id: string) => void;
    updateTab: (id: string, updates: Partial<{ url: string; title: string; isAudible?: boolean }>) => void;
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
    setEnableAIAssist: (enable: boolean) => void;
    setOpenaiApiKey: (key: string) => void;
    setGeminiApiKey: (key: string) => void;
    setAIProvider: (provider: string) => void;
    localLLMBaseUrl: string;
    localLLMModel: string;
    setLocalLLMBaseUrl: (url: string) => void;
    setLocalLLMModel: (model: string) => void;

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

    // Logout
    logout: () => void;
}

export const useAppStore = create<BrowserState>()(
    persist(
        (set, get) => ({
            // URL and navigation
            currentUrl: 'about:blank',
            defaultUrl: 'https://www.google.com',

            // Tabs
            tabs: [{ id: 'default', url: 'about:blank', title: 'New Tab' }],
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
            activeView: 'landing',

            // Guest mode and sync
            isGuestMode: false,
            cloudSyncConsent: null,
            syncPassphrase: undefined,

            // AI settings
            enableAIAssist: true,
            openaiApiKey: '',
            geminiApiKey: '',
            aiProvider: 'gemini',
            localLLMBaseUrl: '',
            localLLMModel: '',

            // Theme settings
            theme: 'system',

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
                    currentUrl: newTab?.url || state.currentUrl
                };
            }),
            setActiveTab: (id) => set((state) => {
                const newTab = state.tabs.find(t => t.id === id);
                return {
                    activeTabId: id,
                    currentUrl: newTab?.url || state.currentUrl
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
            addClipboardItem: (item) => set((state) => ({
                clipboard: [...state.clipboard, item]
            })),
            clearClipboard: () => set({ clipboard: [] }),

            // User and auth
            setUser: (user) => set({ user, isAdmin: user?.email === 'preetjgfilj2@gmail.com' }),
            setAdmin: (isAdmin) => set({ isAdmin }),
            setGoogleToken: (token) => set({ googleToken: token }),
            setGithubToken: (token) => set({ githubToken: token }),


            // View and UI
            setActiveView: (view) => set({ activeView: view }),

            // AI settings
            setEnableAIAssist: (enable) => set({ enableAIAssist: enable }),
            setOpenaiApiKey: (key) => set({ openaiApiKey: key }),
            setGeminiApiKey: (key) => set({ geminiApiKey: key }),
            setAIProvider: (provider) => set({ aiProvider: provider }),
            setLocalLLMBaseUrl: (url) => set({ localLLMBaseUrl: url }),
            setLocalLLMModel: (model) => set({ localLLMModel: model }),

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
                set((state) => {
                    const id = `tab-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`;
                    return {
                        tabs: [...state.tabs, { id, url: finalUrl, title: 'New Tab' }],
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
                    return {
                        tabs: [...state.tabs, { id, url: finalUrl, title: 'New Incognito Tab', isIncognito: true }],
                        activeTabId: id,
                        currentUrl: finalUrl,
                        activeView: 'browser'
                    };
                });
            },
            removeTab: (id) => set((state) => {
                const newTabs = state.tabs.filter(t => t.id !== id);
                const defaultUrl = get().defaultUrl;
                const finalTabs = newTabs.length ? newTabs : [{ id: 'default', url: defaultUrl, title: 'New Tab' }];
                const nextTabId = state.activeTabId === id ? (finalTabs[0]?.id || 'default') : state.activeTabId;
                const nextUrl = finalTabs.find(t => t.id === nextTabId)?.url || defaultUrl;

                return {
                    tabs: finalTabs,
                    activeTabId: nextTabId,
                    currentUrl: nextUrl
                };
            }),

            setSyncPassphrase: (passphrase) => set({ syncPassphrase: passphrase }),

            logout: () => set({
                user: null,
                isAdmin: false,
                activeView: 'landing',
                history: [],
                bookmarks: [],
                passwords: [],
                addresses: [],
                paymentMethods: [],
                cloudSyncConsent: null,
                isGuestMode: false,
                tabs: [{ id: 'default', url: 'about:blank', title: 'New Tab' }],
                currentUrl: 'about:blank',
            }),

            // ...
        }),
        {
            name: 'comet-browser-storage',
        }
    )
);

// Firebase auth listener
if (auth) {
    onAuthStateChanged(auth, (user) => {
        if (user) {
            useAppStore.getState().setUser({
                uid: user.uid,
                email: user.email || '',
                displayName: user.displayName || '',
                photoURL: user.photoURL || '',
            });
            useAppStore.getState().setActiveView('browser');
            useAppStore.getState().updateTab('default', { url: useAppStore.getState().defaultUrl });
            useAppStore.getState().setCurrentUrl(useAppStore.getState().defaultUrl);

        } else {
            useAppStore.getState().logout();
        }
    });
}
