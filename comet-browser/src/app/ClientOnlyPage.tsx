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
  Layout, MoreVertical, CreditCard, ArrowRight, Languages, Share2, Lock, Shield, Volume2, Square, Music2, Waves
} from 'lucide-react';
import AIChatSidebar from '@/components/AIChatSidebar';
import LandingPage from '@/components/LandingPage';
import WebStore from '@/components/WebStore';
import PDFWorkspace from '@/components/PDFWorkspace';
import CodingDashboard from '@/components/CodingDashboard';
import ClipboardManager from '@/components/ClipboardManager';
import PhoneCamera from '@/components/PhoneCamera';
import { GoogleAuthProvider } from 'firebase/auth';
import SettingsPanel from '@/components/SettingsPanel';
import { searchEngines } from '@/components/SearchEngineSettings';
import UnifiedCartPanel from '@/components/UnifiedCartPanel';
import WorkspaceDashboard from '@/components/WorkspaceDashboard';
import MediaStudio from '@/components/MediaStudio';
import Documentation from '@/components/Documentation';
import PasswordManager from '@/components/PasswordManager';
import ProxyFirewallManager from '@/components/ProxyFirewallManager';
import P2PSyncManager from '@/components/P2PSyncManager';

import CloudSyncConsent from "@/components/CloudSyncConsent";
import NoNetworkGame from "@/components/DinoGame";
import AIAssistOverlay from "@/components/AIAssistOverlay";

import { firebaseSyncService } from "@/lib/FirebaseSyncService";
import firebaseService from '@/lib/FirebaseService';
import { firebaseConfigStorage } from '@/lib/firebaseConfigStorage';
import { QuickNavOverlay } from '@/components/QuickNavOverlay';
import TitleBar from '@/components/TitleBar';
import { useOptimizedTabs } from '@/hooks/useOptimizedTabs';
import { VirtualizedTabBar } from '@/components/VirtualizedTabBar';
import { TabSwitcherOverlay } from '@/components/TabSwitcherOverlay';

const SidebarIcon = ({ icon, label, active, onClick, collapsed }: { icon: React.ReactNode, label: string, active: boolean, onClick: () => void, collapsed: boolean }) => (
  <button
    onClick={onClick}
    className={`group relative flex items-center justify-center w-12 h-12 rounded-2xl transition-all duration-300 ${active ? 'bg-accent text-white shadow-[0_0_25px_rgba(56,189,248,0.4)]' : 'text-slate-400 hover:bg-white/5 hover:text-white'}`}
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
    <motion.div
      initial={{ width: 0, opacity: 0 }}
      animate={{ width: 'auto', opacity: 1 }}
      exit={{ width: 0, opacity: 0 }}
      className="flex items-center gap-1.5 px-2 py-1 bg-deep-space-accent-neon/5 backdrop-blur-sm rounded-lg border border-deep-space-accent-neon/20 h-7 group hover:bg-deep-space-accent-neon/10 transition-all duration-300 cursor-pointer"
      title="Audio playing"
    >
      <div className="flex gap-[2px] items-center h-3.5">
        {[...Array(5)].map((_, i) => (
          <motion.div
            key={i}
            animate={{
              height: [3, 12, 5, 10, 3],
              backgroundColor: color === 'rgb'
                ? ['#38bdf8', '#818cf8', '#38bdf8']
                : [color, color, color]
            }}
            transition={{
              duration: 0.5 + Math.random() * 0.3,
              repeat: Infinity,
              ease: "easeInOut",
              delay: i * 0.1,
            }}
            className="w-[2px] rounded-full"
          />
        ))}
      </div>
      <Music2 size={12} className="text-deep-space-accent-neon/60" />
    </motion.div>
  );
};

export default function Home() {
  const store = useAppStore();
  const { shouldRenderTab, isTabSuspended } = useOptimizedTabs();
  const [showClipboard, setShowClipboard] = useState(false);
  const [showCamera, setShowCamera] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [settingsSection, setSettingsSection] = useState('profile');
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
  const [showDownloads, setShowDownloads] = useState(false);
  const [showExtensionsPopup, setShowExtensionsPopup] = useState(false);
  const [downloads, setDownloads] = useState<Array<{ name: string, status: string }>>([]);
  const [activeManager, setActiveManager] = useState<string | null>(null);
  const [isReadingAloud, setIsReadingAloud] = useState(false);
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);
  const [showTranslateDialog, setShowTranslateDialog] = useState(false);
  const ambientAudioRef = useRef<HTMLAudioElement | null>(null);
  const [isAmbientPlaying, setIsAmbientPlaying] = useState(false);

  // Sidebar items configuration
  const sidebarItems = [
    { icon: <Globe size={20} />, label: 'Browser', view: 'browser' },
    { icon: <Briefcase size={20} />, label: 'Workspace', view: 'workspace' },
    { icon: <ShoppingBag size={20} />, label: 'Web Store', view: 'webstore' },
    { icon: <FileText size={20} />, label: 'PDF Tools', view: 'pdf' },
    { icon: <Code2 size={20} />, label: 'Coding', view: 'coding' },
    { icon: <ImageIcon size={20} />, label: 'Media Studio', view: 'media' },
    { icon: <Lock size={20} />, label: 'Passwords', manager: 'password' },
    { icon: <Shield size={20} />, label: 'Firewall', manager: 'firewall' },
    { icon: <Share2 size={20} />, label: 'P2P Sync', manager: 'p2p' },
    { icon: <CopyIcon size={20} />, label: 'Clipboard', action: 'clipboard' },
  ];

  // Handle sidebar item clicks
  const handleSidebarClick = (item: any) => {
    if (item.view) {
      store.setActiveView(item.view);
      setActiveManager(null);
      setShowClipboard(false);
    } else if (item.manager) {
      setActiveManager(item.manager);
      store.setActiveView('browser'); // Keep browser view active when showing managers
      setShowClipboard(false);
    } else if (item.action === 'clipboard') {
      setShowClipboard(!showClipboard);
      setActiveManager(null);
    }
  };

  useEffect(() => {
    if (window.electronAPI) {
      const cleanStart = window.electronAPI.on('download-started', (name: string) => {
        setDownloads(prev => [{ name, status: 'downloading' }, ...prev].slice(0, 10));
        setIsDownloading(true);
        setDownloadStatus('in_progress');
      });
      const cleanDone = window.electronAPI.on('download-complete', (name: string) => {
        setDownloads(prev => prev.map(d => d.name === name ? { ...d, status: 'completed' } : d));
        setIsDownloading(false);
        setDownloadStatus('completed');
      });
      const cleanFail = window.electronAPI.on('download-failed', (name: string) => {
        setDownloads(prev => prev.map(d => d.name === name ? { ...d, status: 'failed' } : d));
        setIsDownloading(false);
        setDownloadStatus('failed');
      });
      return () => {
        cleanStart();
        cleanDone();
        cleanFail();
      };
    }
  }, []);

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

  const handleReadAloud = async () => {
    if (isReadingAloud) {
      window.speechSynthesis.cancel();
      setIsReadingAloud(false);
      return;
    }

    if (window.electronAPI) {
      const text = await window.electronAPI.getSelectedText();
      const pageText = text || "No text selected to read aloud.";

      const utterance = new SpeechSynthesisUtterance(pageText);
      const voices = window.speechSynthesis.getVoices();

      // Language code to Name mapping for better matching
      const langMap: Record<string, string> = {
        'hi': 'Hindi', 'ta': 'Tamil', 'te': 'Telugu', 'bn': 'Bengali', 'ml': 'Malayalam', 'kn': 'Kannada'
      };

      const targetLang = store.selectedLanguage;
      const voice = voices.find(v => v.lang.startsWith(targetLang) || (langMap[targetLang] && v.name.includes(langMap[targetLang]))) || voices[0];

      if (voice) utterance.voice = voice;
      utterance.rate = 1.0;
      utterance.pitch = 1.0;

      utterance.onend = () => setIsReadingAloud(false);
      utterance.onerror = () => setIsReadingAloud(false);

      utteranceRef.current = utterance;
      window.speechSynthesis.speak(utterance);
      setIsReadingAloud(true);
    }
  };

  const handleMusicUpload = async () => {
    if (window.electronAPI) {
      const filePath = await window.electronAPI.selectLocalFile();
      if (filePath) {
        store.setAmbientMusicUrl(`file://${filePath}`);
      }
    }
  };

  // Ambient Music Control
  useEffect(() => {
    if (store.enableAmbientMusic && store.currentUrl.includes('google.com')) {
      if (ambientAudioRef.current) {
        ambientAudioRef.current.play().catch(e => console.log("Autoplay blocked", e));
        setIsAmbientPlaying(true);
      }
    } else {
      if (ambientAudioRef.current) {
        ambientAudioRef.current.pause();
        setIsAmbientPlaying(false);
      }
    }
  }, [store.currentUrl, store.enableAmbientMusic]);

  // Translation Trigger
  useEffect(() => {
    if (window.electronAPI) {
      const clean = window.electronAPI.onTriggerTranslationDialog(() => {
        setShowTranslateDialog(true);
      });
      return clean;
    }
  }, []);

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

  const handleTranslate = async () => {
    setShowContextMenu(null);
    if (window.electronAPI) {
      const selectedText = await window.electronAPI.getSelectedText();
      const textToTranslate = selectedText || store.currentUrl;

      setAiOverview({ query: `Translating: ${textToTranslate.substring(0, 30)}...`, result: null, sources: null, isLoading: true });

      const translated = await BrowserAI.translateText(textToTranslate, 'English');
      setAiOverview({ query: "Neural Translation (to English)", result: translated, sources: null, isLoading: false });
    }
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

      if (e.ctrlKey) {
        if (e.key === '=' || e.key === '+') {
          e.preventDefault();
          window.electronAPI?.changeZoom(-1);
        } else if (e.key === '-') {
          e.preventDefault();
          window.electronAPI?.changeZoom(1);
        } else if (e.key === '0') {
          e.preventDefault();
          // Reset zoom logic - we'll handle this in main.js
          const shortcuts = [
            { accelerator: 'CommandOrControl+0', action: 'zoom-reset' }
          ];
          // Since the main process already handles zoom-reset via globalShortcut, 
          // we just need to make sure the key event doesn't propagate if we're in the browser.
        }
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
    BrowserAI.loadVectorMemory();
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

  // PWA Service Worker Registration
  useEffect(() => {
    if ('serviceWorker' in navigator) {
      window.addEventListener('load', () => {
        navigator.serviceWorker.register('/sw.js').then((reg) => {
          console.log('SW registered:', reg);
        }).catch((err) => {
          console.log('SW reg failed:', err);
        });
      });
    }
  }, []);

  // Fetch initial online status and listen for changes
  useEffect(() => {
    if (window.electronAPI) {
      window.electronAPI.getIsOnline().then((onlineStatus) => {
        store.setIsOnline(onlineStatus);
        console.log("Initial online status:", onlineStatus);
      });

      // Sync Adblocker state on startup
      if (store.enableAdblocker) {
        window.electronAPI.toggleAdblocker(true);
      }
    }
  }, []);

  const addClipboardItem = useAppStore(state => state.addClipboardItem);

  // Clipboard sync
  useEffect(() => {
    if (window.electronAPI) {
      console.log("[Renderer] Setting up clipboard listener");
      const clean = window.electronAPI.on('clipboard-changed', (text: string) => {
        if (text) {
          console.log("[Renderer] Received clipboard update:", text.substring(0, 20));
          addClipboardItem(text);
        }
      });
      return clean;
    }
  }, [addClipboardItem]);

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
      firebaseSyncService.syncHistory();
      firebaseSyncService.syncApiKeys();
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

  // Dynamic Ollama Model Fetch
  useEffect(() => {
    if (window.electronAPI && store.aiProvider === 'ollama') {
      window.electronAPI.ollamaListModels().then((res: any) => {
        if (res.models) {
          store.setOllamaModelsList(res.models);
          console.log('Loaded Ollama models:', res.models);
        } else if (res.error) {
          console.error('Failed to load Ollama models:', res.error);
        }
      });
    }
  }, [store.aiProvider]);

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

  const handleCreateShortcut = async () => {
    if (!window.electronAPI) return;
    const activeTab = store.tabs.find(t => t.id === store.activeTabId);
    if (activeTab) {
      const result = await (window.electronAPI as any).createDesktopShortcut({ url: activeTab.url, title: activeTab.title });
      if (result.success) {
        alert(`Shortcut created on Desktop: ${activeTab.title}`);
      } else {
        alert(`Failed to create shortcut: ${result.error}`);
      }
    }
  };

  const handleCartScan = async () => {
    if (!window.electronAPI) return;
    setShowCart(true);
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
          return items.slice(0, 5); // Just take the most prominent ones
        })()
      `);
      if (result && result.length > 0) {
        result.forEach((item: any) => store.addToUnifiedCart(item));
      }
    } catch (e) {
      console.error("Cart scan failed:", e);
    }
  };

  const calculateBounds = useCallback(() => {
    const railWidth = railVisible ? 70 : 0;
    const aiSidebarWidth = !store.sidebarOpen ? 0 : (store.isSidebarCollapsed ? 70 : store.sidebarWidth);

    const headerHeight = 40 + 56;

    let x = 0;
    if (store.sidebarSide === 'left') {
      x = railWidth + aiSidebarWidth;
    } else {
      x = railWidth;
    }

    const width = window.innerWidth - railWidth - aiSidebarWidth;
    const height = window.innerHeight - headerHeight;

    return {
      x: Math.round(x),
      y: Math.round(headerHeight),
      width: Math.max(0, Math.round(width)),
      height: Math.max(0, Math.round(height))
    };
  }, [store.sidebarOpen, store.isSidebarCollapsed, store.sidebarWidth, store.sidebarSide, railVisible]);

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
      // Only hide BrowserView for full-screen overlays that completely cover the page
      // Small overlays (context menu, AI overview, etc.) will use z-[9999] to appear on top
      const hasFullScreenOverlay = showSettings || activeManager !== null || showCamera;

      if (hasFullScreenOverlay) {
        window.electronAPI.hideAllViews();
        return;
      }

      // Keep BrowserView visible for browser mode, small overlays will layer on top
      if (store.activeView === 'browser' && store.activeTabId) {
        const bounds = calculateBounds();
        window.electronAPI.activateView({ tabId: store.activeTabId, bounds });
      } else {
        window.electronAPI.hideAllViews();
      }
    }
  }, [
    store.activeTabId,
    store.activeView,
    calculateBounds,
    showSettings,
    activeManager,
    showCamera
  ]);

  useEffect(() => {
    if (window.electronAPI) {
      const cleanUrl = window.electronAPI.onBrowserViewUrlChanged(({ tabId, url }) => {
        if (store.tabs.find(t => t.id === tabId)) {
          store.updateTab(tabId, { url });
          if (tabId === store.activeTabId) {
            store.setCurrentUrl(url);
            // Add to history for URL predictor
            if (url && url !== 'about:blank' && !url.startsWith('file:') && !url.includes('google.com/search')) {
              store.addToHistory({ url, title: url });
            }
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
      const cleanup = window.electronAPI.onAuthCallback(async (event: any, url: string) => {
        console.log("Auth callback received in ClientOnlyPage:", url);
        try {
          const parsed = new URL(url);
          const status = parsed.searchParams.get("auth_status");
          const token = parsed.searchParams.get("id_token") || parsed.searchParams.get("token");
          const uid = parsed.searchParams.get("uid");
          const email = parsed.searchParams.get("email");
          const name = parsed.searchParams.get("name");
          const photo = parsed.searchParams.get("photo");
          const configParam = parsed.searchParams.get("firebase_config");

          if (status === "success" && uid && email) {
            if (configParam) {
              try {
                const config = JSON.parse(atob(configParam));
                firebaseConfigStorage.save(config);
                store.setCustomFirebaseConfig(config);
                firebaseService.reinitialize();
              } catch (e) {
                console.error("Failed to parse returned firebase config:", e);
              }
            }

            if (token) {
              const credential = GoogleAuthProvider.credential(token);
              try {
                await firebaseService.signInWithCredential(credential);
                console.log("Firebase signed in successfully via deep link");
              } catch (e: any) {
                console.error("Firebase sign-in failed:", e);
              }
            }

            // Set user data after ensuring firebase auth is established
            store.setUser({
              uid,
              email,
              displayName: name || email.split('@')[0],
              photoURL: photo || "",
            });

            if (email.endsWith("@ponsrischool.in")) store.setAdmin(true);

            store.setHasSeenWelcomePage(true);
            store.setActiveView('browser');
            store.startActiveSession();
          }
        } catch (e: any) {
          console.error("Error processing auth callback:", e);
        }
      });
      return cleanup;
    }
  }, [store]);

  if ((!store.user && !store.hasSeenWelcomePage) || store.activeView === 'landing-page') {
    return (
      <div className={`flex flex-col min-h-screen w-full bg-deep-space relative font-sans text-primary-text transition-all duration-700`}>
        <TitleBar />
        <div className="flex-1 pt-10 bg-[#020205]">
          <LandingPage />
        </div>
      </div>
    );
  }

  return (
    <div className={`flex flex-col h-screen w-full bg-deep-space overflow-hidden relative font-sans text-primary-text transition-all duration-700`}>
      <TitleBar />
      <div className={`flex flex-1 overflow-hidden relative pt-10 bg-[#020205]`} onContextMenu={handleContextMenu}>
        {/* Navigation Sidebar (Rail) */}
        <AnimatePresence>
          {railVisible && (
            <motion.div
              initial={{ width: 0, opacity: 0 }}
              animate={{ width: 70, opacity: 1 }}
              exit={{ width: 0, opacity: 0 }}
              className="flex flex-col items-center py-6 gap-5 z-40 bg-black/40 backdrop-blur-2xl shadow-[10px_0_30px_rgba(0,0,0,0.5)] border-r border-white/5 no-drag-region"
            >
              {sidebarItems.map((item, idx) => (
                <SidebarIcon
                  key={idx}
                  icon={item.icon}
                  label={item.label}
                  active={!!(item.view && store.activeView === item.view) || !!(item.manager && activeManager === item.manager)}
                  onClick={() => handleSidebarClick(item)}
                  collapsed={true}
                />
              ))}
              <div className="mt-auto mb-4">
                <SidebarIcon
                  icon={<Puzzle size={20} />}
                  label="Extensions"
                  active={showSettings && settingsSection === 'extensions'}
                  onClick={() => {
                    setSettingsSection('extensions');
                    setShowSettings(true);
                  }}
                  collapsed={true}
                />
              </div>
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
              className={`h-full border-r border-border-color cursor-grab active:cursor-grabbing ${store.sidebarSide === 'left' ? 'order-first' : 'order-last'} no-drag-region`}
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
            <header className="h-[56px] flex items-center px-4 gap-4 border-b border-white/5 bg-black/40 backdrop-blur-3xl z-40 no-drag-region">
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
              <div className="flex-1 flex justify-center">
                <div className="w-full max-w-2xl relative group">
                  <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none">
                    <Search size={14} className="text-secondary-text group-focus-within:text-primary-text transition-colors" />
                  </div>
                  <input
                    type="text"
                    value={store.currentUrl === 'about:blank' ? '' : store.currentUrl}
                    onChange={(e) => store.setCurrentUrl(e.target.value)}
                    onFocus={() => setIsTyping(true)}
                    onBlur={() => setIsTyping(false)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleGo();
                      if (e.key === 'Tab' && urlPrediction && isTyping) {
                        e.preventDefault();
                        store.setCurrentUrl(urlPrediction);
                        setUrlPrediction(null);
                      }
                    }}
                    placeholder="Search with Comet or enter URL..."
                    className="w-full bg-white/[0.03] border border-white/10 rounded-2xl py-2 pl-11 pr-4 text-xs text-primary-text placeholder:text-secondary-text focus:outline-none focus:ring-1 focus:ring-accent/50 focus:bg-white/[0.07] transition-all font-medium backdrop-blur-md relative z-10"
                  />
                  {urlPrediction && isTyping && (
                    <div className="absolute inset-y-0 left-11 right-4 flex items-center pointer-events-none text-xs text-white/20 font-medium z-0">
                      <span>{store.currentUrl}</span>
                      <span className="opacity-100">{urlPrediction.substring(store.currentUrl.length)}</span>
                    </div>
                  )}
                  <div className="absolute top-0 left-0 right-0 h-[2px] overflow-hidden pointer-events-none rounded-t-2xl">
                    <motion.div animate={{ x: ['-100%', '100%'] }} transition={{ duration: 3, repeat: Infinity, ease: 'linear' }} className="w-1/2 h-full bg-gradient-to-r from-transparent via-primary-text/10 to-transparent" />
                  </div>
                  <div className="absolute right-4 top-1/2 -translate-y-1/2 no-drag-region z-20 flex items-center gap-2">
                    <MusicVisualizer color={aiPickColor} isPlaying={isAudioPlaying || isAmbientPlaying} />
                    <button onClick={handleMusicUpload} className="p-1.5 rounded-lg hover:bg-white/10 text-white/20 hover:text-white/60 transition-all" title="Upload Ambient Music">
                      <Music2 size={12} />
                    </button>
                    <button onClick={() => store.setEnableAmbientMusic(!store.setEnableAmbientMusic)} className={`p-1.5 rounded-lg hover:bg-white/10 transition-all ${store.enableAmbientMusic ? 'text-accent' : 'text-white/20'}`} title="Ambient Mode">
                      <Waves size={12} />
                    </button>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <div className="flex items-center gap-1.5 px-2 bg-primary-bg/5 rounded-xl border border-white/5 h-9">
                  <button
                    onClick={() => setShowDownloads(!showDownloads)}
                    className={`p-1.5 rounded-lg transition-all 
                               ${isDownloading ? 'text-accent animate-pulse' : ''}
                               ${downloadStatus === 'completed' ? 'text-green-400' : ''}
                               ${downloadStatus === 'failed' ? 'text-red-400' : ''}
                               ${downloadStatus === 'idle' ? 'text-secondary-text hover:text-primary-text' : ''}
                               ${showDownloads ? 'bg-primary-bg/10 text-accent' : ''}
                               hover:bg-primary-bg/10`}
                    title="Downloads"
                  >
                    <DownloadCloud size={14} />
                  </button>
                  <button onClick={() => { setSettingsSection('history'); setShowSettings(true); }} className="p-1.5 rounded-lg text-secondary-text hover:text-primary-text transition-all" title="Browsing History">
                    <RefreshCcw size={14} />
                  </button>
                  <button onClick={() => setShowClipboard(!showClipboard)} className={`p-1.5 rounded-lg transition-all ${showClipboard ? 'text-accent bg-primary-bg/10' : 'text-secondary-text hover:text-primary-text'}`} title="Clipboard Manager">
                    <CopyIcon size={14} />
                  </button>
                  <button onClick={handleReadAloud} className={`p-1.5 rounded-lg transition-all ${isReadingAloud ? 'text-accent animate-pulse' : 'text-secondary-text hover:text-primary-text'}`} title="Read Aloud">
                    {isReadingAloud ? <Square size={14} /> : <Volume2 size={14} />}
                  </button>
                  <button onClick={() => setShowCart(!showCart)} className={`p-1.5 rounded-lg transition-all ${showCart ? 'text-accent bg-primary-bg/10' : 'text-secondary-text hover:text-primary-text'}`} title="Scan Shopping Cart">
                    <ShoppingCart size={14} />
                  </button>
                  <button onClick={() => setShowExtensionsPopup(!showExtensionsPopup)} className={`p-1.5 rounded-lg transition-all ${showExtensionsPopup ? 'text-accent bg-primary-bg/10' : 'text-secondary-text hover:text-primary-text'}`} title="Extensions">
                    <Puzzle size={14} />
                  </button>
                </div>

                <div className="w-[1px] h-6 bg-border-color mx-1" />

                <button onClick={toggleFullscreen} className="p-2 rounded-xl hover:bg-primary-bg/10 text-secondary-text hover:text-primary-text transition-all" title="Toggle Fullscreen">
                  {isFullscreen ? <Minimize2 size={18} /> : <Maximize2 size={18} />}
                </button>

                <button onClick={() => setShowSettings(true)} className="p-1 rounded-2xl hover:scale-110 transition-all outline-none border border-white/10 bg-white/5 overflow-hidden">
                  {store.user?.photoURL ? (
                    <img
                      src={store.user.photoURL}
                      alt="Profile"
                      className="w-6 h-6 rounded-full object-cover shadow-[0_0_10px_rgba(56,189,248,0.3)]"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = `https://ui-avatars.com/api/?name=${encodeURIComponent(store.user?.displayName || 'User')}&background=0D8ABC&color=fff`;
                      }}
                    />
                  ) : (
                    <div className="w-6 h-6 rounded-full bg-primary-bg/5 border border-border-color flex items-center justify-center text-secondary-text">
                      <UserIcon size={14} />
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
                <motion.div key="workspace" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="absolute inset-0 z-[60] bg-[#020205]">
                  <WorkspaceDashboard />
                </motion.div>
              )}

              {store.activeView === 'browser' && (
                <motion.div key="browser" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0">
                  <div className={`h-full flex ${store.studentMode ? 'p-4 gap-4' : 'p-2'}`}>
                    <div className={`flex-[3] relative bg-[#020205] shadow-[0_0_100px_rgba(0,0,0,0.5)] ${store.studentMode ? 'rounded-3xl' : 'rounded-2xl'} overflow-hidden border border-white/5`}>
                      {!store.isOnline && (
                        <div className="absolute inset-0 z-[100] bg-[#0a0a0f]">
                          <NoNetworkGame />
                        </div>
                      )}
                      {/* This area is now intentionally blank. The BrowserView is managed by the main process. */}
                      <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-sky-500/20 to-transparent pointer-events-none" />
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
                <motion.div key="webstore" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 z-[60] bg-[#020205]">
                  <WebStore onClose={() => store.setActiveView('browser')} />
                </motion.div>
              )}

              {store.activeView === 'pdf' && (
                <motion.div key="pdf" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 z-[60] bg-[#020205]">
                  <PDFWorkspace />
                </motion.div>
              )}

              {store.activeView === 'coding' && (
                <motion.div key="coding" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 z-[60] bg-[#020205]">
                  <CodingDashboard />
                </motion.div>
              )}

              {store.activeView === 'media' && (
                <motion.div key="media" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 z-[60] bg-[#020205]">
                  <MediaStudio />
                </motion.div>
              )}

              {store.activeView === 'documentation' && (
                <motion.div key="documentation" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="absolute inset-0 z-[100] bg-[#020205] overflow-auto custom-scrollbar">
                  <Documentation />
                </motion.div>
              )}
            </AnimatePresence>

            {/* Feature Overlays */}
            <AnimatePresence>
              {showSettings && (
                <SettingsPanel
                  onClose={() => {
                    setShowSettings(false);
                    setSettingsSection('profile');
                  }}
                  defaultSection={settingsSection}
                />
              )}

              {showCart && (
                <UnifiedCartPanel onClose={() => setShowCart(false)} onScan={handleCartScan} />
              )}

              {showDownloads && (
                <div className={`absolute top-20 ${store.sidebarSide === 'right' && store.sidebarOpen ? 'right-[290px]' : 'right-4'} z-[90] w-72 h-96 bg-[#020205]/95 backdrop-blur-3xl border border-white/5 rounded-2xl shadow-2xl flex flex-col overflow-hidden`}>
                  <div className="p-4 border-b border-white/5 flex items-center justify-between">
                    <span className="text-[10px] font-bold uppercase tracking-widest text-white/60">Recent Downloads</span>
                    <button onClick={() => setShowDownloads(false)} className="text-white/20 hover:text-white"><X size={14} /></button>
                  </div>
                  <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
                    {downloads.length === 0 ? (
                      <div className="h-full flex flex-col items-center justify-center opacity-20">
                        <DownloadCloud size={32} className="mb-2" />
                        <p className="text-[10px] uppercase font-bold tracking-tighter">No active downloads</p>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {downloads.map((d, i) => (
                          <div key={i} className="p-3 rounded-xl bg-white/5 border border-white/5 flex items-center gap-3">
                            <DownloadIcon size={14} className={d.status === 'downloading' ? 'animate-bounce text-accent' : 'text-white/40'} />
                            <div className="flex-1 min-w-0">
                              <p className="text-[10px] text-white font-bold truncate">{d.name}</p>
                              <p className={`text-[8px] uppercase font-black ${d.status === 'completed' ? 'text-green-500' : d.status === 'failed' ? 'text-red-500' : 'text-accent'}`}>
                                {d.status}
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {showExtensionsPopup && (
                <div className={`absolute top-20 ${store.sidebarSide === 'right' && store.sidebarOpen ? 'right-[290px]' : 'right-4'} z-[90] w-80 h-[30rem] bg-[#020205]/95 backdrop-blur-3xl border border-white/5 rounded-2xl shadow-2xl flex flex-col overflow-hidden`}>
                  <div className="p-4 border-b border-white/5 flex items-center justify-between">
                    <span className="text-[10px] font-bold uppercase tracking-widest text-white/60">Quick Extensions</span>
                    <button onClick={() => setShowExtensionsPopup(false)} className="text-white/20 hover:text-white"><X size={14} /></button>
                  </div>
                  <div className="flex-1 overflow-y-auto p-4 flex flex-col items-center justify-center opacity-20">
                    <Puzzle size={32} className="mb-2" />
                    <p className="text-[10px] uppercase font-bold tracking-tighter text-center">Manage all extensions in <br /> sidebar dashboard</p>
                  </div>
                  <div className="p-3 border-t border-white/5 bg-white/5">
                    <button
                      onClick={() => { setShowExtensionsPopup(false); setSettingsSection('extensions'); setShowSettings(true); }}
                      className="w-full py-2 bg-deep-space-accent-neon text-deep-space-bg rounded-lg text-[10px] font-black uppercase tracking-widest"
                    >
                      Manage Extensions
                    </button>
                  </div>
                </div>
              )}

              {showClipboard && (
                <div className={`absolute top-20 ${store.sidebarSide === 'right' && store.sidebarOpen ? 'right-[290px]' : 'right-4'} z-[90] w-80 h-[30rem]`}>
                  <ClipboardManager />
                </div>
              )}

              {/* Manager Overlays */}
              {activeManager === 'password' && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  className="absolute inset-0 z-[100] bg-black/50 backdrop-blur-sm flex items-center justify-center"
                >
                  <div className="w-full max-w-4xl h-[80vh] bg-[#020205] rounded-2xl border border-white/10 shadow-2xl overflow-hidden relative">
                    <button
                      onClick={() => setActiveManager(null)}
                      className="absolute top-4 right-4 z-50 p-2 bg-white/5 hover:bg-white/10 rounded-xl text-white/60 hover:text-white transition-all"
                      title="Close"
                    >
                      <X size={20} />
                    </button>
                    <PasswordManager />
                  </div>
                </motion.div>
              )}

              {activeManager === 'firewall' && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  className="absolute inset-0 z-[100] bg-black/50 backdrop-blur-sm flex items-center justify-center"
                >
                  <div className="w-full max-w-4xl h-[80vh] bg-[#020205] rounded-2xl border border-white/10 shadow-2xl overflow-hidden relative">
                    <button
                      onClick={() => setActiveManager(null)}
                      className="absolute top-4 right-4 z-50 p-2 bg-white/5 hover:bg-white/10 rounded-xl text-white/60 hover:text-white transition-all"
                      title="Close"
                    >
                      <X size={20} />
                    </button>
                    <ProxyFirewallManager />
                  </div>
                </motion.div>
              )}

              {activeManager === 'p2p' && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  className="absolute inset-0 z-[100] bg-black/50 backdrop-blur-sm flex items-center justify-center"
                >
                  <div className="w-full max-w-4xl h-[80vh] bg-[#020205] rounded-2xl border border-white/10 shadow-2xl overflow-hidden relative">
                    <button
                      onClick={() => setActiveManager(null)}
                      className="absolute top-4 right-4 z-50 p-2 bg-white/5 hover:bg-white/10 rounded-xl text-white/60 hover:text-white transition-all"
                      title="Close"
                    >
                      <X size={20} />
                    </button>
                    <P2PSyncManager />
                  </div>
                </motion.div>
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
                <AIAssistOverlay
                  query={aiOverview.query}
                  result={aiOverview.result}
                  sources={aiOverview.sources}
                  isLoading={aiOverview.isLoading}
                  onClose={() => setAiOverview(null)}
                />
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
              <button onClick={handleTranslate} className="w-full px-4 py-2 flex items-center gap-3 hover:bg-accent/10 text-secondary-text hover:text-accent transition-all">
                <Languages size={14} />
                <span className="text-xs font-bold uppercase tracking-widest">Translate to English</span>
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
              <button onClick={() => { handleCreateShortcut(); setShowContextMenu(null); }} className="w-full px-4 py-2 flex items-center gap-3 hover:bg-accent/10 text-secondary-text hover:text-accent transition-all">
                <Plus size={14} />
                <span className="text-xs font-bold uppercase tracking-widest">Create Shortcut</span>
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

      <AnimatePresence>
        {showTranslateDialog && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[2000] bg-black/60 backdrop-blur-md flex items-center justify-center p-4"
          >
            <div className="w-full max-w-sm bg-[#0a0a0f] border border-white/10 rounded-2xl shadow-3xl overflow-hidden p-6">
              <h3 className="text-sm font-black uppercase tracking-widest text-white mb-4 text-center">TRANSLATE SITE</h3>
              <div className="grid grid-cols-2 gap-2">
                {['hi', 'ta', 'te', 'bn', 'ml', 'kn', 'mr', 'gu'].map(langCode => (
                  <button
                    key={langCode}
                    onClick={async () => {
                      if (window.electronAPI) {
                        await window.electronAPI.translateWebsite({ targetLanguage: langCode });
                      }
                      setShowTranslateDialog(false);
                    }}
                    className="px-4 py-2 bg-white/5 hover:bg-accent/10 border border-white/5 hover:border-accent/40 rounded-xl text-xs font-bold transition-all text-white/80 hover:text-white"
                  >
                    {langCode.toUpperCase()}
                  </button>
                ))}
              </div>
              <button onClick={() => setShowTranslateDialog(false)} className="w-full mt-6 py-2 text-[10px] font-black uppercase tracking-widest text-white/40 hover:text-white">Close</button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <audio ref={ambientAudioRef} src={store.ambientMusicUrl} loop hidden />
    </div>
  );
}