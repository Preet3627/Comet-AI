"use client";

import React, { useCallback } from 'react';
import { Minus, Square, X, Maximize2, Settings, Search, LogIn } from 'lucide-react'; // Import Settings icon and Search icon
import { VirtualizedTabBar } from './VirtualizedTabBar';
import { useAppStore } from '@/store/useAppStore';
import { useRouter } from 'next/navigation'; // Import useRouter

interface TitleBarProps {
    onToggleSpotlightSearch: () => void;
    onOpenSettings: () => void;
}

const TitleBar = ({ onToggleSpotlightSearch, onOpenSettings }: TitleBarProps) => {
    const handleMinimize = () => window.electronAPI?.minimizeWindow();
    const handleMaximize = () => window.electronAPI?.maximizeWindow();
    const handleClose = () => window.electronAPI?.closeWindow();
    const handleToggleFullscreen = () => window.electronAPI?.toggleFullscreen();
    const store = useAppStore();
    const router = useRouter(); // Initialize useRouter

    const handleSignIn = useCallback(() => {
        const clientId = store.clientId || '601898745585-8g9t0k72gq4q1a4s1o4d1t6t7e5v4c4g.apps.googleusercontent.com';
        const redirectUri = store.redirectUri || 'https://browser.ponsrischool.in/oauth2callback';

        const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?` +
            `client_id=${clientId}&` +
            `redirect_uri=${redirectUri}&` +
            `response_type=code&` +
            `scope=email profile openid&` + // Request email, profile, and openid
            `access_type=offline&` +
            `prompt=consent`; // Ensure consent screen is shown for new users/permissions

        if (window.electronAPI) {
            window.electronAPI.openAuthWindow(authUrl);
        }
    }, [store.clientId, store.redirectUri]);

    const isTabSuspended = (tabId: string) => {
        const tab = store.tabs.find((t) => t.id === tabId);
        return tab?.isSuspended || false;
    };

    const showTabBar = store.activeView === 'browser';

    const handleOpenSettingsAction = () => {
        onOpenSettings();
    };

    return (
        <div className={`h-10 bg-black/60 backdrop-blur-xl flex items-center justify-between px-4 select-none drag-region fixed top-0 left-0 right-0 z-[200] ${showTabBar ? 'border-b border-white/5' : ''}`}>
            <div className="flex items-center gap-2 no-drag-region">
                <button onClick={handleClose} className="h-3 w-3 rounded-full bg-red-500 hover:bg-red-600 flex items-center justify-center group">
                    <X size={8} className="text-black opacity-0 group-hover:opacity-100" />
                </button>
                <button onClick={handleMinimize} className="h-3 w-3 rounded-full bg-yellow-500 hover:bg-yellow-600 flex items-center justify-center group">
                    <Minus size={8} className="text-black opacity-0 group-hover:opacity-100" />
                </button>
                <button onClick={handleMaximize} className="h-3 w-3 rounded-full bg-green-500 hover:bg-green-600 flex items-center justify-center group">
                    <Maximize2 size={8} className="text-black opacity-0 group-hover:opacity-100" />
                </button>
            </div>
            {/* Comet AI Logo and Text */}
            <div className="flex items-center gap-2 px-3 drag-region">
                <img src="icon.ico" alt="Comet AI Logo" className="w-5 h-5 object-contain" />
                <span className="text-xs font-black uppercase tracking-widest text-white/80">Comet-AI</span>
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
                <button onClick={onToggleSpotlightSearch} className="p-1 text-white/60 hover:text-white transition-colors" title="Global Spotlight Search">
                    <Search size={18} />
                </button>
                {(store.user?.photoURL || store.localPhotoURL) ? (
                    <img
                        src={(store.user && store.user.photoURL) || store.localPhotoURL || ''}
                        alt="Profile"
                        className="w-6 h-6 rounded-full border border-white/10 cursor-pointer object-cover shadow-sm hover:scale-105 transition-transform"
                        onClick={() => router.push('/settings?section=profile')}
                        title={store.user?.displayName || store.user?.email || 'User Profile'}
                    />
                ) : (
                    <button
                        onClick={handleSignIn}
                        className="px-3 py-1 bg-sky-500/10 hover:bg-sky-500/20 rounded-full text-xs font-semibold text-sky-400 border border-sky-500/30 transition-colors flex items-center gap-1"
                        title="Sign in with Comet ID"
                    >
                        <LogIn size={14} />
                        <span>Sign in</span>
                    </button>
                )}
                <button onClick={handleOpenSettingsAction} className="ml-2 p-1 text-white/60 hover:text-white transition-colors">
                    <Settings size={18} />
                </button>
            </div>
        </div>
    );
};

export default TitleBar;
