import React from 'react';

export default function GroupsLoading() {
  return (
    <div className="space-y-8 animate-pulse p-6">
      {/* Header shimmer */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <div className="h-8 w-36 bg-glass-input border border-glass-border rounded-xl" />
          <div className="h-4 w-48 bg-glass-input border border-glass-border rounded-lg mt-2" />
        </div>
        <div className="h-10 w-36 bg-glass-input border border-glass-border rounded-xl" />
      </div>

      {/* Groups Grid Shimmer */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {[...Array(6)].map((_, i) => (
          <div key={i} className="bg-glass-card border border-glass-border rounded-[2.5rem] p-6 space-y-6">
            <div className="space-y-2">
              <div className="h-5 w-40 bg-glass-input border border-glass-border rounded-lg" />
              <div className="h-3.5 w-56 bg-glass-input border border-glass-border rounded-lg" />
            </div>
            <div className="flex justify-between items-center pt-4 border-t border-glass-border">
              <div className="h-4 w-20 bg-glass-input border border-glass-border rounded-lg" />
              <div className="h-8 w-24 bg-glass-input border border-glass-border rounded-xl" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
