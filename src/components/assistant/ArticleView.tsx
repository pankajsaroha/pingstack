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
      <div className="flex items-center justify-between pb-3 mb-3 border-b border-zinc-200 dark:border-zinc-800">
        <button
          onClick={onBack}
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100 transition-colors group cursor-pointer"
        >
          <ArrowLeft className="w-3.5 h-3.5 group-hover:-translate-x-0.5 transition-transform" />
          <span>Back to suggestions</span>
        </button>

        <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md ${
          isError 
            ? 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20' 
            : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 border border-zinc-200 dark:border-zinc-700/60'
        }`}>
          {isError ? (article.errorCode ? `Meta ${article.errorCode}` : 'Error Diagnostic') : article.category}
        </span>
      </div>

      {/* Article Content Scrollable Area */}
      <div className="flex-1 min-h-0 overflow-y-auto pr-1 space-y-4 text-left overscroll-contain">
        {/* Title & Summary */}
        <div>
          <h2 className="text-base font-bold text-zinc-900 dark:text-white tracking-tight leading-snug">
            {article.title}
          </h2>
          <p className="text-xs text-zinc-600 dark:text-zinc-300 font-medium mt-1.5 leading-relaxed">
            {article.summary}
          </p>
        </div>

        {/* What Happened Section */}
        {article.whatHappened && (
          <div className="p-3.5 rounded-xl bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-800">
            <div className="flex items-center gap-1.5 text-[11px] font-bold text-zinc-900 dark:text-white mb-1.5">
              {isError ? (
                <AlertCircle className="w-3.5 h-3.5 text-amber-500" />
              ) : (
                <HelpCircle className="w-3.5 h-3.5 text-indigo-500" />
              )}
              <span>{isError ? 'Why this happens' : 'Overview'}</span>
            </div>
            <p className="text-xs text-zinc-600 dark:text-zinc-300 leading-relaxed font-normal">
              {article.whatHappened}
            </p>
          </div>
        )}

        {/* Actionable Steps */}
        {article.steps && article.steps.length > 0 && (
          <div className="space-y-2">
            <h3 className="text-xs font-bold text-zinc-900 dark:text-white uppercase tracking-wider flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
              <span>Recommended Steps</span>
            </h3>

            <ol className="space-y-2 text-xs">
              {article.steps.map((step, index) => (
                <li
                  key={index}
                  className="flex items-start gap-2.5 p-2.5 rounded-xl bg-zinc-50 dark:bg-zinc-800/40 border border-zinc-200 dark:border-zinc-800"
                >
                  <span className="flex-shrink-0 w-4 h-4 rounded-full bg-zinc-200 dark:bg-zinc-700 text-zinc-800 dark:text-zinc-200 text-[10px] font-bold flex items-center justify-center mt-0.5">
                    {index + 1}
                  </span>
                  <span className="text-zinc-700 dark:text-zinc-300 leading-relaxed font-normal">
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
              className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 hover:bg-zinc-800 dark:hover:bg-zinc-100 rounded-xl text-xs font-bold transition-all shadow-xs active:scale-98"
            >
              <span>{article.action.label}</span>
              <ArrowUpRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        )}

        {/* Related Articles */}
        {article.relatedArticleIds && article.relatedArticleIds.length > 0 && (
          <div className="pt-3 border-t border-zinc-200 dark:border-zinc-800">
            <h4 className="text-[11px] font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider mb-2">
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
                    className="w-full text-left p-2 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 border border-transparent hover:border-zinc-200 dark:hover:border-zinc-700 text-xs font-medium text-zinc-700 dark:text-zinc-300 hover:text-zinc-900 dark:hover:text-white transition-all flex items-center justify-between group cursor-pointer"
                  >
                    <span className="truncate pr-2">{relArticle.title}</span>
                    <ArrowUpRight className="w-3 h-3 text-zinc-400 group-hover:text-zinc-700 dark:group-hover:text-zinc-200 flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity" />
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
