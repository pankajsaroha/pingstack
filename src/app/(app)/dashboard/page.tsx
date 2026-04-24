'use client';

import { useState, useEffect, useCallback } from 'react';
import { MessageCircle, CheckCircle2, AlertCircle, Copy, CheckSquare, Loader2, Settings, Zap, Rocket, BarChart3, Users, Book, Facebook, ArrowRight, ShieldCheck } from 'lucide-react';
import { db } from '@/lib/db';
import { PLANS, PlanType } from '@/lib/plans';
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
    totalContacts: 0
  });
  const [totalContacts, setTotalContacts] = useState(0);
  const [connecting, setConnecting] = useState(false);
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
    fetchStats();

    // Check for checkout success
    const params = new URLSearchParams(window.location.search);
    
    // Check for Meta onboarding results
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

    // Load Meta SDK for discovery
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
      script.onload = () => {
        // SDK will call fbAsyncInit automatically once loaded
      };
      document.head.appendChild(script);
    } else {
      initFB();
    }
  }, []);

  const fetchStats = async () => {
    try {
      const res = await fetch('/api/stats', {
        headers: { 'x-tenant-id': tenant?.id }
      });
      if (res.ok) {
        const data = await res.json();
        setStats(data);
      }
    } catch (e) {
      console.error('Stats fetch failed:', e);
    }
  };

  const fetchTenant = async () => {
    try {
      const res = await fetch('/api/tenant/me');
      if (res.ok) {
        const data = await res.json();
        setTenant(data);
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
        
        // Step 1 COMPLETE: Account Linked
        // Now call discovery API to show the "Form"
        fetch('/api/whatsapp/meta/discover', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ code })
        })
        .then(res => res.json())
        .then(data => {
          if (data.success) {
            setDiscovery(data.wabas);
            setTempToken(data.accessToken);
            setOnboardingStep(2); // Go to Selection Form
            
            // Auto-select first options if available
            if (data.wabas.length > 0) {
              const firstWaba = data.wabas[0];
              setSelectedWaba(firstWaba.id);
              if (firstWaba.phones.length > 0) {
                setSelectedPhone(firstWaba.phones[0].id);
              }
            }
          } else {
            setError(data.message || 'Discovery failed');
          }
        })
        .catch(err => setError(err.message))
        .finally(() => setConnecting(false));
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
          phoneId: selectedPhone
        })
      });

      const data = await res.json();
      if (res.ok) {
        setToast({ message: 'Setup completed successfully!', type: 'success' });
        setOnboardingStep(1);
        fetchTenant();
      } else {
        setError(data.message || 'Finalization failed');
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setConnecting(false);
    }
  };

  if (loading) {
    return <div className="animate-pulse p-8 text-gray-500">Initializing dashboard...</div>;
  }

  const whatsappAccount = tenant?.whatsapp_account;
  const isConnected = whatsappAccount?.status === 'ACTIVE';

  return (
    <div className="animate-in fade-in duration-700 max-w-6xl mx-auto p-4 sm:p-8">
      <div className="mb-10 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black tracking-tight text-gray-900 sm:text-4xl">WhatsApp Integration</h1>
          <p className="text-gray-500 mt-2 text-lg">
            {isConnected ? 'Your Meta Cloud API connection is active.' : 'Connect your business to WhatsApp using Meta Cloud API.'}
          </p>
        </div>
        {isConnected && (
          <div className="flex items-center self-start px-5 py-2.5 bg-green-50 text-green-700 rounded-2xl text-sm font-bold border border-green-100 shadow-sm transition-all hover:bg-green-100/50">
            <CheckCircle2 className="w-5 h-5 mr-2" />
            Active Connection
          </div>
        )}
      </div>

      {!isConnected && (
        <div className="mb-12">
          {/* Flow Selector */}
          <div className="flex justify-center mb-10">
            <div className="inline-flex p-1.5 bg-gray-100 rounded-2xl shadow-inner">
              <button 
                onClick={() => setUseManual(false)}
                className={`px-8 py-2.5 rounded-xl text-sm font-black transition-all ${!useManual ? 'bg-white text-blue-600 shadow-md' : 'text-gray-500 hover:text-gray-900'}`}
              >
                Embedded Signup
              </button>
              <button 
                onClick={() => setUseManual(true)}
                className={`px-8 py-2.5 rounded-xl text-sm font-black transition-all ${useManual ? 'bg-white text-blue-600 shadow-md' : 'text-gray-500 hover:text-gray-900'}`}
              >
                Manual Setup
              </button>
            </div>
          </div>
          {!useManual ? (
            /* Premium Embedded Flow Wizard */
            <div className="max-w-5xl mx-auto bg-white/80 backdrop-blur-xl rounded-[3.5rem] border border-white shadow-[0_32px_64px_-16px_rgba(0,0,0,0.1)] overflow-hidden animate-in zoom-in-95 duration-700 relative">
              
              {/* Glowing Progress Bar */}
              <div className="absolute top-0 left-0 w-full h-1.5 bg-gray-100/50 flex">
                <div 
                  className="h-full bg-gradient-to-r from-blue-600 via-indigo-500 to-blue-400 transition-all duration-1000 ease-out shadow-[0_0_10px_rgba(37,99,235,0.5)]"
                  style={{ width: onboardingStep === 1 ? '33.33%' : onboardingStep === 2 ? '66.66%' : '100%' }}
                ></div>
              </div>

              <div className="flex flex-col min-h-[500px]">
                {/* Top Row: Intro & Interaction Block */}
                <div className="grid grid-cols-1 lg:grid-cols-12 flex-grow border-b border-gray-50/50">
                  {/* Left: Theory & Branding */}
                  <div className="lg:col-span-7 p-16 bg-gray-50/30">
                    <div className="w-14 h-14 bg-blue-600 text-white rounded-2xl flex items-center justify-center mb-8 shadow-xl shadow-blue-600/10">
                      <Facebook className="w-7 h-7" />
                    </div>
                    
                    <div className="overflow-visible">
                      {onboardingStep === 1 ? (
                        <div className="animate-in fade-in slide-in-from-top-4 duration-500">
                          <h2 className="text-4xl font-black text-gray-900 mb-6 leading-tight tracking-tight">Link Your Meta <br />Business Account</h2>
                          <p className="text-base text-gray-500 font-medium leading-relaxed max-w-lg">
                            Connect your Meta account to instantly discover your WhatsApp Business Accounts and associated phone numbers.
                          </p>
                        </div>
                      ) : (
                        <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                          <h2 className="text-4xl font-black text-gray-900 mb-6 leading-tight tracking-tight">Select Your <br />Messaging Assets</h2>
                          <p className="text-base text-gray-500 font-medium leading-relaxed max-w-lg">
                            Choose which WABA and phone number you want to link to PingStack for enterprise-grade messaging.
                          </p>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Right: The Interactive Control */}
                  <div className="lg:col-span-5 p-12 flex flex-col items-center justify-center bg-white relative border-l border-gray-50">
                    <div className="w-full max-w-[280px]">
                      {onboardingStep === 1 ? (
                        <div className="w-full animate-in fade-in zoom-in-95 duration-700">
                          <div className="mb-10 text-center">
                            <div className="w-20 h-20 mx-auto relative flex items-center justify-center">
                              <div className={`absolute inset-0 rounded-full bg-blue-100/40 ${connecting ? 'animate-ping' : 'animate-pulse'}`}></div>
                              <div className="relative w-14 h-14 bg-white rounded-2xl shadow-lg border border-gray-50 flex items-center justify-center transition-all duration-500">
                                 <Facebook className={`w-7 h-7 text-blue-600 ${connecting ? 'animate-spin-slow' : ''}`} />
                              </div>
                            </div>
                            <p className="mt-6 text-[9px] font-black text-gray-400 uppercase tracking-[0.2em] opacity-60">Ready for connection</p>
                          </div>

                          <button 
                            onClick={handleEmbeddedConnect}
                            disabled={connecting || !fbLoaded}
                            className="w-full bg-gray-900 hover:bg-black disabled:bg-gray-100 disabled:text-gray-400 text-white h-14 rounded-2xl font-black text-sm shadow-xl shadow-gray-900/10 transition-all active:scale-[0.98] flex items-center justify-center group"
                          >
                            {!fbLoaded ? (
                               <span className="flex items-center"><Loader2 className="w-4 h-4 mr-2 animate-spin opacity-50" /> Booting...</span>
                            ) : connecting ? (
                              <span className="flex items-center">Awaiting Auth...</span>
                            ) : (
                              <span className="flex items-center">Continue to Meta <ArrowRight className="w-4 h-4 ml-2 transition-transform group-hover:translate-x-1" /></span>
                            )}
                          </button>
                        </div>
                      ) : (
                        <div className="w-full space-y-8 animate-in fade-in slide-in-from-right-10 duration-700">
                          <div className="text-left space-y-6">
                            <div className="space-y-3">
                              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Business Account</label>
                              <select 
                                value={selectedWaba}
                                onChange={(e) => {
                                  setSelectedWaba(e.target.value);
                                  const waba = discovery.find((w: any) => w.id === e.target.value);
                                  if (waba?.phones?.length > 0) setSelectedPhone(waba.phones[0].id);
                                }}
                                className="w-full bg-gray-50 border border-gray-100 rounded-2xl px-5 py-3.5 text-xs font-bold focus:ring-2 focus:ring-blue-500 outline-none transition-all cursor-pointer"
                              >
                                {discovery?.map((waba: any) => (
                                  <option key={waba.id} value={waba.id}>{waba.name}</option>
                                ))}
                              </select>
                            </div>

                            <div className="space-y-3">
                              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Phone Number</label>
                              <select 
                                value={selectedPhone}
                                onChange={(e) => setSelectedPhone(e.target.value)}
                                className="w-full bg-gray-50 border border-gray-100 rounded-2xl px-5 py-3.5 text-xs font-bold focus:ring-2 focus:ring-blue-500 outline-none transition-all cursor-pointer font-mono"
                              >
                                {discovery?.find((w: any) => w.id === selectedWaba)?.phones?.map((phone: any) => (
                                  <option key={phone.id} value={phone.id}>{phone.display_phone_number}</option>
                                ))}
                              </select>
                            </div>
                          </div>

                          <div className="pt-4 flex gap-3">
                            <button 
                              onClick={() => setOnboardingStep(1)}
                              className="px-5 h-12 rounded-xl text-[10px] font-black text-gray-400 hover:text-gray-900 transition-all active:scale-95 border border-gray-100"
                            >
                              Back
                            </button>
                            <button 
                              onClick={handleFinishOnboarding}
                              disabled={connecting || !selectedPhone}
                              className="flex-grow bg-blue-600 hover:bg-blue-700 text-white h-12 rounded-xl text-[10px] font-black transition-all shadow-xl shadow-blue-600/10 active:scale-95 disabled:opacity-50 flex items-center justify-center"
                            >
                              {connecting ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Complete Setup'}
                            </button>
                          </div>
                        </div>
                      )}
                      
                      {error && (
                        <div className="mt-8 p-4 bg-red-50 text-red-600 rounded-2xl text-[9px] font-black border border-red-100 flex items-center animate-in slide-in-from-bottom-2 duration-700">
                          <AlertCircle className="w-3 h-3 mr-3 shrink-0" />
                          <span className="uppercase tracking-tight leading-tight">{error}</span>
                        </div>
                      )}

                      <div className="mt-12 flex items-center justify-center space-x-6 opacity-30 grayscale saturate-0">
                        <span className="text-[8px] font-black text-gray-400 uppercase tracking-widest flex items-center shrink-0">
                            <ShieldCheck className="w-3 h-3 mr-1.5" /> AES-256
                        </span>
                        <span className="text-[8px] font-black text-gray-400 uppercase tracking-widest flex items-center shrink-0">
                            <Facebook className="w-3 h-3 mr-1.5" /> Meta API
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Bottom Row: Full-Width Horizontal Steps (Steps Only) */}
                <div className="px-12 py-10 bg-white border-t border-gray-50">
                  <div className="flex flex-col sm:flex-row items-center justify-between gap-8 max-w-4xl mx-auto">
                    {[ 
                      { step: 1, label: 'Link Meta Account', Icon: ShieldCheck },
                      { step: 2, label: 'Configure Business Assets', Icon: Settings },
                      { step: 3, label: 'Finish Setup', Icon: Rocket }
                    ].map((item, idx) => (
                      <div key={item.step} className="flex items-center flex-grow last:flex-none group">
                        <div className="flex items-center">
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center mr-3 transition-all duration-500 ${onboardingStep === item.step ? 'bg-blue-600 text-white shadow-lg shadow-blue-200' : onboardingStep > item.step ? 'bg-green-500 text-white' : 'bg-gray-100 text-gray-400'}`}>
                            {onboardingStep > item.step ? <CheckCircle2 className="w-4 h-4" /> : <item.Icon className="w-4 h-4" />}
                          </div>
                          <span className={`text-[11px] font-black uppercase tracking-widest transition-all duration-500 shrink-0 ${onboardingStep === item.step ? 'text-gray-900' : 'text-gray-400'}`}>
                            {item.label}
                          </span>
                        </div>
                        {idx < 2 && (
                          <div className="hidden sm:block h-[2px] flex-grow mx-8 bg-gray-100 relative overflow-hidden">
                            <div 
                              className={`absolute inset-0 bg-blue-500 transition-all duration-1000 ${onboardingStep > item.step ? 'translate-x-0' : '-translate-x-full'}`}
                            ></div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
        ) : (
            /* Existing Manual Flow - Optimized Layout */
            <div className="space-y-10 animate-in slide-in-from-right-4 duration-500">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
                {/* Step 1: The Guide */}
                <div className="bg-white p-8 rounded-3xl border border-gray-100 shadow-xl shadow-gray-100/10">
                  <h3 className="text-xl font-bold text-gray-900 mb-8 flex items-center">
                    <Settings className="w-6 h-6 mr-3 text-blue-600" />
                    1. Setup on Meta Developers
                  </h3>
                  
                  <div className="space-y-8">
                    <div className="flex items-start group">
                      <div className="w-8 h-8 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center font-bold text-sm mr-4 mt-0.5 group-hover:bg-blue-600 group-hover:text-white transition-all transform group-hover:scale-110">1</div>
                      <div>
                        <p className="font-bold text-gray-900">Create a Meta App</p>
                        <p className="text-sm text-gray-500 mt-1 leading-relaxed">
                          Go to <a href="https://developers.facebook.com/apps" target="_blank" className="text-blue-600 underline font-medium decoration-blue-200 underline-offset-4 hover:decoration-blue-600 transition-all">developers.facebook.com/apps</a> and create a <strong>Business</strong> type app.
                        </p>
                      </div>
                    </div>

                    <div className="flex items-start group">
                      <div className="w-8 h-8 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center font-bold text-sm mr-4 mt-0.5 group-hover:bg-blue-600 group-hover:text-white transition-all transform group-hover:scale-110">2</div>
                      <div>
                        <p className="font-bold text-gray-900">Add WhatsApp Product</p>
                        <p className="text-sm text-gray-500 mt-1 leading-relaxed">
                          Inside your app dashboard, scroll down and find the <strong>WhatsApp</strong> product. Click &quot;Set Up&quot; to add it to your app.
                        </p>
                      </div>
                    </div>

                    <div className="flex items-start group">
                      <div className="w-8 h-8 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center font-bold text-sm mr-4 mt-0.5 group-hover:bg-blue-600 group-hover:text-white transition-all transform group-hover:scale-110">3</div>
                      <div>
                        <p className="font-bold text-gray-900">Get Credentials</p>
                        <p className="text-sm text-gray-500 mt-1 leading-relaxed">
                          Navigate to <strong>WhatsApp &gt; API Setup</strong>. Copy your <strong>Permanent Access Token</strong>, <strong>Phone Number ID</strong>, and <strong>WABA ID</strong>.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Step 2: The Form */}
                <div className="bg-gray-900 p-8 rounded-3xl shadow-2xl shadow-blue-900/20 text-white relative overflow-hidden group flex flex-col">
                  <div className="absolute top-0 right-0 w-64 h-64 bg-blue-600/10 rounded-full blur-3xl -mr-32 -mt-32 transition-all group-hover:bg-blue-600/20"></div>
                  
                  <h3 className="text-xl font-bold mb-8 flex items-center text-blue-400 relative z-10">
                    <CheckSquare className="w-6 h-6 mr-3" />
                    2. Enter Credentials
                  </h3>

                  <form onSubmit={handleManualConnect} className="space-y-6 relative z-10 flex-grow flex flex-col justify-center">
                    <div>
                      <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-3">Permanent Access Token</label>
                      <input 
                        type="password"
                        value={manualToken}
                        onChange={(e) => setManualToken(e.target.value)}
                        placeholder="EAAB..."
                        className="w-full bg-gray-800/80 border border-gray-700/50 rounded-2xl px-5 py-4 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all placeholder:text-gray-600 outline-none hover:bg-gray-800"
                        required
                      />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                      <div>
                        <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-3">Phone Number ID</label>
                        <input 
                          type="text"
                          value={manualPhoneId}
                          onChange={(e) => setManualPhoneId(e.target.value)}
                          placeholder="1098..."
                          className="w-full bg-gray-800/80 border border-gray-700/50 rounded-2xl px-5 py-4 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all placeholder:text-gray-600 outline-none hover:bg-gray-800"
                          required
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-3">WABA ID</label>
                        <input 
                          type="text"
                          value={manualWabaId}
                          onChange={(e) => setManualWabaId(e.target.value)}
                          placeholder="2384..."
                          className="w-full bg-gray-800/80 border border-gray-700/50 rounded-2xl px-5 py-4 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all placeholder:text-gray-600 outline-none hover:bg-gray-800"
                          required
                        />
                      </div>
                    </div>

                    {error && (
                      <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-2xl flex items-start text-red-400 animate-in fade-in slide-in-from-top-2">
                        <AlertCircle className="w-4 h-4 mr-3 mt-1 flex-shrink-0" />
                        <p className="text-sm font-medium">{error}</p>
                      </div>
                    )}

                    <button 
                      type="submit"
                      disabled={connecting}
                      className="w-full mt-4 bg-blue-600 hover:bg-blue-500 disabled:bg-gray-800 disabled:text-gray-600 py-5 rounded-2xl font-black text-lg shadow-xl shadow-blue-600/20 transition-all active:scale-[0.98] flex items-center justify-center transform hover:-translate-y-1"
                    >
                      {connecting ? (
                        <>
                          <Loader2 className="w-6 h-6 mr-3 animate-spin" />
                          Connecting...
                        </>
                      ) : (
                        <>
                          Save Connection
                        </>
                      )}
                    </button>
                  </form>
                </div>
              </div>

              {/* Parallel Warning and Note */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <div className="p-6 bg-amber-50 rounded-3xl border border-dashed border-amber-200 animate-in fade-in slide-in-from-bottom-2 duration-700 scale-95 hover:scale-100 transition-transform">
                  <p className="text-sm text-amber-800 leading-relaxed font-semibold">
                    <span className="inline-block px-2 py-0.5 bg-amber-600 text-white rounded text-[10px] font-black uppercase mr-2 tracking-wider">Warning</span>
                    Manual setup is for advanced users who already have a verified business and pre-configured assets.
                  </p>
                </div>
                <div className="p-6 bg-blue-50 rounded-3xl border border-dashed border-blue-200 animate-in fade-in slide-in-from-bottom-2 duration-700 scale-95 hover:scale-100 transition-transform">
                  <p className="text-sm text-blue-800 leading-relaxed font-semibold">
                    <span className="inline-block px-2 py-0.5 bg-blue-600 text-white rounded text-[10px] font-black uppercase mr-2 tracking-wider">Note</span>
                    Ensure you use a <strong>System User</strong> token for permanent access, otherwise the connection will expire in 24 hours.
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Cards - Always Visible */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-8 mb-12">
        {/* Plan & Usage Card */}
            <div className="bg-white p-8 rounded-[2.5rem] border border-gray-100 shadow-xl relative overflow-hidden group">
              <div className="absolute top-0 right-0 p-6">
                <span className="px-4 py-1.5 bg-blue-50 text-blue-600 rounded-full text-[10px] font-black uppercase tracking-widest border border-blue-100">
                  {tenant?.plan_type || 'Starter'} Plan
                </span>
              </div>
              
              <h3 className="text-xl font-black text-gray-900 mb-8 flex items-center">
                <Zap className="w-5 h-5 mr-3 text-blue-600" />
                Plan & Usage
              </h3>

              <div className="space-y-8">
                <div>
                  <div className="flex justify-between items-end mb-3">
                    <div className="flex items-center text-sm font-bold text-gray-700">
                      <BarChart3 className="w-4 h-4 mr-2 text-gray-400" />
                      Campaigns Used Today
                    </div>
                    <span className="text-xs font-black text-gray-400">
                      {tenant?.campaigns_sent_today || 0} / {PLANS[tenant?.plan_type as PlanType || 'starter'].maxCampaignsPerDay === Infinity ? '∞' : PLANS[tenant?.plan_type as PlanType || 'starter'].maxCampaignsPerDay}
                    </span>
                  </div>
                  <div className="h-2 w-full bg-gray-50 rounded-full overflow-hidden border border-gray-100">
                    <div 
                      className="h-full bg-gradient-to-r from-blue-600 to-indigo-600 transition-all duration-1000"
                      style={{ width: `${Math.min(100, ((tenant?.campaigns_sent_today || 0) / (PLANS[tenant?.plan_type as PlanType || 'starter'].maxCampaignsPerDay || 1)) * 100)}%` }}
                    />
                  </div>
                </div>

                <div>
                  <div className="flex justify-between items-end mb-3">
                    <div className="flex items-center text-sm font-bold text-gray-700">
                      <Users className="w-4 h-4 mr-2 text-gray-400" />
                      Total Contacts
                    </div>
                    <span className="text-xs font-black text-gray-400">
                      {stats.totalContacts || 0} / {PLANS[tenant?.plan_type as PlanType || 'starter'].maxContacts === Infinity ? '∞' : PLANS[tenant?.plan_type as PlanType || 'starter'].maxContacts}
                    </span>
                  </div>
                  <div className="h-2 w-full bg-gray-50 rounded-full overflow-hidden border border-gray-100">
                    <div 
                      className="h-full bg-gradient-to-r from-green-500 to-emerald-500 transition-all duration-1000"
                      style={{ width: `${Math.min(100, ((stats.totalContacts || 0) / (PLANS[tenant?.plan_type as PlanType || 'starter'].maxContacts || 1)) * 100)}%` }}
                    />
                  </div>
                </div>
              </div>

              <div className="mt-8 pt-8 border-t border-gray-50 flex items-center justify-between">
                <a href="/pricing" className="text-sm font-black text-blue-600 hover:text-blue-700 flex items-center transition-all hover:translate-x-1">
                  Upgrade Plan <Rocket className="w-4 h-4 ml-2" />
                </a>
                {tenant?.plan_type && tenant.plan_type !== 'starter' && (
                  <button 
                    onClick={handleCancelSubscription}
                    className="text-[10px] font-black text-gray-400 hover:text-red-500 uppercase tracking-widest transition-colors"
                  >
                    Cancel Subscription
                  </button>
                )}
              </div>
            </div>

            {/* Documentation & Resources - Small Card */}
            <div className="bg-white p-8 rounded-[2.5rem] border border-gray-100 shadow-xl flex flex-col justify-between">
              <div>
                <h3 className="text-xl font-black text-gray-900 mb-4 flex items-center">
                  <Book className="w-5 h-5 mr-3 text-indigo-600" />
                  Documentation
                </h3>
                <p className="text-gray-500 text-sm font-medium leading-relaxed">
                  New here? Check our comprehensive guides to get your enterprise messaging infrastructure up and running in minutes.
                </p>
              </div>
              <div className="mt-8 pt-8 border-t border-gray-50">
                <a href="/docs" className="inline-flex items-center px-6 py-3 bg-gray-900 text-white rounded-2xl font-black text-xs hover:bg-black transition-all shadow-lg active:scale-95">
                    Visit Docs Center
                </a>
              </div>
            </div>
          </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-12">
        {[
          { label: 'Conversations', value: stats.conversations, color: 'blue' },
          { label: 'Templates Approved', value: stats.templatesApproved, color: 'green' },
          { label: 'Inbound Messages', value: stats.inboundMessages, color: 'amber' }
        ].map((stat, i) => (
          <div key={i} className="bg-white/60 backdrop-blur-xl p-8 rounded-3xl border border-gray-100 shadow-[0_4px_20px_rgba(0,0,0,0.03)] hover:shadow-[0_8px_30px_rgba(0,0,0,0.06)] transition-all cursor-default relative overflow-hidden">
            <h3 className="text-sm font-black text-gray-400 uppercase tracking-widest mb-4">{stat.label}</h3>
            <p className="text-5xl font-black text-gray-900">{stat.value}</p>
          </div>
        ))}
      </div>

      {isConnected && stats.sent > 0 && (
        <div className="mt-12 bg-white p-8 rounded-[2.5rem] border border-gray-100 shadow-xl overflow-hidden animate-in slide-in-from-bottom-4 duration-700 mb-12">
          <h3 className="text-xl font-black text-gray-900 mb-8 flex items-center">
            <BarChart3 className="w-5 h-5 mr-3 text-blue-600" />
            Delivery Performance
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div className="p-6 bg-gray-50 rounded-2xl border border-gray-100">
              <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-2">Sent</span>
              <span className="text-2xl font-black text-gray-900">{stats.sent}</span>
            </div>
            <div className="p-6 bg-blue-50/50 rounded-2xl border border-blue-100 transition-all hover:bg-blue-50">
              <span className="text-[10px] font-black text-blue-600 uppercase tracking-widest block mb-2">Delivered</span>
              <span className="text-2xl font-black text-blue-800">{stats.delivered}</span>
              <span className="text-[10px] font-bold text-blue-500 block mt-1">{Math.round((stats.delivered/stats.sent)*100)}% reach</span>
            </div>
            <div className="p-6 bg-green-50/50 rounded-2xl border border-green-100 transition-all hover:bg-green-50">
              <span className="text-[10px] font-black text-green-600 uppercase tracking-widest block mb-2">Read</span>
              <span className="text-2xl font-black text-green-800">{stats.read}</span>
              <span className="text-[10px] font-bold text-green-500 block mt-1">{Math.round((stats.read/stats.delivered || 1)*100)}% engagement</span>
            </div>
            <div className="p-6 bg-red-50/50 rounded-2xl border border-red-100">
              <span className="text-[10px] font-black text-red-600 uppercase tracking-widest block mb-2">Failed</span>
              <span className="text-2xl font-black text-red-800">{stats.failed}</span>
            </div>
          </div>
        </div>
      )}

      {/* Footer Branding - Always Visible */}
      <div className="mt-12 bg-gray-900 p-12 rounded-[3rem] border border-gray-800 shadow-2xl shadow-blue-900/10 text-center relative overflow-hidden group">
        <div className="absolute inset-0 bg-gradient-to-br from-blue-600/5 to-transparent"></div>
        <div className="relative z-10 flex flex-col items-center">
          <div className="w-20 h-20 bg-blue-600 text-white rounded-3xl flex items-center justify-center mb-8 shadow-2xl rotate-6 group-hover:rotate-0 transition-all duration-500 transform group-hover:scale-110">
            <MessageCircle className="w-10 h-10" />
          </div>
          <h3 className="text-3xl font-black text-white tracking-tight">Enterprise Infrastructure</h3>
          <p className="text-gray-400 text-lg mt-4 max-w-xl leading-relaxed">
            Direct Cloud API integration bypasses third-party middle-ware, giving you <strong>lower costs</strong> and <strong>near-instant delivery</strong>.
          </p>
          <button 
            onClick={() => window.open('https://docs.pingstack.com', '_blank')}
            className="mt-10 px-10 py-4 bg-white text-gray-900 rounded-2xl font-black text-sm hover:bg-blue-50 transition-all shadow-xl active:scale-95 transform hover:-translate-y-1"
          >
            Documentation & Support
          </button>
        </div>
      </div>
      
      {toast && (
        <Toast 
          message={toast.message} 
          type={toast.type} 
          onClose={() => setToast(null)} 
        />
      )}
    </div>
  );
}


