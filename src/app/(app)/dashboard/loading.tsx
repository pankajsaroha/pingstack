import React from 'react';

export default function DashboardLoading() {
  return (
    <div className="space-y-8 animate-pulse p-6">
      {/* Header shimmer */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <div className="h-8 w-48 bg-glass-input border border-glass-border rounded-xl" />
          <div className="h-4 w-64 bg-glass-input border border-glass-border rounded-lg mt-2" />
        </div>
        <div className="h-10 w-36 bg-glass-input border border-glass-border rounded-xl" />
      </div>

      {/* Grid statistics shimmer */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="h-28 bg-glass-card border border-glass-border rounded-[2rem] p-6 space-y-4">
            <div className="h-4 w-24 bg-glass-input border border-glass-border rounded-lg" />
            <div className="h-8 w-16 bg-glass-input border border-glass-border rounded-xl" />
          </div>
        ))}
      </div>

      {/* Main content split panel shimmer */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 h-[450px] bg-glass-card border border-glass-border rounded-[2.5rem] p-6 space-y-6">
          <div className="h-6 w-32 bg-glass-input border border-glass-border rounded-lg" />
          <div className="h-full w-full bg-glass-input border border-glass-border rounded-[2rem]" />
        </div>
        <div className="h-[450px] bg-glass-card border border-glass-border rounded-[2.5rem] p-6 space-y-6">
          <div className="h-6 w-32 bg-glass-input border border-glass-border rounded-lg" />
          <div className="space-y-4">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="flex justify-between items-center h-12 bg-glass-input border border-glass-border rounded-xl px-4" />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
