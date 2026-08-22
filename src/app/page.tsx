'use client';

import { useState, useEffect } from 'react';
import { 
  ArrowRight, CheckCircle2, Zap, BarChart3, Shield,
  Smartphone, Globe, LockIcon, Sparkles, MessageSquare, Users, Send, ChevronDown,
  Calendar, Paperclip, Code2, Webhook, LayoutTemplate, HelpCircle
} from 'lucide-react';
import { LandingNav } from '@/components/LandingNav';
import { LandingFooter } from '@/components/LandingFooter';
import { AuthModal } from '@/components/AuthModal';
import { InteractiveShowcase } from '@/components/InteractiveShowcase';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function Home() {
  const router = useRouter();
  const [modalType, setModalType] = useState<'login' | 'register' | 'forgot' | null>(null);
  const [tenant, setTenant] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const params = new URLSearchParams(window.location.search);
    const auth = params.get('auth');
    if (auth === 'login' || auth === 'register' || auth === 'forgot') setModalType(auth);

    const cached = sessionStorage.getItem('tenant_session');
    if (cached) {
      try {
        setTenant(JSON.parse(cached));
      } catch (e) {}
    }

    async function checkUser() {
      try {
        const res = await fetch('/api/tenant/me');
        if (res.ok) {
          const data = await res.json();
          setTenant(data);
          sessionStorage.setItem('tenant_session', JSON.stringify(data));
        }
      } catch (err) {
      } finally {
        setLoading(false);
      }
    }
    checkUser();
  }, []);

  const scrollToShowcase = () => {
    const el = document.getElementById('how-it-works');
    if (el) el.scrollIntoView({ behavior: 'smooth' });
  };

  const faqs = [
    {
      q: "What is PingStack?",
      a: "PingStack is a WhatsApp Business messaging SaaS that enables businesses to connect their official WhatsApp account, manage templates, engage in 1-on-1 customer conversations, send broadcast campaigns, and track real-time message delivery."
    },
    {
      q: "How does the WhatsApp connection work?",
      a: "PingStack connects directly to Meta Cloud API via Meta's Embedded Signup flow. You connect your official WhatsApp Business profile in under 60 seconds with no complex manual API keys required."
    },
    {
      q: "Do I need a WhatsApp Business account?",
      a: "Yes, you need a Meta WhatsApp Business Account (WABA). If you don't have one, Meta's Embedded Signup flow inside PingStack guides you to set one up instantly."
    },
    {
      q: "Are Meta messaging charges included in PingStack subscription fees?",
      a: "No. PingStack subscription fees cover the platform tools, live inbox, campaign engine, and API infrastructure. Meta messaging conversation fees are billed separately by Meta based on your regional messaging usage."
    },
    {
      q: "Can I use the API for custom integrations?",
      a: "Yes. PingStack provides full developer REST APIs and webhooks to trigger transactional alerts, order updates, OTPs, and sync messaging data into your existing CRM or backend."
    },
    {
      q: "Can I send broadcast campaigns to multiple contacts?",
      a: "Yes. You can import contacts via CSV or Google Contacts, segment them into target groups, choose pre-approved Meta templates, and dispatch campaigns with real-time tracking."
    },
    {
      q: "How does template approval work?",
      a: "You create templates directly within PingStack and submit them to Meta. Once approved by Meta (usually within a few minutes), your templates automatically sync to your PingStack dashboard ready for broadcasting."
    }
  ];

  return (
    <div className="min-h-screen bg-bg text-fg selection:bg-fg selection:text-bg overflow-x-hidden transition-colors duration-300">
      {/* Background ambient glows */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
        <div className="absolute top-[-10%] left-[-10%] w-[60%] h-[60%] rounded-full bg-blue-500/[0.04] dark:bg-blue-600/10 blur-[140px] animate-pulse-slow" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[60%] h-[60%] rounded-full bg-indigo-500/[0.04] dark:bg-indigo-600/10 blur-[140px] animate-pulse-slow" />
      </div>

      <LandingNav onOpenAuth={setModalType} />

      {/* Hero Section */}
      <section className="relative pt-28 md:pt-36 pb-12 px-6 z-10">
        <div className="max-w-5xl mx-auto text-center">
          <div className="inline-flex items-center space-x-2 px-4 py-1.5 bg-glass-card border border-glass-border rounded-full mb-6 backdrop-blur-md shadow-sm">
            <div className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_8px_#10b981]" />
            <span className="text-[10px] font-black uppercase tracking-[0.2em] text-muted">WhatsApp Business Messaging SaaS</span>
          </div>
          
          <h1 className="text-3xl sm:text-5xl md:text-6xl font-black tracking-tight mb-6 leading-[1.15] max-w-4xl mx-auto text-fg">
            Your business. Your customers. <br className="hidden sm:block" />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-500 via-indigo-500 to-emerald-400 dark:from-blue-400 dark:via-indigo-400 dark:to-emerald-300">
              One WhatsApp workspace.
            </span>
          </h1>
          
          <p className="text-xs sm:text-base text-muted font-medium max-w-2xl mx-auto mb-8 leading-relaxed">
            Connect your WhatsApp Business account, create approved templates, send targeted campaigns, manage customer conversations, and track real-time delivery ticks in one unified platform.
          </p>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 min-h-[52px]">
            {loading ? (
              <div className="h-14 w-56 bg-fg/5 border border-glass-border rounded-2xl animate-pulse" />
            ) : tenant ? (
              <button 
                onClick={() => router.push('/dashboard')}
                className="w-full sm:w-auto px-8 py-4 bg-fg text-bg rounded-2xl font-black text-xs uppercase tracking-[0.18em] shadow-lg hover:bg-fg/90 hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center group cursor-pointer"
              >
                Go to Dashboard
                <ArrowRight className="w-4 h-4 ml-2.5 group-hover:translate-x-1 transition-transform" />
              </button>
            ) : (
              <>
                <button 
                  onClick={() => setModalType('register')}
                  className="w-full sm:w-auto px-8 py-4 bg-fg text-bg rounded-2xl font-black text-xs uppercase tracking-[0.18em] shadow-lg hover:bg-fg/90 hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center group cursor-pointer"
                >
                  Start for free
                  <ArrowRight className="w-4 h-4 ml-2.5 group-hover:translate-x-1 transition-transform" />
                </button>

                <button 
                  onClick={scrollToShowcase}
                  className="w-full sm:w-auto px-6 py-4 bg-glass-card border border-glass-border hover:bg-glass-card/60 text-fg rounded-2xl font-bold text-xs uppercase tracking-wider transition-all flex items-center justify-center cursor-pointer"
                >
                  <span>See how it works</span>
                  <ChevronDown className="w-4 h-4 ml-2 text-indigo-400" />
                </button>
              </>
            )}
          </div>

          {/* Product UI Visual Preview directly in Hero */}
          <div className="mt-14 max-w-4xl mx-auto rounded-3xl border border-glass-border bg-glass-card p-3 shadow-2xl backdrop-blur-xl relative overflow-hidden group">
            <div className="bg-[#0b0d14] rounded-2xl p-4 sm:p-6 border border-white/5 text-left text-xs font-mono">
              <div className="flex items-center justify-between border-b border-white/10 pb-4 mb-4">
                <div className="flex items-center space-x-2">
                  <div className="w-3 h-3 rounded-full bg-red-500/80" />
                  <div className="w-3 h-3 rounded-full bg-yellow-500/80" />
                  <div className="w-3 h-3 rounded-full bg-green-500/80" />
                  <span className="text-[10px] text-muted ml-2 font-sans font-bold">PingStack Workspace — Live Dashboard</span>
                </div>
                <span className="px-2.5 py-1 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[9px] rounded-full font-bold">
                  ● WhatsApp Connected
                </span>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
                <div className="bg-white/5 p-3 rounded-xl border border-white/5">
                  <span className="text-[9px] text-muted uppercase block font-sans">Sent Messages</span>
                  <span className="text-lg font-bold text-fg font-sans">12,450</span>
                </div>
                <div className="bg-white/5 p-3 rounded-xl border border-white/5">
                  <span className="text-[9px] text-muted uppercase block font-sans">Delivered</span>
                  <span className="text-lg font-bold text-emerald-400 font-sans">99.2%</span>
                </div>
                <div className="bg-white/5 p-3 rounded-xl border border-white/5">
                  <span className="text-[9px] text-muted uppercase block font-sans">Read Ticks</span>
                  <span className="text-lg font-bold text-indigo-400 font-sans">91.5%</span>
                </div>
                <div className="bg-white/5 p-3 rounded-xl border border-white/5">
                  <span className="text-[9px] text-muted uppercase block font-sans">Active Contacts</span>
                  <span className="text-lg font-bold text-fg font-sans">1,820</span>
                </div>
              </div>
            </div>
          </div>

          {/* Social Proof & Capabilities Strip */}
          <div className="mt-10 pt-6 border-t border-glass-border/60 flex flex-wrap items-center justify-center gap-x-8 gap-y-3 text-[10px] sm:text-xs font-bold text-muted">
            <span className="flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> Meta Embedded Signup
            </span>
            <span className="flex items-center gap-1.5">
              <Zap className="w-3.5 h-3.5 text-indigo-400" /> Direct Cloud API Delivery
            </span>
            <span className="flex items-center gap-1.5">
              <Shield className="w-3.5 h-3.5 text-blue-400" /> Pre-Approved Templates
            </span>
            <span className="flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-emerald-400" /> Real-Time Live Inbox
            </span>
          </div>

        </div>
      </section>

      {/* HOW PINGSTACK WORKS (PRODUCT TOUR) */}
      <section id="how-it-works" className="relative z-10 py-6 scroll-mt-20">
        <InteractiveShowcase />
      </section>

      {/* CORE FEATURES SECTION */}
      <section className="py-20 px-6 relative z-10 border-t border-glass-border bg-glass-card/10 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-[10px] font-black uppercase tracking-[0.3em] text-indigo-600 dark:text-indigo-400 mb-3">Core Platform Capabilities</h2>
            <h3 className="text-3xl sm:text-4xl font-black tracking-tight text-fg">Built for complete WhatsApp messaging management</h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <FeatureCard 
              icon={<Smartphone className="w-5 h-5 text-emerald-400" />}
              title="WhatsApp Business Integration"
              desc="Connect your official Meta WhatsApp Business profile easily with automated setup and number verification."
            />
            <FeatureCard 
              icon={<LayoutTemplate className="w-5 h-5 text-indigo-400" />}
              title="Message Templates"
              desc="Create, sync, and dispatch Meta-approved message templates with dynamic header variables and quick action buttons."
            />
            <FeatureCard 
              icon={<Users className="w-5 h-5 text-blue-400" />}
              title="Contacts & Segmentation"
              desc="Organize audience phone numbers into dynamic targeted lists with custom tags and country code validation."
            />
            <FeatureCard 
              icon={<Send className="w-5 h-5 text-indigo-400" />}
              title="Campaign Broadcasts"
              desc="Launch batch WhatsApp broadcast campaigns to targeted groups with real-time progress monitors."
            />
            <FeatureCard 
              icon={<MessageSquare className="w-5 h-5 text-emerald-400" />}
              title="Inbox & Conversations"
              desc="Engage customers in 1-on-1 real-time conversations from a unified dark-mode streaming inbox."
            />
            <FeatureCard 
              icon={<BarChart3 className="w-5 h-5 text-indigo-400" />}
              title="Delivery Reports"
              desc="Track real-time sent, delivered, read double-ticks, and failed delivery logs across all campaigns."
            />
            <FeatureCard 
              icon={<Calendar className="w-5 h-5 text-blue-400" />}
              title="Campaign Scheduling"
              desc="Schedule broadcast campaigns for future dispatch dates and optimal timezones."
            />
            <FeatureCard 
              icon={<Paperclip className="w-5 h-5 text-purple-400" />}
              title="Media & Attachments"
              desc="Send images, PDF documents, videos, and dynamic media headers directly through WhatsApp templates."
            />
            <FeatureCard 
              icon={<Code2 className="w-5 h-5 text-indigo-400" />}
              title="Developer REST API"
              desc="Integrate PingStack message dispatch into your existing app or CRM via clean REST API endpoints."
            />
            <FeatureCard 
              icon={<Webhook className="w-5 h-5 text-emerald-400" />}
              title="Real-Time Webhooks"
              desc="Receive instant HTTP callback notifications for incoming customer messages and delivery receipts."
            />
          </div>
        </div>
      </section>

      {/* USE CASES & WORKFLOW */}
      <section className="py-20 px-6 bg-glass-card/5 border-y border-glass-border relative z-10">
        <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
          <div>
            <h2 className="text-[10px] font-black uppercase tracking-[0.3em] text-indigo-600 dark:text-indigo-400 mb-3">Simple Workflow</h2>
            <h3 className="text-3xl sm:text-4xl font-black tracking-tight mb-6 text-fg">Start messaging in three clean steps</h3>
            
            <div className="space-y-4 mt-8">
              <Step num="01" title="Connect Your Account" desc="Link your WhatsApp Business profile via official Embedded Signup in under 60 seconds." />
              <Step num="02" title="Import Contacts & Prepare Templates" desc="Add customer phone numbers into targeted groups and choose pre-approved Meta message templates." />
              <Step num="03" title="Send & Monitor Outcomes" desc="Chat live in the inbox, dispatch broadcast campaigns, and track real-time read ticks." />
            </div>
          </div>
          
          <div className="relative">
            <div className="absolute inset-0 bg-blue-500/[0.04] blur-[100px] rounded-full" />
            <div className="relative bg-glass-card border border-glass-border rounded-3xl p-6 shadow-xl overflow-hidden">
              <div className="flex items-center space-x-2 border-b border-glass-border pb-4 mb-4">
                <div className="w-2.5 h-2.5 rounded-full bg-fg/10" />
                <div className="w-2.5 h-2.5 rounded-full bg-fg/10" />
                <div className="w-2.5 h-2.5 rounded-full bg-fg/10" />
                <span className="text-[9px] uppercase font-black tracking-widest text-muted ml-2">REST API Endpoint Sample</span>
              </div>
              <pre className="text-xs font-mono leading-relaxed text-indigo-600 dark:text-indigo-300 overflow-x-auto">
{`POST /api/v1/messages/send
{
  "to": "+919876543210",
  "template": "order_update",
  "language": "en_US",
  "variables": { "1": "Rahul", "2": "8872" }
}

// Response
{ 
  "status": "queued",
  "wamid": "wamid.HBgLOTE5ODc2NTQzMjEw...",
  "delivered": true
}`}
              </pre>
            </div>
          </div>
        </div>
      </section>

      {/* PRICING PREVIEW */}
      <section className="py-20 px-6 relative z-10">
        <div className="max-w-6xl mx-auto text-center">
          <div className="mb-12">
            <h2 className="text-[10px] font-black uppercase tracking-[0.3em] text-indigo-600 dark:text-indigo-400 mb-3">Transparent Subscriptions</h2>
            <h3 className="text-3xl sm:text-4xl font-black tracking-tight text-fg">Simple plans for every stage</h3>
            <p className="text-xs sm:text-sm text-muted font-semibold mt-2">
              Note: Meta/WhatsApp conversation charges are billed separately by Meta based on messaging volume.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-left">
            <div className="p-8 rounded-3xl bg-glass-card border border-glass-border flex flex-col justify-between">
              <div>
                <h4 className="text-xl font-black text-fg mb-1">Starter</h4>
                <p className="text-xs text-muted mb-6">Ideal for small businesses starting out.</p>
                <div className="flex items-baseline gap-1 mb-6">
                  <span className="text-3xl font-black text-fg">₹199</span>
                  <span className="text-xs text-muted font-bold">/ month</span>
                </div>
                <ul className="space-y-3 text-xs text-muted font-semibold mb-8">
                  <li className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" /> 1 Campaign/day</li>
                  <li className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" /> 250 Contacts</li>
                  <li className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" /> Live Inbox Chat</li>
                  <li className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" /> API Access</li>
                </ul>
              </div>
              <Link href="/pricing" className="w-full py-3 bg-glass-input hover:bg-glass-card border border-glass-border text-fg rounded-xl text-xs font-black uppercase text-center block">
                View Starter Plan
              </Link>
            </div>

            <div className="p-8 rounded-3xl bg-glass-card border border-indigo-500/40 shadow-xl relative flex flex-col justify-between">
              <span className="absolute top-0 right-6 -translate-y-1/2 px-3 py-1 bg-gradient-to-r from-blue-600 to-indigo-600 text-white text-[9px] font-black uppercase tracking-widest rounded-full">
                Popular Choice
              </span>
              <div>
                <h4 className="text-xl font-black text-fg mb-1">Growth</h4>
                <p className="text-xs text-muted mb-6">For growing teams with daily campaigns.</p>
                <div className="flex items-baseline gap-1 mb-6">
                  <span className="text-3xl font-black text-fg">₹499</span>
                  <span className="text-xs text-muted font-bold">/ month</span>
                </div>
                <ul className="space-y-3 text-xs text-muted font-semibold mb-8">
                  <li className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" /> 10 Campaigns/day</li>
                  <li className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" /> 2,500 Contacts</li>
                  <li className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" /> Group Broadcasts</li>
                  <li className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" /> Priority Support</li>
                </ul>
              </div>
              <Link href="/pricing" className="w-full py-3 bg-fg text-bg rounded-xl text-xs font-black uppercase text-center block shadow-md">
                View Growth Plan
              </Link>
            </div>

            <div className="p-8 rounded-3xl bg-glass-card border border-glass-border flex flex-col justify-between">
              <div>
                <h4 className="text-xl font-black text-fg mb-1">Pro</h4>
                <p className="text-xs text-muted mb-6">For high volume messaging scaling.</p>
                <div className="flex items-baseline gap-1 mb-6">
                  <span className="text-3xl font-black text-fg">₹999</span>
                  <span className="text-xs text-muted font-bold">/ month</span>
                </div>
                <ul className="space-y-3 text-xs text-muted font-semibold mb-8">
                  <li className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" /> Unlimited Campaigns</li>
                  <li className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" /> Unlimited Contacts</li>
                  <li className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" /> Advanced Analytics</li>
                  <li className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" /> 1-Year Log Retention</li>
                </ul>
              </div>
              <Link href="/pricing" className="w-full py-3 bg-glass-input hover:bg-glass-card border border-glass-border text-fg rounded-xl text-xs font-black uppercase text-center block">
                View Pro Plan
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ SECTION */}
      <section className="py-20 px-6 bg-glass-card/10 border-t border-glass-border relative z-10">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-[10px] font-black uppercase tracking-[0.3em] text-indigo-600 dark:text-indigo-400 mb-3">Frequently Asked Questions</h2>
            <h3 className="text-3xl font-black tracking-tight text-fg">Everything you need to know</h3>
          </div>

          <div className="space-y-4">
            {faqs.map((faq, idx) => (
              <div 
                key={idx}
                className="bg-glass-card border border-glass-border rounded-2xl p-5 transition-all cursor-pointer"
                onClick={() => setOpenFaq(openFaq === idx ? null : idx)}
              >
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-black text-fg flex items-center gap-2">
                    <HelpCircle className="w-4 h-4 text-indigo-400 shrink-0" />
                    {faq.q}
                  </h4>
                  <ChevronDown className={`w-4 h-4 text-muted transition-transform duration-200 ${openFaq === idx ? 'rotate-180' : ''}`} />
                </div>
                {openFaq === idx && (
                  <p className="text-xs text-muted font-medium mt-3 leading-relaxed pt-3 border-t border-glass-border/60">
                    {faq.a}
                  </p>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FINAL CTA SECTION */}
      <section className="py-20 px-6 relative z-10">
        <div className="max-w-4xl mx-auto bg-glass-card border border-glass-border rounded-3xl p-10 text-center relative overflow-hidden shadow-2xl">
          <div className="relative z-10">
            <h3 className="text-2xl sm:text-3xl font-black tracking-tight mb-4 text-fg">
              Ready to simplify your business WhatsApp messaging?
            </h3>
            <p className="text-muted text-xs sm:text-sm font-medium mb-8 max-w-xl mx-auto">
              Get started with PingStack today. Connect your WhatsApp Business account in minutes and launch your first campaign.
            </p>
            <button 
              onClick={() => setModalType('register')}
              className="px-8 py-4 bg-fg text-bg rounded-2xl font-black text-xs uppercase tracking-[0.18em] shadow-lg hover:bg-fg/90 hover:scale-[1.02] active:scale-[0.98] transition-all inline-flex items-center cursor-pointer"
            >
              Start for free
              <ArrowRight className="w-4 h-4 ml-2" />
            </button>
          </div>
        </div>
      </section>

      <LandingFooter />

      <AuthModal 
        isOpen={modalType !== null} 
        onClose={() => { setModalType(null); router.replace('/'); }} 
        initialView={modalType === 'register' ? 'register' : modalType === 'forgot' ? 'forgot' : 'login'} 
      />
    </div>
  );
}

function FeatureCard({ icon, title, desc }: { icon: React.ReactNode; title: string, desc: string }) {
  return (
    <div className="p-6 rounded-2xl bg-glass-card border border-glass-border hover:bg-glass-card/60 transition-all duration-300 shadow-md group">
      <div className="w-10 h-10 bg-glass-input border border-glass-border rounded-xl flex items-center justify-center mb-4 group-hover:scale-105 transition-transform">
        {icon}
      </div>
      <h4 className="text-base font-black mb-2 tracking-tight text-fg">{title}</h4>
      <p className="text-muted text-xs font-medium leading-relaxed">{desc}</p>
    </div>
  );
}

function Step({ num, title, desc }: { num: string; title: string; desc: string }) {
  return (
    <div className="flex space-x-5 bg-glass-card border border-glass-border p-4.5 rounded-2xl hover:bg-glass-card/60 transition-colors">
      <div className="text-[10px] font-black tracking-[0.2em] text-indigo-600 dark:text-indigo-400 pt-1">{num}</div>
      <div>
        <h4 className="text-sm font-black mb-1 tracking-tight text-fg">{title}</h4>
        <p className="text-muted text-xs font-medium leading-relaxed">{desc}</p>
      </div>
    </div>
  );
}
