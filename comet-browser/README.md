# ☄️ Comet AI Browser (v0.1.6 Stable)

<div align="center">

![Comet AI Browser](https://raw.githubusercontent.com/Preet3627/Browser-AI/refs/heads/main/comet-browser/icon.ico)

**The World's Most Advanced Privacy-First AI Browser**

[![License: MIT](https://img.shields.io/badge/License-MIT-cyan.svg)](LICENSE)
[![Platform](https://img.shields.io/badge/Platform-Windows%20%7C%20macOS%20%7C%20Linux%20%7C%20Android%20%7C%20iOS-blue)]()
[![Version](https://img.shields.io/badge/Version-0.1.6-green)]()
[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg)]()

[Features](#-comprehensive-features) • [Download](#-download) • [Setup Guide](#-setup-guide) • [Documentation](#-documentation) • [License](#-license)

</div>

---

## 🚀 Project Status: v0.1.6 "Intelligence Refined"

Comet is a high-performance, privacy-hardened browser built for architects of the future. Developed by **PreetPatel (Latestinssan)**, it combines native AI orchestration with military-grade privacy.

*   **v0.1.6 Highlights**: Persistent AI Disclaimer Toggles, Neural URL Prediction, Dynamic Tab Favicons, and Realigned Premium Layout.
*   **Target**: High-performance browsing even on "potato PCs" (low-end hardware optimization).

---

## 🌟 Comprehensive Features

### 🧠 Intelligence & RAG System
*   **Neural Analysis Sidebar**: A context-aware analyst that "reads" the page with you. Ask it to summarize, extract data, or explain complex concepts.
*   **Persistent Neural Memory**: Build local embeddings of your sessions using **TensorFlow.js**. Your intelligence persists across sessions on your local disk.
*   **Predictive Intelligence**: Neural URL predictor with auto-completion for common sites and user history.
*   **AI Mistake Guard**: Persistent, one-time intelligence disclaimer with customizable privacy toggles.
*   **Native AI Orchestration**: Seamlessly toggle between Google Gemini, GPT-4o, Claude 3.5, Groq, and **Local Ollama (Deepseek R1)**.
*   **Advanced AI Search**: Predicts and synthesizes search results using native neural logic.

### 🎨 Design & Workspace
*   **Balanced Premium Layout**: Realigned toolbar with centered URL focus and split-group utility alignment.
*   **Dynamic Tab Branding**: Real-time website favicons in the tab bar for intuitive navigation.
*   **Glassmorphic UI**: Vibrant, hardware-accelerated interface built with **Framer Motion** and **Tailwind 4**.
*   **Specialized Modes**: 
    *   **Media Studio**: Native environment for intense media tasks and creative workflows.
    *   **PDF Workspace**: Comprehensive PDF tools including OCR text extraction (Tesseract.js), annotations, and high-fidelity rendering.
    *   **Coding Mode**: Dedicated view for developers with real-time terminal feedback and AI-assisted debugging.
*   **Custom Sidebar Rail**: Instant access to Docs, Shopping, Workspace, and Dev tools via a sleek, minimalist rail.

### 🌐 Cross-Device & Sync
*   **Quantum E2EE Sync**: Sync tabs and clipboards via **WebRTC P2P**—no cloud required.
*   **Secure Auth Relay**: Google OAuth via `browser.ponsrischool.in` with deep-link synchronization using custom protocol handlers (`comet-browser://`).
*   **Phone Call Control**: Answer/reject calls and monitor battery levels of your phone directly from the desktop (Experimental).
*   **Automatic OTP Verification**: SMS and Email OTP capture with cross-device auto-fill (Experimental).

### 🔐 Security & Privacy
*   **Native Firewall & Ad-Blocker**: High-performance, low-latency ad and tracker blocking included in the kernel.
*   **Local Password Vault**: AES-256 encrypted local storage for credentials with zero-knowledge architecture.
*   **Privacy-First Design**: Zero telemetry. Integrated hardware-level isolation for every tab and extension.

### 🌍 Neural Translation Service
*   **Contextual Translation**: Translate selected text or entire pages into 30+ languages (English, Hindi, Tamil, Telugu, Spanish, etc.) using Comet's native AI.
*   **How to use**: 
    1. **Right-click** anywhere on a page or select text to see the **"Translate to English"** (or current target) option.
    2. Use the **Read Aloud** tool in the toolbar to hear the translated or original content.
    3. Access the **Translation Dialog** via the context menu for full-site translation options.

---

## 📦 Download

| Platform | Version | Status | Size |
|----------|---------|--------|------|
| 🪟 **Windows** | [v0.1.6 (.exe)](https://github.com/Preet3627/Browser-AI/releases/download/Comet-Browser/Comet.Browser.Setup.0.1.6.exe) | ✅ Stable | ~150 MB |
| 🍎 **macOS** | Coming soon | 🧪 Beta | – |
| 🐧 **Linux** | Coming soon | 🧪 Beta | – |
| 🤖 **Android** | Coming soon | 🧪 In-Dev | – |

---

## 🛠️ Setup Guide

### 1. Prerequisites
*   **Node.js** (v18+)
*   **NPM** (v10+)
*   **Ollama** (Optional, for Local AI support: [Download here](https://ollama.com/download/windows))

### 2. Installation
```bash
# Clone the repository
git clone https://github.com/Preet3627/Browser-AI.git
cd Browser-AI/comet-browser

# Install dependencies
npm install

# Build the app logic
npm run build
```

### 3. Running in Development
```bash
# Start Next.js and Electron concurrently
npm run dev
```

### 4. Production Build (Windows)
```bash
# Package into an installable .exe
npm run dist:win
```

### 💡 Environment Configuration
Create a `.env.local` file:
```env
NEXT_PUBLIC_APP_NAME=Comet
NEXT_PUBLIC_APP_VERSION=0.1.6
GEMINI_API_KEY=your_key_here
OPENAI_API_KEY=your_key_here
```

---

## 📖 The Story Behind Comet
Building a browser is considered "impossible" for a solo developer. Comet was conceptualized and prototyped in **under 6 hours** by an 11th-grade student balancing JEE preparation. It is a testament to the fact that hardware (i3 4th Gen, 4GB RAM) is a constraint, not a limit.

---

## 🤝 Contributing & Support
*   **Issues**: [Report a bug](https://github.com/Preet3627/Browser-AI/issues)
*   **Videos**: [YouTube Channel](https://youtube.com/@latestinssan)
*   **License**: Licensed under the **MIT License**.

---
<div align="center">
**Built with ❤️ for privacy and performance. Dedicated to those who code on potato PCs.**
</div>