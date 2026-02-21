import { DEFAULT_PROVIDERS, DEFAULT_CATEGORIES, DEFAULT_APPEARANCE } from '../../shared/constants.js';

let currentQuery = '';
let currentCategory = 'Unsorted';
let savedScrollPosition = 0;
let wheelTimeout;
let selectedIndex = -1; // -1 = no keyboard selection active

document.addEventListener('DOMContentLoaded', () => {
    window.electronAPI.onSelectedText((text) => {
        currentQuery = text;
        savedScrollPosition = 0; // Always start from the first category
        selectedIndex = -1;      // No keyboard selection until user presses an arrow key

        // Reset to first available category if needed, respecting settings
        const { activeCategories } = getFilteredData();

        if (!activeCategories.includes(currentCategory)) {
            currentCategory = activeCategories[0] || 'Unsorted';
        }

        applyTheme();
        renderPopup();
    });

    // Add context menu listener
    document.addEventListener('contextmenu', (e) => {
        e.preventDefault();
        window.electronAPI.showPopupContextMenu();
    });
});

function getCategories() {
    return JSON.parse(localStorage.getItem('searchCategories') || JSON.stringify(DEFAULT_CATEGORIES));
}

function getProviders() {
    return JSON.parse(localStorage.getItem('searchProviders') || JSON.stringify(DEFAULT_PROVIDERS));
}

/**
 * Centrally managed filtering logic for providers and categories
 * Respects 'showUnsorted' and 'enabled' flags
 */
function getFilteredData() {
    const showUnsorted = localStorage.getItem('showUnsorted') !== 'false';
    const allProviders = getProviders();
    const enabledProviders = allProviders.filter(p => p.enabled);

    const filteredProviders = enabledProviders.filter(p => {
        const cat = p.category || 'Unsorted';
        return showUnsorted || cat !== 'Unsorted';
    });

    // Get Master Categories from settings to preserve order
    const masterCats = Object.keys(getCategories());
    const usedCats = new Set(filteredProviders.map(p => p.category || 'Unsorted'));

    // Filter master list to only used ones, then add Unsorted if it exists but wasn't in master
    const activeCategories = masterCats.filter(cat => usedCats.has(cat));
    if (usedCats.has('Unsorted') && !activeCategories.includes('Unsorted')) {
        activeCategories.push('Unsorted');
    }

    return { filteredProviders, activeCategories };
}

function applyTheme() {
    const s = {
        fontWeight: localStorage.getItem('fontWeight') || '500',
        fontColor: localStorage.getItem('fontColor'),
        bgColor: localStorage.getItem('bgColor'),
        accentColor: localStorage.getItem('accentColor'),
        tabActiveBg: localStorage.getItem('tabActiveBg'),
        iconSize: parseInt(localStorage.getItem('iconSize') || DEFAULT_APPEARANCE.iconSize),
        iconsPerRow: parseInt(localStorage.getItem('iconsPerRow') || DEFAULT_APPEARANCE.iconsPerRow),
        gridGapX: parseInt(localStorage.getItem('gridGapX') || DEFAULT_APPEARANCE.gridGapX),
        gridGapY: parseInt(localStorage.getItem('gridGapY') || DEFAULT_APPEARANCE.gridGapY)
    };

    const root = document.documentElement;
    root.style.setProperty('--popup-font-weight', s.fontWeight);

    if (s.fontColor) {
        root.style.setProperty('--label-color', s.fontColor);
        root.style.setProperty('--popup-text', s.fontColor);
    }
    if (s.bgColor) root.style.setProperty('--popup-bg', s.bgColor);

    if (s.accentColor) {
        root.style.setProperty('--tab-indicator', s.accentColor);
        root.style.setProperty('--accent-color', s.accentColor);
        const glowColor = s.accentColor.startsWith('#') ? `${s.accentColor}33` : 'rgba(255, 255, 255, 0.1)';
        root.style.setProperty('--shadow', `0 10px 40px rgba(0, 0, 0, 0.6), 0 0 20px ${glowColor}`);
    }

    if (s.tabActiveBg) root.style.setProperty('--tab-active-bg', s.tabActiveBg);

    const wrapperPadding = 12;
    const wrapperSize = s.iconSize + wrapperPadding;

    root.style.setProperty('--grid-gap-x', `${s.gridGapX}px`);
    root.style.setProperty('--grid-gap-y', `${s.gridGapY}px`);
    root.style.setProperty('--wrapper-size', `${wrapperSize}px`);

    let maxWidth = (wrapperSize * s.iconsPerRow) + (s.gridGapX * (s.iconsPerRow - 1)) + 32;
    root.style.setProperty('--popup-max-width', `${maxWidth}px`);
}

/**
 * Update the keyboard-focused icon.
 * Clears old .focused, applies it to the new index, scrolls into view.
 * Also syncs selectedIndex so Enter always knows which icon to launch.
 */
function setSelectedIndex(newIndex) {
    const grid = document.querySelector('.icon-grid');
    if (!grid) return;
    const wrappers = [...grid.querySelectorAll('.provider-icon-wrapper')];
    const count = wrappers.length;
    if (count === 0) return;

    const clamped = Math.max(0, Math.min(newIndex, count - 1));
    wrappers.forEach((w, i) => w.classList.toggle('focused', i === clamped));
    selectedIndex = clamped;
    wrappers[clamped]?.scrollIntoView({ block: 'nearest', inline: 'nearest' });
}

function updateIconGrid() {
    const providers = getProviders();
    const enabledProviders = providers.filter(p => p.enabled);
    const iconSize = parseInt(localStorage.getItem('iconSize') || '32');

    const root = document.documentElement;
    const maxWidthStr = root.style.getPropertyValue('--popup-max-width') || '400px';
    const maxWidth = parseInt(maxWidthStr);

    const container = document.getElementById('icons-container');
    if (!container) return;

    // Find existing grid
    let grid = container.querySelector('.icon-grid');
    if (!grid) return; // Grid doesn't exist yet

    // Update widths
    grid.style.maxWidth = `${maxWidth}px`;
    grid.style.width = 'max-content';
    const tabsWrapper = container.querySelector('.category-tabs-wrapper');
    if (tabsWrapper) tabsWrapper.style.maxWidth = `${maxWidth}px`;

    // Clear and rebuild grid with current category
    grid.innerHTML = '';

    const { filteredProviders } = getFilteredData();

    filteredProviders
        .filter(p => (p.category || 'Unsorted') === currentCategory)
        .forEach((provider, i) => {
            const iconContainer = document.createElement('div');
            iconContainer.className = 'provider-icon-wrapper';
            iconContainer.setAttribute('data-tooltip', provider.name);

            const img = document.createElement('img');
            img.src = provider.icon ? toImageSrc(provider.icon) : getFaviconUrl(provider.url);
            img.className = 'provider-icon';
            img.style.width = `${iconSize}px`;
            img.style.height = `${iconSize}px`;

            // Error handling for icons to prevent blank spots
            img.onerror = () => {
                // Retry via IPC for local paths blocked by cross-origin policy in dev mode
                if (/^[a-zA-Z]:[\\/]/.test(provider.icon || '') && window.electronAPI?.readLocalIcon) {
                    window.electronAPI.readLocalIcon(provider.icon).then(dataUrl => {
                        if (dataUrl) img.src = dataUrl;
                        else img.src = `data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 24 24%22><text y=%2218%22 font-size=%2218%22>${provider.name[0]}</text></svg>`;
                    });
                } else {
                    img.src = `data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 24 24%22><text y=%2218%22 font-size=%2218%22>${provider.name[0]}</text></svg>`;
                }
            };

            img.onclick = () => {
                window.electronAPI.search(provider.url, currentQuery, provider.type);
            };

            // Middle click support
            img.onmousedown = (e) => {
                if (e.button === 1) {
                    e.preventDefault();
                    window.electronAPI.copyAndSearch(provider.url, currentQuery, provider.type);
                }
            };

            // Mouse hover syncs the keyboard selection index (both methods stay in sync)
            iconContainer.addEventListener('mouseenter', () => {
                setSelectedIndex(i);
            });

            iconContainer.appendChild(img);
            grid.appendChild(iconContainer);
        });

    // Restore focused highlight after grid rebuild
    if (selectedIndex >= 0) {
        const wrappers = grid.querySelectorAll('.provider-icon-wrapper');
        if (wrappers[selectedIndex]) wrappers[selectedIndex].classList.add('focused');
    }

    // Resize after grid is updated (in case content height changed)
    requestAnimationFrame(() => {
        resizePopup();
        // Force a second resize after a brief moment to catch any late layout changes or image rendering
        setTimeout(resizePopup, 50);
    });
}

function resizePopup() {
    const wrapper = document.getElementById('main-wrapper');
    if (wrapper && window.electronAPI && window.electronAPI.resizePopup) {
        // Use offsetWidth/Height to get precise measurements including padding
        const width = wrapper.offsetWidth;
        const height = wrapper.offsetHeight;
        window.electronAPI.resizePopup(width, height);
    }
}

function updateCategoryLabel() {
    const label = document.getElementById('category-name-label');
    if (label) {
        label.textContent = currentCategory;
    }
}

function renderPopup() {
    const categories = getCategories();
    const { filteredProviders, activeCategories } = getFilteredData();
    const iconSize = parseInt(localStorage.getItem('iconSize') || '32');

    const container = document.getElementById('icons-container');
    if (!container) return;

    // Save current scroll position before clearing
    const existingTabs = container.querySelector('.category-tabs');
    if (existingTabs) {
        savedScrollPosition = existingTabs.scrollLeft;
    }

    container.innerHTML = '';

    // Use calculated maxWidth from root
    const maxWidth = parseInt(document.documentElement.style.getPropertyValue('--popup-max-width')) || 400;

    // 0. Search Bar
    const searchContainer = document.createElement('div');
    searchContainer.className = 'search-container';

    const searchInput = document.createElement('input');
    searchInput.type = 'text';
    searchInput.id = 'search-input';
    searchInput.placeholder = 'Pop Search...';
    searchInput.value = currentQuery;

    searchInput.oninput = (e) => {
        currentQuery = e.target.value;
        selectedIndex = 0; // Reset to first icon on every keystroke
        updateIconGrid();
    };

    // ─── Keyboard Navigation ───────────────────────────────────────────────
    searchInput.onkeydown = (e) => {
        const grid = document.querySelector('.icon-grid');
        const wrappers = grid ? [...grid.querySelectorAll('.provider-icon-wrapper')] : [];
        const count = wrappers.length;
        if (count === 0) return;

        const iconsPerRow = parseInt(getComputedStyle(document.documentElement)
            .getPropertyValue('--popup-max-width')) || 8;
        // Measure actual icons per row from the DOM
        const firstTop = wrappers[0]?.getBoundingClientRect().top;
        const rowCount = wrappers.filter(w => w.getBoundingClientRect().top === firstTop).length || 1;

        if (e.key === 'ArrowRight') {
            e.preventDefault();
            setSelectedIndex(selectedIndex < 0 ? 0 : (selectedIndex + 1) % count);
        } else if (e.key === 'ArrowLeft') {
            e.preventDefault();
            setSelectedIndex(selectedIndex <= 0 ? count - 1 : selectedIndex - 1);
        } else if (e.key === 'ArrowDown') {
            e.preventDefault();
            const next = selectedIndex < 0 ? 0 : selectedIndex + rowCount;
            setSelectedIndex(next < count ? next : selectedIndex); // Don't wrap on down
        } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            const prev = selectedIndex - rowCount;
            setSelectedIndex(prev >= 0 ? prev : selectedIndex); // Don't wrap on up
        } else if (e.key === 'Tab') {
            e.preventDefault();
            const { activeCategories } = getFilteredData();
            const idx = activeCategories.indexOf(currentCategory);
            if (e.shiftKey) {
                currentCategory = activeCategories[(idx - 1 + activeCategories.length) % activeCategories.length];
            } else {
                currentCategory = activeCategories[(idx + 1) % activeCategories.length];
            }
            selectedIndex = 0;
            updateIconGrid();
            updateCategoryLabel();
            // Sync active tab highlight
            document.querySelectorAll('.category-tab').forEach(tab => {
                tab.classList.toggle('active', tab.dataset.cat === currentCategory);
            });
        } else if (e.key === 'Enter') {
            const { filteredProviders } = getFilteredData();
            const catProviders = filteredProviders.filter(p => (p.category || 'Unsorted') === currentCategory);
            // Use focused icon if one is selected, otherwise launch first provider
            const targetIndex = selectedIndex >= 0 && selectedIndex < catProviders.length ? selectedIndex : 0;
            const provider = catProviders[targetIndex];
            if (provider) window.electronAPI.search(provider.url, currentQuery, provider.type);
        } else if (e.key === 'Escape') {
            window.electronAPI.search('', '', ''); // Close popup
        }
    };

    searchContainer.appendChild(searchInput);
    container.appendChild(searchContainer);

    // Auto-focus the search bar
    requestAnimationFrame(() => {
        setTimeout(() => searchInput.focus(), 50);
    });

    // Shared wheel event handler for category switching
    const handleWheelEvent = (e) => {
        if (activeCategories.length <= 1) return;
        e.preventDefault();
        clearTimeout(wheelTimeout);

        // deadzone to prevent accidental triggers on sensitive wheels/trackpads
        if (Math.abs(e.deltaY) < 5 && Math.abs(e.deltaX) < 5) return;

        wheelTimeout = setTimeout(() => {
            const categoryTabs = Array.from(container.querySelectorAll('.category-tab'));
            const currentIndex = categoryTabs.findIndex(t => t.title === currentCategory);

            // Use deltaY primarily, fallback to deltaX for horizontal-only scrolling
            const delta = Math.abs(e.deltaY) >= Math.abs(e.deltaX) ? e.deltaY : e.deltaX;

            if (delta > 0 && currentIndex < categoryTabs.length - 1) {
                categoryTabs[currentIndex + 1].click();
            } else if (delta < 0 && currentIndex > 0) {
                categoryTabs[currentIndex - 1].click();
            }
        }, 40); // 40ms debounce
    };

    // 1. Category Bar
    if (activeCategories.length > 1) {
        const wrapper = document.createElement('div');
        wrapper.className = 'category-tabs-wrapper';

        // Set max-width to match icon grid
        wrapper.style.maxWidth = `${maxWidth}px`;

        const tabs = document.createElement('div');
        tabs.className = 'category-tabs';

        activeCategories.forEach(cat => {
            const tab = document.createElement('div');
            tab.className = `category-tab ${cat === currentCategory ? 'active' : ''}`;
            let icon = categories[cat];
            if (!icon) {
                icon = cat === 'Unsorted' ? '🔴' : '❓';
            }

            if (isImageSource(icon)) {
                const iconImg = document.createElement('img');
                iconImg.src = toImageSrc(icon);
                iconImg.style.width = '18px';
                iconImg.style.height = '18px';
                iconImg.style.objectFit = 'contain';
                // IPC fallback for local paths in dev mode
                iconImg.onerror = () => {
                    if (/^[a-zA-Z]:[\\/]/.test(icon) && window.electronAPI?.readLocalIcon) {
                        window.electronAPI.readLocalIcon(icon).then(dataUrl => {
                            if (dataUrl) iconImg.src = dataUrl;
                        });
                    }
                };
                tab.appendChild(iconImg);
            } else {
                tab.textContent = icon;
            }

            tab.title = cat;
            tab.dataset.cat = cat; // Used by Tab-key handler to sync active class
            tab.onclick = (e) => {
                e.stopPropagation();
                if (cat === currentCategory) return;

                currentCategory = cat;

                // Update tab styles
                tabs.querySelectorAll('.category-tab').forEach(t => {
                    t.classList.toggle('active', t.title === currentCategory);
                });

                // Scroll the clicked tab to the start (edge)
                tab.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'start' });

                updateCategoryLabel();
                updateIconGrid();
            };
            tabs.appendChild(tab);
        });


        const label = document.createElement('div');
        label.id = 'category-name-label';
        label.textContent = currentCategory;
        wrapper.appendChild(label);

        wrapper.appendChild(tabs);
        container.appendChild(wrapper);
    }

    // 2. Icon Grid
    const grid = document.createElement('div');
    grid.className = 'icon-grid';
    grid.style.maxWidth = `${maxWidth}px`;
    grid.style.width = 'max-content';

    // Add global wheel support for category switching
    if (activeCategories.length > 1) {
        container.addEventListener('wheel', handleWheelEvent, { passive: false });
    }

    container.appendChild(grid);

    // Initial grid render
    updateIconGrid();

    // Restore scroll position
    if (activeCategories.length > 1) {
        setTimeout(() => {
            const tabs = container.querySelector('.category-tabs');
            if (tabs) {
                tabs.scrollLeft = savedScrollPosition;
            }
        }, 50);
    }
}

function isImageSource(str) {
    if (!str) return false;
    const s = str.trim();
    return s.startsWith('http') ||
        s.startsWith('data:image') ||
        s.startsWith('./') ||
        s.startsWith('../') ||
        s.startsWith('file://') ||
        /^[a-zA-Z]:[\\/]/.test(s); // Windows absolute path
}

/**
 * Converts a local Windows file path to a valid file:// URL for use in <img> src.
 * Passes through all other sources unchanged.
 */
function toImageSrc(str) {
    if (!str) return str;
    const s = str.trim();
    if (/^[a-zA-Z]:[\\/]/.test(s)) {
        return 'file:///' + s.replace(/\\/g, '/');
    }
    return s;
}

function getFaviconUrl(url) {
    try {
        // Strip common placeholders to extract valid domain
        const cleanUrl = url.replace(/{query}|%s|{{searchTerms}}/g, '');
        const domain = new URL(cleanUrl).hostname;
        return `https://www.google.com/s2/favicons?sz=64&domain=${domain}`;
    } catch {
        return '';
    }
}
