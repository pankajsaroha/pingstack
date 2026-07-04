'use client';

import { useState, useEffect, useCallback } from 'react';
import { MessageCircle, CheckCircle2, AlertCircle, Copy, CheckSquare, Loader2, Settings, Zap, Rocket, BarChart3, Users, Book, Facebook, ArrowRight, ShieldCheck, Paperclip, X } from 'lucide-react';
import { db } from '@/lib/db';
import { PLANS, PlanType, getActivePlanType } from '@/lib/plans';
import Toast from '@/components/Toast';

declare global {
  interface Window {
    FB: any;
    fbAsyncInit: any;
  }
}

export default function Dashboard() {
  const [tenant, setTenant] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    conversations: 0,
    templatesApproved: 0,
    inboundMessages: 0,
    sent: 0,
    delivered: 0,
    read: 0,
    failed: 0,
    totalContacts: 0,
    estimatedCostThisMonth: 0,
    estimatedCostSinceLastPayment: 0,
    lastMetaPaymentAt: null as string | null,
    metaBudgetLimit: 1000
  });
  const [connecting, setConnecting] = useState(false);
  
  // Meta Spending Cost States
  const [costMode, setCostMode] = useState<'month' | 'last_payment'>('month');
  const [showBillingModal, setShowBillingModal] = useState(false);
  const [inputLastPaid, setInputLastPaid] = useState('');
  const [inputBudget, setInputBudget] = useState(1000);
  const [updatingBilling, setUpdatingBilling] = useState(false);

  // Meta Switch Account States
  const [isSwitching, setIsSwitching] = useState(false);
  
  const handleStartSwitching = async () => {
    setIsSwitching(true);
    setError(null);
    await handleDiscovery(undefined, tenant?.id);
  };

  const handleSaveBillingConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    setUpdatingBilling(true);
    try {
      const res = await fetch('/api/tenant/me', {
        method: 'PATCH',
        headers: { 
          'Content-Type': 'application/json',
          'x-tenant-id': tenant?.id
        },
        body: JSON.stringify({
          last_meta_payment_at: inputLastPaid ? new Date(inputLastPaid).toISOString() : null,
          meta_budget_limit: inputBudget
        })
      });
      if (res.ok) {
        setToast({ message: 'Meta billing configurations updated successfully!', type: 'success' });
        setShowBillingModal(false);
        // Refresh tenant & stats
        await fetchTenant();
        await fetchStats();
      } else {
        setToast({ message: 'Failed to update billing details', type: 'error' });
      }
    } catch (err) {
      setToast({ message: 'Connection error', type: 'error' });
    } finally {
      setUpdatingBilling(false);
    }
  };

  const [healthCheck, setHealthCheck] = useState<{ status: 'loading' | 'ok' | 'limited' | 'error', message?: string } | null>(null);

  const handleHealthCheck = async () => {
    setHealthCheck({ status: 'loading' });
    try {
      if (!tenant?.whatsapp_account?.business_id) {
        setHealthCheck({
          status: 'limited',
          message: 'Select a WhatsApp Business Account and complete setup before syncing templates.'
        });
        return;
      }

      const res = await fetch('/api/whatsapp/meta/templates', {
        headers: { 'x-tenant-id': tenant?.id }
      });
      const data = await res.json();
      const templates = Array.isArray(data) ? data : data.templates;

      if (Array.isArray(templates) && templates.length > 0) {
        setHealthCheck({ status: 'ok', message: 'All systems go! Templates synced.' });
      } else if (Array.isArray(templates) && templates.length === 0) {
        setHealthCheck({ status: 'limited', message: 'Connected, but no templates found. Your account might be in a "Limited" state by Meta.' });
      } else {
        setHealthCheck({ status: 'error', message: data.message || data.error || 'Permission check failed' });
      }
    } catch (err) {
      setHealthCheck({ status: 'error', message: 'Could not reach Meta' });
    }
  };
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);

  const [manualToken, setManualToken] = useState('');
  const [manualWabaId, setManualWabaId] = useState('');
  const [manualPhoneId, setManualPhoneId] = useState('');
  const [useManual, setUseManual] = useState(false);
  
  // Setup Wizard State
  const [onboardingStep, setOnboardingStep] = useState(1);
  const [fbLoaded, setFbLoaded] = useState(false);
  const [discovery, setDiscovery] = useState<any>(null);
  const [tempToken, setTempToken] = useState('');
  const [portfolioId, setPortfolioId] = useState('');
  const [selectedWaba, setSelectedWaba] = useState('');
  const [selectedPhone, setSelectedPhone] = useState('');

  const handleCancelSubscription = async () => {
    if (!confirm('Are you sure you want to cancel your subscription? You will still have access until the end of the current billing cycle.')) return;
    try {
      const res = await fetch('/api/billing/razorpay/cancel-subscription', { method: 'POST' });
      const data = await res.json();
      if (data.success) {
        setToast({ message: data.message, type: 'success' });
        fetchTenant();
      } else {
        setToast({ message: data.error || 'Failed to cancel subscription', type: 'error' });
      }
    } catch (e) {
      setToast({ message: 'Cancellation failed', type: 'error' });
    }
  };

  useEffect(() => {
    fetchTenant();

    const params = new URLSearchParams(window.location.search);
    
    if (params.get('meta_success') === 'linked') {
      const business = params.get('business');
      setToast({ message: `Successfully connected ${business || 'WhatsApp'}!`, type: 'success' });
      window.history.replaceState({}, '', window.location.pathname);
    }
    if (params.get('meta_error')) {
      setError(decodeURIComponent(params.get('meta_error')!));
      window.history.replaceState({}, '', window.location.pathname);
    }

    if (params.get('checkout') === 'success') {
      setToast({ message: 'Plan upgraded successfully', type: 'success' });
      window.history.replaceState({}, '', window.location.pathname);
    }

    const initFB = () => {
      if (window.FB) {
        window.FB.init({
          appId: process.env.NEXT_PUBLIC_FB_APP_ID,
          cookie: true,
          xfbml: true,
          version: 'v19.0'
        });
        setFbLoaded(true);
      }
    };

    window.fbAsyncInit = initFB;

    if (!window.FB) {
      const script = document.createElement('script');
      script.id = 'facebook-jssdk';
      script.src = 'https://connect.facebook.net/en_US/sdk.js';
      script.async = true;
      script.defer = true;
      script.onload = () => {};
      document.head.appendChild(script);
    } else {
      initFB();
    }
  }, []);

  const fetchStats = async () => {
    if (!tenant?.id) return;

    try {
      const res = await fetch('/api/stats', {
        headers: { 'x-tenant-id': tenant.id }
      });
      if (res.ok) {
        const data = await res.json();
        setStats(data);
      }
    } catch (e) {
      console.error('Stats fetch failed:', e);
    }
  };

  useEffect(() => {
    if (tenant?.id) {
      fetchStats();
      const interval = setInterval(() => {
        fetchStats();
      }, 30000);
      return () => clearInterval(interval);
    }
  }, [tenant?.id]);

  const handleDiscovery = useCallback(async (code?: string, currentTenantId?: string) => {
    setConnecting(true);
    setError(null);
    try {
      const res = await fetch('/api/whatsapp/meta/discover', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'x-tenant-id': currentTenantId || tenant?.id 
        },
        body: JSON.stringify({ code })
      });
      const data = await res.json();
      if (data.success) {
        setDiscovery(data.wabas || []);
        setTempToken(data.accessToken);
        setPortfolioId(data.portfolioId);
        const isCurrentlyConnected = tenant?.whatsapp_account?.status === 'ACTIVE';
        if (!isCurrentlyConnected) {
          setOnboardingStep(2);
        }
        if (data.wabas.length > 0) {
          const firstWaba = data.wabas[0];
          setSelectedWaba(firstWaba.id);
          if (firstWaba.phones?.length > 0) {
            setSelectedPhone(firstWaba.phones[0].id);
          }
        }
      } else {
        setError(data.message || 'Discovery failed');
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setConnecting(false);
    }
  }, [tenant]);

  const fetchTenant = async () => {
    try {
      const res = await fetch('/api/tenant/me');
      if (res.ok) {
        const data = await res.json();
        setTenant(data);
        if (data.whatsapp_account?.status === 'LINKED') {
          handleDiscovery(undefined, data.id);
        }
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleManualConnect = async (e: React.FormEvent) => {
    e.preventDefault();
    setConnecting(true);
    setError(null);

    try {
      const res = await fetch('/api/whatsapp/meta/manual-connect', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'x-tenant-id': tenant?.id 
        },
        body: JSON.stringify({
          accessToken: manualToken,
          wabaId: manualWabaId,
          phoneNumberId: manualPhoneId
        })
      });

      const data = await res.json();
      if (res.ok) {
        fetchTenant();
        setManualToken('');
        setManualWabaId('');
        setManualPhoneId('');
      } else {
        setError(data.error || data.message || 'Failed to connect manually.');
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setConnecting(false);
    }
  };

  const handleEmbeddedConnect = useCallback(() => {
    if (!window.FB) {
       setToast({ message: 'Meta SDK not loaded. please refresh.', type: 'error' });
       return;
    }

    setConnecting(true);
    setError(null);

    window.FB.login((response: any) => {
      if (response.authResponse) {
        const code = response.authResponse.code;
        handleDiscovery(code);
      } else {
        setConnecting(false);
        setError('Login cancelled or failed.');
      }
    }, {
      config_id: process.env.NEXT_PUBLIC_FB_CONFIG_ID,
      response_type: 'code',
      override_default_response_type: true
    });
  }, [tenant]);

  const handleFinishOnboarding = async () => {
    if (!selectedWaba || !selectedPhone) return;

    setConnecting(true);
    try {
      const res = await fetch('/api/whatsapp/meta/finish', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'x-tenant-id': tenant?.id
        },
        body: JSON.stringify({
          accessToken: tempToken,
          wabaId: selectedWaba,
          phoneId: selectedPhone,
          portfolioId: portfolioId
        })
      });

      const data = await res.json();
      if (res.ok) {
        setToast({ message: 'Setup completed successfully!', type: 'success' });
        setIsSwitching(false);
        await fetchTenant();
      } else {
        setError(data.message || 'Finalization failed');
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setConnecting(false);
    }
  };

  const handleResetConnection = async () => {
    if (!confirm('Are you sure you want to reset your WhatsApp connection? This will clear your current Meta link.')) return;
    setConnecting(true);
    try {
      const res = await fetch('/api/whatsapp/meta/reset', { 
        method: 'POST',
        headers: { 'x-tenant-id': tenant?.id }
      });
      if (res.ok) {
        setDiscovery(null);
        setTempToken('');
        setOnboardingStep(1);
        await fetchTenant();
        setToast({ message: 'Connection reset successfully', type: 'success' });
      }
    } catch (err: any) {
      setError('Failed to reset connection');
    } finally {
      setConnecting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-32 grayscale opacity-45">
        <Loader2 className="w-8 h-8 animate-spin mb-4 text-fg" />
        <p className="text-xs font-black uppercase tracking-[0.2em]">Initializing system controls...</p>
      </div>
    );
  }

  const whatsappAccount = tenant?.whatsapp_account;
  const isConnected = whatsappAccount?.status === 'ACTIVE';

  return (
    <div className="animate-in fade-in duration-700 max-w-6xl mx-auto p-4 sm:p-6">
      
      {/* Header Panel */}
      <div className="mb-10 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black tracking-tight text-fg sm:text-4xl">
            Welcome back, {tenant?.user_name || 'User'}!
          </h1>
          <p className="text-muted mt-2 text-base font-semibold">
            {tenant?.name || 'Workspace'} &bull; {isConnected ? 'Your official Meta Cloud API infrastructure is online.' : 'Link your Meta Business profile to launch notifications.'}
          </p>
        </div>
        {isConnected && (
          <div className="flex items-center self-start px-5 py-2.5 bg-gradient-to-br from-green-50 to-green-100/50 dark:from-green-950/20 dark:to-green-900/10 text-green-700 dark:text-green-400 rounded-2xl text-sm font-bold border border-green-200/80 dark:border-green-800/40 shadow-sm shadow-green-500/[0.02] transition-all hover:scale-[1.01] cursor-default">
            <CheckCircle2 className="w-5 h-5 mr-2 text-green-700 dark:text-green-400" />
            Active Connection
          </div>
        )}
      </div>

      {!isConnected && (
        <div className="mb-12">
          {/* Wizard Type Selector */}
          <div className="flex justify-center mb-10">
            <div className="inline-flex p-1.5 bg-glass-card border border-glass-border rounded-2xl">
              <button 
                onClick={() => setUseManual(false)}
                className={`px-8 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all cursor-pointer ${
                  !useManual 
                    ? 'bg-fg text-bg shadow-lg shadow-white/10' 
                    : 'text-muted hover:text-fg'
                }`}
              >
                Embedded Setup
              </button>
              <button 
                onClick={() => setUseManual(true)}
                className={`px-8 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all cursor-pointer ${
                  useManual 
                    ? 'bg-fg text-bg shadow-lg' 
                    : 'text-muted hover:text-fg'
                }`}
              >
                Manual Config
              </button>
            </div>
          </div>
          
          {!useManual ? (
            /* Premium Embedded Onboarding */
            <div className="max-w-5xl mx-auto bg-glass-card border border-glass-border rounded-[2.5rem] shadow-[0_40px_100px_rgba(0,0,0,0.6)] overflow-hidden animate-in zoom-in-95 duration-700 relative">
              
              {/* Progress bar line */}
              <div className="absolute top-0 left-0 w-full h-1 bg-glass-input">
                <div 
                  className="h-full bg-gradient-to-r from-blue-500 via-indigo-500 to-indigo-300 transition-all duration-1000 ease-out"
                  style={{ width: onboardingStep === 1 ? '33.33%' : onboardingStep === 2 ? '66.66%' : '100%' }}
                />
              </div>

              <div className="flex flex-col min-h-[480px]">
                <div className="grid grid-cols-1 lg:grid-cols-12 flex-grow">
                  
                  {/* Left Column: Instructions details */}
                  <div className="lg:col-span-7 p-12 lg:p-16 bg-glass-card border-r border-glass-border flex flex-col justify-between">
                    <div>
                      <div className="w-12 h-12 bg-glass-input border border-glass-border rounded-2xl flex items-center justify-center mb-8">
                        <Facebook className="w-6 h-6 text-fg" />
                      </div>
                      
                      <div className="overflow-visible">
                        {onboardingStep === 1 ? (
                          <div className="animate-in fade-in slide-in-from-top-4 duration-500">
                            <h2 className="text-3xl font-black text-fg mb-4 leading-tight tracking-tight">Link Meta Business</h2>
                            <p className="text-sm text-muted font-semibold leading-relaxed max-w-lg mb-8">
                              Connect your Meta credentials to discover approved WhatsApp Business Accounts (WABA) and sync numbers automatically.
                            </p>

                            <div className="bg-glass-card border border-glass-border p-6 rounded-2xl max-w-md">
                              <h4 className="text-[9px] font-black text-indigo-600 dark:text-indigo-400 uppercase tracking-widest mb-2.5 flex items-center gap-2">
                                 <ShieldCheck className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                                 SECURE EMBEDDED INTEGRATION
                              </h4>
                              <p className="text-[11px] text-fg/50 font-bold leading-relaxed">
                                We utilize secure Meta partner integrations. PingStack never holds your master credentials; communications are signed and handled using partner-level auth.
                              </p>
                            </div>
                          </div>
                        ) : (
                          <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                            <h2 className="text-3xl font-black text-fg mb-4 leading-tight tracking-tight">Configure Assets</h2>
                            <p className="text-sm text-muted font-semibold leading-relaxed max-w-lg">
                              Specify which WABA ID and registered phone assets you want to link to this workspaces project.
                            </p>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Right Column: Interaction inputs */}
                  <div className="lg:col-span-5 p-10 flex flex-col items-center justify-center bg-glass-card/20 relative">
                    <div className="w-full max-w-[320px]">
                      {onboardingStep === 1 ? (
                        <div className="w-full animate-in fade-in zoom-in-95 duration-700">
                          <div className="mb-10 text-center">
                            <div className="w-20 h-20 mx-auto relative flex items-center justify-center">
                              <div className={`absolute inset-0 rounded-full bg-indigo-100/50 dark:bg-indigo-500/10 ${connecting ? 'animate-ping' : 'animate-pulse'}`} />
                              <div className="relative w-14 h-14 bg-glass-card border border-glass-border rounded-2xl flex items-center justify-center">
                                 <Facebook className={`w-6 h-6 text-fg ${connecting ? 'animate-spin-slow' : ''}`} />
                              </div>
                            </div>
                            <p className="mt-6 text-[9px] font-black text-fg/30 uppercase tracking-[0.2em]">Awaiting Meta Connection</p>
                          </div>

                          <button 
                            onClick={handleEmbeddedConnect}
                            disabled={connecting || !fbLoaded}
                            className="w-full bg-fg text-bg hover:opacity-90 disabled:opacity-30 disabled:text-muted h-14 rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl transition-all active:scale-[0.98] flex items-center justify-center group cursor-pointer"
                          >
                            {!fbLoaded ? (
                               <span className="flex items-center"><Loader2 className="w-4 h-4 mr-2 animate-spin opacity-50" /> Initializing SDK...</span>
                            ) : connecting ? (
                               <span className="flex items-center">Awaiting Auth...</span>
                            ) : (
                               <span className="flex items-center">Launch Meta Auth <ArrowRight className="w-4 h-4 ml-2 transition-transform group-hover:translate-x-1" /></span>
                            )}
                          </button>

                          {(whatsappAccount || tempToken) && (
                            <button 
                              onClick={handleResetConnection}
                              className="w-full mt-4 h-12 rounded-xl text-[9px] font-black text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 hover:bg-red-50 dark:hover:bg-red-500/10 border border-red-200 dark:border-red-500/20 transition-all active:scale-95 cursor-pointer"
                            >
                              Reset Connection
                            </button>
                          )}
                        </div>
                      ) : (
                        <div className="w-full space-y-6 animate-in fade-in slide-in-from-right-10 duration-700">
                          <div className="space-y-6">
                            <div className="space-y-2">
                              <label className="text-[10px] font-black text-fg/30 uppercase tracking-widest ml-1">WABA Business Account</label>
                              {discovery && discovery.length > 0 ? (
                                <select 
                                  value={selectedWaba}
                                  onChange={(e) => {
                                    setSelectedWaba(e.target.value);
                                    const waba = discovery.find((w: any) => w.id === e.target.value);
                                    if (waba?.phones?.length > 0) setSelectedPhone(waba.phones[0].id);
                                  }}
                                  className="w-full bg-glass-input border border-glass-border rounded-2xl px-5 py-4 text-xs font-bold focus:border-indigo-500 focus:outline-none transition-all cursor-pointer text-fg"
                                >
                                  {discovery.map((waba: any) => (
                                    <option key={waba.id} value={waba.id} className="bg-bg text-fg">{waba.name}</option>
                                  ))}
                                </select>
                              ) : (
                                 <div className="p-5 bg-amber-500/10 rounded-2xl border border-amber-500/20">
                                    <p className="text-[9px] font-black text-amber-400 uppercase tracking-widest mb-2 flex items-center gap-1.5">
                                       <AlertCircle className="w-3.5 h-3.5" />
                                       Assets Not Shared
                                    </p>
                                    <p className="text-xs text-fg/50 font-bold leading-relaxed mb-4">
                                       Link complete, but WhatsApp accounts are missing. Share your assets with partner ID **1571768617266202**.
                                    </p>
                                    <a 
                                       href={`https://business.facebook.com/latest/settings/whatsapp_account?business_id=${portfolioId}`}
                                       target="_blank" 
                                       className="w-full py-2.5 bg-fg text-bg rounded-xl text-[9px] font-black uppercase tracking-widest hover:bg-neutral-100 transition-all flex items-center justify-center shadow-sm"
                                    >
                                       Meta Partner Settings
                                       <ArrowRight className="w-3 h-3 ml-1.5" />
                                    </a>
                                 </div>
                              )}
                            </div>

                            <div className="space-y-2">
                              <label className="text-[10px] font-black text-fg/30 uppercase tracking-widest ml-1">Phone Number ID</label>
                              {discovery && discovery.length > 0 ? (
                                <select 
                                  value={selectedPhone}
                                  onChange={(e) => setSelectedPhone(e.target.value)}
                                  className="w-full bg-glass-input border border-glass-border rounded-2xl px-5 py-4 text-xs font-bold focus:border-indigo-500 focus:outline-none transition-all cursor-pointer font-mono text-fg"
                                >
                                  {discovery.find((w: any) => w.id === selectedWaba)?.phones?.map((phone: any) => (
                                    <option key={phone.id} value={phone.id} className="bg-bg text-fg">{phone.display_phone_number}</option>
                                  ))}
                                </select>
                              ) : (
                                <div className="p-4 bg-glass-input text-fg/30 rounded-2xl text-[9px] font-black border border-glass-border">
                                   N/A
                                </div>
                              )}
                            </div>
                          </div>

                          {healthCheck && (
                            <div className={`p-4 rounded-xl border text-[10px] font-bold ${
                              healthCheck.status === 'ok' 
                                ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' 
                                : healthCheck.status === 'limited' 
                                ? 'bg-amber-500/10 border-amber-500/20 text-amber-400' 
                                : 'bg-red-500/10 border-red-500/20 text-red-400'
                            }`}>
                              <div className="flex items-center gap-1.5 mb-1">
                                <div className={`w-1.5 h-1.5 rounded-full ${
                                  healthCheck.status === 'ok' ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'
                                }`} />
                                <span className="font-black uppercase tracking-widest">{healthCheck.status}</span>
                              </div>
                              <p className="opacity-90">{healthCheck.message}</p>
                            </div>
                          )}

                          <div className="space-y-4">
                            <button 
                              onClick={handleFinishOnboarding}
                              disabled={connecting || !selectedPhone}
                              className="w-full bg-fg text-bg hover:opacity-90 disabled:opacity-40 disabled:text-muted h-12 rounded-xl font-black text-xs uppercase tracking-widest transition-all cursor-pointer flex items-center justify-center"
                            >
                              {connecting ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Complete Setup'}
                            </button>

                            <div className="pt-4 border-t border-glass-border flex items-center justify-between">
                              <button 
                                onClick={() => setOnboardingStep(1)}
                                className="text-[9px] font-black text-fg/30 hover:text-fg transition-all uppercase tracking-widest flex items-center cursor-pointer"
                              >
                                <ArrowRight className="w-3 h-3 mr-1.5 rotate-180" />
                                Back
                              </button>
                              
                              <div className="flex gap-2">
                                <button 
                                  onClick={handleHealthCheck}
                                  disabled={healthCheck?.status === 'loading'}
                                  className="px-4 py-1.5 rounded-lg text-[9px] font-black text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-500/20 hover:bg-indigo-50 dark:hover:bg-indigo-500/10 transition-all cursor-pointer"
                                >
                                  Health
                                </button>
                                <button 
                                  onClick={handleResetConnection}
                                  className="px-4 py-1.5 rounded-lg text-[9px] font-black text-red-600 dark:text-red-400 border border-red-200 dark:border-red-500/20 hover:bg-red-50 dark:hover:bg-red-500/10 transition-all cursor-pointer"
                                >
                                  Reset
                                </button>
                              </div>
                            </div>
                          </div>
                        </div>
                      )}
                      
                      {error && (
                        <div className="mt-6 p-4 bg-red-500/10 border border-red-500/20 rounded-2xl">
                          <p className="text-[9px] font-black uppercase tracking-widest text-red-400 mb-1">Auth Error</p>
                          <p className="text-xs font-bold leading-snug mb-3 text-fg/70">{error}</p>
                          <button 
                            onClick={handleEmbeddedConnect}
                            className="px-3 py-1.5 bg-fg text-bg rounded-lg text-[9px] font-black uppercase tracking-widest hover:bg-neutral-100 transition-all cursor-pointer"
                          >
                            Retry Auth
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Steps Footer Indicators */}
                <div className="px-12 py-8 bg-glass-card/20 border-t border-glass-border">
                  <div className="flex flex-col sm:flex-row items-center justify-between gap-6 max-w-3xl mx-auto">
                    {[ 
                      { step: 1, label: 'Meta Auth', Icon: ShieldCheck },
                      { step: 2, label: 'Sync Assets', Icon: Settings },
                      { step: 3, label: 'Finish Setup', Icon: Rocket }
                    ].map((item, idx) => (
                      <div key={item.step} className="flex items-center flex-grow last:flex-none">
                        <div className="flex items-center">
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center mr-3 border ${
                            onboardingStep === item.step 
                              ? 'bg-fg border-fg text-bg shadow-[0_0_15px_rgba(255,255,255,0.15)]' 
                              : onboardingStep > item.step 
                              ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' 
                              : 'bg-glass-input border-glass-border text-fg/30'
                          }`}>
                            {onboardingStep > item.step ? <CheckCircle2 className="w-4 h-4" /> : <item.Icon className="w-4 h-4" />}
                          </div>
                          <span className={`text-[10px] font-black uppercase tracking-widest ${
                            onboardingStep === item.step ? 'text-fg' : 'text-fg/30'
                          }`}>
                            {item.label}
                          </span>
                        </div>
                        {idx < 2 && (
                          <div className="hidden sm:block h-[1px] flex-grow mx-6 bg-glass-input" />
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          ) : (
            /* Manual Setup */
            <div className="space-y-8 animate-in slide-in-from-right-4 duration-500 max-w-5xl mx-auto">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Guide Panel */}
                <div className="bg-glass-card border border-glass-border p-8 rounded-[2.5rem] shadow-2xl flex flex-col justify-between">
                  <div>
                    <h3 className="text-lg font-black text-fg mb-6 flex items-center">
                      <Settings className="w-5 h-5 mr-3 text-indigo-600 dark:text-indigo-400" />
                      Developers Configuration Steps
                    </h3>
                    
                    <div className="space-y-6">
                      {[
                        { step: 1, title: 'Build Meta Business App', text: 'Navigate to developers.facebook.com/apps and spawn a Business APP integrations template.' },
                        { step: 2, title: 'Add WhatsApp Product', text: 'Under products center, click Set Up for the WhatsApp Cloud API integration pipeline.' },
                        { step: 3, title: 'Verify Permanent Access Token', text: 'Generate a Permanent Token and extract your Phone Number ID and WABA Business Account ID.' }
                      ].map(item => (
                        <div key={item.step} className="flex items-start">
                          <div className="w-7 h-7 rounded-xl bg-glass-input border border-glass-border text-xs font-black flex items-center justify-center mr-4 shrink-0 mt-0.5">{item.step}</div>
                          <div>
                            <p className="font-bold text-sm text-fg">{item.title}</p>
                            <p className="text-xs text-muted mt-1 font-semibold leading-relaxed">{item.text}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                  
                  <a 
                    href="https://developers.facebook.com/apps" 
                    target="_blank" 
                    className="mt-8 py-3.5 bg-glass-input hover:bg-white/10 text-fg border border-glass-border rounded-2xl text-[10px] font-black uppercase tracking-widest text-center block transition-all"
                  >
                    Open Developers Console
                  </a>
                </div>

                {/* Form Panel */}
                <div className="bg-glass-card border border-glass-border p-8 rounded-[2.5rem] shadow-2xl flex flex-col justify-between relative overflow-hidden">
                  <div>
                    <h3 className="text-lg font-black text-fg mb-6 flex items-center">
                      <CheckSquare className="w-5 h-5 mr-3 text-emerald-400" />
                      Configure API Credentials
                    </h3>

                    <form onSubmit={handleManualConnect} className="space-y-5">
                      <div>
                        <label className="block text-[10px] font-black text-fg/30 uppercase tracking-widest mb-2 ml-1">Meta Access Token (Permanent)</label>
                        <input 
                          type="password"
                          value={manualToken}
                          onChange={(e) => setManualToken(e.target.value)}
                          placeholder="EAAB..."
                          className="w-full bg-glass-input border border-glass-border rounded-2xl px-5 py-4 text-sm focus:border-indigo-500 focus:outline-none transition-all placeholder:text-fg/10 font-mono text-fg"
                          required
                        />
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-[10px] font-black text-fg/30 uppercase tracking-widest mb-2 ml-1">Phone Asset ID</label>
                          <input 
                            type="text"
                            value={manualPhoneId}
                            onChange={(e) => setManualPhoneId(e.target.value)}
                            placeholder="1098..."
                            className="w-full bg-glass-input border border-glass-border rounded-2xl px-5 py-4 text-sm focus:border-indigo-500 focus:outline-none transition-all placeholder:text-fg/10 font-mono text-fg"
                            required
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] font-black text-fg/30 uppercase tracking-widest mb-2 ml-1">WABA Account ID</label>
                          <input 
                            type="text"
                            value={manualWabaId}
                            onChange={(e) => setManualWabaId(e.target.value)}
                            placeholder="2384..."
                            className="w-full bg-glass-input border border-glass-border rounded-2xl px-5 py-4 text-sm focus:border-indigo-500 focus:outline-none transition-all placeholder:text-fg/10 font-mono text-fg"
                            required
                          />
                        </div>
                      </div>

                      {error && (
                        <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-xs font-bold flex items-center">
                          <AlertCircle className="w-4 h-4 mr-2" />
                          {error}
                        </div>
                      )}

                      <button 
                        type="submit"
                        disabled={connecting}
                        className="w-full bg-fg text-bg hover:opacity-90 disabled:opacity-40 disabled:text-muted h-12 rounded-xl font-black text-xs uppercase tracking-widest transition-all cursor-pointer flex items-center justify-center mt-6"
                      >
                        {connecting ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : 'Save Setup'}
                      </button>
                    </form>
                  </div>
                </div>
              </div>

              {/* Parallel Notes */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <div className="p-5 bg-amber-500/5 rounded-2xl border border-amber-500/10">
                  <p className="text-[11px] text-amber-400/90 leading-relaxed font-bold">
                    <span className="inline-block px-2 py-0.5 bg-amber-500/20 text-amber-400 rounded text-[9px] font-black uppercase mr-2 tracking-wider">Warning</span>
                    Check credentials constraints before committing. Sync will crash if tokens do not match permissions scopes on Meta.
                  </p>
                </div>
                <div className="p-5 bg-indigo-50 dark:bg-indigo-500/5 rounded-2xl border border-indigo-100 dark:border-indigo-500/10">
                  <p className="text-[11px] text-indigo-700 dark:text-indigo-400/90 leading-relaxed font-bold">
                    <span className="inline-block px-2 py-0.5 bg-indigo-100 dark:bg-indigo-500/20 text-indigo-700 dark:text-indigo-400 rounded text-[9px] font-black uppercase mr-2 tracking-wider">Permits</span>
                    Use Permanent System Tokens. Expiry errors will trigger after 24h if standard developer-level temporary codes are linked.
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {isConnected && (
        <div className="mb-12 grid grid-cols-1 lg:grid-cols-3 gap-8 animate-in slide-in-from-top-4 duration-700">
          
          {/* Connection management card */}
          <div className="lg:col-span-2 bg-glass-card border border-glass-border rounded-[2.5rem] p-8 shadow-2xl flex flex-col justify-between">
            {isSwitching ? (
              <div className="w-full space-y-6">
                <div>
                  <h3 className="text-xl font-black text-fg tracking-tight">Switch Selected Account</h3>
                  <p className="text-sm text-muted mt-1 font-semibold">Select a different WhatsApp Business Profile or Phone ID.</p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-fg/30 uppercase tracking-widest ml-1">WABA Account</label>
                    {discovery && discovery.length > 0 ? (
                      <select 
                        value={selectedWaba}
                        onChange={(e) => {
                          setSelectedWaba(e.target.value);
                          const waba = discovery.find((w: any) => w.id === e.target.value);
                          if (waba?.phones?.length > 0) setSelectedPhone(waba.phones[0].id);
                        }}
                        className="w-full bg-glass-input border border-glass-border rounded-2xl px-5 py-4 text-xs font-bold focus:border-indigo-500 focus:outline-none transition-all cursor-pointer text-fg"
                      >
                        {discovery.map((waba: any) => (
                          <option key={waba.id} value={waba.id} className="bg-bg text-fg">{waba.name}</option>
                        ))}
                      </select>
                    ) : (
                      <div className="text-xs text-muted py-4 ml-1">No WABAs found</div>
                    )}
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-fg/30 uppercase tracking-widest ml-1">Phone Asset</label>
                    {selectedWaba && discovery?.find((w: any) => w.id === selectedWaba)?.phones?.length > 0 ? (
                      <select 
                        value={selectedPhone}
                        onChange={(e) => setSelectedPhone(e.target.value)}
                        className="w-full bg-glass-input border border-glass-border rounded-2xl px-5 py-4 text-xs font-bold focus:border-indigo-500 focus:outline-none transition-all cursor-pointer text-fg"
                      >
                        {discovery.find((w: any) => w.id === selectedWaba).phones.map((phone: any) => (
                          <option key={phone.id} value={phone.id} className="bg-bg text-fg">
                            {phone.verified_name} ({phone.display_phone_number})
                          </option>
                        ))}
                      </select>
                    ) : (
                      <div className="text-xs text-muted py-4 ml-1">No phone assets available</div>
                    )}
                  </div>
                </div>

                {error && (
                  <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-xs font-bold flex items-center">
                    <AlertCircle className="w-4 h-4 mr-2" />
                    {error}
                  </div>
                )}

                <div className="flex gap-3 justify-end mt-4">
                  <button 
                    onClick={() => {
                      setIsSwitching(false);
                      setError(null);
                    }}
                    className="px-6 h-12 border border-glass-border text-muted hover:text-fg rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button 
                    onClick={handleFinishOnboarding}
                    disabled={connecting || !selectedWaba || !selectedPhone}
                    className="px-8 h-12 bg-fg text-bg hover:opacity-90 disabled:opacity-40 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all cursor-pointer shadow-lg flex items-center justify-center"
                  >
                    {connecting ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : 'Save Selection'}
                  </button>
                </div>
              </div>
            ) : (
              <>
                <div className="flex items-center gap-6">
                  <div className="w-14 h-14 bg-glass-input border border-glass-border rounded-2xl flex items-center justify-center">
                    <Settings className="w-6 h-6 text-fg/60" />
                  </div>
                  <div>
                    <h3 className="text-xl font-black text-fg tracking-tight">Manage Connection</h3>
                    <p className="text-sm text-muted mt-1 font-semibold">Configure or reset your WhatsApp Cloud API link.</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 mt-6 sm:mt-0 sm:self-end">
                  <button 
                    onClick={handleStartSwitching}
                    className="px-6 h-12 bg-fg text-bg hover:opacity-90 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all cursor-pointer shadow-lg shadow-white/5"
                  >
                    Switch Account
                  </button>
                  <button 
                    onClick={handleResetConnection}
                    className="px-6 h-12 border border-red-200 dark:border-red-900/30 bg-red-50 dark:bg-red-950/20 hover:bg-red-100/50 dark:hover:bg-red-900/20 text-red-600 dark:text-red-400 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all cursor-pointer"
                  >
                    Reset Connection
                  </button>
                </div>
              </>
            )}
          </div>

          {/* Meta spending estimation card */}
          <div className="bg-glass-card border border-glass-border rounded-[2.5rem] p-8 shadow-2xl relative overflow-hidden flex flex-col justify-between group">
            <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/[0.02] to-transparent pointer-events-none" />
            
            <div>
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-sm font-black text-fg uppercase tracking-widest">Meta API Costs</h3>
                <button 
                  onClick={() => {
                    setInputLastPaid(stats.lastMetaPaymentAt ? stats.lastMetaPaymentAt.split('T')[0] : '');
                    setInputBudget(stats.metaBudgetLimit || 1000);
                    setShowBillingModal(true);
                  }}
                  className="text-[9px] font-black text-indigo-400 hover:text-fg uppercase tracking-widest transition-colors cursor-pointer"
                >
                  Configure
                </button>
              </div>

              {/* Mode Select Tabs */}
              <div className="flex gap-2 p-1 bg-glass-input rounded-xl border border-glass-border mb-6">
                <button
                  onClick={() => setCostMode('month')}
                  className={`flex-1 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-wider transition-all cursor-pointer ${
                    costMode === 'month' ? 'bg-fg text-bg' : 'text-fg/40 hover:text-fg'
                  }`}
                >
                  Current Month
                </button>
                <button
                  onClick={() => setCostMode('last_payment')}
                  className={`flex-1 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-wider transition-all cursor-pointer ${
                    costMode === 'last_payment' ? 'bg-fg text-bg' : 'text-fg/40 hover:text-fg'
                  }`}
                >
                  Since Last Paid
                </button>
              </div>

              <div className="flex items-baseline gap-1.5">
                <span className="text-3xl font-black text-fg">
                  ₹{(costMode === 'month' ? stats.estimatedCostThisMonth : stats.estimatedCostSinceLastPayment).toFixed(2)}
                </span>
                <span className="text-[10px] font-bold text-muted uppercase tracking-wider">INR</span>
              </div>
              <p className="text-[10px] text-muted font-semibold mt-2 leading-relaxed">
                {costMode === 'month' ? (
                  <span>Estimated charges for template conversations sent this calendar month.</span>
                ) : (
                  <span>
                    Estimated charges since last payment: <strong>{stats.lastMetaPaymentAt ? new Date(stats.lastMetaPaymentAt).toLocaleDateString() : 'None Set'}</strong>.
                  </span>
                )}
              </p>
            </div>

            {/* Budget warnings / Pay link */}
            <div className="mt-6 border-t border-glass-border pt-4">
              {stats.estimatedCostSinceLastPayment > stats.metaBudgetLimit ? (
                <div className="space-y-3">
                  <div className="px-3.5 py-2 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-[10px] font-bold leading-relaxed">
                    ⚠️ Budget Exceeded! Estimated cost (₹{stats.estimatedCostSinceLastPayment.toFixed(2)}) is over limit (₹{stats.metaBudgetLimit}).
                  </div>
                  <a 
                    href="https://business.facebook.com/billing_hub" 
                    target="_blank" 
                    rel="noreferrer"
                    className="w-full py-2.5 bg-red-600 hover:bg-red-500 text-white rounded-xl text-[9px] font-black uppercase tracking-widest text-center block transition-all shadow-lg shadow-red-500/10"
                  >
                    Pay on Meta Business Hub &rarr;
                  </a>
                </div>
              ) : (
                <a 
                  href="https://business.facebook.com/billing_hub" 
                  target="_blank" 
                  rel="noreferrer"
                  className="w-full py-2.5 bg-glass-input hover:bg-white/5 text-fg/60 hover:text-fg border border-glass-border rounded-xl text-[9px] font-black uppercase tracking-widest text-center block transition-all"
                >
                  Meta Billing Hub &rarr;
                </a>
              )}
            </div>

          </div>

        </div>
      )}

      {/* Plan & Resources Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-12">
        <div className="bg-glass-card border border-glass-border p-8 rounded-[2.5rem] shadow-2xl relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-6">
            <span className="px-3.5 py-1.5 bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 rounded-full text-[9px] font-black uppercase tracking-widest border border-indigo-100 dark:border-indigo-500/20">
              {tenant?.plan_type || 'Starter'} Profile
            </span>
          </div>
          
          <h3 className="text-lg font-black text-fg mb-8 flex items-center">
            <Zap className="w-5 h-5 mr-3 text-indigo-600 dark:text-indigo-400" />
            Plan Limits & Retainers
          </h3>

          <div className="space-y-6">
            <div>
              <div className="flex justify-between items-end mb-2">
                <span className="text-xs font-bold text-fg/50">Campaigns Used Today</span>
                <span className="text-[10px] font-black text-fg/30 uppercase">
                  {tenant?.campaigns_sent_today || 0} / {PLANS[tenant?.plan_type as PlanType || 'starter'].maxCampaignsPerDay === Infinity ? '∞' : PLANS[tenant?.plan_type as PlanType || 'starter'].maxCampaignsPerDay}
                </span>
              </div>
              <div className="h-1.5 w-full bg-glass-input rounded-full overflow-hidden border border-glass-border">
                <div 
                  className="h-full bg-gradient-to-r from-blue-500 to-indigo-500 transition-all duration-1000"
                  style={{ width: `${Math.min(100, ((tenant?.campaigns_sent_today || 0) / (PLANS[tenant?.plan_type as PlanType || 'starter'].maxCampaignsPerDay || 1)) * 100)}%` }}
                />
              </div>
            </div>

            <div>
              <div className="flex justify-between items-end mb-2">
                <span className="text-xs font-bold text-fg/50">Total Managed Contacts</span>
                <span className="text-[10px] font-black text-fg/30 uppercase">
                  {stats.totalContacts || 0} / {PLANS[tenant?.plan_type as PlanType || 'starter'].maxContacts === Infinity ? '∞' : PLANS[tenant?.plan_type as PlanType || 'starter'].maxContacts}
                </span>
              </div>
              <div className="h-1.5 w-full bg-glass-input rounded-full overflow-hidden border border-glass-border">
                <div 
                  className="h-full bg-gradient-to-r from-emerald-500 to-teal-400 transition-all duration-1000"
                  style={{ width: `${Math.min(100, ((stats.totalContacts || 0) / (PLANS[tenant?.plan_type as PlanType || 'starter'].maxContacts || 1)) * 100)}%` }}
                />
              </div>
            </div>

            <div>
              <div className="flex justify-between items-end mb-2">
                <span className="text-xs font-bold text-fg/50">WABA Storage Usage</span>
                <span className="text-[10px] font-black text-fg/30 uppercase">
                  {Math.round((tenant?.storage_usage_bytes || 0) / 1024 / 1024)} MB / {PLANS[tenant?.plan_type as PlanType || 'starter'].maxStorageMb} MB
                </span>
              </div>
              <div className="h-1.5 w-full bg-glass-input rounded-full overflow-hidden border border-glass-border">
                <div 
                  className="h-full bg-gradient-to-r from-amber-500 to-orange-400 transition-all duration-1000"
                  style={{ width: `${Math.min(100, (((tenant?.storage_usage_bytes || 0) / 1024 / 1024) / (PLANS[getActivePlanType(tenant?.plan_type)].maxStorageMb || 1)) * 100)}%` }}
                />
              </div>
            </div>
          </div>

          <div className="mt-8 pt-6 border-t border-glass-border flex items-center justify-between">
            <a href="/pricing" className="text-xs font-black text-indigo-600 dark:text-indigo-400 hover:text-fg flex items-center uppercase tracking-widest transition-all">
              Upgrade subscription &rarr;
            </a>
            {tenant?.plan_type && getActivePlanType(tenant.plan_type) !== 'starter' && tenant.subscription_status === 'active' && (
              <button 
                onClick={handleCancelSubscription}
                className="text-[9px] font-black text-fg/20 hover:text-red-400 uppercase tracking-widest transition-colors cursor-pointer"
              >
                Cancel Sub
              </button>
            )}
          </div>
        </div>

        <div className="bg-glass-card border border-glass-border p-8 rounded-[2.5rem] shadow-2xl flex flex-col justify-between">
          <div>
            <h3 className="text-lg font-black text-fg mb-4 flex items-center">
              <Book className="w-5 h-5 mr-3 text-indigo-600 dark:text-indigo-400" />
              API Guidebook
            </h3>
            <p className="text-muted text-sm font-semibold leading-relaxed">
              PingStack syncs templates in background. Reference endpoints or learn variables templates layouts implementation inside our developers portal docs.
            </p>
          </div>
          <div className="mt-8 pt-6 border-t border-glass-border">
            <a href="/docs" className="inline-flex items-center px-6 py-3 bg-fg text-bg hover:opacity-90 rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-lg active:scale-95">
                Developer Manuals
            </a>
          </div>
        </div>
      </div>

      {/* Main Stats metrics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
        {[
          { label: 'Total Conversations', value: stats.conversations },
          { label: 'Meta Templates Approved', value: stats.templatesApproved },
          { label: 'Inbound Logged Messages', value: stats.inboundMessages }
        ].map((stat, i) => (
          <div key={i} className="bg-glass-card border border-glass-border p-6 rounded-[2rem] shadow-xl relative overflow-hidden">
            <h3 className="text-[9px] font-black text-fg/30 uppercase tracking-[0.2em] mb-4">{stat.label}</h3>
            <p className="text-4xl font-black text-fg tracking-tighter">{stat.value}</p>
          </div>
        ))}
      </div>

      {isConnected && stats.sent > 0 && (
        <div className="mt-12 bg-glass-card border border-glass-border p-8 rounded-[2.5rem] shadow-2xl mb-12 animate-in slide-in-from-bottom-4 duration-700">
          <h3 className="text-lg font-black text-fg mb-8 flex items-center">
            <BarChart3 className="w-5 h-5 mr-3 text-indigo-600 dark:text-indigo-400" />
            Performance Analysis
          </h3>
          
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            <div className="p-6 bg-glass-card rounded-2xl border border-glass-border text-center">
              <span className="text-[9px] font-black text-fg/30 uppercase tracking-wider block mb-2">Sent Logs</span>
              <span className="text-2xl font-black text-fg">{stats.sent}</span>
            </div>
            <div className="p-6 bg-blue-50/50 dark:bg-blue-500/5 rounded-2xl border border-blue-100 dark:border-blue-500/10 text-center">
              <span className="text-[9px] font-black text-blue-600 dark:text-blue-400 uppercase tracking-wider block mb-2">Delivered</span>
              <span className="text-2xl font-black text-blue-600 dark:text-blue-400">{stats.delivered}</span>
              <span className="text-[9px] font-bold text-fg/40 block mt-1.5">{Math.round((stats.delivered/stats.sent)*100)}% API hit</span>
            </div>
            <div className="p-6 bg-green-50/50 dark:bg-green-950/20 rounded-2xl border border-green-100 dark:border-green-900/30 text-center">
              <span className="text-[9px] font-black text-green-700 dark:text-green-400 uppercase tracking-wider block mb-2">Read Received</span>
              <span className="text-2xl font-black text-green-700 dark:text-green-400">{stats.read}</span>
              <span className="text-[9px] font-bold text-fg/40 block mt-1.5">{Math.round((stats.read/stats.delivered || 1)*100)}% Read rate</span>
            </div>
            <div className="p-6 bg-red-50/50 dark:bg-red-950/20 rounded-2xl border border-red-100 dark:border-red-900/30 text-center">
              <span className="text-[9px] font-black text-red-700 dark:text-red-400 uppercase tracking-wider block mb-2">Rejected Failures</span>
              <span className="text-2xl font-black text-red-700 dark:text-red-400">{stats.failed}</span>
            </div>
          </div>
        </div>
      )}

      {/* Action Footer banner */}
      <div className="mt-12 bg-glass-card border border-glass-border p-12 rounded-[2.5rem] shadow-2xl relative overflow-hidden group text-center">
        <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/[0.03] to-transparent pointer-events-none" />
        <div className="relative z-10 flex flex-col items-center">
          <div className="w-16 h-16 bg-fg text-bg rounded-3xl flex items-center justify-center mb-8 shadow-xl rotate-6 group-hover:rotate-0 transition-all duration-500">
            <MessageCircle className="w-8 h-8" />
          </div>
          <h3 className="text-2xl font-black text-fg tracking-tight">Direct Cloud Routing Engine</h3>
          <p className="text-muted text-sm font-semibold mt-4 max-w-xl leading-relaxed">
            By avoiding middle-ware proxies, PingStack delivers WhatsApp API requests straight to Meta and queues responses with sub-second latency.
          </p>
        </div>
      </div>
      
      {toast && (
        <Toast 
          message={toast.message} 
          type={toast.type} 
          onClose={() => setToast(null)} 
        />
      )}

      {showBillingModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="bg-bg/95 backdrop-blur-md border border-glass-border w-full max-w-md rounded-[2.5rem] p-8 shadow-2xl animate-in zoom-in-95 duration-300">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-black text-fg uppercase tracking-wider">Meta Billing Config</h3>
              <button 
                onClick={() => setShowBillingModal(false)}
                className="p-2 hover:bg-glass-input rounded-full transition-colors text-muted hover:text-fg cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveBillingConfig} className="space-y-6">
              <div>
                <label className="block text-[10px] font-black text-fg/30 uppercase tracking-widest mb-2 px-1">Last Payment Date</label>
                <input 
                  type="date"
                  value={inputLastPaid}
                  onChange={e => setInputLastPaid(e.target.value)}
                  className="block w-full bg-glass-input border border-glass-border rounded-2xl px-5 py-4 text-sm font-bold text-fg focus:border-indigo-500 focus:outline-none transition-all cursor-pointer"
                />
                <p className="text-[9px] text-fg/30 mt-2 px-1 font-semibold">We estimate Meta charges starting from this date.</p>
              </div>

              <div>
                <label className="block text-[10px] font-black text-fg/30 uppercase tracking-widest mb-2 px-1">Alert Budget Limit (INR)</label>
                <input 
                  type="number"
                  min={1}
                  value={inputBudget}
                  onChange={e => setInputBudget(Number(e.target.value) || 0)}
                  className="block w-full bg-glass-input border border-glass-border rounded-2xl px-5 py-4 text-sm font-bold text-fg focus:border-indigo-500 focus:outline-none transition-all font-mono"
                  required
                />
                <p className="text-[9px] text-fg/30 mt-2 px-1 font-semibold">Get notified on the dashboard when spending exceeds this limit.</p>
              </div>

              <div className="flex gap-4 pt-4">
                <button
                  type="button"
                  onClick={() => setShowBillingModal(false)}
                  className="flex-1 py-4 border border-glass-border hover:bg-white/5 rounded-2xl font-black text-xs uppercase tracking-widest transition-all cursor-pointer text-fg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={updatingBilling}
                  className="flex-1 py-4 bg-fg text-bg hover:opacity-90 disabled:opacity-40 rounded-2xl font-black text-xs uppercase tracking-widest transition-all cursor-pointer"
                >
                  {updatingBilling ? 'Saving...' : 'Save Settings'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
