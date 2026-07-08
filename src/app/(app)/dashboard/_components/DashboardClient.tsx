'use client';

declare global {
  interface Window {
    FB: any;
    fbAsyncInit: any;
  }
}

import { useState, useEffect, useCallback, lazy, Suspense } from 'react';
import { CheckCircle2, Loader2, MessageCircle } from 'lucide-react';
import Toast from '@/components/Toast';

import StatsGrid from './StatsGrid';
import MetaCostCard from './MetaCostCard';
import PlanLimitsCard from './PlanLimitsCard';
import PerformanceChart from './PerformanceChart';
import ConnectionManager from './ConnectionManager';
import BillingModal from './BillingModal';

const OnboardingWizard = lazy(() => import('./OnboardingWizard'));
const DeveloperPortal = lazy(() => import('./DeveloperPortal'));

interface DashboardClientProps {
  initialTenant: any;
  initialStats: any;
}

export default function DashboardClient({ initialTenant, initialStats }: DashboardClientProps) {
  const [tenant, setTenant] = useState<any>(initialTenant);
  const [stats, setStats] = useState<any>(initialStats);

  const [activeTab, setActiveTab] = useState<'overview' | 'developer'>('overview');
  const [showBillingModal, setShowBillingModal] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [connecting, setConnecting] = useState(false);
  const [fbLoaded, setFbLoaded] = useState(false);
  const [discovery, setDiscovery] = useState<any[] | null>(null);
  const [tempToken, setTempToken] = useState('');
  const [portfolioId, setPortfolioId] = useState('');
  const [selectedWaba, setSelectedWaba] = useState('');
  const [selectedPhone, setSelectedPhone] = useState('');
  const [isSwitching, setIsSwitching] = useState(false);

  const fireToast = (message: string, type: 'success' | 'error' | 'info') =>
    setToast({ message, type });

  const fetchStats = useCallback(async (tenantId: string) => {
    try {
      const res = await fetch('/api/stats', { headers: { 'x-tenant-id': tenantId } });
      if (res.ok) setStats(await res.json());
    } catch (e) {
      console.error('Stats fetch failed:', e);
    }
  }, []);

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
        if (data.wabas?.length > 0) {
          const firstWaba = data.wabas[0];
          setSelectedWaba(firstWaba.id);
          if (firstWaba.phones?.length > 0) setSelectedPhone(firstWaba.phones[0].id);
        }
      } else {
        setError(data.message || 'Discovery failed');
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setConnecting(false);
    }
  }, [tenant?.id]);

  const refreshTenantAndStats = useCallback(async () => {
    if (!tenant?.id) return;
    try {
      const [tenantRes, statsRes] = await Promise.all([
        fetch('/api/tenant/me'),
        fetch('/api/stats', { headers: { 'x-tenant-id': tenant.id } })
      ]);
      if (tenantRes.ok) {
        const tenantData = await tenantRes.json();
        setTenant(tenantData);
      }
      if (statsRes.ok) {
        const statsData = await statsRes.json();
        setStats(statsData);
      }
    } catch (e) {
      console.error('Failed to refresh tenant and stats:', e);
    }
  }, [tenant?.id]);

  // URL param handling + FB SDK init
  useEffect(() => {
    if (tenant?.whatsapp_account?.status === 'LINKED') {
      handleDiscovery(undefined, tenant.id);
    }

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
      document.head.appendChild(script);
    } else {
      initFB();
    }
  }, []);

  // Stats polling
  useEffect(() => {
    if (tenant?.id) {
      fetchStats(tenant.id);
      const interval = setInterval(() => fetchStats(tenant.id), 30000);
      return () => clearInterval(interval);
    }
  }, [tenant?.id, fetchStats]);

  const handleEmbeddedConnect = useCallback(() => {
    if (!window.FB) {
      setToast({ message: 'Meta SDK not loaded. please refresh.', type: 'error' });
      return;
    }
    setConnecting(true);
    setError(null);
    window.FB.login((response: any) => {
      if (response.authResponse) {
        handleDiscovery(response.authResponse.code);
      } else {
        setConnecting(false);
        setError('Login cancelled or failed.');
      }
    }, {
      config_id: process.env.NEXT_PUBLIC_FB_CONFIG_ID,
      response_type: 'code',
      override_default_response_type: true
    });
  }, [handleDiscovery]);

  const handleManualConnect = async (token: string, wabaId: string, phoneId: string) => {
    setConnecting(true);
    setError(null);
    try {
      const res = await fetch('/api/whatsapp/meta/manual-connect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-tenant-id': tenant?.id },
        body: JSON.stringify({ accessToken: token, wabaId, phoneNumberId: phoneId })
      });
      const data = await res.json();
      if (res.ok) {
        await refreshTenantAndStats();
      } else {
        setError(data.error || data.message || 'Failed to connect manually.');
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setConnecting(false);
    }
  };

  const handleFinishOnboarding = async () => {
    if (!selectedWaba || !selectedPhone) return;
    setConnecting(true);
    try {
      const res = await fetch('/api/whatsapp/meta/finish', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-tenant-id': tenant?.id },
        body: JSON.stringify({
          accessToken: tempToken,
          wabaId: selectedWaba,
          phoneId: selectedPhone,
          portfolioId
        })
      });
      const data = await res.json();
      if (res.ok) {
        setToast({ message: 'Setup completed successfully!', type: 'success' });
        setIsSwitching(false);
        await refreshTenantAndStats();
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
        setIsSwitching(false);
        await refreshTenantAndStats();
        setToast({ message: 'Connection reset successfully', type: 'success' });
      }
    } catch (err: any) {
      setError('Failed to reset connection');
    } finally {
      setConnecting(false);
    }
  };

  const handleStartSwitching = async () => {
    setIsSwitching(true);
    setError(null);
    await handleDiscovery(undefined, tenant?.id);
  };

  const handleCancelSubscription = async () => {
    if (!confirm('Are you sure you want to cancel your subscription? You will still have access until the end of the current billing cycle.')) return;
    try {
      const res = await fetch('/api/billing/razorpay/cancel-subscription', { method: 'POST' });
      const data = await res.json();
      if (data.success) {
        setToast({ message: data.message, type: 'success' });
        refreshTenantAndStats();
      } else {
        setToast({ message: data.error || 'Failed to cancel subscription', type: 'error' });
      }
    } catch (e) {
      setToast({ message: 'Cancellation failed', type: 'error' });
    }
  };

  const handleSelectWaba = (wabaId: string, firstPhoneId?: string) => {
    setSelectedWaba(wabaId);
    if (firstPhoneId) setSelectedPhone(firstPhoneId);
  };

  const whatsappAccount = tenant?.whatsapp_account;
  const isConnected = whatsappAccount?.status === 'ACTIVE';

  return (
    <div className="animate-in fade-in duration-700 max-w-6xl mx-auto p-4 sm:p-6 text-left">
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

      {/* Tab selector */}
      <div className="flex border-b border-glass-border mb-8">
        <button
          type="button"
          onClick={() => setActiveTab('overview')}
          className={`pb-4 px-4 text-xs font-black uppercase tracking-widest border-b-2 transition-all cursor-pointer bg-transparent border-0 outline-none ${
            activeTab === 'overview' ? 'border-fg text-fg' : 'border-transparent text-muted hover:text-fg'
          }`}
        >
          Workspace Overview
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('developer')}
          className={`pb-4 px-4 text-xs font-black uppercase tracking-widest border-b-2 transition-all cursor-pointer bg-transparent border-0 outline-none ${
            activeTab === 'developer' ? 'border-fg text-fg' : 'border-transparent text-muted hover:text-fg'
          }`}
        >
          API Keys &amp; Integrations
        </button>
      </div>

      {/* ── Overview Tab ──────────────────────────────────────────────── */}
      {activeTab === 'overview' && (
        <>
          {/* Onboarding wizard — only when not connected */}
          {!isConnected && (
            <Suspense fallback={
              <div className="flex items-center justify-center py-24 opacity-40">
                <Loader2 className="w-6 h-6 animate-spin text-fg" />
              </div>
            }>
              <OnboardingWizard
                tenant={tenant}
                connecting={connecting}
                error={error}
                fbLoaded={fbLoaded}
                discovery={discovery}
                tempToken={tempToken}
                portfolioId={portfolioId}
                selectedWaba={selectedWaba}
                selectedPhone={selectedPhone}
                whatsappAccount={whatsappAccount}
                onEmbeddedConnect={handleEmbeddedConnect}
                onManualConnect={handleManualConnect}
                onFinishOnboarding={handleFinishOnboarding}
                onResetConnection={handleResetConnection}
                onSelectWaba={handleSelectWaba}
                onSelectPhone={setSelectedPhone}
                onError={setError}
              />
            </Suspense>
          )}

          {/* Connected — management row */}
          {isConnected && (
            <div className="mb-12 grid grid-cols-1 lg:grid-cols-3 gap-8 animate-in slide-in-from-top-4 duration-700">
              <ConnectionManager
                tenant={tenant}
                isSwitching={isSwitching}
                discovery={discovery}
                selectedWaba={selectedWaba}
                selectedPhone={selectedPhone}
                connecting={connecting}
                error={error}
                onSwitchAccount={handleStartSwitching}
                onCancelSwitch={() => { setIsSwitching(false); setError(null); }}
                onFinishOnboarding={handleFinishOnboarding}
                onSelectWaba={handleSelectWaba}
                onSelectPhone={setSelectedPhone}
                onResetConnection={handleResetConnection}
              />
              <MetaCostCard
                stats={stats}
                onConfigureClick={() => setShowBillingModal(true)}
              />
            </div>
          )}

          {/* Plan limits + API guidebook */}
          <PlanLimitsCard
            tenant={tenant}
            stats={stats}
            onCancelSubscription={handleCancelSubscription}
          />

          {/* Stat cards */}
          <StatsGrid stats={stats} />

          {/* Performance breakdown — only when there's data */}
          {isConnected && stats.sent > 0 && (
            <PerformanceChart stats={stats} />
          )}

          {/* Footer banner */}
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
        </>
      )}

      {/* ── Developer Tab ─────────────────────────────────────────────── */}
      {activeTab === 'developer' && (
        <Suspense fallback={
          <div className="flex items-center justify-center py-24 opacity-40">
            <Loader2 className="w-6 h-6 animate-spin text-fg" />
          </div>
        }>
          <DeveloperPortal
            tenant={tenant}
            isConnected={isConnected}
            onToast={fireToast}
            onTabSwitch={setActiveTab}
          />
        </Suspense>
      )}

      {/* ── Modals ────────────────────────────────────────────────────── */}
      {showBillingModal && (
        <BillingModal
          tenant={tenant}
          stats={stats}
          onClose={() => setShowBillingModal(false)}
          onSaved={async () => {
            setToast({ message: 'Meta billing configurations updated successfully!', type: 'success' });
            await refreshTenantAndStats();
          }}
        />
      )}

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
