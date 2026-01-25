# ☄️ Comet Browser (v0.1.3)
Made in India 🇮🇳
### The Intelligent Workspace for the Future

**Built by a solo high school developer (Latestinssan)**, running on extreme constraints (i3 4th Gen, 4GB RAM), yet designed to outperform modern browsers in productivity and intelligence.

**Comet** is not just a fork; it's a **custom-hardened Chromium environment** designed for:
1.  **Native AI Orchestration**: Seamlessly switch between Google Gemini 3, GPT-4o, Claude 3.5, Groq, and **Local Ollama (Deepseek R1)**.
2.  **RAG-Powered Memory**: Your browser remembers your context. It builds a local vector database of your sessions to provide "Perplexity-style" answers offline.
3.  **Hardware Isolation**: Every tab is sandboxed for maximum security and crash resistance.
4.  **Decentralized Sync**: Sync your data (tabs, clipboard, history) across devices using P2P direct connections or Firebase with end-to-end encryption.

---

## 🚀 Features (v0.1.3 Stable)

### 🧠 Intelligence & RAG
*   **Perplexity-Style Answers**: Ask complex questions to your sidebar. Comet scans your current page and retrieves relevant context from your history.
*   **Local Vector DB**: Automatically indexes your browsing for offline semantic search.
*   **Deepseek R1 Integration**: Optimized for the 1.5B model running locally via Ollama.
*   **OCR & Vision**: Automatic screenshot analysis and text extraction via Tesseract.js.

### ⚡ Performance & Core
*   **Chromium Rendering Engine**: We use the raw power of Chromium for 100% web compatibility, stripped of bloatware.
*   **Optimized for Low-End PCs**: Validated on 4GB RAM machines. Aggressive tab suspension technology.
*   **Google Navigation Fixed**: Resolved infinite loop issues with search engine redirects.

### 🛡️ Security & Sync
*   **Identity-Aware**: Login via `browser.ponsrischool.in` to verify your session.
*   **P2P File Drop**: Send files between Mobile and Desktop instantly.
*   **Admin Console**: (Enterprise) Manage user access and monitor sync status.

---

## 🚀 AI Integration & Usage in Comet Browser

Comet Browser deeply integrates AI into your browsing experience, acting as an intelligent co-pilot that understands your context and assists with various tasks. Our AI is designed to work seamlessly with native browser settings and web navigation, providing insights and capabilities directly where you need them.

### How Our AI Works

The **AI Analyst Sidebar** is your primary interface for interacting with Comet's intelligence. It leverages a powerful **LLM Orchestrator** capable of switching between multiple leading AI models (Google Gemini 3, GPT-4o, Claude 3.5, Groq, and local Ollama). This orchestrator works in conjunction with:

1.  **RAG-Powered Memory:** Your browsing history and active page content are continuously indexed into a local vector database. This local vector database serves as the foundation for our Retrieval-Augmented Generation (RAG) system. When you interact with the AI, it first retrieves relevant contextual information from your personal browsing data (both current page and historical sessions) stored in this database. This retrieved context is then provided to the chosen Large Language Model (local or cloud-based) alongside your query, enabling the AI to generate "Perplexity-style" answers that are highly tailored, relevant, and grounded in your own information landscape, even when offline.
2.  **Web Navigation Context:** The AI is acutely aware of your current tab's URL, title, and content. This allows it to perform context-aware actions like summarizing lengthy articles, extracting specific data points, generating related search queries, or even directly navigating to suggested links based on your conversation. You can prompt the AI with "Summarize this page," "Find alternatives to this product," or "Navigate to the official documentation for this library."
3.  **Native Browser Settings:** The AI can be configured and controlled directly through your browser's settings. This includes selecting your preferred LLM provider (e.g., Gemini, GPT-4o, Claude), managing API keys securely, and customizing AI behavior such as response verbosity or default actions. For instance, you can instruct the AI to "Change my theme to dark mode" or "Open settings to configure my LLM provider."

### Specialized AI Capabilities for Diverse Content

Comet's AI is designed to interact intelligently with various forms of content encountered during your browsing:

*   **Code & Markdown:**
    *   **Usage:** Paste code snippets or Markdown text into the AI chat, or ask the AI to analyze code on a webpage. The AI can explain code, suggest improvements, generate new code, or convert between different programming languages or Markdown formats.
    *   **Integration:** AI responses for code and Markdown are rendered with syntax highlighting (via `react-markdown` and syntax highlighters) directly in the chat sidebar for easy readability.
*   **Math & Chemistry:**
    *   **Usage:** Input mathematical equations (e.g., LaTeX syntax) or chemical formulas into the AI chat. Ask the AI to solve equations, explain concepts, or describe chemical properties.
    *   **Integration:** AI responses containing mathematical or chemical notations can be rendered using specialized libraries (e.g., `MathJax` for math, `ChemDoodle`/`JSME` for chemistry) directly within the chat interface, providing visual and interactive feedback.
*   **Fonts & Design:**
    *   **Usage:** For fonts, you can ask the AI to identify fonts from images (leveraging Comet's OCR & Vision capabilities), suggest font pairings, or describe design principles related to typography.
    *   **Integration:** The AI leverages existing browser capabilities like screenshot analysis and text extraction (Tesseract.js) to understand visual context related to fonts and can provide recommendations or analysis in text-based chat responses.

By centralizing these capabilities within the AI Analyst Sidebar, Comet aims to provide a unified and intelligent browsing experience, adapting its assistance based on the content you're engaging with.

Most guides tell you to use WSL (Windows Subsystem for Linux) for local AI. We didn't do that. Comet Browser runs **Ollama natively on Windows** by treating it as a background service controlled via standard `child_process` commands.

**How we achieved this engineering feat:**
1.  **Native Binary Spawning**: We spawn the `ollama.exe` CLI directly from the Electron main process, bypassing the need for Docker or Linux wrappers.
2.  **Modelfile Injection**: To import your local `.GGUF` files, Comet programmatically generates a temporary `Modelfile` instructing Ollama to read from your Windows path, creates the model, and cleans up instantly.
3.  **Stream Capture**: We pipe the standard output (`stdout`) from the command line directly to the React UI, giving you a real-time terminal experience for model downloads and imports.

This allows every Windows user to run local AI without complicated setups.

### 📥 Prerequisites (Ollama Setup)
To use the local AI features, you simply need the official Windows installer. **No Docker or WSL needed.**

1.  Download **Ollama for Windows** from [ollama.com/download/windows](https://ollama.com/download/windows).
2.  Install it normally (`OllamaSetup.exe`).
3.  That's it! Comet will automatically detect the `ollama` command in your system PATH.

---

## 🛠️ The Story Behind Comet
Building a browser is considered "impossible" for a solo dev. Doing it on a laggy i3 laptop while studying for high school exams? **Insanity.**

**Comet was born out of frustration.** Modern browsers are RAM hogs that spy on you. I wanted a workspace that:
1.  Loads instantly.
2.  Understands what I'm reading.
3.  Works offline.

Despite constant crashes, build failures (Electron is heavy!), and school pressure, **v0.1.3** is here. It stands as a testament to what "Agentic Coding" and sheer willpower can achieve.

---

## 📦 Installation
```bash
# Clone the repository
git clone https://github.com/Latestinssan/comet-browser.git

# Install dependencies
npm install

# Run (Dev Mode)
npm run dev

# Build for Windows
npm run build-electron
```

---

## 📄 Licensing

Comet Browser is built with open-source technologies. For a comprehensive list of all third-party libraries used and their respective licenses, please refer to the [Licence.md](Licence.md) file.

---
*Dedicated to the builders who code on potato PCs.* ❤️