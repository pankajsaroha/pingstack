'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Sidebar } from '@/components/Sidebar';
import { Menu, X, ArrowLeft } from 'lucide-react';
import { LogoIcon } from '@/components/Logo';

export default function TermsOfService() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const token = document.cookie.split('; ').find(row => row.startsWith('token='));
    setIsLoggedIn(!!token);
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

  const Content = () => (
    <div className="max-w-4xl mx-auto py-8">
      <div className="text-center mb-12">
        <div className="flex justify-center mb-6">
           <LogoIcon bgClass="bg-gray-900" />
        </div>
        <h1 className="text-4xl font-black text-gray-900 tracking-tight mb-4">Terms of Service</h1>
        <p className="text-gray-500 font-medium uppercase text-[10px] tracking-widest">Last updated: April 25, 2026</p>
      </div>

      <div className="bg-white/50 backdrop-blur-sm border border-gray-100 p-8 sm:p-12 rounded-[2.5rem] shadow-sm space-y-10 text-gray-600 leading-relaxed">
        <section>
          <h2 className="text-2xl font-bold text-gray-900 mb-4 flex items-center">
            <span className="w-8 h-8 bg-gray-100 rounded-lg flex items-center justify-center text-sm mr-3">1</span>
            Acceptance of Terms
          </h2>
          <p>
            By accessing or using PingStack, you agree to be bound by these Terms of Service and all applicable laws and regulations. If you do not agree with any of these terms, you are prohibited from using or accessing this site.
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-bold text-gray-900 mb-4 flex items-center">
            <span className="w-8 h-8 bg-gray-100 rounded-lg flex items-center justify-center text-sm mr-3">2</span>
            Use License
          </h2>
          <p>
            Permission is granted to temporarily use the services provided by PingStack for personal or commercial business communication. This is the grant of a license, not a transfer of title, and under this license, you may not:
          </p>
          <ul className="list-disc list-inside mt-4 space-y-2 ml-4">
            <li>Modify or copy the materials;</li>
            <li>Use the materials for any illegal purpose;</li>
            <li>Attempt to decompile or reverse engineer any software contained on PingStack;</li>
            <li>Transfer the materials to another person or &quot;mirror&quot; the materials on any other server.</li>
          </ul>
        </section>

        <section>
          <h2 className="text-2xl font-bold text-gray-900 mb-4 flex items-center">
            <span className="w-8 h-8 bg-gray-100 rounded-lg flex items-center justify-center text-sm mr-3">3</span>
            Meta &amp; WhatsApp Compliance
          </h2>
          <p>
            Use of PingStack requires strict adherence to the WhatsApp Business Solution Terms and Meta Platform Policies. Any violation of Meta&apos;s terms will result in immediate termination of your PingStack account.
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-bold text-gray-900 mb-4 flex items-center">
            <span className="w-8 h-8 bg-gray-100 rounded-lg flex items-center justify-center text-sm mr-3">4</span>
            Disclaimer
          </h2>
          <p>
            The materials on PingStack are provided on an &apos;as is&apos; basis. PingStack makes no warranties, expressed or implied, and hereby disclaims and negates all other warranties including, without limitation, implied warranties or conditions of merchantability, fitness for a particular purpose, or non-infringement of intellectual property or other violation of rights.
          </p>
        </section>

        <section className="bg-blue-600 rounded-3xl p-8 text-white/90 shadow-xl shadow-blue-600/20">
          <h2 className="text-2xl font-bold text-white mb-4 flex items-center">
             Fair Use Policy
          </h2>
          <p className="text-blue-50">
            PingStack is built for professional, high-quality business communication. We have a zero-tolerance policy for spam. Accounts found sending unsolicited marketing messages or violating WhatsApp's quality standards will be suspended without refund.
          </p>
        </section>
      </div>

      <div className="mt-16 text-center">
        <Link 
          href={isLoggedIn ? "/dashboard" : "/"} 
          className="inline-flex items-center space-x-2 text-sm font-bold text-gray-400 hover:text-black transition-colors py-2 px-4 rounded-xl hover:bg-gray-100"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to {isLoggedIn ? 'Dashboard' : 'Home'}</span>
        </Link>
      </div>
    </div>
  );

  if (isLoggedIn) {
    return (
      <div className="flex h-screen bg-gray-50 overflow-hidden">
        <div className="hidden md:block">
          <Sidebar collapsed={isCollapsed} onToggleCollapse={toggleCollapse} />
        </div>
        
        {isMobileMenuOpen && (
          <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[100] md:hidden" onClick={() => setIsMobileMenuOpen(false)}>
            <div className="w-64 h-full bg-white shadow-2xl" onClick={e => e.stopPropagation()}>
               <div className="flex justify-end p-4">
                 <button onClick={() => setIsMobileMenuOpen(false)}><X className="w-6 h-6 text-gray-400" /></button>
               </div>
               <Sidebar collapsed={false} onToggleCollapse={() => {}} />
            </div>
          </div>
        )}

        <div className="flex-1 flex flex-col min-w-0 bg-white">
          <header className="md:hidden h-16 border-b border-gray-100 bg-white px-6 flex items-center justify-between z-50">
             <div className="flex items-center space-x-2 font-bold">PingStack</div>
             <button onClick={() => setIsMobileMenuOpen(true)}>
                <Menu className="w-6 h-6 text-gray-600" />
             </button>
          </header>

          <main className="flex-1 overflow-y-auto px-6 py-10 md:px-12">
            <Content />
          </main>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-16 px-4 sm:px-6 lg:px-8">
      <Content />
    </div>
  );
}
