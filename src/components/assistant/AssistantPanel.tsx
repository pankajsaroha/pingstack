'use client';

import React, { useState, useMemo } from 'react';
import { usePathname } from 'next/navigation';
import { useTenant } from '@/context/tenant-context';
import { 
  HelpCategory, 
  getArticleById, 
  searchHelpArticles, 
  getContextualSuggestions, 
  allArticles 
} from '@/data/help';
import { AssistantInput } from './AssistantInput';
import { SuggestedQuestions } from './SuggestedQuestions';
import { ArticleView } from './ArticleView';
import { LogoIcon } from '@/components/Logo';
import { 
  X, 
  Minus, 
  ArrowRight, 
  Bot, 
  ExternalLink,
  Compass
} from 'lucide-react';

interface AssistantPanelProps {
  isOpen: boolean;
  onClose: () => void;
  onMinimize?: () => void;
  onOpenFeedback?: () => void;
  onStartTour?: () => void;
}

export function AssistantPanel({
  isOpen,
  onClose,
  onMinimize,
  onOpenFeedback,
  onStartTour,
}: AssistantPanelProps) {
  const pathname = usePathname();
  const { tenant } = useTenant();

  const [query, setQuery] = useState('');
  const [activeArticleId, setActiveArticleId] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<HelpCategory | null>(null);

  // Dynamic contextual suggestions based on current route and tenant state
  const contextualSuggestions = useMemo(() => {
    return getContextualSuggestions(pathname, tenant);
  }, [pathname, tenant]);

  // Search results
  const searchResults = useMemo(() => {
    if (!query.trim()) return [];
    return searchHelpArticles(query, selectedCategory || undefined);
  }, [query, selectedCategory]);

  // Category-filtered articles list
  const categoryArticles = useMemo(() => {
    if (!selectedCategory) return [];
    return allArticles.filter((art) => art.category === selectedCategory);
  }, [selectedCategory]);

  // Active article object
  const activeArticle = useMemo(() => {
    if (!activeArticleId) return null;
    return getArticleById(activeArticleId) || null;
  }, [activeArticleId]);

  if (!isOpen) return null;

  const handleSelectArticle = (articleId: string) => {
    setActiveArticleId(articleId);
  };

  const handleSelectCategory = (cat: HelpCategory) => {
    if (selectedCategory === cat) {
      setSelectedCategory(null);
    } else {
      setSelectedCategory(cat);
      setActiveArticleId(null);
    }
  };

  const handleClearSearch = () => {
    setQuery('');
    setSelectedCategory(null);
    setActiveArticleId(null);
  };

  return (
    <div className="fixed inset-0 sm:inset-auto sm:bottom-20 sm:right-6 z-[90] flex flex-col justify-end sm:justify-start pointer-events-none">
      {/* Mobile Backdrop */}
      <div 
        className="fixed inset-0 bg-black/40 backdrop-blur-sm sm:hidden pointer-events-auto transition-opacity" 
        onClick={onClose} 
      />

      {/* Main Panel Box */}
      <div 
        className="w-full sm:w-[400px] h-[85dvh] max-h-[85dvh] sm:h-[600px] sm:max-h-[calc(100vh-120px)] bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-t-2xl sm:rounded-2xl shadow-2xl flex flex-col pointer-events-auto overflow-hidden animate-in slide-in-from-bottom-5 sm:slide-in-from-bottom-3 sm:zoom-in-95 duration-200"
        role="dialog"
        aria-modal="true"
        aria-labelledby="assistant-panel-title"
      >
        {/* Header */}
        <div className="px-4 py-3 border-b border-zinc-200 dark:border-zinc-800/80 flex items-center justify-between bg-zinc-50 dark:bg-zinc-950/50 shrink-0">
          <div className="flex items-center gap-2.5">
            <LogoIcon bgClass="bg-zinc-900 dark:bg-white" iconClass="text-white dark:text-zinc-900" />
            <div>
              <div className="flex items-center gap-1.5">
                <h3 id="assistant-panel-title" className="text-xs font-bold tracking-tight text-zinc-900 dark:text-white">
                  Pingstack Assistant
                </h3>
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              </div>
              <p className="text-[10px] text-zinc-500 dark:text-zinc-400">
                Help &amp; diagnostic engine
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1">
            {onMinimize && (
              <button
                onClick={onMinimize}
                className="p-1 rounded-md text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
                title="Minimize assistant"
                aria-label="Minimize assistant"
              >
                <Minus className="w-3.5 h-3.5" />
              </button>
            )}
            <button
              onClick={onClose}
              className="p-1 rounded-md text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
              title="Close assistant (Esc)"
              aria-label="Close assistant"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Search Bar */}
        <div className="p-3 border-b border-zinc-100 dark:border-zinc-800/60 shrink-0 bg-white dark:bg-zinc-900">
          <AssistantInput
            value={query}
            onChange={(val) => {
              setQuery(val);
              if (activeArticleId) setActiveArticleId(null);
            }}
            onSubmit={() => {
              if (searchResults.length > 0) {
                setActiveArticleId(searchResults[0].article.id);
              }
            }}
            onClear={handleClearSearch}
            autoFocus={!activeArticleId}
          />
        </div>

        {/* Content Body */}
        <div className="flex-1 min-h-0 overflow-y-auto p-4 scroll-smooth">
          {/* 1. Article View */}
          {activeArticle ? (
            <ArticleView
              article={activeArticle}
              onBack={() => setActiveArticleId(null)}
              onSelectArticle={handleSelectArticle}
              onActionClick={onClose}
            />
          ) : query.trim() ? (
            /* 2. Search View */
            searchResults.length > 0 ? (
              <div className="space-y-3 text-left">
                <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 px-1">
                  <span>Results ({searchResults.length})</span>
                  <button 
                    onClick={handleClearSearch}
                    className="text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 underline cursor-pointer"
                  >
                    Clear
                  </button>
                </div>

                <div className="space-y-1.5">
                  {searchResults.map(({ article, matchedKeywords }) => (
                    <button
                      key={article.id}
                      onClick={() => handleSelectArticle(article.id)}
                      className="w-full text-left p-3 rounded-lg bg-zinc-50 dark:bg-zinc-800/50 hover:bg-zinc-100 dark:hover:bg-zinc-800 border border-zinc-200 dark:border-zinc-700/60 transition-all group cursor-pointer"
                    >
                      <div className="flex items-center justify-between gap-2 mb-1">
                        <span className="text-xs font-semibold text-zinc-900 dark:text-white leading-tight">
                          {article.title}
                        </span>
                        <span className="text-[9px] font-mono uppercase px-1.5 py-0.5 rounded bg-zinc-200 dark:bg-zinc-700 text-zinc-600 dark:text-zinc-300 flex-shrink-0">
                          {article.category}
                        </span>
                      </div>
                      <p className="text-[11px] text-zinc-500 dark:text-zinc-400 line-clamp-2 leading-relaxed">
                        {article.summary}
                      </p>
                      {matchedKeywords.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-2">
                          {matchedKeywords.slice(0, 2).map((kw, i) => (
                            <span key={i} className="text-[9px] font-mono text-indigo-500 bg-indigo-500/10 px-1.5 py-0.5 rounded">
                              {kw}
                            </span>
                          ))}
                        </div>
                      )}
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              /* 3. Off-Topic / Zero Matches Fallback */
              <div className="p-4 rounded-xl bg-zinc-50 dark:bg-zinc-800/40 border border-zinc-200 dark:border-zinc-800 text-center space-y-3 my-auto">
                <div className="w-9 h-9 rounded-lg bg-zinc-200 dark:bg-zinc-800 flex items-center justify-center mx-auto text-zinc-500">
                  <Bot className="w-4 h-4" />
                </div>
                <div className="space-y-1">
                  <h4 className="text-xs font-bold text-zinc-900 dark:text-white">
                    Pingstack Assistant
                  </h4>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400 leading-relaxed">
                    I&apos;m here to assist with WhatsApp setup, templates, campaigns, contacts, and messaging.
                  </p>
                </div>

                <div className="pt-2 flex flex-col gap-1 text-left">
                  <span className="text-[10px] font-mono text-zinc-400 uppercase tracking-wider">Suggested topics:</span>
                  <button
                    onClick={() => { setQuery(''); setActiveArticleId('connect_whatsapp_meta'); }}
                    className="text-xs text-indigo-600 dark:text-indigo-400 font-medium p-1.5 rounded hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors flex items-center justify-between"
                  >
                    <span>Connect WhatsApp Account</span>
                    <ArrowRight className="w-3 h-3" />
                  </button>
                  <button
                    onClick={() => { setQuery(''); setActiveArticleId('create_template'); }}
                    className="text-xs text-indigo-600 dark:text-indigo-400 font-medium p-1.5 rounded hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors flex items-center justify-between"
                  >
                    <span>Create a WhatsApp Template</span>
                    <ArrowRight className="w-3 h-3" />
                  </button>
                  {onOpenFeedback && (
                    <button
                      onClick={() => {
                        onClose();
                        onOpenFeedback();
                      }}
                      className="text-xs text-emerald-600 dark:text-emerald-400 font-medium p-1.5 rounded hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors flex items-center justify-between border-t border-zinc-200 dark:border-zinc-800 pt-2 mt-1"
                    >
                      <span>Request a feature / Send feedback</span>
                      <ArrowRight className="w-3 h-3" />
                    </button>
                  )}
                </div>
              </div>
            )
          ) : selectedCategory ? (
            /* 4. Category Articles View */
            <div className="space-y-3 text-left">
              <div className="flex items-center justify-between pb-2 border-b border-zinc-200 dark:border-zinc-800">
                <h4 className="text-xs font-bold text-zinc-900 dark:text-white uppercase tracking-wider">
                  {selectedCategory} Topics ({categoryArticles.length})
                </h4>
                <button
                  onClick={() => setSelectedCategory(null)}
                  className="text-xs text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-200 cursor-pointer"
                >
                  View all
                </button>
              </div>
              <div className="space-y-1.5">
                {categoryArticles.map((article) => (
                  <button
                    key={article.id}
                    onClick={() => handleSelectArticle(article.id)}
                    className="w-full text-left p-2.5 rounded-lg bg-zinc-50 dark:bg-zinc-800/40 hover:bg-zinc-100 dark:hover:bg-zinc-800 border border-zinc-200 dark:border-zinc-800 transition-all flex items-center justify-between group cursor-pointer"
                  >
                    <div className="min-w-0 pr-2">
                      <span className="text-xs font-semibold text-zinc-800 dark:text-zinc-200 group-hover:text-zinc-900 dark:group-hover:text-white truncate block">
                        {article.title}
                      </span>
                      <p className="text-[11px] text-zinc-500 dark:text-zinc-400 truncate mt-0.5">
                        {article.summary}
                      </p>
                    </div>
                    <ArrowRight className="w-3.5 h-3.5 text-zinc-400 group-hover:text-zinc-700 dark:group-hover:text-zinc-200 group-hover:translate-x-0.5 transition-all flex-shrink-0 opacity-0 group-hover:opacity-100" />
                  </button>
                ))}
              </div>
            </div>
          ) : (
            /* 5. Home Contextual Suggestions View */
            <div className="space-y-4">
              {/* Tour trigger in assistant */}
              {onStartTour && (
                <button
                  onClick={() => {
                    onClose();
                    onStartTour();
                  }}
                  className="w-full text-left p-3 rounded-xl bg-indigo-500/10 hover:bg-indigo-500/15 border border-indigo-500/20 transition-all group flex items-center justify-between gap-3 cursor-pointer"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="w-7 h-7 rounded-lg bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0">
                      <Compass className="w-4 h-4" />
                    </div>
                    <div className="min-w-0">
                      <div className="text-xs font-bold text-zinc-900 dark:text-white leading-tight">
                        Take Interactive Workspace Tour
                      </div>
                      <div className="text-[10px] text-zinc-500 dark:text-zinc-400 truncate">
                        Step-by-step walkthrough of features &amp; WhatsApp setup
                      </div>
                    </div>
                  </div>
                  <ArrowRight className="w-3.5 h-3.5 text-indigo-500 group-hover:translate-x-0.5 transition-transform shrink-0" />
                </button>
              )}

              <SuggestedQuestions
                suggestions={contextualSuggestions}
                onSelectSuggestion={handleSelectArticle}
                onSelectCategory={handleSelectCategory}
                onOpenFeedback={onOpenFeedback ? () => {
                  onClose();
                  onOpenFeedback();
                } : undefined}
                activeCategory={selectedCategory}
              />
            </div>
          )}
        </div>

        {/* Footer info & Feedback / Docs Link */}
        <div className="px-4 py-2.5 border-t border-zinc-200 dark:border-zinc-800/80 bg-zinc-50 dark:bg-zinc-950/50 flex items-center justify-between text-[11px] text-zinc-500 dark:text-zinc-400 shrink-0">
          {onOpenFeedback ? (
            <button
              onClick={() => {
                onClose();
                onOpenFeedback();
              }}
              className="inline-flex items-center gap-1.5 hover:text-zinc-900 dark:hover:text-zinc-100 font-semibold transition-colors cursor-pointer text-indigo-600 dark:text-indigo-400"
            >
              <span>Feedback &amp; Feature Requests</span>
            </button>
          ) : (
            <span className="flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-zinc-400" />
              <span>Diagnostic Engine</span>
            </span>
          )}

          <a
            href="/docs"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 hover:text-zinc-900 dark:hover:text-zinc-100 font-medium transition-colors"
          >
            <span>Documentation</span>
            <ExternalLink className="w-3 h-3" />
          </a>
        </div>
      </div>
    </div>
  );
}
