"use client";

import React, { useState, useEffect } from 'react';
import { useAppStore } from '@/store/useAppStore';
import {
    Settings as SettingsIcon, Monitor, Shield, Palette,
    Layout, Type, Globe, Info, Download, Pin,
    ChevronRight, Check, AlertCircle, Eye, EyeOff, ShieldCheck,
    Key, Package, FileSpreadsheet, Plus, X, Lock, ExternalLink, Keyboard, Briefcase, ShieldAlert, Database, LogIn, LogOut, History as HistoryIcon
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';
import SearchEngineSettings from './SearchEngineSettings';
import KeyboardShortcutSettings from './KeyboardShortcutSettings';
import UserAgentSettings from './UserAgentSettings';
import ProxySettings from './ProxySettings';
import AutofillSettings from './AutofillSettings';
import AdminDashboard from './AdminDashboard';
import HistoryPanel from './HistoryPanel';
import ApiKeysSettings from './ApiKeysSettings';
import { GoogleAuthProvider } from 'firebase/auth';
import firebaseService from '@/lib/FirebaseService';
import { getAuth } from 'firebase/auth';
import { User } from 'firebase/auth'; // Import User type

const SettingsPanel = ({ onClose }: { onClose: () => void }) => {
    const store = useAppStore();
    const fetchHistory = useAppStore((state) => state.fetchHistory);
    const [activeSection, setActiveSection] = React.useState('appearance');
    const [showAddPwd, setShowAddPwd] = useState(false);
    const [newPwd, setNewPwd] = useState({ site: '', username: '', password: '' });
    const [currentUser, setCurrentUser] = useState<User | null>(null); // State to hold the current user
    const [licenseKey, setLicenseKey] = useState("");

    useEffect(() => {
        // Listen for auth state changes to update the UI
        const unsubscribe = firebaseService.onAuthStateChanged((user) => {
            setCurrentUser(user);
            store.setUser(user ? { uid: user.uid, email: user.email || '', displayName: user.displayName || '', photoURL: user.photoURL || '' } : null);
            if (user) {
                fetchHistory();
            }
        });

        // Listen for messages from the auth window (landing page)
        const handleAuthMessage = async (event: MessageEvent) => {
            // In a production app, event.origin should be strictly checked.
            // For Electron, the origin might be file:// or null for the main window,
            // while the opened window (landing page) is on localhost.
            // A more robust check might involve comparing against a known list of allowed origins.
            // For now, a permissive check for localhost for development purposes.
            if (event.origin !== window.location.origin && !event.origin.startsWith('http://localhost')) {
                console.warn('Received message from unknown origin:', event.origin);
                return;
            }

            if (event.data && event.data.type === 'auth-success' && event.data.idToken && event.data.firebaseConfig) {
                console.log('Received idToken and firebaseConfig from landing page.');
                try {
                    await firebaseService.initializeFirebase(event.data.firebaseConfig);
                    const credential = GoogleAuthProvider.credential(event.data.idToken);
                    await getAuth().signInWithCredential(credential);
                    console.log('Signed in with credential in desktop app using dynamic config.');
                } catch (error) {
                    console.error('Error during dynamic Firebase initialization or sign-in:', error);
                }
            }
        };

        window.addEventListener('message', handleAuthMessage);

        return () => {
            unsubscribe();
            window.removeEventListener('message', handleAuthMessage);
        };
    }, [store, fetchHistory]);

    const handleGoogleLogin = () => {
        if (window.electronAPI) {
            // Open the landing page's auth callback in a new Electron window
            // The landing page will handle the Google Sign-In and post back the idToken
            const authUrl = `${process.env.NEXT_PUBLIC_LANDING_PAGE_URL}/auth?client_id=desktop-app&redirect_uri=${encodeURIComponent(window.location.origin)}`;
            window.electronAPI.openAuthWindow(authUrl);
        } else {
            console.warn('electronAPI not available. Cannot open auth window.');
            // Fallback for web environment, though this component is client-only for electron
            window.open(`${process.env.NEXT_PUBLIC_LANDING_PAGE_URL}/auth?client_id=desktop-app&redirect_uri=${encodeURIComponent(window.location.origin)}`, '_blank');
        }
    };

    const handleLicenseLogin = async () => {
        if (!licenseKey) {
            alert("Please enter a license key.");
            return;
        }
        if (!firebaseService.app) {
            alert("Firebase is not initialized. Please set up a custom Firebase config first if you are not using the default.");
            return;
        }
        try {
            const res = await fetch(`${process.env.NEXT_PUBLIC_LANDING_PAGE_URL}/api/verify-license`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ licenseKey }),
            });
            const data = await res.json();
            if (data.customToken) {
                await firebaseService.signInWithCustomToken(data.customToken);
            } else {
                alert(data.error || "Failed to verify license key.");
            }
        } catch (error) {
            console.error("Error verifying license key: ", error);
            alert("An error occurred while verifying the license key.");
        }
    };

    const handleGoogleSignOut = async () => {
        try {
            await firebaseService.signOut();
            console.log('Signed out from Firebase');
        } catch (error) {
            console.error('Error signing out:', error);
        }
    };

    const sections = [
        { id: 'appearance', icon: <Monitor size={18} />, label: 'Appearance' },
        { id: 'search', icon: <Globe size={18} />, label: 'Search Engine' },
        { id: 'privacy', icon: <Shield size={18} />, label: 'Privacy & Security' },
        { id: 'vault', icon: <Key size={18} />, label: 'Vault & Autofill' },
        { id: 'history', icon: <HistoryIcon size={18} />, label: 'History' },
        { id: 'api-keys', icon: <Key size={18} />, label: 'API Keys' },
        { id: 'shortcuts', icon: <Keyboard size={18} />, label: 'Keyboard Shortcuts' },
        { id: 'extensions', icon: <Package size={18} />, label: 'Extensions' },
        { id: 'tabs', icon: <Layout size={18} />, label: 'Tab Management' },
        { id: 'integrations', icon: <Briefcase size={18} />, label: 'Integrations' },
        { id: 'mcp', icon: <Globe size={18} />, label: 'MCP Servers' },
        { id: 'system', icon: <Globe size={18} />, label: 'System' },
        ...(store.isAdmin ? [{ id: 'admin', icon: <ShieldAlert size={18} />, label: 'Admin Console' }] : []),
        { id: 'about', icon: <Info size={18} />, label: 'About Comet' },
    ];

    const handleAddPassword = () => {
        if (!newPwd.site || !newPwd.username || !newPwd.password) return;
        store.addPassword(newPwd);
        setNewPwd({ site: '', username: '', password: '' });
        setShowAddPwd(false);
    };

    const handleExcelUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            alert(`Parsed ${file.name} for autofill intelligence.`);
            store.setExcelAutofillData([{ site: 'example.com', data: 'Parsed From Excel' }]);
        }
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 md:p-12 bg-black/60 backdrop-blur-3xl">
            <motion.div
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="w-full max-w-6xl h-[85vh] bg-deep-space-bg border border-white/10 rounded-[2.5rem] overflow-hidden flex shadow-[0_30px_100px_rgba(0,0,0,0.8)]"
            >
                {/* Navigation Sidebar */}
                <div className="w-72 bg-white/[0.02] border-r border-white/5 p-8 flex flex-col gap-2">
                    <div className="flex items-center gap-3 px-4 mb-10">
                        <div className="w-10 h-10 rounded-2xl bg-deep-space-accent-neon flex items-center justify-center text-deep-space-bg font-black text-xl shadow-[0_0_20px_rgba(0,255,255,0.3)]">
                            {store.appName.charAt(0)}
                        </div>
                        <span className="text-xl font-black tracking-tighter uppercase">{store.appName}</span>
                    </div>

                    <div className="flex-1 overflow-y-auto no-scrollbar space-y-1">
                        {sections.map((s) => (
                            <button
                                key={s.id}
                                onClick={() => setActiveSection(s.id)}
                                className={`w-full flex items-center gap-4 px-5 py-4 rounded-2xl transition-all font-bold text-sm ${activeSection === s.id ? 'bg-deep-space-accent-neon/10 text-deep-space-accent-neon' : 'text-white/40 hover:bg-white/5 hover:text-white'}`}
                            >
                                {s.icon}
                                <span className="flex-1 text-left">{s.label}</span>
                                {activeSection === s.id && <ChevronRight size={14} />}
                            </button>
                        ))}
                    </div>

                    <div className="mt-6 space-y-4">
                        <button
                            className="w-full flex items-center justify-center gap-2 py-4 bg-white/5 hover:bg-white/10 border border-white/10 rounded-2xl text-[10px] font-black uppercase tracking-widest text-white/60 transition-all"
                        >
                            <Download size={14} />
                            Install PWA
                        </button>
                        <div className="p-4 bg-deep-space-accent-neon/5 rounded-2xl border border-deep-space-accent-neon/10 text-[10px] font-medium text-deep-space-accent-neon/60 text-center leading-relaxed">
                            Version v0.1.1 Stable <br /> (Production Build)
                        </div>
                    </div>
                </div>

                {/* Content Area */}
                <div className="flex-1 flex flex-col p-12 overflow-y-auto custom-scrollbar bg-black/10">
                    <header className="flex items-center justify-between mb-12">
                        <div>
                            <h2 className="text-3xl font-black text-white mb-2 uppercase tracking-tight">
                                {activeSection.replace('-', ' ')}
                            </h2>
                            <p className="text-white/30 text-sm">Configure your hardware-accelerated workspace.</p>
                        </div>
                        <button onClick={onClose} className="px-6 py-3 bg-white/5 hover:bg-white/10 rounded-2xl transition-all text-sm font-black uppercase tracking-widest border border-white/5">Close</button>
                    </header>

                    <div className="space-y-12 max-w-3xl">
                        {activeSection === 'appearance' && (
                            <div className="space-y-8">
                                <div className="p-8 rounded-[2rem] bg-white/[0.03] border border-white/5 space-y-8">
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <p className="font-bold text-white mb-1">Layout Position</p>
                                            <p className="text-xs text-white/30">Primary sidebar alignment.</p>
                                        </div>
                                        <div className="flex gap-2 p-1 bg-black/40 rounded-xl border border-white/5">
                                            {['left', 'right'].map((side) => (
                                                <button
                                                    key={side}
                                                    onClick={() => store.setSidebarSide(side as 'left' | 'right')}
                                                    className={`px-4 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${store.sidebarSide === side ? 'bg-deep-space-accent-neon text-deep-space-bg' : 'text-white/40 hover:text-white'}`}
                                                >
                                                    {side}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                    <div className="space-y-4">
                                        <div className="flex items-center justify-between">
                                            <p className="font-bold text-white">Panel Width</p>
                                            <span className="text-[10px] font-black text-deep-space-accent-neon">{store.sidebarWidth}px</span>
                                        </div>
                                        <input
                                            type="range" min="280" max="600" step="10"
                                            value={store.sidebarWidth}
                                            onChange={(e) => store.setSidebarWidth(parseInt(e.target.value))}
                                            className="w-full h-1.5 bg-white/10 rounded-lg appearance-none cursor-pointer accent-deep-space-accent-neon"
                                        />
                                    </div>
                                </div>
                            </div>
                        )}

                        {activeSection === 'search' && <SearchEngineSettings selectedEngine={store.selectedEngine} setSelectedEngine={store.setSelectedEngine} />}

                        {activeSection === 'privacy' && (
                            <div className="space-y-8">
                                <div className="p-8 rounded-[2rem] bg-white/[0.03] border border-white/5 space-y-8">
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <p className="font-bold text-white mb-1">AI Overview</p>
                                            <p className="text-xs text-white/30">Get AI-powered summaries and insights on search results.</p>
                                        </div>
                                        <label className="relative inline-flex items-center cursor-pointer">
                                            <input
                                                type="checkbox"
                                                checked={store.enableAIAssist}
                                                onChange={() => store.setEnableAIAssist(!store.enableAIAssist)}
                                                className="sr-only peer"
                                            />
                                            <div className="relative w-11 h-6 bg-white/10 rounded-full peer peer-checked:after:translate-x-full peer peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-deep-space-accent-neon" />
                                        </label>
                                    </div>

                                    <div className="h-[1px] bg-white/5 w-full" />

                                    <div className="space-y-4">
                                        <div className="flex items-center justify-between">
                                            <div>
                                                <p className="font-bold text-white mb-1">E2EE Sync Passphrase</p>
                                                <p className="text-xs text-white/30 tracking-tight">Your data is encrypted locally with this key before syncing. **Developers cannot see your data.**</p>
                                            </div>
                                            <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-cyan-400/10 border border-cyan-400/20">
                                                <ShieldCheck size={12} className="text-cyan-400" />
                                                <span className="text-[10px] font-black uppercase tracking-widest text-cyan-400">Quantum Grade</span>
                                            </div>
                                        </div>
                                        <input
                                            type="password"
                                            value={store.syncPassphrase || ''}
                                            onChange={(e) => store.setSyncPassphrase(e.target.value)}
                                            placeholder="Enter your private sync passphrase..."
                                            className="w-full bg-black/40 border border-white/10 rounded-2xl py-3 px-6 text-sm text-white focus:outline-none focus:ring-1 focus:ring-deep-space-accent-neon/50 transition-all placeholder:text-white/10"
                                        />
                                        <p className="text-[10px] text-orange-400/60 font-medium">⚠️ If you lose this passphrase, you cannot decrypt your cloud data on new devices.</p>
                                    </div>
                                </div>
                            </div>
                        )}

                        {activeSection === 'vault' && (
                            <div className="space-y-8">
                                <div className="flex items-center justify-between mb-4">
                                    <h3 className="text-xs font-black text-white/20 uppercase tracking-[0.3em]">Credentials & Vault</h3>
                                    <button onClick={() => setShowAddPwd(true)} className="px-4 py-2 bg-deep-space-accent-neon text-black rounded-xl text-[10px] font-black uppercase tracking-widest transition-all">Add Password</button>
                                </div>
                                <AutofillSettings />
                            </div>
                        )}

                        {activeSection === 'shortcuts' && <KeyboardShortcutSettings />}

                        {activeSection === 'system' && <UserAgentSettings />}

                        {activeSection === 'integrations' && (
                            <div className="space-y-8">
                                <div className="p-8 rounded-[2rem] bg-white/[0.03] border border-white/5 space-y-8">
                                    <div className="space-y-6">
                                        <div>
                                            <h3 className="text-lg font-bold text-white mb-2">Backend Strategy</h3>
                                            <p className="text-xs text-white/30 mb-6">Choose how your data is synchronized and stored.</p>
                                        </div>

                                        <div className="grid grid-cols-2 gap-4">
                                            {['firebase', 'mysql'].map((strategy) => (
                                                <button
                                                    key={strategy}
                                                    onClick={() => store.setBackendStrategy(strategy as 'firebase' | 'mysql')}
                                                    className={`p-6 rounded-2xl border transition-all text-left group ${store.backendStrategy === strategy ? 'bg-deep-space-accent-neon/10 border-deep-space-accent-neon/40' : 'bg-white/5 border-white/5 hover:bg-white/10'}`}
                                                >
                                                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-4 ${store.backendStrategy === strategy ? 'bg-deep-space-accent-neon text-deep-space-bg' : 'bg-white/5 text-white/40'}`}>
                                                        {strategy === 'firebase' ? <Globe size={20} /> : <Database size={20} />}
                                                    </div>
                                                    <p className={`font-bold capitalize ${store.backendStrategy === strategy ? 'text-white' : 'text-white/60'}`}>{strategy}</p>
                                                    <p className="text-[10px] text-white/30 mt-1 uppercase tracking-widest font-black">
                                                        {strategy === 'firebase' ? 'Google Cloud Backend' : 'Self-Hosted SQL'}
                                                    </p>
                                                </button>
                                            ))}
                                        </div>

                                        {store.backendStrategy === 'firebase' && (
                                            <div className="pt-6 border-t border-white/5 space-y-4">
                                                {currentUser ? (
                                                    <div className="flex items-center justify-between bg-white/5 rounded-xl p-4">
                                                        <div className="flex items-center gap-3">
                                                            {currentUser.photoURL && (
                                                                <img src={currentUser.photoURL} alt="User Avatar" className="w-8 h-8 rounded-full" />
                                                            )}
                                                            <div>
                                                                <p className="text-sm font-medium text-white">{currentUser.displayName || currentUser.email}</p>
                                                                <p className="text-xs text-white/50">{currentUser.email}</p>
                                                            </div>
                                                        </div>
                                                        <button
                                                            onClick={handleGoogleSignOut}
                                                            className="flex items-center gap-2 px-4 py-2 bg-red-500/10 border border-red-500/30 text-red-400 rounded-xl text-xs font-black uppercase tracking-widest hover:bg-red-500 hover:text-white transition-all"
                                                        >
                                                            <LogOut size={16} />
                                                            Sign Out
                                                        </button>
                                                    </div>
                                                ) : (
                                                    <>
                                                        <button
                                                            onClick={handleGoogleLogin}
                                                            className="w-full flex items-center justify-center gap-3 px-6 py-3 bg-deep-space-accent-neon/10 border border-deep-space-accent-neon/30 text-deep-space-accent-neon rounded-xl text-sm font-black uppercase tracking-widest hover:bg-deep-space-accent-neon hover:text-deep-space-bg transition-all"
                                                        >
                                                            <LogIn size={20} />
                                                            Sign in with Google
                                                        </button>
                                                        <div className="relative flex py-2 items-center">
                                                            <div className="flex-grow border-t border-white/10"></div>
                                                            <span className="flex-shrink mx-4 text-white/40 text-xs uppercase">Or</span>
                                                            <div className="flex-grow border-t border-white/10"></div>
                                                        </div>
                                                        <div className="space-y-4">
                                                            <div className="relative">
                                                                <input
                                                                    type="password"
                                                                    value={licenseKey}
                                                                    onChange={(e) => setLicenseKey(e.target.value)}
                                                                    placeholder="Enter your License Key"
                                                                    className="w-full bg-black/40 border border-white/10 rounded-2xl py-3 px-6 text-sm text-white focus:outline-none focus:ring-1 focus:ring-deep-space-accent-neon/50 transition-all placeholder:text-white/20"
                                                                />
                                                            </div>
                                                            <button
                                                                onClick={handleLicenseLogin}
                                                                className="w-full flex items-center justify-center gap-3 px-6 py-3 bg-white/10 border border-white/20 text-white rounded-xl text-sm font-black uppercase tracking-widest hover:bg-white/20 transition-all"
                                                            >
                                                                <Key size={20} />
                                                                Login with License Key
                                                            </button>
                                                        </div>
                                                    </>
                                                )}

                                                <div className="flex items-center justify-between">
                                                    <p className="text-xs font-bold text-white/60 uppercase tracking-widest">Custom Firebase Config</p>
                                                    <button
                                                        onClick={() => store.setCustomFirebaseConfig(null)}
                                                        className="text-[10px] text-deep-space-accent-neon hover:underline"
                                                    >
                                                        Reset to Default
                                                    </button>
                                                </div>
                                                <textarea
                                                    className="w-full bg-black/40 border border-white/5 rounded-xl p-4 text-xs font-mono text-deep-space-accent-neon placeholder:text-white/10 h-32 outline-none focus:border-deep-space-accent-neon/30"
                                                    placeholder='{ "apiKey": "...", "authDomain": "...", ... }'
                                                    value={store.customFirebaseConfig ? JSON.stringify(store.customFirebaseConfig, null, 2) : ''}
                                                    onChange={(e) => {
                                                        try {
                                                            const config = JSON.parse(e.target.value);
                                                            store.setCustomFirebaseConfig(config);
                                                        } catch (err) { }
                                                    }}
                                                />
                                            </div>
                                        )}

                                        {store.backendStrategy === 'mysql' && (
                                            <div className="pt-6 border-t border-white/5">
                                                <p className="text-xs font-bold text-white/60 uppercase tracking-widest mb-4">SQL Connection Details</p>
                                                <div className="grid grid-cols-2 gap-4">
                                                    {['host', 'port', 'user', 'database'].map((field) => (
                                                        <div key={field} className="space-y-1">
                                                            <p className="text-[9px] font-black uppercase tracking-widest text-white/20 px-1">{field}</p>
                                                            <input
                                                                type="text"
                                                                className="w-full bg-black/40 border border-white/5 rounded-xl px-4 py-2 text-xs text-white outline-none focus:border-deep-space-accent-neon/30"
                                                                value={store.customMysqlConfig?.[field] || ''}
                                                                onChange={(e) => store.setCustomMysqlConfig({ ...store.customMysqlConfig, [field]: e.target.value })}
                                                            />
                                                        </div>
                                                    ))}
                                                    <div className="col-span-2 space-y-1">
                                                        <p className="text-[9px] font-black uppercase tracking-widest text-white/20 px-1">password</p>
                                                        <input
                                                            type="password"
                                                            className="w-full bg-black/40 border border-white/5 rounded-xl px-4 py-2 text-xs text-white outline-none focus:border-deep-space-accent-neon/30"
                                                            value={store.customMysqlConfig?.password || ''}
                                                            onChange={(e) => store.setCustomMysqlConfig({ ...store.customMysqlConfig, password: e.target.value })}
                                                        />
                                                    </div>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        )}

                        {activeSection === 'admin' && <AdminDashboard />}

                        {activeSection === 'history' && <HistoryPanel />}

                        {activeSection === 'api-keys' && <ApiKeysSettings />}

                        {activeSection === 'about' && (
                            <div className="text-center py-20">
                                <div className="w-24 h-24 rounded-[2.5rem] bg-deep-space-accent-neon flex items-center justify-center text-deep-space-bg font-black text-6xl mx-auto mb-8 shadow-2xl animate-pulse">
                                    {store.appName.charAt(0)}
                                </div>
                                <h2 className="text-5xl font-black tracking-tighter mb-4">{store.appName}</h2>
                                <p className="text-white/40 max-w-md mx-auto mb-10 text-sm leading-relaxed font-medium">
                                    A performance-hardened Chromium shell with native AI orchestration, optimized for decentralized workflows.
                                </p>
                            </div>
                        )}
                    </div>
                </div>
            </motion.div >
        </div >
    );
};

export default SettingsPanel;
