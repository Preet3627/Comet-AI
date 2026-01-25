"use client";

import React from 'react';
import { useAppStore } from '@/store/useAppStore';
import { motion } from 'framer-motion';
import { LogIn, User } from 'lucide-react';

const WelcomeScreen = () => {
    const { setHasSeenWelcomePage, setGuestMode } = useAppStore();

    const handleSignIn = () => {
        setHasSeenWelcomePage(true);
    };

    const handleGuestMode = () => {
        setGuestMode(true);
        setHasSeenWelcomePage(true);
    };

    return (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/80 backdrop-blur-lg">
            <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="w-full max-w-md bg-deep-space-bg border border-white/10 rounded-[2.5rem] p-12 text-center shadow-2xl"
            >
                <h1 className="text-4xl font-black text-white mb-4">Welcome to Comet</h1>
                <p className="text-white/50 mb-4">Your intelligent browsing workspace.</p>
                <p className="text-white/60 text-sm mb-12">
                    Experience native AI orchestration, RAG-powered memory, hardware isolation for every tab, and decentralized sync
                    across your devices. Built for speed, security, and intelligence.
                </p>

                <div className="text-left text-white/70 text-sm mt-8 space-y-4">
                    <h2 className="text-xl font-bold text-white text-center">Key Features:</h2>
                    <ul className="list-disc list-inside space-y-2">
                        <li><strong>AI Orchestration:</strong> Seamlessly integrate Google Gemini 3, GPT-4o, Claude 3.5, Groq, and Local Ollama for intelligent browsing.</li>
                        <li><strong>RAG-Powered Memory:</strong> Your browsing context is remembered, providing "Perplexity-style" answers offline based on your sessions.</li>
                        <li><strong>Hardware Isolation:</strong> Each tab is sandboxed for maximum security and crash resistance.</li>
                        <li><strong>Optimized Performance:</strong> Designed to run smoothly even on low-end PCs (4GB RAM) with aggressive tab suspension.</li>
                        <li><strong>Decentralized Sync:</strong> Sync your data across devices using P2P or Firebase with end-to-end encryption.</li>
                        <li><strong>Native Windows AI:</strong> Run Ollama locally on Windows without WSL, allowing offline AI capabilities.</li>
                    </ul>
                </div>

                <div className="space-y-4">
                    <button
                        onClick={handleSignIn}
                        className="w-full flex items-center justify-center gap-3 px-6 py-4 bg-deep-space-accent-neon text-deep-space-bg rounded-xl text-sm font-black uppercase tracking-widest hover:bg-opacity-80 transition-all"
                    >
                        <LogIn size={20} />
                        Sign In / Create Account
                    </button>
                    <button
                        onClick={handleGuestMode}
                        className="w-full flex items-center justify-center gap-3 px-6 py-4 bg-white/10 border border-white/20 text-white rounded-xl text-sm font-black uppercase tracking-widest hover:bg-white/20 transition-all"
                    >
                        <User size={20} />
                        Continue as Guest
                    </button>
                </div>
            </motion.div>
        </div>
    );
};

export default WelcomeScreen;
