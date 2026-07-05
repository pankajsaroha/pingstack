'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { CheckCircle2, ArrowLeft, Loader2 } from 'lucide-react';
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
  const [tenant, setTenant] = useState<any>(null);
  const [loadingPlan, setLoadingPlan] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [hasToken, setHasToken] = useState(false);

  useEffect(() => {
    const tokenExists = typeof document !== 'undefined' && document.cookie.split(';').some(item => item.trim().startsWith('token='));
    setHasToken(tokenExists);

    if (tokenExists) {
      const cached = sessionStorage.getItem('tenant_session');
      if (cached) {
        try {
          setTenant(JSON.parse(cached));
          setLoading(false);
        } catch (e) {}
      }
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
        // Ignore unauthenticated errors
      } finally {
        setLoading(false);
      }
    }
    checkUser();
  }, []);

  const loadRazorpayScript = () => {
    return new Promise((resolve) => {
      if ((window as any).Razorpay) {
        resolve(true);
        return;
      }
      const script = document.createElement('script');
      script.src = 'https://checkout.razorpay.com/v1/checkout.js';
      script.onload = () => resolve(true);
      script.onerror = () => resolve(false);
      document.body.appendChild(script);
    });
  };

  const handleUpgrade = async (planName: string) => {
    const isDowngradeOrScheduled = tenant?.subscription_status === 'active';
    
    if (isDowngradeOrScheduled) {
      const confirmChange = confirm(
        `You have an active subscription. Changing to the ${planName} plan will cancel your current subscription and schedule the new plan to take effect at the end of your current billing cycle.\n\nAre you sure you want to proceed?`
      );
      if (!confirmChange) return;

      setLoadingPlan(planName);
      try {
        const res = await fetch('/api/billing/razorpay/schedule-plan-change', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ planName })
        });
        const data = await res.json();
        if (res.ok) {
          alert(data.message || 'Plan change scheduled successfully.');
          sessionStorage.removeItem('tenant_session');
          window.location.reload();
        } else {
          alert(data.error || 'Failed to schedule plan change');
        }
      } catch (err) {
        console.error(err);
        alert('Error scheduling plan change');
      } finally {
        setLoadingPlan(null);
      }
      return;
    }

    setLoadingPlan(planName);
    try {
      const res = await fetch('/api/billing/razorpay/create-subscription', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ planName })
      });
      const data = await res.json();
      if (!res.ok) {
        alert(data.error || 'Failed to initiate subscription creation');
        return;
      }

      const scriptLoaded = await loadRazorpayScript();
      if (!scriptLoaded) {
        alert('Failed to load Razorpay payment SDK.');
        return;
      }

      const options = {
        key: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID || 'rzp_test_S5OkR1bVeJBNpl',
        subscription_id: data.subscription_id,
        name: 'PingStack',
        description: `${planName} Plan Subscription`,
        handler: function (response: any) {
          window.location.href = '/dashboard?checkout=success';
        },
        prefill: {
          name: tenant?.name || '',
          email: `tenant_${tenant?.public_id || 'default'}@pingstack.com`,
        },
        theme: {
          color: '#4F46E5',
        },
      };

      const rzp = new (window as any).Razorpay(options);
      rzp.open();
    } catch (err) {
      console.error(err);
      alert('Error initiating upgrade');
    } finally {
      setLoadingPlan(null);
    }
  };

  return (
    <div className="min-h-screen bg-bg text-fg selection:bg-fg selection:text-bg transition-colors duration-300">
      <LandingNav onOpenAuth={setModalType} />

      <section className="pt-48 pb-32 px-6">
        {tenant && (
          <div className="max-w-6xl mx-auto flex justify-start mb-10 -mt-6">
            <Link 
              href="/dashboard" 
              className="inline-flex items-center space-x-2 text-xs font-black text-indigo-400 hover:text-fg uppercase tracking-widest transition-all px-4 py-2 bg-glass-card border border-glass-border hover:bg-glass-card/80 rounded-2xl shadow-sm"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Back to Dashboard</span>
            </Link>
          </div>
        )}

        <div className="max-w-7xl mx-auto text-center mb-16 relative">
          <h2 className="text-[10px] font-black text-indigo-600 dark:text-indigo-400 uppercase tracking-[0.3em] mb-4">Transparent Pricing</h2>
          <h1 className="text-5xl md:text-7xl font-black tracking-tight mb-6 text-fg">Simple scaling for <br/><span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-500 via-indigo-500 to-fg dark:from-blue-400 dark:via-indigo-400 dark:to-white">every business.</span></h1>
        </div>

        {tenant?.pending_plan_type && (
          <div className="max-w-md mx-auto mb-12 p-6 rounded-[2rem] border border-indigo-500/20 bg-indigo-500/5 backdrop-blur-md text-center flex flex-col items-center">
            <span className="inline-block px-3 py-1 bg-indigo-500/20 text-indigo-400 rounded-full text-[9px] font-black uppercase tracking-wider mb-3">Scheduled Change</span>
            <p className="text-sm font-semibold text-fg/80 leading-relaxed">
              Your plan will transition to <strong>{tenant.pending_plan_type.toUpperCase()}</strong> at the end of the current billing cycle on: <br />
              <span className="text-indigo-400 font-bold">{tenant.current_period_end ? new Date(tenant.current_period_end).toLocaleDateString() : 'N/A'}</span>.
            </p>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-6xl mx-auto items-stretch">
          {plans.map((plan) => {
            const isCurrentPlan = tenant?.plan_type === plan.name.toLowerCase();
            const isPendingPlan = tenant?.pending_plan_type === plan.name.toLowerCase();
            const isStarter = plan.name === 'Starter';
            
            return (
              <div 
                key={plan.name} 
                className={`p-10 rounded-[2.5rem] border transition-all duration-500 relative flex flex-col justify-between ${
                  plan.popular 
                    ? 'bg-glass-card border-indigo-500/40 shadow-xl scale-105 z-10' 
                    : 'bg-glass-card border-glass-border hover:bg-glass-card/50'
                }`}
              >
                {plan.popular && (
                  <span className="absolute top-0 right-10 -translate-y-1/2 px-4 py-1 bg-gradient-to-r from-blue-600 to-indigo-600 text-white text-[9px] font-black uppercase tracking-widest rounded-full shadow-lg">
                    Popular Choice
                  </span>
                )}
                <div>
                  <h3 className="text-2xl font-black mb-2 tracking-tight text-fg">{plan.name}</h3>
                  <p className="text-xs text-muted font-medium mb-8">{plan.description}</p>
                  <div className="flex items-baseline gap-1 mb-8">
                    <span className="text-4xl font-black tracking-tight text-fg">{plan.price}</span>
                    <span className="text-xs text-muted font-bold uppercase tracking-wider">/ month</span>
                  </div>
                  <ul className="space-y-4 mb-12">
                    {plan.features.map(f => (
                      <li key={f} className="flex items-center text-sm text-fg/70 font-semibold">
                        <CheckCircle2 className="w-5 h-5 mr-3 text-green-700 dark:text-green-400 shrink-0" />
                        {f}
                      </li>
                    ))}
                  </ul>
                </div>

                {loading ? (
                  hasToken ? (
                    <div className="w-full py-4 bg-fg/10 rounded-2xl animate-pulse flex items-center justify-center text-[10px] font-black uppercase tracking-widest text-fg/30">
                      Loading Plan...
                    </div>
                  ) : (
                    <button 
                      onClick={() => setModalType('register')}
                      className={`w-full py-4 rounded-2xl font-black text-xs uppercase tracking-widest transition-all cursor-pointer flex items-center justify-center ${
                        plan.popular 
                          ? 'bg-fg text-bg hover:bg-fg/90 shadow-md' 
                          : 'bg-glass-input text-fg border border-glass-input-border hover:bg-glass-input/80'
                      }`}
                    >
                      Get Started
                    </button>
                  )
                ) : tenant ? (
                  isCurrentPlan ? (
                    tenant.subscription_status === 'active' ? (
                      <button 
                        disabled
                        className="w-full py-4 bg-gradient-to-br from-green-50 to-green-100/50 dark:from-green-950/20 dark:to-green-900/10 text-green-700 dark:text-green-400 border border-green-200/80 dark:border-green-800/40 rounded-2xl font-black text-xs uppercase tracking-widest cursor-default transition-all text-center flex items-center justify-center shadow-sm shadow-green-500/[0.02]"
                      >
                        Current Plan
                      </button>
                    ) : (
                      <button 
                        onClick={() => handleUpgrade(plan.name)}
                        disabled={loadingPlan !== null}
                        className="w-full py-4 rounded-2xl font-black text-xs uppercase tracking-widest transition-all cursor-pointer flex items-center justify-center bg-fg text-bg hover:bg-fg/90 shadow-md"
                      >
                        {loadingPlan === plan.name ? (
                          <span className="flex items-center"><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Processing...</span>
                        ) : (
                          <span>Activate Starter Plan</span>
                        )}
                      </button>
                    )
                  ) : isPendingPlan ? (
                    <button 
                      disabled
                      className="w-full py-4 bg-gradient-to-br from-amber-50 to-amber-100/50 dark:from-amber-950/20 dark:to-amber-900/10 text-amber-700 dark:text-amber-400 border border-amber-200/80 dark:border-amber-800/40 rounded-2xl font-black text-xs uppercase tracking-widest cursor-default transition-all text-center flex items-center justify-center shadow-sm"
                    >
                      Pending Activation
                    </button>
                  ) : isStarter ? (
                    tenant.subscription_status === 'active' ? (
                      <button 
                        onClick={() => handleUpgrade(plan.name)}
                        disabled={loadingPlan !== null}
                        className="w-full py-4 bg-glass-input text-fg hover:text-fg border border-glass-input-border hover:border-fg/20 rounded-2xl font-black text-xs uppercase tracking-widest transition-all text-center flex items-center justify-center cursor-pointer"
                      >
                        {loadingPlan === plan.name ? (
                          <span className="flex items-center"><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Processing...</span>
                        ) : (
                          <span>Downgrade to Starter</span>
                        )}
                      </button>
                    ) : (
                      <button 
                        onClick={() => handleUpgrade(plan.name)}
                        disabled={loadingPlan !== null}
                        className="w-full py-4 rounded-2xl font-black text-xs uppercase tracking-widest transition-all cursor-pointer flex items-center justify-center bg-glass-input text-fg border border-glass-input-border hover:bg-glass-input/80"
                      >
                        {loadingPlan === plan.name ? (
                          <span className="flex items-center"><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Processing...</span>
                        ) : (
                          <span>Activate Starter Plan</span>
                        )}
                      </button>
                    )
                  ) : (
                    <button 
                      onClick={() => handleUpgrade(plan.name)}
                      disabled={loadingPlan !== null}
                      className={`w-full py-4 rounded-2xl font-black text-xs uppercase tracking-widest transition-all cursor-pointer flex items-center justify-center ${
                        plan.popular 
                          ? 'bg-fg text-bg hover:bg-fg/90 shadow-md' 
                          : 'bg-glass-input text-fg border border-glass-input-border hover:bg-glass-input/80'
                      }`}
                    >
                      {loadingPlan === plan.name ? (
                        <span className="flex items-center"><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Processing...</span>
                      ) : (
                        <span>Upgrade Plan</span>
                      )}
                    </button>
                  )
                ) : (
                  <button 
                    onClick={() => setModalType('register')}
                    className={`w-full py-4 rounded-2xl font-black text-xs uppercase tracking-widest transition-all cursor-pointer flex items-center justify-center ${
                      plan.popular 
                        ? 'bg-fg text-bg hover:bg-fg/90 shadow-md' 
                        : 'bg-glass-input text-fg border border-glass-input-border hover:bg-glass-input/80'
                    }`}
                  >
                    Get Started
                  </button>
                )}
              </div>
            );
          })}
        </div>
      </section>

      <LandingFooter />
      <AuthModal isOpen={modalType !== null} onClose={() => setModalType(null)} initialView={modalType === 'register' ? 'register' : 'login'} />
    </div>
  );
}
