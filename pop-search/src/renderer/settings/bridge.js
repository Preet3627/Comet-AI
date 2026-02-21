import { Store } from './store';
import { setProviders, getProviders, getCategories, setCategories, showToast } from './ui';

export const Bridge = {
    async exportConfig() {
        const exportData = {
            appearance: Store.getAppearance(),
            providers: getProviders(),
            categories: getCategories()
        };
        const data = JSON.stringify(exportData, null, 2);
        const result = await window.electronAPI.saveConfig(data);
        if (result?.success) showToast('Configuration exported successfully!', 'success');
        else if (result?.error) showToast('Error: ' + result.error, 'error');
    },

    async importConfig() {
        const json = await window.electronAPI.loadConfig();
        if (json) {
            try {
                const imported = JSON.parse(json);

                // Handle Appearance settings if present
                if (imported.appearance) {
                    Store.saveAppearance(imported.appearance);
                    // Force a reload or update UI after appearance change if necessary
                    // For now, simpler to just advise a reload or use the existing save flow
                    showToast('Appearance settings imported!', 'info');
                }

                // Support both old format (array of providers) and new format (object with providers + categories)
                if (Array.isArray(imported)) {
                    // Old format - only providers
                    const migrated = imported.map(p => ({
                        ...p,
                        url: p.url.replace(/%s|{{searchTerms}}/g, '{query}')
                    }));
                    setProviders(migrated);
                    Store.saveProviders(migrated);
                } else if (imported.providers && imported.categories) {
                    // New format - providers and categories
                    const migratedProviders = imported.providers.map(p => ({
                        ...p,
                        url: p.url.replace(/%s|{{searchTerms}}/g, '{query}')
                    }));
                    setProviders(migratedProviders);
                    Store.saveProviders(migratedProviders);
                    setCategories(imported.categories);
                    Store.saveCategories(imported.categories);
                } else if (!imported.appearance) {
                    throw new Error('Invalid format. Expected providers array or object with providers/categories/appearance.');
                }

                showToast('Import completed!', 'success');
                // Auto-reload to apply all changes (especially appearance)
                setTimeout(() => window.electronAPI.reloadApp(), 1500);
            } catch (err) { showToast('Error: ' + err.message, 'error'); }
        }
    },

    reloadApp() { window.electronAPI.reloadApp(); },
    openExternal(url) { window.electronAPI.openExternal(url); }
};
