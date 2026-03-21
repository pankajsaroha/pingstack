'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { Home, Users, Folder, LayoutTemplate, Send, LogOut, MessageSquare, ChevronLeft, ChevronRight, Menu } from 'lucide-react';

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
    router.push('/login');
  };

  return (
    <div className={`transition-all duration-300 ease-in-out ${isCollapsed ? 'w-20' : 'w-64'} border-r border-gray-200/60 bg-white/80 backdrop-blur-md h-screen flex flex-col pt-6 pb-4 shadow-[4px_0_24px_rgba(0,0,0,0.02)] z-30 relative shrink-0`}>
      <div className={`px-6 mb-8 flex items-center justify-between ${isCollapsed ? 'px-4 flex-col' : ''}`}>
        <div className="flex items-center space-x-2">
           <div className="bg-black p-1.5 rounded-lg shadow-sm shrink-0">
             <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
               <path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
             </svg>
           </div>
           {!isCollapsed && (
             <span className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-gray-900 to-gray-600 tracking-tight whitespace-nowrap">
               PingStack
             </span>
           )}
        </div>
        
        <button 
          onClick={onToggleCollapse}
          className={`p-1.5 hover:bg-gray-100 rounded-lg text-gray-400 hover:text-gray-900 transition-colors ${isCollapsed ? 'mt-4' : ''}`}
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

      <div className={`px-4 mt-auto ${isCollapsed ? 'px-2' : ''}`}>
        <button
          onClick={handleLogout}
          title={isCollapsed ? 'Logout' : ''}
          className={`flex items-center w-full py-2.5 text-sm font-medium text-gray-600 rounded-xl hover:bg-red-50 hover:text-red-600 transition-colors group ${isCollapsed ? 'justify-center px-0' : 'px-3'}`}
        >
          <LogOut className={`flex-shrink-0 h-4 w-4 text-gray-400 group-hover:text-red-500 transition-colors ${isCollapsed ? 'mx-auto' : 'mr-3'}`} />
          {!isCollapsed && <span className="whitespace-nowrap">Logout</span>}
        </button>
      </div>
    </div>
  );
}
