export default function ContactsLoading() {
  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8 animate-pulse">
      {/* Header & Controls Skeleton */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-2">
          <div className="h-8 w-40 bg-fg/10 rounded-xl" />
          <div className="h-4 w-60 bg-fg/5 rounded-lg" />
        </div>
        <div className="flex items-center space-x-3">
          <div className="h-10 w-28 bg-fg/10 rounded-xl" />
          <div className="h-10 w-32 bg-fg/10 rounded-xl" />
        </div>
      </div>

      {/* Table Area Skeleton */}
      <div className="bg-glass-card border border-glass-border rounded-2xl p-6 space-y-4">
        <div className="flex justify-between items-center pb-4 border-b border-glass-border">
          <div className="h-10 w-64 bg-fg/10 rounded-xl" />
          <div className="h-8 w-24 bg-fg/5 rounded-lg" />
        </div>
        {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
          <div key={i} className="flex items-center justify-between py-3 border-b border-glass-border/40">
            <div className="flex items-center space-x-3">
              <div className="h-5 w-5 bg-fg/10 rounded" />
              <div className="h-8 w-8 bg-fg/10 rounded-full" />
              <div className="h-4 w-32 bg-fg/10 rounded" />
            </div>
            <div className="h-4 w-28 bg-fg/10 rounded" />
            <div className="h-4 w-24 bg-fg/5 rounded" />
            <div className="h-8 w-8 bg-fg/10 rounded-lg" />
          </div>
        ))}
      </div>
    </div>
  );
}
