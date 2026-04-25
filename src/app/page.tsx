'use client';

import { useState } from 'react';
import Link from 'next/link';
import { 
  ArrowRight, CheckCircle2, 
  Zap, BarChart3, Shield,
  Smartphone, Globe, LockIcon
} from 'lucide-react';
import { LandingNav } from '@/components/LandingNav';
import { LandingFooter } from '@/components/LandingFooter';
import { AuthModal } from '@/components/AuthModal';

export default function Home() {
  const [modalType, setModalType] = useState<'login' | 'register' | null>(null);

  return (
    <div className="min-h-screen bg-[#050505] text-white selection:bg-white selection:text-black">
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-[-10%] left-[-10%] w-[60%] h-[60%] rounded-full bg-blue-600/10 blur-[120px]" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[60%] h-[60%] rounded-full bg-indigo-600/10 blur-[120px]" />
        <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-[0.03] contrast-150" />
      </div>

      <LandingNav onOpenAuth={setModalType} />

      {/* Hero Section */}
      <section className="relative pt-48 pb-32 px-6">
        <div className="max-w-7xl mx-auto text-center">
          <div className="inline-flex items-center space-x-2 px-4 py-2 bg-white/5 border border-white/10 rounded-full mb-10">
            <div className="w-2 h-2 rounded-full bg-green-500" />
            <span className="text-[10px] font-black uppercase tracking-widest text-white/50">WhatsApp Business API Integrated</span>
          </div>
          
          <h1 className="text-6xl md:text-8xl font-black tracking-tight mb-8 leading-[1.1] md:leading-[1] max-w-5xl mx-auto">
            Send WhatsApp Notifications <br className="hidden md:block" /> <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 via-indigo-400 to-white">Reliably</span>
          </h1>
          
          <p className="text-lg md:text-xl text-white/50 font-medium max-w-2xl mx-auto mb-12">
            Automate alerts, updates, and customer communication using WhatsApp Business API — without complexity.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center space-y-4 sm:space-y-0 sm:space-x-6">
            <button 
              onClick={() => setModalType('register')}
              className="w-full sm:w-auto px-10 py-5 bg-white text-black rounded-2xl font-black text-sm uppercase tracking-[0.2em] shadow-2xl hover:scale-[1.03] active:scale-[0.98] transition-all flex items-center justify-center group"
            >
              Start Building Now
              <ArrowRight className="w-4 h-4 ml-3 group-hover:translate-x-1 transition-transform" />
            </button>
          </div>
        </div>
      </section>

      {/* Featured Features Section */}
      <section className="py-32 px-6 relative overflow-hidden">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-20">
            <h2 className="text-sm font-black uppercase tracking-[0.3em] text-blue-400 mb-4">The Platform</h2>
            <h3 className="text-4xl md:text-5xl font-black tracking-tight">Everything you need to <br/>scale communication</h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <FeatureCard 
              icon={<Zap className="w-6 h-6" />}
              title="Instant Delivery"
              desc="Sub-second delivery using ultra-reliable direct API routes. No delays, no buffering."
            />
            <FeatureCard 
              icon={<Shield className="w-6 h-6" />}
              title="Template Management"
              desc="Sync, manage, and send pre-approved Meta templates with variables in seconds."
            />
            <FeatureCard 
              icon={<BarChart3 className="w-6 h-6" />}
              title="Real-time Analytics"
              desc="Track delivery, read rates, and interaction metrics on our premium dashboard."
            />
          </div>
        </div>
      </section>

      {/* How it Works Section */}
      <section className="py-32 px-6 bg-white/[0.02] border-y border-white/5">
        <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-20 items-center">
          <div>
            <h2 className="text-sm font-black uppercase tracking-[0.3em] text-indigo-400 mb-4">The Workflow</h2>
            <h3 className="text-4xl md:text-5xl font-black tracking-tight mb-8">Up and running in <br/>3 simple steps</h3>
            
            <div className="space-y-12 mt-12">
              <Step num="01" title="Connect Meta Cloud" desc="Link your WhatsApp Business Profile via our automated onboarding flow. No manual setup." />
              <Step num="02" title="Define Templates" desc="Choose from your existing WhatsApp templates or create new ones directly within PingStack." />
              <Step num="03" title="Automate or Send" desc="Use our high-performance APIs or the manual dashboard to reach your customers instantly." />
            </div>
          </div>
          
          <div className="relative">
            <div className="absolute inset-0 bg-blue-500/20 blur-[100px] rounded-full" />
            <div className="relative bg-[#0a0a0a] border border-white/10 rounded-[3rem] p-8 shadow-2xl overflow-hidden group">
              <div className="flex items-center space-x-2 border-b border-white/5 pb-4 mb-6">
                <div className="w-3 h-3 rounded-full bg-red-500/50" />
                <div className="w-3 h-3 rounded-full bg-amber-500/50" />
                <div className="w-3 h-3 rounded-full bg-green-500/50" />
                <span className="text-[10px] uppercase font-black tracking-widest text-white/20 ml-2">API Preview</span>
              </div>
              <pre className="text-xs md:text-sm font-mono leading-relaxed text-indigo-400 overflow-x-auto">
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
      <section className="py-32 px-6">
        <div className="max-w-4xl mx-auto bg-gradient-to-br from-white/[0.05] to-transparent border border-white/10 rounded-[4rem] p-12 md:p-20 relative overflow-hidden">
          <div className="relative z-10 text-center">
            <h3 className="text-3xl md:text-4xl font-black tracking-tight mb-6 leading-tight">Built for serious businesses <br/>that value trust</h3>
            <p className="text-white/50 font-medium mb-10 max-w-2xl mx-auto">
              We operate exclusively with official Meta APIs and adhere to global compliance standards.
            </p>
            <div className="flex flex-wrap justify-center gap-8">
              <TrustItem icon={<CheckCircle2 className="w-4 h-4" />} text="Official Meta BSPs" />
              <TrustItem icon={<LockIcon className="w-4 h-4" />} text="Secure Secret Encryption" />
              <TrustItem icon={<Globe className="w-4 h-4" />} text="Global Delivery" />
              <TrustItem icon={<Smartphone className="w-4 h-4" />} text="Verified Profiles" />
            </div>
          </div>
        </div>
      </section>

      <LandingFooter />

      <AuthModal 
        isOpen={modalType !== null} 
        onClose={() => setModalType(null)} 
        initialView={modalType === 'register' ? 'register' : 'login'} 
      />
    </div>
  );
}

function FeatureCard({ icon, title, desc }: { icon: React.ReactNode; title: string, desc: string }) {
  return (
    <div className="p-10 rounded-[3rem] bg-white/[0.03] border border-white/5 hover:bg-white/[0.06] hover:border-white/10 transition-all group">
      <div className="w-12 h-12 bg-white/5 border border-white/10 rounded-2xl flex items-center justify-center mb-6 text-white group-hover:scale-110 transition-transform">
        {icon}
      </div>
      <h4 className="text-xl font-black mb-4 tracking-tight">{title}</h4>
      <p className="text-white/40 text-sm font-medium leading-relaxed">{desc}</p>
    </div>
  );
}

function Step({ num, title, desc }: { num: string; title: string; desc: string }) {
  return (
    <div className="flex space-x-6">
      <div className="text-xs font-black tracking-[0.3em] text-white/20 pt-1.5">{num}</div>
      <div>
        <h4 className="text-xl font-black mb-2 tracking-tight">{title}</h4>
        <p className="text-white/40 text-sm font-bold tracking-tight">{desc}</p>
      </div>
    </div>
  );
}

function TrustItem({ icon, text }: { icon: React.ReactNode; text: string }) {
  return (
    <div className="flex items-center space-x-2 text-white/60">
      <div className="text-green-400">{icon}</div>
      <span className="text-[10px] font-black uppercase tracking-widest">{text}</span>
    </div>
  );
}
