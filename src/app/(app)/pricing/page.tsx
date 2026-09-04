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
    <div className="max-w-6xl mx-auto py-4 px-4 sm:px-6 text-left selection:bg-fg selection:text-bg">
      {/* Header */}
      <div className="text-center mb-10">
        <div className="inline-flex items-center space-x-2 px-3.5 py-1 bg-indigo-500/10 border border-indigo-500/20 rounded-full mb-3">
          <CreditCard className="w-3.5 h-3.5 text-indigo-500 dark:text-indigo-400" />
          <span className="text-[10px] font-black uppercase tracking-[0.2em] text-indigo-600 dark:text-indigo-400">
            Launch &amp; Early Access Subscriptions
          </span>
        </div>
        <h1 className="text-2xl sm:text-4xl font-black tracking-tight mb-2 text-fg">
          Simple, honest pricing for every stage.
        </h1>
        <p className="text-xs sm:text-sm text-muted font-semibold max-w-2xl mx-auto leading-relaxed">
          Pingstack software is free on Starter (₹199/mo on Growth). WhatsApp conversation fees are paid directly to Meta via your Meta payment method with 0% platform markup.
        </p>
      </div>

      {/* Pending Plan Alert */}
      {tenant?.pending_plan_type && (
        <div className="max-w-xl mx-auto mb-8 p-5 rounded-2xl border border-indigo-500/20 bg-indigo-500/5 text-center shadow-sm">
          <span className="inline-block px-2.5 py-0.5 bg-indigo-500/20 text-indigo-400 rounded-full text-[9px] font-black uppercase tracking-wider mb-2">
            Scheduled Transition
          </span>
          <p className="text-xs font-semibold text-fg/80 leading-relaxed">
            Your workspace will transition to the <strong>{tenant.pending_plan_type.toUpperCase()}</strong> plan at the end of your current billing cycle on: <br />
            <span className="text-indigo-400 font-bold">{tenant.current_period_end ? new Date(tenant.current_period_end).toLocaleDateString() : 'N/A'}</span>.
          </p>
        </div>
      )}

      {/* 3 Pricing Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-stretch mb-10">
        {/* STARTER */}
        <div className="p-7 rounded-3xl bg-glass-card/40 border border-glass-border/60 hover:border-glass-border transition-all duration-300 relative flex flex-col justify-between group">
          <div>
            <div className="flex items-center justify-between gap-2 mb-2">
              <h3 className="text-xl font-black tracking-tight text-fg">Starter</h3>
              <span className="px-2.5 py-0.5 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 rounded-full text-[9px] font-black uppercase tracking-wider">
                Free during early access
              </span>
            </div>
            <p className="text-xs text-muted font-medium mb-6 leading-relaxed">
              Everything you need to start managing WhatsApp professionally.
            </p>

            <div className="flex items-baseline gap-2 mb-1">
              <span className="text-lg text-muted/60 line-through font-bold">₹199</span>
              <span className="text-3xl font-black text-fg tracking-tight">FREE</span>
            </div>
            <p className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider mb-6">
              Launch offer &bull; No payment method needed for Pingstack
            </p>

            <ul className="space-y-2.5 mb-8">
              {PLAN_CONFIGS.starter.highlightFeatures.map((feat) => (
                <li key={feat} className="flex items-start text-xs text-fg/80 font-medium">
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
                className="w-full py-3 bg-emerald-500/10 text-emerald-500 dark:text-emerald-400 border border-emerald-500/20 rounded-xl font-black text-xs uppercase tracking-wider cursor-default text-center flex items-center justify-center"
              >
                Current Plan
              </button>
            ) : (
              <button 
                onClick={() => handleUpgrade('starter')}
                disabled={loadingPlan !== null}
                className="w-full py-3 bg-glass-input text-fg hover:bg-glass-card border border-glass-border rounded-xl font-black text-xs uppercase tracking-wider transition-all cursor-pointer flex items-center justify-center shadow-sm"
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
              className="w-full py-3 bg-glass-input text-fg hover:bg-glass-card border border-glass-border rounded-xl font-black text-xs uppercase tracking-wider transition-all cursor-pointer flex items-center justify-center"
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
        <div className="p-7 rounded-3xl bg-glass-card/90 border border-indigo-500/40 shadow-xl relative flex flex-col justify-between">
          <span className="absolute top-0 right-6 -translate-y-1/2 px-3 py-1 bg-gradient-to-r from-blue-600 to-indigo-600 text-white text-[9px] font-black uppercase tracking-widest rounded-full shadow-sm">
            Most Popular
          </span>

          <div>
            <div className="flex items-center justify-between gap-2 mb-2">
              <h3 className="text-xl font-black tracking-tight text-fg">Growth</h3>
              <span className="px-2.5 py-0.5 bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20 rounded-full text-[9px] font-black uppercase tracking-wider">
                Early Access
              </span>
            </div>
            <p className="text-xs text-muted font-medium mb-6 leading-relaxed">
              For businesses that need more contacts, campaigns and automation.
            </p>

            <div className="flex items-baseline gap-2 mb-1">
              <span className="text-lg text-muted/60 line-through font-bold">₹499</span>
              <span className="text-3xl font-black text-fg tracking-tight">₹199</span>
              <span className="text-xs text-muted font-bold">/ month</span>
            </div>
            <p className="text-[10px] font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-wider mb-6">
              ₹199/month during early access
            </p>

            <ul className="space-y-2.5 mb-8">
              {PLAN_CONFIGS.growth.highlightFeatures.map((feat, idx) => (
                <li key={feat} className={`flex items-start text-xs font-medium ${idx === 0 ? 'text-[11px] font-black uppercase tracking-wider text-fg/70' : 'text-fg/80'}`}>
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
                className="w-full py-3 bg-emerald-500/10 text-emerald-500 dark:text-emerald-400 border border-emerald-500/20 rounded-xl font-black text-xs uppercase tracking-wider cursor-default text-center flex items-center justify-center"
              >
                Current Plan
              </button>
            ) : (
              <button 
                onClick={() => handleUpgrade('growth')}
                disabled={loadingPlan !== null}
                className="w-full py-3 bg-fg text-bg hover:opacity-90 rounded-xl font-black text-xs uppercase tracking-wider transition-all cursor-pointer flex items-center justify-center shadow-md"
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
              className="w-full py-3 bg-fg text-bg hover:opacity-90 rounded-xl font-black text-xs uppercase tracking-wider transition-all cursor-pointer flex items-center justify-center shadow-md active:scale-98"
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
        <div className="p-7 rounded-3xl bg-glass-card/30 border border-glass-border/40 opacity-85 relative flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between gap-2 mb-2">
              <h3 className="text-xl font-black tracking-tight text-fg">Pro</h3>
              <span className="px-2.5 py-0.5 bg-muted/10 text-muted border border-glass-border rounded-full text-[9px] font-black uppercase tracking-wider">
                Coming Soon
              </span>
            </div>
            <p className="text-xs text-muted font-medium mb-6 leading-relaxed">
              For businesses ready to automate, collaborate and integrate WhatsApp.
            </p>

            <div className="flex items-baseline gap-1 mb-1">
              <span className="text-3xl font-black text-fg tracking-tight">₹999</span>
              <span className="text-xs text-muted font-bold uppercase tracking-wider">/ month</span>
            </div>
            <p className="text-[10px] font-bold text-muted uppercase tracking-wider mb-6">
              Upcoming Roadmap Plan
            </p>

            <ul className="space-y-2.5 mb-8">
              {PLAN_CONFIGS.pro.highlightFeatures.map((feat, idx) => (
                <li key={feat} className={`flex items-start text-xs font-medium ${idx === 0 ? 'text-[11px] font-black uppercase tracking-wider text-fg/70' : 'text-fg/70'}`}>
                  {idx > 0 && <CheckCircle2 className="w-4 h-4 mr-2 text-emerald-500/60 dark:text-emerald-400/60 shrink-0 mt-0.5" />}
                  <span>{feat}</span>
                </li>
              ))}
            </ul>
          </div>

          <button 
            disabled
            className="w-full py-3 bg-glass-input text-muted/60 border border-glass-border/40 rounded-xl font-black text-xs uppercase tracking-wider cursor-not-allowed text-center flex items-center justify-center"
          >
            Coming Soon
          </button>
        </div>
      </div>

      {/* Early Access Callout Banner with Feedback Integration */}
      <div className="mb-12 p-6 sm:p-8 rounded-3xl bg-glass-card/60 border border-glass-border shadow-md flex flex-col md:flex-row items-start md:items-center justify-between gap-6 relative overflow-hidden">
        <div className="space-y-1.5 max-w-2xl relative z-10">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-indigo-500 dark:text-indigo-400 shrink-0" />
            <h4 className="text-sm font-black uppercase tracking-wider text-fg">
              {EARLY_ACCESS_BANNER.title}
            </h4>
          </div>
          <p className="text-xs sm:text-sm text-fg/80 font-medium leading-relaxed">
            {EARLY_ACCESS_BANNER.description}
          </p>
          <p className="text-xs text-muted font-semibold">
            {EARLY_ACCESS_BANNER.subtext}
          </p>
        </div>

        <button
          type="button"
          onClick={() => setIsFeedbackOpen(true)}
          className="px-5 py-2.5 bg-glass-input hover:bg-glass-card border border-glass-border hover:border-indigo-500/40 text-fg text-xs font-black uppercase tracking-wider rounded-xl shrink-0 transition-all cursor-pointer flex items-center gap-2 relative z-10 shadow-sm"
        >
          <MessageSquare className="w-3.5 h-3.5 text-indigo-500 dark:text-indigo-400" />
          <span>Share Feedback</span>
        </button>
      </div>

      {/* Feature Comparison Section Toggle */}
      <div className="border-t border-glass-border pt-10">
        <div className="flex items-center justify-between mb-8 cursor-pointer select-none" onClick={() => setShowComparison(!showComparison)}>
          <div>
            <h2 className="text-xl sm:text-2xl font-black text-fg tracking-tight">Full Plan Feature Comparison</h2>
            <p className="text-xs text-muted font-medium mt-1">Detailed breakdown of allowances, messaging limits, and upcoming roadmap capabilities.</p>
          </div>
          <button 
            type="button"
            className="p-2 rounded-xl bg-glass-card border border-glass-border text-fg hover:text-indigo-400 transition-colors"
          >
            {showComparison ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
          </button>
        </div>

        {showComparison && (
          <div className="space-y-8 animate-in fade-in duration-300">
            {/* Template Sends Explanation Callout */}
            <div className="p-4 rounded-2xl bg-indigo-500/5 border border-indigo-500/20 flex items-start gap-3 text-xs text-fg/80 font-medium leading-relaxed">
              <Info className="w-4 h-4 text-indigo-500 dark:text-indigo-400 shrink-0 mt-0.5" />
              <div>
                <strong>How Template Sends/Day Work:</strong> {TEMPLATE_SENDS_TOOLTIP}
              </div>
            </div>

            {/* Comparison Table */}
            <div className="rounded-3xl border border-glass-border bg-glass-card/30 overflow-hidden shadow-sm">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-glass-border bg-glass-card/60">
                      <th className="py-4 px-6 font-black uppercase tracking-wider text-muted w-2/5">Feature Category</th>
                      <th className="py-4 px-4 font-black uppercase tracking-wider text-fg text-center w-1/5">
                        Starter <br />
                        <span className="text-[10px] text-emerald-500 font-bold">FREE</span>
                      </th>
                      <th className="py-4 px-4 font-black uppercase tracking-wider text-indigo-500 dark:text-indigo-400 text-center w-1/5 bg-indigo-500/5">
                        Growth <br />
                        <span className="text-[10px] text-indigo-500 font-bold">₹199 / mo</span>
                      </th>
                      <th className="py-4 px-4 font-black uppercase tracking-wider text-muted text-center w-1/5">
                        Pro <br />
                        <span className="text-[10px] text-muted font-bold">Coming Soon</span>
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-glass-border/40">
                    {FEATURE_COMPARISON_CATEGORIES.map((cat) => (
                      <Fragment key={cat.category}>
                        <tr className="bg-glass-card/40 border-t border-b border-glass-border/60">
                          <td colSpan={4} className="py-2.5 px-6 font-black uppercase tracking-widest text-[10px] text-indigo-600 dark:text-indigo-400">
                            {cat.category}
                          </td>
                        </tr>
                        {cat.features.map((item) => (
                          <tr key={item.name} className="hover:bg-glass-card/20 transition-colors">
                            <td className="py-3.5 px-6 font-semibold text-fg">
                              <div className="flex items-center gap-1.5">
                                <span>{item.name}</span>
                                {item.tooltip && (
                                  <div className="relative inline-block">
                                    <HelpCircle 
                                      className="w-3.5 h-3.5 text-muted hover:text-fg cursor-pointer"
                                      onClick={() => setActiveTooltip(activeTooltip === item.name ? null : item.name)}
                                    />
                                    {activeTooltip === item.name && (
                                      <div className="absolute left-0 bottom-full mb-2 w-64 p-2.5 rounded-xl bg-bg border border-glass-border shadow-2xl text-[11px] font-medium text-fg z-50">
                                        {item.tooltip}
                                      </div>
                                    )}
                                  </div>
                                )}
                              </div>
                              {item.description && (
                                <p className="text-[11px] text-muted font-normal mt-0.5">{item.description}</p>
                              )}
                            </td>

                            {/* Starter Value */}
                            <td className="py-3.5 px-4 text-center">
                              {typeof item.starter === 'boolean' ? (
                                item.starter ? (
                                  <CheckCircle2 className="w-4 h-4 text-emerald-500 dark:text-emerald-400 mx-auto" />
                                ) : (
                                  <Minus className="w-4 h-4 text-muted/40 mx-auto" />
                                )
                              ) : (
                                <span className="font-bold text-fg/90">{item.starter}</span>
                              )}
                            </td>

                            {/* Growth Value */}
                            <td className="py-3.5 px-4 text-center bg-indigo-500/5">
                              {typeof item.growth === 'boolean' ? (
                                item.growth ? (
                                  <CheckCircle2 className="w-4 h-4 text-emerald-500 dark:text-emerald-400 mx-auto" />
                                ) : (
                                  <Minus className="w-4 h-4 text-muted/40 mx-auto" />
                                )
                              ) : (
                                <span className="font-bold text-indigo-600 dark:text-indigo-400">{item.growth}</span>
                              )}
                            </td>

                            {/* Pro Value */}
                            <td className="py-3.5 px-4 text-center">
                              {typeof item.pro === 'boolean' ? (
                                item.pro ? (
                                  <CheckCircle2 className="w-4 h-4 text-emerald-500/70 dark:text-emerald-400/70 mx-auto" />
                                ) : (
                                  <Minus className="w-4 h-4 text-muted/40 mx-auto" />
                                )
                              ) : item.comingSoon ? (
                                <span className="px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider bg-muted/10 text-muted border border-glass-border">
                                  {item.pro}
                                </span>
                              ) : (
                                <span className="font-bold text-fg/80">{item.pro}</span>
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
