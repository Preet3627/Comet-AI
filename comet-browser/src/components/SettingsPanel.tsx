"use client";

import React, { useState, useEffect } from 'react';
import Image from 'next/image';
import { useAppStore } from '@/store/useAppStore';
import {
    Monitor, Shield, Globe, Info, Download,
    ChevronRight, ShieldCheck, Key, Package, Keyboard,
    Briefcase, ShieldAlert, Database, LogIn, LogOut, History as HistoryIcon, User as UserIcon, Zap, RefreshCw, Languages
} from 'lucide-react';
import { motion } from 'framer-motion';
import SearchEngineSettings from './SearchEngineSettings';
import KeyboardShortcutSettings from './KeyboardShortcutSettings';
import UserAgentSettings from './UserAgentSettings';
import AutofillSettings from './AutofillSettings';
import AdminDashboard from './AdminDashboard';
import HistoryPanel from './HistoryPanel';
import ApiKeysSettings from './ApiKeysSettings';
import PerformanceSettings from './PerformanceSettings';
import LoginPrompt from './LoginPrompt';
import firebaseService from '@/lib/FirebaseService';
import { User } from 'firebase/auth';
import SyncSettings from './SyncSettings'; // Import the new SyncSettings component
import { firebaseConfigStorage } from '@/lib/firebaseConfigStorage';
import ExtensionSettings from './ExtensionSettings';

const SettingsPanel = ({ onClose, defaultSection = 'profile' }: { onClose: () => void, defaultSection?: string }) => {
    const store = useAppStore();
    const setUser = useAppStore((state) => state.setUser);
    const fetchHistory = useAppStore((state) => state.fetchHistory);
    const [activeSection, setActiveSection] = React.useState(defaultSection);
    const [currentUser, setCurrentUser] = useState<User | null>(null);
    const [licenseKey, setLicenseKey] = useState("");
    const { isGuestMode, setGuestMode } = useAppStore();

    useEffect(() => {
        // Listen for auth state changes to update the UI
        const unsubscribe = firebaseService.onAuthStateChanged((user) => {
            setCurrentUser(user);
            setUser(user ? { uid: user.uid, email: user.email || '', displayName: user.displayName || '', photoURL: user.photoURL || '' } : null);
            if (user) {
                fetchHistory();
            }
        });

        // Handle the redirect result when the component mounts
        firebaseService.handleRedirectResult()
            .then(user => {
                if (user) {
                    setCurrentUser(user);
                    setUser({ uid: user.uid, email: user.email || '', displayName: user.displayName || '', photoURL: user.photoURL || '' });
                    fetchHistory();
                }
            })
            .catch(err => console.error("Firebase redirect result error:", err));

        return () => {
            unsubscribe();
        };
    }, [setUser, fetchHistory]);

    const handleGoogleLogin = async () => {
        if (window.electronAPI) {
            const authUrl = `https://browser.ponsrischool.in/auth?client_id=desktop-app&redirect_uri=comet-browser%3A%2F%2Fauth&firebase_config=${btoa(JSON.stringify(firebaseConfigStorage.load() || {}))}`;
            window.electronAPI.openAuthWindow(authUrl);
        } else {
            const url = `https://browser.ponsrischool.in/auth?client_id=web-app&redirect_uri=${encodeURIComponent(window.location.origin + '/auth')}`;
            window.open(url, "_blank");
        }
    };

    const handleGuestMode = () => {
        setGuestMode(true);
        onClose();
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
            store.logout();
            console.log('Signed out from Firebase');
        } catch (error) {
            console.error('Error signing out:', error);
        }
    };

    const sections = [
        { id: 'profile', icon: <UserIcon size={18} />, label: 'Neural Identity' },
        { id: 'appearance', icon: <Monitor size={18} />, label: 'Appearance' },
        { id: 'performance', icon: <Zap size={18} />, label: 'Performance' },
        { id: 'search', icon: <Globe size={18} />, label: 'Search Engine' },
        { id: 'privacy', icon: <Shield size={18} />, label: 'Privacy & Security' },
        { id: 'vault', icon: <Key size={18} />, label: 'Vault & Autofill' },
        { id: 'history', icon: <HistoryIcon size={18} />, label: 'History' },
        { id: 'api-keys', icon: <Key size={18} />, label: 'API Keys' },
        { id: 'languages', icon: <Languages size={18} />, label: 'Regional Languages' },
        { id: 'shortcuts', icon: <Keyboard size={18} />, label: 'Keyboard Shortcuts' },
        { id: 'sync', icon: <RefreshCw size={18} />, label: 'Sync' },
        { id: 'extensions', icon: <Package size={18} />, label: 'Extensions' },
        { id: 'tabs', icon: <Monitor size={18} />, label: 'Tab Management' },
        { id: 'integrations', icon: <Briefcase size={18} />, label: 'Integrations' },
        { id: 'mcp', icon: <Globe size={18} />, label: 'MCP Servers' },
        { id: 'system', icon: <Globe size={18} />, label: 'System' },
        ...(store.isAdmin ? [{ id: 'admin', icon: <ShieldAlert size={18} />, label: 'Admin Console' }] : []),
        { id: 'about', icon: <Info size={18} />, label: 'About Comet' },
    ];

    return (
        <div className="fixed inset-0 z-[1500] flex items-center justify-center p-4 md:p-12 bg-black/60 backdrop-blur-3xl no-drag-region">
            <motion.div
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="w-full max-w-6xl h-[85vh] bg-[#020205] border border-white/5 rounded-[2.5rem] overflow-hidden flex shadow-[0_30px_100px_rgba(0,0,0,0.8)] no-drag-region"
            >
                {/* Navigation Sidebar */}
                <div className="w-72 bg-white/[0.01] border-r border-white/5 p-8 flex flex-col gap-2">
                    <div className="flex items-center gap-4 px-4 mb-10">
                        <img src="/icon.ico" alt="Comet" className="w-10 h-10 object-contain drop-shadow-[0_0_10px_rgba(56,189,248,0.5)]" />
                        <span className="text-xl font-black tracking-tighter uppercase text-white">COMET</span>
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
                            Version v0.1.6 Stable <br /> (Production Build)
                        </div>
                    </div>
                </div>

                {/* Content Area */}
                <div className="flex-1 flex flex-col p-12 overflow-y-auto custom-scrollbar bg-black/10">
                    <header className="flex items-center justify-between mb-12 no-drag-region">
                        <div>
                            <h2 className="text-3xl font-black text-white mb-2 uppercase tracking-tight">
                                {activeSection.replace('-', ' ')}
                            </h2>
                            <p className="text-white/30 text-sm">Configure your hardware-accelerated workspace.</p>
                        </div>
                        <button onClick={onClose} className="px-6 py-3 bg-white/5 hover:bg-white/10 rounded-2xl transition-all text-sm font-black uppercase tracking-widest border border-white/5 no-drag-region">Close</button>
                    </header>

                    <div className="space-y-12 max-w-3xl">
                        {activeSection === 'profile' && (
                            <div className="space-y-10">
                                <div className="p-10 rounded-[2.5rem] bg-white/[0.02] border border-white/5 relative overflow-hidden group">
                                    <div className="absolute inset-0 bg-deep-space-accent-neon/5 opacity-0 group-hover:opacity-100 transition-opacity" />
                                    <div className="flex items-center gap-8 relative z-10">
                                        <div className="relative">
                                            {store.user?.photoURL ? (
                                                <Image src={store.user.photoURL} alt="Profile" width={64} height={64} className="rounded-full border-2 border-deep-space-accent-neon/20 shadow-2xl" />
                                            ) : (
                                                <div className="w-[64px] h-[64px] rounded-full bg-white/5 border-2 border-white/10 flex items-center justify-center text-white/20">
                                                    <UserIcon size={24} />
                                                </div>
                                            )}
                                            <div className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-deep-space-accent-neon flex items-center justify-center text-black border-2 border-[#020205]">
                                                <ShieldCheck size={12} />
                                            </div>
                                        </div>
                                        <div className="flex-1">
                                            <h3 className="text-3xl font-black text-white mb-2 uppercase tracking-tight">
                                                {store.user?.displayName || (isGuestMode ? 'Guest Mode Account' : 'Anonymous Entity')}
                                            </h3>
                                            <p className="text-secondary-text font-medium mb-6">
                                                {store.user?.email || 'Unauthorized Local Session'}
                                            </p>
                                            <div className="flex gap-3">
                                                {store.user ? (
                                                    <button onClick={handleGoogleSignOut} className="btn-vibrant-secondary px-6 no-drag-region">Terminate session</button>
                                                ) : (
                                                    <button onClick={handleGoogleLogin} className="btn-vibrant-primary px-8 no-drag-region">Authorize via Google</button>
                                                )}
                                                {isGuestMode && !store.user && (
                                                    <div className="px-6 py-2.5 bg-white/5 border border-white/10 text-white/40 rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center gap-2">
                                                        <Zap size={12} /> Guest Mode Enabled
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-6">
                                    <div className="p-8 rounded-[2rem] bg-white/[0.01] border border-white/5">
                                        <p className="text-[10px] font-black text-white/20 uppercase tracking-widest mb-4">Cloud Status</p>
                                        <div className="flex items-center gap-3">
                                            <div className={`w-3 h-3 rounded-full ${store.user ? 'bg-deep-space-accent-neon animate-pulse shadow-[0_0_10px_#38bdf8]' : 'bg-red-500'}`} />
                                            <span className="text-sm font-bold text-white">{store.user ? 'Synchronized with Comet Cloud' : 'Isolated Local Session'}</span>
                                        </div>
                                    </div>
                                    <div className="p-8 rounded-[2rem] bg-white/[0.01] border border-white/5">
                                        <p className="text-[10px] font-black text-white/20 uppercase tracking-widest mb-4">Workspace Tier</p>
                                        <div className="flex items-center gap-3 text-white">
                                            <Zap size={16} className="text-amber-400" />
                                            <span className="text-sm font-bold">Foundation (Alpha 0.1.6)</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}

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
                                                    className={`px-4 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${store.sidebarSide === side ? 'bg-deep-space-accent-neon text-deep-space-bg shadow-[0_0_15px_#38bdf8]' : 'text-white/40 hover:text-white'}`}
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
                                            aria-label="Panel Width"
                                        />
                                    </div>
                                </div>
                            </div>
                        )}

                        {activeSection === 'performance' && <PerformanceSettings />}

                        {activeSection === 'search' && <SearchEngineSettings selectedEngine={store.selectedEngine} setSelectedEngine={store.setSelectedEngine} />}

                        {activeSection === 'privacy' && (
                            <div className="space-y-8">
                                <div className="p-8 rounded-[2rem] bg-white/[0.03] border border-white/5 space-y-8">
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <p className="font-bold text-white mb-1">AI Overview</p>
                                            <p className="text-xs text-white/30 mb-6">Get AI-powered summaries and insights on search results.</p>
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

                                    <div className="flex items-center justify-between">
                                        <div>
                                            <p className="font-bold text-white mb-1">Ad Blocker</p>
                                            <p className="text-xs text-white/30">Enable high-performance ad and tracker blocking.</p>
                                        </div>
                                        <label className="relative inline-flex items-center cursor-pointer">
                                            <input
                                                type="checkbox"
                                                checked={store.enableAdblocker}
                                                onChange={() => store.setEnableAdblocker(!store.enableAdblocker)}
                                                className="sr-only peer"
                                            />
                                            <div className="relative w-11 h-6 bg-white/10 rounded-full peer peer-checked:after:translate-x-full peer peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-deep-space-accent-neon" />
                                        </label>
                                    </div>

                                    <div className="flex items-center justify-between">
                                        <div>
                                            <p className="font-bold text-white mb-1">Privacy Permission Prompt</p>
                                            <p className="text-xs text-white/30">Ask for permission before AI reads current page content.</p>
                                        </div>
                                        <label className="relative inline-flex items-center cursor-pointer">
                                            <input
                                                type="checkbox"
                                                checked={store.askForAiPermission}
                                                onChange={() => store.setAskForAiPermission(!store.askForAiPermission)}
                                                className="sr-only peer"
                                            />
                                            <div className="relative w-11 h-6 bg-white/10 rounded-full peer peer-checked:after:translate-x-full peer peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-deep-space-accent-neon" />
                                        </label>
                                    </div>

                                    <div className="flex items-center justify-between">
                                        <div>
                                            <p className="font-bold text-white mb-1">Intelligence Disclaimer Prompt</p>
                                            <p className="text-xs text-white/30">Show a one-time reminder that AI results should be verified.</p>
                                        </div>
                                        <label className="relative inline-flex items-center cursor-pointer">
                                            <input
                                                type="checkbox"
                                                checked={!store.hasSeenAiMistakeWarning}
                                                onChange={() => store.setHasSeenAiMistakeWarning(!store.hasSeenAiMistakeWarning)}
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
                                            disabled={isGuestMode}
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
                                    <button className="px-4 py-2 bg-deep-space-accent-neon text-black rounded-xl text-[10px] font-black uppercase tracking-widest transition-all">Add Password</button>
                                </div>
                                <AutofillSettings />
                            </div>
                        )}

                        {activeSection === 'history' && <HistoryPanel />}

                        {activeSection === 'shortcuts' && <KeyboardShortcutSettings />}

                        {activeSection === 'sync' && (<SyncSettings onClose={onClose} />)}

                        {activeSection === 'languages' && (
                            <div className="space-y-8">
                                <div className="p-8 rounded-[2rem] bg-white/[0.03] border border-white/5 space-y-8">
                                    <div>
                                        <h3 className="text-lg font-bold text-white mb-2">Regional Language Support</h3>
                                        <p className="text-xs text-white/30 mb-8">Select your preferred Indian regional language for browser interface and AI interaction.</p>

                                        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                                            {store.availableLanguages.map((lang) => {
                                                const names: Record<string, string> = {
                                                    en: 'English', hi: 'Hindi (हिन्दी)', bn: 'Bengali (বাংলা)', te: 'Telugu (తెలుగు)',
                                                    mr: 'Marathi (मराठी)', ta: 'Tamil (தமிழ்)', gu: 'Gujarati (ગુજરાતી)', ur: 'Urdu (اردو)',
                                                    kn: 'Kannada (ಕನ್ನಡ)', or: 'Odia (ଓଡ଼ିଆ)', ml: 'Malayalam (മലയാളം)', pa: 'Punjabi (ਪੰਜਾਬੀ)',
                                                    as: 'Assamese (অসমীয়া)', mai: 'Maithili (मैथिली)', sat: 'Santali (संताली)', ks: 'Kashmiri (کأشُر)',
                                                    ne: 'Nepali (नेपाली)', kok: 'Konkani (कोंकणी)', sd: 'Sindhi (سنڌي)', doi: 'Dogri (डोगरी)',
                                                    mni: 'Manipuri (মৈতৈলোন)', sa: 'Sanskrit (संस्कृतम्)', brx: 'Bodo (बड़ो)',
                                                    es: 'Spanish (Español)', fr: 'French (Français)', de: 'German (Deutsch)',
                                                    ja: 'Japanese (日本語)', zh: 'Chinese (中文)', ru: 'Russian (Русский)',
                                                    pt: 'Portuguese (Português)', it: 'Italian (Italiano)', ko: 'Korean (한국어)',
                                                    ar: 'Arabic (العربية)', tr: 'Turkish (Türkçe)', vi: 'Vietnamese (Tiếng Việt)',
                                                    th: 'Thai (ไทย)', nl: 'Dutch (Nederlands)', pl: 'Polish (Polski)'
                                                };
                                                return (
                                                    <button
                                                        key={lang}
                                                        onClick={() => store.setSelectedLanguage(lang)}
                                                        className={`p-4 rounded-2xl border transition-all text-left ${store.selectedLanguage === lang ? 'bg-deep-space-accent-neon/10 border-deep-space-accent-neon/40 text-deep-space-accent-neon' : 'bg-white/5 border-white/5 hover:bg-white/10 text-white/60'}`}
                                                    >
                                                        <p className="text-sm font-bold">{names[lang] || lang}</p>
                                                        <p className="text-[10px] opacity-40 uppercase font-black tracking-widest mt-1">{lang}</p>
                                                    </button>
                                                );
                                            })}
                                        </div>
                                    </div>

                                    <div className="p-6 bg-deep-space-accent-neon/5 rounded-2xl border border-deep-space-accent-neon/10 flex items-center gap-4">
                                        <Languages size={24} className="text-deep-space-accent-neon" />
                                        <div className="flex-1">
                                            <p className="text-xs font-bold text-white">AI Neural Translation</p>
                                            <p className="text-[10px] text-white/40">The browser will now prioritize {store.selectedLanguage} for real-time web translation and neural insights.</p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}

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
                                                    disabled={isGuestMode}
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
                                                {currentUser && !isGuestMode ? (
                                                    <div className="flex items-center justify-between bg-white/5 rounded-xl p-4">
                                                        <div className="flex items-center gap-3">
                                                            {currentUser.photoURL && (
                                                                <Image src={currentUser.photoURL} alt="User Avatar" width={32} height={32} className="rounded-full" />
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
                                                    <LoginPrompt onLogin={handleGoogleLogin} />
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
                                                        } catch { }
                                                    }}
                                                    disabled={isGuestMode}
                                                />
                                            </div>
                                        )}

                                        {store.backendStrategy === 'mysql' && (
                                            <div className="pt-6 border-t border-white/5">
                                                <p className="text-xs font-bold text-white/60 uppercase tracking-widest mb-4">SQL Connection Details</p>
                                                <div className="grid grid-cols-2 gap-4">
                                                    {['host', 'port', 'user', 'database'].map((field) => (
                                                        <div key={field} className="space-y-1">
                                                            <label htmlFor={field} className="text-[9px] font-black uppercase tracking-widest text-white/20 px-1">{field}</label>
                                                            <input
                                                                id={field}
                                                                type="text"
                                                                placeholder={`Enter ${field}`}
                                                                className="w-full bg-black/40 border border-white/5 rounded-xl px-4 py-2 text-xs text-white outline-none focus:border-deep-space-accent-neon/30"
                                                                value={store.customMysqlConfig?.[field] || ''}
                                                                onChange={(e) => store.setCustomMysqlConfig({ ...store.customMysqlConfig, [field]: e.target.value })}
                                                                disabled={isGuestMode}
                                                            />
                                                        </div>
                                                    ))}
                                                    <div className="col-span-2 space-y-1">
                                                        <p className="text-[9px] font-black uppercase tracking-widest text-white/20 px-1">password</p>
                                                        <input
                                                            type="password"
                                                            placeholder="Enter database password"
                                                            className="w-full bg-black/40 border border-white/5 rounded-xl px-4 py-2 text-xs text-white outline-none focus:border-deep-space-accent-neon/30"
                                                            value={store.customMysqlConfig?.password || ''}
                                                            onChange={(e) => store.setCustomMysqlConfig({ ...store.customMysqlConfig, password: e.target.value })}
                                                            disabled={isGuestMode}
                                                        />
                                                    </div>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        )}

                        {activeSection === 'extensions' && (
                            <ExtensionSettings />
                        )}

                        {activeSection === 'tabs' && (
                            <div className="p-8 rounded-[2rem] bg-white/[0.03] border border-white/5 space-y-8">
                                <div className="text-center py-12">
                                    <Monitor size={48} className="mx-auto mb-4 text-white/20" />
                                    <p className="text-white/40">Tab management settings coming soon</p>
                                </div>
                            </div>
                        )}

                        {activeSection === 'mcp' && (
                            <div className="p-8 rounded-[2rem] bg-white/[0.03] border border-white/5 space-y-8">
                                <div className="text-center py-12">
                                    <Globe size={48} className="mx-auto mb-4 text-white/20" />
                                    <p className="text-white/40">MCP Servers configuration coming soon</p>

                                </div>
                            </div>
                        )}

                        {activeSection === 'admin' && <AdminDashboard />}

                        {activeSection === 'history' && <HistoryPanel />}

                        {activeSection === 'api-keys' && <ApiKeysSettings />}

                        {activeSection === 'about' && (
                            <div className="text-center py-20">
                                <img src="/icon.ico" alt="Comet Icon" className="w-24 h-24 mx-auto mb-8 shadow-2xl animate-pulse" />
                                <h2 className="text-5xl font-black tracking-tighter mb-4">{store.appName}</h2>
                                <p className="text-white/40 max-w-md mx-auto mb-10 text-sm leading-relaxed font-medium">
                                    A performance-hardened Chromium shell with native AI orchestration, optimized for decentralized workflows.
                                </p>
                            </div>
                        )}
                    </div>
                </div>
            </motion.div>
        </div>
    );
};

export default SettingsPanel;
