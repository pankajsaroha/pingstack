'use client';

import { useState, useEffect } from 'react';
import { 
  Smartphone, UserPlus, FileText, Send, CheckCircle2, ShieldCheck, Zap, ArrowRight,
  Search, Plus, CheckCheck, Sparkles, Users, Play, Pause, ChevronLeft, ChevronRight, BarChart3
} from 'lucide-react';

const SLIDES = [
  {
    id: 'connect',
    badge: 'Step 01',
    tabTitle: '1. Connect WhatsApp',
    title: '1. Connect Your WhatsApp Business Account',
    subtitle: 'Link your WhatsApp Business Profile via official Meta Embedded Signup in 60 seconds. Direct Cloud API connectivity without middleware delays.',
    icon: Smartphone,
  },
  {
    id: 'templates',
    badge: 'Step 02',
    tabTitle: '2. Create Templates',
    title: '2. Create & Sync Pre-Approved Templates',
    subtitle: 'Manage and sync Meta-approved message templates with dynamic header variables, media attachments, and quick-reply action buttons.',
    icon: FileText,
  },
  {
    id: 'contacts',
    badge: 'Step 03',
    tabTitle: '3. Add Contacts',
    title: '3. Add Contacts & Segment Audiences',
    subtitle: 'Import phone numbers seamlessly with automated E.164 country code formatting, custom attributes, and targeted audience groups.',
    icon: UserPlus,
  },
  {
    id: 'send',
    badge: 'Step 04',
    tabTitle: '4. Send Messages / Campaigns',
    title: '4. Send Individual Messages & Campaigns',
    subtitle: 'Engage customers 1-on-1 through a real-time dark mode streaming inbox or dispatch targeted broadcast campaigns to thousands at once.',
    icon: Send,
  },
  {
    id: 'track',
    badge: 'Step 05',
    tabTitle: '5. Track Delivery',
    title: '5. Track Delivery Receipts & Metrics',
    subtitle: 'Monitor message dispatch status, double-blue read ticks, and high-fidelity delivery reports via instant webhook callbacks.',
    icon: BarChart3,
  },
];

export function InteractiveShowcase() {
  const [activeTab, setActiveTab] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [progress, setProgress] = useState(0);

  // Strict 1 -> 2 -> 3 -> 4 -> 5 serial progression
  useEffect(() => {
    if (isPaused) return;

    const timer = setInterval(() => {
      setActiveTab((current) => (current + 1) % SLIDES.length);
    }, 4500);

    return () => clearInterval(timer);
  }, [isPaused]);

  // Smooth progress bar animation per slide
  useEffect(() => {
    if (isPaused) return;

    setProgress(0);
    const startTime = Date.now();
    const duration = 4500;

    const anim = setInterval(() => {
      const elapsed = Date.now() - startTime;
      const pct = Math.min(100, (elapsed / duration) * 100);
      setProgress(pct);
      if (pct >= 100) clearInterval(anim);
    }, 50);

    return () => clearInterval(anim);
  }, [activeTab, isPaused]);

  const handleTabClick = (index: number) => {
    setActiveTab(index);
    setProgress(0);
  };

  const handleNext = () => {
    setActiveTab((current) => (current + 1) % SLIDES.length);
    setProgress(0);
  };

  const handlePrev = () => {
    setActiveTab((current) => (current - 1 + SLIDES.length) % SLIDES.length);
    setProgress(0);
  };

  return (
    <div className="w-full max-w-5xl mx-auto my-4 sm:my-8 px-4 sm:px-6">
      {/* Section Header */}
      <div className="text-center mb-10">
        <div className="inline-flex items-center space-x-2 px-4 py-1.5 bg-indigo-500/10 border border-indigo-500/20 rounded-full mb-3">
          <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
          <span className="text-[10px] font-black uppercase tracking-[0.25em] text-indigo-400">Interactive Product Tour</span>
        </div>
        <h2 className="text-3xl sm:text-4xl font-black tracking-tight text-fg">
          How PingStack works
        </h2>
        <p className="text-muted text-xs sm:text-sm font-semibold mt-2.5 max-w-xl mx-auto leading-relaxed">
          From Meta Embedded Signup to template approvals, contact management, campaign broadcasts, and delivery tracking.
        </p>
      </div>

      {/* Step Indicators Bar */}
      <div 
        className="flex items-center justify-between overflow-x-auto no-scrollbar gap-2 p-2 bg-glass-card border border-glass-border rounded-2xl mb-6 shadow-xl backdrop-blur-xl"
        onMouseEnter={() => setIsPaused(true)}
        onMouseLeave={() => setIsPaused(false)}
      >
        <div className="flex items-center gap-1.5 w-full overflow-x-auto no-scrollbar">
          {SLIDES.map((slide, idx) => {
            const Icon = slide.icon;
            const isActive = idx === activeTab;
            return (
              <button
                key={slide.id}
                onClick={() => handleTabClick(idx)}
                className={`flex items-center space-x-2 px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all shrink-0 cursor-pointer relative overflow-hidden ${
                  isActive
                    ? 'bg-fg text-bg shadow-md scale-[1.01]'
                    : 'text-muted hover:text-fg hover:bg-glass-card/60'
                }`}
              >
                <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-bg' : 'text-indigo-400'}`} />
                <span className="whitespace-nowrap tracking-wide">{slide.tabTitle}</span>

                {/* Progress line */}
                {isActive && (
                  <div 
                    className="absolute bottom-0 left-0 h-1 bg-indigo-500 transition-all duration-100 ease-linear"
                    style={{ width: `${progress}%` }}
                  />
                )}
              </button>
            );
          })}
        </div>

        {/* Prev / Next & Pause Controls */}
        <div className="flex items-center space-x-1 shrink-0 ml-2 border-l border-glass-border pl-2">
          <button
            onClick={handlePrev}
            className="p-1.5 text-muted hover:text-fg hover:bg-glass-card rounded-lg transition-colors cursor-pointer"
            title="Previous step"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <button
            onClick={() => setIsPaused(!isPaused)}
            className="p-1.5 text-muted hover:text-fg hover:bg-glass-card rounded-lg transition-colors cursor-pointer"
            title={isPaused ? 'Resume auto-advance' : 'Pause auto-advance'}
          >
            {isPaused ? <Play className="w-3.5 h-3.5 text-emerald-400" /> : <Pause className="w-3.5 h-3.5" />}
          </button>
          <button
            onClick={handleNext}
            className="p-1.5 text-muted hover:text-fg hover:bg-glass-card rounded-lg transition-colors cursor-pointer"
            title="Next step"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Showcase Stage Card */}
      <div 
        className="bg-glass-card border border-glass-border rounded-3xl p-6 sm:p-8 shadow-2xl backdrop-blur-2xl relative overflow-hidden transition-all duration-500"
        onMouseEnter={() => setIsPaused(true)}
        onMouseLeave={() => setIsPaused(false)}
      >
        {/* Glow ambient */}
        <div className="absolute top-0 right-0 w-80 h-80 bg-indigo-500/10 rounded-full blur-[90px] pointer-events-none" />

        {/* Slide Explanation Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 mb-6 border-b border-glass-border">
          <div>
            <div className="inline-flex items-center space-x-2 text-[10px] font-black uppercase tracking-widest text-indigo-400 mb-1.5">
              <span>{SLIDES[activeTab].badge}</span>
              <span>•</span>
              <span>Platform Tour</span>
            </div>
            <h3 className="text-xl sm:text-2xl font-black text-fg tracking-tight">
              {SLIDES[activeTab].title}
            </h3>
            <p className="text-muted text-xs sm:text-sm font-medium mt-1 max-w-xl leading-relaxed">
              {SLIDES[activeTab].subtitle}
            </p>
          </div>

          <div className="flex items-center space-x-2 shrink-0">
            <span className="text-[10px] font-black uppercase tracking-widest text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-3 py-1.5 rounded-full flex items-center gap-1.5">
              <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
              Interactive UI Preview
            </span>
          </div>
        </div>

        {/* Dynamic Mockup Area - High-contrast text visible in both Light and Dark theme */}
        <div className="bg-[#090b10] border border-white/10 rounded-2xl p-4 sm:p-6 shadow-2xl relative overflow-hidden min-h-[320px] flex flex-col justify-between text-slate-100">
          
          {/* STEP 1: CONNECT WHATSAPP */}
          {activeTab === 0 && (
            <div className="space-y-5 animate-in fade-in zoom-in-95 duration-300">
              <div className="bg-gradient-to-r from-emerald-500/10 via-teal-500/10 to-emerald-500/10 border border-emerald-500/20 rounded-2xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 rounded-xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shrink-0">
                    <ShieldCheck className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="text-xs font-black text-white uppercase tracking-wider flex items-center gap-2">
                      WhatsApp Gateway Active
                      <span className="px-2 py-0.5 bg-emerald-400/20 text-emerald-300 text-[9px] rounded-md font-mono">CONNECTED</span>
                    </h4>
                    <p className="text-[11px] text-slate-400 font-medium mt-0.5">WABA ID: 1571768617266202 • Phone: +91 98765 43210</p>
                  </div>
                </div>
                <div className="flex items-center space-x-2 text-[10px] font-black uppercase tracking-widest text-emerald-400 bg-emerald-400/10 px-3 py-1.5 rounded-xl border border-emerald-400/20">
                  <Zap className="w-3.5 h-3.5" /> Meta Cloud Route
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                <div className="bg-white/5 border border-white/10 p-4 rounded-xl">
                  <p className="text-[9px] font-black uppercase tracking-widest text-slate-400">Meta Signup Status</p>
                  <p className="text-base font-black text-emerald-400 mt-1 flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4" /> Verified
                  </p>
                </div>
                <div className="bg-white/5 border border-white/10 p-4 rounded-xl">
                  <p className="text-[9px] font-black uppercase tracking-widest text-slate-400">Phone Status</p>
                  <p className="text-base font-black text-white mt-1">ONLINE</p>
                </div>
                <div className="bg-white/5 border border-white/10 p-4 rounded-xl col-span-2 sm:col-span-1">
                  <p className="text-[9px] font-black uppercase tracking-widest text-slate-400">Quality Rating</p>
                  <p className="text-base font-black text-emerald-400 mt-1">HIGH (GREEN)</p>
                </div>
              </div>
            </div>
          )}

          {/* STEP 2: CREATE TEMPLATES */}
          {activeTab === 1 && (
            <div className="space-y-4 animate-in fade-in zoom-in-95 duration-300">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">Meta Approved Templates</span>
                <span className="text-xs text-indigo-400 font-bold flex items-center gap-1">
                  + Create New Template
                </span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="p-4 bg-white/5 border border-white/10 rounded-xl">
                  <div className="flex items-center justify-between mb-2">
                    <span className="px-2 py-0.5 bg-emerald-500/10 text-emerald-400 text-[9px] font-black uppercase rounded-md border border-emerald-500/20">Approved</span>
                    <span className="text-[9px] font-mono text-slate-400">UTILITY</span>
                  </div>
                  <h4 className="text-xs font-black text-white">order_shipping_update</h4>
                  <p className="text-[11px] text-slate-400 mt-1 font-mono">Hi {"{{1}}"}, your order #{"{{2}}"} has been shipped!</p>
                </div>
                <div className="p-4 bg-white/5 border border-white/10 rounded-xl">
                  <div className="flex items-center justify-between mb-2">
                    <span className="px-2 py-0.5 bg-emerald-500/10 text-emerald-400 text-[9px] font-black uppercase rounded-md border border-emerald-500/20">Approved</span>
                    <span className="text-[9px] font-mono text-slate-400">MARKETING</span>
                  </div>
                  <h4 className="text-xs font-black text-white">festive_discount_alert</h4>
                  <p className="text-[11px] text-slate-400 mt-1 font-mono">Get {"{{1}}"}% off on your next purchase using code {"{{2}}"}.</p>
                </div>
              </div>
            </div>
          )}

          {/* STEP 3: ADD CONTACTS */}
          {activeTab === 2 && (
            <div className="space-y-3 animate-in fade-in zoom-in-95 duration-300">
              <div className="flex items-center justify-between gap-3">
                <div className="relative flex-1 max-w-xs">
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input 
                    type="text" 
                    readOnly 
                    value="Search contacts..."
                    className="w-full bg-white/5 border border-white/10 rounded-xl pl-8 pr-3 py-1.5 text-xs text-slate-200"
                  />
                </div>
                <div className="flex items-center gap-2">
                  <button className="px-3 py-1.5 bg-white/5 border border-white/10 rounded-xl text-[10px] font-black uppercase text-slate-200">
                    Upload CSV
                  </button>
                  <button className="px-3 py-1.5 bg-white text-slate-900 rounded-xl text-[10px] font-black uppercase">
                    + Add Contact
                  </button>
                </div>
              </div>

              <div className="border border-white/10 rounded-xl overflow-hidden bg-white/5">
                <div className="grid grid-cols-12 bg-white/5 p-2.5 text-[9px] font-black uppercase text-slate-400 border-b border-white/10">
                  <div className="col-span-4">Name</div>
                  <div className="col-span-4">Phone Number</div>
                  <div className="col-span-2">Group Tag</div>
                  <div className="col-span-2 text-right">WhatsApp Status</div>
                </div>
                <div className="divide-y divide-white/10 text-xs font-medium">
                  <div className="grid grid-cols-12 p-2.5 items-center">
                    <div className="col-span-4 font-bold text-white">Rahul Sharma</div>
                    <div className="col-span-4 font-mono text-slate-400">+91 98765 43210</div>
                    <div className="col-span-2"><span className="px-2 py-0.5 bg-indigo-500/20 text-indigo-300 rounded-full text-[9px]">VIP Lead</span></div>
                    <div className="col-span-2 text-right text-emerald-400 text-[10px] font-bold">Valid</div>
                  </div>
                  <div className="grid grid-cols-12 p-2.5 items-center bg-white/[0.02]">
                    <div className="col-span-4 font-bold text-white">Sarah Jenkins</div>
                    <div className="col-span-4 font-mono text-slate-400">+1 415 555 0199</div>
                    <div className="col-span-2"><span className="px-2 py-0.5 bg-emerald-500/20 text-emerald-300 rounded-full text-[9px]">Customer</span></div>
                    <div className="col-span-2 text-right text-emerald-400 text-[10px] font-bold">Valid</div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* STEP 4: SEND MESSAGES / CAMPAIGNS */}
          {activeTab === 3 && (
            <div className="space-y-3 animate-in fade-in zoom-in-95 duration-300">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 border border-white/10 rounded-xl bg-white/5 overflow-hidden">
                <div className="border-r border-white/10 p-2.5 space-y-2 hidden md:block">
                  <div className="p-2 bg-indigo-600 text-white rounded-lg text-xs font-bold flex items-center justify-between">
                    <span>Rahul Sharma</span>
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                  </div>
                  <div className="p-2 hover:bg-white/5 rounded-lg text-xs text-slate-400 font-medium flex items-center justify-between">
                    <span>Sarah Jenkins</span>
                    <span className="text-[9px]">10:14 AM</span>
                  </div>
                </div>

                <div className="md:col-span-2 p-3 flex flex-col justify-between min-h-[200px]">
                  <div className="space-y-2">
                    <div className="flex justify-start">
                      <div className="bg-white/10 border border-white/10 rounded-xl rounded-bl-none p-2.5 max-w-[85%] text-xs text-slate-200">
                        Hi, has my order #8872 dispatched?
                      </div>
                    </div>
                    <div className="flex justify-end">
                      <div className="bg-indigo-600 text-white rounded-xl rounded-br-none p-2.5 max-w-[85%] text-xs font-medium">
                        Yes Rahul! Your order #8872 has been dispatched via Express delivery.
                        <div className="flex items-center justify-end gap-1 mt-1 text-[8px] opacity-80">
                          <span>10:42 AM</span>
                          <CheckCheck className="w-3 h-3 text-emerald-300" />
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="mt-3 pt-2 border-t border-white/10 flex items-center gap-2">
                    <input 
                      type="text" 
                      readOnly 
                      value="Type a message or pick template..." 
                      className="flex-1 bg-white/5 border border-white/10 rounded-lg px-3 py-1.5 text-xs text-slate-400"
                    />
                    <button className="p-1.5 bg-indigo-600 text-white rounded-lg shrink-0">
                      <Send className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* STEP 5: TRACK DELIVERY */}
          {activeTab === 4 && (
            <div className="space-y-4 animate-in fade-in zoom-in-95 duration-300">
              <div className="bg-white/5 border border-white/10 rounded-xl p-4 space-y-3">
                <div className="flex items-center justify-between border-b border-white/10 pb-2">
                  <h4 className="text-xs font-black text-white flex items-center gap-2">
                    Campaign: Q3 Product Launch Broadcast
                    <span className="px-2 py-0.5 bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-[9px] font-black rounded-full uppercase">100% Sent</span>
                  </h4>
                  <span className="text-[10px] font-mono text-slate-400">340 / 340 Dispatched</span>
                </div>

                <div className="grid grid-cols-3 gap-3">
                  <div className="bg-white/5 p-2.5 rounded-lg border border-white/10 text-center">
                    <span className="text-[9px] font-black uppercase text-slate-400 block">Sent Ticks</span>
                    <span className="text-base font-black text-white">340</span>
                  </div>
                  <div className="bg-white/5 p-2.5 rounded-lg border border-white/10 text-center">
                    <span className="text-[9px] font-black uppercase text-slate-400 block">Delivered</span>
                    <span className="text-base font-black text-emerald-400">338</span>
                  </div>
                  <div className="bg-white/5 p-2.5 rounded-lg border border-white/10 text-center">
                    <span className="text-[9px] font-black uppercase text-slate-400 block">Read Rate</span>
                    <span className="text-base font-black text-indigo-400">92%</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Footer Status Bar of Mockup */}
          <div className="mt-3 pt-2 border-t border-white/10 flex items-center justify-between text-[10px] text-slate-400 font-mono">
            <span className="flex items-center gap-1.5">
              <CheckCircle2 className="w-3 h-3 text-emerald-400" /> PingStack Direct Meta Cloud API Engine
            </span>
            <span className="hidden sm:inline-block">Auto-advancing (Hover to pause)</span>
          </div>

        </div>
      </div>
    </div>
  );
}
