/// <reference path="../types/electron.d.ts" />
"use client";

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useAppStore } from '@/store/useAppStore';
import { BrowserAI } from '@/lib/BrowserAI';
import { AnimatePresence, motion } from 'framer-motion';
import {
  ShoppingBag, FileText, Globe, Plus, Bookmark, ChevronLeft, ChevronRight,
  RotateCw, AlertTriangle, ShieldCheck, DownloadCloud, ShoppingCart, Copy as CopyIcon,
  Terminal, Settings as GhostSettings, FolderOpen, Sparkles, ScanLine, Search, X,
  Puzzle, Code2, Briefcase, Image as ImageIcon, User as UserIcon, Maximize2, Minimize2, RefreshCcw, Download as DownloadIcon,
  Layout, MoreVertical, CreditCard
} from 'lucide-react';
import AIChatSidebar from '@/components/AIChatSidebar';
import LandingPage from '@/components/LandingPage';
import WebStore from '@/components/WebStore';
import PDFWorkspace from '@/components/PDFWorkspace';
import CodingDashboard from '@/components/CodingDashboard';
import ClipboardManager from '@/components/ClipboardManager';
import PhoneCamera from '@/components/PhoneCamera';
import SettingsPanel from '@/components/SettingsPanel';
import { searchEngines } from '@/components/SearchEngineSettings';
import UnifiedCartPanel from '@/components/UnifiedCartPanel';
import WorkspaceDashboard from '@/components/WorkspaceDashboard';
import MediaStudio from '@/components/MediaStudio';

import CloudSyncConsent from "@/components/CloudSyncConsent";
import NoNetworkGame from "@/components/NoNetworkGame";
import AIAssistOverlay from "@/components/AIAssistOverlay";

import { firebaseSyncService } from "@/lib/FirebaseSyncService";
import firebaseService from '@/lib/FirebaseService';
import { QuickNavOverlay } from '@/components/QuickNavOverlay';
import TitleBar from '@/components/TitleBar';
import { useOptimizedTabs } from '@/hooks/useOptimizedTabs';
import { VirtualizedTabBar } from '@/components/VirtualizedTabBar';
import { TabSwitcherOverlay } from '@/components/TabSwitcherOverlay';

const SidebarIcon = ({ icon, label, active, onClick, collapsed }: { icon: React.ReactNode, label: string, active: boolean, onClick: () => void, collapsed: boolean }) => (
  <button
    onClick={onClick}
    className={`group relative flex items-center justify-center w-12 h-12 rounded-2xl transition-all duration-300 ${active ? 'bg-accent text-primary-bg shadow-[0_0_20px_rgba(var(--color-accent),0.2)]' : 'text-secondary-text hover:bg-primary-bg/10 hover:text-primary-text'}`}
  >
    {icon}
    {collapsed && (
      <div className="absolute left-full ml-4 px-3 py-1.5 bg-primary-bg border border-border-color rounded-lg text-[10px] font-black uppercase tracking-widest text-primary-text opacity-0 group-hover:opacity-100 transition-all pointer-events-none whitespace-nowrap z-[100] shadow-2xl">
        {label}
      </div>
    )}
    {!collapsed && (
      <span className="absolute left-full ml-4 text-[10px] font-bold uppercase tracking-[0.2em] text-secondary-text opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
        {label}
      </span>
    )}
  </button>
);

const MusicVisualizer = ({ color = 'rgb', isPlaying = false }: { color?: string, isPlaying: boolean }) => {
  if (!isPlaying) return null;

  return (
    <div className="flex gap-[2px] items-center h-3">
      {[...Array(5)].map((_, i) => (
        <motion.div
          key={i}
          animate={{
            height: [4, 12, 6, 10, 4],
            backgroundColor: color === 'rgb'
              ? ['#00ffff', '#ff00ff', '#00ff00', '#ffff00', '#00ffff']
              : [color, color, color]
          }}
          transition={{
            duration: 0.5 + Math.random() * 0.5,
            repeat: Infinity,
            ease: "easeInOut",
            delay: i * 0.1,
            backgroundColor: { duration: 3, repeat: Infinity, ease: "linear" }
          }}
          className="w-[2px] bg-white/40 rounded-full"
          style={{ boxShadow: color === 'rgb' ? '0 0 8px rgba(var(--color-primary-text), 0.2)' : `0 0 8px ${color}80` }}
        />
      ))}
    </div>
  );
};

export default function Home() {
  const store = useAppStore();
  const { shouldRenderTab, isTabSuspended } = useOptimizedTabs();
  const [showClipboard, setShowClipboard] = useState(false);
  const [showCamera, setShowCamera] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showCart, setShowCart] = useState(false);
  const [urlPrediction, setUrlPrediction] = useState<string | null>(null);
  const [isTyping, setIsTyping] = useState(false);
  const [contextMenu, setContextMenu] = useState<{ x: number, y: number, visible: boolean } | null>(null);
  const [aiOverview, setAiOverview] = useState<{ query: string, result: string | null, sources: { text: string; metadata: any; }[] | null, isLoading: boolean } | null>(null);
  const [showTabSwitcher, setShowTabSwitcher] = useState(false);
  const [railVisible, setRailVisible] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showContextMenu, setShowContextMenu] = useState<{ x: number, y: number } | null>(null);
  const contextMenuRef = useRef<HTMLDivElement>(null);
  const [isAudioPlaying, setIsAudioPlaying] = useState(false);
  const [aiPickColor, setAiPickColor] = useState('rgb'); // 'rgb' or a hex string
  const [isDownloading, setIsDownloading] = useState(false);
  const [downloadStatus, setDownloadStatus] = useState<'idle' | 'in_progress' | 'completed' | 'failed'>('idle');

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen();
      setIsFullscreen(true);
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen();
        setIsFullscreen(false);
      }
    }
  };

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();

    const menuWidth = 192; // w-48 = 192px
    const menuHeight = 250; // Approximate height based on content
    const padding = 16; // Some padding from the edge of the screen

    let x = e.clientX;
    let y = e.clientY;

    if (e.clientX + menuWidth + padding > window.innerWidth) {
      x = window.innerWidth - menuWidth - padding;
    }

    if (e.clientY + menuHeight + padding > window.innerHeight) {
      y = window.innerHeight - menuHeight - padding;
    }

    setShowContextMenu({ x, y });
  };

  const isBookmarked = store.bookmarks.some(b => b.url === store.currentUrl);

  const handleBookmark = () => {
    const activeTab = store.tabs.find(t => t.id === store.activeTabId);
    if (activeTab) {
      if (isBookmarked) {
        store.removeBookmark(activeTab.url);
      } else {
        store.addBookmark({ url: activeTab.url, title: activeTab.title || activeTab.url });
      }
    }
  };

  // Tab Switching logic (Alt + Tab and Alt + Scroll)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.altKey && e.key === 'Tab') {
        e.preventDefault();
        setShowTabSwitcher(true);
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.key === 'Alt') {
        setShowTabSwitcher(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, []);

  useEffect(() => {
    const handleWheel = (e: WheelEvent) => {
      if (e.ctrlKey) {
        e.preventDefault();
        if (window.electronAPI) {
          window.electronAPI.changeZoom(e.deltaY);
        }
      } else if (e.altKey) {
        e.preventDefault();
        if (e.deltaY > 0) store.nextTab();
        else store.prevTab();
      }
    };
    window.addEventListener('wheel', handleWheel, { passive: false });
    return () => window.removeEventListener('wheel', handleWheel);
  }, [store]);

  const triggerAIAnalysis = async (query: string) => {
    if (!store.enableAIAssist) return;
    setAiOverview({ query, result: null, sources: null, isLoading: true });
    try {
      if (window.electronAPI) {
        const localContext = await BrowserAI.retrieveContext(query);
        const contextString = localContext.map(c => c.text).join('\n\n');

        const result = await window.electronAPI.generateChatContent([
          {
            role: 'user',
            content: `Synthesize a comprehensive, Perplexity-style answer for: \"${query}\". 
            Include:
            1. A clear direct answer (2 paragraphs max).
            2. 3 deep insights.
            3. Contextual relevance to the user's local data.${contextString}
            Format with HTML bolding and clear sections.`
          }
        ], { provider: store.aiProvider });

        setAiOverview(prev => prev ? { ...prev, result: result.text || result.error || "Neural link stable, but no data returned.", sources: localContext, isLoading: false } : null);
      } else {
        setTimeout(() => setAiOverview(prev => prev ? { ...prev, result: "AI Engine not connected in this environment.", sources: null, isLoading: false } : null), 1000);
      }
    } catch (e) {
      setAiOverview(prev => prev ? { ...prev, result: "Analysis failed due to local connectivity issues.", sources: null, isLoading: false } : null);
    }
  };

  // Apply Theme
  useEffect(() => {
    const root = window.document.documentElement;
    root.classList.remove('light', 'dark');
    if (store.theme === 'system') {
      const systemTheme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
      root.classList.add(systemTheme);
    } else {
      root.classList.add(store.theme);
    }
  }, [store.theme]);

  // Init Browser Intelligence
  useEffect(() => {
    BrowserAI.initURLPredictor();
  }, []);

  // AI Query Interception
  useEffect(() => {
    if (window.electronAPI && store.enableAIAssist) {
      const cleanup = window.electronAPI.onAiQueryDetected((query: any) => {
        triggerAIAnalysis(query);
      });
      return cleanup;
    }
  }, [store.enableAIAssist]);

  // Fetch initial online status and listen for changes
  useEffect(() => {
    if (window.electronAPI) {
      window.electronAPI.getIsOnline().then((onlineStatus) => {
        store.setIsOnline(onlineStatus);
        console.log("Initial online status:", onlineStatus);
      });
    }
  }, []);

  // Debounced Predictor
  useEffect(() => {
    const timer = setTimeout(async () => {
      if (isTyping && store.currentUrl.length > 2) {
        const pred = await BrowserAI.predictUrl(store.currentUrl, store.history.map(h => h.url));
        setUrlPrediction(pred);
      } else {
        setUrlPrediction(null);
      }
    }, 150);
    return () => clearTimeout(timer);
  }, [store.currentUrl, isTyping, store.history]);

  // Active Time Tracker
  useEffect(() => {
    if (store.user && store.activeStartTime) {
      const interval = setInterval(() => {
        store.updateActiveTime();
      }, 30000); // Pulse every 30 seconds

      return () => clearInterval(interval);
    }
  }, [store.user, store.activeStartTime]);

  useEffect(() => {
    if (store.cloudSyncConsent) {
      console.log("Cloud sync consented. Initializing sync...");
      firebaseSyncService.syncClipboard();
    }
  }, [store.cloudSyncConsent]);

  // Audio Playback Listener
  useEffect(() => {
    if (window.electronAPI) {
      const cleanup = window.electronAPI.onAudioStatusChanged((isPlaying) => {
        setIsAudioPlaying(isPlaying);

        // "AI" Color Picker - select a premium color when audio starts
        if (isPlaying) {
          const premiumColors = ['rgb', '#00E5FF', '#FF00E5', '#7000FF', '#00FF94', '#FFD600'];
          const randomColor = premiumColors[Math.floor(Math.random() * premiumColors.length)];
          setAiPickColor(randomColor);
        }
      });
      return cleanup;
    }
  }, []);

  // Download Status Listener
  useEffect(() => {
    if (window.electronAPI) {
      const cleanupStarted = window.electronAPI.onDownloadStarted((filename: string) => {
        console.log(`Download started: ${filename}`);
        setDownloadStatus('in_progress');
        setIsDownloading(true);
      });

      const cleanupComplete = window.electronAPI.on('download-complete', (filename: string) => {
        console.log(`Download completed: ${filename}`);
        setDownloadStatus('completed');
        setIsDownloading(false);
        setTimeout(() => setDownloadStatus('idle'), 3000); // Reset status after 3 seconds
      });

      const cleanupFailed = window.electronAPI.on('download-failed', (filename: string) => {
        console.error(`Download failed: ${filename}`);
        setDownloadStatus('failed');
        setIsDownloading(false);
        setTimeout(() => setDownloadStatus('idle'), 3000); // Reset status after 3 seconds
      });

      return () => {
        cleanupStarted();
        cleanupComplete();
        cleanupFailed();
      };
    }
  }, []);

  // Handle Global Shortcuts from Main Process
  useEffect(() => {
    if (window.electronAPI) {
      const cleanup = window.electronAPI.onShortcut((action: string) => {
        switch (action) {
          case 'new-tab': store.addTab(); break;
          case 'close-tab': store.removeTab(store.activeTabId); break;
          case 'next-tab': store.nextTab(); break;
          case 'prev-tab': store.prevTab(); break;
          case 'toggle-sidebar': store.toggleSidebar(); break;
          case 'open-settings': setShowSettings(true); break;
          case 'new-incognito-tab': store.addIncognitoTab(); break;
        }
      });
      return cleanup;
    }
  }, [store.addTab, store.removeTab, store.activeTabId, store.nextTab, store.prevTab, store.toggleSidebar]);

  const handleGo = () => {
    let url = store.currentUrl.trim();
    if (!url) return;

    const isAuthUrl = (testUrl: string) => {
      try {
        const hostname = new URL(testUrl).hostname;
        return hostname.includes('accounts.google.com') || hostname.includes('accounts.youtube.com') || hostname.includes('browser.ponsrischool.in');
      } catch {
        return false;
      }
    };

    if (isAuthUrl(url) && window.electronAPI) {
      window.electronAPI.openAuthWindow(url);
      return;
    }

    if (/^[0-9+\-*/().\s]+$/.test(url)) {
      try {
        const result = eval(url);
        const searchUrl = `${searchEngines[store.selectedEngine as keyof typeof searchEngines].url}${encodeURIComponent(url + " = " + result)}`;
        if (window.electronAPI) {
          window.electronAPI.navigateBrowserView({ tabId: store.activeTabId, url: searchUrl });
        }
        return;
      } catch (e) { }
    }

    if (url.startsWith('/')) {
      // ... command logic
    }

    if (url.includes('.') && !url.includes(' ') && !url.startsWith('http')) {
      url = `https://${url}`;
    } else if (!url.startsWith('http')) {
      url = `${searchEngines[store.selectedEngine as keyof typeof searchEngines].url}${encodeURIComponent(url)}`;
      if (store.enableAIAssist) triggerAIAnalysis(store.currentUrl.trim());
    }

    if (window.electronAPI) {
      window.electronAPI.navigateBrowserView({ tabId: store.activeTabId, url });
    }
  };

  const handleOfflineSave = async () => {
    if (!window.electronAPI) return;
    const html = await window.electronAPI.capturePageHtml();
    const activeTab = store.tabs.find(t => t.id === store.activeTabId);
    if (activeTab) {
      await window.electronAPI.saveOfflinePage({ url: activeTab.url, title: activeTab.title, html });
      store.savePageOffline(activeTab.url, activeTab.title, html);
    }
  };

  const handleCartScan = async () => {
    if (!window.electronAPI) return;
    try {
      const result = await window.electronAPI.executeJavaScript(`
        (function() {
          const items = [];
          const priceRegex = /\\$[0-9,]+(\\.[0-9]{2})?/;
          
          document.querySelectorAll('h1, h2, .product-title, .product-name').forEach(el => {
            const text = el.innerText.trim();
            if (text.length > 5 && text.length < 100) {
              const priceMatch = document.body.innerText.match(priceRegex);
              items.push({
                id: Math.random().toString(36).substr(2, 9),
                item: text,
                site: window.location.hostname,
                price: priceMatch ? priceMatch[0] : '$???'
              });
            }
          });
          return items.slice(0, 1); // Just take the most prominent one for now
        })()
      `);
      if (result && result.length > 0) {
        result.forEach((item: any) => store.addToUnifiedCart(item));
        setShowCart(true);
      }
    } catch (e) {
      console.error("Cart scan failed:", e);
    }
  };

  const calculateBounds = useCallback(() => {
    const sidebarWidth = !store.sidebarOpen ? 0 : (store.isSidebarCollapsed ? 70 : (store.sidebarWidth + 70));
    const headerHeight = 40 + 56 + 40; // TitleBar (40) + Toolbar (56) + TabBar (40) - the original tab bar height was 10px, but I'm guessing that padding and other elements were also present and I'll make a more generous assumption for the tab bar height and use 40px
    const x = store.sidebarSide === 'left' ? sidebarWidth : 0;
    const width = window.innerWidth - sidebarWidth;
    const safeWidth = Math.max(0, Math.round(width));
    const safeHeight = Math.max(0, window.innerHeight - headerHeight);
    const safeX = Math.round(x);
    return { x: safeX, y: headerHeight, width: safeWidth, height: safeHeight };
  }, [store.sidebarOpen, store.isSidebarCollapsed, store.sidebarWidth, store.sidebarSide]);

  useEffect(() => {
    if (window.electronAPI) {
      const bounds = calculateBounds();
      window.electronAPI.setBrowserViewBounds(bounds);
    }
    window.addEventListener('resize', calculateBounds);
    return () => window.removeEventListener('resize', calculateBounds);
  }, [calculateBounds]);

  // View Management Effects
  useEffect(() => {
    if (window.electronAPI) {
      store.tabs.forEach(tab => {
        window.electronAPI.createView({ tabId: tab.id, url: tab.url });
      });

      if (store.activeTabId) {
        const bounds = calculateBounds();
        window.electronAPI.activateView({ tabId: store.activeTabId, bounds });
      }
    }
  }, []);

  useEffect(() => {
    if (window.electronAPI) {
      if (store.activeView === 'browser' && store.activeTabId) {
        const bounds = calculateBounds();
        window.electronAPI.activateView({ tabId: store.activeTabId, bounds });
      } else {
        window.electronAPI.hideAllViews();
      }
    }
  }, [store.activeTabId, store.activeView, calculateBounds]);

  useEffect(() => {
    if (window.electronAPI) {
      const cleanUrl = window.electronAPI.onBrowserViewUrlChanged(({ tabId, url }) => {
        if (store.tabs.find(t => t.id === tabId)) {
          store.updateTab(tabId, { url });
          if (tabId === store.activeTabId) {
            store.setCurrentUrl(url);
          }
        }
      });

      const cleanTitle = window.electronAPI.onBrowserViewTitleChanged(({ tabId, title }) => {
        if (store.tabs.find(t => t.id === tabId)) {
          store.updateTab(tabId, { title });
        }
      });

      return () => {
        cleanUrl();
        cleanTitle();
      };
    }
  }, [store.activeTabId, store.tabs]);



  useEffect(() => {
    if (window.electronAPI) {
      const cleanup = window.electronAPI.onAddNewTab((url: string) => {
        store.addTab(url);
      });
      return cleanup;
    }
  }, [store]);

  useEffect(() => {
    if (window.electronAPI) {
      const cleanup = window.electronAPI.onAuthTokenReceived((token: string) => {
        console.log("Auth token received from deep link:", token);
        store.loginWithGoogleToken(token);
      });
      return cleanup;
    }
  }, [store]);

  if (!store.user && !store.hasSeenWelcomePage) {
    return <LandingPage />;
  }

  return (
    <div className={`flex flex-col h-screen w-full bg-primary-bg overflow-hidden relative font-sans text-primary-text transition-all duration-700 ${store.isVibrant ? 'bg-vibrant-mesh' : ''}`}>
      {(store.user || store.hasSeenWelcomePage) && <TitleBar />}
      <div className={`flex flex-1 overflow-hidden relative ${(!store.user && !store.hasSeenWelcomePage) ? 'pt-0' : 'pt-10'}`} onContextMenu={handleContextMenu}>
        {/* Navigation Sidebar (Rail) */}
        <AnimatePresence>
          {railVisible && (
            <motion.div
              initial={{ width: 0, opacity: 0 }}
              animate={{ width: 70, opacity: 1 }}
              exit={{ width: 0, opacity: 0 }}
              className="flex flex-col items-center py-6 gap-6 z-30 border-r border-border-color bg-primary-bg/20 backdrop-blur-xl"
            >
              <SidebarIcon
                icon={<Globe size={20} />}
                label="Browser"
                active={store.activeView === 'browser'}
                onClick={() => store.setActiveView('browser')}
                collapsed={true}
              />
              <SidebarIcon
                icon={<Briefcase size={20} />}
                label="Workspace"
                active={store.activeView === 'workspace'}
                onClick={() => store.setActiveView('workspace')}
                collapsed={true}
              />
              <SidebarIcon
                icon={<ShoppingBag size={20} />}
                label="Web Store"
                active={store.activeView === 'webstore'}
                onClick={() => store.setActiveView('webstore')}
                collapsed={true}
              />
              <SidebarIcon
                icon={<FileText size={20} />}
                label="PDF Studio"
                active={store.activeView === 'pdf'}
                onClick={() => store.setActiveView('pdf')}
                collapsed={true}
              />
              <SidebarIcon
                icon={<ImageIcon size={20} />}
                label="Media Lab"
                active={store.activeView === 'media'}
                onClick={() => store.setActiveView('media')}
                collapsed={true}
              />
              <SidebarIcon
                icon={<Code2 size={20} />}
                label="Dev Mode"
                active={store.activeView === 'coding'}
                onClick={() => store.setActiveView('coding')}
                collapsed={true}
              />
            </motion.div>
          )}
        </AnimatePresence>

        <AnimatePresence>
          {store.sidebarOpen && (
            <motion.div
              drag="x"
              dragConstraints={{ left: 0, right: 0 }}
              onDragEnd={(e, info) => {
                if (info.offset.x > 100 && store.sidebarSide === 'left') store.setSidebarSide('right');
                if (info.offset.x < -100 && store.sidebarSide === 'right') store.setSidebarSide('left');
              }}
              initial={{ width: 0, opacity: 0 }}
              animate={{ width: store.isSidebarCollapsed ? 70 : store.sidebarWidth, opacity: 1 }}
              exit={{ width: 0, opacity: 0 }}
              transition={{ duration: 0.5, ease: 'easeInOut' }}
              className={`h-full border-r border-border-color cursor-grab active:cursor-grabbing ${store.sidebarSide === 'left' ? 'order-first' : 'order-last'}`}
            >
              <AIChatSidebar
                studentMode={store.studentMode}
                toggleStudentMode={() => store.setStudentMode(!store.studentMode)}
                isCollapsed={store.isSidebarCollapsed}
                toggleCollapse={store.toggleSidebarCollapse}
                selectedEngine={store.selectedEngine}
                setSelectedEngine={store.setSelectedEngine}
                theme={store.theme}
                setTheme={store.setTheme}
                backgroundImage=""
                setBackgroundImage={() => { }}
                backend={store.backendStrategy}
                setBackend={store.setBackendStrategy}
                mysqlConfig={store.customMysqlConfig}
                setMysqlConfig={store.setCustomMysqlConfig}
                side={store.sidebarSide}
              />
            </motion.div>
          )}
        </AnimatePresence>
        <main className="flex-1 flex flex-col relative overflow-hidden bg-black/5">
          {store.activeView === 'browser' && (
            <header className="h-[56px] flex items-center px-4 gap-4 border-b border-border-color bg-primary-bg/20 backdrop-blur-3xl z-40">
              <div className="flex items-center gap-1">
                <button onClick={() => setRailVisible(!railVisible)} className={`p-2 rounded-xl transition-all ${railVisible ? 'text-secondary-text' : 'bg-accent text-primary-bg'}`} title="Toggle Tools Rail">
                  <Layout size={18} />
                </button>
                <button onClick={async () => {
                  if (window.electronAPI) {
                    const selectedText = await window.electronAPI.getSelectedText();
                    if (selectedText) {
                      window.electronAPI.sendToAIChatInput(selectedText);
                    }
                  }
                  store.toggleSidebar();
                }} className="p-2 rounded-xl hover:bg-primary-bg/10 text-secondary-text hover:text-primary-text transition-all" title="AI Analyst">
                  <Sparkles size={18} />
                </button>
                <div className="w-[1px] h-4 bg-border-color mx-1" />
                <button onClick={() => window.electronAPI?.goBack()} className="p-2 rounded-xl hover:bg-primary-bg/10 text-secondary-text hover:text-primary-text transition-all" title="Go Back"><ChevronLeft size={18} /></button>
                <button onClick={() => window.electronAPI?.goForward()} className="p-2 rounded-xl hover:bg-primary-bg/10 text-secondary-text hover:text-primary-text transition-all" title="Go Forward"><ChevronRight size={18} /></button>
                <button onClick={() => window.electronAPI?.reload()} className="p-2 rounded-xl hover:bg-primary-bg/10 text-secondary-text hover:text-primary-text transition-all" title="Reload Page"><RotateCw size={18} /></button>
              </div>
              <div className="flex-1 max-w-4xl relative group flex items-center gap-3">
                <div className="flex-1 relative">
                  <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none">
                    <Search size={14} className="text-secondary-text group-focus-within:text-primary-text transition-colors" />
                  </div>
                  <input
                    type="text"
                    value={store.currentUrl === 'about:blank' ? '' : store.currentUrl}
                    onChange={(e) => store.setCurrentUrl(e.target.value)}
                    onFocus={() => setIsTyping(true)}
                    onBlur={() => setIsTyping(false)}
                    onKeyDown={(e) => e.key === 'Enter' && handleGo()}
                    placeholder="Search with Comet or enter URL..."
                    className="w-full bg-primary-bg/5 border border-border-color rounded-2xl py-2 pl-11 pr-4 text-xs text-primary-text placeholder:text-secondary-text focus:outline-none focus:ring-1 focus:ring-accent/50 focus:bg-primary-bg/10 transition-all font-medium"
                  />
                  <div className="absolute top-0 left-0 right-0 h-[2px] overflow-hidden pointer-events-none rounded-t-2xl">
                    <motion.div animate={{ x: ['-100%', '100%'] }} transition={{ duration: 3, repeat: Infinity, ease: 'linear' }} className="w-1/2 h-full bg-gradient-to-r from-transparent via-primary-text/10 to-transparent" />
                  </div>
                  <div className="absolute right-4 top-1/2 -translate-y-1/2">
                    <MusicVisualizer color={aiPickColor} isPlaying={isAudioPlaying} />
                  </div>
                </div>

                <div className="flex items-center gap-1.5 px-2 bg-primary-bg/5 rounded-xl border border-border-color h-9">
                  <button
                    onClick={() => {
                      // Optionally, show a downloads manager or recent downloads here
                    }}
                    className={`p-1.5 rounded-lg transition-all 
                               ${isDownloading ? 'text-accent animate-pulse' : ''}
                               ${downloadStatus === 'completed' ? 'text-green-400' : ''}
                               ${downloadStatus === 'failed' ? 'text-red-400' : ''}
                               ${downloadStatus === 'idle' ? 'text-secondary-text hover:text-primary-text' : ''}
                               hover:bg-primary-bg/10`}
                    title="Downloads"
                  >
                    <DownloadCloud size={14} />
                  </button>
                  <button onClick={() => setShowClipboard(!showClipboard)} className={`p-1.5 rounded-lg transition-all ${showClipboard ? 'text-accent bg-primary-bg/10' : 'text-secondary-text hover:text-primary-text'}`} title="Clipboard Manager">
                    <CopyIcon size={14} />
                  </button>
                  <button onClick={handleCartScan} className={`p-1.5 rounded-lg transition-all ${showCart ? 'text-accent bg-primary-bg/10' : 'text-secondary-text hover:text-primary-text'}`} title="Scan Shopping Cart">
                    <ShoppingCart size={14} />
                  </button>
                  <button className="p-1.5 text-secondary-text hover:text-primary-text transition-all" title="Extensions">
                    <Puzzle size={14} />
                  </button>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button onClick={toggleFullscreen} className="p-2 rounded-xl hover:bg-primary-bg/10 text-secondary-text hover:text-primary-text transition-all" title="Toggle Fullscreen">
                  {isFullscreen ? <Minimize2 size={18} /> : <Maximize2 size={18} />}
                </button>
                <button onClick={handleOfflineSave} className="p-2 rounded-xl hover:bg-primary-bg/10 text-secondary-text hover:text-primary-text transition-all" title="Download Page">
                  <DownloadIcon size={18} />
                </button>

                <div className="w-[1px] h-6 bg-border-color mx-1" />

                <button onClick={() => setShowSettings(true)} className="p-1 rounded-2xl hover:scale-105 transition-all outline-none">
                  {store.user?.photoURL ? (
                    <img src={store.user.photoURL} alt="Profile" className="w-8 h-8 rounded-xl border border-border-color" />
                  ) : (
                    <div className="w-8 h-8 rounded-xl bg-primary-bg/5 border border-border-color flex items-center justify-center text-secondary-text">
                      <UserIcon size={16} />
                    </div>
                  )}
                </button>

                <button onClick={(e) => handleContextMenu(e as any)} className="p-2 rounded-xl hover:bg-primary-bg/10 text-secondary-text hover:text-primary-text transition-all" title="More">
                  <MoreVertical size={18} />
                </button>
              </div>
            </header>
          )}

          <div className="flex-1 relative">
            <AnimatePresence mode="wait">
              {store.activeView === 'workspace' && (
                <motion.div key="workspace" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="absolute inset-0 z-10 bg-primary-bg">
                  <WorkspaceDashboard />
                </motion.div>
              )}

              {store.activeView === 'browser' && (
                <motion.div key="browser" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0">
                  <div className={`h-full flex ${store.studentMode ? 'p-4 gap-4' : ''}`}>
                    <div className={`flex-[3] relative ${store.studentMode ? 'rounded-2xl overflow-hidden border border-border-color shadow-3xl' : ''}`}>
                      {/* This area is now intentionally blank. The BrowserView is managed by the main process. */}
                    </div>
                    {store.studentMode && (
                      <div className="flex-1 glass-vibrant shadow-3xl rounded-3xl p-6 flex flex-col border border-border-color bg-primary-bg/5">
                        <div className="flex items-center gap-3 mb-6">
                          <Sparkles size={20} className="text-accent" />
                          <h3 className="text-[11px] font-black uppercase tracking-[0.3em] text-secondary-text">Context Intelligence</h3>
                        </div>
                        <textarea
                          className="flex-1 bg-transparent text-primary-text text-sm leading-relaxed resize-none focus:outline-none placeholder:text-secondary-text custom-scrollbar font-medium"
                          placeholder="Insights reflect current tab content..."
                        />
                      </div>
                    )}
                  </div>
                </motion.div>
              )}
              {store.activeView === 'webstore' && (
                <motion.div key="webstore" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 z-10 bg-primary-bg">
                  <WebStore onClose={() => store.setActiveView('browser')} />
                </motion.div>
              )}

              {store.activeView === 'pdf' && (
                <motion.div key="pdf" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 z-10 bg-primary-bg">
                  <PDFWorkspace />
                </motion.div>
              )}

              {store.activeView === 'coding' && (
                <motion.div key="coding" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 z-10 bg-primary-bg">
                  <CodingDashboard />
                </motion.div>
              )}

              {store.activeView === 'media' && (
                <motion.div key="media" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 z-10 bg-primary-bg">
                  <MediaStudio />
                </motion.div>
              )}
            </AnimatePresence>

            {/* Feature Overlays */}
            <AnimatePresence>
              {showSettings && (
                <SettingsPanel onClose={() => setShowSettings(false)} />
              )}

              {showCart && (
                <UnifiedCartPanel onClose={() => setShowCart(false)} onScan={handleCartScan} />
              )}

              {showClipboard && (
                <div className="absolute top-20 right-4 z-[90]">
                  <ClipboardManager />
                </div>
              )}

              {showCamera && (
                <div className="absolute inset-0 z-[200] bg-black/80 flex items-center justify-center">
                  <div className="relative w-[800px] h-[600px] bg-black rounded-3xl overflow-hidden border border-white/20">
                    <button onClick={() => setShowCamera(false)} className="absolute top-4 right-4 z-50 text-white" title="Close Camera"><X /></button>
                    <PhoneCamera onClose={() => setShowCamera(false)} />
                  </div>
                </div>
              )}

              {showTabSwitcher && (
                <TabSwitcherOverlay visible={showTabSwitcher} />
              )}
            </AnimatePresence>

            {/* Neural Context Overlay */}
            <AnimatePresence>
              {aiOverview && (
                <motion.div initial={{ opacity: 0, y: 50 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 50 }} className="absolute bottom-6 right-6 w-[450px] max-h-[600px] bg-primary-bg/95 backdrop-blur-2xl border border-border-color rounded-2xl shadow-[0_0_50px_rgba(0,0,0,0.5)] z-[60] flex flex-col overflow-hidden">
                  <div className="p-4 border-b border-border-color flex items-center justify-between">
                    <div className="flex items-center gap-2 text-accent"><Sparkles size={16} /><span className="text-xs font-black uppercase tracking-widest">Neural Analysis</span></div>
                    <button onClick={() => setAiOverview(null)} className="text-secondary-text hover:text-primary-text" title="Close Neural Analysis"><X size={14} /></button>
                  </div>
                  <div className="flex-1 p-5 overflow-y-auto custom-scrollbar">
                    <h3 className="text-sm font-bold text-primary-text mb-2">{aiOverview.query}</h3>
                    {aiOverview.isLoading ? (
                      <div className="flex items-center gap-2 text-secondary-text text-xs animate-pulse"><RotateCw size={12} className="animate-spin" />Synthesizing intelligence...</div>
                    ) : (
                      <div className="text-xs text-secondary-text leading-relaxed whitespace-pre-wrap" dangerouslySetInnerHTML={{ __html: aiOverview.result || '' }} />
                    )}
                    {aiOverview.sources && (
                      <div className="mt-4 pt-4 border-t border-border-color space-y-2">
                        <p className="text-[10px] text-secondary-text uppercase font-black">Sources</p>
                        {aiOverview.sources.map((s, i) => (
                          <div key={i} className="text-[10px] text-secondary-text truncate pl-2 border-l border-accent/30">{s.text.substring(0, 80)}...</div>
                        ))}
                      </div>
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </main>
      </div>

      <AnimatePresence>
        {showContextMenu && (
          <>
            <div className="fixed inset-0 z-[1000]" onClick={() => setShowContextMenu(null)} onContextMenu={(e) => { e.preventDefault(); setShowContextMenu(null); }} />
            <motion.div
              ref={contextMenuRef}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="fixed z-[1001] w-48 bg-primary-bg/95 backdrop-blur-2xl border border-border-color rounded-xl shadow-2xl overflow-hidden py-1.5"
              style={{ left: showContextMenu.x, top: showContextMenu.y }}
            >
              <button onClick={() => { window.electronAPI?.reload(); setShowContextMenu(null); }} className="w-full px-4 py-2 flex items-center gap-3 hover:bg-accent/10 text-secondary-text hover:text-accent transition-all">
                <RefreshCcw size={14} />
                <span className="text-xs font-bold uppercase tracking-widest">Reload</span>
              </button>
              <button onClick={() => { window.electronAPI?.goBack(); setShowContextMenu(null); }} className="w-full px-4 py-2 flex items-center gap-3 hover:bg-accent/10 text-secondary-text hover:text-accent transition-all">
                <ChevronLeft size={14} />
                <span className="text-xs font-bold uppercase tracking-widest">Back</span>
              </button>
              <button onClick={() => { window.electronAPI?.goForward(); setShowContextMenu(null); }} className="w-full px-4 py-2 flex items-center gap-3 hover:bg-accent/10 text-secondary-text hover:text-accent transition-all">
                <ChevronRight size={14} />
                <span className="text-xs font-bold uppercase tracking-widest">Forward</span>
              </button>
              <div className="h-[1px] bg-border-color my-1" />
              <button onClick={() => { handleOfflineSave(); setShowContextMenu(null); }} className="w-full px-4 py-2 flex items-center gap-3 hover:bg-accent/10 text-secondary-text hover:text-accent transition-all">
                <DownloadIcon size={14} />
                <span className="text-xs font-bold uppercase tracking-widest">Save Page</span>
              </button>
              <button onClick={() => { toggleFullscreen(); setShowContextMenu(null); }} className="w-full px-4 py-2 flex items-center gap-3 hover:bg-accent/10 text-secondary-text hover:text-accent transition-all">
                <Maximize2 size={14} />
                <span className="text-xs font-bold uppercase tracking-widest">Fullscreen</span>
              </button>
              <button onClick={() => { window.electronAPI?.openDevTools(); setShowContextMenu(null); }} className="w-full px-4 py-2 flex items-center gap-3 hover:bg-accent/10 text-secondary-text hover:text-accent transition-all">
                <Code2 size={14} />
                <span className="text-xs font-bold uppercase tracking-widest">Inspect</span>
              </button>
              <button onClick={async () => {
                setShowContextMenu(null);
                if (window.electronAPI) {
                  const selectedText = await window.electronAPI.getSelectedText();
                  if (selectedText) {
                    triggerAIAnalysis(selectedText);
                  } else {
                    triggerAIAnalysis(store.currentUrl);
                  }
                }
              }} className="w-full px-4 py-2 flex items-center gap-3 hover:bg-accent/10 text-secondary-text hover:text-accent transition-all">
                <Sparkles size={14} />
                <span className="text-xs font-bold uppercase tracking-widest">Search with AI</span>
              </button>
              <button onClick={() => { setShowSettings(true); setShowContextMenu(null); }} className="w-full px-4 py-2 flex items-center gap-3 hover:bg-accent/10 text-secondary-text hover:text-accent transition-all">
                <GhostSettings size={14} />
                <span className="text-xs font-bold uppercase tracking-widest">Settings</span>
              </button>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}