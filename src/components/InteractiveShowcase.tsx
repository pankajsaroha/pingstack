'use client';

import { useState, useEffect } from 'react';
import { 
  LayoutDashboard, UserPlus, FolderPlus, MessageSquare, 
  Send, CheckCircle2, ShieldCheck, Zap, ArrowRight,
  Search, Plus, CheckCheck, Sparkles, Users, FileText, Play, Pause
} from 'lucide-react';

const SLIDES = [
  {
    id: 'onboarding',
    badge: 'Step 01',
    tabTitle: 'Meta Onboarding & Dashboard',
    title: 'Instant Meta Onboarding & Live Analytics',
    subtitle: 'Connect your Meta WhatsApp Business Profile in 60 seconds with Embedded Signup. Track live delivery, read rates, and account health.',
    icon: LayoutDashboard,
  },
  {
    id: 'contacts',
    badge: 'Step 02',
    tabTitle: 'Add & Sync Contacts',
    title: 'Smart Contact Management & CSV Import',
    subtitle: 'Import phone numbers seamlessly with automated E.164 country code formatting, Google Contact sync, and custom attributes.',
    icon: UserPlus,
  },
  {
    id: 'groups',
    badge: 'Step 03',
    tabTitle: 'Group Segmentation',
    title: 'Targeted Group Audience Lists',
    subtitle: 'Organize customers into dynamic groups (VIP Leads, New Signups, Order Updates) for focused high-converting broadcasts.',
    icon: FolderPlus,
  },
  {
    id: 'chat',
    badge: 'Step 04',
    tabTitle: 'Direct Messaging & Inbox',
    title: 'Multi-Agent Live Inbox & Template Chat',
    subtitle: 'Send template alerts directly from contact cards or engage customers in real-time with our WhatsApp dark-mode streaming inbox.',
    icon: MessageSquare,
  },
  {
    id: 'campaigns',
    badge: 'Step 05',
    tabTitle: 'Create & Send Campaigns',
    title: 'Broadcast Campaigns with Live Tracking',
    subtitle: 'Pick pre-approved Meta templates, select targeted groups, schedule delivery times, and monitor webhook delivery status in real-time.',
    icon: Send,
  },
];

export function InteractiveShowcase() {
  const [activeTab, setActiveTab] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    if (isPaused) return;

    const interval = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) {
          setActiveTab((current) => (current + 1) % SLIDES.length);
          return 0;
        }
        return prev + 2; // 50 steps * 100ms = 5 seconds per slide
      });
    }, 100);

    return () => clearInterval(interval);
  }, [isPaused, activeTab]);

  const handleTabClick = (index: number) => {
    setActiveTab(index);
    setProgress(0);
  };

  return (
    <div className="w-full max-w-6xl mx-auto my-4 sm:my-8 px-4 sm:px-6">
      {/* Section Header */}
      <div className="text-center mb-12">
        <div className="inline-flex items-center space-x-2 px-4 py-1.5 bg-indigo-500/10 border border-indigo-500/20 rounded-full mb-4">
          <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
          <span className="text-[10px] font-black uppercase tracking-[0.25em] text-indigo-400">Interactive Product Tour</span>
        </div>
        <h2 className="text-3xl sm:text-5xl font-black tracking-tight text-fg">
          How PingStack Powers Your WhatsApp Stack
        </h2>
        <p className="text-muted text-sm sm:text-base font-semibold mt-3 max-w-2xl mx-auto leading-relaxed">
          From Meta Cloud API onboarding to live chat support and automated campaign broadcasts — everything built for growth.
        </p>
      </div>

      {/* Tabs Navigation */}
      <div 
        className="flex overflow-x-auto no-scrollbar gap-2 p-2 bg-glass-card border border-glass-border rounded-2xl sm:rounded-3xl mb-8 shadow-xl backdrop-blur-xl"
        onMouseEnter={() => setIsPaused(true)}
        onMouseLeave={() => setIsPaused(false)}
      >
        {SLIDES.map((slide, idx) => {
          const Icon = slide.icon;
          const isActive = idx === activeTab;
          return (
            <button
              key={slide.id}
              onClick={() => handleTabClick(idx)}
              className={`flex items-center space-x-2.5 px-4 py-3 rounded-xl sm:rounded-2xl text-xs font-bold transition-all shrink-0 cursor-pointer relative overflow-hidden ${
                isActive
                  ? 'bg-fg text-bg shadow-md scale-[1.02]'
                  : 'text-muted hover:text-fg hover:bg-glass-card/60'
              }`}
            >
              <Icon className={`w-4 h-4 ${isActive ? 'text-bg' : 'text-indigo-400'}`} />
              <span className="whitespace-nowrap tracking-wide">{slide.tabTitle}</span>

              {/* Progress Bar line on active tab */}
              {isActive && (
                <div 
                  className="absolute bottom-0 left-0 h-1 bg-indigo-500 transition-all duration-100 ease-linear"
                  style={{ width: `${progress}%` }}
                />
              )}
            </button>
          );
        })}

        <button
          onClick={() => setIsPaused(!isPaused)}
          className="ml-auto hidden sm:flex items-center px-3 py-2 text-fg/40 hover:text-fg text-xs font-bold rounded-xl transition-colors shrink-0 cursor-pointer"
          title={isPaused ? 'Resume auto-play' : 'Pause auto-play'}
        >
          {isPaused ? <Play className="w-3.5 h-3.5" /> : <Pause className="w-3.5 h-3.5" />}
        </button>
      </div>

      {/* Showcase Stage Card */}
      <div 
        className="bg-glass-card border border-glass-border rounded-[2.5rem] p-6 sm:p-10 shadow-[0_32px_80px_rgba(0,0,0,0.5)] backdrop-blur-2xl relative overflow-hidden transition-all duration-500"
        onMouseEnter={() => setIsPaused(true)}
        onMouseLeave={() => setIsPaused(false)}
      >
        {/* Glow ambient */}
        <div className="absolute top-0 right-0 w-96 h-96 bg-indigo-500/10 rounded-full blur-[100px] pointer-events-none" />

        {/* Slide Description Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 mb-8 border-b border-glass-border">
          <div>
            <div className="inline-flex items-center space-x-2 text-[10px] font-black uppercase tracking-widest text-indigo-400 mb-2">
              <span>{SLIDES[activeTab].badge}</span>
              <span>•</span>
              <span>Meta Cloud API Grid</span>
            </div>
            <h3 className="text-2xl sm:text-3xl font-black text-fg tracking-tight">
              {SLIDES[activeTab].title}
            </h3>
            <p className="text-muted text-xs sm:text-sm font-medium mt-1.5 max-w-2xl leading-relaxed">
              {SLIDES[activeTab].subtitle}
            </p>
          </div>

          <div className="flex items-center space-x-3 shrink-0">
            <span className="text-[10px] font-black uppercase tracking-widest text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-3 py-1.5 rounded-full flex items-center gap-1.5">
              <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
              Live Demo View
            </span>
          </div>
        </div>

        {/* Dynamic Mockup Body */}
        <div className="bg-[#08090d] border border-glass-border/80 rounded-2xl sm:rounded-[2rem] p-4 sm:p-6 shadow-2xl relative overflow-hidden min-h-[380px] flex flex-col justify-between">
          
          {/* SLIDE 1: ONBOARDING & DASHBOARD */}
          {activeTab === 0 && (
            <div className="space-y-6 animate-in fade-in zoom-in-95 duration-300">
              {/* Top Banner Status */}
              <div className="bg-gradient-to-r from-emerald-500/10 via-teal-500/10 to-emerald-500/10 border border-emerald-500/20 rounded-2xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 rounded-xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shrink-0">
                    <ShieldCheck className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="text-xs font-black text-fg uppercase tracking-wider flex items-center gap-2">
                      WhatsApp Gateway Active
                      <span className="px-2 py-0.5 bg-emerald-400/20 text-emerald-300 text-[9px] rounded-md font-mono">VERIFIED</span>
                    </h4>
                    <p className="text-[11px] text-muted font-medium mt-0.5">WABA ID: 1571768617266202 • Number: +1 555 019 9870</p>
                  </div>
                </div>
                <div className="flex items-center space-x-2 text-[10px] font-black uppercase tracking-widest text-emerald-400 bg-emerald-400/10 px-3 py-1.5 rounded-xl border border-emerald-400/20">
                  <Zap className="w-3.5 h-3.5" /> Direct Meta Route
                </div>
              </div>

              {/* Metrics Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div className="bg-glass-card/60 border border-glass-border p-4 rounded-2xl">
                  <p className="text-[9px] font-black uppercase tracking-widest text-muted">Total Sent</p>
                  <p className="text-2xl font-black text-fg mt-1">14,280</p>
                  <span className="text-[9px] font-bold text-emerald-400 mt-1 block">↑ 18% this month</span>
                </div>
                <div className="bg-glass-card/60 border border-glass-border p-4 rounded-2xl">
                  <p className="text-[9px] font-black uppercase tracking-widest text-muted">Delivered</p>
                  <p className="text-2xl font-black text-emerald-400 mt-1">99.4%</p>
                  <span className="text-[9px] font-bold text-fg/40 mt-1 block">Sub-second Latency</span>
                </div>
                <div className="bg-glass-card/60 border border-glass-border p-4 rounded-2xl">
                  <p className="text-[9px] font-black uppercase tracking-widest text-muted">Read Rate</p>
                  <p className="text-2xl font-black text-indigo-400 mt-1">91.2%</p>
                  <span className="text-[9px] font-bold text-indigo-300 mt-1 block">13,023 Read</span>
                </div>
                <div className="bg-glass-card/60 border border-glass-border p-4 rounded-2xl">
                  <p className="text-[9px] font-black uppercase tracking-widest text-muted">Active Contacts</p>
                  <p className="text-2xl font-black text-fg mt-1">1,840</p>
                  <span className="text-[9px] font-bold text-emerald-400 mt-1 block">+120 new leads</span>
                </div>
              </div>
            </div>
          )}

          {/* SLIDE 2: ADD & SYNC CONTACTS */}
          {activeTab === 1 && (
            <div className="space-y-4 animate-in fade-in zoom-in-95 duration-300">
              {/* Action Toolbar */}
              <div className="flex flex-wrap items-center justify-between gap-3 pb-2">
                <div className="relative flex-1 max-w-xs">
                  <Search className="w-3.5 h-3.5 text-fg/30 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input 
                    type="text" 
                    readOnly 
                    value="Rahul Sharma"
                    className="w-full bg-glass-input border border-glass-border rounded-xl pl-9 pr-3 py-2 text-xs font-semibold text-fg"
                  />
                </div>
                <div className="flex items-center gap-2">
                  <button className="px-3.5 py-2 bg-glass-input border border-glass-border rounded-xl text-[10px] font-black uppercase tracking-wider text-fg flex items-center gap-1.5">
                    <FileText className="w-3 h-3 text-indigo-400" /> Upload CSV
                  </button>
                  <button className="px-4 py-2 bg-fg text-bg rounded-xl text-[10px] font-black uppercase tracking-wider flex items-center gap-1.5">
                    <Plus className="w-3 h-3" /> Add Contact
                  </button>
                </div>
              </div>

              {/* Table Preview */}
              <div className="border border-glass-border rounded-2xl overflow-hidden bg-glass-card/30">
                <div className="grid grid-cols-12 bg-white/5 p-3 text-[9px] font-black uppercase tracking-wider text-muted border-b border-glass-border">
                  <div className="col-span-4">Name</div>
                  <div className="col-span-4">Phone Number</div>
                  <div className="col-span-2">Tag</div>
                  <div className="col-span-2 text-right">Status</div>
                </div>
                <div className="divide-y divide-glass-border text-xs font-semibold">
                  <div className="grid grid-cols-12 p-3 items-center">
                    <div className="col-span-4 font-bold text-fg flex items-center gap-2">
                      <div className="w-6 h-6 rounded-full bg-indigo-500/20 text-indigo-400 text-[10px] flex items-center justify-center font-black">RS</div>
                      Rahul Sharma
                    </div>
                    <div className="col-span-4 font-mono text-muted">+91 98765 43210</div>
                    <div className="col-span-2"><span className="px-2 py-0.5 bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 rounded-full text-[9px]">VIP Lead</span></div>
                    <div className="col-span-2 text-right"><span className="text-emerald-400 text-[10px] font-bold">Valid WhatsApp</span></div>
                  </div>
                  <div className="grid grid-cols-12 p-3 items-center bg-white/[0.02]">
                    <div className="col-span-4 font-bold text-fg flex items-center gap-2">
                      <div className="w-6 h-6 rounded-full bg-emerald-500/20 text-emerald-400 text-[10px] flex items-center justify-center font-black">SJ</div>
                      Sarah Jenkins
                    </div>
                    <div className="col-span-4 font-mono text-muted">+1 415 555 0199</div>
                    <div className="col-span-2"><span className="px-2 py-0.5 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded-full text-[9px]">Customer</span></div>
                    <div className="col-span-2 text-right"><span className="text-emerald-400 text-[10px] font-bold">Valid WhatsApp</span></div>
                  </div>
                  <div className="grid grid-cols-12 p-3 items-center">
                    <div className="col-span-4 font-bold text-fg flex items-center gap-2">
                      <div className="w-6 h-6 rounded-full bg-purple-500/20 text-purple-400 text-[10px] flex items-center justify-center font-black">ER</div>
                      Elena Rostova
                    </div>
                    <div className="col-span-4 font-mono text-muted">+44 7700 900077</div>
                    <div className="col-span-2"><span className="px-2 py-0.5 bg-purple-500/10 text-purple-400 border border-purple-500/20 rounded-full text-[9px]">Enterprise</span></div>
                    <div className="col-span-2 text-right"><span className="text-emerald-400 text-[10px] font-bold">Valid WhatsApp</span></div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* SLIDE 3: GROUP SEGMENTATION */}
          {activeTab === 2 && (
            <div className="space-y-4 animate-in fade-in zoom-in-95 duration-300">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] font-black uppercase tracking-wider text-muted">Audience Segment Groups</span>
                <span className="text-xs text-indigo-400 font-bold flex items-center gap-1 cursor-pointer">
                  + Create New Group
                </span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="p-4 bg-glass-card/60 border border-glass-border rounded-2xl relative overflow-hidden group hover:border-indigo-500/40 transition-colors">
                  <div className="flex items-center justify-between mb-3">
                    <span className="px-2.5 py-1 bg-indigo-500/10 text-indigo-400 text-[9px] font-black uppercase rounded-lg border border-indigo-500/20">340 Contacts</span>
                    <Users className="w-4 h-4 text-indigo-400" />
                  </div>
                  <h4 className="text-sm font-black text-fg">VIP Clients Broadcast</h4>
                  <p className="text-[11px] text-muted font-medium mt-1">High-value enterprise leads for monthly updates.</p>
                  <button className="mt-4 w-full py-2 bg-glass-input border border-glass-border hover:bg-white/10 text-fg rounded-xl text-[10px] font-black uppercase tracking-wider flex items-center justify-center gap-1.5">
                    Launch Broadcast <ArrowRight className="w-3 h-3" />
                  </button>
                </div>

                <div className="p-4 bg-glass-card/60 border border-glass-border rounded-2xl relative overflow-hidden group hover:border-emerald-500/40 transition-colors">
                  <div className="flex items-center justify-between mb-3">
                    <span className="px-2.5 py-1 bg-emerald-500/10 text-emerald-400 text-[9px] font-black uppercase rounded-lg border border-emerald-500/20">1,250 Contacts</span>
                    <Users className="w-4 h-4 text-emerald-400" />
                  </div>
                  <h4 className="text-sm font-black text-fg">March Product Offer</h4>
                  <p className="text-[11px] text-muted font-medium mt-1">Active store signups opting for discounts.</p>
                  <button className="mt-4 w-full py-2 bg-glass-input border border-glass-border hover:bg-white/10 text-fg rounded-xl text-[10px] font-black uppercase tracking-wider flex items-center justify-center gap-1.5">
                    Launch Broadcast <ArrowRight className="w-3 h-3" />
                  </button>
                </div>

                <div className="p-4 bg-glass-card/60 border border-glass-border rounded-2xl relative overflow-hidden group hover:border-purple-500/40 transition-colors">
                  <div className="flex items-center justify-between mb-3">
                    <span className="px-2.5 py-1 bg-purple-500/10 text-purple-400 text-[9px] font-black uppercase rounded-lg border border-purple-500/20">89 Contacts</span>
                    <Users className="w-4 h-4 text-purple-400" />
                  </div>
                  <h4 className="text-sm font-black text-fg">Beta Testers List</h4>
                  <p className="text-[11px] text-muted font-medium mt-1">Direct feedback channel for product updates.</p>
                  <button className="mt-4 w-full py-2 bg-glass-input border border-glass-border hover:bg-white/10 text-fg rounded-xl text-[10px] font-black uppercase tracking-wider flex items-center justify-center gap-1.5">
                    Launch Broadcast <ArrowRight className="w-3 h-3" />
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* SLIDE 4: DIRECT MESSAGING & INBOX */}
          {activeTab === 3 && (
            <div className="space-y-4 animate-in fade-in zoom-in-95 duration-300">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 border border-glass-border rounded-2xl bg-glass-card/30 overflow-hidden">
                {/* Chat list */}
                <div className="border-r border-glass-border p-3 space-y-2 hidden md:block">
                  <div className="p-2 bg-fg text-bg rounded-xl text-xs font-bold flex items-center justify-between">
                    <span>Rahul Sharma</span>
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                  </div>
                  <div className="p-2 hover:bg-white/5 rounded-xl text-xs text-muted font-semibold flex items-center justify-between">
                    <span>Sarah Jenkins</span>
                    <span className="text-[9px] text-fg/30">10:14 AM</span>
                  </div>
                  <div className="p-2 hover:bg-white/5 rounded-xl text-xs text-muted font-semibold flex items-center justify-between">
                    <span>Elena Rostova</span>
                    <span className="text-[9px] text-fg/30">Yesterday</span>
                  </div>
                </div>

                {/* Live Thread */}
                <div className="md:col-span-2 p-4 flex flex-col justify-between min-h-[240px]">
                  <div className="space-y-3">
                    <div className="flex justify-start">
                      <div className="bg-glass-card border border-glass-border rounded-2xl rounded-bl-sm p-3 max-w-[80%] text-xs font-medium text-fg">
                        Hi team, can you confirm if my order #8872 has shipped?
                        <span className="text-[8px] text-fg/40 block mt-1 text-right">10:41 AM</span>
                      </div>
                    </div>

                    <div className="flex justify-end">
                      <div className="bg-fg text-bg rounded-2xl rounded-br-sm p-3 max-w-[80%] text-xs font-medium relative">
                        Hi Rahul! Your order #8872 has been dispatched via Express. Tracking link: https://pingstack.app/track/8872
                        <div className="flex items-center justify-end gap-1 mt-1 text-[8px] text-bg/60">
                          <span>10:42 AM</span>
                          <CheckCheck className="w-3 h-3 text-indigo-400" />
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="mt-4 pt-3 border-t border-glass-border flex items-center gap-2">
                    <button className="px-3 py-2 bg-glass-input border border-glass-border rounded-xl text-[10px] font-black uppercase text-indigo-400 shrink-0">
                      ⚡ Templates
                    </button>
                    <input 
                      type="text" 
                      readOnly 
                      value="Type a message or press template..." 
                      className="flex-1 bg-glass-input border border-glass-border rounded-xl px-3 py-2 text-xs text-fg/40"
                    />
                    <button className="p-2 bg-fg text-bg rounded-xl shrink-0">
                      <Send className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* SLIDE 5: CREATE & SEND CAMPAIGNS */}
          {activeTab === 4 && (
            <div className="space-y-4 animate-in fade-in zoom-in-95 duration-300">
              <div className="bg-glass-card/60 border border-glass-border rounded-2xl p-5 space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-glass-border pb-3">
                  <div>
                    <h4 className="text-sm font-black text-fg flex items-center gap-2">
                      Campaign: Q3 Product Launch Announcement
                      <span className="px-2.5 py-0.5 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[9px] font-black rounded-full uppercase">Broadcast Active</span>
                    </h4>
                    <p className="text-[11px] text-muted font-medium mt-0.5">Template: <code className="text-indigo-400 font-mono">product_launch_v1</code> • Target: VIP Clients Broadcast (340 contacts)</p>
                  </div>

                  <button className="px-4 py-2 bg-indigo-600 text-white rounded-xl text-[10px] font-black uppercase tracking-wider flex items-center gap-1.5 shrink-0 shadow-lg shadow-indigo-600/20">
                    <Zap className="w-3 h-3" /> Sending Live
                  </button>
                </div>

                {/* Progress bar */}
                <div className="space-y-2">
                  <div className="flex justify-between text-[10px] font-black uppercase tracking-wider text-muted">
                    <span>Progress: 340 / 340 Dispatched</span>
                    <span className="text-emerald-400">100% Completed</span>
                  </div>
                  <div className="w-full h-2 bg-glass-input rounded-full overflow-hidden border border-glass-border">
                    <div className="h-full bg-gradient-to-r from-indigo-500 to-emerald-400 w-full rounded-full animate-pulse" />
                  </div>
                </div>

                {/* Campaign Metrics */}
                <div className="grid grid-cols-3 gap-3 pt-1">
                  <div className="bg-glass-input/50 p-2.5 rounded-xl border border-glass-border text-center">
                    <span className="text-[9px] font-black uppercase text-muted block">Successful</span>
                    <span className="text-base font-black text-emerald-400">340</span>
                  </div>
                  <div className="bg-glass-input/50 p-2.5 rounded-xl border border-glass-border text-center">
                    <span className="text-[9px] font-black uppercase text-muted block">Read Ticks</span>
                    <span className="text-base font-black text-indigo-400">312</span>
                  </div>
                  <div className="bg-glass-input/50 p-2.5 rounded-xl border border-glass-border text-center">
                    <span className="text-[9px] font-black uppercase text-muted block">Failed</span>
                    <span className="text-base font-black text-fg/30">0</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Footer Bar of Mockup */}
          <div className="mt-4 pt-3 border-t border-glass-border/60 flex items-center justify-between text-[10px] text-muted font-mono">
            <span className="flex items-center gap-1.5">
              <CheckCircle2 className="w-3 h-3 text-emerald-400" /> Meta Cloud API Endpoint Ready
            </span>
            <span className="hidden sm:inline-block">Auto-advancing slides (Hover to pause)</span>
          </div>

        </div>
      </div>
    </div>
  );
}
