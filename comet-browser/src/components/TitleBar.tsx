"use client";

import React from 'react';
import { Minus, Square, X, Maximize2, Minimize2 } from 'lucide-react';
import { VirtualizedTabBar } from './VirtualizedTabBar';
import { useAppStore } from '@/store/useAppStore';

const TitleBar = () => {
    const handleMinimize = () => window.electronAPI?.minimizeWindow();
    const handleMaximize = () => window.electronAPI?.maximizeWindow();
    const handleClose = () => window.electronAPI?.closeWindow();
    const handleToggleFullscreen = () => window.electronAPI?.toggleFullscreen();
    const store = useAppStore();

    const isTabSuspended = (tabId: string) => {
        const tab = store.tabs.find((t) => t.id === tabId);
        return tab?.isSuspended || false;
    };

    const showTabBar = store.activeView === 'browser';

    return (
        <div className={`h-10 bg-black/60 backdrop-blur-xl flex items-center justify-between px-4 select-none drag-region fixed top-0 left-0 right-0 z-[200] ${showTabBar ? 'border-b border-white/5' : ''}`}>
            <div className="flex items-center gap-3">
                {store.user?.photoURL ? (
                    <img
                        src={store.user.photoURL}
                        alt="Profile"
                        className="w-6 h-6 rounded-full border border-white/5"
                    />
                ) : (
                    <div className="w-5 h-5 flex items-center justify-center">
                        <img src="icon.ico" alt="Comet" className="w-full h-full object-contain opacity-80" />
                    </div>
                )}
                <span className="text-[10px] font-black uppercase tracking-[0.2em] text-secondary-text">Comet</span>
            </div>
            {showTabBar && (
                <div className="flex-1 min-w-0">
                    <VirtualizedTabBar
                        tabs={store.tabs}
                        activeTabId={store.activeTabId}
                        onTabClick={(tabId) => store.setActiveTabId(tabId)}
                        onTabClose={(tabId) => store.removeTab(tabId)}
                        onAddTab={() => store.addTab()}
                        isTabSuspended={isTabSuspended}
                        maxVisibleTabs={10}
                    />
                </div>
            )}

            <div className="flex items-center no-drag-region h-full">
                <button
                    onClick={handleMinimize}
                    className="h-full px-4 hover:bg-primary-bg/5 text-secondary-text hover:text-primary-text transition-colors"
                >
                    <Minus size={14} />
                </button>
                <button
                    onClick={handleToggleFullscreen}
                    className="h-full px-4 hover:bg-primary-bg/5 text-secondary-text hover:text-primary-text transition-colors"
                >
                    <Maximize2 size={12} />
                </button>
                <button
                    onClick={handleMaximize}
                    className="h-full px-4 hover:bg-primary-bg/5 text-secondary-text hover:text-primary-text transition-colors"
                >
                    <Square size={12} />
                </button>
                <button
                    onClick={handleClose}
                    className="h-full px-4 hover:bg-red-500/20 text-secondary-text hover:text-red-500 transition-colors"
                >
                    <X size={14} />
                </button>
            </div>
        </div>
    );
};

export default TitleBar;
