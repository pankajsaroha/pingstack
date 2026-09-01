'use client';

import { useState, useEffect, lazy, Suspense } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowRight, ChevronDown, HelpCircle, Loader2 } from 'lucide-react';
import { LandingNav } from '@/components/LandingNav';

const AuthModal = lazy(() => import('@/components/AuthModal').then(m => ({ default: m.AuthModal })));
const InteractiveShowcase = lazy(() => import('@/components/InteractiveShowcase').then(m => ({ default: m.InteractiveShowcase })));

export function LandingHeaderNav() {
  const [modalType, setModalType] = useState<'login' | 'register' | 'forgot' | null>(null);
  const router = useRouter();

  return (
    <>
      <LandingNav onOpenAuth={setModalType} />
      {modalType !== null && (
        <Suspense fallback={
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-[100]">
            <Loader2 className="w-8 h-8 animate-spin text-fg" />
          </div>
        }>
          <AuthModal 
            isOpen={modalType !== null} 
            onClose={() => { setModalType(null); router.replace('/'); }} 
            initialView={modalType === 'register' ? 'register' : modalType === 'forgot' ? 'forgot' : 'login'} 
          />
        </Suspense>
      )}
    </>
  );
}

export function HeroActionsSection() {
  const router = useRouter();
  const [modalType, setModalType] = useState<'login' | 'register' | 'forgot' | null>(null);
  const [tenant, setTenant] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const params = new URLSearchParams(window.location.search);
    const auth = params.get('auth');
    if (auth === 'login' || auth === 'register' || auth === 'forgot') setModalType(auth);

    const cached = sessionStorage.getItem('tenant_session');
    if (cached) {
      try {
        setTenant(JSON.parse(cached));
        setLoading(false);
      } catch (e) {}
    }

    const hasAuthCookie = document.cookie.includes('token=') || document.cookie.includes('sb-') || document.cookie.includes('auth=');
    if (!hasAuthCookie && !cached) {
      setLoading(false);
      return;
    }

    async function checkUser() {
      try {
        const res = await fetch('/api/tenant/me');
        if (res.ok) {
          const data = await res.json();
          setTenant(data);
          sessionStorage.setItem('tenant_session', JSON.stringify(data));
        }
      } catch (err) {
      } finally {
        setLoading(false);
      }
    }
    checkUser();
  }, []);

  const scrollToShowcase = () => {
    const el = document.getElementById('how-it-works');
    if (el) el.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <>
      <div className="flex flex-col sm:flex-row items-center justify-center gap-4 min-h-[52px]">
        {loading ? (
          <div className="h-14 w-56 bg-fg/5 border border-glass-border rounded-2xl animate-pulse" />
        ) : tenant ? (
          <button 
            onClick={() => router.push('/dashboard')}
            className="w-full sm:w-auto px-8 py-4 bg-fg text-bg rounded-2xl font-black text-xs uppercase tracking-[0.18em] shadow-lg hover:bg-fg/90 hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center group cursor-pointer"
          >
            Go to Dashboard
            <ArrowRight className="w-4 h-4 ml-2.5 group-hover:translate-x-1 transition-transform" />
          </button>
        ) : (
          <>
            <button 
              onClick={() => setModalType('register')}
              className="w-full sm:w-auto px-8 py-4 bg-fg text-bg rounded-2xl font-black text-xs uppercase tracking-[0.18em] shadow-lg hover:bg-fg/90 hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center group cursor-pointer"
            >
              Start for free
              <ArrowRight className="w-4 h-4 ml-2.5 group-hover:translate-x-1 transition-transform" />
            </button>

            <button 
              onClick={scrollToShowcase}
              className="w-full sm:w-auto px-6 py-4 bg-white/80 dark:bg-glass-card border border-white/80 dark:border-glass-border hover:bg-white text-fg rounded-2xl font-bold text-xs uppercase tracking-wider transition-all flex items-center justify-center cursor-pointer shadow-sm"
            >
              <span>See how it works</span>
              <ChevronDown className="w-4 h-4 ml-2 text-indigo-500 dark:text-indigo-400" />
            </button>
          </>
        )}
      </div>

      {modalType !== null && (
        <Suspense fallback={
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-[100]">
            <Loader2 className="w-8 h-8 animate-spin text-fg" />
          </div>
        }>
          <AuthModal 
            isOpen={modalType !== null} 
            onClose={() => { setModalType(null); router.replace('/'); }} 
            initialView={modalType === 'register' ? 'register' : modalType === 'forgot' ? 'forgot' : 'login'} 
          />
        </Suspense>
      )}
    </>
  );
}

export function DynamicShowcaseWrapper() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center py-20 opacity-40">
        <Loader2 className="w-8 h-8 animate-spin text-fg" />
      </div>
    }>
      <InteractiveShowcase />
    </Suspense>
  );
}

export function FAQSectionClient({ faqs }: { faqs: { q: string; a: string }[] }) {
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  return (
    <div className="space-y-4">
      {faqs.map((faq, idx) => (
        <div 
          key={idx}
          className="bg-glass-card border border-glass-border rounded-2xl p-5 transition-all cursor-pointer"
          onClick={() => setOpenFaq(openFaq === idx ? null : idx)}
        >
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-black text-fg flex items-center gap-2">
              <HelpCircle className="w-4 h-4 text-indigo-400 shrink-0" />
              {faq.q}
            </h4>
            <ChevronDown className={`w-4 h-4 text-muted transition-transform duration-200 ${openFaq === idx ? 'rotate-180' : ''}`} />
          </div>
          {openFaq === idx && (
            <p className="text-xs text-muted font-medium mt-3 leading-relaxed pt-3 border-t border-glass-border/60">
              {faq.a}
            </p>
          )}
        </div>
      ))}
    </div>
  );
}

export function CtaRegisterButton() {
  const [modalType, setModalType] = useState<'login' | 'register' | 'forgot' | null>(null);
  const router = useRouter();

  return (
    <>
      <button 
        onClick={() => setModalType('register')}
        className="px-8 py-4 bg-fg text-bg rounded-2xl font-black text-xs uppercase tracking-[0.18em] shadow-lg hover:bg-fg/90 hover:scale-[1.02] active:scale-[0.98] transition-all inline-flex items-center cursor-pointer"
      >
        Start for free
        <ArrowRight className="w-4 h-4 ml-2" />
      </button>

      {modalType !== null && (
        <Suspense fallback={
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-[100]">
            <Loader2 className="w-8 h-8 animate-spin text-fg" />
          </div>
        }>
          <AuthModal 
            isOpen={modalType !== null} 
            onClose={() => { setModalType(null); router.replace('/'); }} 
            initialView={modalType === 'register' ? 'register' : modalType === 'forgot' ? 'forgot' : 'login'} 
          />
        </Suspense>
      )}
    </>
  );
}
