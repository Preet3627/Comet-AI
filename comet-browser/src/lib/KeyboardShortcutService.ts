import { globalShortcut } from 'electron';
import { useAppStore } from '../store/useAppStore';

type Action =
  | 'new-tab'
  | 'close-tab'
  | 'next-tab'
  | 'prev-tab'
  | 'toggle-sidebar'
  | 'open-settings';

interface Shortcut {
  accelerator: string;
  action: Action;
}

const defaultShortcuts: Shortcut[] = [
  { accelerator: 'CommandOrControl+T', action: 'new-tab' },
  { accelerator: 'CommandOrControl+W', action: 'close-tab' },
  { accelerator: 'CommandOrControl+Tab', action: 'next-tab' },
  { accelerator: 'CommandOrControl+Shift+Tab', action: 'prev-tab' },
  { accelerator: 'CommandOrControl+B', action: 'toggle-sidebar' },
  { accelerator: 'CommandOrControl+,', action: 'open-settings' },
];

class KeyboardShortcutService {
  private shortcuts: Shortcut[] = defaultShortcuts;

  constructor() {
    this.registerAll();
  }

  public registerAll() {
    this.shortcuts.forEach(shortcut => {
      globalShortcut.register(shortcut.accelerator, () => {
        this.execute(shortcut.action);
      });
    });
  }

  public unregisterAll() {
    globalShortcut.unregisterAll();
  }

  public getShortcuts() {
    return this.shortcuts;
  }

  public updateShortcut(action: Action, accelerator: string) {
    const shortcut = this.shortcuts.find(s => s.action === action);
    if (shortcut) {
      shortcut.accelerator = accelerator;
      this.unregisterAll();
      this.registerAll();
    }
  }

  private execute(action: Action) {
    const store = useAppStore.getState();
    switch (action) {
      case 'new-tab':
        store.addTab();
        break;
      case 'close-tab':
        store.removeTab(store.activeTabId);
        break;
      case 'next-tab':
        store.nextTab();
        break;
      case 'prev-tab':
        store.prevTab();
        break;
      case 'toggle-sidebar':
        store.toggleSidebar();
        break;
      case 'open-settings':
        // Implementation needed
        break;
    }
  }
}

export const keyboardShortcutService = new KeyboardShortcutService();
