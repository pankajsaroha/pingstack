'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Book, Shield, Zap, Search, ChevronRight } from 'lucide-react';
import { LandingNav } from '@/components/LandingNav';
import { LandingFooter } from '@/components/LandingFooter';
import { AuthModal } from '@/components/AuthModal';

const categories = [
  { 
    title: 'Getting Started', 
    icon: Zap, 
    articles: [ 
      { title: 'Manual Connectivity', slug: 'manual-connectivity' }, 
      { title: 'Testing Implementation', slug: 'testing-implementation' } 
    ] 
  },
  { 
    title: 'Messaging API', 
    icon: Book, 
    articles: [ 
      { title: 'First Campaign', slug: 'first-campaign' }, 
      { title: 'Template Variables', slug: 'template-variables' } 
    ] 
  },
  { 
    title: 'Billing & Compliance', 
    icon: Shield, 
    articles: [ 
      { title: 'Managing Subscriptions', slug: 'managing-subscriptions' }, 
      { title: 'Refund Policy', slug: 'refund-policy' } 
    ] 
  }
];

export default function PublicDocs() {
  const [modalType, setModalType] = useState<'login' | 'register' | 'forgot' | null>(null);
  const [query, setQuery] = useState('');

  return (
    <div className="min-h-screen bg-bg text-fg selection:bg-fg selection:text-bg transition-colors duration-300">
      <LandingNav onOpenAuth={setModalType} />

      <section className="pt-48 pb-32 px-6">
        <div className="max-w-5xl mx-auto text-center mb-24">
          <h2 className="text-[10px] font-black text-indigo-600 dark:text-indigo-400 uppercase tracking-[0.25em] mb-4">PingStack Documentation</h2>
          <h1 className="text-5xl md:text-6xl font-black mb-8 tracking-tight text-fg">How can we help?</h1>
          <div className="max-w-xl mx-auto relative group">
            <Search className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-muted/50 group-focus-within:text-indigo-500 transition-colors" />
            <input 
              type="text" 
              placeholder="Search guidebooks, API schemas, and sync errors..." 
              value={query} 
              onChange={e => setQuery(e.target.value)}
              className="w-full pl-14 pr-5 py-4.5 bg-glass-input border border-glass-input-border rounded-2xl focus:bg-glass-card focus:border-indigo-500 focus:outline-none focus:ring-4 focus:ring-indigo-500/5 transition-all text-sm font-semibold text-fg placeholder:text-muted/40"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-7xl mx-auto items-stretch">
          {categories.map(cat => (
            <div 
              key={cat.title} 
              className="p-8 rounded-[2.5rem] bg-glass-card border border-glass-border hover:bg-glass-card/50 hover:scale-[1.01] transition-all duration-300 shadow-lg flex flex-col justify-between"
            >
              <div>
                <div className="w-12 h-12 bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/15 rounded-2xl flex items-center justify-center mb-8">
                  <cat.icon className="w-5 h-5" />
                </div>
                <h3 className="text-xl font-black mb-6 tracking-tight text-fg">{cat.title}</h3>
                <ul className="space-y-4">
                  {cat.articles.map(a => (
                    <li key={a.slug}>
                      <Link href={`/docs/${a.slug}`} className="flex items-center text-sm font-bold text-muted hover:text-fg transition-all group">
                        {a.title} 
                        <ChevronRight className="w-3.5 h-3.5 ml-auto opacity-0 group-hover:opacity-100 group-hover:translate-x-1 transition-all text-indigo-500 dark:text-indigo-400" />
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          ))}
        </div>
      </section>

      <LandingFooter />
      <AuthModal isOpen={modalType !== null} onClose={() => setModalType(null)} initialView={modalType === 'register' ? 'register' : 'login'} />
    </div>
  );
}
