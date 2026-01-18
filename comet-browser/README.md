# ☄️ Comet AI Browser (Desktop Core)

![Version](https://img.shields.io/badge/version-v0.1.1-blue)

![Comet Banner](https://via.placeholder.com/1200x400/0a0a0f/00ffff?text=Comet+AI+Browser)

**Comet AI Browser** is a performance-hardened Chromium shell with native AI orchestration, optimized for decentralized workflows. It combines the speed of Chromium with the power of modern AI and cross-device synchronization.

## ✨ Core Features

- 🤖 **Native AI Orchestration:** Seamlessly switch between Google Gemini, OpenAI, Claude, and Local LLMs (via Ollama/TensorFlow.js).
- 🔒 **Quantum E2EE Privacy:** Industry-standard **AES-GCM (256-bit)** local-first encryption. Your data is encrypted with your private passphrase *before* syncing. **Zero-Knowledge Architecture**—not even the developers can see your data.
- 🛡️ **AI Fortress:** Proactive real-time scanner that detects and masks sensitive keys (Gemini, OpenAI, Anthropic) or secrets in AI chats before they reach the cloud.
- 🌐 **Cloud Dashboard:** A web-native portal (`browser.ponsrischool.in`) for managing your synced history and clipboard from any device.
- 📁 **Hardware-Isolated Tabs:** Persistent sessions with high-fidelity isolation and custom volume/priority controls.
- 🛒 **Unified Shopping Engine:** AI-powered cross-site cart management that automatically scans pages for items.
- 📄 **Advanced PDF Workspace:** Built-in OCR text extraction (Tesseract.js) and annotation tools.
- 🧩 **Chrome Extension Support:** Load and manage your local development plugins with ease.
- 🔄 **Master Sync Core:** Persistent synchronization of bookmarks, history, and AI memory via Firebase/MySQL.

## 🚀 Quick Start (Development)

1.  **Install Dependencies:**
    ```bash
    npm install
    ```

2.  **Configure Environment:**
    Copy `.env.example` to `.env.local` and fill in your API keys.

3.  **Run Dev Server:**
    ```bash
    # Terminal 1: Next.js Frontend
    npm run dev
    ```
    ```bash
    # Terminal 2: Electron Shell
    npm run start
    ```

## 📖 Our Story: How We Built This
This browser isn't just a piece of software; it's a testament to what's possible with determination and the right tools. **Comet Browser was built in under 6 hours** by a **16-year-old 11th-grade student** with the assistance of advanced AI.

The development took place on a highly modest setup, proving that performance code doesn't require a supercomputer:
- **Device:** Acer Veriton (Business Desktop)
- **RAM:** 8 GB
- **Processor:** Intel Core i5 (U-Series)
- **Graphics:** Intel UHD Integrated (4 GB Shared)
- **Storage:** 256 GB SATA SSD
- **Display:** VA Panel

This project was born out of a desire to create a browsing workspace that feels premium, fast, and intelligent, even on "low-end" hardware.

## ⚙️ System Architecture & Sync Logic

### 🏠 Login & Entry
The desktop application initializes by loading the internal **Login/Landing Site** bundled within the distribution.
- **Local Route:** The app points to `out/index.html`, which serves the `LandingPage` component.
- **Authentication:** We use **Firebase Google OAuth** for persistent sessions. Once logged in, the app transitions seamlessly to the Browser Workspace.
- **Portal Integration:** Syncing is powered by `browser.ponsrischool.in`, which serves as the central hub for your decentralized data.

### 🛡️ Security System: The "Fortress"
Comet implements a three-tier security model:
1.  **Local Isolation:** Tabs run in isolated contexts with randomized IDs.
2.  **Quantum E2EE:** User-provided passphrases generate unique AES-GCM keys for all cloud-synced metadata.
3.  **AI Fortress:** A regex-based proactive interceptor that prevents PII (Personally Identifiable Information) and API secrets from being leaked to LLM providers during chat sessions.

### 🔄 Multi-Layer Sync System
Comet uses a hybrid synchronization model:
1.  **Cloud Sync (Firebase):** Encrypted **API Keys**, **Vault data**, and **History** are stored in Firebase.
2.  **P2P Direct Sync:** Large files and real-time clipboard sharing use **Direct Device-to-Device (P2P)** via WebRTC.
3.  **Relay & Queue:** Temporary encrypted file uploads for offline-queued syncs, with **automated deletion** upon completion.

## 🛠️ Tech Stack & Credits

### Core Libraries
- **UI Framework:** Next.js 14+, React 19
- **Styling:** Tailwind CSS 4, Framer Motion 12
- **State Management:** Zustand
- **Desktop Shell:** Electron (Chromium) 28.0.0
- **Intelligence:** TensorFlow.js, Google Gemini, Tesseract.js
- **Backend:** Firebase (Auth/Datastore), MySQL (Optional Client Metadata)

### © Copyright & Credits
**Comet AI Browser** is a production of **Latestinssan**.
Copyright © 2026 Latestinssan. All rights reserved.

All included libraries and sources are the property of their respective owners and are used under their open-source licenses (MIT, Apache 2.0, etc.). Special credits to the [Google DeepMind](https://deepmind.google/) team and the open-source community for the models and tooling that power our Intelligence Core.

---

For detailed installation, Firebase setup, and production build instructions, see [SETUP.md](./SETUP.md).