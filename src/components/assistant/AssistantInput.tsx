'use client';

import React, { useRef, useEffect } from 'react';
import { Search, X, CornerDownLeft } from 'lucide-react';

interface AssistantInputProps {
  value: string;
  onChange: (value: string) => void;
  onSubmit: () => void;
  onClear: () => void;
  placeholder?: string;
  autoFocus?: boolean;
}

export function AssistantInput({
  value,
  onChange,
  onSubmit,
  onClear,
  placeholder = 'Ask about Pingstack (e.g. templates, 133010, campaigns)...',
  autoFocus = false
}: AssistantInputProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    // Only auto-focus on desktop/tablet to prevent virtual keyboard from popping up and obstructing topics on mobile
    if (autoFocus && inputRef.current && typeof window !== 'undefined' && window.innerWidth >= 640) {
      inputRef.current.focus();
    }
  }, [autoFocus]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      onSubmit();
    } else if (e.key === 'Escape' && value) {
      e.preventDefault();
      onClear();
    }
  };

  return (
    <div className="relative flex items-center">
      <div className="absolute left-3.5 pointer-events-none text-zinc-400">
        <Search className="w-3.5 h-3.5" />
      </div>

      <input
        ref={inputRef}
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        className="w-full pl-9 pr-14 py-2.5 bg-zinc-100/80 dark:bg-zinc-800/80 hover:bg-zinc-100 dark:hover:bg-zinc-800 focus:bg-white dark:focus:bg-zinc-800 border border-zinc-200 dark:border-zinc-700/80 focus:border-indigo-500 dark:focus:border-indigo-500 rounded-xl text-xs text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 focus:outline-none transition-all shadow-inner"
      />

      <div className="absolute right-2.5 flex items-center gap-1">
        {value ? (
          <button
            type="button"
            onClick={onClear}
            className="p-1 text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 rounded-md hover:bg-zinc-200/60 dark:hover:bg-zinc-700 transition-colors cursor-pointer"
            aria-label="Clear search"
          >
            <X className="w-3 h-3" />
          </button>
        ) : (
          <span className="hidden sm:flex items-center text-[10px] text-zinc-400 font-mono px-1 py-0.5 rounded bg-zinc-200/60 dark:bg-zinc-700 border border-zinc-300/40 dark:border-zinc-600">
            <CornerDownLeft className="w-2.5 h-2.5 mr-0.5" />
          </span>
        )}
      </div>
    </div>
  );
}
