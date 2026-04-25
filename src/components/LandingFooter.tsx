'use client';

import Link from 'next/link';
import { LogoIcon } from './Logo';

export function LandingFooter() {
  return (
    <footer className="py-20 px-6 border-t border-white/5 bg-[#050505]">
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between space-y-12 md:space-y-0 text-white">
        <div>
          <div className="flex items-center space-x-3 mb-6 font-black">
            <LogoIcon bgClass="bg-white" iconClass="text-black" />
            <span className="text-lg font-black tracking-tighter">PingStack</span>
          </div>
          <p className="text-sm font-bold text-white/30 tracking-tight">© 2026 PingStack Inc. All rights reserved.</p>
        </div>
        
        <div className="flex flex-wrap justify-center gap-10">
          <Link href="/docs" className="text-xs font-black uppercase tracking-[0.2em] text-white/40 hover:text-white transition-colors">Documentation</Link>
          <Link href="/pricing" className="text-xs font-black uppercase tracking-[0.2em] text-white/40 hover:text-white transition-colors">Pricing</Link>
          <Link href="/privacy" className="text-xs font-black uppercase tracking-[0.2em] text-white/40 hover:text-white transition-colors">Privacy Policy</Link>
          <Link href="/contact" className="text-xs font-black uppercase tracking-[0.2em] text-white/40 hover:text-white transition-colors">Support</Link>
        </div>
      </div>
    </footer>
  );
}
