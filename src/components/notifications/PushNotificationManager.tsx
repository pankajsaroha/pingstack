'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { 
  Bell, 
  BellRing, 
  X, 
  Share, 
  PlusSquare, 
  CheckCircle2, 
  AlertCircle, 
  Smartphone,
  ChevronRight,
  Loader2
} from 'lucide-react';
import { 
  getPlatformInfo, 
  subscribeToWebPush, 
  PlatformInfo 
} from '@/lib/push-client';

export function PushNotificationManager() {
  const [platform, setPlatform] = useState<PlatformInfo | null>(null);
  const [showPrompt, setShowPrompt] = useState(false);
  const [showIOSModal, setShowIOSModal] = useState(false);
  const [isSubscribing, setIsSubscribing] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [statusType, setStatusType] = useState<'success' | 'error' | null>(null);

  // 1. PRESENCE HEARTBEAT (Workspace-Level session presence)
  useEffect(() => {
    // Generate or retrieve persistent tabId for this browser tab
    let tabId = sessionStorage.getItem('pingstack_tab_id');
    if (!tabId) {
      tabId = 'tab_' + Math.random().toString(36).substring(2, 11) + '_' + Date.now().toString(36);
      sessionStorage.setItem('pingstack_tab_id', tabId);
    }

    const sendHeartbeat = () => {
      if (typeof document !== 'undefined' && document.visibilityState === 'visible') {
        fetch('/api/presence/heartbeat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ tabId, action: 'heartbeat' }),
        }).catch(() => null);
      }
    };

    const sendLeave = () => {
      const payload = JSON.stringify({ tabId, action: 'leave' });
      if (typeof navigator !== 'undefined' && navigator.sendBeacon) {
        const blob = new Blob([payload], { type: 'application/json' });
        navigator.sendBeacon('/api/presence/heartbeat', blob);
      } else {
        fetch('/api/presence/heartbeat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          keepalive: true,
          body: payload,
        }).catch(() => null);
      }
    };

    // Immediate initial heartbeat if visible
    if (document.visibilityState === 'visible') {
      sendHeartbeat();
    }

    // Regular 20s heartbeat interval while visible (Redis TTL is 45s)
    const interval = setInterval(sendHeartbeat, 20000);

    // Tab visibility change listener: immediately ping when visible, clear on hidden
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        sendHeartbeat();
      } else {
        sendLeave();
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);

    // Unload listener to clear presence on tab close
    window.addEventListener('beforeunload', sendLeave);

    return () => {
      clearInterval(interval);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('beforeunload', sendLeave);
      sendLeave();
    };
  }, []);

  // 2. CHECK NOTIFICATION PERMISSION & PLATFORM ON MOUNT
  useEffect(() => {
    const info = getPlatformInfo();
    setPlatform(info);

    const isDismissed = sessionStorage.getItem('ps_hide_notif_prompt') === 'true';

    // Only show prompt if permission is 'default' (not yet granted or denied) and not dismissed
    if (info.permission === 'default' && !isDismissed) {
      // Small delay so user sees workspace first
      const timer = setTimeout(() => {
        setShowPrompt(true);
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, []);

  const handleDismiss = () => {
    setShowPrompt(false);
    sessionStorage.setItem('ps_hide_notif_prompt', 'true');
  };

  const handleEnablePush = async () => {
    setIsSubscribing(true);
    setStatusMessage(null);
    setStatusType(null);

    const result = await subscribeToWebPush();
    setIsSubscribing(false);

    if (result.success) {
      setStatusType('success');
      setStatusMessage('Notifications enabled! You will be alerted when customers message you.');
      setShowPrompt(false);
      setPlatform((prev) => prev ? { ...prev, permission: 'granted' } : null);
      setTimeout(() => setStatusMessage(null), 5000);
    } else {
      setStatusType('error');
      setStatusMessage(result.error || 'Failed to enable notifications');
      setPlatform(getPlatformInfo());
    }
  };

  if (!platform) return null;

  // Don't render prompt if notifications are already granted
  const isGranted = platform.permission === 'granted';

  return (
    <>
      {/* Toast Feedback */}
      {statusMessage && (
        <div className={`fixed bottom-6 left-6 z-[100] max-w-md p-3.5 rounded-xl border shadow-xl flex items-center gap-2.5 text-xs font-medium animate-in slide-in-from-bottom-3 duration-200 ${
          statusType === 'success'
            ? 'bg-emerald-950/90 border-emerald-500/30 text-emerald-200'
            : 'bg-red-950/90 border-red-500/30 text-red-200'
        }`}>
          {statusType === 'success' ? (
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          ) : (
            <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
          )}
          <span className="flex-1">{statusMessage}</span>
          <button 
            onClick={() => setStatusMessage(null)}
            className="p-1 hover:bg-white/10 rounded cursor-pointer"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Non-intrusive Onboarding Notification Banner / Card */}
      {showPrompt && !isGranted && (
        <div className="fixed bottom-20 left-4 sm:left-6 z-[70] max-w-sm sm:max-w-md bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-4 shadow-2xl animate-in slide-in-from-bottom-4 duration-300">
          <div className="flex items-start gap-3">
            <div className="w-9 h-9 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0 mt-0.5">
              <BellRing className="w-4 h-4" />
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-bold text-zinc-900 dark:text-white">
                  Never miss a customer message
                </h4>
                <button
                  onClick={handleDismiss}
                  className="p-1 -mr-1 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 rounded-md hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
                  aria-label="Dismiss"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>

              {platform.isIOS && !platform.isStandalone ? (
                // iPhone/iPad standard browser prompt
                <>
                  <p className="text-[11px] text-zinc-500 dark:text-zinc-400 mt-1 leading-relaxed">
                    On iPhone, add PingStack to your Home Screen to enable instant alerts when you&apos;re away.
                  </p>
                  <div className="flex items-center gap-2 mt-3">
                    <button
                      onClick={() => setShowIOSModal(true)}
                      className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer shadow-xs"
                    >
                      <Smartphone className="w-3.5 h-3.5" />
                      <span>How to enable</span>
                    </button>
                    <button
                      onClick={handleDismiss}
                      className="px-2.5 py-1.5 text-xs text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200 transition-colors cursor-pointer"
                    >
                      Maybe later
                    </button>
                  </div>
                </>
              ) : (
                // Android, Desktop, or iOS Standalone Web App
                <>
                  <p className="text-[11px] text-zinc-500 dark:text-zinc-400 mt-1 leading-relaxed">
                    Get notified when customers send WhatsApp messages while PingStack is closed.
                  </p>
                  <div className="flex items-center gap-2 mt-3">
                    <button
                      onClick={handleEnablePush}
                      disabled={isSubscribing}
                      className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer shadow-xs disabled:opacity-50"
                    >
                      {isSubscribing ? (
                        <>
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          <span>Enabling...</span>
                        </>
                      ) : (
                        <>
                          <Bell className="w-3.5 h-3.5" />
                          <span>Enable notifications</span>
                        </>
                      )}
                    </button>
                    <button
                      onClick={handleDismiss}
                      className="px-2.5 py-1.5 text-xs text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200 transition-colors cursor-pointer"
                    >
                      Maybe later
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* iOS Safari Step-by-Step Home Screen Guide Modal */}
      {showIOSModal && (
        <div 
          className="fixed inset-0 z-[110] bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in duration-200"
          onClick={() => setShowIOSModal(false)}
        >
          <div 
            className="w-full sm:max-w-md bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-t-3xl sm:rounded-2xl shadow-2xl p-6 overflow-hidden animate-in slide-in-from-bottom-4 duration-300"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-4 border-b border-zinc-200 dark:border-zinc-800">
              <div className="flex items-center gap-2.5">
                <img 
                  src="/icons/icon-192x192.png" 
                  alt="PingStack App Icon" 
                  className="w-9 h-9 rounded-xl shadow-md border border-zinc-200 dark:border-zinc-700/80 object-cover" 
                />
                <div>
                  <h3 className="text-sm font-bold text-zinc-900 dark:text-white">
                    Add PingStack to Home Screen
                  </h3>
                  <p className="text-[10px] text-zinc-500 dark:text-zinc-400">
                    Required for iOS lock-screen push alerts
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowIOSModal(false)}
                className="p-1 rounded-lg text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="py-5 space-y-4 text-xs">
              {/* Step 1 */}
              <div className="flex items-start gap-3 p-3 rounded-xl bg-zinc-50 dark:bg-zinc-800/40 border border-zinc-200/80 dark:border-zinc-800">
                <div className="w-6 h-6 rounded-full bg-indigo-500 text-white font-bold text-[11px] flex items-center justify-center shrink-0">
                  1
                </div>
                <div className="flex-1">
                  <div className="font-semibold text-zinc-900 dark:text-white flex items-center gap-1.5">
                    <span>Tap the Share button</span>
                    <Share className="w-3.5 h-3.5 text-indigo-500 inline" />
                  </div>
                  <p className="text-zinc-500 dark:text-zinc-400 text-[11px] mt-0.5 leading-relaxed">
                    At the bottom bar of Safari (or top right on iPad).
                  </p>
                </div>
              </div>

              {/* Step 2 */}
              <div className="flex items-start gap-3 p-3 rounded-xl bg-zinc-50 dark:bg-zinc-800/40 border border-zinc-200/80 dark:border-zinc-800">
                <div className="w-6 h-6 rounded-full bg-indigo-500 text-white font-bold text-[11px] flex items-center justify-center shrink-0">
                  2
                </div>
                <div className="flex-1">
                  <div className="font-semibold text-zinc-900 dark:text-white flex items-center gap-1.5">
                    <span>Select &ldquo;Add to Home Screen&rdquo;</span>
                    <PlusSquare className="w-3.5 h-3.5 text-indigo-500 inline" />
                  </div>
                  <p className="text-zinc-500 dark:text-zinc-400 text-[11px] mt-0.5 leading-relaxed">
                    Scroll down the share sheet and tap &ldquo;Add to Home Screen&rdquo;.
                  </p>
                </div>
              </div>

              {/* Step 3 */}
              <div className="flex items-start gap-3 p-3 rounded-xl bg-zinc-50 dark:bg-zinc-800/40 border border-zinc-200/80 dark:border-zinc-800">
                <div className="w-6 h-6 rounded-full bg-indigo-500 text-white font-bold text-[11px] flex items-center justify-center shrink-0">
                  3
                </div>
                <div className="flex-1">
                  <div className="font-semibold text-zinc-900 dark:text-white">
                    Open PingStack &amp; Tap Enable
                  </div>
                  <p className="text-zinc-500 dark:text-zinc-400 text-[11px] mt-0.5 leading-relaxed">
                    Launch PingStack from your home screen app icon to activate push notifications.
                  </p>
                </div>
              </div>
            </div>

            <div className="pt-2">
              <button
                onClick={() => {
                  setShowIOSModal(false);
                  setShowPrompt(false);
                }}
                className="w-full py-2.5 bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 hover:bg-zinc-800 dark:hover:bg-zinc-100 rounded-xl text-xs font-bold transition-all cursor-pointer text-center"
              >
                Got it
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
