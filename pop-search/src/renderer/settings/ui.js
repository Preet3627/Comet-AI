import { Store } from './store';
import { DEFAULT_APPEARANCE } from '../../shared/constants';

let providers = Store.getProviders();
let categories = Store.getCategories();
let editingIndex = -1;
let editingCatName = null;
let searchQuery = '';

export function initUI() {
    const log = (msg) => {
        console.log(`[Settings UI] ${msg}`);
        if (window.electronAPI) window.electronAPI.logToTerminal(msg);
    };

    log('Initializing Settings UI...');

    try {
        // 1. Load Data
        let settings;
        try {
            settings = Store.getAppearance();
            providers = Store.getProviders();
            categories = Store.getCategories();
            log('Data loaded successfully.');
        } catch (e) {
            log(`CRITICAL: Data load failed: ${e.message}`);
            settings = DEFAULT_APPEARANCE;
        }

        // 2. Map Appearance to DOM (Individual Failure Protection)
        const mapSetting = (id, value) => {
            const el = document.getElementById(id);
            if (el) el.value = value;
            else console.warn(`Element not found: ${id}`);
        };

        try {
            mapSetting('iconSize', settings.iconSize);
            mapSetting('iconsPerRow', settings.iconsPerRow);
            mapSetting('gridGapX', settings.gridGapX || DEFAULT_APPEARANCE.gridGapX);
            mapSetting('gridGapY', settings.gridGapY || DEFAULT_APPEARANCE.gridGapY);
            mapSetting('fontWeight', settings.fontWeight || DEFAULT_APPEARANCE.fontWeight);
            mapSetting('fontColor', settings.fontColor || DEFAULT_APPEARANCE.fontColor);
            mapSetting('bgColor', settings.bgColor || DEFAULT_APPEARANCE.bgColor);
            mapSetting('accentColor', settings.accentColor || DEFAULT_APPEARANCE.accentColor);
            mapSetting('tabActiveBg', settings.tabActiveBg || DEFAULT_APPEARANCE.tabActiveBg);
            log('Appearance settings mapped to DOM.');
        } catch (e) { log(`Error mapping appearance: ${e.message}`); }

        // 3. Update Previews
        try {
            updateColorPreview('fontColor', 'fontColorPreview');
            updateColorPreview('bgColor', 'bgColorPreview');
            updateColorPreview('accentColor', 'accentColorPreview');
            updateColorPreview('tabActiveBg', 'tabActiveBgPreview');
        } catch (e) { log(`Error updating previews: ${e.message}`); }

        // 4. Setup Listeners (The "Broken Input" Suspect)
        const saveSilently = () => saveAppearance(true);

        try {
            ['fontColor', 'bgColor', 'accentColor', 'tabActiveBg'].forEach(id => {
                const el = document.getElementById(id);
                if (el) {
                    el.addEventListener('input', () => {
                        updateColorPreview(id, id + 'Preview');
                        saveSilently();
                    });
                }
            });

            ['iconSize', 'iconsPerRow', 'gridGapX', 'gridGapY', 'fontWeight'].forEach(id => {
                const el = document.getElementById(id);
                if (el) el.addEventListener('change', saveSilently);
            });
            log('Appearance listeners attached.');
        } catch (e) { log(`Error attaching appearance listeners: ${e.message}`); }

        // 5. Build UI Elements
        try {
            applyTheme('dark');
            updateCategorySelects();
            renderProviders();
            renderCategories();
            log('UI Elements rendered (Providers/Categories).');
        } catch (e) { log(`Error rendering UI elements: ${e.message}`); }

        // 6. Setup Toggles and Specialized Elements
        try {
            const setupToggle = (id, initialState, callback) => {
                const el = document.getElementById(id);
                if (!el) return;
                el.classList.toggle('active', initialState);
                el.onclick = () => {
                    const isActive = el.classList.toggle('active');
                    if (callback) callback(isActive);
                    saveAppearance(true);
                };
            };

            setupToggle('toggleUnsortedBtn', settings.showUnsorted !== false, null);

            const openLogBtn = document.getElementById('openLogBtn');
            if (openLogBtn) {
                openLogBtn.addEventListener('click', () => {
                    log('Open Log File button clicked');
                    if (window.electronAPI && window.electronAPI.openLogFile) {
                        window.electronAPI.openLogFile();
                    }
                });
            }
            log('Toggles and buttons initialized.');
        } catch (e) { log(`Error setting up toggles: ${e.message}`); }

        // 7. Input Pad and Search Logic (Critical for "Broken Type")
        try {
            const bulkPad = document.getElementById('bulkImportPad');
            if (bulkPad) {
                bulkPad.addEventListener('input', () => {
                    const items = parseBulkImport(bulkPad.value);
                    renderBulkPreview(items);
                });
            }

            const providerSearch = document.getElementById('providerSearch');
            if (providerSearch) {
                providerSearch.addEventListener('input', (e) => {
                    searchQuery = e.target.value.toLowerCase().trim();
                    renderProviders();
                });
            }
            log('Search and Bulk handlers attached.');
        } catch (e) { log(`Error attaching input handlers: ${e.message}`); }

        log('Settings UI Initialized successfully.');
    } catch (err) {
        log(`FATAL: Settings UI failed to initialize: ${err.message}`);
    }
}

export function applyTheme() {
    document.documentElement.classList.add('dark-mode');
}

export function showToast(message, type = 'info') {
    const toast = document.getElementById('toast');
    if (!toast) return;

    toast.textContent = message;
    toast.className = `visible ${type}`;

    setTimeout(() => {
        toast.className = '';
    }, 3000);
}

/**
 * Custom non-blocking modal system
 * @param {string} message 
 * @param {object} options { title, confirmText, cancelText, showCancel }
 * @returns {Promise<boolean>}
 */
export function showModal(message, options = {}) {
    const {
        title = 'Confirm Action',
        confirmText = 'Confirm',
        cancelText = 'Cancel',
        showCancel = true
    } = options;

    return new Promise((resolve) => {
        const overlay = document.getElementById('modalOverlay');
        const titleEl = document.getElementById('modalTitle');
        const msgEl = document.getElementById('modalMessage');
        const confirmBtn = document.getElementById('modalConfirm');
        const cancelBtn = document.getElementById('modalCancel');

        if (!overlay || !titleEl || !msgEl || !confirmBtn || !cancelBtn) {
            console.error('Modal elements missing');
            resolve(confirm(message)); // Fallback
            return;
        }

        titleEl.textContent = title;
        msgEl.textContent = message;
        confirmBtn.textContent = confirmText;
        cancelBtn.textContent = cancelText;
        cancelBtn.style.display = showCancel ? 'inline-flex' : 'none';

        overlay.classList.add('active');

        const cleanup = (result) => {
            overlay.classList.remove('active');
            confirmBtn.onclick = null;
            cancelBtn.onclick = null;
            resolve(result);
        };

        confirmBtn.onclick = () => cleanup(true);
        cancelBtn.onclick = () => cleanup(false);

        // Also allow closing by clicking overlay
        overlay.onclick = (e) => {
            if (e.target === overlay && showCancel) cleanup(false);
        };
    });
}


function updateCategorySelects() {
    const select = document.getElementById('providerCategory');
    if (!select) return;
    const currentVal = select.value;
    select.innerHTML = '<option value="">Default (Unsorted)</option>';
    Object.keys(categories).forEach(cat => {
        if (cat === 'Unsorted') return;
        const opt = document.createElement('option');
        opt.value = cat;
        opt.textContent = cat;
        select.appendChild(opt);
    });

    // Safety check: if current value no longer exists, default to ""
    if (categories[currentVal] || currentVal === "") {
        select.value = currentVal;
    } else {
        select.value = "";
    }
}

export function renderCategories() {
    const container = document.getElementById('categories');
    if (!container) return;
    container.innerHTML = '';

    Object.entries(categories).forEach(([name, icon]) => {
        const div = document.createElement('div');
        div.className = 'search-provider'; // Reuse styling

        div.innerHTML = `
            <div class="provider-info" style="flex-grow: 1;">
                <div style="font-weight: bold;">${name}</div>
            </div>
            <button class="edit-btn" onclick="window.ui.editCategory('${name}')">Edit</button>
            <button class="remove-btn" onclick="window.ui.removeCategory('${name}')">Remove</button>
        `;

        if (isImageSource(icon)) {
            const img = document.createElement('img');
            img.src = toImageSrc(icon);
            img.style.width = '24px';
            img.style.height = '24px';
            img.style.objectFit = 'contain';
            img.style.marginRight = '15px';
            img.style.borderRadius = '4px';
            // IPC fallback for local paths blocked by cross-origin policy in dev mode
            img.onerror = () => {
                if (/^[a-zA-Z]:[\\/]/.test(icon) && window.electronAPI?.readLocalIcon) {
                    window.electronAPI.readLocalIcon(icon).then(dataUrl => {
                        if (dataUrl) img.src = dataUrl;
                    });
                }
            };
            div.prepend(img);
        } else {
            const iconDiv = document.createElement('div');
            iconDiv.style.fontSize = '24px';
            iconDiv.style.marginRight = '15px';
            iconDiv.textContent = icon;
            div.prepend(iconDiv);
        }
        div.draggable = true;
        div.dataset.catName = name; // Used by drag handler
        setupCategoryDrag(div, name);
        container.appendChild(div);
    });
}

export function editCategory(name) {
    editingCatName = name;
    document.getElementById('catName').value = name;
    document.getElementById('catIcon').value = categories[name];
    updateIconPreview('catIcon', 'catIconPreview');
    updateGetIconLink('cat');
    document.getElementById('categoryFormTitle').textContent = 'Edit Category';
    document.getElementById('saveCatBtn').textContent = 'Save Changes';
    document.getElementById('cancelCatBtn').style.display = 'inline-block';
    toggleAddSection('catAddSection', true);
    document.querySelector('#categories-list .add-section').scrollIntoView({ behavior: 'smooth' });
}

export async function saveCategory() {
    const name = document.getElementById('catName').value.trim();
    let icon = document.getElementById('catIcon').value.trim();

    if (!name || !icon) {
        await showModal('Please fill in both Name and Icon', { title: 'Missing Info', showCancel: false });
        return;
    }

    if (editingCatName && editingCatName !== name) {
        delete categories[editingCatName];
        // Relink all providers to the new category name
        providers.forEach(p => {
            if (p.category === editingCatName) p.category = name;
        });
        Store.saveProviders(providers);
    }

    categories[name] = icon;
    Store.saveCategories(categories);
    renderCategories();
    updateCategorySelects();
    cancelCatEdit();
}

export function cancelCatEdit() {
    editingCatName = null;
    document.getElementById('catName').value = '';
    document.getElementById('catIcon').value = '';
    updateIconPreview('catIcon', 'catIconPreview');
    updateGetIconLink('cat');
    document.getElementById('categoryFormTitle').textContent = 'Add Category';
    document.getElementById('saveCatBtn').textContent = 'Save Category';
    document.getElementById('cancelCatBtn').style.display = 'none';

    toggleAddSection('catAddSection', false);
}

export function removeCategory(name) {
    if (Object.keys(categories).length <= 1) return alert('Must have at least one category.');
    if (confirm(`Remove category "${name}"? Providers in this category will move to "Unsorted".`)) {
        // State cleanup: If we are currently editing this category, cancel the edit first
        if (editingCatName === name) {
            cancelCatEdit();
        }

        delete categories[name];
        // Relink providers
        providers.forEach(p => {
            if (p.category === name || !p.category || p.category === "General") {
                p.category = "";
            }
        });

        Store.saveCategories(categories);
        Store.saveProviders(providers);

        renderCategories();
        renderProviders();
        updateCategorySelects();
        showToast(`Category "${name}" removed.`, 'info');
    }
}

export async function searchIcons8() {
    const name = document.getElementById('catName').value.trim();
    if (!name) {
        await showModal('Please enter a category name first.', { title: 'Missing Info', showCancel: false });
        return;
    }
    const url = `https://icons8.com/icons/set/${encodeURIComponent(name)}`;
    window.bridge.openExternal(url);
}

export async function searchProviderIcons8() {
    const name = document.getElementById('providerName').value.trim();
    if (!name) {
        await showModal('Please enter a provider name first.', { title: 'Missing Info', showCancel: false });
        return;
    }
    const url = `https://icons8.com/icons/set/${encodeURIComponent(name)}`;
    window.bridge.openExternal(url);
}


export function renderProviders() {
    const container = document.getElementById('providers');
    if (!container) return;
    container.innerHTML = '';

    const filteredProviders = providers.filter(p => {
        if (!searchQuery) return true;

        // Category-specific search (#category)
        if (searchQuery.startsWith('#')) {
            const catQuery = searchQuery.slice(1).trim().toLowerCase();
            if (!catQuery) return true; // Show all if just "#"

            // Special Keyword: #nil or #none to find ungrouped items
            if (catQuery === 'nil' || catQuery === 'none') {
                const cat = (p.category || 'Unsorted').toLowerCase();
                return cat === 'unsorted' || cat === 'none';
            }

            return (p.category || 'Unsorted').toLowerCase().includes(catQuery);
        }

        const nameMatch = p.name.toLowerCase().includes(searchQuery);
        const urlMatch = p.url.toLowerCase().includes(searchQuery);
        const catMatch = (p.category || 'Unsorted').toLowerCase().includes(searchQuery);

        // Simple fuzzy search: check if characters of searchQuery appear in sequence in provider name
        const fuzzyMatch = (str, query) => {
            let i = 0, j = 0;
            while (i < str.length && j < query.length) {
                if (str[i].toLowerCase() === query[j]) j++;
                i++;
            }
            return j === query.length;
        };

        return nameMatch || urlMatch || catMatch || fuzzyMatch(p.name, searchQuery);
    });

    filteredProviders.forEach((provider) => {
        // Find original index for actions
        const originalIndex = providers.findIndex(p => p === provider);

        const div = document.createElement('div');
        div.className = 'search-provider';
        div.draggable = !searchQuery; // Disable drag during search to prevent confusion
        div.dataset.index = originalIndex;

        const favicon = provider.icon ? toImageSrc(provider.icon) : getFaviconUrl(provider.url);
        const catName = provider.category || 'Unsorted';
        const iconValue = categories[catName] || (catName === 'Unsorted' ? '🔴' : '🔍');

        let catIconHtml = '';
        if (isImageSource(iconValue)) {
            catIconHtml = `<img src="${iconValue}" style="width: 12px; height: 12px; object-fit: contain; vertical-align: middle;">`;
        } else {
            catIconHtml = iconValue;
        }

        const row = document.createElement('div');
        row.style.display = 'flex';
        row.style.alignItems = 'center';
        row.style.gap = '12px';
        row.style.width = '100%';

        const img = document.createElement('img');
        img.src = favicon;
        img.className = 'favicon';
        img.onerror = () => {
            // If a local path fails (e.g., cross-origin in dev mode), retry via IPC
            if (/^[a-zA-Z]:[\\/]/.test(provider.icon || '') && window.electronAPI?.readLocalIcon) {
                window.electronAPI.readLocalIcon(provider.icon).then(dataUrl => {
                    if (dataUrl) img.src = dataUrl;
                    else img.src = `data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 24 24%22><text y=%2218%22 font-size=%2218%22>${provider.name[0]}</text></svg>`;
                });
            } else {
                img.src = `data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 24 24%22><text y=%2218%22 font-size=%2218%22>${provider.name[0]}</text></svg>`;
            }
        };

        const currentCatIcon = categories[catName] || (catName === 'Unsorted' ? '🔴' : '🔍');

        div.innerHTML = `
      <div class="provider-info" style="flex-grow: 1; min-width: 0; cursor: pointer;" onclick="window.ui.editProvider(${originalIndex})" title="Click to Edit">
        <div style="font-weight: bold; display: flex; align-items: center;">
            ${provider.name} 
            <div class="quick-select-container" onclick="event.stopPropagation()">
                <div class="quick-select-pill" onclick="window.ui.toggleQuickSelect(${originalIndex}, event)" title="Change Category">
                    ${catIconHtml} ${catName}
                </div>
                <div id="qs-dropdown-${originalIndex}" class="category-dropdown no-drag">
                    <!-- Category dropdown items will be generated on demand -->
                </div>
            </div>
        </div>
        <div style="font-size: 12px; color: var(--url-color); white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${provider.url}</div>
      </div>
      <div class="toggle ${provider.enabled ? 'active' : ''}" onclick="window.ui.toggleProvider(${originalIndex})"></div>
      <button class="edit-btn" onclick="window.ui.editProvider(${originalIndex})" draggable="false">Edit</button>
      <button class="remove-btn" onclick="window.ui.removeProvider(${originalIndex})" draggable="false">Remove</button>
    `;

        div.prepend(img);

        if (!searchQuery) {
            setupDragAndDrop(div, originalIndex);
        }
        container.appendChild(div);
    });

    // Update Search Count
    const countEl = document.getElementById('searchCount');
    if (countEl) {
        if (searchQuery) {
            countEl.textContent = `${filteredProviders.length} result${filteredProviders.length !== 1 ? 's' : ''}`;
        } else {
            countEl.textContent = '';
        }
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
        /^[a-zA-Z]:[\\/]/.test(s); // Windows absolute path (C:\... or C:/...)
}

/**
 * Converts a local Windows file path to a valid file:// URL for use in <img> src.
 * Passes through all other sources (http, data:image, etc.) unchanged.
 */
function toImageSrc(str) {
    if (!str) return str;
    const s = str.trim();
    if (/^[a-zA-Z]:[\\/]/.test(s)) {
        return 'file:///' + s.replace(/\\/g, '/');
    }
    return s;
}

function getFaviconUrl(searchUrl) {
    try {
        const url = new URL(searchUrl.replace(/{query}|%s|{{searchTerms}}/g, ''));
        return `https://www.google.com/s2/favicons?domain=${url.hostname}&sz=32`;
    } catch { return ''; }
}

function setupDragAndDrop(div, index) {
    div.ondragstart = (e) => { e.dataTransfer.setData('text/plain', index); };
    div.ondragover = (e) => { e.preventDefault(); };
    div.ondrop = (e) => {
        e.preventDefault();
        const fromIndex = parseInt(e.dataTransfer.getData('text/plain'));
        const toIndex = index;
        if (fromIndex !== toIndex) {
            const [item] = providers.splice(fromIndex, 1);
            providers.splice(toIndex, 0, item);
            Store.saveProviders(providers);
            renderProviders();
        }
    };
}

/**
 * Drag-to-reorder for categories.
 * Categories are stored as a plain object; reordering rebuilds the object
 * in the new key-insertion order (JS objects preserve insertion order).
 */
function setupCategoryDrag(div, name) {
    div.ondragstart = (e) => {
        e.dataTransfer.setData('text/plain', name);
        // Brief visual feedback on the dragged item
        requestAnimationFrame(() => div.style.opacity = '0.4');
    };
    div.ondragend = () => { div.style.opacity = ''; };
    div.ondragover = (e) => {
        e.preventDefault();
        div.style.outline = '2px solid var(--accent-color)';
    };
    div.ondragleave = () => { div.style.outline = ''; };
    div.ondrop = (e) => {
        e.preventDefault();
        div.style.outline = '';
        div.style.opacity = '';
        const fromName = e.dataTransfer.getData('text/plain');
        const toName = name;
        if (fromName === toName) return;

        // Rebuild the categories object in the new order
        const keys = Object.keys(categories);
        const fromIdx = keys.indexOf(fromName);
        const toIdx = keys.indexOf(toName);
        if (fromIdx < 0 || toIdx < 0) return;

        keys.splice(fromIdx, 1);
        keys.splice(toIdx, 0, fromName);

        const reordered = {};
        keys.forEach(k => { reordered[k] = categories[k]; });
        categories = reordered;

        Store.saveCategories(categories);
        renderCategories();
        updateCategorySelects();
    };
}

// Exposed to window for legacy HTML onclicks (Vite handles this differently than plain JS)
export function toggleProvider(index) {
    providers[index].enabled = !providers[index].enabled;
    Store.saveProviders(providers);
    renderProviders();
}

export function toggleAddSection(containerId, forceExpand = null) {
    const section = document.getElementById(containerId);
    if (!section) return;

    if (forceExpand === true) {
        section.classList.add('expanded');
    } else if (forceExpand === false) {
        section.classList.remove('expanded');
    } else {
        section.classList.toggle('expanded');
    }
}

export function updateIconPreview(inputId, previewId) {
    try {
        const input = document.getElementById(inputId);
        const preview = document.getElementById(previewId);
        if (!input || !preview) return;

        let value = input.value.trim();

        // Auto-clean Base64: If user pastes a full <img src="..."> tag
        if (value.toLowerCase().startsWith('<img')) {
            const match = value.match(/src=["']([^"']+)["']/i);
            if (match && match[1]) {
                value = match[1];
                input.value = value; // Update input field instantly
            }
        }

        if (!value) {
            // Fallback: Check if URL field has a value (only for providers)
            if (inputId === 'providerIcon') {
                const urlInput = document.getElementById('providerUrl');
                if (urlInput && urlInput.value.trim()) {
                    const favicon = getFaviconUrl(urlInput.value.trim());
                    if (favicon) {
                        preview.innerHTML = `<img src="${favicon}" style="width: 24px; height: 24px; object-fit: contain;">`;
                        return;
                    }
                }
            }
            preview.innerHTML = '';
            preview.textContent = '';
            return;
        }

        if (isImageSource(value)) {
            // Local Windows path: file:// is blocked from http:// origin in dev mode.
            // Use IPC to load the file as a base64 data URL (works in dev + production).
            if (/^[a-zA-Z]:[\\/]/.test(value) && window.electronAPI?.readLocalIcon) {
                window.electronAPI.readLocalIcon(value).then(dataUrl => {
                    if (dataUrl) {
                        preview.innerHTML = `<img src="${dataUrl}" style="width: 24px; height: 24px; object-fit: contain;">`;
                        // Auto-convert the raw path to portable base64 so saving/rendering works everywhere
                        input.value = dataUrl;
                    } else {
                        preview.innerHTML = '<span title="File not found or unreadable" style="font-size:16px;">⚠️</span>';
                    }
                });
                return; // Async path handled above
            }
            preview.innerHTML = `<img src="${value}" style="width: 24px; height: 24px; object-fit: contain;">`;
        } else {
            preview.textContent = value;
            preview.style.fontSize = '20px';
            preview.style.display = 'flex';
            preview.style.alignItems = 'center';
            preview.style.justifyContent = 'center';
        }
    } catch (e) {
        console.error(`Error in updateIconPreview: ${e.message}`);
    }
}

export function updateGetIconLink(prefix) {
    try {
        const nameInput = document.getElementById(prefix === 'provider' ? 'providerName' : 'catName');
        const link = document.getElementById(prefix === 'provider' ? 'providerGetIconLink' : 'catGetIconLink');
        if (!nameInput || !link) return;

        const name = nameInput.value.trim();
        if (name) {
            link.textContent = `Find one for "${name}" on Icons8`;
        } else {
            link.textContent = `Find one for this name on Icons8`;
        }
    } catch (e) {
        console.error(`Error in updateGetIconLink: ${e.message}`);
    }
}

export function editProvider(index) {
    showSection('providers-list', document.getElementById('nav-providers'));
    editingIndex = index;
    const p = providers[index];
    document.getElementById('providerName').value = p.name;
    document.getElementById('providerUrl').value = p.url;
    document.getElementById('providerType').value = p.type || 'url';
    document.getElementById('providerIcon').value = p.icon || '';

    // Normalize category value for select (data uses "" or "Unsorted" occasionally, UI wants "")
    document.getElementById('providerCategory').value = (p.category === 'Unsorted' || !p.category) ? "" : p.category;

    onTypeChange(); // Update placeholders
    updateIconPreview('providerIcon', 'providerIconPreview');
    updateGetIconLink('provider');
    document.getElementById('formTitle').textContent = 'Edit Search Provider';
    document.getElementById('submitBtn').textContent = 'Save Changes';
    document.getElementById('cancelBtn').style.display = 'inline-block';

    toggleAddSection('providerAddSection', true);

    // Focus and scroll to form
    const nameInput = document.getElementById('providerName');
    nameInput.focus();
    nameInput.select(); // Highlight name for quick editing

    document.querySelector('#providers-list .add-section').scrollIntoView({ behavior: 'smooth' });
}

export function addProvider() {
    const nameInput = document.getElementById('providerName');
    const urlInput = document.getElementById('providerUrl');
    const type = document.getElementById('providerType').value || 'url';
    const name = nameInput.value.trim();
    const url = urlInput.value.trim();
    const category = document.getElementById('providerCategory').value || ""; // Ensure empty string for Unsorted
    let icon = document.getElementById('providerIcon').value.trim();

    if (!name || !url) {
        showToast('Please fill in Name and ' + (type === 'url' ? 'URL' : (type === 'file' ? 'Path' : 'Command')), 'error');
        if (!name) nameInput.focus();
        else urlInput.focus();
        return;
    }

    if (editingIndex >= 0) {
        providers[editingIndex] = { ...providers[editingIndex], name, url, icon, category, type };
        showToast('Provider updated!', 'success');
    } else {
        providers.push({ name, url, icon, enabled: true, category, type });
        showToast('Provider added!', 'success');
    }

    Store.saveProviders(providers);
    renderProviders();
    cancelEdit();
}

export function cancelEdit() {
    editingIndex = -1;
    document.getElementById('providerName').value = '';
    document.getElementById('providerUrl').value = '';
    document.getElementById('providerType').value = 'url';
    document.getElementById('providerIcon').value = '';
    document.getElementById('providerCategory').value = ''; // Reset to Default
    onTypeChange();
    updateIconPreview('providerIcon', 'providerIconPreview');
    updateGetIconLink('provider');
    document.getElementById('formTitle').textContent = 'Add Custom Search Provider';
    document.getElementById('submitBtn').textContent = 'Add Provider';

    toggleAddSection('providerAddSection', false);
}

export function onTypeChange() {
    const type = document.getElementById('providerType').value;
    const urlInput = document.getElementById('providerUrl');
    if (!urlInput) return;

    switch (type) {
        case 'url':
            urlInput.placeholder = 'URL with {query} (e.g. https://google.com/search?q={query})';
            break;
        case 'file':
            urlInput.placeholder = 'Local Path (e.g. C:\\Windows\\notepad.exe)';
            break;
        case 'cmd':
            urlInput.placeholder = 'Command or Script (e.g. python script.py "{query}")';
            break;
    }
}

export async function removeProvider(index) {
    const p = providers[index];
    const confirmed = await showModal(`Remove ${p.name}?`, {
        title: 'Remove Provider',
        confirmText: 'Remove',
        cancelText: 'Cancel'
    });

    if (confirmed) {
        // State cleanup: If we are currently editing THIS provider, cancel the edit
        if (editingIndex === index) {
            cancelEdit();
        } else if (editingIndex > index) {
            // Fix index shifting: if we delete an item BEFORE the one being edited,
            // we must decrement the editingIndex to match its new position.
            editingIndex--;
        }

        providers.splice(index, 1);
        Store.saveProviders(providers);
        renderProviders();
        showToast('Provider removed.', 'info');
    }
}


export function saveAppearance(silent = false) {
    const iconSize = document.getElementById('iconSize')?.value || DEFAULT_APPEARANCE.iconSize;
    const iconsPerRow = document.getElementById('iconsPerRow')?.value || DEFAULT_APPEARANCE.iconsPerRow;
    const popupMaxWidth = '0';

    const fontWeight = document.getElementById('fontWeight')?.value || DEFAULT_APPEARANCE.fontWeight;
    const fontColor = document.getElementById('fontColor')?.value || DEFAULT_APPEARANCE.fontColor;
    const bgColor = document.getElementById('bgColor')?.value || DEFAULT_APPEARANCE.bgColor;
    const accentColor = document.getElementById('accentColor')?.value || DEFAULT_APPEARANCE.accentColor;
    const tabActiveBg = document.getElementById('tabActiveBg')?.value || DEFAULT_APPEARANCE.tabActiveBg;
    const gridGapX = document.getElementById('gridGapX')?.value || DEFAULT_APPEARANCE.gridGapX;
    const gridGapY = document.getElementById('gridGapY')?.value || DEFAULT_APPEARANCE.gridGapY;
    const showUnsorted = document.getElementById('toggleUnsortedBtn')?.classList.contains('active') || false;

    Store.saveAppearance({
        iconSize,
        iconsPerRow,
        gridGapX,
        gridGapY,
        theme: 'dark',
        fontWeight,
        fontColor,
        bgColor,
        accentColor,
        tabActiveBg,
        showUnsorted,
        customCSS: ''
    });
    applyTheme();
    if (!silent) showToast('Settings saved!', 'success');
}


export async function resetConfig() {
    const confirmed = await showModal('Are you sure you want to reset ALL settings, categories, and providers to default? This cannot be undone.', {
        title: 'Reset Settings',
        confirmText: 'Reset Everything',
        cancelText: 'Cancel'
    });

    if (confirmed) {
        localStorage.clear();
        window.location.reload();
    }
}


export function showSection(sectionId, element) {
    document.querySelectorAll('.sidebar-item').forEach(item => item.classList.remove('active'));
    element.classList.add('active');
    document.querySelectorAll('.section').forEach(section => section.classList.remove('active'));
    document.getElementById(sectionId).classList.add('active');

    // Safety: Refresh the UI for that section
    if (sectionId === 'providers-list') {
        updateCategorySelects();
        renderProviders();
    } else if (sectionId === 'categories-list') {
        renderCategories();
    }
}

export function getProviders() { return providers; }
export function setProviders(p) { providers = p; renderProviders(); }
export function getCategories() { return categories; }
export function setCategories(c) { categories = c; renderCategories(); updateCategorySelects(); }



function updateColorPreview(inputId, previewId) {
    const input = document.getElementById(inputId);
    const preview = document.getElementById(previewId);
    if (input && preview) {
        preview.style.backgroundColor = input.value;
    }
}

export function parseBulkImport(text) {
    const lines = text.split('\n');
    const items = [];
    let currentCategory = 'General';

    lines.forEach(line => {
        const trimmed = line.trim();
        if (!trimmed) return;

        // 1. Spreadsheet Format Check (Category\tName\tURL[\tIcon][\tType])
        if (line.includes('\t')) {
            const parts = line.split('\t').map(p => p.trim());

            if (parts.length >= 3) {
                // Category | Name | URL | [Icon] | [Type]
                const [cat, name, rawUrl, icon, type] = parts;
                if (name && rawUrl) {
                    items.push({
                        name,
                        url: rawUrl.replace(/%s|{{searchTerms}}/g, '{query}'),
                        category: cat || 'General',
                        enabled: true,
                        icon: icon || '',
                        type: type || 'url'
                    });
                }
                return;
            } else if (parts.length === 2) {
                // Name | URL (Uses current category)
                const [name, rawUrl] = parts;
                if (name && rawUrl) {
                    items.push({
                        name,
                        url: rawUrl.replace(/%s|{{searchTerms}}/g, '{query}'),
                        category: currentCategory,
                        enabled: true,
                        icon: '',
                        type: 'url'
                    });
                }
                return;
            }
        }

        // 2. Markdown Category Check
        if (trimmed.startsWith('#')) {
            currentCategory = trimmed.replace(/^#+\s*/, '').trim();
            return;
        }

        // 3. Line Format Check (Name: URL [| Icon])
        const colonIndex = trimmed.indexOf(':');
        if (colonIndex > 0) {
            const name = trimmed.substring(0, colonIndex).trim();
            let urlPart = trimmed.substring(colonIndex + 1).trim();

            // Optional Icon check (Name: URL | IconURL)
            let icon = '';
            if (urlPart.includes('|')) {
                const [url, iconUrl] = urlPart.split('|').map(p => p.trim());
                urlPart = url;
                icon = iconUrl;
            }

            if (name && urlPart) {
                urlPart = urlPart.replace(/%s|{{searchTerms}}/g, '{query}');
                items.push({
                    name,
                    url: urlPart,
                    category: currentCategory,
                    enabled: true,
                    icon: icon,
                    type: 'url'
                });
            }
        }
    });

    return items;
}

export function renderBulkPreview(items) {
    const previewArea = document.getElementById('bulkPreview');
    const previewList = document.getElementById('bulkPreviewList');
    if (!previewArea || !previewList) return;

    if (items.length === 0) {
        previewArea.style.display = 'none';
        return;
    }

    previewArea.style.display = 'block';
    previewList.innerHTML = items.map(item => `
        <div style="margin-bottom: 4px; border-bottom: 1px solid rgba(0,0,0,0.05); padding-bottom: 2px;">
            <strong>${item.name}</strong> <span style="opacity: 0.6">(${item.category})</span><br>
            <span style="font-size: 10px; color: var(--url-color); opacity: 0.8">${item.url}</span>
        </div>
    `).join('');
}

export async function executeBulkImport() {
    const bulkPad = document.getElementById('bulkImportPad');
    if (!bulkPad) return;

    const newItems = parseBulkImport(bulkPad.value);
    if (newItems.length === 0) {
        await showModal('No valid providers found to import.', { title: 'Import Failed', showCancel: false });
        return;
    }

    const confirmed = await showModal(`Import ${newItems.length} providers? This will merge them with your existing list.`, {
        title: 'Confirm Bulk Import',
        confirmText: 'Import Now',
        cancelText: 'Cancel'
    });

    if (!confirmed) return;


    // 1. Update Categories if they don't exist
    const existingCats = Store.getCategories();
    newItems.forEach(item => {
        const catName = item.category === 'General' ? 'Unsorted' : (item.category || 'Unsorted');
        if (!existingCats[catName]) {
            existingCats[catName] = '📁'; // Default icon for new categories
        }
        item.category = catName;
    });
    Store.saveCategories(existingCats);
    setCategories(existingCats);

    // 2. Add Favicons in background
    showToast(`Importing ${newItems.length} items...`, 'info');

    const processedItems = newItems.map(item => {
        return {
            ...item,
            icon: item.icon || ((item.type === 'url' || !item.type) ? getFaviconUrl(item.url) : '')
        };
    });

    // 3. Merge and Save
    const currentProviders = Store.getProviders();
    const merged = [...currentProviders, ...processedItems];

    Store.saveProviders(merged);
    setProviders(merged);

    // UI feedback
    bulkPad.value = '';
    renderBulkPreview([]);
    showToast('Bulk import completed!', 'success');

    // Scroll to providers list to show the new items
    setTimeout(() => {
        showSection('providers-list', document.getElementById('nav-providers'));
    }, 1000);
}
export function toggleQuickSelect(index, event) {
    if (event) {
        event.stopPropagation();
        event.preventDefault();
    }
    const dropdown = document.getElementById(`qs-dropdown-${index}`);
    if (!dropdown) return;

    const wasActive = dropdown.classList.contains('active');

    // Close all other dropdowns
    document.querySelectorAll('.category-dropdown').forEach(d => d.classList.remove('active'));

    if (!wasActive) {
        // Generate items on-demand
        const p = providers[index];
        const catName = p.category || 'Unsorted';

        const dropdownHtml = Object.keys(categories).map(cat => {
            const icon = categories[cat] || (cat === 'Unsorted' ? '🔴' : '🔍');
            let iconHtml = isImageSource(icon) ? `<img src="${icon}" style="width: 12px; height: 12px; object-fit: contain;">` : icon;
            return `<div class="category-item ${cat === catName ? 'current' : ''}" onclick="window.ui.changeProviderCategory(${index}, '${cat}', event)">
                ${iconHtml} ${cat}
            </div>`;
        }).join('');

        dropdown.innerHTML = dropdownHtml;
        dropdown.classList.add('active');
    }
}

export function changeProviderCategory(index, newCat, event) {
    if (event) {
        event.stopPropagation();
    }
    providers[index].category = newCat === 'Unsorted' ? "" : newCat;
    Store.saveProviders(providers);
    renderProviders();
    showToast(`Moved to ${newCat}`, 'success');
}

// Global click listener to close dropdowns
document.addEventListener('click', () => {
    document.querySelectorAll('.category-dropdown').forEach(d => d.classList.remove('active'));
});
