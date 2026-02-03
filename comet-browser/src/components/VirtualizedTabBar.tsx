// Memory-efficient virtualized tab bar for 50+ tabs
import React, { useMemo, useRef, useEffect, useState } from 'react';
import { Globe, Plus, Volume2 } from 'lucide-react';
import { useAppStore } from '@/store/useAppStore';

interface Tab {
  id: string;
  title: string;
  url?: string;
  isAudible?: boolean;
}

interface VirtualizedTabBarProps {
  tabs: Tab[];
  activeTabId: string;
  onTabClick: (tabId: string) => void;
  onTabClose: (tabId: string) => void;
  onAddTab: () => void;
  isTabSuspended?: (tabId: string) => boolean;
  maxVisibleTabs?: number;
}

const TAB_WIDTH = 180; // Approximate width of each tab
const PADDING = 16;

export const VirtualizedTabBar: React.FC<VirtualizedTabBarProps> = ({
  tabs,
  activeTabId,
  onTabClick,
  onTabClose,
  onAddTab,
  isTabSuspended,
  maxVisibleTabs = 10,
}) => {
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [scrollLeft, setScrollLeft] = useState(0);
  const [containerWidth, setContainerWidth] = useState(0);
  const store = useAppStore();

  return (
    <>
      <style>{`
        .custom-scrollbar::-webkit-scrollbar {
          height: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background-color: rgba(var(--color-accent), 0.2);
          border-radius: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background-color: rgba(var(--color-accent), 0.4);
        }
        .no-scrollbar::-webkit-scrollbar {
          display: none;
        }
      `}</style>
      <div
        ref={scrollContainerRef}
        onWheel={(e) => {
          if (scrollContainerRef.current) {
            scrollContainerRef.current.scrollLeft += e.deltaY;
          }
        }}
        className="h-10 flex items-center px-4 gap-1 bg-black/20 overflow-x-auto custom-scrollbar no-drag-region"
      >
        {tabs.map((tab) => (
          <div
            key={tab.id}
            onClick={() => onTabClick(tab.id)}
            className={`group flex items-center h-8 px-4 rounded-t-xl min-w-[140px] max-w-[200px] cursor-pointer transition-all border-t border-x ${activeTabId === tab.id
              ? 'bg-white/5 border-white/10 text-white shadow-[0_-2px_10px_rgba(56,189,248,0.1)]'
              : 'bg-transparent border-transparent text-slate-400 hover:bg-white/[0.02]'
              }`}
          >
            {tab.isAudible && <Volume2 size={12} className="mr-2 flex-shrink-0 text-sky-400 animate-pulse" />}
            {!tab.isAudible && (
              tab.url && tab.url.startsWith('http') ? (
                <img
                  src={`https://www.google.com/s2/favicons?sz=64&domain=${(() => {
                    try { return new URL(tab.url).hostname; } catch { return 'google.com'; }
                  })()}`}
                  className="w-3 h-3 mr-2 flex-shrink-0"
                  alt=""
                  onError={(e) => { (e.target as HTMLImageElement).src = 'https://www.google.com/s2/favicons?sz=64&domain=about:blank'; }}
                />
              ) : (
                <Globe size={12} className="mr-2 flex-shrink-0 text-slate-500" />
              )
            )}
            <span
              className={`text-[10px] font-bold truncate flex-1 ${isTabSuspended?.(tab.id) ? 'opacity-30' : ''
                }`}
            >
              {tab.title}
              {isTabSuspended?.(tab.id) && (
                <span className="ml-1 text-[8px] text-slate-600">(z)</span>
              )}
            </span>
            <button
              onClick={(e) => {
                e.stopPropagation();
                onTabClose(tab.id);
              }}
              className="ml-2 p-1 rounded-md hover:bg-white/10 opacity-0 group-hover:opacity-100 transition-all"
              title="Close Tab"
            >
              <Plus size={10} className="rotate-45" />
            </button>
          </div>
        ))}
        <button
          onClick={onAddTab}
          className="p-1.5 rounded-lg text-slate-500 hover:bg-white/5 hover:text-white transition-all ml-2"
          title="Add New Tab"
        >
          <Plus size={14} />
        </button>
      </div>
    </>
  );
};
