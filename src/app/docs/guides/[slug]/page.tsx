'use client';

import React from 'react';
import { useParams, notFound } from 'next/navigation';
import Link from 'next/link';
import { Clock, ChevronRight, Info, CheckCircle2, AlertTriangle, ArrowLeft, ArrowRight } from 'lucide-react';
import { DOCS_GUIDES, DOCS_NAVIGATION, DocSection } from '@/lib/docs/content';
import { CodeBlock } from '@/components/docs/CodeBlock';

export default function DocsGuidePage() {
  const params = useParams();
  const slug = params?.slug as string;

  const guide = DOCS_GUIDES[slug];
  if (!guide) {
    notFound();
  }

  return (
    <article className="space-y-10 animate-in fade-in duration-200">
      {/* Breadcrumb & Header */}
      <div className="border-b border-zinc-200 dark:border-zinc-800 pb-8">
        <div className="flex items-center space-x-2 text-xs font-semibold text-zinc-500 dark:text-zinc-400 mb-3">
          <Link href="/docs" className="hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors">Docs</Link>
          <ChevronRight className="w-3 h-3 text-zinc-400" />
          <span className="uppercase tracking-wider text-[11px] font-bold text-indigo-600 dark:text-indigo-400">Integration Guides</span>
        </div>

        <h1 className="text-3xl sm:text-4xl font-black tracking-tight text-zinc-900 dark:text-zinc-50">
          {guide.title}
        </h1>

        <p className="mt-3 text-base text-zinc-600 dark:text-zinc-400 leading-relaxed max-w-3xl">
          {guide.description}
        </p>

        <div className="flex items-center space-x-4 mt-4 text-xs font-medium text-zinc-400">
          <span className="flex items-center space-x-1">
            <Clock className="w-3.5 h-3.5 mr-1" />
            {guide.readTime} read
          </span>
          <span>•</span>
          <span>Guide</span>
        </div>
      </div>

      {/* Guide Sections */}
      <div className="space-y-12">
        {guide.sections.map((section: DocSection) => (
          <section key={section.id} id={section.id} className="scroll-mt-24 space-y-4">
            <h2 className="text-xl sm:text-2xl font-bold text-zinc-900 dark:text-zinc-100 tracking-tight">
              {section.title}
            </h2>

            {section.content && (
              <div className="prose prose-zinc dark:prose-invert max-w-none text-sm text-zinc-600 dark:text-zinc-300 leading-relaxed whitespace-pre-line">
                {section.content}
              </div>
            )}

            {section.codeSnippets && (
              <CodeBlock snippets={section.codeSnippets} />
            )}
          </section>
        ))}
      </div>

      {/* Footer Navigation */}
      <div className="pt-10 mt-16 border-t border-zinc-200 dark:border-zinc-800 flex justify-between">
        <Link
          href="/docs/campaigns"
          className="inline-flex items-center space-x-2 text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:underline"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to Campaigns API</span>
        </Link>
        <Link
          href="/docs/api-reference"
          className="inline-flex items-center space-x-2 text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:underline"
        >
          <span>Explore API Reference</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </Link>
      </div>
    </article>
  );
}
