"use client";

import React from 'react';
import { Minus, Square, X } from 'lucide-react';

const TitleBar = () => {
    const handleMinimize = () => window.electronAPI?.minimizeWindow();
    const handleMaximize = () => window.electronAPI?.maximizeWindow();
    const handleClose = () => window.electronAPI?.closeWindow();

    return (
        <div className="h-10 bg-[#0D0E1C] border-b border-white/5 flex items-center justify-between px-4 select-none drag-region fixed top-0 left-0 right-0 z-[200]">
            <div className="flex items-center gap-2">
                <div className="w-5 h-5 rounded-lg bg-[#00ffff] flex items-center justify-center shadow-[0_0_15px_rgba(0,255,255,0.3)] p-0.5">
                    <img src="/icon.ico" alt="Comet" className="w-full h-full object-contain" />
                </div>
                <span className="text-[10px] font-black uppercase tracking-[0.2em] text-white/40">Comet Browser</span>
            </div>

            <div className="flex items-center no-drag-region h-full">
                <button
                    onClick={handleMinimize}
                    className="h-full px-4 hover:bg-white/5 text-white/40 hover:text-white transition-colors"
                >
                    <Minus size={14} />
                </button>
                <button
                    onClick={handleMaximize}
                    className="h-full px-4 hover:bg-white/5 text-white/40 hover:text-white transition-colors"
                >
                    <Square size={12} />
                </button>
                <button
                    onClick={handleClose}
                    className="h-full px-4 hover:bg-red-500/20 text-white/40 hover:text-red-500 transition-colors"
                >
                    <X size={14} />
                </button>
            </div>

            <style jsx>{`
                .drag-region {
                    -webkit-app-region: drag;
                }
                .no-drag-region {
                    -webkit-app-region: no-drag;
                }
            `}</style>
        </div>
    );
};

export default TitleBar;
