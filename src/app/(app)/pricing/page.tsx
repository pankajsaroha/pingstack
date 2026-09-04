'use client';

import { useState, Fragment } from 'react';
import { 
  CheckCircle2, 
  Minus, 
  Loader2, 
  CreditCard, 
  Sparkles, 
  Info, 
  HelpCircle, 
  MessageSquare,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import { useTenant } from '@/context/tenant-context';
import { 
  PLAN_CONFIGS, 
  FEATURE_COMPARISON_CATEGORIES, 
  EARLY_ACCESS_BANNER, 
  TEMPLATE_SENDS_TOOLTIP,
  PlanType 
} from '@/lib/plans';
import { FeedbackModal } from '@/components/feedback/FeedbackModal';

export default function WorkspacePricingPage() {
  const { tenant, refreshTenant } = useTenant();
  const [loadingPlan, setLoadingPlan] = useState<string | null>(null);
  const [showComparison, setShowComparison] = useState(true);
  const [isFeedbackOpen, setIsFeedbackOpen] = useState(false);
  const [activeTooltip, setActiveTooltip] = useState<string | null>(null);

  const loadRazorpayScript = () => {
    return new Promise((resolve) => {
      if ((window as unknown as { Razorpay?: unknown }).Razorpay) {
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

  const handleUpgrade = async (planKey: string) => {
    const planConfig = PLAN_CONFIGS[planKey as PlanType];
    if (!planConfig || planConfig.comingSoon) return;

    const planName = planConfig.name;
    const isDowngradeOrScheduled = tenant?.subscription_status === 'active';
    
    if (isDowngradeOrScheduled) {
      const confirmChange = confirm(
        `You have an active subscription. Changing to the ${planName} plan will cancel your current subscription and schedule the new plan to take effect at the end of your current billing cycle.\n\nAre you sure you want to proceed?`
      );
      if (!confirmChange) return;

      setLoadingPlan(planKey);
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

    setLoadingPlan(planKey);
    try {
      const res = await fetch('/api/billing/razorpay/create-subscription', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ planName })
      });
      const data = await res.json();
      if (!res.ok) {
        alert(data.error || data.message || 'Failed to initiate subscription creation');
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

      const RazorpayConstructor = (window as unknown as { Razorpay: new (opts: unknown) => { open: () => void } }).Razorpay;
      const rzp = new RazorpayConstructor(options);
      rzp.open();
    } catch (err) {
      console.error(err);
      alert('Error initiating upgrade');
    } finally {
      setLoadingPlan(null);
    }
  };

  const currentPlanKey = (tenant?.plan_type || 'starter').toLowerCase();

  return (
    <div className="max-w-6xl mx-auto py-2 px-4 sm:px-6 text-left selection:bg-zinc-900 selection:text-white dark:selection:bg-white dark:selection:text-zinc-900">
      {/* Header */}
      <div className="text-center mb-8">
        <div className="inline-flex items-center space-x-2 px-3 py-1 bg-indigo-500/10 border border-indigo-500/20 rounded-full mb-3">
          <CreditCard className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
          <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400">
            Launch &amp; Early Access Subscriptions
          </span>
        </div>
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight mb-2 text-zinc-900 dark:text-zinc-100">
          Simple, honest pricing for every stage.
        </h1>
        <p className="text-xs sm:text-sm text-zinc-500 dark:text-zinc-400 font-normal max-w-2xl mx-auto leading-relaxed">
          Pingstack software is free on Starter (₹199/mo on Growth). WhatsApp conversation fees are paid directly to Meta via your Meta payment method with 0% platform markup.
        </p>
      </div>

      {/* Pending Plan Alert */}
      {tenant?.pending_plan_type && (
        <div className="max-w-xl mx-auto mb-6 p-4 rounded-xl border border-indigo-500/20 bg-indigo-500/5 text-center shadow-2xs">
          <span className="inline-block px-2.5 py-0.5 bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 rounded-full text-[10px] font-bold uppercase tracking-wider mb-2">
            Scheduled Transition
          </span>
          <p className="text-xs font-medium text-zinc-700 dark:text-zinc-300 leading-relaxed">
            Your workspace will transition to the <strong>{tenant.pending_plan_type.toUpperCase()}</strong> plan at the end of your current billing cycle on: <br />
            <span className="text-indigo-600 dark:text-indigo-400 font-bold">{tenant.current_period_end ? new Date(tenant.current_period_end).toLocaleDateString() : 'N/A'}</span>.
          </p>
        </div>
      )}

      {/* 3 Pricing Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5 items-stretch mb-8">
        {/* STARTER */}
        <div className="p-6 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-700 shadow-2xs transition-all flex flex-col justify-between group">
          <div>
            <div className="flex items-center justify-between gap-2 mb-2">
              <h3 className="text-lg font-bold tracking-tight text-zinc-900 dark:text-zinc-100">Starter</h3>
              <span className="px-2 py-0.5 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 rounded-md text-[10px] font-bold uppercase tracking-wider">
                Free during early access
              </span>
            </div>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 font-normal mb-5 leading-relaxed">
              Everything you need to start managing WhatsApp professionally.
            </p>

            <div className="flex items-baseline gap-2 mb-1">
              <span className="text-base text-zinc-400 line-through font-bold">₹199</span>
              <span className="text-3xl font-bold font-mono text-zinc-900 dark:text-zinc-100 tracking-tight">FREE</span>
            </div>
            <p className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider mb-6">
              Launch offer &bull; No payment method needed
            </p>

            <ul className="space-y-2.5 mb-6">
              {PLAN_CONFIGS.starter.highlightFeatures.map((feat) => (
                <li key={feat} className="flex items-start text-xs text-zinc-700 dark:text-zinc-300">
                  <CheckCircle2 className="w-4 h-4 mr-2 text-emerald-500 dark:text-emerald-400 shrink-0 mt-0.5" />
                  <span>{feat}</span>
                </li>
              ))}
            </ul>
          </div>

          {currentPlanKey === 'starter' ? (
            tenant?.subscription_status === 'active' ? (
              <button 
                disabled
                className="w-full py-2.5 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 rounded-lg font-bold text-xs uppercase tracking-wider cursor-default text-center flex items-center justify-center"
              >
                Current Plan
              </button>
            ) : (
              <button 
                onClick={() => handleUpgrade('starter')}
                disabled={loadingPlan !== null}
                className="w-full py-2.5 bg-zinc-100 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 hover:bg-zinc-200 dark:hover:bg-zinc-700 border border-zinc-200 dark:border-zinc-700 rounded-lg font-bold text-xs uppercase tracking-wider transition-all cursor-pointer flex items-center justify-center shadow-2xs"
              >
                {loadingPlan === 'starter' ? (
                  <span className="flex items-center"><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Processing...</span>
                ) : (
                  <span>Current Plan (Starter)</span>
                )}
              </button>
            )
          ) : (
            <button 
              onClick={() => handleUpgrade('starter')}
              disabled={loadingPlan !== null}
              className="w-full py-2.5 bg-zinc-100 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 hover:bg-zinc-200 dark:hover:bg-zinc-700 border border-zinc-200 dark:border-zinc-700 rounded-lg font-bold text-xs uppercase tracking-wider transition-all cursor-pointer flex items-center justify-center"
            >
              {loadingPlan === 'starter' ? (
                <span className="flex items-center"><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Processing...</span>
              ) : (
                <span>Downgrade to Starter</span>
              )}
            </button>
          )}
        </div>

        {/* GROWTH */}
        <div className="p-6 rounded-xl bg-white dark:bg-zinc-900 border-2 border-indigo-500 shadow-md relative flex flex-col justify-between">
          <span className="absolute top-0 right-5 -translate-y-1/2 px-2.5 py-0.5 bg-indigo-600 text-white text-[9px] font-bold uppercase tracking-wider rounded-full shadow-2xs">
            Most Popular
          </span>

          <div>
            <div className="flex items-center justify-between gap-2 mb-2">
              <h3 className="text-lg font-bold tracking-tight text-zinc-900 dark:text-zinc-100">Growth</h3>
              <span className="px-2 py-0.5 bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20 rounded-md text-[10px] font-bold uppercase tracking-wider">
                Early Access
              </span>
            </div>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 font-normal mb-5 leading-relaxed">
              For businesses that need more contacts, campaigns and automation.
            </p>

            <div className="flex items-baseline gap-2 mb-1">
              <span className="text-base text-zinc-400 line-through font-bold">₹499</span>
              <span className="text-3xl font-bold font-mono text-zinc-900 dark:text-zinc-100 tracking-tight">₹199</span>
              <span className="text-xs text-zinc-500 font-medium">/ month</span>
            </div>
            <p className="text-[10px] font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-wider mb-6">
              ₹199/month during early access
            </p>

            <ul className="space-y-2.5 mb-6">
              {PLAN_CONFIGS.growth.highlightFeatures.map((feat, idx) => (
                <li key={feat} className={`flex items-start text-xs ${idx === 0 ? 'font-bold text-zinc-900 dark:text-zinc-100' : 'text-zinc-700 dark:text-zinc-300'}`}>
                  {idx > 0 && <CheckCircle2 className="w-4 h-4 mr-2 text-emerald-500 dark:text-emerald-400 shrink-0 mt-0.5" />}
                  <span>{feat}</span>
                </li>
              ))}
            </ul>
          </div>

          {currentPlanKey === 'growth' ? (
            tenant?.subscription_status === 'active' ? (
              <button 
                disabled
                className="w-full py-2.5 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 rounded-lg font-bold text-xs uppercase tracking-wider cursor-default text-center flex items-center justify-center"
              >
                Current Plan
              </button>
            ) : (
              <button 
                onClick={() => handleUpgrade('growth')}
                disabled={loadingPlan !== null}
                className="w-full py-2.5 bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 hover:opacity-90 rounded-lg font-bold text-xs uppercase tracking-wider transition-all cursor-pointer flex items-center justify-center shadow-2xs"
              >
                {loadingPlan === 'growth' ? (
                  <span className="flex items-center"><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Processing...</span>
                ) : (
                  <span>Activate Growth Plan</span>
                )}
              </button>
            )
          ) : (
            <button 
              onClick={() => handleUpgrade('growth')}
              disabled={loadingPlan !== null}
              className="w-full py-2.5 bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 hover:opacity-90 rounded-lg font-bold text-xs uppercase tracking-wider transition-all cursor-pointer flex items-center justify-center shadow-2xs"
            >
              {loadingPlan === 'growth' ? (
                <span className="flex items-center"><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Processing...</span>
              ) : (
                <span>Start with Growth</span>
              )}
            </button>
          )}
        </div>

        {/* PRO */}
        <div className="p-6 rounded-xl bg-white/60 dark:bg-zinc-900/60 border border-zinc-200 dark:border-zinc-800 opacity-90 relative flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between gap-2 mb-2">
              <h3 className="text-lg font-bold tracking-tight text-zinc-900 dark:text-zinc-100">Pro</h3>
              <span className="px-2 py-0.5 bg-zinc-100 dark:bg-zinc-800 text-zinc-500 border border-zinc-200 dark:border-zinc-700 rounded-md text-[10px] font-bold uppercase tracking-wider">
                Coming Soon
              </span>
            </div>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 font-normal mb-5 leading-relaxed">
              For businesses ready to automate, collaborate and integrate WhatsApp.
            </p>

            <div className="flex items-baseline gap-1 mb-1">
              <span className="text-3xl font-bold font-mono text-zinc-900 dark:text-zinc-100 tracking-tight">₹999</span>
              <span className="text-xs text-zinc-500 font-medium">/ month</span>
            </div>
            <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider mb-6">
              Upcoming Roadmap Plan
            </p>

            <ul className="space-y-2.5 mb-6">
              {PLAN_CONFIGS.pro.highlightFeatures.map((feat, idx) => (
                <li key={feat} className={`flex items-start text-xs ${idx === 0 ? 'font-bold text-zinc-700 dark:text-zinc-300' : 'text-zinc-600 dark:text-zinc-400'}`}>
                  {idx > 0 && <CheckCircle2 className="w-4 h-4 mr-2 text-emerald-500/70 dark:text-emerald-400/70 shrink-0 mt-0.5" />}
                  <span>{feat}</span>
                </li>
              ))}
            </ul>
          </div>

          <button 
            disabled
            className="w-full py-2.5 bg-zinc-100 dark:bg-zinc-800 text-zinc-400 border border-zinc-200 dark:border-zinc-700 rounded-lg font-bold text-xs uppercase tracking-wider cursor-not-allowed text-center flex items-center justify-center"
          >
            Coming Soon
          </button>
        </div>
      </div>

      {/* Early Access Callout Banner with Feedback Integration */}
      <div className="mb-8 p-5 sm:p-6 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-2xs flex flex-col md:flex-row items-start md:items-center justify-between gap-5 relative overflow-hidden">
        <div className="space-y-1 max-w-2xl relative z-10">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-indigo-600 dark:text-indigo-400 shrink-0" />
            <h4 className="text-sm font-bold uppercase tracking-wider text-zinc-900 dark:text-zinc-100">
              {EARLY_ACCESS_BANNER.title}
            </h4>
          </div>
          <p className="text-xs text-zinc-700 dark:text-zinc-300 leading-relaxed">
            {EARLY_ACCESS_BANNER.description}
          </p>
          <p className="text-xs text-zinc-500 dark:text-zinc-400">
            {EARLY_ACCESS_BANNER.subtext}
          </p>
        </div>

        <button
          type="button"
          onClick={() => setIsFeedbackOpen(true)}
          className="px-4 py-2 bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 border border-zinc-200 dark:border-zinc-700 text-zinc-800 dark:text-zinc-200 text-xs font-bold uppercase tracking-wider rounded-lg shrink-0 transition-all cursor-pointer flex items-center gap-2 shadow-2xs"
        >
          <MessageSquare className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
          <span>Share Feedback</span>
        </button>
      </div>

      {/* Feature Comparison Section Toggle */}
      <div className="border-t border-zinc-200 dark:border-zinc-800 pt-8">
        <div className="flex items-center justify-between mb-6 cursor-pointer select-none" onClick={() => setShowComparison(!showComparison)}>
          <div>
            <h2 className="text-lg sm:text-xl font-bold text-zinc-900 dark:text-zinc-100 tracking-tight">Full Plan Feature Comparison</h2>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 font-normal mt-0.5">Detailed breakdown of allowances, messaging limits, and upcoming roadmap capabilities.</p>
          </div>
          <button 
            type="button"
            className="p-1.5 rounded-lg bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-zinc-600 dark:text-zinc-300 hover:text-indigo-600 transition-colors cursor-pointer"
          >
            {showComparison ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
        </div>

        {showComparison && (
          <div className="space-y-6 animate-in fade-in duration-300">
            {/* Template Sends Explanation Callout */}
            <div className="p-3.5 rounded-lg bg-indigo-500/5 border border-indigo-500/20 flex items-start gap-2.5 text-xs text-zinc-700 dark:text-zinc-300 leading-relaxed">
              <Info className="w-4 h-4 text-indigo-600 dark:text-indigo-400 shrink-0 mt-0.5" />
              <div>
                <strong>How Template Sends/Day Work:</strong> {TEMPLATE_SENDS_TOOLTIP}
              </div>
            </div>

            {/* Comparison Table */}
            <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 overflow-hidden shadow-2xs">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-800/60">
                      <th className="py-3 px-5 font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 w-2/5">Feature Category</th>
                      <th className="py-3 px-4 font-bold uppercase tracking-wider text-zinc-900 dark:text-zinc-100 text-center w-1/5">
                        Starter <br />
                        <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold">FREE</span>
                      </th>
                      <th className="py-3 px-4 font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400 text-center w-1/5 bg-indigo-500/5">
                        Growth <br />
                        <span className="text-[10px] text-indigo-600 dark:text-indigo-400 font-bold">₹199 / mo</span>
                      </th>
                      <th className="py-3 px-4 font-bold uppercase tracking-wider text-zinc-400 text-center w-1/5">
                        Pro <br />
                        <span className="text-[10px] text-zinc-400 font-bold">Coming Soon</span>
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
                    {FEATURE_COMPARISON_CATEGORIES.map((cat) => (
                      <Fragment key={cat.category}>
                        <tr className="bg-zinc-50/70 dark:bg-zinc-800/40 border-t border-b border-zinc-200 dark:border-zinc-800">
                          <td colSpan={4} className="py-2 px-5 font-bold uppercase tracking-wider text-[10px] text-indigo-600 dark:text-indigo-400">
                            {cat.category}
                          </td>
                        </tr>
                        {cat.features.map((item) => (
                          <tr key={item.name} className="hover:bg-zinc-50/50 dark:hover:bg-zinc-800/30 transition-colors">
                            <td className="py-3 px-5 font-medium text-zinc-800 dark:text-zinc-200">
                              <div className="flex items-center gap-1.5">
                                <span>{item.name}</span>
                                {item.tooltip && (
                                  <div className="relative inline-block">
                                    <HelpCircle 
                                      className="w-3.5 h-3.5 text-zinc-400 hover:text-zinc-600 cursor-pointer"
                                      onClick={() => setActiveTooltip(activeTooltip === item.name ? null : item.name)}
                                    />
                                    {activeTooltip === item.name && (
                                      <div className="absolute left-0 bottom-full mb-2 w-64 p-2.5 rounded-lg bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 shadow-xl text-[11px] font-medium text-zinc-900 dark:text-zinc-100 z-50">
                                        {item.tooltip}
                                      </div>
                                    )}
                                  </div>
                                )}
                              </div>
                              {item.description && (
                                <p className="text-[11px] text-zinc-500 dark:text-zinc-400 font-normal mt-0.5">{item.description}</p>
                              )}
                            </td>

                            {/* Starter Value */}
                            <td className="py-3 px-4 text-center">
                              {typeof item.starter === 'boolean' ? (
                                item.starter ? (
                                  <CheckCircle2 className="w-4 h-4 text-emerald-500 dark:text-emerald-400 mx-auto" />
                                ) : (
                                  <Minus className="w-4 h-4 text-zinc-300 dark:text-zinc-600 mx-auto" />
                                )
                              ) : (
                                <span className="font-bold text-zinc-800 dark:text-zinc-200">{item.starter}</span>
                              )}
                            </td>

                            {/* Growth Value */}
                            <td className="py-3 px-4 text-center bg-indigo-500/5">
                              {typeof item.growth === 'boolean' ? (
                                item.growth ? (
                                  <CheckCircle2 className="w-4 h-4 text-emerald-500 dark:text-emerald-400 mx-auto" />
                                ) : (
                                  <Minus className="w-4 h-4 text-zinc-300 dark:text-zinc-600 mx-auto" />
                                )
                              ) : (
                                <span className="font-bold text-indigo-600 dark:text-indigo-400">{item.growth}</span>
                              )}
                            </td>

                            {/* Pro Value */}
                            <td className="py-3 px-4 text-center">
                              {typeof item.pro === 'boolean' ? (
                                item.pro ? (
                                  <CheckCircle2 className="w-4 h-4 text-emerald-500/70 dark:text-emerald-400/70 mx-auto" />
                                ) : (
                                  <Minus className="w-4 h-4 text-zinc-300 dark:text-zinc-600 mx-auto" />
                                )
                              ) : item.comingSoon ? (
                                <span className="px-2 py-0.5 rounded-md text-[9px] font-bold uppercase tracking-wider bg-zinc-100 dark:bg-zinc-800 text-zinc-500 border border-zinc-200 dark:border-zinc-700">
                                  {item.pro}
                                </span>
                              ) : (
                                <span className="font-bold text-zinc-700 dark:text-zinc-300">{item.pro}</span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </Fragment>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Global Feedback Modal */}
      <FeedbackModal
        isOpen={isFeedbackOpen}
        onClose={() => setIsFeedbackOpen(false)}
      />
    </div>
  );
}
