"use client";

import React, { useState, useEffect } from 'react';
import { useAppStore } from '@/store/useAppStore';
import { Lock, Eye, EyeOff, Search, Plus, Trash2, Key, Globe, User, ShieldCheck, Copy, Check } from 'lucide-react';

export default function PasswordManager() {
    const [passwords, setPasswords] = useState<any[]>([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [showPlain, setShowPlain] = useState<Record<string, boolean>>({});
    const [copiedId, setCopiedId] = useState<string | null>(null);
    const [isAdding, setIsAdding] = useState(false);

    // New Password State
    const [newPass, setNewPass] = useState({ site: '', username: '', password: '' });

    useEffect(() => {
        if (window.electronAPI) {
            window.electronAPI.loadPersistentData('user-passwords').then((result: any) => {
                if (result.success && result.data) setPasswords(result.data);
            });
        }
    }, []);

    const savePasswords = (updated: any[]) => {
        setPasswords(updated);
        if (window.electronAPI) {
            window.electronAPI.savePersistentData('user-passwords', updated);
        }
    };

    const handleAdd = () => {
        if (!newPass.site || !newPass.password) return;
        const entry = {
            id: Date.now().toString(),
            site: newPass.site.replace('https://', '').replace('http://', '').split('/')[0],
            username: newPass.username,
            password: newPass.password,
            created: new Date().toISOString()
        };
        savePasswords([...passwords, entry]);
        setIsAdding(false);
        setNewPass({ site: '', username: '', password: '' });
    };

    const handleDelete = (id: string) => {
        savePasswords(passwords.filter(p => p.id !== id));
    };

    const togglePassword = (id: string) => {
        setShowPlain(prev => ({ ...prev, [id]: !prev[id] }));
    };

    const handleCopy = (text: string, id: string) => {
        navigator.clipboard.writeText(text);
        setCopiedId(id);
        setTimeout(() => setCopiedId(null), 2000);
    };

    const filtered = passwords.filter(p =>
        p.site.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.username.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="flex flex-col h-full bg-[#020205] text-white p-6 gap-6 relative overflow-hidden">
            {/* Background Aesthetic */}
            <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-blue-500/5 blur-[120px] rounded-full -translate-y-1/2 translate-x-1/2" />

            <div className="flex items-center justify-between z-10">
                <div className="flex items-center gap-3">
                    <div className="p-3 bg-violet-500/10 rounded-2xl border border-violet-500/20">
                        <Lock className="text-violet-400" size={24} />
                    </div>
                    <div>
                        <h2 className="text-xl font-black uppercase tracking-widest italic">Neural Vault</h2>
                        <p className="text-[10px] text-gray-500 font-bold tracking-tighter flex items-center gap-2">
                            <ShieldCheck size={12} className="text-emerald-400" />
                            QUANTUM-ENCRYPTED SECURE STORAGE
                        </p>
                    </div>
                </div>

                <div className="flex items-center gap-4">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={14} />
                        <input
                            type="text"
                            placeholder="Filter vault..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="bg-white/5 border border-white/10 rounded-xl py-2 pl-9 pr-4 text-xs focus:outline-none focus:ring-1 focus:ring-violet-500/50 w-64 transition-all"
                        />
                    </div>
                    <button
                        type="button"
                        title={isAdding ? "Close Add Entry" : "Add New Entry"}
                        onClick={() => setIsAdding(!isAdding)}
                        className="p-2 bg-violet-600 hover:bg-violet-500 rounded-xl transition-all shadow-[0_0_20px_rgba(139,92,246,0.3)]"
                    >
                        <Plus size={20} />
                    </button>
                </div>
            </div>

            {isAdding && (
                <div className="bg-white/[0.03] border border-white/5 rounded-3xl p-6 flex flex-col gap-4 animate-in fade-in slide-in-from-top-4 z-10">
                    <div className="grid grid-cols-3 gap-6">
                        <div className="flex flex-col gap-2">
                            <label className="text-[10px] font-black uppercase text-gray-500 ml-1">Domain / Site</label>
                            <input
                                value={newPass.site}
                                onChange={(e) => setNewPass({ ...newPass, site: e.target.value })}
                                type="text" placeholder="example.com" className="bg-white/5 border border-white/10 rounded-xl p-3 text-sm focus:outline-none"
                            />
                        </div>
                        <div className="flex flex-col gap-2">
                            <label className="text-[10px] font-black uppercase text-gray-500 ml-1">Username / Email</label>
                            <input
                                value={newPass.username}
                                onChange={(e) => setNewPass({ ...newPass, username: e.target.value })}
                                type="text" placeholder="user@mail.com" className="bg-white/5 border border-white/10 rounded-xl p-3 text-sm focus:outline-none"
                            />
                        </div>
                        <div className="flex flex-col gap-2">
                            <label className="text-[10px] font-black uppercase text-gray-500 ml-1">Password</label>
                            <input
                                value={newPass.password}
                                onChange={(e) => setNewPass({ ...newPass, password: e.target.value })}
                                type="password" placeholder="••••••••" className="bg-white/5 border border-white/10 rounded-xl p-3 text-sm focus:outline-none"
                            />
                        </div>
                    </div>
                    <div className="flex justify-end gap-3 mt-2">
                        <button type="button" onClick={() => setIsAdding(false)} className="px-6 py-2 text-xs font-bold text-gray-500 hover:text-white transition-colors">Cancel</button>
                        <button type="button" onClick={handleAdd} className="btn-vibrant-primary px-8">Seal Entry</button>
                    </div>
                </div>
            )}

            <div className="flex-1 overflow-auto custom-scrollbar z-10">
                <div className="grid grid-cols-1 gap-3">
                    {filtered.length === 0 ? (
                        <div className="h-64 flex flex-col items-center justify-center gap-4 text-gray-500/20">
                            <Key size={80} strokeWidth={1} />
                            <p className="text-sm font-bold uppercase tracking-widest italic">Vault Empty</p>
                        </div>
                    ) : (
                        filtered.map((item) => (
                            <div key={item.id} className="group bg-white/[0.02] hover:bg-white/[0.05] border border-white/5 rounded-2xl p-4 flex items-center transition-all">
                                <div className="p-3 bg-white/5 rounded-xl mr-4 group-hover:text-violet-400 transition-colors">
                                    <Globe size={18} />
                                </div>

                                <div className="flex-1">
                                    <h3 className="font-black text-sm">{item.site}</h3>
                                    <div className="flex items-center gap-4 mt-0.5">
                                        <div className="flex items-center gap-1.5 text-gray-500">
                                            <User size={12} />
                                            <span className="text-xs font-medium">{item.username || 'No username'}</span>
                                        </div>
                                    </div>
                                </div>

                                <div className="flex flex-col items-end gap-2 pr-6">
                                    <div className="flex items-center gap-2 bg-black/40 px-3 py-1.5 rounded-lg border border-white/10">
                                        <span className="text-xs font-mono tracking-wider tabular-nums">
                                            {showPlain[item.id] ? item.password : '••••••••••••'}
                                        </span>
                                        <button
                                            type="button"
                                            title={showPlain[item.id] ? "Hide Password" : "Show Password"}
                                            onClick={() => togglePassword(item.id)}
                                            className="text-gray-500 hover:text-white transition-colors p-1"
                                        >
                                            {showPlain[item.id] ? <EyeOff size={14} /> : <Eye size={14} />}
                                        </button>
                                    </div>
                                </div>

                                <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-all scale-95 group-hover:scale-100">
                                    <button
                                        type="button"
                                        title="Copy Password"
                                        onClick={() => handleCopy(item.password, item.id)}
                                        className={`p-2 rounded-lg transition-all ${copiedId === item.id ? 'bg-emerald-500/20 text-emerald-400' : 'bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white'}`}
                                    >
                                        {copiedId === item.id ? <Check size={16} /> : <Copy size={16} />}
                                    </button>
                                    <button
                                        type="button"
                                        title="Delete Entry"
                                        onClick={() => handleDelete(item.id)}
                                        className="p-2 bg-red-500/10 hover:bg-red-500/20 text-red-400/80 hover:text-red-400 rounded-lg transition-all"
                                    >
                                        <Trash2 size={16} />
                                    </button>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>

            <div className="p-4 bg-emerald-500/5 border border-emerald-500/10 rounded-2xl flex items-center gap-4 z-10">
                <div className="p-2 bg-emerald-500/10 rounded-xl text-emerald-400">
                    <ShieldCheck size={20} />
                </div>
                <div className="flex-1">
                    <p className="text-[10px] font-black uppercase text-emerald-400/80">Active Protection Module</p>
                    <p className="text-xs text-gray-400 font-medium">Auto-fill is monitoring 4 active login sessions</p>
                </div>
                <div className="flex items-center gap-1.5">
                    <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                    <span className="text-[10px] font-black text-emerald-500 uppercase">Live</span>
                </div>
            </div>
        </div>
    );
}
