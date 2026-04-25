'use client';

import { useState, useEffect } from 'react';
import { Check, Zap, Star, Rocket } from 'lucide-react';
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
  const [modalType, setModalType] = useState<'login' | 'register' | null>(null);

  return (
    <div className="min-h-screen bg-[#050505] text-white">
      <LandingNav onOpenAuth={setModalType} />

      <section className="pt-40 pb-20 px-6">
        <div className="max-w-7xl mx-auto text-center mb-16">
          <h2 className="text-sm font-black text-blue-400 uppercase tracking-[0.3em] mb-4">Transparent Pricing</h2>
          <h1 className="text-5xl md:text-7xl font-black tracking-tight mb-6">Simple scaling for <br/><span className="text-blue-400">every business.</span></h1>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-6xl mx-auto">
          {plans.map((plan) => (
            <div key={plan.name} className={`p-10 rounded-[3rem] border transition-all ${plan.popular ? 'bg-white/5 border-blue-500/50 scale-105' : 'bg-white/[0.02] border-white/5'}`}>
              <h3 className="text-2xl font-black mb-1">{plan.name}</h3>
              <div className="flex items-baseline gap-1 mb-6">
                <span className="text-4xl font-black">{plan.price}</span>
                <span className="text-sm text-white/40">/month</span>
              </div>
              <ul className="space-y-4 mb-10">
                {plan.features.map(f => (
                  <li key={f} className="flex items-center text-sm text-white/60 font-bold">
                    <Check className="w-4 h-4 mr-2 text-blue-400" /> {f}
                  </li>
                ))}
              </ul>
              <button 
                onClick={() => setModalType('register')}
                className={`w-full py-4 rounded-2xl font-black text-sm uppercase tracking-widest transition-all ${plan.popular ? 'bg-blue-600 hover:bg-blue-500' : 'bg-white text-black hover:bg-gray-200'}`}
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
