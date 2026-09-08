'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { 
  Smartphone, 
  Download, 
  Share, 
  PlusSquare, 
  CheckCircle2, 
  AlertCircle, 
  Bell, 
  BellRing, 
  BellOff, 
  Sparkles, 
  ExternalLink, 
  RefreshCw, 
  Loader2, 
  Laptop, 
  Info,
  ShieldCheck,
  Check
} from 'lucide-react';
import { 
  getPlatformInfo, 
  subscribeToWebPush, 
  PlatformInfo 
} from '@/lib/push-client';

export default function InstallPage() {
  const [platform, setPlatform] = useState<PlatformInfo | null>(null);
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [installState, setInstallState] = useState<'idle' | 'installing' | 'installed'>('idle');
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isSubscribing, setIsSubscribing] = useState(false);
  const [testPushLoading, setTestPushLoading] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{ text: string; type: 'success' | 'error' | 'info' } | null>(null);
  const [activeTab, setActiveTab] = useState<'android' | 'ios' | 'desktop'>('android');

  const refreshPlatform = async (showFeedback = false) => {
    if (isRefreshing) return;
    setIsRefreshing(true);
    try {
      // 1. Re-query live platform info from browser
      const info = getPlatformInfo();
      setPlatform(info);

      if (info.isStandalone) {
        setInstallState('installed');
      }

      // 2. Check service worker registration & push manager status if supported
      if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
        const reg = await navigator.serviceWorker.getRegistration();
        if (reg) {
          const sub = await reg.pushManager.getSubscription();
          if (sub && info.permission === 'granted') {
            setPlatform((prev) => prev ? { ...prev, permission: 'granted' } : info);
          }
        }
      }

      if (showFeedback) {
        setStatusMessage({ 
          text: 'Device capability and notification status successfully updated.', 
          type: 'success' 
        });
        setTimeout(() => setStatusMessage(null), 4000);
      }
    } catch (err: any) {
      if (showFeedback) {
        setStatusMessage({
          text: 'Unable to query device status: ' + (err?.message || 'Check browser permissions'),
          type: 'error'
        });
      }
    } finally {
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    refreshPlatform(false);

    // Capture beforeinstallprompt on Android/Chromium
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };

    const handleAppInstalled = () => {
      setDeferredPrompt(null);
      setInstallState('installed');
      setStatusMessage({ text: 'PingStack installed successfully!', type: 'success' });
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    // Auto-detect tab based on user agent
    const ua = navigator.userAgent || '';
    if (/iPad|iPhone|iPod/.test(ua)) {
      setActiveTab('ios');
    } else if (/Android/i.test(ua)) {
      setActiveTab('android');
    } else {
      setActiveTab('desktop');
    }

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) {
      setStatusMessage({ 
        text: 'Native install prompt not available. Please follow manual menu steps below.', 
        type: 'info' 
      });
      return;
    }

    setInstallState('installing');
    try {
      await deferredPrompt.prompt();
      const choice = await deferredPrompt.userChoice;
      if (choice.outcome === 'accepted') {
        setInstallState('installed');
        setStatusMessage({ text: 'PingStack installed successfully!', type: 'success' });
      } else {
        setInstallState('idle');
      }
    } catch (e: any) {
      setInstallState('idle');
      setStatusMessage({ text: e?.message || 'Install prompt was dismissed.', type: 'error' });
    } finally {
      setDeferredPrompt(null);
    }
  };

  const handleEnablePush = async () => {
    setIsSubscribing(true);
    setStatusMessage(null);

    const result = await subscribeToWebPush();
    setIsSubscribing(false);
    refreshPlatform(false);

    if (result.success) {
      setStatusMessage({ 
        text: 'Notifications enabled successfully! You will receive background message alerts.', 
        type: 'success' 
      });
    } else {
      setStatusMessage({ 
        text: result.error || 'Failed to enable notifications.', 
        type: 'error' 
      });
    }
  };

  const handleTestPush = async () => {
    setTestPushLoading(true);
    setStatusMessage(null);

    try {
      const res = await fetch('/api/notifications/test-push', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: 'PingStack Test Alert',
          body: 'Your Web Push notification pipeline is active and working properly!',
          url: '/inbox'
        })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setStatusMessage({ 
          text: 'Test notification dispatched! Check your device lock-screen / notification centre.', 
          type: 'success' 
        });
      } else {
        setStatusMessage({ 
          text: data.error || 'Test notification delivery failed. Check your browser permissions.', 
          type: 'error' 
        });
      }
    } catch (err: any) {
      setStatusMessage({ text: err.message || 'Error triggering test notification.', type: 'error' });
    } finally {
      setTestPushLoading(false);
    }
  };

  const isStandalone = platform?.isStandalone || installState === 'installed';
  const permission = platform?.permission || 'default';

  return (
    <div className="space-y-6 max-w-4xl mx-auto pb-16">
      {/* Header Bar */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl sm:text-2xl font-black tracking-tight text-zinc-900 dark:text-white">
            Install PingStack &amp; Notifications
          </h1>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
            Use PingStack like a native app on your phone and stay connected to customer messages.
          </p>
        </div>

        <button
          onClick={() => refreshPlatform(true)}
          disabled={isRefreshing}
          title="Refresh device capability status"
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-zinc-200 dark:border-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-xs font-medium text-zinc-600 dark:text-zinc-400 cursor-pointer transition-colors disabled:opacity-50 shrink-0"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin text-indigo-500' : ''}`} />
          <span className="hidden sm:inline">{isRefreshing ? 'Checking...' : 'Refresh Status'}</span>
        </button>
      </div>

      {/* Status Message Feedback */}
      {statusMessage && (
        <div className={`p-4 rounded-2xl border flex items-start gap-3 animate-in fade-in slide-in-from-top-2 duration-200 ${
          statusMessage.type === 'success' 
            ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-700 dark:text-emerald-300'
            : statusMessage.type === 'error'
            ? 'bg-rose-500/10 border-rose-500/30 text-rose-700 dark:text-rose-300'
            : 'bg-indigo-500/10 border-indigo-500/30 text-indigo-700 dark:text-indigo-300'
        }`}>
          {statusMessage.type === 'success' ? (
            <CheckCircle2 className="w-5 h-5 shrink-0 mt-0.5" />
          ) : statusMessage.type === 'error' ? (
            <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
          ) : (
            <Info className="w-5 h-5 shrink-0 mt-0.5" />
          )}
          <div className="flex-1 text-xs font-medium leading-relaxed">
            {statusMessage.text}
          </div>
        </div>
      )}

      {/* System Status Summary Card */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* App Status Card */}
        <div className="p-5 rounded-2xl border border-zinc-200 dark:border-zinc-800/80 bg-white dark:bg-zinc-900/60 shadow-xs flex items-center justify-between">
          <div className="flex items-center gap-3.5">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 border ${
              isStandalone 
                ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-600 dark:text-emerald-400' 
                : 'bg-indigo-500/10 border-indigo-500/20 text-indigo-600 dark:text-indigo-400'
            }`}>
              <Smartphone className="w-5 h-5" />
            </div>
            <div>
              <div className="text-[10px] font-mono uppercase tracking-wider text-zinc-400">App Mode</div>
              <div className="text-sm font-bold text-zinc-900 dark:text-white">
                {isStandalone ? 'Installed as App' : 'Browser Mode'}
              </div>
            </div>
          </div>

          <span className={`px-2.5 py-1 rounded-full text-[10px] font-semibold tracking-wide uppercase ${
            isStandalone 
              ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20' 
              : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 border border-zinc-200 dark:border-zinc-700'
          }`}>
            {isStandalone ? 'Standalone' : 'Web Tab'}
          </span>
        </div>

        {/* Notification Status Card */}
        <div className="p-5 rounded-2xl border border-zinc-200 dark:border-zinc-800/80 bg-white dark:bg-zinc-900/60 shadow-xs flex items-center justify-between">
          <div className="flex items-center gap-3.5">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 border ${
              permission === 'granted'
                ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-600 dark:text-emerald-400'
                : permission === 'denied'
                ? 'bg-rose-500/10 border-rose-500/20 text-rose-600 dark:text-rose-400'
                : 'bg-amber-500/10 border-amber-500/20 text-amber-600 dark:text-amber-400'
            }`}>
              {permission === 'granted' ? (
                <BellRing className="w-5 h-5" />
              ) : permission === 'denied' ? (
                <BellOff className="w-5 h-5" />
              ) : (
                <Bell className="w-5 h-5" />
              )}
            </div>
            <div>
              <div className="text-[10px] font-mono uppercase tracking-wider text-zinc-400">Notifications</div>
              <div className="text-sm font-bold text-zinc-900 dark:text-white">
                {permission === 'granted'
                  ? 'Enabled & Active'
                  : permission === 'denied'
                  ? 'Blocked in Browser'
                  : 'Action Required'}
              </div>
            </div>
          </div>

          <span className={`px-2.5 py-1 rounded-full text-[10px] font-semibold tracking-wide uppercase ${
            permission === 'granted'
              ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20'
              : permission === 'denied'
              ? 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20'
              : 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20'
          }`}>
            {permission}
          </span>
        </div>
      </div>

      {/* Section 1: Platform-Specific Installation Guide */}
      <div className="p-6 sm:p-8 rounded-3xl border border-zinc-200 dark:border-zinc-800/80 bg-white dark:bg-zinc-900/60 shadow-sm space-y-6">
        <div>
          <h2 className="text-base sm:text-lg font-bold text-zinc-900 dark:text-white">
            1. Install PingStack App
          </h2>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
            Install PingStack for an instant full-screen experience without browser toolbars.
          </p>
        </div>

        {/* Platform Tabs */}
        <div className="flex items-center gap-2 p-1 bg-zinc-100 dark:bg-zinc-800/80 rounded-xl max-w-sm">
          <button
            onClick={() => setActiveTab('android')}
            className={`flex-1 py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
              activeTab === 'android'
                ? 'bg-white dark:bg-zinc-900 text-zinc-900 dark:text-white shadow-xs'
                : 'text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100'
            }`}
          >
            Android
          </button>
          <button
            onClick={() => setActiveTab('ios')}
            className={`flex-1 py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
              activeTab === 'ios'
                ? 'bg-white dark:bg-zinc-900 text-zinc-900 dark:text-white shadow-xs'
                : 'text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100'
            }`}
          >
            iPhone / iPad
          </button>
          <button
            onClick={() => setActiveTab('desktop')}
            className={`flex-1 py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
              activeTab === 'desktop'
                ? 'bg-white dark:bg-zinc-900 text-zinc-900 dark:text-white shadow-xs'
                : 'text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100'
            }`}
          >
            Desktop
          </button>
        </div>

        {/* Tab Content: Android */}
        {activeTab === 'android' && (
          <div className="space-y-4 animate-in fade-in duration-150">
            {isStandalone ? (
              <div className="p-4 rounded-2xl bg-emerald-500/5 border border-emerald-500/20 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                  <div>
                    <div className="text-xs font-bold text-zinc-900 dark:text-white">PingStack is already installed</div>
                    <div className="text-[11px] text-zinc-500">You are currently using the standalone Android app.</div>
                  </div>
                </div>
                <Link
                  href="/dashboard"
                  className="px-4 py-2 bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 rounded-xl text-xs font-bold hover:opacity-90 transition-opacity"
                >
                  Open Dashboard
                </Link>
              </div>
            ) : deferredPrompt ? (
              <div className="p-5 rounded-2xl bg-indigo-500/5 border border-indigo-500/20 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div>
                  <div className="text-sm font-bold text-zinc-900 dark:text-white">Install with one tap</div>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
                    Your browser supports direct installation. Tap the button below to add PingStack to your apps.
                  </p>
                </div>
                <button
                  onClick={handleInstallClick}
                  disabled={installState === 'installing'}
                  className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold transition-all shadow-md flex items-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  <Download className="w-4 h-4" />
                  <span>{installState === 'installing' ? 'Installing...' : 'Install PingStack'}</span>
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                <p className="text-xs text-zinc-600 dark:text-zinc-400">
                  Follow these quick steps in Google Chrome or Samsung Internet:
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="p-4 rounded-2xl bg-zinc-50 dark:bg-zinc-800/40 border border-zinc-200 dark:border-zinc-800 text-xs space-y-1.5">
                    <div className="w-6 h-6 rounded-full bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 font-bold flex items-center justify-center text-[11px]">
                      1
                    </div>
                    <div className="font-bold text-zinc-900 dark:text-white">Open Browser Menu</div>
                    <p className="text-[11px] text-zinc-500 dark:text-zinc-400 leading-relaxed">
                      Tap the three dots (⋮) in the top-right corner of Chrome.
                    </p>
                  </div>

                  <div className="p-4 rounded-2xl bg-zinc-50 dark:bg-zinc-800/40 border border-zinc-200 dark:border-zinc-800 text-xs space-y-1.5">
                    <div className="w-6 h-6 rounded-full bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 font-bold flex items-center justify-center text-[11px]">
                      2
                    </div>
                    <div className="font-bold text-zinc-900 dark:text-white">Tap &ldquo;Install App&rdquo;</div>
                    <p className="text-[11px] text-zinc-500 dark:text-zinc-400 leading-relaxed">
                      Select &ldquo;Install App&rdquo; or &ldquo;Add to Home screen&rdquo;.
                    </p>
                  </div>

                  <div className="p-4 rounded-2xl bg-zinc-50 dark:bg-zinc-800/40 border border-zinc-200 dark:border-zinc-800 text-xs space-y-1.5">
                    <div className="w-6 h-6 rounded-full bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 font-bold flex items-center justify-center text-[11px]">
                      3
                    </div>
                    <div className="font-bold text-zinc-900 dark:text-white">Launch &amp; Use</div>
                    <p className="text-[11px] text-zinc-500 dark:text-zinc-400 leading-relaxed">
                      Open PingStack from your home screen or app drawer.
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Tab Content: iOS */}
        {activeTab === 'ios' && (
          <div className="space-y-4 animate-in fade-in duration-150">
            {isStandalone ? (
              <div className="p-4 rounded-2xl bg-emerald-500/5 border border-emerald-500/20 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                  <div>
                    <div className="text-xs font-bold text-zinc-900 dark:text-white">PingStack is added to your Home Screen</div>
                    <div className="text-[11px] text-zinc-500">You are running the standalone iOS web app.</div>
                  </div>
                </div>
                <Link
                  href="/dashboard"
                  className="px-4 py-2 bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 rounded-xl text-xs font-bold hover:opacity-90 transition-opacity"
                >
                  Open Dashboard
                </Link>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-800 dark:text-amber-300">
                  <strong>iOS Note</strong>: Apple Safari requires adding PingStack to your Home Screen before Push Notifications and Lock-Screen alerts can be activated.
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="p-4 rounded-2xl bg-zinc-50 dark:bg-zinc-800/40 border border-zinc-200 dark:border-zinc-800 text-xs space-y-1.5">
                    <div className="w-6 h-6 rounded-full bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 font-bold flex items-center justify-center text-[11px]">
                      1
                    </div>
                    <div className="font-bold text-zinc-900 dark:text-white flex items-center gap-1.5">
                      <span>Tap Share</span>
                      <Share className="w-3.5 h-3.5 text-indigo-500" />
                    </div>
                    <p className="text-[11px] text-zinc-500 dark:text-zinc-400 leading-relaxed">
                      Tap the Share button at the bottom bar of Safari (or top bar on iPad).
                    </p>
                  </div>

                  <div className="p-4 rounded-2xl bg-zinc-50 dark:bg-zinc-800/40 border border-zinc-200 dark:border-zinc-800 text-xs space-y-1.5">
                    <div className="w-6 h-6 rounded-full bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 font-bold flex items-center justify-center text-[11px]">
                      2
                    </div>
                    <div className="font-bold text-zinc-900 dark:text-white flex items-center gap-1.5">
                      <span>Add to Home Screen</span>
                      <PlusSquare className="w-3.5 h-3.5 text-indigo-500" />
                    </div>
                    <p className="text-[11px] text-zinc-500 dark:text-zinc-400 leading-relaxed">
                      Scroll down the share sheet and tap &ldquo;Add to Home Screen&rdquo;.
                    </p>
                  </div>

                  <div className="p-4 rounded-2xl bg-zinc-50 dark:bg-zinc-800/40 border border-zinc-200 dark:border-zinc-800 text-xs space-y-1.5">
                    <div className="w-6 h-6 rounded-full bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 font-bold flex items-center justify-center text-[11px]">
                      3
                    </div>
                    <div className="font-bold text-zinc-900 dark:text-white">Open &amp; Enable Alerts</div>
                    <p className="text-[11px] text-zinc-500 dark:text-zinc-400 leading-relaxed">
                      Launch PingStack from your home screen and allow notifications when prompted.
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Tab Content: Desktop */}
        {activeTab === 'desktop' && (
          <div className="space-y-4 animate-in fade-in duration-150">
            <div className="p-4 rounded-2xl bg-zinc-50 dark:bg-zinc-800/40 border border-zinc-200 dark:border-zinc-800 text-xs space-y-2">
              <div className="font-bold text-zinc-900 dark:text-white flex items-center gap-2">
                <Laptop className="w-4 h-4 text-indigo-500" />
                <span>Install on macOS, Windows, or Linux</span>
              </div>
              <p className="text-zinc-500 dark:text-zinc-400 leading-relaxed">
                In Google Chrome, Microsoft Edge, or Brave, click the <strong>Install icon</strong> located on the right side of the address bar (next to the star/bookmark icon), or open the browser menu and select <strong>&ldquo;Install PingStack...&rdquo;</strong>.
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Section 2: Notifications Setup & Troubleshooting */}
      <div className="p-6 sm:p-8 rounded-3xl border border-zinc-200 dark:border-zinc-800/80 bg-white dark:bg-zinc-900/60 shadow-sm space-y-6">
        <div>
          <h2 className="text-base sm:text-lg font-bold text-zinc-900 dark:text-white">
            2. Push Notification Configuration
          </h2>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
            Receive real-time lock-screen alerts when WhatsApp customers reply or send incoming messages.
          </p>
        </div>

        {/* State 1: Granted */}
        {permission === 'granted' && (
          <div className="space-y-4">
            <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0" />
                <div>
                  <div className="text-xs font-bold text-emerald-800 dark:text-emerald-300">
                    Notifications are enabled and working
                  </div>
                  <div className="text-[11px] text-emerald-700/80 dark:text-emerald-400/80 mt-0.5">
                    Your browser has registered Web Push credentials with your workspace.
                  </div>
                </div>
              </div>

              <button
                onClick={handleTestPush}
                disabled={testPushLoading}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-semibold transition-colors flex items-center gap-2 cursor-pointer disabled:opacity-50 shrink-0 shadow-xs"
              >
                {testPushLoading ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Dispatching test...</span>
                  </>
                ) : (
                  <>
                    <BellRing className="w-3.5 h-3.5" />
                    <span>Send Test Notification</span>
                  </>
                )}
              </button>
            </div>
          </div>
        )}

        {/* State 2: Default (Not yet requested) */}
        {permission === 'default' && (
          <div className="p-5 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <div className="text-xs font-bold text-indigo-900 dark:text-indigo-200">
                Push notifications are not yet activated
              </div>
              <p className="text-[11px] text-indigo-700/80 dark:text-indigo-300/80 mt-0.5">
                Enable notifications so you never miss an incoming customer message when away from your desk.
              </p>
            </div>

            <button
              onClick={handleEnablePush}
              disabled={isSubscribing}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-semibold transition-colors flex items-center gap-2 cursor-pointer disabled:opacity-50 shrink-0 shadow-xs"
            >
              {isSubscribing ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Requesting...</span>
                </>
              ) : (
                <>
                  <Bell className="w-3.5 h-3.5" />
                  <span>Enable Notifications</span>
                </>
              )}
            </button>
          </div>
        )}

        {/* State 3: Denied / Blocked */}
        {permission === 'denied' && (
          <div className="space-y-4">
            <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/20 flex items-start gap-3">
              <BellOff className="w-5 h-5 text-rose-500 shrink-0 mt-0.5" />
              <div className="flex-1">
                <div className="text-xs font-bold text-rose-900 dark:text-rose-200">
                  Notifications are blocked in your browser or device settings
                </div>
                <p className="text-[11px] text-rose-700/80 dark:text-rose-300/80 mt-0.5 leading-relaxed">
                  Web browsers do not allow re-prompting once &ldquo;Don&apos;t Allow&rdquo; has been selected. To receive message alerts, please re-enable permissions in your settings below:
                </p>
              </div>
            </div>

            {/* Platform Recovery Instructions */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="p-4 rounded-2xl bg-zinc-50 dark:bg-zinc-800/40 border border-zinc-200 dark:border-zinc-800 text-xs space-y-2">
                <div className="font-bold text-zinc-900 dark:text-white flex items-center gap-2">
                  <Smartphone className="w-4 h-4 text-indigo-500" />
                  <span>On Android</span>
                </div>
                <ol className="list-decimal list-inside space-y-1 text-[11px] text-zinc-600 dark:text-zinc-400">
                  <li>Open device <strong>Settings</strong> &rarr; <strong>Apps</strong>.</li>
                  <li>Select <strong>Chrome</strong> (or <strong>PingStack</strong>).</li>
                  <li>Tap <strong>Notifications</strong> &rarr; switch to <strong>Allow</strong>.</li>
                </ol>
              </div>

              <div className="p-4 rounded-2xl bg-zinc-50 dark:bg-zinc-800/40 border border-zinc-200 dark:border-zinc-800 text-xs space-y-2">
                <div className="font-bold text-zinc-900 dark:text-white flex items-center gap-2">
                  <Smartphone className="w-4 h-4 text-indigo-500" />
                  <span>On iPhone / iPad</span>
                </div>
                <ol className="list-decimal list-inside space-y-1 text-[11px] text-zinc-600 dark:text-zinc-400">
                  <li>Open iOS <strong>Settings</strong> &rarr; <strong>Notifications</strong>.</li>
                  <li>Tap <strong>PingStack</strong> (or Safari).</li>
                  <li>Turn on <strong>Allow Notifications</strong> (Lock Screen, Banners).</li>
                </ol>
              </div>
            </div>

            <div className="flex items-center justify-between pt-2">
              <span className="text-[11px] text-zinc-500">
                After changing settings, click verify to re-sync permissions:
              </span>
              <button
                onClick={handleEnablePush}
                disabled={isSubscribing}
                className="px-4 py-2 bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 hover:opacity-90 rounded-xl text-xs font-semibold transition-opacity flex items-center gap-1.5 cursor-pointer"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Re-verify Permissions</span>
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Section 3: Helpful Tips & Assistant */}
      <div className="p-5 rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/40 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Sparkles className="w-5 h-5 text-indigo-500 shrink-0" />
          <div className="text-xs text-zinc-600 dark:text-zinc-400">
            Have questions about WhatsApp Cloud API, templates, or campaigns? The Pingstack Assistant is ready to help.
          </div>
        </div>

        <Link
          href="/dashboard"
          className="px-4 py-2 bg-zinc-200 dark:bg-zinc-800 hover:bg-zinc-300 dark:hover:bg-zinc-700 text-zinc-800 dark:text-zinc-200 rounded-xl text-xs font-semibold transition-colors shrink-0"
        >
          Return to Dashboard
        </Link>
      </div>
    </div>
  );
}
