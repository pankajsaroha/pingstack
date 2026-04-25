'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { Home, Users, Folder, LayoutTemplate, Send, LogOut, MessageSquare, ChevronLeft, ChevronRight, Menu } from 'lucide-react';
import { LogoIcon } from './Logo';

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

  const handleLogout = () => {
    document.cookie = 'token=; Max-Age=0; path=/;';
    router.push('/');
  };

  return (
    <div className={`transition-all duration-300 ease-in-out ${isCollapsed ? 'w-20' : 'w-64'} border-r border-gray-200/60 bg-white/80 backdrop-blur-md h-screen flex flex-col pt-6 pb-4 shadow-[4px_0_24px_rgba(0,0,0,0.02)] z-30 relative shrink-0`}>
      <div className={`px-6 mb-8 flex items-center justify-between ${isCollapsed ? 'px-4 flex-col' : ''}`}>
        <div className="flex items-center space-x-2">
           <LogoIcon />
           {!isCollapsed && (
             <span className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-gray-900 to-gray-600 tracking-tight whitespace-nowrap">
               PingStack
             </span>
           )}
        </div>
        
        <button 
          onClick={onToggleCollapse}
          className={`hidden md:flex p-1.5 hover:bg-gray-100 rounded-lg text-gray-400 hover:text-gray-900 transition-colors ${isCollapsed ? 'mt-4' : ''}`}
        >
          {isCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
        </button>
      </div>

      <nav className={`flex-1 px-4 space-y-1.5 ${isCollapsed ? 'px-2' : ''}`}>
        {navItems.map((item) => {
          const isActive = pathname.startsWith(item.href);
          return (
            <Link
              key={item.name}
              href={item.href}
              title={isCollapsed ? item.name : ''}
              className={`flex items-center py-2.5 text-sm font-medium rounded-xl transition-all duration-200 group ${
                isActive 
                  ? 'bg-gray-900 text-white shadow-sm' 
                  : 'text-gray-600 hover:bg-gray-100/80 hover:text-gray-900'
              } ${isCollapsed ? 'justify-center px-0' : 'px-3'}`}
            >
              <item.icon className={`flex-shrink-0 h-4 w-4 transition-colors ${isActive ? 'text-gray-300' : 'text-gray-400 group-hover:text-gray-600'} ${isCollapsed ? 'mx-auto' : 'mr-3'}`} />
              {!isCollapsed && <span className="whitespace-nowrap">{item.name}</span>}
            </Link>
          );
        })}
      </nav>

      <div className={`px-4 mt-auto mb-2 ${isCollapsed ? 'px-2' : ''}`}>
        <button
          onClick={handleLogout}
          title={isCollapsed ? 'Logout' : ''}
          className={`flex items-center w-full py-2.5 text-sm font-medium text-gray-600 rounded-xl hover:bg-red-50 hover:text-red-600 transition-colors group ${isCollapsed ? 'justify-center px-0' : 'px-3'}`}
        >
          <LogOut className={`flex-shrink-0 h-4 w-4 text-gray-400 group-hover:text-red-500 transition-colors ${isCollapsed ? 'mx-auto' : 'mr-3'}`} />
          {!isCollapsed && <span className="whitespace-nowrap">Logout</span>}
        </button>
        
        {!isCollapsed && (
          <div className="mt-4 px-3 mb-4">
            <Link 
              href="/privacy" 
              className={`flex items-center text-[10px] font-bold transition-all duration-200 uppercase tracking-widest px-3 py-2 rounded-xl ${
                pathname === '/privacy' 
                  ? 'bg-gray-900 text-white shadow-md' 
                  : 'text-gray-400 hover:text-gray-900 hover:bg-gray-100'
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
