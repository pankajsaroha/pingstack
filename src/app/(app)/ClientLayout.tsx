'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Sidebar } from '@/components/Sidebar';
import { Menu, X, AlertTriangle, LogOut, Loader2, Sparkles } from 'lucide-react';
import { usePathname } from 'next/navigation';
import { setSupabaseSession } from '@/lib/db';
import { TenantProvider, TenantContextValue } from '@/context/tenant-context';
import { PingstackAssistant } from '@/components/assistant/PingstackAssistant';
import { FeedbackModal } from '@/components/feedback/FeedbackModal';
import { SiteTour } from '@/components/tour/SiteTour';
import { ThemeToggle } from '@/components/ThemeToggle';

interface ClientLayoutProps {
  tenant: TenantContextValue['tenant'] | null;
  children: React.ReactNode;
}

export default function ClientLayout({ tenant, children }: ClientLayoutProps) {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isNavigating, setIsNavigating] = useState(false);
  const [targetPath, setTargetPath] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);
  const [isFeedbackOpen, setIsFeedbackOpen] = useState(false);
  const [isTourOpen, setIsTourOpen] = useState(false);
  const pathname = usePathname();

  useEffect(() => {
    const saved = localStorage.getItem('sidebar-collapsed');
    if (saved !== null) setIsCollapsed(saved === 'true');
    setMounted(true);

    // Check if first-time user tour should be shown
    const tourDone = localStorage.getItem('pingstack_workspace_tour_completed');
    if (!tourDone && pathname === '/dashboard') {
      const timer = setTimeout(() => {
        setIsTourOpen(true);
      }, 1000);
      return () => clearTimeout(timer);
    }

    // Security: Detect browser back/forward cache (BFCache) restorations
    const handlePageShow = async (event: PageTransitionEvent) => {
      if (event.persisted) {
        try {
          const res = await fetch('/api/tenant/me', { cache: 'no-store' });
          if (!res.ok) {
            window.location.replace('/login');
          }
        } catch {
          window.location.replace('/login');
        }
      }
    };

    window.addEventListener('pageshow', handlePageShow);
    return () => window.removeEventListener('pageshow', handlePageShow);
  }, [pathname]);

  // Auto-close mobile drawer & clear navigation loading overlay when route changes
  useEffect(() => {
    setIsMobileMenuOpen(false);
    setIsNavigating(false);
    setTargetPath(null);
  }, [pathname]);

  const handleNavItemClick = (href: string) => {
    setIsMobileMenuOpen(false);
    if (href !== pathname) {
      setIsNavigating(true);
      setTargetPath(href);
    }
  };

  const [isRegistering, setIsRegistering] = useState(false);

  const handleRegisterPhone = async () => {
    setIsRegistering(true);
    try {
      const res = await fetch('/api/whatsapp/meta/register', { method: 'POST' });
      const data = await res.json();
      if (data.success) {
        window.location.reload();
      } else {
        alert(data.error || 'Registration failed');
      }
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : 'Error triggering registration';
      alert(errorMsg);
    } finally {
      setIsRegistering(false);
    }
  };

  const toggleCollapse = () => {
    const newState = !isCollapsed;
    setIsCollapsed(newState);
    localStorage.setItem('sidebar-collapsed', String(newState));
  };

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' }).catch(() => null);
    await setSupabaseSession(null);
    window.location.replace('/login');
  };

  if (tenant?.trial_expired) {
    return (
      <div className="flex h-screen w-screen bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 overflow-hidden relative justify-center items-center">
        <div className="relative max-w-md w-full mx-4 p-8 rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-xl text-center z-10 flex flex-col items-center">
          <div className="w-12 h-12 bg-rose-500/10 border border-rose-500/20 rounded-xl flex items-center justify-center mb-5">
            <AlertTriangle className="w-6 h-6 text-rose-500" />
          </div>

          <h2 className="text-xl font-bold tracking-tight text-zinc-900 dark:text-white mb-2">Trial Period Expired</h2>

          <p className="text-xs text-zinc-500 dark:text-zinc-400 leading-relaxed mb-6">
            Your 15-day free trial of PingStack&apos;s Starter plan has ended. Upgrade to a paid plan to continue sending WhatsApp campaigns, managing contacts, and using inbox features.
          </p>

          <div className="w-full flex flex-col gap-2.5">
            <a
              href="/pricing"
              className="w-full py-2.5 bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 hover:bg-zinc-800 dark:hover:bg-zinc-100 rounded-lg font-semibold text-xs transition-colors shadow-xs"
            >
              Upgrade Subscription
            </a>

            <button
              onClick={handleLogout}
              className="w-full py-2.5 bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 hover:text-zinc-900 dark:hover:text-white border border-zinc-200 dark:border-zinc-700/60 rounded-lg font-semibold text-xs transition-colors cursor-pointer flex items-center justify-center gap-2"
            >
              <LogOut className="w-4 h-4" />
              <span>Log Out</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  const isConnected = tenant?.whatsapp_account?.status === 'ACTIVE' || tenant?.whatsapp_account?.status === 'CONNECTED';

  return (
    <TenantProvider initialTenant={tenant}>
      <div className="flex h-screen bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 antialiased font-sans overflow-hidden selection:bg-indigo-500/20 selection:text-indigo-600 dark:selection:bg-indigo-500/30 dark:selection:text-indigo-200 transition-colors duration-200">
        
        {/* Desktop Sidebar */}
        <div className="hidden md:block">
          <Sidebar 
            collapsed={isCollapsed} 
            onToggleCollapse={toggleCollapse} 
            onItemClick={handleNavItemClick}
            onFeedbackClick={() => setIsFeedbackOpen(true)}
            onStartTour={() => setIsTourOpen(true)}
          />
        </div>

        {/* Mobile Drawer */}
        {isMobileMenuOpen && (
          <div
            className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm md:hidden flex"
            onClick={() => setIsMobileMenuOpen(false)}
          >
            <div
              className="w-64 h-full bg-white dark:bg-zinc-950 border-r border-zinc-200 dark:border-zinc-800 flex flex-col animate-in slide-in-from-left duration-200 shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="h-14 px-4 border-b border-zinc-200 dark:border-zinc-800/80 flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                  Workspace Navigation
                </span>
                <button
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="p-1.5 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-md text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
              <div className="flex-1 overflow-y-auto">
                <Sidebar 
                  collapsed={false} 
                  onToggleCollapse={() => {}} 
                  onItemClick={handleNavItemClick}
                  onFeedbackClick={() => {
                    setIsMobileMenuOpen(false);
                    setIsFeedbackOpen(true);
                  }}
                  onStartTour={() => {
                    setIsMobileMenuOpen(false);
                    setIsTourOpen(true);
                  }}
                />
              </div>
            </div>
          </div>
        )}

        {/* Main Content Area */}
        <div className="flex-1 flex flex-col min-w-0 bg-zinc-50 dark:bg-zinc-950">
          {/* Top Header Bar */}
          <header className="h-14 border-b border-zinc-200 dark:border-zinc-800/60 bg-white/80 dark:bg-zinc-950/80 backdrop-blur-md px-4 sm:px-6 flex items-center justify-between shrink-0 z-10">
            <div className="flex items-center gap-3">
              <button
                onClick={() => setIsMobileMenuOpen(true)}
                className="p-1.5 -ml-1.5 md:hidden hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200"
              >
                <Menu className="w-5 h-5" />
              </button>
              <div className="flex items-center gap-2 text-xs">
                <span className="text-zinc-400 dark:text-zinc-500 hidden sm:inline">Workspace</span>
                <span className="text-zinc-300 dark:text-zinc-700 hidden sm:inline">/</span>
                <span className="font-semibold text-zinc-900 dark:text-zinc-200 capitalize">
                  {pathname === '/dashboard'
                    ? 'Dashboard'
                    : pathname.split('/')[1]?.replace('-', ' ') || 'Overview'}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2.5">
              {/* Tour Trigger */}
              <button
                onClick={() => setIsTourOpen(true)}
                className="hidden sm:flex items-center gap-1.5 px-2.5 py-1.5 bg-zinc-100 dark:bg-zinc-900/80 hover:bg-zinc-200/70 dark:hover:bg-zinc-900 border border-zinc-200 dark:border-zinc-800/80 rounded-lg text-xs text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200 transition-colors cursor-pointer"
              >
                <Sparkles className="w-3.5 h-3.5 text-indigo-500" />
                <span>Tour</span>
              </button>

              {/* Feedback Button */}
              <button
                onClick={() => setIsFeedbackOpen(true)}
                className="px-2.5 py-1.5 bg-zinc-100 dark:bg-zinc-900/80 hover:bg-zinc-200/70 dark:hover:bg-zinc-900 border border-zinc-200 dark:border-zinc-800/80 rounded-lg text-xs text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200 transition-colors cursor-pointer"
              >
                Feedback
              </button>

              {/* Status Indicator */}
              <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-emerald-500/10 border border-emerald-500/20 text-[11px] font-mono text-emerald-600 dark:text-emerald-400">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                <span>{isConnected ? 'WA READY' : 'ONLINE'}</span>
              </div>

              {/* Theme Toggle Button (Mobile visible) */}
              <div className="md:hidden">
                <ThemeToggle />
              </div>
            </div>
          </header>

          {/* Pending Number Verification Notification Banner */}
          {tenant && tenant.whatsapp_account && (tenant.whatsapp_account.status === 'PENDING' || tenant.whatsapp_account.status === 'UNVERIFIED' || tenant.whatsapp_account.status === 'LIMITED') && (
            <div className="bg-amber-500/10 border-b border-amber-500/20 px-4 sm:px-6 py-2.5 flex items-center justify-between text-xs text-amber-700 dark:text-amber-400 z-10 shrink-0">
              <div className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-ping shrink-0" />
                <span>
                  <strong>Meta Setup Pending</strong>: Your WhatsApp phone status is <strong>{tenant.whatsapp_account.status}</strong>. Click &ldquo;Register Number Now&rdquo; to complete registration.
                </span>
              </div>
              <button
                onClick={handleRegisterPhone}
                disabled={isRegistering}
                className="px-3 py-1 bg-amber-600 hover:bg-amber-500 text-white rounded-md text-[11px] font-semibold transition-colors disabled:opacity-50 shrink-0 ml-4 cursor-pointer"
              >
                {isRegistering ? 'Registering...' : 'Register Number'}
              </button>
            </div>
          )}

          {/* Trial Indicator Banner */}
          {tenant && tenant.is_trial && !tenant.trial_expired && (
            <div className="bg-indigo-500/10 border-b border-indigo-500/20 px-4 sm:px-6 py-2 flex items-center justify-between text-xs text-indigo-700 dark:text-indigo-400 z-10 shrink-0">
              <div className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-pulse" />
                <span>Free trial: <strong>{tenant.trial_days_left} {tenant.trial_days_left === 1 ? 'day' : 'days'}</strong> remaining.</span>
              </div>
              <a 
                href="/pricing" 
                className="px-2.5 py-0.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded text-[11px] font-semibold transition-colors"
              >
                Upgrade Plan
              </a>
            </div>
          )}

          {/* Main Page Scroll Body */}
          <main className={`flex-1 min-h-0 ${pathname === '/inbox' ? 'flex flex-col overflow-hidden' : 'overflow-y-auto scroll-smooth'}`}>
            {isNavigating && (
              <div className="absolute inset-0 bg-white/70 dark:bg-zinc-950/70 backdrop-blur-sm z-50 flex items-center justify-center animate-in fade-in duration-150">
                <div className="p-5 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-xl flex items-center gap-3">
                  <Loader2 className="w-5 h-5 text-indigo-500 animate-spin" />
                  <span className="text-xs font-semibold text-zinc-800 dark:text-zinc-200">
                    Loading {targetPath ? targetPath.replace('/', '') : 'page'}...
                  </span>
                </div>
              </div>
            )}

            <div className={`${pathname === '/inbox' ? 'flex-1 flex flex-col min-h-0 w-full p-2 sm:p-4 lg:p-6' : 'p-4 sm:p-6 lg:p-8'} max-w-7xl w-full mx-auto`}>
              {children}
            </div>
          </main>
        </div>

        {/* Global Floating Pingstack Assistant (single button on screen) */}
        <PingstackAssistant 
          onOpenFeedback={() => setIsFeedbackOpen(true)}
          onStartTour={() => setIsTourOpen(true)}
        />

        {/* Global Feedback Modal */}
        <FeedbackModal
          isOpen={isFeedbackOpen}
          onClose={() => setIsFeedbackOpen(false)}
        />

        {/* Guided First-Time User Site Tour */}
        <SiteTour
          isOpen={isTourOpen}
          onClose={() => setIsTourOpen(false)}
          isConnected={isConnected}
        />
      </div>
    </TenantProvider>
  );
}
