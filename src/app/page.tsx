'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
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
    <div className="min-h-screen bg-[#050505] text-white selection:bg-white selection:text-black overflow-x-hidden">
      <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
        <div className="absolute top-[-10%] left-[-10%] w-[60%] h-[60%] rounded-full bg-blue-600/5 blur-[140px] animate-pulse-slow" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[60%] h-[60%] rounded-full bg-indigo-600/5 blur-[140px] animate-pulse-slow" />
        <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-[0.02] contrast-150" />
      </div>

      <LandingNav onOpenAuth={setModalType} />

      {/* Hero Section */}
      <section className="relative pt-48 pb-32 px-6 z-10">
        <div className="max-w-7xl mx-auto text-center">
          <div className="inline-flex items-center space-x-2.5 px-4 py-2 bg-white/[0.02] border border-white/5 rounded-full mb-10 backdrop-blur-md">
            <div className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_8px_#10b981]" />
            <span className="text-[10px] font-black uppercase tracking-[0.25em] text-white/50">WhatsApp Business API Integrated</span>
          </div>
          
          <h1 className="text-5xl md:text-8xl font-black tracking-tight mb-8 leading-[1.05] md:leading-[0.95] max-w-5xl mx-auto">
            <span className="text-transparent bg-clip-text bg-gradient-to-b from-white to-white/60">Send WhatsApp Messages</span> <br className="hidden md:block" />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 via-indigo-400 to-white">Reliably & Instantly</span>
          </h1>
          
          <p className="text-base md:text-lg text-white/40 font-medium max-w-2xl mx-auto mb-12 leading-relaxed">
            Automate notifications, alerts, and customer engagement directly through the official Meta Cloud API — simplified for modern teams.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center space-y-4 sm:space-y-0 sm:space-x-6">
            <button 
              onClick={() => setModalType('register')}
              className="w-full sm:w-auto px-10 py-5 bg-white text-black rounded-2xl font-black text-sm uppercase tracking-[0.2em] shadow-[0_0_50px_rgba(255,255,255,0.15)] hover:bg-neutral-100 hover:scale-[1.03] active:scale-[0.97] transition-all flex items-center justify-center group cursor-pointer"
            >
              Start Building Now
              <ArrowRight className="w-4 h-4 ml-3 group-hover:translate-x-1 transition-transform" />
            </button>
          </div>
        </div>
      </section>

      {/* Featured Features Section */}
      <section className="py-32 px-6 relative overflow-hidden z-10 border-t border-white/5 bg-[#020202]/30">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-24">
            <h2 className="text-[10px] font-black uppercase tracking-[0.3em] text-blue-400 mb-4">The Platform</h2>
            <h3 className="text-4xl md:text-5xl font-black tracking-tight">Everything you need to <br className="hidden sm:block"/>scale communication</h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <FeatureCard 
              icon={<Zap className="w-5 h-5 text-blue-400" />}
              title="Instant Delivery"
              desc="Sub-second delivery utilizing ultra-reliable direct API routes. No middle-ware delays, direct to Meta."
            />
            <FeatureCard 
              icon={<Shield className="w-5 h-5 text-indigo-400" />}
              title="Template Management"
              desc="Sync, manage, and dispatch pre-approved Meta templates with dynamic variables in seconds."
            />
            <FeatureCard 
              icon={<BarChart3 className="w-5 h-5 text-blue-400" />}
              title="Real-time Analytics"
              desc="Track delivery, read rates, and interaction logs on a unified high-fidelity dashboard."
            />
          </div>
        </div>
      </section>

      {/* How it Works Section */}
      <section className="py-32 px-6 bg-white/[0.01] border-y border-white/5 relative z-10">
        <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-20 items-center">
          <div>
            <h2 className="text-[10px] font-black uppercase tracking-[0.3em] text-indigo-400 mb-4">The Workflow</h2>
            <h3 className="text-4xl md:text-5xl font-black tracking-tight mb-8">Up and running in <br/>three simple steps</h3>
            
            <div className="space-y-10 mt-12">
              <Step num="01" title="Connect Meta Cloud" desc="Link your WhatsApp Business Profile via our secure automated onboarding flow. Setup is complete in 60 seconds." />
              <Step num="02" title="Define Templates" desc="Use your pre-approved templates or construct new layouts directly within PingStack." />
              <Step num="03" title="Automate or Send" desc="Integrate our modern developer APIs or launch campaigns manually via the dashboard." />
            </div>
          </div>
          
          <div className="relative">
            <div className="absolute inset-0 bg-blue-500/10 blur-[100px] rounded-full" />
            <div className="relative bg-[#08080a] border border-white/5 rounded-[2.5rem] p-8 shadow-[0_40px_100px_rgba(0,0,0,0.8)] overflow-hidden group">
              <div className="flex items-center space-x-2 border-b border-white/5 pb-4 mb-6">
                <div className="w-2.5 h-2.5 rounded-full bg-white/10" />
                <div className="w-2.5 h-2.5 rounded-full bg-white/10" />
                <div className="w-2.5 h-2.5 rounded-full bg-white/10" />
                <span className="text-[9px] uppercase font-black tracking-widest text-white/20 ml-2">API Preview</span>
              </div>
              <pre className="text-xs sm:text-sm font-mono leading-relaxed text-indigo-300 overflow-x-auto">
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
        <div className="max-w-4xl mx-auto bg-gradient-to-br from-white/[0.03] to-transparent border border-white/5 rounded-[3rem] p-12 md:p-20 relative overflow-hidden shadow-[0_30px_100px_rgba(0,0,0,0.5)]">
          <div className="relative z-10 text-center">
            <h3 className="text-3xl md:text-4xl font-black tracking-tight mb-6 leading-tight">Built for serious operations</h3>
            <p className="text-white/40 font-medium mb-12 max-w-2xl mx-auto leading-relaxed">
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
    <div className="p-8 rounded-[2.5rem] bg-white/[0.01] border border-white/5 hover:bg-white/[0.03] hover:border-white/10 transition-all duration-300 shadow-[0_20px_50px_rgba(0,0,0,0.3)] hover:scale-[1.01] group">
      <div className="w-12 h-12 bg-white/[0.02] border border-white/5 rounded-2xl flex items-center justify-center mb-6 text-white group-hover:scale-105 transition-transform">
        {icon}
      </div>
      <h4 className="text-lg font-black mb-4 tracking-tight text-white">{title}</h4>
      <p className="text-white/40 text-sm font-medium leading-relaxed">{desc}</p>
    </div>
  );
}

function Step({ num, title, desc }: { num: string; title: string; desc: string }) {
  return (
    <div className="flex space-x-6 bg-white/[0.01] border border-white/5 p-6 rounded-[2rem] hover:bg-white/[0.02] transition-colors">
      <div className="text-[10px] font-black tracking-[0.2em] text-indigo-400 pt-1.5">{num}</div>
      <div>
        <h4 className="text-lg font-black mb-2 tracking-tight text-white">{title}</h4>
        <p className="text-white/40 text-sm font-medium leading-relaxed">{desc}</p>
      </div>
    </div>
  );
}

function TrustItem({ icon, text }: { icon: React.ReactNode; text: string }) {
  return (
    <div className="flex items-center space-x-2 text-white/50 bg-white/[0.02] border border-white/5 px-4 py-2 rounded-xl backdrop-blur-sm">
      <div className="text-emerald-400">{icon}</div>
      <span className="text-[9px] font-black uppercase tracking-[0.2em]">{text}</span>
    </div>
  );
}
