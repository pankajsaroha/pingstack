'use client';

import { useState, useEffect } from 'react';
import { 
  ArrowRight, CheckCircle2, 
  Zap, BarChart3, Shield,
  Smartphone, Globe, LockIcon
} from 'lucide-react';
import { LandingNav } from '@/components/LandingNav';
import { LandingFooter } from '@/components/LandingFooter';
import { AuthModal } from '@/components/AuthModal';
import { useRouter } from 'next/navigation';

export default function Home() {
  const router = useRouter();
  const [modalType, setModalType] = useState<'login' | 'register' | 'forgot' | null>(null);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const params = new URLSearchParams(window.location.search);
    const auth = params.get('auth');
    if (auth === 'login' || auth === 'register' || auth === 'forgot') setModalType(auth);
  }, []);

  return (
    <div className="min-h-screen bg-bg text-fg selection:bg-fg selection:text-bg overflow-x-hidden transition-colors duration-300">
      {/* Background ambient glows */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
        <div className="absolute top-[-10%] left-[-10%] w-[60%] h-[60%] rounded-full bg-blue-500/[0.03] dark:bg-blue-600/5 blur-[140px] animate-pulse-slow" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[60%] h-[60%] rounded-full bg-indigo-500/[0.03] dark:bg-indigo-600/5 blur-[140px] animate-pulse-slow" />
        <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-[0.015] dark:opacity-[0.02] contrast-150" />
      </div>

      <LandingNav onOpenAuth={setModalType} />

      {/* Hero Section */}
      <section className="relative pt-48 pb-32 px-6 z-10">
        <div className="max-w-7xl mx-auto text-center">
          <div className="inline-flex items-center space-x-2.5 px-4 py-2 bg-glass-card border border-glass-border rounded-full mb-10 backdrop-blur-md">
            <div className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_8px_#10b981]" />
            <span className="text-[10px] font-black uppercase tracking-[0.25em] text-muted">WhatsApp Business API Integrated</span>
          </div>
          
          <h1 className="text-5xl md:text-8xl font-black tracking-tight mb-8 leading-[1.05] md:leading-[0.95] max-w-5xl mx-auto">
            <span className="text-transparent bg-clip-text bg-gradient-to-b from-fg to-fg/60">Send WhatsApp Messages</span> <br className="hidden md:block" />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-500 via-indigo-500 to-fg dark:from-blue-400 dark:via-indigo-400 dark:to-white">Reliably & Instantly</span>
          </h1>
          
          <p className="text-base md:text-lg text-muted font-medium max-w-2xl mx-auto mb-12 leading-relaxed">
            Automate notifications, alerts, and customer engagement directly through the official Meta Cloud API — simplified for modern teams.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center space-y-4 sm:space-y-0 sm:space-x-6">
            <button 
              onClick={() => setModalType('register')}
              className="w-full sm:w-auto px-10 py-5 bg-fg text-bg rounded-2xl font-black text-sm uppercase tracking-[0.2em] shadow-md hover:bg-fg/90 hover:scale-[1.03] active:scale-[0.97] transition-all flex items-center justify-center group cursor-pointer"
            >
              Start Building Now
              <ArrowRight className="w-4 h-4 ml-3 group-hover:translate-x-1 transition-transform" />
            </button>
          </div>
        </div>
      </section>

      {/* Featured Features Section */}
      <section className="py-32 px-6 relative overflow-hidden z-10 border-t border-glass-border bg-glass-card/10 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-24">
            <h2 className="text-[10px] font-black uppercase tracking-[0.3em] text-indigo-600 dark:text-indigo-400 mb-4">The Platform</h2>
            <h3 className="text-4xl md:text-5xl font-black tracking-tight text-fg">Everything you need to <br className="hidden sm:block"/>scale communication</h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <FeatureCard 
              icon={<Zap className="w-5 h-5" />}
              title="Instant Delivery"
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
              desc="Track delivery, read rates, and interaction logs on a unified high-fidelity dashboard."
            />
          </div>
        </div>
      </section>

      {/* How it Works Section */}
      <section className="py-32 px-6 bg-glass-card/5 border-y border-glass-border relative z-10">
        <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-20 items-center">
          <div>
            <h2 className="text-[10px] font-black uppercase tracking-[0.3em] text-indigo-600 dark:text-indigo-400 mb-4">The Workflow</h2>
            <h3 className="text-4xl md:text-5xl font-black tracking-tight mb-8 text-fg">Up and running in <br/>three simple steps</h3>
            
            <div className="space-y-6 mt-12">
              <Step num="01" title="Connect Meta Cloud" desc="Link your WhatsApp Business Profile via our secure automated onboarding flow. Setup is complete in 60 seconds." />
              <Step num="02" title="Define Templates" desc="Use your pre-approved templates or construct new layouts directly within PingStack." />
              <Step num="03" title="Automate or Send" desc="Integrate our modern developer APIs or launch campaigns manually via the dashboard." />
            </div>
          </div>
          
          <div className="relative">
            <div className="absolute inset-0 bg-blue-500/[0.04] blur-[100px] rounded-full" />
            <div className="relative bg-glass-card border border-glass-border rounded-[2.5rem] p-8 shadow-xl overflow-hidden group">
              <div className="flex items-center space-x-2 border-b border-glass-border pb-4 mb-6">
                <div className="w-2.5 h-2.5 rounded-full bg-fg/10" />
                <div className="w-2.5 h-2.5 rounded-full bg-fg/10" />
                <div className="w-2.5 h-2.5 rounded-full bg-fg/10" />
                <span className="text-[9px] uppercase font-black tracking-widest text-muted ml-2">API Preview</span>
              </div>
              <pre className="text-xs sm:text-sm font-mono leading-relaxed text-indigo-600 dark:text-indigo-300 overflow-x-auto">
{`POST /api/messages/send
{
  "to": "+919876543210",
  "template": "confirmed",
  "data": { "order_id": "8872" }
}

// Response
{ "status": "queued", "id": "wamid..." }`}
              </pre>
            </div>
          </div>
        </div>
      </section>

      {/* Trust Section */}
      <section className="py-32 px-6 relative z-10">
        <div className="max-w-4xl mx-auto bg-glass-card border border-glass-border rounded-[3rem] p-12 md:p-20 relative overflow-hidden shadow-lg">
          <div className="relative z-10 text-center">
            <h3 className="text-3xl md:text-4xl font-black tracking-tight mb-6 leading-tight text-fg">Built for serious operations</h3>
            <p className="text-muted font-medium mb-12 max-w-2xl mx-auto leading-relaxed">
              We connect directly to Meta APIs, adhering to the highest global standards for compliance and data privacy.
            </p>
            <div className="flex flex-wrap justify-center gap-x-12 gap-y-6">
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
    <div className="flex space-x-6 bg-glass-card border border-glass-border p-6 rounded-[2rem] hover:bg-glass-card/40 transition-colors">
      <div className="text-[10px] font-black tracking-[0.2em] text-indigo-600 dark:text-indigo-400 pt-1.5">{num}</div>
      <div>
        <h4 className="text-lg font-black mb-2 tracking-tight text-fg">{title}</h4>
        <p className="text-muted text-sm font-medium leading-relaxed">{desc}</p>
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
