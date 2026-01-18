"use client";

import React, { useEffect, useState } from 'react';
import { useAppStore } from '@/store/useAppStore';
import firebaseService from '@/lib/FirebaseService';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, Shield, Zap, Globe, Github, LogIn, Chrome, ArrowRight, Layers, Cpu, Database } from 'lucide-react';

const LandingPage = () => {
    const store = useAppStore();
    const [isLoading, setIsLoading] = useState(false);

    useEffect(() => {
        // Deep linking simulation or real handler
        const handleDeepLink = () => {
            const urlParams = new URLSearchParams(window.location.search);
            const redirect = urlParams.get('redirect');
            if (redirect && store.user) {
                store.setActiveView('browser');
                store.setCurrentUrl(decodeURIComponent(redirect));
            }
        };

        handleDeepLink();
    }, [store.user]);

    const handleLogin = async () => {
        setIsLoading(true);
        try {
            const firebaseUser = await firebaseService.signInWithGoogle();
            if (firebaseUser) {
                store.setUser({
                    email: firebaseUser.email,
                    name: firebaseUser.displayName,
                    photoURL: firebaseUser.photoURL,
                    lastLogin: Date.now(),
                    activeTime: 0
                });
                store.setActiveView('browser');
                store.startActiveSession();
            }
        } catch (error) {
            console.error("Login failed:", error);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-[#020205] text-white overflow-hidden relative selection:bg-deep-space-accent-neon/30">
            {/* Background Effects */}
            <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none">
                <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-deep-space-accent-neon/10 blur-[120px] rounded-full animate-pulse" />
                <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-purple-500/10 blur-[150px] rounded-full animate-pulse decoration-infinite delay-1000" />
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full h-full bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 mix-blend-overlay" />
            </div>

            {/* Navigation */}
            <nav className="relative z-10 flex items-center justify-between px-8 py-6 max-w-7xl mx-auto">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-deep-space-accent-neon rounded-2xl flex items-center justify-center text-black font-black text-xl shadow-[0_0_20px_rgba(0,255,255,0.4)]">
                        {store.appName.charAt(0)}
                    </div>
                    <span className="text-xl font-black uppercase tracking-tighter">{store.appName}</span>
                </div>
                <div className="hidden md:flex items-center gap-8 text-[10px] font-black uppercase tracking-[0.2em] text-white/40">
                    <a href="#features" className="hover:text-white transition-colors">Features</a>
                    <a href="#tech" className="hover:text-white transition-colors">Technology</a>
                    <a href="#security" className="hover:text-white transition-colors">Security</a>
                </div>
                <button
                    onClick={handleLogin}
                    disabled={isLoading}
                    className="px-6 py-2.5 bg-white/5 border border-white/10 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-white/10 transition-all flex items-center gap-2 group"
                >
                    {isLoading ? "Authenticating..." : <><LogIn size={14} className="group-hover:translate-x-1 transition-transform" /> Sign In</>}
                </button>
            </nav>

            {/* Hero Section */}
            <main className="relative z-10 max-w-7xl mx-auto px-8 pt-20 pb-40 grid lg:grid-cols-2 gap-20 items-center">
                <motion.div
                    initial={{ opacity: 0, x: -30 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.8 }}
                >
                    <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-deep-space-accent-neon/10 border border-deep-space-accent-neon/20 mb-8">
                        <Sparkles size={14} className="text-deep-space-accent-neon" />
                        <span className="text-[10px] font-black uppercase tracking-widest text-deep-space-accent-neon">Evolution of Browsing v0.6.0</span>
                    </div>
                    <h1 className="text-7xl md:text-8xl font-black tracking-tight leading-[0.9] mb-8 uppercase">
                        Architect the <span className="text-transparent bg-clip-text bg-gradient-to-r from-deep-space-accent-neon to-purple-400">Future</span> of Web.
                    </h1>
                    <p className="text-xl text-white/40 max-w-lg mb-12 leading-relaxed font-medium">
                        A performance-hardened Chromium workspace with native AI orchestration, hardware isolation, and decentralized sync.
                    </p>
                    <div className="flex flex-wrap gap-4">
                        <button
                            onClick={handleLogin}
                            className="px-10 py-5 bg-deep-space-accent-neon text-black font-black rounded-3xl text-sm uppercase tracking-widest shadow-[0_20px_40px_rgba(0,255,255,0.2)] hover:scale-105 transition-all flex items-center gap-3"
                        >
                            Launch Workspace <ArrowRight size={18} />
                        </button>
                        <button className="px-10 py-5 bg-white/5 border border-white/10 font-black rounded-3xl text-sm uppercase tracking-widest hover:bg-white/10 transition-all">
                            Documentation
                        </button>
                    </div>

                    <div className="mt-16 flex items-center gap-12 grayscale opacity-20 hover:grayscale-0 hover:opacity-100 transition-all duration-700">
                        <Zap size={24} />
                        <Shield size={24} />
                        <Globe size={24} />
                        <Layers size={24} />
                        <Database size={24} />
                    </div>
                </motion.div>

                <motion.div
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 1, delay: 0.2 }}
                    className="relative"
                >
                    <div className="absolute inset-0 bg-deep-space-accent-neon/20 blur-[100px] rounded-full" />
                    <div className="relative aspect-square rounded-[3rem] border border-white/10 bg-black/40 backdrop-blur-3xl p-4 shadow-2xl overflow-hidden group">
                        <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                        <div className="h-full w-full rounded-[2.5rem] border border-white/5 bg-deep-space-bg overflow-hidden flex flex-col">
                            <div className="h-10 border-b border-white/5 flex items-center px-4 gap-2 bg-black/20">
                                <div className="w-2 h-2 rounded-full bg-red-500/50" />
                                <div className="w-2 h-2 rounded-full bg-yellow-500/50" />
                                <div className="w-2 h-2 rounded-full bg-green-500/50" />
                                <div className="flex-1 h-4 bg-white/5 rounded-full mx-8" />
                            </div>
                            <div className="flex-1 p-8">
                                <div className="w-20 h-2 bg-deep-space-accent-neon/40 rounded-full mb-6" />
                                <div className="space-y-4">
                                    <div className="w-full h-4 bg-white/5 rounded-lg" />
                                    <div className="w-full h-4 bg-white/5 rounded-lg" />
                                    <div className="w-2/3 h-4 bg-white/5 rounded-lg" />
                                </div>
                                <div className="grid grid-cols-2 gap-4 mt-12">
                                    <div className="aspect-video bg-white/5 rounded-2xl" />
                                    <div className="aspect-video bg-white/5 rounded-2xl" />
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Floating Tech Badges */}
                    <div className="absolute -top-10 -right-10 p-6 glass-vibrant rounded-3xl border border-white/10 shadow-3xl animate-bounce delay-700">
                        <Cpu className="text-deep-space-accent-neon" size={32} />
                    </div>
                    <div className="absolute -bottom-10 -left-10 p-6 glass-vibrant rounded-3xl border border-white/10 shadow-3xl animate-bounce">
                        <Sparkles className="text-purple-400" size={32} />
                    </div>
                </motion.div>
            </main>

            {/* Features Stats */}
            <section className="relative z-10 bg-white/[0.02] border-y border-white/5 py-20">
                <div className="max-w-7xl mx-auto px-8 grid md:grid-cols-4 gap-12 text-center">
                    {[
                        { label: "AI Latency", val: "< 50ms", sub: "Edge Orchestration" },
                        { label: "Security", val: "AES-256", sub: "Local Persistence" },
                        { label: "Throughput", val: "Unlimited", sub: "Hardware Isolation" },
                        { label: "Providers", val: "Global", sub: "Decentralized Sync" },
                    ].map((s, i) => (
                        <div key={i} className="space-y-2">
                            <p className="text-[10px] font-black uppercase tracking-[0.3em] text-white/20">{s.label}</p>
                            <h3 className="text-3xl font-black text-white">{s.val}</h3>
                            <p className="text-[10px] font-bold text-deep-space-accent-neon/60 uppercase">{s.sub}</p>
                        </div>
                    ))}
                </div>
            </section>
        </div>
    );
};

export default LandingPage;
