import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { Security } from '@/lib/Security';
import { defaultShortcuts, Shortcut } from '@/lib/constants';
import firebaseService from '@/lib/FirebaseService';
import { getAuth } from 'firebase/auth';

interface PasswordEntry {
    id: string;
    site: string;
    username: string;
    password: string;
    note?: string;
}

interface BrowserState {
    currentUrl: string;
    history: any[];
    clipboard: string[];
    activeView: 'browser' | 'webstore' | 'pdf' | 'landing' | 'workspace' | 'media';
    isSidebarCollapsed: boolean;
    studentMode: boolean;
    selectedEngine: string;
    theme: 'dark' | 'light' | 'system';
    appName: string;
    isCodingMode: boolean;

    // User & Session System
    user: {
        uid: string;
        email: string | null;
        displayName: string | null;
        photoURL: string | null;
        lastLogin?: number;
        activeTime?: number; // in milliseconds
    } | null;
    isAdmin: boolean;
    activeStartTime: number | null;

    // Tab System
    tabs: { id: string; url: string; title: string }[];
    activeTabId: string;

    // UI Customization
    sidebarWidth: number;
    sidebarSide: 'left' | 'right';
    isVibrant: boolean;

    // Security & Preferences
    isSafeSearch: boolean;
    showSiteWarnings: boolean;
    installDismissed: boolean;

    // Advanced Features
    bookmarks: { id: string; url: string; title: string; icon?: string }[];
    offlinePages: { id: string; url: string; title: string; html: string; timestamp: number }[];
    unifiedCart: { id: string; site: string; item: string; price: string; url: string; thumbnail?: string }[];

    // Password Manager & Autofill
    passwords: PasswordEntry[];
    addresses: { id: string; name: string; street: string; city: string; zip: string; country: string }[];
    paymentMethods: { id: string; name: string; cardNumber: string; expiry: string; cvc: string }[];
    autofillEnabled: boolean;
    excelAutofillData: any[];
    shortcuts: Shortcut[];

    addAddress: (addr: any) => void;
    removeAddress: (id: string) => void;
    addPaymentMethod: (pm: any) => void;
    removePaymentMethod: (id: string) => void;

    // AI Configuration
    cloudSyncConsent: boolean | null;
    aiProvider: 'openai' | 'gemini' | 'claude' | 'local';
    localLLMModel: string;
    isOnline: boolean; // New state for network status
    enableAIAssist: boolean;
    syncPassphrase: string | null;
    setSyncPassphrase: (passphrase: string | null) => void;

    // API Keys
    openaiApiKey: string | null;
    geminiApiKey: string | null;
    setOpenaiApiKey: (key: string | null) => void;
    setGeminiApiKey: (key: string | null) => void;

    // Integrations
    githubToken: string | null;
    googleToken: string | null;
    setGithubToken: (token: string | null) => void;
    setGoogleToken: (token: string | null) => void;

    // Backend Configuration
    backendStrategy: 'firebase' | 'mysql';
    customFirebaseConfig: any | null;
    customMysqlConfig: any | null;
    setBackendStrategy: (strategy: 'firebase' | 'mysql') => void;
    setCustomFirebaseConfig: (config: any | null) => void;
    setCustomMysqlConfig: (config: any | null) => void;

    // Actions
    setCloudSyncConsent: (consent: boolean) => void;
    setIsOnline: (online: boolean) => void;
    setEnableAIAssist: (enabled: boolean) => void;
    setCurrentUrl: (url: string) => void;
    addToHistory: (entry: { url: string; title: string }) => void;
    setHistory: (history: any[]) => void;
    fetchHistory: () => Promise<void>;
    addClipboardItem: (item: string) => void;
    setActiveView: (view: 'browser' | 'webstore' | 'pdf' | 'landing' | 'workspace' | 'media') => void;
    toggleSidebar: () => void;
    setStudentMode: (mode: boolean) => void;
    setSelectedEngine: (engine: string) => void;
    setTheme: (theme: 'dark' | 'light' | 'system') => void;
    setAppName: (name: string) => void;
    setCodingMode: (mode: boolean) => void;

    // Tab Actions
    addTab: (url?: string) => void;
    removeTab: (id: string) => void;
    setActiveTab: (id: string) => void;
    updateTab: (id: string, updates: Partial<{ url: string; title: string }>) => void;
    nextTab: () => void;
    prevTab: () => void;

    // UI Actions
    setSidebarWidth: (width: number) => void;
    setSidebarSide: (side: 'left' | 'right') => void;
    setVibrant: (vibrant: boolean) => void;

    // Security Actions
    setSafeSearch: (enabled: boolean) => void;
    setSiteWarnings: (enabled: boolean) => void;

    // Advanced Actions
    addBookmark: (url: string, title: string) => void;
    removeBookmark: (id: string) => void;
    savePageOffline: (url: string, title: string, html: string) => void;
    addToUnifiedCart: (item: { site: string; item: string; price: string; url: string; thumbnail?: string }) => void;
    removeFromCart: (id: string) => void;
    clearClipboard: () => void;

    // Password Actions
    addPassword: (entry: Omit<PasswordEntry, 'id'>) => void;
    removePassword: (id: string) => void;
    setAutofillEnabled: (enabled: boolean) => void;
    setExcelAutofillData: (data: any[]) => void;
    setAIProvider: (provider: 'openai' | 'gemini' | 'claude' | 'local') => void;
    updateShortcut: (action: string, accelerator: string) => void;

    // User Actions
    setUser: (user: BrowserState['user']) => void;
    setAdmin: (isAdmin: boolean) => void;
    logout: () => void;
    updateActiveTime: () => void;
    startActiveSession: () => void;
    endActiveSession: () => void;
}

export const useAppStore = create<BrowserState>()(
    persist(
        (set, get) => ({
            currentUrl: 'https://www.google.com',
            history: [],
            clipboard: [],
            activeView: 'landing',
            isSidebarCollapsed: false,
            studentMode: false,
            selectedEngine: 'google',
            theme: 'dark',
            appName: process.env.NEXT_PUBLIC_APP_NAME || 'Comet',
            isCodingMode: false,
            tabs: [{ id: 'default', url: 'https://www.google.com', title: 'New Tab' }],
            activeTabId: 'default',
            sidebarWidth: 320,
            sidebarSide: 'left',
            isVibrant: true,
            isSafeSearch: true,
            showSiteWarnings: true,
            installDismissed: false,
            bookmarks: [],
            offlinePages: [],
            unifiedCart: [],
            passwords: [],
            addresses: [],
            paymentMethods: [],
            autofillEnabled: true,
            excelAutofillData: [],
            aiProvider: 'openai',
            localLLMModel: 'Llama-3-Lightweight',
            cloudSyncConsent: null,
            user: null,
            isAdmin: false,
            activeStartTime: null,
            shortcuts: defaultShortcuts,
            openaiApiKey: null,
            geminiApiKey: null,
            setOpenaiApiKey: (key) => set({ openaiApiKey: key }),
            setGeminiApiKey: (key) => set({ geminiApiKey: key }),

            addAddress: (addr) => set((state) => ({ addresses: [...state.addresses, { ...addr, id: Date.now().toString() }] })),
            removeAddress: (id) => set((state) => ({ addresses: state.addresses.filter(a => a.id !== id) })),
            addPaymentMethod: (pm) => set((state) => ({ paymentMethods: [...state.paymentMethods, { ...pm, id: Date.now().toString() }] })),
            removePaymentMethod: (id) => set((state) => ({ paymentMethods: state.paymentMethods.filter(p => p.id !== id) })),

            isOnline: true,
            enableAIAssist: true,
            backendStrategy: 'firebase',
            customFirebaseConfig: null,
            customMysqlConfig: null,

            githubToken: null,
            googleToken: null,
            setGithubToken: (token) => set({ githubToken: token }),
            setGoogleToken: (token) => set({ googleToken: token }),

            setBackendStrategy: (strategy: 'firebase' | 'mysql') => set({ backendStrategy: strategy }),
            setCustomFirebaseConfig: (config: any | null) => set({ customFirebaseConfig: config }),
            setCustomMysqlConfig: (config: any | null) => set({ customMysqlConfig: config }),

            setCloudSyncConsent: (consent) => {
                console.log('Setting cloud sync consent:', consent);
                set({ cloudSyncConsent: consent });
            },
            setIsOnline: (online) => {
                console.log('Setting online status:', online);
                set({ isOnline: online });
            },
            setEnableAIAssist: (enabled) => {
                console.log('Setting AI assist enabled:', enabled);
                set({ enableAIAssist: enabled });
            },
            syncPassphrase: null,
            setSyncPassphrase: (passphrase) => set({ syncPassphrase: passphrase }),

            setCurrentUrl: (url) => set({ currentUrl: url }),
            addToHistory: (entry) => set((state) => {
                const newHistory = [entry, ...state.history.filter(h => h.url !== entry.url).slice(0, 499)];
                if (state.user && firebaseService.app) {
                    firebaseService.addHistoryEntry(state.user.uid, entry.url, entry.title);
                }
                return { history: newHistory };
            }),
            setHistory: (history) => set({ history }),
            fetchHistory: async () => {
                const user = get().user;
                if (user && firebaseService.app) {
                    const history = await firebaseService.getHistory(user.uid);
                    set({ history });
                }
            },
            addClipboardItem: (item) => set((state) => {
                if (state.clipboard.includes(item)) return state;
                const newClipboard = [item, ...state.clipboard.slice(0, 19)];
                if (state.cloudSyncConsent) {
                    import("@/lib/FirebaseSyncService").then(({ firebaseSyncService }) => {
                        console.log("Syncing clipboard to Firebase...");
                        firebaseSyncService.setClipboard(newClipboard);
                    });
                }
                return { clipboard: newClipboard };
            }),
            setActiveView: (view) => set({ activeView: view }),
            toggleSidebar: () => set((state) => ({ isSidebarCollapsed: !state.isSidebarCollapsed })),
            setStudentMode: (mode) => set({ studentMode: mode }),
            setSelectedEngine: (engine) => set({ selectedEngine: engine }),
            setTheme: (theme) => set({ theme }),
            setAppName: (name) => set({ appName: name }),
            setCodingMode: (mode) => set({ isCodingMode: mode }),

            addTab: (url = 'https://www.google.com') => {
                (async () => {
                    let finalUrl = url;
                    const landingPageUrl = process.env.NEXT_PUBLIC_LANDING_PAGE_URL || 'http://localhost:3000';
                    if (url.startsWith(landingPageUrl)) {
                        const user = get().user;
                        if (user && firebaseService.app) {
                            const firebaseUser = getAuth(firebaseService.app).currentUser;
                            if (firebaseUser) {
                                try {
                                    const idToken = await firebaseUser.getIdToken(true);
                                    const urlObject = new URL(url);
                                    urlObject.searchParams.set('idToken', idToken);
                                    finalUrl = urlObject.toString();
                                } catch (error) {
                                    console.error("Error getting idToken: ", error);
                                }
                            }
                        }
                    }
                    set((state) => {
                        const id = `tab-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`;
                        return {
                            tabs: [...state.tabs, { id, url: finalUrl, title: 'New Tab' }],
                            activeTabId: id,
                            currentUrl: finalUrl,
                            activeView: 'browser'
                        };
                    });
                })();
            },
            removeTab: (id) => set((state) => {
                const newTabs = state.tabs.filter(t => t.id !== id);
                const finalTabs = newTabs.length ? newTabs : [{ id: 'default', url: 'https://www.google.com', title: 'New Tab' }];
                const nextTabId = state.activeTabId === id ? (finalTabs[0]?.id || 'default') : state.activeTabId;
                const nextUrl = finalTabs.find(t => t.id === nextTabId)?.url || 'https://www.google.com';

                return {
                    tabs: finalTabs,
                    activeTabId: nextTabId,
                    currentUrl: nextUrl
                };
            }),
            setActiveTab: (id) => set((state) => ({
                activeTabId: id,
                activeView: 'browser',
                currentUrl: state.tabs.find(t => t.id === id)?.url || state.currentUrl
            })),
            updateTab: (id, updates) => set((state) => {
                const newTabs = state.tabs.map(t => t.id === id ? { ...t, ...updates } : t);
                const updatedUrl = id === state.activeTabId && updates.url ? updates.url : state.currentUrl;
                return {
                    tabs: newTabs,
                    currentUrl: updatedUrl
                };
            }),
            nextTab: () => set((state) => {
                const currentTabIndex = state.tabs.findIndex(t => t.id === state.activeTabId);
                const nextTabIndex = (currentTabIndex + 1) % state.tabs.length;
                const nextTab = state.tabs[nextTabIndex];
                return { activeTabId: nextTab.id, currentUrl: nextTab.url, activeView: 'browser' };
            }),
            prevTab: () => set((state) => {
                const currentTabIndex = state.tabs.findIndex(t => t.id === state.activeTabId);
                const prevTabIndex = (currentTabIndex - 1 + state.tabs.length) % state.tabs.length;
                const prevTab = state.tabs[prevTabIndex];
                return { activeTabId: prevTab.id, currentUrl: prevTab.url, activeView: 'browser' };
            }),

            setSidebarWidth: (width) => set({ sidebarWidth: width }),
            setSidebarSide: (side) => set({ sidebarSide: side }),
            setVibrant: (vibrant) => set({ isVibrant: vibrant }),
            setSafeSearch: (enabled) => set({ isSafeSearch: enabled }),
            setSiteWarnings: (enabled) => set({ showSiteWarnings: enabled }),

            addBookmark: (url, title) => set((state) => ({
                bookmarks: [...state.bookmarks, { id: `bmk-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`, url, title }]
            })),
            removeBookmark: (id) => set((state) => ({
                bookmarks: state.bookmarks.filter(b => b.id !== id)
            })),
            savePageOffline: (url, title, html) => set((state) => ({
                offlinePages: [...state.offlinePages, { id: `off-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`, url, title, html, timestamp: Date.now() }]
            })),
            addToUnifiedCart: (item) => set((state) => ({
                unifiedCart: [...state.unifiedCart, { ...item, id: `cart-${Date.now()}-${Math.random().toString(36).substr(2, 5)}` }]
            })),
            removeFromCart: (id) => set((state) => ({
                unifiedCart: state.unifiedCart.filter(i => i.id !== id)
            })),
            clearClipboard: () => set({ clipboard: [] }),


            addPassword: async (entry) => {
                const state = useAppStore.getState();
                const encryptedPassword = await Security.encrypt(entry.password, state.syncPassphrase || undefined);
                const encryptedEntry = {
                    ...entry,
                    password: encryptedPassword,
                    id: `pwd-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`
                };
                set((state) => ({ passwords: [...state.passwords, encryptedEntry] }));
            },
            removePassword: (id) => set((state) => ({
                passwords: state.passwords.filter(p => p.id !== id)
            })),
            setAutofillEnabled: (enabled) => set({ autofillEnabled: enabled }),
            setExcelAutofillData: (data) => set({ excelAutofillData: data }),
            setAIProvider: (provider) => set({ aiProvider: provider }),
            updateShortcut: (action, accelerator) => set((state) => {
                const newShortcuts = state.shortcuts.map(s => s.action === action ? { ...s, accelerator } : s);
                if (window.electronAPI) {
                    window.electronAPI.updateShortcuts(newShortcuts);
                }
                return { shortcuts: newShortcuts };
            }),

            setUser: (user) => set({
                user,
                isAdmin: user?.email === 'preetjgfilj2@gmail.com' || user?.email?.endsWith('@admin.com') || false
            }),
            setAdmin: (isAdmin) => set({ isAdmin }),
            logout: () => set({ user: null, isAdmin: false, activeView: 'landing', history: [] }),
            startActiveSession: () => set({ activeStartTime: Date.now() }),
            endActiveSession: () => set((state) => {
                if (!state.activeStartTime || !state.user) return { activeStartTime: null };
                const sessionDuration = Date.now() - state.activeStartTime;
                const newActiveTime = (state.user.activeTime || 0) + sessionDuration;
                return {
                    user: {
                        ...state.user,
                        activeTime: newActiveTime,
                    },
                    activeStartTime: null
                };
            }),
            updateActiveTime: () => set((state) => {
                if (!state.activeStartTime || !state.user) return state;
                const now = Date.now();
                const sessionDuration = now - state.activeStartTime;
                const newActiveTime = (state.user.activeTime || 0) + sessionDuration;
                return {
                    user: {
                        ...state.user,
                        activeTime: newActiveTime
                    },
                    activeStartTime: now
                };
            }),
        }),
        {
            name: 'comet-browser-storage',
        }
    )
);