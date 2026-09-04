'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Search, Building2, User, MessageSquare, Megaphone, ArrowRight, X, Loader2 } from 'lucide-react';

interface SearchResult {
  type: 'business' | 'user' | 'whatsapp' | 'campaign';
  id: string;
  title: string;
  subtitle: string;
  href: string;
  badge?: string;
}

interface AdminSearchModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function AdminSearchModal({ isOpen, onClose }: AdminSearchModalProps) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 50);
    } else {
      setQuery('');
      setResults([]);
      setSelectedIndex(0);
    }
  }, [isOpen]);

  useEffect(() => {
    if (!query || query.trim().length < 2) {
      setResults([]);
      setLoading(false);
      return;
    }

    const timer = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/admin/search?q=${encodeURIComponent(query.trim())}`);
        if (res.ok) {
          const data = await res.json();
          setResults(data.results || []);
          setSelectedIndex(0);
        }
      } catch (err) {
        console.error('Search error:', err);
      } finally {
        setLoading(false);
      }
    }, 200);

    return () => clearTimeout(timer);
  }, [query]);

  const handleSelect = (item: SearchResult) => {
    onClose();
    router.push(item.href);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      onClose();
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex((prev) => (results.length > 0 ? (prev + 1) % results.length : 0));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex((prev) => (results.length > 0 ? (prev - 1 + results.length) % results.length : 0));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (results[selectedIndex]) {
        handleSelect(results[selectedIndex]);
      }
    }
  };

  if (!isOpen) return null;

  const getIcon = (type: string) => {
    switch (type) {
      case 'business':
        return <Building2 className="w-4 h-4 text-zinc-500 dark:text-zinc-400" />;
      case 'user':
        return <User className="w-4 h-4 text-indigo-500 dark:text-indigo-400" />;
      case 'whatsapp':
        return <MessageSquare className="w-4 h-4 text-emerald-500 dark:text-emerald-400" />;
      case 'campaign':
        return <Megaphone className="w-4 h-4 text-amber-500 dark:text-amber-400" />;
      default:
        return <Search className="w-4 h-4 text-zinc-500 dark:text-zinc-400" />;
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-black/50 dark:bg-black/60 backdrop-blur-xs flex items-start justify-center pt-20 px-4 animate-in fade-in duration-150"
      onClick={onClose}
    >
      <div
        className="w-full max-w-xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col text-zinc-900 dark:text-zinc-100 animate-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
        onKeyDown={handleKeyDown}
      >
        {/* Search Header */}
        <div className="flex items-center px-4 py-3 border-b border-zinc-200 dark:border-zinc-800 gap-3">
          <Search className="w-4 h-4 text-zinc-400 shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search businesses, owners, emails, phone numbers, WABA IDs..."
            className="flex-1 bg-transparent border-none outline-none text-sm text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 dark:placeholder-zinc-500"
          />
          {loading && <Loader2 className="w-4 h-4 text-zinc-400 animate-spin shrink-0" />}
          <kbd className="hidden sm:inline-block px-1.5 py-0.5 text-[10px] font-mono text-zinc-500 dark:text-zinc-400 bg-zinc-100 dark:bg-zinc-800 rounded border border-zinc-200 dark:border-zinc-700">
            ESC
          </kbd>
          <button onClick={onClose} className="p-1 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Results List */}
        <div className="max-h-96 overflow-y-auto p-2 divide-y divide-zinc-100 dark:divide-zinc-800/40">
          {query.trim().length >= 2 && results.length === 0 && !loading && (
            <div className="py-8 text-center text-xs text-zinc-500">
              No results found for &ldquo;{query}&rdquo;
            </div>
          )}

          {query.trim().length < 2 && (
            <div className="py-8 px-4 text-center text-xs text-zinc-500 space-y-1">
              <p>Type at least 2 characters to search across the entire platform.</p>
              <p className="text-[11px] text-zinc-400 dark:text-zinc-600">Supports business names, owner emails, WABA numbers, and campaigns.</p>
            </div>
          )}

          {results.map((item, index) => {
            const isSelected = index === selectedIndex;
            return (
              <div
                key={`${item.type}-${item.id}`}
                onClick={() => handleSelect(item)}
                onMouseEnter={() => setSelectedIndex(index)}
                className={`flex items-center justify-between px-3 py-2.5 rounded-lg cursor-pointer transition-colors ${
                  isSelected
                    ? 'bg-zinc-100 dark:bg-zinc-800/80 text-zinc-900 dark:text-white'
                    : 'text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800/40'
                }`}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="p-1.5 bg-zinc-100 dark:bg-zinc-800 rounded-md shrink-0">{getIcon(item.type)}</div>
                  <div className="min-w-0">
                    <div className="text-xs font-semibold truncate flex items-center gap-2">
                      <span>{item.title}</span>
                      {item.badge && (
                        <span className="px-1.5 py-0.2 text-[9px] font-mono font-medium rounded bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-zinc-600 dark:text-zinc-300">
                          {item.badge}
                        </span>
                      )}
                    </div>
                    <div className="text-[11px] text-zinc-500 truncate">{item.subtitle}</div>
                  </div>
                </div>
                <ArrowRight className={`w-3.5 h-3.5 shrink-0 ${isSelected ? 'text-zinc-900 dark:text-zinc-300' : 'text-zinc-300 dark:text-zinc-600'}`} />
              </div>
            );
          })}
        </div>

        {/* Footer */}
        <div className="px-4 py-2 bg-zinc-50 dark:bg-zinc-950/60 border-t border-zinc-200 dark:border-zinc-800/80 flex items-center justify-between text-[11px] text-zinc-500 font-mono">
          <span>Navigate with ↑ ↓ • Enter to select</span>
          <span>Founder Control Center</span>
        </div>
      </div>
    </div>
  );
}
