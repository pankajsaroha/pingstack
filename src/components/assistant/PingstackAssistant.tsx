'use client';

import React, { useState, useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { AssistantPanel } from './AssistantPanel';
import { Sparkles, X } from 'lucide-react';

export function PingstackAssistant({
  onOpenFeedback
}: {
  onOpenFeedback?: () => void;
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
      <div className="fixed bottom-6 right-6 z-[80] flex items-center gap-2">
        <button
          onClick={() => setIsOpen((prev) => !prev)}
          className={`group relative flex items-center gap-2 px-3.5 py-2.5 rounded-2xl transition-all duration-300 shadow-xl cursor-pointer select-none active:scale-95 ${
            isOpen
              ? 'bg-fg text-bg border border-fg/20'
              : 'bg-glass-card/90 hover:bg-glass-card text-fg border border-glass-border hover:border-fg/30 hover:shadow-2xl backdrop-blur-xl'
          }`}
          aria-expanded={isOpen}
          aria-label="Toggle Pingstack Assistant"
          title="Pingstack Assistant (Ctrl+/)"
        >
          <div className="flex items-center justify-center">
            {isOpen ? (
              <X className="w-4 h-4" />
            ) : (
              <Sparkles className="w-4 h-4 text-indigo-400 group-hover:scale-110 transition-transform duration-200" />
            )}
          </div>

          <span className="text-xs font-bold tracking-tight pr-1">
            {isOpen ? 'Close' : 'Assistant'}
          </span>

          <span className="hidden sm:inline-block text-[9px] font-mono px-1 py-0.2 rounded bg-glass-input text-muted border border-glass-border opacity-70 group-hover:opacity-100 transition-opacity">
            ⌘/
          </span>

          {/* Pulse notification dot */}
          {!isOpen && (
            <span className="absolute -top-1 -right-1 flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500" />
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
      />
    </>
  );
}
