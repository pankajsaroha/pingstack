'use client';

import { useState, useEffect } from 'react';
import { Sidebar } from '@/components/Sidebar';
import { Menu, X } from 'lucide-react';

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem('sidebar-collapsed');
    if (saved !== null) setIsCollapsed(saved === 'true');
    setMounted(true);
  }, []);

  const toggleCollapse = () => {
    const newState = !isCollapsed;
    setIsCollapsed(newState);
    localStorage.setItem('sidebar-collapsed', String(newState));
  };

  if (!mounted) return null;

  return (
    <div className="flex h-screen bg-[#050505] text-white overflow-hidden relative selection:bg-white selection:text-black">
      {/* Ambient background glows */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden z-0">
        <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] rounded-full bg-blue-600/5 blur-[120px]" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] rounded-full bg-indigo-600/5 blur-[120px]" />
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
            className="w-64 h-full bg-[#0a0a0a] border-r border-white/5 shadow-2xl flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
             <div className="flex justify-end p-4 border-b border-white/5">
               <button onClick={() => setIsMobileMenuOpen(false)} className="p-1 hover:bg-white/5 rounded-lg">
                 <X className="w-6 h-6 text-white/50 hover:text-white" />
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
        <header className="md:hidden h-16 border-b border-white/5 bg-[#0a0a0a]/60 backdrop-blur-xl px-6 flex items-center justify-between shrink-0 z-50">
           <div className="flex items-center space-x-2">
             <div className="bg-white p-1.5 rounded-lg">
                <svg className="w-5 h-5 text-black" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                </svg>
             </div>
             <span className="font-black text-lg tracking-tight text-white">PingStack</span>
           </div>
           <button onClick={() => setIsMobileMenuOpen(true)} className="p-1 hover:bg-white/5 rounded-lg">
              <Menu className="w-6 h-6 text-white/70 hover:text-white" />
           </button>
        </header>

        <main className="flex-1 overflow-y-auto relative scroll-smooth">
          <div className="max-w-6xl mx-auto p-4 sm:p-6 md:p-8 mt-2 relative z-10">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
