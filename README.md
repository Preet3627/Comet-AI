# 🌟 Comet AI Browser (v0.1.8)

<div align="center">

![Comet AI Browser](C:\Users\admin\Desktop\Projects\AI-BROWSER\Browser-AI\icon.ico)

**The World's Most Advanced Privacy-First AI Browser**

[![License: MIT](https://img.shields.io/badge/License-MIT-cyan.svg)](LICENSE)
[![Platform](https://img.shields.io/badge/Platform-Windows%20%7C%20macOS%20%7C%20Linux%20%7C%20Android%20%7C%20iOS-blue)]()
[![Version](https://img.shields.io/badge/Version-0.1.8--stable-green)]()
[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg)]()

[Features](#-features) • [Download](#-download) • [Quick Start](#-quick-start) • [Development Status](#-development-status) • [Contributing](#-contributing)

</div>

***

## 🌌 Why Comet Exists

Modern browsers are built for scale, monetization, and cloud-first users. Comet exists for a different reason:

- To prove high-performance browsing is possible on modest hardware
- To give AI access without forcing subscriptions
- To stay local-first, privacy-first, and transparent
- To explore what a browser can become when AI is treated as a core system, not a plugin

Comet is intentionally experimental. Some choices (like Electron) are pragmatic tradeoffs to move fast and learn deeply. The long-term goal is a native Chromium-based core once hardware and time allow.

---

## 📊 Performance Snapshot

Measured on real hardware, not marketing slides.

| Metric | Value | Notes |
| :--- | :--- | :--- |
| Speedometer 3 | ~14 ms | Faster than Chrome/Edge on same system |
| UI Load Time | < 2 seconds | Cold start observed |
| Electron RAM (AI + 1 tab) | ~700–800 MB | Expected Electron overhead |
| System RAM | 8 GB (6.9 GB used) | Still smooth, no visible lag |
| Crashes | 0 in 2+ months | Daily usage |

> _Offline network conditions may cause temporary stalls due to AI/network fallback handling._

---

## 🧠 Recent Updates (v0.1.8)

We've been hard at work refining the Comet experience. Here are the latest improvements:

- **Synced Config**: Added secure environment variable syncing (Google Client ID, Firebase Config) from the landing page.
- **Admin Secrets**: Admins can now manage app configuration directly from the landing page.
- **AI/LLM Optimization**: Added `robots.txt`, `sitemap.xml`, and `LLM.md` for better indexing by AI crawlers and bots.
- **Improved New Tab**: Fixed the "about:blank" issue; new tabs now redirect correctly to the default engine.
- **Performance Boost**: Lazy-loaded OCR (Tesseract.js) to eliminate startup freezes.
- **Cross-Platform**: Now building for **iOS** (Beta) alongside Android, Windows, macOS, and Linux.
- **Branding**: Officially rebranded to **Comet-AI**.
- **Enhanced AI Chat**: Improved "Find and Click" capabilities and fixed variable declaration issues in chat logic.
- **Build Pipeline**: Robust CI/CD with secure secret handling for all platforms.

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

- 🧪 **Android**: Core browser + UI ready, P2P sync & offline AI in progress.
- 🧪 **iOS**: Design & simulator testing phase.

---

## ✨ Feature Matrix (Desktop vs Mobile)

| Feature | 🖥️ Desktop | 📱 Mobile | Status |
| :--- | :---: | :---: | :--- |
| **Glassmorphic UI** | ✅ | ✅ | Production Ready |
| **AI Sidebar (Cloud)** | ✅ | ✅ | OpenAI / Gemini |
| **Offline AI Models** | ✅ | 🧪 | Local LLM optimization |
| **AI Web Agency** | ✅ | 🧪 | Command-based navigation |
| **P2P Sync (WebRTC)** | ✅ | 🧪 | Zero-cloud design |
| **Music Visualizer** | ✅ | ✅ | Local + Cloud |
| **Phone Call Control** | ✅ | 🚧 | Bluetooth HID |
| **OTP Auto Detection** | ✅ | ✅ | Native listeners |
| **PDF Workspace + OCR** | ✅ | 🧪 | Tesseract WASM |
| **Chrome Extensions** | ✅ | ❌ | Desktop only |
| **Cross-device Sync** | ✅ | ✅ | Firebase + P2P |

---

## 🤖 Intelligent AI Assistant

Comet AI is designed as an autonomous browser-level agent, not just a chat overlay.

- **Smart Provider Switching**: OpenAI, Gemini, Groq, or fully local models.
- **Natural Commands**: "Open YouTube", "Search JEE news", "Switch to dark mode".
- **Action Tags**:
    - `[NAVIGATE: url]`
    - `[SEARCH: query]`
    - `[SET_THEME: dark|light|system]`
    - `[OPEN_VIEW: view_name]`
    - `[SCREENSHOT_ANALYSE]`

---

## 📦 Download & Installation

### 🖥️ Desktop

| Platform | Binary | Status |
| :--- | :--- | :--- |
| Windows | `.exe` | ✅ Beta |
| macOS | `.dmg` | 🧪 In Dev |
| Linux | `AppImage` | 🧪 In Dev |

### 📱 Mobile

> APK & TestFlight builds coming soon. Manual build required for now.

---

## 🛠️ Quick Start for Developers

Clone the repository to get started:

```bash
git clone https://github.com/Preet3627/Browser-AI.git
cd Browser-AI
npm install
```

### Run Desktop App

```bash
cd comet-browser
# Create a local environment file
cp .env.example .env.local
# Start development server
npm run dev
# In a new terminal, launch Electron
npm run electron-start
```

### Run Mobile App

```bash
cd CometBrowserMobile/comet_ai
flutter pub get
flutter run
```

---

## 🗺️ Roadmap to v1.0.0

- [ ] Native Chromium-based core
- [ ] Fully offline LLM (1.5B–3B params)
- [ ] Extension marketplace
- [ ] Advanced tab & memory management
- [ ] **Advanced Tool Permission Gating** (OS Actions Safety) - *Recommended by community*

---

## 👥 Contributors

A big thank you to the community for their suggestions and feedback!

- **Otherwise_Wave9374** - Suggested tool permission gating and reliable agent loop patterns.

---

## 📚 Resources & Inspiration

- [Agentix Labs Blog](https://www.agentixlabs.com/blog/) - Patterns for reliable agent loops and AI safety.

---

## 🤝 Contributing

We welcome contributions from the community! Whether it's fixing bugs, improving documentation, or suggesting new features, your help is appreciated.

Please read our [Contributing Guide](CONTRIBUTING.md) for details on our code of conduct and the process for submitting pull requests.

---

## 🧑‍💻 About the Creator

Built by a **16‑year‑old student** preparing for JEE, Comet AI Browser is proof that skill, patience, and curiosity matter more than budget or hardware.

**Primary Dev Machine**: Intel i5‑U | 8GB RAM | SATA SSD

---

## 📝 License

This project is licensed under the MIT License.

<div align="center">Built with ❤️ for privacy, performance, and learning

[⬆ Back to Top](#-comet-ai-browser)

</div>