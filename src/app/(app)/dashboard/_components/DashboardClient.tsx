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
import { useTenant } from '@/context/tenant-context';

import StatsGrid from './StatsGrid';
import MetaCostCard from './MetaCostCard';
import PlanLimitsCard from './PlanLimitsCard';
import PerformanceChart from './PerformanceChart';
import ConnectionManager from './ConnectionManager';
import BillingModal from './BillingModal';
import OnboardingChecklist from './OnboardingChecklist';

const OnboardingWizard = lazy(() => import('./OnboardingWizard'));
const DeveloperPortal = lazy(() => import('./DeveloperPortal'));

interface DashboardClientProps {
  initialTenant: any;
  initialStats: any;
}

export default function DashboardClient({ initialTenant, initialStats }: DashboardClientProps) {
  // Tenant from shared TenantContext; initialized with server-fetched value and kept in sync
  const { tenant, setTenant, refreshTenant } = useTenant();
  const [stats, setStats] = useState<any>(initialStats);

  const [activeTab, setActiveTab] = useState<'overview' | 'developer'>('overview');
  const [showBillingModal, setShowBillingModal] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [connecting, setConnecting] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
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
      const [_, statsRes] = await Promise.all([
        refreshTenant(),
        fetch('/api/stats', { headers: { 'x-tenant-id': tenant.id } })
      ]);
      if (statsRes.ok) {
        const statsData = await statsRes.json();
        setStats(statsData);
      }
    } catch (e) {
      console.error('Failed to refresh tenant and stats:', e);
    }
  }, [tenant?.id, refreshTenant]);

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

  // Stats polling with visibility guard
  useEffect(() => {
    if (!tenant?.id) return;

    fetchStats(tenant.id);

    let intervalId: NodeJS.Timeout | null = null;

    const startPolling = () => {
      if (!intervalId) {
        intervalId = setInterval(() => {
          if (document.visibilityState === 'visible') {
            fetchStats(tenant.id);
          }
        }, 30000);
      }
    };

    const stopPolling = () => {
      if (intervalId) {
        clearInterval(intervalId);
        intervalId = null;
      }
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        fetchStats(tenant.id);
        startPolling();
      } else {
        stopPolling();
      }
    };

    if (document.visibilityState === 'visible') {
      startPolling();
    }

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      stopPolling();
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
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
    setError(null);
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
        fireToast('Setup completed successfully! WhatsApp Business account linked.', 'success');
        setError(null);
        await refreshTenantAndStats();
        setTimeout(() => {
          setIsSwitching(false);
          setDiscovery(null);
          setTempToken('');
          window.location.reload();
        }, 1000);
      } else {
        setError(data.message || data.error || 'Finalization failed');
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

  // Re-fetch WABA/phone discovery using the stored token — used when user comes back after
  // getting business approval, adding a phone number, or setting up billing in Meta.
  const handleRefreshAccount = useCallback(async () => {
    if (!tenant?.id) return;
    setRefreshing(true);
    setError(null);
    try {
      const res = await fetch('/api/whatsapp/meta/discover', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-tenant-id': tenant.id },
        body: JSON.stringify({})
      });
      const data = await res.json();
      if (data.success) {
        setDiscovery(data.wabas || []);
        setTempToken(data.accessToken || '');
        setPortfolioId(data.portfolioId || '');
        if (data.wabas?.length > 0) {
          const firstWaba = data.wabas[0];
          setSelectedWaba(firstWaba.id);
          if (firstWaba.phones?.length > 0) setSelectedPhone(firstWaba.phones[0].id);
        }
        await refreshTenantAndStats();
        fireToast(
          data.wabas?.length > 0
            ? `Found ${data.wabas.length} WABA account(s) — select a phone number to update your link.`
            : 'Account refreshed. No new phone numbers found yet — check Meta for approval status.',
          data.wabas?.length > 0 ? 'success' : 'info'
        );
      } else {
        setError(data.message || 'Could not refresh account. Try again later.');
      }
    } catch (err: any) {
      setError('Refresh failed: ' + err.message);
    } finally {
      setRefreshing(false);
    }
  }, [tenant?.id, refreshTenantAndStats]);

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
  const isConnected = whatsappAccount?.status === 'ACTIVE' || whatsappAccount?.status === 'CONNECTED';

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour >= 5 && hour < 12) return 'Good morning';
    if (hour >= 12 && hour < 17) return 'Good afternoon';
    return 'Good evening';
  };

  const getFirstName = (name?: string) => {
    if (!name) return '';
    const first = name.trim().split(/\s+/)[0];
    if (!first) return '';
    return first.charAt(0).toUpperCase() + first.slice(1).toLowerCase();
  };

  const firstName = getFirstName(tenant?.user_name);
  const greeting = getGreeting();

  return (
    <div className="space-y-6 animate-in fade-in duration-200 text-left">
      {/* Refined Header Section */}
      <div 
        data-tour="tour-overview" 
        className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-zinc-200 dark:border-zinc-800/60"
      >
        <div>
          <div className="flex items-center gap-2 mb-1">
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-zinc-900 dark:text-white flex items-center gap-2">
              <span>{greeting}{firstName ? `, ${firstName}` : ''}</span>
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            </h1>
          </div>
          <p className="text-xs text-zinc-500 dark:text-zinc-400">
            {tenant?.name || 'Workspace'} &bull; {isConnected ? 'Meta Cloud API infrastructure is connected and operational.' : 'Connect your Meta Business Account to begin broadcasting.'}
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          {isConnected ? (
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-xs font-mono font-semibold text-emerald-600 dark:text-emerald-400">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
              <span>API ACTIVE</span>
            </div>
          ) : null}

          <button
            onClick={refreshTenantAndStats}
            disabled={refreshing}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-white dark:bg-zinc-900 hover:bg-zinc-50 dark:hover:bg-zinc-800 border border-zinc-200 dark:border-zinc-800 rounded-lg text-xs font-medium text-zinc-700 dark:text-zinc-300 hover:text-zinc-900 dark:hover:text-white shadow-2xs transition-colors cursor-pointer disabled:opacity-50"
          >
            <Loader2 className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin text-indigo-500' : 'text-zinc-400'}`} />
            <span>Sync</span>
          </button>
        </div>
      </div>

      {/* Onboarding Checklist */}
      <OnboardingChecklist 
        tenant={tenant}
        stats={stats}
        isConnected={isConnected}
      />

      {/* Tab selector */}
      <div className="flex border-b border-zinc-200 dark:border-zinc-800 gap-6">
        <button
          type="button"
          onClick={() => setActiveTab('overview')}
          className={`pb-3 text-xs font-semibold border-b-2 transition-colors cursor-pointer bg-transparent border-0 outline-none ${
            activeTab === 'overview' 
              ? 'border-zinc-900 dark:border-white text-zinc-900 dark:text-white' 
              : 'border-transparent text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white'
          }`}
        >
          Workspace Overview
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('developer')}
          className={`pb-3 text-xs font-semibold border-b-2 transition-colors cursor-pointer bg-transparent border-0 outline-none ${
            activeTab === 'developer' 
              ? 'border-zinc-900 dark:border-white text-zinc-900 dark:text-white' 
              : 'border-transparent text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white'
          }`}
        >
          API Keys &amp; Integrations
        </button>
      </div>

      {/* ── Overview Tab ──────────────────────────────────────────────── */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          {/* Onboarding wizard — only when not connected */}
          {!isConnected && (
            <Suspense fallback={
              <div className="flex items-center justify-center py-16 opacity-40">
                <Loader2 className="w-6 h-6 animate-spin text-zinc-500" />
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
                onRefreshAccount={handleRefreshAccount}
                onSelectWaba={handleSelectWaba}
                onSelectPhone={setSelectedPhone}
                onError={setError}
              />
            </Suspense>
          )}

          {/* Connected — management row */}
          {isConnected && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              <ConnectionManager
                tenant={tenant}
                hasSentMessages={Boolean(
                  (stats?.sent || 0) > 0 ||
                  (stats?.delivered || 0) > 0 ||
                  (stats?.read || 0) > 0 ||
                  (stats?.totalCampaigns || 0) > 0
                )}
                isSwitching={isSwitching}
                discovery={discovery}
                selectedWaba={selectedWaba}
                selectedPhone={selectedPhone}
                connecting={connecting}
                refreshing={refreshing}
                error={error}
                onSwitchAccount={handleStartSwitching}
                onCancelSwitch={() => { setIsSwitching(false); setError(null); }}
                onFinishOnboarding={handleFinishOnboarding}
                onSelectWaba={handleSelectWaba}
                onSelectPhone={setSelectedPhone}
                onResetConnection={handleResetConnection}
                onRefreshAccount={handleRefreshAccount}
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

          {/* Refined Infrastructure Banner */}
          <div className="p-6 bg-white dark:bg-zinc-900/60 border border-zinc-200 dark:border-zinc-800/80 rounded-xl shadow-2xs text-center flex flex-col items-center">
            <div className="w-10 h-10 bg-zinc-100 dark:bg-zinc-800 rounded-lg flex items-center justify-center mb-3 text-zinc-900 dark:text-white">
              <MessageCircle className="w-5 h-5 text-indigo-500" />
            </div>
            <h3 className="text-sm font-bold text-zinc-900 dark:text-white">Direct Meta Cloud API Architecture</h3>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1 max-w-lg leading-relaxed">
              PingStack connects directly to Meta&apos;s WhatsApp Cloud API infrastructure to deliver high-throughput message batches with sub-second latency and zero third-party intermediaries.
            </p>
          </div>
        </div>
      )}

      {/* ── Developer Tab ─────────────────────────────────────────────── */}
      {activeTab === 'developer' && (
        <Suspense fallback={
          <div className="flex items-center justify-center py-16 opacity-40">
            <Loader2 className="w-6 h-6 animate-spin text-zinc-500" />
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
