"use client";

import React, { useEffect, useState } from 'react';
import { useAppStore } from '@/store/useAppStore';
import firebaseService from '@/lib/FirebaseService';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, Shield, Zap, Globe, Github, LogIn, Chrome, ArrowRight, Layers, Cpu, Database, ChevronLeft } from 'lucide-react';
import AdminDashboard from './AdminDashboard';

const LandingPage = () => {
    const store = useAppStore();
    const [isLoading, setIsLoading] = useState(false);
    const [view, setView] = useState<'home' | 'dashboard'>('home');
    const [isAdminConsoleOpen, setIsAdminConsoleOpen] = useState(false);

    useEffect(() => {
        // Handle Return from External Auth
        const handleExternalAuthReturn = () => {
            const urlParams = new URLSearchParams(window.location.search);
            const status = urlParams.get('auth_status');
            const userEmail = urlParams.get('email');
            const userName = urlParams.get('name');
            const userPhoto = urlParams.get('photo');

            if (status === 'success' && userEmail) {
                const isAdminEmail = userEmail.endsWith('@ponsrischool.in');
                store.setUser({
                    email: userEmail,
                    name: userName || 'User',
                    photoURL: userPhoto || null,
                    lastLogin: Date.now(),
                    activeTime: 0
                });

                if (isAdminEmail) {
                    store.setAdmin(true);
                }

                // If on desktop, go to browser. If on web, stay on dashboard.
                if (window.electronAPI) {
                    store.setActiveView('browser');
                } else {
                    setView('dashboard');
                }

                store.startActiveSession();
                window.history.replaceState({}, document.title, window.location.pathname);
            }
        };

        handleExternalAuthReturn();
    }, []);

    const handleLogin = () => {
        setIsLoading(true);
        const externalAuthUrl = `https://browser.ponsrischool.in/auth?client_id=desktop-app&redirect_uri=${encodeURIComponent(window.location.href)}`;
        if (window.electronAPI) {
            window.open(externalAuthUrl, '_blank');
        } else {
            window.location.href = externalAuthUrl;
        }
    };

    if (store.user && (!window.electronAPI || view === 'dashboard')) {
        return (
            <div className="min-h-screen bg-[#020205] text-white p-8 md:p-12 overflow-y-auto relative selection:bg-deep-space-accent-neon/30 custom-scrollbar">
                <div className="max-w-6xl mx-auto space-y-12 relative z-10 pt-20">
                    {/* Header */}
                    <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                        <div className="flex items-center gap-6">
                            <div className="w-20 h-20 rounded-3xl bg-cyan-400/10 border border-cyan-400/20 flex items-center justify-center overflow-hidden">
                                {store.user.photoURL ? <img src={store.user.photoURL} alt="Profile" className="w-full h-full object-cover" /> : <Layers size={32} className="text-cyan-400" />}
                            </div>
                            <div>
                                <h1 className="text-4xl font-black uppercase tracking-tight">{store.user.name}</h1>
                                <p className="text-white/40 font-bold uppercase tracking-widest text-xs mt-1">{store.user.email}</p>
                            </div>
                        </div>
                        <div className="flex gap-4">
                            {store.isAdmin && (
                                <button
                                    onClick={() => setIsAdminConsoleOpen(!isAdminConsoleOpen)}
                                    className="px-6 py-3 bg-cyan-400 text-black font-black rounded-2xl text-[10px] uppercase tracking-widest flex items-center gap-2"
                                >
                                    {isAdminConsoleOpen ? <ChevronLeft size={14} /> : null}
                                    {isAdminConsoleOpen ? "Back to User" : "Admin Console"}
                                </button>
                            )}
                            <button onClick={() => store.logout()} className="px-6 py-3 bg-white/5 border border-white/10 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-red-500/20 hover:text-red-500 transition-all">
                                Logout
                            </button>
                        </div>
                    </div>

                    {isAdminConsoleOpen ? (
                        <div className="bg-white/[0.02] border border-white/5 rounded-[3rem] p-8 md:p-12">
                            <AdminDashboard />
                        </div>
                    ) : (
                        <div className="grid lg:grid-cols-3 gap-8">
                            {/* History Card */}
                            <div className="lg:col-span-2 p-8 rounded-[2.5rem] bg-white/[0.02] border border-white/5 space-y-6">
                                <div className="flex items-center justify-between">
                                    <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-white/40">Recent Cloud History</h3>
                                    <Globe size={16} className="text-cyan-400" />
                                </div>
                                <div className="space-y-3">
                                    {store.history.length > 0 ? store.history.map((url, i) => (
                                        <div key={i} className="flex items-center gap-4 p-4 rounded-2xl bg-white/5 border border-white/5 hover:bg-white/10 transition-all cursor-pointer group">
                                            <div className="w-8 h-8 rounded-lg bg-black/40 flex items-center justify-center text-white/20 group-hover:text-cyan-400">
                                                <Globe size={14} />
                                            </div>
                                            <p className="text-xs font-medium truncate flex-1">{url}</p>
                                            <ArrowRight size={14} className="text-white/10 group-hover:text-white" />
                                        </div>
                                    )) : <div className="py-20 text-center text-white/20 text-xs font-bold uppercase tracking-widest">No history synced yet</div>}
                                </div>
                            </div>

                            {/* Clipboard Card */}
                            <div className="p-8 rounded-[2.5rem] bg-white/[0.02] border border-white/5 space-y-6 h-fit">
                                <div className="flex items-center justify-between">
                                    <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-white/40">Cloud Clipboard</h3>
                                    <Zap size={16} className="text-yellow-400" />
                                </div>
                                <div className="space-y-4">
                                    {store.clipboard.length > 0 ? store.clipboard.map((item, i) => (
                                        <div key={i} className="p-4 rounded-2xl bg-black/40 border border-white/5 text-[11px] font-medium leading-relaxed max-h-32 overflow-hidden text-white/60 relative group">
                                            {item}
                                            <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end justify-end p-2">
                                                <button className="p-2 rounded-lg bg-cyan-400 text-black hover:scale-105 transition-all">
                                                    <ArrowRight size={12} />
                                                </button>
                                            </div>
                                        </div>
                                    )) : <div className="py-20 text-center text-white/20 text-xs font-bold uppercase tracking-widest">Clipboard empty</div>}
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                {/* Background Effects */}
                <div className="fixed inset-0 z-0 overflow-hidden pointer-events-none">
                    <div className="absolute top-[10%] left-[20%] w-[30%] h-[30%] bg-cyan-400/5 blur-[120px] rounded-full" />
                    <div className="absolute bottom-[10%] right-[20%] w-[40%] h-[40%] bg-purple-500/5 blur-[150px] rounded-full" />
                </div>
            </div>
        );
    }

    const scrollToSection = (id: string) => {
        const element = document.getElementById(id);
        if (element) {
            element.scrollIntoView({ behavior: 'smooth' });
        }
    };

    return (
        <div className="h-screen bg-[#020205] text-white overflow-y-auto relative selection:bg-deep-space-accent-neon/30 custom-scrollbar">
            {/* Background Effects */}
            <div className="fixed inset-0 z-0 overflow-hidden pointer-events-none">
                <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-deep-space-accent-neon/10 blur-[120px] rounded-full animate-pulse" />
                <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-purple-500/10 blur-[150px] rounded-full animate-pulse decoration-infinite delay-1000" />
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full h-full bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 mix-blend-overlay" />
            </div>

            {/* Navigation */}
            <nav className="fixed top-10 left-0 right-0 z-[100] bg-black/50 backdrop-blur-xl border-b border-white/5">
                <div className="max-w-7xl mx-auto px-8 py-4 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <div className="w-10 h-10 bg-[#00ffff] rounded-2xl flex items-center justify-center shadow-[0_0_25px_rgba(0,255,255,0.5)] p-1.5">
                            <img src="/icon.ico" alt="Comet" className="w-full h-full object-contain" />
                        </div>
                        <span className="text-2xl font-black uppercase tracking-tighter text-white">COMET</span>
                    </div>

                    <div className="hidden md:flex items-center gap-10 text-[10px] font-black uppercase tracking-[0.2em] text-white/40">
                        <button onClick={() => scrollToSection('features')} className="hover:text-cyan-400 transition-colors">Features</button>
                        <button onClick={() => scrollToSection('tech')} className="hover:text-cyan-400 transition-colors">Technology</button>
                        <button onClick={() => scrollToSection('security')} className="hover:text-cyan-400 transition-colors">Security</button>
                    </div>

                    <button
                        onClick={handleLogin}
                        disabled={isLoading}
                        className="px-8 py-3 bg-white/5 border border-white/10 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-cyan-400 hover:text-black hover:border-cyan-400 transition-all flex items-center gap-3 group"
                    >
                        <LogIn size={16} className="group-hover:translate-x-1 transition-transform" />
                        {isLoading ? "Redirecting..." : (store.user ? "DASHBOARD" : "SIGN IN")}
                    </button>
                </div>
            </nav>

            {/* Hero Section */}
            <main className="relative z-10 max-w-7xl mx-auto px-8 pt-44 pb-32 grid lg:grid-cols-2 gap-20 items-center">
                <motion.div
                    initial={{ opacity: 0, x: -30 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.8 }}
                >
                    <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-cyan-400/10 border border-cyan-400/20 mb-8">
                        <Sparkles size={14} className="text-cyan-400" />
                        <span className="text-[10px] font-black uppercase tracking-widest text-cyan-400">v0.6.5 Stability Update</span>
                    </div>
                    <h1 className="text-7xl md:text-8xl font-black tracking-tight leading-[0.9] mb-8 uppercase">
                        The Next <br /> <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-500">Frontier</span> <br /> of Browsing.
                    </h1>
                    <p className="text-xl text-white/40 max-w-lg mb-12 leading-relaxed font-medium">
                        A performance-hardened Chromium workspace with native AI orchestration, hardware isolation, and decentralized sync enabled via Secure Cloud Auth.
                    </p>
                    <div className="flex flex-wrap gap-4">
                        <button
                            onClick={handleLogin}
                            className="px-10 py-5 bg-cyan-400 text-black font-black rounded-3xl text-sm uppercase tracking-widest shadow-[0_20px_40px_rgba(34,211,238,0.2)] hover:scale-105 transition-all flex items-center gap-3"
                        >
                            {store.user ? "Open Dashboard" : "Get Started"} <ArrowRight size={18} />
                        </button>
                        <button className="px-10 py-5 bg-white/5 border border-white/10 font-black rounded-3xl text-sm uppercase tracking-widest hover:bg-white/10 transition-all">
                            Documentation
                        </button>
                    </div>
                </motion.div>

                <motion.div
                    initial={{ opacity: 0, scale: 0.9 }}
                    whileInView={{ opacity: 1, scale: 1 }}
                    viewport={{ once: true }}
                    transition={{ duration: 1, delay: 0.2 }}
                    className="relative"
                >
                    <div className="absolute inset-0 bg-cyan-400/20 blur-[100px] rounded-full" />
                    <div className="relative aspect-square rounded-[3rem] border border-white/10 bg-black/40 backdrop-blur-3xl p-4 shadow-2xl overflow-hidden group">
                        <div className="h-full w-full rounded-[2.5rem] border border-white/5 bg-[#0D0E1C] overflow-hidden flex flex-col">
                            <div className="h-10 border-b border-white/5 flex items-center px-4 gap-2 bg-black/20">
                                <div className="w-2 h-2 rounded-full bg-red-500/50" />
                                <div className="w-2 h-2 rounded-full bg-yellow-500/50" />
                                <div className="w-2 h-2 rounded-full bg-green-500/50" />
                                <div className="flex-1 h-4 bg-white/5 rounded-full mx-8" />
                            </div>
                            <div className="flex-1 p-8">
                                <div className="w-20 h-2 bg-cyan-400/40 rounded-full mb-6" />
                                <div className="space-y-4">
                                    <div className="w-full h-4 bg-white/5 rounded-lg" />
                                    <div className="w-full h-4 bg-white/5 rounded-lg" />
                                    <div className="w-2/3 h-4 bg-white/5 rounded-lg" />
                                </div>
                                <div className="grid grid-cols-2 gap-4 mt-12">
                                    <div className="aspect-video bg-white/5 rounded-2xl animate-pulse" />
                                    <div className="aspect-video bg-white/5 rounded-2xl animate-pulse delay-700" />
                                </div>
                            </div>
                        </div>
                    </div>
                </motion.div>
            </main>

            {/* Features Section */}
            <section id="features" className="relative z-10 py-32 border-t border-white/5">
                <div className="max-w-7xl mx-auto px-8">
                    <div className="mb-20">
                        <h2 className="text-4xl font-black uppercase mb-4">Core Features</h2>
                        <div className="w-20 h-1 bg-cyan-400 rounded-full" />
                    </div>
                    <div className="grid md:grid-cols-3 gap-8">
                        {[
                            { icon: <Zap />, title: "Hyper-Link Sync", desc: "Sync your entire browsing state across mobile and desktop instantly." },
                            { icon: <Shield />, title: "Quantum Isolation", desc: "Every tab runs in a restricted container for maximum security." },
                            { icon: <Cpu />, title: "AI Orchestrator", desc: "Native Gemini and local LLM support built into the sidebar." }
                        ].map((f, i) => (
                            <div key={i} className="p-10 rounded-[2.5rem] bg-white/[0.02] border border-white/5 hover:bg-white/5 transition-all">
                                <div className="text-cyan-400 mb-6">{f.icon}</div>
                                <h3 className="text-xl font-bold mb-4">{f.title}</h3>
                                <p className="text-white/40 leading-relaxed text-sm">{f.desc}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* Technology Section */}
            <section id="tech" className="relative z-10 py-32 bg-white/[0.01] border-y border-white/5">
                <div className="max-w-7xl mx-auto px-8">
                    <div className="text-center mb-20">
                        <h2 className="text-4xl font-black uppercase mb-4">Under the Hood</h2>
                        <p className="text-white/40 uppercase tracking-widest text-[10px] font-bold">Built for Performance and Power</p>
                    </div>
                    <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-12">
                        {[
                            { label: "AI Latency", val: "< 50ms", sub: "Edge Orchestration" },
                            { label: "Engine", val: "V8 Turbo", sub: "Optimized Chromium" },
                            { label: "Privacy", val: "AES-256", sub: "Local Encryption" },
                            { label: "Auth", val: "OIDC", sub: "Secure Cloud Verify" },
                        ].map((s, i) => (
                            <div key={i} className="space-y-2 text-center">
                                <p className="text-[10px] font-black uppercase tracking-[0.3em] text-white/20">{s.label}</p>
                                <h3 className="text-4xl font-black text-white">{s.val}</h3>
                                <p className="text-[10px] font-bold text-cyan-400 uppercase">{s.sub}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* Security Section */}
            <section id="security" className="relative z-10 py-32 mb-40">
                <div className="max-w-7xl mx-auto px-8">
                    <div className="flex flex-col md:flex-row items-center gap-20">
                        <div className="flex-1">
                            <h2 className="text-5xl font-black uppercase mb-8 leading-tight">
                                Security is <br /> <span className="text-cyan-400">Non-Negotiable.</span>
                            </h2>
                            <p className="text-lg text-white/40 mb-10 leading-relaxed">
                                To protect our community and ensure data integrity, Comet requires all users to authenticate via our secure portal. This ensures that every node in our sync network is verified.
                            </p>
                            <div className="space-y-4">
                                <div className="flex items-center gap-4 text-sm font-bold text-white/60">
                                    <div className="w-6 h-6 rounded-full bg-cyan-400/20 flex items-center justify-center text-cyan-400 text-xs">✓</div>
                                    Mandatory Cloud Path Verification
                                </div>
                                <div className="flex items-center gap-4 text-sm font-bold text-white/60">
                                    <div className="w-6 h-6 rounded-full bg-cyan-400/20 flex items-center justify-center text-cyan-400 text-xs">✓</div>
                                    Hardware-Bound Session Tokens
                                </div>
                                <div className="flex items-center gap-4 text-sm font-bold text-white/60">
                                    <div className="w-6 h-6 rounded-full bg-cyan-400/20 flex items-center justify-center text-cyan-400 text-xs">✓</div>
                                    End-to-End P2P Sync Encryption
                                </div>
                            </div>
                        </div>
                        <div className="flex-1 p-12 glass-vibrant rounded-[3rem] border border-white/10 text-center">
                            <Shield size={64} className="text-cyan-400 mx-auto mb-8 animate-pulse" />
                            <h3 className="text-2xl font-black uppercase mb-4">Portal Verification</h3>
                            <p className="text-sm text-white/40 mb-8">Click below to authenticate via your official Ponsri School account.</p>
                            <button onClick={handleLogin} className="w-full py-4 bg-cyan-400 text-black font-black rounded-2xl uppercase tracking-widest text-xs hover:scale-105 transition-all">
                                Authenticate Now
                            </button>
                        </div>
                    </div>
                </div>
            </section>

            {/* Footer */}
            <footer className="relative z-10 border-t border-white/5 py-10 bg-black/40">
                <div className="max-w-7xl mx-auto px-8 flex justify-between items-center text-[10px] font-bold text-white/20 uppercase tracking-[0.2em]">
                    <div>© 2026 Comet Browser Ecosystem</div>
                    <div className="flex gap-8">
                        <a href="#" className="hover:text-cyan-400">Privacy</a>
                        <a href="#" className="hover:text-cyan-400">Terms</a>
                        <a href="https://browser.ponsrischool.in" className="text-cyan-400/60">Portal Home</a>
                    </div>
                </div>
            </footer>
        </div>
    );
};

export default LandingPage;
