'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Book, Shield, Zap, Search, ChevronRight } from 'lucide-react';
import { LandingNav } from '@/components/LandingNav';
import { LandingFooter } from '@/components/LandingFooter';
import { AuthModal } from '@/components/AuthModal';

const categories = [
  { title: 'Getting Started', icon: Zap, articles: [ { title: 'Manual Connectivity', slug: 'manual-connectivity' }, { title: 'Testing implementation', slug: 'testing-implementation' } ] },
  { title: 'Messaging API', icon: Book, articles: [ { title: 'First campaign', slug: 'first-campaign' }, { title: 'Template variables', slug: 'template-variables' } ] },
  { title: 'Billing', icon: Shield, articles: [ { title: 'Managing subs', slug: 'managing-subscriptions' }, { title: 'Refund policy', slug: 'refund-policy' } ] }
];

export default function PublicDocs() {
  const [modalType, setModalType] = useState<'login' | 'register' | null>(null);
  const [query, setQuery] = useState('');

  return (
    <div className="min-h-screen bg-[#050505] text-white">
      <LandingNav onOpenAuth={setModalType} />

      <section className="pt-40 pb-20 px-6">
        <div className="max-w-5xl mx-auto text-center mb-16">
          <h2 className="text-sm font-black text-blue-400 uppercase tracking-widest mb-4">Documentation</h2>
          <h1 className="text-5xl font-black mb-8">How can we help?</h1>
          <div className="max-w-xl mx-auto relative group">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-white/20 group-focus-within:text-blue-400 transition-colors" />
            <input 
              type="text" placeholder="Search guides..." value={query} onChange={e => setQuery(e.target.value)}
              className="w-full pl-12 pr-4 py-5 bg-white/5 border border-white/10 rounded-2xl focus:border-blue-400 focus:outline-none transition-all text-sm"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-7xl mx-auto">
          {categories.map(cat => (
            <div key={cat.title} className="p-10 rounded-[3rem] bg-white/[0.02] border border-white/5 hover:bg-white/[0.05] transition-all">
              <div className="w-12 h-12 bg-blue-500/10 text-blue-400 rounded-2xl flex items-center justify-center mb-6"><cat.icon className="w-6 h-6" /></div>
              <h3 className="text-xl font-black mb-6">{cat.title}</h3>
              <ul className="space-y-4">
                {cat.articles.map(a => (
                  <li key={a.slug}>
                    <Link href={`/docs/${a.slug}`} className="flex items-center text-sm font-bold text-white/40 hover:text-blue-400 transition-colors group">
                      {a.title} <ChevronRight className="w-3 h-3 ml-auto opacity-0 group-hover:opacity-100 transition-all" />
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </section>

      <LandingFooter />
      <AuthModal isOpen={modalType !== null} onClose={() => setModalType(null)} initialView={modalType === 'register' ? 'register' : 'login'} />
    </div>
  );
}
