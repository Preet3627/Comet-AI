# Debugging & Optimization History - PopSearch Beta

**Date:** 2026-02-12  
**Time:** 23:48:45+05:30  

---

This document records the major issues identified and resolved during the beta debugging session (Feb 2026).

---

## 1. Settings Panel Performance & Memory
**Problem:**  
The Settings panel becomes slow, non-responsive, or crashes (Out of Memory) when managing a large number of search providers.

**Root Cause:**  
*   **Memory Limit:** The Electron main process was restricted to 128MB of JavaScript heap.
*   **DOM Bloat:** The UI pre-rendered category dropdowns for *every* provider list item, creating thousands of unnecessary DOM nodes.

**Solution:**  
*   **Increased Memory:** Modified `src/main/index.js` to set `--max-old-space-size=512`.
*   **Lazy Rendering:** Refactored `renderProviders` in `ui.js` to generate category dropdowns **on-demand**.

---

## 2. Input Fields Breaking After Reset
**Problem:**  
After using the "Reset Settings" button, the search bar and "Add Provider" input fields became completely unresponsive.

**Root Cause:**  
A minor error during re-initialization would crash the script, preventing event listeners from being attached.

**Solution:**  
*   **Fail-Safe Initialization:** Refactored `initUI` into isolated, protected segments using `try-catch` blocks.
*   **Diagnostic Logs:** Added terminal logging (`[Settings UI] ...`) to track every step of the UI startup.

---

## 3. UI "Freeze" (Focus Trap)
**Problem:**  
After deleting multiple bookmarks, the search bar would "freeze" and lose focus.

**Root Cause:**  
*   **Focus Conflict:** Native browser dialogs (`confirm()`) clashed with the Electron window's high-priority `alwaysOnTop: 'screen-saver'` setting. 

**Solution:**  
*   **Custom Modals:** Replaced all native dialogs with a **Custom HTML Modal System**.
*   **Window Tuning:** Lowered the Settings window priority from `screen-saver` to `alwaysOnTop: true`.

---

## 4. Git Synchronization
**Problem:**  
Unintentional staging of binaries (`.exe`) and media (`.mp4`) to the GitHub repository.

**Solution:**  
*   **Ignore Patterns:** Updated `.gitignore` with global exclusions for `*.exe` and `*.mp4`.

---

## Future Implementation Lessons (Developing Bug-Free Electron Apps)

1.  **Avoid Native Dialogs in Always-On-Top Windows:** Native OS dialogs (like `alert` or `confirm`) often fight with Electron for focus priority. Always use HTML-based modals to ensure a smooth, non-blocking user flow.
2.  **Isolated Initialization (Fault Tolerance):** Never let a single failed DOM element or missing config key crash the whole UI. Group initialization steps into `try-catch` blocks so that one failure (like "Appearance Settings") doesn't kill unrelated features (like "Add Provider").
3.  **Efficiency over Eagerness (DOM Management):** Pre-rendering complex UI elements for large lists leads to exponential RAM usage. Only render what the user is interacting with (on-demand rendering).
4.  **Diagnostic Presence:** Build-time logging (`logToTerminal`) is essential for remote debugging. When a user reports a "freeze," the terminal logs should show exactly which function failed.
5.  **Memory Awareness:** For portable Electron apps, default memory limits are often too low. Explicitly managing `--max-old-space-size` is critical for memory-intensive applications.
6.  **Respect System Defaults (The Shell API):** Avoid manual `child_process.exec` for opening links or files. Using Electron's `shell.openExternal(url)` ensures that the user's preferred browser is always used, improving security and cross-platform reliability.
7.  **Managed Logging & Rotation:** Never rely on simple file appending for long-term production use. Use a dedicated logging library (like `electron-log`) to handle automatic **log rotation** (e.g., 5MB limit) and prevent disk bloat.
8.  **Portable-Safe Storage:** For portable apps, always store logs and data in the `app.getPath('userData')` directory. This guarantees write permissions even if the application is run from read-only media like a USB or a protected system folder.
9.  **Modern Tooling (Vite):** Use **Vite** (via `electron-vite`) for bundling. It provides much faster reload times and more efficient production builds (tree-shaking and minification) compared to legacy bundlers, leading to better runtime optimization.
10. **Build-Time File Locks (EBUSY Prevention):** When implementing a `clean` or `rimraf` step in your build process, remember that any running instance of your app (even a portable one) will lock its own binaries. Always ensure the application is **fully closed** (quit via system tray) before running build or distribution scripts to avoid "resource busy" errors.
11. **ESM Module Consistency:** When using ES Modules (`import/export`) in Electron, avoid using legacy `require()` inside your main-process handlers. Mixed module types can lead to `ReferenceError` crashes. Stick to a consistent ESM workflow for all internal project files.
12. **Graceful Fallbacks for File Access:** If your UI provides shortcuts to open specific files (like Debug Logs), always implement a fallback. If the specific file doesn't exist yet, have the system open the parent **folder** instead of doing nothing or crashing.

## Advanced Architectural Lessons (Project-Specific)

Based on the structure of **PopSearch v3**, here are deeper lessons for "Dynamic & Bug-Free" scaling:

1.  **The "Bridge" Pattern for Interoperability:** 
    *   Using an internal HTTP server (`triggerServer.js`) to bridge AHK and Electron is a powerful way to avoid complex win32 API calls within Node. 
    *   *Dynamic Tip:* To make this "dynamic," ensure the port is configurable or uses a "find-available-port" logic to prevent conflicts if multiple users run the app on the same network or machine.

2.  **State-First Rendering (Decoupling Data from UI):** 
    *   In `ui.js`, we saw that rendering is often tied directly to DOM queries. 
    *   *Bug-Free Tip:* Transition towards a "State -> Render" flow where you update a JS object first, and a single `render()` function updates the entire view. This prevents "Index Shifting" bugs (like the one fixed in `removeProvider`).

3.  **Cross-Window Focus Orchestration:** 
    *   The app has a specific check to "Ignore Popup if Settings focused." This is great for UX but dangerous if the Settings window enters a "ghost focus" state.
    *   *Implementation Method:* Implement a "Global Window Manager" that tracks focus states across *all* windows in a central Main-process variable, rather than letting windows "guess" each other's state.

4.  **Storage Scalability (Moving beyond LocalStorage):** 
    *   `localStorage` is synchronous and limited to ~5MB. As your "Bulk Import" feature grows, it might hit a wall.
    *   *Future-Proofing:* Consider moving to an asynchronous IPC-based storage (like `electron-store` or a simple JSON file with `fs.promises`) to prevent the Renderer from blocking while saving large lists.

5.  **Graceful Resource Disposal:** 
    *   The internal AHK and HTTP servers must be explicitly closed during `app.on('before-quit')`. 
    *   *Stability Tip:* Always use "Cleanup Manifests." Maintain an array of active resources (processes, servers, intervals) and loop through it on exit to ensure no "Zombie" AHK processes are left in the User's background.

## Moving Beyond AutoHotkey: Dynamic Trigger Alternatives

While AHK is powerful on Windows, it creates a dependency on an external language and is platform-locked. For future "Dynamic" projects, consider these fully-integrated alternatives:

1.  **uiohook-napi (Recommended for Node.js):**
    *   **What it is:** A native Node.js wrapper for `libuiohook`.
    *   **The Benefit:** It allows you to listen to global keyboard and mouse events directly inside Electron's **Main Process** without any external scripts.
    *   **Capture Strategy:** You can listen for your trigger key, then use a library like `robotjs` or `nut-js` to simulate `Ctrl+C`, read the clipboard, and trigger your popup instantly.

2.  **Native Electron `globalShortcut` + Clipboard Sync:**
    *   **What it is:** The built-in Electron module.
    *   *Limit:* It doesn't provide "event-swallowing" (preventing the key from reaching other apps) as easily as AHK.
    *   **Modern Twist:** Use this for simple triggers, and pair it with a Main-process "Clipboard Listener" to detect when the user has highlighted text.

3.  **Rust/Tauri "Sidecar" (High Performance):**
    *   **What it is:** Write a tiny Rust binary using the `enigo` or `rdev` crates.
    *   **The Benefit:** Extremely low latency and cross-platform (Windows/Mac/Linux). Electron can launch this as a "sidecar" process, communicating via `stdio` instead of a local HTTP server.

4.  **C# / .NET Hook (Windows Optimized):**
    *   **What it is:** A small invisible C# `.exe` that uses `SetWindowsHookEx`.
    *   **The Benefit:** Much more stable and "standard" than AHK for professional Windows software. You can compile this into your `assets` and talk to it via IPC.

---

---

## 5. Default Browser Support
**Problem:**  
Links (search queries and Icons8 references) were hard-coded to open specifically in Google Chrome, which ignored the user's system preferences and failed if Chrome wasn't installed.

**Root Cause:**  
*   **Manual Execution:** `ipcHandlers.js` used `child_process.exec` to run platform-specific terminal commands (e.g., `start chrome`).

**Solution:**  
*   **Electron Shell API:** Replaced manual `exec` calls with `shell.openExternal(url)`. This ensures links open in the user's **Default Browser** and improves security by letting the OS handle the URI.

---

## 6. Managed Logging (Log Rotation)
**Problem:**  
The `debug_log.txt` file was growing indefinitely, potentially consuming significant disk space over time.

**Root Cause:**  
*   **Simple Append:** The logger used `fs.appendFileSync` without any size checks or rotation logic.

**Solution:**  
*   **Advanced Logging Engine:** Integrated `electron-log` to manage logs.
*   **Auto-Rotation:** Configured a **5MB rotation limit**. Once a log exceeds 5MB, it is archived, and a fresh log is started.
*   **Portable Reliability:** Switched to the library's default `userData` path, ensuring the **Portable Version** always has write permissions even if launched from read-only media.

---

## 7. Debug Log Shortcut (UI Access)
**Problem:**  
Finding the log file in the hidden `%AppData%` folder was difficult and unintuitive for standard users.

**Root Cause:**  
*   **Path Obscurity:** Users had to manually navigate to `AppData/Roaming/popsearch-v1/logs/`.

**Solution:**  
*   **Settings Integration:** Added an "Open Debug Log" row in the Shortcuts section.
*   **Dynamic Resolution:** The button asks the Main process for the active log path (resolved by `electron-log`), ensuring it works perfectly even in **Portable mode** on different machines.
*   **Auto-Locate:** Uses `shell.showItemInFolder` to open the directory and highlight the file instantly.

---

## 8. Build Optimization & Cleaning
**Problem:**  
The `dist` folder was not being fully overwritten, leading to potential artifacts or "ghost files" from previous versions remaining in the installer/portable package.

**Root Cause:**  
*   **Incremental Replacement:** `electron-builder` replaces specific files but doesn't wipe the directory by default.

**Solution:**  
*   **Fresh-Slate Workflow:** Introduced a `clean` script using **`rimraf`** to wipe the `dist` and `out` folders before every build.
*   **Script Refactoring:** Updated `package.json` so that `npm run dist` automatically triggers the `clean` step, ensuring every compilation is 100% accurate.

---

## Professional Release Blueprint (Generic Guide for Any Project)

Follow this universal sequence to ensure a reliable and professional deployment for any software project.

### Phase 1: Development & Version Sanitization
1.  **Functional Audit**: Run your application in the development environment and verify that all new features and bug fixes are working as expected.
2.  **Version Synchronization**: Identify every location where the version number is hardcoded (e.g., `package.json`, `constants`, `UI headers`, `metadata`) and update them to the new version string (e.g., `1.x.x`).
3.  **Clean Up Diagnostics**: 
    *   Remove or comment out redundant `console.log` statements.
    *   Ensure all diagnostic logs follow a consistent prefix (e.g., `[Main]`, `[Renderer]`).
4.  **Audit Trail/Changelog**: Update your project's history file or `CHANGELOG.md` with a detailed entry for the new version.

### Phase 2: Build Verification & Environment Prep
1.  **Clear Build Cache**: Delete previous build artifacts (folders like `/dist`, `/out`, `/build`) to ensure no stale files contaminate the new version.
2.  **Process Termination**: Ensure the application is **fully closed and not running in the background**. This prevents "Resource Busy (EBUSY)" errors which occur when the system locks binaries.
3.  **Execute Build**: Run your production build or compilation command.
4.  **Local Binary Test**: Navigate to your output directory and run the generated executable/package. Verify that the version number displayed in the UI matches the build.

### Phase 3: Git & Repository Synchronization
1.  **Stage All Changes**:
    ```bash
    git add .
    ```
2.  **Atomic Commit**: Create a commit with a clear, descriptive message.
    ```bash
    git commit -m "chore: release version [X.Y.Z]"
    ```
3.  **Annotated Tagging**: Create a tag that corresponds to the version in your configuration files.
    ```bash
    git tag -a v[X.Y.Z] -m "Release version [X.Y.Z]"
    ```
4.  **Push to Remote**: Push both your code and your tags to the repository.
    ```bash
    git push origin [main/branch-name] --tags
    ```

### Phase 4: Release Management (GitHub/Server Side)
1.  **Draft Release**: On GitHub/GitLab, create a new Release based on the tag you just pushed.
2.  **Drafting Notes**: Copy the summary of changes from your history/changelog into the release description.
3.  **Binary Assets**: Upload all production-ready artifacts (Installers, Portables, Binaries) to the Release page.
4.  **Final Quality Check**: Download the asset from the release page yourself to ensure the upload wasn't corrupted.

---

**Current Status:** Documentation upgraded to a dynamic "Blueprint" guide suitable for any software project. Project-specific versions remain updated to 1.2.0-beta.
