export type Action =
    | 'new-tab'
    | 'close-tab'
    | 'next-tab'
    | 'prev-tab'
    | 'toggle-sidebar'
    | 'open-settings';

export interface Shortcut {
    accelerator: string;
    action: Action;
}

export const defaultShortcuts: Shortcut[] = [
    { accelerator: 'CommandOrControl+T', action: 'new-tab' },
    { accelerator: 'CommandOrControl+W', action: 'close-tab' },
    { accelerator: 'CommandOrControl+Tab', action: 'next-tab' },
    { accelerator: 'CommandOrControl+Shift+Tab', action: 'prev-tab' },
    { accelerator: 'CommandOrControl+B', action: 'toggle-sidebar' },
    { accelerator: 'CommandOrControl+,', action: 'open-settings' },
];
