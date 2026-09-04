'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  Building2,
  MessageSquare,
  Megaphone,
  CreditCard,
  BarChart3,
  MessageCircleQuestion,
  Activity,
  Settings,
  ArrowUpRight,
  Shield,
  Search,
  LogOut,
} from 'lucide-react';
import { AdminUser } from '@/lib/server/admin-auth';
import { ThemeToggle } from '@/components/ThemeToggle';
import { LogoIcon } from '@/components/Logo';

interface AdminSidebarProps {
  admin: AdminUser;
  onOpenSearch: () => void;
  onCloseMobile?: () => void;
}

export function AdminSidebar({ admin, onOpenSearch, onCloseMobile }: AdminSidebarProps) {
  const pathname = usePathname();

  const navItems = [
    { label: 'Overview', href: '/admin', icon: LayoutDashboard, exact: true },
    { label: 'Businesses', href: '/admin/businesses', icon: Building2 },
    { label: 'Messages', href: '/admin/messages', icon: MessageSquare },
    { label: 'Campaigns', href: '/admin/campaigns', icon: Megaphone },
    { label: 'Subscriptions', href: '/admin/subscriptions', icon: CreditCard },
    { label: 'Analytics', href: '/admin/analytics', icon: BarChart3 },
    { label: 'Feedback', href: '/admin/feedback', icon: MessageCircleQuestion },
    { label: 'System Health', href: '/admin/system', icon: Activity },
    { label: 'Settings & Audit', href: '/admin/settings', icon: Settings },
  ];

  const isActive = (item: { href: string; exact?: boolean }) => {
    if (item.exact) return pathname === item.href;
    return pathname.startsWith(item.href);
  };

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' }).catch(() => null);
    window.location.replace('/login');
  };

  return (
    <aside className="w-64 h-full bg-white dark:bg-zinc-950 border-r border-zinc-200 dark:border-zinc-800/80 flex flex-col justify-between shrink-0 select-none text-zinc-700 dark:text-zinc-300 transition-colors duration-200">
      {/* Top Header */}
      <div className="flex flex-col">
        {/* Brand */}
        <div className="h-14 px-5 border-b border-zinc-200 dark:border-zinc-800/60 flex items-center justify-between">
          <Link href="/admin" className="flex items-center gap-2.5 group">
            <LogoIcon bgClass="bg-zinc-900 dark:bg-white group-hover:scale-105 transition-transform duration-200" iconClass="text-white dark:text-zinc-950" />
            <div className="flex items-center gap-1.5">
              <span className="font-bold text-sm tracking-tight text-zinc-900 dark:text-white">PingStack</span>
              <span className="px-1.5 py-0.5 text-[9px] font-mono font-semibold tracking-wider uppercase rounded bg-indigo-500/10 border border-indigo-500/20 text-indigo-600 dark:text-indigo-400">
                Admin
              </span>
            </div>
          </Link>
        </div>

        {/* Quick Search Shortcut */}
        <div className="p-3">
          <button
            onClick={onOpenSearch}
            className="w-full flex items-center justify-between px-3 py-2 bg-zinc-100 dark:bg-zinc-900/80 hover:bg-zinc-200/70 dark:hover:bg-zinc-900 border border-zinc-200 dark:border-zinc-800/80 rounded-lg text-xs text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200 transition-colors cursor-pointer group"
          >
            <div className="flex items-center gap-2">
              <Search className="w-3.5 h-3.5 text-zinc-400 dark:text-zinc-500 group-hover:text-zinc-600 dark:group-hover:text-zinc-400" />
              <span>Search platform...</span>
            </div>
            <kbd className="px-1.5 py-0.5 text-[10px] font-mono text-zinc-500 dark:text-zinc-500 bg-white dark:bg-zinc-800/80 border border-zinc-300 dark:border-zinc-700/60 rounded shadow-2xs">
              ⌘K
            </kbd>
          </button>
        </div>

        {/* Navigation links */}
        <nav className="px-2 py-1 space-y-0.5">
          {navItems.map((item) => {
            const active = isActive(item);
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={onCloseMobile}
                className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-medium transition-all group ${
                  active
                    ? 'bg-zinc-900 dark:bg-zinc-800 text-white font-semibold shadow-xs'
                    : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-zinc-100 dark:hover:bg-zinc-900/70'
                }`}
              >
                <Icon
                  className={`w-4 h-4 shrink-0 transition-colors ${
                    active
                      ? 'text-indigo-400'
                      : 'text-zinc-500 dark:text-zinc-400 group-hover:text-zinc-900 dark:group-hover:text-zinc-200'
                  }`}
                />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>
      </div>

      {/* Bottom Footer Section */}
      <div className="p-3 border-t border-zinc-200 dark:border-zinc-800/60 flex flex-col gap-2">
        {/* Link back to customer workspace */}
        <Link
          href="/dashboard"
          className="flex items-center justify-between px-3 py-2 bg-zinc-50 dark:bg-zinc-900/60 hover:bg-zinc-100 dark:hover:bg-zinc-900 border border-zinc-200 dark:border-zinc-800/60 rounded-lg text-xs font-medium text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200 transition-colors"
        >
          <span className="truncate">Open Workspace App</span>
          <ArrowUpRight className="w-3.5 h-3.5 text-zinc-400 dark:text-zinc-500" />
        </Link>

        {/* Authenticated Admin Identity */}
        <div className="flex items-center justify-between px-3 py-2.5 rounded-lg bg-zinc-50 dark:bg-zinc-900/30 border border-zinc-200 dark:border-zinc-800/40">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-7 h-7 rounded-full bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-600 dark:text-indigo-400 shrink-0">
              <Shield className="w-3.5 h-3.5" />
            </div>
            <div className="min-w-0">
              <div className="text-xs font-semibold text-zinc-800 dark:text-zinc-200 truncate">{admin.name || 'Admin'}</div>
              <div className="text-[10px] font-mono text-zinc-500 truncate">{admin.email}</div>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <ThemeToggle className="p-1.5" />
            <button
              onClick={handleLogout}
              title="Log out"
              className="p-1.5 text-zinc-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-500/10 rounded-md transition-colors cursor-pointer"
            >
              <LogOut className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>
    </aside>
  );
}
