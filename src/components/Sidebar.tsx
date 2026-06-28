'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { Home, Users, Folder, LayoutTemplate, Send, LogOut, MessageSquare, ChevronRight } from 'lucide-react';
import { LogoIcon } from './Logo';
import { ThemeToggle } from './ThemeToggle';
import { setSupabaseSession } from '@/lib/db';

const navItems = [
  { name: 'Dashboard', href: '/dashboard', icon: Home },
  { name: 'Inbox', href: '/inbox', icon: MessageSquare },
  { name: 'Contacts', href: '/contacts', icon: Users },
  { name: 'Groups', href: '/groups', icon: Folder },
  { name: 'Templates', href: '/templates', icon: LayoutTemplate },
  { name: 'Campaigns', href: '/campaigns', icon: Send },
];

export function Sidebar({ 
  collapsed: isCollapsed, 
  onToggleCollapse 
}: { 
  collapsed: boolean; 
  onToggleCollapse: () => void 
}) {
  const pathname = usePathname();
  const router = useRouter();

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' }).catch(() => null);
    document.cookie = 'token=; Max-Age=0; path=/;';
    document.cookie = 'supabase_refresh_token=; Max-Age=0; path=/;';
    await setSupabaseSession(null);
    router.push('/');
  };

  return (
    <div className={`group/sidebar transition-all duration-300 ease-in-out ${
      isCollapsed ? 'w-20' : 'w-64'
    } border-r border-glass-border bg-glass-card/50 backdrop-blur-2xl h-screen flex flex-col pt-6 pb-4 shadow-sm z-30 relative shrink-0`}>
      
      {/* Collapse/Expand Floating Button */}
      <button 
        onClick={onToggleCollapse}
        className="absolute top-[38px] -right-3 hidden md:flex w-6 h-6 bg-bg border border-glass-border rounded-full items-center justify-center text-muted hover:text-fg hover:border-fg/30 hover:scale-110 active:scale-95 shadow-sm hover:shadow-md transition-all duration-300 z-50 cursor-pointer opacity-0 group-hover/sidebar:opacity-100"
        aria-label={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
      >
        <ChevronRight className={`w-3.5 h-3.5 transition-transform duration-500 ease-out ${
          isCollapsed ? 'rotate-0' : 'rotate-180'
        }`} />
      </button>

      {/* Header Info */}
      <div className={`px-6 mb-8 flex items-center justify-between ${isCollapsed ? 'px-4 flex-col gap-4' : ''}`}>
        <div className="flex items-center space-x-3">
           <LogoIcon bgClass="bg-fg" iconClass="text-bg" />
           {!isCollapsed && (
             <span className="text-xl font-black text-fg tracking-tighter whitespace-nowrap">
               PingStack
             </span>
           )}
        </div>
        
        <div className="flex items-center space-x-2">
          {!isCollapsed && <ThemeToggle />}
        </div>
        {isCollapsed && <ThemeToggle />}
      </div>

      {/* Navigation list */}
      <nav className={`flex-1 px-4 space-y-1.5 ${isCollapsed ? 'px-2' : ''}`}>
        {navItems.map((item) => {
          const isActive = pathname.startsWith(item.href);
          return (
            <Link
              key={item.name}
              href={item.href}
              title={isCollapsed ? item.name : ''}
              className={`flex items-center py-2.5 text-sm font-bold rounded-xl transition-all duration-300 group ${
                isActive 
                  ? 'bg-fg text-bg shadow-md scale-[1.02]' 
                  : 'text-muted hover:bg-glass-card hover:text-fg'
              } ${isCollapsed ? 'justify-center px-0' : 'px-3'}`}
            >
              <item.icon className={`flex-shrink-0 h-4 w-4 transition-colors ${
                isActive ? 'text-bg' : 'text-muted group-hover:text-fg'
              } ${isCollapsed ? 'mx-auto' : 'mr-3'}`} />
              {!isCollapsed && <span className="whitespace-nowrap tracking-wide">{item.name}</span>}
            </Link>
          );
        })}
      </nav>

      {/* Footer Items */}
      <div className={`px-4 mt-auto mb-2 ${isCollapsed ? 'px-2' : ''}`}>
        <button
          onClick={handleLogout}
          title={isCollapsed ? 'Logout' : ''}
          className={`flex items-center w-full py-2.5 text-sm font-bold text-muted rounded-xl hover:bg-red-500/10 hover:text-red-400 transition-all cursor-pointer group ${
            isCollapsed ? 'justify-center px-0' : 'px-3'
          }`}
        >
          <LogOut className={`flex-shrink-0 h-4 w-4 text-muted group-hover:text-red-400 transition-colors ${
            isCollapsed ? 'mx-auto' : 'mr-3'
          }`} />
          {!isCollapsed && <span className="whitespace-nowrap tracking-wide">Logout</span>}
        </button>
        
        {!isCollapsed && (
          <div className="mt-4 px-3 mb-4">
            <Link 
              href="/privacy" 
              className={`flex items-center text-[9px] font-black transition-all duration-300 uppercase tracking-widest px-3 py-2 rounded-xl ${
                pathname === '/privacy' 
                  ? 'bg-fg text-bg shadow-md' 
                  : 'text-muted hover:text-fg hover:bg-glass-card'
              }`}
            >
              Privacy Policy
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
