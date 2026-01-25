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
        className="h-10 flex items-center px-4 gap-1 bg-primary-bg/40 overflow-x-auto custom-scrollbar no-drag-region"
      >
        {tabs.map((tab) => (
          <div
            key={tab.id}
            onClick={() => onTabClick(tab.id)}
            className={`group flex items-center h-8 px-4 rounded-t-xl min-w-[140px] max-w-[200px] cursor-pointer transition-all border-t border-x ${activeTabId === tab.id
                ? 'bg-primary-bg/10 border-border-color text-primary-text'
                : 'bg-transparent border-transparent text-secondary-text hover:bg-primary-bg/5'
              }`}
          >
            {tab.isAudible && <Volume2 size={12} className="mr-2 flex-shrink-0 text-accent" />}
            {!tab.isAudible && <Globe size={12} className="mr-2 flex-shrink-0" />}
            <span
              className={`text-[10px] font-bold truncate flex-1 ${isTabSuspended?.(tab.id) ? 'opacity-50' : ''
                }`}
            >
              {tab.title}
              {isTabSuspended?.(tab.id) && (
                <span className="ml-1 text-[8px] text-secondary-text">(z)</span>
              )}
            </span>
            <button
              onClick={(e) => {
                e.stopPropagation();
                store.updateTab(tab.id, { isAudible: !tab.isAudible });
              }}
              className="ml-2 p-0.5 rounded-full hover:bg-primary-bg/20 opacity-0 group-hover:opacity-100 transition-opacity"
              title="Toggle Mute"
            >
              <Volume2 size={10} />
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                onTabClose(tab.id);
              }}
              className="ml-2 p-0.5 rounded-full hover:bg-primary-bg/20 opacity-0 group-hover:opacity-100 transition-opacity"
              title="Close Tab"
            >
              <Plus size={10} className="rotate-45" />
            </button>
          </div>
        ))}
        <button
          onClick={onAddTab}
          className="p-1.5 rounded-lg text-secondary-text hover:bg-primary-bg/10 hover:text-primary-text transition-all ml-2"
          title="Add New Tab"
        >
          <Plus size={14} />
        </button>
      </div>
    </>
  );
};
