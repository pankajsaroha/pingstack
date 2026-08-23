'use client';

import { useState, useEffect } from 'react';
import { CheckCircle2, Loader2, CreditCard } from 'lucide-react';
import { useTenant } from '@/context/tenant-context';

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

export default function WorkspacePricingPage() {
  const { tenant, refreshTenant } = useTenant();
  const [loadingPlan, setLoadingPlan] = useState<string | null>(null);

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
          await refreshTenant();
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
        handler: function () {
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
    <div className="max-w-5xl mx-auto py-2 px-4 sm:px-6 text-left selection:bg-fg selection:text-bg">
      <div className="text-center mb-10">
        <div className="inline-flex items-center space-x-2 px-3.5 py-1 bg-indigo-500/10 border border-indigo-500/20 rounded-full mb-3">
          <CreditCard className="w-3.5 h-3.5 text-indigo-400" />
          <span className="text-[10px] font-black uppercase tracking-[0.2em] text-indigo-400">Subscription Plans</span>
        </div>
        <h1 className="text-2xl sm:text-4xl font-black tracking-tight mb-2 text-fg">
          Simple scaling for every business.
        </h1>
        <p className="text-xs sm:text-sm text-muted font-semibold max-w-xl mx-auto leading-relaxed">
          Meta/WhatsApp conversation fees are billed separately by Meta based on messaging volume.
        </p>
      </div>

      {tenant?.pending_plan_type && (
        <div className="max-w-md mx-auto mb-10 p-5 rounded-2xl border border-indigo-500/20 bg-indigo-500/5 text-center">
          <span className="inline-block px-2.5 py-0.5 bg-indigo-500/20 text-indigo-400 rounded-full text-[9px] font-black uppercase tracking-wider mb-2">Scheduled Change</span>
          <p className="text-xs font-semibold text-fg/80 leading-relaxed">
            Your plan will transition to <strong>{tenant.pending_plan_type.toUpperCase()}</strong> at the end of the current billing cycle on: <br />
            <span className="text-indigo-400 font-bold">{tenant.current_period_end ? new Date(tenant.current_period_end).toLocaleDateString() : 'N/A'}</span>.
          </p>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-stretch">
        {plans.map((plan) => {
          const isCurrentPlan = tenant?.plan_type === plan.name.toLowerCase();
          const isPendingPlan = tenant?.pending_plan_type === plan.name.toLowerCase();
          const isStarter = plan.name === 'Starter';
          
          return (
            <div 
              key={plan.name} 
              className={`p-6 rounded-2xl border transition-all duration-300 relative flex flex-col justify-between ${
                plan.popular 
                  ? 'bg-glass-card/50 border-indigo-500/40 shadow-lg' 
                  : 'bg-glass-card/30 border-glass-border/40 hover:border-glass-border'
              }`}
            >
              {plan.popular && (
                <span className="absolute top-0 right-6 -translate-y-1/2 px-3 py-1 bg-gradient-to-r from-blue-600 to-indigo-600 text-white text-[9px] font-black uppercase tracking-widest rounded-full shadow-sm">
                  Popular Choice
                </span>
              )}
              <div>
                <h3 className="text-lg font-black mb-1 tracking-tight text-fg">{plan.name}</h3>
                <p className="text-xs text-muted font-medium mb-5">{plan.description}</p>
                <div className="flex items-baseline gap-1 mb-5">
                  <span className="text-3xl font-black tracking-tight text-fg">{plan.price}</span>
                  <span className="text-xs text-muted font-bold uppercase tracking-wider">/ month</span>
                </div>
                <ul className="space-y-2.5 mb-6">
                  {plan.features.map(f => (
                    <li key={f} className="flex items-center text-xs text-fg/80 font-semibold">
                      <CheckCircle2 className="w-4 h-4 mr-2 text-emerald-500 dark:text-emerald-400 shrink-0" />
                      {f}
                    </li>
                  ))}
                </ul>
              </div>

              {isCurrentPlan ? (
                tenant?.subscription_status === 'active' ? (
                  <button 
                    disabled
                    className="w-full py-2.5 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded-xl font-black text-xs uppercase tracking-wider cursor-default text-center flex items-center justify-center"
                  >
                    Current Plan
                  </button>
                ) : (
                  <button 
                    onClick={() => handleUpgrade(plan.name)}
                    disabled={loadingPlan !== null}
                    className="w-full py-2.5 rounded-xl font-black text-xs uppercase tracking-wider transition-all cursor-pointer flex items-center justify-center bg-fg text-bg hover:opacity-90 shadow-sm"
                  >
                    {loadingPlan === plan.name ? (
                      <span className="flex items-center"><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Processing...</span>
                    ) : (
                      <span>Activate Plan</span>
                    )}
                  </button>
                )
              ) : isPendingPlan ? (
                <button 
                  disabled
                  className="w-full py-2.5 bg-amber-500/10 text-amber-400 border border-amber-500/20 rounded-xl font-black text-xs uppercase tracking-wider cursor-default text-center flex items-center justify-center"
                >
                  Pending Activation
                </button>
              ) : isStarter ? (
                tenant?.subscription_status === 'active' ? (
                  <button 
                    onClick={() => handleUpgrade(plan.name)}
                    disabled={loadingPlan !== null}
                    className="w-full py-2.5 bg-glass-input text-fg hover:text-fg border border-glass-border rounded-xl font-black text-xs uppercase tracking-wider transition-all text-center flex items-center justify-center cursor-pointer"
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
                    className="w-full py-2.5 rounded-xl font-black text-xs uppercase tracking-wider transition-all cursor-pointer flex items-center justify-center bg-glass-input text-fg border border-glass-border hover:bg-glass-input/80"
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
                  className={`w-full py-2.5 rounded-xl font-black text-xs uppercase tracking-wider transition-all cursor-pointer flex items-center justify-center ${
                    plan.popular 
                      ? 'bg-fg text-bg hover:opacity-90 shadow-sm' 
                      : 'bg-glass-input text-fg border border-glass-border hover:bg-glass-input/80'
                  }`}
                >
                  {loadingPlan === plan.name ? (
                    <span className="flex items-center"><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Processing...</span>
                  ) : (
                    <span>Upgrade Plan</span>
                  )}
                </button>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
