'use client';

import React from 'react';
import Link from 'next/link';
import { HelpArticle, getArticleById } from '@/data/help';
import { ArrowLeft, ArrowUpRight, CheckCircle2, AlertCircle, HelpCircle } from 'lucide-react';

interface ArticleViewProps {
  article: HelpArticle;
  onBack: () => void;
  onSelectArticle: (articleId: string) => void;
  onActionClick?: () => void;
}

export function ArticleView({
  article,
  onBack,
  onSelectArticle,
  onActionClick
}: ArticleViewProps) {
  const isError = article.category === 'errors' || !!article.errorCode;

  return (
    <div className="flex flex-col h-full animate-in fade-in slide-in-from-right-3 duration-200">
      {/* Back button & Category Header */}
      <div className="flex items-center justify-between pb-3 mb-3 border-b border-glass-border">
        <button
          onClick={onBack}
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-muted hover:text-fg transition-colors group cursor-pointer"
        >
          <ArrowLeft className="w-3.5 h-3.5 group-hover:-translate-x-0.5 transition-transform" />
          <span>Back to suggestions</span>
        </button>

        <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md ${
          isError 
            ? 'bg-red-500/10 text-red-500 border border-red-500/20' 
            : 'bg-glass-input text-muted border border-glass-border'
        }`}>
          {isError ? (article.errorCode ? `Meta ${article.errorCode}` : 'Error Diagnostic') : article.category}
        </span>
      </div>

      {/* Article Content Scrollable Area */}
      <div className="flex-1 min-h-0 overflow-y-auto pr-1 space-y-4 text-left">
        {/* Title & Summary */}
        <div>
          <h2 className="text-base font-bold text-fg tracking-tight leading-snug">
            {article.title}
          </h2>
          <p className="text-xs text-fg/75 font-medium mt-1.5 leading-relaxed">
            {article.summary}
          </p>
        </div>

        {/* What Happened Section */}
        {article.whatHappened && (
          <div className="p-3.5 rounded-xl bg-glass-input/60 border border-glass-border">
            <div className="flex items-center gap-1.5 text-[11px] font-bold text-fg mb-1.5">
              {isError ? (
                <AlertCircle className="w-3.5 h-3.5 text-amber-500" />
              ) : (
                <HelpCircle className="w-3.5 h-3.5 text-indigo-400" />
              )}
              <span>{isError ? 'Why this happens' : 'Overview'}</span>
            </div>
            <p className="text-xs text-fg/80 leading-relaxed font-normal">
              {article.whatHappened}
            </p>
          </div>
        )}

        {/* Actionable Steps */}
        {article.steps && article.steps.length > 0 && (
          <div className="space-y-2">
            <h3 className="text-xs font-bold text-fg uppercase tracking-wider flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
              <span>Recommended Steps</span>
            </h3>

            <ol className="space-y-2 text-xs">
              {article.steps.map((step, index) => (
                <li
                  key={index}
                  className="flex items-start gap-2.5 p-2.5 rounded-xl bg-glass-card/70 border border-glass-border"
                >
                  <span className="flex-shrink-0 w-4 h-4 rounded-full bg-fg/10 text-fg text-[10px] font-bold flex items-center justify-center mt-0.5">
                    {index + 1}
                  </span>
                  <span className="text-fg/80 leading-relaxed font-normal">
                    {step}
                  </span>
                </li>
              ))}
            </ol>
          </div>
        )}

        {/* Action CTA Button */}
        {article.action && (
          <div className="pt-2">
            <Link
              href={article.action.href}
              onClick={onActionClick}
              target={article.action.external ? '_blank' : undefined}
              rel={article.action.external ? 'noopener noreferrer' : undefined}
              className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-fg text-bg hover:opacity-90 rounded-xl text-xs font-bold transition-all shadow-sm active:scale-98"
            >
              <span>{article.action.label}</span>
              <ArrowUpRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        )}

        {/* Related Articles */}
        {article.relatedArticleIds && article.relatedArticleIds.length > 0 && (
          <div className="pt-3 border-t border-glass-border">
            <h4 className="text-[11px] font-bold text-fg/60 uppercase tracking-wider mb-2">
              Related Topics
            </h4>
            <div className="space-y-1.5">
              {article.relatedArticleIds.map((relId) => {
                const relArticle = getArticleById(relId);
                if (!relArticle) return null;
                return (
                  <button
                    key={relId}
                    onClick={() => onSelectArticle(relId)}
                    className="w-full text-left p-2 rounded-lg hover:bg-glass-card border border-transparent hover:border-glass-border text-xs font-medium text-fg/75 hover:text-fg transition-all flex items-center justify-between group cursor-pointer"
                  >
                    <span className="truncate pr-2">{relArticle.title}</span>
                    <ArrowUpRight className="w-3 h-3 text-fg/40 group-hover:text-fg flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity" />
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
