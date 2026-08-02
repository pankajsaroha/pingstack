import React from 'react';

export default function InboxLoading() {
  return (
    <div className="flex-1 min-h-0 h-full flex bg-glass-card border border-glass-border rounded-[2.5rem] shadow-2xl overflow-hidden animate-pulse">
      {/* Sidebar List Shimmer */}
      <div className="w-full md:w-1/3 flex flex-col border-r border-glass-border bg-glass-card/30">
        <div className="p-6 border-b border-glass-border flex justify-between items-center">
          <div className="h-6 w-24 bg-glass-input border border-glass-border rounded-lg" />
          <div className="h-5 w-16 bg-glass-input border border-glass-border rounded-full" />
        </div>
        <div className="p-4 border-b border-glass-border">
          <div className="h-10 w-full bg-glass-input border border-glass-border rounded-xl" />
        </div>
        <div className="flex-1 p-4 space-y-4">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="flex gap-4 items-center p-3 rounded-2xl bg-glass-input/20 border border-glass-border/10">
              <div className="w-10 h-10 rounded-full bg-glass-input border border-glass-border shrink-0" />
              <div className="flex-1 space-y-2">
                <div className="h-4 w-28 bg-glass-input border border-glass-border rounded-lg" />
                <div className="h-3 w-40 bg-glass-input border border-glass-border rounded-lg" />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Main Chat Thread Shimmer */}
      <div className="hidden md:flex flex-1 flex-col bg-glass-input relative">
        <div className="p-6 border-b border-glass-border flex justify-between items-center bg-glass-card/10">
          <div className="flex gap-4 items-center">
            <div className="w-10 h-10 rounded-full bg-glass-input border border-glass-border" />
            <div className="space-y-2">
              <div className="h-4 w-32 bg-glass-input border border-glass-border rounded-lg" />
              <div className="h-3 w-20 bg-glass-input border border-glass-border rounded-lg" />
            </div>
          </div>
        </div>
        <div className="flex-1 p-6 space-y-6">
          <div className="flex justify-center">
            <div className="h-6 w-20 bg-glass-input border border-glass-border rounded-full" />
          </div>
          <div className="flex gap-4 items-end">
            <div className="w-8 h-8 rounded-full bg-glass-input border border-glass-border" />
            <div className="h-14 w-60 bg-glass-card border border-glass-border rounded-2xl" />
          </div>
          <div className="flex gap-4 items-end justify-end">
            <div className="h-16 w-72 bg-fg/10 border border-glass-border rounded-2xl" />
          </div>
          <div className="flex gap-4 items-end">
            <div className="w-8 h-8 rounded-full bg-glass-input border border-glass-border" />
            <div className="h-12 w-48 bg-glass-card border border-glass-border rounded-2xl" />
          </div>
        </div>
        <div className="p-6 border-t border-glass-border bg-glass-card/10">
          <div className="h-12 w-full bg-glass-input border border-glass-border rounded-2xl" />
        </div>
      </div>
    </div>
  );
}
