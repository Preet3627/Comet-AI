import React, { useState, useEffect } from 'react';
import { searchEngines } from "./SearchEngineSettings";
import { useAppStore } from "@/store/useAppStore";
import { motion } from "framer-motion";
import {
    Sparkles,
    Shield,
    Zap,
    Globe,
    LogIn,
    ArrowRight,
    Layers,
    Cpu,
    ChevronLeft,
    UserX,
    Search,
} from "lucide-react";
import AdminDashboard from "./AdminDashboard";
import { firebaseConfigStorage, FirebaseConfig } from "@/lib/firebaseConfigStorage";

const LandingPage = () => {
    const store = useAppStore();
    const [isLoading, setIsLoading] = useState(false);
    const [view, setView] = useState<"home" | "dashboard">("home");
    const [isAdminConsoleOpen, setIsAdminConsoleOpen] = useState(false);
    const [showStartup, setShowStartup] = useState(true);

    useEffect(() => {
        const done = sessionStorage.getItem("comet_startup_done");
        if (done) {
            setShowStartup(false);
            return;
        }
        const t = setTimeout(() => {
            setShowStartup(false);
            sessionStorage.setItem("comet_startup_done", "true");
        }, 3000);
        return () => clearTimeout(t);
    }, []);

    useEffect(() => {
        const handleExternalAuthReturn = () => {
            const p = new URLSearchParams(window.location.search);
            const status = p.get("auth_status");
            const uid = p.get("uid");
            const email = p.get("email");
            const name = p.get("name");
            const photo = p.get("photo");
            const firebaseConfigParam = p.get("firebase_config");

            if (firebaseConfigParam) {
                try {
                    firebaseConfigStorage.save(JSON.parse(atob(firebaseConfigParam)));
                } catch {}
            }

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
            }
        };

        handleExternalAuthReturn();

        const handleMessage = (e: MessageEvent) => {
            if (e.data?.type === "auth-success") {
                if (e.data.firebaseConfig) {
                    firebaseConfigStorage.save(e.data.firebaseConfig);
                }

                const { uid, email, name, photo } = e.data.data || e.data;
                store.setUser({
                    uid,
                    email,
                    displayName: name || "User",
                    photoURL: photo || "",
                });

                if (email?.endsWith("@ponsrischool.in")) store.setAdmin(true);
                store.setActiveView("browser");
                store.startActiveSession();
                setIsLoading(false);
            }
        };

        window.addEventListener("message", handleMessage);
        return () => window.removeEventListener("message", handleMessage);
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
    };

    const handleLogin = async () => {
        setIsLoading(true);
        const redirectUri = window.location.href;
        const encoded = btoa(JSON.stringify(getFirebaseConfigFromEnv()));
        const url = `https://browser.ponsrischool.in/auth?redirect_uri=${encodeURIComponent(
            redirectUri
        )}&firebase_config=${encoded}`;
        window.open(url, "_blank");
    };

    if (showStartup) {
        return (
            <div className="fixed inset-0 bg-[#020205] flex items-center justify-center">
                <motion.h1
                    initial={{ opacity: 0, y: 50, scale: 0.8 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    transition={{
                        duration: 1.5,
                        ease: "easeOut",
                        type: "spring",
                        damping: 10,
                        stiffness: 100
                    }}
                    className="text-6xl md:text-8xl font-black text-white text-center tracking-tighter"
                >
                    Welcome To Future
                </motion.h1>
            </div>
        );
    }

    return (
        <div className="h-screen flex flex-col bg-primary-bg text-primary-text relative">
            {/* NAV */}
            <nav className="fixed top-0 left-0 right-0 z-50 bg-primary-bg/50 backdrop-blur-xl border-b border-border-color">
                <div className="max-w-7xl mx-auto px-8 py-4 flex justify-between">
                    <div className="flex items-center gap-3">
                        <img src="icon.ico" className="w-8 h-8" alt="Comet Browser Logo" />
                        <span className="font-black">COMET</span>
                    </div>
                    <button
                        type="button"
                        onClick={handleLogin}
                        className="px-6 py-2 border border-border-color rounded-xl"
                        aria-label="Login"
                    >
                        <LogIn size={14} />
                    </button>
                </div>
            </nav>

            {/* MAIN */}
            <div className="flex-1 pt-32 overflow-y-auto">
                <main className="max-w-7xl mx-auto px-8 grid lg:grid-cols-2 gap-16">
                    <div>
                        <motion.h1
                            initial={{ opacity: 0, y: 30 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.8, delay: 0.5, ease: "easeOut" }}
                            className="text-5xl md:text-7xl font-black uppercase mb-8 leading-tight tracking-tighter"
                        >
                            The Next Frontier of <br /> Browsing
                        </motion.h1>
                        <motion.div
                            initial={{ opacity: 0, y: 30 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.8, delay: 0.7, ease: "easeOut" }}
                            className="relative flex items-center group"
                        >
                            <Search size={20} className="absolute left-5 text-white/30 group-focus-within:text-deep-space-accent-neon transition-colors" />
                            <input
                                className="w-full p-5 pl-14 rounded-2xl bg-white/5 border border-white/10 text-white placeholder:text-white/30 focus:outline-none focus:ring-2 focus:ring-deep-space-accent-neon/50 focus:border-transparent transition-all duration-300 shadow-md hover:shadow-lg"
                                placeholder="Ask Comet or Search..."
                                onKeyDown={(e) => {
                                    if (e.key === "Enter") {
                                        const q = (e.target as HTMLInputElement).value;
                                        if (q) {
                                            const selectedSearchEngine = searchEngines[store.selectedEngine as keyof typeof searchEngines] || searchEngines.google;
                                            store.setGuestMode(true);
                                            store.addTab(
                                                `${selectedSearchEngine.url}${encodeURIComponent(q)}`
                                            );
                                            store.setActiveView("browser");
                                        }
                                    }
                                }}
                            />
                        </motion.div>
                        {/* New Continue as Guest button */}
                        <motion.button
                            initial={{ opacity: 0, y: 30 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.8, delay: 0.8, ease: "easeOut" }}
                            onClick={handleGuestMode}
                            className="mt-4 w-full p-4 rounded-2xl bg-accent hover:bg-accent-light text-primary-text font-bold text-lg transition-all shadow-md hover:shadow-lg"
                        >
                            Continue as Guest
                        </motion.button>
                    </div>
                </main>

                <section className="mt-24 max-w-7xl mx-auto px-8">
                    <h2 className="text-4xl font-black uppercase mb-8 text-center">How Comet Works</h2>
                    <p className="text-secondary-text text-lg leading-relaxed text-center max-w-3xl mx-auto mb-16">
                        Comet is an intelligent browsing workspace built on a custom-hardened Chromium environment.
                        It integrates native AI, RAG-powered memory, and hardware isolation to offer a fast, secure,
                        and smart browsing experience. Built by a solo high school developer, it's designed to
                        outperform modern browsers in productivity and intelligence even on low-end PCs.
                    </p>

                    <div className="grid md:grid-cols-3 gap-12 text-center">
                        <div className="flex flex-col items-center">
                            <Layers size={48} className="text-accent mb-4" />
                            <h3 className="text-xl font-bold mb-2">Native AI Orchestration</h3>
                            <p className="text-secondary-text">Seamlessly switch between leading AI models like Google Gemini 3, GPT-4o, Claude 3.5, Groq, and even local Ollama (Deepseek R1) for intelligent assistance right in your browser.</p>
                        </div>
                        <div className="flex flex-col items-center">
                            <Cpu size={48} className="text-accent mb-4" />
                            <h3 className="text-xl font-bold mb-2">RAG-Powered Memory</h3>
                            <p className="text-secondary-text">Your browsing context is remembered. Comet builds a local vector database of your sessions, providing "Perplexity-style" answers offline based on your own data.</p>
                        </div>
                        <div className="flex flex-col items-center">
                            <Shield size={48} className="text-accent mb-4" />
                            <h3 className="text-xl font-bold mb-2">Hardware Isolation & Performance</h3>
                            <p className="text-secondary-text">Every tab is sandboxed for maximum security and crash resistance. Optimized for low-end PCs with aggressive tab suspension, ensuring a smooth experience even on 4GB RAM machines.</p>
                        </div>
                    </div>
                </section>

                <section id="full-features" className="py-24 border-t border-border-color mt-24">
                    <h2 className="text-4xl font-black uppercase mb-12 text-center">All Features</h2>
                    <div className="max-w-7xl mx-auto px-8 grid lg:grid-cols-3 gap-x-8 gap-y-12">
                        {/* Intelligence & RAG */}
                        <div>
                            <h3 className="text-2xl font-bold text-accent mb-4">🧠 Intelligence & RAG</h3>
                            <ul className="space-y-3 text-secondary-text">
                                <li><strong>Perplexity-Style Answers:</strong> Ask complex questions to your sidebar. Comet scans your current page and retrieves relevant context from your history.</li>
                                <li><strong>Local Vector DB:</strong> Automatically indexes your browsing for offline semantic search.</li>
                                <li><strong>Deepseek R1 Integration:</strong> Optimized for the 1.5B model running locally via Ollama.</li>
                                <li><strong>OCR & Vision:</strong> Automatic screenshot analysis and text extraction via Tesseract.js.</li>
                            </ul>
                        </div>

                        {/* Performance & Core */}
                        <div>
                            <h3 className="text-2xl font-bold text-accent mb-4">⚡ Performance & Core</h3>
                            <ul className="space-y-3 text-secondary-text">
                                <li><strong>Chromium Rendering Engine:</strong> We use the raw power of Chromium for 100% web compatibility, stripped of bloatware.</li>
                                <li><strong>Optimized for Low-End PCs:</strong> Validated on 4GB RAM machines. Aggressive tab suspension technology.</li>
                                <li><strong>Google Navigation Fixed:</strong> Resolved infinite loop issues with search engine redirects.</li>
                            </ul>
                        </div>

                        {/* Security & Sync */}
                        <div>
                            <h3 className="text-2xl font-bold text-accent mb-4">🛡️ Security & Sync</h3>
                            <ul className="space-y-3 text-secondary-text">
                                <li><strong>Identity-Aware:</strong> Login via `browser.ponsrischool.in` to verify your session.</li>
                                <li><strong>P2P File Drop:</strong> Send files between Mobile and Desktop instantly.</li>
                                <li><strong>Admin Console:</strong> (Enterprise) Manage user access and monitor sync status.</li>
                            </ul>
                        </div>
                    </div>
                </section>

                {/* FEATURES */}
                <section
                    id="features"
                    className="py-32 border-t border-border-color mt-32"
                >
                    <div className="max-w-7xl mx-auto px-8 grid md:grid-cols-3 gap-8">
                        {[
                            { icon: <Zap />, title: "Hyper-Link Sync" },
                            { icon: <Shield />, title: "Quantum Isolation" },
                            { icon: <Cpu />, title: "AI Orchestrator" },
                        ].map((f, i) => (
                            <div
                                key={i}
                                className="p-8 bg-primary-bg/5 rounded-2xl border border-border-color"
                            >
                                {f.icon}
                                <h3 className="mt-4 font-bold">{f.title}</h3>
                            </div>
                        ))}
                    </div>
                </section>
                <h2 className="text-center text-5xl md:text-6xl font-extrabold mb-12 relative z-10">
                    <span className="made-in-india-gradient-text">Made in India 🇮🇳</span>
                </h2>
            </div>


        </div>
    );
};

export default LandingPage;
