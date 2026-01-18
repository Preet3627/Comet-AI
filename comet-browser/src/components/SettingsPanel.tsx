"use client";

import React, { useState } from 'react';
import { useAppStore } from '@/store/useAppStore';
import {
    Settings as SettingsIcon, Monitor, Shield, Palette,
    Layout, Type, Globe, Info, Download, Pin,
    ChevronRight, Check, AlertCircle, Eye, EyeOff, ShieldCheck,
    Key, Package, FileSpreadsheet, Plus, X, Lock, ExternalLink, Keyboard, Briefcase, ShieldAlert
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';
import SearchEngineSettings from './SearchEngineSettings';
import KeyboardShortcutSettings from './KeyboardShortcutSettings';
import UserAgentSettings from './UserAgentSettings';
import ProxySettings from './ProxySettings';
import AutofillSettings from './AutofillSettings';
import AdminDashboard from './AdminDashboard';

const SettingsPanel = ({ onClose }: { onClose: () => void }) => {
    const store = useAppStore();
    const [activeSection, setActiveSection] = React.useState('appearance');
    const [showAddPwd, setShowAddPwd] = useState(false);
    const [newPwd, setNewPwd] = useState({ site: '', username: '', password: '' });

    const sections = [
        { id: 'appearance', icon: <Monitor size={18} />, label: 'Appearance' },
        { id: 'search', icon: <Globe size={18} />, label: 'Search Engine' },
        { id: 'privacy', icon: <Shield size={18} />, label: 'Privacy & Security' },
        { id: 'vault', icon: <Key size={18} />, label: 'Vault & Autofill' },
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
                            Version 0.5.2-alpha <br /> (Production Build)
                        </div>
                    </div>
                </div>

                {/* Content Area */}
                <div className="flex-1 flex flex-col p-12 overflow-y-auto custom-scrollbar bg-black/10">
                    <header className="flex items-center justify-between mb-12">
                        <div>
                            <h2 className="text-3xl font-black text-white mb-2 uppercase tracking-tight">
                                {activeSection === 'mcp' ? 'MCP Servers' : activeSection === 'admin' ? 'Admin Console' : activeSection.replace('-', ' ')}
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

                        {activeSection === 'admin' && <AdminDashboard />}

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
