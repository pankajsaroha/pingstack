'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { LogoIcon } from './Logo';

export function LandingNav({ onOpenAuth }: { onOpenAuth: (type: 'login' | 'register' | 'forgot') => void }) {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <nav className={`fixed top-0 inset-x-0 z-50 transition-all duration-500 border-b ${
      scrolled 
        ? 'bg-black/50 backdrop-blur-2xl border-white/5 py-4 shadow-[0_10px_50px_rgba(0,0,0,0.4)]' 
        : 'bg-transparent border-transparent py-6'
    }`}>
      <div className="max-w-7xl mx-auto px-6 flex items-center justify-between">
        <Link href="/" className="flex items-center space-x-3 group">
          <LogoIcon bgClass="bg-white" iconClass="text-black" />
          <span className="text-lg font-black tracking-tighter text-white transition-all group-hover:opacity-80">PingStack</span>
        </Link>
        
        <div className="flex items-center space-x-8">
          <div className="hidden md:flex items-center space-x-8 mr-6">
            <Link href="/docs" className="text-[10px] font-black uppercase tracking-[0.2em] text-white/40 hover:text-white transition-all hover:scale-105">Docs</Link>
            <Link href="/pricing" className="text-[10px] font-black uppercase tracking-[0.2em] text-white/40 hover:text-white transition-all hover:scale-105">Pricing</Link>
            <Link href="/contact" className="text-[10px] font-black uppercase tracking-[0.2em] text-white/40 hover:text-white transition-all hover:scale-105">Support</Link>
          </div>

          <div className="flex items-center space-x-4">
            <button 
              onClick={() => onOpenAuth('login')}
              className="text-xs font-black uppercase tracking-[0.2em] text-white/60 hover:text-white transition-colors px-4 cursor-pointer"
            >
              Sign In
            </button>
            <button 
              onClick={() => onOpenAuth('register')}
              className="px-6 py-2.5 bg-white text-black text-xs font-black uppercase tracking-[0.2em] rounded-full hover:bg-neutral-100 hover:scale-[1.03] active:scale-[0.97] transition-all shadow-[0_0_30px_rgba(255,255,255,0.15)] cursor-pointer"
            >
              Get Started
            </button>
          </div>
        </div>
      </div>
    </nav>
  );
}
