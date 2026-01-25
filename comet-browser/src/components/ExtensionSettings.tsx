"use client";
import React, { useState, useEffect } from 'react';
import { Package, Trash2, ExternalLink, FolderOpen, RefreshCw, Plus, ShieldCheck } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface ExtensionMetadata {
    id: string;
    name: string;
    version: string;
    description: string;
    path: string;
}

const ExtensionSettings = () => {
    const [extensions, setExtensions] = useState<ExtensionMetadata[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const fetchExtensions = async () => {
        setLoading(true);
        setError(null);
        try {
            if (window.electronAPI) {
                const exts = await window.electronAPI.getExtensions();
                setExtensions(exts);
            }
        } catch (err) {
            setError("Failed to load extensions.");
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchExtensions();
    }, []);

    const handleUninstall = async (id: string) => {
        if (!confirm("Are you sure you want to uninstall this extension? This will delete its folder.")) return;
        try {
            const success = await window.electronAPI?.uninstallExtension(id);
            if (success) {
                setExtensions(extensions.filter(ext => ext.id !== id));
            }
        } catch (err) {
            console.error("Failed to uninstall extension:", err);
        }
    };

    const handleOpenDir = () => {
        window.electronAPI?.openExtensionDir();
    };

    const handleInstallPlugin = () => {
        // Open Chrome Web Store
        window.open('https://chromewebstore.google.com/', '_blank');
    };

    return (
        <div className="space-y-8">
            <div className="flex items-center justify-between">
                <div>
                    <h3 className="text-lg font-bold text-white mb-1">Extensions & Plugins</h3>
                    <p className="text-xs text-white/30">Enhance your browsing experience with local Chrome extensions.</p>
                </div>
                <div className="flex gap-2">
                    <button
                        onClick={handleOpenDir}
                        className="flex items-center gap-2 px-4 py-2 bg-white/5 hover:bg-white/10 border border-white/5 rounded-xl text-[10px] font-black uppercase tracking-widest text-white/60 transition-all"
                    >
                        <FolderOpen size={14} /> View Extensions Dir
                    </button>
                    <button
                        onClick={fetchExtensions}
                        className={`p-2 bg-white/5 hover:bg-white/10 border border-white/5 rounded-xl text-white/60 transition-all ${loading ? 'animate-spin' : ''}`}
                    >
                        <RefreshCw size={14} />
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <button
                    onClick={handleInstallPlugin}
                    className="p-6 rounded-3xl border-2 border-dashed border-white/5 hover:border-deep-space-accent-neon/30 hover:bg-deep-space-accent-neon/5 transition-all group flex flex-col items-center justify-center text-center gap-4"
                >
                    <div className="w-12 h-12 rounded-2xl bg-white/5 flex items-center justify-center text-white/20 group-hover:text-deep-space-accent-neon group-hover:bg-deep-space-accent-neon/10 transition-all">
                        <Plus size={24} />
                    </div>
                    <div>
                        <p className="font-bold text-white group-hover:text-deep-space-accent-neon transition-all text-sm">Install from Web Store</p>
                        <p className="text-[10px] text-white/20 uppercase font-black mt-1">Chrome Web Store Support</p>
                    </div>
                </button>

                <div className="p-6 rounded-3xl bg-white/[0.02] border border-white/5 space-y-3">
                    <div className="flex items-center gap-3 text-deep-space-accent-neon">
                        <ShieldCheck size={20} />
                        <span className="text-xs font-bold uppercase tracking-tight">Manual Sideloading</span>
                    </div>
                    <p className="text-[11px] text-white/40 leading-relaxed">
                        To install a local extension:
                        <br />1. Download the extension source folder.
                        <br />2. Open the <b>Extensions Dir</b> using the button above.
                        <br />3. Drop the folder containing <code className="text-deep-space-accent-light">manifest.json</code> inside.
                        <br />4. Restart Comet to activate.
                    </p>
                </div>
            </div>

            <div className="space-y-4">
                <h4 className="text-[10px] font-black uppercase tracking-[0.3em] text-white/20">Loaded Extensions ({extensions.length})</h4>

                {loading && extensions.length === 0 ? (
                    <div className="py-20 text-center text-white/20 animate-pulse">
                        <Package size={48} className="mx-auto mb-4" />
                        <p className="text-xs uppercase font-black tracking-widest">Scanning and verifying extensions...</p>
                    </div>
                ) : extensions.length === 0 ? (
                    <div className="py-20 text-center bg-white/[0.01] border border-dashed border-white/5 rounded-3xl">
                        <Package size={48} className="mx-auto mb-4 text-white/10" />
                        <p className="text-xs text-white/20">No external extensions loaded yet.</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 gap-3">
                        <AnimatePresence>
                            {extensions.map((ext) => (
                                <motion.div
                                    key={ext.id}
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, scale: 0.95 }}
                                    className="p-5 rounded-3xl bg-white/[0.03] border border-white/5 flex items-start gap-4 group"
                                >
                                    <div className="w-12 h-12 rounded-2xl bg-black/40 flex items-center justify-center text-deep-space-accent-neon shadow-2xl">
                                        <Package size={24} />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2 mb-1">
                                            <h5 className="font-bold text-white text-sm truncate">{ext.name}</h5>
                                            <span className="text-[9px] font-black bg-white/10 px-1.5 py-0.5 rounded text-white/40 uppercase">v{ext.version}</span>
                                        </div>
                                        <p className="text-[11px] text-white/40 line-clamp-2 leading-relaxed">{ext.description || 'No description provided.'}</p>
                                        <div className="mt-3 flex items-center gap-4">
                                            <p className="text-[9px] font-mono text-white/20 truncate max-w-[200px]">{ext.id}</p>
                                        </div>
                                    </div>
                                    <div className="flex flex-col gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <button
                                            onClick={() => handleUninstall(ext.id)}
                                            className="p-2.5 rounded-xl bg-red-500/10 text-red-500/60 hover:bg-red-500 hover:text-white transition-all shadow-lg"
                                            title="Uninstall Extension"
                                        >
                                            <Trash2 size={16} />
                                        </button>
                                    </div>
                                </motion.div>
                            ))}
                        </AnimatePresence>
                    </div>
                )}
            </div>
        </div>
    );
};

export default ExtensionSettings;
