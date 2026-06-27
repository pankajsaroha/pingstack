'use client';

import { useState } from 'react';
import { Check } from 'lucide-react';
import { LandingNav } from '@/components/LandingNav';
import { LandingFooter } from '@/components/LandingFooter';
import { AuthModal } from '@/components/AuthModal';

const plans = [
  {
    name: 'Starter', price: '₹199', description: 'Small business starting outreach.',
    features: ['1 Campaign/day', '250 Contacts', '50MB Storage', '7-Day Retention'],
    popular: false
  },
  {
    name: 'Growth', price: '₹499', description: 'Scale communication with power.',
    features: ['10 Campaigns/day', '2500 Contacts', '500MB Storage', '30-Day Retention', 'Email Support'],
    popular: true
  },
  {
    name: 'Pro', price: '₹999', description: 'Large enterprises, massive volume.',
    features: ['Unlimited Campaigns', '5GB Storage', '1-Year Retention', 'Team Collab'],
    popular: false
  }
];

export default function PublicPricing() {
  const [modalType, setModalType] = useState<'login' | 'register' | 'forgot' | null>(null);

  return (
    <div className="min-h-screen bg-[#050505] text-white selection:bg-white selection:text-black">
      <LandingNav onOpenAuth={setModalType} />

      <section className="pt-48 pb-32 px-6">
        <div className="max-w-7xl mx-auto text-center mb-24">
          <h2 className="text-[10px] font-black text-indigo-400 uppercase tracking-[0.3em] mb-4">Transparent Pricing</h2>
          <h1 className="text-5xl md:text-7xl font-black tracking-tight mb-6">Simple scaling for <br/><span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 via-indigo-400 to-white">every business.</span></h1>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-6xl mx-auto items-stretch">
          {plans.map((plan) => (
            <div 
              key={plan.name} 
              className={`p-10 rounded-[2.5rem] border transition-all duration-500 relative flex flex-col justify-between ${
                plan.popular 
                  ? 'bg-gradient-to-b from-white/[0.04] to-transparent border-indigo-500/40 shadow-[0_0_50px_rgba(99,102,241,0.15)] scale-105 z-10' 
                  : 'bg-white/[0.01] border-white/5 hover:border-white/10 hover:bg-white/[0.02]'
              }`}
            >
              {plan.popular && (
                <span className="absolute top-0 right-10 -translate-y-1/2 px-4 py-1 bg-gradient-to-r from-blue-600 to-indigo-600 text-[9px] font-black uppercase tracking-widest rounded-full shadow-lg">
                  Popular Choice
                </span>
              )}
              <div>
                <h3 className="text-2xl font-black mb-2 tracking-tight">{plan.name}</h3>
                <p className="text-xs text-white/40 font-medium mb-8">{plan.description}</p>
                <div className="flex items-baseline gap-1 mb-8">
                  <span className="text-4xl font-black tracking-tight">{plan.price}</span>
                  <span className="text-xs text-white/30 font-bold uppercase tracking-wider">/ month</span>
                </div>
                <ul className="space-y-4 mb-12">
                  {plan.features.map(f => (
                    <li key={f} className="flex items-center text-sm text-white/70 font-semibold">
                      <div className="w-5 h-5 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center mr-3 shrink-0">
                        <Check className="w-3 h-3 text-emerald-400" />
                      </div>
                      {f}
                    </li>
                  ))}
                </ul>
              </div>
              <button 
                onClick={() => setModalType('register')}
                className={`w-full py-4 rounded-2xl font-black text-xs uppercase tracking-widest transition-all cursor-pointer ${
                  plan.popular 
                    ? 'bg-white text-black hover:bg-neutral-200 shadow-[0_0_30px_rgba(255,255,255,0.15)]' 
                    : 'bg-white/5 text-white border border-white/10 hover:bg-white/10'
                }`}
              >
                Get Started
              </button>
            </div>
          ))}
        </div>
      </section>

      <LandingFooter />
      <AuthModal isOpen={modalType !== null} onClose={() => setModalType(null)} initialView={modalType === 'register' ? 'register' : 'login'} />
    </div>
  );
}
