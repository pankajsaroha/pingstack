'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Sidebar } from '@/components/Sidebar';
import { Menu, X, ArrowLeft } from 'lucide-react';

export default function PrivacyPolicy() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    // Check for token in cookies
    const token = document.cookie.split('; ').find(row => row.startsWith('token='));
    setIsLoggedIn(!!token);

    // Sidebar state
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
        <div className="w-12 h-12 bg-gray-900 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-xl rotate-3">
           <span className="text-white font-black text-xl">P</span>
        </div>
        <h1 className="text-4xl font-black text-gray-900 tracking-tight mb-4">Privacy Policy</h1>
        <p className="text-gray-500 font-medium">Last updated: March 19, 2026</p>
      </div>

      <div className="bg-white/50 backdrop-blur-sm border border-gray-100 p-8 sm:p-12 rounded-[2.5rem] shadow-sm space-y-10 text-gray-600 leading-relaxed">
        <section>
          <h2 className="text-2xl font-bold text-gray-900 mb-4 flex items-center">
            <span className="w-8 h-8 bg-gray-100 rounded-lg flex items-center justify-center text-sm mr-3">1</span>
            Introduction
          </h2>
          <p>
            Welcome to PingStack ("we," "our," or "us"). We are committed to protecting your privacy and ensuring that your personal data is handled in a safe and responsible manner. This Privacy Policy outlines how we collect, use, and protect information when you use our WhatsApp SaaS platform.
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-bold text-gray-900 mb-4 flex items-center">
            <span className="w-8 h-8 bg-gray-100 rounded-lg flex items-center justify-center text-sm mr-3">2</span>
            Information We Collect
          </h2>
          <p>To provide our services, we may collect the following types of information:</p>
          <ul className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-6">
            <li className="bg-white p-4 rounded-2xl border border-gray-50 shadow-sm">
              <strong className="text-gray-900 block mb-1">Account Info</strong>
              Email and password for your tenant account.
            </li>
            <li className="bg-white p-4 rounded-2xl border border-gray-50 shadow-sm">
              <strong className="text-gray-900 block mb-1">WhatsApp Data</strong>
              Meta API tokens and Phone Number IDs.
            </li>
            <li className="bg-white p-4 rounded-2xl border border-gray-50 shadow-sm">
              <strong className="text-gray-900 block mb-1">Messages</strong>
              Encrypted storage of sent and received messages.
            </li>
            <li className="bg-white p-4 rounded-2xl border border-gray-50 shadow-sm">
              <strong className="text-gray-900 block mb-1">Contacts</strong>
              Phone numbers of your customers/clients.
            </li>
          </ul>
        </section>

        <section>
          <h2 className="text-2xl font-bold text-gray-900 mb-4 flex items-center">
            <span className="w-8 h-8 bg-gray-100 rounded-lg flex items-center justify-center text-sm mr-3">3</span>
            Data Security
          </h2>
          <p>
            We implement enterprise-grade security measures to protect your data. This includes symmetric encryption (AES-256) for all Meta API access tokens at rest and secure JWT-based authentication for all API access.
          </p>
        </section>

        <section className="bg-gray-900 rounded-3xl p-8 text-white/90">
          <h2 className="text-2xl font-bold text-white mb-4 flex items-center">
             Meta Platform Policy
          </h2>
          <p className="text-gray-300">
            Our application complies with the Meta Platform Policy. We do not share your WhatsApp data with third parties except as required to provide our core services or comply with legal obligations.
          </p>
        </section>
      </div>

      <div className="mt-16 text-center">
        <Link 
          href={isLoggedIn ? "/dashboard" : "/login"} 
          className="inline-flex items-center space-x-2 text-sm font-bold text-gray-400 hover:text-black transition-colors py-2 px-4 rounded-xl hover:bg-gray-100"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to {isLoggedIn ? 'Dashboard' : 'Login'}</span>
        </Link>
      </div>
    </div>
  );

  // AUTHENTICATED LAYOUT
  if (isLoggedIn) {
    return (
      <div className="flex h-screen bg-gray-50 overflow-hidden">
        <div className="hidden md:block">
          <Sidebar collapsed={isCollapsed} onToggleCollapse={toggleCollapse} />
        </div>
        
        {/* Mobile menu mimic */}
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

  // GUEST LAYOUT
  return (
    <div className="min-h-screen bg-gray-50 py-16 px-4 sm:px-6 lg:px-8">
      <Content />
    </div>
  );
}
