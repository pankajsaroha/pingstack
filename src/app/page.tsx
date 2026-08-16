'use client';

import { useState, useEffect } from 'react';
import { 
  ArrowRight, CheckCircle2, 
  Zap, BarChart3, Shield,
  Smartphone, Globe, LockIcon, Sparkles, MessageSquare, Users, Send, ChevronDown
} from 'lucide-react';
import { LandingNav } from '@/components/LandingNav';
import { LandingFooter } from '@/components/LandingFooter';
import { AuthModal } from '@/components/AuthModal';
import { InteractiveShowcase } from '@/components/InteractiveShowcase';
import { useRouter } from 'next/navigation';

export default function Home() {
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
      } catch (e) {}
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
    const el = document.getElementById('product-showcase');
    if (el) el.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <div className="min-h-screen bg-bg text-fg selection:bg-fg selection:text-bg overflow-x-hidden transition-colors duration-300">
      {/* Background ambient glows */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
        <div className="absolute top-[-10%] left-[-10%] w-[60%] h-[60%] rounded-full bg-blue-500/[0.04] dark:bg-blue-600/10 blur-[140px] animate-pulse-slow" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[60%] h-[60%] rounded-full bg-indigo-500/[0.04] dark:bg-indigo-600/10 blur-[140px] animate-pulse-slow" />
      </div>

      <LandingNav onOpenAuth={setModalType} />

      {/* Premium Hero Section */}
      <section className="relative pt-28 md:pt-36 pb-12 px-6 z-10">
        <div className="max-w-5xl mx-auto text-center">
          <div className="inline-flex items-center space-x-2 px-4 py-1.5 bg-glass-card border border-glass-border rounded-full mb-6 backdrop-blur-md shadow-sm">
            <div className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_8px_#10b981]" />
            <span className="text-[10px] font-black uppercase tracking-[0.2em] text-muted">Official Meta WhatsApp Cloud API Engine</span>
          </div>
          
          <h1 className="text-3xl sm:text-5xl md:text-6xl font-black tracking-tight mb-6 leading-[1.1] max-w-4xl mx-auto">
            <span className="text-transparent bg-clip-text bg-gradient-to-b from-fg to-fg/70">Send WhatsApp Campaigns</span> <br className="hidden sm:block" />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-500 via-indigo-500 to-emerald-400 dark:from-blue-400 dark:via-indigo-400 dark:to-emerald-300">Instantly & At Scale</span>
          </h1>
          
          <p className="text-xs sm:text-base text-muted font-medium max-w-2xl mx-auto mb-8 leading-relaxed">
            Automate customer alerts, group broadcasts, and live support streaming directly through official Meta Cloud API — built for growth teams.
          </p>

          {/* Action Buttons */}
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
                  Start Messaging Now
                  <ArrowRight className="w-4 h-4 ml-2.5 group-hover:translate-x-1 transition-transform" />
                </button>

                <button 
                  onClick={scrollToShowcase}
                  className="w-full sm:w-auto px-6 py-4 bg-glass-card border border-glass-border hover:bg-glass-card/60 text-fg rounded-2xl font-bold text-xs uppercase tracking-wider transition-all flex items-center justify-center cursor-pointer"
                >
                  <span>Explore Platform Tour</span>
                  <ChevronDown className="w-4 h-4 ml-2 text-indigo-400" />
                </button>
              </>
            )}
          </div>

          {/* Social Proof & Metrics Strip */}
          <div className="mt-10 pt-8 border-t border-glass-border/60 flex flex-wrap items-center justify-center gap-x-8 gap-y-3 text-[10px] sm:text-xs font-bold text-muted">
            <span className="flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> 99.9% Delivery Guarantee
            </span>
            <span className="flex items-center gap-1.5">
              <Zap className="w-3.5 h-3.5 text-indigo-400" /> Sub-Second API Speed
            </span>
            <span className="flex items-center gap-1.5">
              <Shield className="w-3.5 h-3.5 text-blue-400" /> Direct Meta Cloud API
            </span>
            <span className="flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-emerald-400" /> 10M+ Messages Sent
            </span>
          </div>

        </div>
      </section>

      {/* AUTO MOVING SLIDES SHOWCASE SECTION */}
      <section id="product-showcase" className="relative z-10 py-6 scroll-mt-20">
        <InteractiveShowcase />
      </section>

      {/* Featured Core Features Section */}
      <section className="py-24 px-6 relative overflow-hidden z-10 border-t border-glass-border bg-glass-card/10 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-[10px] font-black uppercase tracking-[0.3em] text-indigo-600 dark:text-indigo-400 mb-3">Platform Architecture</h2>
            <h3 className="text-3xl sm:text-4xl font-black tracking-tight text-fg">Everything you need to <br className="hidden sm:block"/>scale WhatsApp communications</h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <FeatureCard 
              icon={<Zap className="w-5 h-5" />}
              title="Instant Delivery Grid"
              desc="Sub-second delivery utilizing ultra-reliable direct API routes. No middle-ware delays, direct to Meta."
            />
            <FeatureCard 
              icon={<Shield className="w-5 h-5" />}
              title="Template Management"
              desc="Sync, manage, and dispatch pre-approved Meta templates with dynamic variables in seconds."
            />
            <FeatureCard 
              icon={<BarChart3 className="w-5 h-5" />}
              title="Real-time Analytics"
              desc="Track delivery ticks, read rates, and interaction logs on a unified high-fidelity dashboard."
            />
          </div>
        </div>
      </section>

      {/* Workflow Section */}
      <section className="py-24 px-6 bg-glass-card/5 border-y border-glass-border relative z-10">
        <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
          <div>
            <h2 className="text-[10px] font-black uppercase tracking-[0.3em] text-indigo-600 dark:text-indigo-400 mb-3">The Workflow</h2>
            <h3 className="text-3xl sm:text-4xl font-black tracking-tight mb-6 text-fg">Up and running in <br/>three simple steps</h3>
            
            <div className="space-y-4 mt-8">
              <Step num="01" title="Connect Meta Cloud" desc="Link your WhatsApp Business Profile via secure automated onboarding flow. Setup is complete in 60 seconds." />
              <Step num="02" title="Define Templates & Groups" desc="Create pre-approved templates and segment contacts into dynamic targeted audience groups." />
              <Step num="03" title="Automate or Send" desc="Integrate modern developer REST APIs or launch broadcast campaigns manually via dashboard." />
            </div>
          </div>
          
          <div className="relative">
            <div className="absolute inset-0 bg-blue-500/[0.04] blur-[100px] rounded-full" />
            <div className="relative bg-glass-card border border-glass-border rounded-[2.5rem] p-8 shadow-xl overflow-hidden group">
              <div className="flex items-center space-x-2 border-b border-glass-border pb-4 mb-6">
                <div className="w-2.5 h-2.5 rounded-full bg-fg/10" />
                <div className="w-2.5 h-2.5 rounded-full bg-fg/10" />
                <div className="w-2.5 h-2.5 rounded-full bg-fg/10" />
                <span className="text-[9px] uppercase font-black tracking-widest text-muted ml-2">REST API Endpoint</span>
              </div>
              <pre className="text-xs sm:text-sm font-mono leading-relaxed text-indigo-600 dark:text-indigo-300 overflow-x-auto">
{`POST /api/v1/messages/send
{
  "to": "+919876543210",
  "template": "order_shipped",
  "language": "en_US",
  "variables": { "1": "Rahul", "2": "8872" }
}

// Response
{ 
  "status": "queued",
  "wamid": "wamid.HBgLOTE5ODc2NTQzMjEwFQIAERgSQTU1...",
  "delivered_at": "2026-08-16T18:50:00Z"
}`}
              </pre>
            </div>
          </div>
        </div>
      </section>

      {/* Trust Section */}
      <section className="py-24 px-6 relative z-10">
        <div className="max-w-4xl mx-auto bg-glass-card border border-glass-border rounded-[3rem] p-10 md:p-16 relative overflow-hidden shadow-lg">
          <div className="relative z-10 text-center">
            <h3 className="text-2xl md:text-4xl font-black tracking-tight mb-4 leading-tight text-fg">Built for serious WhatsApp operations</h3>
            <p className="text-muted text-sm font-medium mb-10 max-w-2xl mx-auto leading-relaxed">
              We connect directly to Meta APIs, adhering to official Graph API specifications and high-availability webhook callbacks.
            </p>
            <div className="flex flex-wrap justify-center gap-x-10 gap-y-4">
              <TrustItem icon={<CheckCircle2 className="w-4 h-4" />} text="Official Meta Cloud" />
              <TrustItem icon={<LockIcon className="w-4 h-4" />} text="Secure Key Encryption" />
              <TrustItem icon={<Globe className="w-4 h-4" />} text="Global Delivery Grid" />
              <TrustItem icon={<Smartphone className="w-4 h-4" />} text="Verified API Profiles" />
            </div>
          </div>
        </div>
      </section>

      <LandingFooter />

      <AuthModal 
        isOpen={modalType !== null} 
        onClose={() => { setModalType(null); router.replace('/'); }} 
        initialView={modalType === 'register' ? 'register' : modalType === 'forgot' ? 'forgot' : 'login'} 
      />
    </div>
  );
}

function FeatureCard({ icon, title, desc }: { icon: React.ReactNode; title: string, desc: string }) {
  return (
    <div className="p-8 rounded-[2.5rem] bg-glass-card border border-glass-border hover:bg-glass-card/40 transition-all duration-300 shadow-md hover:scale-[1.01] group">
      <div className="w-12 h-12 bg-glass-input border border-glass-input-border rounded-2xl flex items-center justify-center mb-6 text-fg group-hover:scale-105 transition-transform">
        {icon}
      </div>
      <h4 className="text-lg font-black mb-4 tracking-tight text-fg">{title}</h4>
      <p className="text-muted text-sm font-medium leading-relaxed">{desc}</p>
    </div>
  );
}

function Step({ num, title, desc }: { num: string; title: string; desc: string }) {
  return (
    <div className="flex space-x-6 bg-glass-card border border-glass-border p-5 rounded-[2rem] hover:bg-glass-card/40 transition-colors">
      <div className="text-[10px] font-black tracking-[0.2em] text-indigo-600 dark:text-indigo-400 pt-1.5">{num}</div>
      <div>
        <h4 className="text-base font-black mb-1.5 tracking-tight text-fg">{title}</h4>
        <p className="text-muted text-xs sm:text-sm font-medium leading-relaxed">{desc}</p>
      </div>
    </div>
  );
}

function TrustItem({ icon, text }: { icon: React.ReactNode; text: string }) {
  return (
    <div className="flex items-center space-x-2 text-muted bg-glass-input border border-glass-input-border px-4 py-2 rounded-xl backdrop-blur-sm">
      <div className="text-emerald-500 dark:text-emerald-400">{icon}</div>
      <span className="text-[9px] font-black uppercase tracking-[0.2em]">{text}</span>
    </div>
  );
}
