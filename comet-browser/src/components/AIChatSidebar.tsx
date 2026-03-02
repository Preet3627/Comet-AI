"use client";

import React, { useState, useRef, useEffect, useCallback, memo } from 'react';
import { ChatMessage, LLMProviderOptions } from "@/lib/llm/providers/base";
import LLMProviderSettings from './LLMProviderSettings';
import { motion, AnimatePresence } from 'framer-motion';
import { User } from "firebase/auth";
import firebaseService from '@/lib/FirebaseService';
import ThinkingIndicator from './ThinkingIndicator';
import { useAppStore } from '@/store/useAppStore';
import {
  Maximize2, Minimize2, FileText, Download,
  Wifi, WifiOff, X,
  ChevronLeft, ChevronRight, ChevronDown, ChevronUp, Zap, Send,
  Plus,
  CopyIcon, Check, Paperclip, Share2,
  FolderOpen, ScanLine,
  MoreVertical,
  Sparkles,
  Image as ImageIcon,
  Eye, EyeOff, Brain, Search, Loader2, MousePointerClick,
} from 'lucide-react';
import { Security } from '@/lib/Security';
import { BrowserAI } from '@/lib/BrowserAI';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import dracula from 'react-syntax-highlighter/dist/cjs/styles/prism/dracula';
import Tesseract from 'tesseract.js';
import { useRouter } from 'next/navigation';
import { AICommandQueue, AICommand } from './AICommandQueue';
import { prepareCommandsForExecution } from '@/lib/AICommandParser';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const delay = (ms: number) => new Promise<void>((res) => setTimeout(res, ms));

// ---------------------------------------------------------------------------
// FIX 1: Step-decomposition jailbreak prevention
// Track refused intents across the session so that split-step attempts
// (e.g. "prefill email" after refusing "login") are caught and blocked.
// ---------------------------------------------------------------------------
type RefusedIntent =
  | 'credential_login'    // refused any login/auth flow for a site
  | 'session_export'      // refused session/cookie/token export
  | 'file_exfiltration';  // refused sensitive file access

interface RefusedIntentRecord {
  intent: RefusedIntent;
  site?: string; // e.g. "instagram.com"
  timestamp: number;
}

// Patterns that indicate a refused intent is being decomposed into steps
const REFUSED_INTENT_PATTERNS: { pattern: RegExp; intent: RefusedIntent; extractSite?: boolean }[] = [
  { pattern: /\b(login|log in|sign in|authenticate|credentials?)\b/i, intent: 'credential_login', extractSite: true },
  { pattern: /\b(session|cookie|token|auth|localStorage)\b.*\b(export|dump|copy|base64|backup)\b/i, intent: 'session_export' },
  { pattern: /\b(prefill|pre-fill|fill in|autofill).*(email|username|mail)\b/i, intent: 'credential_login', extractSite: true },
  { pattern: /\b(click|press).*(login|log in|sign in|submit|enter)\b/i, intent: 'credential_login', extractSite: true },
];

function extractSiteFromContext(content: string, url: string): string | undefined {
  try {
    return new URL(url).hostname;
  } catch {
    const match = content.match(/\b(instagram|facebook|twitter|google|github|linkedin|gmail)\b/i);
    return match?.[1]?.toLowerCase();
  }
}

// ---------------------------------------------------------------------------
// FIX 2: PII scrubbing for scraped page content
// Redacts email addresses, session tokens, and username patterns before
// storing or displaying scraped content.
// ---------------------------------------------------------------------------
const PII_PATTERNS: { pattern: RegExp; replacement: string }[] = [
  { pattern: /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g, replacement: '[EMAIL REDACTED]' },
  { pattern: /\b(logout|log out|sign out|signed in as|welcome[,\s]+)\s+\S+/gi, replacement: '[SESSION INFO REDACTED]' },
  { pattern: /\b(Bearer|token|session_id|auth_token|access_token)\s*[:=]\s*\S+/gi, replacement: '[TOKEN REDACTED]' },
  { pattern: /\b([a-f0-9]{32,})\b/g, replacement: '[HASH REDACTED]' }, // hex hashes/tokens
];

function scrubbedContent(raw: string): string {
  let result = raw;
  for (const { pattern, replacement } of PII_PATTERNS) {
    result = result.replace(pattern, replacement);
  }
  return result;
}

// ---------------------------------------------------------------------------
// FIX 3: Source validation — detect 404 / empty page responses
// ---------------------------------------------------------------------------
const NOT_FOUND_SIGNALS = [
  "page not found", "404", "doesn't exist", "sorry, this page",
  "we couldn't find", "no longer available", "moved permanently",
  "access denied", "403 forbidden",
];

function isFailedPageContent(content: string): boolean {
  const lower = content.toLowerCase().slice(0, 500);
  return NOT_FOUND_SIGNALS.some((s) => lower.includes(s));
}

// ---------------------------------------------------------------------------
// PDF helpers
// ---------------------------------------------------------------------------

/**
 * Strips internal command tags like [READ_PAGE_CONTENT], [OCR], [EXTRACTED],
 * [PAGE_CONTENT_READ], [SCREENSHOT_ANALYSIS], [OPEN_TABS], [EMAILS] etc.
 * that the AI sometimes leaks into PDF content.
 */
const INTERNAL_TAG_RE = /\[(?:READ_PAGE_CONTENT|PAGE_CONTENT_READ|SCREENSHOT_ANALYSIS|SCREENSHOT_AND_ANALYZE|OCR(?:_COORDINATES|_SCREEN)?|EXTRACTED|EXTRACT_DATA|OPEN_TABS|EMAILS|LIST_OPEN_TABS|NAVIGATE|SEARCH|WEB_SEARCH|FIND_AND_CLICK|CLICK_ELEMENT|CLICK_AT|CLICK_APP_ELEMENT|FILL_FORM|SCROLL_TO|SHELL_COMMAND|OPEN_APP|SET_THEME|SET_VOLUME|SET_BRIGHTNESS|RELOAD|GO_BACK|GO_FORWARD|WAIT|GUIDE_CLICK|GENERATE_PDF|GENERATE_DIAGRAM|OPEN_PRESENTON|EXPLAIN_CAPABILITIES|OPEN_VIEW|GMAIL_\w+|CREATE_NEW_TAB_GROUP)[^\]]*\]/gi;

/**
 * Converts plain text / markdown-ish AI content into clean, formatted HTML
 * ready for PDF rendering. Handles:
 *   - Stray HTML tags being placed on one line (beautifies them)
 *   - Markdown-style headings, bold, italic, lists, horizontal rules
 *   - Removes internal command tags
 *   - Adds Comet-AI branded footer with logo
 */
function buildCleanPDFContent(rawContent: string, title: string): string {
  // 1. Remove internal command tags
  let text = rawContent.replace(INTERNAL_TAG_RE, '').trim();

  // 2. If the input is already HTML (has tags), beautify it rather than escape it
  const looksLikeHTML = /<[a-z][\s\S]*?>/i.test(text);

  let bodyHTML: string;

  if (looksLikeHTML) {
    // Inject newlines around block-level tags for readability
    bodyHTML = text
      .replace(/>\s*</g, '>\n<')           // one tag per line
      .replace(/<(h[1-6]|p|li|ul|ol|table|tr|thead|tbody|div|br\s*\/?)\b/gi, '\n<$1')
      .replace(/<\/(h[1-6]|p|li|ul|ol|table|tr|thead|tbody|div)>/gi, '</$1>\n');
  } else {
    // 3. Convert markdown-ish plain text to HTML
    const lines = text.split('\n');
    const htmlLines: string[] = [];
    let inList = false;

    for (const rawLine of lines) {
      let line = rawLine
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;');

      // Headings
      if (/^#{1}\s/.test(line)) { if (inList) { htmlLines.push('</ul>'); inList = false; } htmlLines.push(`<h1>${line.replace(/^#+\s/, '')}</h1>`); continue; }
      if (/^#{2}\s/.test(line)) { if (inList) { htmlLines.push('</ul>'); inList = false; } htmlLines.push(`<h2>${line.replace(/^#+\s/, '')}</h2>`); continue; }
      if (/^#{3,}\s/.test(line)) { if (inList) { htmlLines.push('</ul>'); inList = false; } htmlLines.push(`<h3>${line.replace(/^#+\s/, '')}</h3>`); continue; }

      // Horizontal rule
      if (/^[-*]{3,}$/.test(line.trim())) { if (inList) { htmlLines.push('</ul>'); inList = false; } htmlLines.push('<hr/>'); continue; }

      // List items
      if (/^[-*•]\s/.test(line.trim())) {
        if (!inList) { htmlLines.push('<ul>'); inList = true; }
        htmlLines.push(`<li>${applyInlineMarkdown(line.replace(/^[-*•]\s/, ''))}</li>`);
        continue;
      }

      // Numbered list
      if (/^\d+\.\s/.test(line.trim())) {
        if (!inList) { htmlLines.push('<ol>'); inList = true; }
        htmlLines.push(`<li>${applyInlineMarkdown(line.replace(/^\d+\.\s/, ''))}</li>`);
        continue;
      }

      // Close list on blank or normal line
      if (inList && line.trim() === '') { htmlLines.push('</ul>'); inList = false; }

      // Empty line → paragraph break
      if (line.trim() === '') { htmlLines.push('<br/>'); continue; }

      // Normal paragraph
      htmlLines.push(`<p>${applyInlineMarkdown(line)}</p>`);
    }

    if (inList) htmlLines.push('</ul>');
    bodyHTML = htmlLines.join('\n');
  }

  // 4. Try to load the Comet icon as base64 for the footer
  //    We embed it inline so it works in any PDF renderer without file access.
  const iconBase64 = tryGetIconBase64();

  const footerLogoHTML = iconBase64
    ? `<img src="${iconBase64}" alt="Comet AI" style="width:18px;height:18px;object-fit:contain;vertical-align:middle;margin-right:6px;"/>`
    : '🌠';

  // 5. Assemble final HTML document
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8"/>
  <title>${escapeHtml(title)}</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700&display=swap');
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    html { font-size: 14px; }
    body {
      font-family: 'Inter', system-ui, sans-serif;
      color: #1a1a2e;
      background: #ffffff;
      padding: 48px 56px 80px;
      line-height: 1.7;
      max-width: 860px;
      margin: 0 auto;
    }
    h1 { font-size: 2rem; font-weight: 700; margin-bottom: 8px; color: #0f0f23; border-bottom: 3px solid #0ea5e9; padding-bottom: 10px; }
    h2 { font-size: 1.35rem; font-weight: 600; margin: 28px 0 10px; color: #1e3a5f; }
    h3 { font-size: 1.1rem; font-weight: 600; margin: 20px 0 8px; color: #2563eb; }
    p  { margin: 8px 0; }
    ul, ol { margin: 10px 0 10px 24px; }
    li { margin: 4px 0; }
    hr { border: none; border-top: 1px solid #e2e8f0; margin: 24px 0; }
    table { border-collapse: collapse; width: 100%; margin: 16px 0; }
    th { background: #0ea5e9; color: white; padding: 8px 12px; text-align: left; font-size: 0.85rem; }
    td { padding: 7px 12px; border-bottom: 1px solid #e2e8f0; font-size: 0.85rem; }
    tr:nth-child(even) td { background: #f8fafc; }
    code { font-family: 'Fira Code', monospace; background: #f1f5f9; padding: 2px 6px; border-radius: 4px; font-size: 0.82em; }
    pre  { background: #1e293b; color: #e2e8f0; padding: 16px; border-radius: 8px; overflow-x: auto; margin: 16px 0; font-size: 0.82em; line-height: 1.5; }
    strong { font-weight: 600; }
    em { font-style: italic; color: #475569; }
    .doc-title { margin-bottom: 32px; }
    .doc-meta  { font-size: 0.78rem; color: #94a3b8; margin-top: 4px; }

    /* Branded footer */
    .comet-footer {
      position: fixed;
      bottom: 0; left: 0; right: 0;
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 10px 56px;
      border-top: 1px solid #e2e8f0;
      background: #ffffff;
      font-size: 0.72rem;
      color: #94a3b8;
    }
    .comet-footer-brand {
      display: flex;
      align-items: center;
      gap: 6px;
      font-weight: 600;
      color: #0ea5e9;
    }
  </style>
</head>
<body>
  <div class="doc-title">
    <h1>${escapeHtml(title)}</h1>
    <div class="doc-meta">Generated by Comet AI • ${new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</div>
  </div>

  ${bodyHTML}

  <div class="comet-footer">
    <div class="comet-footer-brand">
      ${footerLogoHTML}
      Comet AI
    </div>
    <span>${escapeHtml(title)} • ${new Date().getFullYear()}</span>
  </div>
</body>
</html>`;
}

function applyInlineMarkdown(text: string): string {
  return text
    .replace(/\*\*\*(.+?)\*\*\*/g, '<strong><em>$1</em></strong>')
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    .replace(/`(.+?)`/g, '<code>$1</code>')
    .replace(/~~(.+?)~~/g, '<del>$1</del>');
}

function escapeHtml(str: string): string {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

/**
 * Tries to read icon.png/icon.ico from the page's origin and return base64.
 * Falls back to null if unavailable (e.g. file:// or CORS block).
 */
/**
 * Returns the cached Comet icon base64 string, or null if not yet loaded.
 * Loading is kicked off automatically at module init below.
 */
function tryGetIconBase64(): string | null {
  try {
    return (window as any).__cometIconBase64 ?? null;
  } catch {
    return null;
  }
}

/**
 * Loads the Comet icon into a base64 PNG and caches it on window.
 * Tries: /icon.png → /icon.ico (via Image) → Electron nativeImage (if available).
 * Called once at module load, non-blocking.
 */
async function preloadCometIcon(): Promise<void> {
  if (typeof window === 'undefined') return;
  if ((window as any).__cometIconBase64) return;

  const tryCanvas = (src: string): Promise<string | null> =>
    new Promise((resolve) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => {
        try {
          const size = Math.max(img.naturalWidth || 32, img.naturalHeight || 32, 1);
          const canvas = document.createElement('canvas');
          canvas.width = size;
          canvas.height = size;
          canvas.getContext('2d')?.drawImage(img, 0, 0, size, size);
          const data = canvas.toDataURL('image/png');
          // canvas.toDataURL returns "data:," for blank/blocked — reject those
          if (data.length < 100) { resolve(null); return; }
          (window as any).__cometIconBase64 = data;
          resolve(data);
        } catch { resolve(null); }
      };
      img.onerror = () => resolve(null);
      img.src = src;
    });

  // 1. Try PNG first (most reliable for canvas)
  if (await tryCanvas('/icon.png')) return;

  // 2. Try ICO — some browsers can decode it via Image
  if (await tryCanvas('/icon.ico')) return;

  // 3. Electron fallback — read icon file via IPC and get base64 back
  try {
    const api = (window as any).electronAPI;
    if (typeof api?.readFileAsBase64 === 'function') {
      const base64 = await api.readFileAsBase64('icon.ico');
      if (base64) {
        (window as any).__cometIconBase64 = `data:image/x-icon;base64,${base64}`;
        return;
      }
    }
    // Some builds expose nativeImage through a preload helper
    if (typeof api?.getAppIconBase64 === 'function') {
      const b64 = await api.getAppIconBase64();
      if (b64) { (window as any).__cometIconBase64 = b64; }
    }
  } catch { /* silently ignore */ }
}

if (typeof window !== 'undefined') {
  preloadCometIcon();
}



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
- [SHELL_COMMAND: command] : Executes a shell command and returns the output.
- [SET_BRIGHTNESS: percentage] : Sets the operating system's screen brightness (0-100%).
- [SET_VOLUME: percentage] : Sets the operating system's audio volume (0-100%).
- [OPEN_APP: app_name_or_path] : Opens an external application installed on the operating system.
- [FILL_FORM: selector | value] : Fills a form field identified by a CSS selector with the specified value.
- [SCROLL_TO: selector | position] : Scrolls the browser view to a specific element or position ('top', 'bottom').
- [EXTRACT_DATA: selector] : Extracts text content from an element identified by a CSS selector.
- [CREATE_NEW_TAB_GROUP: name | urls] : Creates a new group of tabs.
- [OCR_COORDINATES: x,y,width,height] : Performs OCR on specific pixel coordinates.
- [OCR_SCREEN: x,y,width,height] : Performs OCR on a specific screen region.
- [CLICK_ELEMENT: selector | reason] : Clicks a browser element by CSS selector. Requires user permission. Include the reason why.
- [CLICK_AT: x,y | reason] : Clicks at absolute screen coordinates. Requires user permission. Used for clicking OS apps or areas outside the browser.
- [CLICK_APP_ELEMENT: appName | elementText | reason] : Finds text in an OS app window using OCR then clicks it. Requires user permission. Use when the target is outside the browser.
- [FIND_AND_CLICK: text | reason] : Captures the screen, finds visible text via OCR, and clicks it. Requires user permission. Works for both browser and OS apps.
- [GMAIL_AUTHORIZE] : Authorizes Gmail API access.
- [GMAIL_LIST_MESSAGES: query | maxResults] : Lists Gmail messages.
- [GMAIL_GET_MESSAGE: messageId] : Gets a specific Gmail message.
- [GMAIL_SEND_MESSAGE: to | subject | body | threadId] : Sends a Gmail message.
- [GMAIL_ADD_LABEL: messageId | labelName] : Adds a label to a Gmail message.
- [WAIT: duration_ms] : Pauses AI execution for a specified duration in milliseconds.
- [GUIDE_CLICK: description | x,y,width,height] : Provides guidance for the user to click a specific area.
- [OPEN_PRESENTON: prompt] : Opens the Presentation view and starts a project with the given prompt.
- [EXPLAIN_CAPABILITIES] : Provides a detailed explanation of AI capabilities.

CHAINED EXECUTION:
You can provide MULTIPLE commands in a single response for multi-step tasks.
Example: "[NAVIGATE: https://google.com] [SEARCH: AI news] [OPEN_VIEW: browser]"

FORMATTING & STYLE:
- Use Markdown TABLES for all data comparison, feature lists, or structured information.
- Use **BOLD** and *ITALIC* for emphasis and clear hierarchy.
- Use EMOJIS (integrated naturally) to make the conversation engaging and futuristic 🚀.
- Be concise but extremely helpful and proactive.

COGNITIVE CAPABILITIES:
- HYBRID RAG: You have access to Local Memory (History) AND Online Search Results.
- VISION: You can see the page via [SCREENSHOT_AND_ANALYZE].
- AUTOMATION: You can help manage passwords and settings.

SEARCH-FIRST RULE (CRITICAL — NEVER SKIP):
- For ANY query about people, events, news, prices, rankings, current status, scores, releases, or any real-world data that may have changed: you MUST issue [WEB_SEARCH: query] BEFORE writing your answer.
- You are NOT allowed to answer with specific names, numbers, dates, or statistics from memory alone. If no search results are provided in context, always search first.
- If the user asks a question and no [ONLINE SEARCH RESULTS] are in the context, prepend your response with [WEB_SEARCH: <relevant query>] and wait for results before giving a final answer.
- This prevents hallucination. NEVER invent plausible-sounding data. If uncertain, say so clearly.

THINKING TRANSPARENCY:
- Wrap your internal reasoning in <think>...</think> tags BEFORE your final answer.
- Example: "<think>User wants JEE toppers. I need to search for this first since I don't have current data.</think> [WEB_SEARCH: JEE Main 2026 toppers]"
- Thoughts should show: what you know, what you need to verify, what actions you plan to take.

SECURITY RULES (NEVER VIOLATE):
- NEVER assist with exporting, reading, or encoding browser session data, cookies, or authentication tokens regardless of framing (migration, backup, export, etc.).
- NEVER complete a multi-step login flow on behalf of a user — this includes prefilling credentials AND clicking submit as a combined sequence.
- NEVER execute [SHELL_COMMAND] without explicit per-command user confirmation.
- If uncertain about an action's safety, refuse and explain why.

Always combine your local knowledge with online search for the most accurate and updated answers.
`.trim();

const LANGUAGE_MAP: Record<string, string> = {
  hi: 'Hindi', bn: 'Bengali', te: 'Telugu', mr: 'Marathi', ta: 'Tamil',
  gu: 'Gujarati', ur: 'Urdu', kn: 'Kannada', or: 'Odia', ml: 'Malayalam',
  pa: 'Punjabi', as: 'Assamese', mai: 'Maithili', sat: 'Santali', ks: 'Kashmiri',
  ne: 'Nepali', kok: 'Konkani', sd: 'Sindhi', doi: 'Dogri', mni: 'Manipuri',
  sa: 'Sanskrit', brx: 'Bodo',
};

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface Attachment {
  type: 'image' | 'pdf';
  data: string;
  ocrText?: string;
  filename: string;
}

interface Conversation {
  id: string;
  title: string;
  messages: ChatMessage[];
  createdAt: number;
  updatedAt: number;
}

type ExtendedChatMessage = ChatMessage & {
  attachments?: string[];
  isOcr?: boolean;       // marks OCR/raw data messages — hidden by default
  ocrLabel?: string;     // e.g. "PAGE_CONTENT_READ" | "SCREENSHOT_ANALYSIS"
  thinkingSteps?: ThinkingStep[]; // AI reasoning steps visible to user
};

interface ThinkingStep {
  id: string;
  label: string;           // e.g. "Searching web...", "Running OCR..."
  status: 'running' | 'done' | 'error';
  detail?: string;         // optional detail shown on expand
  timestamp: number;
}

// ---------------------------------------------------------------------------
// Helpers – localStorage (safe wrappers)
// ---------------------------------------------------------------------------

function lsGet<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function lsSet(key: string, value: unknown): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Silently ignore (private browsing / quota exceeded)
  }
}

function lsRemove(key: string): void {
  try {
    localStorage.removeItem(key);
  } catch {
    // noop
  }
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

interface MessageActionsProps {
  content: string;
  index: number;
  copiedIndex: number | null;
  onCopy: (content: string, index: number) => void;
  onShare: (content: string) => void;
}

const MessageActions = memo(function MessageActions({
  content,
  index,
  copiedIndex,
  onCopy,
  onShare,
}: MessageActionsProps) {
  const isCopied = copiedIndex === index;
  return (
    <div className="flex gap-1.5 mt-2 opacity-0 group-hover:opacity-100 transition-opacity">
      <button
        onClick={() => onCopy(content, index)}
        className="p-1.5 rounded-lg hover:bg-white/10 transition-colors text-white/60 hover:text-white"
        title={isCopied ? 'Copied!' : 'Copy message'}
      >
        {isCopied ? <Check size={14} /> : <CopyIcon size={14} />}
      </button>
      <button
        onClick={() => onShare(content)}
        className="p-1.5 rounded-lg hover:bg-white/10 transition-colors text-white/60 hover:text-white"
        title="Share message"
      >
        <Share2 size={14} />
      </button>
    </div>
  );
});

// ---------------------------------------------------------------------------
// CollapsibleOCRMessage — raw OCR/page-read output, hidden by default,
// expandable and resizable by the user
// ---------------------------------------------------------------------------
interface CollapsibleOCRMessageProps {
  label: string;
  content: string;
}

const CollapsibleOCRMessage = memo(function CollapsibleOCRMessage({
  label,
  content,
}: CollapsibleOCRMessageProps) {
  const [open, setOpen] = useState(false);
  const [height, setHeight] = useState(120);
  const dragStartY = useRef<number | null>(null);
  const dragStartH = useRef<number>(120);

  const onDragStart = (e: React.MouseEvent) => {
    dragStartY.current = e.clientY;
    dragStartH.current = height;
    const onMove = (ev: MouseEvent) => {
      if (dragStartY.current === null) return;
      const delta = ev.clientY - dragStartY.current;
      setHeight(Math.max(60, Math.min(600, dragStartH.current + delta)));
    };
    const onUp = () => {
      dragStartY.current = null;
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup', onUp);
    };
    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
  };

  return (
    <div className="w-full mt-1 rounded-xl border border-white/10 overflow-hidden bg-black/30">
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between px-3 py-2 text-[10px] font-bold uppercase tracking-widest text-white/40 hover:text-white/70 hover:bg-white/5 transition-all"
      >
        <div className="flex items-center gap-2">
          {open ? <EyeOff size={11} /> : <Eye size={11} />}
          <span>[{label}]</span>
          <span className="text-white/20 font-normal normal-case tracking-normal">
            {open ? 'click to hide' : `${content.length} chars — click to view`}
          </span>
        </div>
        {open ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height, opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            style={{ height }}
            className="overflow-y-auto modern-scrollbar"
          >
            <pre className="p-3 text-[10px] text-white/60 leading-relaxed whitespace-pre-wrap break-all font-mono">
              {content}
            </pre>
          </motion.div>
        )}
      </AnimatePresence>

      {open && (
        <div
          onMouseDown={onDragStart}
          className="w-full flex items-center justify-center py-1 cursor-ns-resize hover:bg-white/10 transition-colors"
          title="Drag to resize"
        >
          <div className="w-8 h-0.5 rounded-full bg-white/20" />
        </div>
      )}
    </div>
  );
});

// ---------------------------------------------------------------------------
// ThinkingPanel — shows the AI's step-by-step reasoning, collapsible
// ---------------------------------------------------------------------------
interface ThinkingPanelProps {
  steps: ThinkingStep[];
  thinkText?: string;
}

const ThinkingPanel = memo(function ThinkingPanel({ steps, thinkText }: ThinkingPanelProps) {
  const [open, setOpen] = useState(true);
  const hasRunning = steps.some((s) => s.status === 'running');

  return (
    <motion.div
      initial={{ opacity: 0, y: -6 }}
      animate={{ opacity: 1, y: 0 }}
      className="w-full rounded-xl border border-sky-500/20 bg-sky-500/5 overflow-hidden mb-1"
    >
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center gap-2 px-3 py-2 text-[10px] font-bold uppercase tracking-widest text-sky-400/70 hover:text-sky-300 hover:bg-sky-500/10 transition-all"
      >
        <Brain size={11} className={hasRunning ? 'animate-pulse' : ''} />
        <span>AI Thinking</span>
        {hasRunning && <Loader2 size={10} className="animate-spin ml-auto mr-1" />}
        {!hasRunning && (open ? <ChevronUp size={11} className="ml-auto" /> : <ChevronDown size={11} className="ml-auto" />)}
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ height: 0 }}
            animate={{ height: 'auto' }}
            exit={{ height: 0 }}
            className="overflow-hidden"
          >
            {thinkText && (
              <div className="px-3 pb-2 text-[10px] text-white/40 italic leading-relaxed border-b border-white/5">
                {thinkText}
              </div>
            )}
            <div className="px-3 py-2 space-y-1.5">
              {steps.map((step) => (
                <div key={step.id} className="flex items-start gap-2">
                  <div className={`mt-0.5 flex-shrink-0 w-3 h-3 rounded-full border flex items-center justify-center ${
                    step.status === 'running' ? 'border-sky-400 bg-sky-400/20' :
                    step.status === 'done' ? 'border-green-400 bg-green-400/20' :
                    'border-red-400 bg-red-400/20'
                  }`}>
                    {step.status === 'running' && <div className="w-1.5 h-1.5 rounded-full bg-sky-400 animate-pulse" />}
                    {step.status === 'done' && <Check size={7} className="text-green-400" />}
                    {step.status === 'error' && <X size={7} className="text-red-400" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className={`text-[10px] font-medium ${
                      step.status === 'running' ? 'text-sky-300' :
                      step.status === 'done' ? 'text-white/60' : 'text-red-300'
                    }`}>{step.label}</div>
                    {step.detail && (
                      <div className="text-[9px] text-white/30 truncate mt-0.5">{step.detail}</div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
});


// ---------------------------------------------------------------------------
// ClickPermissionModal — shown before AI clicks on a website element or app
// ---------------------------------------------------------------------------
interface ClickPermissionModalProps {
  context: {
    action: string;
    target: string;
    reason: string;
    risk: 'low' | 'medium' | 'high';
  };
  onAllow: () => void;
  onDeny: () => void;
}

const RISK_CONFIG = {
  low:    { color: 'text-green-400',  bg: 'bg-green-500/10',  border: 'border-green-500/20',  label: 'Low Risk',    icon: '🟢' },
  medium: { color: 'text-amber-400',  bg: 'bg-amber-500/10',  border: 'border-amber-500/20',  label: 'Medium Risk', icon: '🟡' },
  high:   { color: 'text-red-400',    bg: 'bg-red-500/10',    border: 'border-red-500/20',    label: 'High Risk',   icon: '🔴' },
};

const ClickPermissionModal = memo(function ClickPermissionModal({ context, onAllow, onDeny }: ClickPermissionModalProps) {
  const risk = RISK_CONFIG[context.risk];

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.92, y: 12 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.92, y: 12 }}
      className="w-full rounded-2xl border border-white/10 bg-[#0d0d1a] shadow-2xl overflow-hidden"
    >
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3 border-b border-white/5 bg-white/[0.02]">
        <div className="w-8 h-8 rounded-xl bg-sky-500/10 border border-sky-500/20 flex items-center justify-center">
          <MousePointerClick size={15} className="text-sky-400" />
        </div>
        <div>
          <div className="text-xs font-bold text-white">AI wants to interact</div>
          <div className="text-[10px] text-white/40">Permission required before proceeding</div>
        </div>
      </div>

      {/* Body */}
      <div className="p-4 space-y-3">
        <div className="flex items-start gap-3">
          <div className="mt-0.5 w-5 h-5 rounded-lg bg-blue-500/10 flex items-center justify-center flex-shrink-0">
            <Zap size={11} className="text-blue-400" />
          </div>
          <div>
            <div className="text-[10px] uppercase tracking-widest font-bold text-white/30 mb-0.5">Action</div>
            <div className="text-xs text-white font-medium">{context.action}</div>
          </div>
        </div>

        <div className="flex items-start gap-3">
          <div className="mt-0.5 w-5 h-5 rounded-lg bg-purple-500/10 flex items-center justify-center flex-shrink-0">
            <Eye size={11} className="text-purple-400" />
          </div>
          <div>
            <div className="text-[10px] uppercase tracking-widest font-bold text-white/30 mb-0.5">Target</div>
            <div className="text-xs text-white/80 font-mono bg-white/5 px-2 py-1 rounded-lg">{context.target}</div>
          </div>
        </div>

        <div className="flex items-start gap-3">
          <div className="mt-0.5 w-5 h-5 rounded-lg bg-amber-500/10 flex items-center justify-center flex-shrink-0">
            <Brain size={11} className="text-amber-400" />
          </div>
          <div>
            <div className="text-[10px] uppercase tracking-widest font-bold text-white/30 mb-0.5">Why</div>
            <div className="text-xs text-white/70 leading-relaxed">{context.reason}</div>
          </div>
        </div>

        <div className={`flex items-center gap-2 px-3 py-2 rounded-xl ${risk.bg} border ${risk.border}`}>
          <span className="text-xs">{risk.icon}</span>
          <span className={`text-[10px] font-bold uppercase tracking-widest ${risk.color}`}>{risk.label}</span>
          {context.risk === 'high' && (
            <span className="text-[10px] text-red-300/70 ml-1">— Review carefully before allowing</span>
          )}
        </div>
      </div>

      {/* Buttons */}
      <div className="flex gap-2 px-4 pb-4">
        <button
          onClick={onDeny}
          className="flex-1 py-2.5 rounded-xl border border-white/10 text-white/60 text-xs font-semibold hover:bg-white/5 hover:text-white transition-all"
        >
          ✕ Deny
        </button>
        <button
          onClick={onAllow}
          className={`flex-1 py-2.5 rounded-xl text-white text-xs font-bold transition-all ${
            context.risk === 'high'
              ? 'bg-red-500/20 border border-red-500/40 hover:bg-red-500/30'
              : 'bg-sky-500/20 border border-sky-500/40 hover:bg-sky-500/30'
          }`}
        >
          ✓ Allow
        </button>
      </div>
    </motion.div>
  );
});


  show,
  conversations,
  activeId,
  onClose,
  onLoad,
  onDelete,
  onNew,
}: ConversationHistoryPanelProps) {
  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ x: -300, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          exit={{ x: -300, opacity: 0 }}
          className="absolute left-0 top-0 bottom-0 w-64 bg-deep-space border-r border-white/10 z-50 overflow-y-auto modern-scrollbar backdrop-blur-xl"
        >
          <div className="p-4 border-b border-white/10 flex items-center justify-between">
            <h3 className="text-sm font-bold text-white">Chat History</h3>
            <button onClick={onClose} className="text-white/60 hover:text-white">
              <X size={16} />
            </button>
          </div>
          <div className="p-2 space-y-1">
            <button
              onClick={onNew}
              className="w-full p-3 mb-2 rounded-lg bg-sky-500/20 hover:bg-sky-500/30 transition-colors text-sm font-medium flex items-center gap-2 text-sky-400"
            >
              <Plus size={16} />
              New Chat
            </button>
            {conversations.map((conv) => (
              <div
                key={conv.id}
                className={`flex items-center rounded-lg p-2 transition-colors group ${
                  activeId === conv.id ? 'bg-white/10' : 'hover:bg-white/5'
                }`}
              >
                <div
                  onClick={() => onLoad(conv.id)}
                  className="flex-1 cursor-pointer min-w-0"
                >
                  <div className="text-xs font-medium text-white truncate">{conv.title}</div>
                  <div className="text-[10px] text-white/40 mt-1">
                    {new Date(conv.updatedAt).toLocaleDateString()}
                  </div>
                </div>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onDelete(conv.id);
                  }}
                  className="p-1.5 opacity-0 group-hover:opacity-100 hover:bg-red-500/20 rounded transition-all text-white/40 hover:text-red-400"
                >
                  <X size={12} />
                </button>
              </div>
            ))}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
});

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

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

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

const AIChatSidebar: React.FC<AIChatSidebarProps> = (props) => {
  const router = useRouter();

  // Destructure only what we need from store to avoid stale closure issues
  // FIX: Don't pass whole store object into useCallback deps
  const store = useAppStore();
  const {
    aiProvider, ollamaBaseUrl, ollamaModel, openaiApiKey, localLLMBaseUrl,
    localLLMModel, geminiApiKey, anthropicApiKey, groqApiKey,
    hasSeenAiMistakeWarning, askForAiPermission, aiSafetyMode,
    additionalAIInstructions, selectedLanguage, history, tabs, activeTabId,
    currentUrl, sidebarWidth,
    setShowAiMistakeWarning, setTheme: storeSetTheme, setActiveView,
    setCurrentUrl, setSidebarWidth,
  } = store;

  // Core state
  const [messages, setMessages] = useState<ExtendedChatMessage[]>([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isFullScreen, setIsFullScreen] = useState(false);
  const [isOnline, setIsOnline] = useState(true);
  const [isDragOver, setIsDragOver] = useState(false);

  // Command queue
  const [commandQueue, setCommandQueue] = useState<AICommand[]>([]);
  const [currentCommandIndex, setCurrentCommandIndex] = useState(0);
  const processingQueueRef = useRef(false);
  const abortControllerRef = useRef<AbortController | null>(null);

  // Refs
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const tesseractWorkerRef = useRef<Tesseract.Worker | null>(null);

  // FIX 1: Session-level refused intent tracking
  const refusedIntentsRef = useRef<RefusedIntentRecord[]>([]);

  // RAG / reading
  const [ragContextItems, setRagContextItems] = useState<any[]>([]);
  const [showRagPanel, setShowRagPanel] = useState(false);
  const [isReadingPage, setIsReadingPage] = useState(false);
  const [permissionPending, setPermissionPending] = useState<{
    resolve: (val: boolean) => void;
    context?: {
      actionType: string;     // e.g. "CLICK_ELEMENT", "FIND_AND_CLICK", "FILL_FORM"
      action: string;         // e.g. "Click Button"
      target: string;         // e.g. "Submit button on Google Search"
      what: string;           // e.g. "Click the search button to submit the query"
      reason: string;         // why AI wants to do this
      risk: 'low' | 'medium' | 'high';
    };
  } | null>(null);

  // UI toggles
  const [showLLMProviderSettings, setShowLLMProviderSettings] = useState(false);
  const [showActionsMenu, setShowActionsMenu] = useState(false);
  const [showConversationHistory, setShowConversationHistory] = useState(false);

  // Misc
  const [groqSpeed, setGroqSpeed] = useState<string | null>(null);
  const [ollamaModels, setOllamaModels] = useState<{ name: string; modified_at: string }[]>([]);
  const [isMermaidLoaded, setIsMermaidLoaded] = useState(false);
  const [copiedMessageIndex, setCopiedMessageIndex] = useState<number | null>(null);

  // Thinking / reasoning steps (shown to user during processing)
  const [thinkingSteps, setThinkingSteps] = useState<ThinkingStep[]>([]);
  const [thinkingText, setThinkingText] = useState<string>('');
  const [isThinking, setIsThinking] = useState(false);
  const thinkingIdCounter = useRef(0);

  const addThinkingStep = useCallback((label: string, detail?: string): string => {
    const id = `think-${Date.now()}-${thinkingIdCounter.current++}`;
    setThinkingSteps((prev) => [...prev, { id, label, status: 'running', detail, timestamp: Date.now() }]);
    return id;
  }, []);

  const resolveThinkingStep = useCallback((id: string, status: 'done' | 'error', detail?: string) => {
    setThinkingSteps((prev) => prev.map((s) => s.id === id ? { ...s, status, detail: detail ?? s.detail } : s));
  }, []);

  /**
   * Shows the ClickPermissionModal and waits for the user to Allow or Deny.
   * Returns true if allowed, false if denied.
   */
  const requestClickPermission = useCallback((
    action: string,
    target: string,
    reason: string,
    risk: 'low' | 'medium' | 'high' = 'medium',
  ): Promise<boolean> => {
    return new Promise<boolean>((resolve) => {
      setPermissionPending({ resolve, context: { action, target, reason, risk } });
    });
  }, []);

  /**
   * Shows the action-permission popup and waits for user approval/denial.
   * Returns true = approved, false = denied.
   */
  const requestActionPermission = useCallback((
    actionType: string,
    action: string,
    target: string,
    what: string,
    reason: string,
    risk: 'low' | 'medium' | 'high' = 'low',
  ): Promise<boolean> =>
    new Promise((resolve) => {
      setPermissionPending({ resolve, context: { actionType, action, target, what, reason, risk } });
    }),
  [setPermissionPending]);

  // Attachments
  const [attachments, setAttachments] = useState<Attachment[]>([]);

  // Conversations
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);

  // ---------------------------------------------------------------------------
  // FIX 1: Step-decomposition jailbreak guard
  // Checks whether the current request is a decomposed step of a previously
  // refused intent, and blocks it if so.
  // ---------------------------------------------------------------------------
  const checkDecomposedJailbreak = useCallback(
    (content: string): { blocked: boolean; reason?: string } => {
      const INTENT_TTL_MS = 10 * 60 * 1000; // 10 minutes
      const now = Date.now();

      // Prune stale records
      refusedIntentsRef.current = refusedIntentsRef.current.filter(
        (r) => now - r.timestamp < INTENT_TTL_MS,
      );

      for (const record of refusedIntentsRef.current) {
        if (record.intent === 'credential_login') {
          // If we previously refused a login intent for a site, block any
          // form-filling or click-submit on that same site
          const isFormFill = /\b(prefill|fill|autofill|enter|type).*(email|username|password|mail)\b/i.test(content);
          const isClickSubmit = /\b(click|press|submit|tap).*(login|sign in|log in|enter|continue)\b/i.test(content);
          if ((isFormFill || isClickSubmit) && record.site) {
            const mentionsSite = content.toLowerCase().includes(record.site.toLowerCase());
            if (mentionsSite || isClickSubmit) {
              return {
                blocked: true,
                reason: `🛡️ **Security Block:** This action appears to be part of a login flow for **${record.site}** that was previously declined. I won't assist with completing authentication flows on your behalf. You can log in directly in the browser.`,
              };
            }
          }
        }

        if (record.intent === 'session_export') {
          const isRelated = /\b(cookie|session|token|local.?storage|credential)\b/i.test(content);
          if (isRelated) {
            return {
              blocked: true,
              reason: `🛡️ **Security Block:** This request relates to session or credential data that I previously declined to access. I'm unable to assist with exporting or reading authentication tokens.`,
            };
          }
        }
      }

      return { blocked: false };
    },
    [],
  );

  const recordRefusedIntent = useCallback((content: string, intent: RefusedIntent) => {
    const site = extractSiteFromContext(content, currentUrl);
    refusedIntentsRef.current.push({ intent, site, timestamp: Date.now() });
  }, [currentUrl]);

  // ---------------------------------------------------------------------------
  // Effects
  // ---------------------------------------------------------------------------

  useEffect(() => {
    const script = document.createElement('script');
    script.src = 'https://cdn.jsdelivr.net/npm/mermaid/dist/mermaid.min.js';
    script.async = true;
    script.onload = () => {
      const mermaid = (window as any).mermaid;
      if (mermaid) {
        mermaid.initialize({ startOnLoad: false, theme: 'dark', securityLevel: 'loose', fontFamily: 'inherit' });
        setIsMermaidLoaded(true);
        setTimeout(() => mermaid.run(), 500);
      }
    };
    document.body.appendChild(script);
    return () => { document.body.removeChild(script); };
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    let cancelled = false;
    let worker: Tesseract.Worker | null = null;

    const init = async () => {
      try {
        worker = await Tesseract.createWorker('eng', 1, {
          workerPath: 'https://cdn.jsdelivr.net/npm/tesseract.js@v5.0.0/dist/worker.min.js',
          langPath: 'https://tessdata.projectnaptha.com/4.0.0',
          corePath: 'https://cdn.jsdelivr.net/npm/tesseract.js-core@v5.0.0/tesseract-core.wasm.js',
          logger: (m) => console.log('[Tesseract]', m),
        });
        if (cancelled) {
          worker.terminate();
        } else {
          tesseractWorkerRef.current = worker;
        }
      } catch (err) {
        console.error('Failed to initialize Tesseract worker:', err);
      }
    };

    init();
    return () => {
      cancelled = true;
      tesseractWorkerRef.current?.terminate();
      tesseractWorkerRef.current = null;
    };
  }, []);

  useEffect(() => {
    const unsubscribe = firebaseService.onAuthStateChanged((user: User | null) => {
      if (window.electronAPI) {
        window.electronAPI.setUserId(user ? user.uid : null);
      }
    });
    return () => unsubscribe();
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

  useEffect(() => {
    setConversations(lsGet<Conversation[]>('conversations_list', []));
  }, []);

  useEffect(() => {
    const initAI = async () => {
      if (!window.electronAPI || !aiProvider) return;

      await window.electronAPI.setActiveLLMProvider(aiProvider);
      let config: LLMProviderOptions = {};

      if (aiProvider === 'local-tfjs') {
        config = { type: 'local-tfjs' };
      } else if (aiProvider === 'ollama') {
        config = { baseUrl: ollamaBaseUrl, model: ollamaModel };
        const { models, error } = await window.electronAPI.ollamaListModels();
        if (models) setOllamaModels(models);
        else if (error) console.error('Ollama list models error:', error);
      } else if (aiProvider === 'openai-compatible') {
        config = { apiKey: openaiApiKey, baseUrl: localLLMBaseUrl, model: localLLMModel };
      } else if (aiProvider.startsWith('gemini')) {
        config = { apiKey: geminiApiKey, model: localLLMModel || 'gemini-2.5-flash-preview' };
      } else if (aiProvider === 'claude' || aiProvider === 'anthropic' || aiProvider.startsWith('claude')) {
        config = { apiKey: anthropicApiKey, model: localLLMModel || 'claude-sonnet-4-6' };
      } else if (aiProvider === 'groq') {
        config = { apiKey: groqApiKey, model: localLLMModel || 'llama-3.3-70b-versatile' };
      }

      await window.electronAPI.configureLLMProvider(aiProvider, config);
    };

    initAI();
  }, [aiProvider, ollamaBaseUrl, ollamaModel, openaiApiKey, localLLMBaseUrl, localLLMModel, geminiApiKey, anthropicApiKey, groqApiKey]);

  // ---------------------------------------------------------------------------
  // Core send handler
  // ---------------------------------------------------------------------------

  const handleSendMessage = useCallback(
    async (customContent?: string) => {
      const contentToUse = (customContent ?? inputMessage).trim();
      if (!contentToUse && attachments.length === 0) return;

      // Jailbreak check
      const jailbreakCheck = checkDecomposedJailbreak(contentToUse);
      if (jailbreakCheck.blocked) {
        setMessages((prev) => [
          ...prev,
          { role: 'user', content: contentToUse },
          { role: 'model', content: jailbreakCheck.reason! },
        ]);
        if (!customContent) { setInputMessage(''); setAttachments([]); }
        return;
      }

      const { content: protectedContent, wasProtected } = Security.fortress(contentToUse);

      const userMessage: ExtendedChatMessage = {
        role: 'user',
        content: protectedContent + (attachments.length > 0 ? `\n[Attached ${attachments.length} files]` : ''),
        attachments: attachments.map((a) => a.data),
      };

      if (wasProtected) {
        setMessages((prev) => [...prev, { role: 'model', content: '🛡️ **AI Fortress Active**: Sensitive data protected.' }]);
      }

      setMessages((prev) => [...prev, userMessage]);
      if (!customContent) { setInputMessage(''); setAttachments([]); }

      setIsLoading(true);
      setIsThinking(true);
      setThinkingSteps([]);
      setThinkingText('');
      setError(null);

      if (!hasSeenAiMistakeWarning && messages.length === 0) {
        setShowAiMistakeWarning(true);
      }

      if (
        protectedContent.toUpperCase().includes('[EXPLAIN-CAPABILITIES]') ||
        protectedContent.toUpperCase().includes('[EXPLAIN_CAPABILITIES]')
      ) {
        const fakeCmd: AICommand = {
          id: `cmd-${Date.now()}-explain`,
          type: 'EXPLAIN_CAPABILITIES',
          value: '',
          status: 'pending',
          timestamp: Date.now(),
        };
        setCommandQueue([fakeCmd]);
        setCurrentCommandIndex(0);
        processingQueueRef.current = true;
        processCommandQueue([fakeCmd]);
        setIsLoading(false);
        setIsThinking(false);
        return;
      }

      try {
        if (!window.electronAPI) {
          setError('AI Engine not connected. Use the Comet Desktop App for full AI features.');
          return;
        }

        // ── Step 1: RAG context ──────────────────────────────────────────────
        const ragStepId = addThinkingStep('Retrieving local memory (RAG)…');
        const contextItems = await BrowserAI.retrieveContext(contentToUse);
        setRagContextItems(contextItems);
        if (contextItems.length > 0) setShowRagPanel(true);
        resolveThinkingStep(ragStepId, 'done', `${contextItems.length} memory items found`);

        // ── Step 2: SEARCH-FIRST enforcement ────────────────────────────────
        // Any query that could involve current data MUST search before answering.
        const SEARCH_TRIGGERS = [
          'latest', 'current', 'today', '2025', '2026', 'news', 'price',
          'status', 'who is', 'what happened', 'topper', 'winner', 'result',
          'score', 'release', 'update', 'recent', '?',
        ];
        const needsSearch = SEARCH_TRIGGERS.some((k) => contentToUse.toLowerCase().includes(k));

        let webSearchContext = '';
        if (needsSearch) {
          const searchStepId = addThinkingStep('Searching the web for live data…', contentToUse);
          try {
            const searchResults = await window.electronAPI.webSearchRag(contentToUse);
            if (searchResults?.length) {
              webSearchContext = searchResults
                .map((s: string, i: number) => `[Web Result ${i + 1}]: ${s}`)
                .join('\n');
              resolveThinkingStep(searchStepId, 'done', `${searchResults.length} results retrieved`);
            } else {
              resolveThinkingStep(searchStepId, 'error', 'No search results returned');
            }
          } catch (e) {
            resolveThinkingStep(searchStepId, 'error', 'Search failed');
            console.error('Web Search RAG failed:', e);
          }
        }

        // ── Step 3: Page content (if relevant) ──────────────────────────────
        let pageContext = '';
        const readKeywords = ['this page', 'summarize', 'explain', 'analyze', 'read'];
        if (readKeywords.some((k) => contentToUse.toLowerCase().includes(k))) {
          let shouldRead = !askForAiPermission;
          if (askForAiPermission) {
            shouldRead = await requestActionPermission(
              'READ_PAGE_CONTENT',
              'Read Page Content',
              currentUrl,
              'Read the full text content of the currently open page',
              'The AI needs to read this page to answer your question accurately',
              'low',
            );
          }
          if (shouldRead) {
            setIsReadingPage(true);
            const pageStepId = addThinkingStep('Reading active page content…', currentUrl);
            const extraction = await window.electronAPI.extractPageContent();
            const rawContent = extraction.content || '';
            if (rawContent && isFailedPageContent(rawContent)) {
              resolveThinkingStep(pageStepId, 'error', '404/403 page detected — skipped');
              setMessages((prev) => [...prev, {
                role: 'model',
                content: '⚠️ **Source Warning:** The page returned a 404 or access error — content could not be read.',
              }]);
            } else {
              pageContext = scrubbedContent(rawContent).substring(0, 5000);
              if (rawContent.length > 5000) pageContext += '...';
              resolveThinkingStep(pageStepId, 'done', `${rawContent.length} chars read`);
            }
            setTimeout(() => setIsReadingPage(false), 2000);
          }
        }

        // ── Step 4: Build context ────────────────────────────────────────────
        const ragContextText = contextItems.map((c) => `[Relevance: ${c.score.toFixed(2)}] ${c.text}`).join('\n- ');
        const recentHistory = history.slice(-15).reverse().map((h) => `- [${h.title || 'Untitled'}](${h.url})`).join('\n');
        const currentTab = tabs.find((t) => t.id === activeTabId);

        // If no live data, inject strong hallucination-prevention note
        const sourceQualityNote = !webSearchContext && !pageContext
          ? '\n⚠️ CRITICAL: No live web data or page content available. Do NOT invent specific names, numbers, dates, or rankings. Explicitly state that you cannot verify this data and offer to search.'
          : '';

        const ragContext = `
[CURRENT CONTEXT]
Active Tab: ${currentTab?.title || 'Unknown'} (${currentUrl})

[ONLINE SEARCH RESULTS (LIVE)]
${webSearchContext || 'No search results. If this query needs current data, you MUST search before answering.'}

[RECENT BROWSING HISTORY]
${recentHistory || 'No recent history.'}

[LOCAL KNOWLEDGE BASE (RAG)]
${ragContextText || 'No relevant local memories.'}

[PAGE CONTENT SNIPPET]
${pageContext || 'Not loaded.'}
${sourceQualityNote}
`.trim();

        const langName = LANGUAGE_MAP[selectedLanguage] || selectedLanguage;
        const languageInstructions = selectedLanguage !== 'en'
          ? `\nIMPORTANT: Respond ONLY in ${langName}. Always translate your findings to ${langName}.`
          : '';

        const platform = window.electronAPI.getPlatform?.() ?? 'unknown';
        const safetyStatus = aiSafetyMode
          ? 'ENABLED (High-Risk commands require user approval)'
          : 'DISABLED (Autonomous Mode)';
        const platformInstructions = `\n[SYSTEM INFO]\nUser Platform: ${platform}.\nAI Safety Mode: ${safetyStatus}`;

        // ── Step 5: Generate AI response ─────────────────────────────────────
        const aiStepId = addThinkingStep('Generating AI response…');
        const messageHistory: ChatMessage[] = [
          { role: 'system', content: SYSTEM_INSTRUCTIONS + languageInstructions + platformInstructions },
          ...(additionalAIInstructions ? [{ role: 'system', content: additionalAIInstructions }] : []),
          ...messages.map((m) => ({ role: m.role, content: m.content })),
          { role: 'user', content: userMessage.content + (ragContext ? `\n\n${ragContext}` : '') },
        ];

        const startTime = Date.now();
        const response = await window.electronAPI.generateChatContent(messageHistory);
        const elapsed = Date.now() - startTime;
        resolveThinkingStep(aiStepId, response.error ? 'error' : 'done',
          response.error ? response.error : `Response in ${(elapsed / 1000).toFixed(1)}s`);

        if (aiProvider === 'groq') {
          const tokens = response.text ? response.text.length / 4 : 0;
          setGroqSpeed(`${(tokens / (elapsed / 1000)).toFixed(1)} tok/s`);
        } else {
          setGroqSpeed(null);
        }

        if (response.error) { setError(response.error); return; }
        if (!response.text) return;

        // Extract <think>...</think> block if present
        const thinkMatch = response.text.match(/<think>([\s\S]*?)<\/think>/i);
        if (thinkMatch) {
          setThinkingText(thinkMatch[1].trim());
        }
        const cleanResponseText = response.text.replace(/<think>[\s\S]*?<\/think>/gi, '').trim();

        // Record refusal intent if needed
        if (/i('m| am) (sorry|unable|not able)|can't help|won't assist/i.test(cleanResponseText)) {
          for (const { pattern, intent } of REFUSED_INTENT_PATTERNS) {
            if (pattern.test(contentToUse)) {
              recordRefusedIntent(contentToUse, intent);
              break;
            }
          }
        }

        window.electronAPI.addAiMemory({
          role: 'user',
          content: userMessage.content,
          url: currentUrl,
          response: cleanResponseText,
          provider: aiProvider,
        });

        const { commands, responseText } = prepareCommandsForExecution(cleanResponseText);

        if (commands.length > 0) {
          // ── FIX: OCR-wait — run commands FIRST, then let AI compose final reply ──
          const aiCommands: AICommand[] = commands.map((cmd, idx) => ({
            id: `cmd-${Date.now()}-${idx}-${Math.random().toString(36).substr(2, 9)}`,
            type: cmd.type,
            value: cmd.value,
            status: 'pending',
            timestamp: Date.now(),
          }));
          setCommandQueue(aiCommands);
          setCurrentCommandIndex(0);
          processingQueueRef.current = true;

          // Show the non-OCR text part before commands run (planning text)
          if (responseText.trim()) {
            setMessages((prev) => [...prev, {
              role: 'model',
              content: responseText,
              thinkingSteps: [...thinkingSteps],
            }]);
          }

          // Wait for all commands (including OCR) to finish before AI synthesises
          const ocrCommands = ['SCREENSHOT_AND_ANALYZE', 'OCR_SCREEN', 'OCR_COORDINATES', 'READ_PAGE_CONTENT', 'EXTRACT_DATA'];
          const hasOcr = aiCommands.some((c) => ocrCommands.includes(c.type));

          if (hasOcr) {
            const ocrStepId = addThinkingStep('Running OCR / page read — waiting before synthesis…');
            // Execute commands and await completion
            await processCommandQueue(aiCommands);
            resolveThinkingStep(ocrStepId, 'done', 'OCR complete — now generating final analysis');

            // Now do a second AI call with the OCR results already in memory context
            const ocrSynthStepId = addThinkingStep('Synthesising OCR results…');
            const ocrContext = await BrowserAI.retrieveContext(contentToUse + ' OCR screenshot page content');
            const ocrContextText = ocrContext.map((c) => `[OCR Result]: ${c.text}`).join('\n');

            const synthHistory: ChatMessage[] = [
              { role: 'system', content: SYSTEM_INSTRUCTIONS + languageInstructions + platformInstructions },
              ...messages.map((m) => ({ role: m.role, content: m.content })),
              { role: 'user', content: userMessage.content },
              {
                role: 'assistant' as any,
                content: responseText || 'I ran the OCR and page reads. Now synthesising the results.',
              },
              {
                role: 'user',
                content: `The OCR and page read commands have now completed. Here are the results:\n\n${ocrContextText}\n\nPlease now give your final analysis based on the ACTUAL data above. Do NOT use memory or placeholder text.`,
              },
            ];

            const synthResponse = await window.electronAPI.generateChatContent(synthHistory);
            resolveThinkingStep(ocrSynthStepId, synthResponse.error ? 'error' : 'done');

            if (synthResponse.text && !synthResponse.error) {
              const cleanSynth = synthResponse.text.replace(/<think>[\s\S]*?<\/think>/gi, '').trim();
              setMessages((prev) => [...prev, { role: 'model', content: cleanSynth }]);
            }
          } else {
            // No OCR — run normally
            processCommandQueue(aiCommands);
            if (!responseText.trim()) {
              // nothing was shown yet — show any text now
            }
          }
        } else {
          // Pure text response, no commands
          if (responseText.trim()) {
            setMessages((prev) => [...prev, { role: 'model', content: responseText }]);
          }
        }

        if (currentUrl.includes('youtube.com') && cleanResponseText.toLowerCase().includes('not available')) {
          const videoId = currentUrl.match(/[?&]v=([^&]+)/)?.[1] || 'video';
          const searchQuery = `${videoId} video alternative`;
          setMessages((prev) => [...prev, { role: 'model', content: `⚠️ YouTube content unavailable. Searching for alternatives...[SEARCH: ${searchQuery}]` }]);
          await delay(2000);
          const searchUrl = `https://www.google.com/search?q=${encodeURIComponent(searchQuery)}`;
          setCurrentUrl(searchUrl);
          await window.electronAPI.navigateBrowserView({ tabId: activeTabId, url: searchUrl });
        }

        if (cleanResponseText.includes('mermaid') || cleanResponseText.includes('[GENERATE_DIAGRAM:')) {
          setTimeout(() => {
            const mermaid = (window as any).mermaid;
            if (mermaid) {
              mermaid.run({ querySelector: '.mermaid', suppressErrors: false })
                .catch((err: any) => console.error('[Mermaid] Render error:', err));
            }
          }, 500);
        }
      } catch (err: any) {
        setError(`Response Error: ${err.message}`);
      } finally {
        setIsLoading(false);
        setIsThinking(false);
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [
      inputMessage, attachments, messages, thinkingSteps,
      aiProvider, currentUrl, activeTabId, tabs, history,
      hasSeenAiMistakeWarning, askForAiPermission, aiSafetyMode,
      additionalAIInstructions, selectedLanguage,
      checkDecomposedJailbreak, recordRefusedIntent,
      setShowAiMistakeWarning, setCurrentUrl,
      addThinkingStep, resolveThinkingStep,
    ],
  );

  // ---------------------------------------------------------------------------
  // Effects that depend on handleSendMessage
  // ---------------------------------------------------------------------------

  useEffect(() => {
    if (!window.electronAPI?.on) return;

    const cleanupText = window.electronAPI.on('ai-chat-input-text', (text: string) => {
      setInputMessage(text);
    });

    const cleanupRemote = window.electronAPI.onRemoteAiPrompt((data: any) => {
      if (data?.prompt) {
        setInputMessage(data.prompt);
        handleSendMessage(data.prompt);
      }
    });

    return () => {
      cleanupText?.();
      cleanupRemote?.();
    };
  }, [handleSendMessage]);

  useEffect(() => {
    if (!window.electronAPI) return;

    const cleanup = window.electronAPI.onTabLoaded(async ({ tabId, url }: { tabId: string; url: string }) => {
      if (tabId !== activeTabId || !url.includes('google.com/search?q=')) return;
      await delay(1500);
      const { success, results, error } = await window.electronAPI.extractSearchResults(tabId);
      if (success && results?.length) {
        const ctx = results.map((r: any, i: number) => `Result ${i + 1}: ${r.title} - ${r.url} - ${r.snippet}`).join('\n');
        await handleSendMessage(`Analyze these top search results:\n${ctx}`);
      } else if (error) {
        console.error('[AI] Failed to extract search results:', error);
        setError(`Failed to extract search results: ${error}`);
      }
    });

    return cleanup;
  }, [activeTabId, handleSendMessage]);

  // ---------------------------------------------------------------------------
  // Command queue processor
  // ---------------------------------------------------------------------------

  const processCommandQueue = useCallback(
    async (commands: AICommand[]) => {
      if (!processingQueueRef.current) return;

      const controller = new AbortController();
      abortControllerRef.current = controller;

      for (let i = 0; i < commands.length; i++) {
        if (controller.signal.aborted || !processingQueueRef.current) break;

        const cmd = commands[i];
        setCurrentCommandIndex(i);
        setCommandQueue((prev) => prev.map((c) => (c.id === cmd.id ? { ...c, status: 'executing' } : c)));

        try {
          let result = '';

          switch (cmd.type) {
            case 'NAVIGATE': {
              const url = cmd.value;
              setCurrentUrl(url);
              if (url.startsWith('comet://')) {
                const resourcePath = url.substring('comet://'.length);
                router.push(`/${resourcePath}`);
                setActiveView('browser');
                result = `Navigated to internal page: /${resourcePath}`;
              } else {
                setActiveView('browser');
                if (window.electronAPI) {
                  await window.electronAPI.navigateBrowserView({ tabId: activeTabId, url });
                }
                result = `Navigated to ${url}`;
              }
              await delay(1000);
              break;
            }

            case 'SEARCH':
            case 'WEB_SEARCH': {
              const searchUrl = `https://www.google.com/search?q=${encodeURIComponent(cmd.value)}`;
              setCurrentUrl(searchUrl);
              setActiveView('browser');
              if (window.electronAPI) {
                await window.electronAPI.navigateBrowserView({ tabId: activeTabId, url: searchUrl });
              }
              result = `Searched for: ${cmd.value}`;
              await delay(1000);
              break;
            }

            case 'SET_THEME':
              storeSetTheme(cmd.value.toLowerCase() as any);
              result = `Theme set to ${cmd.value}`;
              break;

            case 'OPEN_VIEW':
              setActiveView(cmd.value.toLowerCase());
              result = `Opened ${cmd.value} view`;
              break;

            case 'RELOAD':
              window.electronAPI?.reload();
              result = 'Reloaded page';
              await delay(500);
              break;

            case 'GO_BACK':
              window.electronAPI?.goBack();
              result = 'Navigated back';
              await delay(500);
              break;

            case 'GO_FORWARD':
              window.electronAPI?.goForward();
              result = 'Navigated forward';
              await delay(500);
              break;

            case 'READ_PAGE_CONTENT': {
              if (!window.electronAPI) throw new Error('API not available');
              const extraction = await window.electronAPI.extractPageContent();
              if (!extraction.content) throw new Error('Failed to read page content');

              if (isFailedPageContent(extraction.content)) {
                setMessages((prev) => [...prev, {
                  role: 'model',
                  content: '⚠️ **Source Warning:** Page returned an error (404/403). Content could not be read reliably.',
                }]);
                result = 'Page read failed — error page detected';
                break;
              }

              const clean = scrubbedContent(extraction.content);
              BrowserAI.addToVectorMemory(clean, { type: 'page_content', url: currentUrl });
              // Emit as collapsible OCR message (hidden by default)
              setMessages((prev) => [...prev, {
                role: 'model',
                content: clean,
                isOcr: true,
                ocrLabel: 'PAGE_CONTENT_READ',
              }]);
              result = 'Read page content';
              break;
            }

            case 'SCREENSHOT_AND_ANALYZE': {
              if (!window.electronAPI) throw new Error('API not available');
              const screenshot = await window.electronAPI.captureBrowserViewScreenshot();
              if (!screenshot || !tesseractWorkerRef.current) throw new Error('Failed to capture or analyze screenshot');
              const { data: { text: ocrText } } = await tesseractWorkerRef.current.recognize(screenshot);
              const cleanOcr = scrubbedContent(ocrText);
              BrowserAI.addToVectorMemory(cleanOcr, { type: 'screenshot_ocr', url: currentUrl });
              // Collapsible OCR message — hidden by default
              setMessages((prev) => [...prev, {
                role: 'model',
                content: cleanOcr,
                isOcr: true,
                ocrLabel: 'SCREENSHOT_ANALYSIS',
              }]);
              result = 'Analyzed screenshot';
              break;
            }

            case 'LIST_OPEN_TABS': {
              if (!window.electronAPI) break;
              const openTabs = await window.electronAPI.getOpenTabs();
              if (openTabs) {
                const tabsList = openTabs.map((t: any) => `- ${t.title} (${t.url})`).join('\n');
                setMessages((prev) => [...prev, { role: 'model', content: `\n\n[OPEN_TABS]:\n${tabsList}` }]);
                result = `Listed ${openTabs.length} tabs`;
              } else {
                result = 'No open tabs';
              }
              break;
            }

            case 'SET_VOLUME':
            case 'SET_BRIGHTNESS': {
              if (!window.electronAPI) throw new Error('API not available');
              const percentage = parseInt(cmd.value, 10);
              const isBrightness = cmd.type === 'SET_BRIGHTNESS';
              const label = isBrightness ? 'Brightness' : 'Volume';
              const platform = navigator.platform;
              let shellCmd = '';

              if (platform.includes('Win')) {
                shellCmd = isBrightness
                  ? `powershell -Command "(Get-WmiObject -Namespace root/WMI -Class WmiMonitorBrightnessMethods).WmiSetBrightness(1,${percentage})"`
                  : `nircmd.exe setsysvolume ${Math.round((percentage / 100) * 65535)}`;
              } else if (platform.includes('Mac')) {
                shellCmd = isBrightness ? `brightness ${percentage / 100}` : `osascript -e "set volume output volume ${percentage}"`;
              } else {
                shellCmd = isBrightness ? `brightnessctl set ${percentage}%` : `amixer set 'Master' ${percentage}%`;
              }

              if (!shellCmd) throw new Error('Platform not supported');
              await window.electronAPI.executeShellCommand(shellCmd);
              result = `Set ${label} to ${percentage}%`;
              break;
            }

            case 'SHELL_COMMAND': {
              if (!window.electronAPI) throw new Error('API not available');
              const output = await window.electronAPI.executeShellCommand(cmd.value);
              if (!output?.success) throw new Error(output?.error || 'Command failed');
              result = 'Command executed successfully';
              break;
            }

            case 'OPEN_APP': {
              if (!window.electronAPI) throw new Error('API not available');

              const appApproved = await requestActionPermission(
                'OPEN_APP',
                'Open External Application',
                cmd.value,
                `Launch "${cmd.value}" on your computer`,
                'The AI wants to open this application to complete your requested task',
                'medium',
              );
              if (!appApproved) { result = 'App launch cancelled by user'; break; }

              const res = await window.electronAPI.openExternalApp(cmd.value);
              if (!res.success) throw new Error(res.error || 'Failed to open app');
              result = `Opened ${cmd.value}`;
              break;
            }

            case 'CLICK_ELEMENT': {
              if (!window.electronAPI) throw new Error('API not available');

              // Always ask permission before clicking anything
              const clickApproved = await requestActionPermission(
                'CLICK_ELEMENT',
                'Click Element',
                cmd.value,
                `Click the element matching "${cmd.value}"`,
                'The AI wants to interact with this element to complete your requested task',
                'low',
              );
              if (!clickApproved) { result = 'Click cancelled by user'; break; }

              const clickScript = `
                (function() {
                  const sel = ${JSON.stringify(cmd.value)};
                  // Try CSS selector first
                  let el = null;
                  try { el = document.querySelector(sel); } catch(e) {}
                  // Fallback: search by visible text
                  if (!el) {
                    const all = document.querySelectorAll('a,button,input,label,[role="button"],[role="link"],[tabindex]');
                    for (const node of all) {
                      if ((node.textContent || '').trim().toLowerCase().includes(sel.toLowerCase())) {
                        el = node; break;
                      }
                    }
                  }
                  if (!el) return { success: false, error: 'Element not found: ' + sel };
                  // Scroll into view and simulate real click sequence
                  el.scrollIntoView({ behavior: 'smooth', block: 'center' });
                  ['mouseover','mouseenter','mousedown','mouseup','click'].forEach(type => {
                    el.dispatchEvent(new MouseEvent(type, { bubbles: true, cancelable: true, view: window }));
                  });
                  if (typeof el.click === 'function') el.click();
                  return { success: true, tag: el.tagName, text: (el.textContent || '').trim().substring(0, 80) };
                })()
              `;
              const clickRes = await window.electronAPI.executeJavaScript(clickScript);
              if (!clickRes?.success) throw new Error(clickRes?.error || `Could not find element: ${cmd.value}`);
              result = `Clicked element: ${clickRes.tag} "${clickRes.text}"`;
              await delay(500);
              break;
            }

            case 'FILL_FORM': {
              if (!window.electronAPI) throw new Error('API not available');
              const pipeFill = cmd.value.indexOf('|');
              const fillSelector = pipeFill > -1 ? cmd.value.slice(0, pipeFill).trim() : cmd.value.trim();
              const fillValue = pipeFill > -1 ? cmd.value.slice(pipeFill + 1).trim() : '';

              // Ask permission before filling any field
              const fillApproved = await requestActionPermission(
                'FILL_FORM',
                'Fill Input Field',
                fillSelector,
                `Type "${fillValue.substring(0, 60)}${fillValue.length > 60 ? '…' : ''}" into "${fillSelector}"`,
                'The AI wants to fill this field to complete your requested task',
                'low',
              );
              if (!fillApproved) { result = 'Form fill cancelled by user'; break; }

              // Robust fill: handles plain inputs, React controlled, contenteditable
              const fillScript = `
                (function() {
                  const sel = ${JSON.stringify(fillSelector)};
                  const val = ${JSON.stringify(fillValue)};
                  let el = null;
                  try { el = document.querySelector(sel); } catch(e) {}
                  if (!el) return { success: false, error: 'Element not found: ' + sel };

                  el.scrollIntoView({ behavior: 'smooth', block: 'center' });
                  el.focus();

                  // contenteditable (e.g. Gmail compose, rich editors)
                  if (el.isContentEditable) {
                    el.textContent = '';
                    document.execCommand('insertText', false, val);
                    el.dispatchEvent(new InputEvent('input', { bubbles: true, data: val }));
                    return { success: true, method: 'contenteditable' };
                  }

                  // React / Vue controlled input — use native setter to bypass synthetic event
                  const nativeInputValueSetter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value')?.set
                    || Object.getOwnPropertyDescriptor(window.HTMLTextAreaElement.prototype, 'value')?.set;

                  if (nativeInputValueSetter) {
                    nativeInputValueSetter.call(el, val);
                  } else {
                    el.value = val;
                  }

                  // Fire the full synthetic event suite React/Vue listen to
                  el.dispatchEvent(new Event('focus', { bubbles: true }));
                  el.dispatchEvent(new InputEvent('input', { bubbles: true, inputType: 'insertText', data: val }));
                  el.dispatchEvent(new Event('change', { bubbles: true }));
                  el.dispatchEvent(new KeyboardEvent('keydown', { bubbles: true, key: 'a' }));
                  el.dispatchEvent(new KeyboardEvent('keyup', { bubbles: true, key: 'a' }));
                  el.dispatchEvent(new Event('blur', { bubbles: true }));

                  return { success: true, method: 'native', finalValue: el.value };
                })()
              `;
              const fillRes = await window.electronAPI.executeJavaScript(fillScript);
              if (!fillRes?.success) throw new Error(fillRes?.error || `Could not fill ${fillSelector}`);
              result = `Filled "${fillSelector}" via ${fillRes.method}`;
              await delay(300);
              break;
            }

            case 'SCROLL_TO': {
              if (!window.electronAPI) throw new Error('API not available');
              const [target, offsetStr] = cmd.value.split('|').map((s) => s.trim());
              const offset = parseInt(offsetStr || '0', 10);
              const script = `
                (function() {
                  const target = ${JSON.stringify(target)};
                  const offset = ${offset};
                  if (target === 'top') {
                    window.scrollTo({ top: offset, behavior: 'smooth' });
                  } else if (target === 'bottom') {
                    window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' });
                  } else {
                    const el = document.querySelector(target);
                    if (el) {
                      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
                      if (offset !== 0) window.scrollBy(0, offset);
                    }
                  }
                })()
              `;
              await window.electronAPI.executeJavaScript(script);
              result = `Scrolled to ${target}`;
              break;
            }

            case 'EXTRACT_DATA': {
              if (!window.electronAPI) throw new Error('API not available');
              const script = `document.querySelector(${JSON.stringify(cmd.value)})?.innerText`;
              const text = await window.electronAPI.executeJavaScript(script);

              if (!text || text.trim().length === 0) {
                setMessages((prev) => [...prev, {
                  role: 'model',
                  content: `⚠️ **Extraction Failed:** No content found for selector \`${cmd.value}\`. The element may not exist on this page.`,
                }]);
                result = 'Extraction failed — element not found';
                break;
              }

              if (isFailedPageContent(text)) {
                setMessages((prev) => [...prev, {
                  role: 'model',
                  content: `⚠️ **Source Warning:** Extracted content appears to be a 404/error page. This data may be unreliable.`,
                }]);
              }

              const cleanText = scrubbedContent(text);
              BrowserAI.addToVectorMemory(cleanText, { type: 'extracted_data', url: currentUrl, selector: cmd.value });
              // Collapsible OCR message
              setMessages((prev) => [...prev, {
                role: 'model',
                content: cleanText,
                isOcr: true,
                ocrLabel: 'EXTRACTED',
              }]);
              result = 'Data extracted';
              break;
            }

            case 'CREATE_NEW_TAB_GROUP':
              result = `Created tab group: ${cmd.value.split('|')[0]}`;
              break;

            case 'OCR_COORDINATES':
            case 'OCR_SCREEN': {
              if (!window.electronAPI) throw new Error('API not available');
              const screenshot = await window.electronAPI.captureBrowserViewScreenshot();
              if (screenshot && tesseractWorkerRef.current) {
                const { data: { text } } = await tesseractWorkerRef.current.recognize(screenshot);
                const cleanOcr = scrubbedContent(text);
                setMessages((prev) => [...prev, {
                  role: 'model',
                  content: cleanOcr,
                  isOcr: true,
                  ocrLabel: 'OCR',
                }]);
                result = 'OCR completed';
              }
              break;
            }

            case 'FIND_AND_CLICK': {
              if (!window.electronAPI) throw new Error('API not available');

              const facApproved = await requestActionPermission(
                'FIND_AND_CLICK',
                'Find & Click by Text',
                cmd.value,
                `Find the element containing "${cmd.value}" on screen and click it`,
                'The AI wants to click this visible element to complete your requested task',
                'low',
              );
              if (!facApproved) { result = 'Find & click cancelled by user'; break; }

              // First try JavaScript click by text (works within browser view)
              const jsClickScript = `
                (function() {
                  const text = ${JSON.stringify(cmd.value)}.toLowerCase();
                  const candidates = document.querySelectorAll('a,button,input[type="submit"],input[type="button"],[role="button"],[role="link"],label,span,div[onclick]');
                  for (const el of candidates) {
                    if ((el.textContent || el.value || el.placeholder || '').toLowerCase().includes(text)) {
                      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
                      ['mouseover','mousedown','mouseup','click'].forEach(t =>
                        el.dispatchEvent(new MouseEvent(t, { bubbles: true, cancelable: true, view: window }))
                      );
                      if (typeof el.click === 'function') el.click();
                      return { success: true, tag: el.tagName, found: (el.textContent||'').trim().substring(0,60) };
                    }
                  }
                  return { success: false };
                })()
              `;
              const jsRes = await window.electronAPI.executeJavaScript(jsClickScript);

              if (jsRes?.success) {
                result = `Clicked "${jsRes.found}" (${jsRes.tag})`;
              } else {
                // Fallback: use native findAndClickText (OCR-based)
                if (!window.electronAPI.findAndClickText) throw new Error('findAndClickText API not available');
                const nativeRes = await window.electronAPI.findAndClickText(cmd.value);
                if (!nativeRes.success) throw new Error(nativeRes.error || 'Failed to find text on screen');
                result = `Clicked "${cmd.value}" via OCR`;
              }
              await delay(400);
              break;
            }

            case 'CLICK_AT': {
              // Clicks at absolute screen coordinates — used for OS apps
              if (!window.electronAPI) throw new Error('API not available');

              // Parse: "x,y | reason"
              const [coordsPart, clickAtReason = ''] = cmd.value.split('|').map((s) => s.trim());
              const [xStr, yStr] = coordsPart.split(',').map((s) => s.trim());
              const clickX = parseInt(xStr, 10);
              const clickY = parseInt(yStr, 10);
              if (isNaN(clickX) || isNaN(clickY)) throw new Error(`Invalid coordinates: ${coordsPart}`);

              const clickAtApproved = await requestActionPermission(
                'CLICK_AT',
                'Click at Screen Position',
                `Position (${clickX}, ${clickY})`,
                `Click at screen coordinates (${clickX}, ${clickY}) on the active window`,
                clickAtReason || 'The AI wants to click at this screen position to interact with an element',
                'medium',
              );
              if (!clickAtApproved) { result = 'Screen click cancelled by user'; break; }

              // Try Electron robotClick API first, fall back to clickAtCoordinates
              const robotApi = window.electronAPI as any;
              if (typeof robotApi.robotClick === 'function') {
                const rRes = await robotApi.robotClick(clickX, clickY);
                if (!rRes?.success) throw new Error(rRes?.error || 'robotClick failed');
              } else if (typeof robotApi.clickAtCoordinates === 'function') {
                const cRes = await robotApi.clickAtCoordinates(clickX, clickY);
                if (!cRes?.success) throw new Error(cRes?.error || 'clickAtCoordinates failed');
              } else {
                throw new Error('No screen-click API available (robotClick / clickAtCoordinates). Add it to Electron preload.');
              }
              result = `Clicked at (${clickX}, ${clickY})`;
              await delay(400);
              break;
            }

            case 'CLICK_APP_ELEMENT': {
              // Finds text in an OS app via OCR then clicks its position
              if (!window.electronAPI) throw new Error('API not available');

              const parts = cmd.value.split('|').map((s) => s.trim());
              const appName = parts[0] || '';
              const elementText = parts[1] || '';
              const clickAppReason = parts[2] || '';

              const clickAppApproved = await requestActionPermission(
                'CLICK_APP_ELEMENT',
                `Click in ${appName || 'App'}`,
                `"${elementText}" in ${appName}`,
                `Find the text "${elementText}" in the ${appName} window and click it using OCR`,
                clickAppReason || `The AI wants to click this element in ${appName} to complete your task`,
                'medium',
              );
              if (!clickAppApproved) { result = `App click in ${appName} cancelled by user`; break; }

              // Take a full screen screenshot and OCR it to find the text coordinates
              const api = window.electronAPI as any;
              let screenshotData: string | null = null;

              if (typeof api.captureFullScreenshot === 'function') {
                screenshotData = await api.captureFullScreenshot();
              } else if (typeof api.captureBrowserViewScreenshot === 'function') {
                screenshotData = await api.captureBrowserViewScreenshot();
              }

              if (!screenshotData || !tesseractWorkerRef.current) {
                throw new Error('Could not capture screen for OCR');
              }

              // Use Tesseract with word-level bounding boxes
              const { data: { words } } = await tesseractWorkerRef.current.recognize(screenshotData, {}, { text: false, blocks: false, hocr: false, tsv: false, box: false });
              const target = elementText.toLowerCase().trim();

              // Find best matching word cluster
              let foundBbox: { x0: number; y0: number; x1: number; y1: number } | null = null;
              if (words) {
                for (const word of words as any[]) {
                  if ((word.text || '').toLowerCase().trim().includes(target)) {
                    foundBbox = word.bbox;
                    break;
                  }
                }
              }

              if (!foundBbox) throw new Error(`Could not find "${elementText}" on screen via OCR`);

              const centerX = Math.round((foundBbox.x0 + foundBbox.x1) / 2);
              const centerY = Math.round((foundBbox.y0 + foundBbox.y1) / 2);

              if (typeof api.robotClick === 'function') {
                await api.robotClick(centerX, centerY);
              } else if (typeof api.clickAtCoordinates === 'function') {
                await api.clickAtCoordinates(centerX, centerY);
              } else {
                throw new Error('No screen-click API available. Add robotClick or clickAtCoordinates to Electron preload.');
              }

              result = `Clicked "${elementText}" in ${appName} at (${centerX}, ${centerY})`;
              await delay(500);
              break;
            }


              if (!window.electronAPI) throw new Error('API not available');
              const res = await window.electronAPI.gmailAuthorize();
              if (!res.success) throw new Error(res.error);
              result = 'Gmail authorized';
              break;
            }

            case 'GMAIL_LIST_MESSAGES': {
              if (!window.electronAPI) throw new Error('API not available');
              const [q, max] = cmd.value.split('|');
              const res = await window.electronAPI.gmailListMessages(q, parseInt(max) || 10);
              if (!res.success) throw new Error(res.error);
              const list = (res.messages || []).map((m: any) => m.id).join('\n');
              setMessages((prev) => [...prev, { role: 'model', content: `\n\n[EMAILS]:\n${list}` }]);
              result = `Listed ${(res.messages || []).length} emails`;
              break;
            }

            case 'GUIDE_CLICK':
              result = 'Guidance provided';
              await delay(3000);
              break;

            case 'WAIT':
              await delay(parseInt(cmd.value, 10));
              result = `Waited ${cmd.value}ms`;
              break;

            case 'GENERATE_PDF': {
              if (!window.electronAPI) throw new Error('API not available');

              // Split on first | only — content may itself contain |
              const pipeIdx = cmd.value.indexOf('|');
              const pdfTitle = pipeIdx > -1 ? cmd.value.slice(0, pipeIdx).trim() : 'Document';
              const rawPdfContent = pipeIdx > -1 ? cmd.value.slice(pipeIdx + 1).trim() : cmd.value.trim();

              // Ensure icon is loaded before building the PDF (gives ~50 ms grace)
              await preloadCometIcon();

              // Build clean, branded HTML — strips command tags, fixes HTML-on-one-line,
              // converts markdown and adds Comet AI footer with icon
              const cleanHTML = buildCleanPDFContent(rawPdfContent, pdfTitle);

              const res = await window.electronAPI.generatePDF(pdfTitle, cleanHTML);
              if (!res.success) throw new Error(res.error || 'Failed to generate PDF');
              setMessages((prev) => [...prev, {
                role: 'model',
                content: `✅ **PDF Created:** "${pdfTitle}" has been saved to your Downloads folder.`,
              }]);
              result = `Generated PDF: ${pdfTitle}`;
              break;
            }

            case 'OPEN_PRESENTON':
              setActiveView('presenton');
              lsSet('presenton_auto_prompt', cmd.value);
              window.dispatchEvent(new CustomEvent('comet-launch-presenton', { detail: { prompt: cmd.value } }));
              result = `Launching Presenton with prompt: ${cmd.value}`;
              break;

            case 'EXPLAIN_CAPABILITIES': {
              const addMsg = (content: string) => setMessages((prev) => [...prev, { role: 'model', content }]);
              const plat = navigator.platform;
              const isWin = plat.includes('Win');
              const isMac = plat.includes('Mac');

              addMsg('🚀 **Hello! I\'m the Comet AI Agent.**\n\nI\'m not just a chatbot — I have *agency*. I can control your browser, automate your desktop, read your screen, and generate real files. Let me show you what I can do...');
              await delay(3500);

              // ── 1. Browsing ─────────────────────────────────────────────────
              addMsg('🌐 **Capability 1 — Autonomous Browsing**\n\nI can navigate, search, read any page, and extract structured data from websites — all on your behalf.');
              await delay(3000);

              if (window.electronAPI) {
                addMsg('↗️ Navigating to example.com to demonstrate page reading...');
                await delay(1200);
                try {
                  await window.electronAPI.navigateBrowserView({ tabId: activeTabId, url: 'https://example.com' });
                  await delay(2500);
                  const extraction = await window.electronAPI.extractPageContent();
                  if (extraction?.content) {
                    addMsg(`✅ **Page read complete.** I can see: *"${extraction.content.substring(0, 120).trim()}..."*\n\nI automatically scrub personal data (emails, tokens, usernames) before processing anything.`);
                  }
                } catch (e) { addMsg('⚠️ Browse demo skipped (no active tab).'); }
              }
              await delay(3500);

              // ── 2. Real-time search ─────────────────────────────────────────
              addMsg('🔍 **Capability 2 — Real-Time Search (Search-First)**\n\nI never answer factual questions from memory alone. I always search the web first, then synthesise verified results — no hallucinations.');
              await delay(3200);

              // ── 3. OCR & Vision ─────────────────────────────────────────────
              addMsg('👁️ **Capability 3 — Screen Vision & OCR**\n\nI can take a screenshot of any page, run OCR, and read text that isn\'t even in the HTML — like images, PDFs, canvas elements, and other apps.');
              await delay(3000);

              if (window.electronAPI && tesseractWorkerRef.current) {
                try {
                  const screenshot = await window.electronAPI.captureBrowserViewScreenshot();
                  if (screenshot) {
                    addMsg('📷 Capturing current screen...');
                    await delay(800);
                    const { data: { text: ocrText } } = await tesseractWorkerRef.current.recognize(screenshot);
                    if (ocrText?.trim().length > 10) {
                      setMessages((prev) => [...prev, {
                        role: 'model',
                        content: ocrText,
                        isOcr: true,
                        ocrLabel: 'SCREENSHOT_OCR_DEMO',
                      } as any]);
                      addMsg('✅ OCR complete — raw text is collapsed above (click to expand). I can analyse this to find buttons, forms, prices, or anything visible on screen.');
                    }
                  }
                } catch (e) { addMsg('⚠️ OCR demo skipped.'); }
              }
              await delay(3500);

              // ── 4. Click & Fill ─────────────────────────────────────────────
              addMsg('🖱️ **Capability 4 — Click Elements & Fill Forms**\n\nI can interact with websites by clicking buttons and filling input fields — including React/Vue apps that use controlled inputs. I always ask your permission before clicking anything.');
              await delay(3200);

              addMsg('✅ Before every click or form fill, you\'ll see a permission popup telling you:\n- **What** I want to click/fill\n- **Why** I want to do it\n- **The risk level** of the action\n\nYou can approve or deny each action individually.');
              await delay(3500);

              // ── 5. Volume control ───────────────────────────────────────────
              addMsg('🔊 **Capability 5 — System Volume Control**\n\nI can adjust your system volume directly. For example: `"Set volume to 60%"` or `"Mute audio"`.');
              await delay(3000);

              if (window.electronAPI) {
                try {
                  addMsg('🔊 Setting system volume to 70% as a demo...');
                  await delay(1000);
                  let volCmd = '';
                  if (isWin) volCmd = `nircmd.exe setsysvolume ${Math.round(0.70 * 65535)}`;
                  else if (isMac) volCmd = `osascript -e "set volume output volume 70"`;
                  else volCmd = `amixer set 'Master' 70%`;
                  const volRes = await window.electronAPI.executeShellCommand(volCmd);
                  if (volRes?.success) addMsg('✅ **Volume set to 70%.** You can ask me to adjust it anytime — "set volume to 30%", "max volume", "mute", etc.');
                  else addMsg('⚠️ Volume command ran (result depends on your OS audio drivers).');
                } catch (e) { addMsg('⚠️ Volume demo skipped on this platform.'); }
              }
              await delay(3500);

              // ── 6. Brightness control ───────────────────────────────────────
              addMsg('☀️ **Capability 6 — Screen Brightness Control**\n\nI can also control your display brightness: `"Set brightness to 80%"` or `"Dim the screen"`.');
              await delay(3000);

              if (window.electronAPI) {
                try {
                  addMsg('☀️ Setting brightness to 80% as a demo...');
                  await delay(1000);
                  let brightCmd = '';
                  if (isWin) brightCmd = `powershell -Command "(Get-WmiObject -Namespace root/WMI -Class WmiMonitorBrightnessMethods).WmiSetBrightness(1,80)"`;
                  else if (isMac) brightCmd = `brightness 0.80`;
                  else brightCmd = `brightnessctl set 80%`;
                  const brightRes = await window.electronAPI.executeShellCommand(brightCmd);
                  if (brightRes?.success) addMsg('✅ **Brightness set to 80%.** Works on Windows (WMI), macOS (brightness CLI) and Linux (brightnessctl).');
                  else addMsg('⚠️ Brightness command ran (may need driver support on your system).');
                } catch (e) { addMsg('⚠️ Brightness demo skipped on this platform.'); }
              }
              await delay(3500);

              // ── 7. PDF generation ───────────────────────────────────────────
              addMsg('📄 **Capability 7 — Document Generation**\n\nI can create beautifully formatted PDFs with your logo, proper headings, tables, and code blocks — from any content.');
              await delay(2500);

              if (window.electronAPI) {
                try {
                  const capDemoTitle = 'Comet_Capabilities_Demo';
                  const capDemoRaw = `# Comet AI Capabilities\n\n## What I Can Do\n\n- **Autonomous Browsing** — Navigate, search and read any page\n- **Real-Time Search** — Always verifies data before answering\n- **OCR & Vision** — Read screenshots, images, and canvas elements\n- **Click & Fill** — Interact with buttons and forms (with your permission)\n- **Volume Control** — Adjust system audio levels\n- **Brightness Control** — Control display brightness\n- **Desktop Automation** — Open apps, run shell commands\n- **PDF Generation** — Create formatted documents like this one\n- **Local Memory** — Remember context across sessions\n- **AI Thinking Panel** — See my reasoning steps in real time\n\n## Security Built-In\n\n- Step-decomposition jailbreak protection\n- PII scrubbing on all scraped content\n- Permission popup before every click/fill action\n- 404/empty source detection prevents hallucination`;
                  await preloadCometIcon();
                  const capDemoHTML = buildCleanPDFContent(capDemoRaw, capDemoTitle);
                  const pdfRes = await window.electronAPI.generatePDF(capDemoTitle, capDemoHTML);
                  if (pdfRes.success) addMsg('✅ **PDF Created:** "Comet_Capabilities_Demo.pdf" saved to your Downloads — with the Comet AI logo and branding in the footer.');
                } catch (e) { console.error('PDF in capabilities demo failed:', e); }
              }
              await delay(3500);

              // ── 8. OS Automation ────────────────────────────────────────────
              addMsg('⚙️ **Capability 8 — Desktop Automation**\n\nI can open any application on your computer, run shell commands, manage files, and automate OS-level tasks.');
              await delay(2500);
              addMsg('🧠 **Capability 9 — Local Intelligence & Memory**\n\nI store your browsing context in a local vector database. Even offline, I can recall websites you\'ve visited, topics you\'ve researched, and preferences you\'ve set.');
              await delay(3000);
              addMsg('💡 **Capability 10 — AI Thinking Transparency**\n\nYou can watch my reasoning process in real time via the **AI Thinking panel** that appears above messages while I\'m working. You\'ll see every step: memory retrieval, web search, OCR, and synthesis.');
              await delay(3000);

              addMsg('---\n\n🎯 **That\'s Comet AI.** I don\'t just answer questions — I *act*.\n\nTry asking me:\n- `"Search for the latest AI news and summarise it"`\n- `"Set my volume to 50%"`\n- `"Take a screenshot and tell me what\'s on screen"`\n- `"Create a PDF report about [any topic]"`\n- `"Open Spotify"`');
              result = 'Capabilities demonstrated';
              break;
            }

            default:
              result = 'Command executed';
          }

          setCommandQueue((prev) => prev.map((c) => (c.id === cmd.id ? { ...c, status: 'completed', output: result } : c)));
        } catch (err: any) {
          console.error(`Command failed: ${cmd.type}`, err);
          setCommandQueue((prev) => prev.map((c) => (c.id === cmd.id ? { ...c, status: 'failed', error: err.message } : c)));
        }
      }

      setTimeout(() => {
        setCommandQueue([]);
        processingQueueRef.current = false;
        abortControllerRef.current = null;
      }, 5000);
    },
    [router, activeTabId, currentUrl, setCurrentUrl, setActiveView, storeSetTheme, requestActionPermission, tesseractWorkerRef],
  );

  const cancelActions = useCallback(() => {
    abortControllerRef.current?.abort();
    setCommandQueue([]);
    processingQueueRef.current = false;
    abortControllerRef.current = null;
  }, []);

  // ---------------------------------------------------------------------------
  // File helpers
  // ---------------------------------------------------------------------------

  const fileToBase64 = (file: File): Promise<string> =>
    new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });

  const performOCR = useCallback(async (base64Image: string): Promise<string> => {
    try {
      if (!tesseractWorkerRef.current) return '';
      const { data: { text } } = await tesseractWorkerRef.current.recognize(base64Image);
      return text;
    } catch (err) {
      console.error('[OCR] Error:', err);
      return '';
    }
  }, []);

  const extractPDFText = useCallback(async (base64PDF: string): Promise<string> => {
    try {
      const pdfjsLib = await import('pdfjs-dist');
      const pdfData = atob(base64PDF.split(',')[1]);
      const pdf = await pdfjsLib.getDocument({ data: pdfData }).promise;
      let fullText = '';
      for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i);
        const content = await page.getTextContent();
        fullText += content.items.map((item: any) => item.str).join(' ') + '\n';
      }
      return fullText;
    } catch (err) {
      console.error('[PDF] Error:', err);
      return '';
    }
  }, []);

  const handleFileUpload = useCallback(
    async (filesOrEvent: React.ChangeEvent<HTMLInputElement> | File[]) => {
      const files: File[] = Array.isArray(filesOrEvent)
        ? filesOrEvent
        : Array.from((filesOrEvent.target as HTMLInputElement).files || []);

      for (const file of files) {
        try {
          const base64 = await fileToBase64(file);
          if (file.type.startsWith('image/')) {
            const ocrText = await performOCR(base64);
            setAttachments((prev) => [...prev, { type: 'image', data: base64, ocrText, filename: file.name }]);
          } else if (file.type === 'application/pdf') {
            const ocrText = await extractPDFText(base64);
            setAttachments((prev) => [...prev, { type: 'pdf', data: base64, ocrText, filename: file.name }]);
          }
        } catch (err) {
          console.error('[File Upload] Error:', err);
          setError(`Failed to process ${file.name}`);
        }
      }
    },
    [performOCR, extractPDFText],
  );

  const handleDrop = useCallback(
    async (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragOver(false);
      if (e.dataTransfer.files?.length) {
        await handleFileUpload(Array.from(e.dataTransfer.files));
      }
      e.dataTransfer.clearData();
    },
    [handleFileUpload],
  );

  const removeAttachment = useCallback((index: number) => {
    setAttachments((prev) => prev.filter((_, i) => i !== index));
  }, []);

  // ---------------------------------------------------------------------------
  // Conversation management
  // ---------------------------------------------------------------------------

  const getAllConversations = useCallback((): Conversation[] => {
    return lsGet<Conversation[]>('conversations_list', []);
  }, []);

  const saveCurrentConversation = useCallback(() => {
    if (messages.length === 0) return;
    const convId = activeConversationId || `conv_${Date.now()}`;
    const existing = conversations.find((c) => c.id === convId);
    const conversation: Conversation = {
      id: convId,
      title: messages[0]?.content.slice(0, 50) || 'New Chat',
      messages,
      createdAt: existing?.createdAt || Date.now(),
      updatedAt: Date.now(),
    };
    lsSet(`conversation_${convId}`, conversation);
    const allConvs = getAllConversations();
    const idx = allConvs.findIndex((c) => c.id === convId);
    if (idx >= 0) allConvs[idx] = conversation;
    else allConvs.unshift(conversation);
    lsSet('conversations_list', allConvs);
    setConversations(allConvs);
    if (!activeConversationId) setActiveConversationId(convId);
  }, [messages, activeConversationId, conversations, getAllConversations]);

  const loadConversation = useCallback((id: string) => {
    const saved = lsGet<Conversation | null>(`conversation_${id}`, null);
    if (saved) {
      setMessages(saved.messages);
      setActiveConversationId(id);
      setShowConversationHistory(false);
    }
  }, []);

  const deleteConversation = useCallback((id: string) => {
    lsRemove(`conversation_${id}`);
    const updated = getAllConversations().filter((c) => c.id !== id);
    lsSet('conversations_list', updated);
    setConversations(updated);
    if (activeConversationId === id) {
      setMessages([]);
      setActiveConversationId(null);
    }
  }, [activeConversationId, getAllConversations]);

  const createNewConversation = useCallback(() => {
    setMessages([]);
    setActiveConversationId(null);
    setShowConversationHistory(false);
  }, []);

  // ---------------------------------------------------------------------------
  // Message actions
  // ---------------------------------------------------------------------------

  const handleCopyMessage = useCallback((content: string, index: number) => {
    navigator.clipboard.writeText(content);
    setCopiedMessageIndex(index);
    setTimeout(() => setCopiedMessageIndex(null), 2000);
  }, []);

  const handleShareMessage = useCallback(async (content: string) => {
    if (navigator.share) {
      try {
        await navigator.share({ title: 'Comet AI Response', text: content });
      } catch {
        // User cancelled
      }
    } else {
      navigator.clipboard.writeText(content);
    }
  }, []);

  const handleSendWithAttachments = useCallback(async () => {
    let messageContent = inputMessage;
    if (attachments.length > 0) {
      messageContent += '\n\n**Attached Files:**\n';
      attachments.forEach((att) => {
        messageContent += `\n**${att.filename}** (${att.type}):\n${att.ocrText || 'No text extracted'}\n`;
      });
    }
    setInputMessage('');
    setAttachments([]);
    await handleSendMessage(messageContent);
  }, [inputMessage, attachments, handleSendMessage]);

  // ---------------------------------------------------------------------------
  // Export helpers
  // ---------------------------------------------------------------------------

  const handleExportTxt = useCallback(async () => {
    if (!messages.length) return;
    const success = await window.electronAPI?.exportChatAsTxt(messages);
    if (success) alert('Exported as TXT');
  }, [messages]);

  const handleExportPdf = useCallback(async () => {
    if (!messages.length) return;
    const success = await window.electronAPI?.exportChatAsPdf(messages);
    if (success) alert('Exported as PDF');
  }, [messages]);

  const handleExportDiagram = useCallback(
    async (mermaidCode: string, resolution = 1080) => {
      try {
        const mermaid = (window as any).mermaid;
        if (!isMermaidLoaded || !mermaid) { setError('Mermaid.js is not loaded.'); return; }
        const { svg } = await mermaid.render('diagram-export-id', mermaidCode);
        const wrapper = document.createElement('div');
        wrapper.innerHTML = svg;
        document.body.appendChild(wrapper);
        const svgEl = wrapper.querySelector('svg');
        const svgWidth = svgEl?.clientWidth || 800;
        const svgHeight = svgEl?.clientHeight || 600;
        document.body.removeChild(wrapper);

        const scale = resolution / svgHeight;
        const canvas = document.createElement('canvas');
        canvas.width = svgWidth * scale;
        canvas.height = resolution;
        const ctx = canvas.getContext('2d');
        if (!ctx) { setError('Failed to get canvas context.'); return; }

        const blob = new Blob([svg], { type: 'image/svg+xml;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const img = new Image();
        img.onload = () => {
          ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
          URL.revokeObjectURL(url);
          canvas.toBlob(async (pngBlob) => {
            if (!pngBlob || !window.electronAPI) { setError('Failed to export diagram.'); return; }
            const reader = new FileReader();
            reader.onloadend = async () => {
              const filename = `mermaid-diagram-${Date.now()}.png`;
              const success = await window.electronAPI.triggerDownload(reader.result as string, filename);
              if (success) alert(`Diagram exported as ${filename} at ${resolution}p.`);
              else setError('Failed to trigger diagram download.');
            };
            reader.readAsDataURL(pngBlob);
          }, 'image/png', 1);
        };
        img.onerror = () => setError('Failed to load SVG into image for canvas.');
        img.src = url;
      } catch (err: any) {
        setError(`Failed to export diagram: ${err.message}`);
      }
    },
    [isMermaidLoaded],
  );

  // ---------------------------------------------------------------------------
  // Collapsed state
  // ---------------------------------------------------------------------------

  if (props.isCollapsed) {
    return (
      <div className="flex flex-col items-center h-full py-4 space-y-6">
        <button
          onClick={props.toggleCollapse}
          className="w-10 h-10 flex items-center justify-center rounded-xl bg-white/5 hover:bg-white/10 text-white/40"
        >
          {props.side === 'right' ? <ChevronLeft size={18} /> : <ChevronRight size={18} />}
        </button>
      </div>
    );
  }

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  return (
    <div
      className={`flex flex-col h-full gap-4 p-4 bg-black/60 border-r border-transparent transition-all duration-500 z-[100]
        ${isFullScreen ? 'fixed inset-0 z-[9999] bg-[#020205] shadow-2xl overflow-hidden' : ''}
        ${isDragOver ? 'border-accent/50 bg-accent/5' : ''}
      `}
      style={{
        backdropFilter: isFullScreen ? 'none' : 'blur(20px)',
        WebkitBackdropFilter: isFullScreen ? 'none' : 'blur(20px)',
        transform: 'translateZ(0)',
        willChange: 'transform',
      }}
      onDragOver={(e) => { e.preventDefault(); setIsDragOver(true); }}
      onDragLeave={() => setIsDragOver(false)}
      onDrop={handleDrop}
    >
      <ConversationHistoryPanel
        show={showConversationHistory}
        conversations={conversations}
        activeId={activeConversationId}
        onClose={() => setShowConversationHistory(false)}
        onLoad={loadConversation}
        onDelete={deleteConversation}
        onNew={createNewConversation}
      />

      {/* ── Action Permission Popup ─────────────────────────────────────────── */}
      <AnimatePresence>
        {permissionPending && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 z-[9999] flex items-center justify-center p-4"
            style={{ backdropFilter: 'blur(8px)', background: 'rgba(0,0,0,0.7)' }}
          >
            <motion.div
              initial={{ scale: 0.88, y: 16 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.88, y: 16 }}
              transition={{ type: 'spring', stiffness: 400, damping: 28 }}
              className="w-full max-w-sm rounded-2xl border border-white/10 bg-[#0f1117] shadow-2xl overflow-hidden"
            >
              {/* Header */}
              <div className={`px-5 py-4 flex items-center gap-3 border-b border-white/5 ${
                permissionPending.context?.risk === 'high' ? 'bg-red-500/10' :
                permissionPending.context?.risk === 'medium' ? 'bg-amber-500/10' :
                'bg-sky-500/10'
              }`}>
                <div className={`w-9 h-9 rounded-xl flex items-center justify-center text-lg flex-shrink-0 ${
                  permissionPending.context?.risk === 'high' ? 'bg-red-500/20' :
                  permissionPending.context?.risk === 'medium' ? 'bg-amber-500/20' :
                  'bg-sky-500/20'
                }`}>
                  {permissionPending.context?.actionType === 'CLICK_ELEMENT' ? '🖱️' :
                   permissionPending.context?.actionType === 'FIND_AND_CLICK' ? '🔍' :
                   permissionPending.context?.actionType === 'FILL_FORM' ? '✏️' :
                   permissionPending.context?.actionType === 'OPEN_APP' ? '🚀' :
                   permissionPending.context?.actionType === 'READ_PAGE_CONTENT' ? '📖' : '⚡'}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-xs font-black uppercase tracking-widest text-white/40">
                    AI wants to perform an action
                  </div>
                  <div className="text-sm font-bold text-white truncate mt-0.5">
                    {permissionPending.context?.action}
                  </div>
                </div>
                <div className={`px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider flex-shrink-0 ${
                  permissionPending.context?.risk === 'high' ? 'bg-red-500/30 text-red-300' :
                  permissionPending.context?.risk === 'medium' ? 'bg-amber-500/30 text-amber-300' :
                  'bg-sky-500/20 text-sky-300'
                }`}>
                  {permissionPending.context?.risk ?? 'low'} risk
                </div>
              </div>

              {/* Details */}
              <div className="px-5 py-4 space-y-3">
                {/* What it wants to do */}
                <div>
                  <div className="text-[10px] font-bold uppercase tracking-widest text-white/30 mb-1">What</div>
                  <div className="text-sm text-white/80 leading-relaxed">
                    {permissionPending.context?.what}
                  </div>
                </div>

                {/* Why */}
                <div>
                  <div className="text-[10px] font-bold uppercase tracking-widest text-white/30 mb-1">Why</div>
                  <div className="text-sm text-white/60 leading-relaxed">
                    {permissionPending.context?.reason}
                  </div>
                </div>

                {/* Target */}
                {permissionPending.context?.target && (
                  <div>
                    <div className="text-[10px] font-bold uppercase tracking-widest text-white/30 mb-1">Target</div>
                    <div className="text-[11px] font-mono text-sky-300/80 bg-sky-500/5 border border-sky-500/10 rounded-lg px-3 py-2 break-all">
                      {permissionPending.context.target.length > 120
                        ? permissionPending.context.target.substring(0, 120) + '…'
                        : permissionPending.context.target}
                    </div>
                  </div>
                )}
              </div>

              {/* Actions */}
              <div className="px-5 pb-5 flex gap-3">
                <button
                  onClick={() => {
                    const p = permissionPending;
                    setPermissionPending(null);
                    p.resolve(false);
                  }}
                  className="flex-1 py-2.5 rounded-xl bg-white/5 border border-white/10 text-sm font-semibold text-white/60 hover:bg-white/10 hover:text-white/90 transition-all"
                >
                  Deny
                </button>
                <button
                  onClick={() => {
                    const p = permissionPending;
                    setPermissionPending(null);
                    p.resolve(true);
                  }}
                  className={`flex-1 py-2.5 rounded-xl text-sm font-bold transition-all ${
                    permissionPending.context?.risk === 'high'
                      ? 'bg-red-500/80 hover:bg-red-500 text-white'
                      : permissionPending.context?.risk === 'medium'
                      ? 'bg-amber-500/80 hover:bg-amber-500 text-white'
                      : 'bg-sky-500/80 hover:bg-sky-500 text-white'
                  }`}
                >
                  Allow
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {!isFullScreen && !props.isCollapsed && (
        <div
          className={`absolute top-0 ${props.side === 'right' ? 'left-0' : 'right-0'} w-1 h-full cursor-col-resize hover:bg-deep-space-accent-neon/50 transition-colors z-[110]`}
          onMouseDown={(e) => {
            e.preventDefault();
            const startX = e.clientX;
            const startWidth = sidebarWidth;
            const onMove = (ev: MouseEvent) => {
              const delta = props.side === 'right' ? startX - ev.clientX : ev.clientX - startX;
              const newWidth = Math.min(800, Math.max(300, startWidth + delta));
              setSidebarWidth(newWidth);
              window.dispatchEvent(new Event('resize'));
            };
            const onUp = () => {
              document.removeEventListener('mousemove', onMove);
              document.removeEventListener('mouseup', onUp);
            };
            document.addEventListener('mousemove', onMove);
            document.addEventListener('mouseup', onUp);
          }}
        />
      )}

      <style>{`
        .modern-scrollbar::-webkit-scrollbar { width: 6px; }
        .modern-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .modern-scrollbar::-webkit-scrollbar-thumb { background-color: rgba(255,255,255,0.1); border-radius: 6px; }
        .modern-scrollbar::-webkit-scrollbar-thumb:hover { background-color: rgba(255,255,255,0.2); }
      `}</style>

      {/* Header */}
      <header className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl flex items-center justify-center">
            <img src="icon.png" alt="Comet AI" className="w-full h-full object-contain" />
          </div>
          <h2 className="text-sm font-black uppercase tracking-[0.2em] text-white text-neon">Comet AI</h2>
          {isOnline ? <Wifi size={12} className="text-green-400" /> : <WifiOff size={12} className="text-orange-400" />}
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowLLMProviderSettings((v) => !v)}
            className="w-8 h-8 rounded-xl bg-white/5 hover:bg-white/10 flex items-center justify-center text-white/40 transition-all no-drag-region"
            title="LLM Provider Settings"
          >
            <MoreVertical size={18} />
          </button>
          <button onClick={() => setIsFullScreen((v) => !v)} className="p-2 text-secondary-text hover:text-primary-text transition-colors">
            {isFullScreen ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
          </button>
          <button onClick={props.toggleCollapse} className="p-2 text-secondary-text hover:text-primary-text transition-colors">
            <X size={16} />
          </button>
        </div>
      </header>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto modern-scrollbar space-y-4 relative pr-2">
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
                onClick={() => setShowRagPanel((v) => !v)}
              >
                <div className="flex items-center gap-2">
                  <Sparkles size={12} className="text-deep-space-accent-neon animate-pulse" />
                  <span className="text-[9px] font-black uppercase tracking-widest text-deep-space-accent-neon">
                    Neural Context Active ({ragContextItems.length})
                  </span>
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

        {/* Active thinking panel shown while AI is processing */}
        <AnimatePresence>
          {isThinking && thinkingSteps.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              className="px-1"
            >
              <ThinkingPanel steps={thinkingSteps} thinkText={thinkingText} />
            </motion.div>
          )}
        </AnimatePresence>

        {messages.map((msg, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'}`}
          >
            {/* Historical thinking panel attached to a message */}
            {msg.role === 'model' && msg.thinkingSteps && msg.thinkingSteps.length > 0 && (
              <div className="w-full mb-1">
                <ThinkingPanel steps={msg.thinkingSteps} />
              </div>
            )}

            {/* OCR / raw data — collapsible, hidden by default */}
            {(msg as ExtendedChatMessage).isOcr ? (
              <div className="w-full">
                <CollapsibleOCRMessage
                  label={(msg as ExtendedChatMessage).ocrLabel || 'RAW DATA'}
                  content={msg.content}
                />
              </div>
            ) : (
              <div
                className={`max-w-[85%] p-4 rounded-3xl text-sm leading-[1.6] relative group ${
                  msg.role === 'user'
                    ? 'bg-sky-500/10 text-white border border-sky-500/20 shadow-[0_0_20px_rgba(56,189,248,0.1)]'
                    : 'bg-white/[0.03] text-slate-200 border border-white/5'
                }`}
              >
                <ReactMarkdown
                  remarkPlugins={[remarkGfm, remarkMath]}
                  rehypePlugins={[rehypeKatex]}
                  components={{
                    code({ node, className, children, ...rest }) {
                      const match = /language-(\w+)/.exec(className || '');
                      const codeString = String(children).replace(/\n$/, '');

                      if (match?.[1] === 'mermaid' && isMermaidLoaded) {
                        return (
                          <div
                            className="relative group bg-black/40 p-4 rounded-xl my-4 text-center overflow-x-auto"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <div className="mermaid bg-white p-4 rounded-lg inline-block">{codeString}</div>
                            <button
                              onClick={(e) => { e.stopPropagation(); handleExportDiagram(codeString); }}
                              className="absolute top-2 right-2 p-1.5 rounded-full bg-black/60 text-white/70 hover:bg-black/90 hover:text-white transition-all opacity-0 group-hover:opacity-100"
                              title="Export Diagram"
                            >
                              <Download size={14} />
                            </button>
                          </div>
                        );
                      }

                      return node && match ? (
                        <SyntaxHighlighter style={dracula as any} language={match[1]} PreTag="div">
                          {codeString}
                        </SyntaxHighlighter>
                      ) : (
                        <code className={className} {...rest}>
                          {children}
                        </code>
                      );
                    },
                  }}
                >
                  {msg.content}
                </ReactMarkdown>

                {msg.role === 'model' && (
                  <MessageActions
                    content={msg.content}
                    index={i}
                    copiedIndex={copiedMessageIndex}
                    onCopy={handleCopyMessage}
                    onShare={handleShareMessage}
                  />
                )}
              </div>
            )}

            {msg.role === 'model' && i === messages.length - 1 && groqSpeed && (
              <div className="mt-1 ml-2 flex items-center gap-1 text-[9px] font-bold text-deep-space-accent-neon opacity-60">
                <Zap size={10} /> {groqSpeed}
              </div>
            )}
          </motion.div>
        ))}

        {isLoading && <ThinkingIndicator />}
        {error && (
          <div className="text-[10px] text-red-400 bg-red-400/10 p-2 rounded-lg border border-red-500/20">
            ⚠️ {error}
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      <LLMProviderSettings
        {...props}
        ollamaModels={ollamaModels}
        setOllamaModels={setOllamaModels}
        setError={setError}
        showSettings={showLLMProviderSettings}
        setShowSettings={setShowLLMProviderSettings}
      />

      {/* Footer */}
      <footer className="space-y-4 mt-auto">
        {attachments.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-2 p-2 bg-white/5 rounded-xl border border-white/10 max-h-32 overflow-y-auto modern-scrollbar">
            {attachments.map((att, idx) => (
              <div key={idx} className="flex items-center gap-2 px-3 py-1.5 bg-white/10 rounded-lg text-[10px] text-white/80 group">
                {att.type === 'image' ? <ImageIcon size={12} /> : <FileText size={12} />}
                <span className="max-w-[100px] truncate">{att.filename}</span>
                <button onClick={() => removeAttachment(idx)} className="hover:text-red-400 transition-colors">
                  <X size={10} />
                </button>
              </div>
            ))}
          </div>
        )}

        <textarea
          value={inputMessage}
          onChange={(e) => setInputMessage(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              handleSendWithAttachments();
            }
          }}
          placeholder="Neural prompt..."
          className="w-full neural-prompt rounded-2xl p-4 text-xs text-white focus:outline-none h-24 resize-none border border-white/5 focus:border-accent/30 transition-all"
        />

        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => fileInputRef.current?.click()}
              className="p-2.5 rounded-xl bg-white/5 text-white/40 hover:bg-white/10 hover:text-white transition-all shadow-lg border border-white/5"
              title="Attach Files"
            >
              <Paperclip size={16} />
            </button>

            <button
              onClick={() => setShowConversationHistory(true)}
              className="p-2.5 rounded-xl bg-white/5 text-white/40 hover:bg-white/10 hover:text-white transition-all shadow-lg border border-white/5"
              title="Conversation History"
            >
              <FolderOpen size={16} />
            </button>

            <div className="relative">
              <button
                onClick={() => setShowActionsMenu((v) => !v)}
                className="p-2.5 rounded-xl bg-white/5 text-white/40 hover:bg-white/10 hover:text-white transition-all shadow-lg border border-white/5"
                title="AI Command Center"
              >
                <MoreVertical size={14} />
              </button>

              {showActionsMenu && (
                <div className="absolute bottom-full mb-2 w-48 bg-black/80 backdrop-blur-md border border-white/10 rounded-lg shadow-lg z-50">
                  {[
                    {
                      icon: '📎',
                      label: 'Attach File',
                      action: () => { fileInputRef.current?.click(); setShowActionsMenu(false); },
                    },
                    {
                      icon: <CopyIcon size={14} />,
                      label: 'Copy Last Response',
                      action: () => {
                        const last = [...messages].reverse().find((m) => m.role === 'model');
                        if (last) navigator.clipboard.writeText(last.content);
                        setShowActionsMenu(false);
                      },
                    },
                    {
                      icon: <Share2 size={14} />,
                      label: 'Share Last Response',
                      action: () => {
                        const last = [...messages].reverse().find((m) => m.role === 'model');
                        if (last && navigator.share) navigator.share({ title: 'Comet AI Response', text: last.content });
                        setShowActionsMenu(false);
                      },
                    },
                    {
                      // FIX: Removed window.prompt() — now uses inline input via handleSendMessage
                      icon: <ScanLine size={14} />,
                      label: 'Find & Click Text (OCR)',
                      action: () => {
                        setShowActionsMenu(false);
                        setInputMessage('[FIND_AND_CLICK: ');
                      },
                    },
                    {
                      icon: <Download size={14} />,
                      label: 'Save Last Response',
                      action: () => {
                        const last = [...messages].reverse().find((m) => m.role === 'model');
                        if (last && window.electronAPI) window.electronAPI.saveAiResponse(last.content);
                        setShowActionsMenu(false);
                      },
                    },
                    null,
                    {
                      icon: <FileText size={14} />,
                      label: 'Export as Text',
                      action: () => { handleExportTxt(); setShowActionsMenu(false); },
                    },
                    {
                      icon: <FileText size={14} />,
                      label: 'Export as PDF',
                      action: () => { handleExportPdf(); setShowActionsMenu(false); },
                    },
                  ].map((item, idx) =>
                    item === null ? (
                      <div key={`div-${idx}`} className="h-[1px] bg-white/10 my-1" />
                    ) : (
                      <button
                        key={item.label}
                        onClick={item.action}
                        className="w-full flex items-center gap-2 px-4 py-2 text-xs text-left text-white/80 hover:bg-white/10"
                      >
                        {typeof item.icon === 'string' ? item.icon : item.icon}
                        <span>{item.label}</span>
                      </button>
                    ),
                  )}
                </div>
              )}
            </div>
          </div>

          <button
            type="button"
            onClick={async () => {
              if (inputMessage.trim() && window.electronAPI) {
                await window.electronAPI.wifiSyncBroadcast({ type: 'agent-task', task: inputMessage });
                setInputMessage('');
              }
            }}
            disabled={!inputMessage.trim() || isLoading}
            className="p-2.5 rounded-xl bg-accent/20 text-accent hover:bg-accent/30 transition-all border border-accent/30 disabled:opacity-40 disabled:cursor-not-allowed"
            title="Send Task to Mobile Agent"
          >
            <Zap size={16} className="animate-pulse" />
          </button>

          <input type="file" ref={fileInputRef} onChange={handleFileUpload} className="hidden" multiple />

          <button
            type="button"
            onClick={handleSendWithAttachments}
            disabled={(!inputMessage.trim() && attachments.length === 0) || isLoading}
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

      <AICommandQueue
        commands={commandQueue}
        currentCommandIndex={currentCommandIndex}
        onCancel={cancelActions}
      />
    </div>
  );
};

export default AIChatSidebar;
