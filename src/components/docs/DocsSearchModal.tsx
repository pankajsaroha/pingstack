import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { Search, X, ChevronRight, FileText, Code2, Zap, ArrowRight } from 'lucide-react';
import { DOCS_ARTICLES, DOCS_GUIDES, DOCS_NAVIGATION } from '@/lib/docs/content';

interface DocsSearchModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function DocsSearchModal({ isOpen, onClose }: DocsSearchModalProps) {
  const [query, setQuery] = useState('');

  // Close on Escape
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        // Toggle
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  // Search indexing
  const searchResults = useMemo(() => {
    const q = query.toLowerCase().trim();
    if (!q) return [];

    const results: Array<{
      title: string;
      category: string;
      href: string;
      snippet: string;
      matchType: 'title' | 'content' | 'endpoint';
    }> = [];

    // Search Articles
    Object.values(DOCS_ARTICLES).forEach(art => {
      const matchInTitle = art.title.toLowerCase().includes(q);
      const matchInDesc = art.description.toLowerCase().includes(q);
      
      let snippet = art.description;
      let matchedSection = art.sections.find(s => 
        s.title.toLowerCase().includes(q) || (s.content || '').toLowerCase().includes(q)
      );

      if (matchedSection && matchedSection.content) {
        snippet = matchedSection.content.substring(0, 120) + '...';
      }

      if (matchInTitle || matchInDesc || matchedSection) {
        results.push({
          title: art.title,
          category: art.category,
          href: `/docs/${art.slug}`,
          snippet,
          matchType: matchInTitle ? 'title' : 'content'
        });
      }
    });

    // Search Guides
    Object.values(DOCS_GUIDES).forEach(guide => {
      if (guide.title.toLowerCase().includes(q) || guide.description.toLowerCase().includes(q)) {
        results.push({
          title: guide.title,
          category: guide.category,
          href: `/docs/guides/${guide.slug}`,
          snippet: guide.description,
          matchType: 'title'
        });
      }
    });

    return results.slice(0, 8);
  }, [query]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-20 px-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="w-full max-w-2xl bg-zinc-900 border border-zinc-800 rounded-2xl shadow-2xl overflow-hidden text-zinc-100">
        {/* Search Input Bar */}
        <div className="flex items-center px-4 py-3.5 border-b border-zinc-800 bg-zinc-950">
          <Search className="w-5 h-5 text-zinc-400 mr-3 shrink-0" />
          <input
            type="text"
            autoFocus
            placeholder="Search docs, endpoints, variables, webhooks..."
            value={query}
            onChange={e => setQuery(e.target.value)}
            className="w-full bg-transparent border-none text-zinc-100 placeholder:text-zinc-500 text-sm focus:outline-hidden font-medium"
          />
          <button
            onClick={onClose}
            className="p-1 rounded-md text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Results List */}
        <div className="max-h-96 overflow-y-auto p-2 divide-y divide-zinc-800/50">
          {query.trim() === '' ? (
            <div className="p-6 text-center text-zinc-500 text-xs">
              <p className="font-semibold text-zinc-400 mb-1">Quick Suggestions</p>
              <div className="flex flex-wrap items-center justify-center gap-2 mt-3">
                <button
                  onClick={() => setQuery('quickstart')}
                  className="px-2.5 py-1 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-lg text-xs"
                >
                  Quickstart
                </button>
                <button
                  onClick={() => setQuery('send message')}
                  className="px-2.5 py-1 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-lg text-xs"
                >
                  Send Message
                </button>
                <button
                  onClick={() => setQuery('webhook signature')}
                  className="px-2.5 py-1 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-lg text-xs"
                >
                  Webhook Signature
                </button>
                <button
                  onClick={() => setQuery('idempotency')}
                  className="px-2.5 py-1 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-lg text-xs"
                >
                  Idempotency-Key
                </button>
              </div>
            </div>
          ) : searchResults.length === 0 ? (
            <div className="p-8 text-center text-zinc-500 text-sm">
              No documentation articles found matching &quot;<span className="text-zinc-300">{query}</span>&quot;.
            </div>
          ) : (
            searchResults.map(res => (
              <Link
                key={res.href}
                href={res.href}
                onClick={onClose}
                className="flex items-start p-3 rounded-xl hover:bg-zinc-800/80 transition-colors group block"
              >
                <div className="p-2 rounded-lg bg-zinc-800 text-indigo-400 group-hover:bg-indigo-500/10 group-hover:text-indigo-400 transition-colors mr-3 shrink-0 mt-0.5">
                  <FileText className="w-4 h-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center space-x-2">
                    <span className="text-xs font-semibold uppercase tracking-wider text-zinc-500">{res.category}</span>
                    <span className="text-zinc-600">•</span>
                    <h4 className="text-sm font-semibold text-zinc-100 group-hover:text-indigo-400 transition-colors truncate">
                      {res.title}
                    </h4>
                  </div>
                  <p className="text-xs text-zinc-400 mt-1 line-clamp-1">
                    {res.snippet}
                  </p>
                </div>
                <ChevronRight className="w-4 h-4 text-zinc-600 group-hover:text-zinc-300 group-hover:translate-x-0.5 transition-all ml-2 shrink-0 mt-2" />
              </Link>
            ))
          )}
        </div>

        {/* Footer */}
        <div className="px-4 py-2 bg-zinc-950/80 border-t border-zinc-800 text-[11px] text-zinc-500 flex items-center justify-between">
          <span>Navigate with <strong>↑</strong> <strong>↓</strong></span>
          <span>Press <strong>ESC</strong> to close</span>
        </div>
      </div>
    </div>
  );
}
