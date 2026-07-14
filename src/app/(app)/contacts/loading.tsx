import React from 'react';

export default function ContactsLoading() {
  return (
    <div className="space-y-8 animate-pulse p-6">
      {/* Header shimmer */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <div className="h-8 w-40 bg-glass-input border border-glass-border rounded-xl" />
          <div className="h-4 w-52 bg-glass-input border border-glass-border rounded-lg mt-2" />
        </div>
        <div className="flex gap-4">
          <div className="h-10 w-28 bg-glass-input border border-glass-border rounded-xl" />
          <div className="h-10 w-32 bg-glass-input border border-glass-border rounded-xl" />
        </div>
      </div>

      {/* Table Shimmer */}
      <div className="bg-glass-card border border-glass-border rounded-[2.5rem] overflow-hidden">
        <div className="p-6 border-b border-glass-border flex gap-4">
          <div className="h-10 flex-1 bg-glass-input border border-glass-border rounded-xl" />
          <div className="h-10 w-28 bg-glass-input border border-glass-border rounded-xl" />
        </div>
        <div className="divide-y divide-glass-border">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="px-6 py-5 flex items-center justify-between">
              <div className="flex gap-4 items-center">
                <div className="w-4 h-4 bg-glass-input border border-glass-border rounded" />
                <div className="space-y-2">
                  <div className="h-4 w-36 bg-glass-input border border-glass-border rounded-lg" />
                  <div className="h-3 w-24 bg-glass-input border border-glass-border rounded-lg" />
                </div>
              </div>
              <div className="flex gap-16 items-center">
                <div className="h-4 w-28 bg-glass-input border border-glass-border rounded-lg" />
                <div className="h-5 w-16 bg-glass-input border border-glass-border rounded-full" />
                <div className="h-4 w-32 bg-glass-input border border-glass-border rounded-lg" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
