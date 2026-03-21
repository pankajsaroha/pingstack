'use client';
 
import { Check, Zap, Shield, Star, Rocket } from 'lucide-react';
import { useState } from 'react';
import Script from 'next/script';

declare global {
  interface Window {
    Razorpay: any;
  }
}

const plans = [
  {
    name: 'Starter',
    price: '₹199',
    description: 'Perfect for small businesses starting their outreach.',
    features: [
      '2 Campaigns per day',
      'Up to 500 Contacts',
      'Meta Cloud API Integration',
      'Basic Analytics',
      'Email Support'
    ],
    cta: 'Current Plan',
    popular: false,
    color: 'blue'
  },
  {
    name: 'Growth',
    price: '₹499',
    description: 'Scale your communication with unlimited power.',
    features: [
      'Unlimited Campaigns',
      'Up to 5000 Contacts',
      'Advanced Automation',
      'Priority Support',
      'Detailed Campaign Reports',
      'Contact Grouping'
    ],
    cta: 'Upgrade Plan',
    popular: true,
    color: 'indigo'
  },
  {
    name: 'Pro',
    price: '₹999',
    description: 'For large enterprises with massive volume.',
    features: [
      'Unlimited Everything',
      'Team Collaboration',
      'Custom Integrations',
      'Dedicated Account Manager',
      'SLA Guarantee',
      'Whitelabel Options'
    ],
    cta: 'Upgrade Plan',
    popular: false,
    color: 'purple'
  }
];

export default function PricingPage() {
  const [loading, setLoading] = useState<string | null>(null);

  const handleUpgrade = async (planName: string) => {
    setLoading(planName);
    try {
      const res = await fetch('/api/billing/razorpay/create-subscription', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ planName })
      });
      const data = await res.json();
      
      if (!data.subscription_id) {
        throw new Error(data.error || 'Failed to create subscription');
      }

      const options = {
        key: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID || 'rzp_test_placeholder',
        subscription_id: data.subscription_id,
        name: 'PingStack',
        description: `${planName} Plan Subscription`,
        image: '/logo.png',
        handler: function(response: any) {
          window.location.href = `/dashboard?checkout=success&id=${response.razorpay_subscription_id}`;
        },
        prefill: {
          name: '',
          email: '',
          contact: ''
        },
        theme: {
          color: '#2563eb'
        }
      };

      const rzp = new window.Razorpay(options);
      rzp.open();

    } catch (err: any) {
      alert(err.message || 'Checkout failed');
    } finally {
      setLoading(null);
    }
  };

  return (
    <div className="py-12 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
      <Script src="https://checkout.razorpay.com/v1/checkout.js" />
      <div className="text-center mb-16">
        <h2 className="text-sm font-black text-blue-600 uppercase tracking-widest mb-4">Pricing Plans</h2>
        <h1 className="text-4xl sm:text-6xl font-black text-gray-900 tracking-tight leading-tight mb-6">
          Simple scaling for <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-indigo-600">every business.</span>
        </h1>
        <p className="text-xl text-gray-500 max-w-2xl mx-auto">
          No hidden fees. No feature restrictions. Only pay for the usage you need.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {plans.map((plan) => (
          <div 
            key={plan.name}
            className={`relative group rounded-[2.5rem] p-8 transition-all duration-500 hover:-translate-y-2 ${
              plan.popular 
                ? 'bg-gray-900 text-white shadow-2xl scale-105 z-10' 
                : 'bg-white border border-gray-100 shadow-xl'
            }`}
          >
            {plan.popular && (
              <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-gradient-to-r from-blue-600 to-indigo-600 text-white px-6 py-2 rounded-full text-xs font-black uppercase tracking-widest flex items-center shadow-lg">
                <Star className="w-4 h-4 mr-2 fill-white" />
                Most Popular
              </div>
            )}

            <div className="mb-8">
              <h3 className={`text-2xl font-black mb-2 ${plan.popular ? 'text-blue-400' : 'text-gray-900'}`}>{plan.name}</h3>
              <div className="flex items-baseline gap-1">
                <span className="text-5xl font-black">{plan.price}</span>
                <span className={`text-sm ${plan.popular ? 'text-gray-400' : 'text-gray-500'}`}>/month</span>
              </div>
              <p className={`mt-4 text-sm leading-relaxed ${plan.popular ? 'text-gray-400' : 'text-gray-500'}`}>
                {plan.description}
              </p>
            </div>

            <ul className="space-y-4 mb-10">
              {plan.features.map((feature) => (
                <li key={feature} className="flex items-start">
                  <div className={`mt-1 mr-3 rounded-full p-0.5 ${plan.popular ? 'bg-blue-600/30 text-blue-400' : 'bg-green-100 text-green-600'}`}>
                    <Check className="w-4 h-4" />
                  </div>
                  <span className={`text-sm font-medium ${plan.popular ? 'text-gray-300' : 'text-gray-700'}`}>{feature}</span>
                </li>
              ))}
            </ul>

            <button 
              onClick={() => handleUpgrade(plan.name)}
              disabled={loading !== null || plan.name === 'Starter'}
              className={`w-full py-4 rounded-2xl font-black text-sm transition-all active:scale-95 shadow-lg flex items-center justify-center ${
                plan.popular 
                  ? 'bg-blue-600 hover:bg-blue-500 text-white shadow-blue-600/20' 
                  : plan.name === 'Starter'
                  ? 'bg-gray-50 text-gray-400 cursor-default shadow-none border border-gray-100'
                  : 'bg-gray-900 hover:bg-black text-white'
              }`}
            >
              {loading === plan.name ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  {plan.name === 'Growth' && <Rocket className="w-4 h-4 mr-2" />}
                  {plan.name === 'Pro' && <Zap className="w-4 h-4 mr-2" />}
                  {plan.cta}
                </>
              )}
            </button>
          </div>
        ))}
      </div>

      <div className="mt-24 text-center">
        <div className="inline-flex items-center gap-8 py-6 px-12 bg-white/50 backdrop-blur-xl rounded-[2.5rem] border border-gray-100 shadow-sm transition-all hover:shadow-md">
          <div className="flex items-center text-sm font-bold text-gray-700">
            <Shield className="w-5 h-5 mr-3 text-green-500" />
            Secure Payments by Razorpay
          </div>
          <div className="w-px h-6 bg-gray-200" />
          <div className="text-sm text-gray-500 font-medium">
            30-day money-back guarantee
          </div>
        </div>
      </div>
    </div>
  );
}
