# 🌟 Comet AI Browser (v0.2.0)

<div align="center">

![Comet AI Browser](https://raw.githubusercontent.com/Preet3627/Comet-AI/main/icon.ico)

**One Of World's Most Advanced Autonomous AI Browser**

[![License: MIT](https://img.shields.io/badge/License-MIT-cyan.svg)](LICENSE)
[![Platform](https://img.shields.io/badge/Platform-Windows%20%7C%20macOS%20%7C%20Linux%20%7C%20Android%20%7C%20iOS-blue)]()
[![Version](https://img.shields.io/badge/Version-0.2.0--stable-green)]()
[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg)]()

[Features](#-features) • [Download](#-download) • [Quick Start](#-quick-start) • [Development Status](#-development-status) • [Contributing](#-contributing)

</div>

***

## 🌌 Why Comet Exists

Modern browsers are built for scale, monetization, and cloud-first users. Comet exists for a different reason:

- **Autonomous Agency**: A browser that doesn't just display the web, but *navigates* it for you.
- **Privacy-First Intelligence**: AI access without forcing subscriptions or tracking.
- **Local-First Sync**: Zero-cloud cross-device synchronization.
- **Computer Vision**: An agent that "sees" the web through screenshots, OCR, and DOM analysis.

---

## �️ Full Feature List

### 🤖 Autonomous AI Agency (Comet Agent)
*   **Multimodal Perception**: The agent perceives the web like a human using direct Screen Capture, Tesseract.js OCR, and Shadow DOM analysis.
*   **Self-Correction Loop**: Validates its own actions (e.g., checking if a click actually navigated) to ensure reliability in complex tasks.
*   **Action Engine**:
    *   `[NAVIGATE: url]` - Direct navigation.
    *   `[CLICK: text/selector]` - Human-like interaction.
    *   `[TYPE: text | selector]` - Input handling.
    *   `[SCROLL: direction]` - Page exploration.
    *   `[EXTRACT_DATA: query]` - Targeted scraping.
*   **Thinking Blocks**: Live visibility into the agent's reasoning process and current "vision" frame.

### 🧠 LLM Orchestration
*   **Latest Model Support**: Support for **Google Gemini 3.1 (Pro/Flash)**, **Claude 3.7 Sonnet**, GPT-4o, and Groq.
*   **Local AI (Ollama)**: Direct integration with Ollama for running models like **Deepseek R1** or Llama 3 locally for maximum privacy.
*   **RAG-Powered Memory**: Local vector database (using `vectorstore`) that indexes your browsing history for semantically accurate, privacy-preserving session recall.

### 🍱 Productivity & Workspace
*   **PDF Workspace**: Autonomous generation of PDF reports and documents from research queries.
*   **Presenton Studio**: Integrated AI presentation generator to turn web research into slide decks instantly.
*   **Spotlight Search (Alt+Space)**: System-wide shortcut for quick app launching, calculations, currency conversion, and AI prompts.
*   **Neural Modules (Extensions)**: A modular extension system with a glassmorphic UI for managing browser capabilities.
*   **Sidebar Multi-Tasking**: A persistent AI companion that stays with you across all tabs for summarization and action.

### ⚡ Performance & Core
*   **Speedometer 3 Optimized**: Consistently achieves ultra-low latency (~14ms) outperforming mainstream browsers.
*   **Hardware Isolation**: Sandboxed tabs and resource-heavy process management for crash resistance.
*   **Ad-Blocking & Privacy**: Integrated **Ghostery Adblocker** and tracking prevention.
*   **Premium UI**: Custom-built with **Framer Motion**, featuring vibrant dark modes, glassmorphism, and smooth micro-animations.

### 🔄 Multi-Device Ecosystem
*   **WiFi Desktop Sync**: Securely connect mobile and desktop via local network QR scans.
*   **P2P Clipboard Sharing**: Copy text on your phone and paste it on your laptop without the cloud.
*   **Sync Session Recovery**: Seamlessly pick up your open tabs and AI conversations across devices.

---

## �📊 Performance Snapshot

Measured on real hardware, not marketing slides.

| Metric | Value | Notes |
| :--- | :--- | :--- |
| Speedometer 3 | ~14 ms | |
| UI Load Time | < 2 seconds | Cold start observed |
| Electron RAM (AI + 1 tab) | ~462-500 MB | Expected Electron overhead |
| System RAM | 8 GB (6.9 GB used) | Still smooth, no visible lag |
| Agent Reaction Time | ~3-5s | Claude 3.7 Sonnet processing latency |

---

## 🧠 Recent Updates (v0.2.0) - The Agency Update

We've introduced groundbreaking autonomous capabilities:

- **Comet Agent (Mobile)**: A fully autonomous browser agent on Android. Trigger it by typing `>>` in the search bar.
- **Gemini 3.1 & Claude 3.7**: Integration of the latest multimodal reasoning models.
- **WiFi Desktop Sync**: Connect mobile to desktop via WiFi & QR scan to execute commands remotely.
- **Autonomous PDF Generation**: The browser can now generate and download PDF documents autonomously via AI commands.
- **Premium Black UI**: New high-contrast "Pure Black" aesthetic for OLED mobile screens.

---

## 🚀 Development Status

Comet AI Browser is a multi-platform, open-source project in active development.

### 🖥️ Desktop (Windows / macOS / Linux)
**Framework**: Electron + Next.js

- ✅ **Windows**: Fully functional, installable beta available.
- ✅ **MacOS**: Fully functional, installable beta available.
- ✅ **Linux**: Fully functional, installable beta available.

### 📱 Mobile (Android / iOS)
**Framework**: Flutter

- ✅ **Android**: **Production Ready** with Comet Agent v1.0.
- 🧪 **iOS**: Design & simulator testing phase.

---

## ✨ Feature Matrix (Desktop vs Mobile)

| Feature                   | 🖥️ Desktop| 📱 Mobile   | Status                       |
| **Comet Agent (Agency)**  |     ✅    |     ✅      | **New!** (Use `>>` on Mobile)|
| **Multimodal Perception** |     ✅    |     ✅      | Vision + OCR + DOM           |
| **PDF Generation**        |     ✅    |     🧪      | Autonomous Document Creation |
| **Presenton Studio**      |     ✅    |     🧪      | AI Presentations             |
| **WiFi Desktop Sync**     |     ✅    |     ✅      | **Core Feature**             |
| **History & Clipboard**   |     ✅    |     ✅      | Cross-device                 |

---

## 🤖 Intelligent AI Agent

Comet AI is designed as an autonomous browser-level agent.

- **Multimodal Agency**: Perceptual loop using Screenshots, OCR, and DOM.
- **Action Tags**:
    - `[NAVIGATE: url]`
    - `[GENERATE_PDF: title | content]`
    - `[OPEN_PRESENTON: prompt]`
    - `[SCREENSHOT_AND_ANALYZE]`
    - `[SET_THEME: dark|light|system]`
    - `[EXEC_DESKTOP: command]`

---

## 📦 Download & Installation

### 🖥️ Desktop

| Platform | Binary    | Status    |
| Windows  | `.exe`    | ✅ Beta   |
| macOS    | `.dmg`    | 🧪 In Dev |
| Linux    | `AppImage`| 🧪 In Dev |

### 📱 Mobile

> APK & TestFlight builds coming soon. Manual build required for now.

---

### 🛠️ Quick Start

Visit [https://browser.ponsrischool.in](https://browser.ponsrischool.in) for documentation and official builds.

```bash
# Clone the repository
git clone https://github.com/Preet3627/Comet-AI.git
cd Browser-AI
npm install
```

### Run Desktop App

```bash
cd comet-browser
npm install
npm run dev
# In new terminal:
npm run electron-start
```

### Run Mobile App

```bash
cd flutter_browser_app
flutter pub get
flutter run
```

---

## 🗺️ Roadmap to v1.0.0

- [ ] Native Chromium-based core
- [ ] Fully offline LLM (1.5B–3B params)
- [ ] Extension marketplace
- [ ] **Autonomous Browser Workspace** (Multi-agent collaboration)
- [ ] **Advanced Tool Permission Gating** (OS Actions Safety)

---

## 👥 Contributors

A big thank you to the community for their suggestions and feedback!

- **Otherwise_Wave9374** - Suggested tool permission gating and reliable agent loop patterns.

---

## 🧑‍💻 About the Creator

Built by a **16‑year‑old student** preparing for JEE, Comet AI Browser is proof that skill, patience, and curiosity matter more than budget or hardware.

**Primary Dev Machine**: Intel i5‑U | 8GB RAM | SATA SSD

---

## 📝 License

This project is licensed under the MIT License.

<div align="center">Built with ❤️ for privacy, performance, and agency

[⬆ Back to Top](#-comet-ai-browser)

</div>
