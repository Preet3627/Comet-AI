import { DEFAULT_PROVIDERS, DEFAULT_CATEGORIES, DEFAULT_APPEARANCE } from '../../shared/constants';

export const Store = {
    getProviders() {
        return JSON.parse(localStorage.getItem('searchProviders') || JSON.stringify(DEFAULT_PROVIDERS));
    },

    saveProviders(providers) {
        localStorage.setItem('searchProviders', JSON.stringify(providers));
    },

    getCategories() {
        return JSON.parse(localStorage.getItem('searchCategories') || JSON.stringify(DEFAULT_CATEGORIES));
    },

    saveCategories(categories) {
        localStorage.setItem('searchCategories', JSON.stringify(categories));
    },

    getAppearance() {
        return {
            iconSize: localStorage.getItem('iconSize') || DEFAULT_APPEARANCE.iconSize,
            iconsPerRow: localStorage.getItem('iconsPerRow') || DEFAULT_APPEARANCE.iconsPerRow,
            gridGapX: localStorage.getItem('gridGapX') || DEFAULT_APPEARANCE.gridGapX,
            gridGapY: localStorage.getItem('gridGapY') || DEFAULT_APPEARANCE.gridGapY,
            popupMaxWidth: localStorage.getItem('popupMaxWidth') || DEFAULT_APPEARANCE.popupMaxWidth,
            theme: DEFAULT_APPEARANCE.theme,
            fontWeight: localStorage.getItem('fontWeight') || DEFAULT_APPEARANCE.fontWeight,
            fontColor: localStorage.getItem('fontColor') || DEFAULT_APPEARANCE.fontColor,
            bgColor: localStorage.getItem('bgColor') || DEFAULT_APPEARANCE.bgColor,
            accentColor: localStorage.getItem('accentColor') || DEFAULT_APPEARANCE.accentColor,
            tabActiveBg: localStorage.getItem('tabActiveBg') || DEFAULT_APPEARANCE.tabActiveBg,
            customCSS: localStorage.getItem('customCSS') || DEFAULT_APPEARANCE.customCSS,
            showDummyBtn: localStorage.getItem('showDummyBtn') === 'true' || DEFAULT_APPEARANCE.showDummyBtn,
            showUnsorted: localStorage.getItem('showUnsorted') === 'true' || (localStorage.getItem('showUnsorted') === null && DEFAULT_APPEARANCE.showUnsorted)
        };
    },

    saveAppearance({ iconSize, iconsPerRow, gridGapX, gridGapY, popupMaxWidth, theme, fontWeight, fontColor, bgColor, accentColor, tabActiveBg, customCSS, showDummyBtn, showUnsorted }) {
        localStorage.setItem('iconSize', iconSize);
        localStorage.setItem('iconsPerRow', iconsPerRow);
        if (gridGapX !== undefined) localStorage.setItem('gridGapX', gridGapX);
        if (gridGapY !== undefined) localStorage.setItem('gridGapY', gridGapY);
        localStorage.setItem('popupMaxWidth', popupMaxWidth || '0');
        localStorage.setItem('theme', theme);
        if (fontWeight !== undefined) localStorage.setItem('fontWeight', fontWeight);
        if (fontColor !== undefined) localStorage.setItem('fontColor', fontColor);
        if (bgColor !== undefined) localStorage.setItem('bgColor', bgColor);
        if (accentColor !== undefined) localStorage.setItem('accentColor', accentColor);
        if (tabActiveBg !== undefined) localStorage.setItem('tabActiveBg', tabActiveBg);
        if (customCSS !== undefined) localStorage.setItem('customCSS', customCSS);
        if (showDummyBtn !== undefined) localStorage.setItem('showDummyBtn', showDummyBtn);
        if (showUnsorted !== undefined) localStorage.setItem('showUnsorted', showUnsorted);
    }
};
