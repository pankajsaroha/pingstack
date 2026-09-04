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
    if (autoFocus && inputRef.current) {
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
      <div className="absolute left-3.5 pointer-events-none text-muted">
        <Search className="w-3.5 h-3.5" />
      </div>

      <input
        ref={inputRef}
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        className="w-full pl-9 pr-14 py-2.5 bg-glass-input/80 hover:bg-glass-input focus:bg-glass-input border border-glass-border focus:border-fg/30 rounded-xl text-xs text-fg placeholder:text-muted/70 focus:outline-none transition-all shadow-inner"
      />

      <div className="absolute right-2.5 flex items-center gap-1">
        {value ? (
          <button
            type="button"
            onClick={onClear}
            className="p-1 text-muted hover:text-fg rounded-md hover:bg-glass-card transition-colors cursor-pointer"
            aria-label="Clear search"
          >
            <X className="w-3 h-3" />
          </button>
        ) : (
          <span className="hidden sm:flex items-center text-[10px] text-muted/60 font-mono px-1 py-0.5 rounded bg-glass-card border border-glass-border">
            <CornerDownLeft className="w-2.5 h-2.5 mr-0.5" />
          </span>
        )}
      </div>
    </div>
  );
}
