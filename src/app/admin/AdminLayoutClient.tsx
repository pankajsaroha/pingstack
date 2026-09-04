'use client';

import { useState, useEffect } from 'react';
import { AdminSidebar } from './_components/AdminSidebar';
import { AdminSearchModal } from './_components/AdminSearchModal';
import { AdminUser } from '@/lib/server/admin-auth';
import { ThemeToggle } from '@/components/ThemeToggle';
import { Menu, X, Search, Shield, RefreshCw } from 'lucide-react';
import { usePathname } from 'next/navigation';

interface AdminLayoutClientProps {
  admin: AdminUser;
  children: React.ReactNode;
}

export function AdminLayoutClient({ admin, children }: AdminLayoutClientProps) {
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const pathname = usePathname();

  useEffect(() => {
    setMounted(true);

    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setIsSearchOpen((prev) => !prev);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  useEffect(() => {
    setIsMobileOpen(false);
  }, [pathname]);

  if (!mounted) {
    return (
      <div className="flex h-screen w-screen bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 justify-center items-center">
        <div className="w-6 h-6 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 antialiased font-sans overflow-hidden selection:bg-indigo-500/20 selection:text-indigo-600 dark:selection:bg-indigo-500/30 dark:selection:text-indigo-200 transition-colors duration-200">
      {/* Desktop Sidebar */}
      <div className="hidden md:block">
        <AdminSidebar admin={admin} onOpenSearch={() => setIsSearchOpen(true)} />
      </div>

      {/* Mobile Drawer */}
      {isMobileOpen && (
        <div
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm md:hidden flex"
          onClick={() => setIsMobileOpen(false)}
        >
          <div
            className="w-64 h-full bg-white dark:bg-zinc-950 border-r border-zinc-200 dark:border-zinc-800 flex flex-col animate-in slide-in-from-left duration-200 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="h-14 px-4 border-b border-zinc-200 dark:border-zinc-800/80 flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                Admin Navigation
              </span>
              <button
                onClick={() => setIsMobileOpen(false)}
                className="p-1.5 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-md text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto">
              <AdminSidebar
                admin={admin}
                onOpenSearch={() => {
                  setIsMobileOpen(false);
                  setIsSearchOpen(true);
                }}
                onCloseMobile={() => setIsMobileOpen(false)}
              />
            </div>
          </div>
        </div>
      )}

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 bg-zinc-50 dark:bg-zinc-950">
        {/* Top Minimal Admin Bar */}
        <header className="h-14 border-b border-zinc-200 dark:border-zinc-800/60 bg-white/80 dark:bg-zinc-950/80 backdrop-blur-md px-4 sm:px-6 flex items-center justify-between shrink-0 z-10">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setIsMobileOpen(true)}
              className="p-1.5 -ml-1.5 md:hidden hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200"
            >
              <Menu className="w-5 h-5" />
            </button>
            <div className="flex items-center gap-2 text-xs">
              <span className="text-zinc-400 dark:text-zinc-500 hidden sm:inline">Founder Control Center</span>
              <span className="text-zinc-300 dark:text-zinc-700 hidden sm:inline">/</span>
              <span className="font-semibold text-zinc-900 dark:text-zinc-200 capitalize">
                {pathname === '/admin'
                  ? 'Overview'
                  : pathname.split('/')[2]?.replace('-', ' ') || 'Admin'}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            {/* Search Button */}
            <button
              onClick={() => setIsSearchOpen(true)}
              className="flex items-center gap-2 px-2.5 py-1.5 bg-zinc-100 dark:bg-zinc-900/80 hover:bg-zinc-200/70 dark:hover:bg-zinc-900 border border-zinc-200 dark:border-zinc-800/80 rounded-lg text-xs text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200 transition-colors"
            >
              <Search className="w-3.5 h-3.5 text-zinc-400 dark:text-zinc-500" />
              <span className="hidden sm:inline">Search</span>
              <kbd className="hidden sm:inline-block px-1 py-0.2 text-[9px] font-mono text-zinc-500 dark:text-zinc-500 bg-white dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 rounded shadow-xs">
                ⌘K
              </kbd>
            </button>

            {/* Live Indicator */}
            <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-emerald-500/10 border border-emerald-500/20 text-[11px] font-mono text-emerald-600 dark:text-emerald-400">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              <span>LIVE</span>
            </div>

            {/* Theme Toggle Button */}
            <ThemeToggle />
          </div>
        </header>

        {/* Scrollable Page Body */}
        <main className="flex-1 overflow-y-auto scroll-smooth">
          <div className="max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8 space-y-6">
            {children}
          </div>
        </main>
      </div>

      {/* Global Admin Search Modal */}
      <AdminSearchModal isOpen={isSearchOpen} onClose={() => setIsSearchOpen(false)} />
    </div>
  );
}
