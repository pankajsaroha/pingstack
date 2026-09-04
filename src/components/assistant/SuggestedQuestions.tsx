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
          className="w-full text-left p-3.5 rounded-2xl bg-amber-500/10 hover:bg-amber-500/15 border border-amber-500/25 transition-all group flex items-start justify-between gap-3 cursor-pointer shadow-sm"
        >
          <div className="space-y-1">
            <div className="flex items-center gap-1.5">
              <AlertTriangle className="w-3.5 h-3.5 text-amber-500 flex-shrink-0" />
              <span className="text-[10px] font-black uppercase tracking-wider text-amber-600 dark:text-amber-400">
                {prioritySuggestion.badge || 'Attention'}
              </span>
            </div>
            <h4 className="text-xs font-bold text-fg leading-tight">
              {prioritySuggestion.title}
            </h4>
            {prioritySuggestion.description && (
              <p className="text-[11px] text-fg/75 leading-relaxed font-normal">
                {prioritySuggestion.description}
              </p>
            )}
          </div>
          <div className="p-1 rounded-full bg-amber-500/20 text-amber-600 dark:text-amber-400 group-hover:translate-x-0.5 transition-transform flex-shrink-0 mt-0.5">
            <ArrowRight className="w-3.5 h-3.5" />
          </div>
        </button>
      )}

      {/* Category Pills */}
      <div>
        <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-fg/60 mb-2">
          <Sparkles className="w-3 h-3 text-indigo-400" />
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
                    ? 'bg-fg text-bg shadow-sm'
                    : 'bg-glass-input hover:bg-glass-card text-fg/70 hover:text-fg border border-glass-border'
                }`}
              >
                <Icon className="w-3 h-3" />
                <span>{cat.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Suggested Questions List */}
      <div>
        <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-fg/60 mb-2">
          <HelpCircle className="w-3 h-3 text-fg/70" />
          <span>Relevant to this page</span>
        </div>
        <div className="space-y-1.5">
          {regularSuggestions.map((item) => (
            <button
              key={item.id}
              onClick={() => onSelectSuggestion(item.articleId)}
              className="w-full text-left p-2.5 rounded-xl bg-glass-card/50 hover:bg-glass-card border border-glass-border hover:border-fg/20 transition-all group flex items-center justify-between gap-2 cursor-pointer"
            >
              <div className="min-w-0 pr-2">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold text-fg/95 group-hover:text-fg truncate">
                    {item.title}
                  </span>
                  {item.badge && (
                    <span className="text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded bg-glass-input text-fg/70 border border-glass-border flex-shrink-0">
                      {item.badge}
                    </span>
                  )}
                </div>
                {item.description && (
                  <p className="text-[11px] text-fg/75 font-normal truncate mt-0.5">
                    {item.description}
                  </p>
                )}
              </div>
              <ArrowRight className="w-3.5 h-3.5 text-fg/40 group-hover:text-fg group-hover:translate-x-0.5 transition-all flex-shrink-0 opacity-0 group-hover:opacity-100" />
            </button>
          ))}
        </div>
      </div>

      {/* Feature Request & Feedback Direct Trigger */}
      {onOpenFeedback && (
        <div className="pt-2 border-t border-glass-border/60">
          <button
            onClick={onOpenFeedback}
            className="w-full text-left p-2.5 rounded-xl bg-indigo-500/5 hover:bg-indigo-500/10 border border-indigo-500/15 hover:border-indigo-500/30 transition-all group flex items-center justify-between gap-3 cursor-pointer"
          >
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-6 h-6 rounded-lg bg-indigo-500/10 text-indigo-500 flex items-center justify-center flex-shrink-0">
                <MessageSquarePlus className="w-3.5 h-3.5" />
              </div>
              <div className="min-w-0">
                <span className="text-xs font-bold text-fg block leading-tight">
                  Request a Feature or Suggestion
                </span>
                <span className="text-[10px] text-fg/70 truncate block">
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
