'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Sidebar } from '@/components/Sidebar';
import { Menu, X, AlertTriangle, LogOut, Loader2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { setSupabaseSession } from '@/lib/db';

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [tenant, setTenant] = useState<any>(null);
  const [loadingTenant, setLoadingTenant] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const saved = localStorage.getItem('sidebar-collapsed');
    if (saved !== null) setIsCollapsed(saved === 'true');
    setMounted(true);

    async function fetchTenant() {
      try {
        const res = await fetch('/api/tenant/me');
        if (res.ok) {
          const data = await res.json();
          setTenant(data);
        }
      } catch (err) {
        console.error('Error fetching tenant details in layout:', err);
      } finally {
        setLoadingTenant(false);
      }
    }
    fetchTenant();
  }, []);

  const toggleCollapse = () => {
    const newState = !isCollapsed;
    setIsCollapsed(newState);
    localStorage.setItem('sidebar-collapsed', String(newState));
  };

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' }).catch(() => null);
    document.cookie = 'token=; Max-Age=0; path=/;';
    document.cookie = 'supabase_refresh_token=; Max-Age=0; path=/;';
    await setSupabaseSession(null);
    router.push('/');
  };

  if (!mounted || loadingTenant) {
    return (
      <div className="flex h-screen w-screen bg-bg text-fg justify-center items-center">
        <Loader2 className="w-8 h-8 text-indigo-500 animate-spin" />
      </div>
    );
  }

  if (tenant?.trial_expired) {
    return (
      <div className="flex h-screen w-screen bg-bg text-fg overflow-hidden relative justify-center items-center">
        {/* Ambient background glows */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden z-0">
          <div className="absolute top-1/4 left-1/4 w-[60%] h-[60%] rounded-full bg-red-500/[0.02] dark:bg-red-600/[0.03] blur-[150px]" />
          <div className="absolute bottom-1/4 right-1/4 w-[60%] h-[60%] rounded-full bg-indigo-500/[0.02] dark:bg-indigo-600/[0.03] blur-[150px]" />
        </div>

        <div className="relative max-w-md w-full mx-4 p-8 sm:p-10 rounded-[2.5rem] border border-glass-border bg-glass-card/60 backdrop-blur-2xl shadow-2xl text-center z-10 flex flex-col items-center">
          <div className="w-16 h-16 bg-red-500/10 border border-red-500/20 rounded-2xl flex items-center justify-center mb-6">
            <AlertTriangle className="w-8 h-8 text-red-500" />
          </div>

          <h2 className="text-2xl font-black tracking-tight text-fg mb-4">Trial Period Expired</h2>
          
          <p className="text-muted text-sm font-semibold leading-relaxed mb-8">
            Your 15-day free trial of PingStack's Starter plan has ended. Upgrade to a paid plan now to continue sending WhatsApp campaigns, managing contacts, and using inbox features.
          </p>

          <div className="w-full flex flex-col gap-3">
            <a 
              href="/pricing"
              className="w-full py-4 bg-indigo-600 hover:bg-indigo-500 text-white rounded-2xl font-black text-xs uppercase tracking-widest text-center transition-all shadow-lg shadow-indigo-600/25 active:scale-98"
            >
              Upgrade Subscription
            </a>
            
            <button 
              onClick={handleLogout}
              className="w-full py-4 bg-glass-input text-fg/70 hover:text-fg border border-glass-input-border hover:border-fg/20 rounded-2xl font-black text-xs uppercase tracking-widest transition-all cursor-pointer flex items-center justify-center gap-2"
            >
              <LogOut className="w-4 h-4" />
              <span>Log Out</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-bg text-fg overflow-hidden relative selection:bg-fg selection:text-bg transition-colors duration-300">
      {/* Ambient background glows */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden z-0">
        <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] rounded-full bg-blue-500/[0.03] dark:bg-blue-600/5 blur-[120px]" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] rounded-full bg-indigo-500/[0.03] dark:bg-indigo-600/5 blur-[120px]" />
      </div>

      {/* Desktop Sidebar */}
      <div className="hidden md:block z-20">
        <Sidebar collapsed={isCollapsed} onToggleCollapse={toggleCollapse} />
      </div>

      {/* Mobile Drawer Overlay */}
      {isMobileMenuOpen && (
        <div 
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] md:hidden"
          onClick={() => setIsMobileMenuOpen(false)}
        >
          <div 
            className="w-64 h-full bg-bg border-r border-glass-border shadow-2xl flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
             <div className="flex justify-end p-4 border-b border-glass-border">
                <button onClick={() => setIsMobileMenuOpen(false)} className="p-1 hover:bg-glass-card rounded-lg cursor-pointer">
                  <X className="w-6 h-6 text-muted hover:text-fg" />
                </button>
             </div>
             <div className="flex-1 overflow-y-auto">
               <Sidebar collapsed={false} onToggleCollapse={() => {}} />
             </div>
          </div>
        </div>
      )}

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 z-10 relative">
        {/* Mobile Header */}
        <header className="md:hidden h-16 border-b border-glass-border bg-bg/60 backdrop-blur-xl px-6 flex items-center justify-between shrink-0 z-50">
            <Link href="/" className="flex items-center space-x-2 cursor-pointer group/logo">
              <div className="bg-fg p-1.5 rounded-lg group-hover/logo:scale-105 transition-transform duration-200">
                 <svg className="w-5 h-5 text-bg" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                   <path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                 </svg>
              </div>
              <span className="font-black text-lg tracking-tight text-fg group-hover/logo:opacity-80 transition-opacity duration-200">PingStack</span>
            </Link>
           <button onClick={() => setIsMobileMenuOpen(true)} className="p-1 hover:bg-glass-card rounded-lg cursor-pointer">
              <Menu className="w-6 h-6 text-muted hover:text-fg" />
           </button>
        </header>

        {/* Trial Countdown Notice Bar */}
        {tenant && tenant.is_trial && !tenant.trial_expired && (
          <div className="bg-gradient-to-r from-indigo-500/10 via-purple-500/10 to-indigo-500/10 border-b border-indigo-500/20 px-6 py-2.5 flex items-center justify-between text-xs font-semibold text-indigo-400 z-40 shrink-0">
            <div className="flex items-center gap-2">
              <span className="flex h-2 w-2 relative">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-indigo-500"></span>
              </span>
              <span>Your 15-day free trial has <strong>{tenant.trial_days_left} {tenant.trial_days_left === 1 ? 'day' : 'days'}</strong> left.</span>
            </div>
            <a href="/pricing" className="px-3.5 py-1 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-[10px] font-black uppercase tracking-wider transition-all shadow-md shadow-indigo-600/10 hover:shadow-indigo-600/25">
              Upgrade Now
            </a>
          </div>
        )}

        <main className="flex-1 overflow-y-auto relative scroll-smooth">
          <div className="max-w-6xl mx-auto p-4 sm:p-6 md:p-8 mt-2 relative z-10">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
