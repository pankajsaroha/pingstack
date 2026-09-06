'use client';

import React from 'react';
import { ContextualSuggestion, HelpCategory } from '@/data/help';
import { 
  Sparkles, 
  ArrowRight, 
  AlertTriangle, 
  HelpCircle, 
  FileCode, 
  Users, 
  Send, 
  MessageSquare, 
  Zap, 
  MessageSquarePlus,
  LucideIcon 
} from 'lucide-react';

interface SuggestedQuestionsProps {
  suggestions: ContextualSuggestion[];
  onSelectSuggestion: (articleId: string) => void;
  onSelectCategory: (category: HelpCategory) => void;
  onOpenFeedback?: () => void;
  activeCategory?: HelpCategory | null;
}

const CATEGORIES: { id: HelpCategory; label: string; icon: LucideIcon }[] = [
  { id: 'onboarding', label: 'Setup', icon: Zap },
  { id: 'templates', label: 'Templates', icon: FileCode },
  { id: 'contacts', label: 'Contacts', icon: Users },
  { id: 'campaigns', label: 'Campaigns', icon: Send },
  { id: 'messaging', label: 'Inbox', icon: MessageSquare },
  { id: 'errors', label: 'Meta Errors', icon: AlertTriangle }
];

const COMMON_ERRORS = [
  { code: '131049', articleId: 'error_131049', label: '131049' },
  { code: '132001', articleId: 'error_132001', label: '132001' },
  { code: '133010', articleId: 'error_133010', label: '133010' },
  { code: '131026', articleId: 'error_131026', label: '131026' },
  { code: '190', articleId: 'error_190', label: '190' },
];

export function SuggestedQuestions({
  suggestions,
  onSelectSuggestion,
  onSelectCategory,
  onOpenFeedback,
  activeCategory
}: SuggestedQuestionsProps) {
  const prioritySuggestion = suggestions.find((s) => s.priority && s.priority >= 100);
  const regularSuggestions = suggestions.filter((s) => !s.priority || s.priority < 100);

  return (
    <div className="space-y-4 text-left animate-in fade-in duration-200">
      {/* Priority Context Card (e.g. Account not connected / Pending Meta approval) */}
      {prioritySuggestion && (
        <button
          onClick={() => onSelectSuggestion(prioritySuggestion.articleId)}
          className="w-full text-left p-3.5 rounded-xl bg-amber-500/10 hover:bg-amber-500/15 border border-amber-500/25 transition-all group flex items-start justify-between gap-3 cursor-pointer shadow-xs"
        >
          <div className="space-y-1">
            <div className="flex items-center gap-1.5">
              <AlertTriangle className="w-3.5 h-3.5 text-amber-500 flex-shrink-0" />
              <span className="text-[10px] font-black uppercase tracking-wider text-amber-600 dark:text-amber-400">
                {prioritySuggestion.badge || 'Attention'}
              </span>
            </div>
            <h4 className="text-xs font-bold text-zinc-900 dark:text-white leading-tight">
              {prioritySuggestion.title}
            </h4>
            {prioritySuggestion.description && (
              <p className="text-[11px] text-zinc-600 dark:text-zinc-300 leading-relaxed font-normal">
                {prioritySuggestion.description}
              </p>
            )}
          </div>
          <div className="p-1 rounded-full bg-amber-500/20 text-amber-600 dark:text-amber-400 group-hover:translate-x-0.5 transition-transform flex-shrink-0 mt-0.5">
            <ArrowRight className="w-3.5 h-3.5" />
          </div>
        </button>
      )}

      {/* Category Exploration Pills */}
      <div>
        <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 mb-2">
          <Sparkles className="w-3 h-3 text-indigo-500" />
          <span>Explore Topics</span>
        </div>
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none no-scrollbar">
          {CATEGORIES.map((cat) => {
            const Icon = cat.icon;
            const isSelected = activeCategory === cat.id;
            return (
              <button
                key={cat.id}
                onClick={() => onSelectCategory(cat.id)}
                className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[11px] font-semibold transition-all shrink-0 cursor-pointer ${
                  isSelected
                    ? 'bg-zinc-900 text-white dark:bg-white dark:text-zinc-900 shadow-xs'
                    : 'bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200/70 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-300 border border-zinc-200/80 dark:border-zinc-700/60'
                }`}
              >
                <Icon className="w-3 h-3" />
                <span>{cat.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Common Meta Errors Quick Access */}
      <div>
        <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 mb-2">
          <AlertTriangle className="w-3 h-3 text-amber-500" />
          <span>Common Meta Errors</span>
        </div>
        <div className="flex items-center gap-1.5 flex-wrap">
          {COMMON_ERRORS.map((err) => (
            <button
              key={err.code}
              onClick={() => onSelectSuggestion(err.articleId)}
              className="px-2 py-1 rounded-md text-[11px] font-mono font-semibold bg-rose-500/10 hover:bg-rose-500/20 text-rose-600 dark:text-rose-400 border border-rose-500/20 transition-colors cursor-pointer"
            >
              [{err.label}]
            </button>
          ))}
        </div>
      </div>

      {/* Suggested Questions List */}
      <div>
        <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 mb-2">
          <HelpCircle className="w-3 h-3 text-zinc-400" />
          <span>Popular &amp; Relevant Topics</span>
        </div>
        <div className="space-y-1.5">
          {regularSuggestions.map((item) => (
            <button
              key={item.id}
              onClick={() => onSelectSuggestion(item.articleId)}
              className="w-full text-left p-2.5 rounded-xl bg-zinc-50 dark:bg-zinc-800/40 hover:bg-zinc-100 dark:hover:bg-zinc-800 border border-zinc-200 dark:border-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-700 transition-all group flex items-center justify-between gap-2 cursor-pointer"
            >
              <div className="min-w-0 pr-2">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold text-zinc-900 dark:text-zinc-100 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 truncate">
                    {item.title}
                  </span>
                  {item.badge && (
                    <span className="text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded bg-zinc-200/80 dark:bg-zinc-700 text-zinc-600 dark:text-zinc-300 border border-zinc-300/50 dark:border-zinc-600 flex-shrink-0">
                      {item.badge}
                    </span>
                  )}
                </div>
                {item.description && (
                  <p className="text-[11px] text-zinc-500 dark:text-zinc-400 font-normal truncate mt-0.5">
                    {item.description}
                  </p>
                )}
              </div>
              <ArrowRight className="w-3.5 h-3.5 text-zinc-400 group-hover:text-indigo-500 group-hover:translate-x-0.5 transition-all flex-shrink-0 opacity-0 group-hover:opacity-100" />
            </button>
          ))}
        </div>
      </div>

      {/* Feature Request & Feedback Direct Trigger */}
      {onOpenFeedback && (
        <div className="pt-2 border-t border-zinc-200 dark:border-zinc-800">
          <button
            onClick={onOpenFeedback}
            className="w-full text-left p-2.5 rounded-xl bg-indigo-500/5 hover:bg-indigo-500/10 border border-indigo-500/15 hover:border-indigo-500/30 transition-all group flex items-center justify-between gap-3 cursor-pointer"
          >
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-6 h-6 rounded-lg bg-indigo-500/10 text-indigo-500 flex items-center justify-center flex-shrink-0">
                <MessageSquarePlus className="w-3.5 h-3.5" />
              </div>
              <div className="min-w-0">
                <span className="text-xs font-bold text-zinc-900 dark:text-white block leading-tight">
                  Request a Feature or Suggestion
                </span>
                <span className="text-[10px] text-zinc-500 dark:text-zinc-400 truncate block">
                  Tell us what would make Pingstack better for you
                </span>
              </div>
            </div>
            <ArrowRight className="w-3.5 h-3.5 text-indigo-500 group-hover:translate-x-0.5 transition-transform flex-shrink-0" />
          </button>
        </div>
      )}
    </div>
  );
}
