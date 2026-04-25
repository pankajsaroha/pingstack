'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { LogoIcon } from './Logo';

export function LandingNav({ onOpenAuth }: { onOpenAuth: (type: 'login' | 'register') => void }) {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <nav className={`fixed top-0 inset-x-0 z-50 transition-all duration-500 border-b ${scrolled ? 'bg-black/80 backdrop-blur-xl border-white/5 py-4' : 'bg-transparent border-transparent py-6'}`}>
      <div className="max-w-7xl mx-auto px-6 flex items-center justify-between">
        <Link href="/" className="flex items-center space-x-3 group">
          <LogoIcon bgClass="bg-white" iconClass="text-black" />
          <span className="text-lg font-black tracking-tighter text-white">PingStack</span>
        </Link>
        
        <div className="flex items-center space-x-Main">
          <div className="hidden md:flex items-center space-x-8 mr-10">
            <Link href="/docs" className="text-[10px] font-black uppercase tracking-[0.2em] text-white/40 hover:text-white transition-colors">Docs</Link>
            <Link href="/pricing" className="text-[10px] font-black uppercase tracking-[0.2em] text-white/40 hover:text-white transition-colors">Pricing</Link>
            <Link href="/contact" className="text-[10px] font-black uppercase tracking-[0.2em] text-white/40 hover:text-white transition-colors">Support</Link>
          </div>

          <div className="flex items-center space-x-4">
            <button 
              onClick={() => onOpenAuth('login')}
              className="text-xs font-black uppercase tracking-[0.2em] text-white/60 hover:text-white transition-colors px-4"
            >
              Sign In
            </button>
            <button 
              onClick={() => onOpenAuth('register')}
              className="px-6 py-2.5 bg-white text-black text-xs font-black uppercase tracking-[0.2em] rounded-full hover:scale-105 active:scale-95 transition-all shadow-xl shadow-white/10"
            >
              Get Started
            </button>
          </div>
        </div>
      </div>
    </nav>
  );
}
