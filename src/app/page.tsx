import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import { 
  CheckCircle2, Zap, BarChart3, Shield,
  Smartphone, Users, MessageSquare, Sparkles,
  Calendar, Paperclip, Code2, Webhook, LayoutTemplate, ShieldCheck
} from 'lucide-react';
import { LandingFooter } from '@/components/LandingFooter';
import { 
  LandingHeaderNav, 
  HeroActionsSection, 
  DynamicShowcaseWrapper, 
  FAQSectionClient,
  CtaRegisterButton
} from './_components/LandingClientWrappers';

export const metadata: Metadata = {
  title: 'PingStack | Enterprise WhatsApp Notifications & Campaign SaaS',
  description: 'Connect your official WhatsApp Business profile via Meta Cloud API. Manage pre-approved templates, 1-on-1 live inbox, broadcast campaigns, and real-time delivery logs.',
  openGraph: {
    title: 'PingStack | Enterprise WhatsApp Business SaaS',
    description: 'Connect your WhatsApp Business profile, send broadcast campaigns, and manage live customer chats.',
    url: 'https://pingstack.in',
    siteName: 'PingStack',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'PingStack | Enterprise WhatsApp Messaging',
    description: 'Connect your WhatsApp Business account via Meta Cloud API.',
  },
};

export default function Home() {
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

      <LandingHeaderNav />

      {/* Hero Section */}
      <section className="relative pt-28 md:pt-36 pb-16 px-6 z-10">
        <div className="max-w-5xl mx-auto text-center relative">
          {/* Multi-Color Bright Aurora Glow Mesh */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[95%] max-w-4xl h-72 bg-gradient-to-r from-cyan-400/40 via-indigo-500/35 to-emerald-400/40 dark:from-cyan-500/30 dark:via-purple-500/35 dark:to-emerald-400/30 rounded-full blur-[80px] pointer-events-none z-0 animate-pulse-slow" />

          {/* Luxury Frosted Glass Spotlight Card */}
          <div className="relative z-10 bg-white/50 dark:bg-slate-900/40 backdrop-blur-2xl border border-white/70 dark:border-white/10 p-8 sm:p-12 rounded-[3rem] shadow-2xl shadow-indigo-500/10 dark:shadow-none">
            <div className="inline-flex items-center space-x-2 px-4 py-1.5 bg-white/80 dark:bg-white/10 border border-white/80 dark:border-white/15 rounded-full mb-6 backdrop-blur-md shadow-sm">
              <div className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_8px_#10b981]" />
              <span className="text-[10px] font-black uppercase tracking-[0.2em] text-indigo-950 dark:text-indigo-200">WhatsApp Business Messaging SaaS</span>
            </div>
            
            <h1 className="text-3xl sm:text-5xl md:text-6xl font-black tracking-tight mb-6 leading-[1.15] max-w-4xl mx-auto text-fg">
              Your business. Your customers. <br className="hidden sm:block" />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 via-indigo-600 to-emerald-500 dark:from-cyan-300 dark:via-indigo-300 dark:to-emerald-300">
                One WhatsApp workspace.
              </span>
            </h1>
            
            <p className="text-xs sm:text-base text-fg/80 dark:text-muted font-medium max-w-2xl mx-auto mb-8 leading-relaxed">
              Connect your WhatsApp Business account, create approved templates, send targeted campaigns, manage customer conversations, and track real-time delivery ticks in one unified platform.
            </p>

            {/* Action Buttons */}
            <HeroActionsSection />

            {/* Social Proof & Capabilities Strip */}
            <div className="mt-10 pt-6 border-t border-fg/10 dark:border-white/10 flex flex-wrap items-center justify-center gap-x-8 gap-y-3 text-[10px] sm:text-xs font-bold text-fg/70 dark:text-muted">
              <span className="flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 dark:text-emerald-400" /> Meta Embedded Signup
              </span>
              <span className="flex items-center gap-1.5">
                <Zap className="w-3.5 h-3.5 text-indigo-500 dark:text-indigo-400" /> Direct Cloud API Delivery
              </span>
              <span className="flex items-center gap-1.5">
                <Shield className="w-3.5 h-3.5 text-blue-500 dark:text-blue-400" /> Pre-Approved Templates
              </span>
              <span className="flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-emerald-500 dark:text-emerald-400" /> Real-Time Live Inbox
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* HOW PINGSTACK WORKS (PRODUCT TOUR) */}
      <section id="how-it-works" className="relative z-10 py-6 scroll-mt-20">
        <DynamicShowcaseWrapper />
      </section>

      {/* FEATURE VISUAL SHOWCASE 1: LIVE INBOX & TEMPLATES */}
      <section className="py-20 px-6 relative z-10 border-t border-glass-border bg-glass-card/10 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-[10px] font-black uppercase tracking-[0.3em] text-indigo-600 dark:text-indigo-400 mb-3">Engineered for Performance</h2>
            <h3 className="text-3xl sm:text-4xl font-black tracking-tight text-fg">Complete WhatsApp workspace tools</h3>
          </div>

          {/* Luxury Visual Showcase Grid */}
          <div className="space-y-16">
            {/* Visual Block 1: Dark Mode Live Streaming Inbox */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-center bg-glass-card border border-glass-border p-8 sm:p-12 rounded-[2.5rem] shadow-2xl backdrop-blur-xl">
              <div className="lg:col-span-5 space-y-6">
                <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center">
                  <MessageSquare className="w-6 h-6" />
                </div>
                <div>
                  <span className="text-[10px] font-black uppercase tracking-widest text-emerald-400">Live Customer Support</span>
                  <h3 className="text-2xl sm:text-3xl font-black tracking-tight text-fg mt-1">Real-Time Dark Mode Streaming Inbox</h3>
                </div>
                <p className="text-muted text-xs sm:text-sm font-medium leading-relaxed">
                  Engage customers 1-on-1 with zero latency. Instantly manage two-way conversations, assign contacts, dispatch pre-approved templates, and view read status in real-time.
                </p>
                <ul className="space-y-2.5 text-xs text-fg/80 font-bold">
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" /> Live WebSocket conversation updates
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" /> Quick template selector & variable injector
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" /> Media attachments (images, PDFs, documents)
                  </li>
                </ul>
              </div>

              {/* Photo & Graphic Hybrid Card */}
              <div className="lg:col-span-7 relative group">
                <div className="relative rounded-3xl overflow-hidden border border-glass-border shadow-2xl bg-glass-card h-[340px] sm:h-[380px]">
                  <Image 
                    src="/images/customer_success.jpg" 
                    alt="Customer Success Specialist" 
                    width={800}
                    height={500}
                    sizes="(max-width: 768px) 100vw, 50vw"
                    className="w-full h-full object-cover object-top filter brightness-[0.95] group-hover:scale-105 transition-transform duration-700"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
                  
                  {/* Overlay Floating Glass Chat Badge */}
                  <div className="absolute bottom-6 left-6 right-6 p-4 bg-black/60 backdrop-blur-md border border-white/10 rounded-2xl text-white">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center space-x-2">
                        <div className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping" />
                        <span className="text-[10px] font-black uppercase tracking-widest text-emerald-300">Live Support Active</span>
                      </div>
                      <span className="text-[9px] font-mono text-slate-300">Response: &lt; 30s</span>
                    </div>
                    <p className="text-xs font-semibold text-slate-100">"PingStack allowed us to respond to customer WhatsApp inquiries 5x faster."</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Visual Block 2: Meta Pre-Approved Templates & Broadcaster */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-center bg-glass-card border border-glass-border p-8 sm:p-12 rounded-[2.5rem] shadow-2xl backdrop-blur-xl">
              {/* Photo & Graphic Hybrid Card */}
              <div className="lg:col-span-7 relative group order-2 lg:order-1">
                <div className="relative rounded-3xl overflow-hidden border border-glass-border shadow-2xl bg-glass-card h-[340px] sm:h-[380px]">
                  <Image 
                    src="/images/business_owner.jpg" 
                    alt="Business Owner using WhatsApp SaaS" 
                    width={800}
                    height={500}
                    sizes="(max-width: 768px) 100vw, 50vw"
                    className="w-full h-full object-cover object-center filter brightness-[0.95] group-hover:scale-105 transition-transform duration-700"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
                  
                  {/* Overlay Floating Meta Approval Badge */}
                  <div className="absolute bottom-6 left-6 right-6 p-4 bg-black/60 backdrop-blur-md border border-white/10 rounded-2xl text-white flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 rounded-xl bg-indigo-500/20 border border-indigo-500/30 text-indigo-400 flex items-center justify-center font-bold">
                        ✓
                      </div>
                      <div>
                        <h4 className="text-xs font-black text-white uppercase tracking-wider">Meta Template Verified</h4>
                        <p className="text-[10px] text-slate-300 font-mono">Status: Approved • 100% Delivery Rate</p>
                      </div>
                    </div>
                    <span className="px-3 py-1 bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 text-[9px] font-black rounded-full uppercase">
                      Meta Cloud API
                    </span>
                  </div>
                </div>
              </div>

              <div className="lg:col-span-5 space-y-6 order-1 lg:order-2">
                <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 flex items-center justify-center">
                  <LayoutTemplate className="w-6 h-6" />
                </div>
                <div>
                  <span className="text-[10px] font-black uppercase tracking-widest text-indigo-400">Approved Messaging</span>
                  <h3 className="text-2xl sm:text-3xl font-black tracking-tight text-fg mt-1">Pre-Approved Meta Templates</h3>
                </div>
                <p className="text-muted text-xs sm:text-sm font-medium leading-relaxed">
                  Submit templates directly to Meta Cloud API from PingStack. Add dynamic variables, quick action buttons, header images, and document attachments for rich interactive outreach.
                </p>
                <ul className="space-y-2.5 text-xs text-fg/80 font-bold">
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-indigo-400 shrink-0" /> Direct submission to Meta review pipeline
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-indigo-400 shrink-0" /> Dynamic variables ({"{{1}}"}, {"{{2}}"})
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-indigo-400 shrink-0" /> Interactive CTA & Quick Reply action buttons
                  </li>
                </ul>
              </div>
            </div>

            {/* Visual Block 3: Team Collaboration & Trust */}
            <div className="relative rounded-[2.5rem] overflow-hidden border border-glass-border shadow-2xl bg-glass-card group h-[360px] sm:h-[420px]">
              <Image 
                src="/images/team_collaboration.jpg" 
                alt="Modern Tech Team Collaborating" 
                width={1200}
                height={600}
                sizes="100vw"
                className="w-full h-full object-cover filter brightness-[0.85] group-hover:scale-105 transition-transform duration-700"
              />
              <div className="absolute inset-0 bg-gradient-to-r from-black/90 via-black/60 to-black/40 p-8 sm:p-14 flex flex-col justify-between">
                <div className="max-w-xl space-y-4">
                  <div className="inline-flex items-center space-x-2 px-3 py-1 bg-white/10 border border-white/20 rounded-full text-white text-[10px] font-black uppercase tracking-widest">
                    <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Trusted by 1,000+ Teams</span>
                  </div>
                  <h3 className="text-2xl sm:text-4xl font-black text-white tracking-tight leading-tight">
                    Scale customer engagement with confidence
                  </h3>
                  <p className="text-xs sm:text-sm text-slate-300 font-medium leading-relaxed">
                    Whether you manage a support team of 2 or a growth team broadcasting to 100,000 customers, PingStack gives you direct Meta Cloud API performance with zero setup hassle.
                  </p>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-6 border-t border-white/15 max-w-3xl">
                  <div>
                    <span className="text-xl sm:text-2xl font-black text-white block">99.9%</span>
                    <span className="text-[9px] font-black uppercase tracking-widest text-slate-400">Uptime SLA</span>
                  </div>
                  <div>
                    <span className="text-xl sm:text-2xl font-black text-emerald-400 block">&lt; 1 Sec</span>
                    <span className="text-[9px] font-black uppercase tracking-widest text-slate-400">API Latency</span>
                  </div>
                  <div>
                    <span className="text-xl sm:text-2xl font-black text-indigo-400 block">100%</span>
                    <span className="text-[9px] font-black uppercase tracking-widest text-slate-400">Meta Compliant</span>
                  </div>
                  <div>
                    <span className="text-xl sm:text-2xl font-black text-white block">24/7</span>
                    <span className="text-[9px] font-black uppercase tracking-widest text-slate-400">Live Support</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Grid of 10 Platform Capabilities */}
          <div className="mt-16 text-center mb-12">
            <h2 className="text-[10px] font-black uppercase tracking-[0.3em] text-indigo-600 dark:text-indigo-400 mb-3">Enterprise Core</h2>
            <h3 className="text-3xl sm:text-4xl font-black tracking-tight text-fg">Built for complete WhatsApp messaging management</h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <FeatureCard 
              icon={<Smartphone className="w-5 h-5 text-emerald-400" />}
              title="Embedded Onboarding"
              desc="Connect your official Meta WhatsApp Business profile easily with automated setup and number verification."
            />
            <FeatureCard 
              icon={<ShieldCheck className="w-5 h-5 text-indigo-400" />}
              title="Official Meta Cloud API"
              desc="Direct connection to Meta Cloud API infrastructure guaranteeing low latency and 100% compliance."
            />
            <FeatureCard 
              icon={<LayoutTemplate className="w-5 h-5 text-blue-400" />}
              title="Pre-Approved Templates"
              desc="Create, sync, and dispatch Meta-approved message templates with dynamic header variables and action CTA buttons."
            />
            <FeatureCard 
              icon={<MessageSquare className="w-5 h-5 text-emerald-400" />}
              title="Interactive 1-on-1 Inbox"
              desc="Engage customers in 1-on-1 real-time conversations from a unified dark-mode streaming inbox."
            />
            <FeatureCard 
              icon={<Users className="w-5 h-5 text-indigo-400" />}
              title="Audience Segmentation"
              desc="Organize audience phone numbers into dynamic targeted lists with custom tags and country code validation."
            />
            <FeatureCard 
              icon={<BarChart3 className="w-5 h-5 text-blue-400" />}
              title="Real-Time Analytics"
              desc="Track real-time sent, delivered, read double-ticks, and failed delivery logs across all campaigns."
            />
            <FeatureCard 
              icon={<Calendar className="w-5 h-5 text-emerald-400" />}
              title="Campaign Scheduling"
              desc="Schedule broadcast outreach campaigns for optimal time zones with automated queue processing."
            />
            <FeatureCard 
              icon={<Paperclip className="w-5 h-5 text-indigo-400" />}
              title="Media & Attachments"
              desc="Send rich media attachments including images, PDFs, catalogs, and document files directly to contacts."
            />
            <FeatureCard 
              icon={<Code2 className="w-5 h-5 text-blue-400" />}
              title="Developer REST API"
              desc="Integrate PingStack into your existing stack using clean REST API endpoints for automated transactional messaging."
            />
            <FeatureCard 
              icon={<Webhook className="w-5 h-5 text-emerald-400" />}
              title="Real-Time Webhooks"
              desc="Receive real-time event webhooks for inbound messages, delivery status changes, and customer opt-outs."
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

          <FAQSectionClient faqs={faqs} />
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
            <CtaRegisterButton />
          </div>
        </div>
      </section>

      <LandingFooter />
    </div>
  );
}

function FeatureCard({ icon, title, desc }: { icon: React.ReactNode; title: string, desc: string }) {
  return (
    <div className="p-6 rounded-2xl bg-glass-card border border-glass-border hover:border-indigo-500/40 hover:bg-glass-card/80 transition-all duration-500 shadow-md hover:shadow-2xl hover:-translate-y-1.5 group relative overflow-hidden">
      <div className="absolute -top-12 -right-12 w-24 h-24 bg-indigo-500/10 dark:bg-indigo-500/20 rounded-full blur-2xl group-hover:scale-150 transition-transform duration-700 pointer-events-none" />
      <div className="w-10 h-10 bg-glass-input border border-glass-border rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 group-hover:bg-indigo-500/10 group-hover:border-indigo-500/30 transition-all duration-300 shadow-sm">
        {icon}
      </div>
      <h4 className="text-base font-black mb-2 tracking-tight text-fg group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors duration-300">{title}</h4>
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
