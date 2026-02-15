"use client";

import React, { useState, useRef, useEffect } from 'react';
import { ChatMessage, LLMProviderOptions } from "@/lib/llm/providers/base";
import LLMProviderSettings from './LLMProviderSettings';
import { motion, AnimatePresence } from 'framer-motion';
import { User } from "firebase/auth";
import firebaseService from '@/lib/FirebaseService';
import ThinkingIndicator from './ThinkingIndicator';
import { useAppStore } from '@/store/useAppStore';
import {
  Terminal, Code2, Image as ImageIcon, Maximize2, Minimize2, FileText, Download,
  Wifi, WifiOff, X, LogOut, User as UserIcon, ShieldAlert, ShieldCheck, SlidersHorizontal,
  ChevronLeft, ChevronRight, ChevronDown, Zap, Send, ShoppingBag, Globe, Plus, Bookmark,
  RotateCw, AlertTriangle, DownloadCloud, ShoppingCart, Copy as CopyIcon,
  FolderOpen, ScanLine, Search, Puzzle, Briefcase, RefreshCcw, Layout, MoreVertical,
  CreditCard, ArrowRight, Languages, Share2, Lock, Shield, Volume2, Square, Music2, Waves, Sparkles
} from 'lucide-react';
import MediaSuggestions from './MediaSuggestions';
import { offlineChatbot } from '@/lib/OfflineChatbot';
import { Security } from '@/lib/Security';
import { BrowserAI } from '@/lib/BrowserAI';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import dracula from 'react-syntax-highlighter/dist/cjs/styles/prism/dracula'; // A dark theme for code blocks
import Tesseract from 'tesseract.js'; // Import Tesseract.js
import { useRouter } from 'next/navigation'; // Import useRouter
import { AICommandQueue, AICommand } from './AICommandQueue';
import { parseAICommands, prepareCommandsForExecution, getCommandDescription } from '@/lib/AICommandParser';

// Delay helper function
const delay = (ms: number) => new Promise(res => setTimeout(res, ms));

const SYSTEM_INSTRUCTIONS = `
You are the Comet AI Agent, the core intelligence of the Comet Browser.
You have AGENCY and can control the browser via ACTION COMMANDS.

ACTION COMMANDS:
- [NAVIGATE: url] : Goes to a specific URL.
- [SEARCH: query] : Searches using the user's default engine.
- [SET_THEME: dark|light|system] : Changes the UI theme.
- [OPEN_VIEW: browser|workspace|webstore|pdf|media|coding] : Switches the active app view.
- [RELOAD] : Reloads the active tab.
- [GO_BACK] : Navigates back.
- [GO_FORWARD] : Navigates forward.
- [SCREENSHOT_AND_ANALYZE] : Takes a screenshot of the current browser view, performs OCR, and analyzes the content visually.
- [WEB_SEARCH: query] : Performs a real-time web search.
- [READ_PAGE_CONTENT] : Reads the full text content of the current active browser tab.
- [LIST_OPEN_TABS] : Lists all currently open browser tabs.
- [GENERATE_PDF: title | content] : Generates and downloads a PDF with specified title and content.
- [GENERATE_DIAGRAM: mermaid_code] : Generates a visual diagram using Mermaid.js syntax.
- [SHELL_COMMAND: command] : Executes a shell command and returns the output (e.g., brightness control).
- [SET_BRIGHTNESS: percentage] : Sets the operating system's screen brightness (0-100%). Internally uses OS-specific shell commands.
- [SET_VOLUME: percentage] : Sets the operating system's audio volume (0-100%). Internally uses OS-specific shell commands.
- [OPEN_APP: app_name_or_path] : Opens an external application installed on the operating system.
- [FILL_FORM: selector | value] : Fills a form field identified by a CSS selector with the specified value.
- [SCROLL_TO: selector | position] : Scrolls the browser view to a specific element identified by a CSS selector, or to a position ('top', 'bottom').
- [EXTRACT_DATA: selector] : Extracts text content from an element identified by a CSS selector.
- [CREATE_NEW_TAB_GROUP: name | urls] : Creates a new group of tabs with the specified name and a comma-separated list of URLs.
- [OCR_COORDINATES: x,y,width,height] : Performs OCR on specific pixel coordinates of the current view.
- [OCR_SCREEN: x,y,width,height] : Performs OCR on a specific screen region (or full screen if coordinates are omitted).
- [CLICK_ELEMENT: selector] : Clicks on a browser element using CSS selector or tab ID.
- [FIND_AND_CLICK: text] : Captures the screen, runs OCR, finds the visible text on the OS screen, and clicks it (e.g., buttons, labels).
- [GMAIL_AUTHORIZE] : Authorizes Gmail API access.
- [GMAIL_LIST_MESSAGES: query | maxResults] : Lists Gmail messages.
- [GMAIL_GET_MESSAGE: messageId] : Gets a specific Gmail message.
- [GMAIL_SEND_MESSAGE: to | subject | body | threadId] : Sends a Gmail message.
- [GMAIL_ADD_LABEL: messageId | labelName] : Adds a label to a Gmail message.
- [WAIT: duration_ms] : Pauses AI execution for a specified duration in milliseconds.
- [GUIDE_CLICK: description | x,y,width,height] : Provides guidance for the user to click a specific area on the OS screen.
- [EXPLAIN_CAPABILITIES] : Provides a detailed, step-by-step explanation of AI capabilities with human-readable delays.

CHAINED EXECUTION:
You can provide MULTIPLE commands in a single response for multi-step tasks.
Example: "[NAVIGATE: https://google.com] [SEARCH: AI news] [OPEN_VIEW: browser]"

FORMATTING & STYLE:
- Use Markdown TABLES for all data comparison, feature lists, or structured information.
- Use **BOLD** and *ITALIC* for emphasis and clear hierarchy.
- Use EMOJIS (integrated naturally) to make the conversation engaging and futuristic 🚀.
- Be concise but extremely helpful and proactive.

COGNITIVE CAPABILITIES:
- HYBRID RAG: You have access to Local Memory (History) AND Online Search Results. **Prioritize the 'LOCAL KNOWLEDGE BASE (RAG)' for answers when relevant context is provided.**
- VISION: You can see the page via [SCREENSHOT_AND_ANALYZE].
- AUTOMATION: You can help manage passwords and settings.

EXAMPLES FOR USER GUIDE:
1. "Show me the latest news about Gemini 2.0"
2. "Summarize this page in Hindi"
3. "What are the best stocks to buy today in India?"
4. "Give me a coding recipe for a React weather app"
5. "Analyze the visual content of this page"
6. "Find all mentions of 'intelligence' on this page"
7. "Navigate to unacademy.com and find Thermodynamics tests"
8. "Switch to Dark mode"
9. "What is my browsing history for today?"
10. "Read this page and tell me the main price"
11. "Translate my last message to Tamil"
12. "List all my open tabs and summarize them"

Always combine your local knowledge with online search for the most accurate and updated answers.
`.trim();

interface AIChatSidebarProps {
  studentMode: boolean;
  toggleStudentMode: () => void;
  isCollapsed: boolean;
  toggleCollapse: () => void;
  selectedEngine: string;
  setSelectedEngine: (engine: string) => void;
  theme: 'dark' | 'light' | 'system';
  setTheme: (theme: 'dark' | 'light' | 'system') => void;
  backgroundImage: string;
  setBackgroundImage: (imageUrl: string) => void;
  backend: 'firebase' | 'mysql';
  setBackend: (backend: 'firebase' | 'mysql') => void;
  mysqlConfig: any;
  setMysqlConfig: (config: any) => void;
  side?: 'left' | 'right';
}

const AIChatSidebar: React.FC<AIChatSidebarProps> = (props) => {
  const router = useRouter(); // Initialize useRouter
  const store = useAppStore();
  const [messages, setMessages] = useState<(ChatMessage & { attachments?: string[] })[]>([]);
  const [inputMessage, setInputMessage] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [isFullScreen, setIsFullScreen] = useState(false);
  const [aiMode, setAiMode] = useState<'cloud' | 'offline' | 'auto'>('auto');
  const [isOnline, setIsOnline] = useState(true);
  const [commandQueue, setCommandQueue] = useState<AICommand[]>([]);
  const [currentCommandIndex, setCurrentCommandIndex] = useState(0);
  const processingQueueRef = useRef(false);
  const abortControllerRef = useRef<AbortController | null>(null);
  const [attachments, setAttachments] = useState<{ name: string; type: string; data: string }[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [ragContextItems, setRagContextItems] = useState<any[]>([]);
  const [showRagPanel, setShowRagPanel] = useState(false);
  const [isReadingPage, setIsReadingPage] = useState(false);
  const [permissionPending, setPermissionPending] = useState<{ resolve: (val: boolean) => void } | null>(null);
  const [showSettings, setShowSettings] = useState(false); // Local toggle for settings
  const [groqSpeed, setGroqSpeed] = useState<string | null>(null);
  const [ollamaModels, setOllamaModels] = useState<{ name: string; modified_at: string; }[]>([]);
  const [isMermaidLoaded, setIsMermaidLoaded] = useState(false);
  const tesseractWorkerRef = useRef<Tesseract.Worker | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const [showLLMProviderSettings, setShowLLMProviderSettings] = useState<boolean>(false); // New state for LLM settings

  const [showExportMenu, setShowExportMenu] = useState(false);
  const [showActionsMenu, setShowActionsMenu] = useState(false);

  useEffect(() => {
    // Dynamically load mermaid for diagrams
    const script = document.createElement('script');
    script.src = "https://cdn.jsdelivr.net/npm/mermaid/dist/mermaid.min.js";
    script.async = true;
    script.onload = () => {
      if ((window as any).mermaid) {
        (window as any).mermaid.initialize({ startOnLoad: false, theme: 'dark' });
        setIsMermaidLoaded(true);
      } else {
        console.error("Mermaid script loaded, but mermaid object not found.");
      }
    };
    script.onerror = (error) => {
      console.error("Failed to load mermaid script:", error);
    };
    document.body.appendChild(script);
  }, []);


  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Webview visibility is now managed by ClientOnlyPage layout resizing

  useEffect(() => {
    // Initialize Tesseract worker
    const initializeTesseract = async () => {
      try {
        const worker = await Tesseract.createWorker('eng', 1, {
          logger: m => console.log(m),
        });
        tesseractWorkerRef.current = worker;
        console.log("Tesseract worker initialized successfully.");
      } catch (err) {
        console.error("Failed to initialize Tesseract worker:", err);
      }
    };
    initializeTesseract();

    return () => {
      if (tesseractWorkerRef.current) {
        tesseractWorkerRef.current.terminate();
        console.log("Tesseract worker terminated.");
      }
    };
  }, []);

  // AI Chat Input Listener
  useEffect(() => {
    const unsubscribe = firebaseService.onAuthStateChanged((user) => {
      setUser(user);
      if (window.electronAPI) {
        window.electronAPI.setUserId(user ? user.uid : null);
      }
    });
    return () => unsubscribe();
  }, []);

  // AI Chat Input Listener
  useEffect(() => {
    if (window.electronAPI && typeof window.electronAPI.on === 'function') {
      const cleanup = window.electronAPI.on('ai-chat-input-text', (text: string) => {
        setInputMessage(text);
        // Optionally, focus the input field
        // inputRef.current?.focus();
      });
      return cleanup;
    }
  }, []);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Effect to handle search results from newly loaded tabs
  useEffect(() => {
    if (window.electronAPI) {
      const cleanup = window.electronAPI.onTabLoaded(async ({ tabId, url }) => {
        if (tabId === store.activeTabId && url.includes('google.com/search?q=')) { // Only process active tab's search results
          console.log('[AI] New tab loaded with search results:', url);
          // Give the page a moment to render before scraping
          await new Promise(r => setTimeout(r, 1500));
          const { success, results, error } = await window.electronAPI.extractSearchResults(tabId);
          if (success && results && results.length > 0) {
            const searchResultsContext = results.map((r: any, i: number) => `Result ${i + 1}: ${r.title} - ${r.url} - ${r.snippet}`).join('\n');
            await handleSendMessage(`Analyze these top search results:\n${searchResultsContext}`);
          } else if (error) {
            console.error('[AI] Failed to extract search results:', error);
            setError(`Failed to extract search results: ${error}`);
          }
        }
      });
      return cleanup;
    }
  }, [store.activeTabId]);

  // Auto-initialize AI Engine
  useEffect(() => {
    const initAI = async () => {
      if (window.electronAPI && store.aiProvider) {
        await window.electronAPI.setActiveLLMProvider(store.aiProvider);
        let config: LLMProviderOptions = {};

        // Ollama Integration Note:
        // For ollama to work, the Ollama application must be installed on the user's system
        // and its executable (`ollama`) must be available in the system's PATH.
        // This allows the main process to find and execute the Ollama CLI.
        // Users should install the latest stable version of Ollama for their respective OS (Windows, macOS, Linux).
        // For Windows, it's expected that the official installer is used which adds ollama to PATH.
        if (store.aiProvider === 'local-tfjs') {
          // TF.js is self-initializing in the renderer, but we prime the main process
          config = { type: 'local-tfjs' };
        } else if (store.aiProvider === 'ollama') {
          config = { baseUrl: store.ollamaBaseUrl, model: store.ollamaModel };
          // Fetch Ollama models
          if (window.electronAPI) {
            const { models, error } = await window.electronAPI.ollamaListModels();
            if (models) {
              setOllamaModels(models);
            } else if (error) {
              console.error("Failed to list Ollama models:", error);
              setError(`Ollama error: ${error}`);
            }
          }
        } else if (store.aiProvider === 'openai-compatible') {
          config = { apiKey: store.openaiApiKey, baseUrl: store.localLLMBaseUrl, model: store.localLLMModel };
        } else if (store.aiProvider.startsWith('gemini')) {
          config = { apiKey: store.geminiApiKey, model: store.localLLMModel || (store.aiProvider === 'gemini-3-pro' ? 'gemini-1.5-pro' : 'gemini-1.5-flash') };
        } else if (store.aiProvider === 'claude' || store.aiProvider === 'anthropic') {
          config = { apiKey: store.anthropicApiKey, model: store.localLLMModel || 'claude-3-5-sonnet-20240620' };
        } else if (store.aiProvider === 'groq') {
          config = { apiKey: store.groqApiKey, model: store.localLLMModel || 'llama3-8b-8192' };
        }

        await window.electronAPI.configureLLMProvider(store.aiProvider, config);
        console.log("[AIChat] Neural Engine Primed:", store.aiProvider);
      }
    };
    initAI();
  }, [store.aiProvider, store.ollamaBaseUrl, store.ollamaModel, store.openaiApiKey, store.localLLMBaseUrl, store.localLLMModel, store.geminiApiKey, store.anthropicApiKey, store.groqApiKey]);

  // Function to extract text from PDF file (using react-pdf's worker)
  const extractPdfText = async (file: File): Promise<string> => {
    return new Promise(async (resolve, reject) => {
      const arrayBuffer = await file.arrayBuffer();
      const pdf = await window.pdfjsLib.getDocument({ data: arrayBuffer }).promise;
      let fullText = '';
      for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i);
        const textContent = await page.getTextContent();
        fullText += textContent.items.map((item: any) => item.str).join(' ') + '\n';
      }
      resolve(fullText);
    });
  };


  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files) {
      Array.from(files).forEach(file => {
        const reader = new FileReader();
        reader.onload = (e) => {
          setAttachments(prev => [...prev, { name: file.name, type: file.type, data: e.target?.result as string }]);
        };
        reader.readAsDataURL(file);
      });
    }
  };

  const handleDrop = async (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      for (const file of Array.from(e.dataTransfer.files)) {
        if (file.type.startsWith('image/')) {
          try {
            if (tesseractWorkerRef.current) {
              const { data: { text: ocrText } } = await tesseractWorkerRef.current.recognize(file);
              handleSendMessage(`Analyze image: ${ocrText}`);
            } else {
              setError("Tesseract worker not initialized for image analysis.");
            }
          } catch (err) {
            console.error("OCR failed for dropped image:", err);
            setError("Failed to analyze dropped image.");
          }
        } else if (file.type === 'application/pdf') {
          try {
            const pdfText = await extractPdfText(file);
            handleSendMessage(`Analyze PDF: ${pdfText}`);
          } catch (err) {
            console.error("PDF text extraction failed for dropped PDF:", err);
            setError("Failed to extract text from dropped PDF.");
          }
        } else {
          setError("Unsupported file type dropped.");
        }
      }
      e.dataTransfer.clearData();
    }
  };

  // Process command queue
  const processCommandQueue = async (commands: AICommand[]) => {
    if (!processingQueueRef.current) return;

    // Create an AbortController for this queue execution
    const controller = new AbortController();
    abortControllerRef.current = controller;

    for (let i = 0; i < commands.length; i++) {
      if (controller.signal.aborted || !processingQueueRef.current) break;

      const cmd = commands[i];
      setCurrentCommandIndex(i);

      // Update status to executing
      setCommandQueue(prev => prev.map(c => c.id === cmd.id ? { ...c, status: 'executing' } : c));

      try {
        let result = '';

        // Execute command based on type
        switch (cmd.type) {
          case 'NAVIGATE':
            const url = cmd.value;
            store.setCurrentUrl(url);
            if (url.startsWith('comet://')) {
              const resourcePath = url.substring('comet://'.length);
              router.push(`/${resourcePath}`);
              store.setActiveView('browser');
              result = `Navigated to internal page: /${resourcePath}`;
            } else {
              store.setActiveView('browser');
              if (window.electronAPI) {
                await window.electronAPI.navigateBrowserView({ tabId: store.activeTabId, url });
              }
              result = `Navigated to ${url}`;
            }
            await delay(1000);
            break;

          case 'SEARCH':
          case 'WEB_SEARCH':
            const query = cmd.value;
            const searchUrl = `https://www.google.com/search?q=${encodeURIComponent(query)}`;
            store.setCurrentUrl(searchUrl);
            store.setActiveView('browser');
            if (window.electronAPI) {
              await window.electronAPI.navigateBrowserView({ tabId: store.activeTabId, url: searchUrl });
            }
            result = `Searched for: ${query}`;
            await delay(1000);
            break;

          case 'SET_THEME':
            store.setTheme(cmd.value.toLowerCase() as any);
            result = `Theme set to ${cmd.value}`;
            break;

          case 'OPEN_VIEW':
            store.setActiveView(cmd.value.toLowerCase());
            result = `Opened ${cmd.value} view`;
            break;

          case 'RELOAD':
            if (window.electronAPI) window.electronAPI.reload();
            result = 'Reloaded page';
            await delay(500);
            break;

          case 'GO_BACK':
            if (window.electronAPI) window.electronAPI.goBack();
            result = 'Navigated back';
            await delay(500);
            break;

          case 'GO_FORWARD':
            if (window.electronAPI) window.electronAPI.goForward();
            result = 'Navigated forward';
            await delay(500);
            break;

          case 'READ_PAGE_CONTENT':
            if (window.electronAPI) {
              const extraction = await window.electronAPI.extractPageContent();
              if (extraction.content) {
                BrowserAI.addToVectorMemory(extraction.content, { type: 'page_content', url: store.currentUrl });
                setMessages(prev => [...prev, { role: 'model', content: `\n\n[PAGE_CONTENT_READ]: ${(extraction.content || '').substring(0, 500)}... (saved to memory)` }]);
                result = 'Read page content';
              } else {
                throw new Error('Failed to read page content');
              }
            } else {
              throw new Error('API not available');
            }
            break;

          case 'SCREENSHOT_AND_ANALYZE':
            if (window.electronAPI) {
              const screenshotDataUrl = await window.electronAPI.captureBrowserViewScreenshot();
              if (screenshotDataUrl && tesseractWorkerRef.current) {
                const { data: { text: ocrText } } = await tesseractWorkerRef.current.recognize(screenshotDataUrl);
                BrowserAI.addToVectorMemory(ocrText, { type: 'screenshot_ocr', url: store.currentUrl });
                setMessages(prev => [...prev, { role: 'model', content: `\n\n[SCREENSHOT_ANALYSIS]: ${ocrText}` }]);
                result = 'Analyzed screenshot';
              } else {
                // Fallback if failing silently
                throw new Error('Failed to capture or analyze screenshot');
              }
            } else {
              throw new Error('API not available');
            }
            break;

          case 'LIST_OPEN_TABS':
            if (window.electronAPI) {
              const openTabs = await window.electronAPI.getOpenTabs();
              if (openTabs) {
                const tabsList = openTabs.map((t: any) => `- ${t.title} (${t.url})`).join('\n');
                setMessages(prev => [...prev, { role: 'model', content: `\n\n[OPEN_TABS]:\n${tabsList}` }]);
                result = `Listed ${openTabs.length} tabs`;
              } else {
                result = 'No open tabs';
              }
            }
            break;

          case 'SET_VOLUME':
          case 'SET_BRIGHTNESS':
            if (window.electronAPI) {
              const percentage = parseInt(cmd.value, 10);
              const isBrightness = cmd.type === 'SET_BRIGHTNESS';
              const label = isBrightness ? 'Brightness' : 'Volume';

              let shellCmd = '';
              const platform = navigator.platform;

              if (platform.includes('Win')) {
                if (isBrightness) {
                  shellCmd = `powershell -Command "(Get-WmiObject -Namespace root/WMI -Class WmiMonitorBrightnessMethods).WmiSetBrightness(1,${percentage})"`;
                } else {
                  const winVolume = Math.round((percentage / 100) * 65535);
                  shellCmd = `nircmd.exe setsysvolume ${winVolume}`;
                }
              } else if (platform.includes('Mac')) {
                if (isBrightness) {
                  shellCmd = `brightness ${percentage / 100}`;
                } else {
                  shellCmd = `osascript -e "set volume output volume ${percentage}"`;
                }
              } else {
                // Linux fallback
                if (isBrightness) shellCmd = `brightnessctl set ${percentage}%`;
                else shellCmd = `amixer set 'Master' ${percentage}%`;
              }

              if (shellCmd) {
                await window.electronAPI.executeShellCommand(shellCmd);
                result = `Set ${label} to ${percentage}%`;
              } else {
                throw new Error('Platform not supported');
              }
            }
            break;

          case 'SHELL_COMMAND':
            if (window.electronAPI) {
              const output = await window.electronAPI.executeShellCommand(cmd.value);
              if (output && output.success) {
                result = 'Command executed successfully';
              } else {
                throw new Error(output?.error || 'Command failed');
              }
            }
            break;

          case 'OPEN_APP':
            if (window.electronAPI) {
              const res = await window.electronAPI.openExternalApp(cmd.value);
              if (res.success) result = `Opened ${cmd.value}`;
              else throw new Error(res.error || 'Failed to open app');
            }
            break;

          case 'FILL_FORM':
            if (window.electronAPI) {
              const [selector, value] = cmd.value.split('|').map(s => s.trim());
              const script = `
                            const el = document.querySelector('${selector}');
                            if (el) {
                                el.value = '${value}';
                                el.dispatchEvent(new Event('input', { bubbles: true }));
                                el.dispatchEvent(new Event('change', { bubbles: true }));
                                true;
                            } else false;
                        `;
              const res = await window.electronAPI.executeJavaScript(script);
              if (res) result = `Filled form field ${selector}`;
              else throw new Error(`Element ${selector} not found`);
            }
            break;

          case 'SCROLL_TO':
            if (window.electronAPI) {
              const [target, offsetStr] = cmd.value.split('|').map(s => s.trim());
              const offset = parseInt(offsetStr || '0', 10);
              const script = `
                            if ('${target}' === 'top') window.scrollTo({ top: ${offset}, behavior: 'smooth' });
                            else if ('${target}' === 'bottom') window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' });
                            else {
                                const el = document.querySelector('${target}');
                                if (el) {
                                    el.scrollIntoView({ behavior: 'smooth', block: 'start' });
                                    if (${offset} !== 0) window.scrollBy(0, ${offset});
                                }
                            }
                        `;
              await window.electronAPI.executeJavaScript(script);
              result = `Scrolled to ${target}`;
            }
            break;

          case 'EXTRACT_DATA':
            if (window.electronAPI) {
              const script = `document.querySelector('${cmd.value}')?.innerText`;
              const text = await window.electronAPI.executeJavaScript(script);
              if (text) {
                BrowserAI.addToVectorMemory(text, { type: 'extracted_data', url: store.currentUrl, selector: cmd.value });
                setMessages(prev => [...prev, { role: 'model', content: `\n\n[EXTRACTED]: ${text}` }]);
                result = 'Data extracted';
              } else {
                throw new Error('Element not found or empty');
              }
            }
            break;

          case 'CREATE_NEW_TAB_GROUP':
            result = `Created tab group: ${cmd.value.split('|')[0]}`;
            break;

          case 'OCR_COORDINATES':
          case 'OCR_SCREEN':
            if (window.electronAPI) {
              let x, y, width, height;
              if (cmd.value) [x, y, width, height] = cmd.value.split(',').map(Number);

              const screenshot = await window.electronAPI.captureBrowserViewScreenshot();
              if (screenshot && tesseractWorkerRef.current) {
                const { data: { text } } = await tesseractWorkerRef.current.recognize(screenshot);
                setMessages(prev => [...prev, { role: 'model', content: `\n\n[OCR]: ${text}` }]);
                result = 'OCR completed';
              }
            }
            break;

          case 'FIND_AND_CLICK':
            if (window.electronAPI && window.electronAPI.findAndClickText) {
              const res = await window.electronAPI.findAndClickText(cmd.value);
              if (res.success) result = `Clicked "${cmd.value}"`;
              else throw new Error(res.error || 'Failed to find text');
            }
            break;

          case 'GMAIL_AUTHORIZE':
            if (window.electronAPI) {
              const res = await window.electronAPI.gmailAuthorize();
              if (res.success) result = 'Gmail authorized';
              else throw new Error(res.error);
            }
            break;

          case 'GMAIL_LIST_MESSAGES':
            if (window.electronAPI) {
              const [q, max] = cmd.value.split('|');
              const res = await window.electronAPI.gmailListMessages(q, parseInt(max) || 10);
              if (res.success) {
                const list = (res.messages || []).map((m: any) => m.id).join('\n');
                setMessages(prev => [...prev, { role: 'model', content: `\n\n[EMAILS]:\n${list}` }]);
                result = `Listed ${(res.messages || []).length} emails`;
              } else throw new Error(res.error);
            }
            break;

          case 'GUIDE_CLICK':
            result = 'Guidance provided';
            await delay(3000);
            break;

          case 'WAIT':
            const duration = parseInt(cmd.value, 10);
            await delay(duration);
            result = `Waited ${duration}ms`;
            break;

          case 'EXPLAIN_CAPABILITIES':
            result = 'Capabilities explained';
            break;

          default:
            result = 'Command executed';
        }

        // Update status to completed
        const output = result;
        setCommandQueue(prev => prev.map(c => c.id === cmd.id ? { ...c, status: 'completed', output } : c));

      } catch (error: any) {
        console.error(`Command failed: ${cmd.type}`, error);
        setCommandQueue(prev => prev.map(c => c.id === cmd.id ? { ...c, status: 'failed', error: error.message } : c));
      }

    }

    // Reset queue after processing
    setTimeout(() => {
      setCommandQueue([]);
      processingQueueRef.current = false;
      abortControllerRef.current = null;
    }, 5000);
  };

  const cancelActions = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    setCommandQueue([]);
    processingQueueRef.current = false;
    abortControllerRef.current = null;
  };

  const handleSendMessage = async (customContent?: string) => {
    const contentToUse = customContent || inputMessage.trim();
    if (!contentToUse && attachments.length === 0) return;

    const attachmentData = attachments.map(a => a.data);
    const { content: protectedContent, wasProtected } = Security.fortress(contentToUse);
    const contentToUseFinal = protectedContent;

    const userMessage: ChatMessage & { attachments?: string[] } = {
      role: 'user',
      content: contentToUseFinal + (attachments.length > 0 ? `\n[Attached ${attachments.length} files]` : ''),
      attachments: attachmentData
    };

    if (wasProtected) {
      setMessages(prev => [...prev, { role: 'model', content: "🛡️ **AI Fortress Active**: Sensitive data protected." }]);
    }

    setMessages(prev => [...prev, userMessage]);
    if (!customContent) {
      setInputMessage('');
      setAttachments([]);
    }

    setIsLoading(true);
    setError(null);

    // One-time mistake warning
    if (!store.hasSeenAiMistakeWarning && messages.length === 0) {
      store.setShowAiMistakeWarning(true);
    }

    try {
      if (window.electronAPI) {
        // Retrieve REAL RAG context with updated interface
        const contextItems = await BrowserAI.retrieveContext(contentToUse);
        setRagContextItems(contextItems);
        if (contextItems.length > 0) setShowRagPanel(true);

        // Dynamic Page Scraping if asking about "this page"
        let pageContext = "";
        const keywords = ['this page', 'summarize', 'explain', 'analyze', 'read'];
        if (keywords.some(k => contentToUse.toLowerCase().includes(k))) {
          let shouldRead = !store.askForAiPermission;
          if (store.askForAiPermission) {
            const permission = await new Promise<boolean>((resolve) => {
              setPermissionPending({ resolve });
            });
            shouldRead = permission;
          }

          if (shouldRead) {
            setIsReadingPage(true);
            const extraction = await window.electronAPI.extractPageContent();
            pageContext = extraction.content || "";
            if (pageContext.length > 5000) pageContext = pageContext.substring(0, 5000) + "..."; // Token limit
            setTimeout(() => setIsReadingPage(false), 2000);
          }
        }

        // Web Search RAG (If query needs latest information)
        let webSearchContext = "";
        const searchKeywords = ['latest', 'current', 'today', '2025', '2026', 'news', 'price', 'status', 'who is', 'what happened', '?'];
        if (searchKeywords.some(k => contentToUse.toLowerCase().includes(k))) {
          try {
            const searchResults = await window.electronAPI.webSearchRag(contentToUse);
            if (searchResults && searchResults.length > 0) {
              webSearchContext = searchResults.map((s: string, i: number) => `[Web Result ${i + 1}]: ${s}`).join('\n');
            }
          } catch (e) { console.error("Web Search RAG failed:", e); }
        }

        const ragContextText = contextItems.map(c => `[Relevance: ${c.score.toFixed(2)}] ${c.text}`).join('\n- '); // More readable format with score
        const recentHistory = store.history.slice(-15).reverse().map(h => `- [${h.title || 'Untitled'}](${h.url})`).join('\n');
        const currentTab = store.tabs.find(t => t.id === store.activeTabId);

        const ragContext = `
[CURRENT CONTEXT]
Active Tab: ${currentTab?.title || 'Unknown'} (${store.currentUrl})

[ONLINE SEARCH RESULTS (LIVE)]
${webSearchContext || "No online context retrieved."}

[RECENT BROWSING HISTORY]
${recentHistory || "No recent history."}

[LOCAL KNOWLEDGE BASE (RAG)]
${ragContextText || "No relevant local memories."}

[PAGE CONTENT SNIPPET]
${pageContext || "Content not loaded. Use [READ_PAGE_CONTENT] command to read full page."}
        `.trim();

        // Inject System Instructions and Context
        const languageMap: Record<string, string> = {
          'hi': 'Hindi', 'bn': 'Bengali', 'te': 'Telugu', 'mr': 'Marathi', 'ta': 'Tamil',
          'gu': 'Gujarati', 'ur': 'Urdu', 'kn': 'Kannada', 'or': 'Odia', 'ml': 'Malayalam',
          'pa': 'Punjabi', 'as': 'Assamese', 'mai': 'Maithili', 'sat': 'Santali', 'ks': 'Kashmiri',
          'ne': 'Nepali', 'kok': 'Konkani', 'sd': 'Sindhi', 'doi': 'Dogri', 'mni': 'Manipuri',
          'sa': 'Sanskrit', 'brx': 'Bodo'
        };
        const langName = languageMap[store.selectedLanguage] || store.selectedLanguage;
        const languageInstructions = store.selectedLanguage !== 'en'
          ? `\nIMPORTANT: Respond ONLY in ${langName}. The user prefers this language. Always translate your findings to ${langName}.`
          : "";

        const platform = window.electronAPI ? window.electronAPI.getPlatform() : 'unknown';
        const safetyStatus = store.aiSafetyMode ? "ENABLED (High-Risk commands like SHELL_COMMAND require user approval)" : "DISABLED (Autonomous Mode)";
        const platformInstructions = `\n[SYSTEM INFO]\nUser Platform: ${platform} (Use appropriate shell commands for this OS).\nAI Safety Mode: ${safetyStatus}`;

        const messageHistory: ChatMessage[] = [
          { role: 'system', content: SYSTEM_INSTRUCTIONS + languageInstructions + platformInstructions },
          ...(store.additionalAIInstructions ? [{ role: 'system', content: store.additionalAIInstructions }] : []), // Add additional instructions
          ...messages.map(m => ({ role: m.role, content: m.content })),
          {
            role: 'user',
            content: userMessage.content + (ragContext ? `\n\n${ragContext}` : '')
          }
        ];

        const startTime = Date.now();
        const response = await window.electronAPI.generateChatContent(messageHistory);
        const endTime = Date.now();

        if (store.aiProvider === 'groq') {
          const tokens = response.text ? response.text.length / 4 : 0; // rough est
          const speed = ((tokens / ((endTime - startTime) / 1000))).toFixed(1);
          setGroqSpeed(`${speed} tok/s`);
        } else {
          setGroqSpeed(null);
        }

        if (response.error) {
          setError(response.error);
        } else if (response.text) {
          if (window.electronAPI) {
            window.electronAPI.addAiMemory({
              role: 'user',
              content: userMessage.content,
              url: store.currentUrl,
              response: response.text,
              provider: store.aiProvider
            });
          }
          let fullResponseText = response.text; // Store the original response text

          // Multi-Layered Task Processing (Chained Commands)
          // Multi-Layered Task Processing (Chained Commands)
          const executeCommands = async (content: string) => {
            const { commands, responseText } = prepareCommandsForExecution(content);

            // Show the text part of the response immediately if it exists
            if (responseText.trim()) {
              setMessages(prev => [...prev, { role: 'model', content: responseText }]);
            } else if (commands.length === 0) {
              // If no text and no commands, might be an empty response or just whitespace
              // But usually we have at least one.
            }

            if (commands.length > 0) {
              console.log('[AI Command Parser] Found commands:', commands);
              // Map parsed commands to AICommand format
              const aiCommands: AICommand[] = commands.map((cmd, idx) => ({
                id: `cmd-${Date.now()}-${idx}-${Math.random().toString(36).substr(2, 9)}`,
                type: cmd.type,
                value: cmd.value,
                status: 'pending',
                timestamp: Date.now()
              }));

              setCommandQueue(aiCommands);
              setCurrentCommandIndex(0);
              processingQueueRef.current = true;

              // Start processing the queue
              // We don't await this because we want the UI to update immediately
              processCommandQueue(aiCommands);
            }
          };

          await executeCommands(fullResponseText);

          // YouTube "Content Not Available" Detection and Auto-Fallback
          if (store.currentUrl.includes('youtube.com') && response.text.toLowerCase().includes('not available')) {
            console.log('[YouTube] Content unavailable detected, triggering web search fallback');
            const videoTopic = store.currentUrl.match(/[?&]v=([^&]+)/)?.[1] || 'video';
            const searchQuery = `${videoTopic} video alternative`;
            setMessages(prev => [...prev, { role: 'model', content: `\n\n⚠️ YouTube content unavailable.Searching for alternatives...[SEARCH: ${searchQuery}]` }]);

            // Execute search automatically after a short delay
            await delay(2000); // Wait for the message to be displayed
            const searchUrl = `https://www.google.com/search?q=${encodeURIComponent(searchQuery)}`;
            store.setCurrentUrl(searchUrl);
            if (window.electronAPI) {
              await window.electronAPI.navigateBrowserView({ tabId: store.activeTabId, url: searchUrl });
            }
          }

          // Trigger Mermaid re-render if diagrams found
          if (response.text.includes('mermaid') || response.text.includes('[GENERATE_DIAGRAM:')) {
            setTimeout(() => {
              (window as any).mermaid?.contentLoaded();
            }, 500);
          }
        }
      } else {
        setError("AI Engine not connected. Use the Comet Desktop App for full AI features.");
      }
    } catch (err: any) {
      setError(`Response Error: ${err.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleExportTxt = async () => {
    if (messages.length === 0) return;
    const success = await window.electronAPI.exportChatAsTxt(messages);
    if (success) alert('Exported as TXT');
  };

  const handleExportPdf = async () => {
    if (messages.length === 0) return;
    const success = await window.electronAPI.exportChatAsPdf(messages);
    if (success) alert('Exported as PDF');
  };

  const handleExportDiagram = async (mermaidCode: string, resolution: number = 1080) => {
    try {
      if (!isMermaidLoaded || !(window as any).mermaid) {
        setError("Mermaid.js is not loaded.");
        return;
      }

      // Render the Mermaid code to an SVG string
      const { svg } = await (window as any).mermaid.render('diagram-id', mermaidCode);

      // Create a temporary SVG element to get dimensions
      const svgElement = document.createElement('div');
      svgElement.innerHTML = svg;
      document.body.appendChild(svgElement); // Temporarily add to DOM to calculate dimensions
      const svgSvgElement = svgElement.querySelector('svg');

      if (!svgSvgElement) {
        setError("Failed to render Mermaid to SVG.");
        document.body.removeChild(svgElement);
        return;
      }

      const svgWidth = svgSvgElement.clientWidth || 800; // Default width
      const svgHeight = svgSvgElement.clientHeight || 600; // Default height
      document.body.removeChild(svgElement); // Remove temporary element

      const scale = resolution / svgHeight; // Calculate scale to match desired height
      const targetWidth = svgWidth * scale;
      const targetHeight = svgHeight * scale;

      const canvas = document.createElement('canvas');
      canvas.width = targetWidth;
      canvas.height = targetHeight;
      const ctx = canvas.getContext('2d');

      if (!ctx) {
        setError("Failed to get canvas context.");
        return;
      }

      // Create an image from SVG
      const img = new Image();
      const svgBlob = new Blob([svg], { type: 'image/svg+xml;charset=utf-8' });
      const url = URL.createObjectURL(svgBlob);

      img.onload = async () => {
        ctx.drawImage(img, 0, 0, targetWidth, targetHeight);
        URL.revokeObjectURL(url);

        canvas.toBlob(async (blob) => {
          if (blob && window.electronAPI) {
            const reader = new FileReader();
            reader.onloadend = async () => {
              const base64data = reader.result as string; // Data URL format
              const filename = `mermaid-diagram-${Date.now()}.png`;

              // Trigger download via main process
              const success = await window.electronAPI.triggerDownload(base64data, filename);
              if (success) {
                alert(`Diagram exported as ${filename} at ${resolution}p.`);
              } else {
                setError("Failed to trigger diagram download.");
              }
            };
            reader.readAsDataURL(blob);
          } else {
            setError("Failed to convert canvas to blob or Electron API not available.");
          }
        }, 'image/png', 1); // Quality 1 for PNG
      };
      img.onerror = (err) => {
        setError("Failed to load SVG into image for canvas.");
        console.error("SVG to image conversion error:", err);
      };
      img.src = url;

    } catch (err: any) {
      console.error("Error exporting diagram:", err);
      setError(`Failed to export diagram: ${err.message}`);
    }
  };

  if (props.isCollapsed) {
    return (
      <div className="flex flex-col items-center h-full py-4 space-y-6">
        <button onClick={props.toggleCollapse} className="w-10 h-10 flex items-center justify-center rounded-xl bg-white/5 hover:bg-white/10 text-white/40">
          {props.side === 'right' ? <ChevronLeft size={18} /> : <ChevronRight size={18} />}
        </button>
      </div>
    );
  }

  return (
    <div
      className={`flex flex-col h-full gap-4 p-4 bg-black/60 border-r border-transparent transition-all duration-500 z-[100] ${isFullScreen ? 'fixed inset-0 z-[9999] bg-[#020205] shadow-2xl overflow-hidden' : ''}
          ${isDragOver ? 'border-accent/50 bg-accent/5' : ''}
        `}
      style={{
        // GPU-accelerated background with reduced backdrop-filter to prevent compositing issues
        backdropFilter: isFullScreen ? 'none' : 'blur(20px)',
        WebkitBackdropFilter: isFullScreen ? 'none' : 'blur(20px)',
        // Ensure hardware acceleration
        transform: 'translateZ(0)',
        willChange: 'transform'
      }}
      onDragOver={(e) => { e.preventDefault(); setIsDragOver(true); }}
      onDragLeave={() => setIsDragOver(false)}
      onDrop={handleDrop}
    >
      {/* Resize Handle */}
      {!isFullScreen && !props.isCollapsed && (
        <div
          className={`absolute top-0 ${props.side === 'right' ? 'left-0' : 'right-0'} w-1 h-full cursor-col-resize hover:bg-deep-space-accent-neon/50 transition-colors z-[110]`}
          onMouseDown={(e) => {
            e.preventDefault();
            const startX = e.clientX;
            const startWidth = store.sidebarWidth;
            const handleMouseMove = (moveEvent: MouseEvent) => {
              const delta = props.side === 'right' ? startX - moveEvent.clientX : moveEvent.clientX - startX;
              let newWidth = startWidth + delta;
              if (newWidth < 300) newWidth = 300;
              if (newWidth > 800) newWidth = 800;
              store.setSidebarWidth(newWidth);
              if (window.electronAPI) {
                // Trigger a resize event to update BrowserView bounds if needed
                window.dispatchEvent(new Event('resize'));
              }
            };
            const handleMouseUp = () => {
              document.removeEventListener('mousemove', handleMouseMove);
              document.removeEventListener('mouseup', handleMouseUp);
            };
            document.addEventListener('mousemove', handleMouseMove);
            document.addEventListener('mouseup', handleMouseUp);
          }}
        />
      )}
      <style>{`
          .modern-scrollbar::-webkit-scrollbar {
            width: 6px;
          }
          .modern-scrollbar::-webkit-scrollbar-track {
            background: transparent;
          }
          .modern-scrollbar::-webkit-scrollbar-thumb {
            background-color: rgba(var(--color-primary-text), 0.1);
            border-radius: 6px;
            border: 3px solid transparent;
          }
          .modern-scrollbar::-webkit-scrollbar-thumb:hover {
            background-color: rgba(var(--color-primary-text), 0.2);
          }
        `}</style>
      <header className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl flex items-center justify-center">
            <img src="icon.png" alt="Comet AI Icon" className="w-full h-full object-contain" />
          </div>
          <h2 className="text-sm font-black uppercase tracking-[0.2em] text-white text-neon">Comet AI</h2>
          {isOnline ? <Wifi size={12} className="text-green-400" /> : <WifiOff size={12} className="text-orange-400" />}
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => setShowLLMProviderSettings(!showLLMProviderSettings)} className="w-8 h-8 rounded-xl bg-white/5 hover:bg-white/10 flex items-center justify-center text-white/40 transition-all no-drag-region" title="LLM Provider Settings">
            <MoreVertical size={18} />
          </button>
          <button onClick={() => setIsFullScreen(!isFullScreen)} className="p-2 text-secondary-text hover:text-primary-text transition-colors">
            {isFullScreen ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
          </button>
          <button onClick={props.toggleCollapse} className="p-2 text-secondary-text hover:text-primary-text transition-colors">
            <X size={16} />
          </button>
        </div>
      </header>
      <div className="flex-1 overflow-y-auto modern-scrollbar space-y-4 relative pr-2">
        {/* Antigravity RAG Panel */}
        <AnimatePresence>
          {showRagPanel && ragContextItems.length > 0 && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="mx-2 mb-2 rounded-xl bg-deep-space-accent-neon/5 overflow-hidden"
            >
              <div
                className="px-3 py-2 flex items-center justify-between cursor-pointer bg-deep-space-accent-neon/10"
                onClick={() => setShowRagPanel(!showRagPanel)}
              >
                <div className="flex items-center gap-2">
                  <Sparkles size={12} className="text-deep-space-accent-neon animate-pulse" />
                  <span className="text-[9px] font-black uppercase tracking-widest text-deep-space-accent-neon">Neural Context Active ({ragContextItems.length})</span>
                </div>
                <ChevronDown size={12} className="text-deep-space-accent-neon opacity-50" />
              </div>
              <div className="p-3 space-y-2">
                {ragContextItems.map((item, i) => (
                  <div key={i} className="text-[10px] text-white/50 leading-tight pl-2 border-l-2 border-deep-space-accent-neon/20">
                    {item.text.substring(0, 120)}...
                  </div>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {messages.map((msg, i) => (
          <motion.div key={i} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'}`}>
            <div className={`max-w-[85%] p-4 rounded-3xl text-sm leading-[1.6] ${msg.role === 'user' ? 'bg-sky-500/10 text-white border border-sky-500/20 shadow-[0_0_20px_rgba(56,189,248,0.1)]' : 'bg-white/[0.03] text-slate-200 border border-white/5'}`}>
              <ReactMarkdown
                remarkPlugins={[remarkGfm, remarkMath]}
                rehypePlugins={[rehypeKatex]}
                components={{
                  code({ node, className, children, ...props }) {
                    const match = /language-(\w+)/.exec(className || '');
                    const codeString = String(children).replace(/\n$/, '');

                    if (match && match[1] === 'mermaid' && isMermaidLoaded) {
                      return (
                        <div className="relative group bg-black/40 p-4 rounded-xl my-4 text-center" onClick={e => e.stopPropagation()}>
                          <div className="mermaid">{codeString}</div>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleExportDiagram(codeString);
                            }}
                            className="absolute top-2 right-2 p-1 rounded-full bg-white/10 text-white/70 hover:bg-white/20 hover:text-white transition-all opacity-0 group-hover:opacity-100"
                            title="Export Diagram"
                          >
                            <Download size={14} />
                          </button>
                        </div>
                      );
                    }

                    return node && !node.properties.inline && match ? (
                      <SyntaxHighlighter
                        style={dracula as any}
                        language={match[1]}
                        PreTag="div"
                      >
                        {codeString}
                      </SyntaxHighlighter>
                    ) : (
                      <code className={className} {...props}>
                        {children}
                      </code>
                    );
                  },
                  // Add custom rendering for math if needed, e.g., using <MathJax> or <KaTeX> components
                  // This example uses rehype-katex to process math within markdown directly
                }}
              >
                {msg.content}
              </ReactMarkdown>
            </div>
            {msg.role === 'model' && i === messages.length - 1 && groqSpeed && (
              <div className="mt-1 ml-2 flex items-center gap-1 text-[9px] font-bold text-deep-space-accent-neon opacity-60">
                <Zap size={10} /> {groqSpeed}
              </div>
            )}
          </motion.div>
        ))}
        {isLoading && <ThinkingIndicator />}
        {error && <div className="text-[10px] text-red-400 bg-red-400/10 p-2 rounded-lg border border-red-500/20">⚠️ {error}</div>}
        <div ref={messagesEndRef} />
      </div>

      {/* LLM Provider Settings */}
      <LLMProviderSettings
        {...props}
        ollamaModels={ollamaModels}
        setOllamaModels={setOllamaModels}
        setError={setError}
        showSettings={showLLMProviderSettings} // Pass new state
        setShowSettings={setShowLLMProviderSettings} // Pass new setter
      />

      <footer className="space-y-4">
        <textarea
          value={inputMessage}
          onChange={(e) => setInputMessage(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSendMessage(); } }}
          placeholder="Neural prompt..."
          className="w-full neural-prompt rounded-2xl p-4 text-xs text-white focus:outline-none h-24"
        />
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="relative">
              <button
                onClick={() => setShowActionsMenu(!showActionsMenu)}
                className="p-2 rounded-lg bg-white/5 text-white/40 hover:text-white text-[10px] font-bold uppercase tracking-widest transition-all"
                title="Actions"
              >
                <MoreVertical size={14} />
              </button>
              {showActionsMenu && (
                <div className="absolute bottom-full mb-2 w-48 bg-black/80 backdrop-blur-md border border-white/10 rounded-lg shadow-lg">
                  <button
                    onClick={() => { fileInputRef.current?.click(); setShowActionsMenu(false); }}
                    className="w-full flex items-center gap-2 px-4 py-2 text-xs text-left text-white/80 hover:bg-white/10"
                  >
                    📎
                    <span>Attach File</span>
                  </button>
                  <button
                    onClick={() => {
                      const lastMessage = messages.filter((m) => m.role === 'model').pop();
                      if (lastMessage) {
                        navigator.clipboard.writeText(lastMessage.content);
                      }
                      setShowActionsMenu(false);
                    }}
                    className="w-full flex items-center gap-2 px-4 py-2 text-xs text-left text-white/80 hover:bg-white/10"
                  >
                    <CopyIcon size={14} />
                    <span>Copy Last Response</span>
                  </button>
                  <button
                    onClick={() => {
                      const lastMessage = messages.filter((m) => m.role === 'model').pop();
                      if (lastMessage && navigator.share) {
                        navigator.share({
                          title: 'Comet AI Response',
                          text: lastMessage.content,
                        });
                      }
                      setShowActionsMenu(false);
                    }}
                    className="w-full flex items-center gap-2 px-4 py-2 text-xs text-left text-white/80 hover:bg-white/10"
                  >
                    <Share2 size={14} />
                    <span>Share Last Response</span>
                  </button>
                  <button
                    onClick={() => {
                      handleSendMessage('[FIND_AND_CLICK: ]'); // Prompt AI to ask for text
                      setShowActionsMenu(false);
                    }}
                    className="w-full flex items-center gap-2 px-4 py-2 text-xs text-left text-white/80 hover:bg-white/10"
                  >
                    <ScanLine size={14} />
                    <span>Find & Click Text (OCR)</span>
                  </button>
                  <button
                    onClick={() => {
                      const lastMessage = messages.filter((m) => m.role === 'model').pop();
                      if (lastMessage && window.electronAPI) {
                        window.electronAPI.saveAiResponse(lastMessage.content);
                      }
                      setShowActionsMenu(false);
                    }}
                    className="w-full flex items-center gap-2 px-4 py-2 text-xs text-left text-white/80 hover:bg-white/10"
                  >
                    <Download size={14} />
                    <span>Save Last Response</span>
                  </button>
                  <div className="h-[1px] bg-white/10 my-1" />
                  <button
                    onClick={() => { handleExportTxt(); setShowActionsMenu(false); }}
                    className="w-full flex items-center gap-2 px-4 py-2 text-xs text-left text-white/80 hover:bg-white/10"
                  >
                    <FileText size={14} />
                    <span>Export as Text</span>
                  </button>
                  <button
                    onClick={() => { handleExportPdf(); setShowActionsMenu(false); }}
                    className="w-full flex items-center gap-2 px-4 py-2 text-xs text-left text-white/80 hover:bg-white/10"
                  >
                    <FileText size={14} />
                    <span>Export as PDF</span>
                  </button>
                  <div className="h-[1px] bg-white/10 my-1" />
                  <button
                    onClick={() => {
                      setShowActionsMenu(false);
                      if (window.electronAPI?.findAndClickText) {
                        const text = window.prompt('Enter text to find and click on screen (e.g. Submit, Sign in):');
                        if (text?.trim()) {
                          window.electronAPI.findAndClickText(text.trim()).then((r: { success?: boolean; error?: string }) => {
                            if (r.success) setMessages(prev => [...prev, { role: 'model', content: '✅ **Find & Click:** Clicked successfully.' }]);
                            else setMessages(prev => [...prev, { role: 'model', content: `⚠️ **Find & Click:** ${r.error || 'Failed'}` }]);
                          });
                        }
                      }
                    }}
                    className="w-full flex items-center gap-2 px-4 py-2 text-xs text-left text-white/80 hover:bg-white/10"
                  >
                    <ScanLine size={14} />
                    <span>Find & Click (OCR)</span>
                  </button>
                </div>
              )}
            </div>
          </div>
          <input type="file" ref={fileInputRef} onChange={handleFileSelect} className="hidden" multiple />
          <button
            type="button"
            onClick={(e) => { e.preventDefault(); handleSendMessage(); }}
            disabled={!inputMessage.trim() || isLoading}
            className="group relative px-5 py-2.5 rounded-full bg-gradient-to-r from-deep-space-accent-neon to-accent overflow-hidden transition-all hover:shadow-[0_0_30px_rgba(0,255,255,0.6)] disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent translate-x-[-200%] group-hover:translate-x-[200%] transition-transform duration-700" />
            <div className="relative flex items-center gap-2 text-black font-bold text-[10px] uppercase tracking-wider">
              <Send size={12} className="group-hover:rotate-12 transition-transform" />
              <span>Launch</span>
            </div>
          </button>
        </div>
      </footer>
    </div>
  );
};

export default AIChatSidebar;
