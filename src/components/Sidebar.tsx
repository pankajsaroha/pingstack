'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  MessageSquare,
  Users,
  Folder,
  LayoutTemplate,
  Send,
  LogOut,
  ChevronRight,
  Shield,
  MessageCircleQuestion,
} from 'lucide-react';
import { LogoIcon } from './Logo';
import { ThemeToggle } from './ThemeToggle';
import { setSupabaseSession } from '@/lib/db';
import { useCallback } from 'react';

const navItems = [
  { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard, tourId: 'tour-overview-nav' },
  { name: 'Inbox', href: '/inbox', icon: MessageSquare, tourId: 'tour-inbox' },
  { name: 'Contacts', href: '/contacts', icon: Users, tourId: 'tour-contacts' },
  { name: 'Groups', href: '/groups', icon: Folder, tourId: 'tour-groups' },
  { name: 'Templates', href: '/templates', icon: LayoutTemplate, tourId: 'tour-templates' },
  { name: 'Campaigns', href: '/campaigns', icon: Send, tourId: 'tour-campaigns' },
];

export function Sidebar({ 
  collapsed: isCollapsed, 
  onToggleCollapse,
  onItemClick,
  onFeedbackClick,
  onStartTour,
}: { 
  collapsed: boolean; 
  onToggleCollapse: () => void;
  onItemClick?: (href: string) => void;
  onFeedbackClick?: () => void;
  onStartTour?: () => void;
}) {
  const pathname = usePathname();

  const handleLogout = useCallback(async () => {
    await fetch('/api/auth/logout', { method: 'POST' }).catch(() => null);
    await setSupabaseSession(null);
    window.location.replace('/login');
  }, []);

  return (
    <aside className={`group/sidebar transition-all duration-200 ease-in-out ${
      isCollapsed ? 'w-16' : 'w-64'
    } bg-white dark:bg-zinc-950 border-r border-zinc-200 dark:border-zinc-800/80 h-screen flex flex-col justify-between shrink-0 select-none text-zinc-700 dark:text-zinc-300 relative z-30`}>
      
      {/* Collapse/Expand Floating Button */}
      <button 
        onClick={onToggleCollapse}
        className="absolute top-4 -right-3 hidden md:flex w-6 h-6 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-full items-center justify-center text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100 hover:scale-110 active:scale-95 shadow-xs transition-all z-50 cursor-pointer md:opacity-100 lg:opacity-0 lg:group-hover/sidebar:opacity-100"
        aria-label={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
      >
        <ChevronRight className={`w-3.5 h-3.5 transition-transform duration-200 ${
          isCollapsed ? 'rotate-0' : 'rotate-180'
        }`} />
      </button>

      {/* Top Header & Navigation */}
      <div className="flex flex-col">
        {/* Brand Header */}
        <div className={`h-14 border-b border-zinc-200 dark:border-zinc-800/60 flex items-center ${
          isCollapsed ? 'px-3 justify-center' : 'px-5 justify-between'
        }`}>
          <Link href="/dashboard" className="flex items-center gap-2.5 group/logo cursor-pointer">
            <LogoIcon bgClass="bg-zinc-900 dark:bg-white group-hover/logo:scale-105 transition-transform duration-200" iconClass="text-white dark:text-zinc-950" />
            {!isCollapsed && (
              <div className="flex items-center gap-1.5">
                <span className="font-bold text-sm tracking-tight text-zinc-900 dark:text-white">
                  PingStack
                </span>
                <span className="px-1.5 py-0.5 text-[9px] font-mono font-semibold tracking-wider uppercase rounded bg-indigo-500/10 border border-indigo-500/20 text-indigo-600 dark:text-indigo-400">
                  Workspace
                </span>
              </div>
            )}
          </Link>
        </div>

        {/* Navigation list */}
        <nav className={`py-3 space-y-0.5 ${isCollapsed ? 'px-2' : 'px-2.5'}`}>
          {navItems.map((item) => {
            const isActive = pathname.startsWith(item.href);
            const Icon = item.icon;
            return (
              <Link
                key={item.name}
                href={item.href}
                data-tour={item.tourId}
                onClick={() => onItemClick?.(item.href)}
                title={isCollapsed ? item.name : ''}
                className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-medium transition-all group ${
                  isActive 
                    ? 'bg-zinc-900 dark:bg-zinc-800 text-white font-semibold shadow-xs' 
                    : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-zinc-100 dark:hover:bg-zinc-900/70'
                } ${isCollapsed ? 'justify-center px-0' : ''}`}
              >
                <Icon className={`h-4 w-4 shrink-0 transition-colors ${
                  isActive 
                    ? 'text-indigo-400' 
                    : 'text-zinc-500 dark:text-zinc-400 group-hover:text-zinc-900 dark:group-hover:text-zinc-200'
                }`} />
                {!isCollapsed && <span className="whitespace-nowrap">{item.name}</span>}
              </Link>
            );
          })}
        </nav>
      </div>

      {/* Footer Items */}
      <div className={`p-3 border-t border-zinc-200 dark:border-zinc-800/60 flex flex-col gap-2 ${
        isCollapsed ? 'px-2 items-center' : ''
      }`}>
        {/* Help / Tour shortcut button */}
        {onStartTour && !isCollapsed && (
          <button
            type="button"
            onClick={onStartTour}
            className="flex items-center justify-between px-3 py-1.5 bg-zinc-50 dark:bg-zinc-900/60 hover:bg-zinc-100 dark:hover:bg-zinc-900 border border-zinc-200 dark:border-zinc-800/60 rounded-lg text-xs font-medium text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200 transition-colors cursor-pointer"
          >
            <span className="flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-indigo-500" />
              <span>Workspace Tour</span>
            </span>
            <span className="text-[10px] font-mono text-zinc-400">Guide</span>
          </button>
        )}

        {/* User / Actions Card */}
        <div className={`flex items-center justify-between p-2 rounded-lg bg-zinc-50 dark:bg-zinc-900/30 border border-zinc-200 dark:border-zinc-800/40 ${
          isCollapsed ? 'flex-col gap-2 p-1.5' : ''
        }`}>
          {!isCollapsed ? (
            <div className="flex items-center gap-2 min-w-0">
              <div className="w-6 h-6 rounded-md bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-600 dark:text-indigo-400 shrink-0">
                <Shield className="w-3 h-3" />
              </div>
              <div className="min-w-0">
                <div className="text-xs font-semibold text-zinc-800 dark:text-zinc-200 truncate">Workspace</div>
                <div className="text-[10px] font-mono text-zinc-400 truncate">Cloud API Live</div>
              </div>
            </div>
          ) : null}

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

        {!isCollapsed && (
          <div className="flex items-center justify-between px-1 pt-1 text-[10px] text-zinc-400">
            <Link 
              href="/privacy" 
              onClick={() => onItemClick?.('/privacy')}
              className="hover:text-zinc-600 dark:hover:text-zinc-300 transition-colors"
            >
              Privacy Policy
            </Link>
            <span className="font-mono">v2.4</span>
          </div>
        )}
      </div>
    </aside>
  );
}
