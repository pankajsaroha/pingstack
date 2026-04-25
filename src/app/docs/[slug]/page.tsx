'use client';

import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { ChevronLeft, Clock, User, Share2, Copy, Check, Shield, Activity, Key, Smartphone, AlertCircle, CreditCard, Calendar, Zap, MessageSquare, Globe, ShieldCheck } from 'lucide-react';
import { useState } from 'react';
import { LandingNav } from '@/components/LandingNav';
import { LandingFooter } from '@/components/LandingFooter';
import { AuthModal } from '@/components/AuthModal';

const DOCS_CONTENT: Record<string, { title: string; category: string; readTime: string; content: React.ReactNode; }> = {
  'manual-connectivity': {
    title: 'Manual Connectivity Guide', category: 'Getting Started', readTime: '4 min',
    content: (
      <div className="space-y-6">
        <p>Connecting your WhatsApp Business Account (WABA) manually allows for full control over your messaging infrastructure.</p>
        <div className="bg-blue-500/10 p-6 rounded-3xl border border-blue-500/20 text-blue-400">
          <h3 className="font-bold mb-2">Pro Tip</h3>
          <p className="text-sm">Ensure your Meta Business Account is verified to remove the daily message limit.</p>
        </div>
      </div>
    )
  },
  'testing-implementation': {
    title: 'Testing your implementation', category: 'Getting Started', readTime: '2 min',
    content: ( <div className="space-y-6"><p>Before launching a large-scale campaign, verify your webhook connectivity using Meta's test numbers.</p></div> )
  },
  'managing-subscriptions': {
    title: 'Managing Subscriptions', category: 'Billing', readTime: '5 min',
    content: ( <div className="space-y-6"><p>Monitor account health, limits, and billing status in real-time on your dashboard.</p></div> )
  }
  // ... others can be added or imported from a central config
};

export default function PublicArticle() {
  const { slug } = useParams();
  const [modalType, setModalType] = useState<'login' | 'register' | null>(null);
  const article = DOCS_CONTENT[slug as string];

  if (!article) return <div className="text-white text-center py-40">Article not found.</div>;

  return (
    <div className="min-h-screen bg-[#050505] text-white">
      <LandingNav onOpenAuth={setModalType} />

      <header className="pt-48 pb-12 px-6 border-b border-white/5">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center space-x-2 text-[10px] font-black text-blue-400 uppercase tracking-widest mb-4">
            <span>Docs</span><span>/</span><span>{article.category}</span>
          </div>
          <h1 className="text-4xl md:text-6xl font-black mb-8 leading-tight">{article.title}</h1>
          <div className="flex items-center space-x-6 text-xs font-bold text-white/40 uppercase tracking-widest">
            <span className="flex items-center"><User className="w-4 h-4 mr-2" /> Team</span>
            <span className="flex items-center"><Clock className="w-4 h-4 mr-2" /> {article.readTime}</span>
          </div>
        </div>
      </header>

      <main className="py-20 px-6">
        <article className="max-w-4xl mx-auto prose prose-invert prose-blue">
          {article.content}
        </article>
      </main>

      <LandingFooter />
      <AuthModal isOpen={modalType !== null} onClose={() => setModalType(null)} initialView={modalType === 'register' ? 'register' : 'login'} />
    </div>
  );
}
