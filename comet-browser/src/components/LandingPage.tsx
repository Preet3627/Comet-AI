"use client";
import React, { useState, useEffect } from 'react';
import { searchEngines } from "./SearchEngineSettings";
import { useAppStore } from "@/store/useAppStore";
import { motion, useScroll, useTransform } from "framer-motion";
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import {
    Sparkles,
    Shield,
    Zap,
    Globe,
    LogIn,
    ArrowRight,
    Layers,
    Cpu,
    BookOpen,
    Github,
    Code2,
    Monitor,
    Search,
    RefreshCw,
    Copy as CopyIcon
} from "lucide-react";
import { firebaseConfigStorage, FirebaseConfig } from "@/lib/firebaseConfigStorage";

const COMET_README = `
# ☄️ Comet Browser (v0.1.7)
Made in India 🇮🇳
### The Intelligent Workspace for the Future

**Built by a solo high school developer (Latestinssan)**, running on extreme constraints (i3 4th Gen, 4GB RAM), yet designed to outperform modern browsers in productivity and intelligence.

**Comet** is not just a fork; it's a **custom-hardened Chromium environment** designed for:
1.  **Native AI Orchestration**: Seamlessly switch between Google Gemini 3, GPT-4o, Claude 3.5, Groq, and **Local Ollama (Deepseek R1)**.
2.  **RAG-Powered Memory**: Your browser remembers your context. It builds a local vector database of your sessions to provide "Perplexity-style" answers offline.
3.  **Hardware Isolation**: Every tab is sandboxed for maximum security and crash resistance.
4.  **Decentralized Sync**: Sync your data (tabs, clipboard, history) across devices using P2P direct connections or Firebase with end-to-end encryption.

---

## 🚀 Features (v0.1.7 Stable)

### 🧠 Intelligence & RAG
*   **Perplexity-Style Answers**: Ask complex questions to your sidebar. Comet scans your current page and retrieves relevant context from your history.
*   **Local Vector DB**: Automatically indexes your browsing for offline semantic search.
*   **Deepseek R1 Integration**: Optimized for the 1.5B model running locally via Ollama.
*   **OCR & Vision**: Automatic screenshot analysis and text extraction via Tesseract.js.

### ⚡ Performance & Core
*   **Chromium Rendering Engine**: We use the raw power of Chromium for 100% web compatibility, stripped of bloatware.
*   **Optimized for Low-End PCs**: Validated on 4GB RAM machines. Aggressive tab suspension technology.
*   **Google Navigation Fixed**: Resolved infinite loop issues with search engine redirects.

### 🛡️ Security & Sync
*   **Identity-Aware**: Login via \`browser.ponsrischool.in\` to verify your session.
*   **P2P File Drop**: Send files between Mobile and Desktop instantly.
*   **Admin Console**: (Enterprise) Manage user access and monitor sync status.
`.trim();

const LandingPage = () => {
    const store = useAppStore();
    const [isLoading, setIsLoading] = useState(false);
    const [showStartup, setShowStartup] = useState(true);
    const { scrollYProgress } = useScroll();

    useEffect(() => {
        if (store.user) {
            store.setActiveView("browser");
            return;
        }

        const done = sessionStorage.getItem("comet_startup_done");
        if (done) {
            setShowStartup(false);
            return;
        }
        const t = setTimeout(() => {
            setShowStartup(false);
            sessionStorage.setItem("comet_startup_done", "true");
        }, 2500);
        return () => clearTimeout(t);
    }, [store.user]);

    useEffect(() => {
        const handleExternalAuthReturn = () => {
            const p = new URLSearchParams(window.location.search);
            const status = p.get("auth_status");
            const uid = p.get("uid");
            const email = p.get("email");
            const name = p.get("name");
            const photo = p.get("photo");

            if (status === "success" && uid && email) {
                store.setUser({
                    uid,
                    email,
                    displayName: name || "User",
                    photoURL: photo || "",
                });

                if (email.endsWith("@ponsrischool.in")) store.setAdmin(true);
                store.setActiveView("browser");
                store.setHasSeenWelcomePage(true);
                store.startActiveSession();
                window.history.replaceState({}, document.title, window.location.pathname);
                setIsLoading(false);
            }
        };

        handleExternalAuthReturn();
    }, [store]);

    const getFirebaseConfigFromEnv = (): FirebaseConfig => ({
        apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || "",
        authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || "",
        projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || "",
        storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || "",
        messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || "",
        appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID || "",
        measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID,
    });

    const handleGuestMode = () => {
        store.setGuestMode(true);
        store.setHasSeenWelcomePage(true);
        store.setActiveView("browser");
    };

    const handleLogin = async () => {
        setIsLoading(true);
        const redirectUri = "comet-browser://auth";
        const encoded = btoa(JSON.stringify(getFirebaseConfigFromEnv()));
        const url = `https://browser.ponsrischool.in/auth?client_id=desktop-app&redirect_uri=${encodeURIComponent(
            redirectUri
        )}&firebase_config=${encoded}`;

        if (window.electronAPI) {
            window.electronAPI.openAuthWindow(url);
        } else {
            window.open(url, "_blank");
        }
    };

    // Auth callback is now handled globally in ClientOnlyPage.tsx
    // to ensure user state is synchronized before transitioning views.

    if (showStartup) {
        return (
            <div className="fixed inset-0 bg-[#020205] flex items-center justify-center z-[1000]">
                <motion.div
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 1 }}
                    className="relative text-center"
                >
                    <motion.div animate={{ opacity: [0.3, 0.6, 0.3] }} transition={{ duration: 2, repeat: Infinity }} className="absolute inset-0 bg-sky-500/20 blur-[100px] rounded-full" />
                    <h1 className="text-6xl md:text-9xl font-black text-white tracking-tighter text-neon relative z-10">COMET</h1>
                    <p className="text-sky-400 font-bold uppercase tracking-[0.6em] mt-4 relative z-10 text-sm">Initializing Neural Link</p>
                </motion.div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-[#020205] text-primary-text relative overflow-x-hidden selection:bg-sky-500/30">
            <div className="fixed inset-0 bg-deep-space pointer-events-none opacity-40" />
            <div className="fixed inset-0 bg-nebula pointer-events-none opacity-60" />

            {!store.hasSeenWelcomePage && (
                <nav className="fixed top-10 left-0 right-0 z-50 bg-black/20 backdrop-blur-xl border-b border-white/5">
                    <div className="max-w-7xl mx-auto px-8 py-4 flex justify-between items-center">
                        <div className="flex items-center gap-3 group cursor-pointer" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}>
                            <img src="icon.ico" className="w-10 h-10 drop-shadow-[0_0_15px_rgba(56,189,248,0.6)] group-hover:scale-110 transition-transform" alt="Logo" />
                            <span className="font-black text-2xl tracking-tighter text-white">COMET</span>
                        </div>
                        <div className="flex items-center gap-4">
                            <button
                                onClick={() => window.open('https://github.com/Latestinssan/comet-browser', '_blank')}
                                className="p-2 text-white/40 hover:text-sky-400 transition-colors"
                            >
                                <Github size={20} />
                            </button>
                            <button
                                onClick={handleLogin}
                                className="px-6 py-2 glass-dark rounded-xl border border-white/10 hover:border-sky-400/50 transition-all flex items-center gap-2 group"
                            >
                                <span className="text-xs font-black uppercase tracking-widest text-sky-400">Identity Access</span>
                                <LogIn size={16} className="text-sky-400 group-hover:translate-x-1 transition-transform" />
                            </button>
                        </div>
                    </div>
                </nav>
            )}

            <div className="relative z-10 custom-scrollbar">
                <section className="min-h-screen flex items-center pt-20">
                    <main className="max-w-7xl mx-auto px-8 grid lg:grid-cols-2 gap-20 items-center">
                        <motion.div initial={{ opacity: 0, x: -50 }} animate={{ opacity: 1, x: 0 }}>
                            <div className="inline-block px-4 py-1.5 rounded-full bg-sky-500/10 border border-sky-400/20 text-sky-400 text-[10px] font-black uppercase tracking-widest mb-8">
                                <Sparkles size={12} className="inline mr-2" />
                                Experimental Preview • v0.1.7 Stable
                            </div>
                            <h1 className="text-7xl md:text-[8.5rem] font-black uppercase mb-8 leading-[0.82] tracking-tighter text-white">
                                Navigate <br /> <span className="text-transparent bg-clip-text bg-gradient-to-r from-sky-400 via-indigo-400 to-purple-500 animate-gradient-x">THE VOID</span>
                            </h1>
                            <p className="text-slate-400 text-xl mb-12 max-w-lg leading-relaxed font-medium border-l-2 border-sky-500/30 pl-6">
                                A high-performance browsing environment built for the next generation of AI-native workflows. Fully sandboxed, <span className="text-sky-400">RAG-powered</span>, and blindingly fast.
                            </p>
                            <div className="flex flex-col gap-5 max-w-md">
                                {store.user ? (
                                    <button
                                        onClick={() => store.setActiveView("browser")}
                                        className="btn-vibrant-primary flex items-center justify-center gap-3 py-5"
                                    >
                                        Resume Workspace <ArrowRight size={20} />
                                    </button>
                                ) : (
                                    <>
                                        <button
                                            onClick={handleGuestMode}
                                            className="btn-vibrant-cyan flex items-center justify-center gap-3 py-5"
                                        >
                                            Enter Workspace <ArrowRight size={20} />
                                        </button>
                                        <button
                                            onClick={handleLogin}
                                            disabled={isLoading}
                                            className="btn-vibrant-secondary flex items-center justify-center gap-3 py-5"
                                        >
                                            <img src="https://upload.wikimedia.org/wikipedia/commons/c/c1/Google_%22G%22_logo.svg" className="w-5 h-5" alt="Google" />
                                            {isLoading ? <RefreshCw className="animate-spin" size={18} /> : 'Authorize via Google'}
                                        </button>
                                    </>
                                )}
                                <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/5 backdrop-blur-md">
                                    <p className="text-[10px] text-white/30 text-center uppercase font-black tracking-[0.2em]">
                                        {store.user ? `Identified Entity: ${store.user.email}` : 'No registration required for guest access'}
                                    </p>
                                </div>

                                {store.user && (
                                    <motion.div
                                        initial={{ opacity: 0, y: 20 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        className="mt-8 grid grid-cols-2 gap-4"
                                    >
                                        <div className="p-6 rounded-[2rem] bg-white/[0.02] border border-white/5 flex flex-col gap-4">
                                            <div className="flex items-center gap-2">
                                                <RefreshCw size={14} className="text-sky-400" />
                                                <span className="text-[10px] font-black uppercase tracking-widest text-white/40">Recent History</span>
                                            </div>
                                            <div className="space-y-2">
                                                {store.history.slice(-3).reverse().map((h, i) => (
                                                    <div key={i} className="text-[10px] font-medium text-white/60 truncate hover:text-sky-400 cursor-pointer transition-colors" onClick={() => { store.setCurrentUrl(h.url); store.setActiveView('browser'); }}>
                                                        {h.title || h.url}
                                                    </div>
                                                ))}
                                                {store.history.length === 0 && <p className="text-[10px] text-white/20 italic">No history yet</p>}
                                            </div>
                                        </div>
                                        <div className="p-6 rounded-[2rem] bg-white/[0.02] border border-white/5 flex flex-col gap-4">
                                            <div className="flex items-center gap-2">
                                                <CopyIcon size={14} className="text-purple-400" />
                                                <span className="text-[10px] font-black uppercase tracking-widest text-white/40">Cloud Clipboard</span>
                                            </div>
                                            <div className="space-y-2">
                                                {store.clipboard.slice(0, 3).map((c, i) => (
                                                    <div key={i} className="text-[10px] font-medium text-white/60 truncate hover:text-purple-400 cursor-pointer transition-colors" onClick={() => navigator.clipboard.writeText(c)}>
                                                        {c.substring(0, 30)}...
                                                    </div>
                                                ))}
                                                {store.clipboard.length === 0 && <p className="text-[10px] text-white/20 italic">Empty clipboard</p>}
                                            </div>
                                        </div>
                                    </motion.div>
                                )}
                            </div>
                        </motion.div>
                        <motion.div initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} className="hidden lg:block relative">
                            <div className="absolute -inset-20 bg-sky-500/10 blur-[120px] rounded-full animate-pulse" />
                            <div className="glass-vibrant rounded-[3rem] p-10 border border-white/10 relative shadow-2xl overflow-hidden bg-black/20">
                                <div className="flex flex-col gap-8">
                                    <div className="flex items-center gap-5">
                                        <div className="w-16 h-16 rounded-2xl bg-sky-500/10 flex items-center justify-center text-sky-400 border border-sky-400/30 shadow-[0_0_20px_rgba(56,189,248,0.2)]">
                                            <Cpu size={32} />
                                        </div>
                                        <div>
                                            <h4 className="text-2xl font-black text-white tracking-tight">Comet Neural Core</h4>
                                            <div className="text-sm text-sky-400/60 font-black uppercase tracking-widest flex items-center gap-2">
                                                <div className="w-2 h-2 rounded-full bg-sky-400 animate-ping" />
                                                Synchronized
                                            </div>
                                        </div>
                                    </div>
                                    <div className="space-y-4">
                                        <div className="h-2 w-full bg-white/5 rounded-full overflow-hidden border border-white/5">
                                            <motion.div animate={{ x: ['-100%', '100%'] }} transition={{ duration: 3, repeat: Infinity, ease: 'linear' }} className="h-full w-2/3 bg-gradient-to-r from-transparent via-sky-400 to-transparent" />
                                        </div>
                                        <div className="flex justify-between text-[11px] font-black text-white/20 uppercase tracking-[0.2em]">
                                            <span className="text-sky-400/50">Active Neural Threads</span>
                                            <span className="text-indigo-400/50">12 Instances</span>
                                        </div>
                                    </div>
                                    <div className="grid grid-cols-2 gap-4">
                                        {[
                                            { label: 'Security', val: 'Hardened', color: 'text-emerald-400' },
                                            { label: 'Memory', val: 'RAG-Sync', color: 'text-sky-400' },
                                            { label: 'Engine', val: 'Chromium', color: 'text-amber-400' },
                                            { label: 'Identity', val: store.user ? 'Verified' : 'Guest', color: 'text-purple-400' }
                                        ].map((stat, i) => (
                                            <div key={i} className="p-5 rounded-3xl bg-white/[0.02] border border-white/5 hover:border-white/10 transition-colors">
                                                <p className="text-[10px] text-white/20 uppercase font-black mb-1">{stat.label}</p>
                                                <p className={`font-black tracking-tight ${stat.color}`}>{stat.val}</p>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </motion.div>
                    </main>
                </section>

                <section className="py-40 max-w-5xl mx-auto px-8">
                    <div className="flex flex-col items-center text-center mb-32">
                        <div className="w-px h-24 bg-gradient-to-b from-transparent via-sky-500 to-transparent mb-12 opacity-50" />
                        <h2 className="text-6xl font-black uppercase tracking-tighter text-white mb-8">Engineering Manifest</h2>
                        <div className="flex gap-4">
                            <div className="w-12 h-1 bg-sky-500 rounded-full" />
                            <div className="w-12 h-1 bg-indigo-500 rounded-full" />
                            <div className="w-12 h-1 bg-purple-500 rounded-full" />
                        </div>
                    </div>

                    <div className="relative group bg-[#020205] border border-white/5 rounded-[4rem] p-16 shadow-2xl overflow-hidden">
                        <div className="absolute top-0 right-0 w-64 h-64 bg-sky-500/5 blur-[100px] rounded-full pointer-events-none" />
                        <div className="flex items-center gap-6 mb-16 pb-10 border-b border-white/5">
                            <div className="p-4 bg-sky-500/10 rounded-3xl text-sky-400 border border-sky-400/20 shadow-[0_0_30px_rgba(56,189,248,0.1)]">
                                <BookOpen size={40} />
                            </div>
                            <div>
                                <h3 className="text-4xl font-black text-white uppercase tracking-tighter">Documentation</h3>
                                <p className="text-slate-500 font-bold uppercase tracking-[0.2em] text-xs">V0.1.7 Hardware Specification</p>
                            </div>
                        </div>

                        <article className="prose prose-invert prose-sky max-w-none 
                            prose-headings:text-transparent prose-headings:bg-clip-text prose-headings:bg-gradient-to-r prose-headings:from-white prose-headings:to-white/40
                            prose-headings:font-black prose-headings:uppercase prose-headings:tracking-tighter
                            prose-p:text-slate-400 prose-p:leading-relaxed prose-p:text-lg
                            prose-li:text-slate-400
                            prose-strong:text-sky-400 prose-strong:font-black
                            prose-code:text-indigo-400 prose-code:bg-indigo-400/10 prose-code:px-2 prose-code:py-0.5 prose-code:rounded-lg prose-code:before:content-none prose-code:after:content-none
                         ">
                            <ReactMarkdown remarkPlugins={[remarkGfm]}>
                                {COMET_README}
                            </ReactMarkdown>
                        </article>

                        <div className="mt-24 flex flex-wrap gap-8 items-center justify-center pt-16 border-t border-white/5">
                            <div className="flex items-center gap-3 text-emerald-400/60 font-black uppercase tracking-widest text-[10px]"><Shield size={16} /> Privacy-Hardened</div>
                            <div className="flex items-center gap-3 text-sky-400/60 font-black uppercase tracking-widest text-[10px]"><Monitor size={16} /> 4GB RAM Optimized</div>
                            <div className="flex items-center gap-3 text-purple-400/60 font-black uppercase tracking-widest text-[10px]"><Code2 size={16} /> OSS Architecture</div>
                        </div>
                    </div>
                </section>

                <footer className="border-t border-white/5 py-32 bg-black/40 relative overflow-hidden">
                    <div className="absolute bottom-0 left-0 w-full h-[500px] bg-gradient-to-t from-sky-500/5 to-transparent pointer-events-none" />
                    <div className="max-w-7xl mx-auto px-8 flex flex-col md:flex-row justify-between items-center gap-12 relative z-10">
                        <div className="flex items-center gap-4 group cursor-pointer" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}>
                            <img src="icon.ico" className="w-12 h-12 grayscale group-hover:grayscale-0 transition-all opacity-40 group-hover:opacity-100" />
                            <span className="font-black text-4xl tracking-tighter text-white opacity-20 group-hover:opacity-100 transition-opacity">COMET</span>
                        </div>
                        <div className="made-in-india-gradient-text text-4xl font-black uppercase tracking-[0.2em] animate-pulse">
                            Made in India 🇮🇳
                        </div>
                        <div className="text-white/10 text-[11px] font-black uppercase tracking-[0.5em] text-center md:text-right">
                            © 2026 Latestinssan <br /> All Neural Systems Secured.
                        </div>
                    </div>
                </footer>
            </div>
        </div>
    );
};

export default LandingPage;
