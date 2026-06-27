'use client';

import Link from 'next/link';
import { LogoIcon } from './Logo';

export function LandingFooter() {
  return (
    <footer className="py-20 px-6 border-t border-white/5 bg-[#020202]">
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between space-y-12 md:space-y-0 text-white">
        <div>
          <div className="flex items-center space-x-3 mb-4 font-black">
            <LogoIcon bgClass="bg-white" iconClass="text-black" />
            <span className="text-lg font-black tracking-tighter">PingStack</span>
          </div>
          <p className="text-xs font-bold text-white/20 tracking-wider">© 2026 PingStack Inc. All rights reserved.</p>
        </div>
        
        <div className="flex flex-wrap justify-center gap-8 md:gap-10">
          <Link href="/docs" className="text-[10px] font-black uppercase tracking-[0.2em] text-white/40 hover:text-white transition-all hover:translate-y-[-1px]">Documentation</Link>
          <Link href="/pricing" className="text-[10px] font-black uppercase tracking-[0.2em] text-white/40 hover:text-white transition-all hover:translate-y-[-1px]">Pricing</Link>
          <Link href="/privacy" className="text-[10px] font-black uppercase tracking-[0.2em] text-white/40 hover:text-white transition-all hover:translate-y-[-1px]">Privacy Policy</Link>
          <Link href="/terms" className="text-[10px] font-black uppercase tracking-[0.2em] text-white/40 hover:text-white transition-all hover:translate-y-[-1px]">Terms of Service</Link>
          <Link href="/contact" className="text-[10px] font-black uppercase tracking-[0.2em] text-white/40 hover:text-white transition-all hover:translate-y-[-1px]">Support</Link>
        </div>
      </div>
    </footer>
  );
}
