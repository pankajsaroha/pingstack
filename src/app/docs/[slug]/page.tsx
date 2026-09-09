'use client';

import React from 'react';
import { useParams, notFound } from 'next/navigation';
import Link from 'next/link';
import { Clock, ChevronRight, AlertCircle, Info, CheckCircle2, AlertTriangle, ArrowLeft, ArrowRight } from 'lucide-react';
import { DOCS_ARTICLES, DOCS_NAVIGATION, DocSection } from '@/lib/docs/content';
import { CodeBlock } from '@/components/docs/CodeBlock';

export default function DocsArticlePage() {
  const params = useParams();
  const slug = params?.slug as string;

  const article = DOCS_ARTICLES[slug];
  if (!article) {
    notFound();
  }

  // Find next / previous navigation links
  const allNavItems = DOCS_NAVIGATION.flatMap(g => g.items);
  const currentIndex = allNavItems.findIndex(item => item.href === `/docs/${slug}`);
  const prevItem = currentIndex > 0 ? allNavItems[currentIndex - 1] : null;
  const nextItem = currentIndex >= 0 && currentIndex < allNavItems.length - 1 ? allNavItems[currentIndex + 1] : null;

  return (
    <article className="space-y-10 animate-in fade-in duration-200">
      {/* Breadcrumb & Header */}
      <div className="border-b border-zinc-200 dark:border-zinc-800 pb-8">
        <div className="flex items-center space-x-2 text-xs font-semibold text-zinc-500 dark:text-zinc-400 mb-3">
          <Link href="/docs" className="hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors">Docs</Link>
          <ChevronRight className="w-3 h-3 text-zinc-400" />
          <span className="uppercase tracking-wider text-[11px] font-bold text-indigo-600 dark:text-indigo-400">{article.category}</span>
        </div>

        <h1 className="text-3xl sm:text-4xl font-black tracking-tight text-zinc-900 dark:text-zinc-50">
          {article.title}
        </h1>

        <p className="mt-3 text-base text-zinc-600 dark:text-zinc-400 leading-relaxed max-w-3xl">
          {article.description}
        </p>

        <div className="flex items-center space-x-4 mt-4 text-xs font-medium text-zinc-400">
          <span className="flex items-center space-x-1">
            <Clock className="w-3.5 h-3.5 mr-1" />
            {article.readTime} read
          </span>
          <span>•</span>
          <span>API v1</span>
        </div>
      </div>

      {/* Article Sections */}
      <div className="space-y-12">
        {article.sections.map((section: DocSection) => (
          <section key={section.id} id={section.id} className="scroll-mt-24 space-y-4">
            <h2 className="text-xl sm:text-2xl font-bold text-zinc-900 dark:text-zinc-100 tracking-tight">
              {section.title}
            </h2>

            {section.content && (
              <div className="prose prose-zinc dark:prose-invert max-w-none text-sm text-zinc-600 dark:text-zinc-300 leading-relaxed whitespace-pre-line">
                {section.content}
              </div>
            )}

            {/* Callout */}
            {section.callout && (
              <div className={`p-4 rounded-xl border text-xs leading-relaxed flex items-start space-x-3 my-4 ${
                section.callout.type === 'warning'
                  ? 'bg-amber-500/10 border-amber-500/30 text-amber-900 dark:text-amber-200'
                  : section.callout.type === 'tip'
                  ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-900 dark:text-emerald-200'
                  : 'bg-indigo-500/10 border-indigo-500/30 text-indigo-900 dark:text-indigo-200'
              }`}>
                {section.callout.type === 'warning' ? (
                  <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                ) : section.callout.type === 'tip' ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                ) : (
                  <Info className="w-4 h-4 text-indigo-500 shrink-0 mt-0.5" />
                )}
                <div>{section.callout.text}</div>
              </div>
            )}

            {/* Table Data */}
            {section.tableData && (
              <div className="my-6 overflow-x-auto rounded-xl border border-zinc-200 dark:border-zinc-800">
                <table className="w-full text-left text-xs">
                  <thead className="bg-zinc-100 dark:bg-zinc-900 text-zinc-700 dark:text-zinc-300 font-bold uppercase tracking-wider border-b border-zinc-200 dark:border-zinc-800">
                    <tr>
                      {section.tableData.headers.map(h => (
                        <th key={h} className="px-4 py-3">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800 text-zinc-600 dark:text-zinc-400">
                    {section.tableData.rows.map((row, idx) => (
                      <tr key={idx} className="hover:bg-zinc-50 dark:hover:bg-zinc-900/40 transition-colors">
                        {row.map((cell, cIdx) => (
                          <td key={cIdx} className="px-4 py-3 font-mono text-[11px] first:font-bold first:text-zinc-900 dark:first:text-zinc-200">
                            {cell}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* Code Snippets */}
            {section.codeSnippets && (
              <CodeBlock snippets={section.codeSnippets} />
            )}
          </section>
        ))}
      </div>

      {/* Pagination Footer */}
      <div className="pt-10 mt-16 border-t border-zinc-200 dark:border-zinc-800 grid grid-cols-1 sm:grid-cols-2 gap-4">
        {prevItem ? (
          <Link
            href={prevItem.href}
            className="p-4 rounded-xl border border-zinc-200 dark:border-zinc-800 hover:border-indigo-500/50 bg-white dark:bg-zinc-900/40 transition-all text-left group"
          >
            <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider flex items-center space-x-1 mb-1">
              <ArrowLeft className="w-3 h-3 group-hover:-translate-x-0.5 transition-transform" />
              <span>Previous</span>
            </span>
            <span className="text-sm font-bold text-zinc-900 dark:text-zinc-100 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
              {prevItem.title}
            </span>
          </Link>
        ) : <div />}

        {nextItem && (
          <Link
            href={nextItem.href}
            className="p-4 rounded-xl border border-zinc-200 dark:border-zinc-800 hover:border-indigo-500/50 bg-white dark:bg-zinc-900/40 transition-all text-right group sm:ml-auto w-full"
          >
            <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider flex items-center justify-end space-x-1 mb-1">
              <span>Next</span>
              <ArrowRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
            </span>
            <span className="text-sm font-bold text-zinc-900 dark:text-zinc-100 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
              {nextItem.title}
            </span>
          </Link>
        )}
      </div>
    </article>
  );
}
