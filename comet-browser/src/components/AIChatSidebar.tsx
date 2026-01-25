"use client";

import React, { useState, useRef, useEffect } from 'react';
import { ChatMessage, LLMProviderOptions } from "@/lib/llm/providers/base";
import LLMProviderSettings from './LLMProviderSettings';
import { motion, AnimatePresence } from 'framer-motion';
import { User } from "firebase/auth";
import firebaseService from '@/lib/FirebaseService';
import ThinkingIndicator from './ThinkingIndicator';
import { useAppStore } from '@/store/useAppStore';
import { Sparkles, Terminal, Code2, Image as ImageIcon, Maximize2, Minimize2, FileText, Download, Wifi, WifiOff, X, LogOut, User as UserIcon, ShieldAlert, ShieldCheck, SlidersHorizontal, ChevronLeft, ChevronRight, ChevronDown, Zap } from 'lucide-react';
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
- [SCREENSHOT_AND_ANALYZE] : Takes a screenshot of the current browser view, performs OCR, and analyzes the content.

CONTEXT:
- You have access to local RAG knowledge and current page content.
- When an action is requested, ALWAYS append the [COMMAND] to your response.
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
  const [ragContextItems, setRagContextItems] = useState<{ text: string; score: number }[]>([]);
  const [showRagPanel, setShowRagPanel] = useState(false);
  const [showSettings, setShowSettings] = useState(false); // Local toggle for settings
  const [groqSpeed, setGroqSpeed] = useState<string | null>(null);
  const tesseractWorkerRef = useRef<Tesseract.Worker | null>(null);
  const [isDragOver, setIsDragOver] = useState(false); // State for drag-over visual feedback
  const [ollamaModels, setOllamaModels] = useState<{ name: string; modified_at: string; }[]>([]);


  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    // Initialize Tesseract worker
    const initializeTesseract = async () => {
      tesseractWorkerRef.current = await Tesseract.createWorker('eng');
      console.log("Tesseract worker initialized.");
    };

    initializeTesseract();

    return () => {
      // Terminate Tesseract worker on component unmount
      tesseractWorkerRef.current?.terminate();
      console.log("Tesseract worker terminated.");
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
    if (window.electronAPI) {
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
        } else if (store.aiProvider === 'gemini') {
          config = { apiKey: store.geminiApiKey, model: store.localLLMModel || 'gemini-1.5-flash' };
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
          const extraction = await window.electronAPI.extractPageContent();
          pageContext = extraction.content || "";
          if (pageContext.length > 5000) pageContext = pageContext.substring(0, 5000) + "..."; // Token limit
        }

        const ragContextText = contextItems.map(c => c.text).join(' | ');

        const ragContext = `
[LOCAL KNOWLEDGE]: ${ragContextText}
[PAGE CONTENT]: ${pageContext}
        `.trim();

        // Inject System Instructions and Context
        const messageHistory: ChatMessage[] = [
          { role: 'system', content: SYSTEM_INSTRUCTIONS },
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
          let text = response.text;

          // Handle Local-Only Logic
          if (text === "INFO: LOCAL_NEURAL_ENGINE_REQUIRED") {
            text = await BrowserAI.summarizeLocal(contentToUse);
          }

          if (text.includes('NAVIGATE:')) {
            const match = text.match(/\[NAVIGATE:\s*(https?:\/\/[^\s\]]+)\]/i) || text.match(/NAVIGATE:\s*(https?:\/\/[^\s]+)/i);
            if (match) {
              store.setCurrentUrl(match[1]);
              store.setActiveView('browser');
              if (window.electronAPI) window.electronAPI.navigateBrowserView({ tabId: store.activeTabId, url: match[1] });
              text = text.replace(/\[NAVIGATE:.*?\]/i, '🌐 **Navigating...**').replace(/NAVIGATE:.*?[^\s]+/, '🌐 **Navigating...**');
            }
          }

          if (text.includes('SEARCH:')) {
            const match = text.match(/\[SEARCH:\s*(.*?)\]/i);
            if (match) {
              const searchUrl = `https://www.google.com/search?q=${encodeURIComponent(match[1])}`;
              store.setCurrentUrl(searchUrl);
              store.setActiveView('browser');
              if (window.electronAPI) window.electronAPI.navigateBrowserView({ tabId: store.activeTabId, url: searchUrl });
              text = text.replace(/\[SEARCH:.*?\]/i, `🔍 **Searching for:** ${match[1]}`);
            }
          }

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
            if (window.electronAPI && tesseractWorkerRef.current) {
              text = text.replace(/\[SCREENSHOT_AND_ANALYZE\]/i, '📸 **Taking screenshot and analyzing...**');
              setMessages(prev => [...prev, { role: 'model', content: text }]); // Display immediate feedback

              const screenshotDataUrl = await window.electronAPI.captureBrowserViewScreenshot();
              if (screenshotDataUrl) {
                const { data: { text: ocrText } } = await tesseractWorkerRef.current.recognize(screenshotDataUrl);
                const screenshotContext = `\n\n[SCREENSHOT_ANALYSIS]: ${ocrText}`;
                // Re-send the user's original message with screenshot context for AI to analyze
                await handleSendMessage(userMessage.content + screenshotContext);
                return; // Prevent further processing of the current AI response
              } else {
                text = '⚠️ **Failed to capture screenshot.**';
              }
            } else {
              text = '⚠️ **Screenshot analysis not available.**';
            }
          }

          setMessages(prev => [...prev, { role: 'model', content: text }]);
        }
      } else {
        setError("AI Engine not connected.");
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
        className={`flex flex-col h-full gap-4 p-4 bg-primary-bg/30 backdrop-blur-xl border-r border-border-color transition-all duration-500 z-50 ${isFullScreen ? 'fixed inset-0 z-[999] bg-primary-bg/90 shadow-2xl overflow-hidden' : ''}
          ${isDragOver ? 'border-accent bg-accent/10' : ''}
        `}
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
            <img src="/icon.ico" alt="Comet" className="w-8 h-8 object-contain" />
            <h2 className="text-sm font-black uppercase tracking-widest text-primary-text">Comet AI</h2>
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
              className="mx-2 mb-2 rounded-xl bg-deep-space-accent-neon/5 border border-deep-space-accent-neon/20 overflow-hidden"
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
            <div className={`max-w-[85%] p-4 rounded-3xl text-xs leading-relaxed ${msg.role === 'user' ? 'bg-deep-space-accent-neon/20 text-white border border-white/5 shadow-[0_0_15px_rgba(0,255,255,0.1)]' : 'bg-white/[0.03] text-white/80 border border-white/5'}`}>
              <ReactMarkdown
                remarkPlugins={[remarkGfm, remarkMath]}
                rehypePlugins={[rehypeKatex]}
                components={{
                  code({ node, className, children, ...props }) {
                    const match = /language-(\w+)/.exec(className || '');
                    return node && !node.properties.inline && match ? (
                      <SyntaxHighlighter
                        style={dracula as any}
                        language={match[1]}
                        PreTag="div"
                      >
                        {String(children).replace(/\n$/, '')}
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
          className="w-full bg-black/40 border border-white/10 rounded-2xl p-4 text-xs text-white focus:outline-none focus:ring-1 focus:ring-deep-space-accent-neon/50 h-24"
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
            className="px-6 py-2 rounded-xl bg-deep-space-accent-neon text-deep-space-bg font-black text-[10px] uppercase tracking-widest hover:scale-105 active:scale-95 transition-all shadow-[0_0_15px_rgba(0,255,255,0.4)]"
          >
            Launch ➤
          </button>
        </div>
        <LLMProviderSettings
          {...props}
          ollamaModels={ollamaModels}
          setOllamaModels={setOllamaModels}
          setError={setError}
        />
      </footer>
    </div>
  );
};

export default AIChatSidebar;