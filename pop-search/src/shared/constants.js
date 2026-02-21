// Shared Constants for PopSearch v1.3.0-beta

export const IPC_CHANNELS = {
    SHOW_POPUP: 'show-popup',
    RESIZE_POPUP: 'resize-popup',
    SEARCH: 'search',
    COPY_AND_SEARCH: 'copy-and-search',
    LOG: 'log-to-terminal',
    RELOAD: 'reload-app',
    MINIMIZE: 'minimize-window',
    CLOSE: 'close-window',
    CONTEXT_MENU: 'show-popup-context-menu',
    SAVE_CONFIG: 'save-config',
    LOAD_CONFIG: 'load-config',
    OPEN_EXTERNAL: 'open-external',
    OPEN_LOG_FILE: 'open-log-file',
    READ_LOCAL_ICON: 'read-local-icon'
};

export const DEFAULT_APPEARANCE = {
    iconSize: '28',
    iconsPerRow: '8',
    gridGapX: '10',
    gridGapY: '5',
    popupMaxWidth: '0',
    theme: 'dark',
    fontWeight: '500',
    fontColor: '#00f2ff',
    bgColor: '#13132a',
    accentColor: '#5900ff',
    tabActiveBg: '#1d1d1d',
    customCSS: '',
    showDummyBtn: false,
    showUnsorted: false
};

export const DEFAULT_PROVIDERS = [
    { name: "Google", url: "https://www.google.com/search?q={query}", enabled: true, category: "Search", icon: "" },
    { name: "Wikipedia", url: "https://en.wikipedia.org/wiki/Special:Search?search={query}", enabled: true, category: "Search", icon: "" },
    { name: "YouTube", url: "https://www.youtube.com/results?search_query={query}", enabled: true, category: "Search", icon: "" },
    { name: "DuckDuckGo", url: "https://duckduckgo.com/?q={query}", enabled: true, category: "Search", icon: "" },
    { name: "Bing", url: "https://www.bing.com/search?q={query}", enabled: true, category: "Search", icon: "" },
    { name: "Yahoo", url: "https://search.yahoo.com/search?p={query}", enabled: true, category: "Search", icon: "" },
    { name: "Baidu", url: "https://www.baidu.com/s?wd={query}", enabled: true, category: "Search", icon: "" },
    { name: "Yandex", url: "https://yandex.com/search/?text={query}", enabled: true, category: "Search", icon: "" },
    { name: "WolframAlpha", url: "https://www.wolframalpha.com/input/?i={query}", enabled: true, category: "Search", icon: "" },
    { name: "Ecosia", url: "https://www.ecosia.org/search?q={query}", enabled: true, category: "Search", icon: "" },
    { name: "Amazon", url: "https://www.amazon.com/s?k={query}", enabled: true, category: "Bookmarks", icon: "" },
    { name: "GitHub", url: "https://github.com/search?q={query}", enabled: true, category: "Bookmarks", icon: "" },
    { name: "Stack Overflow", url: "https://stackoverflow.com/search?q={query}", enabled: true, category: "Bookmarks", icon: "" },
    { name: "SQL Practice", url: "https://www.sql-practice.com/", enabled: true, category: "Bookmarks", icon: "" },
    { name: "MDN Web Docs", url: "https://developer.mozilla.org/search?q={query}", enabled: true, category: "Bookmarks", icon: "" },
    { name: "CSS-Tricks", url: "https://css-tricks.com/?s={query}", enabled: true, category: "Bookmarks", icon: "" },
    { name: "NPM", url: "https://www.npmjs.com/search?q={query}", enabled: true, category: "Bookmarks", icon: "" },
    { name: "Can I Use", url: "https://caniuse.com/?search={query}", enabled: true, category: "Bookmarks", icon: "" },
    { name: "Trello", url: "https://trello.com/search?q={query}", enabled: true, category: "Bookmarks", icon: "" },
    { name: "Notion", url: "https://www.notion.so/search?q={query}", enabled: true, category: "Bookmarks", icon: "" },
    { name: "Twitter", url: "https://twitter.com/search?q={query}", enabled: true, category: "Social", icon: "" },
    { name: "Reddit", url: "https://www.reddit.com/search?q={query}", enabled: true, category: "Social", icon: "" },
    { name: "Facebook", url: "https://www.facebook.com/search/top/?q={query}", enabled: true, category: "Social", icon: "" },
    { name: "Instagram", url: "https://www.instagram.com/explore/tags/{query}/", enabled: true, category: "Social", icon: "" },
    { name: "LinkedIn", url: "https://www.linkedin.com/search/results/all/?keywords={query}", enabled: true, category: "Social", icon: "" },
    { name: "Pinterest", url: "https://www.pinterest.com/search/pins/?q={query}", enabled: true, category: "Social", icon: "" },
    { name: "TikTok", url: "https://www.tiktok.com/search?q={query}", enabled: true, category: "Social", icon: "" },
    { name: "Tumblr", url: "https://www.tumblr.com/search/{query}", enabled: true, category: "Social", icon: "" },
    { name: "Quora", url: "https://www.quora.com/search?q={query}", enabled: true, category: "Social", icon: "" },
    { name: "Mastodon", url: "https://mastodon.social/search?q={query}", enabled: true, category: "Social", icon: "" },
    { name: "ChatGPT", url: "https://chatgpt.com/?q={query}", enabled: true, category: "AI", icon: "" },
    { name: "Claude", url: "https://claude.ai/chat?q={query}", enabled: true, category: "AI", icon: "" },
    { name: "Gemini", url: "https://gemini.google.com/app", enabled: true, category: "AI", icon: "" },
    { name: "Perplexity", url: "https://www.perplexity.ai/search?q={query}", enabled: true, category: "AI", icon: "" },
    { name: "Midjourney", url: "https://www.midjourney.com/app/", enabled: true, category: "AI", icon: "" },
    { name: "deepseek", url: "https://chat.deepseek.com/", enabled: true, category: "AI", icon: "" },
    { name: "Hugging Face", url: "https://huggingface.co/models?search={query}", enabled: true, category: "AI", icon: "" },
    { name: "Copilot", url: "https://copilot.microsoft.com/", enabled: true, category: "AI", icon: "" },
    { name: "DeepMind", url: "https://www.deepmind.com/", enabled: true, category: "AI", icon: "" },
    { name: "Anthropic", url: "https://www.anthropic.com/", enabled: true, category: "AI", icon: "" }
];

export const DEFAULT_CATEGORIES = {
    "Search": "data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iODAiIGhlaWdodD0iODAiIHZpZXdCb3g9IjAgMCAyNCAyNSIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIiB0cmFuc2Zvcm09InJvdGF0ZSgwIDAgMCkiPgo8cGF0aCBkPSJNMTEuMjQ5OCA1Ljc1MDM3QzEwLjgzNTYgNS43NTAzNyAxMC40OTk4IDYuMDg2MTUgMTAuNDk5OCA2LjUwMDM3QzEwLjQ5OTggNi45MTQ1OCAxMC44MzU2IDcuMjUwMzcgMTEuMjQ5OCA3LjI1MDM3QzEzLjg3NCA3LjI1MDM3IDE2LjAwMTEgOS4zNzcxOCAxNi4wMDExIDEyLjAwMDRDMTYuMDAxMSAxMi40MTQ2IDE2LjMzNjkgMTIuNzUwNCAxNi43NTExIDEyLjc1MDRDMTcuMTY1MyAxMi43NTA0IDE3LjUwMTEgMTIuNDE0NiAxNy41MDExIDEyLjAwMDRDMTcuNTAxMSA4LjU0ODQyIDE0LjcwMjEgNS43NTAzNyAxMS4yNDk4IDUuNzUwMzdaIiBmaWxsPSIjZmZmZmZmIj48L3BhdGg+CjxwYXRoIGZpbGwtcnVsZT0iZXZlbm9kZCIgY2xpcC1ydWxlPSJldmVub2RkIiBkPSJNMiAxMS45OTg5QzIgNi44OTEyNiA2LjE0MTU0IDIuNzUwOTggMTEuMjUgMi43NTA5OEMxNi4zNTg1IDIuNzUwOTggMjAuNSA2Ljg5MTI2IDIwLjUgMTEuOTk4OUMyMC41IDE0LjI4MzYgMTkuNjcxNCAxNi4zNzQ3IDE4LjI5ODMgMTcuOTg4M0wyMS43NzkxIDIxLjQ2OTVDMjIuMDcyIDIxLjc2MjQgMjIuMDcyIDIyLjIzNzIgMjEuNzc5MSAyMi41MzAxQzIxLjQ4NjIgMjIuODIzIDIxLjAxMTMgMjIuODIzIDIwLjcxODQgMjIuNTMwMUwxNy4yMzcyIDE5LjA0ODZDMTUuNjIzNyAyMC40MTk3IDEzLjUzMzQgMjEuMjQ2OSAxMS4yNSAyMS4yNDY5QzYuMTQxNTQgMjEuMjQ2OSAyIDE3LjEwNjYgMiAxMS45OTg5Wk0xMS4yNSA0LjI1MDk4QzYuOTY5NjIgNC4yNTA5OCAzLjUgNy43MjAwMyAzLjUgMTEuOTk4OUMzLjUgMTYuMjc3OSA2Ljk2OTYyIDE5Ljc0NjkgMTEuMjUgMTkuNzQ2OUMxNS41MzA0IDE5Ljc0NjkgMTkgMTYuMjc3OSAxOSAxMS45OTg5QzE5IDcuNzIwMDMgMTUuNTMwNCA0LjI1MDk4IDExLjI1IDQuMjUwOThaIiBmaWxsPSIjZmZmZmZmIj48L3BhdGg+Cjwvc3ZnPg==",
    "Bookmarks": "data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iODAiIGhlaWdodD0iODAiIHZpZXdCb3g9IjAgMCAyNSAyNSIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIiB0cmFuc2Zvcm09InJvdGF0ZSgwIDAgMCkiPgo8cGF0aCBmaWxsLXJ1bGU9ImV2ZW5vZGQiIGNsaXAtcnVsZT0iZXZlbm9kZCIgZD0iTTUgNC40ODI0MkM1IDMuMjM5NzggNi4wMDczNiAyLjIzMjQyIDcuMjUgMi4yMzI0MkgxNy43NUMxOC45OTI2IDIuMjMyNDIgMjAgMy4yMzk3OCAyMCA0LjQ4MjQyVjIxLjQ4MjRDMjAgMjEuNzU5IDE5Ljg0NzggMjIuMDEzMiAxOS42MDM5IDIyLjE0MzdDMTkuMzYgMjIuMjc0MiAxOS4wNjQxIDIyLjI1OTkgMTguODM0IDIyLjEwNjVMMTIuOTE2IDE4LjE2MTJDMTIuNjY0MSAxNy45OTMyIDEyLjMzNTkgMTcuOTkzMiAxMi4wODQgMTguMTYxMkw2LjE2NjAzIDIyLjEwNjVDNS45MzU4OCAyMi4yNTk5IDUuNjM5OTcgMjIuMjc0MiA1LjM5NjExIDIyLjE0MzdDNS4xNTIyNCAyMi4wMTMyIDUgMjEuNzU5IDUgMjEuNDgyNFY0LjQ4MjQyWk03LjI1IDMuNzMyNDJDNi44MzU3OSAzLjczMjQyIDYuNSA0LjA2ODIxIDYuNSA0LjQ4MjQyVjIwLjA4MUwxMS4yNTE5IDE2LjkxMzFDMTIuMDA3NyAxNi40MDkyIDEyLjk5MjMgMTYuNDA5MiAxMy43NDgxIDE2LjkxMzFMMTguNSAyMC4wODFWNC40ODI0MkMxOC41IDQuMDY4MjEgMTguMTY0MiAzLjczMjQyIDE3Ljc1IDMuNzMyNDJINy4yNVoiIGZpbGw9IiNmZmZmZmYiPjwvcGF0aD4KPC9zdmc+",
    "Social": "data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iODAiIGhlaWdodD0iODAiIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIiB0cmFuc2Zvcm09InJvdGF0ZSgwIDAgMCkiPgo8cGF0aCBkPSJNOC44MDQzNyA0LjEwMTU2QzYuNzYyNiA0LjEwMTU2IDUuMTA3NDIgNS43NTY3NCA1LjEwNzQyIDcuNzk4NTFDNS4xMDc0MiA5Ljg0MDI3IDYuNzYyNiAxMS40OTU1IDguODA0MzcgMTEuNDk1NUMxMC44NDYxIDExLjQ5NTUgMTIuNTAxMyA5Ljg0MDI3IDIuNTAxMyA3Ljc5ODUxQzEyLjUwMTMgNS43NTY3NCAxMC44NDYxIDQuMTAxNTYgOC44MDQzNyA0LjEwMTU2WloiIGZpbGw9IiNmZmZmZmYiPjwvcGF0aD4KPHBhdGggZD0iTTEuODUxNzUgMTkuMTZMMS44NTE3MiAxOS4xNTc3TDEuODUxNjUgMTkuMTUxM0wxLjg1MTU2IDE5LjEzMjFDMS44NTE1NiAxOS4xMTY0IDEuODUxNjkgMTkuMDk1MiAxLjg1MjE1IDE5LjA2ODhDMS44NTMwOSAxOS4wMTYgMS40NTUzOCAxOC45NDIxIDEuODYwNjkgMTguODUwMkMxLjg3MTMgMTguNjY2NiAxLjg5NDAyIDE4LjQwOTUgMS45NDI0MiAxOC4xMDMxQzIuMDM4NjYgMTcuNDkzOCAyLjIzOTQ4IDE2LjY2OTggMi42NjMwNCAxNS44MzdDMy4wODg2MiAxNS4wMDAxIDMuNzQ0MTQgMTQuMTQ1MyA0Ljc0NzQzIDEzLjUwMjNDNS43NTM0NCAxMi44NTc2IDcuMDYzODMgMTIuNDU1MSA4Ljc1MDMyIDEyLjQ1NTFDMTAuNDM2OCAxMi40NTUxIDExLjc0NzIgMTIuODU3NiAxMi43NTMyIDEzLjUwMjNDMTMuNzU2NSAxNC4xNDUzIDE0LjQxMiAxNS4wMDAxIDE0LjgzNzYgMTUuODM3QzE1LjI2MTIgMTYuNjY5OCAxNS40NjIgMTcuNDkzOCAxNS41NTgyIDE4LjEwMzFDMTUuNjA2NiAxOC40MDk1IDE1LjYyOTMgMTguNjY2NiAxNS42Mzk5IDE4Ljg1MDJDMTUuNjQ1MyAxOC45NDIxIDE1LjY0NzYgMTkuMDE2IDE1LjY0ODUgMTkuMDY4OEMxNS42NDkgMTkuMDk1MiAxNS42NDkxIDE5LjExNjQgMTUuNjQ5MSAxOS4xMzIxTDE1LjY0OSAxOS4xNTEzTDE1LjY0ODkgMTkuMTU3N0wxNS42NDg5IDE5LjE2MUMxNS42NDE4IDE5LjU3MDEgMTUuMzA4MSAxOS44OTg4IDE0Ljg5OSAxOS44OTg4SDIuNjAxNjdDMi4xOTI1MyAxOS44OTg4IDEuODU4ODggMTkuNTcwOSAxLjg1MTc4IDE5LjE2MThDMS44NTE3OCAxOS4xNjE4IDEuODUxNzkgMTkuMTYyNSAxLjg1MTc1IDE5LjE2WiIgZmlsbD0iI2ZmZmZmZiI+PC9wYXRoPgo8ZyBvcGFjaXR5PSIwLjQiPgo8cGF0aCBkPSJNMTcuMDIwOSAxOS44OTg4QzE3LjA5OTkgMTkuNjc1NiAxNy4xNDQ2IDE5LjQzNjMgMTcuMTQ5IDE5LjE4N0wxNy4xNDkxIDE5LjE3OTlMMTcuMTQ5MyAxOS4xNjc2TDE3LjE0OTQgMTkuMTM4N0wxNy4xNDk0IDE5LjEzMjdDMTcuMTQ5NCAxOS4xMDgzIDE3LjE0OTIgMTkuMDc4IDE3LjE0ODYgMTkuMDQyMkMxNy4xNDczIDE4Ljk3MDggMTcuMTQ0MyAxOC44NzY5IDE3LjEzNzggMTguNzYzN0MxNy4xMjQ3IDE4LjUzOCAxNy4wOTc0IDE4LjIzMTIgMTcuMDQwMiAxNy44NjkxQzE3LjAxMDMgMTcuNjgwMSAxNi45NzE3IDE3LjQ3MiAxNi45MjE1IDE3LjI0OTRDMTYuOTE2NSAxNy4yMjYxIDE2LjkxMTMgMTcuMjAyOCAxNi45MDU4IDE3LjE3OTRDMTYuNjQ0OCAxNi4wNjA3IDE2LjA2NjcgMTQuNDkzMSAxNC43NDk3IDEzLjE4OUMxNC41MTUgMTIuOTU2NyAxNC4yNjI3IDEyLjczODQgMTMuOTkyNCAxMi41MzYzQzE0LjM4NjUgMTIuNDgzMSAxNC44MDU2IDEyLjQ1NTEgMTUuMjUwOSAxMi40NTUxQzE2LjkzNzMgMTIuNDU1MSAxOC4yNDc3IDEyLjg1NzYgMTkuMjUzNyAxMy41MDIzQzIwLjI1NyAxNC4xNDUzIDIwLjkxMjYgMTUuMDAwMSAyMS4zMzgxIDE1LjgzN0MyMS43NjE3IDE2LjY2OTggMjEuOTYyNSAxNy40OTM4IDIyLjA1ODggMTguMTAzMUMyMi4xMDcyIDE4LjQwOTUgMjIuMTI5OSAxOC42NjY2IDIyLjE0MDUgMTguODUwMkMyMi4xNDU4IDE4Ljk0MjEgMjIuMTQ4MSAxOS4wMTYgMjIuMTQ5IDE5LjA2ODhDMjIuMTQ5NSAxOS4wOTUyIDIyLjE0OTYgMTkuMTE2NCAyMi4xNDk2IDE5LjEzMjFMMjIuMTQ5NSAxOS4xNTEzTDIyLjE0OTUgMTkuMTU3N0wyMi4xNDk0IDE5LjE2MUMyMi4xNDIzIDE5LjU3MDEgMjEuODA4NiAxOS44OTg4IDIxLjM5OTUgMTkuODk4OEgxNy4wMjA5WiIgZmlsbD0iI2ZmZmZmZiI+PC9wYXRoPgo8cGF0aCBkPSJNMTQuMDAyOCA3Ljc5ODUxQzE0LjAwMjggOC44OTU5NSAxMy42NjI3IDkuOTEzOTQgMTMuMDgyIDEwLjc1MjhDMTMuNzAwNyAxMS4yMTkgMTQuNDcwNSAxMS40OTU1IDE1LjMwNDkgMTEuNDk1NUMxNy4zNDY3IDExLjQ5NTUgMTkuMDAxOCA5Ljg0MDI3IDE5LjAwMTggNy43OTg1MUMxOS4wMDE4IDUuNzU2NzQgMTcuMzQ2NyA0LjEwMTU2IDE1LjMwNDkgNC4xMDE1NkMxNC40NzA1IDQuMTAxNTYgMTMuNzAwNyA0LjM3Nzk3IDEzLjA4MiA0Ljg0NDIyQzEzLjY2MjcgNS42ODMwNyAxNC4wMDI4IDYuNzAxMDYgMTQuMDAyOCA3Ljc5ODUxWiIgZmlsbD0iI2ZmZmZmZiI+PC9wYXRoPgo8L2c+Cjwvc3ZnPg==",
    "AI": "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAEAAAABACAYAAACqaXHeAAAACXBIWXMAAAsTAAALEwEAmpwYAAACwUlEQVR4nO3aT6hUVRgA8I9HiEREi4cgIiFhSDwEkXBXhCThRhetok3b2rQSDKEWgiKikouCCKRA3KSIIm2iFpUELapnbSVaJFiRf1JTez85zECP533jzNwz8+65M7/9zL3fx/nzne/ciKmpqVHDU5iLSYSPsKDjKtbEpMBmD/sqJgW+qEjAf3gy2g6rcV+149F2OGR5f0fb4U+9vRpthVc82s/RVvhFfzZF22Cb/n0TbYNfDeaFaAu8a3CpOpyJ0mFLt8gZxtkoGWZxQz0Ho0RYi7/ksTdKgq24Ka8PogR4p8acf5T5xh6bdfb5y0bvHg40ZofAdlwyfv/gCFatVOBv4jcrL42IC9gwjqAf72a97tY2Cgvds8aOUQX/ejfbJbg4igTcUpa3cyegNCdzJ+CqsuweRSv7d82XGq5HsgZfse//oHnSGvVpum2KccB6nO7R4h6XK9gzlqCrpMsMfIy7Yw48VZ8vRVNgFT5ZdN83Kqn63BZNhTn8MYLAF4ppjuAxfJcx+H/xYpQGn2cI/jaei1KpNxLS2WNLlExnOgxbRb4WbYBNQ7TJzkSb4MSA8351zefNpAIJz0cT6LxQCqwftSs7fNb9r1SpzkYT4Fgfwd/IVJQtbt6ciCbw8ItVOZzhOR9W1BG1plQ2ONcj+HsZ5v4TyyS5MaPg6R7nhfMZ/j9dnlRJz9weTYCflnnJZ2r+7ym9pUX42XyRDCm1ritebr5msfWt/qRj+85YafhyySI1VL2PN3Dd4C5iXf7IBoCX8VZauIb47b4M1+9pXfgaG6MkOCivW1ESvJ85AXeiNDjavSGuOwV+LPrIrfNBRr9njMW+r7vtNka3xE6rer/b4K5oI52LkeYXQivUglsosrE65HS4U5GAozEp8N6S4G825qOqcVnyneL+mDT+HwXX0mEpJpHO57qTNfSnpiKLB6JuLo4G4gDlAAAAAElFTkSuQmCC"
};
