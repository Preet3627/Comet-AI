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
  Sparkles, Terminal, Code2, Image as ImageIcon, Maximize2, Minimize2, FileText, Download,
  Wifi, WifiOff, X, LogOut, User as UserIcon, ShieldAlert, ShieldCheck, SlidersHorizontal,
  ChevronLeft, ChevronRight, ChevronDown, Zap, Send, ShoppingBag, Globe, Plus, Bookmark,
  RotateCw, AlertTriangle, DownloadCloud, ShoppingCart, Copy as CopyIcon, Settings as GhostSettings,
  FolderOpen, ScanLine, Search, Puzzle, Briefcase, RefreshCcw, Layout, MoreVertical,
  CreditCard, ArrowRight, Languages, Share2, Lock, Shield, Volume2, Square, Music2, Waves
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

CHAINED EXECUTION:
You can provide MULTIPLE commands in a single response for multi-step tasks.
Example: "[NAVIGATE: https://google.com] [SEARCH: AI news] [OPEN_VIEW: browser]"

COGNITIVE CAPABILITIES:
- HYBRID RAG: You have access to Local Memory (History) AND Online Search Results.
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
  const store = useAppStore();
  const [messages, setMessages] = useState<(ChatMessage & { attachments?: string[] })[]>([]);
  const [inputMessage, setInputMessage] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [isFullScreen, setIsFullScreen] = useState(false);
  const [aiMode, setAiMode] = useState<'cloud' | 'offline' | 'auto'>('auto');
  const [isOnline, setIsOnline] = useState(true);
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

  useEffect(() => {
    // Dynamically load mermaid for diagrams
    const script = document.createElement('script');
    script.src = "https://cdn.jsdelivr.net/npm/mermaid/dist/mermaid.min.js";
    script.async = true;
    script.onload = () => {
      (window as any).mermaid?.initialize({ startOnLoad: true, theme: 'dark' });
      setIsMermaidLoaded(true);
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

        const ragContextText = contextItems.map(c => c.text).join(' | ');
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

        const messageHistory: ChatMessage[] = [
          { role: 'system', content: SYSTEM_INSTRUCTIONS + languageInstructions },
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
          let text = response.text;

          // Handle Local-Only Logic
          if (text === "INFO: LOCAL_NEURAL_ENGINE_REQUIRED") {
            text = await BrowserAI.summarizeLocal(contentToUse);
          }

          // Multi-Layered Task Processing (Chained Commands)
          const executeCommands = async (content: string) => {
            let processedText = content;

            // Handle Navigation Chaining - Improved reliability
            const navMatches = Array.from(content.matchAll(/\[NAVIGATE:\s*(https?:\/\/[^\s\]]+)\]/gi));
            for (const match of navMatches) {
              const url = match[1];
              console.log('[AI Command] Navigating to:', url);
              store.setCurrentUrl(url);
              store.setActiveView('browser');
              if (window.electronAPI) {
                await window.electronAPI.navigateBrowserView({ tabId: store.activeTabId, url });
              }
              processedText = processedText.replace(match[0], `🌐 **Navigating to ${url}...**`);
              // Small delay between commands to allow browser to react
              await new Promise(r => setTimeout(r, 1000));
            }

            // Handle Search Chaining - Improved reliability
            const searchMatches = Array.from(content.matchAll(/\[SEARCH:\s*(.*?)\]/gi));
            for (const match of searchMatches) {
              const query = match[1].trim();
              console.log('[AI Command] Searching for:', query);
              const searchUrl = `https://www.google.com/search?q=${encodeURIComponent(query)}`;
              store.setCurrentUrl(searchUrl);
              store.setActiveView('browser');
              if (window.electronAPI) {
                await window.electronAPI.navigateBrowserView({ tabId: store.activeTabId, url: searchUrl });
              }
              processedText = processedText.replace(match[0], `🔍 **Searching for:** ${query}`);
              await new Promise(r => setTimeout(r, 1000));
            }

            return processedText;
          };

          text = await executeCommands(text);

          if (text.includes('SET_THEME:')) {
            const match = text.match(/\[SET_THEME:\s*(dark|light|system)\]/i);
            if (match) {
              store.setTheme(match[1].toLowerCase() as any);
              text = text.replace(/\[SET_THEME:.*?\]/i, `🎨 **Theme updated to ${match[1]}**`);
            }
          }

          if (text.includes('OPEN_VIEW:')) {
            const match = text.match(/\[OPEN_VIEW:\s*(browser|workspace|webstore|pdf|media|coding)\]/i);
            if (match) {
              store.setActiveView(match[1].toLowerCase());
              text = text.replace(/\[OPEN_VIEW:.*?\]/i, `🚀 **Opening ${match[1]} view**`);
            }
          }

          if (text.includes('[RELOAD]')) {
            if (window.electronAPI) window.electronAPI.reload();
            text = text.replace(/\[RELOAD\]/i, '🔄 **Reloading page...**');
          }

          if (text.includes('[GO_BACK]')) {
            if (window.electronAPI) window.electronAPI.goBack();
            text = text.replace(/\[GO_BACK\]/i, '◀️ **Going back...**');
          }

          if (text.includes('[GO_FORWARD]')) {
            if (window.electronAPI) window.electronAPI.goForward();
            text = text.replace(/\[GO_FORWARD\]/i, '▶️ **Going forward...**');
          }

          if (text.includes('[SCREENSHOT_AND_ANALYZE]')) {
            if (window.electronAPI) {
              text = text.replace(/\[SCREENSHOT_AND_ANALYZE\]/i, '📸 **Taking screenshot and analyzing...**');
              setMessages(prev => [...prev, { role: 'model', content: text }]); // Display immediate feedback

              try {
                const screenshotDataUrl = await window.electronAPI.captureBrowserViewScreenshot();
                if (screenshotDataUrl && tesseractWorkerRef.current) {
                  const { data: { text: ocrText } } = await tesseractWorkerRef.current.recognize(screenshotDataUrl);
                  const screenshotContext = `\n\n[SCREENSHOT_ANALYSIS]: ${ocrText}`;
                  console.log('[OCR] Extracted text:', ocrText.substring(0, 200));
                  // Re-send the user's original message with screenshot context for AI to analyze
                  await handleSendMessage(userMessage.content + screenshotContext);
                  return; // Prevent further processing of the current AI response
                } else {
                  text = tesseractWorkerRef.current ? '⚠️ **Failed to capture screenshot.**' : '⚠️ **OCR engine still initializing, please try again.**';
                }
              } catch (err) {
                console.error('[OCR] Screenshot analysis failed:', err);
                text = '⚠️ **Screenshot analysis failed. Please try again.**';
              }
            } else {
              text = '⚠️ **Screenshot analysis not available in this environment.**';
            }
          }

          if (text.includes('[READ_PAGE_CONTENT]')) {
            if (window.electronAPI) {
              text = text.replace(/\[READ_PAGE_CONTENT\]/i, '📄 **Reading page content...**');
              setMessages(prev => [...prev, { role: 'model', content: text }]); // Display immediate feedback

              const extraction = await window.electronAPI.extractPageContent();
              if (extraction.content) {
                // Re-send the user's original message with page content context for AI to analyze
                await handleSendMessage(userMessage.content + `\n\n[PAGE_CONTENT_READ]: ${extraction.content}`);
                return; // Prevent further processing of the current AI response
              } else {
                text = '⚠️ **Failed to read page content.**';
              }
            } else {
              text = '⚠️ **Page content reading not available.**';
            }
          }

          if (text.includes('[LIST_OPEN_TABS]')) {
            if (window.electronAPI) {
              text = text.replace(/\[LIST_OPEN_TABS\]/i, '📝 **Listing open tabs...**');
              setMessages(prev => [...prev, { role: 'model', content: text }]); // Display immediate feedback

              const openTabs = await window.electronAPI.getOpenTabs();
              if (openTabs && openTabs.length > 0) {
                const tabsContext = openTabs.map((tab: any) => `Tab ID: ${tab.tabId}, Title: ${tab.title}, URL: ${tab.url}${tab.isActive ? ' (Active)' : ''}`).join('\n');
                await handleSendMessage(userMessage.content + `\n\n[OPEN_TABS_LIST]:\n${tabsContext}`);
                return; // Prevent further processing of the current AI response
              } else {
                text = '⚠️ **No open tabs found.**';
              }
            } else {
              text = '⚠️ **Tab listing not available.**';
            }
          }

          if (text.includes('[WEB_SEARCH:')) {
            const match = text.match(/\[WEB_SEARCH:\s*(.*?)\]/i);
            if (match) {
              const query = match[1];
              text = text.replace(/\[WEB_SEARCH:.*?\]/i, `🌐 **Performing Web Search for:** ${query}...`);
              setMessages(prev => [...prev, { role: 'model', content: text }]);

              const searchUrl = `https://www.google.com/search?q=${encodeURIComponent(query)}`;
              store.setCurrentUrl(searchUrl);
              store.setActiveView('browser');
              if (window.electronAPI) window.electronAPI.navigateBrowserView({ tabId: store.activeTabId, url: searchUrl });
              return;
            }
          }

          // New: Diagram Generation
          if (text.includes('[GENERATE_DIAGRAM:')) {
            const match = text.match(/\[GENERATE_DIAGRAM:\s*([\s\S]*?)\]/i);
            if (match) {
              const mermaidCode = match[1];
              text = text.replace(/\[GENERATE_DIAGRAM:[\s\S]*?\]/i, `\n\`\`\`mermaid\n${mermaidCode}\n\`\`\`\n`);
            }
          }

          // New: PDF Generation
          if (text.includes('[GENERATE_PDF:')) {
            const match = text.match(/\[GENERATE_PDF:\s*(.*?)\s*\|\s*([\s\S]*?)\]/i);
            if (match) {
              const title = match[1];
              const content = match[2];
              if (window.electronAPI) {
                window.electronAPI.exportChatAsPdf([{ role: 'system', content: `Title: ${title}\n\n${content}` }]);
                text = text.replace(/\[GENERATE_PDF:.*?\]/i, `📄 **Generated PDF:** ${title}`);
              }
            }
          }

          // YouTube "Content Not Available" Detection and Auto-Fallback
          if (store.currentUrl.includes('youtube.com') && text.toLowerCase().includes('not available')) {
            console.log('[YouTube] Content unavailable detected, triggering web search fallback');
            const videoTopic = store.currentUrl.match(/[?&]v=([^&]+)/)?.[1] || 'video';
            const searchQuery = `${videoTopic} video alternative`;
            text += `\n\n⚠️ YouTube content unavailable. Searching for alternatives... [SEARCH: ${searchQuery}]`;
            // Execute search automatically
            setTimeout(async () => {
              const searchUrl = `https://www.google.com/search?q=${encodeURIComponent(searchQuery)}`;
              store.setCurrentUrl(searchUrl);
              if (window.electronAPI) {
                await window.electronAPI.navigateBrowserView({ tabId: store.activeTabId, url: searchUrl });
              }
            }, 1000);
          }

          setMessages(prev => [...prev, { role: 'model', content: text }]);

          // Trigger Mermaid re-render if diagrams found
          if (text.includes('mermaid') || text.includes('[GENERATE_DIAGRAM:')) {
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
          <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-deep-space-accent-neon via-accent to-purple-500 flex items-center justify-center shadow-[0_0_20px_rgba(0,255,255,0.3)]">
            <Sparkles size={16} className="text-black animate-pulse" />
          </div>
          <h2 className="text-sm font-black uppercase tracking-[0.2em] text-white text-neon">Comet AI</h2>
          {isOnline ? <Wifi size={12} className="text-green-400" /> : <WifiOff size={12} className="text-orange-400" />}
        </div>
        <div className="flex items-center gap-2">
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

                    if (match && match[1] === 'mermaid') {
                      return <div className="mermaid bg-black/40 p-4 rounded-xl my-4 text-center">{codeString}</div>;
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

      <footer className="space-y-4">
        <textarea
          value={inputMessage}
          onChange={(e) => setInputMessage(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSendMessage(); } }}
          placeholder="Neural prompt..."
          className="w-full neural-prompt rounded-2xl p-4 text-xs text-white focus:outline-none h-24"
        />
        <div className="flex items-center justify-between">
          <button onClick={() => fileInputRef.current?.click()} className="p-2 rounded-lg bg-white/5 text-white/40 hover:text-white text-[10px] font-bold uppercase tracking-widest transition-all">
            📎 Attach
          </button>
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
        <LLMProviderSettings
          {...props}
          ollamaModels={ollamaModels}
          setOllamaModels={setOllamaModels}
          setError={setError}
        />

        {/* Permission Dialog */}
        <AnimatePresence>
          {permissionPending && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[99999] bg-black/60 backdrop-blur-md flex items-center justify-center p-4">
              <div className="w-full max-w-xs bg-[#0a0a0f] border border-white/10 rounded-2xl p-6 shadow-2xl">
                <div className="flex items-center gap-3 mb-4 text-accent">
                  <Shield size={20} />
                  <h3 className="text-sm font-black uppercase tracking-widest">AI Permission</h3>
                </div>
                <p className="text-xs text-white/70 leading-relaxed mb-6">Comet AI wants to read the current page content to assist you. Allow this session?</p>
                <div className="flex gap-3">
                  <button onClick={() => { permissionPending.resolve(false); setPermissionPending(null); }} className="flex-1 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-[10px] font-black uppercase tracking-widest text-white/40 transition-all border border-white/5">Deny</button>
                  <button onClick={() => { permissionPending.resolve(true); setPermissionPending(null); }} className="flex-1 py-2 rounded-xl bg-accent/20 hover:bg-accent/30 text-[10px] font-black uppercase tracking-widest text-accent transition-all border border-accent/20 shadow-[0_0_20px_rgba(0,255,255,0.1)]">Allow</button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Floating Glowing Border when reading */}
        <AnimatePresence>
          {isReadingPage && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 pointer-events-none z-[999999] border-[3px] border-accent/20 shadow-[inset_0_0_100px_rgba(0,255,255,0.1)] animate-pulse"
            />
          )}
        </AnimatePresence>

        {/* Footer with Disclaimer */}
        {/* AI Mistake Warning Popup */}
        <AnimatePresence>
          {store.showAiMistakeWarning && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[999999] bg-black/80 backdrop-blur-xl flex items-center justify-center p-6">
              <div className="w-full max-w-sm bg-[#0a0a0f] border border-white/10 rounded-[2rem] p-8 shadow-2xl relative overflow-hidden">
                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-accent to-transparent" />
                <div className="flex flex-col items-center text-center space-y-6">
                  <div className="w-16 h-16 rounded-2xl bg-accent/10 flex items-center justify-center text-accent">
                    <Sparkles size={32} />
                  </div>
                  <div className="space-y-2">
                    <h3 className="text-xl font-black uppercase tracking-tight">Intelligence Disclaimer</h3>
                    <p className="text-xs text-white/40 leading-relaxed font-medium">Comet AI is a powerful neural engine, but it can make mistakes. Always verify critical information. Your data remains protected by our security shell.</p>
                  </div>
                  <div className="w-full space-y-3 pt-2">
                    <button
                      onClick={() => store.setShowAiMistakeWarning(false)}
                      className="w-full py-4 rounded-2xl bg-accent text-black font-black uppercase tracking-widest text-[10px] shadow-[0_0_30px_rgba(0,255,255,0.2)] hover:scale-[1.02] transition-all"
                    >
                      I Understand
                    </button>
                    <button
                      onClick={() => { store.setHasSeenAiMistakeWarning(true); store.setShowAiMistakeWarning(false); }}
                      className="w-full py-4 rounded-2xl bg-white/5 hover:bg-white/10 text-white/40 font-black uppercase tracking-widest text-[9px] border border-white/5 transition-all"
                    >
                      Don't Show Again
                    </button>
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </footer>
    </div>
  );
};

export default AIChatSidebar;