"use client";

import { useAppStore } from "@/store/useAppStore";
import { motion } from "framer-motion";

const KeyboardShortcutSettings = () => {
  const store = useAppStore();
  const shortcuts = store.shortcuts;

  const handleUpdateShortcut = (action: string, newAccelerator: string) => {
    store.updateShortcut(action, newAccelerator);
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-2">
        {shortcuts.map((shortcut) => (
          <div
            key={shortcut.action}
            className="w-full px-4 py-3 flex items-center justify-between rounded-2xl border border-white/5 bg-white/5 transition-all hover:bg-white/10"
          >
            <span className="text-sm font-bold text-white capitalize">{shortcut.action.replace('-', ' ')}</span>
            <input
              type="text"
              value={shortcut.accelerator}
              onChange={(e) => handleUpdateShortcut(shortcut.action, e.target.value)}
              className="bg-black/30 border border-white/10 rounded-xl px-3 py-1.5 text-xs text-deep-space-accent-neon font-black tracking-widest focus:outline-none focus:border-deep-space-accent-neon/50 w-48 text-right"
              placeholder="CTRL+KEY"
            />
          </div>
        ))}
      </div>
    </div>
  );
};

export default KeyboardShortcutSettings;
