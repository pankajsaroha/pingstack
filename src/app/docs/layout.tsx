'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { Menu, Search, ArrowLeft, ArrowRight, ExternalLink } from 'lucide-react';
import { DocsSidebar } from '@/components/docs/DocsSidebar';
import { DocsSearchModal } from '@/components/docs/DocsSearchModal';
import { LandingNav } from '@/components/LandingNav';
import { LandingFooter } from '@/components/LandingFooter';
import { AuthModal } from '@/components/AuthModal';

export default function DocsLayout({ children }: { children: React.ReactNode }) {
  const [searchOpen, setSearchOpen] = useState(false);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [modalType, setModalType] = useState<'login' | 'register' | 'forgot' | null>(null);

  return (
    <div className="min-h-screen bg-bg text-fg selection:bg-indigo-500/30">
      {/* Top Navbar */}
      <header className="sticky top-0 z-40 w-full border-b border-zinc-200 dark:border-zinc-800/80 bg-white/80 dark:bg-zinc-950/80 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            {/* Mobile menu trigger */}
            <button
              onClick={() => setMobileSidebarOpen(true)}
              className="p-2 -ml-2 rounded-lg text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100 md:hidden"
            >
              <Menu className="w-5 h-5" />
            </button>

            {/* Logo & Docs badge */}
            <Link href="/" className="flex items-center space-x-2.5">
              <span className="text-lg font-black tracking-tight text-fg">PingStack</span>
              <span className="px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider rounded-full bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20">
                Developers
              </span>
            </Link>
          </div>

          {/* Quick Header Nav */}
          <div className="flex items-center space-x-4">
            <button
              onClick={() => setSearchOpen(true)}
              className="hidden sm:flex items-center space-x-2 px-3 py-1.5 rounded-lg bg-zinc-100 dark:bg-zinc-900 text-xs font-medium text-zinc-500 dark:text-zinc-400 hover:bg-zinc-200 dark:hover:bg-zinc-800 border border-zinc-200 dark:border-zinc-800 transition-colors"
            >
              <Search className="w-3.5 h-3.5" />
              <span>Search docs...</span>
              <kbd className="px-1.5 py-0.5 text-[10px] font-mono bg-zinc-200 dark:bg-zinc-800 rounded text-zinc-500">⌘K</kbd>
            </button>

            <Link
              href="/dashboard"
              className="hidden sm:inline-flex items-center px-3 py-1.5 text-xs font-semibold text-zinc-700 dark:text-zinc-300 hover:text-fg transition-colors"
            >
              Workspace
            </Link>

            <button
              onClick={() => setModalType('login')}
              className="px-3.5 py-1.5 rounded-lg text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 text-white transition-all shadow-xs"
            >
              Console Login
            </button>
          </div>
        </div>
      </header>

      {/* Main Body with Sticky Sidebar */}
      <div className="max-w-7xl mx-auto flex">
        <DocsSidebar
          onOpenSearch={() => setSearchOpen(true)}
          mobileOpen={mobileSidebarOpen}
          onCloseMobile={() => setMobileSidebarOpen(false)}
        />

        <main className="flex-1 min-w-0 px-6 sm:px-10 lg:px-12 py-10 max-w-4xl">
          {children}
        </main>
      </div>

      <DocsSearchModal
        isOpen={searchOpen}
        onClose={() => setSearchOpen(false)}
      />

      <AuthModal
        isOpen={modalType !== null}
        onClose={() => setModalType(null)}
        initialView={modalType === 'register' ? 'register' : 'login'}
      />
    </div>
  );
}
