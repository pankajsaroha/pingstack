'use client';

import React, { useState, useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { AssistantPanel } from './AssistantPanel';
import { Sparkles, X } from 'lucide-react';

export function PingstackAssistant({
  onOpenFeedback,
  onStartTour,
}: {
  onOpenFeedback?: () => void;
  onStartTour?: () => void;
} = {}) {
  const [isOpen, setIsOpen] = useState(false);
  const pathname = usePathname();

  // Global Keyboard shortcuts: Escape to close, Cmd+/ or Ctrl+/ to toggle
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        setIsOpen(false);
      } else if ((e.metaKey || e.ctrlKey) && e.key === '/') {
        e.preventDefault();
        setIsOpen((prev) => !prev);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen]);

  return (
    <>
      {/* Floating Assistant Trigger Button */}
      <div className="fixed bottom-5 right-5 z-[80] flex items-center gap-2">
        <button
          onClick={() => setIsOpen((prev) => !prev)}
          className={`group relative flex items-center gap-2 px-3 py-2 rounded-xl transition-all duration-200 shadow-lg cursor-pointer select-none active:scale-95 ${
            isOpen
              ? 'bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 border border-zinc-700 dark:border-zinc-200'
              : 'bg-white dark:bg-zinc-900 hover:bg-zinc-50 dark:hover:bg-zinc-800 text-zinc-900 dark:text-zinc-100 border border-zinc-200 dark:border-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-700'
          }`}
          aria-expanded={isOpen}
          aria-label="Toggle Pingstack Assistant"
          title="Pingstack Assistant (Ctrl+/)"
        >
          <div className="flex items-center justify-center">
            {isOpen ? (
              <X className="w-4 h-4" />
            ) : (
              <Sparkles className="w-4 h-4 text-indigo-500 group-hover:scale-110 transition-transform duration-200" />
            )}
          </div>

          <span className="text-xs font-semibold tracking-tight pr-0.5">
            {isOpen ? 'Close' : 'Assistant'}
          </span>

          <span className="hidden sm:inline-block text-[9px] font-mono px-1 py-0.2 rounded bg-zinc-100 dark:bg-zinc-800 text-zinc-500 dark:text-zinc-400 border border-zinc-200 dark:border-zinc-700/60">
            ⌘/
          </span>

          {/* Notification dot */}
          {!isOpen && (
            <span className="absolute -top-1 -right-1 flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
            </span>
          )}
        </button>
      </div>

      {/* Floating Panel */}
      <AssistantPanel
        key={pathname}
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        onMinimize={() => setIsOpen(false)}
        onOpenFeedback={onOpenFeedback}
        onStartTour={onStartTour}
      />
    </>
  );
}
