'use client';

import { useState, useEffect } from 'react';
import {
  CheckCircle2, AlertCircle, Loader2, Settings, Rocket,
  Facebook, ArrowRight, ShieldCheck, CheckSquare
} from 'lucide-react';

interface OnboardingWizardProps {
  tenant: any;
  connecting: boolean;
  error: string | null;
  fbLoaded: boolean;
  discovery: any[] | null;
  tempToken: string;
  portfolioId: string;
  selectedWaba: string;
  selectedPhone: string;
  whatsappAccount: any;
  onEmbeddedConnect: () => void;
  onManualConnect: (token: string, wabaId: string, phoneId: string) => Promise<void>;
  onFinishOnboarding: () => void;
  onResetConnection: () => void;
  onSelectWaba: (wabaId: string, firstPhoneId?: string) => void;
  onSelectPhone: (phoneId: string) => void;
  onError: (msg: string | null) => void;
}

export default function OnboardingWizard({
  tenant,
  connecting,
  error,
  fbLoaded,
  discovery,
  portfolioId,
  selectedWaba,
  selectedPhone,
  whatsappAccount,
  tempToken,
  onEmbeddedConnect,
  onManualConnect,
  onFinishOnboarding,
  onResetConnection,
  onSelectWaba,
  onSelectPhone,
  onError,
}: OnboardingWizardProps) {
  const [onboardingStep, setOnboardingStep] = useState(1);
  const [useManual, setUseManual] = useState(false);
  const [manualToken, setManualToken] = useState('');
  const [manualWabaId, setManualWabaId] = useState('');
  const [manualPhoneId, setManualPhoneId] = useState('');
  const [healthCheck, setHealthCheck] = useState<{ status: 'loading' | 'ok' | 'limited' | 'error'; message?: string } | null>(null);

  // Auto-advance to step 2 when discovery data arrives
  useEffect(() => {
    if (discovery && discovery.length >= 0) {
      setOnboardingStep(2);
    }
  }, [discovery]);

  // Reset step when connection is reset (discovery becomes null)
  useEffect(() => {
    if (!discovery) {
      setOnboardingStep(1);
    }
  }, [discovery]);

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

  const handleManualSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await onManualConnect(manualToken, manualWabaId, manualPhoneId);
    setManualToken('');
    setManualWabaId('');
    setManualPhoneId('');
  };

  return (
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
                        onClick={onEmbeddedConnect}
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
                          onClick={onResetConnection}
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
                                const waba = discovery.find((w: any) => w.id === e.target.value);
                                onSelectWaba(e.target.value, waba?.phones?.[0]?.id);
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
                              onChange={(e) => onSelectPhone(e.target.value)}
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
                          onClick={onFinishOnboarding}
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
                              onClick={onResetConnection}
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
                        onClick={onEmbeddedConnect}
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

                <form onSubmit={handleManualSubmit} className="space-y-5">
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
  );
}
