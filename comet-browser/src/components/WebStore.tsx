"use client";

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import extensionManager, { Extension } from '@/lib/extensions/ExtensionManager';
import { ShoppingBag, Star, Download, ShieldCheck, Zap } from 'lucide-react';

const WebStore = ({ onClose }: { onClose: () => void }) => {
    const [extensions, setExtensions] = useState<any[]>([]);

    useEffect(() => {
        if (window.electronAPI) {
            window.electronAPI.getExtensions().then(setExtensions);
        }
    }, []);

    const handleToggle = async (id: string) => {
        if (window.electronAPI) {
            await window.electronAPI.toggleExtension(id);
            const updated = await window.electronAPI.getExtensions();
            setExtensions(updated);
        }
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-8 bg-black/60 backdrop-blur-xl animate-in fade-in duration-300">
            <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="w-full max-w-5xl h-[80vh] bg-deep-space-bg border border-white/10 rounded-3xl overflow-hidden flex shadow-2xl"
            >
                {/* Sidebar */}
                <div className="w-64 border-r border-white/5 p-6 flex flex-col gap-6 glass-dark">
                    <div className="flex items-center gap-2 text-deep-space-accent-neon font-bold text-xl">
                        <ShoppingBag size={24} />
                        <span>Comet Store</span>
                    </div>
                    <nav className="space-y-2">
                        <button className="w-full text-left px-4 py-2 rounded-xl bg-white/5 text-white text-sm">All Extensions</button>
                        <button className="w-full text-left px-4 py-2 rounded-xl text-white/40 hover:bg-white/5 hover:text-white transition-colors text-sm font-medium">Themes</button>
                        <button className="w-full text-left px-4 py-2 rounded-xl text-white/40 hover:bg-white/5 hover:text-white transition-colors text-sm font-medium">Developer tools</button>
                    </nav>
                    <div className="mt-auto p-4 bg-white/5 rounded-2xl">
                        <p className="text-[10px] text-white/30 uppercase font-bold tracking-widest mb-1">Your Account</p>
                        <p className="text-xs text-white/70">Dev User</p>
                    </div>
                </div>

                {/* Content */}
                <div className="flex-1 flex flex-col p-8 overflow-y-auto custom-scrollbar">
                    <header className="flex items-center justify-between mb-8">
                        <div>
                            <h2 className="text-2xl font-bold text-white mb-1">Extensions</h2>
                            <p className="text-white/40 text-sm">Enhance your productivity with powerful tools.</p>
                        </div>
                        <button onClick={onClose} className="px-4 py-2 bg-white/5 hover:bg-white/10 rounded-xl transition-all text-white/60">Close</button>
                    </header>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {extensions.map((ext) => (
                            <motion.div
                                whileHover={{ y: -4 }}
                                key={ext.id}
                                className="p-6 rounded-3xl glass-dark border border-white/5 flex gap-4 transition-all hover:border-white/10"
                            >
                                <div className="w-16 h-16 rounded-2xl bg-white/5 flex items-center justify-center text-3xl shadow-lg border border-white/10">
                                    {ext.icon}
                                </div>
                                <div className="flex-1">
                                    <div className="flex items-center justify-between mb-1">
                                        <h3 className="font-bold text-white leading-none">{ext.name}</h3>
                                        <div className="flex items-center text-[10px] text-yellow-500/80 gap-0.5">
                                            <Star size={10} fill="currentColor" />
                                            <span>{ext.id === 'adblock-elite' ? '4.9' : '4.7'}</span>
                                        </div>
                                    </div>
                                    <p className="text-xs text-white/40 mb-4 line-clamp-2">{ext.description}</p>
                                    <div className="flex items-center justify-between">
                                        <span className="text-[10px] font-bold text-white/20 uppercase tracking-widest">v{ext.version}</span>
                                        <button
                                            onClick={() => handleToggle(ext.id)}
                                            className={`px-4 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-widest transition-all ${ext.enabled
                                                ? 'bg-red-500/10 text-red-400 border border-red-500/20 hover:bg-red-500/20'
                                                : 'bg-deep-space-accent-neon text-deep-space-bg shadow-[0_0_15px_rgba(0,255,255,0.3)] hover:scale-105 active:scale-95'
                                                }`}
                                        >
                                            {ext.enabled ? 'Disable' : 'Install'}
                                        </button>
                                    </div>
                                </div>
                            </motion.div>
                        ))}
                    </div>

                    <div className="mt-12 p-8 rounded-3xl bg-gradient-to-br from-deep-space-primary/20 to-deep-space-secondary/20 border border-white/5">
                        <div className="flex items-center gap-3 mb-4">
                            <Zap className="text-deep-space-accent-neon" size={24} />
                            <h3 className="text-xl font-bold text-white">Create your own extension</h3>
                        </div>
                        <p className="text-sm text-white/60 mb-6 max-w-xl">Our extension API is built on modern React and Electron standards. You can build plugins that interact with the AI sidebar or the page content directly.</p>
                        <button className="px-6 py-2.5 bg-white text-black font-bold rounded-xl hover:bg-white/90 transition-all text-sm">Developer Documentation</button>
                    </div>
                </div>
            </motion.div>
        </div>
    );
};

export default WebStore;
